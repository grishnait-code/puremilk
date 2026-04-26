import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getDeliveries } from "../api/client";

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c", marginRight: 8 },
  filterBar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
    background: "#fff", padding: "12px 16px", borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 },
  input: { padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, outline: "none" },
  select: { padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, background: "#fff", cursor: "pointer" },
  label: { fontSize: 12, color: "#666", fontWeight: 500 },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff",
    borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { background: "#1a3a5c", color: "#fff", padding: "11px 14px",
    textAlign: "left", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f0f0f0", fontSize: 13 },
};

const gradeBadge = (pct, color, bg) =>
  pct ? <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
    {pct.toFixed(1)}%
  </span> : "—";

function sccColor(v) {
  if (!v) return {};
  if (v > 200) return { color: "#c62828", fontWeight: 700 };
  if (v > 150) return { color: "#f57f17", fontWeight: 600 };
  return { color: "#2e7d32" };
}

export default function Deliveries() {
  const [filters, setFilters] = useState({
    enterprise_id: "", date_from: "", date_to: "",
    has_antibiotics: "", grade: "", scc_max: "",
  });
  const [page, setPage] = useState(1);

  const params = Object.fromEntries(
    Object.entries({ ...filters, page, page_size: 25 })
      .filter(([, v]) => v !== "" && v !== null)
  );

  const { data, isLoading } = useQuery({
    queryKey: ["deliveries", params],
    queryFn: () => getDeliveries(params),
  });

  const setF = (key, val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Поставки</h1>
        {data && (
          <span style={{ color: "#666", fontSize: 13 }}>Найдено: {data.total}</span>
        )}
      </div>

      <div style={S.filterBar}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={S.label}>Дата с</span>
          <input type="date" style={S.input} value={filters.date_from}
            onChange={(e) => setF("date_from", e.target.value)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={S.label}>Дата по</span>
          <input type="date" style={S.input} value={filters.date_to}
            onChange={(e) => setF("date_to", e.target.value)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={S.label}>Сорт</span>
          <select style={S.select} value={filters.grade}
            onChange={(e) => setF("grade", e.target.value)}>
            <option value="">Все сорта</option>
            <option value="E">Экстра</option>
            <option value="I">Сорт I</option>
            <option value="II">Сорт II</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={S.label}>Антибиотики</span>
          <select style={S.select} value={filters.has_antibiotics}
            onChange={(e) => setF("has_antibiotics", e.target.value)}>
            <option value="">Все</option>
            <option value="false">Нет</option>
            <option value="true">Обнаружены</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={S.label}>SCC макс.</span>
          <input type="number" style={{ ...S.input, width: 90 }} placeholder="200"
            value={filters.scc_max}
            onChange={(e) => setF("scc_max", e.target.value)} />
        </div>
        <button
          onClick={() => { setFilters({ enterprise_id: "", date_from: "", date_to: "",
            has_antibiotics: "", grade: "", scc_max: "" }); setPage(1); }}
          style={{ padding: "7px 14px", background: "#f5f5f5", border: "1px solid #ddd",
            borderRadius: 6, cursor: "pointer", fontSize: 13, marginTop: 18 }}
        >Сбросить</button>
      </div>

      {isLoading ? (
        <p style={{ color: "#666" }}>Загрузка...</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Дата</th>
              <th style={S.th}>Предприятие</th>
              <th style={S.th}>Вес, кг</th>
              <th style={S.th}>Экстра</th>
              <th style={S.th}>Сорт I</th>
              <th style={S.th}>Сорт II</th>
              <th style={S.th}>SCC</th>
              <th style={S.th}>Бактерии</th>
              <th style={S.th}>Жир %</th>
              <th style={S.th}>Белок %</th>
              <th style={S.th}>Антибиотики</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((d) => {
              const total = d.weight_kg || 0;
              const ePct = total > 0 && d.grade_E_final_kg ? d.grade_E_final_kg / total * 100 : null;
              const iPct = total > 0 && d.grade_I_kg ? d.grade_I_kg / total * 100 : null;
              const iiPct = total > 0 && d.grade_II_kg ? d.grade_II_kg / total * 100 : null;
              const q = d.quality;
              return (
                <tr key={d.id}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9ff"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  <td style={{ ...S.td, fontWeight: 500 }}>
                    {new Date(d.delivery_date).toLocaleDateString("ru-RU")}
                  </td>
                  <td style={S.td}>{d.enterprise_name || `#${d.enterprise_id}`}</td>
                  <td style={S.td}>{total > 0 ? Math.round(total).toLocaleString("ru-RU") : "—"}</td>
                  <td style={S.td}>{gradeBadge(ePct, "#2e7d32", "#e8f5e9")}</td>
                  <td style={S.td}>{gradeBadge(iPct, "#f57f17", "#fff8e1")}</td>
                  <td style={S.td}>{gradeBadge(iiPct, "#c62828", "#ffebee")}</td>
                  <td style={{ ...S.td, ...sccColor(q?.scc) }}>
                    {q?.scc ? q.scc.toFixed(0) : "—"}
                  </td>
                  <td style={S.td}>{q?.bact_count_lab ? q.bact_count_lab.toFixed(1) : "—"}</td>
                  <td style={S.td}>{q?.fat_pct ? q.fat_pct.toFixed(2) : "—"}</td>
                  <td style={S.td}>{q?.protein_pct ? q.protein_pct.toFixed(2) : "—"}</td>
                  <td style={S.td}>
                    {d.has_antibiotics
                      ? <span style={{ color: "#c62828", fontWeight: 700 }}>⚠ Да</span>
                      : <span style={{ color: "#aaa" }}>Нет</span>}
                  </td>
                </tr>
              );
            })}
            {(!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={11} style={{ ...S.td, textAlign: "center", color: "#999", padding: 32 }}>
                  Поставки не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {data && data.total > 25 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            style={{ padding: "6px 16px", cursor: "pointer", borderRadius: 6,
              border: "1px solid #ddd", background: page === 1 ? "#f5f5f5" : "#fff" }}>← Назад</button>
          <span style={{ color: "#666", fontSize: 13 }}>
            {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} из {data.total}
          </span>
          <button disabled={page >= Math.ceil(data.total / 25)} onClick={() => setPage((p) => p + 1)}
            style={{ padding: "6px 16px", cursor: "pointer", borderRadius: 6, border: "1px solid #ddd" }}>
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
