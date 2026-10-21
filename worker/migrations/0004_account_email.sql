-- Separate table preserves legacy account INSERTs and existing accounts.
CREATE TABLE IF NOT EXISTS account_emails (
  user_id TEXT PRIMARY KEY REFERENCES family_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  verified_at INTEGER
);
CREATE TABLE IF NOT EXISTS account_email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
  expires_at INTEGER NOT NULL,
  UNIQUE(user_id,purpose)
);
