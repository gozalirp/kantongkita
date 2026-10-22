'use strict';
(() => {
  const params = new URLSearchParams(location.hash.slice(1));
  const purpose = params.has('recover') ? 'recover' : params.has('verify') ? 'verify' : params.has('reset') ? 'reset' : 'request-reset';
  const token = params.get(purpose) || '';
  if (location.hash) history.replaceState(null, '', location.pathname);
  const el = id => document.getElementById(id);
  if (purpose === 'recover') {
    el('recovery-field').hidden = false; el('recovery-field').style.display = '';
    el('recovery-user').required = true; el('recovery-code').required = true;
  }
  if (purpose !== 'request-reset') {
    el('email-field').hidden = true;
    el('email-field').style.display = 'none';
    el('email-address').required = false;
    el('email-title').textContent = purpose === 'recover' ? 'Pulihkan dengan kode' : purpose === 'verify' ? 'Verifikasi email' : 'Buat password baru';
    el('email-hint').textContent = purpose === 'recover' ? 'Masukkan username, kode pemulihan, dan password baru minimal 12 karakter.' : purpose === 'verify' ? 'Tekan tombol untuk mengonfirmasi alamat email Anda.' : 'Gunakan 12–128 karakter. Setelah reset, semua sesi lama akan ditutup.';
    el('password-field').hidden = !['reset', 'recover'].includes(purpose);
    el('password-field').style.display = ['reset', 'recover'].includes(purpose) ? '' : 'none';
    el('email-password').required = ['reset', 'recover'].includes(purpose);
    el('email-submit').textContent = purpose === 'verify' ? 'Verifikasi email saya' : 'Simpan password baru';
  }
  el('email-form').addEventListener('submit', async event => {
    event.preventDefault();
    el('email-submit').disabled = true;
    el('email-message').textContent = 'Memproses…';
    try {
      const response = await fetch((purpose === 'recover' ? '/api/family/recover' : '/api/family/email/' + purpose), {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: el('email-address').value.trim(), username: el('recovery-user').value.trim(), code: el('recovery-code').value.trim(), password: el('email-password').value })
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
