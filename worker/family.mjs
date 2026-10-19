import { token, digest, username, hashPassword, verifyPassword, sameOrigin, sessionCookie } from './family-security.mjs';
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/* Pemeriksaan isi buku bersama. Mengembalikan true kalau sah, atau pesan galat.
   Tujuannya menolak data rusak/asing, bukan memaksa bentuk yang kaku. */
const KODE_RE = /^[A-Za-z0-9_-]{1,40}$/;
const TGL_RE = /^\d{4}-\d{2}-\d{2}$/;
function daftar(value, maks) {
  if (!Array.isArray(value)) return false;
  if (value.length > maks) return false;
  return value.every(function (x) { return x && typeof x === 'object' && !Array.isArray(x) && KODE_RE.test(String(x.id || '')); });
}
/* D1 membatasi satu pernyataan SQL (dan satu nilai teks) di kisaran 100 KB.
   Satu buku keluarga bisa jauh lebih besar dari itu, jadi isinya dipecah menjadi
   beberapa potongan dan digabung lagi saat dibaca. 90.000 karakter aman. */
const POTONG = 90000;
function pecah(teks) {
  const out = [];
  for (let i = 0; i < teks.length; i += POTONG) out.push(teks.slice(i, i + POTONG));
  return out.length ? out : [''];
}

