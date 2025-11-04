import React from 'react';
// Make sure this import path is correct!
import DashboardLayout, { navItems } from './components/DashboardLayout';

// Import all the icons
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  Users,
  PlaneTakeoff,
  Minus,
} from 'lucide-react';

// This is a helper map to convert Tailwind class names from your
// data into real CSS border colors.
const borderColorMap = {
  'border-blue-700/50': 'rgba(59, 130, 246, 0.5)',
  'border-green-700/50': 'rgba(22, 163, 74, 0.5)',
  'border-yellow-700/50': 'rgba(202, 138, 4, 0.5)',
  'border-purple-700/50': 'rgba(147, 51, 234, 0.5)',
};

// --- MetricCard Component (CSS Version) ---
const MetricCard = ({ title, value, icon: Icon, colorClass, trend }) => {
  // Determine trend icon and CSS class
  const TrendIcon = trend.slope >= 0 ? TrendingUp : Minus;
  const trendClassName =
    trend.slope >= 0 ? 'trend-positive' : 'trend-negative';

  // Use the map to create an inline style for the border
  const cardStyle = {
    borderColor: borderColorMap[colorClass] || '#4B5563', // default gray
  };

  return (
    // Use the new CSS classes and the dynamic style
    <div className="metric-card" style={cardStyle}>
      <div className="card-header">
        <div className="card-title">{title}</div>
        <Icon className="card-icon" />
      </div>

      <div className="card-body">
        <div className="card-value">{value}</div>
        <div className={`card-trend ${trendClassName}`}>
          <TrendIcon className="trend-icon" />
          <span>{trend.value}</span>
        </div>
      </div>
      <p className="card-footer">{trend.description}</p>
    </div>
  );
};

// This data is from your original file
const dashboardData = [
  {
    title: 'Total Flights',
    value: '1,240',
    icon: PlaneTakeoff,
    colorClass: 'border-blue-700/50', // This is now used by borderColorMap
    trend: { slope: 0.05, value: '+5.0%', description: 'vs last month' },
  },
  {
    title: 'Passenger Load Factor',
    value: '89.2%',
    icon: Users,
    colorClass: 'border-green-700/50',
    trend: { slope: 0.02, value: '+2.0%', description: 'vs last month' },
  },
  {
    title: 'Average Ticket Price',
    value: '$450',
    icon: DollarSign,
    colorClass: 'border-yellow-700/50',
    trend: { slope: -0.01, value: '-1.0%', description: 'vs last month' },
  },
  {
    title: 'Forecast Accuracy',
    value: '94.5%',
    icon: CheckCircle,
    colorClass: 'border-purple-700/50',
    trend: { slope: 0.005, value: '+0.5%', description: 'vs target' },
  },
];

// --- Dashboard Component (CSS Version) ---
const Dashboard = () => {
  // Get the active page name from the imported array
  const activePageName = navItems[0].name;

  return (
    // Pass the active page name to the layout
    <DashboardLayout activePage={activePageName}>
      <div className="dashboard-overview">
        <h1>Dashboard Overview</h1>

        <div className="metrics-grid">
          {dashboardData.map((data, index) => (
            <MetricCard key={index} {...data} />
          ))}
        </div>

        <div className="placeholder-chart">
          <h2>Seat Demand Charts & Visualizations</h2>
          <p>
            Main content goes here (e.g., charts).
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;