/* Akun yang sudah berpasangan memakai satu buku keluarga; arsip pribadi tetap terpisah. */
(function (root) {
  'use strict';
  const B = root.Buku = { filter: 'semua', keluarga: null, akun: '', sibuk: false, memuat: false, pesan: '' };
  const koleksi = ['wallets', 'categories', 'transactions', 'budgets', 'goals', 'subscriptions'];
  const salin = x => JSON.parse(JSON.stringify(x));
  B.id = (sumber, id) => encodeURIComponent(JSON.stringify([sumber, id])).replace(/'/g, '%27');
  B.pribadi = function () {
    return root.K && root.K.aktif() ? root.S.normalize(root.S.Persist.load()) : root.App.db;
  };
  B.gabung = function (pribadi, keluarga, filter) {
    const hasil = root.S.normalize({});
    [['pribadi', pribadi], ['keluarga', keluarga]].forEach(function (pasangan) {
      const sumber = pasangan[0], db = pasangan[1];
      if (!db || (filter !== 'semua' && filter !== sumber)) return;
      koleksi.forEach(function (key) {
        hasil[key] = hasil[key].concat((db[key] || []).map(function (asal) {
          const x = salin(asal);
          x._sumber = sumber; x._id = asal.id;
          if (x.id) x.id = B.id(sumber, x.id);
          if (key === 'transactions' && x.note) {
            (db.subscriptions || []).forEach(function (sub) {
              x.note = x.note.split('/sub:' + sub.id + '/ ').join('/sub:' + B.id(sumber, sub.id) + '/ ');
            });
          }
          ['walletId', 'walletTo', 'categoryId', 'receiptId'].forEach(function (ref) {
            if (x[ref]) x[ref] = B.id(sumber, x[ref]);
          });
          if (key === 'goals' && Array.isArray(x.history)) x.history.forEach(h => { if (h.walletId) h.walletId = B.id(sumber, h.walletId); });
          if (['wallets', 'categories', 'goals', 'subscriptions'].includes(key)) x.name += ' · ' + (sumber === 'keluarga' ? 'Keluarga' : 'Pribadi');
          return x;
        }));
      });
      Object.keys(db.receipts || {}).forEach(function (id) { hasil.receipts[B.id(sumber, id)] = db.receipts[id]; });
    });
    return hasil;
  };
  B.berpasangan = function () { return !!(B.jumlah >= 2 && root.K && K.terbuka && B.akun === K.nama); };
  B.bersama = function () { return B.berpasangan() && B.filter !== 'pribadi'; };
  B.data = function () {
    if (B.berpasangan() && B.filter === 'pribadi') return B.gabung(B.pribadi(), null, 'pribadi');
    if (B.bersama()) {
      const db = B.gabung(null, B.keluarga, 'keluarga');
      ['wallets', 'categories', 'goals', 'subscriptions'].forEach(key => db[key].forEach(x => { x.name = x.name.replace(/ · Keluarga$/, ''); }));
      return db;
    }
    const keluarga = root.K && K.terbuka && B.akun === K.nama ? B.keluarga : null;
    return B.gabung(B.pribadi(), keluarga, B.filter);
  };
  /* Mengembalikan hasilnya supaya pemanggil tidak menebak-nebak:
     'ok' | 'sibuk' (muat lain sedang jalan) | 'keluar' (belum masuk) | 'gagal'. */
  B.muat = async function () {
    if (B.memuat || B.sibuk) return 'sibuk';
    if (!root.K || !K.terbuka) return 'keluar';
    B.memuat = true;
    B.pesan = '';
    try {
      const me = await fetch('/api/family/me', { credentials: 'same-origin', cache: 'no-store' });
      if (!me.ok) throw Error('Sesi keluarga tidak tersedia. Masuk kembali untuk memuat catatan bersama.');
      const identitas = await me.json();
      const username = identitas.user.username;
      if (B.akun !== username) B.keluarga = null;
      const response = await fetch('/api/family/data', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw Error('Buku keluarga belum bisa dimuat. Angka keluarga belum termasuk dalam ringkasan.');
      const data = await response.json();
      B.keluarga = root.S.normalize(data.data || {});
      B.revisi = data.revision;
      B.akun = username;
      K.nama = username;
      B.role = identitas.user.role;
      B.anggota = Array.isArray(identitas.members) ? identitas.members : [];
      B.jumlah = B.anggota.length;
    } catch (e) {
      B.keluarga = null;
      B.anggota = null;
      B.pesan = e.message || 'Buku keluarga belum bisa dimuat.';
    } finally {
      B.memuat = false;
      root.App.render();
    }
    return B.pesan ? 'gagal' : 'ok';
  };
  B.simpan = async function (db, revisi) {
    if (koleksi.some(key => (db[key] || []).some(x => x._sumber || x._id))) throw Error('Tampilan gabungan tidak boleh disimpan sebagai buku keluarga.');
    if (B.sibuk || B.memuat) throw Error('Tunggu proses keluarga yang sedang berjalan.');
    if (!B.keluarga || !root.K || !K.terbuka || B.akun !== K.nama) throw Error('Muat ulang buku keluarga sebelum menyimpan.');
    if (revisi !== B.revisi) throw Error('Buku keluarga sudah berubah. Tutup formulir lalu buka kembali.');
    B.sibuk = true;
    try {
      const r = await fetch('/api/family/save', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: revisi, book: K.rakit(db) })
      });
      if (r.status === 409) throw Error('Pasangan mengubah catatan. Tutup formulir, klik Muat ulang keluarga, lalu coba lagi.');
      if (!r.ok) throw Error('Belum tersimpan. Periksa koneksi atau sesi akun, lalu coba lagi.');
      const hasil = await r.json();
      B.revisi = hasil.revision === undefined ? revisi + 1 : hasil.revision;
      B.keluarga = salin(db);
    } finally { B.sibuk = false; }
  };
  B.pilih = async function (nilai) {
    if (!['semua', 'pribadi', 'keluarga'].includes(nilai)) return;
    if (B.sibuk || document.querySelector('#modal-wrap.show')) {
      root.V.toast('Selesaikan atau tutup formulir sebelum berpindah buku.', 'err'); return;
    }
    if (nilai === 'pribadi' && root.K && K.aktif()) await root.App.gantiMode('pribadi');
    B.filter = nilai;
    root.V.state.transaksi.walletId = ''; root.V.state.transaksi.catId = '';
    root.V.state.transaksi.by = '';
    root.App.render();
  };
  /* Siapa saja yang ada di keluarga ini — supaya pasangan langsung kelihatan,
     bukan cuma angkanya. Nama dibatasi supaya chip tetap satu baris, jumlah
     anggota diumumkan sebagai satu status utuh, bukan angka telanjang. */
  B.anggotaKeluarga = function () {
    const H = root.U.esc;
    if (!B.anggota || !B.anggota.length) return '';
    const chip = function (m) {
      const nama = String(m.username || '');
      const peran = (m.role === 'owner' ? 'Pemilik' : 'Anggota') + (nama === B.akun ? ' · kamu' : '');
      return '<li class="keluarga-anggota"><span class="keluarga-ava" aria-hidden="true">' + H(nama.slice(0, 1).toUpperCase()) + '</span>' +
        '<span class="keluarga-nama" title="' + H(nama) + '">' + H(nama) + '</span>' +
        '<span class="keluarga-peran">' + peran + '</span></li>';
    };
    return '<div class="keluarga-baris">' +
      '<span class="keluarga-judul">Keluarga</span>' +
      '<ul class="keluarga-daftar" aria-label="Anggota keluarga">' + B.anggota.map(chip).join('') + '</ul>' +
      '<span class="keluarga-jumlah" role="status" aria-atomic="true">' + B.anggota.length + ' anggota</span>' +
      (B.anggota.length < 2 ? '<span class="keluarga-kosong">Anggota kedua belum ada — bagikan kode undangan di atas.</span>' : '') +
      '</div>';
  };

  B.kontrol = function () {
    const H = root.U.esc;
    if (B.berpasangan()) return '<section class="card buku-kontrol buku-bersama" aria-label="Pilihan buku catatan">' +
      '<div class="seg buku-pemilih" role="group" aria-label="Pilih buku catatan">' +
      [['pribadi', 'Pribadi'], ['keluarga', 'Bersama']].map(function (p) {
        const aktif = p[0] === 'pribadi' ? !B.bersama() : B.bersama();
        return '<button type="button" aria-pressed="' + aktif + '" class="' + (aktif ? 'on' : '') + '" onclick="Buku.pilih(\'' + p[0] + '\')">' + p[1] + '</button>';
      }).join('') + '</div>' +
      '<p class="hint">' + (B.bersama() ? 'Catatan dan input baru terlihat oleh kamu dan pasangan.' : 'Catatan dan input baru hanya untuk akunmu. Tidak dibagikan ke pasangan.') + '</p>' +
      '<div class="buku-heading"><span class="buku-symbol" aria-hidden="true">' + root.U.icon('users') + '</span><div><h2>' + (B.bersama() ? 'Dashboard bersama' : 'Catatan pribadi') + '</h2><p>' + (B.bersama() ? 'Satu saldo dan catatan untuk berdua.' : 'Dompet dan transaksi milikmu sendiri.') + '</p></div>' +
      '<button class="btn sm" onclick="Buku.muat()"' + (B.memuat || B.sibuk ? ' disabled' : '') + '>' + root.U.icon('refresh') + (B.memuat ? 'Memuat…' : 'Muat ulang') + '</button></div>' +
      '<details class="buku-detail"><summary>Anggota &amp; pengelolaan keluarga</summary><div class="buku-detail-body">' + B.anggotaKeluarga() +
      '<p>Input di buku Bersama terlihat oleh kedua anggota. Data pribadi hanya dibagikan jika kamu memilihnya.</p><button class="btn" onclick="Buku.imporLama()">Pilih data lama untuk digabung</button></div></details>' +
      (B.pesan ? '<p class="buku-error" role="alert">' + H(B.pesan) + '</p>' : '') + '</section>';
    return '<section class="card buku-kontrol" aria-label="Catatan pribadi dan keluarga">' +
      '<div class="row"><div class="seg" role="group" aria-label="Tampilkan catatan">' +
      [['semua', 'Semua'], ['pribadi', 'Pribadi'], ['keluarga', 'Keluarga']].map(function (p) {
        return '<button type="button" aria-pressed="' + (B.filter === p[0]) + '" class="' + (B.filter === p[0] ? 'on' : '') + '" onclick="Buku.pilih(\'' + p[0] + '\')">' + p[1] + '</button>';
      }).join('') + '</div><span class="spacer"></span>' +
      (B.role === 'partner' ? '' : '<button class="btn primary" id="undang-pasangan" onclick="Buku.undang(this)">' + root.U.icon('plus') + 'Undang pasangan</button>') +
      '<button class="btn" onclick="Buku.muat()"' + (B.memuat || B.sibuk ? ' disabled' : '') + '>Muat ulang keluarga</button></div>' +
      '<div class="row"><button class="btn" onclick="Buku.dompet()"' + (!B.keluarga || B.sibuk || B.memuat ? ' disabled' : '') + '>Tambah dompet keluarga</button></div>' +
      B.anggotaKeluarga() +
      '<p class="hint">Pribadi hanya untuk kamu. Keluarga terlihat oleh kedua anggota. Data lama tidak otomatis dibagikan.</p>' +
      (B.memuat ? '<p role="status">Memuat catatan keluarga…</p>' : '') +
      (B.pesan ? '<p role="alert">' + H(B.pesan) + '</p>' : '') +
      (!B.keluarga && !B.memuat && !B.pesan ? '<p class="hint">Catatan keluarga belum dimuat. Ringkasan saat ini hanya mencakup data pribadi.</p>' : '') +
      '</section>';
  };
  B.undang = async function (button) {
    button.disabled = true;
    try {
      const r = await fetch('/api/family/invite', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Undangan belum bisa dibuat.');
      root.V.modal.open({
        title: 'Undang pasangan',
        body: '<p>Kirim kode ini ke pasangan. Berlaku 24 jam dan sekali pakai.</p>' +
          '<div class="field"><label for="undangan-kode">Kode undangan</label><input id="undangan-kode" readonly value="' + root.U.esc(data.code) + '"></div>' +
          '<div class="field"><label for="gabung-kode">Punya kode dari pasangan?</label>' +
            '<input id="gabung-kode" type="text" autocomplete="off" placeholder="Tempel kode dari pasangan">' +
            '<span class="hint">Masukkan kode yang kamu terima lalu klik Gabung: akun ini langsung ikut buku keluarga pasangan. Ditolak kalau akun ini sudah punya catatan bersama sendiri, supaya catatan tidak hilang.</span></div>',
        foot: '<button class="btn" data-close>Tutup</button><button class="btn primary" id="gabung-pakai">Gabung</button>'
      });
      const tombol = document.getElementById('gabung-pakai');
      tombol.onclick = async function () {
        const kode = document.getElementById('gabung-kode').value.trim();
        if (!kode) { root.V.toast('Tempel kode dari pasangan dulu.', 'err'); return; }
        tombol.disabled = true;
        try {
          const res = await fetch('/api/family/link', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: kode }) });
          const hasil = await res.json();
          if (!res.ok) throw Error(hasil.error || 'Kode itu tidak bisa dipakai.');
          root.V.modal.close();
          await B.muat();
          root.V.toast('Sudah tergabung. Buku keluarga pasangan langsung dimuat.', 'ok');
        } catch (e) { root.V.toast(e.message, 'err'); tombol.disabled = false; }
      };
    } catch (e) { root.V.toast(e.message, 'err'); }
    finally { button.disabled = false; }
  };
  B.dompet = function () {
    if (!B.keluarga) return;
    const db = salin(B.keluarga), revisi = B.revisi;
    root.V.modal.open({ title: 'Tambah dompet keluarga', body: '<p>Dompet ini dan seluruh transaksinya terlihat oleh pasangan. Dompet pribadi tidak dipindahkan.</p><div class="field"><label for="bk-name">Nama dompet</label><input id="bk-name" type="text" maxlength="100" placeholder="Contoh: Rumah tangga"></div><p class="hint">Saldo awal nol. Catat pemasukan untuk menambah saldo.</p>', foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="bk-save">Simpan</button>' });
    document.getElementById('bk-save').onclick = async function () {
      const name = document.getElementById('bk-name').value.trim();
      if (!name) { root.V.toast('Nama dompet wajib diisi.', 'err'); return; }
      const button = document.getElementById('bk-save'); button.disabled = true;
      const next = salin(db);
      next.wallets.push({ id: root.U.uid('w'), name: name, type: 'cash', icon: '👛', color: '#5147D9', initial: 0, archived: false });
      if (!next.categories.length) next.categories = root.S.seedDB().categories;
      try { await B.simpan(next, revisi); root.V.modal.close(); root.App.render(); root.V.toast('Dompet keluarga dibuat', 'ok'); }
      catch (e) { root.V.toast(e.message, 'err'); button.disabled = false; }
    };
  };
  B.catat = function () {
    const H = root.U.esc;
    const pribadi = B.pribadi();
    const daftar = [[ 'pribadi', B.bersama() ? null : pribadi ], ['keluarga', B.berpasangan() && !B.bersama() ? null : (root.K && K.terbuka && B.akun === K.nama ? B.keluarga : null)]];
    let opsi = '';
    daftar.forEach(function (p) {
      if (!p[1]) return;
      opsi += '<optgroup label="' + (p[0] === 'pribadi' ? 'Pribadi — hanya kamu' : 'Keluarga — terlihat oleh pasangan') + '">' +
        p[1].wallets.filter(w => !w.archived).map(w => '<option value="' + H(B.id(p[0], w.id)) + '">' + H(w.name) + '</option>').join('') + '</optgroup>';
    });
    root.V.modal.open({ title: 'Catat transaksi', body: '<div class="field"><label for="buku-dompet">Pilih dompet</label><select id="buku-dompet">' + opsi + '</select></div><p class="hint">Transaksi mengikuti pemilik dompet. Data pribadi tidak dikirim ke keluarga.</p>', foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="buku-lanjut">Lanjut</button>' });
    document.getElementById('buku-lanjut').onclick = async function () {
      const nilai = document.getElementById('buku-dompet').value;
      if (!nilai) { root.V.toast('Tambahkan dompet terlebih dahulu.', 'err'); return; }
      const pasangan = JSON.parse(decodeURIComponent(nilai));
      if (pasangan[0] === 'pribadi' && root.K && K.aktif()) await root.App.gantiMode('pribadi');
      root.V.txForm(null, null, pasangan[0], pasangan[1]);
    };
  };
  // Formulir bekerja pada salinan satu buku; payload gabungan tidak pernah ditulis.
  B.konteks = function (id, sumber) {
    let asli = id;
    try {
      const pair = JSON.parse(decodeURIComponent(id));
      if (Array.isArray(pair) && ['pribadi', 'keluarga'].includes(pair[0])) { sumber = pair[0]; asli = pair[1]; }
    } catch (_) {}
    sumber = B.bersama() ? 'keluarga' : (sumber || 'pribadi');
    if (sumber === 'keluarga' && (!B.keluarga || B.akun !== root.K.nama || !K.terbuka)) {
      root.V.toast('Muat ulang keluarga terlebih dahulu.', 'err'); return null;
    }
    return { id: asli, sumber: sumber, revisi: B.revisi, akun: B.akun,
      profil: root.S.Profiles.activeId(), pribadiAwal: JSON.stringify(root.App.db),
      db: salin(sumber === 'keluarga' ? B.keluarga : root.App.db) };
  };
  B.simpanKonteks = async function (ctx) {
    try {
      if (ctx.sumber === 'keluarga') {
        if (ctx.akun !== B.akun) throw Error('Akun berubah. Buka kembali formulir.');
        await B.simpan(ctx.db, ctx.revisi);
      }
      else {
        if (ctx.profil !== root.S.Profiles.activeId()) throw Error('Profil berubah. Buka kembali formulir.');
        if (JSON.stringify(root.App.db) !== ctx.pribadiAwal) throw Error('Catatan pribadi berubah. Buka kembali formulir.');
        root.App.db = ctx.db; root.App.saveAndRender();
      }
      root.App.render(); return true;
    } catch (e) {
      root.V.modal.close();
      root.V.toast(e.message + ' Buka kembali formulir untuk mencoba lagi.', 'err'); return false;
    }
  };
  B.pilihSumber = function (lanjut) {
    if (B.berpasangan()) { lanjut(B.bersama() ? 'keluarga' : 'pribadi'); return; }
    root.V.modal.open({ title: 'Simpan ke catatan mana?',
      body: '<div class="field"><label for="buku-sumber">Pemilik catatan</label><select id="buku-sumber"><option value="pribadi">Pribadi — hanya kamu</option><option value="keluarga">Keluarga — terlihat oleh pasangan</option></select></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="buku-pilih">Lanjut</button>' });
    document.getElementById('buku-sumber').value = B.filter === 'keluarga' ? 'keluarga' : 'pribadi';
    document.getElementById('buku-pilih').onclick = function () { lanjut(document.getElementById('buku-sumber').value); };
  };
  /* Salin pilihan secara eksplisit; ID stabil membuat pengulangan tidak menggandakan saldo. */
  B.salinLama = async function (asal, pilihan, profil) {
    const ctx = B.konteks(null, 'keluarga');
    if (!ctx || !B.berpasangan()) throw Error('Muat dashboard keluarga terlebih dahulu.');
    const dipilih = new Set(pilihan);
    if (!dipilih.size) throw Error('Pilih minimal satu dompet.');
    const transaksi = asal.transactions.filter(t => dipilih.has(t.walletId) || dipilih.has(t.walletTo));
    if (transaksi.some(t => !dipilih.has(t.walletId) || (t.walletTo && !dipilih.has(t.walletTo)))) {
      throw Error('Ada transfer antar dompet. Pilih juga dompet pasangannya agar saldo tetap benar.');
    }
    const kategori = new Set(transaksi.map(t => t.categoryId).filter(Boolean));
    const idBaru = async function (jenis, id) {
      const bytes = new TextEncoder().encode(JSON.stringify([B.akun, profil, jenis, id]));
      const hash = await root.crypto.subtle.digest('SHA-256', bytes);
      return 'lama_' + Array.from(new Uint8Array(hash)).slice(0, 16).map(x => x.toString(16).padStart(2, '0')).join('');
    };
    if ((asal.goals || []).some(g => (Array.isArray(g.history) ? g.history : []).some(h => h.walletId && !h.walletApplied && dipilih.has(h.walletId)))) {
      throw Error('Dompet memiliki riwayat tabungan versi uji lama. Impor ditunda agar saldo tidak berubah.');
    }
    const maps = { wallets: {}, categories: {} };
    for (const key of ['wallets', 'categories', 'transactions']) {
      const daftar = asal[key].filter(x => key === 'wallets' ? dipilih.has(x.id) : key === 'categories' ? kategori.has(x.id) : transaksi.includes(x));
      for (const item of daftar) {
        const x = salin(item), id = await idBaru(key, item.id);
        if (maps[key]) maps[key][item.id] = id;
        if (ctx.db[key].some(y => y.id === id)) continue;
        x.id = id;
        if (key === 'transactions') {
          x.walletId = maps.wallets[x.walletId];
          if (x.walletTo) x.walletTo = maps.wallets[x.walletTo];
          if (x.categoryId) x.categoryId = maps.categories[x.categoryId];
          delete x.receiptId;
        }
        ctx.db[key].push(x);
      }
    }
    if (!await B.simpanKonteks(ctx)) throw Error('Data lama belum digabung. Coba lagi setelah muat ulang.');
  };
  B.imporLama = function () {
    if (!B.berpasangan() || !B.keluarga) return;
    const asal = salin(B.pribadi()), profil = root.S.Profiles.activeId(), akun = B.akun;
    const H = root.U.esc;
    root.V.modal.open({ title: 'Pilih data lama untuk dibagikan',
      body: '<p>Pilih dompet dari profil perangkat ini. Saldo awal, transaksi, dan kategori terkait akan disalin ke dashboard bersama dan terlihat oleh pasangan. Data asli tetap disimpan.</p><p class="hint">Target, anggaran, langganan, dan gambar struk tidak ikut. Dompet dengan transfer harus dipilih bersama. Pilihan yang sudah pernah disalin tidak digandakan.</p>' +
        asal.wallets.map((x, i) => '<div class="field"><label><input type="checkbox" data-lama="' + i + '"> ' + H(x.name) + ' — saldo ' + root.U.fmtRp(root.S.walletBalances(asal)[x.id] || 0) + '</label></div>').join(''),
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="lama-simpan">Bagikan pilihan ke keluarga</button>' });
    document.getElementById('lama-simpan').onclick = async function () {
      const button = document.getElementById('lama-simpan'); button.disabled = true;
      try {
        if (akun !== B.akun || profil !== root.S.Profiles.activeId()) throw Error('Akun atau profil berubah. Buka kembali pilihan.');
        const ids = Array.from(document.querySelectorAll('[data-lama]:checked')).map(x => asal.wallets[Number(x.dataset.lama)].id);
        await B.salinLama(asal, ids, profil);
        root.V.modal.close(); root.V.toast('Pilihan sudah masuk dashboard bersama. Data asli tidak dihapus.', 'ok');
      } catch (e) { root.V.toast(e.message, 'err'); button.disabled = false; }
    };
  };
  B.hapus = async function (id) {
    if (!B.keluarga) return;
    const db = salin(B.keluarga), revisi = B.revisi;
    if (!await root.V.confirm('Hapus transaksi keluarga?', 'Pasangan juga tidak akan melihat transaksi ini lagi.', 'Hapus', true)) return;
    db.transactions = db.transactions.filter(t => t.id !== id);
    try { await B.simpan(db, revisi); root.App.render(); root.V.toast('Transaksi keluarga dihapus', 'ok'); }
    catch (e) { root.V.toast(e.message, 'err'); }
  };
})(window);
