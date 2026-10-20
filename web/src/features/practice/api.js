import { api } from "@/shared/api/client.js";

const BASE = "/api/practice";
const slugPath = (slug) => `${BASE}/problems/${encodeURIComponent(slug)}`;

export const listProblems = () => api(`${BASE}/problems`);
export const getProblem = (slug) => api(slugPath(slug));
export const getHistory = (slug) => api(`${slugPath(slug)}/submissions`);
export const getSubmission = (id) => api(`${BASE}/submissions/${id}`);
export const getRun = (id) => api(`${BASE}/runs/${id}`);

// Both return { id } at once (202); the verdict is fetched afterwards with getSubmission / getRun.
export const submitCode = (slug, languageId, source) =>
  api(`${slugPath(slug)}/submit`, { method: "POST", body: { languageId, source } });
export const runExamples = (slug, languageId, source) =>
  api(`${slugPath(slug)}/run`, { method: "POST", body: { languageId, source } });
