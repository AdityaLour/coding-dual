const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z0-9_-]{3,20}$/;
const RESERVED = new Set([
  "admin",
  "administrator",
  "boip",
  "system",
  "support",
  "root",
  "moderator",
  "mod",
  "staff",
  "help",
  "null",
  "undefined",
  "me",
  "you",
  "opponent",
  "rival",
]);

// Returns the normalised email, or null if it isn't a usable email string.
export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

// Returns an error message, or null when the password is acceptable. Passwords are never trimmed.
export function checkPassword(value) {
  if (typeof value !== "string" || value.length === 0)
    return "Enter a password.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (Buffer.byteLength(value, "utf8") > 72)
    return "That password is too long."; // bcrypt ignores bytes past 72
  return null;
}

// Returns { value } or { error }.
export function parseUsername(value) {
  if (typeof value !== "string") return { error: "Choose a username." };
  const username = value.trim().toLowerCase();
  if (!USERNAME.test(username)) {
    return { error: "Use 3–20 characters: letters, numbers, _ or -." };
  }
  if (RESERVED.has(username))
    return { error: "That username isn't available." };
  return { value: username };
}
