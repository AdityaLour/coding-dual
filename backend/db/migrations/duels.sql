-- Duel system (roadmap 4.2). For a dev database that already has the earlier tables and keeps its data.
-- Run once:  mysql -u root -p coding_duel < db/migrations/duels.sql
-- (A fresh database should use db/schema.sql instead, which does all of this.)
ALTER TABLE users ADD COLUMN duels_played INT NOT NULL DEFAULT 0 AFTER rating;

-- Problem bank. Loaded into memory at boot; hidden tests never leave the server.
CREATE TABLE IF NOT EXISTS problems(
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(60) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    statement MEDIUMTEXT NOT NULL,               -- markdown shown to players
    rating INT NOT NULL,                         -- difficulty on the Elo scale
    time_limit_ms INT NOT NULL DEFAULT 2000,
    memory_limit_kb INT NOT NULL DEFAULT 256000,
    duel_minutes INT NOT NULL DEFAULT 15,
    tags VARCHAR(200) NOT NULL DEFAULT '',
    active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS test_cases(
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT NOT NULL,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    position INT NOT NULL,
    is_sample TINYINT(1) NOT NULL DEFAULT 0,     -- samples are shown to players, the rest never
    input MEDIUMTEXT NOT NULL,
    expected MEDIUMTEXT NOT NULL,
    UNIQUE (problem_id, position)
);

-- One row per duel, written when it starts and settled when it ends.
-- draw = status 'finished' with winner_id NULL; 'void' = never counted (server restart, both players gone).
CREATE TABLE IF NOT EXISTS duels(
    id CHAR(36) PRIMARY KEY,
    problem_id INT NOT NULL,
    FOREIGN KEY (problem_id) REFERENCES problems(id),
    player_a INT NOT NULL,
    player_b INT NOT NULL,
    FOREIGN KEY (player_a) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_b) REFERENCES users(id) ON DELETE CASCADE,
    status ENUM('active', 'finished', 'void') NOT NULL DEFAULT 'active',
    winner_id INT NULL,
    end_reason ENUM('solved', 'timeout', 'forfeit') NULL,
    rating_a_before INT NOT NULL,
    rating_b_before INT NOT NULL,
    rating_a_after INT NULL,
    rating_b_after INT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    INDEX (player_a, started_at),
    INDEX (player_b, started_at)
);

CREATE TABLE IF NOT EXISTS submissions(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    duel_id CHAR(36) NOT NULL,
    FOREIGN KEY (duel_id) REFERENCES duels(id) ON DELETE CASCADE,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    language_id INT NOT NULL,
    source TEXT NOT NULL,                        -- at most 20 KB (checked before judging)
    verdict VARCHAR(40) NOT NULL,
    failed_test INT NULL,
    runtime_ms INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (duel_id)
);
