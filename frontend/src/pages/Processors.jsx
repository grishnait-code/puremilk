import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getProcessors, createProcessor, deleteProcessor } from "../api/client";

const S = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#1a3a5c", margin: 0 },
  addBtn: { background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  th: { background: "#f0f4fa", padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#1a3a5c", borderBottom: "1px solid #e0e7ef" },
  td: { padding: "12px 16px", fontSize: 14, color: "#333", borderBottom: "1px solid #f0f0f0", verticalAlign: "middle" },
  nameLink: { color: "#1a3a5c", fontWeight: 600, cursor: "pointer", textDecoration: "underline" },
  badge: { display: "inline-block", background: "#e8f0fe", color: "#1a3a5c", borderRadius: 20, padding: "3px 12px", fontSize: 13, fontWeight: 600 },
  actionBtn: (color) => ({ background: "none", border: `1px solid ${color}`, borderRadius: 6, color, padding: "4px 12px", fontSize: 13, cursor: "pointer", marginRight: 6 }),
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 12, padding: "32px 36px", width: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#1a3a5c", marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 5, marginTop: 14 },
  input: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #dce1ea", borderRadius: 8, boxSizing: "border-box" },
  textarea: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #dce1ea", borderRadius: 8, boxSizing: "border-box", minHeight: 80, resize: "vertical" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  footer: { display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" },
  cancelBtn: { background: "#f0f0f0", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, cursor: "pointer" },
  saveBtn: { background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { marginTop: 10, padding: "8px 12px", background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, color: "#c0392b", fontSize: 13 },
};

const emptyForm = { name: "", short_name: "", legal_address: "", actual_address: "", inn: "", kpp: "", ogrn: "", director_name: "", phone: "", email: "", notes: "" };

export default function Processors() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const { data: processors = [], isLoading } = useQuery({ queryKey: ["processors"], queryFn: getProcessors });

  const createMutation = useMutation({
    mutationFn: createProcessor,
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ["processors"] }); setShowModal(false); navigate(`/processor/${p.id}`); },
    onError: (err) => setFormError(err.response?.data?.detail || "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProcessor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["processors"] }),
    onError: (err) => alert(err.response?.data?.detail || "Ошибка"),
  });

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSave = () => {
    setFormError("");
    if (!form.name.trim()) { setFormError("Название обязательно"); return; }
    createMutation.mutate(form);
  };

  const handleDelete = (p) => {
    if (window.confirm(`Удалить переработчика «${p.short_name || p.name}»?`))
      deleteMutation.mutate(p.id);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Переработчики</h1>
        <button style={S.addBtn} onClick={() => { setForm(emptyForm); setFormError(""); setShowModal(true); }}>+ Добавить</button>
      </div>

      {isLoading ? <p style={{ color: "#999" }}>Загрузка...</p> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Название</th>
              <th style={S.th}>ИНН</th>
              <th style={S.th}>Телефон</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Предприятий</th>
              <th style={S.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {processors.map((p) => (
              <tr key={p.id}>
                <td style={S.td}>
                  <span style={S.nameLink} onClick={() => navigate(`/processor/${p.id}`)}>
                    {p.short_name || p.name}
                  </span>
                  {p.short_name && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{p.name}</div>}
                </td>
                <td style={S.td}>{p.inn || "—"}</td>
                <td style={S.td}>{p.phone || "—"}</td>
                <td style={S.td}>{p.email || "—"}</td>
                <td style={S.td}><span style={S.badge}>{p.enterprise_count}</span></td>
                <td style={S.td}>
                  <button style={S.actionBtn("#1a3a5c")} onClick={() => navigate(`/processor/${p.id}`)}>Открыть</button>
                  <button style={S.actionBtn("#c0392b")} onClick={() => handleDelete(p)}>Удалить</button>
                </td>
              </tr>
            ))}
            {processors.length === 0 && (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#aaa", padding: 40 }}>Переработчики не добавлены</td></tr>
            )}
          </tbody>
        </table>
      )}

      {showModal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Новый переработчик</div>

            <label style={S.label}>Полное название *</label>
            <input style={S.input} value={form.name} onChange={set("name")} />

            <label style={S.label}>Краткое название</label>
            <input style={S.input} value={form.short_name} onChange={set("short_name")} />

            <div style={S.row2}>
              <div>
                <label style={S.label}>ИНН</label>
                <input style={S.input} value={form.inn} onChange={set("inn")} />
              </div>
              <div>
                <label style={S.label}>КПП</label>
                <input style={S.input} value={form.kpp} onChange={set("kpp")} />
              </div>
            </div>

            <label style={S.label}>ОГРН</label>
            <input style={S.input} value={form.ogrn} onChange={set("ogrn")} />

            <label style={S.label}>Руководитель</label>
            <input style={S.input} value={form.director_name} onChange={set("director_name")} />

            <div style={S.row2}>
              <div>
                <label style={S.label}>Телефон</label>
                <input style={S.input} value={form.phone} onChange={set("phone")} />
              </div>
              <div>
                <label style={S.label}>Email</label>
                <input style={S.input} value={form.email} onChange={set("email")} />
              </div>
            </div>

            <label style={S.label}>Юридический адрес</label>
            <input style={S.input} value={form.legal_address} onChange={set("legal_address")} />

            <label style={S.label}>Фактический адрес</label>
            <input style={S.input} value={form.actual_address} onChange={set("actual_address")} />

            <label style={S.label}>Примечания</label>
            <textarea style={S.textarea} value={form.notes} onChange={set("notes")} />

            {formError && <div style={S.error}>{formError}</div>}

            <div style={S.footer}>
              <button style={S.cancelBtn} onClick={() => setShowModal(false)}>Отмена</button>
              <button style={S.saveBtn} onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Сохранение..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
