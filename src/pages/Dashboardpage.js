import React, { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard";
import {
  Users,
  DollarSign,
  BarChart3,
  Plane,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  BarChart,
} from "recharts";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : `http://${window.location.hostname}:5000`;

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/dashboard/summary`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch dashboard data");
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) return <div className="p-8 text-white">Loading dashboard…</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const cards = [
    {
      title: "Total Passengers",
      value: data.total_passengers.toLocaleString(),
      icon: Users,
      colorClass: "border-blue-700/50",
      trend: data.trends.passengers,
    },
    {
      title: "Total Revenue",
      value: `$${data.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      colorClass: "border-green-700/50",
      trend: data.trends.revenue,
    },
    {
      title: "Seat Demand",
      value: `${data.seat_demand}%`,
      icon: BarChart3,
      colorClass: "border-yellow-700/50",
      trend: data.trends.seat_demand,
    },
    {
      title: "On-Time Flights",
      value: `${data.on_time_pct}%`,
      icon: Plane,
      colorClass: "border-purple-700/50",
      trend: data.trends.on_time,
    },
  ];
  

  const passengerTrend = data.charts?.passenger_trend || [];
  const avgDelayChart = data.charts?.avg_delay_chart || [];

  return (
    <div className="p-8 text-white space-y-8">
      <h1 className="page-header">Dashboard</h1>

      {/* KPI Cards */}
      <div className="metrics-grid">
        {cards.map((card, i) => (
          <MetricCard key={i} {...card} />
        ))}
      </div>

      {/* Passenger Trend Chart */}
      <div className="content-box">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Passenger Trend (Last 10 Days)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={passengerTrend}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeOpacity={0.1} />
            <XAxis dataKey="day" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
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
              dataKey="passengers"
              stroke="#38bdf8"
              fill="url(#trend)"
              strokeWidth={2}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Average Delay per Route */}
      <div className="content-box">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          Average Delay per Route (minutes)
        </h2>
        {avgDelayChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={avgDelayChart}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeOpacity={0.1} />
              <XAxis dataKey="route" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#0b1220",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="delay" fill="#facc15" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-white/60">No delay data available.</p>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
