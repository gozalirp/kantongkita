/* ============================================================
   uiGerbang.js — dashboard hanya terbuka setelah sesi terbukti.

   Aturan yang dipilih pemilik aplikasi: WAJIB MASUK, TANPA JALAN PINTAS.
   Jadi satu-satunya cara membuka dashboard adalah sesi yang sah dari
   server (GET /api/family/me -> 200). Server tidak terjangkau, jawaban
   aneh, atau 401: gerbang tetap tertutup.

   Konsekuensi yang disadari: kalau server mati, catatan lokal pun tidak
   bisa dibuka. Kalau nanti ingin dilonggarkan, ubah satu baris di
   `putuskan` di bawah (hasil 'ragu' -> true).
   ============================================================ */
(function (root) {
  'use strict';
  if (!root.K) return;

  const K = root.K;
  let diputuskan = false;
  let bersiap = null;

  function bolehBuka() {
    return diputuskan || K.terbuka;
  }

  function putuskan(hasil) {
    if (hasil === true) { diputuskan = true; return true; }
    if (hasil === 'ragu') root.App && (root.App._gerbangPesan = 'Tidak bisa menghubungi server. Periksa koneksi lalu muat ulang.');
    else if (hasil === 401 || hasil === false) root.App && (root.App._gerbangPesan = '');
    return false;
  }

  /* Satu gerbang per pemuatan halaman. Mengembalikan true kalau boleh render. */
  K.uiGerbang = function (balapan) {
    if (bolehBuka()) return Promise.resolve(true);
    if (bersiap) return bersiap;
    bersiap = Promise.resolve()
      .then(function () {
        return fetch('/api/family/email/config', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (data) {
          if (root.App) root.App._emailAktif = data.enabled === true;
        }).catch(function () {});
      })
      .then(function () { return K.periksaPribadi(balapan); })
      .catch(function () { return 'ragu'; })
      .then(function (hasil) { bersiap = null; return putuskan(hasil); });
    return bersiap;
  };

  /* Keadaan untuk render: true kalau dashboard boleh tampil. */
  K.bolehBuka = function () { return bolehBuka(); };

  /* Dipakai setelah login berhasil, dan oleh uji/halaman yang memang
     berjalan tanpa server. */
  K.bukaGerbang = function () {
    diputuskan = true;
    K.terbuka = true;
    /* Kalau gerbang sempat menutup dashboard sebelum ini, buka kembali. */
    if (root.App && root.App._gerbangTertutup) root.App.mulai();
  };
})(typeof window !== 'undefined' ? window : this);
