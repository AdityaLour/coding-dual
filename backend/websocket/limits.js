import { isIP } from "net";
import { ipKeyGenerator } from "express-rate-limit";

// Every WebSocket limit in one place.
export const MAX_PAYLOAD = 32 * 1024; // bytes per message; ws closes the socket above this
export const MAX_SOURCE_BYTES = 20 * 1024; // submitted code
export const MSG_LIMIT = 20; // messages per connection per MSG_WINDOW_MS
export const MSG_WINDOW_MS = 10_000;
export const SUBMIT_GAP_MS = 2_000; // at most one submitCode per this
export const MAX_STRIKES = 3; // rate-limit violations before the socket is closed
export const UPGRADE_LIMIT = 30; // handshakes per IP per UPGRADE_WINDOW_MS
export const UPGRADE_WINDOW_MS = 60_000;
export const MAX_PER_IP = 10; // open sockets per IP
export const MAX_SOCKETS = 500; // open sockets in total
export const HEARTBEAT_MS = 30_000;

// Fixed-window counter: true while `key` is within `limit` hits per `windowMs`.
export function hit(buckets, key, limit, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, (bucket = { count: 0, resetAt: now + windowMs }));
  }
  return ++bucket.count <= limit;
}

// The visitor's IP, read like Express's `trust proxy`: skip TRUST_PROXY hops from the right of
// X-Forwarded-For. With 0 it is the socket address and the header is ignored (can't be faked).
// IPv6 is grouped by subnet, as in the HTTP rate limits.
const HOPS = Number(process.env.TRUST_PROXY ?? 0);
export function clientIp(req) {
  const forwarded = (req.headers["x-forwarded-for"] ?? "")
    .split(",")
    .map((ip) => ip.trim());
  const chain = [...forwarded.filter(Boolean), req.socket.remoteAddress];
  const picked = chain[Math.max(chain.length - 1 - HOPS, 0)];
  // Junk in the header must never become a map key: fall back to the socket address.
  return ipKeyGenerator(
    isIP(picked) ? picked : (req.socket.remoteAddress ?? "unknown"),
  );
}
