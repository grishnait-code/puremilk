import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
  ComposedChart, Area, Cell,
} from "recharts";
import {
  getEnterprises, getEnterpriseMonthly, getGradeDecline, compareEnterprises,
} from "../api/client";
import DownloadReportBtn from "../components/DownloadReportBtn";

// ── Константы ──────────────────────────────────────────────────────────────

const INDICATORS = [
  { key: "scc",               label: "Соматика, тыс/мл",     target: 200,  targetDir: "max", color: "#1565c0" },
  { key: "bact_count_lab",    label: "КМАФАнМ, тыс. КОЕ/мл", target: 50,   targetDir: "max", color: "#7b1fa2" },
  { key: "coliforms",         label: "БГКП, КОЕ/мл",         target: 100,  targetDir: "max", color: "#c62828" },
  { key: "clostridium_spores",label: "Клостридии, НВЧ/л",    target: 1000, targetDir: "max", color: "#e65100" },
  { key: "fat_pct",           label: "Жир, %",               target: 3.6,  targetDir: "min", color: "#fb8c00" },
  { key: "protein_pct",       label: "Белок, %",             target: 3.2,  targetDir: "min", color: "#43a047" },
  { key: "freeze_point_lab",  label: "Т замерзания",          target: null, targetDir: null,  color: "#00acc1" },
  { key: "snf_pct",           label: "СОМО, %",              target: 8.2,  targetDir: "min", color: "#8d6e63" },
  { key: "density",           label: "Плотность, кг/м³",     target: 1027, targetDir: "min", color: "#546e7a" },
];

const COLORS_SERIES = ["#1565c0", "#c62828", "#43a047", "#fb8c00", "#7b1fa2", "#00acc1"];

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  tabs: { display: "flex", gap: 0, borderBottom: "2px solid #e0e0e0", marginBottom: 24 },
  tab: (active) => ({
    padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 500,
    color: active ? "#1a3a5c" : "#666",
    borderBottom: active ? "2px solid #1a3a5c" : "2px solid transparent",
    marginBottom: -2, whiteSpace: "nowrap",
  }),
  controls: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
    background: "#fff", padding: "12px 16px", borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 20 },
  select: { padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, background: "#fff" },
  input: { padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, width: 70 },
  label: { fontSize: 12, color: "#666", fontWeight: 500 },
  card: { background: "#fff", borderRadius: 12, padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 24 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: "#aaa", marginBottom: 16 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 },
  empty: { textAlign: "center", color: "#aaa", padding: 48, fontSize: 14 },
};

// ── Утилиты ────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8,
      padding: "10px 14px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#333" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <b>{p.value != null ? p.value : "—"}</b>
        </div>
      ))}
    </div>
  );
};

// ── Вкладка 1: Динамика по месяцам ────────────────────────────────────────

