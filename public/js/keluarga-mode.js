/* ============================================================
   keluarga-mode.js — buku bersama dipakai dari aplikasi utama
   ------------------------------------------------------------
   Aplikasi punya dua sumber data:
     'pribadi'  → localStorage, per profil, offline penuh (perilaku lama)
     'keluarga' → server, satu buku untuk dua anggota, perlu internet

   Modul ini TIDAK menyentuh perhitungan atau tampilan. Tugasnya cuma:
     - mencatat mode aktif
     - memuat / menyimpan buku ke server
     - menjaga agar perubahan bersamaan tidak saling menimpa

   Aturan penting: semua halaman bekerja dari App.db seperti biasa. Bedanya
   hanya dari mana db itu berasal, dan ke mana ia disimpan.
   ============================================================ */
(function (root) {
  'use strict';

  const MODE_KEY = 'savingduit.mode';
  const API = '/api/family';

  const M = {
    mode: 'pribadi',
    /* revision yang dipegang klien. Server menolak simpan bila tidak sama. */
    revisi: 0,
    sanggup: false,     // sudah berhasil kosongkan server (percobaan selesai)
    sibuk: false,       // ada simpanan berjalan, cegah tumpang tindih
    antre: null,        // db terbaru yang menunggu dikirim
    nama: '',           // username yang sedang login di mode keluarga
  };

  function ambil(kunci) {
    try { return root.localStorage.getItem(kunci); } catch (e) { return null; }
  }
  function simpan(kunci, nilai) {
    try { root.localStorage.setItem(kunci, nilai); } catch (e) {}
  }

  /* Panggilan API. Selalu sertakan cookie sesi (same-origin). */
  function api(path, opsi) {
    return fetch(API + '/' + path, Object.assign({
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    }, opsi || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        return { status: r.status, body: body || {} };
      });
    });
  }

  M.aktif = function () { return M.mode === 'keluarga'; };

  M.init = function () {
    M.mode = ambil(MODE_KEY) === 'keluarga' ? 'keluarga' : 'pribadi';
    return M.mode;
  };

  /* Dipanggil saat App.muat(). Mengembalikan null kalau mode pribadi
     (biar App memakai localStorage seperti biasa). */
  M.muat = async function () {
    if (!M.aktif()) return null;
    const me = await api('me', { method: 'GET' });
    if (me.status !== 200) throw new Error('LOGIN');
    M.nama = (me.body.user && me.body.user.username) || '';
    const d = await api('data', { method: 'GET' });
    if (d.status !== 200) throw new Error('LOGIN');
    M.revisi = d.body.revision || 0;
    M.sanggup = false;
    return d.body.data || {};
  };

  /* Simpan ke server. db lokal tidak disentuh sama sekali di mode ini,
     jadi data pribadi user tetap utuh saat berpindah mode. */
  M.simpan = async function (db) {
    if (!M.aktif()) return 'pribadi';
    if (M.sibuk) { M.antre = db; return 'antre'; }
    M.sibuk = true;
    try {
      const buku = M.rakit(db);
      let hasil = await api('save', {
        method: 'POST',
        body: JSON.stringify({ revision: M.revisi, book: buku })
      });
      if (hasil.status === 409) {
        /* Data berubah di sisi lain. Sebut saja jumlah perubahan terkini;
           App yang memutuskan menampilkan pemberitahuan. */
        M.sibuk = false;
        return 'bentrok';
      }
      if (hasil.status === 401) { M.sibuk = false; return 'keluar'; }
      if (hasil.status !== 200) { M.sibuk = false; return 'gagal'; }
      M.revisi += 1;
      M.sibuk = false;
      if (M.antre) {
        const berikut = M.antre;
        M.antre = null;
        return M.simpan(berikut);
      }
      return 'ok';
    } catch (e) {
      M.sibuk = false;
      return 'luring';
    }
  };

  /* Ambil hanya koleksi yang dibagi. Struk (gambar) tidak dikirim ke server
     karena ukurannya besar dan tidak perlu dilihat pasangan. */
  M.rakit = function (db) {
    return {
      wallets: db.wallets || [],
      categories: db.categories || [],
      transactions: db.transactions || [],
      budgets: db.budgets || [],
      goals: db.goals || [],
      subscriptions: db.subscriptions || []
    };
  };

  /* Pindah mode. Bernilai balik objek { ok, pesan }. */
  M.pindah = async function (tujuan) {
    if (tujuan === M.mode) return { ok: true };
    if (tujuan === 'keluarga') {
      const me = await api('me', { method: 'GET' }).catch(function () { return { status: 0 }; });
      if (me.status !== 200) {
        return { ok: false, pesan: 'Masuk dulu ke akun keluarga.' };
      }
    }
    M.mode = tujuan;
    simpan(MODE_KEY, tujuan);
    M.sanggup = false;
    M.revisi = 0;
    return { ok: true };
  };

  M.keluar = function () {
    M.mode = 'pribadi';
    M.revisi = 0;
    M.sanggup = false;
    simpan(MODE_KEY, 'pribadi');
  };

  root.K = M;
})(window);