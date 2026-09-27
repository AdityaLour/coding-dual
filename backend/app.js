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

const app = express();
// Behind Cloudflare Tunnel, set TRUST_PROXY=1 so req.ip (used by rate limits) is the visitor,
// not the tunnel. Off by default: trusting a proxy that isn't there lets clients fake their IP.
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 0));
app.use(helmet());
// API responses carry account data: never let a browser or proxy cache them.
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
const wss = new WebSocketServer({ server });
setUpWebSocket(wss);

async function startServer() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("DB Connected");

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
