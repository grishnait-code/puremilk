import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const S = {
  nav: {
    display: "flex", alignItems: "center", gap: 0,
    background: "#1a3a5c", color: "#fff", padding: "0 24px",
    height: 56, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  },
  logo: {
    fontWeight: 700, fontSize: 18, color: "#fff",
    textDecoration: "none", marginRight: 32, letterSpacing: 0.5,
    display: "flex", alignItems: "center", gap: 8,
  },
  link: {
    color: "rgba(255,255,255,0.8)", textDecoration: "none",
    padding: "18px 16px", fontSize: 14, fontWeight: 500,
    borderBottom: "3px solid transparent", transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  linkActive: {
    color: "#fff", borderBottom: "3px solid #4fc3f7",
  },
  userZone: {
    marginLeft: "auto",
    display: "flex", alignItems: "center", gap: 12,
  },
  userInfo: {
    fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "right",
    lineHeight: 1.3,
  },
  userName: { fontWeight: 600, color: "#fff" },
  userRole: { fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 },
  logoutBtn: {
    background: "rgba(255,255,255,0.12)", color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8,
    padding: "6px 14px", fontSize: 13, fontWeight: 500,
    cursor: "pointer",
  },
};

const links = [
  { to: "/deliveries",      label: "Поставки" },
  { to: "/enterprises",     label: "Предприятия" },
  { to: "/processors",      label: "Переработчики" },
  { to: "/audits",          label: "Аудиты" },
  { to: "/analytics",       label: "Аналитика" },
  { to: "/grade-standards", label: "Нормативы" },
  { to: "/import",          label: "Загрузка данных" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav style={S.nav}>
      <NavLink to="/" style={S.logo}>
        <img src="/logo.png" alt="PureMilk"
          style={{ height: 40, width: 40, objectFit: "contain" }} />
        PureMilk
      </NavLink>

      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) =>
            isActive ? { ...S.link, ...S.linkActive } : S.link
          }
        >
          {label}
        </NavLink>
      ))}

      {user?.role === "admin" && (
        <NavLink
          to="/users"
          style={({ isActive }) =>
            isActive ? { ...S.link, ...S.linkActive } : S.link
          }
        >
          Пользователи
        </NavLink>
      )}

      <div style={S.userZone}>
        {user && (
          <div style={S.userInfo}>
            <div style={S.userName}>{user.full_name || user.username}</div>
            <div style={S.userRole}>{user.role === "admin" ? "Администратор" : "Пользователь"}</div>
          </div>
        )}
        <button
          style={S.logoutBtn}
          onClick={() => { logout(); navigate("/login"); }}
        >
          Выйти
        </button>
      </div>
    </nav>
  );
}
