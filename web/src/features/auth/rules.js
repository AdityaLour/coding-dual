// Client-side checks mirror the server's, only to save a round trip. The server re-checks everything.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z0-9_-]{3,20}$/;

export const rules = {
  email: (v) =>
    !v.trim()
      ? "Enter your email address."
      : EMAIL.test(v.trim())
        ? null
        : "Enter an email like name@example.com.",
  password: (v) => (v ? null : "Enter your password."),
  newPassword: (v) =>
    !v
      ? "Choose a password."
      : v.length < 8
        ? "Use at least 8 characters."
        : new TextEncoder().encode(v).length > 72
          ? "That password is too long."
          : null,
  username: (v) =>
    !v.trim()
      ? "Choose a username."
      : USERNAME.test(v.trim().toLowerCase())
        ? null
        : "Use 3–20 characters: letters, numbers, _ or -.",
};
