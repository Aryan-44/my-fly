import React, { useMemo, useState } from "react";
import { Upload, BarChart3, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : `http://${window.location.hostname}:5000`;

const Card = ({ children }) => (
  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl">
    {children}
  </div>
);

const Stat = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-4">
    <div className="p-3 rounded-xl bg-white/5">
      <Icon className="w-6 h-6 text-white/80" />
    </div>
    <div>
      <p className="text-sm text-white/60">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  </div>
);

const SeatDemandPage = () => {
  const [prediction, setPrediction] = useState(null);
  const [perRoute, setPerRoute] = useState({});
  const [chartData, setChartData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const routesSorted = useMemo(
    () => Object.entries(perRoute).sort((a, b) => b[1] - a[1]),
    [perRoute]
  );

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setPrediction(null);
    setPerRoute({});
    setChartData([]);
    setAnalysis(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // [FIX] Use the API_BASE constant instead of a hardcoded URL
      const res = await fetch(`${API_BASE}/api/seat-demand/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Status ${res.status}`);

      setPrediction(data.predicted_demand);
      setPerRoute(data.per_route_forecast || {});
      setChartData(data.chart_data || []);
      setAnalysis(data.analysis || null);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 text-white space-y-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        Seat Demand Forecast
      </h1>

      {/* Upload */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Run New Forecast
            </h2>
            <p className="text-white/60">
              Upload the latest CSV to generate updated demand forecasts.
            </p>
          </div>

          <label className="inline-flex items-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition cursor-pointer">
            {/* [FIX] Accept only .csv to match backend logic */}
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
            Choose file
          </label>
        </div>

        <div className="mt-4">
          {isLoading && <p className="text-blue-400">Analyzing… ⏳</p>}
          {error && <p className="text-red-400">Error: {error}</p>}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <Stat
            label="Overall Predicted Demand"
            value={
              prediction !== null ? (
                <span className="text-green-400">{Math.round(prediction)} Seats</span>
              ) : (
                "—"
              )
            }
            icon={TrendingUp}
          />
        </Card>

        <Card>
          <Stat
            label="Average Booked (historical)"
            value={analysis ? `${analysis.avg_booked} Seats` : "—"}
            icon={BarChart3}
          />
        </Card>

        <Card>
          <Stat
            label="Dataset Size"
            value={analysis ? analysis.rows : "—"}
            icon={BarChart3}
          />
        </Card>
      </div>

      {/* Historical Chart */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Historical Demand (last 30)
        </h2>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeOpacity={0.1} />
              <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#0b1220",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4ade80"
                fill="url(#grad)"
                strokeWidth={2}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-white/60">No chart data yet.</p>
        )}
      </Card>

      {/* Per-route */}
      <Card>
        <h2 className="text-xl font-semibold mb-3">Per-Route Forecast (Top 10)</h2>
        {routesSorted.length ? (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {/* [FIX] Add .slice(0, 10) to enforce Top 10 display */}
            {routesSorted.slice(0, 10).map(([route, value]) => (
              <li
                key={route}
                className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
              >
                <span className="truncate">{route}</span>
                <span className="text-green-300 font-semibold">{value} seats</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-white/60">
            Route column not found or no forecast generated.
          </p>
        )}
      </Card>
    </div>
  );
};

export default SeatDemandPage;