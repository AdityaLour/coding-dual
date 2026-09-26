// Imported right after dotenv in app.js, so it runs before any module reads config.
// Fail fast: a missing value (e.g. APP_ORIGIN) must never silently weaken CORS or cookies.
const REQUIRED = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "GOOGLE_CLIENT_ID",
  "APP_ORIGIN",
  "SMTP_HOST",
  "SMTP_PORT",
  "MAIL_FROM",
];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}
