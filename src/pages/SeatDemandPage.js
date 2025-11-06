import React from 'react';
import { Upload, BarChart } from 'lucide-react'; // Import icons for this page

// --- (B) SEAT DEMAND PAGE (Based on your PPT Objectives) ---
const SeatDemandPage = () => {
  return (
    <div>
      <h1 className="page-header">Seat Demand Forecasting</h1>

      {/* Objective 1: Data Upload Portal */}
      <div className="content-box">
        <h2>1. Data Upload Portal</h2>
        <p>
          Upload airline booking data, pricing, holidays, and events as
          described in your methodology.
        </p>
        <div className="data-upload-portal">
          <Upload className="upload-icon" />
          <p>Drag & drop your CSV/Excel files here</p>
          <button className="btn">Or select files to upload</button>
        </div>
      </div>

      <div className="grid-layout-2">
        {/* Objective 2: ML Forecasting Output */}
        <div className="content-box">
          <h2>2. Demand Forecast (ML Output)</h2>
          <p>
            This is where the visualization of your ML model's predictions would
            appear.
          </p>
          {/* Placeholder for a chart */}
          <div className="chart-placeholder">
            <BarChart className="chart-icon" />
            <p>Seat Demand Forecast Chart</p>
          </div>
        </div>

        {/* Objective 3: Scenario Analysis */}
        <div className="content-box">
          <h2>3. Scenario Analysis Tool</h2>
          <p>
            Interactively test "what-if" scenarios (e.g., impact of a new
            holiday or price change).
          </p>
          <div className="scenario-tool">
            <div className="input-group">
              <label htmlFor="event">Event Type</label>
              <select id="event">
                <option>New Holiday</option>
                <option>Public Event</option>
                <option>Price Change</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="value">Change (+/-)</label>
              <input
                type="text"
                id="value"
                placeholder="+10% Price"
              />
            </div>
            <button className="btn btn-primary">Run Simulation</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatDemandPage;