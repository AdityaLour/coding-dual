DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS duels;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS email_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS logins;
DROP TABLE IF EXISTS users;

CREATE TABLE users(
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,          -- stored trimmed + lowercased
    username VARCHAR(20) NULL UNIQUE,            -- NULL until a Google user picks one
    email_verified_at DATETIME NULL,             -- NULL = not verified
    rating INT NOT NULL DEFAULT 1200,            -- Elo; only ever read server-side
    duels_played INT NOT NULL DEFAULT 0,         -- rated duels; drives the K factor and "provisional"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_rating_range CHECK (rating BETWEEN 0 AND 4000)
);

CREATE TABLE logins(
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    provider ENUM('email', 'google') DEFAULT 'email' NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    UNIQUE (provider, provider_user_id)
);

-- Only a SHA-256 hash of the session token is stored; the raw token lives in the cookie.
CREATE TABLE sessions(
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX (expires_at)
);

-- Single-use links sent by email (verify address, reset password).
CREATE TABLE email_tokens(
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    purpose ENUM('verify', 'reset') NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problem bank. Loaded into memory at boot; hidden tests never leave the server.
CREATE TABLE problems(
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

CREATE TABLE test_cases(
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
CREATE TABLE duels(
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

CREATE TABLE submissions(
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
