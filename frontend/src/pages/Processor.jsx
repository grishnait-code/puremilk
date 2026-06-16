import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProcessor, updateProcessor,
  getProcessorEnterprises, addProcessorEnterprise, updateProcessorEnterprise, deleteProcessorEnterprise,
  getProcessorDeliveries, getEnterprises,
} from "../api/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const S = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
  back: { color: "#1a3a5c", cursor: "pointer", fontSize: 14, marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6 },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c", margin: 0 },
  subtitle: { fontSize: 14, color: "#888", marginTop: 4 },
  editBtn: { background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tabs: { display: "flex", gap: 0, borderBottom: "2px solid #e0e7ef", marginBottom: 28 },
  tab: (active) => ({
    padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
    color: active ? "#1a3a5c" : "#888",
    marginBottom: -2, background: "none", border: "none",
    borderBottom: active ? "2px solid #1a3a5c" : "2px solid transparent",
  }),
  card: { background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#1a3a5c", marginBottom: 16 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px" },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  fieldValue: { fontSize: 15, color: "#222" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#1a3a5c", borderBottom: "1px solid #e0e7ef", background: "#f7f9fc" },
  td: { padding: "10px 14px", fontSize: 14, color: "#333", borderBottom: "1px solid #f0f0f0" },
  badge: (active) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    background: active ? "#e8f5e9" : "#f5f5f5", color: active ? "#2e7d32" : "#888",
  }),
  addBtn: { background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16 },
  actionBtn: (color) => ({ background: "none", border: `1px solid ${color}`, borderRadius: 6, color, padding: "3px 10px", fontSize: 12, cursor: "pointer", marginRight: 4 }),
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 12, padding: "32px 36px", width: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#1a3a5c", marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 5, marginTop: 14 },
  input: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #dce1ea", borderRadius: 8, boxSizing: "border-box" },
  select: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #dce1ea", borderRadius: 8, boxSizing: "border-box" },
  textarea: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #dce1ea", borderRadius: 8, boxSizing: "border-box", minHeight: 70, resize: "vertical" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  footer: { display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" },
  cancelBtn: { background: "#f0f0f0", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, cursor: "pointer" },
  saveBtn: { background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { marginTop: 10, padding: "8px 12px", background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, color: "#c0392b", fontSize: 13 },
};

const MONTHS_RU = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

