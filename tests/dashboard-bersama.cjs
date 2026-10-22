const assert = require('node:assert/strict');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');
const { JSDOM } = require('jsdom');
let book = { wallets: [], categories: [], transactions: [] }, revision = 0;
const copy = x => JSON.parse(JSON.stringify(x));
const html = fs.readFileSync('public/index.html', 'utf8').replace(/<script src="[^"]+"><\/script>/g, '');
const windows = [];
function client(username) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; windows.push(w);
  w.fetch = async () => { throw Error('offline'); };
  w.TextEncoder = TextEncoder;
  Object.defineProperty(w.crypto, 'subtle', { value: webcrypto.subtle });
  for (const file of ['util.js', 'store.js', 'gdrive.js', 'views.js', 'app.js']) w.eval(fs.readFileSync('public/js/' + file, 'utf8'));
  w.App.init();
  for (const file of ['keluarga-mode.js', 'buku-gabungan.js']) w.eval(fs.readFileSync('public/js/' + file, 'utf8'));
  w.K.nama = username; w.K.terbuka = true;
  w.fetch = async (url, options = {}) => {
    assert.notEqual(url, '/api/sync');
    if (url === '/api/family/me') return { ok: true, json: async () => ({ user: { username, role: username === 'dummy' ? 'owner' : 'partner' }, members: [{ username: 'dummy', role: 'owner' }, { username: 'dummy1', role: 'partner' }] }) };
    if (url === '/api/family/data') return { ok: true, json: async () => ({ revision, data: copy(book) }) };
    if (url === '/api/family/save') {
      const payload = JSON.parse(options.body);
      if (payload.revision !== revision) return { ok: false, status: 409 };
      book = copy(payload.book); revision++;
      return { ok: true, status: 200, json: async () => ({ revision }) };
    }
    throw Error('Unexpected endpoint ' + url);
  };
  w.$ = id => w.document.getElementById(id);
  return w;
}
(async () => {
  const a = client('dummy'), b = client('dummy1');
  const old = JSON.stringify(a.App.db);
  await a.Buku.muat(); await b.Buku.muat();
  assert(a.Buku.bersama());
  assert.equal(a.Buku.data().wallets.length, 0, 'local default wallets must not leak into shared dashboard');
  assert(!a.Buku.kontrol().includes('Buku.pilih('));
  assert(a.Buku.kontrol().includes('Pilih data lama'));
  a.App.go('dompet');
  a.V.walletForm(); a.$('w-name').value = 'Saldo dummy'; a.$('w-initial').value = '1250000';
  await a.$('w-save').onclick();
  assert.equal(book.wallets[0].initial, 1250000);
  assert(book.categories.some(c => c.type === 'in'), 'new shared wallet seeds income categories');
  assert(book.categories.some(c => c.type === 'out'), 'new shared wallet seeds expense categories');
  assert.equal(JSON.stringify(a.App.db), old, 'private original unchanged');
  await b.Buku.muat(); b.App.go('dompet');
  assert(b.$('content').textContent.includes('Saldo dummy'));
  assert.equal(b.S.totalBalance(b.Buku.data()), 1250000);
  assert.equal(a.S.totalBalance(a.Buku.data()), b.S.totalBalance(b.Buku.data()));
  // Simulate existing wallets created before the category fix.
  book.categories = []; b.Buku.keluarga.categories = [];
  b.V.txForm();
  assert(b.$('f-cat').options.length > 0, 'expense categories appear for an empty family category list');
  assert(b.$('f-cat').textContent.includes('Makan & Minum'));
  b.$('f-type').querySelector('[data-seg="in"]').click();
  assert(b.$('f-cat').options.length > 0, 'income categories appear when switching type');
  assert(b.$('f-cat').textContent.includes('Gaji'));
  assert(!b.$('f-cat').textContent.includes('Makan & Minum'));
  b.$('f-type').querySelector('[data-seg="out"]').click();
  b.$('f-amount').value = '1'; await b.$('f-save').onclick();
  assert(book.categories.some(c => c.id === book.transactions[0].categoryId), 'selected category persists with transaction');
  book.transactions = []; b.Buku.keluarga.transactions = [];
  b.V.catForm(null, 'out'); b.$('c-name').value = 'Makan'; await b.$('c-save').onclick();
  b.App.go('transaksi'); b.V.txForm();
  assert.equal(b.$('buku-dompet'), null, 'shared book opens transaction form directly');
  assert(b.$('f-amount'));
  b.$('f-amount').value = '50000'; b.$('f-note').value = 'Dari dummy1'; await b.$('f-save').onclick();
  await a.Buku.muat();
  assert.equal(a.S.totalBalance(a.Buku.data()), 1200000);
  assert.equal(a.Buku.data().transactions[0].note, 'Dari dummy1');
  assert.equal(JSON.stringify(a.App.db), old);
  // Settings from a stale editor cannot overwrite another member's save.
  a.V.walletForm(book.wallets[0].id); a.$('w-initial').value = '999';
  b.V.goalForm(); assert(b.$('g-name'), 'no personal/family picker for new goals');
  b.$('g-name').value = 'Bersama'; b.$('g-target').value = '100000'; await b.$('g-save').onclick();
  await a.$('w-save').onclick();
  assert.equal(book.wallets[0].initial, 1250000, '409 keeps server balance intact');
  await a.Buku.muat();
  // Explicit old-data selection: preserve references, initial balance and originals; repeat is idempotent.
  a.Buku.imporLama();
  assert.equal(a.document.querySelectorAll('[data-lama]:checked').length, 0);
  const source = a.S.normalize({ wallets: [{ id: 'oldw', name: 'Lama', initial: 100 }], categories: [{ id: 'oldc', name: 'Lama', type: 'out' }], transactions: [{ id: 'oldt', date: '2026-10-22', type: 'out', walletId: 'oldw', categoryId: 'oldc', amount: 10 }] });
  const before = JSON.stringify(source);
  await a.Buku.salinLama(source, ['oldw'], 'profil');
  const count = book.wallets.length;
  await a.Buku.salinLama(source, ['oldw'], 'profil');
  assert.equal(book.wallets.length, count);
  const imported = book.wallets.find(x => x.name === 'Lama');
  const tx = book.transactions.find(x => x.walletId === imported.id);
  assert(book.categories.some(x => x.id === tx.categoryId));
  assert.equal(a.S.walletBalances(book)[imported.id], 90);
  assert.equal(JSON.stringify(source), before);
  await b.Buku.muat();
  assert.equal(b.S.totalBalance(b.Buku.data()), a.S.totalBalance(a.Buku.data()));
  await assert.rejects(a.Buku.salinLama(a.S.normalize({ wallets: [{ id: 'a' }, { id: 'b' }], transactions: [{ id: 'move', type: 'move', walletId: 'a', walletTo: 'b', amount: 10 }] }), ['a'], 'profil'), /transfer/);

  /* Sinkronkan manual: buku keluarga yang gagal dimuat tidak boleh dilaporkan
     "berhasil", dan sesudah pulih pesannya kembali normal. */
  const fetchAsli = a.fetch;
  a.K.punyaCloud = false;
  a.Buku.keluarga = null;
  a.fetch = async url => {
    if (url === '/api/family/data') return { ok: false, status: 500, json: async () => ({}) };
    return fetchAsli(url);
  };
  a.$('toasts').textContent = '';
  await a.App.manualSyncCloud();
  const pesanGagal = a.$('toasts').textContent;
  assert(!pesanGagal.includes('berhasil'), 'gagal muat tidak dilaporkan berhasil: ' + pesanGagal);
  assert(pesanGagal.includes('belum bisa dimuat'), 'pesan galat sinkron jelas: ' + pesanGagal);
  assert(a.Buku.pesan, 'alasan gagal disimpan untuk ditampilkan di halaman');
  assert.equal(a.$('net-dot').textContent.trim(), 'Offline (Lokal)', 'status jaringan tidak dibuat "Cloud Aktif"');
  console.log('PASS: sync gagal tidak mengabarkan keberhasilan');

  a.fetch = fetchAsli;
  a.$('toasts').textContent = '';
  await a.App.manualSyncCloud();
  assert(a.$('toasts').textContent.includes('berhasil dimuat'), 'sync yang berhasil tetap melapor: ' + a.$('toasts').textContent);
  assert.equal(a.$('net-dot').textContent.trim(), 'Cloud Aktif', 'status jaringan kembali aktif');
  const muatGanda = a.Buku.muat();
  assert.equal(await a.Buku.muat(), 'sibuk', 'muat ulang ganda tidak menumpuk');
  assert.equal(await muatGanda, 'ok', 'muat tunggal melapor ok');
  a.K.punyaCloud = true;
  console.log('PASS: two-account shared wallets/initial balances/transactions/categories/goals, private isolation, stale-write guard, explicit selective import and no duplicate import');
})().then(() => { windows.forEach(w => w.close()); process.exit(0); }).catch(e => { console.error(e); windows.forEach(w => w.close()); process.exit(1); });
