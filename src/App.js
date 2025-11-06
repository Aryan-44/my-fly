import React, { useState } from 'react';
import './App.css'; 

// 1. Import all your pages
import DashboardPage from './pages/Dashboardpage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/DashboardLayout'; // This is your sidebar component
import SeatDemandPage from './pages/SeatDemandPage';
import FlightOpsPage from './pages/FlightOpsPage'; // <-- 1. UNCOMMENT THIS LINE
import PassengersPage from './pages/PassengersPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); 
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  // 3. A helper function to render the correct page
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'seatDemand':
        return <SeatDemandPage />;
      case 'flightOps': // <-- 2. UNCOMMENT THIS BLOCK
        return <FlightOpsPage />;
      case 'passengers':
        return <PassengersPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      {isLoggedIn ? (
        <div className="dashboard-layout"> 
          <Dashboard 
            currentPage={currentPage} 
            onNavigate={setCurrentPage} 
          /> 
          <main className="main-content">
            {renderCurrentPage()} 
        </main>
        </div>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;