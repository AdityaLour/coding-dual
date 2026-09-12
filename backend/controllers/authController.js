import bcrypt from "bcrypt";
import pool from "../db/connection.js";
import { createSession } from "../utils/session.js";
import { verifyGoogleToken } from "../utils/googleAuth.js";

export async function signup(req, res) {
  const { email, password } = req.body;
  try {
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: "Please Enter all Credentials",
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        message: "Password length should be minimum 6 character long",
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute("INSERT INTO users(email) VALUES(?)", [
      email,
    ]);

    const userId = result.insertId;

    await pool.execute(
      "INSERT INTO logins (user_id, provider, provider_user_id, password) VALUES (?, ?, ?, ?)",
      [userId, "email", email, hash],
    );

    const { token, expiresAt } = await createSession(userId);

    return res
      .status(201)
      .json({ message: "Signup successful", token, expiresAt });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  try {
    if (!password?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Please Provide all the credentials",
      });
    }

    const [result] = await pool.execute(
      "SELECT user_id, password from logins WHERE provider = ? AND provider_user_id =?",
      ["email", email],
    );

    if (result.length === 0) {
      return res.status(401).json({
        message: "Either the account does not exist or credentials are invalid",
      });
    }

    const hashPass = result[0].password;
    const compare = await bcrypt.compare(password, hashPass);

    if (!compare) {
      return res.status(401).json({
        message: "Either the account does not exist or credentials are invalid",
      });
    }

    const userId = result[0].user_id;
    const { token, expiresAt } = await createSession(userId);

    return res
      .status(200)
      .json({ message: "Login successful", token, expiresAt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function checkSession(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    const [result] = await pool.execute(
      "SELECT  user_id, token ,expires_at FROM sessions WHERE token =?",
      [token],
    );

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid session" });
    }
    if (new Date(result[0].expires_at) < new Date()) {
      return res.status(401).json({ message: "Invalid session" });
    }

    return res
      .status(200)
      .json({ message: "Session valid", userId: result[0].user_id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function googleAuth(req, res) {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ message: "Missing Google ID token" });
  }

  // First try/catch: ONLY token verification. A failure here is the caller's
  // fault (bad/expired token), so it returns 401 — not a server error.
  let sub, email;
  try {
    ({ sub, email } = await verifyGoogleToken(idToken));
  } catch {
    return res.status(401).json({ message: "Invalid or expired Google token" });
  }

  // Second try/catch: everything that touches the database. A failure here
  // is a genuine server problem, so it returns 500.
  try {
    let userId;
    let isNewUser = false;

    const [result] = await pool.execute(
      "SELECT user_id FROM logins WHERE provider = ? AND provider_user_id = ?",
      ["google", sub],
    );

    if (result.length > 0) {
      userId = result[0].user_id;
    } else {
      const [existingUser] = await pool.execute(
        "SELECT id FROM users WHERE email = ?",
        [email],
      );

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
      } else {
        const [newUserResult] = await pool.execute(
          "INSERT INTO users(email) VALUES(?)",
          [email],
        );
        userId = newUserResult.insertId;
        isNewUser = true;
      }

      await pool.execute(
        "INSERT INTO logins(user_id, provider, provider_user_id) VALUES(?, ?, ?)",
        [userId, "google", sub],
      );
    }

    const { token, expiresAt } = await createSession(userId);

    return res.status(isNewUser ? 201 : 200).json({
      message: isNewUser ? "Account created" : "Signed in with Google",
      token,
      expiresAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
