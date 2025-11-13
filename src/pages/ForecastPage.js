import React, { useState, useEffect } from "react";
import { Calendar, TrendingUp, Activity, RefreshCw } from "lucide-react";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : `http://${window.location.hostname}:5000`;

const Card = ({ title, subtitle, value, change, desc }) => (
  <div className="forecast-card">
    <div className="forecast-header">
      <Calendar className="icon" />
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
    <div className="forecast-body">
      <h2>{value}</h2>
      <p className="change">{change}</p>
      <p className="desc">{desc}</p>
    </div>
  </div>
);

const ForecastPage = () => {
  const [forecasts, setForecasts] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("Kaggle Dataset");
  const [meta, setMeta] = useState({ records: 0, target: "unknown" });

  // 🔁 Fetch forecast data
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/forecast/analyze`);
      const json = await res.json();
      setForecasts(json.seasonal_forecasts || []);
      setDrivers(json.top_drivers || []);
      setMeta({
        records: json.records_analyzed || 0,
        target: json.target_column || "unknown",
      });

      // 🧠 Detect data source
      if (json.base_message?.includes("Upload") || json.records_analyzed > 0) {
        setSource("Latest Uploaded Dataset");
      } else {
        setSource("Kaggle Dataset");
      }
    } catch (err) {
      console.error("Forecast fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // 👀 Listen for new dataset uploads (localStorage event)
    const handleStorageChange = (e) => {
      if (e.key === "latestForecastUpdate") {
        console.log("🔁 Detected new upload — reloading forecast...");
        load();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <div className="forecast-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-header flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Seat Forecasts
        </h1>
        <div className="text-sm text-white/70 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin-slow text-blue-400" />
          Source: <span className="font-semibold text-blue-300">{source}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-white/60">Analyzing seasonal trends...</p>
      ) : (
        <>
          {/* Season cards */}
          <div className="forecast-grid">
            {forecasts.map((f, i) => (
              <Card key={i} {...f} />
            ))}
          </div>

          {/* Summary stats */}
          <div className="content-box mt-6 text-white/70 text-sm">
            <p>
              <strong>{meta.records}</strong> records analyzed | Target column:{" "}
              <strong>{meta.target}</strong>
            </p>
          </div>

          {/* Top drivers */}
          <div className="content-box mt-8">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" /> Top Demand Drivers
            </h2>
            <p className="text-white/60 mb-4 text-sm">
              Feature importance from ML model (SHAP-like analysis)
            </p>
            <div className="drivers-list">
              {drivers.map((d, i) => (
                <div key={i} className="driver-row">
                  <span>{d.feature}</span>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{ width: `${d.importance}%`, backgroundColor: d.color }}
                    ></div>
                  </div>
                  <span className="percent">{d.importance}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ForecastPage;