function TabDynamics({ enterpriseId }) {
  const [yearFrom, setYearFrom] = useState(new Date().getFullYear() - 2);
  const [yearTo,   setYearTo]   = useState(new Date().getFullYear());
  const [selectedInds, setSelectedInds] = useState(["scc", "bact_count_lab", "fat_pct", "protein_pct"]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["monthly", enterpriseId, yearFrom, yearTo],
    queryFn: () => getEnterpriseMonthly(enterpriseId, { year_from: yearFrom, year_to: yearTo }),
    enabled: !!enterpriseId,
  });

  const toggleInd = (key) => setSelectedInds((prev) =>
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
  );

  if (!enterpriseId) return <div style={S.empty}>Выберите предприятие выше</div>;

  return (
    <div>
      {/* Управление */}
      <div style={S.controls}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={S.label}>Период:</span>
          <input style={S.input} type="number" value={yearFrom}
            onChange={(e) => setYearFrom(+e.target.value)} />
          <span style={S.label}>—</span>
          <input style={S.input} type="number" value={yearTo}
            onChange={(e) => setYearTo(+e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {INDICATORS.slice(0, 6).map((ind) => (
            <button key={ind.key}
              onClick={() => toggleInd(ind.key)}
              style={{
                padding: "4px 10px", borderRadius: 16, fontSize: 12, cursor: "pointer",
                border: `1px solid ${ind.color}`,
                background: selectedInds.includes(ind.key) ? ind.color : "#fff",
                color: selectedInds.includes(ind.key) ? "#fff" : ind.color,
                fontWeight: 500,
              }}>
              {ind.label.split(",")[0]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p style={{ color: "#666" }}>Загрузка...</p>}

      {/* Объём поставок */}
      {data.length > 0 && (
        <>
          <div style={S.card}>
            <div style={S.cardTitle}>Объём поставок молока, кг</div>
            <div style={S.cardSubtitle}>Помесячно</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v/1000).toFixed(0) + "т"} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => Math.round(v).toLocaleString("ru-RU") + " кг"} />
                <Bar dataKey="total_weight_kg" fill="#1a3a5c" name="Объём, кг" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Сортность молока по месяцам */}
          <div style={S.card}>
            <div style={S.cardTitle}>Сортность молока, % партий</div>
            <div style={S.cardSubtitle}>Доля партий каждого сорта по месяцам</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                stackOffset="expand" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name]}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={{ background: "#fff", border: "1px solid #eee",
                        borderRadius: 8, padding: "10px 14px", fontSize: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                        {payload.map((p) => (
                          <div key={p.dataKey} style={{ color: p.fill, marginBottom: 2 }}>
                            {p.name}: <b>{(p.value * 100).toFixed(1)}%</b>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="grade_E_pct"   name="Экстра"    stackId="g" fill="#43a047" />
                <Bar dataKey="grade_I_pct"   name="Спец. I"   stackId="g" fill="#fb8c00" />
                <Bar dataKey="grade_II_pct"  name="Спец. II"  stackId="g" fill="#e65100" />
                <Bar dataKey="grade_out_pct" name="Вне спец." stackId="g" fill="#c62828" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Выбранные показатели */}
          <div style={S.grid2}>
            {INDICATORS.filter((ind) => selectedInds.includes(ind.key)).map((ind) => (
              <div key={ind.key} style={S.card}>
                <div style={S.cardTitle}>{ind.label}</div>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    {ind.target && (
                      <ReferenceLine y={ind.target} stroke="#e53935"
                        strokeDasharray="4 4"
                        label={{ value: String(ind.target), fill: "#e53935", fontSize: 10, position: "right" }} />
                    )}
                    <Area type="monotone" dataKey={ind.key} fill={`${ind.color}22`}
                      stroke={ind.color} strokeWidth={2} dot={false} name={ind.label} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </>
      )}
      {!isLoading && data.length === 0 && (
        <div style={S.empty}>Нет данных за выбранный период</div>
      )}
    </div>
  );
}

// ── Вкладка 2: Причины потерь сорта ───────────────────────────────────────

const DECLINE_COLORS = {
  "scc": "#1565c0", "bact_count_lab": "#7b1fa2", "coliforms": "#c62828",
  "clostridium_spores": "#e65100", "fat_pct": "#fb8c00", "protein_pct": "#43a047",
  "freeze_point_lab": "#00acc1", "temperature_lab": "#ef6c00",
  "organoleptic_lab": "#6d4c41", "acidity": "#546e7a",
};

function TabDecline({ enterpriseId }) {
  const [grade, setGrade]       = useState("E");
  const [groupBy, setGroupBy]   = useState("month");
  const [yearFrom, setYearFrom] = useState(new Date().getFullYear() - 1);
  const [yearTo,   setYearTo]   = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["grade-decline", enterpriseId, grade, groupBy, yearFrom, yearTo],
    queryFn: () => getGradeDecline(enterpriseId, {
      grade, group_by: groupBy, year_from: yearFrom, year_to: yearTo
    }),
    enabled: !!enterpriseId,
  });

  if (!enterpriseId) return <div style={S.empty}>Выберите предприятие выше</div>;

  const chartData = (data?.periods || []).map((p) => ({
    period: p,
    total: data.data[p]?.total || 0,
    ...Object.fromEntries((data?.indicators || []).map((ind) => [
      ind.key, data.data[p]?.[ind.key] || 0
    ]))
  }));

  return (
    <div>
      <div style={S.controls}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={S.label}>Сорт:</span>
          <select style={S.select} value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="E">Экстра</option>
            <option value="I">Спец. I</option>
            <option value="II">Спец. II</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={S.label}>Группировка:</span>
          <select style={S.select} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="month">По месяцам</option>
            <option value="quarter">По кварталам</option>
            <option value="year">По годам</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={S.label}>Период:</span>
          <input style={S.input} type="number" value={yearFrom}
            onChange={(e) => setYearFrom(+e.target.value)} />
          <span style={S.label}>—</span>
          <input style={S.input} type="number" value={yearTo}
            onChange={(e) => setYearTo(+e.target.value)} />
        </div>
      </div>

      {isLoading && <p style={{ color: "#666" }}>Загрузка...</p>}

      {data && chartData.length > 0 && (
        <>
          {/* Стековый барчарт причин */}
          <div style={S.card}>
            <div style={S.cardTitle}>
              Количество партий, не соответствующих сорту {grade === "E" ? "Экстра" : "Спец. " + grade}
            </div>
            <div style={S.cardSubtitle}>
              По каждому показателю — сколько партий нарушило норматив
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {(data.indicators || []).map((ind) => (
                  <Bar key={ind.key} dataKey={ind.key} name={ind.label}
                    fill={DECLINE_COLORS[ind.key] || "#999"} stackId="a" />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Таблица */}
          <div style={{ ...S.card, overflowX: "auto" }}>
            <div style={S.cardTitle}>Детализация по периодам</div>
            <table style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ background: "#1a3a5c", color: "#fff", padding: "8px 12px",
                    textAlign: "left", position: "sticky", left: 0 }}>Период</th>
                  <th style={{ background: "#1a3a5c", color: "#fff", padding: "8px 10px",
                    textAlign: "center" }}>Всего</th>
                  {(data.indicators || []).map((ind) => (
                    <th key={ind.key} style={{ background: "#1a3a5c", color: "#fff",
                      padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {ind.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, ri) => (
                  <tr key={row.period} style={{ background: ri % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500,
                      position: "sticky", left: 0,
                      background: ri % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                      {row.period}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "center",
                      fontWeight: 700, color: "#1a3a5c" }}>{row.total}</td>
                    {(data.indicators || []).map((ind) => (
                      <td key={ind.key} style={{
                        padding: "7px 10px", textAlign: "center",
                        color: row[ind.key] > 0 ? DECLINE_COLORS[ind.key] : "#aaa",
                        fontWeight: row[ind.key] > 0 ? 700 : 400,
                      }}>
                        {row[ind.key] > 0 ? row[ind.key] : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!isLoading && chartData.length === 0 && (
        <div style={S.empty}>Нет данных за выбранный период</div>
      )}
    </div>
  );
}

// ── Вкладка 3: Сравнение предприятий ──────────────────────────────────────

function TabCompare() {
  const [indicator, setIndicator] = useState("scc");
  const [groupBy, setGroupBy]     = useState("year");
  const [yearFrom, setYearFrom]   = useState(2020);
  const [yearTo,   setYearTo]     = useState(new Date().getFullYear());
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: entData } = useQuery({
    queryKey: ["enterprises-nav"],
    queryFn: () => getEnterprises({ page_size: 100 }),
  });
  const enterprises = entData?.items || [];

  const toggleEnt = (id) => setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );

  const idsStr = selectedIds.join(",");

  const { data, isLoading } = useQuery({
    queryKey: ["compare", indicator, groupBy, yearFrom, yearTo, idsStr],
    queryFn: () => compareEnterprises({
      indicator, group_by: groupBy,
      year_from: yearFrom, year_to: yearTo,
      enterprise_ids: idsStr,
    }),
  });

  const indInfo = INDICATORS.find((i) => i.key === indicator) || INDICATORS[0];

  const chartData = (data?.periods || []).map((p) => {
    const row = { period: p };
    Object.entries(data?.series || {}).forEach(([name, vals]) => {
      row[name] = vals[p] ?? null;
    });
    return row;
  });

  const seriesNames = Object.keys(data?.series || {});

  return (
    <div>
      <div style={S.controls}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={S.label}>Показатель:</span>
          <select style={S.select} value={indicator}
            onChange={(e) => setIndicator(e.target.value)}>
            {INDICATORS.map((ind) => (
              <option key={ind.key} value={ind.key}>{ind.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={S.label}>Группировка:</span>
          <select style={S.select} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="month">По месяцам</option>
            <option value="quarter">По кварталам</option>
            <option value="year">По годам</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={S.label}>Период:</span>
          <input style={S.input} type="number" value={yearFrom}
            onChange={(e) => setYearFrom(+e.target.value)} />
          <span style={S.label}>—</span>
          <input style={S.input} type="number" value={yearTo}
            onChange={(e) => setYearTo(+e.target.value)} />
        </div>
      </div>

      {/* Выбор предприятий */}
      <div style={{ ...S.controls, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={S.label}>Предприятия:</span>
        {enterprises.map((e) => (
          <button key={e.id} onClick={() => toggleEnt(e.id)}
            style={{
              padding: "4px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer",
              border: "1px solid #1a3a5c",
              background: selectedIds.includes(e.id) ? "#1a3a5c" : "#fff",
              color: selectedIds.includes(e.id) ? "#fff" : "#1a3a5c",
              fontWeight: 500,
            }}>
            {e.short_name || e.name}
          </button>
        ))}
        {selectedIds.length > 0 && (
          <button onClick={() => setSelectedIds([])}
            style={{ padding: "4px 10px", borderRadius: 16, fontSize: 12,
              cursor: "pointer", border: "1px solid #ddd",
              background: "#f5f5f5", color: "#666" }}>
            Сбросить
          </button>
        )}
      </div>

      {isLoading && <p style={{ color: "#666" }}>Загрузка...</p>}

      {chartData.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>{indInfo.label} — сравнение предприятий</div>
          <div style={S.cardSubtitle}>
            {indInfo.target && `Норматив: ${indInfo.targetDir === "max" ? "≤" : "≥"} ${indInfo.target}`}
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {indInfo.target && (
                <ReferenceLine y={indInfo.target} stroke="#e53935" strokeDasharray="4 4"
                  label={{ value: String(indInfo.target), fill: "#e53935", fontSize: 10 }} />
              )}
              {seriesNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name}
                  stroke={COLORS_SERIES[i % COLORS_SERIES.length]}
                  strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {!isLoading && chartData.length === 0 && (
        <div style={S.empty}>Выберите предприятия и показатель</div>
      )}
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────

const TABS = ["Динамика по месяцам", "Причины потерь сорта", "Сравнение предприятий"];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState(0);
  const [enterpriseId, setEnterpriseId] = useState(null);

  const { data: entData } = useQuery({
    queryKey: ["enterprises-nav"],
    queryFn: () => getEnterprises({ page_size: 200 }),
    staleTime: 5 * 60_000,
  });
  const enterprises = entData?.items || [];
  const selectedEnterprise = enterprises.find((e) => e.id === enterpriseId);

  return (
    <div style={S.page}>
      <div style={{ ...S.header, flexWrap: "wrap" }}>
        <h1 style={S.title}>Аналитика</h1>
        <select
          style={{ ...S.select, minWidth: 220 }}
          value={enterpriseId || ""}
          onChange={(e) => setEnterpriseId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— Выберите предприятие —</option>
          {enterprises.map((e) => (
            <option key={e.id} value={e.id}>{e.short_name || e.name}</option>
          ))}
        </select>
      </div>

      <div style={S.tabs}>
        {TABS.map((t, i) => (
          <div key={t} style={S.tab(i === activeTab)} onClick={() => setActiveTab(i)}>
            {t}
          </div>
        ))}
      </div>

      {activeTab === 0 && (
        <>
          {enterpriseId && (
            <div style={{ marginBottom: 16 }}>
              <DownloadReportBtn
                enterpriseId={enterpriseId}
                enterpriseName={selectedEnterprise?.name}
              />
            </div>
          )}
          <TabDynamics enterpriseId={enterpriseId} />
        </>
      )}
      {activeTab === 1 && <TabDecline  enterpriseId={enterpriseId} />}
      {activeTab === 2 && <TabCompare />}
    </div>
  );
}
