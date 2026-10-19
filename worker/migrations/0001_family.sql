-- Additive only: legacy sync_store is intentionally preserved.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS families (
 id TEXT PRIMARY KEY,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS family_users (
 id TEXT PRIMARY KEY,
 family_id TEXT NOT NULL REFERENCES families(id),
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 recovery_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('owner','partner')),
 created_at INTEGER NOT NULL,
 UNIQUE(family_id, role)
);
CREATE TABLE IF NOT EXISTS family_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS family_invites (
 token_hash TEXT PRIMARY KEY,
 family_id TEXT NOT NULL UNIQUE REFERENCES families(id),
 expires_at INTEGER NOT NULL,
 used_at INTEGER
);
CREATE TABLE IF NOT EXISTS family_data (
 family_id TEXT PRIMARY KEY REFERENCES families(id),
 revision INTEGER NOT NULL DEFAULT 0,
 data TEXT NOT NULL,
 updated_by TEXT NOT NULL REFERENCES family_users(id),
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS family_rate_limits (
 key_hash TEXT PRIMARY KEY,
 window_start INTEGER NOT NULL,
 attempts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS family_activation (
 id INTEGER PRIMARY KEY CHECK(id = 1),
 family_id TEXT NOT NULL UNIQUE REFERENCES families(id)
);
