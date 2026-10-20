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
// Practice: one budget per signed-in user for everything under /api/practice, polling included.
// Polling is about 1 request a second while a submission is out, so this leaves room for that.
export const practiceLimit = limiter({
  windowMs: MINUTE,
  limit: 150,
  key: (req) => `user:${req.user.id}`,
});
// Leaderboard reads: one small budget per signed-in user.
export const leaderboardLimit = limiter({
  windowMs: MINUTE,
  limit: 60,
  key: (req) => `user:${req.user.id}`,
});
// Profile reads: opening tabs and paging through duels, one budget per signed-in user.
export const profileLimit = limiter({
  windowMs: MINUTE,
  limit: 120,
  key: (req) => `user:${req.user.id}`,
});
// Account changes. All per signed-in user, so one person can't be hammered from many addresses.
export const accountLimit = limiter({
  windowMs: MINUTE,
  limit: 60,
  key: (req) => `user:${req.user.id}`,
});
// Wrong or invalid attempts at anything that asks for the password: someone on a stolen session
// must not be able to guess it. Only failed requests count.
export const passwordAttemptLimit = limiter({
  windowMs: 15 * MINUTE,
  limit: 8,
  key: (req) => `user:${req.user.id}`,
  skipSuccessfulRequests: true,
});
// Anything that sends the email-change mails.
export const emailChangeLimit = limiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  key: (req) => `user:${req.user.id}`,
});
export const emailResendLimit = limiter({
  windowMs: 60 * MINUTE,
  limit: 4,
  key: (req) => `user:${req.user.id}`,
});
