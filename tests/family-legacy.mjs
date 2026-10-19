/* Buku lama (satu baris di family_data) harus tetap terbaca oleh kode baru. */
import { execSync } from 'node:child_process';

const B = 'http://127.0.0.1:8801';
let lulus = 0, gagal = 0;
const cek = (n, ok, info) => {
  if (ok) { lulus++; console.log('  OK   ' + n); }
  else { gagal++; console.log('  GAGAL ' + n + (info !== undefined ? ' -> ' + JSON.stringify(info) : '')); }
};
const J = async (p, o = {}) => {
  const r = await fetch(B + '/api/family/' + p, {
    method: o.method || 'GET',
    headers: Object.assign({ 'Content-Type': 'application/json', Origin: B }, o.headers || {}),
    body: o.body ? JSON.stringify(o.body) : undefined
  });
  const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  return { status: r.status, body: await r.json().catch(() => ({})), cookie };
};

const db = (sql) => execSync(
  `npx wrangler d1 execute savingduit-db --local --command ${JSON.stringify(sql)}`,
  { stdio: 'pipe' }
);

(async () => {
  const pass = 'rahasia-panjang-123';
  const user = 'lama_' + Math.random().toString(36).slice(2, 6);
  await J('activate', { method: 'POST', body: { username: user, password: pass, code: 'kode-aktivasi-lokal-uji' } });
  const lg = await J('login', { method: 'POST', body: { username: user, password: pass } });
  cek('login', lg.status === 200);

  // Tiru keadaan produksi: satu baris family_data bentuk lama, tanpa potongan.
  const lama = {
    transactions: [{
      id: 'tx_lama', type: 'out', amount: 100000000, note: 'pasar',
      date: '2026-10-19', by: user, createdAt: '2026-10-19T09:14:23.205Z'
    }]
  };
  const fid = execSync(
    `npx wrangler d1 execute savingduit-db --local --json --command ${JSON.stringify("SELECT family_id FROM family_users WHERE username='" + user + "'")}`,
    { stdio: 'pipe' }
  ).toString();
  const familyId = JSON.parse(fid.slice(fid.indexOf('[')))[0].results[0].family_id;

  db(`DELETE FROM family_data_parts WHERE family_id='${familyId}'`);
  db(`INSERT OR REPLACE INTO family_data VALUES('${familyId}',1,'${JSON.stringify(lama)}',(SELECT id FROM family_users WHERE username='${user}'),1792401206)`);

  console.log('\nBuku lama dibaca lewat kode baru');
  const d = await J('data', { headers: { Cookie: lg.cookie } });
  cek('status 200', d.status === 200, d.status);
  cek('revisi terbaca (1)', d.body.revision === 1, d.body.revision);
  cek('transaksi lama tidak hilang', (d.body.data.transactions || []).length === 1, (d.body.data.transactions || []).length);
  cek('catatan "pasar" utuh', (d.body.data.transactions[0] || {}).note === 'pasar', (d.body.data.transactions[0] || {}).note);
  cek('nominal utuh', (d.body.data.transactions[0] || {}).amount === 100000000, (d.body.data.transactions[0] || {}).amount);
  cek('pencatat lama utuh', (d.body.data.transactions[0] || {}).by === user, (d.body.data.transactions[0] || {}).by);

  console.log('\nSimpan pertama memindahkannya ke format baru');
  await fetch(B + '/api/family/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: B, Cookie: lg.cookie },
    body: JSON.stringify({ revision: 1, book: { wallets: [], categories: [], transactions: [], budgets: [], goals: [], subscriptions: [] } })
  });
  const d2 = await J('data', { headers: { Cookie: lg.cookie } });
  cek('revisi naik ke 2', d2.body.revision === 2, d2.body.revision);
  cek('tersimpan dalam format baru', Array.isArray(d2.body.data.wallets), d2.body.data);

  const parts = execSync(
    `npx wrangler d1 execute savingduit-db --local --json --command ${JSON.stringify("SELECT COUNT(*) n FROM family_data_parts WHERE family_id='" + familyId + "'")}`,
    { stdio: 'pipe' }
  ).toString();
  cek('potongan terbentuk', JSON.parse(parts.slice(parts.indexOf('[')))[0].results[0].n >= 1, JSON.parse(parts.slice(parts.indexOf('[')))[0].results[0].n);

  console.log('\nHASIL: ' + lulus + ' lulus, ' + gagal + ' gagal');
  process.exit(gagal ? 1 : 0);
})();
