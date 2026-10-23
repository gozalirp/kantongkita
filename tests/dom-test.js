/* ============================================================
   tests/dom-test.js — uji UI nyata dengan jsdom
   Jalankan:  NODE_PATH=/tmp/sdtest/node_modules node tests/dom-test.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<script src="js\/[^"]+"><\/script>/g, '');

let pass = 0, fail = 0; const fails = [];
function ok(n, c, e) { if (c) { pass++; console.log('  \u2713 ' + n); } else { fail++; fails.push(n + (e ? ' -> ' + e : '')); console.log('  \u2717 ' + n + (e ? ' -> ' + e : '')); } }
function eq(n, a, b) { ok(n, a === b, 'got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b)); }
function section(t) { console.log('\n' + t); }

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;

window.alert = () => {};
window.confirm = () => true;
window.HTMLAnchorElement.prototype.click = function () { window.__lastDownload = { name: this.download, href: this.href }; };
/* jsdom tidak punya fetch; permintaan jaringan di luar uji dianggap gagal. */
window.fetch = window.fetch || function () { return Promise.reject(new window.Error('offline')); };

['js/util.js', 'js/store.js', 'js/gdrive.js', 'js/views.js', 'js/app.js'].forEach(f => {
  window.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
});
window.App.init();

const App = window.App, V = window.V, S = window.S, U = window.U;
const $ = id => window.document.getElementById(id);
const q = sel => window.document.querySelector(sel);
const qa = sel => Array.from(window.document.querySelectorAll(sel));

function click(el) { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }
function setVal(el, v) {
  el.value = v;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}
function nav(v) { App.go(v); window.dispatchEvent(new window.HashChangeEvent('hashchange')); }
/* FileReader jsdom selesai kapan saja; menunggu syaratnya membuat uji impor
   tidak lagi gagal palsu karena waktu tetap. */
async function tunggu(cek, ms) {
  const batas = ms || 1500;
  const t0 = Date.now();
  while (!cek() && Date.now() - t0 < batas) await new Promise(r => setTimeout(r, 10));
}

section('1. Bootstrap');
ok('App termuat', !!App);
ok('DB ter-seed', App.db && App.db.wallets.length === 3);
eq('view awal', App.view, 'dashboard');
ok('halaman dashboard tergambar', $('content').innerHTML.indexOf('Total Saldo') > -1);
eq('judul halaman', $('page-title').textContent, 'Dashboard');
ok('menu dashboard aktif', q('[data-view="dashboard"]').classList.contains('active'));
eq('init idempotent', (App.init(), App._inited), true);

section('Regresi label tanggal pada daftar transaksi nyata');
{
  const savedDb=App.db, savedState={...V.state.transaksi}, savedToday=U.today;
  try {
    U.today=()=> '2026-01-01';
    App.db=S.normalize({wallets:[{id:'date-wallet',name:'Dompet tanggal',initial:0}],categories:[],transactions:[
      {id:'yesterday',date:'2025-12-31',type:'in',amount:1000,walletId:'date-wallet',note:'uji kemarin'},
      {id:'today',date:'2026-01-01',type:'in',amount:2000,walletId:'date-wallet',note:'uji hari ini'},
      {id:'tomorrow',date:'2026-01-02',type:'in',amount:3000,walletId:'date-wallet',note:'uji besok'}
    ]});
    V.state.transaksi.preset='all';V.state.transaksi.q='';V.state.transaksi.type='all';V.state.transaksi.wallet='';
    const before=JSON.stringify(App.db), output=V.transaksi();
    const container=window.document.createElement('div');container.innerHTML=output;
    for(const [date,label] of [['31 Des 2025','Kemarin'],['1 Jan 2026','Hari ini'],['2 Jan 2026','Besok']]){
      const dateLabel=Array.from(container.querySelectorAll('span')).find(e=>e.textContent===date);
      eq('tanggal '+date+' dikelompokkan sebagai '+label,dateLabel?.parentElement.querySelector('strong')?.textContent,label);
    }
    eq('render label tidak mengubah data transaksi',JSON.stringify(App.db),before);
  } finally {App.db=savedDb;Object.assign(V.state.transaksi,savedState);U.today=savedToday;}
}

section('Avatar profil lokal');
{
 const p=S.Profiles.active(), oldIcon=p.icon, originalBook=JSON.stringify(App.db);
 V.profilForm(p.id);
 eq('10 avatar tersedia',qa('#p-avatar [data-avatar]').length,10);
 click(q('#p-avatar [data-avatar="avatar:alya"]'));
 eq('avatar pilihan ditandai',q('#p-avatar [aria-pressed="true"]').dataset.avatar,'avatar:alya');
 click($('p-save'));
 eq('avatar tersimpan di profil',S.Profiles.get(p.id).icon,'avatar:alya');
 ok('avatar tampil di sidebar',!!q('#pb-ic img[src="/avatars/alya.svg"]'));
 const oldK=window.K; window.K={terbuka:true,nama:'Akun contoh'};
 const akunHtml=V.profil();
 ok('kartu akun login memakai avatar pilihan',akunHtml.indexOf('<div class="pc-ic"><img class="profile-avatar" src="/avatars/alya.svg"') !== -1);
 V.updateProfilBtn();
 ok('sidebar akun login memakai avatar pilihan',!!q('#pb-ic img[src="/avatars/alya.svg"]'));
 window.K=oldK;
 V.profilForm(p.id);
 eq('avatar terpilih dipulihkan saat buka form',q('#p-avatar [aria-pressed="true"]').dataset.avatar,'avatar:alya');
 click(q('#p-ikon [data-emoji]'));click($('p-save'));
 ok('emoji lama masih didukung',!S.Profiles.get(p.id).icon.startsWith('avatar:'));
 eq('buku tidak berubah karena ganti avatar',JSON.stringify(App.db),originalBook);
 S.Profiles.update(p.id,{icon:oldIcon});V.updateProfilBtn();
}

section('2. Navigasi semua halaman');
[['transaksi', 'Catatan Transaksi'], ['rekap', 'Rekap Transaksi'], ['dompet', 'Dompet & Bank'],
 ['kategori', 'Kategori'], ['pengaturan', 'Pengaturan']].forEach(([v, title]) => {
  nav(v);
  eq('navigasi ke ' + v, App.view, v);
  eq('judul ' + v, $('page-title').textContent, title);
  ok('konten ' + v + ' ada isinya', $('content').innerHTML.length > 200);
  ok('menu ' + v + ' aktif', q('[data-view="' + v + '"]').classList.contains('active'));
});
nav('dashboard');

section('3. Hash tidak valid');
window.location.hash = '#/halaman-ngawur';
window.dispatchEvent(new window.HashChangeEvent('hashchange'));
eq('fallback ke dashboard', App.view, 'dashboard');
window.location.hash = '';
window.dispatchEvent(new window.HashChangeEvent('hashchange'));
eq('hash kosong -> dashboard', App.view, 'dashboard');

section('4. Tambah transaksi lewat form');
V.txForm();
ok('modal terbuka', !$('modal-wrap').hidden);
eq('judul modal', $('modal-title').textContent, 'Catat Transaksi');
eq('segmented 3 jenis', qa('#f-type [data-seg]').length, 3);
ok('default jenis pengeluaran', q('#f-type [data-seg="out"]').classList.contains('on'));

