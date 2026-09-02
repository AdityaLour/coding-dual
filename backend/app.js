import express from "express";

import pool from "./db/connection.js";
import { signup } from "./controllers/authController.js";

const app = express();
app.use(express.json());
app.post("/signup", signup);

async function startServer() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("DB Connected");

    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    console.error("database Connection failed", error);
    process.exit(1);
  }
}

startServer();
