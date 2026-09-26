import bcrypt from "bcrypt";
import pool from "../db/connection.js";
import { withTransaction } from "../db/transaction.js";
import {
  checkPassword,
  normalizeEmail,
  parseUsername,
} from "../utils/validate.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from "../utils/session.js";
import { consumeEmailToken, issueEmailToken } from "../utils/emailTokens.js";
import {
  sendAlreadyRegisteredEmail,
  sendResetEmail,
  sendVerifyEmail,
} from "../utils/mailer.js";
import {
  findOrCreateGoogleUser,
  verifyGoogleToken,
} from "../utils/googleAuth.js";

const BCRYPT_COST = 12;
// Compared against when the account doesn't exist, so "no such user" costs the same time as
// "wrong password" and response timing can't reveal which emails are registered.
const DUMMY_HASH = await bcrypt.hash("boip-timing-dummy", BCRYPT_COST);

const CHECK_EMAIL = {
  message: "Check your email to finish creating your account.",
};
const EMAIL_SENT = {
  message: "If that email has an account, we've sent it a link.",
};
const BAD_LOGIN = { message: "Email or password is incorrect." };
const BAD_LINK = { message: "This link is invalid or has expired." };

async function getUser(db, userId) {
  const [rows] = await db.execute(
    "SELECT id, username, email FROM users WHERE id = ?",
    [userId],
  );
  return rows[0];
}

function usernameTaken(res) {
  return res.status(409).json({
    message: "That username is taken.",
    errors: { username: "That username is taken." },
  });
}

// POST /signup { email, username, password }
// Always "check your email" for a valid request, so signup can't be used to find accounts.
// Usernames are public, so a taken username is reported (409).
export async function signup(req, res) {
  const email = normalizeEmail(req.body?.email);
  const username = parseUsername(req.body?.username);
  const passwordError = checkPassword(req.body?.password);

  const errors = {};
  if (!email) errors.email = "Enter a valid email address.";
  if (username.error) errors.username = username.error;
  if (passwordError) errors.password = passwordError;
  if (Object.keys(errors).length > 0) {
    return res
      .status(400)
      .json({ message: "Check the highlighted fields.", errors });
  }

  // Hash before any lookup so the new-account and existing-account paths take the same time.
  const hash = await bcrypt.hash(req.body.password, BCRYPT_COST);

  const [taken] = await pool.execute("SELECT 1 FROM users WHERE username = ?", [
    username.value,
  ]);
  if (taken.length > 0) return usernameTaken(res);

  const [existing] = await pool.execute("SELECT 1 FROM users WHERE email = ?", [
    email,
  ]);
  if (existing.length > 0) {
    sendAlreadyRegisteredEmail(email);
    return res.status(202).json(CHECK_EMAIL);
  }

  try {
    const token = await withTransaction(async (conn) => {
      const [created] = await conn.execute(
        "INSERT INTO users (email, username) VALUES (?, ?)",
        [email, username.value],
      );
      await conn.execute(
        "INSERT INTO logins (user_id, provider, provider_user_id, password) VALUES (?, 'email', ?, ?)",
        [created.insertId, email, hash],
      );
      return issueEmailToken(conn, created.insertId, "verify");
    });
    sendVerifyEmail(email, token);
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") throw error;
    // Lost a race with a simultaneous signup.
    if (error.sqlMessage?.includes("username")) return usernameTaken(res);
    sendAlreadyRegisteredEmail(email);
  }
  return res.status(202).json(CHECK_EMAIL);
}

// POST /verify-email { token }  -> verifies and logs in.
export async function verifyEmail(req, res) {
  const result = await withTransaction(async (conn) => {
    const userId = await consumeEmailToken(conn, req.body?.token, "verify");
    if (!userId) return null;
    await conn.execute(
      "UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?",
      [userId],
    );
    const token = await createSession(userId, conn);
    return { token, user: await getUser(conn, userId) };
  });
  if (!result) return res.status(400).json(BAD_LINK);

  setSessionCookie(res, result.token);
  return res.status(200).json({ user: result.user });
}

// POST /resend-verification { email }  -> same answer whether or not the account exists.
export async function resendVerification(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (email) {
    const [rows] = await pool.execute(
      `SELECT u.id FROM users u
       JOIN logins l ON l.user_id = u.id AND l.provider = 'email'
       WHERE u.email = ? AND u.email_verified_at IS NULL`,
      [email],
    );
    if (rows.length > 0) {
      const token = await withTransaction((conn) =>
        issueEmailToken(conn, rows[0].id, "verify"),
      );
      sendVerifyEmail(email, token);
    }
  }
  return res.status(202).json(EMAIL_SENT);
}

