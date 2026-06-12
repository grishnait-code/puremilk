import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getAudits, createAudit, updateAudit, deleteAudit,
         getEnterprises, getEnterpriseFarms } from "../api/client";

// ── Стили ──────────────────────────────────────────────────────────────────

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  addBtn: { marginLeft: "auto", padding: "8px 18px", background: "#1a3a5c",
    color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
    fontSize: 14, fontWeight: 600 },
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
  // Модал
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560,
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)", margin: 24 },
  mHeader: { display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 24px", borderBottom: "1px solid #eee" },
  mTitle: { fontSize: 17, fontWeight: 700, color: "#1a3a5c" },
  mBody: { padding: "20px 24px" },
  mFooter: { display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "14px 24px", borderTop: "1px solid #eee" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 4 },
  input: { width: "100%", padding: "8px 12px", border: "1px solid #ddd",
    borderRadius: 6, fontSize: 13, outline: "none" },
  hint: { fontSize: 11, color: "#aaa", marginTop: 3 },
  btn: (primary) => ({
    padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontSize: 13,
    fontWeight: primary ? 600 : 400, border: primary ? "none" : "1px solid #ddd",
    background: primary ? "#1a3a5c" : "#f5f5f5", color: primary ? "#fff" : "#333",
  }),
};

const EMPTY = {
  enterprise_id: "", farm_id: "", audit_date: "", result: "одобрено",
  approval_months: 12, next_audit_date: "", notification_date: "", notes: "",
};

// ── Модальное окно аудита ──────────────────────────────────────────────────

