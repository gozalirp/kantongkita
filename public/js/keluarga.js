'use strict';
let revision = 0;
const el = id => document.getElementById(id);
const status = text => { el('status').textContent = text; };
async function api(path, body) {
  const r = await fetch('/api/family/' + path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || 'Layanan belum tersedia');
  return data;
}
async function load() {
  const me = await api('me');
  const result = await api('data');
  revision = result.revision;
  el('auth').hidden = true; el('family').hidden = false;
  el('identity').textContent = 'Login: ' + me.user.username + ' • Anggota: ' + me.members.map(m => m.username).join(', ');
  el('invite').hidden = me.user.role !== 'owner' || me.members.length === 2;
  el('transactions').replaceChildren();
  for (const t of result.data.transactions.slice().reverse()) {
    const li = document.createElement('li');
    li.textContent = `${t.date} • ${t.type === 'in' ? 'Masuk' : 'Keluar'} Rp${t.amount.toLocaleString('id-ID')} • ${t.note} • Dicatat oleh ${t.by}`;
    el('transactions').append(li);
  }
}
async function busy(button, action) {
  button.disabled = true;
  try { await action(); } catch (e) { status(e.message); } finally { button.disabled = false; }
}
el('account').onsubmit = e => {
  e.preventDefault();
  const form = e.target, values = Object.fromEntries(new FormData(form));
  busy(form.querySelector('button'), async () => {
    const result = await api(values.action, values);
    form.password.value = ''; form.code.value = '';
    if (values.action === 'login') { status('Berhasil login'); await load(); }
    else { status('Berhasil. Simpan kode pemulihan pribadi ini: ' + result.recovery + '. Setelah disimpan, pilih Login.'); form.elements.namedItem('action').value = 'login'; }
  });
};
el('transaction').date.value = new Date().toLocaleDateString('en-CA');
el('transaction').onsubmit = e => {
  e.preventDefault(); const form = e.target;
  busy(form.querySelector('button'), async () => {
    const transaction = Object.fromEntries(new FormData(form)); transaction.amount = Number(transaction.amount);
    await api('transaction', { revision, transaction });
    form.note.value = ''; form.amount.value = ''; status('Transaksi tersimpan'); await load();
  });
};
el('refresh').onclick = () => busy(el('refresh'), load);
el('invite').onclick = () => busy(el('invite'), async () => { const r = await api('invite', {}); status('Undangan privat, berlaku 24 jam: ' + r.code); });
el('logout').onclick = () => busy(el('logout'), async () => { await api('logout', {}); el('family').hidden = true; el('auth').hidden = false; el('transactions').replaceChildren(); status('Sudah logout'); });
load().catch(() => status('Silakan login atau aktifkan keluarga.'));
