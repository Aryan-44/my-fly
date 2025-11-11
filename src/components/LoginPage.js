import React, { useState } from 'react';
import AppLogo from './AppLogo'; // Import the logo
import { LogIn } from 'lucide-react'; // Import icons

// --- LOGIN COMPONENT ---
// This is the login form you requested
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, you'd check credentials with your backend.
    // For this project, we'll just log in.
    onLogin();
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <AppLogo />
          <h1>FlightDash Login</h1>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@airline.com"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <LogIn className="icon" />
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};
export default LoginPage;