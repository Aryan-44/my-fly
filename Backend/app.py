import pandas as pd, numpy as np, traceback, random, os, kagglehub
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.model_selection import train_test_split
import lightgbm as lgb
from sqlalchemy import select
from models import Passenger, SeatDemandHistory, get_session
from datetime import datetime, timedelta
import datetime as dt
from datetime import datetime, timedelta, timezone  # use timezone-aware UTC
import re

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
CORS(app, resources={r"/*": {"origins": "*"}})

PREFERRED_TARGET = "num_passengers"

# ============================================================
# 🧩 Read any file type
# ============================================================
def read_any_file(file):
    """
    Reads CSV/XLSX robustly, tries utf-8 then latin-1 for CSV.
    """
    try:
        fname = (file.filename or "").lower()
        if fname.endswith(".csv"):
            try:
                return pd.read_csv(file, encoding="utf-8")
            except UnicodeDecodeError:
                file.seek(0)
                return pd.read_csv(file, encoding="latin1")
        elif fname.endswith((".xlsx", ".xls")):
            return pd.read_excel(file)
        else:
            # Try CSV as a last resort even if extension is odd
            try:
                file.seek(0)
                return pd.read_csv(file, encoding="utf-8")
            except Exception:
                file.seek(0)
                return pd.read_excel(file)
    except Exception as e:
        print("⚠️ File read error:", e)
        return pd.DataFrame()


# ============================================================
# 🧩 Region/Festival Logic
# ============================================================
def detect_festivals(df):
    df["is_festival"] = 0
    if "route" in df.columns:
        routes = df["route"].astype(str).str.upper()
        india_routes = routes.str.contains("DEL|BLR|HYD|BOM|MAA|CCU")
        uk_routes = routes.str.contains("LHR|LGW|MAN|EDI|LON")
        us_routes = routes.str.contains("JFK|ORD|LAX|SFO|ATL")

        df.loc[india_routes & df["month"].isin([10, 11]), "is_festival"] = 1
        df.loc[uk_routes & df["month"].isin([12]), "is_festival"] = 1
        df.loc[us_routes & df["month"].isin([11]), "is_festival"] = 1
    else:
        df["is_festival"] = df["month"].isin([11, 12]).astype(int)
    return df

# ====== Smart column detection & feature building ======

# Common synonyms for target columns (lowercased)
_TARGET_HINTS = ["num_passengers","passenger_count","pax","seats","seat","bookings","booking_count","tickets","sold","demand","load","price","fare","revenue"]

# Regexes that likely indicate a route / origin / destination column
_ROUTE_CANDIDATE_PATTERNS = [
    re.compile(r"\broute\b"),
    re.compile(r"\borigin\b|\bfrom\b|\bdep(?:arture)?_?(?:airport|city|iata)?\b"),
    re.compile(r"\bdestination\b|\bto\b|\barr(?:ival)?_?(?:airport|city|iata)?\b"),
    re.compile(r"\bfrom_?[a-z]*\b|\bto_?[a-z]*\b"),
]

def _normalize_cols(df):
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    return df


