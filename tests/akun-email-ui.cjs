/* ============================================================
   tests/akun-email-ui.cjs — halaman pemulihan akun di jsdom
   Memastikan mode #recover / #verify / #reset=<token> / biasa
   menampilkan kolom yang tepat dan menembak endpoint yang tepat.
   Tidak menyentuh jaringan nyata: fetch dipalsukan.
   Jalankan: node tests/akun-email-ui.cjs
   ============================================================ */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('public/akun-email.html', 'utf8').replace(/<script src="[^"]+"><\/script>/g, '');
const skrip = fs.readFileSync('public/js/akun-email.js', 'utf8');
const terbuka = [];

function buka(hash) {
  const dom = new JSDOM(html, { url: 'http://localhost/akun-email' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  terbuka.push(w);
  w.panggilan = [];
  w.balas = { ok: true, json: async () => ({ message: 'Selesai.' }) };
  w.fetch = async (url, options) => { w.panggilan.push({ url, body: JSON.parse(options.body) }); return w.balas; };
  w.eval(skrip);
  w.$ = id => w.document.getElementById(id);
  w.kirim = async () => {
    w.$('email-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    for (let i = 0; i < 50 && w.$('email-submit').disabled; i++) await new Promise(r => setTimeout(r, 5));
  };
  return w;
}
const tampak = (w, id) => !w.$(id).hidden && w.$(id).style.display !== 'none';

(async () => {
  // 1. Mode kode pemulihan
  const a = buka('#recover');
  assert(tampak(a, 'recovery-field'), 'kolom username + kode muncul di mode pemulihan');
  assert(a.$('recovery-user').required && a.$('recovery-code').required, 'username dan kode wajib diisi');
  assert(!tampak(a, 'email-field'), 'kolom email disembunyikan di mode pemulihan');
  assert.equal(a.$('email-address').required, false, 'email tidak lagi wajib');
  assert(tampak(a, 'password-field') && a.$('email-password').required, 'password baru wajib');
  assert.equal(a.$('email-title').textContent, 'Pulihkan dengan kode');
  assert(a.$('email-hint').textContent.includes('kode pemulihan'));
  assert.equal(a.$('email-submit').textContent.trim(), 'Simpan password baru');
  assert.equal(a.location.hash, '', 'hash dibersihkan dari address bar');
  a.$('recovery-user').value = 'dummy';
  a.$('recovery-code').value = 'KODE-123';
  a.$('email-password').value = 'password-baru-panjang';
  await a.kirim();
  assert.equal(a.panggilan.length, 1);
  assert.equal(a.panggilan[0].url, '/api/family/recover', 'memakai endpoint pemulihan');
  assert.equal(a.panggilan[0].body.username, 'dummy');
  assert.equal(a.panggilan[0].body.code, 'KODE-123');
  assert.equal(a.panggilan[0].body.password, 'password-baru-panjang');
  assert.equal(a.$('email-message').textContent, 'Selesai.');
  assert.equal(a.$('email-form').hidden, true, 'formulir ditutup setelah berhasil');

  // 2. Mode verifikasi email
  const b = buka('#verify=TOK123');
  assert.equal(b.$('email-title').textContent, 'Verifikasi email');
  assert.equal(b.$('email-submit').textContent.trim(), 'Verifikasi email saya');
  assert(!tampak(b, 'password-field'), 'tidak ada password di mode verifikasi');
  assert(!tampak(b, 'email-field'), 'email tidak diminta saat verifikasi (cukup token dari tautan)');
  await b.kirim();
  assert.equal(b.panggilan[0].url, '/api/family/email/verify');
  assert.equal(b.panggilan[0].body.token, 'TOK123', 'token dari hash ikut dikirim');

  // 3. Mode reset password
  const c = buka('#reset=TOK456');
  assert.equal(c.$('email-title').textContent, 'Buat password baru');
  assert(tampak(c, 'password-field') && c.$('email-password').required, 'password baru wajib');
  assert(!tampak(c, 'email-field'), 'email tidak diminta saat reset');
  await c.kirim();
  assert.equal(c.panggilan[0].url, '/api/family/email/reset');
  assert.equal(c.panggilan[0].body.token, 'TOK456');

  // 4. Mode biasa (minta tautan)
  const d = buka('');
  assert.equal(d.$('email-title').textContent, 'Lupa password?');
  assert.equal(d.$('email-submit').textContent.trim(), 'Kirim tautan reset');
  assert(tampak(d, 'email-field') && d.$('email-address').required, 'email wajib di mode biasa');
  assert(!tampak(d, 'password-field') && !tampak(d, 'recovery-field'), 'kolom lain tetap tersembunyi');
  d.$('email-address').value = ' orang@contoh.id ';
  await d.kirim();
  assert.equal(d.panggilan[0].url, '/api/family/email/request-reset');
  assert.equal(d.panggilan[0].body.email, 'orang@contoh.id', 'spasi email dipangkas');

  // 5. Galat server ditampilkan, tombol hidup lagi
  const e = buka('#recover');
  e.balas = { ok: false, status: 403, json: async () => ({ error: 'Kode pemulihan salah atau kedaluwarsa.' }) };
  e.$('recovery-user').value = 'dummy';
  e.$('recovery-code').value = 'salah';
  e.$('email-password').value = 'password-baru-panjang';
  await e.kirim();
  assert.equal(e.$('email-message').textContent, 'Kode pemulihan salah atau kedaluwarsa.');
  assert.equal(e.$('email-submit').disabled, false, 'tombol bisa dicoba lagi');
  assert.equal(e.$('email-form').hidden, false, 'formulir tetap terbuka saat gagal');

  terbuka.forEach(w => w.close());
  console.log('PASS: halaman pemulihan akun — mode recover/verify/reset/biasa, token dari hash, dan galat server.');
})().catch(error => { console.error(error); terbuka.forEach(w => w.close()); process.exit(1); });
