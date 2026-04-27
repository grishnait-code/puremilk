import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGrades, createGrade, updateGrade, deleteGrade,
  getGradeStandardsGrouped, updateGradeStandard, resetGradeStandards,
} from "../api/client";

const S = {
  page: { padding: "24px 32px" },
  header: { display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c" },
  subtitle: { fontSize: 13, color: "#888", marginTop: 4, marginBottom: 24 },
  card: { background: "#fff", borderRadius: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 24 },
  cardHeader: { padding: "16px 20px", borderBottom: "1px solid #eee",
    display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#1a3a5c" },
  cardBody: { padding: "16px 20px" },
  btn: (primary) => ({
    padding: "7px 16px", borderRadius: 6, cursor: "pointer",
    fontSize: 13, fontWeight: 500, border: primary ? "none" : "1px solid #ddd",
    background: primary ? "#1a3a5c" : "#fff", color: primary ? "#fff" : "#333",
    display: "inline-flex", alignItems: "center", gap: 5,
  }),
  table: { width: "100%", borderCollapse: "collapse", background: "#fff",
    borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  thIndicator: { background: "#1a3a5c", color: "#fff",
    padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, width: "28%" },
  td: { padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontSize: 13 },
  input: { width: 75, padding: "5px 8px", border: "1px solid #ddd",
    borderRadius: 5, fontSize: 13, textAlign: "center", outline: "none" },
  inputDirty: { width: 75, padding: "5px 8px", border: "2px solid #1565c0",
    borderRadius: 5, fontSize: 13, textAlign: "center", outline: "none", background: "#e8f0fe" },
  saveBtn: { padding: "4px 10px", background: "#1a3a5c", color: "#fff",
    border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12, marginLeft: 4 },
};


// ── Карточка одного сорта ──────────────────────────────────────────────────

function GradeCard({ grade, onUpdate, onDelete, isOnly }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(grade.display_name);
  const [color, setColor] = useState(grade.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = name !== grade.display_name || color !== grade.color;

  const handleSave = () => {
    onUpdate(grade.id, { display_name: name, color });
    setEditing(false);
  };

  const dot = {
    width: 14, height: 14, borderRadius: "50%",
    background: grade.color, display: "inline-block", marginRight: 8,
    border: "2px solid rgba(0,0,0,0.1)",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", background: grade.is_active ? "#fff" : "#f5f5f5",
      borderRadius: 8, border: "1px solid #e0e0e0", marginBottom: 8,
      opacity: grade.is_active ? 1 : 0.6,
    }}>
      {/* Приоритет */}
      <span style={{ fontSize: 12, color: "#aaa", width: 20, textAlign: "center" }}>
        {grade.sort_order}
      </span>

      {/* Цветная метка */}
      <span style={dot} />

      {editing ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...S.input, width: 140, textAlign: "left" }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <input type="color" value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 36, height: 28, border: "none",
              borderRadius: 4, cursor: "pointer", padding: 2 }}
          />
          <button style={S.btn(true)} onClick={handleSave}>✓ Сохранить</button>
          <button style={S.btn(false)} onClick={() => { setEditing(false); setName(grade.display_name); setColor(grade.color); }}>
            Отмена
          </button>
        </>
      ) : (
        <>
          <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
            {grade.display_name}
          </span>
          <span style={{ fontSize: 11, color: "#aaa", marginRight: 8 }}>
            код: {grade.code}
          </span>
          <button style={{ ...S.btn(false), padding: "4px 10px", fontSize: 12 }}
            onClick={() => setEditing(true)}>
            ✎ Переименовать
          </button>
          <button
            style={{ ...S.btn(false), padding: "4px 10px", fontSize: 12,
              color: grade.is_active ? "#f57f17" : "#2e7d32" }}
            onClick={() => onUpdate(grade.id, { is_active: !grade.is_active })}
          >
            {grade.is_active ? "⏸ Выкл." : "▶ Вкл."}
          </button>
          {!isOnly && !confirmDelete && (
            <button style={{ ...S.btn(false), padding: "4px 10px",
              fontSize: 12, color: "#c62828" }}
              onClick={() => setConfirmDelete(true)}>
              ✕
            </button>
          )}
          {confirmDelete && (
            <>
              <span style={{ fontSize: 12, color: "#c62828" }}>Удалить?</span>
              <button style={{ ...S.btn(false), padding: "4px 10px",
                fontSize: 12, background: "#ffebee", color: "#c62828",
                border: "1px solid #ef9a9a" }}
                onClick={() => onDelete(grade.id)}>
                Да
              </button>
              <button style={{ ...S.btn(false), padding: "4px 10px", fontSize: 12 }}
                onClick={() => setConfirmDelete(false)}>
                Нет
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}


// ── Ячейка норматива ───────────────────────────────────────────────────────

function Cell({ data, onSave }) {
  const [minVal, setMinVal] = useState(data?.value_min ?? "");
  const [maxVal, setMaxVal] = useState(data?.value_max ?? "");
  const [savedAt, setSavedAt] = useState(null);

  const dirty = String(minVal) !== String(data?.value_min ?? "")
             || String(maxVal) !== String(data?.value_max ?? "");

  const handleSave = () => {
    if (!data?.id) return;
    onSave(data.id, {
      value_min: minVal !== "" ? Number(minVal) : null,
      value_max: maxVal !== "" ? Number(maxVal) : null,
    });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  };

  if (!data) return (
    <td style={{ ...S.td, textAlign: "center", color: "#ddd" }}>—</td>
  );

  return (
    <td style={{ ...S.td, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center",
        justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 10, color: "#aaa" }}>от</span>
          <input style={dirty ? S.inputDirty : S.input} type="number" step="0.01"
            value={minVal} placeholder="—"
            onChange={(e) => setMinVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 10, color: "#aaa" }}>до</span>
          <input style={dirty ? S.inputDirty : S.input} type="number" step="0.01"
            value={maxVal} placeholder="—"
            onChange={(e) => setMaxVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()} />
        </div>
        {dirty && <button style={S.saveBtn} onClick={handleSave}>✓</button>}
        {savedAt && <span style={{ color: "#2e7d32", fontSize: 11 }}>✓</span>}
      </div>
    </td>
  );
}


// ── Главный компонент ──────────────────────────────────────────────────────

export default function GradeStandards() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [addingGrade, setAddingGrade] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const { data: grades = [] } = useQuery({
    queryKey: ["grades"],
    queryFn: getGrades,
  });

  const { data: grouped = {}, isLoading } = useQuery({
    queryKey: ["grade-standards-grouped"],
    queryFn: getGradeStandardsGrouped,
  });

  const invalidate = () => {
    queryClient.invalidateQueries(["grades"]);
    queryClient.invalidateQueries(["grade-standards-grouped"]);
  };

  const updateGradeMut = useMutation({
    mutationFn: ({ id, data }) => updateGrade(id, data),
    onSuccess: invalidate,
  });

  const deleteGradeMut = useMutation({
    mutationFn: (id) => deleteGrade(id),
    onSuccess: invalidate,
  });

  const createGradeMut = useMutation({
    mutationFn: (data) => createGrade(data),
    onSuccess: () => { invalidate(); setAddingGrade(false); setNewName(""); },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => updateGradeStandard(id, data),
    onSuccess: () => queryClient.invalidateQueries(["grade-standards-grouped"]),
  });

  const resetMutation = useMutation({
    mutationFn: resetGradeStandards,
    onSuccess: () => { invalidate(); setResetConfirm(false); },
  });

  const activeGrades = grades.filter((g) => g.is_active);
  const indicators = Object.entries(grouped);

  // Заголовок колонки сорта
  const thGrade = (grade) => ({
    padding: "12px 16px", textAlign: "center", fontSize: 13, fontWeight: 700,
    borderBottom: `2px solid ${grade.color}33`,
    background: `${grade.color}18`,
    color: grade.color,
    minWidth: 180,
  });

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Нормативы сортности</h1>
        </div>
        {!resetConfirm ? (
          <button style={S.btn(false)} onClick={() => setResetConfirm(true)}>
            ↺ Сбросить к ГОСТ 31449-2013
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#c62828" }}>Сбросить все значения?</span>
            <button style={{ ...S.btn(false), background: "#ffebee",
              color: "#c62828", border: "1px solid #ef9a9a" }}
              onClick={() => resetMutation.mutate()}>
              Да, сбросить
            </button>
            <button style={S.btn(false)} onClick={() => setResetConfirm(false)}>Отмена</button>
          </div>
        )}
      </div>
      <div style={S.subtitle}>
        Управляйте сортами и границами показателей. Изменения применяются сразу.
      </div>

      {/* ── Управление сортами ── */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Сорта молока</span>
          <button style={S.btn(true)} onClick={() => setAddingGrade(true)}>
            + Добавить сорт
          </button>
        </div>
        <div style={S.cardBody}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>
            Сорта проверяются сверху вниз — от наивысшего к низшему.
            Первый сорт, которому соответствуют все показатели, будет присвоен партии.
          </div>
          {grades.map((g) => (
            <GradeCard
              key={g.id}
              grade={g}
              isOnly={grades.length <= 1}
              onUpdate={(id, data) => updateGradeMut.mutate({ id, data })}
              onDelete={(id) => deleteGradeMut.mutate(id)}
            />
          ))}
          {addingGrade && (
            <div style={{ display: "flex", gap: 8, alignItems: "center",
              padding: "10px 14px", background: "#e8f0fe",
              borderRadius: 8, border: "1px solid #90caf9", marginTop: 8 }}>
              <input
                autoFocus
                placeholder="Название нового сорта..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ ...S.input, width: 200, textAlign: "left" }}
                onKeyDown={(e) => e.key === "Enter" && newName.trim() &&
                  createGradeMut.mutate({ display_name: newName.trim() })}
              />
              <button style={S.btn(true)}
                disabled={!newName.trim()}
                onClick={() => createGradeMut.mutate({ display_name: newName.trim() })}>
                Создать
              </button>
              <button style={S.btn(false)}
                onClick={() => { setAddingGrade(false); setNewName(""); }}>
                Отмена
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Таблица нормативов ── */}
      {isLoading ? (
        <p style={{ color: "#666" }}>Загрузка...</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <table style={{ ...S.table, boxShadow: "none" }}>
            <thead>
              <tr>
                <th style={S.thIndicator}>Показатель</th>
                {activeGrades.map((g) => (
                  <th key={g.code} style={thGrade(g)}>{g.display_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {indicators.map(([indicator, info]) => (
                <tr key={indicator}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 500 }}>{info.label}</div>
                    {info.unit && (
                      <div style={{ fontSize: 11, color: "#aaa" }}>{info.unit}</div>
                    )}
                  </td>
                  {activeGrades.map((g) => (
                    <Cell
                      key={g.code}
                      data={info.grades?.[g.code]}
                      onSave={(id, data) => saveMutation.mutate({ id, data })}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, padding: "12px 16px", background: "#f5f6fa",
        borderRadius: 8, fontSize: 12, color: "#888" }}>
        💡 Введите значение и нажмите <b>✓</b> или <b>Enter</b> для сохранения.
        Синяя рамка = несохранённые изменения. Пустое поле = без ограничения.
      </div>
    </div>
  );
}
