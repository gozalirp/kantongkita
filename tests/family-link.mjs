// Memakai kode dari pasangan: akun yang sudah ada ikut buku keluarga pengundang.
// Usage: BASE_URL=http://127.0.0.1:8790 node tests/family-link.mjs
import assert from 'node:assert/strict';
const base = process.env.BASE_URL;
if (!base) throw Error('BASE_URL is required');
let pass = 0;
const check = (label, ok, info) => {
  assert.ok(ok, label + (info !== undefined ? ' → ' + JSON.stringify(info) : ''));
  console.log('  ✓', label); pass++;
};
async function call(path, { body, cookie, origin = base } = {}) {
  const response = await fetch(`${base}/api/family/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await response.json(); } catch { /* keep null */ }
  const setCookie = response.headers.getSetCookie().find((c) => c.startsWith('__Host-sd_session='));
  return { status: response.status, data, cookie: setCookie ? setCookie.split(';')[0] : null };
}
const daftar = async (nama) => {
  const password = 'password-panjang-123';
  const aktivasi = await call('activate', { body: { username: nama, password } });
  check('daftar ' + nama, aktivasi.status === 200, aktivasi.data);
  const masuk = await call('login', { body: { username: nama, password } });
  check('masuk ' + nama, masuk.status === 200 && !!masuk.cookie);
  return masuk.cookie;
};

console.log('Gabung ke keluarga pasangan dengan kode:');
const stamp = Date.now().toString(36).slice(-5);
const a = await daftar('link_a_' + stamp);
const undangan = await call('invite', { body: {}, cookie: a });
check('pemilik A membuat undangan', undangan.status === 200 && typeof undangan.data.code === 'string');
const kode = undangan.data.code;

const b = await daftar('link_b_' + stamp);
check('akun B belum tergabung', (await call('me', { cookie: b })).data.user.role === 'owner');
const gabung = await call('link', { body: { code: kode }, cookie: b });
check('B gabung dengan kode dari A', gabung.status === 200, gabung.data);

const bMe = await call('me', { cookie: b });
const aMe = await call('me', { cookie: a });
check('B jadi anggota kedua', bMe.data.user.role === 'partner', bMe.data.user);
check('satu keluarga untuk berdua', bMe.data.user.family_id === aMe.data.user.family_id);
check('jumlah anggota dua di kedua sisi', aMe.data.members.length === 2 && bMe.data.members.length === 2, aMe.data.members);
check('buku keluarga terbaca oleh B', (await call('data', { cookie: b })).status === 200);

check('kode bekas tidak bisa dipakai lagi', (await call('join', { body: { code: kode, username: 'x' + stamp, password: 'password-panjang-123' } })).status === 403);
check('anggota kedua tidak bisa gabung lagi', (await call('link', { body: { code: kode }, cookie: b })).status === 409);
check('anggota kedua tidak bisa mengundang', (await call('invite', { body: {}, cookie: b })).status === 403);

const c = await daftar('link_c_' + stamp);
check('kode ngawur ditolak', (await call('link', { body: { code: 'tidak-ada' }, cookie: c })).status === 403);
check('C tidak bisa memakai kodenya sendiri', (await call('link', { body: { code: (await call('invite', { body: {}, cookie: c })).data.code }, cookie: c })).status === 409);
const bukuC = { wallets: [{ id: 'w_1', name: 'Dompet C', type: 'cash', initial: 0 }], categories: [], transactions: [], budgets: [], goals: [], subscriptions: [] };
check('C menyimpan buku sendiri', (await call('save', { body: { revision: 0, book: bukuC }, cookie: c })).status === 200);
const d = await daftar('link_d_' + stamp);
const kodeD = (await call('invite', { body: {}, cookie: d })).data.code;
const tolak = await call('link', { body: { code: kodeD }, cookie: c });
check('ditolak kalau sudah punya catatan bersama', tolak.status === 409 && /catatan bersama/.test(tolak.data.error || ''), tolak.data);
check('C tetap pemilik keluarganya sendiri', (await call('me', { cookie: c })).data.user.role === 'owner');

console.log(`\n${pass} pemeriksaan lulus.`);
