import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getEnterprises, createEnterprise, updateEnterprise } from "../api/client";

// ── Стили ──────────────────────────────────────────────────────────────────

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  searchBox: { padding: "8px 14px", border: "1px solid #ddd", borderRadius: 8,
    fontSize: 14, width: 280, outline: "none" },
  addBtn: { marginLeft: "auto", padding: "8px 18px", background: "#1a3a5c",
    color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
    fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff",
    borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  th: { background: "#1a3a5c", color: "#fff", padding: "12px 16px",
    textAlign: "left", fontSize: 13, fontWeight: 600 },
  td: { padding: "12px 16px", borderBottom: "1px solid #f0f0f0", fontSize: 14 },
  row: { cursor: "pointer", transition: "background 0.15s" },
  badge: { padding: "2px 10px", borderRadius: 12, fontSize: 12,
    background: "#e3f2fd", color: "#1565c0", fontWeight: 600 },
  // Модальное окно
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    zIndex: 2000, display: "flex", alignItems: "flex-start",
    justifyContent: "center", paddingTop: 40, paddingBottom: 40, overflowY: "auto" },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760,
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)", margin: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between",
    alignItems: "center", padding: "20px 24px",
    borderBottom: "1px solid #eee" },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#1a3a5c" },
  closeBtn: { background: "none", border: "none", fontSize: 22,
    cursor: "pointer", color: "#999", lineHeight: 1 },
  modalBody: { padding: "20px 24px" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#1a3a5c",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12,
    paddingBottom: 6, borderBottom: "2px solid #e8f0fe" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid1: { display: "grid", gridTemplateColumns: "1fr", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: "#666", fontWeight: 500 },
  input: { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, outline: "none", width: "100%" },
  textarea: { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6,
    fontSize: 13, outline: "none", width: "100%", resize: "vertical",
    minHeight: 72, fontFamily: "inherit" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "16px 24px", borderTop: "1px solid #eee" },
  cancelBtn: { padding: "8px 20px", background: "#f5f5f5", border: "1px solid #ddd",
    borderRadius: 6, cursor: "pointer", fontSize: 14 },
  saveBtn: { padding: "8px 24px", background: "#1a3a5c", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 },
};

// ── Поля формы по группам ──────────────────────────────────────────────────

const FORM_SECTIONS = [
  {
    title: "Основная информация",
    grid: "2",
    fields: [
      { key: "name",       label: "Полное официальное название *", wide: true },
      { key: "short_name", label: "Краткое название" },
      { key: "org_form",   label: "Организационно-правовая форма" },
      { key: "region",     label: "Регион" },
    ],
  },
  {
    title: "Адреса",
    grid: "1",
    fields: [
      { key: "legal_address",  label: "Юридический адрес" },
      { key: "actual_address", label: "Фактический/почтовый адрес (если отличается)" },
    ],
  },
  {
    title: "Государственная регистрация",
    grid: "2",
    fields: [
      { key: "inn",  label: "ИНН" },
      { key: "ogrn", label: "ОГРН" },
      { key: "kpp",  label: "КПП" },
    ],
  },
  {
    title: "Банковские реквизиты",
    grid: "2",
    fields: [
      { key: "bank_name",    label: "Наименование банка", wide: true },
      { key: "bank_account", label: "Расчётный счёт (Р/с)" },
      { key: "corr_account", label: "Корреспондентский счёт (К/с)" },
      { key: "bik",          label: "БИК" },
    ],
  },
  {
    title: "Руководство и контакты",
    grid: "2",
    fields: [
      { key: "director_position", label: "Должность руководителя" },
      { key: "director_name",     label: "ФИО руководителя" },
      { key: "phone",             label: "Контактный телефон" },
      { key: "email",             label: "Email" },
    ],
  },
  {
    title: "Примечания",
    grid: "1",
    fields: [
      { key: "notes", label: "Комментарии", multiline: true },
    ],
  },
];

const EMPTY_FORM = Object.fromEntries(
  FORM_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, ""]))
);

// ── Форма создания/редактирования ──────────────────────────────────────────

