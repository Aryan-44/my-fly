import pandas as pd, numpy as np, traceback, random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.model_selection import train_test_split
import lightgbm as lgb
from sqlalchemy import select
from models import Passenger, get_session

app = Flask(__name__)
CORS(app)

PREFERRED_TARGET = "num_passengers"

# ========== Utility functions ==========
def read_csv_safely(stream_or_path):
    try:
        return pd.read_csv(stream_or_path, encoding="utf-8")
    except UnicodeDecodeError:
        if hasattr(stream_or_path, "seek"):
            stream_or_path.seek(0)
        return pd.read_csv(stream_or_path, encoding="latin1")
    except Exception as e:
        print("Error reading CSV:", e)
        return pd.DataFrame()

def split_length_hour(col):
    nums = col.astype(str).str.extractall(r"(\d+\.?\d*)")[0].unstack()
    length_vals = pd.to_numeric(nums.get(0), errors="coerce")
    hour_vals = pd.to_numeric(nums.get(1), errors="coerce")
    length_vals.name, hour_vals.name = "length_of_stay", "flight_hour"
    return length_vals, hour_vals

def build_chart(df):
    if PREFERRED_TARGET not in df.columns: return []
    if "flight_day" in df.columns:
        d = df["flight_day"].astype(str)
        if "flight_hour" in df.columns:
            h = df["flight_hour"].fillna(0).astype(int).astype(str).str.zfill(2)
            label = ("D" + d + " " + h + ":00").tolist()
        else:
            label = ("D" + d).tolist()
    else:
        label = [str(i) for i in range(len(df))]
    actual_len = min(len(label), len(df[PREFERRED_TARGET]))
    return [{"label": l, "value": float(v)} for l, v in zip(label[:actual_len], df[PREFERRED_TARGET].iloc[:actual_len])]

# ========== 1️⃣ Seat Demand Forecasting ==========
@app.route("/api/seat-demand/upload", methods=["POST"])
def seat_demand_upload():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        f = request.files["file"]
        df = read_csv_safely(f.stream)
        if df.empty:
            return jsonify({"error": "Empty or unreadable CSV"}), 400

        df.columns = [c.strip().lower() for c in df.columns]
        if PREFERRED_TARGET not in df.columns:
            return jsonify({"error": f"Column '{PREFERRED_TARGET}' missing"}), 400

        df[PREFERRED_TARGET] = pd.to_numeric(
            df[PREFERRED_TARGET].astype(str).str.replace(",", "", regex=False).str.strip(),
            errors="coerce",
        )
        if "length_of_stay.flight_hour" in df.columns:
            los, hr = split_length_hour(df["length_of_stay.flight_hour"])
            df["length_of_stay"], df["flight_hour"] = los, hr

        numeric_candidates = [
            "purchase_lead","length_of_stay","flight_hour","flight_day","flight_duration",
            "wants_extra_baggage","wants_preferred_seat","wants_in_flight_meals","booking_complete"
        ]
        for c in numeric_candidates:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors="coerce")
        df = df.dropna(subset=[PREFERRED_TARGET])

        feat_num = [c for c in numeric_candidates if c in df.columns and df[c].notna().any()]
        cat_cols = [c for c in ["route","sales_channel","trip_type","booking_origin"] if c in df.columns]

        if feat_num:
            df[feat_num] = df[feat_num].fillna(df[feat_num].median())
        if cat_cols:
            df[cat_cols] = df[cat_cols].fillna("Unknown").astype(str)

        X, y = df[feat_num + cat_cols], df[PREFERRED_TARGET].astype(float)
        for c in cat_cols:
            X[c] = X[c].astype("category")

        if len(X) < 20:
            avg = float(np.nanmean(y.values))
            return jsonify({
                "predicted_demand": round(avg,2),
                "per_route_forecast": {},
                "chart_data": build_chart(df.tail(30)),
                "analysis": {"rows": len(df), "avg_booked": round(avg,2)},
                "message": "Small dataset; average returned."
            })

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        model = lgb.LGBMRegressor(n_estimators=100, random_state=42, n_jobs=-1, verbose=-1)
        model.fit(X_train, y_train, categorical_feature=cat_cols, eval_set=[(X_test, y_test)],
                  callbacks=[lgb.early_stopping(10, verbose=False)])

        base_vector = {}
        if feat_num: base_vector.update(X[feat_num].median().to_dict())
        if cat_cols: base_vector.update(X[cat_cols].mode().iloc[0].to_dict())
        base_df = pd.DataFrame([base_vector])
        for c in cat_cols: base_df[c] = base_df[c].astype(X[c].dtype)

        overall_pred = float(model.predict(base_df)[0])
        per_route = {}
        if "route" in df.columns:
            routes = df["route"].unique()
            pred_df = pd.concat([base_df] * len(routes), ignore_index=True)
            pred_df["route"] = routes
            pred_df["route"] = pred_df["route"].astype(X["route"].dtype)
            preds = model.predict(pred_df)
            per_route = dict(sorted(
                {r: round(float(p),2) for r,p in zip(routes,preds)}.items(),
                key=lambda kv: kv[1], reverse=True)[:10])

        avg_val = float(np.nanmean(y.values))
        return jsonify({
            "predicted_demand": round(overall_pred,2),
            "per_route_forecast": per_route,
            "chart_data": build_chart(df.tail(30)),
            "analysis": {"rows": len(df), "avg_booked": round(avg_val,2)},
            "message": "Forecast generated successfully"
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ========== 2️⃣ Flight Ops Simulation ==========
ROUTES = ["DEL->BLR", "BLR->BOM", "BOM->DEL", "DEL->HYD", "HYD->MAA"]
def sample_flights(n=12):
    flights = []
    now = datetime.utcnow()
    for i in range(n):
        sched = now + timedelta(minutes=10 * i)
        delay = random.choice([0, 0, 10, 20, 45])
        est = sched + timedelta(minutes=delay)
        status = "ON_TIME" if delay == 0 else "DELAYED"
        if random.random() < 0.05: status = "CANCELLED"
        cause = random.choice(["WEATHER","TECHNICAL","ATC","AIRPORT"]) if delay else None
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
            "severity": random.choice(["LOW","MEDIUM","HIGH"]),
            "message": "Weather impact near DEL FIR causing delays.",
            "affectedFlights": [f["flightNo"] for f in flights[:3]],
            "updatedAt": datetime.utcnow().isoformat()
        })
    return jsonify({"generatedAt": datetime.utcnow().isoformat(),
                    "flights": flights,
                    "disruptions": disruptions})

