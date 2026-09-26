import { OAuth2Client } from "google-auth-library";
import { withTransaction } from "../db/transaction.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    sub: payload.sub,
    email:
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : null,
    emailVerified: payload.email_verified === true,
  };
}

// Only call with a Google-verified email. Returns { userId, isNew }.
// Linking rules:
//  - Google account already linked: sign in as that user.
//  - No user with this email: create one (email verified, username chosen next).
//  - Verified user with this email: link (both sides proved ownership).
//  - UNVERIFIED user with this email: "Google wins". Its password may have been set by someone
//    who doesn't own the inbox (pre-registration attack), so remove that login, its sessions and
//    pending links, and the username they picked.
async function linkOnce({ sub, email }) {
  return withTransaction(async (conn) => {
    const [linked] = await conn.execute(
      "SELECT user_id FROM logins WHERE provider = 'google' AND provider_user_id = ?",
      [sub],
    );
    if (linked.length > 0) return { userId: linked[0].user_id, isNew: false };

    const [users] = await conn.execute(
      "SELECT id, email_verified_at FROM users WHERE email = ? FOR UPDATE",
      [email],
    );

    let userId;
    let isNew = false;
    if (users.length === 0) {
      const [created] = await conn.execute(
        "INSERT INTO users (email, email_verified_at) VALUES (?, NOW())",
        [email],
      );
      userId = created.insertId;
      isNew = true;
    } else {
      userId = users[0].id;
      if (!users[0].email_verified_at) {
        await conn.execute(
          "DELETE FROM logins WHERE user_id = ? AND provider = 'email'",
          [userId],
        );
        await conn.execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
        await conn.execute("DELETE FROM email_tokens WHERE user_id = ?", [
          userId,
        ]);
        await conn.execute(
          "UPDATE users SET email_verified_at = NOW(), username = NULL WHERE id = ?",
          [userId],
        );
      }
    }

    await conn.execute(
      "INSERT INTO logins (user_id, provider, provider_user_id) VALUES (?, 'google', ?)",
      [userId, sub],
    );
    return { userId, isNew };
  });
}

// Two first-time sign-ins racing on the same email can collide; the retry sees the winner's rows.
export async function findOrCreateGoogleUser(identity) {
  try {
    return await linkOnce(identity);
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY" && error.code !== "ER_LOCK_DEADLOCK")
      throw error;
    return linkOnce(identity);
  }
}
