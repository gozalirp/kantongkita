// End-to-end family flow against a real Worker runtime (wrangler dev or production).
// Usage: BASE_URL=http://127.0.0.1:8790 ACTIVATION=<code> node tests/family-e2e.mjs
import assert from 'node:assert/strict';
const base = process.env.BASE_URL;
const activation = process.env.ACTIVATION;
if (!base || !activation) throw Error('BASE_URL and ACTIVATION are required');
let pass = 0;
const check = (label, ok) => { assert.ok(ok, label); console.log('  ✓', label); pass++; };
async function call(path, { body, cookie, origin = base } = {}) {
  const response = await fetch(`${base}/api/family/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await response.json(); } catch { /* keep null */ }
  const setCookie = response.headers.getSetCookie().find(c => c.startsWith('__Host-sd_session='));
  return { status: response.status, data, cookie: setCookie ? setCookie.split(';')[0] : null };
}
console.log('Alur akun keluarga:');
check('belum login ditolak', (await call('me')).status === 401);
check('origin asing ditolak', (await call('login', { body: { username: 'penyusup', password: 'password-panjang' }, origin: 'https://evil.test' })).status === 403);
const stamp = Date.now().toString(36).slice(-5);
const ownerPassword = 'password-rumah-panjang';
const partnerPassword = 'password-istri-panjang';

const activationAttempt = await call('activate', { body: { username: 'suami_' + stamp, password: ownerPassword, code: activation } });
check('aktivasi keluarga ditolak setelah keluarga ada atau berhasil', [409, 200].includes(activationAttempt.status));
let ownerName = 'suami_' + stamp;
if (activationAttempt.status === 409) {
  // A family already exists; use the stored credentials instead of creating a new one.
  ownerName = process.env.OWNER_USERNAME;
  if (!ownerName) { console.log('  • keluarga sudah aktif: lewati pengujian pembuatan akun'); process.exit(0); }
}
check('kode aktivasi salah ditolak', (await call('activate', { body: { username: 'x_' + stamp, password: ownerPassword, code: 'kode-palsu' } })).status === 403);
const login = await call('login', { body: { username: ownerName, password: ownerPassword } });
check('login pemilik berhasil', login.status === 200 && !!login.cookie);
check('password salah ditolak', (await call('login', { body: { username: ownerName, password: 'password-keliru-panjang' } })).status === 401);
check('username tidak dikenal ditolak', (await call('login', { body: { username: 'tidak_ada_' + stamp, password: ownerPassword } })).status === 401);
const owner = login.cookie;
const me = await call('me', { cookie: owner });
check('identitas pemilik dan anggota terbaca', me.status === 200 && me.data.user.role === 'owner' && me.data.members.length >= 1);
const invite = await call('invite', { cookie: owner, body: {} });
check('undangan hanya berlaku bila keluarga belum berisi dua anggota', [409, 200].includes(invite.status));
if (invite.status === 409) { console.log('  • keluarga sudah berisi dua anggota: pengujian pasangan dilewati'); console.log(`\nLULUS: ${pass}`); process.exit(0); }
const join = await call('join', { body: { username: 'istri_' + stamp, password: partnerPassword, code: invite.data.code } });
check('pasangan bergabung lewat undangan', join.status === 200 && typeof join.data.recovery === 'string');
check('undangan tidak bisa dipakai ulang', [403, 409].includes((await call('join', { body: { username: 'orang_' + stamp, password: partnerPassword, code: invite.data.code } })).status));
check('aktivasi ulang ditolak karena keluarga sudah ada', (await call('activate', { body: { username: 'lain_' + stamp, password: ownerPassword, code: activation } })).status === 409);
const partner = (await call('login', { body: { username: 'istri_' + stamp, password: partnerPassword } })).cookie;
check('login pasangan berhasil', !!partner);
check('pasangan tidak boleh mengundang', (await call('invite', { cookie: partner, body: {} })).status === 403);
const before = await call('data', { cookie: partner });
check('revisi awal terbaca', before.status === 200 && Number.isInteger(before.data.revision));
const tx = { date: '2026-10-19', type: 'out', amount: 150000, note: 'Belanja mingguan' };
check('pasangan mencatat transaksi', (await call('transaction', { cookie: partner, body: { revision: before.data.revision, transaction: tx } })).status === 200);
check('revisi lama ditolak', (await call('transaction', { cookie: owner, body: { revision: before.data.revision, transaction: tx } })).status === 409);
check('nominal tidak sah ditolak', (await call('transaction', { cookie: owner, body: { revision: before.data.revision + 1, transaction: { ...tx, amount: -5 } } })).status === 400);
const after = await call('data', { cookie: owner });
const saved = after.data.data.transactions.at(-1);
check('pemilik melihat catatan pasangan', saved && saved.note === 'Belanja mingguan' && saved.amount === 150000);
check('pencatat tercatat', saved.by === 'istri_' + stamp);
check('keluarga tetap dua anggota', (await call('me', { cookie: owner })).data.members.length === 2);
check('akun ketiga tidak pernah dibuat', (await call('login', { body: { username: 'orang_' + stamp, password: partnerPassword } })).status === 401);
check('revisi naik satu', after.data.revision === before.data.revision + 1);
check('pemilik bisa menambah catatan', (await call('transaction', { cookie: owner, body: { revision: after.data.revision, transaction: { ...tx, type: 'in', note: 'Bayar listrik' } } })).status === 200);
check('logout menghapus sesi', (await call('logout', { cookie: owner, body: {} })).status === 200);
check('sesi lama tidak berlaku', (await call('me', { cookie: owner })).status === 401);
console.log(`\nLULUS: ${pass}`);
