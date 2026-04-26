import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const S = {
  nav: {
    display: "flex", alignItems: "center", gap: 0,
    background: "#1a3a5c", color: "#fff", padding: "0 24px",
    height: 56, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  },
  logo: {
    fontWeight: 700, fontSize: 18, color: "#fff",
    textDecoration: "none", marginRight: 32, letterSpacing: 0.5,
  },
  link: {
    color: "rgba(255,255,255,0.8)", textDecoration: "none",
    padding: "18px 16px", fontSize: 14, fontWeight: 500,
    borderBottom: "3px solid transparent", transition: "all 0.2s",
  },
  linkActive: {
    color: "#fff", borderBottom: "3px solid #4fc3f7",
  },
  badge: {
    marginLeft: "auto", background: "rgba(255,255,255,0.15)",
    borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600,
  },
};

export default function Navbar() {
  const links = [
    { to: "/deliveries", label: "Поставки" },
    { to: "/enterprises", label: "Предприятия" },
    { to: "/audits", label: "Аудиты" },
    { to: "/analytics", label: "Аналитика" },
  ];

  return (
    <nav style={S.nav}>
      <NavLink to="/" style={S.logo}>🥛 Quality Monitor</NavLink>
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
      <span style={S.badge}>Мониторинг качества молока</span>
    </nav>
  );
}
