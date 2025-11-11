import React, { useEffect, useMemo, useRef, useState } from "react";
import { PlaneTakeoff, AlertTriangle, CloudRain } from "lucide-react";
import { API_BASE } from "../lib/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";


const badge = (s) => {
  const cls = {
    ON_TIME: "bg-emerald-500/15 text-emerald-400",
    BOARDING: "bg-blue-500/15 text-blue-400",
    IN_AIR: "bg-cyan-500/15 text-cyan-400",
    DELAYED: "bg-amber-500/15 text-amber-400",
    CANCELLED: "bg-rose-500/15 text-rose-400",
  };
  return cls[s] || "bg-white/10 text-white/70";
};

const FlightOpsPage = () => {
  const [flights, setFlights] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const timer = useRef(null);

  const fetchData = async () => {
    try {
      const t0 = performance.now();
      const res = await fetch(`${API_BASE}/api/flightops/status`);
      const json = await res.json();
      setFlights(json.flights || []);
      setDisruptions(json.disruptions || []);
      setLastUpdated(Date.now());
      setLoading(false);
      const t1 = performance.now();
      setLatency((prev) => [...prev.slice(-24), Math.round(t1 - t0)]);
    } catch (err) {
      console.error("FlightOps fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    timer.current = window.setInterval(fetchData, 10000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const maxLatency = useMemo(
    () => Math.max(...(latency.length ? latency : [0])),
    [latency]
  );


  // Construct the latency line path for SVG
  const latencyPath = useMemo(() => {
    if (latency.length < 2) return "";
    const points = latency.map((v, i) => {
      const x = (i / Math.max(1, latency.length - 1)) * 100;
      const y = 30 - (v / Math.max(1, maxLatency)) * 28 - 1;
      return `${x},${y}`;
    });
    return "M" + points.join(" L ");
  }, [latency, maxLatency]);

  return (
    <div>
      <h1 className="page-header flex items-center gap-3">
         Flight Ops
         <span className="live-indicator">
          <span className="dot"></span> LIVE
         </span>
      </h1>


      {/* Health strip */}
      <div className="content-box flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PlaneTakeoff className="h-6 w-6 opacity-80" />
          <div>
            <h2 className="text-lg font-semibold">Real-time Ops</h2>
            <p className="text-sm opacity-80">
              Live flights, delays, and disruptions (auto-refresh every 10s)
            </p>
          </div>
        </div>

        {/* Smooth animated latency graph */}
        {/* Realistic latency chart with last updated */}
<div className="relative bg-[#0f172a] border border-white/10 rounded-xl p-3 w-full md:w-80">
  <p className="text-xs text-white/60 mb-1 text-right">
    Last updated {Math.round((Date.now() - lastUpdated) / 1000)}s ago
  </p>
  <ResponsiveContainer width="100%" height={100}>
    <AreaChart data={latency.map((v, i) => ({ time: i, value: v }))}>
      <defs>
        <linearGradient id="latGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <XAxis
        dataKey="time"
        hide
      />
      <YAxis
        hide
        domain={[0, maxLatency + 10]}
      />
      <Tooltip
        contentStyle={{
          background: "#0b1220",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
        }}
        labelStyle={{ color: "#fff" }}
        formatter={(val) => [`${val} ms`, "Latency"]}
      />
      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
      <Area
        type="monotone"
        dataKey="value"
        stroke="#22d3ee"
        fill="url(#latGradient)"
        strokeWidth={2}
        isAnimationActive={true}
      />
    </AreaChart>
  </ResponsiveContainer>
  <div className="text-right text-sm text-cyan-400 font-semibold">
    {maxLatency || 0} ms
  </div>
</div>
      </div>


      {/* Disruptions */}
      <div className="content-box">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Active Disruptions
        </h3>
        {loading ? (
          <div className="opacity-70">Loading…</div>
        ) : disruptions.length === 0 ? (
          <div className="opacity-70">No active disruptions.</div>
        ) : (
          <ul className="space-y-2">
            {disruptions.map((d) => (
              <li
                key={d.id}
                className="p-3 rounded-xl bg-zinc-800/40 flex items-start justify-between"
              >
                <div>
                  <div className="text-sm uppercase tracking-wide opacity-70">
                    {d.type} • {d.severity}
                  </div>
                  <div>{d.message}</div>
                  <div className="text-xs opacity-70 mt-1">
                    Affects: {d.affectedFlights.join(", ")} • Updated{" "}
                    {new Date(d.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
                {d.type === "WEATHER" && (
                  <CloudRain className="h-5 w-5 opacity-70" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Flights table */}
      <div className="content-box">
        <h3 className="font-semibold mb-3">Flights</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2 pr-6">Flight</th>
                <th className="py-2 pr-6">Route</th>
                <th className="py-2 pr-6">Sched Dep</th>
                <th className="py-2 pr-6">Est Dep</th>
                <th className="py-2 pr-6">Status</th>
                <th className="py-2 pr-6">Delay</th>
                <th className="py-2 pr-6">Cause</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f) => (
                <tr key={f.flightNo} className="border-t border-white/5">
                  <td className="py-2 pr-6">{f.flightNo}</td>
                  <td className="py-2 pr-6">{f.route}</td>
                  <td className="py-2 pr-6">{f.schedDep}</td>
                  <td className="py-2 pr-6">{f.estDep}</td>
                  <td className="py-2 pr-6">
                    <span
                      className={`px-2 py-1 rounded-md text-xs ${badge(
                        f.status
                      )}`}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="py-2 pr-6">{f.delayMin} min</td>
                  <td className="py-2 pr-6">{f.cause || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="opacity-70 mt-2">Loading…</div>}
        </div>
      </div>
    </div>
  );
};

export default FlightOpsPage;
