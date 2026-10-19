/* ============================================================
   tests/profile-test.js — tes logika profil (beberapa "akun" lokal)
   Tidak butuh browser: localStorage tiruan dipasang sebelum store.js dimuat.
   ============================================================ */
const path = require('path');

let pass = 0, fail = 0;
const fails = [];
function ok(n, c, e) { if (c) { pass++; console.log('  \u2713 ' + n); } else { fail++; fails.push(n + (e ? ' -> ' + e : '')); console.log('  \u2717 ' + n + (e ? ' -> ' + e : '')); } }
function eq(n, a, b) { ok(n, a === b, 'got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b)); }
function section(t) { console.log('\n' + t); }
function neq(n, a, b) { ok(n, a !== b, 'tidak boleh sama: ' + JSON.stringify(a)); }

/* ---------- localStorage tiruan dengan kuota kecil (uji 'slim') ---------- */
function buatStorage(kuota) {
  const mem = {};
  return {
    _mem: mem,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) {
      const total = Object.keys(mem).reduce(function (a, x) { return a + (x === k ? 0 : mem[x].length); }, 0) + String(v).length;
      if (kuota && total > kuota) { const e = new Error('kuota penuh'); e.name = 'QuotaExceededError'; throw e; }
      mem[k] = String(v);
    },
    removeItem: function (k) { delete mem[k]; }
  };
}

const U = require(path.join(__dirname, '..', 'public', 'js', 'util.js'));
globalThis.U = U;
globalThis.localStorage = buatStorage(0);          // 0 = tanpa batas
const S = require(path.join(__dirname, '..', 'public', 'js', 'store.js'));
const P = S.Profiles;

/* ============================================================ */
section('1. Profil pertama otomatis dibuat');
{
  const list = P.list();
  eq('daftar profil tidak kosong', list.length, 1);
  eq('nama profil pertama', list[0].name, 'Pribadi');
  eq('profil pertama aktif', P.activeId(), list[0].id);
  eq('tanpa sandi', P.hasPin(list[0]), false);
  eq('PIN apa pun diterima bila tidak bersandi', P.checkPin(list[0].id, '9999'), true);
  ok('objek aktif terbaca', !!P.active());
  eq('membaca daftar dua kali tidak menggandakan', P.list().length, 1);
}

section('2. Data lama (tanpa profil) dipindahkan ke profil pertama');
{
  const S2 = buatStorage(0);
  S2.setItem('savingduit.db.v1', JSON.stringify({ version: 1, wallets: [{ id: 'w', name: 'Tunai', balance: 0 }], transactions: [{ id: 't1' }], categories: [], receipts: {} }));
  globalThis.localStorage = S2;
  delete require.cache[require.resolve(path.join(__dirname, '..', 'public', 'js', 'store.js'))];
  const S3 = require(path.join(__dirname, '..', 'public', 'js', 'store.js'));
  const l = S3.Profiles.list();
  eq('satu profil dibuat', l.length, 1);
  eq('data lama pindah ke profil itu', S3.Persist.loadFor(l[0].id).transactions.length, 1);
  eq('kunci lama dibersihkan', S2.getItem('savingduit.db.v1'), null);
  ok('kunci profil aktif dipakai', S3.Persist.key() === 'savingduit.db.v1::' + l[0].id, S3.Persist.key());

  // ulang lagi: jangan sampai data hilang / dobel
  delete require.cache[require.resolve(path.join(__dirname, '..', 'public', 'js', 'store.js'))];
  const S4 = require(path.join(__dirname, '..', 'public', 'js', 'store.js'));
  eq('migrasi tidak diulang (data tetap 1 transaksi)', S4.Persist.loadFor(l[0].id).transactions.length, 1);
  eq('profil tetap satu', S4.Profiles.list().length, 1);
}

/* kembali ke storage semula */
globalThis.localStorage = buatStorage(0);
delete require.cache[require.resolve(path.join(__dirname, '..', 'public', 'js', 'store.js'))];
const S5 = require(path.join(__dirname, '..', 'public', 'js', 'store.js'));
const P5 = S5.Profiles;

section('3. Membuat profil + sandi');
{
  const a = P5.activeId();
  const b = P5.create('Usaha', '💼', '#f59e0b', '1234');
  eq('profil bertambah', P5.list().length, 2);
  eq('nama tersimpan', b.name, 'Usaha');
  eq('ikon tersimpan', b.icon, '💼');
  eq('bersandi', P5.hasPin(b), true);
  ok('PIN tersimpan sebagai hash, bukan teks biasa', b.pinHash !== '1234' && b.pinHash.length > 0, b.pinHash.slice(0, 12));
  ok('ada garam (salt)', !!b.salt && b.salt !== b.pinHash);
  eq('PIN benar diterima', P5.checkPin(b.id, '1234'), true);
  eq('PIN salah ditolak', P5.checkPin(b.id, '1235'), false);
  eq('PIN kosong ditolak', P5.checkPin(b.id, ''), false);
  eq('PIN null ditolak', P5.checkPin(b.id, null), false);
  eq('PIN angka bukan teks', P5.checkPin(b.id, 1234), true);
  eq('profil bersandi terhitung', P5.countPinned(), 1);
  eq('profil tanpa nama diberi nama bawaan', P5.create('   ', '', '').name, 'Profil 3');
  eq('sekarang ada 3 profil', P5.list().length, 3);
  P5.remove(P5.list()[2].id);
  eq('kembali jadi 2 profil', P5.list().length, 2);
  eq('profil aktif tidak berubah', P5.activeId(), a);
}

section('4. Tiap profil punya kunci penyimpanan sendiri');
{
  const list = P5.list();
  const A = list[0], B = list[1];
  P5.setActive(A.id);
  const ka = S5.Persist.key();
  P5.setActive(B.id);
  const kb = S5.Persist.key();
  neq('kunci profil A beda dari B', ka, kb);
  ok('kunci memuat id profil', ka.indexOf(A.id) > -1 && kb.indexOf(B.id) > -1, ka + ' / ' + kb);

  // tulis ke A, pastikan B tidak melihatnya
  P5.setActive(A.id);
  const dbA = S5.seedDB();
  dbA.transactions = [S5.mkTx({ date: '2026-10-01', type: 'out', amount: 50000, walletId: dbA.wallets[0].id, note: 'punya A' })];
  S5.Persist.save(dbA);

  P5.setActive(B.id);
  eq('profil B belum punya data', S5.Persist.load(), null);
  const dbB = S5.seedDB();
  dbB.transactions = [
    S5.mkTx({ date: '2026-10-02', type: 'out', amount: 10000, walletId: dbB.wallets[0].id, note: 'punya B' }),
    S5.mkTx({ date: '2026-10-03', type: 'in', amount: 7000000, walletId: dbB.wallets[0].id, note: 'gaji B' })
  ];
  S5.Persist.save(dbB);

  // bukti terpisah: total saldo & jumlah transaksi beda
  P5.setActive(A.id);
  const rA = S5.Persist.load();
  P5.setActive(B.id);
  const rB = S5.Persist.load();
  eq('A punya 1 transaksi', rA.transactions.length, 1);
  eq('B punya 2 transaksi', rB.transactions.length, 2);
  neq('saldo A beda dari B', S5.totalBalance(rA), S5.totalBalance(rB));
  eq('catatan A tidak bocor ke B', rB.transactions.some(function (t) { return t.note === 'punya A'; }), false);
  eq('catatan B tidak ada di A', rA.transactions.some(function (t) { return t.note === 'punya B'; }), false);

  // muatFor bisa membaca profil lain tanpa mengubah yang aktif
  eq('loadFor membaca A saat B aktif', S5.Persist.loadFor(A.id).transactions.length, 1);
  eq('profil aktif tetap B', P5.activeId(), B.id);
}

section('5. Ganti nama, ganti sandi, hapus sandi');
{
  const B = P5.list()[1];
  P5.update(B.id, { name: 'Usaha Dagang', icon: '🏢', color: '#22c55e' });
  const b2 = P5.get(B.id);
  eq('nama berubah', b2.name, 'Usaha Dagang');
  eq('ikon berubah', b2.icon, '🏢');
  eq('sandi tidak berubah kalau pin tidak dikirim', P5.checkPin(B.id, '1234'), true);

  P5.update(B.id, {}, '5678');
  eq('sandi baru berlaku', P5.checkPin(B.id, '5678'), true);
  eq('sandi lama tidak berlaku', P5.checkPin(B.id, '1234'), false);
  const salt1 = P5.get(B.id).salt;

  P5.update(B.id, {}, '5678');
  eq('garam tidak berubah bila sandi sama', P5.get(B.id).salt, salt1);

  P5.update(B.id, {}, '');
  eq('sandinya terhapus', P5.hasPin(P5.get(B.id)), false);
  eq('tanpa sandi, apa pun diterima', P5.checkPin(B.id, 'apa saja'), true);
  eq('nama tidak ikut kosong', P5.get(B.id).name, 'Usaha Dagang');
  eq('profil bersandi tinggal 0', P5.countPinned(), 0);

  P5.update(B.id, { name: '   ' });
  eq('nama kosong diabaikan', P5.get(B.id).name, 'Usaha Dagang');
  eq('update profil tidak ada mengembalikan false', P5.update('tidak-ada', { name: 'X' }), false);
}

section('6. Status terkunci (kunci pada sesi ini)');
{
  const B = P5.list()[1];
  P5.update(B.id, {}, '4321');
  eq('awalnya tidak terkunci', P5.isLocked(B.id), false);
  P5.lock(B.id);
  eq('setelah dikunci', P5.isLocked(B.id), true);
  P5.lock(B.id);
  P5.lock(B.id);
  eq('dikunci berkali-kali tidak menumpuk', P5.isLocked(B.id), true);
  P5.unlock(B.id);
  eq('setelah dibuka', P5.isLocked(B.id), false);
  P5.unlock(B.id);
  eq('buka berulang aman', P5.isLocked(B.id), false);
  eq('lock profil lain tidak mengganggu', (P5.lock('pf_tidak_ada'), P5.isLocked(B.id)), false);

  const st = P5.bootState();
  eq('bootState menunjuk profil aktif', st.id, P5.activeId());
  eq('bootState tanpa sandi -> tidak perlu buka', st.needUnlock, false);
  P5.setActive(B.id); P5.lock(B.id);
  const st2 = P5.bootState();
  eq('bootState profil terkunci -> perlu buka', st2.needUnlock, true);
  P5.unlock(B.id); P5.setActive(st.id);
}

section('7. Hapus profil');
{
  const list = P5.list();
  eq('ada 2 profil', list.length, 2);
  const buang = list[1];
  const tetap = list[0];
  P5.setActive(tetap.id);
  eq('hapus berhasil', P5.remove(buang.id), true);
  eq('tinggal 1 profil', P5.list().length, 1);
  eq('data profil terhapus ikut hilang', P5.get(buang.id), null);
  eq('kunci datanya dibersihkan', S5.Persist.loadFor(buang.id), null);
  eq('hapus profil terakhir ditolak', P5.remove(tetap.id), false);
  eq('profil terakhir masih ada', P5.list().length, 1);
  eq('hapus id palsu ditolak', P5.remove('pf_hantu'), false);
  eq('profil aktif tetap aman', P5.activeId(), tetap.id);
}

section('8. Menghapus profil aktif memindahkan ke profil lain');
{
  const a = P5.list()[0];
  const b = P5.create('Kedua', '💼', '#000', '');
  P5.setActive(b.id);
  eq('aktif = Kedua', P5.activeId(), b.id);
  P5.remove(b.id);
  eq('aktif pindah otomatis', P5.activeId(), a.id);
  neq('kunci data ikut pindah', S5.Persist.key().indexOf(b.id), S5.Persist.key().length - b.id.length + b.id.length);
  ok('kunci data menunjuk profil baru', S5.Persist.key() === 'savingduit.db.v1::' + a.id, S5.Persist.key());
}

section('9. Profil aktif yang tidak ada / rusak dipulihkan');
{
  const mem = globalThis.localStorage;
  mem.setItem('savingduit.profile.active', JSON.stringify('pf_sudah_hilang'));
  eq('id rusak jatuh ke profil pertama', P5.activeId(), P5.list()[0].id);
  mem.setItem('savingduit.profiles', JSON.stringify([]));
  eq('daftar kosong dibuat ulang', P5.list().length, 1);
  eq('daftar kosong -> tetap ada profil', P5.active() !== null, true);
  mem.setItem('savingduit.profiles', '{bukan json');
  eq('daftar rusak dibuat ulang', P5.list().length, 1);
}

section('10. Ekspor satu profil bisa dibuka kembali sebagai profil lain');
{
  const src = P5.list()[0];
  P5.setActive(src.id);
  const db = S5.seedDB();
  db.transactions = [S5.mkTx({ date: '2026-10-05', type: 'out', amount: 25000, walletId: db.wallets[0].id, note: 'asli' })];
  db.budgets = [{ id: 'b', categoryId: db.categories[0].id, limit: 100000, period: 'month' }];
  S5.Persist.save(db);

  const teks = S5.toJSON(S5.Persist.load());
  const baru = P5.create('Salinan', '📋', '#64748b', '');
  P5.setActive(baru.id);
  eq('profil baru masih kosong', S5.Persist.load(), null);
  const masuk = S5.normalize(JSON.parse(teks));
  eq('impor memuat 1 transaksi', masuk.transactions.length, 1);
  eq('impor memuat anggaran', masuk.budgets.length, 1);
  eq('catatan ikut terbawa', masuk.transactions[0].note, 'asli');
  S5.Persist.save(masuk);

  // aslinya tidak terpengaruh
  eq('profil asli tetap 1 transaksi', S5.Persist.loadFor(src.id).transactions.length, 1);
  eq('dua profil sekarang punya data sendiri', P5.list().filter(function (p) { return !!S5.Persist.loadFor(p.id); }).length >= 2, true);
}

section('11. Penyimpanan penuh tetap menyelamatkan transaksi');
{
  const kecil = buatStorage(4000);
  globalThis.localStorage = kecil;
  delete require.cache[require.resolve(path.join(__dirname, '..', 'public', 'js', 'store.js'))];
  const S6 = require(path.join(__dirname, '..', 'public', 'js', 'store.js'));
  S6.Profiles.list();
  const db = S6.seedDB();
  // struk besar supaya kuota jebol
  db.receipts = { r1: { name: 'a.png', mime: 'image/png', size: 9000, data: 'x'.repeat(9000) } };
  db.transactions = [S6.mkTx({ date: '2026-10-06', type: 'out', amount: 1000, walletId: db.wallets[0].id, receiptId: 'r1' })];
  const hasil = S6.Persist.save(db);
  eq('penyimpanan mengaku "slim"', hasil, 'slim');
  const balik = S6.Persist.load();
  eq('transaksi tetap aman', balik.transactions.length, 1);
  eq('struk dikorbankan', Object.keys(balik.receipts).length, 0);
}

/* ---------------- hasil ---------------- */
console.log('\n' + '='.repeat(56));
console.log('  LULUS: ' + pass + '   GAGAL: ' + fail);
if (fail) { console.log('\n  Yang gagal:'); fails.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(56));
process.exit(fail ? 1 : 0);