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

// ---------- account changes ----------

// "ada.codes@gmail.com" -> "a***@gmail.com": enough for the owner to recognise it, not enough to use.
export function maskEmail(email) {
  const [name, domain] = String(email).split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

// To the NEW address: the link that finishes the change.
export function sendEmailChangeLink(to, token) {
  send(
    to,
    "Confirm your new Boip email",
    `Confirm that this is your new email for Boip:\n\n${link("/confirm-email", token)}\n\n` +
      "This link works once and expires in 1 hour. Until you open it, your account keeps its current email.\n" +
      "If you didn't ask for this, ignore this email; nothing changes.",
  );
}

// To the OLD address, at the moment of the request: the chance to stop a change you didn't make.
export function sendEmailChangeNotice(to, newEmail) {
  send(
    to,
    "Someone asked to change your Boip email",
    `A request was made to change the email on your Boip account to ${maskEmail(newEmail)}.\n\n` +
      "Nothing has changed yet. If this was you, open the link we sent to the new address.\n" +
      `If it wasn't you, change your password now: ${link("/forgot-password")}`,
  );
}

// To the OLD address, once the change is done.
export function sendEmailChanged(to, newEmail) {
  send(
    to,
    "Your Boip email was changed",
    `The email on your Boip account is now ${maskEmail(newEmail)}. You can no longer log in with this address.\n\n` +
      "If this wasn't you, contact support right away.",
  );
}

// To an address someone tried to move an account to, when it already belongs to another account.
export function sendEmailTakenNotice(to) {
  send(
    to,
    "Someone tried to use your email on Boip",
    "Someone tried to switch another Boip account to this email address, but it already belongs to an account.\n\n" +
      `Nothing changed. Log in: ${link("/login")}\nIf this wasn't you, you can ignore this email.`,
  );
}

export function sendPasswordChangedNotice(to, wasSet) {
  send(
    to,
    wasSet ? "A password was set on your Boip account" : "Your Boip password was changed",
    `${wasSet ? "A password was added to" : "The password on"} your Boip account ${wasSet ? "so you can also log in with your email" : "was changed"}.\n\n` +
      "Your other devices were logged out.\n" +
      `If this wasn't you, reset your password now: ${link("/forgot-password")}`,
  );
}
