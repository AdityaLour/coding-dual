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
import { voidStaleDuels } from "./websocket/duels.js";
import { loadBank } from "./problem/bank.js";
import { MAX_PAYLOAD } from "./websocket/limits.js";

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
// noServer: we run the upgrade ourselves so we can refuse before a socket exists.
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
server.on("upgrade", createUpgradeHandler(wss));
setUpWebSocket(wss);

// Each startup step names itself, so a failure says what broke instead of "database failed".
async function step(label, work) {
  try {
    return await work();
  } catch (error) {
    console.error(`Startup failed: ${label}`, error);
    process.exit(1);
  }
}

async function startServer() {
  await step("database connection", async () => (await pool.getConnection()).release());
  console.log("DB Connected");
  await step("redis queue reset", resetQueue);
  await step("stale duel cleanup", voidStaleDuels);
  console.log(`Loaded ${await step("problem bank", loadBank)} problems`);

  startSessionCleanup();
  server.listen(3000, () => console.log("Server is running on port 3000"));
}

startServer();
