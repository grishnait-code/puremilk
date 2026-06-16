import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, createUser, updateUser, deleteUser } from "../api/client";
import { useAuth } from "../context/AuthContext";

const S = {
  page: { maxWidth: 900, margin: "0 auto", padding: "32px 24px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#1a3a5c", margin: 0 },
  addBtn: {
    background: "#1a3a5c", color: "#fff", border: "none",
    borderRadius: 8, padding: "9px 20px", fontSize: 14,
    fontWeight: 600, cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
  th: { background: "#f0f4fa", padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#1a3a5c", borderBottom: "1px solid #e0e7ef" },
  td: { padding: "12px 16px", fontSize: 14, color: "#333", borderBottom: "1px solid #f0f0f0" },
  badge: (role) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 600,
    background: role === "admin" ? "#e8f0fe" : "#f0f9f0",
    color: role === "admin" ? "#1a3a5c" : "#2e7d32",
  }),
  activeBadge: (active) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 12, fontWeight: 600,
    background: active ? "#e8f5e9" : "#ffeaea",
    color: active ? "#2e7d32" : "#c0392b",
  }),
  actionBtn: (color) => ({
    background: "none", border: `1px solid ${color}`, borderRadius: 6,
    color, padding: "4px 12px", fontSize: 13, cursor: "pointer", marginRight: 6,
  }),
  // Modal
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "#fff", borderRadius: 12, padding: "32px 36px",
    width: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#1a3a5c", marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 5, marginTop: 16 },
  input: {
    width: "100%", padding: "9px 12px", fontSize: 14,
    border: "1.5px solid #dce1ea", borderRadius: 8, boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "9px 12px", fontSize: 14,
    border: "1.5px solid #dce1ea", borderRadius: 8, boxSizing: "border-box",
  },
  modalFooter: { display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" },
  cancelBtn: {
    background: "#f0f0f0", border: "none", borderRadius: 8,
    padding: "9px 20px", fontSize: 14, cursor: "pointer",
  },
  saveBtn: {
    background: "#1a3a5c", color: "#fff", border: "none",
    borderRadius: 8, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  error: { marginTop: 12, padding: "8px 12px", background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8, color: "#c0392b", fontSize: 13 },
};

const emptyForm = { username: "", full_name: "", password: "", role: "user", is_active: true };

export default function Users() {
  const { user: me, updateUserInfo } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { mode: "create" | "edit", data: {...} }
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      modal?.mode === "create"
        ? createUser(payload)
        : updateUser(modal.data.id, payload),
    onSuccess: (savedUser) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      // Если редактировали себя — обновляем AuthContext
      if (modal?.mode === "edit" && savedUser.id === me?.id) {
        updateUserInfo({ ...me, full_name: savedUser.full_name, role: savedUser.role });
      }
      closeModal();
    },
    onError: (err) => setFormError(err.response?.data?.detail || "Ошибка сохранения"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: (err) => alert(err.response?.data?.detail || "Ошибка удаления"),
  });

  const toggleActive = (u) => {
    updateUser(u.id, { is_active: !u.is_active })
      .then(() => qc.invalidateQueries({ queryKey: ["users"] }))
      .catch((err) => alert(err.response?.data?.detail || "Ошибка"));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setModal({ mode: "create" });
  };

  const openEdit = (u) => {
    setForm({ username: u.username, full_name: u.full_name || "", password: "", role: u.role, is_active: u.is_active });
    setFormError("");
    setModal({ mode: "edit", data: u });
  };

  const closeModal = () => { setModal(null); setFormError(""); };

  const handleSave = () => {
    setFormError("");
    const payload = { username: form.username, full_name: form.full_name, role: form.role, is_active: form.is_active };
    if (form.password) payload.password = form.password;
    if (modal.mode === "create" && !form.password) {
      setFormError("Пароль обязателен при создании пользователя");
      return;
    }
    saveMutation.mutate(payload);
  };

  const handleDelete = (u) => {
    if (window.confirm(`Удалить пользователя «${u.username}»? Это действие нельзя отменить.`))
      deleteMutation.mutate(u.id);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Пользователи</h1>
        <button style={S.addBtn} onClick={openCreate}>+ Добавить</button>
      </div>

      {isLoading ? (
        <p style={{ color: "#999" }}>Загрузка...</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Логин</th>
              <th style={S.th}>Имя</th>
              <th style={S.th}>Роль</th>
              <th style={S.th}>Статус</th>
              <th style={S.th}>Зарегистрирован</th>
              <th style={S.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={S.td}><strong>{u.username}</strong>{u.id === me?.id ? " (вы)" : ""}</td>
                <td style={S.td}>{u.full_name || "—"}</td>
                <td style={S.td}><span style={S.badge(u.role)}>{u.role === "admin" ? "Администратор" : "Пользователь"}</span></td>
                <td style={S.td}><span style={S.activeBadge(u.is_active)}>{u.is_active ? "Активен" : "Отключён"}</span></td>
                <td style={S.td}>{u.created_at ? new Date(u.created_at).toLocaleDateString("ru-RU") : "—"}</td>
                <td style={S.td}>
                  <button style={S.actionBtn("#1a3a5c")} onClick={() => openEdit(u)}>Изменить</button>
                  {u.id !== me?.id && (
                    <>
                      <button style={S.actionBtn(u.is_active ? "#e67e22" : "#27ae60")} onClick={() => toggleActive(u)}>
                        {u.is_active ? "Отключить" : "Включить"}
                      </button>
                      <button style={S.actionBtn("#c0392b")} onClick={() => handleDelete(u)}>Удалить</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={S.modal}>
            <div style={S.modalTitle}>{modal.mode === "create" ? "Новый пользователь" : "Изменить пользователя"}</div>

            <label style={S.label}>Логин *</label>
            <input style={S.input} value={form.username} onChange={set("username")} />

            <label style={S.label}>Полное имя</label>
            <input style={S.input} value={form.full_name} onChange={set("full_name")} />

            <label style={S.label}>{modal.mode === "create" ? "Пароль *" : "Новый пароль (оставьте пустым, чтобы не менять)"}</label>
            <input style={S.input} type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />

            <label style={S.label}>Роль</label>
            <select style={S.select} value={form.role} onChange={set("role")}>
              <option value="user">Пользователь</option>
              <option value="admin">Администратор</option>
            </select>

            {modal.mode === "edit" && (
              <>
                <label style={S.label}>Статус</label>
                <select style={S.select} value={form.is_active ? "1" : "0"} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "1" }))}>
                  <option value="1">Активен</option>
                  <option value="0">Отключён</option>
                </select>
              </>
            )}

            {formError && <div style={S.error}>{formError}</div>}

            <div style={S.modalFooter}>
              <button style={S.cancelBtn} onClick={closeModal}>Отмена</button>
              <button style={S.saveBtn} onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