function AuditModal({ audit, onClose, onSave }) {
  const [form, setForm] = useState(audit ? {
    enterprise_id: String(audit.enterprise_id || ""),
    farm_id: String(audit.farm_id),
    audit_date: audit.audit_date || "",
    result: audit.result || "одобрено",
    approval_months: audit.approval_months || 12,
    next_audit_date: audit.next_audit_date || "",
    notification_date: audit.notification_date || "",
    notes: audit.notes || "",
  } : { ...EMPTY });

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: entData } = useQuery({
    queryKey: ["enterprises-nav"],
    queryFn: () => getEnterprises({ page_size: 100 }),
  });
  const enterprises = entData?.items || [];

  const { data: farms = [] } = useQuery({
    queryKey: ["enterprise-farms", form.enterprise_id],
    queryFn: () => getEnterpriseFarms(form.enterprise_id),
    enabled: !!form.enterprise_id,
  });

  // При смене предприятия — сбрасываем ферму
  const handleEnterpriseChange = (val) => {
    setF("enterprise_id", val);
    setF("farm_id", "");
  };

  const handleSave = () => {
    if (!form.farm_id) { alert("Выберите ферму"); return; }
    if (!form.audit_date) { alert("Укажите дату аудита"); return; }
    if (!form.approval_months) { alert("Укажите срок одобрения"); return; }
    onSave({
      farm_id: Number(form.farm_id),
      audit_date: form.audit_date,
      result: form.result,
      approval_months: Number(form.approval_months),
      next_audit_date: form.next_audit_date || undefined,
      notification_date: form.notification_date || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.mHeader}>
          <span style={S.mTitle}>{audit ? "Редактировать аудит" : "Новый аудит"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none",
            fontSize: 20, cursor: "pointer", color: "#999" }}>✕</button>
        </div>
        <div style={S.mBody}>
          {/* Предприятие */}
          <div style={S.field}>
            <label style={S.label}>Предприятие *</label>
            <select style={S.input} value={form.enterprise_id}
              onChange={(e) => handleEnterpriseChange(e.target.value)}>
              <option value="">— Выберите предприятие —</option>
              {enterprises.map((e) => (
                <option key={e.id} value={e.id}>{e.short_name || e.name}</option>
              ))}
            </select>
          </div>

          {/* Ферма */}
          <div style={S.field}>
            <label style={S.label}>Ферма *</label>
            <select style={S.input} value={form.farm_id}
              onChange={(e) => setF("farm_id", e.target.value)}
              disabled={!form.enterprise_id}>
              <option value="">— Выберите ферму —</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {form.enterprise_id && farms.length === 0 && (
              <div style={S.hint}>У предприятия нет ферм. Сначала добавьте ферму.</div>
            )}
          </div>

          {/* Дата аудита */}
          <div style={S.field}>
            <label style={S.label}>Дата аудита *</label>
            <input style={S.input} type="date" value={form.audit_date}
              onChange={(e) => setF("audit_date", e.target.value)} />
          </div>

          {/* Результат */}
          <div style={S.field}>
            <label style={S.label}>Результат *</label>
            <select style={S.input} value={form.result}
              onChange={(e) => setF("result", e.target.value)}>
              <option value="одобрено">Одобрено</option>
              <option value="условно">Условно</option>
              <option value="отказано">Отказано</option>
            </select>
          </div>

          {/* Срок одобрения */}
          <div style={S.field}>
            <label style={S.label}>Срок одобрения, месяцев *</label>
            <input style={S.input} type="number" min="1" max="36"
              value={form.approval_months}
              onChange={(e) => setF("approval_months", e.target.value)} />
          </div>

          {/* Следующий аудит */}
          <div style={S.field}>
            <label style={S.label}>Дата следующего аудита</label>
            <input style={S.input} type="date" value={form.next_audit_date}
              onChange={(e) => setF("next_audit_date", e.target.value)} />
            <div style={S.hint}>
              Если не указать — рассчитается автоматически: дата аудита + срок одобрения
            </div>
          </div>

          {/* Дата уведомления */}
          <div style={S.field}>
            <label style={S.label}>Дата уведомления</label>
            <input style={S.input} type="date" value={form.notification_date}
              onChange={(e) => setF("notification_date", e.target.value)} />
            <div style={S.hint}>
              По умолчанию — за 30 дней до следующего аудита
            </div>
          </div>

          {/* Примечания */}
          <div style={S.field}>
            <label style={S.label}>Примечания</label>
            <textarea style={{ ...S.input, minHeight: 60, resize: "vertical",
              fontFamily: "inherit" }}
              value={form.notes}
              onChange={(e) => setF("notes", e.target.value)} />
          </div>
        </div>
        <div style={S.mFooter}>
          <button style={S.btn(false)} onClick={onClose}>Отмена</button>
          <button style={S.btn(true)} onClick={handleSave}>
            {audit ? "Сохранить" : "Создать аудит"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Главный компонент ──────────────────────────────────────────────────────

export default function Audits() {
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [resultFilter, setResultFilter] = useState("");
  const [modal, setModal] = useState(null); // null | "new" | audit object
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["audits", overdueOnly, resultFilter],
    queryFn: () => getAudits({ overdue_only: overdueOnly || undefined, result: resultFilter || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries(["audits"]);

  const createMut = useMutation({ mutationFn: createAudit,
    onSuccess: () => { invalidate(); setModal(null); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateAudit(id, data),
    onSuccess: () => { invalidate(); setModal(null); } });
  const deleteMut = useMutation({ mutationFn: deleteAudit,
    onSuccess: () => { invalidate(); setDeletingId(null); } });

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
        <button style={S.addBtn} onClick={() => setModal("new")}>
          + Добавить аудит
        </button>
      </div>

      <div style={S.filterBar}>
        <button style={S.toggle(overdueOnly)} onClick={() => setOverdueOnly(!overdueOnly)}>
          Только просроченные
        </button>
        <select style={S.select} value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}>
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
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => {
              const nextDate = a.next_audit_date ? new Date(a.next_audit_date) : null;
              const daysLeft = nextDate ? Math.round((nextDate - new Date()) / 86400000) : null;
              // Используем overdue_days от бэкенда — там учтено, есть ли более новый аудит фермы
              const isOverdue = a.overdue_days > 0;
              const isSoon = !isOverdue && daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

              return (
                <tr key={a.id}
                  style={{ background: isOverdue ? "#fff5f5" : "" }}
                  onMouseEnter={(e) => !isOverdue && (e.currentTarget.style.background = "#f8f9ff")}
                  onMouseLeave={(e) => !isOverdue && (e.currentTarget.style.background = "")}
                >
                  <td style={S.td}>
                    {a.enterprise_name && (
                      <div style={{ fontWeight: 600, color: "#1565c0", cursor: "pointer" }}
                        onClick={() => a.enterprise_id && navigate(`/enterprise/${a.enterprise_id}`)}>
                        {a.enterprise_name}
                      </div>
                    )}
                    {a.farm_name && (
                      <div style={{ fontSize: 12, color: "#888" }}>{a.farm_name}</div>
                    )}
                  </td>
                  <td style={S.td}>{new Date(a.audit_date).toLocaleDateString("ru-RU")}</td>
                  <td style={S.td}>
                    <span style={S.resultBadge(a.result)}>{a.result}</span>
                  </td>
                  <td style={S.td}>{a.approval_months} мес.</td>
                  <td style={S.td}>
                    {nextDate ? nextDate.toLocaleDateString("ru-RU") : "—"}
                  </td>
                  <td style={S.td}>
                    {a.notification_date
                      ? new Date(a.notification_date).toLocaleDateString("ru-RU") : "—"}
                  </td>
                  <td style={S.td}>
                    {isOverdue ? (
                      <span style={{ background: "#ffebee", color: "#c62828",
                        padding: "3px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                        +{a.overdue_days} дн. просрочка
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
                  <td style={{ ...S.td, color: "#888", fontSize: 12, maxWidth: 200 }}>
                    {a.notes || "—"}
                  </td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <button onClick={() => setModal(a)}
                      style={{ padding: "3px 8px", background: "#f5f5f5",
                        border: "1px solid #ddd", borderRadius: 4,
                        cursor: "pointer", fontSize: 11, marginRight: 4 }}>✎</button>
                    {deletingId === a.id ? (
                      <>
                        <button onClick={() => deleteMut.mutate(a.id)}
                          style={{ padding: "3px 8px", background: "#ffebee",
                            border: "1px solid #ef9a9a", borderRadius: 4,
                            cursor: "pointer", fontSize: 11, color: "#c62828",
                            marginRight: 4 }}>Удалить</button>
                        <button onClick={() => setDeletingId(null)}
                          style={{ padding: "3px 8px", background: "#f5f5f5",
                            border: "1px solid #ddd", borderRadius: 4,
                            cursor: "pointer", fontSize: 11 }}>Нет</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(a.id)}
                        style={{ padding: "3px 8px", background: "#fff",
                          border: "1px solid #ddd", borderRadius: 4,
                          cursor: "pointer", fontSize: 11, color: "#c62828" }}>✕</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...S.td, textAlign: "center",
                  color: "#999", padding: 32 }}>
                  Аудиты не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {modal && (
        <AuditModal
          audit={modal === "new" ? null : modal}
          onClose={() => { setModal(null); setDeletingId(null); }}
          onSave={(data) => {
            if (modal === "new") createMut.mutate(data);
            else updateMut.mutate({ id: modal.id, data });
          }}
        />
      )}
    </div>
  );
}
