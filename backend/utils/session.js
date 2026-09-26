import pool from "../db/connection.js";
import { hashToken, isTokenShape, newToken } from "./tokens.js";

export const SESSION_COOKIE = "boip_session";
const SESSION_SECONDS = 21 * 24 * 60 * 60; // 3 weeks
const CLEANUP_MS = 60 * 60 * 1000;

function cookieOptions(extra = {}) {
  return {
    httpOnly: true, // JS (and so any XSS) can't read it
    secure: process.env.COOKIE_SECURE === "true", // true in production (HTTPS only)
    sameSite: "lax", // not sent on cross-site POSTs (CSRF defence, with the Origin check)
    path: "/",
    ...extra,
  };
}

// db can be a transaction connection so the session is part of the same commit.
export async function createSession(userId, db = pool) {
  const token = newToken();
  await db.execute(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))",
    [userId, hashToken(token), SESSION_SECONDS],
  );
  return token;
}

// The one place a raw session token becomes a user. Reused later by the WebSocket upgrade.
export async function findSessionUser(token) {
  if (!isTokenShape(token)) return null;
  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.email FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function deleteSession(token) {
  if (!isTokenShape(token)) return;
  await pool.execute("DELETE FROM sessions WHERE token_hash = ?", [
    hashToken(token),
  ]);
}

export function setSessionCookie(res, token) {
  res.cookie(
    SESSION_COOKIE,
    token,
    cookieOptions({ maxAge: SESSION_SECONDS * 1000 }),
  );
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

// Hourly: drop expired sessions and spent or expired email links.
export function startSessionCleanup() {
  setInterval(async () => {
    try {
      await pool.execute("DELETE FROM sessions WHERE expires_at <= NOW()");
      await pool.execute(
        "DELETE FROM email_tokens WHERE expires_at <= NOW() OR used_at IS NOT NULL",
      );
    } catch (error) {
      console.error("Session cleanup failed", error);
    }
  }, CLEANUP_MS).unref();
}
