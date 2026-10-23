import { token, digest, hashPassword } from './family-security.mjs';
export function emailAddress(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value.trim())) throw Error('Email tidak valid.');
  return value.trim().toLowerCase();
}
export function emailReady(env) {
  return !!(env.RESEND_API_KEY && env.EMAIL_FROM && env.APP_ORIGIN === 'https://moneyplanner.darmintompel.my.id');
}
export async function sendAccountEmail(env, userId, email, purpose, now) {
  const secret = token();
  const q = (sql, ...v) => env.DB.prepare(sql).bind(...v);
  const hash = await digest(secret);
  await q(`INSERT INTO account_email_tokens VALUES(?,?,?,?) ON CONFLICT(user_id,purpose) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at`, hash, userId, purpose, now + (purpose === 'reset' ? 1800 : 86400)).run();
  // Fragment keeps the secret out of HTTP access logs and Referer headers.
  const link = `${env.APP_ORIGIN}/akun-email#${purpose}=${secret}`;
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject: purpose === 'reset' ? 'Reset password KantongKita' : 'Verifikasi email KantongKita',
        text: `${purpose === 'reset' ? 'Buat password baru (berlaku 30 menit)' : 'Verifikasi email Anda (berlaku 24 jam)'}:\n${link}\n\nTautan hanya dapat dipakai sekali. Jika bukan Anda yang meminta, abaikan email ini. Jangan bagikan tautan ini.` }),
      signal: AbortSignal.timeout(10000)
    });
  } catch { response = null; }
  if (!response?.ok) {
    await q('DELETE FROM account_email_tokens WHERE token_hash=?', hash).run();
    throw Error('Email belum berhasil dikirim. Coba lagi nanti.');
  }
}
export async function accountEmail(path, body, env, now) {
  const q = (sql, ...v) => env.DB.prepare(sql).bind(...v);
  const result = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
  if (path === 'email/request-reset') {
    if (!emailReady(env)) return result({ ok: false, error: 'Layanan email belum diaktifkan. Gunakan kode pemulihan.' }, 503);
    const email = emailAddress(body.email);
    const user = await q('SELECT user_id FROM account_emails WHERE email=? AND verified_at IS NOT NULL', email).first();
    if (user) {
      // Per-account cooldown also limits abuse from different IP addresses.
      const recent = await q("SELECT token_hash FROM account_email_tokens WHERE user_id=? AND purpose='reset' AND expires_at>?", user.user_id, now + 1740).first();
      if (!recent) { try { await sendAccountEmail(env, user.user_id, email, 'reset', now); } catch { /* Same public response, no account disclosure. */ } }
    }
    return result({ ok: true, message: 'Jika email terdaftar dan sudah diverifikasi, tautan reset akan dikirim. Periksa inbox dan spam.' });
  }
  if (!/^[a-f0-9]{64}$/.test(body.token || '')) return result({ ok: false, error: 'Tautan tidak valid atau kedaluwarsa.' }, 400);
  const hash = await digest(body.token), purpose = path === 'email/verify' ? 'verify' : 'reset';
  const record = await q('SELECT user_id FROM account_email_tokens WHERE token_hash=? AND purpose=? AND expires_at>?', hash, purpose, now).first();
  if (!record) return result({ ok: false, error: 'Tautan tidak valid atau kedaluwarsa.' }, 400);
  const condition = 'EXISTS(SELECT 1 FROM account_email_tokens WHERE token_hash=? AND purpose=? AND expires_at>?)';
  const statements = purpose === 'verify'
    ? [q(`UPDATE account_emails SET verified_at=? WHERE user_id=? AND ${condition}`, now, record.user_id, hash, purpose, now)]
    : [q(`UPDATE family_users SET password_hash=? WHERE id=? AND ${condition}`, await hashPassword(body.password), record.user_id, hash, purpose, now),
       q(`DELETE FROM family_sessions WHERE user_id=? AND ${condition}`, record.user_id, hash, purpose, now)];
  statements.push(q('DELETE FROM account_email_tokens WHERE token_hash=? AND purpose=?', hash, purpose));
  const changed = await env.DB.batch(statements);
  if (!changed[0].meta.changes) return result({ ok: false, error: 'Tautan sudah digunakan.' }, 409);
  return result({ ok: true });
}
