import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getEnterprises } from "../api/client";

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  searchBox: {
    padding: "8px 14px", border: "1px solid #ddd", borderRadius: 8,
    fontSize: 14, width: 280, outline: "none",
  },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff",
    borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { background: "#1a3a5c", color: "#fff", padding: "12px 16px",
    textAlign: "left", fontSize: 13, fontWeight: 600 },
  td: { padding: "12px 16px", borderBottom: "1px solid #f0f0f0", fontSize: 14 },
  row: { cursor: "pointer", transition: "background 0.15s" },
  badge: { padding: "2px 10px", borderRadius: 12, fontSize: 12,
    background: "#e3f2fd", color: "#1565c0", fontWeight: 600 },
};

export default function Enterprises() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["enterprises", search, page],
    queryFn: () => getEnterprises({ search: search || undefined, page, page_size: 25 }),
  });

  const navigate = useNavigate();

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Предприятия</h1>
        <input
          style={S.searchBox}
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {data && (
          <span style={{ marginLeft: "auto", color: "#666", fontSize: 13 }}>
            Всего: {data.total}
          </span>
        )}
      </div>

      {isLoading ? (
        <p style={{ color: "#666" }}>Загрузка...</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Предприятие</th>
              <th style={S.th}>Регион</th>
              <th style={S.th}>Ферм</th>
              <th style={S.th}>Последняя поставка</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((e) => (
              <tr
                key={e.id}
                style={S.row}
                onClick={() => navigate(`/enterprise/${e.id}`)}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = "#f0f4ff")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "")}
              >
                <td style={S.td}>
                  <div style={{ fontWeight: 600 }}>{e.short_name || e.name}</div>
                  {e.short_name && (
                    <div style={{ fontSize: 12, color: "#888" }}>{e.name}</div>
                  )}
                </td>
                <td style={S.td}>{e.region || "—"}</td>
                <td style={S.td}>
                  <span style={S.badge}>{e.farm_count}</span>
                </td>
                <td style={S.td}>
                  {e.last_delivery_date
                    ? new Date(e.last_delivery_date).toLocaleDateString("ru-RU")
                    : "—"}
                </td>
              </tr>
            ))}
            {(!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#999" }}>
                  Предприятия не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {data && data.total > 25 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: "6px 16px", cursor: "pointer", borderRadius: 6,
              border: "1px solid #ddd", background: page === 1 ? "#f5f5f5" : "#fff" }}
          >← Назад</button>
          <span style={{ padding: "6px 12px", color: "#666" }}>
            {page} / {Math.ceil(data.total / 25)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / 25)}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "6px 16px", cursor: "pointer", borderRadius: 6,
              border: "1px solid #ddd" }}
          >Вперёд →</button>
        </div>
      )}
    </div>
  );
}
