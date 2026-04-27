import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDeliveries } from "../api/client";
import { useEnterprise } from "../context/EnterpriseContext";

// ── Определение всех колонок ───────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: "date",        group: "Идентификация", label: "Дата" },
  { key: "enterprise",  group: "Идентификация", label: "Предприятие" },
  { key: "weight",      group: "Идентификация", label: "Вес, кг" },
  { key: "calc_grade",  group: "Сорт",          label: "Сорт" },
  { key: "temp_lab",    group: "Температура",   label: "ПО, °C" },
  { key: "temp_std",    group: "Температура",   label: "Т001-2" },
  { key: "org_lab",     group: "Органолептика", label: "ПО" },
  { key: "org_std",     group: "Органолептика", label: "Т001-2" },
  { key: "scc",         group: "Соматика",      label: "тыс/мл" },
  { key: "bact_lab",    group: "КМАФАнМ",       label: "ПО" },
  { key: "bact_std",    group: "КМАФАнМ",       label: "Т001-2" },
  { key: "freeze_lab",  group: "Т замерзания",  label: "ПО" },
  { key: "freeze_std",  group: "Т замерзания",  label: "Т001-2" },
  { key: "fat",         group: "Состав",        label: "Жир %" },
  { key: "protein",     group: "Состав",        label: "Белок %" },
  { key: "lactose",     group: "Состав",        label: "Лактоза %" },
  { key: "snf",         group: "Состав",        label: "СОМО %" },
  { key: "density",     group: "Физ. св-ва",    label: "кг/м³" },
  { key: "alcohol",     group: "Физ. св-ва",    label: "Алк. %" },
  { key: "acidity",     group: "Физ. св-ва",    label: "°T" },
  { key: "ph_lab",      group: "pH",            label: "ПО" },
  { key: "ph_std",      group: "pH",            label: "Т001-2" },
  { key: "coliforms",   group: "БГКП",          label: "КОЕ/мл" },
  { key: "fatty_acids", group: "СЖК",           label: "значение" },
  { key: "urea",        group: "Мочевина",      label: "мг/100мл" },
  { key: "clostridium", group: "Клостридии",    label: "НВЧ/л" },
  { key: "antibiotics", group: "AB",            label: "наличие" },
];

const DEFAULT_VISIBLE = new Set(ALL_COLUMNS.map((c) => c.key));

// ── Нормативы ──────────────────────────────────────────────────────────────

const NORMS = {
  scc:         { max: 200, warn: 150 },
  bact_lab:    { max: 50,  warn: 30  },
  coliforms:   { max: 100, warn: 50  },
  clostridium: { max: 1000, warn: 700 },
  fatty_acids: { max: 0.80 },
  fat:         { min: 3.6 },
  protein:     { min: 3.2 },
  snf:         { min: 8.2 },
  density:     { min: 1027 },
};

function numColor(key, v) {
  const n = NORMS[key];
  if (!n || v == null) return {};
  if (n.max !== undefined && v > n.max) return { color: "#c62828", fontWeight: 700 };
  if (n.warn !== undefined && v > n.warn) return { color: "#f57f17", fontWeight: 600 };
  if (n.min !== undefined && v < n.min) return { color: "#c62828", fontWeight: 700 };
  return { color: "#2e7d32" };
}

