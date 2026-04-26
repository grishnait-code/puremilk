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

export const getEnterpriseFarms = (id) =>
  api.get(`/enterprises/${id}/farms`).then((r) => r.data);

export const getEnterpriseAudits = (id) =>
  api.get(`/enterprises/${id}/audits`).then((r) => r.data);

// ── Deliveries ─────────────────────────────────────────────────────────────

export const getDeliveries = (params) =>
  api.get("/deliveries", { params }).then((r) => r.data);

export const getDelivery = (id) =>
  api.get(`/deliveries/${id}`).then((r) => r.data);

// ── Audits ─────────────────────────────────────────────────────────────────

export const getAudits = (params) =>
  api.get("/audits", { params }).then((r) => r.data);

// ── Analytics ──────────────────────────────────────────────────────────────

export const getEnterpriseYearly = (enterpriseId) =>
  api.get(`/analytics/enterprise/${enterpriseId}/yearly`).then((r) => r.data);

export const getSummary = (params) =>
  api.get("/analytics/summary", { params }).then((r) => r.data);

export const getTargets = () =>
  api.get("/analytics/indicators/targets").then((r) => r.data);
