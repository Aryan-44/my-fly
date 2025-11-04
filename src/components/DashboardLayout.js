import React from 'react';
// Import icons for the sidebar
import {
  LayoutDashboard,
  BarChart,
  PlaneTakeoff,
  Users,
} from 'lucide-react';

// This is the array your Dashboard.js imports
// We add icons here so the sidebar can display them
export const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '#' },
  { name: 'Seat Demand', icon: BarChart, href: '#' },
  { name: 'Flight Ops', icon: PlaneTakeoff, href: '#' },
  { name: 'Passengers', icon: Users, href: '#' },
];

const DashboardLayout = ({ children, activePage }) => {
  return (
    <div className="dashboard-layout">
      {/* --- Sidebar --- */}
      <aside className="sidebar">
        <div className="sidebar-header">FlightDash</div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Check if this nav item is the active page
              const isActive = item.name === activePage;

              return (
                <li key={item.name} className="nav-item">
                  <a
                    href={item.href}
                    // Dynamically add 'active' class from App.css
                    className={isActive ? 'active' : ''}
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