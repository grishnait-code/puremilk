import React from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEnterprises } from "../api/client";
import { useEnterprise } from "../context/EnterpriseContext";

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
  select: {
    marginLeft: "auto",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    outline: "none",
    minWidth: 200,
    maxWidth: 320,
  },
};

const links = [
  { to: "/deliveries",      label: "Поставки" },
  { to: "/enterprises",     label: "Предприятия" },
  { to: "/audits",          label: "Аудиты" },
  { to: "/analytics",       label: "Аналитика" },
  { to: "/grade-standards", label: "Нормативы" },
  { to: "/import",          label: "Загрузка данных" },
];

export default function Navbar() {
  const { selectedEnterprise, setSelectedEnterprise } = useEnterprise();

  const { data } = useQuery({
    queryKey: ["enterprises-nav"],
    queryFn: () => getEnterprises({ page_size: 100 }),
    staleTime: 5 * 60_000,
  });

  const enterprises = data?.items || [];

  const handleChange = (e) => {
    const id = e.target.value;
    if (!id) {
      setSelectedEnterprise(null);
    } else {
      const found = enterprises.find((en) => String(en.id) === id);
      setSelectedEnterprise(found ? { id: found.id, name: found.short_name || found.name } : null);
    }
  };

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

      <select
        style={S.select}
        value={selectedEnterprise?.id ?? ""}
        onChange={handleChange}
      >
        <option value="" style={{ color: "#222", background: "#fff" }}>Все предприятия</option>
        {enterprises.map((e) => (
          <option key={e.id} value={e.id} style={{ color: "#222", background: "#fff" }}>
            {e.short_name || e.name}
          </option>
        ))}
      </select>
    </nav>
  );
}