const fmt = (v, dec = 1) => v != null ? Number(v).toFixed(dec) : "—";
const kgBadge = (kg, color, bg) =>
  kg > 0 ? <span style={{ background: bg, color, padding: "2px 6px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
    {Math.round(kg).toLocaleString("ru-RU")}
  </span> : "—";

function cellValue(colKey, d) {
  const q = d.quality;
  const total = d.weight_kg || 0;
  switch (colKey) {
    case "date":        return <span style={{ fontWeight: 500 }}>{new Date(d.delivery_date).toLocaleDateString("ru-RU")}</span>;
    case "enterprise":  return d.enterprise_name || `#${d.enterprise_id}`;
    case "weight":      return total > 0 ? Math.round(total).toLocaleString("ru-RU") : "—";
    case "calc_grade": {
      const g = d.calculated_grade;
      if (!g) return "—";
      const map = {
        E:   { label: "Экстра",  bg: "#e8f5e9", color: "#2e7d32" },
        I:   { label: "Спец. I", bg: "#fff8e1", color: "#f57f17" },
        II:  { label: "Спец. II",bg: "#fff3e0", color: "#e65100" },
        out: { label: "Вне спец",bg: "#ffebee", color: "#c62828" },
      };
      const s = map[g] || { label: g, bg: "#f5f5f5", color: "#555" };
      return <span style={{ background: s.bg, color: s.color,
        padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
        {s.label}
      </span>;
    }
    case "temp_lab":    return [fmt(q?.temperature_lab), {}];
    case "temp_std":    return [fmt(q?.temperature_std), {}];
    case "org_lab":     return [fmt(q?.organoleptic_lab, 0), {}];
    case "org_std":     return [fmt(q?.organoleptic_std, 0), {}];
    case "scc":         return [fmt(q?.scc, 0), numColor("scc", q?.scc)];
    case "bact_lab":    return [fmt(q?.bact_count_lab), numColor("bact_lab", q?.bact_count_lab)];
    case "bact_std":    return [fmt(q?.bact_count_std), {}];
    case "freeze_lab":  return [fmt(q?.freeze_point_lab, 0), {}];
    case "freeze_std":  return [fmt(q?.freeze_point_std, 0), {}];
    case "fat":         return [fmt(q?.fat_pct, 2), numColor("fat", q?.fat_pct)];
    case "protein":     return [fmt(q?.protein_pct, 2), numColor("protein", q?.protein_pct)];
    case "lactose":     return [fmt(q?.lactose_pct, 2), {}];
    case "snf":         return [fmt(q?.snf_pct, 2), numColor("snf", q?.snf_pct)];
    case "density":     return [fmt(q?.density, 0), numColor("density", q?.density)];
    case "alcohol":     return [fmt(q?.alcohol_pct, 0), {}];
    case "acidity":     return [fmt(q?.acidity, 0), {}];
    case "ph_lab":      return [fmt(q?.ph_lab, 2), {}];
    case "ph_std":      return [fmt(q?.ph_std, 2), {}];
    case "coliforms":   return [fmt(q?.coliforms, 0), numColor("coliforms", q?.coliforms)];
    case "fatty_acids": return [fmt(q?.fatty_acids, 2), numColor("fatty_acids", q?.fatty_acids)];
    case "urea":        return [fmt(q?.urea, 0), {}];
    case "clostridium": return [fmt(q?.clostridium_spores, 0), numColor("clostridium", q?.clostridium_spores)];
    case "antibiotics": return d.has_antibiotics
      ? <span style={{ color: "#c62828", fontWeight: 700 }}>⚠ Да</span>
      : <span style={{ color: "#aaa" }}>—</span>;
    default: return "—";
  }
}

// ── Стили ──────────────────────────────────────────────────────────────────

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  tableWrap: { overflowX: "auto", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  table: { borderCollapse: "collapse", background: "#fff", minWidth: "100%" },
  thGroup: { background: "#1a3a5c", color: "#fff", padding: "6px 10px",
    textAlign: "center", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    borderRight: "1px solid rgba(255,255,255,0.2)" },
  th: { background: "#1a3a5c", color: "#fff", padding: "8px 10px",
    textAlign: "center", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    borderRight: "1px solid rgba(255,255,255,0.15)" },
  thLeft: { background: "#1a3a5c", color: "#fff", padding: "8px 10px",
    textAlign: "left", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    borderRight: "1px solid rgba(255,255,255,0.15)" },
  td: { padding: "8px 10px", borderBottom: "1px solid #f0f0f0", fontSize: 12,
    textAlign: "center", whiteSpace: "nowrap", borderRight: "1px solid #f5f5f5" },
  tdLeft: { padding: "8px 10px", borderBottom: "1px solid #f0f0f0", fontSize: 12,
    textAlign: "left", whiteSpace: "nowrap", borderRight: "1px solid #f5f5f5" },
  btn: (primary) => ({
    padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13,
    fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6,
    border: primary ? "none" : "1px solid #ddd",
    background: primary ? "#1a3a5c" : "#fff",
    color: primary ? "#fff" : "#333",
  }),
};

// ── Конфигурация фильтров ──────────────────────────────────────────────────

const FILTER_GROUPS = [
  {
    label: "Идентификация",
    filters: [
      { key: "date_from",  label: "Дата с",       type: "date" },
      { key: "date_to",    label: "Дата по",       type: "date" },
      { key: "weight_min", label: "Вес от, кг",    type: "number" },
      { key: "weight_max", label: "Вес до, кг",    type: "number" },
    ],
  },
  {
    label: "Сортность",
    filters: [
      { key: "grade",         label: "Сорт",          type: "select",
        options: [["", "Все сорта"], ["E", "Экстра"], ["I", "Сорт I"], ["II", "Сорт II"]] },
      { key: "has_antibiotics", label: "Антибиотики",  type: "select",
        options: [["", "Все"], ["false", "Нет"], ["true", "Обнаружены"]] },
    ],
  },
  {
    label: "Соматика (тыс/мл)",
    filters: [
      { key: "scc_min", label: "SCC от", type: "number" },
      { key: "scc_max", label: "SCC до", type: "number", placeholder: "норма ≤ 200" },
    ],
  },
  {
    label: "КМАФАнМ (тыс. КОЕ/мл)",
    filters: [
      { key: "bact_min", label: "Бактерии от", type: "number" },
      { key: "bact_max", label: "Бактерии до", type: "number", placeholder: "норма ≤ 50" },
    ],
  },
  {
    label: "Температура (°C)",
    filters: [
      { key: "temp_min", label: "Темп. от", type: "number" },
      { key: "temp_max", label: "Темп. до", type: "number" },
    ],
  },
  {
    label: "Органолептика",
    filters: [
      { key: "org_min", label: "Орг. от", type: "number" },
      { key: "org_max", label: "Орг. до", type: "number" },
    ],
  },
  {
    label: "Точка замерзания",
    filters: [
      { key: "freeze_min", label: "Т зам. от", type: "number", placeholder: "520" },
      { key: "freeze_max", label: "Т зам. до", type: "number", placeholder: "560" },
    ],
  },
  {
    label: "Жир (%)",
    filters: [
      { key: "fat_min", label: "Жир от", type: "number", placeholder: "≥ 3.6" },
      { key: "fat_max", label: "Жир до", type: "number" },
    ],
  },
  {
    label: "Белок (%)",
    filters: [
      { key: "protein_min", label: "Белок от", type: "number", placeholder: "≥ 3.2" },
      { key: "protein_max", label: "Белок до", type: "number" },
    ],
  },
  {
    label: "Лактоза (%)",
    filters: [
      { key: "lactose_min", label: "Лактоза от", type: "number" },
      { key: "lactose_max", label: "Лактоза до", type: "number" },
    ],
  },
  {
    label: "СОМО (%)",
    filters: [
      { key: "snf_min", label: "СОМО от", type: "number", placeholder: "≥ 8.2" },
      { key: "snf_max", label: "СОМО до", type: "number" },
    ],
  },
  {
    label: "Плотность (кг/м³)",
    filters: [
      { key: "density_min", label: "Плотн. от", type: "number", placeholder: "≥ 1027" },
      { key: "density_max", label: "Плотн. до", type: "number" },
    ],
  },
  {
    label: "Кислотность (°T)",
    filters: [
      { key: "acidity_min", label: "°T от", type: "number" },
      { key: "acidity_max", label: "°T до", type: "number" },
    ],
  },
  {
    label: "pH",
    filters: [
      { key: "ph_min", label: "pH от", type: "number" },
      { key: "ph_max", label: "pH до", type: "number" },
    ],
  },
  {
    label: "БГКП (КОЕ/мл)",
    filters: [
      { key: "coliforms_min", label: "БГКП от", type: "number" },
      { key: "coliforms_max", label: "БГКП до", type: "number", placeholder: "норма ≤ 100" },
    ],
  },
  {
    label: "СЖК",
    filters: [
      { key: "fatty_acids_min", label: "СЖК от", type: "number" },
      { key: "fatty_acids_max", label: "СЖК до", type: "number", placeholder: "норма ≤ 0.8" },
    ],
  },
  {
    label: "Мочевина (мг/100мл)",
    filters: [
      { key: "urea_min", label: "Мочевина от", type: "number", placeholder: "20" },
      { key: "urea_max", label: "Мочевина до", type: "number", placeholder: "30" },
    ],
  },
  {
    label: "Споры клостридий (НВЧ/л)",
    filters: [
      { key: "clostridium_min", label: "Клост. от", type: "number" },
      { key: "clostridium_max", label: "Клост. до", type: "number", placeholder: "норма ≤ 1000" },
    ],
  },
];

const EMPTY_FILTERS = Object.fromEntries(
  FILTER_GROUPS.flatMap((g) => g.filters.map((f) => [f.key, ""]))
);

// ── Кнопка фильтров ────────────────────────────────────────────────────────

function FilterButton({ activeCount, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "10px 22px", borderRadius: 8, cursor: "pointer",
        fontSize: 15, fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 8,
        border: "none",
        background: open ? "#15304d" : "#1a3a5c",
        color: "#fff",
        boxShadow: open ? "inset 0 2px 6px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.15)",
      }}
    >
      <span style={{ fontSize: 17 }}>{open ? "✕" : "☰"}</span>
      Фильтры
      {activeCount > 0 && (
        <span style={{ background: "#e53935", borderRadius: 12,
          padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
          {activeCount}
        </span>
      )}
    </button>
  );
}

// ── Панель фильтров ────────────────────────────────────────────────────────

function FilterPanel({ filters, onChange, onApply, onReset, activeCount }) {
  const inputStyle = {
    padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, width: "100%", outline: "none",
  };
  const selectStyle = { ...inputStyle, background: "#fff", cursor: "pointer" };

  return (
    <div style={{
      marginTop: 12, marginBottom: 16,
      background: "#fff", borderRadius: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      border: "1px solid #e0e0e0",
    }}>
      {/* Шапка */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "14px 20px",
        borderBottom: "1px solid #eee" }}>
        <span style={{ fontWeight: 700, color: "#1a3a5c", fontSize: 15 }}>
          Фильтры {activeCount > 0 && <span style={{ color: "#e53935" }}>({activeCount} активных)</span>}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onReset} style={{ ...S.btn(false), padding: "6px 14px" }}>
            Сбросить всё
          </button>
          <button onClick={onApply} style={{ ...S.btn(true), padding: "6px 14px" }}>
            Применить
          </button>
        </div>
      </div>

      {/* Сетка групп фильтров */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        padding: "16px 20px", gap: 0,
      }}>
        {FILTER_GROUPS.map((group) => (
          <div key={group.label} style={{
            padding: "10px 14px",
            borderRight: "1px solid #f0f0f0",
            borderBottom: "1px solid #f0f0f0",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a3a5c",
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              {group.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.filters.map((f) => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{f.label}</div>
                  {f.type === "select" ? (
                    <select style={selectStyle} value={filters[f.key]}
                      onChange={(e) => onChange(f.key, e.target.value)}>
                      {f.options.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  ) : (
                    <input type={f.type} style={inputStyle}
                      placeholder={f.placeholder || ""}
                      value={filters[f.key]}
                      onChange={(e) => onChange(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Выбор столбцов ─────────────────────────────────────────────────────────

function ColumnSelector({ visible, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const groups = [...new Set(ALL_COLUMNS.map((c) => c.group))];

  const toggleCol = (key) => {
    const next = new Set(visible);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  };

  const toggleGroup = (group) => {
    const keys = ALL_COLUMNS.filter((c) => c.group === group).map((c) => c.key);
    const allOn = keys.every((k) => visible.has(k));
    const next = new Set(visible);
    keys.forEach((k) => allOn ? next.delete(k) : next.add(k));
    onChange(next);
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button style={S.btn(false)} onClick={() => setOpen(!open)}>
        ⚙ Столбцы
        <span style={{ background: "#e0e0e0", borderRadius: 10,
          padding: "1px 7px", fontSize: 11, color: "#333" }}>{visible.size}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          background: "#fff", borderRadius: 10, zIndex: 1000, width: 320,
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          maxHeight: "80vh", display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #eee" }}>
            <span style={{ fontWeight: 700, color: "#1a3a5c", fontSize: 14 }}>Столбцы</span>
            <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
              <span style={{ color: "#1565c0", cursor: "pointer" }}
                onClick={() => onChange(new Set(ALL_COLUMNS.map((c) => c.key)))}>Все</span>
              <span style={{ color: "#c62828", cursor: "pointer" }}
                onClick={() => onChange(new Set(["date", "enterprise", "weight"]))}>Мин.</span>
            </div>
          </div>
          <div style={{ overflowY: "auto", padding: "12px 16px" }}>
            {groups.map((group) => {
              const cols = ALL_COLUMNS.filter((c) => c.group === group);
              const allOn = cols.every((c) => visible.has(c.key));
              return (
                <div key={group} style={{ marginBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6,
                    fontWeight: 600, fontSize: 12, color: "#333", cursor: "pointer", marginBottom: 4 }}>
                    <input type="checkbox" checked={allOn} onChange={() => toggleGroup(group)} />
                    {group}
                  </label>
                  <div style={{ paddingLeft: 18, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {cols.map((col) => (
                      <label key={col.key} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "#555", cursor: "pointer",
                        background: visible.has(col.key) ? "#e8f0fe" : "#f5f5f5",
                        padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap",
                      }}>
                        <input type="checkbox" checked={visible.has(col.key)}
                          onChange={() => toggleCol(col.key)} />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────

export default function Deliveries() {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState(DEFAULT_VISIBLE);
  const [filterOpen, setFilterOpen] = useState(false);
  const { selectedEnterprise } = useEnterprise();

  const activeCount = Object.values(applied).filter((v) => v !== "").length;

  const params = Object.fromEntries(
    Object.entries({
      ...applied,
      ...(selectedEnterprise ? { enterprise_id: selectedEnterprise.id } : {}),
      page,
      page_size: 25,
    }).filter(([, v]) => v !== "" && v !== null)
  );

  // Сбрасываем страницу при смене предприятия
  useEffect(() => { setPage(1); }, [selectedEnterprise]);

  const { data, isLoading } = useQuery({
    queryKey: ["deliveries", params],
    queryFn: () => getDeliveries(params),
  });

  const handleChange = (key, val) => setDraft((d) => ({ ...d, [key]: val }));
  const handleApply = () => { setApplied({ ...draft }); setPage(1); };
  const handleReset = () => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };

  const visCols = ALL_COLUMNS.filter((c) => visible.has(c.key));
  const groupRows = [];
  visCols.forEach((col) => {
    const last = groupRows[groupRows.length - 1];
    if (last && last.group === col.group) last.span++;
    else groupRows.push({ group: col.group, span: 1 });
  });
  const isLeft = (key) => key === "date" || key === "enterprise";

  return (
    <div style={S.page}>
      {/* Верхняя строка: кнопка фильтров слева, столбцы + счётчик справа */}
      <div style={{ display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 12 }}>
        <FilterButton
          activeCount={activeCount}
          open={filterOpen}
          onToggle={() => setFilterOpen((v) => !v)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data && (
            <span style={{ color: "#666", fontSize: 13 }}>
              Найдено: <b>{data.total}</b>
            </span>
          )}
          <ColumnSelector visible={visible} onChange={setVisible} />
        </div>
      </div>

      {/* Панель фильтров — на всю ширину, сдвигает таблицу вниз */}
      {filterOpen && (
        <FilterPanel
          filters={draft}
          onChange={handleChange}
          onApply={handleApply}
          onReset={handleReset}
          activeCount={activeCount}
        />
      )}

      {isLoading ? (
        <p style={{ color: "#666" }}>Загрузка...</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {groupRows.map((g) => (
                  <th key={g.group} colSpan={g.span} style={S.thGroup}>{g.group}</th>
                ))}
              </tr>
              <tr>
                {visCols.map((col) => (
                  <th key={col.key} style={isLeft(col.key) ? S.thLeft : S.th}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((d) => (
                <tr key={d.id}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9ff"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}
                >
                  {visCols.map((col) => {
                    const val = cellValue(col.key, d);
                    const isArr = Array.isArray(val);
                    const content = isArr ? val[0] : val;
                    const style = isArr
                      ? { ...(isLeft(col.key) ? S.tdLeft : S.td), ...val[1] }
                      : (isLeft(col.key) ? S.tdLeft : S.td);
                    return <td key={col.key} style={style}>{content}</td>;
                  })}
                </tr>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <tr>
                  <td colSpan={visCols.length}
                    style={{ ...S.td, textAlign: "center", color: "#999", padding: 32 }}>
                    Поставки не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 25 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16,
          justifyContent: "center", alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            style={{ ...S.btn(false), opacity: page === 1 ? 0.5 : 1 }}>← Назад</button>
          <span style={{ color: "#666", fontSize: 13 }}>
            {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} из {data.total}
          </span>
          <button disabled={page >= Math.ceil(data.total / 25)}
            onClick={() => setPage((p) => p + 1)}
            style={{ ...S.btn(false), opacity: page >= Math.ceil(data.total / 25) ? 0.5 : 1 }}>
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
