import { token, digest, username, hashPassword, verifyPassword, sameOrigin, sessionCookie } from './family-security.mjs';
import { emailAddress, emailReady, sendAccountEmail, accountEmail } from './account-email.mjs';
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
    if (count.attempts > (['login','activate','join','link','recover','email/request-reset','email/verify','email/reset','email/resend'].includes(path) ? 10 : 120)) return fail('Terlalu banyak percobaan. Tunggu 15 menit.', 429);
  }
  try {
    if (path === 'email/config' && request.method === 'GET') return json({ ok: true, enabled: emailReady(env) });
    if (['email/request-reset','email/verify','email/reset'].includes(path) && request.method === 'POST') return await accountEmail(path, body, env, now);
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
          q('DELETE FROM family_sessions WHERE user_id=?', user.id),
          q('DELETE FROM account_email_tokens WHERE user_id=?', user.id)
        ]);
        if (!result[0].meta.changes) return fail('Kode sudah digunakan', 409);
        return json({ ok: true, recovery });
      }
      const email = body.email ? emailAddress(body.email) : null;
      if (emailReady(env) && !email) return fail('Email pemulihan wajib diisi.');
      if (email && !emailReady(env)) return fail('Layanan email belum diaktifkan.', 503);
      let familyId, invitation;
      if (path === 'activate') {
        /* Pendaftaran TERBUKA: siapa pun yang memegang alamat aplikasi boleh
           membuat akun, dan tiap akun mendapat buku catatannya sendiri.
           Dulu di sini ada penjaga "hanya satu keluarga" (family_activation)
           yang menutup pintu setelah akun pertama; penjaga itu dilepas atas
           permintaan pemilik aplikasi. Tabel family_activation sengaja TIDAK
           dihapus supaya akun lama (pemiliknya) tetap utuh dan bisa masuk. */
        familyId = crypto.randomUUID();
      } else {
        if (typeof body.code !== 'string') return fail('Undangan diperlukan');
        invitation = await q('SELECT * FROM family_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?', await digest(body.code), now).first();
        if (!invitation) return fail('Undangan tidak valid atau kedaluwarsa', 403);
        familyId = invitation.family_id;
      }
      const id = crypto.randomUUID(), recovery = token(), hash = await hashPassword(body.password);
      /* Tanpa baris family_activation: tabel itu bertanda UNIK, jadi kalau
         diisi di sini pendaftar kedua akan gagal. Penanda itu hanya dipakai
         buku lama, bukan penjaga pendaftaran lagi. */
      const statements = path === 'activate' ? [q('INSERT INTO families VALUES(?,?)', familyId, now)] : [];
      if (path === 'join') {
        // Conditional insertion + unique partner role make concurrent redemption atomic.
        statements.push(q(`INSERT INTO family_users SELECT ?,family_id,?,?,?,'partner',? FROM family_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?`, id, name, hash, await digest(recovery), now, invitation.token_hash, now));
        statements.push(q('UPDATE family_invites SET used_at=? WHERE token_hash=? AND EXISTS(SELECT 1 FROM family_users WHERE id=?)', now, invitation.token_hash, id));
      } else statements.push(q("INSERT INTO family_users VALUES(?,?,?,?,?,'owner',?)", id, familyId, name, hash, await digest(recovery), now));
      if (email) statements.push(q('INSERT INTO account_emails VALUES(?,?,NULL)', id, email));
      const result = await env.DB.batch(statements);
      if (path === 'join' && !result[0].meta.changes) return fail('Undangan sudah digunakan', 409);
      let emailSent = false;
      if (email) { try { await sendAccountEmail(env, id, email, 'verify', now); emailSent = true; } catch {} }
      return json({ ok: true, recovery, emailSent });
    }
    const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-sd_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    const user = cookie && await q(`SELECT u.id,u.family_id,u.username,u.role FROM family_sessions s JOIN family_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`, await digest(cookie), now).first();
    if (!user) return fail('Silakan login', 401);
    if (path === 'me' && request.method === 'GET') return json({ ok: true, user, members: (await q('SELECT username,role FROM family_users WHERE family_id=?', user.family_id).all()).results });
    if (path === 'logout' && request.method === 'POST') {
      await q('DELETE FROM family_sessions WHERE token_hash=?', await digest(cookie)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(cookie, 0) });
    }
    if (path === 'email/status' && request.method === 'GET') {
      const email = await q('SELECT email,verified_at FROM account_emails WHERE user_id=?', user.id).first();
      return json({ ok: true, email: email?.email || '', verified: !!email?.verified_at, enabled: emailReady(env) });
    }
    if (path === 'email/resend' && request.method === 'POST') {
      if (!emailReady(env)) return fail('Layanan email belum diaktifkan.', 503);
      const email = await q('SELECT email,verified_at FROM account_emails WHERE user_id=?', user.id).first();
      if (!email || email.verified_at) return fail('Tidak ada email yang perlu diverifikasi.');
      const recent = await q("SELECT token_hash FROM account_email_tokens WHERE user_id=? AND purpose='verify' AND expires_at>?", user.id, now+86340).first();
      if (recent) return fail('Tunggu satu menit sebelum mengirim ulang.', 429);
      await sendAccountEmail(env, user.id, email.email, 'verify', now);
      return json({ ok: true });
    }
    if (path === 'invite' && request.method === 'POST') {
      if (user.role !== 'owner') return fail('Hanya pemilik keluarga', 403);
      if (await q("SELECT id FROM family_users WHERE family_id=? AND role='partner'", user.family_id).first()) return fail('Keluarga sudah berisi dua anggota', 409);
      const code = token();
      await q('INSERT INTO family_invites VALUES(?,?,?,NULL) ON CONFLICT(family_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=NULL', await digest(code), user.family_id, now+86400).run();
      return json({ ok: true, code });
    }
    /* Memakai kode dari pasangan: akun INI pindah ke keluarga pengundang.
       Tanpa akun baru — berbeda dari 'join' yang mendaftarkan akun kedua.
       Ditolak kalau buku keluarga sendiri sudah berisi, karena buku itu jadi
       tidak terjangkau setelah pindah. */
    if (path === 'link' && request.method === 'POST') {
      if (typeof body.code !== 'string' || !body.code.trim()) return fail('Kode undangan diperlukan');
      if (user.role !== 'owner') return fail('Akun ini sudah tergabung sebagai anggota keluarga lain', 409);
      const invitation = await q('SELECT * FROM family_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?', await digest(body.code.trim()), now).first();
      if (!invitation) return fail('Kode undangan tidak valid atau kedaluwarsa', 403);
      if (invitation.family_id === user.family_id) return fail('Itu kode dari keluarga kamu sendiri', 409);
      const anggota = await q('SELECT COUNT(*) AS n FROM family_users WHERE family_id=?', invitation.family_id).first();
      if ((anggota?.n || 0) >= 2) return fail('Keluarga tujuan sudah berisi dua anggota', 409);
      const parts = await q('SELECT chunk FROM family_data_parts WHERE family_id=? ORDER BY idx', user.family_id).all();
      const baris = await q('SELECT data FROM family_data WHERE family_id=?', user.family_id).first();
      let buku = null;
      try {
        if (parts.results && parts.results.length) buku = JSON.parse(parts.results.map((p) => p.chunk).join(''));
        else if (baris) buku = JSON.parse(baris.data);
      } catch { buku = null; }
      const isi = buku && ['wallets', 'categories', 'transactions', 'budgets', 'goals', 'subscriptions'].some((k) => (buku[k] || []).length);
      if (isi) return fail('Akun ini sudah punya catatan bersama sendiri. Minta pasangan memakai kode dari akun ini supaya catatan tidak hilang.', 409);
      const hasil = await env.DB.batch([
        q("UPDATE family_users SET family_id=?, role='partner' WHERE id=? AND role='owner' AND family_id=?", invitation.family_id, user.id, user.family_id),
        q('UPDATE family_invites SET used_at=? WHERE token_hash=? AND EXISTS(SELECT 1 FROM family_users WHERE id=? AND family_id=?)', now, invitation.token_hash, user.id, invitation.family_id),
        // Kode lama milik keluarga yang ditinggalkan ikut dibuang supaya tidak bisa dipakai masuk ke keluarga kosong.
        q('DELETE FROM family_invites WHERE family_id=?', user.family_id)
      ]);
      if (!hasil[0].meta.changes) return fail('Tidak bisa menggabungkan sekarang. Coba lagi.', 409);
      return json({ ok: true });
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
      if (!Number.isSafeInteger(body.revision) || body.revision < 0) return fail('Revisi tidak valid');
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
      // Semua perubahan potongan dijaga revisi DI DALAM batch atomik.
      // Penulis yang kalah tidak boleh menghapus/menulis potongan apa pun.
      const tulis = [q('INSERT OR IGNORE INTO family_data VALUES(?,0,?,?,?)', user.family_id, '{}', user.id, now)];
      const guard = 'EXISTS(SELECT 1 FROM family_data WHERE family_id=? AND revision=?)';
      tulis.push(q('DELETE FROM family_data_parts WHERE family_id=? AND ' + guard, user.family_id, user.family_id, body.revision));
      potong.forEach(function (c, i) {
        tulis.push(q('INSERT INTO family_data_parts SELECT ?,?,? WHERE ' + guard, user.family_id, i, c, user.family_id, body.revision));
      });
      tulis.push(q('UPDATE family_data SET revision=revision+1,updated_by=?,updated_at=? WHERE family_id=? AND revision=?', user.id, now, user.family_id, body.revision));
      const hasil = await env.DB.batch(tulis);
      if (!hasil[hasil.length - 1].meta.changes) return fail('Data berubah. Muat ulang sebelum mencoba lagi.', 409);
      return json({ ok: true });
    }
    /* Buku PRIBADI per akun. Kuncinya user.id, bukan family_id: pasangan dalam
       satu keluarga tidak bisa membaca atau menulis isi ini. Pola potong dan
       revisi sama dengan buku bersama supaya perilaku konflik seragam. */
    if (path === 'personal/data' && request.method === 'GET') {
      const row = await q('SELECT revision FROM personal_data WHERE user_id=?', user.id).first();
      const parts = await q('SELECT chunk FROM personal_data_parts WHERE user_id=? ORDER BY idx', user.id).all();
      let isi = null;
      if (parts.results && parts.results.length) {
        try { isi = JSON.parse(parts.results.map(function (p) { return p.chunk; }).join('')); } catch (e) { isi = null; }
      }
      return json({ ok: true, revision: row?.revision || 0, data: isi });
    }
    if (path === 'personal/save' && request.method === 'POST') {
      const book = body.book;
      const valid = validBook(book);
      if (valid !== true) return fail(typeof valid === 'string' ? valid : 'Data buku tidak valid');
      if (!Number.isSafeInteger(body.revision) || body.revision < 0) return fail('Revisi tidak valid');
      const row = await q('SELECT revision FROM personal_data WHERE user_id=?', user.id).first();
      if ((row?.revision || 0) !== body.revision) return fail('Data berubah. Muat ulang sebelum menyimpan lagi.', 409);
      const potong = pecah(JSON.stringify(book));
      const tulis = [q('INSERT OR IGNORE INTO personal_data VALUES(?,0,?)', user.id, now)];
      const guard = 'EXISTS(SELECT 1 FROM personal_data WHERE user_id=? AND revision=?)';
      tulis.push(q('DELETE FROM personal_data_parts WHERE user_id=? AND ' + guard, user.id, user.id, body.revision));
      potong.forEach(function (c, i) {
        tulis.push(q('INSERT INTO personal_data_parts SELECT ?,?,? WHERE ' + guard, user.id, i, c, user.id, body.revision));
      });
      tulis.push(q('UPDATE personal_data SET revision=revision+1,updated_at=? WHERE user_id=? AND revision=?', now, user.id, body.revision));
      const hasil = await env.DB.batch(tulis);
      if (!hasil[hasil.length - 1].meta.changes) return fail('Data berubah. Muat ulang sebelum mencoba lagi.', 409);
      return json({ ok: true, revision: body.revision + 1 });
    }
    if (path === 'transaction' && request.method === 'POST') {
      return fail('Jalur transaksi lama dinonaktifkan. Muat ulang aplikasi dan simpan lewat buku terbaru.', 410);
    }
    return fail('Endpoint tidak ditemukan', 404);
  } catch (error) {
    if (String(error.message).includes('Username harus') || String(error.message).includes('Password harus') || String(error.message).includes('Email tidak valid')) return fail(error.message);
    return fail('Operasi gagal. Username mungkin sudah dipakai atau layanan belum siap.', 409);
  }
}
