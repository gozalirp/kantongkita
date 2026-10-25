-- Account-owned profiles are separate from device profiles and legacy personal books.
-- Nothing is uploaded, reassigned or deleted by this migration.
CREATE TABLE IF NOT EXISTS account_profiles (
  user_id TEXT NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, profile_id)
);
CREATE TABLE IF NOT EXISTS account_profile_parts (
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  chunk TEXT NOT NULL,
  PRIMARY KEY(user_id, profile_id, idx),
  FOREIGN KEY(user_id, profile_id) REFERENCES account_profiles(user_id, profile_id) ON DELETE CASCADE
);
