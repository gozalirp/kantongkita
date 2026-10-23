// Bounded retention: expired authentication material only, never books/accounts/families.
export async function maintenance(env, now = Math.floor(Date.now() / 1000)) {
  return env.DB.batch([
    env.DB.prepare('DELETE FROM family_sessions WHERE token_hash IN (SELECT token_hash FROM family_sessions WHERE expires_at < ? ORDER BY expires_at LIMIT 1000)').bind(now - 86400),
    env.DB.prepare('DELETE FROM account_email_tokens WHERE token_hash IN (SELECT token_hash FROM account_email_tokens WHERE expires_at < ? ORDER BY expires_at LIMIT 1000)').bind(now - 86400),
    env.DB.prepare('DELETE FROM family_rate_limits WHERE key_hash IN (SELECT key_hash FROM family_rate_limits WHERE window_start < ? ORDER BY window_start LIMIT 1000)').bind(now - 7 * 86400)
  ]);
}
