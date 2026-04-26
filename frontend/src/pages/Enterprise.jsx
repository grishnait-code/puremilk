import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ReferenceLine, ResponsiveContainer
} from "recharts";
import { getEnterprise, getEnterpriseFarms, getEnterpriseAudits, getEnterpriseYearly } from "../api/client";

const S = {
  page: { padding: "24px 32px" },
  back: { color: "#1565c0", cursor: "pointer", fontSize: 14, marginBottom: 16,
    display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" },
  header: { marginBottom: 24 },
  name: { fontSize: 28, fontWeight: 700, color: "#1a3a5c" },
  meta: { color: "#666", fontSize: 14, marginTop: 6, display: "flex", gap: 24 },
  tabs: { display: "flex", gap: 0, borderBottom: "2px solid #e0e0e0", marginBottom: 24 },
  tab: { padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 500,
    color: "#666", borderBottom: "2px solid transparent", marginBottom: -2 },
  tabActive: { color: "#1a3a5c", borderBottom: "2px solid #1a3a5c" },
  card: { background: "#fff", borderRadius: 12, padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: "#1a3a5c", marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 },
  infoItem: { display: "flex", flexDirection: "column", gap: 2 },
  infoLabel: { fontSize: 12, color: "#999", fontWeight: 500 },
  infoValue: { fontSize: 14, color: "#222", fontWeight: 500 },
  auditBadge: (result) => ({
    padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
    background: result === "одобрено" ? "#e8f5e9" : result === "условно" ? "#fff8e1" : "#ffebee",
    color: result === "одобрено" ? "#2e7d32" : result === "условно" ? "#f57f17" : "#c62828",
  }),
  overdueChip: { padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
    background: "#ffebee", color: "#c62828", marginLeft: 8 },
};

const TABS = ["Сводка", "Динамика качества", "Фермы и аудиты"];

export default function Enterprise() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const { data: enterprise, isLoading } = useQuery({
    queryKey: ["enterprise", id],
    queryFn: () => getEnterprise(id),
  });
  const { data: farms = [] } = useQuery({
    queryKey: ["enterprise-farms", id],
    queryFn: () => getEnterpriseFarms(id),
  });
  const { data: audits = [] } = useQuery({
    queryKey: ["enterprise-audits", id],
    queryFn: () => getEnterpriseAudits(id),
  });
  const { data: yearly = [] } = useQuery({
    queryKey: ["enterprise-yearly", id],
    queryFn: () => getEnterpriseYearly(id),
  });

  if (isLoading) return <div style={S.page}><p style={{ color: "#666" }}>Загрузка...</p></div>;
  if (!enterprise) return <div style={S.page}><p>Предприятие не найдено</p></div>;

  return (
    <div style={S.page}>
      <span style={S.back} onClick={() => navigate("/enterprises")}>← Все предприятия</span>

      <div style={S.header}>
        <h1 style={S.name}>{enterprise.name}</h1>
        <div style={S.meta}>
          {enterprise.inn && <span>ИНН: {enterprise.inn}</span>}
          {enterprise.region && <span>Регион: {enterprise.region}</span>}
          {enterprise.director_name && <span>Рук.: {enterprise.director_name}</span>}
          {enterprise.phone && <span>Тел.: {enterprise.phone}</span>}
        </div>
      </div>

      <div style={S.tabs}>
        {TABS.map((t, i) => (
          <div
            key={t}
            style={i === activeTab ? { ...S.tab, ...S.tabActive } : S.tab}
            onClick={() => setActiveTab(i)}
          >
            {t}
          </div>
        ))}
      </div>

      {activeTab === 0 && (
        <>
          <div style={S.card}>
            <div style={S.cardTitle}>Реквизиты</div>
            <div style={S.grid}>
              {[
                ["Полное название", enterprise.name],
                ["Краткое название", enterprise.short_name],
                ["ОПФ", enterprise.org_form],
                ["ИНН", enterprise.inn],
                ["ОГРН", enterprise.ogrn],
                ["Регион", enterprise.region],
                ["Адрес", enterprise.legal_address],
                ["Руководитель", enterprise.director_name],
                ["Должность", enterprise.director_position],
                ["Телефон", enterprise.phone],
                ["Email", enterprise.email],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={S.infoItem}>
                  <span style={S.infoLabel}>{label}</span>
                  <span style={S.infoValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {yearly.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={S.card}>
                <div style={S.cardTitle}>Соматические клетки (тыс. ед./мл)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={yearly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, 400]} />
                    <Tooltip />
                    <ReferenceLine y={200} stroke="#e53935" strokeDasharray="4 4" label={{ value: "200 (норма)", fill: "#e53935", fontSize: 11 }} />
                    <Line type="monotone" dataKey="avg_scc" stroke="#1565c0" dot={true} name="SCC" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={S.card}>
                <div style={S.cardTitle}>Жир и белок (%)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={yearly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[2.5, 5]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg_fat_pct" stroke="#fb8c00" dot name="Жир %" />
                    <Line type="monotone" dataKey="avg_protein_pct" stroke="#43a047" dot name="Белок %" />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 1 && yearly.length > 0 && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            <div style={S.card}>
              <div style={S.cardTitle}>КМАФАнМ (тыс. КОЕ/мл)</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={yearly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={50} stroke="#e53935" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="avg_bact_count" stroke="#7b1fa2" name="Бактерии" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>БГКП (КОЕ/мл)</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={yearly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={100} stroke="#e53935" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="avg_coliforms" stroke="#e53935" name="БГКП" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={S.card}>
              <div style={S.cardTitle}>Споры клостридий (НВЧ/л)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={yearly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={1000} stroke="#e53935" strokeDasharray="4 4" />
                  <Bar dataKey="avg_clostridium" fill="#5c6bc0" name="Клостридии" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Сортность (% от объёма)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={yearly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${v?.toFixed(1)}%`} />
                  <Bar dataKey="grade_E_pct" stackId="a" fill="#43a047" name="Экстра" />
                  <Bar dataKey="grade_I_pct" stackId="a" fill="#fb8c00" name="Сорт I" />
                  <Bar dataKey="grade_II_pct" stackId="a" fill="#e53935" name="Сорт II" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div>
          {farms.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Фермы ({farms.length})</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Название", "Поголовье", "Дойное стадо", "Система доения", "Тип содержания"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px",
                        borderBottom: "2px solid #e0e0e0", fontSize: 13, color: "#666" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {farms.map((f) => (
                    <tr key={f.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{f.name}</td>
                      <td style={{ padding: "10px 12px" }}>{f.herd_size || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{f.milking_cows || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{f.milking_system || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{f.housing_type || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {audits.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>История аудитов</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Дата аудита", "Результат", "Одобрен до", "Следующий аудит", "Просрочка"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px",
                        borderBottom: "2px solid #e0e0e0", fontSize: 13, color: "#666" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "10px 12px" }}>
                        {new Date(a.audit_date).toLocaleDateString("ru-RU")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={S.auditBadge(a.result)}>{a.result}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{a.approval_months} мес.</td>
                      <td style={{ padding: "10px 12px" }}>
                        {a.next_audit_date
                          ? new Date(a.next_audit_date).toLocaleDateString("ru-RU")
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {a.overdue_days > 0 ? (
                          <span style={S.overdueChip}>+{a.overdue_days} дн.</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
