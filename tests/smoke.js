/* ============================================================
   tests/smoke.js — tes logika murni (tanpa DOM)
   ============================================================ */
const path = require('path');
const root = {};
global.window = undefined;
const U = require(path.join(__dirname, '..', 'public', 'js', 'util.js'));
const S = require(path.join(__dirname, '..', 'public', 'js', 'store.js'));
const U2 = require(path.join(__dirname, '..', 'public', 'js', 'util.js')) && null;

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; fails.push(name + (extra ? '  → ' + extra : '')); console.log('  \u2717 ' + name + (extra ? '  → ' + extra : '')); }
}
function eq(name, a, b) { ok(name, a === b, 'got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b)); }
function section(t) { console.log('\n' + t); }

/* ---------------- 1. util: uang ---------------- */
section('1. Parsing & format uang');
eq('parse "1.500.000"', U.parseAmount('1.500.000'), 1500000);
eq('parse "1500000"', U.parseAmount('1500000'), 1500000);
eq('parse "Rp 25.000"', U.parseAmount('Rp 25.000'), 25000);
eq('parse "1,5" jadi 2 (dibulatkan)', U.parseAmount('1,5'), 2);
eq('parse "1.234,56"', U.parseAmount('1.234,56'), 1235);
eq('parse ""', U.parseAmount(''), 0);
eq('parse null', U.parseAmount(null), 0);
eq('parse angka negatif', U.parseAmount('-5000'), -5000);
eq('format 1500000', U.fmtNum(1500000), '1.500.000');
eq('format 0', U.fmtNum(0), '0');
eq('fmtRp 25000', U.fmtRp(25000), 'Rp 25.000');
eq('short 1.5jt', U.fmtRpShort(1500000), 'Rp 1.5 jt');
eq('short 25rb', U.fmtRpShort(25000), 'Rp 25 rb');
eq('short negatif', U.fmtRpShort(-1500000), '-Rp 1.5 jt');

/* ---------------- 2. util: tanggal ---------------- */
section('2. Tanggal');
eq('monthOf', U.monthOf('2026-03-15'), '2026-03');
eq('yearOf', U.yearOf('2026-03-15'), '2026');
eq('addDays lewat bulan', U.addDays('2026-01-31', 1), '2026-02-01');
eq('addDays minus', U.addDays('2026-03-01', -1), '2026-02-28');
eq('diffDays', U.diffDays('2026-03-10', '2026-03-01'), 9);
// 2026-06-15 adalah hari Senin
eq('weekStart hari Senin', U.weekStart('2026-06-15'), '2026-06-15');
eq('weekStart hari Rabu', U.weekStart('2026-06-17'), '2026-06-15');
eq('weekStart hari Minggu', U.weekStart('2026-06-21'), '2026-06-15');
eq('monthEnd Feb 2026', U.monthEnd('2026-02-10'), '2026-02-28');
eq('monthEnd Feb 2028 (kabisat)', U.monthEnd('2028-02-10'), '2028-02-29');
eq('monthEnd Des', U.monthEnd('2026-12-05'), '2026-12-31');
eq('fmtDate', U.fmtDate('2026-03-05'), '5 Mar 2026');

/* ---------------- 3. store: saldo ---------------- */
section('3. Saldo dompet');
const db = S.emptyDB();
db.wallets = [
  { id: 'w1', name: 'Tunai', type: 'cash', icon: '💵', color: '#22c55e', initial: 500000, archived: false },
  { id: 'w2', name: 'BCA', type: 'bank', icon: '🏦', color: '#3d7bff', initial: 5000000, archived: false },
  { id: 'w3', name: 'OVO', type: 'ewallet', icon: '📱', color: '#a78bfa', initial: 100000, archived: false }
];
db.categories = [
  { id: 'c1', name: 'Gaji', type: 'in', icon: '💼', archived: false },
  { id: 'c2', name: 'Makan', type: 'out', icon: '🍽️', archived: false }
];
db.transactions = [
  { id: 't1', date: '2026-06-15', type: 'in',  amount: 8000000, walletId: 'w2', categoryId: 'c1', note: 'gaji Juni' },
  { id: 't2', date: '2026-06-15', type: 'out', amount: 50000,   walletId: 'w1', categoryId: 'c2', note: 'makan siang' },
  { id: 't3', date: '2026-06-16', type: 'move', amount: 2000000, walletId: 'w2', walletTo: 'w3', categoryId: '', note: 'top up' },
  { id: 't4', date: '2026-06-17', type: 'out', amount: 20000,   walletId: 'w1', categoryId: 'c2', note: 'kopi' }
];

// saldo: w1 = 500000 - 50000 - 20000 = 430000
//       w2 = 5000000 + 8000000 - 2000000 = 11000000
//       w3 = 100000 + 2000000 = 2100000
const bal = S.walletBalances(db);
eq('saldo Tunai', bal.w1, 430000);
eq('saldo BCA', bal.w2, 11000000);
eq('saldo OVO', bal.w3, 2100000);
eq('total saldo', S.totalBalance(db), 13530000);

section('4. Pindah dana tidak mengubah total kekayaan');
{
  const d2 = S.emptyDB();
  d2.wallets = [{ id: 'a', initial: 100000 }, { id: 'b', initial: 0 }];
  d2.transactions = [{ id: 'm1', date: '2026-01-01', type: 'move', amount: 40000, walletId: 'a', walletTo: 'b' }];
  eq('saldo a turun', S.walletBalance(d2, 'a'), 60000);
  eq('saldo b naik', S.walletBalance(d2, 'b'), 40000);
  eq('total tetap', S.totalBalance(d2), 100000);
}

section('5. Validasi transaksi');
ok('in tanpa dompet ditolak', !S.isValidTx({ date: '2026-01-01', type: 'in', amount: 1000 }));
ok('amount 0 ditolak', !S.isValidTx({ date: '2026-01-01', type: 'in', amount: 0, walletId: 'w1' }));
ok('amount negatif ditolak', !S.isValidTx({ date: '2026-01-01', type: 'out', amount: -5, walletId: 'w1' }));
ok('move dompet sama ditolak', !S.isValidTx({ date: '2026-01-01', type: 'move', amount: 100, walletId: 'w1', walletTo: 'w1' }));
ok('move valid diterima', S.isValidTx({ date: '2026-01-01', type: 'move', amount: 100, walletId: 'w1', walletTo: 'w2' }));
ok('type ngawur ditolak', !S.isValidTx({ date: '2026-01-01', type: 'zzz', amount: 100, walletId: 'w1' }));
{
  const e = S.validateTx({ date: '2026-01-01', type: 'move', amount: 100, walletId: 'a', walletTo: 'a' });
  ok('validateTx menangkap dompet sama', !!e.walletTo);
}

/* ---------------- 6. ringkasan & filter ---------------- */
section('6. Ringkasan & filter periode');
const sJun = S.summary(db, '2026-06-01', '2026-06-30');
eq('pemasukan Juni', sJun.income, 8000000);
eq('pengeluaran Juni', sJun.expense, 70000);
eq('net Juni', sJun.net, 7930000);
eq('pindah dana Juni', sJun.moved, 2000000);
eq('jumlah transaksi Juni', sJun.count, 4);
eq('countIn', sJun.countIn, 1);
eq('countOut', sJun.countOut, 2);
eq('countMove', sJun.countMove, 1);

eq('filter 1 hari', S.summary(db, '2026-06-15', '2026-06-15').count, 2);
eq('filter rentang 16-17', S.summary(db, '2026-06-16', '2026-06-17').count, 2);
eq('filter kosong di luar rentang', S.summary(db, '2025-01-01', '2025-12-31').count, 0);
eq('summaryDays(1) memakai hari ini', S.summaryDays(db, 1).count, 0);

section('7. Filter per dompet / kategori / jenis / kata kunci');
eq('filter dompet w2 (masuk+move)', S.filterTx(db, { walletId: 'w2' }).length, 2);
eq('filter dompet w3 (tujuan move)', S.filterTx(db, { walletId: 'w3' }).length, 1);
eq('filter kategori c2', S.filterTx(db, { categoryId: 'c2' }).length, 2);
eq('filter jenis out', S.filterTx(db, { type: 'out' }).length, 2);
eq('filter jenis in', S.filterTx(db, { type: 'in' }).length, 1);
eq('filter jenis move', S.filterTx(db, { type: 'move' }).length, 1);
eq('cari "kopi"', S.filterTx(db, { q: 'kopi' }).length, 1);
eq('cari "GAJI" (case-insensitive)', S.filterTx(db, { q: 'GAJI' }).length, 1);
eq('urutan terbaru dulu', S.filterTx(db, {})[0].date, '2026-06-17');

section('8. Rekap per kategori');
{
  const bc = S.byCategory(db, '2026-06-01', '2026-06-30', 'out');
  eq('1 kategori keluar (keduanya c2)', bc.length, 1);
  eq('nama kategori', bc[0].name, 'Makan');
  eq('total kategori = pengeluaran', bc[0].amount, 70000);
  eq('kategori pemasukan terhitung', S.byCategory(db, '2026-06-01', '2026-06-30', 'in')[0].amount, 8000000);
  eq('byCategory menghormati rentang tanggal', S.byCategory(db, '2026-07-01', '2026-07-31', 'out').length, 0);
  eq('byCategory type default = out', S.byCategory(db, '2026-06-01', '2026-06-30')[0].name, 'Makan');
}

section('8b. Urutan kategori terbanyak');
{
  const d2 = S.emptyDB();
  d2.wallets = [{ id: 'w', initial: 0 }];
  d2.categories = [
    { id: 'a', name: 'Kecil', type: 'out', icon: '🍽️' },
    { id: 'b', name: 'Besar', type: 'out', icon: '🏠' }
  ];
  d2.transactions = [
    { id: '1', date: '2026-01-01', type: 'out', amount: 100, walletId: 'w', categoryId: 'a' },
    { id: '2', date: '2026-01-02', type: 'out', amount: 900, walletId: 'w', categoryId: 'b' },
    { id: '3', date: '2026-01-03', type: 'out', amount: 50,  walletId: 'w', categoryId: 'a' }
  ];
  const r = S.byCategory(d2, '', '', 'out');
  eq('kategori terbesar di urutan pertama', r[0].name, 'Besar');
  eq('kategori dijumlahkan', r[1].amount, 150);
  eq('dibagi total benar', U.round1(U.pct(r[0].amount, 1050)), 85.7);
}

section('9. Rekap harian / mingguan / bulanan / tahunan');
{
  const bd = S.byDay(db, '2026-06-01', '2026-06-30');
  eq('3 hari berisi transaksi', bd.length, 3);
  eq('urutan naik', bd[0].date, '2026-06-15');
  eq('net hari 1', bd[0].net, 7950000);
  eq('hari 16 hanya move', bd[1].moved, 2000000);
  eq('net hari 16 nol', bd[1].net, 0);
  eq('net hari 17', bd[2].net, -20000);
  eq('pengeluaran hari 15', bd[0].expense, 50000);
  eq('pemasukan hari 15', bd[0].income, 8000000);

  const bw = S.byWeek(db, '2026-06-01', '2026-06-30');
  eq('minggu unik', bw.length, 1);
  eq('weekStart minggu tsb', bw[0].week, '2026-06-15');
  eq('hari aktif minggu', bw[0].activeDays, 3);
  eq('akhir minggu', bw[0].end, '2026-06-21');

  const bm = S.byMonth(db, '2026-01', '2026-12');
  eq('1 bulan', bm.length, 1);
  eq('bulan benar', bm[0].month, '2026-06');
  eq('net bulan', bm[0].net, 7930000);

  const by = S.byYear(db);
  eq('1 tahun', by.length, 1);
  eq('tahun benar', by[0].year, '2026');
  eq('pemasukan tahun', by[0].income, 8000000);
}

section('10. Rentang preset');
{
  const r = S.rangeFor('month', '2026-06-17');
  eq('month from', r.from, '2026-06-01');
  eq('month to', r.to, '2026-06-30');
  const r2 = S.rangeFor('week', '2026-06-17');
  eq('week from', r2.from, '2026-06-15');
  eq('week to', r2.to, '2026-06-21');
  const r3 = S.rangeFor('lastmonth', '2026-03-05');
  eq('lastmonth from', r3.from, '2026-02-01');
  eq('lastmonth to', r3.to, '2026-02-28');
  const r4 = S.rangeFor('lastyear', '2026-03-05');
  eq('lastyear from', r4.from, '2025-01-01');
  const r5 = S.rangeFor('7d', '2026-06-17');
  eq('7d from', r5.from, '2026-06-11');
  eq('7d hari terakhir = hari ini', r5.to, '2026-06-17');
  const r6 = S.rangeFor('today', '2026-06-17');
  eq('today', r6.from === r6.to && r6.from === '2026-06-17', true);
  const r7 = S.rangeFor('all', '2026-06-17');
  eq('all tanpa batas', r7.from === '' && r7.to === '', true);
  const r8 = S.rangeFor('lastmonth', '2026-01-10');
  eq('lastmonth lintas tahun', r8.from, '2025-12-01');
  eq('lastmonth lintas tahun to', r8.to, '2025-12-31');
}

section('11. mkTx & validasi form');
{
  const t = S.mkTx({ date: '2026-06-01', type: 'out', amount: '25.500', walletId: 'w1', categoryId: 'c2', note: '  test  ' });
  eq('nominal diparsing', t.amount, 25500);
  eq('catatan di-trim', t.note, 'test');
  ok('punya id', !!t.id);
  ok('punya createdAt', !!t.createdAt);
  eq('move walletTo dibuang kalau bukan move', t.walletTo, '');

  const errs = S.validateTx({ date: '', type: 'out', amount: 0 });
  ok('tanggal kosong error', !!errs.date);
  ok('nominal error', !!errs.amount);
  ok('dompet error', !!errs.walletId);

  eq('txCountForWallet hitung asal+tujuan', S.txCountForWallet(db, 'w2'), 2);
  eq('txCountForCategory', S.txCountForCategory(db, 'c2'), 2);
}

section('12. Seed, normalize, ekspor');
{
  const seed = S.seedDB();
  eq('seed punya 3 dompet', seed.wallets.length, 3);
  eq('seed punya 18 kategori', seed.categories.length, 18);
  ok('seed ada kategori pemasukan', seed.categories.some(c => c.type === 'in'));
  ok('seed ada kategori pengeluaran', seed.categories.some(c => c.type === 'out'));
  ok('seed punya settings', !!seed.settings && !!seed.meta.created);

  const norm = S.normalize({ transactions: [{ date: '2026-01-01', type: 'in', amount: 5, walletId: 'x' }] });
  ok('normalize menambahkan id transaksi', !!norm.transactions[0].id);
  ok('normalize memberi array kosong untuk bagian hilang', Array.isArray(norm.wallets) && norm.wallets.length === 0);
  eq('normalize tahan input sampah', S.normalize(null).wallets.length, 3); // fallback seed
  eq('normalize tahan string', S.normalize('bukan objek').wallets.length, 3);

  const csv = S.toCSV(db);
  const lines = csv.split('\r\n');
  eq('CSV 4 transaksi + header', lines.length, 5);
  ok('CSV ada header', lines[0].indexOf('Tanggal') === 0);
  ok('CSV memuat nama dompet', csv.indexOf('BCA') > -1);
  ok('CSV memuat jenis pindah dana', csv.indexOf('Pindah Dana') > -1);
  ok('CSV men-quote dengan benar', csv.indexOf('"7.000.000"') === -1 && csv.indexOf('"7000000"') === -1);

  ok('toJSON valid', typeof JSON.parse(S.toJSON(db)) === 'object');
  const f = S.Persist.exportFile(db);
  ok('nama berkas backup berpola benar', /^kantongkita-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f.name));
}

section('13. Ketahanan data rusak');
{
  const nasty = S.emptyDB();
  nasty.wallets = [{ id: 'w1', initial: 0 }];
  nasty.transactions = [
    { id: 'x1', date: '2026-01-01', type: 'in',  amount: 'abc', walletId: 'w1' },  // jumlah ngawur
    { id: 'x2', date: '2026-01-02', type: 'out', amount: 1000, walletId: 'TIDAK_ADA' }, // dompet hantu
    { id: 'x3' },                                                                   // transaksi kosong
    null, undefined
  ];
  const b = S.walletBalances(nasty);
  eq('dompet hantu tidak merusak saldo', b.w1, 0);
  eq('transaksi kosong diabaikan di ringkasan', S.summary(nasty, '', '').count, 1);
  ok('tidak melempar error', true);
}

section('14. Dompet dengan initial string');
{
  const d = S.emptyDB();
  d.wallets = [{ id: 'z', initial: '500000' }];
  eq('initial string jadi angka', S.walletBalance(d, 'z'), 500000);
}

/* ---------------- 15. util tanggal lanjutan (Tahap 2) ---------------- */
section('15. Util tanggal lanjutan');
eq('addMonths 31 Jan -1 bulan (akhir bulan)', U.addMonths('2026-01-31', -1), '2025-12-31');
eq('addMonths 31 Des +1 bulan', U.addMonths('2025-12-31', 1), '2026-01-31');
eq('addMonths 31 Agu +1 bulan (Sep pendek)', U.addMonths('2026-08-31', 1), '2026-09-30');
eq('addMonths 15 Mar +9 bulan', U.addMonths('2026-03-15', 9), '2026-12-15');
eq('addMonths 15 Mar -3 bulan', U.addMonths('2026-03-15', -3), '2025-12-15');
eq('dateInMonth Feb 31 -> 28', U.dateInMonth('2026-02', 31), '2026-02-28');
eq('dateInMonth Feb 29 tahun kabisat -> 29', U.dateInMonth('2028-02', 29), '2028-02-29');
eq('dateInMonth Feb 29 bukan kabisat -> 28', U.dateInMonth('2026-02', 29), '2026-02-28');
eq('dateInMonth Apr 31 -> 30', U.dateInMonth('2026-04', 31), '2026-04-30');
eq('dateInMonth normal', U.dateInMonth('2026-07', 15), '2026-07-15');
eq('dateInMonth 0 -> 1', U.dateInMonth('2026-07', 0), '2026-07-01');
eq('ymOffset -1', U.ymOffset(-1, '2026-01-15'), '2025-12');
eq('ymOffset +1', U.ymOffset(1, '2026-12-05'), '2027-01');
eq('ymOffset 0', U.ymOffset(0, '2026-06-01'), '2026-06');
eq('daysUntilDay 20 dari 15 (bulan sama)', U.daysUntilDay(20, '2026-10-15'), 5);
eq('daysUntilDay 15 dari 15 (hari ini)', U.daysUntilDay(15, '2026-10-15'), 0);
eq('daysUntilDay 1 dari 15 (bulan depan)', U.daysUntilDay(1, '2026-10-15'), 17);
eq('daysUntilDay 31 dari 15 Okt', U.daysUntilDay(31, '2026-10-15'), 16);
eq('daysUntilDay 5 dari 15 Des (tahun depan)', U.daysUntilDay(5, '2026-12-15'), 21);

/* ---------------- 16. Anggaran ---------------- */
section('16. Anggaran per kategori');
function budgetDb() {
  const d = S.seedDB();
  d.categories.push({ id: 'c_mkn', name: 'Makan', type: 'out', icon: '🍽' });
  d.categories.push({ id: 'c_trn', name: 'Transport', type: 'out', icon: '🚗' });
  d.budgets = [
    { id: 'b1', categoryId: 'c_mkn', limit: 1000000, period: 'month' },
    { id: 'b2', categoryId: 'c_trn', limit: 500000, period: 'month' }
  ];
  d.transactions = [
    { id: 'x1', date: '2026-10-03', type: 'out', amount: 300000, walletId: 'wlt_seed0', categoryId: 'c_mkn' },
    { id: 'x2', date: '2026-10-10', type: 'out', amount: 250000, walletId: 'wlt_seed0', categoryId: 'c_mkn' },
    { id: 'x3', date: '2026-10-11', type: 'out', amount: 600000, walletId: 'wlt_seed0', categoryId: 'c_trn' },
    { id: 'x4', date: '2026-09-20', type: 'out', amount: 900000, walletId: 'wlt_seed0', categoryId: 'c_mkn' }, // bulan lalu
    { id: 'x5', date: '2026-10-05', type: 'in',  amount: 999000, walletId: 'wlt_seed0', categoryId: 'c_mkn' }, // pemasukan, tidak dihitung
    { id: 'x6', date: '2026-10-06', type: 'out', amount: 700000, walletId: 'wlt_seed0', categoryId: '' }        // tanpa kategori
  ];
  return d;
}
{
  const d = budgetDb();
  const u = S.budgetUsage(d, d.budgets[0], '2026-10-15');
  eq('terpakai = 550.000 (bulan ini saja)', u.used, 550000);
  eq('batas', u.limit, 1000000);
  eq('sisa', u.left, 450000);
  eq('persen', Math.round(u.pct), 55);
  eq('belum lewat batas', u.over, false);
  eq('pemasukan tidak ikut dihitung', u.used !== 1549000, true);
  eq('transaksi tanpa kategori tidak masuk', S.budgetUsage(d, d.budgets[0], '2026-10-15').used, 550000);

  const u2 = S.budgetUsage(d, d.budgets[1], '2026-10-15');
  eq('anggaran transport lewat batas', u2.over, true);
  eq('transport lebih 100.000', u2.left, -100000);
  eq('persen transport', Math.round(u2.pct), 120);

  const st = S.budgetStatus(d, '2026-10-15');
  eq('urutan: paling kritis dulu', st[0].budget.id, 'b2');
  eq('dua anggaran', st.length, 2);
  eq('status kategori terbaca', st[0].category.name, 'Transport');
  eq('semua valid', st.filter(function (r) { return r.valid; }).length, 2);

  const tot = S.budgetTotal(d, '2026-10-15');
  eq('total batas', tot.limit, 1500000);
  eq('total terpakai', tot.used, 1150000);
  eq('total sisa', tot.left, 350000);
}
{
  const d = budgetDb();
  d.budgets[0].period = 'year';
  eq('anggaran tahunan menghitung sepanjang tahun', S.budgetUsage(d, d.budgets[0], '2026-10-15').used, 1450000);
  eq('anggaran tahunan tidak dijumlahkan ke total bulanan', S.budgetTotal(d, '2026-10-15').limit, 500000);
}
{
  const d = S.emptyDB();
  eq('budgetUsage tanpa anggaran aman', S.budgetUsage(d, null, '2026-10-15').used, 0);
  eq('budgetTotal tanpa anggaran', S.budgetTotal(d, '2026-10-15').limit, 0);
  const d2 = budgetDb();
  d2.categories = d2.categories.filter(function (c) { return c.id !== 'c_trn'; });
  const st2 = S.budgetStatus(d2, '2026-10-15');
  eq('anggaran dengan kategori terhapus ditandai tidak valid', st2.filter(function (r) { return r.budget.id === 'b2'; })[0].valid, false);
  eq('kategori hilang tetap ditaruh di daftar', st2.length, 2);
  eq('yang valid didahulukan', st2[0].budget.id, 'b1');
}
{
  const d = budgetDb();
  const b = S.budgetFor(d, 'c_mkn');
  eq('cari anggaran per kategori', b.id, 'b1');
  eq('cari anggaran kategori tak ada', S.budgetFor(d, 'tidak_ada'), null);
  const r = S.budgetRange({ period: 'year' }, '2026-10-15');
  eq('rentang tahunan: awal', r.from, '2026-01-01');
  eq('rentang tahunan: akhir', r.to, '2026-12-31');
  const r2 = S.budgetRange({ period: 'month' }, '2026-02-10');
  eq('rentang bulanan Februari', r2.to, '2026-02-28');
}

/* ---------------- 17. Target tabungan ---------------- */
section('17. Target tabungan');
function goalDb() {
  const d = S.seedDB();
  d.wallets.push({ id: 'wlt_tab', name: 'Tabungan', icon: '🐖', type: 'bank', initial: 0 });
  d.goals = [
    { id: 'g1', name: 'Dana darurat', target: 20000000, saved: 5000000, due: '2027-04-01', walletId: 'wlt_tab' },
    { id: 'g2', name: 'Laptop', target: 10000000, saved: 10000000, due: '2026-12-01' },
    { id: 'g3', name: 'Liburan', target: 5000000, saved: 1000000, due: '2026-10-01' },
    { id: 'g4', name: 'Tanpa tenggat', target: 1000000, saved: 250000 }
  ];
  return d;
}
{
  const p = S.goalProgress({ target: 10000000, saved: 2500000 });
  eq('persen', p.pct, 25);
  eq('sisa', p.left, 7500000);
  eq('belum selesai', p.done, false);
  const p2 = S.goalProgress({ target: 10000000, saved: 12000000 });
  eq('lebih dari target tetap dianggap selesai', p2.done, true);
  eq('bilah dibatasi 100%', p2.pct, 100);
  eq('persen asli tetap terlihat', p2.rawPct, 120);
  eq('sisa tidak negatif', p2.left, 0);
  const p3 = S.goalProgress(null);
  eq('target kosong aman', p3.target, 0);
  eq('saved kosong aman', p3.saved, 0);
  eq('target 0 tidak bikin NaN', p3.pct, 0);
}
{
  const d = goalDb();
  const st = S.goalStatus(d, '2026-10-15');
  eq('yang belum selesai didahulukan', st[st.length - 1].goal.id, 'g2');
  eq('yang terlambat di atas', st[0].goal.id, 'g3');
  const g1 = st.filter(function (r) { return r.goal.id === 'g1'; })[0];
  eq('sisa hari dihitung', g1.daysLeft, 168);
  eq('tidak terlambat', g1.late, false);
  eq('butuh per bulan (168 hari = 6 bulan)', g1.monthlyNeed, 2500000);
  eq('dompet tujuan ikut dibawa', g1.wallet.name, 'Tabungan');
  const g3 = st.filter(function (r) { return r.goal.id === 'g3'; })[0];
  eq('g3 terlambat', g3.late, true);
  eq('g3 tidak perlu bulanan lagi', g3.monthlyNeed, 4000000);
  const g4 = st.filter(function (r) { return r.goal.id === 'g4'; })[0];
  eq('tanpa tenggat tidak dihitung bulanan', g4.monthlyNeed, null);
  eq('tanpa tenggat tidak terlambat', g4.late, false);
  eq('tanpa tenggat: daysLeft null', g4.daysLeft, null);
}
{
  const d = goalDb();
  const t = S.goalTotal(d);
  eq('total target', t.target, 36000000);
  eq('terkumpul (dibatasi target)', t.saved, 16250000);
  eq('tidak menghitung kelebihan', t.saved, 5000000 + 10000000 + 1000000 + 250000);
  eq('jumlah target', t.total, 4);
  eq('tercapai', t.done, 1);
}
{
  eq('goalMonthlyNeed target tercapai = 0', S.goalMonthlyNeed({ target: 100, saved: 100, due: '2027-01-01' }), 0);
  eq('goalMonthlyNeed tanpa due = null', S.goalMonthlyNeed({ target: 100, saved: 0 }), null);
  eq('goalMonthlyNeed butuh minimal 1 bulan', S.goalMonthlyNeed({ target: 1000000, saved: 0, due: '2026-10-20' }, '2026-10-15'), 1000000);
  eq('goalTotal kosong', S.goalTotal(S.emptyDB()).target, 0);
}

/* ---------------- 18. Langganan ------ */
section('18. Langganan bulanan');
function subDb() {
  const d = S.seedDB();
  d.subscriptions = [
    { id: 's1', name: 'Netflix', amount: 54000,  cycle: 'month', day: 20, active: true },
    { id: 's2', name: 'Domain',  amount: 180000, cycle: 'year',  day: 5,  ym: '2026-10', active: true },
    { id: 's3', name: 'Koran',   amount: 15000,  cycle: 'week',  day: 1,  active: true },
    { id: 's4', name: 'Spotify', amount: 55000,  cycle: 'month', day: 25, active: true },
    { id: 's5', name: 'Mati',    amount: 999000, cycle: 'month', day: 1,  active: false }
  ];
  return d;
}
{
  eq('biaya bulanan: bulanan', S.subMonthlyCost({ amount: 54000, cycle: 'month' }), 54000);
  eq('biaya bulanan: tahunan dibagi 12', Math.round(S.subMonthlyCost({ amount: 180000, cycle: 'year' })), 15000);
  eq('biaya bulanan: mingguan x52/12', Math.round(S.subMonthlyCost({ amount: 15000, cycle: 'week' })), 65000);
  eq('biaya tahunan: tahunan apa adanya', S.subYearlyCost({ amount: 180000, cycle: 'year' }), 180000);
  eq('biaya tahunan: bulanan x12', S.subYearlyCost({ amount: 54000, cycle: 'month' }), 648000);
  eq('biaya tahunan: mingguan x52', S.subYearlyCost({ amount: 15000, cycle: 'week' }), 780000);
  eq('cycle kosong dianggap bulanan', S.subMonthlyCost({ amount: 1000 }), 1000);
  eq('nominal kosong aman', S.subMonthlyCost(null), 0);
}
{
  const t = '2026-10-15';
  eq('jatuh tempo bulanan tgl 20', S.subNextDue({ cycle: 'month', day: 20 }, t), '2026-10-20');
  eq('jatuh tempo bulanan tgl 5 (sudah lewat -> bulan depan)', S.subNextDue({ cycle: 'month', day: 5 }, t), '2026-11-05');
  eq('jatuh tempo bulanan tgl 15 (hari ini)', S.subNextDue({ cycle: 'month', day: 15 }, t), '2026-10-15');
  eq('tgl 31 di bulan pendek', S.subNextDue({ cycle: 'month', day: 31 }, '2026-02-10'), '2026-02-28');
  eq('tahunan tgl 5 bulan Okt', S.subNextDue({ cycle: 'year', day: 5, ym: '2026-10' }, t), '2027-10-05');
  eq('tahunan belum lewat', S.subNextDue({ cycle: 'year', day: 25, ym: '2026-10' }, t), '2026-10-25');
  eq('mingguan hari Senin', S.subNextDue({ cycle: 'week', day: 1 }, t), '2026-10-19');
  eq('mingguan hari Rabu', S.subNextDue({ cycle: 'week', day: 3 }, t), '2026-10-21');
  eq('mingguan hari Minggu', S.subNextDue({ cycle: 'week', day: 7 }, t), '2026-10-18');
  eq('sisa hari bulanan', S.subDaysLeft({ cycle: 'month', day: 20 }, t), 5);
  eq('sisa hari tahunan jauh', S.subDaysLeft({ cycle: 'year', day: 5, ym: '2026-10' }, t), 355);
}
{
  const d = subDb();
  eq('total bulanan hanya yang aktif', Math.round(S.subMonthlyTotal(d)), 54000 + 15000 + 65000 + 55000);
  eq('total bulanan termasuk yang mati', Math.round(S.subMonthlyTotal(d, false)), 54000 + 15000 + 65000 + 55000 + 999000);
  eq('total tahunan hanya yang aktif', Math.round(S.subYearlyTotal(d)), Math.round((54000 + 55000) * 12 + 180000 + 15000 * 52));

  const st = S.subStatus(d, '2026-10-15');
  eq('yang mati tidak masuk daftar', st.length, 4);
  eq('urut paling dekat dulu', st[0].sub.id, 's3');
  eq('belum ada yang lunas', st.filter(function (r) { return r.paidThisMonth; }).length, 0);
  eq('biaya bulanan ikut dihitung', Math.round(st[0].monthly), 65000);
  eq('jatuh tempo berikutnya ikut dibawa', st[0].due, '2026-10-19');

  const dekat = S.subDueSoon(d, 7, '2026-10-15');
  eq('jatuh tempo <=7 hari', dekat.length, 2);
  eq('domain tahunan tidak termasuk', dekat.filter(function (r) { return r.sub.id === 's2'; }).length, 0);
  eq('netflix termasuk (5 hari)', dekat.filter(function (r) { return r.sub.id === 's1'; }).length, 1);
  eq('semua <= 7 hari', dekat.every(function (r) { return r.daysLeft <= 7; }), true);
  eq('jatuh tempo 0 hari', S.subDueSoon(d, 0, '2026-10-15').length, 0);
  eq('jatuh tempo 1 hari tidak menangkap koran', S.subDueSoon(d, 1, '2026-10-15').filter(function (r) { return r.sub.id === 's3'; }).length, 0);
  eq('jatuh tempo 4 hari menangkap koran', S.subDueSoon(d, 4, '2026-10-15').filter(function (r) { return r.sub.id === 's3'; }).length, 1);
}
{
  const d = subDb();
  eq('belum dibayar', S.subPaidIn(d, d.subscriptions[0], '2026-10'), false);
  d.transactions.push({ id: 'p1', date: '2026-10-20', type: 'out', amount: 54000, walletId: 'wlt_seed0', note: 'Netflix /sub:s1/ 2026-10' });
  eq('sudah dibayar bulan ini', S.subPaidIn(d, d.subscriptions[0], '2026-10'), true);
  eq('bulan lain tidak terpengaruh', S.subPaidIn(d, d.subscriptions[0], '2026-11'), false);
  const st = S.subStatus(d, '2026-10-15');
  const s1 = st.filter(function (r) { return r.sub.id === 's1'; })[0];
  eq('status lunas terbaca', s1.paidThisMonth, true);
  eq('yang lunas dilempar ke bawah', st[st.length - 1].sub.id, 's1');
  eq('yang lunas hilang dari jatuh tempo dekat', S.subDueSoon(d, 7, '2026-10-15').filter(function (r) { return r.sub.id === 's1'; }).length, 0);
  const s2 = st.filter(function (r) { return r.sub.id === 's2'; })[0];
  eq('tahunan ditebak dari ym', S.subNextDue(d.subscriptions[1], '2026-10-15'), '2027-10-05');
  eq('s2 belum lunas', s2.paidThisMonth, false);
}
{
  eq('subStatus tanpa langganan', S.subStatus(S.emptyDB(), '2026-10-15').length, 0);
  eq('subMonthlyTotal kosong', S.subMonthlyTotal(S.emptyDB()), 0);
  eq('subNextDue mingguan clamp hari 9 -> 7', S.subNextDue({ cycle: 'week', day: 9 }, '2026-10-15'), '2026-10-18');
  eq('subNextDue bulanan hari 99 -> 31', S.subNextDue({ cycle: 'month', day: 99 }, '2026-04-01'), '2026-04-30');
}

/* ---------------- 19. Migrasi & normalisasi data Tahap 2 ------ */
section('19. Normalisasi data Tahap 2');
{
  const raw = {
    wallets: [{ id: 'w1', name: 'A' }], categories: [{ id: 'c1', name: 'C', type: 'out' }],
    transactions: [],
    budgets: [{ id: 'b1', categoryId: 'c1', limit: 100000 }],
    goals: [{ id: 'g1', name: 'X', target: 100 }],
    subscriptions: [{ id: 's1', name: 'Y', amount: 10 }]
  };
  const d = S.normalize(raw);
  eq('anggaran ikut diimpor', d.budgets.length, 1);
  eq('target ikut diimpor', d.goals.length, 1);
  eq('langganan ikut diimpor', d.subscriptions.length, 1);
  eq('batas anggaran utuh', d.budgets[0].limit, 100000);
}
{
  const d = S.normalize({ wallets: [{}], transactions: [] });
  eq('berkas lama tanpa kunci Tahap 2 -> anggaran kosong', Array.isArray(d.budgets) && d.budgets.length === 0, true);
  eq('target kosong', d.goals.length, 0);
  eq('langganan kosong', d.subscriptions.length, 0);
}
{
  const d = S.emptyDB();
  d.budgets = 'bukan array'; d.goals = 42; d.subscriptions = null;
  const n = S.normalize(JSON.parse(JSON.stringify(d)));
  eq('budgets rusak -> array kosong', Array.isArray(n.budgets) && n.budgets.length === 0, true);
  eq('goals rusak -> array kosong', Array.isArray(n.goals) && n.goals.length === 0, true);
  eq('subscriptions rusak -> array kosong', Array.isArray(n.subscriptions) && n.subscriptions.length === 0, true);
}
{
  const d = subDb();
  d.goals = goalDb().goals;
  d.budgets = budgetDb().budgets;
  const round = S.normalize(JSON.parse(S.toJSON(d)));
  eq('perjalanan ekspor-impor menjaga anggaran', round.budgets.length, 2);
  eq('perjalanan ekspor-impor menjaga target', round.goals.length, 4);
  eq('perjalanan ekspor-impor menjaga langganan', round.subscriptions.length, 5);
  eq('target bulanan masih sama', S.goalStatus(round, '2026-10-15').filter(function (r) { return r.goal.id === 'g1'; })[0].monthlyNeed, 2500000);
}

/* ---------------- hasil ---------------- */
console.log('\n' + '='.repeat(56));
console.log('  LULUS: ' + pass + '   GAGAL: ' + fail);
if (fail) { console.log('\n  Yang gagal:'); fails.forEach(f => console.log('   - ' + f)); }
console.log('='.repeat(56));
process.exit(fail ? 1 : 0);