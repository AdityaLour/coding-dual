import bcrypt from "bcrypt";
import pool from "../db/connection.js";
import { createSession } from "../utils/session.js";

export async function signup(req, res) {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
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
