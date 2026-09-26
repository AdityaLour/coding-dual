import { hashToken, isTokenShape, newToken } from "./tokens.js";

const TTL_SECONDS = { verify: 24 * 60 * 60, reset: 30 * 60 };

// Call inside a transaction. Issuing a new link kills older unused ones of the same kind.
export async function issueEmailToken(conn, userId, purpose) {
  await conn.execute(
    "DELETE FROM email_tokens WHERE user_id = ? AND purpose = ? AND used_at IS NULL",
    [userId, purpose],
  );
  const token = newToken();
  await conn.execute(
    "INSERT INTO email_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))",
    [userId, purpose, hashToken(token), TTL_SECONDS[purpose]],
  );
  return token;
}

// Call inside a transaction. FOR UPDATE locks the row, so two clicks can't both use one link.
// Returns the user id, or null when the link is invalid, used or expired.
export async function consumeEmailToken(conn, token, purpose) {
  if (!isTokenShape(token)) return null;
  const [rows] = await conn.execute(
    `SELECT id, user_id FROM email_tokens
     WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()
     FOR UPDATE`,
    [hashToken(token), purpose],
  );
  if (rows.length === 0) return null;
  await conn.execute("UPDATE email_tokens SET used_at = NOW() WHERE id = ?", [
    rows[0].id,
  ]);
  return rows[0].user_id;
}