function EnterpriseModal({ enterprise, onClose, onSave }) {
  const [form, setForm] = useState(
    enterprise
      ? Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, enterprise[k] || ""]))
      : EMPTY_FORM
  );

  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) {
      alert("Введите полное название предприятия");
      return;
    }
    const data = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() || null])
    );
    onSave(data);
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>
            {enterprise ? "Редактировать предприятие" : "Добавить предприятие"}
          </span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          {FORM_SECTIONS.map((section) => (
            <div key={section.title} style={S.section}>
              <div style={S.sectionTitle}>{section.title}</div>
              <div style={section.grid === "1" ? S.grid1 : S.grid}>
                {section.fields.map((f) => (
                  <div key={f.key}
                    style={f.wide ? { ...S.field, gridColumn: "1 / -1" } : S.field}>
                    <label style={S.label}>{f.label}</label>
                    {f.multiline ? (
                      <textarea
                        style={S.textarea}
                        value={form[f.key]}
                        onChange={(e) => setF(f.key, e.target.value)}
                      />
                    ) : (
                      <input
                        style={S.input}
                        value={form[f.key]}
                        onChange={(e) => setF(f.key, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !f.wide && handleSave()}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={S.modalFooter}>
          <button style={S.cancelBtn} onClick={onClose}>Отмена</button>
          <button style={S.saveBtn} onClick={handleSave}>
            {enterprise ? "Сохранить" : "Создать предприятие"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────

export default function Enterprises() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editEnterprise, setEditEnterprise] = useState(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["enterprises", search, page],
    queryFn: () => getEnterprises({ search: search || undefined, page, page_size: 25 }),
  });

  const createMut = useMutation({
    mutationFn: createEnterprise,
    onSuccess: (newE) => {
      queryClient.invalidateQueries(["enterprises"]);
      queryClient.invalidateQueries(["enterprises-nav"]);
      setShowModal(false);
      navigate(`/enterprise/${newE.id}`);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateEnterprise(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["enterprises"]);
      queryClient.invalidateQueries(["enterprises-nav"]);
      setEditEnterprise(null);
    },
  });

  const handleSaveNew = (data) => createMut.mutate(data);
  const handleSaveEdit = (data) => updateMut.mutate({ id: editEnterprise.id, data });

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Предприятия</h1>
        <input
          style={S.searchBox}
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {data && (
          <span style={{ color: "#666", fontSize: 13 }}>
            Всего: {data.total}
          </span>
        )}
        <button style={S.addBtn} onClick={() => setShowModal(true)}>
          + Добавить предприятие
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: "#666" }}>Загрузка...</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Предприятие</th>
              <th style={S.th}>Регион</th>
              <th style={S.th}>Ферм</th>
              <th style={S.th}>Последняя поставка</th>
              <th style={S.th} colSpan={2}></th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((e) => (
              <tr
                key={e.id}
                style={S.row}
                onClick={() => navigate(`/enterprise/${e.id}`)}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = "#f0f4ff")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "")}
              >
                <td style={S.td}>
                  <div style={{ fontWeight: 600 }}>{e.short_name || e.name}</div>
                  {e.short_name && (
                    <div style={{ fontSize: 12, color: "#888" }}>{e.name}</div>
                  )}
                </td>
                <td style={S.td}>{e.region || "—"}</td>
                <td style={S.td}>
                  <span style={S.badge}>{e.farm_count}</span>
                </td>
                <td style={S.td}>
                  {e.last_delivery_date
                    ? new Date(e.last_delivery_date).toLocaleDateString("ru-RU")
                    : "—"}
                </td>
                <td style={{ ...S.td, width: 110, whiteSpace: "nowrap" }}>
                  <button
                    style={{ padding: "4px 10px", background: "#f5f5f5",
                      border: "1px solid #ddd", borderRadius: 5,
                      cursor: "pointer", fontSize: 12 }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setEditEnterprise(e);
                    }}
                  >
                    ✎ Изменить
                  </button>
                </td>
                <td style={{ ...S.td, width: 110, whiteSpace: "nowrap" }}>
                  <button
                    style={{ padding: "4px 10px", background: "#e8f0fe",
                      border: "1px solid #c5d8f8", borderRadius: 5,
                      cursor: "pointer", fontSize: 12, color: "#1a3a5c", fontWeight: 500 }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      navigate(`/enterprise/${e.id}`, { state: { tab: 2 } });
                    }}
                  >
                    🏠 Фермы {e.farm_count > 0 ? `(${e.farm_count})` : ""}
                  </button>
                </td>
              </tr>
            ))}
            {(!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#999" }}>
                  Предприятия не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {data && data.total > 25 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            style={{ padding: "6px 16px", cursor: "pointer", borderRadius: 6,
              border: "1px solid #ddd", background: page === 1 ? "#f5f5f5" : "#fff" }}>
            ← Назад
          </button>
          <span style={{ padding: "6px 12px", color: "#666" }}>
            {page} / {Math.ceil(data.total / 25)}
          </span>
          <button disabled={page >= Math.ceil(data.total / 25)}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "6px 16px", cursor: "pointer", borderRadius: 6,
              border: "1px solid #ddd" }}>
            Вперёд →
          </button>
        </div>
      )}

      {/* Модальное окно добавления */}
      {showModal && (
        <EnterpriseModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveNew}
        />
      )}

      {/* Модальное окно редактирования */}
      {editEnterprise && (
        <EnterpriseModal
          enterprise={editEnterprise}
          onClose={() => setEditEnterprise(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
