import React, { useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

/**
 * Кнопка скачивания PDF-отчёта.
 * Props: enterpriseId, enterpriseName
 */
export default function DownloadReportBtn({ enterpriseId, enterpriseName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const curYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${curYear - 1}-01-01`);
  const [dateTo,   setDateTo]   = useState(`${curYear}-12-31`);
  const [groupBy,  setGroupBy]  = useState("month");

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get(`/reports/enterprise/${enterpriseId}/pdf`, {
        params: { date_from: dateFrom, date_to: dateTo, group_by: groupBy },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      const safe = (enterpriseName || "report").replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g, "_");
      a.href = url;
      a.download = `Отчет_${safe}_${dateFrom}_${dateTo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      const msg = e.response?.status === 404
        ? "Нет данных за выбранный период"
        : "Ошибка генерации отчёта";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const S = {
    btn: {
      padding: "7px 16px", background: "#1a3a5c", color: "#fff",
      border: "none", borderRadius: 7, cursor: "pointer",
      fontSize: 13, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 6,
    },
    panel: {
      marginTop: 12, background: "#fff", border: "1px solid #e0e0e0",
      borderRadius: 10, padding: "16px 20px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      display: "inline-flex", flexDirection: "column", gap: 12, minWidth: 320,
    },
    row: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
    label: { fontSize: 12, color: "#666", fontWeight: 500, minWidth: 80 },
    input: { padding: "6px 10px", border: "1px solid #ddd", borderRadius: 5,
      fontSize: 13, outline: "none" },
    select: { padding: "6px 10px", border: "1px solid #ddd", borderRadius: 5,
      fontSize: 13, background: "#fff" },
    dlBtn: (loading) => ({
      padding: "8px 20px", background: loading ? "#90a4ae" : "#1a3a5c",
      color: "#fff", border: "none", borderRadius: 6,
      cursor: loading ? "not-allowed" : "pointer",
      fontSize: 13, fontWeight: 600,
    }),
    cancelBtn: {
      padding: "8px 16px", background: "#f5f5f5", border: "1px solid #ddd",
      borderRadius: 6, cursor: "pointer", fontSize: 13,
    },
    error: { fontSize: 12, color: "#c62828", marginTop: 4 },
  };

  return (
    <div style={{ display: "inline-block" }}>
      <button style={S.btn} onClick={() => setOpen((v) => !v)}>
        📄 {open ? "Скрыть" : "Скачать отчёт PDF"}
      </button>

      {open && (
        <div style={S.panel}>
          <div style={{ fontWeight: 600, color: "#1a3a5c", fontSize: 14 }}>
            Отчёт по качеству молока
          </div>

          <div style={S.row}>
            <span style={S.label}>Период с</span>
            <input style={S.input} type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div style={S.row}>
            <span style={S.label}>Период по</span>
            <input style={S.input} type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div style={S.row}>
            <span style={S.label}>Группировка</span>
            <select style={S.select} value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}>
              <option value="month">По месяцам</option>
              <option value="quarter">По кварталам</option>
              <option value="year">По годам</option>
            </select>
          </div>

          {error && <div style={S.error}>⚠ {error}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={S.dlBtn(loading)} disabled={loading} onClick={handleDownload}>
              {loading ? "Генерация..." : "⬇ Скачать PDF"}
            </button>
            <button style={S.cancelBtn} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}
