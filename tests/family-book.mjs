/* Uji API buku bersama: aktivasi → simpan → baca → bentrok versi → tolak data rusak */
const B = 'http://127.0.0.1:8801';
const AKT = 'kode-aktivasi-lokal-uji';
let lulus = 0, gagal = 0;
const cek = (nama, syarat, info) => {
  if (syarat) { lulus++; console.log('  OK   ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + (info !== undefined ? ' → ' + JSON.stringify(info) : '')); }
};

async function panggil(path, opsi = {}) {
  const r = await fetch(B + '/api/family/' + path, {
    method: opsi.method || 'GET',
    headers: Object.assign({ 'Content-Type': 'application/json', Origin: B }, opsi.headers || {}),
    body: opsi.body ? JSON.stringify(opsi.body) : undefined
  });
  const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  return { status: r.status, body: await r.json().catch(() => ({})), cookie };
}

const buku = {
  wallets: [{ id: 'w_bca', name: 'BCA', type: 'bank', initial: 1000000 }],
  categories: [{ id: 'c_makan', name: 'Makan', type: 'out' }],
  transactions: [
    { id: 'tx_a', type: 'out', amount: 25000, date: '2026-10-19', note: 'nasi goreng', walletId: 'w_bca', categoryId: 'c_makan' },
    { id: 'tx_b', type: 'in', amount: 500000, date: '2026-10-18', note: 'gaji', walletId: 'w_bca' }
  ],
  budgets: [{ id: 'b_1', categoryId: 'c_makan', amount: 1000000 }],
  goals: [{ id: 'g_1', name: 'Liburan', target: 5000000, saved: 500000 }],
  subscriptions: [{ id: 's_1', name: 'Spotify', amount: 54000 }]
};

(async () => {
  console.log('1. Aktivasi');
  const user = 'uji_' + Math.random().toString(36).slice(2, 7);
  const a = await panggil('activate', { method: 'POST', body: { username: user, password: 'rahasia-panjang-123', code: AKT } });
  cek('aktivasi berhasil', a.status === 200, a);
  cek('kode pemulihan 64 karakter', (a.body.recovery || '').length === 64, (a.body.recovery || '').length);
  /* Aktivasi tidak membuat sesi (memang begitu alurnya) — masuk dulu. */
  const masuk = await panggil('login', { method: 'POST', body: { username: user, password: 'rahasia-panjang-123' } });
  cek('login setelah aktivasi', masuk.status === 200, masuk);
  const cookie = masuk.cookie;

  console.log('2. Buku awal kosong');
  const d0 = await panggil('data', { headers: { Cookie: cookie } });
  cek('revision 0', d0.body.revision === 0, d0.body);
  cek('belum ada transaksi', (d0.body.data.transactions || []).length === 0, d0.body.data);

  console.log('3. Simpan seluruh buku');
  const s1 = await panggil('save', { method: 'POST', headers: { Cookie: cookie }, body: { revision: 0, book: buku } });
  cek('simpan diterima', s1.status === 200, s1);

  console.log('4. Baca ulang');
  const d1 = await panggil('data', { headers: { Cookie: cookie } });
  cek('revision naik jadi 1', d1.body.revision === 1, d1.body.revision);
  const b = d1.body.data;
  cek('dompet tersimpan', b.wallets.length === 1 && b.wallets[0].name === 'BCA', b.wallets);
  cek('kategori tersimpan', b.categories.length === 1, b.categories);
  cek('2 transaksi tersimpan', b.transactions.length === 2, b.transactions.length);
  cek('anggaran tersimpan', b.budgets.length === 1, b.budgets);
  cek('target tersimpan', b.goals.length === 1 && b.goals[0].name === 'Liburan', b.goals);
  cek('langganan tersimpan', b.subscriptions.length === 1, b.subscriptions);
  cek('pencatat terisi otomatis', b.transactions[0].by === user, b.transactions[0].by);
  cek('dompet_id ikut (bukan cuma nominal)', b.transactions[0].walletId === 'w_bca', b.transactions[0]);
  cek('kategori_id ikut', b.transactions[0].categoryId === 'c_makan', b.transactions[0]);

  console.log('5. Tambah transaksi oleh anggota kedua');
  const inv = await panggil('invite', { method: 'POST', headers: { Cookie: cookie }, body: {} });
  cek('undangan dibuat', inv.status === 200 && !!inv.body.code, inv);
  const u2 = 'pasangan_' + Math.random().toString(36).slice(2, 5);
  const j = await panggil('join', { method: 'POST', body: { username: u2, password: 'rahasia-panjang-456', code: inv.body.code } });
  cek('anggota kedua gabung', j.status === 200, j);
  const masuk2 = await panggil('login', { method: 'POST', body: { username: u2, password: 'rahasia-panjang-456' } });
  cek('anggota kedua bisa masuk', masuk2.status === 200, masuk2);
  const c2 = masuk2.cookie;

  const d2 = (await panggil('data', { headers: { Cookie: c2 } })).body;
  cek('anggota kedua melihat buku yang sama', d2.data.transactions.length === 2, d2.data.transactions.length);
  const buku2 = JSON.parse(JSON.stringify(d2.data));
  buku2.transactions.push({ id: 'tx_c', type: 'out', amount: 8000, date: '2026-10-19', note: 'parkir', walletId: 'w_bca', categoryId: 'c_makan' });
  const s2 = await panggil('save', { method: 'POST', headers: { Cookie: c2 }, body: { revision: d2.revision, book: buku2 } });
  cek('anggota kedua bisa menyimpan', s2.status === 200, s2);

  const d3 = (await panggil('data', { headers: { Cookie: cookie } })).body;
  cek('anggota pertama melihat 3 transaksi', d3.data.transactions.length === 3, d3.data.transactions.length);
  const txA = d3.data.transactions.find(t => t.id === 'tx_a');
  const txC = d3.data.transactions.find(t => t.id === 'tx_c');
  cek('pencatat lama tetap tercatat', txA.by === user, txA.by);
  cek('pencatat baru tercatat', txC.by === u2, txC.by);

  console.log('6. Simpan dengan versi basi harus ditolak');
  const basi = await panggil('save', { method: 'POST', headers: { Cookie: cookie }, body: { revision: 0, book: buku } });
  cek('versi basi ditolak 409', basi.status === 409, basi.status);
  const terkini = (await panggil('data', { headers: { Cookie: cookie } })).body;
  cek('data tidak rusak setelah penolakan', terkini.data.transactions.length === 3, terkini.data.transactions.length);

  console.log('7. Data rusak ditolak');
  const jelek1 = await panggil('save', { method: 'POST', headers: { Cookie: cookie }, body: { revision: terkini.revision, book: { wallets: [], categories: [], budgets: [], goals: [], subscriptions: [], transactions: [{ id: 'x', type: 'z', amount: 1, date: '2026-10-19' }] } } });
  cek('jenis transaksi ngawur ditolak', jelek1.status === 409 || jelek1.status === 400, jelek1.status);
  const jelek2 = await panggil('save', { method: 'POST', headers: { Cookie: cookie }, body: { revision: terkini.revision, book: { transactions: [{ id: 'x', type: 'out', amount: 1.5, date: '2026-10-19' }] } } });
  cek('nominal pecahan ditolak', jelek2.status === 409 || jelek2.status === 400, jelek2.status);
  const sesudah = (await panggil('data', { headers: { Cookie: cookie } })).body;
  cek('revision tidak naik karena penolakan', sesudah.revision === terkini.revision, [sesudah.revision, terkini.revision]);

  console.log('8. Buku besar (melewati batas satu pernyataan SQL)');
  const besar = (await panggil('data', { headers: { Cookie: cookie } })).body;
  const bb = JSON.parse(JSON.stringify(besar.data));
  for (let i = 0; i < 3000; i++) bb.transactions.push({ id: 'tx_besar_' + i, type: i % 2 ? 'out' : 'in', amount: 1000 + i, date: '2026-10-19', note: 'catatan nomor ' + i, walletId: 'w_bca', categoryId: 'c_makan' });
  const b1 = await panggil('save', { method: 'POST', headers: { Cookie: cookie }, body: { revision: besar.revision, book: bb } });
  cek('buku 3000+ transaksi tersimpan', b1.status === 200, b1);
  const b2 = (await panggil('data', { headers: { Cookie: cookie } })).body;
  cek('semua transaksi terbaca kembali', (b2.data.transactions || []).length === bb.transactions.length, (b2.data.transactions || []).length + '/' + bb.transactions.length);
  cek('catatan terakhir utuh (tidak terpotong)', (b2.data.transactions.find(t => t.id === 'tx_besar_2999') || {}).note === 'catatan nomor 2999', (b2.data.transactions.find(t => t.id === 'tx_besar_2999') || {}).note);
  cek('dompet tetap ikut', (b2.data.wallets || []).length === 1, (b2.data.wallets || []).length);
  cek('pencatat lama masih benar setelah buku besar', (b2.data.transactions.find(t => t.id === 'tx_a') || {}).by === user, (b2.data.transactions.find(t => t.id === 'tx_a') || {}).by);

  console.log('9. Tanpa login tidak bisa');
  const anon = await panggil('save', { method: 'POST', body: { revision: 0, book: buku } });
  cek('tanpa sesi ditolak 401', anon.status === 401, anon.status);

  console.log('\nHASIL: ' + lulus + ' lulus, ' + gagal + ' gagal');
  process.exit(gagal ? 1 : 0);
})();