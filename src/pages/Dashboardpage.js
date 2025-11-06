import React from 'react';
import MetricCard from '../components/MetricCard';

// 1. Import all the icons you need
import { Users, DollarSign, BarChart3, Plane } from 'lucide-react'; 

// 2. Define the data for your cards
// (I've added two more to match your screenshot and CSS)
const card1Data = {
  title: "Total Passengers",
  value: "1,200",
  icon: Users,
  colorClass: "border-blue-700/50", // Corresponds to your map
  trend: {
    slope: 5, // Positive
    value: "+5.2%",
    description: "Since last month"
  }
};

const card2Data = {
  title: "Total Revenue",
  value: "$50,000",
  icon: DollarSign,
  colorClass: "border-green-700/50",
  trend: {
    slope: -2, // Negative
    value: "-1.8%",
    description: "Since last week"
  }
};

const card3Data = {
  title: "Seat Demand",
  value: "85%",
  icon: BarChart3,
  colorClass: "border-yellow-700/50",
  trend: {
    slope: 1, // Positive
    value: "+1.2%",
    description: "vs. 30-day avg"
  }
};

const card4Data = {
  title: "On-Time Flights",
  value: "92%",
  icon: Plane,
  colorClass: "border-purple-700/50",
  trend: {
    slope: 0, // Neutral
    value: "No change",
    description: "Since yesterday"
  }
};


function DashboardPage() {
  return (
    <>
      {/* This uses your .page-header style */}
      <h1 className="page-header">Dashboard</h1>
      
      {/* This 'metrics-grid' class from your CSS will 
          automatically handle the 4-column layout */}
      <div className="metrics-grid">
        <MetricCard
          title={card1Data.title}
          value={card1Data.value}
          icon={card1Data.icon}
          colorClass={card1Data.colorClass}
          trend={card1Data.trend}
        />
        <MetricCard
          title={card2Data.title}
          value={card2Data.value}
          icon={card2Data.icon}
          colorClass={card2Data.colorClass}
          trend={card2Data.trend}
        />
        <MetricCard
          title={card3Data.title}
          value={card3Data.value}
          icon={card3Data.icon}
          colorClass={card3Data.colorClass}
          trend={card3Data.trend}
        />
        <MetricCard
          title={card4Data.title}
          value={card4Data.value}
          icon={card4Data.icon}
          colorClass={card4Data.colorClass}
          trend={card4Data.trend}
        />
      </div>

      {/* You can now add your other content boxes */}
      <div className="content-box">
        <h2>Flight Operations Overview</h2>
        <div className="placeholder-chart">
          {/* You can use a real chart library here later */}
          <div className="chart-icon" role="img" aria-label="chart">📊</div>
          <p>Main chart data will be loaded here.</p>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;