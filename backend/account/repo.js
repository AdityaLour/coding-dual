import pool from "../db/connection.js";
import { withTransaction } from "../db/transaction.js";
import { claimEmailToken, issueEmailToken } from "../utils/emailTokens.js";

const num = (value) => Number(value ?? 0);

// Everything the account changes read and write. Each method that changes more than one table is one
// transaction, so a change either happens completely or not at all.
export const repo = {
  // How this person signs in. `hash` is the password hash, or null when they have no password.
  async loginInfo(userId) {
    const [[row]] = await pool.execute(
      `SELECT u.email, u.email_verified_at IS NOT NULL AS verified,
              (SELECT l.password FROM logins l WHERE l.user_id = u.id AND l.provider = 'email') AS hash,
              EXISTS(SELECT 1 FROM logins l WHERE l.user_id = u.id AND l.provider = 'google') AS google
         FROM users u WHERE u.id = ?`,
      [userId],
    );
    return row ? { email: row.email, verified: Boolean(row.verified), hash: row.hash ?? null, google: Boolean(row.google) } : null;
  },

  async emailInUse(email, exceptUserId) {
    const [rows] = await pool.execute("SELECT 1 FROM users WHERE email = ? AND id <> ?", [email, exceptUserId]);
    return rows.length > 0;
  },

  // Sets the password and signs every other device out, in one go. With `oldHash` it only goes through
  // if the password is still the one that was checked (two changes at once can't both win); without it,
  // the person had no password yet and gets one. Returns the number of devices signed out, or null if
  // the password changed under us.
  async setPassword(userId, { email, hash, oldHash, keepHash }) {
    return withTransaction(async (conn) => {
      if (oldHash) {
        const [done] = await conn.execute(
          "UPDATE logins SET password = ? WHERE user_id = ? AND provider = 'email' AND password = ?",
          [hash, userId, oldHash],
        );
        if (done.affectedRows === 0) return null;
      } else {
        try {
          await conn.execute(
            "INSERT INTO logins (user_id, provider, provider_user_id, password) VALUES (?, 'email', ?, ?)",
            [userId, email, hash],
          );
        } catch (error) {
          if (error.code === "ER_DUP_ENTRY") return null;
          throw error;
        }
      }
      const [gone] = await conn.execute("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", [userId, keepHash]);
      // A reset link or email change that was waiting must not survive a password change.
      await conn.execute(
        "DELETE FROM email_tokens WHERE user_id = ? AND purpose IN ('reset', 'email_change') AND used_at IS NULL",
        [userId],
      );
      return gone.affectedRows;
    });
  },

  // Starts (or restarts) an email change; the older waiting link dies. Returns the new link's token.
  startEmailChange(userId, newEmail) {
    return withTransaction((conn) => issueEmailToken(conn, userId, "email_change", newEmail));
  },

  // The change waiting for its link, with how long ago the link was sent, or null.
  async pendingEmailChange(userId) {
    const [rows] = await pool.execute(
      `SELECT new_email AS newEmail, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age
         FROM email_tokens
        WHERE user_id = ? AND purpose = 'email_change' AND used_at IS NULL AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1`,
      [userId],
    );
    return rows[0] ? { newEmail: rows[0].newEmail, age: num(rows[0].age) } : null;
  },

  async cancelEmailChange(userId) {
    await pool.execute("DELETE FROM email_tokens WHERE user_id = ? AND purpose = 'email_change' AND used_at IS NULL", [userId]);
  },

  // Opens the link: switches the email, marks it verified, signs out every other device and kills every
  // other waiting link. Returns { oldEmail, newEmail }, or null for a bad, used or expired link.
  // Throws ER_DUP_ENTRY if someone else took the address meanwhile (and then nothing has changed).
  confirmEmailChange(token, keepHash) {
    return withTransaction(async (conn) => {
      const claimed = await claimEmailToken(conn, token, "email_change");
      if (!claimed?.newEmail) return null;
      const { userId, newEmail } = claimed;
      const [[user]] = await conn.execute("SELECT email FROM users WHERE id = ? FOR UPDATE", [userId]);
      await conn.execute("UPDATE users SET email = ?, email_verified_at = NOW() WHERE id = ?", [newEmail, userId]);
      // Email logins keep the address in provider_user_id too.
      await conn.execute("UPDATE logins SET provider_user_id = ? WHERE user_id = ? AND provider = 'email'", [newEmail, userId]);
      await conn.execute("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", [userId, keepHash]);
      await conn.execute("DELETE FROM email_tokens WHERE user_id = ? AND used_at IS NULL", [userId]);
      return { oldEmail: user.email, newEmail };
    });
  },

  // Signed-in devices, newest activity first. Each row is one session.
  async sessions(userId) {
    const [rows] = await pool.execute(
      `SELECT id, token_hash AS tokenHash, user_agent AS userAgent,
              UNIX_TIMESTAMP(created_at) * 1000 AS createdAt, UNIX_TIMESTAMP(last_seen_at) * 1000 AS lastSeenAt
         FROM sessions WHERE user_id = ? AND expires_at > NOW()
        ORDER BY COALESCE(last_seen_at, created_at) DESC, id DESC`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      tokenHash: r.tokenHash,
      userAgent: r.userAgent,
      createdAt: num(r.createdAt),
      lastSeenAt: r.lastSeenAt === null ? null : num(r.lastSeenAt),
    }));
  },

  // Signs one device out, but only if it is this person's and not the one they are using.
  // Returns "gone" (nothing there, including someone else's id: same answer, so ids can't be probed),
  // "current" (refused), or "signed-out".
  async deleteSession(userId, id, keepHash) {
    const [rows] = await pool.execute("SELECT token_hash AS tokenHash FROM sessions WHERE id = ? AND user_id = ?", [id, userId]);
    if (rows.length === 0) return "gone";
    if (rows[0].tokenHash === keepHash) return "current";
    await pool.execute("DELETE FROM sessions WHERE id = ? AND user_id = ? AND token_hash <> ?", [id, userId, keepHash]);
    return "signed-out";
  },

  async deleteOtherSessions(userId, keepHash) {
    const [done] = await pool.execute("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", [userId, keepHash]);
    return done.affectedRows;
  },
};
