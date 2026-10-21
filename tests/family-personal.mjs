/* Uji buku PRIBADI di server: pemilik bisa simpan/baca, pasangan TIDAK bisa.
   Jalankan setelah server lokal hidup: node tests/family-personal.mjs */
import assert from 'node:assert';

const B = 'http://127.0.0.1:8801';
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

const buku = (catatan) => ({
  wallets: [{ id: 'w_p', name: 'Dompet', type: 'cash', initial: 100000 }],
  categories: [{ id: 'c_p', name: 'Makan', type: 'out' }],
  transactions: [{ id: 'tx_p1', type: 'out', amount: 15000, date: '2026-10-20', note: catatan, walletId: 'w_p', categoryId: 'c_p' }],
  budgets: [], goals: [], subscriptions: []
});

(async () => {
  const milik = 'prib_' + Math.random().toString(36).slice(2, 7);
  const a = await panggil('activate', { method: 'POST', body: { username: milik, password: 'rahasia-panjang-123' } });
  const masuk = await panggil('login', { method: 'POST', body: { username: milik, password: 'rahasia-panjang-123' } });
  assert.equal(masuk.status, 200, 'login pemilik harus berhasil');

  console.log('1. Sebelum ada data');
  const kosong = await panggil('personal/data', { cookie: masuk.cookie });
  cek('revisi awal 0', kosong.body.revision === 0, kosong.body);
  cek('data masih kosong', kosong.body.data === null, kosong.body.data);

  console.log('2. Simpan dan baca');
  const s1 = await panggil('personal/save', { method: 'POST', cookie: masuk.cookie, body: { revision: 0, book: buku('kopi') } });
  cek('simpan pertama 200', s1.status === 200, s1.body);
  cek('revisi naik jadi 1', s1.body.revision === 1, s1.body.revision);
  const b1 = await panggil('personal/data', { cookie: masuk.cookie });
  cek('isi kembali utuh', b1.body.data?.transactions?.[0]?.note === 'kopi', b1.body.data?.transactions);
  cek('dompet ikut tersimpan', b1.body.data?.wallets?.[0]?.name === 'Dompet', b1.body.data?.wallets);

  console.log('3. Revisi basi ditolak');
  const basi = await panggil('personal/save', { method: 'POST', cookie: masuk.cookie, body: { revision: 0, book: buku('teh') } });
  cek('revisi lama 409', basi.status === 409, basi.body);
  const b2 = await panggil('personal/data', { cookie: masuk.cookie });
  cek('isi tidak tertimpa', b2.body.data?.transactions?.[0]?.note === 'kopi', b2.body.data?.transactions);

  console.log('4. Data rusak ditolak');
  const rusak = await panggil('personal/save', {
    method: 'POST', cookie: masuk.cookie,
    body: { revision: 1, book: { wallets: [], categories: [], budgets: [], goals: [], subscriptions: [], transactions: [{ id: 'x', type: 'out', amount: -5, date: '2026-10-20' }] } }
  });
  cek('nominal negatif 400', rusak.status === 400, rusak.body);

  console.log('5. Tanpa login ditolak');
  const tamu = await panggil('personal/data');
  cek('baca tanpa sesi 401', tamu.status === 401, tamu.body);
  const tamuSimpan = await panggil('personal/save', { method: 'POST', body: { revision: 0, book: buku('asing') } });
  cek('simpan tanpa sesi 401', tamuSimpan.status === 401, tamuSimpan.body);

  console.log('6. Pasangan tidak bisa membaca buku pribadi ini');
  const undang = await panggil('invite', { method: 'POST', cookie: masuk.cookie, body: {} });
  cek('undangan terbit', undang.status === 200 && (undang.body.code || '').length === 64, undang.body);
  const pasangan = 'tmn_' + Math.random().toString(36).slice(2, 7);
  const gabung = await panggil('join', { method: 'POST', body: { username: pasangan, password: 'rahasia-panjang-123', code: undang.body.code } });
  cek('pasangan bergabung', gabung.status === 200, gabung.body);
  const masuk2 = await panggil('login', { method: 'POST', body: { username: pasangan, password: 'rahasia-panjang-123' } });
  cek('pasangan bisa login', masuk2.status === 200, masuk2.body);

  const lihat = await panggil('personal/data', { cookie: masuk2.cookie });
  cek('pasangan melihat buku KOSONG, bukan isi pemilik', lihat.status === 200 && lihat.body.data === null, lihat.body);
  cek('pasangan mulai dari revisi 0', lihat.body.revision === 0, lihat.body.revision);

  const tulisPasangan = await panggil('personal/save', { method: 'POST', cookie: masuk2.cookie, body: { revision: 0, book: buku('punya pasangan') } });
  cek('pasangan bisa simpan buku sendiri', tulisPasangan.status === 200, tulisPasangan.body);

  const ulang = await panggil('personal/data', { cookie: masuk.cookie });
  cek('buku pemilik tidak berubah oleh pasangan', ulang.body.data?.transactions?.[0]?.note === 'kopi', ulang.body.data?.transactions);

  /* Buku bersama tetap terpisah dari buku pribadi. */
  const bersama = await panggil('data', { cookie: masuk.cookie });
  cek('buku keluarga tidak terisi oleh buku pribadi', (bersama.body.data?.transactions || []).length === 0, bersama.body.data);

  console.log('\n  LULUS: ' + lulus + '   GAGAL: ' + gagal);
  if (gagal) process.exit(1);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
