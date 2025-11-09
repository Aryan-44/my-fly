import React, { useEffect, useMemo, useState } from "react";
import { Users, Plus, Search, Save } from "lucide-react";
import { API_BASE } from "../lib/api";

const PassengersPage = () => {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [route, setRoute] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch(
      `${API_BASE}/api/passengers?` +
        new URLSearchParams({
          q,
          route: route === "ALL" ? "" : route,
        })
    );
    const json = await res.json();
    setRows(json.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routes = useMemo(() => {
    const s = new Set(rows.map((r) => r.route));
    return ["ALL", ...Array.from(s)];
  }, [rows]);

  return (
    <div>
      <h1 className="page-header">Passengers</h1>

      <div className="content-box">
        <h2 className="font-semibold mb-4">Passenger Booking Details</h2>

        {/* controls */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 opacity-70" />
            <input
              className="pl-8 pr-3 py-2 rounded-xl bg-zinc-800/70 outline-none"
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-xl bg-zinc-800/70"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          >
            {routes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button onClick={load} className="px-3 py-2 rounded-xl bg-white/10">
            Refresh
          </button>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2 pr-6">Name</th>
                <th className="py-2 pr-6">Email</th>
                <th className="py-2 pr-6">Route</th>
                <th className="py-2 pr-6">Tier</th>
                <th className="py-2 pr-6">Last Booking</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-2 pr-6">{p.name}</td>
                  <td className="py-2 pr-6">{p.email}</td>
                  <td className="py-2 pr-6">{p.route}</td>
                  <td className="py-2 pr-6">{p.tier}</td>
                  <td className="py-2 pr-6">
                    {new Date(p.lastBooking).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="opacity-70 mt-2">Loading…</div>}
          {!loading && rows.length === 0 && (
            <div className="opacity-70 mt-2">No passengers found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassengersPage;
