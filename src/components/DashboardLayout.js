import React from 'react';
// Import icons for the sidebar
import {
  LayoutDashboard,
  BarChart,
  PlaneTakeoff,
  Users,
} from 'lucide-react';

// 1. Add a 'key' to each item. This key must match
//    the 'currentPage' state in App.js
export const navItems = [
  { name: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  { name: 'Seat Demand', key: 'seatDemand', icon: BarChart },
  { name: 'Flight Ops', key: 'flightOps', icon: PlaneTakeoff },
  { name: 'Passengers', key: 'passengers', icon: Users },
];

// 2. Accept 'currentPage', 'onNavigate', and 'children'
const DashboardLayout = ({ currentPage, onNavigate, children }) => {
  return (
    <div className="dashboard-layout">
      {/* --- Sidebar --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
          {/* I'm using one of your icons for the logo */}
          <PlaneTakeoff className="logo-icon" />
          FlightDash
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              // 3. Compare 'item.key' to 'currentPage'
              const isActive = item.key === currentPage;

              return (
                <li key={item.name} className="nav-item">
                  <a
                    // 4. Dynamically add 'active' class
                    className={isActive ? 'active' : ''}
                    // 5. Add the onClick handler
                    onClick={(e) => {
                      e.preventDefault(); // Stop the link from jumping
                      onNavigate(item.key); // Call the function from App.js
                    }}
                    href="#" // Keep href for <a> tag semantics
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
      {/* 6. Render the active page (passed as children) */}
      <main className="main-content">{children}</main>
    </div>
  );
};

export default DashboardLayout;