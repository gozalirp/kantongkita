'use strict';
let revision = 0;
const el = id => document.getElementById(id);

const ACTION = {
  login:    { label: 'Masuk',   submit: 'Masuk',            code: false, passHint: 'Masukkan password akun keluarga kalian.' },
  activate: { label: 'Aktivasi', submit: 'Buat keluarga',   code: true,
              codeLabel: 'Kode aktivasi privat',
              codeHint: 'Kode dari pemilik aplikasi. Hanya dipakai sekali, saat membuat keluarga.',
              passHint: 'Buat password baru minimal 12 karakter, hanya kalian yang tahu.' },
  join:     { label: 'Undangan', submit: 'Gabung keluarga', code: true,
              codeLabel: 'Kode undangan',
              codeHint: 'Dari pasangan. Berlaku 24 jam dan hanya bisa dipakai sekali.',
              passHint: 'Buat password sendiri minimal 12 karakter, tidak harus sama dengan pasangan.' },
  recover:  { label: 'Lupa sandi', submit: 'Pulihkan akun', code: true,
              codeLabel: 'Kode pemulihan',
              codeHint: 'Kode yang ditampilkan sekali saat akun dibuat. Bukan password.',
              passHint: 'Masukkan password BARU minimal 12 karakter.' }
};

const status = (text, kind) => {
  const node = el('status');
  node.textContent = text || '';
  node.className = 'k-status' + (kind ? ' ' + kind : '');
};

async function api(path, body) {
  const r = await fetch('/api/family/' + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.error || 'Layanan belum tersedia');
  return data;
}

function currentAction() {
  const picked = document.querySelector('input[name="action"]:checked');
  return picked ? picked.value : 'login';
}

/* Beranda bisa membuka halaman ini langsung pada keperluan tertentu:
   ?aksi=aktivasi | masuk | undangan | pulih */
const DARI_TAUTAN = { aktivasi: 'activate', masuk: 'login', undangan: 'join', pulih: 'recover' };

function pilihAksi(name) {
  const input = document.querySelector('input[name="action"][value="' + name + '"]');
  if (!input) return;
  input.checked = true;
  syncActionUI();
}

function aksiDariTautan() {
  const diminta = new URLSearchParams(location.search).get('aksi');
  const name = DARI_TAUTAN[diminta];
  if (name) pilihAksi(name);
}

function syncActionUI() {
  const action = currentAction();
  const conf = ACTION[action];
  el('code-field').hidden = !conf.code;
  el('f-code').required = conf.code;
  el('code-label').textContent = conf.codeLabel || 'Kode';
  el('code-hint').textContent = conf.codeHint || '';
  el('pass-hint').textContent = conf.passHint;
  el('submit').textContent = conf.submit;
  el('f-pass').setAttribute('autocomplete', action === 'login' ? 'current-password' : 'new-password');
  status('');
}

function showRecovery(code) {
  el('recovery').textContent = code;
  el('recovery-box').hidden = false;
}

async function load() {
  const me = await api('me');
  const result = await api('data');
  revision = result.revision;
  el('auth').hidden = true;
  el('family').hidden = false;
  el('recovery-box').hidden = true;
  el('identity').textContent = 'Halo, ' + me.user.username;
  el('invite').hidden = me.user.role !== 'owner' || me.members.length === 2;
  el('transactions').replaceChildren();
  if (!result.data.transactions.length) {
    const li = document.createElement('li');
    li.className = 'k-muted';
    li.textContent = 'Belum ada catatan. Transaksi pertama kalian akan muncul di sini.';
    el('transactions').append(li);
  }
  for (const t of result.data.transactions.slice().reverse()) {
    const li = document.createElement('li');
    const top = document.createElement('div');
    top.className = 'tx-top';
    const amt = document.createElement('span');
    amt.className = 'tx-amt ' + (t.type === 'in' ? 'in' : 'out');
    amt.textContent = (t.type === 'in' ? '+ ' : '− ') + 'Rp ' + t.amount.toLocaleString('id-ID');
    const meta = document.createElement('span');
    meta.className = 'tx-meta';
    meta.textContent = t.date + ' · dicatat ' + t.by;
    top.append(amt, meta);
    const note = document.createElement('div');
    note.className = 'tx-note';
    note.textContent = t.note;
    li.append(top, note);
    el('transactions').append(li);
  }
}

async function busy(button, action) {
  if (button) button.disabled = true;
  try { await action(); }
  catch (e) { status(e.message, 'err'); }
  finally { if (button) button.disabled = false; }
}

document.querySelectorAll('input[name="action"]').forEach(input => {
  input.addEventListener('change', syncActionUI);
});

el('account').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const values = Object.fromEntries(new FormData(form));
  values.action = currentAction();
  if (!ACTION[values.action].code) delete values.code;
  busy(el('submit'), async () => {
    status('Memproses…');
    const result = await api(values.action, values);
    form.password.value = '';
    form.code.value = '';
    if (values.action === 'login') {
      status('Berhasil masuk.', 'ok');
      await load();
      return;
    }
    showRecovery(result.recovery);
    document.querySelector('input[name="action"][value="login"]').checked = true;
    syncActionUI();
    status('Akun siap. Simpan kode pemulihan di bawah, lalu masuk dengan password barusan.', 'ok');
  });
});

el('copy').addEventListener('click', () => busy(el('copy'), async () => {
  try {
    await navigator.clipboard.writeText(el('recovery').textContent);
    el('copy').textContent = 'Tersalin';
    setTimeout(() => { el('copy').textContent = 'Salin'; }, 2000);
  } catch (e) {
    status('Tidak bisa menyalin otomatis. Salin manual kode di atas.', 'err');
  }
}));

el('transaction').date.value = new Date().toLocaleDateString('en-CA');
el('transaction').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector('button[type="submit"]');
  busy(button, async () => {
    const transaction = Object.fromEntries(new FormData(form));
    transaction.amount = Number(transaction.amount);
    await api('transaction', { revision, transaction });
    form.note.value = '';
    form.amount.value = '';
    await load();
    status('Transaksi tersimpan.', 'ok');
  });
});

el('refresh').addEventListener('click', () => busy(el('refresh'), async () => {
  await load();
  status('Sudah dimuat ulang.', 'ok');
}));

el('invite').addEventListener('click', () => busy(el('invite'), async () => {
  const r = await api('invite', {});
  status('Undangan privat, berlaku 24 jam: ' + r.code, 'ok');
}));

el('logout').addEventListener('click', () => busy(el('logout'), async () => {
  await api('logout', {});
  el('family').hidden = true;
  el('auth').hidden = false;
  el('transactions').replaceChildren();
  el('account').reset();
  document.querySelector('input[name="action"][value="login"]').checked = true;
  syncActionUI();
  status('Sudah logout.', 'ok');
}));

syncActionUI();
aksiDariTautan();
load().catch(() => status('Masuk, atau buat akun kalau ini keluarga baru.'));