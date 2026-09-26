DROP TABLE IF EXISTS email_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS logins;
DROP TABLE IF EXISTS users;

CREATE TABLE users(
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,          -- stored trimmed + lowercased
    username VARCHAR(20) NULL UNIQUE,            -- NULL until a Google user picks one
    email_verified_at DATETIME NULL,             -- NULL = not verified
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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