-- Daily challenge (roadmap 5.4). For a dev database that already has the earlier tables and keeps its data.
-- Run once:  mysql -u root -p coding_duel < db/migrations/daily.sql
-- (A fresh database should use db/schema.sql instead, which does all of this.)
CREATE TABLE IF NOT EXISTS daily_problems(
    day INT PRIMARY KEY,                         -- IST days since 1970-01-01 (see daily/days.js)
    problem_id INT NOT NULL,
    FOREIGN KEY (problem_id) REFERENCES problems(id)
);
