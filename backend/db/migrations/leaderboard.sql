-- Leaderboard: a `rated` flag on duels (the same-pair daily cap) and an index for the weekly board.
-- For a dev database that keeps its data. Run once, from the backend folder:
--   mysql -u dual_app -p coding_duel < db/migrations/leaderboard.sql
-- (A fresh database should use db/schema.sql instead, which already has both.)
ALTER TABLE duels ADD COLUMN rated TINYINT(1) NOT NULL DEFAULT 1 AFTER end_reason;
ALTER TABLE duels ADD INDEX (status, ended_at);
