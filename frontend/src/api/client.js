import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

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
