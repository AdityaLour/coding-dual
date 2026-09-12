import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

import pool from "./db/connection.js";
import authRoutes from "./routes/authRoutes.js";
import { setUpWebSocket } from "./websocket/socketServer.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(authRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
setUpWebSocket(wss);

async function startServer() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("DB Connected");

    server.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    console.error("database Connection failed", error);
    process.exit(1);
  }
}

startServer();
