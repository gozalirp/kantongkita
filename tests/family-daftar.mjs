/* Uji pendaftaran TERBUKA: dua akun berbeda sama-sama bisa daftar, masing-masing
   dapat buku sendiri, dan isinya tidak saling terlihat.
   Jalankan dengan server lokal hidup:
     UJI_BASE=http://127.0.0.1:8799 node tests/family-daftar.mjs
   Sengaja menolak berjalan ke server non-lokal, supaya tidak membuat akun
   sungguhan di produksi. */
import assert from 'node:assert';

const B = process.env.UJI_BASE || 'http://127.0.0.1:8799';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(B)) {
  console.error('Uji ini hanya untuk server lokal, bukan ' + B);
  process.exit(1);
}

let lulus = 0, gagal = 0;
const cek = (nama, syarat, info) => {
  if (syarat) { lulus++; console.log('  OK   ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + (info !== undefined ? ' → ' + JSON.stringify(info) : '')); }
};

async function panggil(path, opsi = {}) {
  const r = await fetch(B + '/api/family/' + path, {
    method: opsi.method || 'GET',
    headers: Object.assign({ 'Content-Type': 'application/json', Origin: B }, opsi.cookie ? { Cookie: opsi.cookie } : {}),
    body: opsi.body ? JSON.stringify(opsi.body) : undefined
  });
  const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  return { status: r.status, body: await r.json().catch(() => ({})), cookie };
}

const acak = () => Math.random().toString(36).slice(2, 8);
const buku = (catatan) => ({
  wallets: [{ id: 'w_a', name: 'Dompet', type: 'cash', initial: 50000 }],
  categories: [{ id: 'c_a', name: 'Makan', type: 'out' }],
  transactions: [{ id: 't_a1', type: 'out', amount: 9000, date: '2026-10-21', note: catatan, walletId: 'w_a', categoryId: 'c_a' }],
  budgets: [], goals: [], subscriptions: []
});

(async () => {
  const PASS = 'rahasia-panjang-123';
  const namaA = 'daftar_a_' + acak();
  const namaB = 'daftar_b_' + acak();

  console.log('== pendaftaran terbuka ==');

  const a = await panggil('activate', { method: 'POST', body: { username: namaA, password: PASS } });
  cek('akun A bisa daftar', a.status === 200 && a.body.ok === true, a);
  cek('kode pemulihan A berupa 64 hex', /^[a-f0-9]{64}$/.test(a.body.recovery || ''), a.body.recovery);

  const b = await panggil('activate', { method: 'POST', body: { username: namaB, password: PASS } });
  cek('akun B juga bisa daftar (bukan lagi satu keluarga)', b.status === 200 && b.body.ok === true, b);
  cek('kode pemulihan B berbeda dari A', b.body.recovery && b.body.recovery !== a.body.recovery);

  const sama = await panggil('activate', { method: 'POST', body: { username: namaA, password: PASS } });
  cek('username yang sudah dipakai ditolak', sama.status !== 200 && sama.body.ok === false, sama);

  const pendek = await panggil('activate', { method: 'POST', body: { username: 'daftar_c_' + acak(), password: 'pendek' } });
  cek('password kurang dari 12 karakter ditolak', pendek.status === 400, pendek);

  console.log('== tiap akun dapat buku sendiri ==');

  const masukA = await panggil('login', { method: 'POST', body: { username: namaA, password: PASS } });
  const masukB = await panggil('login', { method: 'POST', body: { username: namaB, password: PASS } });
  cek('akun A bisa masuk', masukA.status === 200, masukA);
  cek('akun B bisa masuk', masukB.status === 200, masukB);

  const meA = await panggil('me', { cookie: masukA.cookie });
  const meB = await panggil('me', { cookie: masukB.cookie });
  cek('A dan B punya keluarga berbeda', meA.body.user.family_id !== meB.body.user.family_id,
    { a: meA.body.user.family_id, b: meB.body.user.family_id });
  cek('A dan B masing-masing owner', meA.body.user.role === 'owner' && meB.body.user.role === 'owner');

  const bukuA = await panggil('data', { cookie: masukA.cookie });
  const bukuB = await panggil('data', { cookie: masukB.cookie });
  cek('buku keluarga A kosong (revisi 0)', bukuA.body.revision === 0, bukuA.body.revision);
  cek('buku keluarga B kosong (revisi 0)', bukuB.body.revision === 0, bukuB.body.revision);

  const pribadiA0 = await panggil('personal/data', { cookie: masukA.cookie });
  cek('buku pribadi A kosong', pribadiA0.body.revision === 0 && pribadiA0.body.data === null, pribadiA0.body);

  console.log('== isi buku tidak bocor antar akun ==');

  const simpanA = await panggil('personal/save', { method: 'POST', cookie: masukA.cookie, body: { revision: 0, book: buku('milik A') } });
  cek('A bisa simpan buku pribadi', simpanA.status === 200, simpanA);

  const pribadiB = await panggil('personal/data', { cookie: masukB.cookie });
  cek('B tidak melihat isi buku pribadi A', pribadiB.body.data === null, pribadiB.body);

  const simpanBersamaA = await panggil('save', { method: 'POST', cookie: masukA.cookie, body: { revision: 0, book: buku('bersama A') } });
  cek('A bisa simpan buku keluarga', simpanBersamaA.status === 200, simpanBersamaA);

  const bukuBSetelah = await panggil('data', { cookie: masukB.cookie });
  cek('buku keluarga B tetap kosong setelah A menyimpan', bukuBSetelah.body.revision === 0, bukuBSetelah.body.revision);

  console.log('== akun baru langsung bisa dipakai tanpa undangan ==');
  const tanpaSesi = await panggil('personal/data');
  cek('tanpa sesi tetap 401', tanpaSesi.status === 401, tanpaSesi.status);

  console.log('\n' + lulus + ' lulus, ' + gagal + ' gagal');
  process.exit(gagal ? 1 : 0);
})();
