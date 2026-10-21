'use strict';
let revision = 0;
let aksi = 'login';
let emailEnabled = false;
const el = id => document.getElementById(id);

const ACTION = {
  login:    { title: 'Masuk', submit: 'Masuk', code: false,
              passHint: 'Minimal 12 karakter.' },
  activate: { title: 'Buat akun', submit: 'Buat akun', code: false,
              passHint: 'Buat password baru minimal 12 karakter.' },
  join:     { title: 'Gabung keluarga', submit: 'Gabung', code: true,
              codeLabel: 'Kode undangan',
              codeHint: 'Dari pasangan. Berlaku 24 jam dan sekali pakai.',
              passHint: 'Buat password sendiri minimal 12 karakter.' },
  recover:  { title: 'Pulihkan akun', submit: 'Pulihkan', code: true,
              codeLabel: 'Kode pemulihan',
              codeHint: 'Kode yang ditampilkan sekali saat akun dibuat. Bukan password.',
              passHint: 'Masukkan password BARU minimal 12 karakter.' }
};

/* Beranda bisa membuka halaman ini langsung pada keperluan tertentu:
   ?aksi=aktivasi | masuk | undangan | pulih */
const DARI_TAUTAN = { aktivasi: 'activate', masuk: 'login', undangan: 'join', pulih: 'recover' };

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

/* Tab di layar hanya dua: Masuk dan Buat akun. Gabung lewat undangan dan
   pemulihan akun menumpang formulir yang sama, dibuka dari pintasan kecil. */
function pilihAksi(name) {
  if (!ACTION[name]) return;
  aksi = name;
  const tab = name === 'login' ? 'login' : 'activate';
  const input = document.querySelector('input[name="action"][value="' + tab + '"]');
  if (input) input.checked = true;
  syncActionUI();
}

function aksiDariTautan() {
  const diminta = new URLSearchParams(location.search).get('aksi');
  const name = DARI_TAUTAN[diminta];
  if (name) pilihAksi(name);
}

function syncActionUI() {
  const conf = ACTION[aksi];
  el('auth-title').textContent = conf.title;
  const needsEmail = emailEnabled && ['activate','join'].includes(aksi);
  el('email-field').hidden = !needsEmail;
  el('f-email').required = needsEmail;
  el('code-field').hidden = !conf.code;
  el('f-code').required = conf.code;
  el('code-label').textContent = conf.codeLabel || 'Kode';
  el('code-hint').textContent = conf.codeHint || '';
  el('pass-hint').textContent = conf.passHint;
  /* Petunjuk username cuma perlu sekali, bukan di setiap keadaan. */
  el('user-hint').hidden = aksi !== 'activate';
  el('submit').textContent = conf.submit;
  el('f-pass').setAttribute('autocomplete', aksi === 'login' ? 'current-password' : 'new-password');
  /* Pintasan yang sedang dipakai disembunyikan agar tidak membingungkan. */
  el('switch').hidden = aksi !== 'login';
  document.querySelectorAll('.k-mini a').forEach(a => { a.hidden = a.dataset.action === aksi; });
  document.querySelector('.k-mini').hidden = aksi !== 'login';
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
  /* Supaya dari halaman akun bisa langsung masuk ke buku bersama. */
  const bukaApp = el('buka-app');
  if (bukaApp) bukaApp.addEventListener('click', function () {
    try { localStorage.setItem('savingduit.mode', 'keluarga'); } catch (e) {}
  });
  el('invite').hidden = me.user.role !== 'owner' || me.members.length === 2;
  el('transactions').replaceChildren();
  const daftar = (result.data && result.data.transactions) || [];
  if (!daftar.length) {
    const li = document.createElement('li');
    li.className = 'k-muted';
    li.textContent = 'Belum ada catatan. Transaksi pertama kalian akan muncul di sini.';
    el('transactions').append(li);
  }
  for (const t of daftar.slice().reverse()) {
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
  input.addEventListener('change', () => pilihAksi(input.value));
});

document.querySelectorAll('[data-action]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    pilihAksi(a.dataset.action);
    el('f-user').focus();
  });
});

el('account').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const values = Object.fromEntries(new FormData(form));
  values.action = aksi;
  if (!ACTION[values.action].code) delete values.code;
  if (!emailEnabled || !['activate','join'].includes(aksi)) delete values.email;
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
    pilihAksi('login');
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
  pilihAksi('login');
  status('Sudah logout.', 'ok');
}));

api('email/config').then(data => { emailEnabled = data.enabled === true; syncActionUI(); }).catch(() => {});
syncActionUI();
aksiDariTautan();
load().catch(() => status('Masuk, atau buat akun kalau ini keluarga baru.'));