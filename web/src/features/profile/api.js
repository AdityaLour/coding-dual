import { api } from "@/shared/api/client.js";

// Reads: all built. Everything here is about the signed-in player; the server never takes an id.
export const getProfile = () => api("/api/profile");
export const getRating = () => api("/api/profile/rating");
export const getAccount = () => api("/api/profile/account");
export function getDuels({ filter, cursor, limit }) {
  const query = new URLSearchParams({ filter });
  if (cursor) query.set("cursor", cursor);
  if (limit) query.set("limit", String(limit));
  return api(`/api/profile/duels?${query}`);
}

// Changes to the signed-in account. Delete is not built yet: it answers 404 and the page says so.
export const changePassword = ({ current, next }) =>
  api("/api/account/password", { method: "POST", body: { current, next } });
export const changeEmail = ({ email, password }) =>
  api("/api/account/email", { method: "POST", body: { email, password } });
export const resendEmailChange = () => api("/api/account/email/resend", { method: "POST" });
export const cancelEmailChange = () => api("/api/account/email", { method: "DELETE" });
// The link in the email: works without a session, so it never needs the person to be logged in.
export const confirmEmailChange = (token) => api("/api/account/email/confirm", { method: "POST", body: { token } });
export const getSessions = () => api("/api/account/sessions");
export const signOutSession = (id) => api(`/api/account/sessions/${id}`, { method: "DELETE" });
export const signOutOthers = () => api("/api/account/sessions", { method: "DELETE" });
export const deleteAccount = (username) =>
  api("/api/account", { method: "DELETE", body: { username } });
