import React, { useState, useEffect } from "react";
import AppLogo from "./AppLogo";
import { LogIn, UserPlus } from "lucide-react";

const LoginPage = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [animateExit, setAnimateExit] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setAnimateExit(true); // trigger walk-out animation
    setTimeout(() => onLogin(), 1500); // wait for animation to finish
  };

  return (
    <div className={`auth-scene ${animateExit ? "exit" : ""}`}>
      {/* --- Animated Walking Figure --- */}
      <div className="walk-figure">
        <div className="figure-body">
          <div className="head"></div>
          <div className="arm left"></div>
          <div className="arm right"></div>
          <div className="leg left"></div>
          <div className="leg right"></div>
        </div>
        <div className="motion-lines">
          <span></span><span></span><span></span>
        </div>
      </div>

      {/* --- Auth Card --- */}
      <div className={`auth-card ${isSignUp ? "slide-signup" : "slide-login"}`}>
        <div className="auth-header">
          <AppLogo />
          <h1>FlightDash {isSignUp ? "Sign Up" : "Login"}</h1>
          <p>Access your flight operations dashboard</p>
        </div>

        <div className="form-slider">
          {/* === Sign In Form === */}
          <form
            className={`auth-form ${!isSignUp ? "active" : ""}`}
            onSubmit={handleSubmit}
          >
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="user@airline.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <LogIn className="icon" /> Sign In
            </button>
            <p className="switch-text">
              Don’t have an account?{" "}
              <span onClick={() => setIsSignUp(true)}>Sign Up</span>
            </p>
          </form>

          {/* === Sign Up Form === */}
          <form
            className={`auth-form ${isSignUp ? "active" : ""}`}
            onSubmit={handleSubmit}
          >
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="user@airline.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              <UserPlus className="icon" /> Create Account
            </button>
            <p className="switch-text">
              Already have an account?{" "}
              <span onClick={() => setIsSignUp(false)}>Sign In</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
