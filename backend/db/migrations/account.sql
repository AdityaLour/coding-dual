-- Account changes: devices list and email change. Run once:
--   mysql -u dual_app -p coding_duel < db/migrations/account.sql

-- Devices: which browser each session belongs to, and when it was last used.
-- Sessions that already exist keep NULL here; the first request each one makes fills it in.
ALTER TABLE sessions
  ADD COLUMN user_agent VARCHAR(255) NULL,
  ADD COLUMN last_seen_at DATETIME NULL;

-- Email change: a third kind of single-use link, which carries the address it will switch to.
ALTER TABLE email_tokens
  MODIFY COLUMN purpose ENUM('verify', 'reset', 'email_change') NOT NULL,
  ADD COLUMN new_email VARCHAR(254) NULL;
