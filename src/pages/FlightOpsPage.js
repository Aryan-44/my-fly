import React, { useEffect, useMemo, useRef, useState } from "react";
import { PlaneTakeoff, AlertTriangle, CloudRain } from "lucide-react";
import { API_BASE } from "../lib/api";

const badge = (s) => {
  const cls = {
    ON_TIME: "bg-emerald-500/15 text-emerald-400",
    BOARDING: "bg-blue-500/15 text-blue-400",
    IN_AIR: "bg-cyan-500/15 text-cyan-400",
    DELAYED: "bg-amber-500/15 text-amber-400",
    CANCELLED: "bg-rose-500/15 text-rose-400",
  };
  return cls[s];
};

const FlightOpsPage = () => {
  const [flights, setFlights] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState([]);
  const timer = useRef(null);

  const fetchData = async () => {
    const t0 = performance.now();
    const res = await fetch(`${API_BASE}/api/flightops/status`);
    const json = await res.json();
    setFlights(json.flights);
    setDisruptions(json.disruptions);
    setLoading(false);
    const t1 = performance.now();
    setLatency((prev) => [...prev.slice(-24), Math.round(t1 - t0)]);
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

  return (
    <div>
      <h1 className="page-header">Flight Ops</h1>

      {/* Health strip */}
      <div className="content-box flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PlaneTakeoff className="h-6 w-6 opacity-80" />
          <div>
            <h2 className="text-lg font-semibold">Real-time Ops</h2>
            <p className="text-sm opacity-80">
              Live flights, delays, and disruptions (auto-refresh every 10s)
            </p>
          </div>
        </div>
        {/* tiny latency sparkline */}
        <div className="h-10 w-40">
          <svg viewBox="0 0 100 30" className="w-full h-full">
            {latency.map((v, i) => {
              const x = (i / Math.max(1, latency.length - 1)) * 100;
              const y = 30 - (v / Math.max(1, maxLatency)) * 28 - 1;
              return <circle key={i} cx={x} cy={y} r="1.2" />;
            })}
          </svg>
          <div className="text-right text-xs opacity-70">
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
                      className={`px-2 py-1 rounded-md text-xs ${badge(f.status)}`}
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
