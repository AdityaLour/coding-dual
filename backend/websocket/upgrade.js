import { parseCookie } from "cookie";
import { SESSION_COOKIE, findSessionUser } from "../utils/session.js";
import {
  hit,
  clientIp,
  UPGRADE_LIMIT,
  UPGRADE_WINDOW_MS,
  MAX_PER_IP,
  MAX_SOCKETS,
} from "./limits.js";

// Sites allowed to open a socket (add staging/www here later). filter(Boolean) means an
// unset APP_ORIGIN yields an empty list, never one that matches a missing Origin header.
const ALLOWED_ORIGINS = [process.env.APP_ORIGIN].filter(Boolean);
const isAllowedOrigin = (origin) => ALLOWED_ORIGINS.includes(origin);

// Handshake attempts per IP, counted before the database is touched.
const attempts = new Map();
setInterval(() => {
  for (const [ip, bucket] of attempts)
    if (Date.now() >= bucket.resetAt) attempts.delete(ip);
}, 60_000).unref();

// Before any WebSocket exists a refusal is a plain HTTP response.
function reject(socket, status, text) {
  socket.write(
    `HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

export function createUpgradeHandler(wss) {
  return async (req, socket, head) => {
    socket.on("error", () => {}); // a mid-handshake drop would otherwise crash the process
    try {
      // Cheapest checks first, so floods never reach MySQL. A missing Origin is rejected too.
      if (!isAllowedOrigin(req.headers.origin))
        return reject(socket, 403, "Forbidden");
      const ip = clientIp(req);
      if (!hit(attempts, ip, UPGRADE_LIMIT, UPGRADE_WINDOW_MS))
        return reject(socket, 429, "Too Many Requests");
      if (wss.clients.size >= MAX_SOCKETS)
        return reject(socket, 503, "Service Unavailable");
      if ([...wss.clients].filter((ws) => ws.ip === ip).length >= MAX_PER_IP) {
        return reject(socket, 429, "Too Many Requests");
      }
      const token = parseCookie(req.headers.cookie ?? "")[SESSION_COOKIE];
      const user = await findSessionUser(token);
      if (!user) return reject(socket, 401, "Unauthorized");
      if (!user.username) return reject(socket, 403, "Forbidden"); // still has to pick a username
      if (socket.destroyed) return; // client left while we waited on MySQL
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.ip = ip;
        ws.token = token; // kept in memory only, for the heartbeat's session re-check
        wss.emit("connection", ws, req, user);
      });
    } catch (error) {
      console.error("WebSocket upgrade failed:", error);
      reject(socket, 500, "Internal Server Error");
    }
  };
}
