import "dotenv/config";
import "./utils/checkEnv.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import http from "http";
import { WebSocketServer } from "ws";

import pool from "./db/connection.js";
import authRoutes from "./routes/authRoutes.js";
import { handleErrors } from "./middleware/errorHandler.js";
import { startSessionCleanup } from "./utils/session.js";
import { setUpWebSocket } from "./websocket/socketServer.js";
import { createUpgradeHandler } from "./websocket/upgrade.js";
import { resetQueue } from "./websocket/matchMaking.js";
import { MAX_PAYLOAD } from "./websocket/limits.js";

const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 0));
app.use(helmet());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(cors({ origin: process.env.APP_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(authRoutes);
app.use(handleErrors);

const server = http.createServer(app);
// noServer: we run the upgrade ourselves so we can refuse before a socket exists.
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
server.on("upgrade", createUpgradeHandler(wss));
setUpWebSocket(wss);

async function startServer() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("DB Connected");
    await resetQueue();
    startSessionCleanup();
    server.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    console.error("database Connection failed", error);
    process.exit(1);
  }
}

startServer();