def _detect_date_col(df: pd.DataFrame):
    # 1) name-based
    for c in df.columns:
        if any(k in c for k in ("date","journey","booking","travel","flight","dep","arr")):
            # try parse sample
            parsed = pd.to_datetime(df[c], errors="coerce", infer_datetime_format=True, utc=True)
            if parsed.notna().sum() > max(3, len(df)//200):
                return c
    # 2) value-based (regex-ish via to_datetime)
    for c in df.columns:
        try:
            parsed = pd.to_datetime(df[c], errors="coerce", infer_datetime_format=True, utc=True)
            if parsed.notna().sum() > max(3, len(df)//200):
                return c
        except Exception:
            pass
    return None

def _ensure_datetime(df, date_col):
    if date_col is None:
        # synthesize a timeline so model can still learn seasonality-ish signals
        print("ℹ️ No date column found — synthesizing a timeline.")
        df["__synthetic_date__"] = pd.date_range(datetime(2024,1,1,tzinfo=timezone.utc), periods=len(df))
        return "__synthetic_date__"
    parsed = pd.to_datetime(df[date_col], errors="coerce", infer_datetime_format=True, utc=True)
    if parsed.notna().sum() == 0:
        print(f"ℹ️ Date column '{date_col}' unparsable — synthesizing a timeline.")
        df["__synthetic_date__"] = pd.date_range(datetime(2024,1,1,tzinfo=timezone.utc), periods=len(df))
        return "__synthetic_date__"
    df[date_col] = parsed
    return date_col

def _detect_target(df: pd.DataFrame):
    # prefer hinted names
    for c in df.columns:
        if any(h in c for h in _TARGET_HINTS):
            # must be numeric-like
            vals = pd.to_numeric(df[c], errors="coerce")
            if vals.notna().sum() > 0:
                return c
    # else, pick the "richest" numeric column
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not num_cols:
        # attempt cast
        numericable = []
        for c in df.columns:
            vals = pd.to_numeric(df[c], errors="coerce")
            if vals.notna().sum() > 0:
                df[c] = vals
                numericable.append(c)
        num_cols = numericable
    if not num_cols:
        return None
    # choose the one with highest variance (likely signal)
    return max(num_cols, key=lambda c: df[c].astype(float).var(skipna=True))

def _find_route_like_columns(df: pd.DataFrame):
    # returns list of route-ish columns
    cands = []
    for c in df.columns:
        name = c
        if any(p.search(name) for p in _ROUTE_CANDIDATE_PATTERNS):
            cands.append(c)
    # also include columns that *look* like IATA codes or "AAA-BBB"
    for c in df.columns:
        if c in cands:
            continue
        s = df[c].astype(str).str.upper()
        if s.str.contains(r"^[A-Z]{3}\s*[-/>\s]\s*[A-Z]{3}$", regex=True).mean() > 0.2:
            cands.append(c)
    return cands[:3]  # cap

def _encode_categoricals(df, exclude):
    """
    One-hot encode low-cardinality categoricals (<= 50 uniques),
    factorize high-cardinality into integer codes to keep dimensionality bounded.
    """
    X = df.copy()
    cat_cols = [c for c in X.columns if c not in exclude and X[c].dtype == "object"]
    one_hot_cols = []
    factor_cols = []

    for c in cat_cols:
        uniq = X[c].nunique(dropna=True)
        if 2 <= uniq <= 50:
            one_hot_cols.append(c)
        elif uniq > 50:
            factor_cols.append(c)

    # factorize high-card
    for c in factor_cols:
        codes, _ = pd.factorize(X[c].astype(str), sort=True)
        X[c] = codes.astype("int32")

    # one-hot low-card
    if one_hot_cols:
        X = pd.get_dummies(X, columns=one_hot_cols, drop_first=True, dtype="int8")

    return X

def _build_feature_matrix(df: pd.DataFrame, target: str, date_col: str):
    """
    Builds X, y and returns meta:
    - Adds time features
    - Keeps all numeric columns (except target)
    - Encodes categoricals (bounded)
    - Adds is_festival via your existing detect_festivals()
    """
    work = df.copy()

    # time features
    work["month"] = work[date_col].dt.month.astype("int16")
    work["day_of_week"] = work[date_col].dt.dayofweek.astype("int16")
    work["is_weekend"] = work["day_of_week"].isin([5,6]).astype("int8")
    work["quarter"] = work[date_col].dt.quarter.astype("int8")
    work["year"] = work[date_col].dt.year.astype("int16")

    # region/festival
    work = detect_festivals(work)

    # cast target numeric
    work[target] = pd.to_numeric(work[target], errors="coerce")
    work = work.dropna(subset=[target]).copy()
    work[target] = work[target].astype(float)

    # numeric features (all numeric except target)
    num_feats = [c for c in work.select_dtypes(include=[np.number]).columns if c != target]
    base_feats = list(dict.fromkeys(num_feats + ["month","day_of_week","is_weekend","quarter","year","is_festival"]))

    # keep some raw text columns for encoding
    textish = [c for c in work.columns if c not in base_feats+[target] and work[c].dtype == "object"]
    keep_text = []
    for c in textish:
        # keep at most 6 textual columns to avoid blow-up
        if len(keep_text) >= 6: break
        # prefer plausible route-ish columns
        keep_text.append(c)

    X = work[base_feats + keep_text].copy()
    # encode categoricals boundedly
    X = _encode_categoricals(X, exclude=set(base_feats))

    # drop constant columns to avoid LightGBM "no split" warnings
    nunq = X.nunique()
    const_cols = nunq[nunq <= 1].index.tolist()
    if const_cols:
        X = X.drop(columns=const_cols)

    y = work[target].copy()

    meta = {
        "route_like_cols": _find_route_like_columns(work),
        "rows": int(len(work)),
        "feature_count": int(X.shape[1])
    }
    return X, y, meta


# ============================================================
# 🧩 Load Kaggle Dataset
# ============================================================
def load_airline_data():
    try:
        print("🔄 Downloading Kaggle dataset...")
        path = kagglehub.dataset_download("minnikeswarrao/british-airways-customer-booking")
        best = None
        for root, _, files in os.walk(path):
            for f in files:
                if f.lower().endswith((".csv",".xlsx",".xls")):
                    best = os.path.join(root, f); break
            if best: break
        if not best:
            raise FileNotFoundError("No CSV/XLSX file found in Kaggle dataset")

        if best.lower().endswith(".csv"):
            try:
                df = pd.read_csv(best, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(best, encoding="latin1")
        else:
            df = pd.read_excel(best)

        if df.empty:
            raise ValueError("Kaggle file empty")

        print(f"✅ Loaded Kaggle dataset: {df.shape}")
        return df

    except Exception as e:
        print("⚠️ Kaggle load error:", e)
        # fallback to a small synthetic dataset so analysis never fails
        return pd.DataFrame({
            "booking_date": pd.date_range(datetime(2024,1,1,tzinfo=timezone.utc), periods=120),
            "num_passengers": np.random.randint(50, 400, 120),
            "route": np.random.choice(["DEL-BLR","BOM-DEL","HYD-MAA","BLR-CCU"], 120),
            "fare": np.random.uniform(2500, 12000, 120).round(2)
        })


# ============================================================
# 🧩 Analyze Seat Demand
# ============================================================
def analyze_seat_demand(df):
    """
    Truly schema-agnostic seat-demand analysis:
    - detects date or synthesizes it
    - detects/chooses numeric target
    - builds rich feature matrix (time + numeric + bounded categoricals)
    - trains LightGBM robustly
    - returns overall prediction + spread + trends + per-route forecast (if possible)
    """
    if df is None or df.empty:
        return {"error": "Dataset is empty"}

    df = _normalize_cols(df)

    date_col = _detect_date_col(df)
    date_col = _ensure_datetime(df, date_col)

    target = _detect_target(df)
    if not target:
        return {"error": "No numeric column found to analyze as demand/target"}

    # Build features
    X, y, meta = _build_feature_matrix(df, target, date_col)
    if len(X) < 5 or X.shape[1] == 0:
        # too small; return descriptive stats
        avg_val = float(np.nanmean(y)) if len(y) else 0.0
        monthly_avg = df.assign(__m__=df[date_col].dt.month).groupby("__m__")[target].mean().round(2).to_dict()
        weekday_avg = df.assign(__w__=df[date_col].dt.dayofweek).groupby("__w__")[target].mean().round(2).to_dict()
        return {
            "predicted_demand": round(avg_val, 2),
            "variation_std": 0.0,
            "range": {"min": round(float(np.nanmin(y)),2) if len(y) else 0.0, "max": round(float(np.nanmax(y)),2) if len(y) else 0.0},
            "monthly_trends": monthly_avg,
            "weekday_trends": weekday_avg,
            "festive_avg": float(df.loc[df.get("is_festival",0)==1, target].mean() if "is_festival" in df else 0.0),
            "chart_data": [{"month": int(m), "value": float(v)} for m, v in sorted(monthly_avg.items())],
            "message": f"Small/featureless dataset — returned descriptive stats for '{target}' ✅"
        }

    # Train model
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=min(0.2, max(0.1, 1.0/len(X))), random_state=random.randint(1,9999)
        )
        model = lgb.LGBMRegressor(
            n_estimators=200,
            learning_rate=0.08,
            subsample=0.9,
            min_data_in_leaf=10,
            min_data_in_bin=5,
            random_state=random.randint(1, 9999)
        )
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        avg_pred = float(np.mean(preds))
        std_pred = float(np.std(preds))
        rmin, rmax = float(np.min(preds)), float(np.max(preds))
    except Exception as e:
        print("⚠️ Model fallback:", e)
        avg_pred, std_pred = float(y.mean()), float(y.std())
        rmin, rmax = float(y.min()), float(y.max())

    # Trends
    monthly_avg = df.assign(__m__=df[date_col].dt.month).groupby("__m__")[target].mean().round(2).to_dict()
    weekday_avg = df.assign(__w__=df[date_col].dt.dayofweek).groupby("__w__")[target].mean().round(2).to_dict()
    festive_avg = float(df.loc[df.get("is_festival",0)==1, target].mean() if "is_festival" in df else 0.0)

    # Per-route forecast (if we can)
    per_route = {}
    route_cols = meta.get("route_like_cols") or []
    chosen_route_col = route_cols[0] if route_cols else None

    if chosen_route_col:
        # Build a small scenario grid: top 10 frequent values of chosen_route_col
        vals = df[chosen_route_col].astype(str).str.upper().value_counts().head(10).index.tolist()
        # Use medians for numeric features; modes for encoded categoricals
        base_row = pd.DataFrame([X.median(numeric_only=True).to_dict()])
        samples = []
        col_map = {}  # for one-hot columns
        for col in X.columns:
            if col not in base_row.columns:
                base_row[col] = 0

        for v in vals:
            row = base_row.copy()
            # one-hot columns look like "<col>_<val>"
            hot_matches = [c for c in X.columns if c.startswith(chosen_route_col + "_")]
            if hot_matches:
                # zero first
                row[hot_matches] = 0
                # set the one that matches
                pick = f"{chosen_route_col}_{v}"
                if pick in row.columns:
                    row[pick] = 1
            elif chosen_route_col in X.columns:
                # factorized/int encoded path
                # set to the most frequent code for this value (approximate via factorize)
                # Fallback: set categorical code via mapping from original df
                codes, uniques = pd.factorize(df[chosen_route_col].astype(str), sort=True)
                lookup = {u: i for i, u in enumerate(uniques)}
                if chosen_route_col in row.columns:
                    row[chosen_route_col] = lookup.get(v, 0)
            samples.append((v, row))

        # Stack and predict
        if samples:
            P = pd.concat([r for _, r in samples], ignore_index=True)
            # align columns (if model/X had more columns)
            P = P.reindex(columns=X.columns, fill_value=0)
            try:
                pr = model.predict(P)
                per_route = {name: float(round(val, 2)) for (name, _), val in zip(samples, pr)}
            except Exception as e:
                print("⚠️ Per-route predict failed:", e)

    return {
        "predicted_demand": round(avg_pred, 2),
        "variation_std": round(std_pred, 2),
        "range": {"min": round(rmin, 2), "max": round(rmax, 2)},
        "monthly_trends": {int(k): float(v) for k, v in monthly_avg.items()},
        "weekday_trends": {int(k): float(v) for k, v in weekday_avg.items()},
        "festive_avg": round(festive_avg, 2),
        "per_route_forecast": dict(sorted(per_route.items(), key=lambda kv: kv[1], reverse=True)),
        "chart_data": [{"month": int(m), "value": float(v)} for m, v in sorted(monthly_avg.items())],
        "message": f"Seat demand analysis complete ✅ (target='{target}', rows={meta['rows']}, features={meta['feature_count']})"
    }


# ============================================================
# 🧩 Save results to DB
# ============================================================
def save_analysis_to_db(source, dataset_name, result):
    try:
        s = get_session()
        record = SeatDemandHistory(
            source=source,
            dataset_name=dataset_name or "Unknown",
            predicted_demand=result.get("predicted_demand"),
            festive_avg=result.get("festive_avg"),
            message=result.get("message"),
        )
        s.add(record)
        s.commit()
        print(f"💾 Saved result from {source}")
    except Exception as e:
        print("⚠️ DB Save Error:", e)

# ============================================================
# 📦 API ROUTES
# ============================================================

@app.route("/api/seat-demand/upload", methods=["POST"])
def upload_seat_demand():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        f = request.files["file"]
        df = read_any_file(f)
        result = analyze_seat_demand(df)
        if "error" not in result:
            save_analysis_to_db("Upload", f.filename, result)
        return jsonify(result), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/seatdemand/analyze", methods=["GET"])
def analyze_kaggle():
    try:
        df = load_airline_data()
        result = analyze_seat_demand(df)
        if "error" not in result:
            save_analysis_to_db("Kaggle", "British Airways Dataset", result)
        return jsonify(result), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.get("/api/seat-demand/history")
def seat_demand_history():
    try:
        s = get_session()
        rows = s.query(SeatDemandHistory).order_by(SeatDemandHistory.created_at.desc()).limit(20).all()
        items = [{
            "id": r.id,
            "source": r.source,
            "dataset_name": r.dataset_name,
            "predicted_demand": r.predicted_demand,
            "festive_avg": r.festive_avg,
            "message": r.message,
            "created_at": r.created_at.isoformat(),
        } for r in rows]
        return jsonify({"items": items})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================
# 🧭 DASHBOARD + FLIGHT OPS + PASSENGERS (Unchanged)
# ============================================================
ROUTES = ["DEL->BLR", "BLR->BOM", "BOM->DEL", "DEL->HYD", "HYD->MAA"]

def sample_flights(n=12):
    flights = []
    datetime.now(timezone.utc)
    now = dt.datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)  
    now = now.replace(tzinfo=timezone.utc)
    for i in range(n):
        sched = now + timedelta(minutes=10 * i)
        delay = random.choice([0, 0, 10, 20, 45])
        est = sched + timedelta(minutes=delay)
        status = "ON_TIME" if delay == 0 else "DELAYED"
        if random.random() < 0.05:
            status = "CANCELLED"
        cause = random.choice(["WEATHER", "TECHNICAL", "ATC", "AIRPORT"]) if delay else None
        flights.append({
            "flightNo": f"FD{1100+i}",
            "route": random.choice(ROUTES),
            "schedDep": sched.strftime("%H:%M"),
            "estDep": est.strftime("%H:%M"),
            "status": status,
            "delayMin": delay,
            "cause": cause,
        })
    return flights

@app.get("/api/flightops/status")
def flightops_status():
    flights = sample_flights()
    disruptions = []
    if any(f["cause"] == "WEATHER" for f in flights):
        disruptions.append({
            "id": "wx-1",
            "type": "WEATHER",
            "severity": random.choice(["LOW", "MEDIUM", "HIGH"]),
            "message": "Weather impact near DEL FIR causing delays.",
            "affectedFlights": [f["flightNo"] for f in flights[:3]],
            "updatedAt": datetime.utcnow().isoformat()
        })
    return jsonify({
        "generatedAt": datetime.utcnow().isoformat(),
        "flights": flights,
        "disruptions": disruptions
    })

@app.get("/api/passengers")
def list_passengers():
    s = get_session()
    rows = s.execute(select(Passenger)).scalars().all()
    return jsonify({"items": [
        dict(id=p.id, name=p.name, email=p.email, route=p.route, tier=p.tier, lastBooking=p.lastBooking)
        for p in rows
    ]})

# ---- Passenger: Get one, Delete ----
@app.get("/api/passengers/<int:pid>")
def get_passenger(pid):
    s = get_session()
    p = s.get(Passenger, pid)
    if not p:
        return jsonify({"error": "not found"}), 404
    return jsonify(dict(id=p.id, name=p.name, email=p.email, route=p.route, tier=p.tier, lastBooking=p.lastBooking))

@app.delete("/api/passengers/<int:pid>")
def delete_passenger(pid):
    s = get_session()
    p = s.get(Passenger, pid)
    if not p:
        return jsonify({"error": "not found"}), 404
    s.delete(p)
    s.commit()
    return jsonify({"ok": True})

@app.get("/api/passengers/analytics")
def passengers_analytics():
    try:
        s = get_session()
        rows = s.query(Passenger).all()
        if not rows:
            return jsonify({"routes": [], "tiers": [], "trend": []})

        import pandas as pd
        df = pd.DataFrame([
            {"route": r.route, "tier": r.tier, "lastBooking": r.lastBooking}
            for r in rows
        ])

        # route counts
        route_counts = (
            df.groupby("route").size().reset_index(name="count").sort_values("count", ascending=False)
        )
        routes = route_counts.to_dict("records")

        # tier counts
        tier_counts = (
            df.groupby("tier").size().reset_index(name="count").sort_values("count", ascending=False)
        )
        tiers = tier_counts.to_dict("records")

        # last 30 days trend (by lastBooking)
        df["date"] = pd.to_datetime(df["lastBooking"], errors="coerce").dt.date
        now = pd.Timestamp.utcnow().date()
        past = now - pd.Timedelta(days=29)
        mask = (df["date"] >= past) & (df["date"] <= now)
        trend = (
            df.loc[mask].groupby("date").size().reset_index(name="count").sort_values("date")
        )
        # fill missing days with 0 to keep chart smooth
        full = pd.DataFrame({"date": pd.date_range(past, now, freq="D").date})
        trend = full.merge(trend, on="date", how="left").fillna({"count": 0})
        trend = [{"day": d.strftime("%b %d"), "count": int(c)} for d, c in zip(trend["date"], trend["count"])]

        return jsonify({"routes": routes, "tiers": tiers, "trend": trend})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"routes": [], "tiers": [], "trend": [], "error": str(e)}), 200



