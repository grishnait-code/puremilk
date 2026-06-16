import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginApi } from "../api/client";

const S = {
  page: {
    minHeight: "100vh", background: "#f5f6fa",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  card: {
    background: "#fff", borderRadius: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    padding: "48px 40px", width: 360,
  },
  logo: {
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: 32, justifyContent: "center",
  },
  title: {
    fontSize: 22, fontWeight: 700, color: "#1a3a5c", margin: 0,
  },
  label: {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#555", marginBottom: 6, marginTop: 20,
  },
  input: {
    width: "100%", padding: "10px 14px", fontSize: 15,
    border: "1.5px solid #dce1ea", borderRadius: 8,
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  btn: {
    marginTop: 28, width: "100%", padding: "12px 0",
    background: "#1a3a5c", color: "#fff", border: "none",
    borderRadius: 8, fontSize: 15, fontWeight: 600,
    cursor: "pointer", transition: "background 0.2s",
  },
  error: {
    marginTop: 16, padding: "10px 14px",
    background: "#fff0f0", border: "1px solid #ffcccc",
    borderRadius: 8, color: "#c0392b", fontSize: 14,
  },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginApi(username, password);
      login(data.access_token, data.user);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || "Неверный логин или пароль";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <img src="/logo.png" alt="PureMilk" style={{ height: 44, width: 44, objectFit: "contain" }} />
          <span style={S.title}>PureMilk</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={S.label}>Логин</label>
          <input
            style={S.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label style={S.label}>Пароль</label>
          <input
            style={S.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div style={S.error}>{error}</div>}

          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
