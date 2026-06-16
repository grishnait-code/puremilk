import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Автоматически добавляем JWT-токен в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("qm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// При 401 — очищаем токен и редиректим на /login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("qm_token");
      localStorage.removeItem("qm_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────

export const loginApi = (username, password) =>
  api.post("/auth/login", { username, password }).then((r) => {
    const d = r.data;
    return {
      access_token: d.access_token,
      user: { id: d.user_id, username: d.username, full_name: d.full_name, role: d.role },
    };
  });

export const getMe = () =>
  api.get("/auth/me").then((r) => r.data);

// ── Users (admin) ──────────────────────────────────────────────────────────

export const getUsers = () =>
  api.get("/users").then((r) => r.data);

export const createUser = (data) =>
  api.post("/users", data).then((r) => r.data);

export const updateUser = (id, data) =>
  api.put(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id) =>
  api.delete(`/users/${id}`).then((r) => r.data);

// ── Enterprises ────────────────────────────────────────────────────────────

export const getEnterprises = (params) =>
  api.get("/enterprises", { params }).then((r) => r.data);

export const getEnterprise = (id) =>
  api.get(`/enterprises/${id}`).then((r) => r.data);

export const createEnterprise = (data) =>
  api.post("/enterprises", data).then((r) => r.data);

export const updateEnterprise = (id, data) =>
  api.put(`/enterprises/${id}`, data).then((r) => r.data);

export const getEnterpriseFarms = (id) =>
  api.get(`/enterprises/${id}/farms`).then((r) => r.data);

export const createFarm = (enterpriseId, data) =>
  api.post(`/enterprises/${enterpriseId}/farms`, data).then((r) => r.data);

export const updateFarm = (enterpriseId, farmId, data) =>
  api.put(`/enterprises/${enterpriseId}/farms/${farmId}`, data).then((r) => r.data);

export const deleteFarm = (enterpriseId, farmId) =>
  api.delete(`/enterprises/${enterpriseId}/farms/${farmId}`).then((r) => r.data);

export const getEnterpriseAudits = (id) =>
  api.get(`/enterprises/${id}/audits`).then((r) => r.data);

// ── Deliveries ─────────────────────────────────────────────────────────────

export const getDeliveries = (params) =>
  api.get("/deliveries", { params }).then((r) => r.data);

export const getDeliveryStats = (params) =>
  api.get("/deliveries/stats", { params }).then((r) => r.data);

export const getDelivery = (id) =>
  api.get(`/deliveries/${id}`).then((r) => r.data);

// ── Audits ─────────────────────────────────────────────────────────────────

export const getAudits = (params) =>
  api.get("/audits", { params }).then((r) => r.data);

export const createAudit = (data) =>
  api.post("/audits", data).then((r) => r.data);

export const updateAudit = (id, data) =>
  api.put(`/audits/${id}`, data).then((r) => r.data);

export const deleteAudit = (id) =>
  api.delete(`/audits/${id}`).then((r) => r.data);

// ── Processors ─────────────────────────────────────────────────────────────

export const getProcessors = (params) =>
  api.get("/processors", { params }).then((r) => r.data);

export const getProcessor = (id) =>
  api.get(`/processors/${id}`).then((r) => r.data);

export const createProcessor = (data) =>
  api.post("/processors", data).then((r) => r.data);

export const updateProcessor = (id, data) =>
  api.put(`/processors/${id}`, data).then((r) => r.data);

export const deleteProcessor = (id) =>
  api.delete(`/processors/${id}`).then((r) => r.data);

export const getProcessorEnterprises = (id) =>
  api.get(`/processors/${id}/enterprises`).then((r) => r.data);

export const addProcessorEnterprise = (id, data) =>
  api.post(`/processors/${id}/enterprises`, data).then((r) => r.data);

export const updateProcessorEnterprise = (processorId, linkId, data) =>
  api.put(`/processors/${processorId}/enterprises/${linkId}`, data).then((r) => r.data);

export const deleteProcessorEnterprise = (processorId, linkId) =>
  api.delete(`/processors/${processorId}/enterprises/${linkId}`).then((r) => r.data);

export const getProcessorDeliveries = (id) =>
  api.get(`/processors/${id}/deliveries`).then((r) => r.data);

// ── Grades ─────────────────────────────────────────────────────────────────

export const getGrades = () =>
  api.get("/grades").then((r) => r.data);

export const createGrade = (data) =>
  api.post("/grades", data).then((r) => r.data);

export const updateGrade = (id, data) =>
  api.put(`/grades/${id}`, data).then((r) => r.data);

export const deleteGrade = (id) =>
  api.delete(`/grades/${id}`).then((r) => r.data);

export const reorderGrades = (ids) =>
  api.post("/grades/reorder", ids).then((r) => r.data);

// ── Grade Standards ────────────────────────────────────────────────────────

export const getGradeStandardsGrouped = () =>
  api.get("/grade-standards/grouped").then((r) => r.data);

export const updateGradeStandard = (id, data) =>
  api.put(`/grade-standards/${id}`, data).then((r) => r.data);

export const resetGradeStandards = () =>
  api.post("/grade-standards/reset").then((r) => r.data);

// ── Analytics ──────────────────────────────────────────────────────────────

export const getEnterpriseYearly = (enterpriseId) =>
  api.get(`/analytics/enterprise/${enterpriseId}/yearly`).then((r) => r.data);

export const getEnterpriseMonthly = (enterpriseId, params) =>
  api.get(`/analytics/enterprise/${enterpriseId}/monthly`, { params }).then((r) => r.data);

export const getGradeDecline = (enterpriseId, params) =>
  api.get(`/analytics/enterprise/${enterpriseId}/grade-decline`, { params }).then((r) => r.data);

export const compareEnterprises = (params) =>
  api.get("/analytics/compare", { params }).then((r) => r.data);

export const getEnterpriseReport = (enterpriseId) =>
  api.get(`/analytics/enterprise/${enterpriseId}/report`).then((r) => r.data);

export const getSummary = (params) =>
  api.get("/analytics/summary", { params }).then((r) => r.data);

export const getTargets = () =>
  api.get("/analytics/indicators/targets").then((r) => r.data);
