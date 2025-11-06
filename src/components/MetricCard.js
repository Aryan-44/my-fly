import React from 'react';
import { TrendingUp, Minus } from 'lucide-react';

// This map converts the class name from your data into a CSS color
const borderColorMap = {
  'border-blue-700/50': 'rgba(59, 130, 246, 0.5)',
  'border-green-700/50': 'rgba(22, 163, 74, 0.5)',
  'border-yellow-700/50': 'rgba(202, 138, 4, 0.5)',
  'border-purple-700/50': 'rgba(147, 51, 234, 0.5)',
};

// --- METRIC CARD COMPONENT ---
const MetricCard = ({ title, value, icon: Icon, colorClass, trend }) => {
  const TrendIcon = trend.slope >= 0 ? TrendingUp : Minus;
  const trendClassName =
    trend.slope >= 0 ? 'trend-positive' : 'trend-negative';
  const cardStyle = {
    borderColor: borderColorMap[colorClass] || '#4B5563',
  };

  return (
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

export default MetricCard;