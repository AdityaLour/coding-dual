import pool from "../db/connection.js";
import { hashToken, isTokenShape, newToken } from "./tokens.js";

const SECURE = process.env.COOKIE_SECURE === "true";
// In production the "__Host-" prefix makes the browser reject the cookie unless it is Secure,
// host-only and Path=/, so no other (sub)domain can plant or overwrite it.
export const SESSION_COOKIE = SECURE ? "__Host-boip_session" : "boip_session";
const SESSION_SECONDS = 21 * 24 * 60 * 60; // 3 weeks
const CLEANUP_MS = 60 * 60 * 1000;

function cookieOptions(extra = {}) {
  return {
    httpOnly: true, // JS (and so any XSS) can't read it
    secure: SECURE, // HTTPS only in production
    sameSite: "lax", // not sent on cross-site POSTs (CSRF defence, with the Origin check)
    path: "/",
    ...extra,
  };
}

export function readSessionToken(req) {
  return req.cookies?.[SESSION_COOKIE];
}

// What the Devices list shows is drawn from this: kept short, and only ever turned into a label.
const agentOf = (req) => {
  const agent = req?.get?.("user-agent");
  return typeof agent === "string" && agent.length > 0 ? agent.slice(0, 255) : null;
};

// db can be a transaction connection so the session is part of the same commit.
export async function createSession(userId, db = pool, userAgent = null) {
  const token = newToken();
  await db.execute(
    `INSERT INTO sessions (user_id, token_hash, user_agent, last_seen_at, expires_at)
     VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND))`,
    [userId, hashToken(token), userAgent, SESSION_SECONDS],
  );
  return token;
}

// Every login gets a brand-new token, and the session the browser arrived with is deleted:
// no session fixation, and no old sessions left alive behind a replaced cookie.
export async function rotateSession(req, userId, db = pool) {
  const old = readSessionToken(req);
  if (isTokenShape(old)) {
    await db.execute("DELETE FROM sessions WHERE token_hash = ?", [
      hashToken(old),
    ]);
  }
  return createSession(userId, db, agentOf(req));
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

// "Last active" for the Devices list, written at most once every 5 minutes per session so an ordinary
// request costs no extra write. The first touch also fills in the browser for sessions that began
// before the Devices list existed.
const TOUCH_EVERY_MS = 5 * 60 * 1000;
const touched = new Map(); // token hash -> when it was last written
export function touchSession(token, req) {
  if (!isTokenShape(token)) return;
  const hash = hashToken(token);
  const now = Date.now();
  if (now - (touched.get(hash) ?? 0) < TOUCH_EVERY_MS) return;
  if (touched.size > 10_000) touched.clear();
  touched.set(hash, now);
  pool
    .execute("UPDATE sessions SET last_seen_at = NOW(), user_agent = COALESCE(user_agent, ?) WHERE token_hash = ?", [
      agentOf(req),
      hash,
    ])
    .catch((error) => console.error("Could not record session activity:", error.message));
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
