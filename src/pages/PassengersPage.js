import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  X,
  Save,
  Edit3,
  Trash2,
  BarChart3,
} from "lucide-react";
import { API_BASE } from "../lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

const PassengersPage = () => {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [route, setRoute] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    route: "",
    tier: "Economy",
    lastBooking: "",
  });

  // analytics
  const [analytics, setAnalytics] = useState({ routes: [], tiers: [], trend: [] });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Load passengers
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${API_BASE}/api/passengers?` +
          new URLSearchParams({
            q,
            route: route === "ALL" ? "" : route,
          })
      );
      if (!res.ok) throw new Error("Failed to fetch passengers");
      const json = await res.json();
      setRows(json.items || []);
    } catch (err) {
      console.error("❌ Passenger load error:", err);
      setError("Could not load passengers.");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch(`${API_BASE}/api/passengers/analytics`);
      const json = await res.json();
      setAnalytics({
        routes: json.routes || [],
        tiers: json.tiers || [],
        trend: json.trend || [],
      });
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    load();
  }, [q, route]);

  useEffect(() => {
    loadAnalytics();
  }, [rows.length]); // refresh analytics when data changes count

  // routes filter options from data
  const routeOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.route));
    return ["ALL", ...Array.from(s)];
  }, [rows]);

  // Add or Update passenger
  const handleSavePassenger = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.route || !form.lastBooking) {
      alert("Please fill in all fields!");
      return;
    }
    try {
      const endpoint = editId
        ? `${API_BASE}/api/passengers/${editId}`
        : `${API_BASE}/api/passengers`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save passenger");

      setShowModal(false);
      setEditId(null);
      setForm({ name: "", email: "", route: "", tier: "Economy", lastBooking: "" });

      await load();
      await loadAnalytics();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save passenger.");
    }
  };

  // Edit
  const openEdit = (p) => {
    setEditId(p.id);
    setForm({
      name: p.name || "",
      email: p.email || "",
      route: p.route || "",
      tier: p.tier || "Economy",
      lastBooking: p.lastBooking ? p.lastBooking.substring(0, 10) : "",
    });
    setShowModal(true);
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this passenger?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/passengers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await load();
      await loadAnalytics();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete passenger.");
    }
  };

  return (
    <div className="fade-in">
      <h1 className="page-header">Passengers</h1>

      <div className="content-box">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Passenger Booking Details
          </h2>
          <button
            onClick={() => { setEditId(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 transition"
          >
            <Plus className="w-4 h-4" /> Add Passenger
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 opacity-70" />
            <input
              className="pl-8 pr-3 py-2 rounded-xl bg-zinc-800/70 outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-2 rounded-xl bg-zinc-800/70 outline-none focus:ring-2 focus:ring-blue-600"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          >
            {routeOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="passengers-table-wrapper">
          {loading ? (
            <div className="loading-spinner" />
          ) : error ? (
            <div className="text-red-400 text-center">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-gray-400 text-center py-6">No passengers found.</div>
          ) : (
            <table className="passengers-table min-w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2 pr-6">Name</th>
                  <th className="py-2 pr-6">Email</th>
                  <th className="py-2 pr-6">Route</th>
                  <th className="py-2 pr-6">Tier</th>
                  <th className="py-2 pr-6">Last Booking</th>
                  <th className="py-2 pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition">
                    <td className="py-2 pr-6">{p.name}</td>
                    <td className="py-2 pr-6">{p.email}</td>
                    <td className="py-2 pr-6">{p.route}</td>
                    <td className="py-2 pr-6">{p.tier}</td>
                    <td className="py-2 pr-6">
                      {p.lastBooking ? new Date(p.lastBooking).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-2 pr-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Analytics */}
      <div className="content-box">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-yellow-400" />
          Passenger Analytics
        </h2>

        {loadingAnalytics ? (
          <div className="loading-spinner" />
        ) : (
          <div className="grid-layout-2">
            {/* Route frequency */}
            <div>
              <h3 className="text-sm font-semibold opacity-80 mb-2">Top Routes</h3>
              {analytics.routes.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.routes.slice(0, 8)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeOpacity={0.1} />
                    <XAxis dataKey="route" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" radius={[6,6,0,0]} fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-white/60">No route data.</div>
              )}
            </div>

            {/* 30-day Trend */}
            <div>
              <h3 className="text-sm font-semibold opacity-80 mb-2">Bookings (last 30 days)</h3>
              {analytics.trend.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics.trend}>
                    <defs>
                      <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeOpacity={0.1} />
                    <XAxis dataKey="day" tick={{ fill: "#cbd5e1", fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="url(#trend)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-white/60">No booking trend data.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1f2937] p-6 rounded-2xl shadow-xl w-[90%] max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {editId ? "Edit Passenger" : "New Passenger"}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditId(null); }}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassenger} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Route (e.g., DEL-&gt;BLR)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                  value={form.route}
                  onChange={(e) => setForm({ ...form, route: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tier</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value })}
                >
                  <option>Economy</option>
                  <option>Business</option>
                  <option>First Class</option>
                  <option>Gold</option>
                  <option>Platinum</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last Booking</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                  value={form.lastBooking}
                  onChange={(e) => setForm({ ...form, lastBooking: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditId(null); }}
                  className="px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PassengersPage;
