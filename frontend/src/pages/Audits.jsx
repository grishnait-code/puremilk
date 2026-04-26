import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getAudits } from "../api/client";

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  filterBar: { display: "flex", gap: 12, alignItems: "center", marginBottom: 20,
    background: "#fff", padding: "12px 16px", borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  select: { padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 },
  toggle: (active) => ({
    padding: "7px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
    border: "1px solid " + (active ? "#c62828" : "#ddd"),
    background: active ? "#ffebee" : "#fff",
    color: active ? "#c62828" : "#555",
    fontWeight: active ? 600 : 400,
  }),
  table: { width: "100%", borderCollapse: "collapse", background: "#fff",
    borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { background: "#1a3a5c", color: "#fff", padding: "11px 14px",
    textAlign: "left", fontSize: 12, fontWeight: 600 },
  td: { padding: "11px 14px", borderBottom: "1px solid #f0f0f0", fontSize: 13 },
  resultBadge: (r) => ({
    padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
    background: r === "одобрено" ? "#e8f5e9" : r === "условно" ? "#fff8e1" : "#ffebee",
    color: r === "одобрено" ? "#2e7d32" : r === "условно" ? "#f57f17" : "#c62828",
  }),
};

export default function Audits() {
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [result, setResult] = useState("");
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["audits", overdueOnly, result],
    queryFn: () => getAudits({
      overdue_only: overdueOnly || undefined,
      result: result || undefined,
    }),
  });

  const overdue = data.filter((a) => a.overdue_days > 0);
  const upcoming = data.filter((a) => {
    if (!a.next_audit_date) return false;
    const diff = (new Date(a.next_audit_date) - new Date()) / 86400000;
    return diff >= 0 && diff <= 30;
  });

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Аудиты</h1>
        {overdue.length > 0 && (
          <span style={{ background: "#ffebee", color: "#c62828", padding: "4px 14px",
            borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            ⚠ Просрочено: {overdue.length}
          </span>
        )}
        {upcoming.length > 0 && (
          <span style={{ background: "#fff8e1", color: "#f57f17", padding: "4px 14px",
            borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            📅 Ближайшие 30 дней: {upcoming.length}
          </span>
        )}
      </div>

      <div style={S.filterBar}>
        <button style={S.toggle(overdueOnly)} onClick={() => setOverdueOnly(!overdueOnly)}>
          Только просроченные
        </button>
        <select style={S.select} value={result} onChange={(e) => setResult(e.target.value)}>
          <option value="">Все результаты</option>
          <option value="одобрено">Одобрено</option>
          <option value="условно">Условно</option>
          <option value="отказано">Отказано</option>
        </select>
        <span style={{ marginLeft: "auto", color: "#666", fontSize: 13 }}>
          Всего: {data.length}
        </span>
      </div>

      {isLoading ? (
        <p style={{ color: "#666" }}>Загрузка...</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Предприятие / Ферма</th>
              <th style={S.th}>Дата аудита</th>
              <th style={S.th}>Результат</th>
              <th style={S.th}>Одобрен на</th>
              <th style={S.th}>Следующий аудит</th>
              <th style={S.th}>Уведомление</th>
              <th style={S.th}>Статус</th>
              <th style={S.th}>Примечания</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => {
              const nextDate = a.next_audit_date ? new Date(a.next_audit_date) : null;
              const daysLeft = nextDate ? Math.round((nextDate - new Date()) / 86400000) : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

              return (
                <tr key={a.id}
                  style={{ background: isOverdue ? "#fff5f5" : "" }}
                  onMouseEnter={(e) => !isOverdue && (e.currentTarget.style.background = "#f8f9ff")}
                  onMouseLeave={(e) => !isOverdue && (e.currentTarget.style.background = "")}
                >
                  <td style={S.td}>
                    {a.enterprise_name && (
                      <div
                        style={{ fontWeight: 600, color: "#1565c0", cursor: "pointer" }}
                        onClick={() => a.enterprise_id && navigate(`/enterprise/${a.enterprise_id}`)}
                      >
                        {a.enterprise_name}
                      </div>
                    )}
                    {a.farm_name && (
                      <div style={{ fontSize: 12, color: "#888" }}>{a.farm_name}</div>
                    )}
                  </td>
                  <td style={S.td}>
                    {new Date(a.audit_date).toLocaleDateString("ru-RU")}
                  </td>
                  <td style={S.td}>
                    <span style={S.resultBadge(a.result)}>{a.result}</span>
                  </td>
                  <td style={S.td}>{a.approval_months} мес.</td>
                  <td style={S.td}>
                    {nextDate
                      ? nextDate.toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                  <td style={S.td}>
                    {a.notification_date
                      ? new Date(a.notification_date).toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                  <td style={S.td}>
                    {isOverdue ? (
                      <span style={{ background: "#ffebee", color: "#c62828",
                        padding: "3px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                        +{Math.abs(daysLeft)} дн. просрочка
                      </span>
                    ) : isSoon ? (
                      <span style={{ background: "#fff8e1", color: "#f57f17",
                        padding: "3px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                        Через {daysLeft} дн.
                      </span>
                    ) : daysLeft !== null ? (
                      <span style={{ color: "#43a047", fontSize: 12 }}>✓ через {daysLeft} дн.</span>
                    ) : "—"}
                  </td>
                  <td style={{ ...S.td, color: "#888", fontSize: 12 }}>{a.notes || "—"}</td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#999", padding: 32 }}>
                  Аудиты не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
