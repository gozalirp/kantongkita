'use strict';
(() => {
  const params = new URLSearchParams(location.hash.slice(1));
  const purpose = params.has('verify') ? 'verify' : params.has('reset') ? 'reset' : 'request-reset';
  const token = params.get(purpose) || '';
  if (location.hash) history.replaceState(null, '', location.pathname);
  const el = id => document.getElementById(id);
  if (purpose !== 'request-reset') {
    el('email-field').hidden = true;
    el('email-field').style.display = 'none';
    el('email-address').required = false;
    el('email-title').textContent = purpose === 'verify' ? 'Verifikasi email' : 'Buat password baru';
    el('email-hint').textContent = purpose === 'verify' ? 'Tekan tombol untuk mengonfirmasi alamat email Anda.' : 'Gunakan 12–128 karakter. Setelah reset, semua sesi lama akan ditutup.';
    el('password-field').hidden = purpose !== 'reset';
    el('password-field').style.display = purpose === 'reset' ? '' : 'none';
    el('email-password').required = purpose === 'reset';
    el('email-submit').textContent = purpose === 'verify' ? 'Verifikasi email saya' : 'Simpan password baru';
  }
  el('email-form').addEventListener('submit', async event => {
    event.preventDefault();
    el('email-submit').disabled = true;
    el('email-message').textContent = 'Memproses…';
    try {
      const response = await fetch('/api/family/email/' + purpose, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: el('email-address').value.trim(), password: el('email-password').value })
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Permintaan gagal.');
      el('email-message').textContent = data.message || (purpose === 'verify' ? 'Email terverifikasi. Email ini kini bisa dipakai untuk reset password.' : 'Password berhasil diubah. Silakan masuk dengan password baru.');
      if (purpose !== 'request-reset') { el('email-form').hidden = true; el('email-form').style.display = 'none'; }
      el('email-password').value = '';
    } catch (error) { el('email-message').textContent = error.message || 'Tidak bisa menghubungi server.'; }
    finally { el('email-submit').disabled = false; }
  });
})();
