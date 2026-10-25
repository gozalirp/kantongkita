const AVATARS = new Set(['arga','bima','danu','raka','yoga','alya','citra','dinda','naya','tara'].map(n => 'avatar:' + n));
const EMOJI = new Set(['🏠','💼','👦','👧','💰','🎓','🏢','🧑','👨‍👩‍👧','🐷','👤']);
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
// userId comes only from the verified cookie session, never the payload.
export async function accountProfiles(path, method, body, userId, env, now, validBook) {
  const q = (sql, ...values) => env.DB.prepare(sql).bind(...values);
  const fail = (error, status = 400) => json({ ok: false, error }, status);
  if (path === 'profiles' && method === 'GET') {
    const rows = await q('SELECT profile_id AS id,name,icon,color,revision,updated_at FROM account_profiles WHERE user_id=? ORDER BY profile_id', userId).all();
    return json({ ok: true, profiles: rows.results || [] });
  }
  const id = body.profileId;
  if (!ID.test(typeof id === 'string' ? id : '')) return fail('ID profil tidak valid');
  if (path === 'profiles/read' && method === 'POST') {
    const row = await q('SELECT profile_id AS id,name,icon,color,revision FROM account_profiles WHERE user_id=? AND profile_id=?', userId, id).first();
    if (!row) return fail('Profil tidak ditemukan', 404);
    // Read metadata and chunks in one transactional batch to avoid torn revisions.
    const result = await env.DB.batch([
      q('SELECT profile_id AS id,name,icon,color,revision FROM account_profiles WHERE user_id=? AND profile_id=?', userId, id),
      q('SELECT chunk FROM account_profile_parts WHERE user_id=? AND profile_id=? ORDER BY idx', userId, id)
    ]);
    const profile = result[0].results?.[0];
    if (!profile) return fail('Profil tidak ditemukan', 404);
    const text = (result[1].results || []).map(p => p.chunk).join('');
    return json({ ok: true, profile, book: text ? JSON.parse(text) : null });
  }
  if (path !== 'profiles/save' || method !== 'POST') return fail('Endpoint tidak ditemukan', 404);
  if (!Number.isSafeInteger(body.revision) || body.revision < 0) return fail('Revisi tidak valid');
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 24) return fail('Nama profil tidak valid');
  if (!AVATARS.has(body.icon) && !EMOJI.has(body.icon)) return fail('Avatar tidak valid');
  if (typeof body.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(body.color)) return fail('Warna tidak valid');
  const valid = validBook(body.book);
  if (valid !== true) return fail(typeof valid === 'string' ? valid : 'Buku tidak valid');
  // Send only public account preferences, never PIN hashes, Drive tokens or device settings.
  const preferences = body.preferences || {};
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences) || Object.keys(preferences).some(k => k !== 'monthlyIncome') ||
      (preferences.monthlyIncome !== undefined && (!Number.isSafeInteger(preferences.monthlyIncome) || preferences.monthlyIncome < 0))) return fail('Pengaturan tidak valid');
  const book = {};
  for (const key of ['wallets','categories','budgets','goals','subscriptions','transactions']) book[key] = body.book[key];
  book.settings = { monthlyIncome: preferences.monthlyIncome || 0 };
  const text = JSON.stringify(book);
  if (text.length > 450000) return fail('Buku profil terlalu besar', 413);
  const row = await q('SELECT revision FROM account_profiles WHERE user_id=? AND profile_id=?', userId, id).first();
  if (row && row.revision !== body.revision || !row && body.revision !== 0) return fail('Profil berubah. Muat ulang sebelum menyimpan.', 409);
  const guard = 'EXISTS(SELECT 1 FROM account_profiles WHERE user_id=? AND profile_id=? AND revision=?)';
  const statements = [q(`INSERT OR IGNORE INTO account_profiles SELECT ?,?,?,?,?,0,? WHERE (SELECT COUNT(*) FROM account_profiles WHERE user_id=?)<20`, userId, id, body.name.trim(), body.icon, body.color, now, userId)];
  statements.push(q('DELETE FROM account_profile_parts WHERE user_id=? AND profile_id=? AND ' + guard, userId, id, userId, id, body.revision));
  for (let i = 0; i < text.length; i += 90000) statements.push(q('INSERT INTO account_profile_parts SELECT ?,?,?,? WHERE ' + guard, userId, id, i / 90000, text.slice(i, i + 90000), userId, id, body.revision));
  statements.push(q('UPDATE account_profiles SET name=?,icon=?,color=?,revision=revision+1,updated_at=? WHERE user_id=? AND profile_id=? AND revision=?', body.name.trim(), body.icon, body.color, now, userId, id, body.revision));
  const result = await env.DB.batch(statements);
  if (!result[result.length - 1].meta.changes) return fail('Profil berubah atau batas 20 profil tercapai.', 409);
  return json({ ok: true, revision: body.revision + 1 });
}
