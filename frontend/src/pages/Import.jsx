import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEnterprises, createEnterprise } from "../api/client";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

const S = {
  page: { padding: "24px 32px", maxWidth: 760 },
  title: { fontSize: 24, fontWeight: 700, color: "#1a3a5c", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 32 },
  card: { background: "#fff", borderRadius: 12, padding: 28,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#1a3a5c",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 },
  dropzone: (drag) => ({
    border: `2px dashed ${drag ? "#1a3a5c" : "#ddd"}`,
    borderRadius: 10, padding: "40px 20px", textAlign: "center",
    background: drag ? "#e8f0fe" : "#fafafa",
    cursor: "pointer", transition: "all 0.2s",
  }),
  fileInfo: { background: "#e8f0fe", borderRadius: 8, padding: "12px 16px",
    marginTop: 12, display: "flex", alignItems: "center", gap: 12 },
  select: { width: "100%", padding: "9px 12px", border: "1px solid #ddd",
    borderRadius: 6, fontSize: 14, background: "#fff", outline: "none" },
  btn: (disabled) => ({
    width: "100%", padding: "12px", background: disabled ? "#ccc" : "#1a3a5c",
    color: "#fff", border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15, fontWeight: 600, marginTop: 8,
  }),
  result: (ok) => ({
    borderRadius: 10, padding: 20,
    background: ok ? "#e8f5e9" : "#ffebee",
    border: `1px solid ${ok ? "#a5d6a7" : "#ef9a9a"}`,
  }),
  statRow: { display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" },
  stat: (color) => ({
    textAlign: "center", padding: "12px 20px", borderRadius: 8,
    background: `${color}18`, border: `1px solid ${color}44`,
  }),
  statNum: (color) => ({ fontSize: 28, fontWeight: 700, color }),
  statLabel: { fontSize: 12, color: "#666", marginTop: 2 },
};

export default function Import() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enterpriseId, setEnterpriseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const { data: enterprises } = useQuery({
    queryKey: ["enterprises-nav"],
    queryFn: () => getEnterprises({ page_size: 100 }),
  });

  const queryClient = useQueryClient();
  const createEnterpriseMut = useMutation({
    mutationFn: createEnterprise,
    onSuccess: (newEnterprise) => {
      queryClient.invalidateQueries(["enterprises"]);
      queryClient.invalidateQueries(["enterprises-nav"]);
      setEnterpriseId(String(newEnterprise.id));
    },
  });

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreview(null);

    // Предпросмотр
    const fd = new FormData();
    fd.append("file", f);
    try {
      const { data } = await api.post("/import/preview-valio-xls", fd);
      setPreview(data);
      // Автовыбор предприятия по имени из файла
      if (data.enterprise_name && enterprises?.items) {
        const found = enterprises.items.find((e) =>
          e.name.toLowerCase().includes(data.enterprise_name.toLowerCase()) ||
          (e.short_name || "").toLowerCase().includes(data.enterprise_name.toLowerCase())
        );
        if (found) setEnterpriseId(String(found.id));
      }
    } catch (e) {
      setPreview({ error: e.response?.data?.detail || "Ошибка чтения файла" });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    if (enterpriseId) fd.append("enterprise_id", enterpriseId);
    try {
      const { data } = await api.post("/import/valio-xls", fd);
      setResult({ ok: true, ...data });
    } catch (e) {
      setResult({ ok: false, error: e.response?.data?.detail || "Ошибка импорта" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setEnterpriseId("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={S.page}>
      <h1 style={S.title}>Загрузка данных</h1>
      <p style={S.subtitle}>
        Импорт партий молока из еженедельного отчёта VALIO (формат .XLS).
        Дубликаты по дате автоматически пропускаются.
      </p>

      {/* Загрузка файла */}
      <div style={S.card}>
        <div style={S.sectionTitle}>1. Выберите файл</div>
        <div
          style={S.dropzone(drag)}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 600, color: "#1a3a5c", marginBottom: 4 }}>
            Перетащите файл сюда или нажмите для выбора
          </div>
          <div style={{ fontSize: 13, color: "#999" }}>
            Поддерживаемый формат: ОтчетVALIO_*.XLS
          </div>
          <input ref={inputRef} type="file" accept=".xls,.xlsx"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        {file && (
          <div style={S.fileInfo}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {(file.size / 1024).toFixed(1)} КБ
              </div>
            </div>
            <button onClick={reset}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "#c62828", fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* Предпросмотр */}
        {preview && !preview.error && (
          <div style={{ marginTop: 16, padding: "14px 16px", background: "#f5f6fa",
            borderRadius: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: "#1a3a5c", marginBottom: 6 }}>
              Содержимое файла:
            </div>
            <div>Хозяйство в файле: <b>{preview.enterprise_name}</b></div>
            {preview.week && <div>Неделя: <b>{preview.week}</b></div>}
            <div>Партий в файле: <b>{preview.delivery_count}</b></div>
            <div style={{ marginTop: 6, color: "#666" }}>
              Даты: {preview.dates.join(", ")}
            </div>
          </div>
        )}
        {preview?.error && (
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#ffebee",
            borderRadius: 8, color: "#c62828", fontSize: 13 }}>
            ⚠ {preview.error}
          </div>
        )}
      </div>

      {/* Выбор предприятия */}
      {file && !preview?.error && (
        <div style={S.card}>
          <div style={S.sectionTitle}>2. Выберите предприятие</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            {preview?.enterprise_name
              ? `Из файла определено хозяйство «${preview.enterprise_name}». Выберите предприятие из базы:`
              : "Выберите предприятие, к которому относятся данные:"}
          </div>
          <select style={S.select} value={enterpriseId}
            onChange={(e) => setEnterpriseId(e.target.value)}>
            <option value="">— Выберите предприятие —</option>
            {enterprises?.items?.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          {preview?.enterprise_name && enterprises?.items && !enterprises.items.some(
            (e) => e.name.toLowerCase() === preview.enterprise_name.toLowerCase() ||
                   (e.short_name || "").toLowerCase() === preview.enterprise_name.toLowerCase()
          ) && (
            <button
              onClick={() => createEnterpriseMut.mutate({ name: preview.enterprise_name, short_name: preview.enterprise_name })}
              disabled={createEnterpriseMut.isPending}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                background: "#e8f0fe",
                color: "#1a3a5c",
                border: "1px solid #1a3a5c",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#d2e3fc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#e8f0fe"; }}
            >
              {createEnterpriseMut.isPending ? "Создание..." : `+ Создать предприятие «${preview.enterprise_name}»`}
            </button>
          )}
        </div>
      )}

      {/* Кнопка импорта */}
      {file && !preview?.error && (
        <div style={S.card}>
          <div style={S.sectionTitle}>3. Импортировать</div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
            Партии, которые уже есть в базе за те же даты, будут пропущены.
          </div>
          <button
            style={S.btn(!enterpriseId || loading)}
            disabled={!enterpriseId || loading}
            onClick={handleImport}
          >
            {loading ? "Импортируется..." : `Загрузить ${preview?.delivery_count ?? ""} партий`}
          </button>
        </div>
      )}

      {/* Результат */}
      {result && (
        <div style={S.result(result.ok)}>
          {result.ok ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#2e7d32",
                marginBottom: 16 }}>
                ✓ Импорт завершён — {result.enterprise}{result.week ? `, неделя ${result.week}` : ""}
              </div>
              <div style={S.statRow}>
                <div style={S.stat("#2e7d32")}>
                  <div style={S.statNum("#2e7d32")}>{result.imported}</div>
                  <div style={S.statLabel}>Добавлено партий</div>
                </div>
                <div style={S.stat("#f57f17")}>
                  <div style={S.statNum("#f57f17")}>{result.skipped}</div>
                  <div style={S.statLabel}>Пропущено (дубли)</div>
                </div>
                <div style={S.stat("#1565c0")}>
                  <div style={S.statNum("#1565c0")}>{result.total_in_file}</div>
                  <div style={S.statLabel}>Всего в файле</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div style={{ fontSize: 12, color: "#c62828" }}>
                  Ошибки: {result.errors.join("; ")}
                </div>
              )}
              <button onClick={reset}
                style={{ marginTop: 12, padding: "8px 20px", background: "#1a3a5c",
                  color: "#fff", border: "none", borderRadius: 6,
                  cursor: "pointer", fontSize: 13 }}>
                Загрузить ещё один файл
              </button>
            </>
          ) : (
            <div style={{ color: "#c62828" }}>
              <b>Ошибка:</b> {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
