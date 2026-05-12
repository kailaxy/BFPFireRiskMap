import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../logic.jsx";
import { API_BASE_URL } from "../config";

export default function LoginForm() {
  const { setRole, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setRole(data.user.role);
      setUser(data.user);
      // persist token and user for later sessions
      localStorage.setItem("token", data.token);
      try {
        localStorage.setItem("user", JSON.stringify(data.user));
      } catch (e) {
        // ignore storage errors
      }
      // navigate depending on role
      if (data.user && data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="login-title">Login</h2>
        <div className="login-field">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="login-field">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={loading} className="login-submit">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