// POST /login { email, password }
export async function login(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ message: "Enter your email and password." });
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.username, u.email, u.email_verified_at, l.password FROM users u
     JOIN logins l ON l.user_id = u.id AND l.provider = 'email'
     WHERE u.email = ?`,
    [email],
  );
  const account = rows[0];
  const matches = await bcrypt.compare(
    password,
    account?.password ?? DUMMY_HASH,
  );
  if (!account || !matches) return res.status(401).json(BAD_LOGIN);

  // Only reachable with the right password, so it reveals nothing to a guesser.
  if (!account.email_verified_at) {
    return res.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Confirm your email first. Check your inbox for the link.",
    });
  }

  const token = await createSession(account.id);
  setSessionCookie(res, token);
  return res.status(200).json({
    user: { id: account.id, username: account.username, email: account.email },
  });
}

// POST /google { idToken }  -> user.username is null for new accounts (pick one next).
export async function googleAuth(req, res) {
  const idToken = req.body?.idToken;
  if (
    typeof idToken !== "string" ||
    idToken.length === 0 ||
    idToken.length > 4096
  ) {
    return res.status(400).json({ message: "Missing Google sign-in token." });
  }

  // Only verification failures are the caller's fault (401); DB errors fall through to 500.
  let identity;
  try {
    identity = await verifyGoogleToken(idToken);
  } catch {
    return res
      .status(401)
      .json({ message: "Google sign-in failed. Try again." });
  }
  if (!identity.email || !identity.emailVerified) {
    return res
      .status(401)
      .json({ message: "Your Google account's email isn't verified." });
  }

  const { userId, isNew } = await findOrCreateGoogleUser(identity);
  const token = await createSession(userId);
  setSessionCookie(res, token);
  return res
    .status(isNew ? 201 : 200)
    .json({ user: await getUser(pool, userId) });
}

// POST /username { username }  (logged in, only while the username is still empty)
export async function setUsername(req, res) {
  const username = parseUsername(req.body?.username);
  if (username.error) {
    return res
      .status(400)
      .json({ message: username.error, errors: { username: username.error } });
  }
  if (req.user.username) {
    return res.status(409).json({ message: "You already have a username." });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE users SET username = ? WHERE id = ? AND username IS NULL",
      [username.value, req.user.id],
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ message: "You already have a username." });
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return usernameTaken(res);
    throw error;
  }
  return res
    .status(200)
    .json({ user: { ...req.user, username: username.value } });
}

// GET /session
export function checkSession(req, res) {
  return res.status(200).json({ user: req.user });
}

// POST /logout  -> always succeeds; the session row is deleted, not just the cookie.
export async function logout(req, res) {
  await deleteSession(req.cookies?.[SESSION_COOKIE]);
  clearSessionCookie(res);
  return res.status(204).end();
}

// POST /forgot-password { email }  -> same answer whether or not the account exists.
export async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (email) {
    const [rows] = await pool.execute("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length > 0) {
      const token = await withTransaction((conn) =>
        issueEmailToken(conn, rows[0].id, "reset"),
      );
      sendResetEmail(email, token);
    }
  }
  return res.status(202).json(EMAIL_SENT);
}

// POST /reset-password { token, password }
// Proves inbox ownership, so it also verifies the email. Ends every other session.
// If the email was unverified, the username came from an unproven owner, so it's cleared.
export async function resetPassword(req, res) {
  const passwordError = checkPassword(req.body?.password);
  if (passwordError) {
    return res
      .status(400)
      .json({ message: passwordError, errors: { password: passwordError } });
  }
  const hash = await bcrypt.hash(req.body.password, BCRYPT_COST);

  const result = await withTransaction(async (conn) => {
    const userId = await consumeEmailToken(conn, req.body?.token, "reset");
    if (!userId) return null;

    const [[user]] = await conn.execute(
      "SELECT email FROM users WHERE id = ? FOR UPDATE",
      [userId],
    );
    await conn.execute(
      "DELETE FROM logins WHERE user_id = ? AND provider = 'email'",
      [userId],
    );
    await conn.execute(
      "INSERT INTO logins (user_id, provider, provider_user_id, password) VALUES (?, 'email', ?, ?)",
      [userId, user.email, hash],
    );
    // MySQL applies SET left to right: username reads the OLD email_verified_at.
    await conn.execute(
      `UPDATE users SET username = IF(email_verified_at IS NULL, NULL, username),
       email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?`,
      [userId],
    );
    await conn.execute("DELETE FROM sessions WHERE user_id = ?", [userId]);
    await conn.execute(
      "DELETE FROM email_tokens WHERE user_id = ? AND used_at IS NULL",
      [userId],
    );

    const token = await createSession(userId, conn);
    return { token, user: await getUser(conn, userId) };
  });
  if (!result) return res.status(400).json(BAD_LINK);

  setSessionCookie(res, result.token);
  return res.status(200).json({ user: result.user });
}
