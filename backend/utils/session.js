import crypto from "crypto";
import pool from "../db/connection.js";

const SESSION_DURATION = 3 * 7 * 24 * 60 * 60 * 1000;

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  await pool.execute(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES(?, ?, ? )",
    [userId, token, expiresAt],
  );

  return { token, expiresAt };
}
