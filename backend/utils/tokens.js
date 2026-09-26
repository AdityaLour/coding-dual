import crypto from "crypto";

// 32 random bytes as hex (64 chars). Used for session and email-link tokens.
export function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

// A fast hash is fine here: the token is already 256 bits of randomness, so it can't be guessed.
// (Passwords are low-entropy, which is why they need slow bcrypt instead.)
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isTokenShape(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