setVal($('f-amount'), '25.500');
eq('nominal terformat saat diketik', $('f-amount').value, '25.500');
ok('hint nominal muncul', $('f-amount-hint').textContent.indexOf('25.500') > -1);
eq('tanggal default hari ini', $('f-date').value, U.today());
click($('f-calendar-toggle'));
ok('kalender transaksi terbuka', !$('f-calendar').hidden);
ok('tanggal terpilih ditandai', !!q('#f-calendar [aria-pressed="true"]'));
click(q('#f-calendar [data-month="1"]'));
click(q('#f-calendar [data-date]'));
ok('memilih tanggal menutup kalender', $('f-calendar').hidden);
ok('tanggal pilihan tersimpan pada input ISO', /^\d{4}-\d{2}-01$/.test($('f-date').value));
click($('f-calendar-toggle'));
click(q('#f-calendar .calendar-today'));
eq('tombol hari ini mengembalikan tanggal', $('f-date').value, U.today());
setVal($('f-note'), 'makan siang');
const nTxBefore = App.db.transactions.length;
click($('f-save'));
eq('transaksi bertambah', App.db.transactions.length, nTxBefore + 1);
const t1 = App.db.transactions[App.db.transactions.length - 1];
eq('nominal benar', t1.amount, 25500);
eq('jenis pengeluaran', t1.type, 'out');
eq('catatan tersimpan', t1.note, 'makan siang');
ok('punya kategori', !!t1.categoryId);
ok('modal tertutup', $('modal-wrap').hidden);

section('4b. Ganti jenis setelah mengisi nominal TIDAK menghapus ketikan');
V.txForm();
setVal($('f-amount'), '88.000');
setVal($('f-note'), 'catatan penting');
click(q('#f-type [data-seg="in"]'));
eq('nominal bertahan setelah ganti jenis', U.parseAmount($('f-amount').value), 88000);
eq('catatan bertahan setelah ganti jenis', $('f-note').value, 'catatan penting');
click(q('#f-type [data-seg="move"]'));
eq('nominal tetap bertahan', U.parseAmount($('f-amount').value), 88000);
click(q('#f-type [data-seg="out"]'));
eq('kembali ke pengeluaran, nominal utuh', U.parseAmount($('f-amount').value), 88000);
eq('catatan masih utuh', $('f-note').value, 'catatan penting');
V.modal.close();

section('5. Pindah dana lewat form');
V.txForm(null, 'move');
ok('form mode pindah dana', q('#f-type [data-seg="move"]').classList.contains('on'));
ok('ada pilihan dompet tujuan', !!$('f-wallet-to'));
ok('tidak ada pilihan kategori', !$('f-cat'));
setVal($('f-amount'), '500000');
const wA = App.db.wallets[0].id, wB = App.db.wallets[1].id;
setVal($('f-wallet'), wA);
setVal($('f-wallet-to'), wB);
ok('dompet asal hilang dari daftar tujuan', !Array.from($('f-wallet-to').options).some(o => o.value === wA));
const balA0 = S.walletBalance(App.db, wA), balB0 = S.walletBalance(App.db, wB);
const totalBal0 = S.totalBalance(App.db);
click($('f-save'));
const t2 = App.db.transactions[App.db.transactions.length - 1];
eq('jenis move', t2.type, 'move');
eq('dompet tujuan tersimpan', t2.walletTo, wB);
eq('kategori dikosongkan untuk move', t2.categoryId, '');
eq('saldo asal turun 500rb', S.walletBalance(App.db, wA), balA0 - 500000);
eq('saldo tujuan naik 500rb', S.walletBalance(App.db, wB), balB0 + 500000);
eq('total saldo tidak berubah', S.totalBalance(App.db), totalBal0);

section('6. Validasi form menolak input salah');
V.txForm(null, 'out');
setVal($('f-amount'), '');
setVal($('f-date'), '');
const nBeforeInv = App.db.transactions.length;
click($('f-save'));
eq('tidak tersimpan saat invalid', App.db.transactions.length, nBeforeInv);
ok('modal masih terbuka', !$('modal-wrap').hidden);
ok('ada notifikasi error', qa('#toasts .toast.err').length > 0);
V.modal.close();
// nominal 0 / teks sampah
V.txForm(null, 'out');
setVal($('f-amount'), 'abc');
eq('teks sampah jadi 0', U.parseAmount($('f-amount').value), 0);
click($('f-save'));
eq('nominal 0 ditolak', App.db.transactions.length, nBeforeInv);
V.modal.close();

section('8. Ubah transaksi');
const target = App.db.transactions.filter(t => t.type === 'out')[0];
V.txForm(target.id);
eq('judul modal ubah', $('modal-title').textContent, 'Ubah Transaksi');
eq('nominal terisi', U.parseAmount($('f-amount').value), target.amount);
eq('catatan terisi', $('f-note').value, target.note);
const nTxAll = App.db.transactions.length;
setVal($('f-amount'), '99.000');
setVal($('f-note'), 'diubah');
click($('f-save'));
const afterEdit = App.db.transactions.filter(t => t.id === target.id)[0];
eq('nominal terupdate', afterEdit.amount, 99000);
eq('catatan terupdate', afterEdit.note, 'diubah');
eq('jumlah transaksi tetap', App.db.transactions.length, nTxAll);
eq('id tidak berubah', afterEdit.id, target.id);