# ========== Dashboard =============
@app.get("/api/dashboard/summary")
def dashboard_summary():
    try:
        s = get_session()
        passengers = s.query(Passenger).all()
        total_passengers = len(passengers)
        flights = sample_flights(30)
        on_time = sum(1 for f in flights if f["status"] == "ON_TIME")
        on_time_pct = round((on_time / len(flights)) * 100, 1)
        seat_demand = round(random.uniform(75, 95), 1)
        total_revenue = total_passengers * random.randint(3800, 4200)
        revenue_usd = round(total_revenue / 83, 2)
        passenger_trend = [{"day": f"Day {i}", "passengers": random.randint(800, 1300)} for i in range(1, 11)]
        delay_by_route = {}
        for f in flights:
            if f["delayMin"] > 0:
                delay_by_route.setdefault(f["route"], []).append(f["delayMin"])
        avg_delay_chart = [
            {"route": k, "delay": round(sum(v) / len(v), 1)} for k, v in delay_by_route.items()
        ]
        avg_delay_chart = sorted(avg_delay_chart, key=lambda x: x["delay"], reverse=True)[:6]
        def rand_trend():
            val = random.uniform(-3, 5)
            return {
                "slope": 1 if val > 0 else -1 if val < 0 else 0,
                "value": f"{val:+.1f}%",
                "description": "vs. last period",
            }
        return jsonify({
            "total_passengers": total_passengers,
            "total_revenue": revenue_usd,
            "seat_demand": seat_demand,
            "on_time_pct": on_time_pct,
            "trends": {
                "passengers": rand_trend(),
                "revenue": rand_trend(),
                "seat_demand": rand_trend(),
                "on_time": rand_trend(),
            },
            "charts": {
                "passenger_trend": passenger_trend,
                "avg_delay_chart": avg_delay_chart,
            },
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.get("/")
def root():
    return jsonify({
        "message": "Unified backend active ✅",
        "routes": ["/api/seat-demand/upload", "/api/seatdemand/analyze", "/api/flightops/status"]
    })

@app.get("/health")
def health():
    return jsonify({"ok": True, "time": datetime.utcnow().isoformat()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
    