# ========== 3️⃣ Passengers ==========
@app.get("/api/passengers")
def list_passengers():
    q = (request.args.get("q") or "").lower()
    route = (request.args.get("route") or "").upper()
    s = get_session()
    rows = s.execute(select(Passenger)).scalars().all()
    items = [
        dict(id=p.id, name=p.name, email=p.email,
             route=p.route, tier=p.tier, lastBooking=p.lastBooking)
        for p in rows if (q in p.name.lower() or q in p.email.lower()) and (not route or p.route.upper() == route)
    ]
    return jsonify({"items": items})

@app.post("/api/passengers")
def create_passenger():
    data = request.get_json(force=True)
    s = get_session()
    p = Passenger(**data)
    s.add(p); s.commit()
    return jsonify({"id": p.id}), 201

@app.put("/api/passengers/<int:pid>")
def update_passenger(pid):
    data = request.get_json(force=True)
    s = get_session()
    p = s.get(Passenger, pid)
    if not p: return jsonify({"error": "not found"}), 404
    for k,v in data.items(): setattr(p, k, v)
    s.commit()
    return jsonify({"ok": True})

# ========== Root ==========
@app.get("/")
def root():
    return jsonify({
        "message": "Unified backend active ✅",
        "routes": ["/api/seat-demand/upload", "/api/flightops/status", "/api/passengers"]
    })
# ========== 4️⃣ Dashboard Summary (extended with charts) ==========
@app.get("/api/dashboard/summary")
def dashboard_summary():
    """
    Aggregates KPIs and provides chart-ready data for the dashboard.
    - Total passengers (from DB)
    - Total revenue (mock)
    - Seat demand %
    - On-time flight %
    - Historical passenger trend (mocked)
    - Average delay per route (from simulated flights)
    """
    try:
        s = get_session()
        passengers = s.query(Passenger).all()
        total_passengers = len(passengers)

        # ✈️ Flight simulation
        flights = sample_flights(30)
        on_time = sum(1 for f in flights if f["status"] == "ON_TIME")
        on_time_pct = round((on_time / len(flights)) * 100, 1)

        # 💺 Seat demand (mocked)
        seat_demand = round(random.uniform(75, 95), 1)

        # 💰 Revenue (approximation)
        total_revenue = total_passengers * random.randint(3800, 4200)
        revenue_usd = round(total_revenue / 83, 2)

        # 📈 Passenger trend (mocked 10-day data)
        passenger_trend = [
            {"day": f"Day {i}", "passengers": random.randint(800, 1300)}
            for i in range(1, 11)
        ]

        # ⏱️ Average delay per route
        delay_by_route = {}
        for f in flights:
            if f["delayMin"] > 0:
                delay_by_route.setdefault(f["route"], []).append(f["delayMin"])
        avg_delay_chart = [
            {"route": k, "delay": round(sum(v) / len(v), 1)} for k, v in delay_by_route.items()
        ]
        avg_delay_chart = sorted(avg_delay_chart, key=lambda x: x["delay"], reverse=True)[:6]

        # Trends (mock)
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
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
