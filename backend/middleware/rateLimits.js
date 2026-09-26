import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { normalizeEmail } from "../utils/validate.js";

// In-memory counters: fine for one server. Behind Cloudflare, set "trust proxy" first (see docs),
// otherwise every visitor shares one IP.
const MINUTE = 60 * 1000;
const TOO_MANY = {
  message: "Too many attempts. Wait a few minutes and try again.",
};

function limiter({ windowMs, limit, key, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator: key,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json(TOO_MANY),
  });
}

const byIp = (req) => ipKeyGenerator(req.ip);
const byEmail = (req) =>
  `email:${normalizeEmail(req.body?.email) ?? "invalid"}`;

export const authLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 300,
  key: byIp,
});
// Failed logins only; per IP (guessing many accounts) and per email (guessing one account).
export const loginIpLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  key: byIp,
  skipSuccessfulRequests: true,
});
export const loginEmailLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  key: byEmail,
  skipSuccessfulRequests: true,
});
export const signupLimit = limiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  key: byIp,
});
// Anything that sends an email: stops inbox spamming and enumeration by volume.
export const emailIpLimit = limiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  key: byIp,
});
export const emailAddressLimit = limiter({
  windowMs: 60 * MINUTE,
  limit: 3,
  key: byEmail,
});
export const linkLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  key: byIp,
});
export const googleLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  key: byIp,
});
export const usernameLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  key: byIp,
});
