import React from "react";
import {
  LayoutDashboard,
  BarChart,
  PlaneTakeoff,
  Users,
  TrendingUp, // ✅ Added for Forecasts
} from "lucide-react";

// --- Sidebar Navigation Items ---
export const navItems = [
  { name: "Dashboard", key: "dashboard", icon: LayoutDashboard },
  { name: "Seat Demand", key: "seatDemand", icon: BarChart },
  { name: "Forecasts", key: "forecasts", icon: TrendingUp }, // ✅ New Forecast Page
  { name: "Flight Ops", key: "flightOps", icon: PlaneTakeoff },
  { name: "Passengers", key: "passengers", icon: Users },
];

// --- Layout Component ---
const DashboardLayout = ({ currentPage, onNavigate, children }) => {
  return (
    <div className="dashboard-layout">
      {/* --- Sidebar --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <PlaneTakeoff className="logo-icon" />
          FlightDash
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === currentPage;

              return (
                <li key={item.key} className="nav-item">
                  <a
                    href="#"
                    className={`nav-link ${isActive ? "active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.key);
                    }}
                  >
                    <Icon className="icon" />
                    <span>{item.name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="main-content">{children}</main>
    </div>
  );
};

export default DashboardLayout;
