// frontend/src/components/Form.jsx (Corrected)

import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import logo from "../assets/simplelogo.png";
import "../styles/ModernForm.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTaskStore } from "../stores/useTaskStore";

const ModernForm = ({ route, method }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showSuccessNotification, showErrorNotification } = useTaskStore();
  const name = method === "login" ? "Login" : "Register";

  const notifyError = (message) => toast.error(message);

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();

    try {
      const res = await api.post(route, { username, password });
      
      if (method === "login") {
        // --- CORRECTLY STORE BOTH TOKENS ---
        // Your backend returns 'access' and 'refresh' keys
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
        
        // --- THE KEY FIX: Force a full page reload ---
        // This ensures the PermissionsProvider remounts and reads the new token.
        window.location.href = "/";

      } else {
        // After registration, navigate to login so they can sign in.
        navigate("/login");
        showSuccessNotification("Registration Done!","Registration successful! Please log in.");
      }
    } catch (error) {
      if (error.response && error.response.data) {
        // Try to find a more specific error message from the backend
        const errorDetail = error.response.data.detail || "Authentication failed. Please check your credentials and try again.";
        notifyError(errorDetail);
      } else {
        notifyError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <div className="form-header">
          <img src={logo} alt="Logo" className="logo" />
          <h1>{name}</h1>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
          <div className="input-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="input-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className={`submit-btn ${loading ? "loading" : ""}`}>
            {loading ? (
              <div className="loader"></div>
            ) : (
              name
            )}
          </button>

          <div className="footer-text">
            {method === "login" ? (
              <p>
                Don't have an account?{" "}
                <span onClick={() => navigate("/register")} className="link-text">
                  Register
                </span>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <span onClick={() => navigate("/login")} className="link-text">
                  Login
                </span>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModernForm;