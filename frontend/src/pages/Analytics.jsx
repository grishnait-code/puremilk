import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { getSummary, getTargets } from "../api/client";

const COLORS = ["#43a047", "#fb8c00", "#e53935", "#9e9e9e"];

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  filterBar: { display: "flex", gap: 12, alignItems: "center", marginBottom: 24,
    background: "#fff", padding: "12px 16px", borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  select: { padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 },
  card: { background: "#fff", borderRadius: 12, padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#1a3a5c", marginBottom: 16 },
  targetRow: { display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "6px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13 },
  targetLabel: { color: "#555" },
  targetVal: { fontWeight: 600, color: "#1a3a5c" },
};

const INDICATOR_LABELS = {
  scc: "Соматические клетки, тыс. ед./мл",
  bact_count: "КМАФАнМ, тыс. КОЕ/мл",
  fat_pct: "Жир, %",
  protein_pct: "Белок, %",
  coliforms: "БГКП, КОЕ/мл",
  clostridium_spores: "Споры клостридий, НВЧ/л",
  freeze_point: "Точка замерзания, ×10⁻³ °C",
  temperature: "Температура, °C",
  fatty_acids: "СЖК",
  urea: "Мочевина, мг/100 мл",
};

export default function Analytics() {
  const [year, setYear] = useState("");

  const { data: summary = [], isLoading } = useQuery({
    queryKey: ["summary", year],
    queryFn: () => getSummary({ year: year || undefined }),
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["targets"],
    queryFn: getTargets,
  });

  // Строим сводный временной ряд по всем предприятиям
  const allYears = new Set();
  summary.forEach((e) => e.yearly.forEach((y) => allYears.add(y.year)));
  const sortedYears = [...allYears].sort();

  const trendData = sortedYears.map((yr) => {
    const row = { year: yr };
    summary.forEach((e) => {
      const yStat = e.yearly.find((y) => y.year === yr);
      if (yStat) {
        const key = e.enterprise_name.slice(0, 12);
        row[`${key}_scc`] = yStat.avg_scc;
        row[`${key}_fat`] = yStat.avg_fat_pct;
      }
    });
    return row;
  });

  // Данные для pie-диаграмм (последний год по каждому предприятию)
  const latestByEnterprise = summary.map((e) => {
    const latest = e.yearly.sort((a, b) => b.year - a.year)[0];
    return { name: e.enterprise_name, ...latest };
  });

  const gradeData = latestByEnterprise.map((e) => ({
    name: (e.name || "").slice(0, 12),
    "Экстра": e.grade_E_pct,
    "Сорт I": e.grade_I_pct,
    "Сорт II": e.grade_II_pct,
  }));

  const sccData = latestByEnterprise.map((e) => ({
    name: (e.name || "").slice(0, 12),
    SCC: e.avg_scc,
  }));

  const gradeColors = { "Экстра": "#43a047", "Сорт I": "#fb8c00", "Сорт II": "#e53935" };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Аналитика</h1>
      </div>

      <div style={S.filterBar}>
        <span style={{ fontSize: 13, color: "#666" }}>Год:</span>
        <select style={S.select} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Все годы</option>
          {[2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span style={{ marginLeft: "auto", color: "#888", fontSize: 13 }}>
          Предприятий: {summary.length}
        </span>
      </div>

      {isLoading ? (
        <p style={{ color: "#666" }}>Загрузка...</p>
      ) : (
        <>
          {gradeData.length > 0 && (
            <div style={S.grid2}>
              <div style={S.card}>
                <div style={S.cardTitle}>Сортность молока по предприятиям (%)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gradeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                    <Tooltip formatter={(v) => `${v?.toFixed(1)}%`} />
                    <Legend />
                    {["Экстра", "Сорт I", "Сорт II"].map((g) => (
                      <Bar key={g} dataKey={g} stackId="a" fill={gradeColors[g]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={S.card}>
                <div style={S.cardTitle}>Соматические клетки по предприятиям (тыс. ед./мл)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sccData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                    <Tooltip />
                    <ReferenceLine x={200} stroke="#e53935" strokeDasharray="4 4" />
                    <Bar dataKey="SCC" fill="#1565c0" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {targets.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Целевые значения показателей</div>
              {targets.map((t) => (
                <div key={t.indicator} style={S.targetRow}>
                  <span style={S.targetLabel}>
                    {INDICATOR_LABELS[t.indicator] || t.indicator}
                  </span>
                  <span style={S.targetVal}>
                    {t.value_min != null && `≥ ${t.value_min}`}
                    {t.value_min != null && t.value_max != null && " — "}
                    {t.value_max != null && `≤ ${t.value_max}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {summary.length === 0 && (
            <div style={{ ...S.card, textAlign: "center", color: "#999", padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div>Данные для аналитики не найдены.<br />
                Импортируйте данные с помощью скрипта <code>scripts/import_xlsx.py</code>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
