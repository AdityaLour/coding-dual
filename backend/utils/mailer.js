import nodemailer from "nodemailer";

// Dev: Mailpit (SMTP 1025, inbox at http://localhost:8025). Production: Resend's SMTP, same code.
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

// Fire and forget: the HTTP response never waits on SMTP, so response time doesn't reveal
// which path ran (and a mail outage doesn't break signup). Plain text only: no HTML to inject into.
function send(to, subject, text) {
  transport
    .sendMail({ from: process.env.MAIL_FROM, to, subject, text })
    .catch((error) => console.error("Email send failed:", error.message));
}

// Tokens go after "#": the fragment is never sent to any server, so links don't leak into logs.
function link(path, token) {
  return `${process.env.APP_ORIGIN}${path}${token ? `#token=${token}` : ""}`;
}

export function sendVerifyEmail(to, token) {
  send(
    to,
    "Confirm your Boip account",
    `Confirm your email to finish creating your Boip account:\n\n${link("/verify-email", token)}\n\n` +
      "This link works once and expires in 24 hours.\n" +
      "If you didn't sign up for Boip, ignore this email.",
  );
}

export function sendAlreadyRegisteredEmail(to) {
  send(
    to,
    "You already have a Boip account",
    "Someone tried to create a Boip account with this email, but one already exists.\n\n" +
      `Log in: ${link("/login")}\nForgot your password? Reset it: ${link("/forgot-password")}\n\n` +
      "If this wasn't you, you can ignore this email.",
  );
}

export function sendResetEmail(to, token) {
  send(
    to,
    "Reset your Boip password",
    `Choose a new password:\n\n${link("/reset-password", token)}\n\n` +
      "This link works once and expires in 30 minutes. Resetting logs out every device.\n" +
      "If you didn't ask for this, ignore this email; your password hasn't changed.",
  );
}