function validBook(book) {
  if (!book || typeof book !== 'object' || Array.isArray(book)) return 'Data buku tidak valid';
  if (!daftar(book.wallets, 100)) return 'Daftar dompet tidak valid';
  if (!daftar(book.categories, 300)) return 'Daftar kategori tidak valid';
  if (!daftar(book.budgets, 300)) return 'Daftar anggaran tidak valid';
  if (!daftar(book.goals, 100)) return 'Daftar target tidak valid';
  if (!daftar(book.subscriptions, 200)) return 'Daftar langganan tidak valid';
  if (!daftar(book.transactions, 20000)) return 'Daftar transaksi tidak valid';
  for (const t of book.transactions) {
    if (!['in', 'out', 'move'].includes(t.type)) return 'Jenis transaksi tidak valid';
    if (!Number.isSafeInteger(t.amount) || t.amount <= 0) return 'Nominal transaksi tidak valid';
    if (!TGL_RE.test(String(t.date || ''))) return 'Tanggal transaksi tidak valid';
    if (typeof t.note === 'string' && t.note.length > 500) return 'Catatan transaksi terlalu panjang';
  }
  return true;
}
export async function family(request, env) {
  const path = new URL(request.url).pathname.replace('/api/family/', '');
  const now = Math.floor(Date.now() / 1000);
  const q = (sql, ...values) => env.DB.prepare(sql).bind(...values);
  const fail = (message, status = 400) => json({ ok: false, error: message }, status);
  if (!['GET','POST'].includes(request.method)) return fail('Metode tidak diizinkan', 405);
  if (request.method === 'POST' && !sameOrigin(request)) return fail('Origin tidak diizinkan', 403);
  let body = {};
  if (request.method === 'POST') {
    const text = await request.text();
    if (text.length > 500000) return fail('Permintaan terlalu besar', 413);
    try { body = JSON.parse(text); } catch { return fail('JSON tidak valid'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Objek diperlukan');
    const key = await digest(`${request.headers.get('CF-Connecting-IP') || 'local'}:${path}`);
    const count = await q(`INSERT INTO family_rate_limits(key_hash,window_start,attempts) VALUES(?,?,1)
      ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,
      window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END RETURNING attempts`, key, now, now-900, now-900).first();
    if (count.attempts > (['login','activate','join','recover'].includes(path) ? 10 : 120)) return fail('Terlalu banyak percobaan. Tunggu 15 menit.', 429);
  }
  try {
    if (['activate','join','login','recover'].includes(path) && request.method === 'POST') {
      const name = username(body.username);
      if (path === 'login') {
        const user = await q('SELECT * FROM family_users WHERE username=?', name).first();
        // Always perform password work, including unknown usernames.
        const dummy = `pbkdf2-sha256$600000$${'0'.repeat(32)}$${'0'.repeat(64)}`;
        if (!await verifyPassword(body.password, user?.password_hash || dummy) || !user) return fail('Username atau password salah', 401);
        const secret = token();
        await q('INSERT INTO family_sessions VALUES(?,?,?)', await digest(secret), user.id, now+604800).run();
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(secret) });
      }
      if (path === 'recover') {
        const user = await q('SELECT * FROM family_users WHERE username=?', name).first();
        if (!user || typeof body.code !== 'string' || await digest(body.code) !== user.recovery_hash) return fail('Username atau kode pemulihan salah', 401);
        const recovery = token();
        const hash = await hashPassword(body.password);
        const result = await env.DB.batch([
          q('UPDATE family_users SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?', hash, await digest(recovery), user.id, user.recovery_hash),
          q('DELETE FROM family_sessions WHERE user_id=?', user.id)
        ]);
        if (!result[0].meta.changes) return fail('Kode sudah digunakan', 409);
        return json({ ok: true, recovery });
      }
      let familyId, invitation;
      if (path === 'activate') {
        if (!env.FAMILY_ACTIVATION_HASH || typeof body.code !== 'string' || await digest(body.code) !== env.FAMILY_ACTIVATION_HASH) return fail('Kode aktivasi tidak valid', 403);
        if (await q('SELECT id FROM family_activation WHERE id=1').first()) return fail('Keluarga sudah diaktifkan', 409);
        familyId = crypto.randomUUID();
      } else {
        if (typeof body.code !== 'string') return fail('Undangan diperlukan');
        invitation = await q('SELECT * FROM family_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?', await digest(body.code), now).first();
        if (!invitation) return fail('Undangan tidak valid atau kedaluwarsa', 403);
        familyId = invitation.family_id;
      }
      const id = crypto.randomUUID(), recovery = token(), hash = await hashPassword(body.password);
      const statements = path === 'activate' ? [q('INSERT INTO families VALUES(?,?)', familyId, now), q('INSERT INTO family_activation VALUES(1,?)', familyId)] : [];
      if (path === 'join') {
        // Conditional insertion + unique partner role make concurrent redemption atomic.
        statements.push(q(`INSERT INTO family_users SELECT ?,family_id,?,?,?,'partner',? FROM family_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?`, id, name, hash, await digest(recovery), now, invitation.token_hash, now));
        statements.push(q('UPDATE family_invites SET used_at=? WHERE token_hash=? AND EXISTS(SELECT 1 FROM family_users WHERE id=?)', now, invitation.token_hash, id));
      } else statements.push(q("INSERT INTO family_users VALUES(?,?,?,?,?,'owner',?)", id, familyId, name, hash, await digest(recovery), now));
      const result = await env.DB.batch(statements);
      if (path === 'join' && !result[0].meta.changes) return fail('Undangan sudah digunakan', 409);
      return json({ ok: true, recovery });
    }
    const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-sd_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    const user = cookie && await q(`SELECT u.id,u.family_id,u.username,u.role FROM family_sessions s JOIN family_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`, await digest(cookie), now).first();
    if (!user) return fail('Silakan login', 401);
    if (path === 'me' && request.method === 'GET') return json({ ok: true, user, members: (await q('SELECT username,role FROM family_users WHERE family_id=?', user.family_id).all()).results });
    if (path === 'logout' && request.method === 'POST') {
      await q('DELETE FROM family_sessions WHERE token_hash=?', await digest(cookie)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(cookie, 0) });
    }
    if (path === 'invite' && request.method === 'POST') {
      if (user.role !== 'owner') return fail('Hanya pemilik keluarga', 403);
      if (await q("SELECT id FROM family_users WHERE family_id=? AND role='partner'", user.family_id).first()) return fail('Keluarga sudah berisi dua anggota', 409);
      const code = token();
      await q('INSERT INTO family_invites VALUES(?,?,?,NULL) ON CONFLICT(family_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=NULL', await digest(code), user.family_id, now+86400).run();
      return json({ ok: true, code });
    }
    /* Isi buku bersama: seluruh koleksi, bukan hanya transaksi.
       SEMUA perubahan masuk lewat 'save' dengan revision, sehingga dua orang
       yang menyimpan bersamaan tidak saling menimpa (yang kalah dapat 409). */
    if (path === 'data' && request.method === 'GET') {
      const row = await q('SELECT revision,data FROM family_data WHERE family_id=?', user.family_id).first();
      const parts = await q('SELECT chunk FROM family_data_parts WHERE family_id=? ORDER BY idx', user.family_id).all();
      let isi = null;
      if (parts.results && parts.results.length) {
        try { isi = JSON.parse(parts.results.map(function (p) { return p.chunk; }).join('')); } catch (e) { isi = null; }
      } else if (row) {
        // buku dari versi lama (satu baris)
        try { isi = JSON.parse(row.data); } catch (e) { isi = null; }
      }
      return json({ ok: true, revision: row?.revision || 0, data: isi || { transactions: [] } });
    }
    if (path === 'save' && request.method === 'POST') {
      const book = body.book;
      const valid = validBook(book);
      if (valid !== true) return fail(typeof valid === 'string' ? valid : 'Data buku tidak valid');
      const row = await q('SELECT revision,data FROM family_data WHERE family_id=?', user.family_id).first();
      if ((row?.revision || 0) !== body.revision) return fail('Data berubah. Muat ulang lalu periksa sebelum menyimpan lagi.', 409);
      // Stempel pencatat dipertahankan dari data lama; entri baru diberi user ini.
      const lama = new Map();
      if (row) {
        const parts = await q('SELECT chunk FROM family_data_parts WHERE family_id=? ORDER BY idx', user.family_id).all();
        let teksLama = null;
        if (parts.results && parts.results.length) teksLama = parts.results.map(function (p) { return p.chunk; }).join('');
        else teksLama = row.data;
        try {
          (JSON.parse(teksLama).transactions || []).forEach(function (t) { if (t && t.id) lama.set(t.id, t.by); });
        } catch (e) {}
      }
      book.transactions.forEach(function (t) {
        if (!t.by) t.by = lama.get(t.id) || user.username;
      });
      const teks = JSON.stringify(book);
      const potong = pecah(teks);
      const tulis = [q('DELETE FROM family_data_parts WHERE family_id=?', user.family_id)];
      potong.forEach(function (c, i) {
        tulis.push(q('INSERT INTO family_data_parts VALUES(?,?,?)', user.family_id, i, c));
      });
      if (row) {
        tulis.push(q('UPDATE family_data SET revision=revision+1,updated_by=?,updated_at=? WHERE family_id=? AND revision=?', user.id, now, user.family_id, body.revision));
      } else {
        tulis.push(q('INSERT OR IGNORE INTO family_data VALUES(?,0,?,?,?)', user.family_id, '{}', user.id, now));
        tulis.push(q('UPDATE family_data SET revision=1,updated_by=?,updated_at=? WHERE family_id=?', user.id, now, user.family_id));
      }
      const hasil = await env.DB.batch(tulis);
      const akhir = hasil[hasil.length - 1];
      if (!akhir.meta.changes) {
        // kalah cepat dengan anggota lain: jangan tinggalkan potongan setengah jadi
        await q('DELETE FROM family_data_parts WHERE family_id=?', user.family_id).run();
        return fail('Data berubah. Muat ulang sebelum mencoba lagi.', 409);
      }
      return json({ ok: true });
    }
    if (path === 'transaction' && request.method === 'POST') {
      const t = body.transaction;
      if (!Number.isSafeInteger(body.revision) || !t || !['in','out'].includes(t.type) || !Number.isSafeInteger(t.amount) || t.amount<=0 || typeof t.note !== 'string' || t.note.length>500 || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return fail('Transaksi tidak valid');
      const row = await q('SELECT revision,data FROM family_data WHERE family_id=?', user.family_id).first();
      if ((row?.revision || 0) !== body.revision) return fail('Data berubah. Muat ulang lalu periksa sebelum menyimpan lagi.', 409);
      const data = row ? JSON.parse(row.data) : { transactions: [] };
      data.transactions.push({ id: crypto.randomUUID(), type: t.type, amount: t.amount, note: t.note, date: t.date, by: user.username, createdAt: new Date().toISOString() });
      const result = row ? await q('UPDATE family_data SET data=?,revision=revision+1,updated_by=?,updated_at=? WHERE family_id=? AND revision=?', JSON.stringify(data), user.id, now, user.family_id, body.revision).run() : await q('INSERT OR IGNORE INTO family_data VALUES(?,1,?,?,?)', user.family_id, JSON.stringify(data), user.id, now).run();
      if (!result.meta.changes) return fail('Data berubah. Muat ulang sebelum mencoba lagi.', 409);
      return json({ ok: true });
    }
    return fail('Endpoint tidak ditemukan', 404);
  } catch (error) {
    if (String(error.message).includes('Username harus') || String(error.message).includes('Password harus')) return fail(error.message);
    return fail('Operasi gagal. Username mungkin sudah dipakai atau layanan belum siap.', 409);
  }
}
