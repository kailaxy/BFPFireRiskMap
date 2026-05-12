import React, { useState, useContext } from "react";
import { UserContext } from "../logic.jsx";
import { API_BASE_URL } from "../config";

export default function RegisterForm({ onRegistered }) {
  const { setRole, setUser } = useContext(UserContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRoleLocal] = useState("responder");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      if (onRegistered) onRegistered();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
  <form className="register-form" onSubmit={handleSubmit} style={{ maxWidth: 320, margin: "2rem auto", padding: 24, background: "var(--input-bg)", borderRadius: 8 }}>
      <h2>Register</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} required />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Role</label>
        <select value={role} onChange={e => setRoleLocal(e.target.value)}>
          <option value="responder">Responder</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
  <button type="submit" disabled={loading} style={{ width: "100%", padding: "8px 0", background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 4 }}>
        {loading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