section('9. Konfirmasi hapus: batal lalu setuju');
(async function () {
  let answer = false;
  const origConfirm = V.confirm;
  V.confirm = function () { return Promise.resolve(answer); };

  const nBeforeDel = App.db.transactions.length;
  const delTarget = App.db.transactions.filter(t => t.type === 'out')[0];
  answer = false;
  let r = await V.txDelete(delTarget.id);
  eq('batal konfirmasi tidak menghapus', App.db.transactions.length, nBeforeDel);
  eq('return false saat batal', r, false);

  answer = true;
  r = await V.txDelete(delTarget.id);
  eq('hapus berhasil', r, true);
  eq('jumlah berkurang', App.db.transactions.length, nBeforeDel - 1);
  ok('transaksi benar-benar hilang', !App.db.transactions.some(t => t.id === delTarget.id));

  section('9b. Modal konfirmasi nyata (V.confirm)');
  V.confirm = origConfirm;
  const p = V.confirm('Judul Tes', 'Isi pesan tes', 'OK', true);
  ok('modal konfirmasi terbuka', !$('modal-wrap').hidden);
  eq('judul konfirmasi', $('modal-title').textContent, 'Judul Tes');
  ok('pesan tampil', $('modal-body').innerHTML.indexOf('Isi pesan tes') > -1);
  ok('tombol OK ada', !!$('cf-ok'));
  click($('cf-ok'));
  eq('konfirmasi resolve true', await p, true);
  ok('modal tertutup setelah OK', $('modal-wrap').hidden);

  const p2 = V.confirm('Tes Batal', 'x', 'OK');
  click(q('#modal-foot [data-close]'));
  eq('tombol batal resolve false', await p2, false);
  const p3 = V.confirm('Tes Scrim', 'x', 'OK');
  click($('modal-wrap'));
  eq('klik scrim resolve false', await p3, false);

  // pasang kembali konfirmasi yang bisa dikendalikan tes (dipakai di sisa tes)
  let confirmAnswer = true;
  V.confirm = function () { return Promise.resolve(confirmAnswer); };
  window.__setConfirm = function (v) { confirmAnswer = v; };

  section('10. Dompet: tambah, ubah, hapus');
  const nW = App.db.wallets.length;
  V.walletForm();
  ok('modal dompet terbuka', !$('modal-wrap').hidden);
  setVal($('w-name'), 'Jenius');
  setVal($('w-type'), 'bank');
  setVal($('w-icon'), '\ud83d\udcb3');
  setVal($('w-initial'), '1.250.000');
  click($('w-save'));
  eq('dompet bertambah', App.db.wallets.length, nW + 1);
  const nw = App.db.wallets.filter(w => w.name === 'Jenius')[0];
  eq('nama dompet', nw.name, 'Jenius');
  eq('saldo awal diparsing', nw.initial, 1250000);
  eq('saldo dompet baru', S.walletBalance(App.db, nw.id), 1250000);
  eq('ikon dompet', nw.icon, '\ud83d\udcb3');
  eq('jenis dompet', nw.type, 'bank');

  V.walletForm(nw.id);
  eq('form ubah terisi', $('w-name').value, 'Jenius');
  setVal($('w-name'), 'Jenius Updated');
  click($('w-save'));
  eq('dompet terupdate', App.db.wallets.filter(w => w.id === nw.id)[0].name, 'Jenius Updated');
  eq('tidak duplikat', App.db.wallets.length, nW + 1);

  V.walletForm();
  setVal($('w-name'), '   ');
  click($('w-save'));
  eq('dompet tanpa nama ditolak', App.db.wallets.length, nW + 1);
  V.modal.close();

  // pilih warna lewat form
  V.walletForm();
  const colorBtn = q('#w-colors [data-color="#f4586c"]');
  ok('form dompet punya pilihan warna', !!colorBtn);
  click(colorBtn);
  setVal($('w-name'), 'Berwarna');
  click($('w-save'));
  eq('dompet berwarna dibuat', App.db.wallets.length, nW + 2);
  const colored = App.db.wallets.filter(w => w.name === 'Berwarna')[0];
  eq('warna tersimpan', colored.color, '#f4586c');
  window.__setConfirm(true);
  await V.walletDelete(colored.id);
  eq('dompet berwarna terhapus', App.db.wallets.length, nW + 1);

  const txsBefore = App.db.transactions.length;
  window.__setConfirm(true);
  await V.walletDelete(nw.id);
  eq('dompet terhapus', App.db.wallets.length, nW);
  eq('transaksi dompet itu dihapus juga', App.db.transactions.length, txsBefore);

  section('11. Dompet: minimal 1 aktif, hapus ikut transaksi');
  const keepW = App.db.wallets, keepTx = App.db.transactions, keepCat = App.db.categories;
  App.db.wallets = [{ id: 'only', name: 'Satu', type: 'cash', icon: '\ud83d\udcb5', color: '#fff', initial: 0, archived: false }];
  App.db.transactions = [];
  window.__setConfirm(true);
  await V.walletDelete('only');
  eq('dompet terakhir tidak bisa dihapus', App.db.wallets.length, 1);

  App.db.wallets = [
    { id: 'kA', name: 'A', type: 'cash', icon: '💵', color: '#fff', initial: 0, archived: false },
    { id: 'kB', name: 'B', type: 'bank', icon: '🏦', color: '#fff', initial: 0, archived: false }
  ];
  App.db.transactions = [
    { id: 'kd1', date: U.today(), type: 'out', amount: 5000, walletId: 'kA', categoryId: '', note: '' },
    { id: 'kd2', date: U.today(), type: 'in', amount: 9000, walletId: 'kA', categoryId: '', note: '' },
    { id: 'kd3', date: U.today(), type: 'move', amount: 3000, walletId: 'kB', walletTo: 'kA', categoryId: '', note: '' }
  ];
  App.save();
  window.__setConfirm(true);
  await V.walletDelete('kA');
  eq('dompet A terhapus', App.db.wallets.length, 1);
  eq('semua transaksi terkait A terhapus', App.db.transactions.length, 0);

  App.db.wallets = keepW; App.db.transactions = keepTx; App.db.categories = keepCat; App.save();

  section('12. Kategori: tambah, ubah, hapus');
  nav('kategori');
  ok('halaman kategori tergambar', $('content').innerHTML.indexOf('Pengeluaran') > -1);
  ok('tab kategori ada', !!$('ct-tab'));

  const nC = App.db.categories.length;
  V.catForm(null, 'out');
  setVal($('c-name'), 'Kopi & Jajan');
  click(q('#c-icons [data-emoji="☕"]'));
  eq('ikon terpilih', $('c-icon').value, '☕');
  eq('emoji dapat >= 20 pilihan', qa('#c-icons [data-emoji]').length >= 20, true);
  click($('c-save'));
  eq('kategori bertambah', App.db.categories.length, nC + 1);
  const nc = App.db.categories[App.db.categories.length - 1];
  eq('nama kategori', nc.name, 'Kopi & Jajan');
  eq('jenis kategori', nc.type, 'out');
  eq('ikon kategori', nc.icon, '☕');

  V.catForm();
  setVal($('c-name'), '');
  click($('c-save'));
  eq('kategori tanpa nama ditolak', App.db.categories.length, nC + 1);
  V.modal.close();

  V.catForm(nc.id);
  setVal($('c-name'), 'Kopi Saja');
  click($('c-save'));
  eq('kategori terupdate', App.db.categories.filter(c => c.id === nc.id)[0].name, 'Kopi Saja');
  eq('tidak duplikat kategori', App.db.categories.length, nC + 1);

  click(q('#ct-tab [data-seg="in"]'));
  eq('pindah tab ke pemasukan', V.state.kategori.tab, 'in');
  ok('kategori pemasukan tampil', $('content').innerHTML.indexOf('Gaji') > -1);
  click(q('#ct-tab [data-seg="out"]'));
  eq('kembali ke pengeluaran', V.state.kategori.tab, 'out');

  App.db.transactions.push({ id: 'linkcat', date: U.today(), type: 'out', amount: 1000, walletId: App.db.wallets[0].id, categoryId: nc.id, note: 'x' });
  App.save();
  const txN = App.db.transactions.length;
  window.__setConfirm(true);
  await V.catDelete(nc.id);
  eq('kategori terhapus', App.db.categories.length, nC);
  eq('transaksi tidak ikut terhapus', App.db.transactions.length, txN);
  eq('kategori transaksi dikosongkan', App.db.transactions.filter(t => t.id === 'linkcat')[0].categoryId, '');
  App.db.transactions = App.db.transactions.filter(t => t.id !== 'linkcat');
  App.save();

  section('13. Filter halaman transaksi');
  App.db.transactions = [
    { id: 'f1', date: U.today(), type: 'in', amount: 5000000, walletId: App.db.wallets[0].id, categoryId: '', note: 'gaji' },
    { id: 'f2', date: U.today(), type: 'out', amount: 20000, walletId: App.db.wallets[0].id, categoryId: '', note: 'kopi pagi' },
    { id: 'f3', date: U.addDays(U.today(), -40), type: 'out', amount: 900000, walletId: App.db.wallets[0].id, categoryId: '', note: 'lama' }
  ];
  App.save();
  nav('transaksi');
  ok('ringkasan masuk tampil', $('content').innerHTML.indexOf('Masuk') > -1);

  V.state.transaksi.preset = 'month'; App.render();
  ok('filter bulan menyembunyikan transaksi lama', $('content').innerHTML.indexOf('lama') === -1);
  V.state.transaksi.preset = 'all'; App.render();
  ok('filter semua menampilkan transaksi lama', $('content').innerHTML.indexOf('lama') > -1);

  V.state.transaksi.type = 'in'; App.render();
  ok('filter jenis in menyembunyikan pengeluaran', $('content').innerHTML.indexOf('kopi pagi') === -1);
  V.state.transaksi.type = 'out'; App.render();
  ok('filter jenis out menyembunyikan pemasukan', $('content').innerHTML.indexOf('gaji') === -1);
  V.state.transaksi.type = 'all'; App.render();

  V.state.transaksi.q = 'kopi'; App.render();
  ok('pencarian teks bekerja', $('content').innerHTML.indexOf('kopi pagi') > -1 && $('content').innerHTML.indexOf('lama') === -1);
  V.state.transaksi.q = ''; App.render();

  App.db.wallets.push({ id: 'wOther', name: 'Dompet Lain', type: 'bank', icon: '🏦', color: '#fff', initial: 0, archived: false });
  App.db.transactions.push({ id: 'f4', date: U.today(), type: 'out', amount: 100, walletId: 'wOther', categoryId: '', note: 'dompet lain' });
  App.save();
  V.state.transaksi.walletId = 'wOther'; App.render();
  ok('filter dompet menyaring benar', $('content').innerHTML.indexOf('dompet lain') > -1 && $('content').innerHTML.indexOf('kopi pagi') === -1);
  V.state.transaksi.walletId = ''; App.render();

  const catX = App.db.categories[0].id;
  App.db.transactions.push({ id: 'f5', date: U.today(), type: 'out', amount: 100, walletId: App.db.wallets[0].id, categoryId: catX, note: 'berkategori' });
  App.save();
  V.state.transaksi.catId = catX; App.render();
  ok('filter kategori menyaring benar', $('content').innerHTML.indexOf('berkategori') > -1 && $('content').innerHTML.indexOf('kopi pagi') === -1);
  V.state.transaksi.catId = ''; App.render();

  // Saring pencatat (akun): hanya berguna kalau ada lebih dari satu penanda
  App.db.transactions.push({ id: 'f8', date: U.today(), type: 'out', amount: 100, walletId: App.db.wallets[0].id, categoryId: '', note: 'dicatat saya', by: 'dummy' });
  App.save(); App.render();
  ok('filter pencatat belum tampil kalau hanya satu nama', !$('tx-by'));
  App.db.transactions.push({ id: 'f7', date: U.today(), type: 'out', amount: 100, walletId: App.db.wallets[0].id, categoryId: '', note: 'dicatat pasangan', by: 'dummy2' });
  App.save(); App.render();
  ok('filter pencatat tampil saat ada dua nama', !!$('tx-by'));
  eq('pilihan pencatat lengkap', $('tx-by').options.length, 3);
  ok('nama pencatat jadi pilihan', $('tx-by').textContent.indexOf('dummy2') > -1);
  V.state.transaksi.by = 'dummy2'; App.render();
  ok('filter pencatat menyaring benar', $('content').innerHTML.indexOf('dicatat pasangan') > -1 && $('content').innerHTML.indexOf('dicatat saya') === -1);
  eq('jumlah di kepala ikut menyaring', $('content').textContent.indexOf('1 transaksi') > -1, true);
  V.state.transaksi.by = ''; App.render();

  // pindah dana tampil sebagai satu baris "ke dompet"
  App.db.transactions.push({ id: 'f6', date: U.today(), type: 'move', amount: 250000, walletId: App.db.wallets[0].id, walletTo: 'wOther', categoryId: '', note: 'pindahan' });
  App.save();
  V.state.transaksi.type = 'move'; App.render();
  ok('baris pindah dana tampil', $('content').innerHTML.indexOf('Pindah Dana') > -1);
  ok('menampilkan dompet asal dan tujuan', $('content').innerHTML.indexOf('Tunai ke Dompet Lain') > -1);
  V.state.transaksi.type = 'all'; App.render();

  section('14. Rekap: 4 tab + ganti periode');
  nav('rekap');
  ['hari', 'minggu', 'bulan', 'tahun'].forEach(tab => {
    V.state.rekap.tab = tab; App.render();
    ok('rekap tab ' + tab + ' tergambar', $('content').innerHTML.indexOf('Rekap') > -1);
  });
  V.state.rekap.tab = 'hari'; App.render();
  ok('ada pemilih bulan', !!$('rk-ym'));
  setVal($('rk-ym'), U.monthOf(U.addDays(U.today(), -40)));
  ok('rekap bulan lain tetap jalan', $('content').innerHTML.indexOf('Rekap') > -1);
  V.state.rekap.tab = 'bulan'; App.render();
  ok('ada pemilih tahun', !!$('rk-year'));
  V.state.rekap.tab = 'minggu'; App.render();
  ok('rekap mingguan memuat rentang tanggal', $('content').innerHTML.indexOf('–') > -1);
  V.state.rekap.tab = 'tahun'; App.render();
  ok('rekap tahunan memuat tahun berjalan', $('content').innerHTML.indexOf(U.yearOf(U.today())) > -1);

  section('15. Ekspor CSV & JSON');
  nav('rekap');
  ok('CSV Rekap meminta pilihan buku', $('content').innerHTML.indexOf('V.exportCSV()') > -1);
  V.exportCSV(null, 'pribadi');
  ok('CSV terunduh', !!window.__lastDownload && /\.csv$/.test(window.__lastDownload.name));
  const csvText = decodeURIComponent(window.__lastDownload.href.split(',')[1]);
  ok('CSV berisi nama dompet', csvText.indexOf('Dompet Lain') > -1);
  window.__lastDownload = null;
  V.exportJSON('pribadi');
  ok('backup JSON terunduh', !!window.__lastDownload && /\.json$/.test(window.__lastDownload.name));
  ok('nama backup berpola tanggal', /kantongkita-backup-\d{4}-\d{2}-\d{2}-pribadi\.json/.test(window.__lastDownload.name));
  ok('backup mencatat sumber pribadi', JSON.parse(decodeURIComponent(window.__lastDownload.href.split(',')[1])).backup.sumber === 'pribadi');

  section('16. Persistensi (simpan lalu muat ulang)');
  const before = App.db.transactions.length;
  App.save();
  const stored = JSON.parse(window.localStorage.getItem(App.storageKey()));
  eq('tersimpan di localStorage', stored.transactions.length, before);
  App.load();
  eq('muat ulang mempertahankan jumlah', App.db.transactions.length, before);
  eq('versi skema tersimpan', stored.version, 1);

  section('17. Reset data');
  window.__setConfirm(true);
  await V.resetAll();
  eq('dompet kembali ke default', App.db.wallets.length, 3);
  eq('kategori kembali ke default', App.db.categories.length, 18);
  eq('transaksi dikosongkan', App.db.transactions.length, 0);

  section('18. Impor JSON (mode gabung) + anti duplikat');
  window.__setConfirm(true);
  const payload = S.emptyDB();
  payload.wallets = [{ id: 'iw', name: 'Dompet Impor', type: 'cash', icon: '💵', color: '#fff', initial: 0, archived: false }];
  payload.categories = [{ id: 'ic', name: 'Kat Impor', type: 'out', icon: '🏷️', archived: false }];
  payload.transactions = [
    { id: 'itx1', date: '2026-02-01', type: 'out', amount: 15000, walletId: 'iw', categoryId: 'ic', note: 'impor satu' },
    { id: 'itx2', date: '2026-02-02', type: 'in', amount: 100000, walletId: 'iw', categoryId: '', note: 'impor dua' }
  ];
  const file = new window.File([new window.Blob([JSON.stringify(payload)], { type: 'application/json' })], 'backup.json', { type: 'application/json' });
  window.__setConfirm(true);
  V.importJSON(file);
  await tunggu(() => App.db.transactions.filter(t => /^itx/.test(t.id)).length === 2);
  eq('2 transaksi impor masuk', App.db.transactions.filter(t => /^itx/.test(t.id)).length, 2);
  ok('dompet impor ditambahkan', App.db.wallets.some(w => w.name === 'Dompet Impor'));
  ok('kategori impor ditambahkan', App.db.categories.some(c => c.name === 'Kat Impor'));

  V.importJSON(file);
  await tunggu(() => false, 250);
  eq('impor ulang tidak menduplikasi transaksi', App.db.transactions.filter(t => /^itx/.test(t.id)).length, 2);
  eq('impor ulang tidak menduplikasi dompet', App.db.wallets.filter(w => w.name === 'Dompet Impor').length, 1);
  eq('impor ulang tidak menduplikasi kategori', App.db.categories.filter(c => c.name === 'Kat Impor').length, 1);

  section('18b. Impor mode ganti (replace)');
  const onlyOne = S.emptyDB();
  onlyOne.wallets = [{ id: 'x', name: 'Dompet', type: 'cash', initial: 0 }];
  onlyOne.transactions = [{ id: 'solo1', date: '2026-05-05', type: 'out', amount: 1000, walletId: 'x', categoryId: '', note: 'hanya ini' }];
  const file2 = new window.File([new window.Blob([JSON.stringify(onlyOne)])], 'r.json', { type: 'application/json' });
  nav('pengaturan');
  const cb = $('st-pw-import');
  ok('checkbox impor-mengganti ada', !!cb);
  cb.checked = true;
  window.__setConfirm(true);
  V.importJSON(file2);
  await tunggu(() => App.db.transactions.length === 1);
  eq('data diganti (1 transaksi)', App.db.transactions.length, 1);
  eq('transaksi pengganti benar', App.db.transactions[0].id, 'solo1');

  section('19. Impor JSON rusak');
  const badFile = new window.File([new window.Blob(['{ bukan json'])], 'rusak.json', { type: 'application/json' });
  const nKeep = App.db.transactions.length;
  await new Promise(res => { V.importJSON(badFile); setTimeout(res, 250); });
  eq('data tidak berubah saat impor rusak', App.db.transactions.length, nKeep);

  section('19b. Impor JSON berbentuk salah');
  const arrFile = new window.File([new window.Blob(['[1,2,3]'])], 'bukan-backup.json', { type: 'application/json' });
  const nAwal = App.db.transactions.length;
  const dompetAwal = App.db.wallets.length;
  window.__setConfirm(true);
  await new Promise(res => { V.importJSON(arrFile); setTimeout(res, 250); });
  eq('data tidak berubah saat bentuk backup salah', App.db.transactions.length, nAwal);
  eq('dompet tidak berubah saat bentuk backup salah', App.db.wallets.length, dompetAwal);
  ok('ada pesan bentuk berkas salah', $('toasts').textContent.indexOf('bukan backup') > -1);

  section('20. Modal close via scrim & Escape');
  V.txForm();
  ok('modal terbuka', !$('modal-wrap').hidden);
  click($('modal-wrap'));
  ok('klik scrim menutup modal', $('modal-wrap').hidden);
  V.txForm();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('Escape menutup modal', $('modal-wrap').hidden);

  section('21. Navigasi ponsel satu pola saja');
  /* Laci sidebar ponsel sudah dihapus: tombol pemicunya display:none di
     semua lebar layar dan tidak ada aturan .sidebar.open sama sekali, jadi
     yang tersisa hanya menu bawah + halaman Menu. */
  eq('tombol hamburger dihapus', $('hamburger'), null);
  eq('lapisan scrim dihapus', $('scrim'), null);
  ok('tidak ada kelas open yang nyangkut', !q('.sidebar').classList.contains('open'));
  ok('menu bawah punya satu-satunya pintu', q('#bottom-nav .bnav-item[data-bview="menu"]') !== null);

  section('22. Total saldo di topbar ikut berubah');
  App.db.wallets = [
    { id: 't1', name: 'Tunai', type: 'cash', icon: '\ud83d\udcb5', color: '#fff', initial: 0, archived: false },
    { id: 't2', name: 'Bank', type: 'bank', icon: '\ud83c\udfe6', color: '#fff', initial: 0, archived: false }
  ];
  App.db.transactions = [{ id: 's1', date: U.today(), type: 'in', amount: 777777, walletId: 't2', categoryId: '', note: '' }];
  App.save(); App.render();
  eq('topbar menampilkan total saldo', $('total-pill').textContent, U.fmtRp(777777));
  ok('saldo per dompet benar', S.walletBalance(App.db, 't2') === 777777 && S.walletBalance(App.db, 't1') === 0);

  section('23. XSS tidak tereksekusi');
  App.db.transactions = [{
    id: 'xss1', date: U.today(), type: 'out', amount: 1000,
    walletId: App.db.wallets[0].id, categoryId: '', note: '<img src=x onerror=window.__pwned=1>'
  }];
  App.save(); nav('transaksi');
  ok('tag HTML di-escape', $('content').innerHTML.indexOf('&lt;img') > -1);
  ok('skrip tidak jalan (__pwned kosong)', !window.__pwned);
  eq('tidak ada img[onerror] nyata', qa('#content img[onerror]').length, 0);

  App.db.wallets.push({ id: 'xW', name: '<img src=x onerror=window.__pwned2=1>', type: 'cash', icon: '<b>', color: '#fff', initial: 0, archived: false });
  App.db.categories.push({ id: 'xC', name: '<script>window.__pwned3=1<\/script>', type: 'out', icon: 'x', archived: false });
  App.save();
  nav('dompet');
  ok('nama dompet di-escape', $('content').innerHTML.indexOf('&lt;img') > -1);
  ok('skrip di nama dompet tidak jalan', !window.__pwned2);
  nav('kategori');
  ok('nama kategori di-escape', $('content').innerHTML.indexOf('&lt;script&gt;') > -1);
  ok('skrip di kategori tidak jalan', !window.__pwned3);

  section('24. Struk: simpan, tampil, hapus, tolak berkas besar');
  App.db.transactions = [];
  App.db.receipts = {};
  App.save();
  await new Promise(res => {
    V.readReceipt(new window.File([new window.Blob(['dummy-data'])], 'struk.png', { type: 'image/png' }), { value: '' }, function (rid) {
      ok('struk tersimpan dengan id', !!rid && !!App.db.receipts[rid]);
      eq('mime tercatat', App.db.receipts[rid].mime, 'image/png');
      eq('nama berkas tercatat', App.db.receipts[rid].name, 'struk.png');

      App.db.transactions = [{ id: 'txr', date: U.today(), type: 'out', amount: 5000, walletId: App.db.wallets[0].id, categoryId: '', note: 'pakai struk', receiptId: rid }];
      App.save();
      nav('transaksi');
      // Struk ditandai ikon garis (bukan emoji) supaya beda dari ikon kategori.
      ok('baris transaksi menampilkan penanda struk',
        $('content').querySelector('.item .ico svg.ui-icon') !== null);

      V.receiptView(rid);
      ok('modal lihat struk terbuka', !$('modal-wrap').hidden);
      ok('ada tombol unduh', $('modal-foot').innerHTML.indexOf('download') > -1);
      V.modal.close();

      App.deleteReceipt(rid);
      ok('struk bisa dihapus', !App.db.receipts[rid]);

      const bigFile = { name: 'besar.png', type: 'image/png', size: 5 * 1024 * 1024 };
      V.readReceipt(bigFile, { value: '' }, function () { ok('berkas besar seharusnya ditolak', false); });
      setTimeout(res, 60);
    });
  });
  eq('struk besar tidak tersimpan', Object.keys(App.db.receipts).length, 0);

  section('25. Semua halaman tetap bisa dirender (regresi)');
  ok('render 6 halaman tanpa error', (function () {
    try {
      ['dashboard', 'transaksi', 'rekap', 'dompet', 'kategori', 'pengaturan'].forEach(v => { nav(v); });
      return true;
    } catch (e) { console.log('     error: ' + e.message); return false; }
  })());

  section('26. Dashboard: grafik & data kosong');
  App.db.transactions = []; App.save();
  nav('dashboard');
  ok('dashboard kosong tidak error', $('content').innerHTML.indexOf('Total Saldo') > -1);
  App.db.transactions = [
    { id: 'c1', date: U.today(), type: 'in', amount: 1000000, walletId: App.db.wallets[0].id, categoryId: '', note: '' },
    { id: 'c2', date: U.today(), type: 'out', amount: 400000, walletId: App.db.wallets[0].id, categoryId: '', note: '' }
  ];
  App.save(); App.render();
  eq('total tengah donut sesuai pengeluaran tanpa pemasukan', q('.donut-total strong').textContent, U.fmtRp(400000));
  eq('satu kategori tetap menjadi donut penuh', window.document.querySelectorAll('.donut-slice').length, 1);
  eq('donut merangkum kategori terbesar', q('.donut-insight small').textContent, '100% dari total');
  eq('jumlah kategori ditampilkan terpisah', q('.donut-total small').textContent, '1 kategori');
  ok('irisan memiliki label aksesibel dan tooltip', !!q('.donut-slice[tabindex="0"][aria-label] title'));
  ok('grafik tampil setelah ada data', $('content').innerHTML.indexOf('pie-disc') > -1);
  ok('dashboard bulanan memakai grafik perbandingan', !!q('.planner-chart .column-chart'));
  ok('grafik menampilkan data nominal aksesibel', !!q('.chart-data table'));
  click(q('#dash-chart [data-seg="12m"]'));
  eq('ganti rentang grafik ke 12m', V.state.dashboard.chart, '12m');
  ok('dashboard 12 bulan memakai perbandingan', !!q('.planner-chart .column-chart'));
  click(q('#dash-chart [data-seg="30d"]'));
  eq('ganti ke 30 hari', V.state.dashboard.chart, '30d');
  ok('dashboard harian memakai dua garis', !!q('.planner-chart .daily-lines svg'));
  eq('dua seri garis solid', window.document.querySelectorAll('.daily-lines polyline').length, 2);
  eq('tidak ada area bertumpuk', window.document.querySelectorAll('.daily-lines polygon').length, 0);
  ok('grafik tren punya label aksesibel', !!q('.line-chart svg[role="group"][aria-label]'));
  eq('setiap hari bisa dipilih', window.document.querySelectorAll('.trend-day').length, 30);
  const firstDay = q('.trend-day');
  firstDay.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
  eq('fokus menampilkan nominal lengkap', q('.trend-detail').textContent, firstDay.dataset.detail);
  ok('detail termasuk selisih', q('.trend-detail').textContent.includes('Selisih:'));
  q('.daily-lines svg').getBoundingClientRect = function () { return { left: 0, width: 720 }; };
  click(firstDay);
  ok('sentuh grafik memilih tanggal', !!q('.trend-day.is-active'));
  firstDay.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  eq('End memilih tanggal terakhir', window.document.activeElement, window.document.querySelectorAll('.trend-day')[29]);
  window.document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  eq('panah memilih hari sebelumnya', window.document.activeElement, window.document.querySelectorAll('.trend-day')[28]);
  ok('dashboard 30 hari tergambar', $('content').innerHTML.indexOf('30 hari terakhir') > -1);

  nav('rekap');
  V.state.rekap.ym = U.monthOf(U.today()); V.state.rekap.year = U.today().slice(0, 4);
  for (const tab of ['hari', 'minggu', 'bulan', 'tahun']) {
    V.state.rekap.tab = tab; App.render();
    ok('rekap ' + tab + ' memakai kolom vertikal', !!q('.column-chart .column-pair'));
    ok('rekap ' + tab + ' tidak memakai batang', !q('.grouped-chart'));
    ok('rekap ' + tab + ' memiliki dua seri kolom', !!q('.column-income') && !!q('.column-expense'));
    ok('rekap ' + tab + ' koordinat valid', !!q('.column-chart') && !q('.column-chart').outerHTML.includes('NaN'));
  }

  section('27. Pengaturan: tampilan statistik & Drive terkunci');
  nav('pengaturan');
  ok('bagian backup tampil', $('content').innerHTML.indexOf('Backup') > -1);
  ok('bagian Drive tampil', $('content').innerHTML.indexOf('Google Drive') > -1);
  ok('tombol unduh backup ada', $('content').innerHTML.indexOf('Unduh Backup') > -1);
  ok('Drive ditandai dinonaktifkan', $('content').innerHTML.indexOf('Dinonaktifkan') > -1);
  ok('alasan penguncian tertulis', $('content').innerHTML.indexOf('dinonaktifkan sementara') > -1);
  ok('tombol sambung drive ada', !!$('st-drive-connect'));
  ok('tombol sambung drive tidak bisa diklik', $('st-drive-connect').disabled === true);
  ok('field client id disembunyikan', !$('st-client'));
  ok('tombol kirim/ambil/putus tidak tampil', !$('st-drive-push') && !$('st-drive-pull') && !$('st-drive-off'));
  ok('penyimpanan tidak mengaku + Google Drive', $('content').innerHTML.indexOf('+ Google Drive') === -1);
  eq('saklar tampilan terbaca terkunci', V.driveTerkunci(), true);

  section('28. GDrive terkunci: semua jalan masuk harus ditolak');
  ok('modul GDrive termuat', !!window.GDrive && typeof window.GDrive.push === 'function' && typeof window.GDrive.pull === 'function');
  eq('saklar modul terbaca terkunci', window.GDrive.terkunci, true);
  ok('connect ditolak walau client id diisi', await window.GDrive.connect('abc.apps.googleusercontent.com').then(() => false).catch(() => true));
  ok('push ditolak', await window.GDrive.push(App.db).then(() => false).catch(() => true));
  ok('pull ditolak', await window.GDrive.pull().then(() => false).catch(() => true));
  ok('findFile ditolak', await window.GDrive.findFile().then(() => false).catch(() => true));
  App.db.settings.driveEnabled = true; App.db.settings.driveFileId = 'x';
  App._pushT = 'TIDAK-BOLEH-JALAN';
  App.save();
  eq('pemicu otomatis Drive mati saat terkunci', App._pushT, 'TIDAK-BOLEH-JALAN');
  App._pushT = null;
  App.db.settings.driveEnabled = false; App.db.settings.driveFileId = ''; App.save();

  section('29. Halaman Tahap 2: anggaran, target, langganan');
  App.db.budgets = []; App.db.goals = []; App.db.subscriptions = []; App.save();
  const catOut = App.db.categories.filter(c => c.type === 'out' && !c.archived)[0];
  const wlt = App.db.wallets[0];

  nav('anggaran');
  ok('halaman anggaran punya judul', $('page-title').textContent === 'Anggaran per Kategori');
  ok('tanpa anggaran tampil kotak kosong', $('content').innerHTML.indexOf('class="empty"') > -1 || $('content').innerHTML.indexOf('Belum ada anggaran') > -1);

  V.budgetForm();
  ok('form anggaran terbuka', $('modal-wrap').classList.contains('show'));
  eq('pilihan kategori terisi', $('b-cat').options.length > 0, true);
  setVal($('b-cat'), catOut.id); click($('b-cat'));
  setVal($('b-limit'), '500.000');
  click($('b-save'));
  eq('anggaran tersimpan', App.db.budgets.length, 1);
  eq('batas jadi angka', App.db.budgets[0].limit, 500000);
  eq('periode bawaan bulanan', App.db.budgets[0].period, 'month');
  ok('modal tertutup setelah simpan anggaran', !$('modal-wrap').classList.contains('show'));

  // anggaran ganda untuk kategori sama harus ditolak
  V.budgetForm();
  setVal($('b-cat'), catOut.id); click($('b-cat'));
  setVal($('b-limit'), '100.000');
  click($('b-save'));
  eq('kategori sama tidak boleh punya 2 anggaran', App.db.budgets.length, 1);
  V.modal.close();

  // batas 0 ditolak
  V.budgetForm(App.db.budgets[0].id);
  setVal($('b-limit'), '0');
  click($('b-save'));
  eq('batas 0 tidak menyimpan perubahan', App.db.budgets[0].limit, 500000);
  V.modal.close();

  // transaksi mengurangi sisa anggaran
  App.db.transactions = [];
  App.db.transactions.push(S.mkTx({ date: U.today(), type: 'out', amount: 200000, walletId: wlt.id, categoryId: catOut.id }));
  nav('anggaran');
  const u = S.budgetUsage(App.db, App.db.budgets[0], U.today());
  eq('pemakaian terbaca', u.used, 200000);
  eq('sisa anggaran', u.left, 300000);
  ok('kartu anggaran menampilkan sisa', $('content').innerHTML.indexOf('300.000') > -1);

  // hapus anggaran
  window.__setConfirm(true);
  await V.budgetDelete(App.db.budgets[0].id);
  eq('anggaran terhapus', App.db.budgets.length, 0);
  eq('transaksi tidak ikut terhapus', App.db.transactions.length, 1);

  section('30. Target tabungan di DOM');
  nav('target');
  ok('judul halaman target', $('page-title').textContent === 'Target Tabungan');
  V.goalForm();
  setVal($('g-name'), 'Dana darurat');
  setVal($('g-target'), '20.000.000');
  setVal($('g-saved'), '5.000.000');
  setVal($('g-due'), '2027-04-01');
  click($('g-save'));
  eq('target tersimpan', App.db.goals.length, 1);
  eq('target jadi angka', App.db.goals[0].target, 20000000);
  eq('terkumpul jadi angka', App.db.goals[0].saved, 5000000);

  V.goalForm();
  setVal($('g-name'), '');
  setVal($('g-target'), '100');
  click($('g-save'));
  eq('target tanpa nama ditolak', App.db.goals.length, 1);
  V.modal.close();

  const gid = App.db.goals[0].id;
  V.goalAdd(gid);
  ok('modal nabung terbuka', $('modal-wrap').classList.contains('show'));
  setVal($('ga-amt'), '2.500.000');
  click($('ga-save'));
  eq('saldo target bertambah', App.db.goals[0].saved, 7500000);

  V.goalAdd(gid, true);
  setVal($('ga-amt'), '10.000.000');
  click($('ga-save'));
  eq('tarik dibatasi sampai 0', App.db.goals[0].saved, 0);

  V.goalAdd(gid);
  setVal($('ga-amt'), '0');
  click($('ga-save'));
  eq('nabung 0 ditolak', App.db.goals[0].saved, 0);
  V.modal.close();

  window.__setConfirm(true);
  await V.goalDelete(gid);
  eq('target terhapus', App.db.goals.length, 0);

  section('31. Langganan di DOM');
  nav('langganan');
  ok('judul halaman langganan', $('page-title').textContent === 'Langganan Bulanan');
  V.subForm();
  setVal($('s-name'), 'Netflix');
  setVal($('s-amount'), '54.000');
  setVal($('s-day'), '20');
  setVal($('s-wallet'), wlt.id);
  click($('s-save'));
  eq('langganan tersimpan', App.db.subscriptions.length, 1);
  eq('nominal langganan', App.db.subscriptions[0].amount, 54000);
  eq('hari jatuh tempo', App.db.subscriptions[0].day, 20);
  eq('siklus bawaan bulanan', App.db.subscriptions[0].cycle, 'month');

  // mingguan membatasi hari ke 1..7
  V.subForm();
  setVal($('s-name'), 'Koran');
  setVal($('s-amount'), '15.000');
  setVal($('s-cycle'), 'week'); click($('s-cycle'));
  setVal($('s-day'), '9');
  click($('s-save'));
  eq('langganan mingguan tersimpan', App.db.subscriptions.length, 2);
  eq('hari mingguan dibatasi 7', App.db.subscriptions[1].day, 7);

  // tandai dibayar -> bikin transaksi + penanda
  const sid = App.db.subscriptions[0].id;
  const txCount = App.db.transactions.length;
  V.subPay(sid);
  eq('tandai dibayar membuat 1 transaksi', App.db.transactions.length, txCount + 1);
  const txBaru = App.db.transactions[App.db.transactions.length - 1];
  eq('nominal transaksi = nominal langganan', txBaru.amount, 54000);
  eq('jenis transaksi pengeluaran', txBaru.type, 'out');
  ok('catatan memuat penanda /sub:', txBaru.note.indexOf('/sub:' + sid + '/') > -1);
  eq('lastPaid terisi', App.db.subscriptions[0].lastPaid, U.today());
  eq('terbaca sebagai lunas', S.subPaidIn(App.db, App.db.subscriptions[0], U.monthOf(U.today())), true);

  // tidak bisa menandai lunas dua kali
  const txLagi = App.db.transactions.length;
  V.subPay(sid);
  eq('tidak dobel bayar', App.db.transactions.length, txLagi);

  // batalkan tanda lunas -> transaksi ikut hilang
  window.__setConfirm(true);
  await V.subUnpay(sid, U.monthOf(U.today()));
  eq('transaksi pembayaran dihapus', App.db.transactions.length, txLagi - 1);
  eq('tanda lunas hilang', S.subPaidIn(App.db, App.db.subscriptions[0], U.monthOf(U.today())), false);

  // matikan / aktifkan
  V.subToggle(sid);
  eq('langganan dimatikan', App.db.subscriptions[0].active, false);
  eq('yang mati tidak dihitung', S.subMonthlyTotal(App.db), 15000 * 52 / 12);
  V.subToggle(sid);
  eq('langganan diaktifkan lagi', App.db.subscriptions[0].active, true);

  window.__setConfirm(true);
  await V.subDelete(sid);
  eq('langganan terhapus', App.db.subscriptions.length, 1);

  section('32. Dashboard menampilkan ringkasan Tahap 2');
  App.db.budgets = [{ id: 'bd1', categoryId: catOut.id, limit: 400000, period: 'month' }];
  App.db.goals = [{ id: 'gl1', name: 'Liburan', icon: '🏖', target: 5000000, saved: 1000000, due: U.addMonths(U.today(), 6) }];
  App.db.subscriptions = [{ id: 'sb1', name: 'Spotify', amount: 55000, cycle: 'month', day: 25, active: true }];
  App.save();
  nav('dashboard');
  ok('kartu anggaran muncul di dashboard', $('content').innerHTML.indexOf('Anggaran Bulan Ini') > -1);
  ok('kartu langganan muncul di dashboard', $('content').innerHTML.indexOf('Langganan') > -1);
  ok('kartu target muncul di dashboard', $('content').innerHTML.indexOf('Target Tabungan') > -1);
  ok('bilah progres dirender', $('content').innerHTML.indexOf('prog-fill') > -1);
  ok('total langganan bulanan tampil', $('content').innerHTML.indexOf('55.000') > -1);

  App.db.budgets = []; App.db.goals = []; App.db.subscriptions = []; App.save();
  nav('dashboard');
  ok('tanpa data Tahap 2, dashboard bersih', $('content').innerHTML.indexOf('Anggaran Bulan Ini') === -1);

  section('33. Menghapus kategori/dompet membersihkan data Tahap 2');
  {
    const c2 = App.db.categories.filter(c => !c.archived)[0];
    const w2 = App.db.wallets[1] || App.db.wallets[0];
    App.db.budgets = [{ id: 'bx', categoryId: c2.id, limit: 100000, period: 'month' }];
    App.db.goals = [{ id: 'gx', name: 'X', icon: '🎯', target: 1000, saved: 0, walletId: w2.id }];
    App.db.subscriptions = [
      { id: 'sx1', name: 'S1', amount: 1000, cycle: 'month', day: 1, categoryId: c2.id, walletId: w2.id, active: true }
    ];
    App.db.transactions = [];
    App.save();

    window.__setConfirm(true);
    await V.catDelete(c2.id);
    eq('anggaran kategori ikut terhapus', App.db.budgets.length, 0);
    eq('langganan jadi tanpa kategori', App.db.subscriptions[0].categoryId, '');

    V.subDelete && 0;
    window.__setConfirm(true);
    await V.walletDelete(w2.id);
    eq('target jadi tanpa dompet', App.db.goals[0].walletId, '');
    eq('langganan jadi tanpa dompet', App.db.subscriptions[0].walletId, '');

    App.db.budgets = []; App.db.goals = []; App.db.subscriptions = []; App.save();
  }

  section('34. Halaman Profil (UI)');
  {
    const P = window.S.Profiles;
    nav('profil');
    ok('judul halaman profil', $('page-title').textContent === 'Profil');
    ok('daftar profil tampil', $('content').innerHTML.indexOf('profil-list') > -1);
    ok('nama profil pertama terlihat', $('content').innerHTML.indexOf('Pribadi') > -1);
    ok('tombol tambah profil ada', $('content').innerHTML.indexOf('Profil Baru</button>') > -1);
    ok('profil menjelaskan bukan akun pasangan', $('content').textContent.includes('bukan akun pasangan'));
    ok('profil menjelaskan data tidak digabung', $('content').textContent.includes('Data lama tidak otomatis digabung'));
    const kAsli = window.K;
    try {
      window.K = { terbuka: false, aktif: () => false };
      let tampilan = V.profil();
      ok('profil belum login menawarkan join', tampilan.includes('Masuk lalu gunakan kode pasangan'));
      ok('profil belum login menawarkan akun pertama', tampilan.includes('Buat akun pertama'));
      window.K = { terbuka: true, nama: 'Anggota', aktif: () => false };
      tampilan = V.profil();
      ok('profil login menawarkan tambah keluarga', tampilan.includes('Buka dashboard</a>') && tampilan.includes('href="/#/dashboard"'));
      ok('profil login menawarkan buku bersama', tampilan.includes('Buka buku keluarga'));
      ok('profil login tidak menawarkan akun baru', !tampilan.includes('Buat akun pertama'));
      window.K.aktif = () => true;
      tampilan = V.profil();
      ok('profil keluarga aktif ditandai', tampilan.includes('disabled>Buku keluarga sedang aktif'));
    } finally { window.K = kAsli; }
    const jml0 = P.list().length;

    // buat profil baru tanpa sandi -> langsung pindah ke sana
    V.profilForm();
    ok('form profil terbuka', $('modal-wrap').classList.contains('show'));
    ok('pilihan ikon ada', $('p-ikon').children.length > 4);
    ok('pilihan warna ada', $('p-warna').children.length > 4);
    setVal($('p-nama'), 'Usaha');
    const ikonPilih = $('p-ikon').children[1].dataset.emoji;
    const warnaPilih = $('p-warna').children[1].dataset.warna;
    click($('p-ikon').children[1]);
    click($('p-warna').children[1]);
    click($('p-save'));
    eq('profil bertambah', P.list().length, jml0 + 1);
    const baru = P.list().filter(p => p.name === 'Usaha')[0];
    eq('profil baru terbentuk', !!baru, true);
    eq('ikon sesuai yang diklik', baru.icon, ikonPilih);
    eq('warna sesuai yang diklik', baru.color, warnaPilih);
    eq('profil baru langsung aktif', P.activeId(), baru.id);
    const dbBaru = window.S.Persist.load();
    ok('profil baru punya data awal', !!dbBaru);
    eq('profil baru tanpa transaksi', dbBaru.transactions.length, 0);
    eq('profil baru dapat dompet bawaan', dbBaru.wallets.length, 3);
    eq('profil baru dapat kategori bawaan', dbBaru.categories.length, 18);
    eq('profil baru tanpa anggaran', dbBaru.budgets.length, 0);
    eq('profil baru saldo nol', window.S.totalBalance(dbBaru), 0);

    // nama kosong ditolak
    V.profilForm();
    setVal($('p-nama'), '   ');
    click($('p-save'));
    eq('nama kosong tidak menambah profil', P.list().length, jml0 + 1);
    ok('modal masih terbuka saat nama kosong', $('modal-wrap').classList.contains('show'));
    V.modal.close();

    // sandi tidak valid ditolak
    V.profilForm(baru.id);
    setVal($('p-pin'), '12');
    click($('p-save'));
    eq('sandi terlalu pendek ditolak', P.hasPin(P.get(baru.id)), false);
    V.modal.close();

    // pasang sandi yang sah
    V.profilForm(baru.id);
    setVal($('p-nama'), 'Usaha Dagang');
    setVal($('p-pin'), '4321');
    click($('p-save'));
    eq('nama diperbarui', P.get(baru.id).name, 'Usaha Dagang');
    eq('sandi terpasang', P.checkPin(baru.id, '4321'), true);
    ok('tombol kunci muncul di sidebar', !$('btn-kunci').hidden);

    // PIN salah -> tetap terkunci
    V.profilKunci();
    ok('profil terkunci', P.isLocked(baru.id));
    ok('layar sandi muncul', $('modal-wrap').classList.contains('show'));
    ok('layar sandi terkunci (tidak bisa ditutup sembarangan)', $('modal-wrap').classList.contains('locked'));
    V.modal.close();
    ok('modal terkunci menolak ditutup', $('modal-wrap').classList.contains('show'));
    setVal($('pg-pin'), '0000');
    click($('pg-ok'));
    ok('sandi salah tetap terkunci', P.isLocked(baru.id));
    ok('ada pesan kesalahan', $('pg-err').textContent.length > 0);

    // PIN benar -> terbuka
    setVal($('pg-pin'), '4321');
    click($('pg-ok'));
    eq('sandi benar membuka', P.isLocked(baru.id), false);
    ok('modal sandi tertutup', !$('modal-wrap').classList.contains('show'));

    // data tidak bocor antar profil
    window.App.db.transactions = [window.S.mkTx({ date: U.today(), type: 'out', amount: 111111, walletId: window.App.db.wallets[0].id, note: 'rahasia-usaha' })];
    window.App.save();
    const idUsaha = baru.id;
    const idPribadi = P.list()[0].id;

    V.profilPakai(idPribadi);
    ok('konfirmasi pindah profil muncul', $('modal-wrap').classList.contains('show'));
    click($('pp-ok'));
    eq('profil aktif pindah', P.activeId(), idPribadi);
    ok('catatan Usaha tidak terlihat', JSON.stringify(window.App.db.transactions).indexOf('rahasia-usaha') === -1);
    ok('judul dashboard kembali', window.App.view === 'dashboard');

    V.profilPakai(idUsaha);
    click($('pp-ok'));
    eq('balik ke Usaha', P.activeId(), idUsaha);
    ok('catatan Usaha muncul lagi', JSON.stringify(window.App.db.transactions).indexOf('rahasia-usaha') > -1);

    // hapus profil: harus ketik ulang nama
    const jml1 = P.list().length;
    V.profilDelete(idUsaha);
    ok('modal hapus terbuka', $('modal-wrap').classList.contains('show'));
    ok('tombol hapus awalnya mati', $('pd-ok').disabled === true);
    setVal($('pd-konfirm'), 'salah');
    ok('nama salah -> tombol tetap mati', $('pd-ok').disabled === true);
    setVal($('pd-konfirm'), 'Usaha Dagang');
    eq('nama benar -> tombol hidup', $('pd-ok').disabled, false);
    click($('pd-ok'));
    eq('profil terhapus', P.list().length, jml1 - 1);
    eq('aktif pindah ke profil lain', P.activeId(), idPribadi);
    ok('data profil terhapus hilang', window.S.Persist.loadFor(idUsaha) === null);

    // profil terakhir tidak bisa dihapus
    V.profilDelete(idPribadi);
    ok('hapus profil terakhir ditolak', $('modal-wrap').hidden === true);
    eq('profil terakhir masih ada', P.list().length, 1);

    // bersihkan: hapus sandi profil utama supaya tes lain tidak terkunci
    window.S.Profiles.update(idPribadi, {}, '');
    window.App.muatProfil();
    nav('dashboard');
  }

  console.log('\n' + '='.repeat(56));
  console.log('  LULUS: ' + pass + '   GAGAL: ' + fail);
  if (fail) { console.log('\n  Yang gagal:'); fails.forEach(f => console.log('   - ' + f)); }
  console.log('='.repeat(56));
  process.exit(fail ? 1 : 0);
})();