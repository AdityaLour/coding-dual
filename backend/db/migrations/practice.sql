-- Practice mode (roadmap 5.1). For a dev database that already has the earlier tables and keeps its data.
-- Run once:  mysql -u root -p coding_duel < db/migrations/practice.sql
-- (A fresh database should use db/schema.sql instead, which does all of this.)
CREATE TABLE IF NOT EXISTS practice_submissions(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    problem_id INT NOT NULL,
    FOREIGN KEY (problem_id) REFERENCES problems(id),
    language_id INT NOT NULL,
    source TEXT NOT NULL,                        -- at most 20 KB (checked before judging)
    verdict VARCHAR(40) NOT NULL,                -- 'Judging' until the judge answers
    failed_test INT NULL,
    runtime_ms INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, problem_id, created_at),
    INDEX (user_id, created_at)
);
