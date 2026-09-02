import bcrypt from "bcrypt";
import pool from "../db/connection.js";
import { createSession } from "../utils/session.js";

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
