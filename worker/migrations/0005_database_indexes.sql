-- Additive only. Primary/unique keys already index book reads and family roles.
CREATE INDEX IF NOT EXISTS idx_family_sessions_user ON family_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_family_sessions_expiry ON family_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_account_email_tokens_expiry ON account_email_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_family_rate_limits_window ON family_rate_limits(window_start);