export default function Processor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [linkModal, setLinkModal] = useState(null); // null | { mode, data? }
  const [linkForm, setLinkForm] = useState({ enterprise_id: "", started_at: "", ended_at: "", notes: "" });
  const [linkError, setLinkError] = useState("");

  const { data: processor, isLoading } = useQuery({
    queryKey: ["processor", id],
    queryFn: () => getProcessor(id),
    onSuccess: (p) => { if (!form) setForm(p); },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["processor-enterprises", id],
    queryFn: () => getProcessorEnterprises(id),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["processor-deliveries", id],
    queryFn: () => getProcessorDeliveries(id),
    enabled: tab === 2,
  });

  const { data: _enterprisesData } = useQuery({
    queryKey: ["enterprises-nav"],
    queryFn: () => getEnterprises({ page_size: 200 }),
    staleTime: 5 * 60_000,
  });
  const allEnterprises = _enterprisesData?.items || [];

  const updateMutation = useMutation({
    mutationFn: (data) => updateProcessor(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processor", id] }); qc.invalidateQueries({ queryKey: ["processors"] }); setEditMode(false); },
  });

  const addLinkMutation = useMutation({
    mutationFn: (data) => addProcessorEnterprise(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processor-enterprises", id] }); closeLinkModal(); },
    onError: (err) => setLinkError(err.response?.data?.detail || "Ошибка"),
  });

  const updateLinkMutation = useMutation({
    mutationFn: ({ linkId, data }) => updateProcessorEnterprise(id, linkId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processor-enterprises", id] }); closeLinkModal(); },
    onError: (err) => setLinkError(err.response?.data?.detail || "Ошибка"),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId) => deleteProcessorEnterprise(id, linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["processor-enterprises", id] }),
  });

  const openAddLink = () => { setLinkForm({ enterprise_id: "", started_at: "", ended_at: "", notes: "" }); setLinkError(""); setLinkModal({ mode: "add" }); };
  const openEditLink = (lnk) => {
    setLinkForm({ enterprise_id: lnk.enterprise_id, started_at: lnk.started_at || "", ended_at: lnk.ended_at || "", notes: lnk.notes || "" });
    setLinkError("");
    setLinkModal({ mode: "edit", data: lnk });
  };
  const closeLinkModal = () => setLinkModal(null);

  const handleSaveLink = () => {
    setLinkError("");
    if (!linkForm.enterprise_id) { setLinkError("Выберите предприятие"); return; }
    const payload = {
      enterprise_id: Number(linkForm.enterprise_id),
      started_at: linkForm.started_at || null,
      ended_at: linkForm.ended_at || null,
      notes: linkForm.notes || null,
    };
    if (linkModal.mode === "add") addLinkMutation.mutate(payload);
    else updateLinkMutation.mutate({ linkId: linkModal.data.id, data: payload });
  };

  const setL = (f) => (e) => setLinkForm((prev) => ({ ...prev, [f]: e.target.value }));
  const setF = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  // Подготовка данных для графика
  const chartData = React.useMemo(() => {
    if (!deliveries.length) return [];
    const years = [...new Set(deliveries.map((d) => d.year))].sort();
    const latestYear = Math.max(...years);
    const byMonth = {};
    deliveries.filter((d) => d.year === latestYear).forEach((d) => {
      const key = d.month;
      if (!byMonth[key]) byMonth[key] = { month: MONTHS_RU[d.month - 1] };
      byMonth[key][d.enterprise_name] = (byMonth[key][d.enterprise_name] || 0) + d.total_kg / 1000;
    });
    return Array.from({ length: 12 }, (_, i) => byMonth[i + 1] || { month: MONTHS_RU[i] });
  }, [deliveries]);

  const enterprises_in_chart = [...new Set(deliveries.map((d) => d.enterprise_name))];
  const COLORS = ["#1a3a5c", "#4fc3f7", "#66bb6a", "#ffa726", "#ef5350", "#ab47bc"];

  if (isLoading) return <div style={{ padding: 48, color: "#999" }}>Загрузка...</div>;
  if (!processor) return <div style={{ padding: 48, color: "#c0392b" }}>Переработчик не найден</div>;

  const p = processor;

  return (
    <div style={S.page}>
      <div style={S.back} onClick={() => navigate("/processors")}>← Все переработчики</div>

      <div style={S.header}>
        <div>
          <h1 style={S.title}>{p.short_name || p.name}</h1>
          {p.short_name && <div style={S.subtitle}>{p.name}</div>}
        </div>
        <button style={S.editBtn} onClick={() => { setForm({ ...p }); setEditMode(true); }}>Редактировать</button>
      </div>

      <div style={S.tabs}>
        {["Реквизиты", "Предприятия", "История поставок"].map((label, i) => (
          <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>{label}</button>
        ))}
      </div>

      {/* ── Реквизиты ── */}
      {tab === 0 && (
        <div style={S.card}>
          <div style={S.grid2}>
            {[
              ["ИНН", p.inn], ["КПП", p.kpp], ["ОГРН", p.ogrn], ["Руководитель", p.director_name],
              ["Телефон", p.phone], ["Email", p.email],
              ["Юридический адрес", p.legal_address], ["Фактический адрес", p.actual_address],
            ].map(([label, value]) => (
              <div style={S.field} key={label}>
                <div style={S.fieldLabel}>{label}</div>
                <div style={S.fieldValue}>{value || "—"}</div>
              </div>
            ))}
          </div>
          {p.notes && (
            <div style={{ marginTop: 16 }}>
              <div style={S.fieldLabel}>Примечания</div>
              <div style={{ ...S.fieldValue, whiteSpace: "pre-wrap" }}>{p.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Предприятия ── */}
      {tab === 1 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={S.sectionTitle}>Привязанные предприятия</div>
            <button style={S.addBtn} onClick={openAddLink}>+ Добавить</button>
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Предприятие</th>
                <th style={S.th}>Начало</th>
                <th style={S.th}>Окончание</th>
                <th style={S.th}>Статус</th>
                <th style={S.th}>Примечания</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {links.map((lnk) => (
                <tr key={lnk.id}>
                  <td style={S.td}><strong>{lnk.enterprise_short_name || lnk.enterprise_name}</strong></td>
                  <td style={S.td}>{lnk.started_at ? new Date(lnk.started_at).toLocaleDateString("ru-RU") : "—"}</td>
                  <td style={S.td}>{lnk.ended_at ? new Date(lnk.ended_at).toLocaleDateString("ru-RU") : "—"}</td>
                  <td style={S.td}><span style={S.badge(lnk.is_active)}>{lnk.is_active ? "Активно" : "Завершено"}</span></td>
                  <td style={S.td}>{lnk.notes || "—"}</td>
                  <td style={S.td}>
                    <button style={S.actionBtn("#1a3a5c")} onClick={() => openEditLink(lnk)}>Изменить</button>
                    <button style={S.actionBtn("#c0392b")} onClick={() => { if (window.confirm("Удалить привязку?")) deleteLinkMutation.mutate(lnk.id); }}>Удалить</button>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#aaa", padding: 32 }}>Предприятия не привязаны</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── История поставок ── */}
      {tab === 2 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Поставки по предприятиям (текущий год, тонны)</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v.toFixed(1)} т`} />
                <Legend />
                {enterprises_in_chart.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#aaa", textAlign: "center", padding: 40 }}>Нет данных о поставках</div>
          )}

          {deliveries.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1a3a5c", marginBottom: 12 }}>Итого по предприятиям</div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Предприятие</th>
                    <th style={S.th}>Год</th>
                    <th style={S.th}>Объём, т</th>
                    <th style={S.th}>Поставок</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(
                    deliveries.reduce((acc, d) => {
                      const key = `${d.enterprise_id}-${d.year}`;
                      if (!acc[key]) acc[key] = { ...d, total_kg: 0, deliveries_count: 0 };
                      acc[key].total_kg += d.total_kg;
                      acc[key].deliveries_count += d.deliveries_count;
                      return acc;
                    }, {})
                  ).sort((a, b) => b.year - a.year || a.enterprise_name.localeCompare(b.enterprise_name))
                   .map((row, i) => (
                    <tr key={i}>
                      <td style={S.td}>{row.enterprise_name}</td>
                      <td style={S.td}>{row.year}</td>
                      <td style={S.td}>{(row.total_kg / 1000).toFixed(1)}</td>
                      <td style={S.td}>{row.deliveries_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Модал редактирования ── */}
      {editMode && form && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setEditMode(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Редактировать переработчика</div>

            <label style={S.label}>Полное название *</label>
            <input style={S.input} value={form.name || ""} onChange={setF("name")} />

            <label style={S.label}>Краткое название</label>
            <input style={S.input} value={form.short_name || ""} onChange={setF("short_name")} />

            <div style={S.row2}>
              <div><label style={S.label}>ИНН</label><input style={S.input} value={form.inn || ""} onChange={setF("inn")} /></div>
              <div><label style={S.label}>КПП</label><input style={S.input} value={form.kpp || ""} onChange={setF("kpp")} /></div>
            </div>

            <label style={S.label}>ОГРН</label>
            <input style={S.input} value={form.ogrn || ""} onChange={setF("ogrn")} />

            <label style={S.label}>Руководитель</label>
            <input style={S.input} value={form.director_name || ""} onChange={setF("director_name")} />

            <div style={S.row2}>
              <div><label style={S.label}>Телефон</label><input style={S.input} value={form.phone || ""} onChange={setF("phone")} /></div>
              <div><label style={S.label}>Email</label><input style={S.input} value={form.email || ""} onChange={setF("email")} /></div>
            </div>

            <label style={S.label}>Юридический адрес</label>
            <input style={S.input} value={form.legal_address || ""} onChange={setF("legal_address")} />

            <label style={S.label}>Фактический адрес</label>
            <input style={S.input} value={form.actual_address || ""} onChange={setF("actual_address")} />

            <label style={S.label}>Примечания</label>
            <textarea style={S.textarea} value={form.notes || ""} onChange={setF("notes")} />

            <div style={S.footer}>
              <button style={S.cancelBtn} onClick={() => setEditMode(false)}>Отмена</button>
              <button style={S.saveBtn} onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал привязки предприятия ── */}
      {linkModal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && closeLinkModal()}>
          <div style={{ ...S.modal, width: 420 }}>
            <div style={S.modalTitle}>{linkModal.mode === "add" ? "Привязать предприятие" : "Изменить привязку"}</div>

            <label style={S.label}>Предприятие *</label>
            <select style={S.select} value={linkForm.enterprise_id} onChange={setL("enterprise_id")} disabled={linkModal.mode === "edit"}>
              <option value="">— Выберите —</option>
              {allEnterprises.map((e) => (
                <option key={e.id} value={e.id}>{e.short_name || e.name}</option>
              ))}
            </select>

            <div style={S.row2}>
              <div>
                <label style={S.label}>Начало сотрудничества</label>
                <input style={S.input} type="date" value={linkForm.started_at} onChange={setL("started_at")} />
              </div>
              <div>
                <label style={S.label}>Окончание (пусто = активно)</label>
                <input style={S.input} type="date" value={linkForm.ended_at} onChange={setL("ended_at")} />
              </div>
            </div>

            <label style={S.label}>Примечания</label>
            <textarea style={S.textarea} value={linkForm.notes} onChange={setL("notes")} />

            {linkError && <div style={S.error}>{linkError}</div>}

            <div style={S.footer}>
              <button style={S.cancelBtn} onClick={closeLinkModal}>Отмена</button>
              <button style={S.saveBtn} onClick={handleSaveLink} disabled={addLinkMutation.isPending || updateLinkMutation.isPending}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
