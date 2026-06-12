import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ReferenceLine, ResponsiveContainer
} from "recharts";
import {
  getEnterprise, getEnterpriseFarms, getEnterpriseAudits, getEnterpriseYearly,
  getEnterpriseReport, createFarm, updateFarm, deleteFarm
} from "../api/client";
import DownloadReportBtn from "../components/DownloadReportBtn";

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

// ── Цветовая индикация значения ───────────────────────────────────────────

function valueColor(v, target) {
  if (v === null || v === undefined) return "#bbb";
  if (target.startsWith("<")) {
    const lim = parseFloat(target.replace(/[^0-9.,]/g, "").replace(",", "."));
    return v > lim ? "#c62828" : v > lim * 0.8 ? "#f57f17" : "#2e7d32";
  }
  if (target.startsWith("≥")) {
    const lim = parseFloat(target.replace(/[^0-9.,]/g, "").replace(",", "."));
    return v < lim ? "#c62828" : "#2e7d32";
  }
  return "inherit";
}

// ── Таблица Report с раскрываемыми кварталами ─────────────────────────────

function ReportTable({ report }) {
  const [expanded, setExpanded] = useState(new Set());

  const toggleYear = (yr) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(yr) ? next.delete(yr) : next.add(yr);
      return next;
    });
  };

  const { year_groups, indicators } = report;

  const TH_YEAR = {
    background: "#1a3a5c", color: "#fff", padding: "8px 10px",
    textAlign: "center", fontWeight: 700, whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none", minWidth: 90,
    borderRight: "2px solid rgba(255,255,255,0.3)",
  };
  const TH_QTR = {
    background: "#2d5278", color: "#fff", padding: "8px 8px",
    textAlign: "center", fontWeight: 500, whiteSpace: "nowrap",
    fontSize: 11, minWidth: 72,
    borderRight: "1px solid rgba(255,255,255,0.15)",
  };

  return (
    <div style={{ ...S.card, overflowX: "auto", marginBottom: 24 }}>
      <div style={S.cardTitle}>Показатели качества молока по периодам</div>
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>
        Нажмите на год, чтобы раскрыть кварталы
      </div>
      <table style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            {/* Фиксированный заголовок показателя */}
            <th style={{ background: "#1a3a5c", color: "#fff", padding: "8px 12px",
              textAlign: "left", position: "sticky", left: 0, zIndex: 2,
              minWidth: 230, fontWeight: 600,
              borderRight: "2px solid rgba(255,255,255,0.3)" }}>
              Показатель
            </th>
            {/* Столбцы по годам */}
            {year_groups.map((yg) => {
              const isExp = expanded.has(yg.year);
              return (
                <React.Fragment key={yg.year}>
                  {/* Квартальные столбцы (при раскрытии) */}
                  {isExp && yg.quarters.map((q) => (
                    <th key={q.label} style={TH_QTR}>{q.label}</th>
                  ))}
                  {/* Годовой столбец */}
                  <th
                    style={TH_YEAR}
                    onClick={() => toggleYear(yg.year)}
                    title={isExp ? "Свернуть кварталы" : "Развернуть кварталы"}
                  >
                    {isExp ? "▾" : "▸"} {yg.year}
                  </th>
                </React.Fragment>
              );
            })}
            {/* Цель */}
            <th style={{ background: "#2e7d32", color: "#fff", padding: "8px 10px",
              textAlign: "center", fontWeight: 700, minWidth: 90 }}>
              Цель
            </th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind, ri) => {
            const rowBg = ri % 2 === 0 ? "#fff" : "#f9f9f9";
            return (
              <tr key={ind.key} style={{ background: rowBg }}>
                {/* Название показателя */}
                <td style={{ padding: "7px 12px", fontWeight: 500,
                  borderBottom: "1px solid #eee", position: "sticky",
                  left: 0, background: rowBg, zIndex: 1, whiteSpace: "nowrap",
                  borderRight: "2px solid #e0e0e0" }}>
                  {ind.label}
                </td>
                {/* Значения по годам */}
                {year_groups.map((yg) => {
                  const isExp = expanded.has(yg.year);
                  return (
                    <React.Fragment key={yg.year}>
                      {/* Квартальные значения */}
                      {isExp && yg.quarters.map((q) => {
                        const v = q.data[ind.key];
                        return (
                          <td key={q.label} style={{
                            padding: "7px 8px", textAlign: "center",
                            borderBottom: "1px solid #eee",
                            borderRight: "1px solid #f0f0f0",
                            color: valueColor(v, ind.target),
                            background: rowBg,
                          }}>
                            {v ?? "—"}
                          </td>
                        );
                      })}
                      {/* Годовое значение */}
                      {(() => {
                        const v = yg.annual[ind.key];
                        return (
                          <td style={{
                            padding: "7px 10px", textAlign: "center",
                            borderBottom: "1px solid #eee",
                            borderRight: "2px solid #e0e0e0",
                            fontWeight: 700,
                            color: valueColor(v, ind.target),
                            background: isExp
                              ? "rgba(26,58,92,0.06)"
                              : rowBg,
                          }}>
                            {v ?? "—"}
                          </td>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
                {/* Цель */}
                <td style={{ padding: "7px 10px", textAlign: "center",
                  borderBottom: "1px solid #eee", fontWeight: 600,
                  color: "#2e7d32", background: "rgba(46,125,50,0.05)" }}>
                  {ind.target}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


const TABS = ["Сводка", "Динамика качества", "Фермы и аудиты"];

// ── Поля формы фермы ───────────────────────────────────────────────────────

const FARM_SECTIONS = [
  {
    title: "Основное",
    fields: [
      { key: "name",    label: "Название фермы *", wide: true },
      { key: "address", label: "Адрес", wide: true },
      { key: "region",  label: "Регион" },
      { key: "coordinates", label: "Координаты (широта, долгота)" },
    ],
  },
  {
    title: "Производство",
    fields: [
      { key: "herd_size",       label: "Общее поголовье КРС, гол.", type: "number" },
      { key: "milking_cows",    label: "Дойное стадо, гол.",       type: "number" },
      { key: "annual_volume_t", label: "Годовой объём, т",          type: "number" },
    ],
  },
  {
    title: "Технология содержания",
    fields: [
      { key: "housing_type",   label: "Тип содержания",      placeholder: "привязное / беспривязное" },
      { key: "milking_system", label: "Система доения",       placeholder: "ёлочка / параллель / робот" },
      { key: "floor_type",     label: "Тип пола",             placeholder: "щелевой / сплошной / резиновое покрытие" },
      { key: "cooling_system", label: "Система охлаждения молока" },
    ],
  },
  {
    title: "Примечания",
    fields: [{ key: "notes", label: "Комментарии", multiline: true, wide: true }],
  },
];

const EMPTY_FARM = Object.fromEntries(
  FARM_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, ""]))
);

// ── Модальное окно фермы ───────────────────────────────────────────────────

const MO = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    zIndex: 2000, display: "flex", alignItems: "flex-start",
    justifyContent: "center", paddingTop: 40, paddingBottom: 40, overflowY: "auto" },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680,
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)", margin: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 24px", borderBottom: "1px solid #eee" },
  title: { fontSize: 17, fontWeight: 700, color: "#1a3a5c" },
  body: { padding: "20px 24px" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#1a3a5c",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
    paddingBottom: 5, borderBottom: "2px solid #e8f0fe" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 3 },
  label: { fontSize: 12, color: "#666", fontWeight: 500 },
  input: { padding: "7px 11px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, outline: "none", width: "100%" },
  textarea: { padding: "7px 11px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, outline: "none", width: "100%", minHeight: 64,
    resize: "vertical", fontFamily: "inherit" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "14px 24px", borderTop: "1px solid #eee" },
  btn: (primary) => ({
    padding: "7px 20px", borderRadius: 6, cursor: "pointer", fontSize: 13,
    fontWeight: primary ? 600 : 400,
    background: primary ? "#1a3a5c" : "#f5f5f5",
    color: primary ? "#fff" : "#333",
    border: primary ? "none" : "1px solid #ddd",
  }),
};

function FarmModal({ farm, onClose, onSave }) {
  const [form, setForm] = useState(
    farm ? Object.fromEntries(Object.keys(EMPTY_FARM).map((k) => [k, farm[k] ?? ""])) : EMPTY_FARM
  );
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { alert("Введите название фермы"); return; }
    const data = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
    );
    onSave(data);
  };

  return (
    <div style={MO.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={MO.modal}>
        <div style={MO.header}>
          <span style={MO.title}>{farm ? "Редактировать ферму" : "Добавить ферму"}</span>
          <button style={{ background: "none", border: "none", fontSize: 20,
            cursor: "pointer", color: "#999" }} onClick={onClose}>✕</button>
        </div>
        <div style={MO.body}>
          {FARM_SECTIONS.map((sec) => (
            <div key={sec.title} style={MO.section}>
              <div style={MO.sectionTitle}>{sec.title}</div>
              <div style={MO.grid}>
                {sec.fields.map((f) => (
                  <div key={f.key}
                    style={f.wide ? { ...MO.field, gridColumn: "1 / -1" } : MO.field}>
                    <label style={MO.label}>{f.label}</label>
                    {f.multiline ? (
                      <textarea style={MO.textarea} value={form[f.key]}
                        onChange={(e) => setF(f.key, e.target.value)} />
                    ) : (
                      <input style={MO.input} type={f.type || "text"}
                        placeholder={f.placeholder || ""}
                        value={form[f.key]}
                        onChange={(e) => setF(f.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={MO.footer}>
          <button style={MO.btn(false)} onClick={onClose}>Отмена</button>
          <button style={MO.btn(true)} onClick={handleSave}>
            {farm ? "Сохранить" : "Добавить ферму"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Главный компонент ──────────────────────────────────────────────────────

export default function Enterprise() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 0);
  const [farmModal, setFarmModal] = useState(null); // null | "new" | farm object
  const [deletingFarm, setDeletingFarm] = useState(null);
  const queryClient = useQueryClient();

  const { data: enterprise, isLoading } = useQuery({
    queryKey: ["enterprise", id],
    queryFn: () => getEnterprise(id),
  });
  const { data: farms = [] } = useQuery({
    queryKey: ["enterprise-farms", id],
    queryFn: () => getEnterpriseFarms(id),
  });

  const createFarmMut = useMutation({
    mutationFn: (data) => createFarm(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["enterprise-farms", id]); setFarmModal(null); },
  });
  const updateFarmMut = useMutation({
    mutationFn: ({ farmId, data }) => updateFarm(id, farmId, data),
    onSuccess: () => { queryClient.invalidateQueries(["enterprise-farms", id]); setFarmModal(null); },
  });
  const deleteFarmMut = useMutation({
    mutationFn: (farmId) => deleteFarm(id, farmId),
    onSuccess: () => { queryClient.invalidateQueries(["enterprise-farms", id]); setDeletingFarm(null); },
  });
  const { data: audits = [] } = useQuery({
    queryKey: ["enterprise-audits", id],
    queryFn: () => getEnterpriseAudits(id),
  });
  const { data: yearly = [] } = useQuery({
    queryKey: ["enterprise-yearly", id],
    queryFn: () => getEnterpriseYearly(id),
  });
  const { data: report } = useQuery({
    queryKey: ["enterprise-report", id],
    queryFn: () => getEnterpriseReport(id),
  });

  if (isLoading) return <div style={S.page}><p style={{ color: "#666" }}>Загрузка...</p></div>;
  if (!enterprise) return <div style={S.page}><p>Предприятие не найдено</p></div>;

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={S.back} onClick={() => navigate("/enterprises")}>← Все предприятия</span>
        <DownloadReportBtn enterpriseId={id} enterpriseName={enterprise?.short_name || enterprise?.name} />
      </div>

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

          {/* Таблица Report с раскрываемыми кварталами */}
          {report?.year_groups?.length > 0 && (
            <ReportTable report={report} />
          )}

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
          <div style={S.card}>
              <div style={{ display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 16 }}>
                <span style={S.cardTitle}>
                  Фермы {farms.length > 0 && `(${farms.length})`}
                </span>
                <button
                  onClick={() => setFarmModal("new")}
                  style={{ padding: "6px 14px", background: "#1a3a5c", color: "#fff",
                    border: "none", borderRadius: 6, cursor: "pointer",
                    fontSize: 13, fontWeight: 600 }}>
                  + Добавить ферму
                </button>
              </div>
              {farms.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Название", "Регион / Адрес", "Поголовье", "Дойное стадо",
                        "Система доения", "Тип содержания", "Тип пола", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px",
                          borderBottom: "2px solid #e0e0e0", fontSize: 12, color: "#666" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {farms.map((f) => (
                      <tr key={f.id} style={{ borderBottom: "1px solid #f5f5f5" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                        onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{f.name}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12 }}>
                          {f.region && <div style={{ fontWeight: 500 }}>{f.region}</div>}
                          {f.address && <div style={{ color: "#888" }}>{f.address}</div>}
                          {!f.region && !f.address && "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>{f.herd_size ?? "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{f.milking_cows ?? "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{f.milking_system || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{f.housing_type || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>{f.floor_type || "—"}</td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <button onClick={() => setFarmModal(f)}
                            style={{ padding: "3px 8px", background: "#f5f5f5",
                              border: "1px solid #ddd", borderRadius: 4,
                              cursor: "pointer", fontSize: 11, marginRight: 4 }}>
                            ✎
                          </button>
                          {deletingFarm === f.id ? (
                            <>
                              <button onClick={() => deleteFarmMut.mutate(f.id)}
                                style={{ padding: "3px 8px", background: "#ffebee",
                                  border: "1px solid #ef9a9a", borderRadius: 4,
                                  cursor: "pointer", fontSize: 11, color: "#c62828",
                                  marginRight: 4 }}>
                                Удалить
                              </button>
                              <button onClick={() => setDeletingFarm(null)}
                                style={{ padding: "3px 8px", background: "#f5f5f5",
                                  border: "1px solid #ddd", borderRadius: 4,
                                  cursor: "pointer", fontSize: 11 }}>
                                Нет
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setDeletingFarm(f.id)}
                              style={{ padding: "3px 8px", background: "#fff",
                                border: "1px solid #ddd", borderRadius: 4,
                                cursor: "pointer", fontSize: 11, color: "#c62828" }}>
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "#aaa", fontSize: 13 }}>
                  Фермы не добавлены. Нажмите «+ Добавить ферму».
                </p>
              )}
            </div>

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

      {/* Модальное окно фермы */}
      {farmModal && (
        <FarmModal
          farm={farmModal === "new" ? null : farmModal}
          onClose={() => { setFarmModal(null); setDeletingFarm(null); }}
          onSave={(data) => {
            if (farmModal === "new") createFarmMut.mutate(data);
            else updateFarmMut.mutate({ farmId: farmModal.id, data });
          }}
        />
      )}
    </div>
  );
}
