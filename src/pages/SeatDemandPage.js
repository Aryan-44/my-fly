import React, { useState, useEffect } from "react";
import { Upload, BarChart3, TrendingUp, Globe, History, Database } from "lucide-react";
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
  <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl transition-all hover:border-white/20">
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
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Fetch analysis history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/seat-demand/history`);
      const json = await res.json();
      if (json.items) setHistory(json.items);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [data]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/seat-demand/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setData(json);
      localStorage.setItem("latestForecastUpdate", Date.now());
      if (json.error) setError(json.error);
    } catch (err) {
      setError("Failed to analyze file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKaggleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`${API_BASE}/api/seatdemand/analyze`);
      const json = await res.json();
      setData(json);
      if (json.error) setError(json.error);
    } catch (err) {
      setError("Failed to fetch Kaggle analysis");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="seat-demand-page p-8 text-white space-y-6">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        Seat Demand Forecast
      </h1>

      {/* Upload Section */}
      <Card>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Run New Forecast
            </h2>
            <p className="text-white/60">
              Upload any airline dataset (CSV/XLSX) or analyze Kaggle British Airways data.
            </p>
          </div>

          <div className="flex gap-3">
            <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 cursor-pointer transition">
              <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleFileChange} />
              Upload File
            </label>
            <button
              onClick={handleKaggleAnalyze}
              className="px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 transition flex items-center gap-2"
            >
              <Globe className="w-5 h-5" /> Analyze Kaggle
            </button>
          </div>
        </div>

        {isLoading && <p className="text-blue-400 mt-3">Analyzing... ⏳</p>}
        {error && <p className="text-red-400 mt-3">Error: {error}</p>}
      </Card>

      {/* Results Section */}
      {data && !data.error && (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <Stat
                label="Predicted Demand"
                value={`${data.predicted_demand || 0} seats`}
                icon={TrendingUp}
              />
            </Card>
            <Card>
              <Stat
                label="Records Analyzed"
                value={data.records_analyzed || 0}
                icon={Database}
              />
            </Card>
            <Card>
              <Stat
                label="Target Column"
                value={data.target_column || "Unknown"}
                icon={BarChart3}
              />
            </Card>
          </div>

          <Card>
            <Stat label="Message" value={data.message || "Complete"} icon={BarChart3} />
          </Card>

          {/* Monthly Trend Chart */}
          <Card>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Monthly Demand Trend
            </h2>
            {data.chart_data?.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={data.chart_data}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeOpacity={0.1} />
                  <XAxis dataKey="month" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
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
              <p className="text-white/60">No trend data available.</p>
            )}
          </Card>
        </>
      )}

      {/* History Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5" /> Analysis History
        </h2>
        {history.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Dataset</th>
                  <th className="py-2 pr-4">Predicted</th>
                  <th className="py-2 pr-4">Records</th>
                  <th className="py-2 pr-4">Message</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 transition">
                    <td className="py-2 pr-4">{r.source}</td>
                    <td className="py-2 pr-4">{r.dataset_name}</td>
                    <td className="py-2 pr-4 text-green-400">{r.predicted_demand}</td>
                    <td className="py-2 pr-4">{r.records_analyzed || "-"}</td>
                    <td className="py-2 pr-4">{r.message}</td>
                    <td className="py-2 pr-4 text-white/70">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-white/60">No past analyses recorded yet.</p>
        )}
      </Card>
    </div>
  );
};

export default SeatDemandPage;
