/* ============================================================
   views.js — semua halaman
   ============================================================ */
(function (root) {
  'use strict';
  const U = root.U;
  const S = root.S;
  const V = {};
  const el = function (id) { return document.getElementById(id); };
  const H = function (s) { return U.esc(s); };

  /* ============================================================
     STATE per view (filter, tab, dsb)
     ============================================================ */
  V.state = {
    dashboard: { chart: '6m', range: 'month' },
    transaksi: { preset: 'month', walletId: '', type: 'all', catId: '', q: '', by: '', from: '', to: '' },
    rekap:     { tab: 'hari', ym: '', year: '' },
    dompet:    {},
    kategori:  { tab: 'out' },
    anggaran:  {},
    target:    {},
    langganan: {}
  };

  /* ============================================================
     GERBANG MASUK
     Dashboard tidak dibuka sebelum sesi terbukti. Halaman ini sengaja
     tidak menampilkan angka keuangan apa pun.
     ============================================================ */
  /* Satu layar, dua keperluan: masuk atau buat akun. Formulirnya sama,
     yang berubah hanya judul, tombol, dan endpoint yang dipanggil.
     Setelah akun dibuat, kode pemulihan tampil SEKALI di kartu ini
     (sebelumnya harus pindah ke halaman /keluarga dulu). */
  const KODE_SESI = 'savingduit.kodepemulihan';

  V.gerbangMasuk = function () {
    const lama = App._gerbangPesan || '';
    const kode = App._gerbangKode || '';
    if (kode) {
      return '' +
        '<div class="card gerbang-kartu">' +
          '<div class="gerbang-merek"><span class="ui-icon-wrap" aria-hidden="true">' + U.icon('wallet') + '</span>KantongKita</div>' +
          '<div class="gerbang-ikon">' + U.icon('check') + '</div>' +
          '<h2>Akun berhasil dibuat</h2>' +
          '<p class="muted gerbang-tip">Simpan kode di bawah. Kode ini hanya tampil sekali ' +
            'untuk cadangan pemulihan kalau password lupa.</p>' +
          '<div class="gerbang-kode" id="g-kode">' + U.esc(kode) + '</div>' +
          '<button class="btn" id="g-salin" type="button" style="width:100%">Salin kode</button>' +
          '<button class="btn primary" id="g-lanjut" type="button" style="width:100%;margin-top:10px">' +
            (App._gerbangAkun ? 'Masuk sekarang' : 'Ke halaman masuk') + '</button>' +
          '<p class="muted" id="g-pesan" style="margin-top:12px">' + U.esc(lama) + '</p>' +
        '</div>';
    }
    const daftar = App._gerbangDaftar === true;
    return '' +
      '<div class="card gerbang-kartu">' +
        '<div class="gerbang-merek"><span class="ui-icon-wrap" aria-hidden="true">' + U.icon('wallet') + '</span>KantongKita</div>' +
        '<div class="gerbang-ikon">' + U.icon(daftar ? 'user' : 'lock') + '</div>' +
        '<h2>' + (daftar ? 'Buat akun baru' : 'Masuk dulu untuk membuka catatan') + '</h2>' +
        '<div class="seg gerbang-tab" role="tablist" aria-label="Pilih keperluan">' +
          '<button type="button" role="tab" id="g-tab-masuk" aria-selected="' + (daftar ? 'false' : 'true') + '"' +
            ' class="' + (daftar ? '' : 'on') + '">Masuk</button>' +
          '<button type="button" role="tab" id="g-tab-daftar" aria-selected="' + (daftar ? 'true' : 'false') + '"' +
            ' class="' + (daftar ? 'on' : '') + '">Buat akun</button>' +
        '</div>' +
        '<p class="muted gerbang-tip">' +
          (daftar
            ? 'Akun baru langsung mendapat buku catatan sendiri, terpisah dari akun lain.'
            : 'Untuk bergabung, buat akun atau masuk dahulu, lalu gunakan kode pasangan lewat tombol Undang pasangan di dashboard.') +
        '</p>' +
        '<form id="g-form" autocomplete="on">' +
          '<div class="field"><label for="g-user">Username</label>' +
            '<input id="g-user" type="text" maxlength="32" autocomplete="username" required' +
            (daftar ? ' pattern="[A-Za-z0-9_]{3,32}" spellcheck="false" placeholder="3–32: huruf, angka, garis bawah"' : '') + '></div>' +
          (daftar && App._emailAktif ? '<div class="field"><label for="g-email">Email pemulihan</label><input id="g-email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" placeholder="nama@gmail.com" aria-describedby="g-email-hint" required><small class="email-hint" id="g-email-hint">Untuk reset password. Verifikasi lewat tautan di inbox.</small></div>' : '') +
          '<div class="field"><label for="g-pass">Password</label>' +
            '<input id="g-pass" type="password" maxlength="128" required' +
            ' autocomplete="' + (daftar ? 'new-password' : 'current-password') + '"' +
            (daftar ? ' minlength="12" placeholder="minimal 12 karakter"' : '') + '></div>' +
          '<button class="btn primary" id="g-masuk" type="submit" style="width:100%;margin-top:6px">' +
            (daftar ? 'Buat akun' : 'Masuk') + '</button>' +
        '</form>' +
        '<p class="muted" id="g-pesan" style="margin-top:12px">' + U.esc(lama) + '</p>' +
        '<p class="muted gerbang-bantu" style="margin-top:10px">' +
          (daftar
            ? '<button type="button" class="tautan" id="g-ke-masuk">Sudah punya akun? Masuk</button>'
            : '<a href="/akun-email">Lupa password?</a>') +
        '</p>' +
      '</div>';
  };

  V.gerbangBind = function () {
    const pesan = document.getElementById('g-pesan');

    /* --- keadaan "kode pemulihan tampil" --- */
    if (App._gerbangKode) {
      const salin = document.getElementById('g-salin');
      const lanjut = document.getElementById('g-lanjut');
      if (salin) salin.addEventListener('click', function () {
        const kode = App._gerbangKode;
        const beres = function () {
          salin.textContent = 'Tersalin';
          setTimeout(function () { salin.textContent = 'Salin kode'; }, 2000);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(kode).then(beres, function () {
          if (pesan) pesan.textContent = 'Tidak bisa menyalin otomatis. Salin manual kode di atas.';
        });
        else if (pesan) pesan.textContent = 'Salin manual kode di atas.';
      });
      if (lanjut) lanjut.addEventListener('click', function () {
        const akun = App._gerbangAkun;
        App._gerbangKode = '';
        try { sessionStorage.removeItem(KODE_SESI); } catch (e) {}
        if (!akun) { App._gerbangDaftar = false; App.render(); return; }
        lanjut.disabled = true;
        if (pesan) pesan.textContent = 'Memeriksa…';
        fetch('/api/family/login', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: akun.user, password: akun.pass })
        }).then(function (r) {
          if (r.status !== 200) throw new Error('gagal');
          location.reload();
        }).catch(function () {
          lanjut.disabled = false;
          App._gerbangAkun = null;
          App._gerbangDaftar = false;
          App._gerbangPesan = 'Akun sudah dibuat. Silakan masuk dengan password tadi.';
          App.render();
        });
      });
      return;
    }

    /* --- keadaan formulir --- */
    const form = document.getElementById('g-form');
    if (!form) return;
    const tombol = document.getElementById('g-masuk');

    function pindah(daftar) {
      App._gerbangDaftar = daftar;
      App._gerbangPesan = '';
      App.render();
    }
    const tabMasuk = document.getElementById('g-tab-masuk');
    const tabDaftar = document.getElementById('g-tab-daftar');
    if (tabMasuk) tabMasuk.addEventListener('click', function () { if (App._gerbangDaftar) pindah(false); });
    if (tabDaftar) tabDaftar.addEventListener('click', function () { if (!App._gerbangDaftar) pindah(true); });
    const keMasuk = document.getElementById('g-ke-masuk');
    if (keMasuk) keMasuk.addEventListener('click', function () { pindah(false); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const daftar = App._gerbangDaftar === true;
      const user = document.getElementById('g-user').value.trim();
      const pass = document.getElementById('g-pass').value;
      const emailField = document.getElementById('g-email');
      const email = emailField ? emailField.value.trim() : undefined;
      if (!user || !pass) { pesan.textContent = 'Username dan password wajib diisi.'; return; }
      if (daftar && user.length < 3) { pesan.textContent = 'Username minimal 3 karakter.'; return; }
      if (daftar && pass.length < 12) { pesan.textContent = 'Password minimal 12 karakter.'; return; }
      tombol.disabled = true;
      pesan.textContent = daftar ? 'Membuat akun…' : 'Memeriksa…';
      fetch('/api/family/' + (daftar ? 'activate' : 'login'), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass, email: email })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; });
      }).then(function (hasil) {
        tombol.disabled = false;
        if (hasil.status === 200) {
          if (!daftar) { location.reload(); return; }
          /* Kode disimpan hanya di memori + sessionStorage (hilang saat tab
             ditutup), bukan localStorage: ini kunci pemulihan akun. */
          const kode = hasil.body.recovery || '';
          App._gerbangPesan = email ? (hasil.body.emailSent ? 'Email verifikasi dikirim. Periksa inbox atau spam.' : 'Akun dibuat, tetapi email belum terkirim. Setelah masuk, kirim ulang melalui Menu.') : '';
          App._gerbangKode = kode;
          App._gerbangAkun = kode ? { user: user, pass: pass } : null;
          if (kode) { try { sessionStorage.setItem(KODE_SESI, kode); } catch (e2) {} }
          App.render();
          return;
        }
        pesan.textContent = hasil.status === 429
          ? 'Terlalu banyak percobaan. Tunggu 15 menit.'
          : (hasil.body.error || (daftar ? 'Gagal membuat akun.' : 'Username atau password salah.'));
      }).catch(function () {
        tombol.disabled = false;
        pesan.textContent = 'Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.';
      });
    });
  };

  /* ============================================================
     TOAST & MODAL & CONFIRM
     ============================================================ */
  V.toast = function (msg, kind) {
    const box = el('toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.textContent = msg;
    box.appendChild(d);
    /* Satu toast = satu ikon status di kiri; teksnya bersih dari emoji supaya
       tidak ada dua bahasa ikon dalam satu kotak. */
    const statusKind = kind === 'err' ? 'alert' : kind === 'ok' ? 'check' : 'info';
    d.innerHTML = '<span class="ui-icon-wrap toast-ic">' + U.icon(statusKind) + '</span><span class="toast-txt"></span>';
    d.querySelector('.toast-txt').textContent = msg;
    setTimeout(function () {
      d.style.transition = 'opacity .25s, transform .25s';
      d.style.opacity = '0'; d.style.transform = 'translateX(20px)';
      setTimeout(function () { d.remove(); }, 260);
    }, 2600);
  };

  let modalOnClose = null;
  let modalLocked = false;

  // iOS keyboard resizes the visual viewport, not always the layout viewport/dvh.
  function fitModalViewport() {
    const viewport = root.visualViewport;
    const wrap = el('modal-wrap');
    if (!viewport || !wrap) return;
    wrap.style.setProperty('--modal-viewport-height', viewport.height + 'px');
    wrap.style.setProperty('--modal-viewport-top', viewport.offsetTop + 'px');
  }
  if (root.visualViewport) {
    root.visualViewport.addEventListener('resize', fitModalViewport);
    root.visualViewport.addEventListener('scroll', fitModalViewport);
  }

  V.modal = {
    open: function (opt) {
      opt = opt || {};
      el('modal-title').innerHTML = opt.title || '';
      el('modal-body').innerHTML = opt.body || '';
      el('modal-foot').innerHTML = opt.foot || '';
      U.polishIcons(el('modal'));
      U.ikatLabel(el('modal'));
      fitModalViewport();
      el('modal-body').scrollTop = 0;
      el('modal-wrap').hidden = false;
      el('modal-wrap').classList.add('show');
      el('modal-wrap').classList.toggle('locked', !!opt.lock);
      modalLocked = !!opt.lock;
      modalOnClose = opt.onClose || null;
      const first = el('modal-body').querySelector('input:not([type=hidden]),select,textarea');
      // Do not summon the phone keyboard before the user chooses a field.
      if (first && !(root.matchMedia && root.matchMedia('(pointer: coarse)').matches)) setTimeout(function () {
        if (first.isConnected && el('modal-wrap').classList.contains('show')) first.focus({ preventScroll: true });
      }, 40);
    },
    close: function (force) {
      if (modalLocked && !force) return;      // modal terkunci hanya bisa ditutup dari dalam
      modalLocked = false;
      el('modal-wrap').hidden = true;
      el('modal-wrap').classList.remove('show', 'locked');
      el('modal-body').innerHTML = '';
      el('modal-foot').innerHTML = '';
      const cb = modalOnClose; modalOnClose = null;
      if (cb) cb();
    },
    locked: function () { return modalLocked; },
    body: function () { return el('modal-body'); },
    setFoot: function (html) { el('modal-foot').innerHTML = html; U.polishIcons(el('modal-foot')); }
  };

  V.confirm = function (title, msg, okLabel, danger) {
    return new Promise(function (resolve) {
      V.modal.open({
        title: title,
        body: '<p class="dim" style="font-size:14px;line-height:1.6">' + msg + '</p>',
        foot: '<button class="btn" data-close>Batal</button>' +
              '<button class="btn ' + (danger ? 'danger' : 'primary') + '" id="cf-ok">' + (okLabel || 'Lanjut') + '</button>',
        onClose: function () { resolve(false); }
      });
      el('cf-ok').onclick = function () { resolve(true); V.modal.close(); };
    });
  };

  /* ============================================================
     HELPER UMUM
     ============================================================ */
  function walletMap(db) { const m = {}; (db.wallets || []).forEach(function (w) { m[w.id] = w; }); return m; }
  function catMap(db) { const m = {}; (db.categories || []).forEach(function (c) { m[c.id] = c; }); return m; }

  function walletOptions(db, sel, filterFn) {
    return (db.wallets || []).filter(function (w) { return !w.archived && (!filterFn || filterFn(w)); })
      .map(function (w) {
        return '<option value="' + H(w.id) + '"' + (w.id === sel ? ' selected' : '') + '>' +
          H(w.icon + ' ' + w.name) + '</option>';
      }).join('');
  }
  function categoryOptions(db, sel, type) {
    return (db.categories || []).filter(function (c) { return !c.archived && (!type || c.type === type); })
      .map(function (c) {
        return '<option value="' + H(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' +
          H(c.icon + ' ' + c.name) + '</option>';
      }).join('');
  }

  function segBtn(active, val, label, cls) {
    const on = active === val;
    return '<button type="button" data-seg="' + H(val) + '" class="' + (on ? 'on ' + (cls || '') : '') +
      '" aria-pressed="' + (on ? 'true' : 'false') + '">' + label + '</button>';
  }
  /* Panah arah dana bukan emoji: dipakai sebagai penanda arah, bukan hiasan. */
  const ARAH = { in: '↓ ', out: '↑ ', move: '⇄ ' };

  /* Emoji data pengguna (kategori, dompet, target) tetap emoji; hanya diberi
     pembungkus supaya ukurannya terkendali dan tidak ikut dikonversi. */
  function emo(e) { return '<span class="ui-emoji" aria-hidden="true">' + H(e) + '</span>'; }

  /* Ikon di dalam tombol berlabel: jarak ikon ke teks diatur oleh gap .btn,
     jadi teksnya tidak perlu spasi pembuka lagi. */
  function wrapIco(shape) {
    return '<span class="ui-icon-wrap" aria-hidden="true">' + U.icon(shape) + '</span>';
  }

  /* Pilihan ikon & warna. Emoji di sini tetap emoji karena ini data yang
     dipilih pengguna, bukan hiasan kontrol; hanya dibungkus .ui-emoji supaya
     ukurannya terkendali dan tidak ikut dikonversi jadi SVG. */
  const IKON_DOMPET = ['🏦','💳','💵','🐖','👛','📱','🏧','💼','📈','🏠'];
  const IKON_TARGET = ['🎯','🏠','✈️','🚗','💻','📚','💍','🎓','🐖','🎁'];
  const IKON_LANGGANAN = ['🔁','📶','🎬','🎵','☁️','📱','💡','🛡️','📺','🎮'];
  const AVATAR_PROFIL = ['Arga','Bima','Danu','Raka','Yoga','Alya','Citra','Dinda','Naya','Tara'];
  function avatarNama(icon) {
    return AVATAR_PROFIL.find(function (name) { return icon === 'avatar:' + name.toLowerCase(); });
  }
  function profilIcon(icon) {
    const name = avatarNama(icon);
    return name ? '<img class="profile-avatar" src="/avatars/' + name.toLowerCase() + '.svg" alt="Avatar ' + name + '" width="64" height="64">' : emo(icon);
  }
  const IKON_PROFIL = ['🏠', '💼', '👦', '👧', '💰', '🎓', '🏢', '🧑', '👨‍👩‍👧', '🐷'];
  const WARNA_DOMPET = ['#22c55e', '#3d7bff', '#a78bfa', '#fbbf24', '#f4586c', '#06b6d4', '#ec4899', '#94a3b8'];
  const WARNA_PROFIL = ['#5b8def', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#ec4899', '#64748b'];

  function pilihanEmoji(id, daftar, kini) {
    return '<div class="ikon-pilih" id="' + id + '">' + daftar.map(function (e) {
      const on = e === kini;
      return '<button type="button" class="ikon-btn' + (on ? ' on' : '') + '" data-emoji="' + H(e) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Ikon ' + H(e) + '">' + emo(e) + '</button>';
    }).join('') + '</div>';
  }
  /* Bentuk swatch dipakai untuk dua jenis data berbeda, jadi nama atributnya
     ikut dikirim: dompet memakai data-color, profil memakai data-warna. */
  function pilihanSwatch(id, daftar, kini, attr) {
    return '<div class="warna-pilih" id="' + id + '">' + daftar.map(function (c) {
      const on = c === kini;
      return '<button type="button" class="warna-btn' + (on ? ' on' : '') + '" ' + attr + '="' + H(c) + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="Warna ' + H(c) + '" style="background:' + H(c) + '"></button>';
    }).join('') + '</div>';
  }
  /* Satu pilihan aktif per kelompok: kelas .on untuk mata, aria-pressed untuk
     pembaca layar. Tidak ada lagi border/background yang ditulis dari JS. */
  function tandaiPilihan(box, aktif) {
    if (!box) return;
    Array.prototype.forEach.call(box.children, function (b) {
      const on = b === aktif;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* Tombol aksi berikon: satu bentuk untuk semua baris. Label teks tetap ada
     sebagai aria-label, karena ikon saja tidak terbaca pembaca layar. */
  function iconBtn(label, shape, onclick) {
    return '<button class="btn icon sm ghost" title="' + H(label) + '" aria-label="' + H(label) + '"' +
      ' onclick="' + H(onclick) + '">' + U.icon(shape) + '</button>';
  }

  // baris transaksi
  V.txRow = function (db, t, opts) {
    opts = opts || {};
    const wm = walletMap(db), cm = catMap(db);
    const w = wm[t.walletId] || { name: '?' };
    const c = cm[t.categoryId];
    let cls, amt, title, sub;

    if (t.type === 'in') {
      cls = 'in'; amt = '+' + U.fmtRp(t.amount);
      title = c ? c.name : 'Pemasukan';
      sub = w.name;
    } else if (t.type === 'out') {
      cls = 'out'; amt = '−' + U.fmtRp(t.amount);
      title = c ? c.name : 'Pengeluaran';
      sub = w.name;
    } else {
      const w2 = wm[t.walletTo] || { name: '?' };
      cls = 'move'; amt = U.fmtRp(t.amount);
      title = 'Pindah Dana';
      sub = w.name + ' ke ' + w2.name;
    }
    if (t.note) sub += ' · ' + t.note;
    if (!opts.hideDate) sub = U.fmtDate(t.date) + ' · ' + sub;

    const rcp = t.receiptId && db.receipts && db.receipts[t.receiptId];
    /* Badge kiri: emoji kategori pilihan pengguna; baris sistem (Pindah Dana,
       tanpa kategori) memakai ikon garis supaya tidak muncul emoji acak. */
    const badge = rcp ? U.icon('receipt')
      : c ? emo(c.icon)
      : U.icon(t.type === 'in' ? 'download' : t.type === 'out' ? 'upload' : 'refresh');
    const original = t._id || t.id;
    const appel = t._sumber === 'keluarga' ? ',null,\'keluarga\'' : '';
    const editAction = 'V.txForm(' + JSON.stringify(original) + appel + ')';
    const deleteAction = (t._sumber === 'keluarga' ? 'Buku.hapus(' : 'V.txDelete(') + JSON.stringify(original) + ')';
    return '<div class="item" data-tx="' + H(t.id) + '">' +
      '<div class="ico ' + cls + '">' + badge + '</div>' +
      '<div class="body">' +
        '<div class="t1">' + H(title) + oleh(t) + '</div>' +
        '<div class="t2">' + H(sub) + '</div>' +
      '</div>' +
      '<div class="right">' +
        '<div class="amt ' + cls + '">' + amt + '</div>' +
        '<div class="row-act">' +
          iconBtn('Ubah', 'edit', editAction) +
          iconBtn('Hapus', 'trash', deleteAction) +
        '</div>' +
      '</div>' +
    '</div>';
  };

  /* Siapa yang mencatat — hanya ditampilkan di buku bersama, karena di
     catatan pribadi semua baris pasti milik sendiri (tidak ada gunanya). */
  function oleh(t) {
    if (!root.K || (!K.aktif() && t._sumber !== 'keluarga') || !t.by) return '';
    const saya = K.nama && t.by === K.nama;
    return '<span class="tx-by">' + (saya ? 'kamu' : H(t.by)) + '</span>';
  }

  function emptyBox(icon, text) {
    return '<div class="empty"><span class="e-ic">' + U.icon(icon) + '</span><p>' + text + '</p></div>';
  }

  function transactionCalendar() {
    const input = el('f-date');
    const host = el('f-calendar');
    const toggle = el('f-calendar-toggle');
    let month = U.strToDate(input.value || U.today());
    month.setDate(1);
    function draw(focusDate) {
      toggle.textContent = U.fmtDate(input.value || U.today());
      const year = month.getFullYear(), m = month.getMonth();
      const first = new Date(year, m, 1);
      const offset = (first.getDay() + 6) % 7;
      const count = new Date(year, m + 1, 0).getDate();
      const iso = function (day) { return year + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0'); };
      host.innerHTML = '<div class="calendar-nav"><button type="button" class="btn" data-month="-1" aria-label="Bulan sebelumnya">‹</button><strong aria-live="polite">' +
        H(first.toLocaleDateString('id-ID', {month:'long',year:'numeric'})) + '</strong><button type="button" class="btn" data-month="1" aria-label="Bulan berikutnya">›</button></div>' +
        '<div class="calendar-week" aria-hidden="true">' + ['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
        '<div class="calendar-days">' + Array(offset).fill('<span></span>').join('') + Array.from({length:count}, function (_, i) {
          const date = iso(i + 1);
          return '<button type="button" data-date="' + date + '" aria-label="' + H(U.fmtDate(date)) + '" aria-pressed="' + (date === input.value) + '"' + (date === U.today() ? ' aria-current="date"' : '') + '>' + (i + 1) + '</button>';
        }).join('') + '</div><button type="button" class="btn calendar-today">Hari ini</button>';
      if (focusDate) { const target = host.querySelector('[data-date="' + focusDate + '"]'); if (target) target.focus(); }
    }
    function select(date) {
      input.value = date;
      input.dispatchEvent(new Event('change', {bubbles:true}));
      host.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      draw(); toggle.focus();
    }
    toggle.onclick = function () {
      host.hidden = !host.hidden;
      toggle.setAttribute('aria-expanded', String(!host.hidden));
      if (!host.hidden) { month = U.strToDate(input.value || U.today()); month.setDate(1); draw(input.value); }
    };
    host.onclick = function (event) {
      const button = event.target.closest('button'); if (!button) return;
      if (button.dataset.month) { month.setMonth(month.getMonth() + Number(button.dataset.month)); draw(); host.querySelector('[data-month="' + button.dataset.month + '"]').focus(); }
      else if (button.dataset.date) select(button.dataset.date);
      else if (button.classList.contains('calendar-today')) select(U.today());
    };
    host.onkeydown = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); host.hidden = true; toggle.setAttribute('aria-expanded','false'); toggle.focus(); return; }
      const date = event.target.dataset.date;
      const steps = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
      if (date && steps[event.key]) {
        event.preventDefault();
        const next = U.addDays(date, steps[event.key]);
        month = U.strToDate(next); month.setDate(1); draw(next);
      }
    };
    draw();
  }

  const PIE_COLORS = ['#F5790B', '#A78BFA', '#5DD4BD', '#F7CE54', '#70B7F5', '#F58DA8', '#C1D96C', '#D7B6F5'];

  function pieChart(rows, title) {
    rows = rows.filter(function (r) { return Number.isFinite(r.amount) && r.amount > 0; });
    rows = rows.slice().sort(function (a, b) { return b.amount - a.amount; });
    const categoryCount = rows.length;
    const total = U.sum(rows, function (r) { return r.amount; });
    if (!total) return emptyBox('chart', 'Belum ada data ' + title.toLowerCase() + ' pada periode ini.');
    // Irisan kecil tetap dihitung utuh melalui kelompok Lainnya.
    if (rows.length > 8) {
      rows = rows.slice(0, 7).concat([{ name: 'Lainnya (' + (rows.length - 7) + ')', amount: U.sum(rows.slice(7), function (r) { return r.amount; }) }]);
    }
    let cursor = -90;
    const point = function (radius, angle) {
      const rad = angle * Math.PI / 180;
      return (140 + radius * Math.cos(rad)).toFixed(4) + ' ' + (140 + radius * Math.sin(rad)).toFixed(4);
    };
    const slices = rows.map(function (r, i) {
      const start = cursor;
      cursor += r.amount / total * 360;
      const label = r.name + ': ' + U.fmtRp(r.amount) + ' (' + U.round1(r.amount / total * 100) + '%)';
      // Dua busur per sisi juga menangani satu kategori (lingkaran penuh).
      const mid = (start + cursor) / 2;
      const d = 'M ' + point(122, start) + ' A 122 122 0 0 1 ' + point(122, mid) +
        ' A 122 122 0 0 1 ' + point(122, cursor) + ' L ' + point(80, cursor) +
        ' A 80 80 0 0 0 ' + point(80, mid) + ' A 80 80 0 0 0 ' + point(80, start) + ' Z';
      return '<path class="donut-slice" d="' + d + '" fill="' + PIE_COLORS[i] + '" tabindex="0" role="img" aria-label="' + H(label) + '"><title>' + H(label) + '</title></path>';
    });
    return '<figure class="pie-chart donut-chart"><figcaption><strong>' + H(title) + '</strong><span>Komposisi per kategori · transfer tidak disertakan</span></figcaption>' +
      '<div class="pie-disc" role="group" aria-label="' + H(title + '. Diagram donat. Rincian nominal dan persentase tersedia pada legenda di bawah.') + '">' +
        '<svg viewBox="0 0 280 280" aria-label="Irisan pengeluaran per kategori">' + slices.join('') + '</svg>' +
        '<div class="donut-total"><span>Total pengeluaran</span><strong class="' + (U.fmtRp(total).length > 17 ? 'donut-value-long' : '') + '">' + U.fmtRp(total) + '</strong><small>' + categoryCount + ' kategori</small></div></div>' +
      '<p class="donut-insight"><span>Pengeluaran terbesar</span><strong>' + H(rows[0].name) + '</strong><small>' + U.round1(rows[0].amount / total * 100) + '% dari total</small></p>' +
      '<ul class="pie-legend">' + rows.map(function (r, i) {
        return '<li><i aria-hidden="true" style="background:' + PIE_COLORS[i] + '"></i><span>' + H(r.name) + '</span><strong>' +
          U.fmtRp(r.amount) + '<small>' + U.round1(r.amount / total * 100) + '%</small></strong></li>';
      }).join('') + '</ul></figure>';
  }

  function dailyChartData(db, from, to) {
    const rows = new Map(S.byDay(db, from, to).map(function (d) { return [d.date, d]; }));
    const data = [];
    for (let date = from; date <= to; date = U.addDays(date, 1)) {
      const row = rows.get(date) || { income: 0, expense: 0 };
      data.push({ label: U.fmtDate(date), axisLabel: String(U.strToDate(date).getDate()), income: row.income, expense: row.expense });
    }
    return data;
  }

  function periodChart(data, trend) {
    const max = Math.max.apply(null, data.map(function (d) { return Math.max(d.income || 0, d.expense || 0); }).concat([0]));
    if (!max) return emptyBox('chart', 'Belum ada pemasukan atau pengeluaran pada periode ini.');
    const legend = '<div class="time-legend"><span class="series-in">━ Pemasukan</span><span class="series-out">━ Pengeluaran</span></div>';
    const table = '<details class="chart-data"><summary>Lihat nominal per periode</summary><div class="table-wrap"><table><thead><tr><th>Periode</th><th>Pemasukan</th><th>Pengeluaran</th></tr></thead><tbody>' + data.map(function (d) {
      return '<tr><td>' + H(d.label) + '</td><td>' + U.fmtRp(d.income || 0) + '</td><td>' + U.fmtRp(d.expense || 0) + '</td></tr>';
    }).join('') + '</tbody></table></div></details>';
    if (trend === 'column') {
      const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
      const ceiling = Math.ceil(max / magnitude / 2) * magnitude * 2;
      const tick = function (i, count) {
        const step = Math.max(1, Math.ceil((data.length - 1) / (count - 1)));
        return i === data.length - 1 || (i % step === 0 && (i === 0 || data.length - 1 - i >= step * 0.65));
      };
      return '<div class="time-chart column-chart"><div class="time-legend"><span class="series-in">Pemasukan</span><span class="series-out">Pengeluaran</span></div>' +
        '<div class="column-frame"><div class="column-axis" aria-hidden="true">' + [1, 0.75, 0.5, 0.25, 0].map(function (v) {
          return '<span>' + H(U.fmtRpShort(ceiling * v)) + '</span>';
        }).join('') + '</div><div class="column-plot">' + data.map(function (d, i) {
          return '<div class="column-group"><div class="column-pair">' + ['income', 'expense'].map(function (key) {
            const amount = d[key] || 0;
            return '<div role="img" tabindex="0" aria-label="' + H(d.label + ' · ' + (key === 'income' ? 'Pemasukan ' : 'Pengeluaran ') + U.fmtRp(amount)) + '" class="column-bar column-' + key + (amount ? '' : ' column-zero') + '" style="height:' + (amount / ceiling * 100) + '%" title="' + H(d.label + ' · ' + (key === 'income' ? 'Pemasukan: ' : 'Pengeluaran: ') + U.fmtRp(amount) + ' · Selisih: ' + U.fmtRp((d.income || 0) - (d.expense || 0))) + '"></div>';
          }).join('') + '</div><span class="column-label' + (tick(i, 7) ? ' tick-wide' : '') + (tick(i, 4) ? ' tick-small' : '') + '" title="' + H(d.label) + '">' + H(d.axisLabel || d.label) + '</span></div>';
        }).join('') + '</div></div>' + table + '</div>';
    }
    if (trend && data.length) {
      const x = function (i) { return data.length === 1 ? 385 : 90 + i / (data.length - 1) * 590; };
      const y = function (value) { return 205 - value / max * 175; };
      const grid = [0, 0.5, 1].map(function (fraction) {
        const cy = y(max * fraction);
        return '<line x1="90" y1="' + cy + '" x2="680" y2="' + cy + '" class="chart-grid"/><text x="80" y="' + (cy + 4) + '" text-anchor="end">' + H(U.fmtRpShort(max * fraction)) + '</text>';
      }).join('');
      const lines = ['income', 'expense'].map(function (key) {
        return '<polyline class="trend-' + key + '" fill="none" stroke-width="3" points="' + data.map(function (d, i) { return x(i) + ',' + y(d[key] || 0); }).join(' ') + '"/>';
      }).join('');
      const targets = data.map(function (d, i) {
        const detail = d.label + ' · Pemasukan: ' + U.fmtRp(d.income || 0) + ' · Pengeluaran: ' + U.fmtRp(d.expense || 0) + ' · Selisih: ' + U.fmtRp((d.income || 0) - (d.expense || 0));
        return '<g class="trend-day" tabindex="0" role="button" aria-label="' + H(detail) + '" data-detail="' + H(detail) + '">' +
          '<rect class="trend-hit" x="' + (x(i) - 10) + '" y="20" width="20" height="190"/>' +
          '<line class="trend-cursor" x1="' + x(i) + '" x2="' + x(i) + '" y1="25" y2="205"/>' +
          '<circle class="trend-point point-income" cx="' + x(i) + '" cy="' + y(d.income || 0) + '" r="5"/>' +
          '<rect class="trend-point point-expense" x="' + (x(i) - 4) + '" y="' + (y(d.expense || 0) - 4) + '" width="8" height="8" rx="1"/></g>';
      }).join('');
      const labels = data.map(function (d, i) {
        if (i !== 0 && i !== data.length - 1 && i % Math.ceil(data.length / 5)) return '';
        return '<text x="' + x(i) + '" y="232" text-anchor="middle">' + H(String(d.label).replace(/ \d{4}$/, '')) + '</text>';
      }).join('');
      return '<div class="time-chart line-chart daily-lines">' + legend + '<svg viewBox="0 0 720 250" role="group" aria-label="Tren harian pemasukan dan pengeluaran, dua garis solid. Gunakan panah kiri dan kanan untuk memilih tanggal.">' + grid + lines + labels + targets + '</svg><p class="trend-detail" aria-live="polite" aria-atomic="true">Pilih tanggal pada grafik untuk melihat nominal. Gunakan sentuh atau panah kiri/kanan.</p>' + table + '</div>';
    }
    return '<div class="time-chart grouped-chart">' + legend + '<p class="chart-scale">Skala bersama mulai Rp0 · maksimum ' + U.fmtRp(max) + '</p>' +
      data.map(function (d) {
        return '<div class="period-row"><strong>' + H(d.label) + '</strong><div class="period-values">' + ['income', 'expense'].map(function (key) {
          return '<div class="period-value"><span class="period-track" aria-hidden="true"><i class="trend-' + key + '" style="width:' + ((d[key] || 0) / max * 100) + '%"></i></span><span><small>' + (key === 'income' ? 'Masuk' : 'Keluar') + '</small> ' + U.fmtRp(d[key] || 0) + '</span></div>';
        }).join('') + '</div></div>';
      }).join('') + table + '</div>';
  }

  function categoryBars(db, from, to) {
    const rows = S.byCategory(db, from, to, 'out').filter(function (r) { return r.amount > 0; }).sort(function (a, b) { return b.amount - a.amount; });
    if (!rows.length) return emptyBox('chart', 'Belum ada pengeluaran pada periode ini.');
    const total = U.sum(rows, function (r) { return r.amount; });
    return '<div class="category-bars" aria-label="Peringkat pengeluaran kategori">' + rows.map(function (r) {
      return '<div class="category-bar"><div><strong>' + emo(r.icon) + H(r.name) + '</strong><span>' + U.fmtRp(r.amount) + ' · ' + U.round1(r.amount / total * 100) + '%</span></div>' +
        '<div class="category-track" aria-hidden="true"><i style="width:' + (r.amount / rows[0].amount * 100) + '%"></i></div></div>';
    }).join('') + '</div>';
  }

  // ---- bilah kemajuan (dipakai anggaran & target) ----
  // pct > 100 tetap digambar penuh, tapi diberi kelas `over`
  function progBar(pct, cls) {
    const w = U.clamp(pct, 0, 100);
    return '<div class="prog"><div class="prog-fill ' + (cls || '') + '" style="width:' + w + '%"></div></div>';
  }

  function pctTag(pct, over) {
    const cls = over ? 'over' : (pct >= 80 ? 'warn' : 'ok');
    return '<span class="tag ' + cls + '">' + U.round1(pct) + '%</span>';
  }

  // sisa hari -> kalimat manusiawi
  function sisaHari(n) {
    if (n === null || n === undefined) return 'tanpa tenggat';
    if (n < 0) return 'lewat ' + Math.abs(n) + ' hari';
    if (n === 0) return 'hari ini';
    if (n === 1) return 'besok';
    if (n < 31) return n + ' hari lagi';
    return Math.round(n / 30.44) + ' bulan lagi';
  }

  function pilihanKategori(db, sel, type) {
    return '<option value="">(pilih kategori)</option>' + (db.categories || [])
      .filter(function (c) { return !c.archived && c.type === (type || 'out'); })
      .map(function (c) {
        return '<option value="' + H(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' +
          H(c.icon + ' ' + c.name) + '</option>';
      }).join('');
  }

  function pilihanDompet(db, sel, exclude) {
    return '<option value="">(pilih dompet)</option>' + (db.wallets || [])
      .filter(function (w) { return !w.archived && w.id !== exclude; })
      .map(function (w) {
        return '<option value="' + H(w.id) + '"' + (w.id === sel ? ' selected' : '') + '>' +
          H(w.icon + ' ' + w.name) + '</option>';
      }).join('');
  }

  function opsiNilai(pairs, sel) {
    return pairs.map(function (p) {
      return '<option value="' + H(p[0]) + '"' + (String(p[0]) === String(sel) ? ' selected' : '') + '>' + H(p[1]) + '</option>';
    }).join('');
  }

  /* ============================================================
     FORM TRANSAKSI (tambah / ubah)
     ============================================================ */
  V.txForm = function (id, presetType, sumber, walletId) {
    if (root.Buku && !Buku.bersama() && !id && !sumber && !presetType && ['dashboard', 'transaksi'].includes(root.App.view)) { Buku.catat(); return; }
    const bersama = sumber === 'keluarga' || (root.Buku && Buku.bersama());
    if (bersama && (!root.Buku || !Buku.keluarga)) { V.toast('Muat catatan keluarga terlebih dahulu.', 'err'); return; }
    if (bersama && !id && !Buku.keluarga.wallets.some(w => !w.archived)) { V.walletForm(); V.toast('Tambahkan dompet dan saldo awal dulu.'); return; }
    const revisi = bersama ? Buku.revisi : null;
    const db = bersama ? JSON.parse(JSON.stringify(Buku.keluarga)) : root.App.db;
    // Buku keluarga yang baru direset belum memiliki kategori bawaan.
    if (bersama && !db.categories.length) db.categories = S.seedDB().categories;
    const editing = id ? (db.transactions || []).filter(function (t) { return t.id === id; })[0] : null;
    let form = editing ? Object.assign({}, editing, { amount: editing.amount }) : {
      id: '', date: U.today(), type: presetType || 'out', amount: '',
      walletId: walletId || (db.wallets[0] || {}).id || '', walletTo: '', categoryId: '',
      note: '', receiptId: ''
    };

    // baca nilai yang sedang tampil di form ke dalam `form`
    // (penting: dipanggil sebelum render() ulang supaya ketikan user tidak hilang)
    function syncForm() {
      const g = function (id) { const e = el(id); return e ? e.value : null; };
      const d = g('f-date'); if (d !== null) form.date = d;
      const a = g('f-amount'); if (a !== null) form.amount = U.parseAmount(a);
      const w = g('f-wallet'); if (w !== null) form.walletId = w;
      const wt = g('f-wallet-to'); if (wt !== null) form.walletTo = wt;
      const c = g('f-cat'); if (c !== null) form.categoryId = c;
      const n = g('f-note'); if (n !== null) form.note = n;
    }

    function render() {
      const isMove = form.type === 'move';
      const rcp = form.receiptId && db.receipts[form.receiptId];

      const body =
        (root.Buku ? '<p class="hint">' + (bersama ? 'Terlihat oleh keluarga' : 'Hanya kamu') + '</p>' : '') +
        '<div class="seg" id="f-type" role="group" aria-label="Jenis transaksi" style="margin-bottom:16px">' +
          segBtn(form.type, 'in', ARAH.in + 'Pemasukan', 'in') +
          segBtn(form.type, 'out', ARAH.out + 'Pengeluaran', 'out') +
          segBtn(form.type, 'move', ARAH.move + 'Pindah Dana', 'move') +
        '</div>' +

        '<div class="field"><label for="f-calendar-toggle">Tanggal</label>' +
          '<input type="date" id="f-date" value="' + H(form.date) + '" hidden>' +
          '<button type="button" class="btn calendar-toggle" id="f-calendar-toggle" aria-expanded="false" aria-controls="f-calendar"></button>' +
          '<div id="f-calendar" class="transaction-calendar" hidden></div></div>' +

        '<div class="field"><label>Nominal</label>' +
          '<div class="money-input"><b>Rp</b><input type="text" inputmode="numeric" id="f-amount" ' +
          'value="' + (form.amount ? U.fmtNum(form.amount) : '') + '" placeholder="0"></div>' +
          '<span class="hint" id="f-amount-hint" aria-live="polite"></span></div>' +

        '<div class="field"><label>' + (isMove ? 'Dari Dompet' : 'Dompet / Bank') + '</label>' +
          '<select id="f-wallet">' + walletOptions(db, form.walletId) + '</select></div>' +

        (isMove
          ? '<div class="field"><label>Ke Dompet</label><select id="f-wallet-to">' + walletOptions(db, form.walletTo, function (w) { return w.id !== form.walletId; }) + '</select></div>'
          : '<div class="field"><label>Kategori</label><select id="f-cat">' + categoryOptions(db, form.categoryId, form.type) + '</select></div>') +

        '<div class="field"><label>Catatan <span class="muted">(opsional)</span></label>' +
          '<input type="text" id="f-note" value="' + H(form.note) + '" placeholder="contoh: makan siang tim"></div>' +

        (bersama ? '' : '<div class="field"><label>Struk / bukti bayar <span class="muted">(opsional)</span></label>' +
          (rcp
            ? '<div class="row"><img src="' + rcp.data + '" alt="struk" style="width:64px;height:64px;object-fit:cover;border-radius:9px;border:1px solid var(--line)">' +
              '<div style="flex:1;min-width:0"><div style="font-size:12.5px" class="t1">' + H(rcp.name) + '</div>' +
              '<div class="muted" style="font-size:11.5px">' + (rcp.size / 1024).toFixed(0) + ' KB</div></div>' +
              '<button type="button" class="btn sm" id="f-rcp-view">Lihat</button>' +
              '<button type="button" class="btn sm danger" id="f-rcp-del">Hapus</button></div>'
            : '<input type="file" id="f-rcp" accept="image/*,application/pdf" style="font-size:12.5px">') +
          '<span class="hint">Gambar disimpan di perangkat ini. Disarankan &lt; 1,5 MB.</span></div>');

      V.modal.open({
        title: editing ? 'Ubah Transaksi' : 'Catat Transaksi',
        body: body,
        foot: '<button class="btn" data-close>Batal</button>' +
              '<button class="btn primary" id="f-save">Simpan</button>'
      });

      /* --- bind --- */
      transactionCalendar();
      el('f-type').addEventListener('click', function (e) {
        const b = e.target.closest('[data-seg]'); if (!b) return;
        syncForm();
        form.type = b.dataset.seg;
        if (form.type === 'move') { form.categoryId = ''; }
        else {
          form.walletTo = '';
          const cats = (db.categories || []).filter(function (c) { return c.type === form.type && !c.archived; });
          if (!cats.some(function (c) { return c.id === form.categoryId; })) form.categoryId = cats.length ? cats[0].id : '';
        }
        render();
      });

      const amt = el('f-amount');
      amt.addEventListener('input', function () {
        const v = U.parseAmount(amt.value);
        amt.value = v ? U.fmtNum(v) : '';
        const hint = el('f-amount-hint');
        hint.textContent = v ? U.fmtRp(v) + ' (diisi untuk transaksi ini)' : '';
      });

      const wSel = el('f-wallet');
      if (wSel) wSel.addEventListener('change', function () {
        syncForm();
        form.walletId = wSel.value;
        if (form.type === 'move') { form.walletTo = ''; render(); }
      });

      const rcpInput = el('f-rcp');
      if (rcpInput) rcpInput.addEventListener('change', function () {
        syncForm();
        V.readReceipt(rcpInput.files[0], rcpInput, function (rid) {
          if (form.receiptId && form.receiptId !== rid) root.App.deleteReceipt(form.receiptId);
          form.receiptId = rid; render();
        });
      });
      const rcpDel = el('f-rcp-del');
      if (rcpDel) rcpDel.addEventListener('click', function () {
        syncForm();
        const old = form.receiptId;
        form.receiptId = '';
        if (old) root.App.deleteReceipt(old);
        render();
      });
      const rcpView = el('f-rcp-view');
      if (rcpView) rcpView.addEventListener('click', function () { if (form.receiptId) V.receiptView(form.receiptId); });

      el('f-save').onclick = async function () {
        form.date = el('f-date').value;
        form.amount = U.parseAmount(el('f-amount').value);
        form.walletId = el('f-wallet').value;
        if (form.type === 'move') { form.walletTo = el('f-wallet-to').value; form.categoryId = ''; }
        else { form.categoryId = el('f-cat').value; form.walletTo = ''; }
        form.note = el('f-note').value;

        const errs = S.validateTx(form);
        const keys = Object.keys(errs);
        if (keys.length) { V.toast(errs[keys[0]], 'err'); return; }

        if (bersama) {
          const bouton = el('f-save'); bouton.disabled = true;
          if (!form.id) form.id = id || U.uid('tx');
          const tx = S.mkTx(Object.assign({}, editing || {}, form, { id: form.id }));
          tx.by = editing && editing.by || root.K.nama;
          const i = db.transactions.findIndex(t => t.id === tx.id);
          if (i < 0) db.transactions.push(tx); else db.transactions[i] = tx;
          try { await Buku.simpan(db, revisi); V.modal.close(); root.App.render(); V.toast('Transaksi keluarga tersimpan', 'ok'); }
          catch (e) { V.toast(e.message, 'err'); bouton.disabled = false; }
          return;
        }
        if (editing) {
          const idx = db.transactions.findIndex(function (t) { return t.id === id; });
          db.transactions[idx] = S.mkTx(Object.assign({}, editing, form, { id: id }));
          V.toast('Transaksi diperbarui', 'ok');
        } else {
          db.transactions.push(S.mkTx(form));
          V.toast('Transaksi disimpan', 'ok');
        }
        root.App.saveAndRender();
        V.modal.close();
      };
    }
    render();
  };

  V.readReceipt = function (file, input, cb) {
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) { V.toast('Ukuran struk maksimal 2,5 MB', 'err'); input.value = ''; return; }
    const fr = new FileReader();
    fr.onload = function () {
      const id = U.uid('rcp');
      root.App.db.receipts[id] = { name: file.name, mime: file.type, size: file.size, data: fr.result };
      if (root.App.save() === 'slim') V.toast('Penyimpanan hampir penuh, struk lama dipangkas', 'err');
      cb(id);
    };
    fr.onerror = function () { V.toast('Gagal membaca berkas', 'err'); };
    fr.readAsDataURL(file);
  };

  V.receiptView = function (rid) {
    const r = root.App.db.receipts[rid];
    if (!r) return;
    const isImg = /^image\//.test(r.mime);
    V.modal.open({
      title: H(r.name),
      body: isImg
        ? '<img src="' + r.data + '" alt="struk" style="width:100%;border-radius:10px;border:1px solid var(--line)">'
        : '<p class="dim">Berkas PDF tidak bisa dipratinjau di sini.</p>',
      foot: '<button class="btn" data-close>Tutup</button>' +
            '<a class="btn primary" href="' + r.data + '" download="' + H(r.name) + '">Unduh</a>'
    });
  };

  V.txDelete = async function (id) {
    if (root.Buku && Buku.bersama()) return Buku.hapus(id);
    const ok = await V.confirm('Hapus transaksi?', 'Transaksi ini akan dihapus permanen dan saldo dompet ikut menyesuaikan.', 'Hapus', true);
    if (!ok) return false;
    const db = root.App.db;
    const t = db.transactions.filter(function (x) { return x.id === id; })[0];
    db.transactions = db.transactions.filter(function (x) { return x.id !== id; });
    if (t && t.receiptId) root.App.deleteReceipt(t.receiptId);
    root.App.saveAndRender();
    V.toast('Transaksi dihapus', 'ok');
    return true;
  };

  /* ============================================================
     VIEW: DASHBOARD
     ============================================================ */
  V.dashboard = function () {
    const db = root.Buku ? Buku.data() : root.App.db;
    const st = V.state.dashboard;
    const bal = S.walletBalances(db);
    const total = S.totalBalance(db);
    const bulan = S.summaryMonth(db);
    const r2026 = bulan;

    const st4 =
      '<div class="grid cols-4">' +
        '<div class="stat"><div class="lbl">Total Saldo</div><div class="val">' + U.fmtRp(total) + '</div>' +
          '<div class="sub">' + (db.wallets || []).length + ' dompet aktif</div></div>' +
        '<div class="stat in"><div class="lbl">Pemasukan · ' + U.fmtMonth(U.monthOf(U.today())) + '</div>' +
          '<div class="val">' + U.fmtRpShort(r2026.income) + '</div>' +
          '<div class="sub">' + r2026.countIn + ' transaksi</div></div>' +
        '<div class="stat out"><div class="lbl">Pengeluaran · ' + U.fmtMonth(U.monthOf(U.today())) + '</div>' +
          '<div class="val">' + U.fmtRpShort(r2026.expense) + '</div>' +
          '<div class="sub">' + r2026.countOut + ' transaksi</div></div>' +
        '<div class="stat' + (r2026.net >= 0 ? ' in' : ' out') + '"><div class="lbl">Selisih</div>' +
          '<div class="val">' + (r2026.net >= 0 ? '+' : '−') + U.fmtRpShort(Math.abs(r2026.net)) + '</div>' +
          '<div class="sub">' + (r2026.net >= 0 ? 'surplus' : 'defisit') + '</div></div>' +
      '</div>';

    // dompet
    const walletCards = (db.wallets || []).filter(function (w) { return !w.archived; }).map(function (w) {
      return '<div class="stat"><div class="lbl">' + emo(w.icon) + H(w.name) + '</div>' +
        '<div class="val" style="font-size:18px">' + U.fmtRp(bal[w.id] || 0) + '</div></div>';
    }).join('');

    // grafik
    let chartData = [], chartCaption = '';
    if (st.chart === '6m') {
      const endYM = U.monthOf(U.today());
      const d = U.strToDate(endYM + '-01'); d.setMonth(d.getMonth() - 5);
      const startYM = U.monthOf(U.dateToStr(d));
      chartData = S.byMonth(db, startYM, endYM).map(function (m) {
        return { label: U.fmtMonthShort(m.month), income: m.income, expense: m.expense };
      });
      chartCaption = '6 bulan terakhir';
    } else if (st.chart === '12m') {
      const endYM = U.monthOf(U.today());
      const d = U.strToDate(endYM + '-01'); d.setMonth(d.getMonth() - 11);
      const startYM = U.monthOf(U.dateToStr(d));
      chartData = S.byMonth(db, startYM, endYM).map(function (m) {
        return { label: U.fmtMonthShort(m.month), income: m.income, expense: m.expense };
      });
      chartCaption = '12 bulan terakhir';
    } else {
      chartData = dailyChartData(db, U.addDays(U.today(), -29), U.today());
      chartCaption = '30 hari terakhir';
    }

    const recent = S.filterTx(db, {}).slice(0, 10);

    const categories = S.byCategory(db, U.monthStart(U.today()), U.monthEnd(U.today()), 'out');
    return '<div class="planner-dashboard">' +
      '<header class="planner-welcome"><div>' +
        '<span class="planner-eyebrow">Ringkasan keuangan</span><h2>Uang tertata, rencana terjaga.</h2><p>Pantau saldo, pengeluaran, dan progres tabunganmu.</p></div>' +
        '<button class="btn primary" onclick="V.txForm()">' + wrapIco('plus') + 'Catat transaksi</button></header>' +
      (root.Buku ? Buku.kontrol() : '') +
      st4 +
      '<div class="planner-layout"><div class="planner-main">' +
        '<section class="card planner-wallets"><div class="card-head"><h2>Dompet &amp; tabungan</h2>' +
          '<button class="btn sm" onclick="App.go(\'dompet\')">Kelola</button></div>' +
          (walletCards ? '<div class="grid cols-3">' + walletCards + '</div>' : '<div class="empty wallet-onboarding"><span class="e-ic">' + U.icon('wallet') + '</span><h3>Mulai dari satu dompet</h3><p>Tambahkan rekening atau uang tunai beserta saldo awalnya.</p><button class="btn primary" onclick="V.walletForm()">' + wrapIco('plus') + 'Tambah dompet</button></div>') +
        '</section>' +
        '<section class="card planner-chart"><div class="card-head"><h2>Statistik keuangan</h2>' +
          '<div class="seg" id="dash-chart">' + segBtn(st.chart, '6m', '6 Bulan') +
          segBtn(st.chart, '12m', '12 Bulan') + segBtn(st.chart, '30d', '30 Hari') + '</div></div>' +
          '<p class="muted planner-caption">Pemasukan dan pengeluaran · ' + chartCaption + '</p>' + periodChart(chartData, st.chart === '30d' ? 'line' : 'column') +
        '</section>' +
        '<section class="card"><div class="card-head"><h2>Catatan Terakhir</h2>' +
          '<button class="btn sm" onclick="App.go(\'transaksi\')">Lihat semua</button></div>' +
          (recent.length ? '<div class="list">' + recent.map(function (t) { return V.txRow(db, t); }).join('') + '</div>' :
            emptyBox('receipt', 'Belum ada transaksi. Mulai catat pengeluaran pertamamu.')) + '</section>' +
        '<section class="card"><div class="card-head"><h2>Ringkasan Cepat</h2></div><div class="grid cols-4">' +
          [['Hari ini', S.summaryDays(db, 1).expense], ['7 hari', S.summaryDays(db, 7).expense],
           ['Bulan ini', bulan.expense], ['Tahun ini', S.summaryYear(db).expense]].map(function (r) {
            return '<div class="stat"><div class="lbl">' + r[0] + '</div><div class="val">' + U.fmtRpShort(r[1]) +
              '</div><div class="sub">pengeluaran</div></div>';
          }).join('') + '</div></section>' +
      '</div><aside class="planner-aside" aria-label="Target dan komposisi pengeluaran">' +
        '<section class="card planner-breakdown"><div class="card-head"><h2>Pengeluaran per Kategori</h2></div>' +
          '<p class="muted planner-caption">' + U.fmtMonth(U.monthOf(U.today())) + '</p>' + pieChart(categories, 'Pengeluaran bulan ini') +
        '</section>' + V.dashTahap2(db) +
      '</aside></div></div>';

  };

  // ---- ringkasan Tahap 2: anggaran, target, langganan ----
  V.dashTahap2 = function (data) {
    const db = data || root.App.db;
    const today = U.today();
    const bTot = S.budgetTotal(db, today);
    const bStatus = S.budgetStatus(db, today);
    const gTot = S.goalTotal(db);
    const gStatus = S.goalStatus(db, today);
    const sTotal = S.subMonthlyTotal(db);
    const jatuh = S.subDueSoon(db, 7, today);
    const ada = bStatus.length || gStatus.length || sTotal > 0;
    if (!ada) return '';

    const kartu = [];

    if (bStatus.length) {
      const lewat = bStatus.filter(function (r) { return r.usage.over; });
      const dekat = bStatus.filter(function (r) { return !r.usage.over && r.usage.pct >= 80; });
      kartu.push('<div class="card"><div class="card-head"><h2>Anggaran Bulan Ini</h2>' +
        '<button class="btn sm" onclick="App.go(\'anggaran\')">Kelola</button></div>' +
        progBar(bTot.pct, bTot.left < 0 ? 'over' : (bTot.pct >= 80 ? 'warn' : '')) +
        '<div class="row" style="justify-content:space-between;margin-top:9px;font-size:13px">' +
          '<span class="num">' + U.fmtRp(bTot.used) + ' <span class="muted">/ ' + U.fmtRp(bTot.limit) + '</span></span>' +
          '<span class="num ' + (bTot.left < 0 ? 'val-out' : 'val-in') + '">' +
            (bTot.left < 0 ? 'lewat ' + U.fmtRp(-bTot.left) : 'sisa ' + U.fmtRp(bTot.left)) + '</span>' +
        '</div>' +
        (lewat.length ? '<div class="muted" style="font-size:12px;margin-top:10px;color:var(--out)">Lewat batas: ' +
          lewat.slice(0, 3).map(function (r) { return H(r.category.name); }).join(', ') +
          (lewat.length > 3 ? ' +' + (lewat.length - 3) + ' lagi' : '') + '</div>' : '') +
        (!lewat.length && dekat.length ? '<div class="muted" style="font-size:12px;margin-top:10px;color:var(--warn)">Nyaris penuh: ' +
          dekat.slice(0, 3).map(function (r) { return H(r.category.name); }).join(', ') + '</div>' : '') +
      '</div>');
    }

    if (sTotal > 0) {
      kartu.push('<div class="card"><div class="card-head"><h2>Langganan</h2>' +
        '<button class="btn sm" onclick="App.go(\'langganan\')">Kelola</button></div>' +
        '<div style="font-size:23px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.4px">' + U.fmtRp(sTotal) +
          '<span class="muted" style="font-size:12px;font-weight:500"> /bulan</span></div>' +
        '<div class="muted" style="font-size:12px;margin-top:5px">setara ' + U.fmtRpShort(S.subYearlyTotal(db)) + '/tahun</div>' +
        (jatuh.length ? '<div class="muted" style="font-size:12px;margin-top:10px;color:var(--warn)">' +
          jatuh.length + ' jatuh tempo 7 hari: ' + jatuh.slice(0, 3).map(function (r) { return H(r.sub.name); }).join(', ') + '</div>'
          : '<div class="muted" style="font-size:12px;margin-top:10px">Tidak ada yang jatuh tempo minggu ini</div>') +
      '</div>');
    }

    if (gStatus.length) {
      const top = gStatus.filter(function (r) { return !r.progress.done; }).slice(0, 3);
      kartu.push('<div class="card"><div class="card-head"><h2>Target Tabungan</h2>' +
        '<button class="btn sm" onclick="App.go(\'target\')">Kelola</button></div>' +
        '<div style="font-size:23px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.4px">' + U.fmtRpShort(gTot.saved) +
          '<span class="muted" style="font-size:12px;font-weight:500"> / ' + U.fmtRpShort(gTot.target) + '</span></div>' +
        '<div class="muted" style="font-size:12px;margin-top:5px">' + U.round1(gTot.pct) + '% terkumpul · ' +
          gTot.done + ' dari ' + gTot.total + ' target tercapai</div>' +
        (top.length ? '<div style="margin-top:11px;display:flex;flex-direction:column;gap:9px">' + top.map(function (r) {
          return '<div><div class="row" style="justify-content:space-between;font-size:12px;margin-bottom:4px">' +
            '<span>' + emo(r.goal.icon) + H(r.goal.name) + '</span>' +
            '<span class="num muted">' + U.round1(r.progress.pct) + '%</span></div>' +
            progBar(r.progress.pct, r.late ? 'over' : (r.progress.done ? 'in' : 'move')) + '</div>';
        }).join('') + '</div>' : '') +
      '</div>');
    }

    return '<div class="grid cols-3 mt">' + kartu.join('') + '</div>';
  };

  V.dashboardBind = function () {
    const chart = document.querySelector('.daily-lines');
    if (chart) {
      const svg = chart.querySelector('svg');
      const days = Array.from(chart.querySelectorAll('.trend-day'));
      const select = function (day) {
        days.forEach(function (item) { item.classList.toggle('is-active', item === day); });
        chart.querySelector('.trend-detail').textContent = day.dataset.detail;
      };
      chart.addEventListener('focusin', function (e) {
        const day = e.target.closest('.trend-day');
        if (day) select(day);
      });
      const point = function (e) {
        const bounds = svg.getBoundingClientRect();
        const x = (e.clientX - bounds.left) / bounds.width * 720;
        const index = Math.round((x - 90) / 590 * (days.length - 1));
        select(days[Math.max(0, Math.min(days.length - 1, index))]);
      };
      svg.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') point(e); });
      svg.addEventListener('click', point);
      svg.addEventListener('keydown', function (e) {
        const day = e.target.closest('.trend-day');
        if (!day) return;
        const index = days.indexOf(day);
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? days.length - 1 : index + (e.key === 'ArrowLeft' ? -1 : 1);
          days[Math.max(0, Math.min(days.length - 1, next))].focus();
        } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(day); }
      });
    }
    const box = el('dash-chart');
    if (box) box.addEventListener('click', function (e) {
      const b = e.target.closest('[data-seg]'); if (!b) return;
      V.state.dashboard.chart = b.dataset.seg;
      root.App.render();
    });
  };

  /* ============================================================
     VIEW: TRANSAKSI
     ============================================================ */
  V.transaksi = function () {
    const db = root.Buku ? Buku.data() : root.App.db;
    const st = V.state.transaksi;
    const r = S.rangeFor(st.preset, U.today());
    st.from = r.from; st.to = r.to;
    const sum = S.summary(db, st.from, st.to);
    let list = sum.list;
    /* Pilihan pencatat diambil dari seluruh transaksi pada periode ini, bukan
       dari hasil saringan, supaya pilihannya tidak ikut berkedip saat filter
       lain diubah. Buku bersama menandai pencatat lewat field 'by'. */
    const pencatat = (function () {
      const nama = {};
      sum.list.forEach(function (t) { if (t.by) nama[t.by] = 1; });
      const daftar = Object.keys(nama);
      if (st.by && daftar.indexOf(st.by) === -1) daftar.push(st.by);
      return daftar.sort();
    })();
    if (st.walletId) list = list.filter(function (t) { return t.walletId === st.walletId || t.walletTo === st.walletId; });
    if (st.type !== 'all') list = list.filter(function (t) { return t.type === st.type; });
    if (st.catId) list = list.filter(function (t) { return t.categoryId === st.catId; });
    if (st.by) list = list.filter(function (t) { return String(t.by || '') === st.by; });
    if (st.q) {
      const q = st.q.toLowerCase();
      list = list.filter(function (t) {
        const c = (db.categories || []).filter(function (x) { return x.id === t.categoryId; })[0];
        return String(t.note || '').toLowerCase().indexOf(q) > -1 || (c && c.name.toLowerCase().indexOf(q) > -1);
      });
    }
    const fIn = U.sum(list.filter(function (t) { return t.type === 'in'; }), function (t) { return Number(t.amount); });
    const fOut = U.sum(list.filter(function (t) { return t.type === 'out'; }), function (t) { return Number(t.amount); });

    const toolbar =
      '<div class="card">' +
        '<div class="row" style="gap:12px">' +
          '<div class="seg" id="tx-preset" style="flex:1;min-width:260px">' +
            segBtn(st.preset, 'today', 'Hari ini') + segBtn(st.preset, 'week', 'Minggu') +
            segBtn(st.preset, 'month', 'Bulan') + segBtn(st.preset, 'year', 'Tahun') +
            segBtn(st.preset, '7d', '7 Hari') + segBtn(st.preset, 'all', 'Semua') +
          '</div>' +
          '<input type="search" id="tx-q" aria-label="Cari transaksi" placeholder="Cari catatan / kategori…" value="' + H(st.q) + '" style="max-width:240px">' +
          '<button class="btn primary" onclick="V.txForm()">' + wrapIco('plus') + 'Catat Transaksi</button>' +
        '</div>' +
        '<div class="row mt" style="gap:12px">' +
          (pencatat.length >= 2 || st.by ?
            '<select id="tx-by" aria-label="Saring pencatat" style="max-width:190px">' +
              '<option value="">Semua pencatat</option>' +
              pencatat.map(function (n) {
                return '<option value="' + H(n) + '"' + (st.by === n ? ' selected' : '') + '>' +
                  (root.K && K.nama === n ? 'kamu (' + H(n) + ')' : H(n)) + '</option>';
              }).join('') +
            '</select>' : '') +
          (root.Buku && !Buku.bersama() && Buku.keluarga ?
            '<select id="tx-buku" aria-label="Saring asal buku" style="max-width:180px">' +
              [['semua', 'Semua buku'], ['pribadi', 'Buku pribadi'], ['keluarga', 'Buku keluarga']].map(function (p) {
                return '<option value="' + p[0] + '"' + (Buku.filter === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
              }).join('') +
            '</select>' : '') +
          '<select id="tx-wallet" aria-label="Saring dompet" style="max-width:230px"><option value="">Semua dompet</option>' +
            walletOptions(db, st.walletId) + '</select>' +
          '<select id="tx-cat" aria-label="Saring kategori" style="max-width:230px"><option value="">Semua kategori</option>' +
            categoryOptions(db, st.catId) + '</select>' +
          '<select id="tx-type" aria-label="Saring jenis transaksi" style="max-width:200px">' +
            '<option value="all"' + (st.type === 'all' ? ' selected' : '') + '>Semua jenis</option>' +
            '<option value="in"' + (st.type === 'in' ? ' selected' : '') + '>Pemasukan</option>' +
            '<option value="out"' + (st.type === 'out' ? ' selected' : '') + '>Pengeluaran</option>' +
            '<option value="move"' + (st.type === 'move' ? ' selected' : '') + '>Pindah dana</option>' +
          '</select>' +
          '<span class="spacer"></span>' +
          '<span class="muted" style="font-size:12.5px">' + S.periodLabel(st.preset, st.from, st.to) +
            ' · ' + list.length + ' transaksi</span>' +
        '</div>' +
      '</div>';

    const strip =
      '<div class="grid cols-3 mt">' +
        '<div class="stat in"><div class="lbl">Masuk</div><div class="val">' + U.fmtRpShort(fIn) + '</div></div>' +
        '<div class="stat out"><div class="lbl">Keluar</div><div class="val">' + U.fmtRpShort(fOut) + '</div></div>' +
        '<div class="stat' + (fIn - fOut >= 0 ? ' in' : ' out') + '"><div class="lbl">Selisih</div><div class="val">' +
          (fIn - fOut >= 0 ? '+' : '−') + U.fmtRpShort(Math.abs(fIn - fOut)) + '</div></div>' +
      '</div>';

    // kelompokkan per tanggal
    let groups = '';
    if (list.length) {
      const byDate = U.groupBy(list, function (t) { return t.date; });
      const dates = Array.from(byDate.keys()).sort().reverse();
      groups = '<div class="card mt"><div class="list">';
      dates.forEach(function (d) {
        const items = byDate.get(d);
        const di = U.sum(items.filter(function (t) { return t.type === 'in'; }), function (t) { return Number(t.amount); });
        const doo = U.sum(items.filter(function (t) { return t.type === 'out'; }), function (t) { return Number(t.amount); });
        groups += '<div class="row" style="padding:14px 4px 8px;border-bottom:1px solid var(--line)">' +
          '<strong style="font-size:13px;color:var(--txt-dim)">' + H(U.relativeDate(d)) + '</strong>' +
          '<span class="muted" style="font-size:11.5px">' + H(U.fmtDate(d)) + '</span>' +
          '<span class="spacer"></span>' +
          (di ? '<span class="tag in">+' + U.fmtRpShort(di) + '</span>' : '') +
          (doo ? '<span class="tag out">−' + U.fmtRpShort(doo) + '</span>' : '') +
        '</div>';
        items.forEach(function (t) { groups += V.txRow(db, t, { hideDate: true }); });
      });
      groups += '</div></div>';
    } else {
      groups = '<div class="card mt">' + emptyBox('search', 'Tidak ada transaksi pada filter ini.') + '</div>';
    }

    return (root.Buku ? Buku.kontrol() : '') + toolbar + strip + groups;
  };

  V.transaksiBind = function () {
    const pre = el('tx-preset');
    if (pre) pre.addEventListener('click', function (e) {
      const b = e.target.closest('[data-seg]'); if (!b) return;
      V.state.transaksi.preset = b.dataset.seg; root.App.render();
    });
    const w = el('tx-wallet'); if (w) w.onchange = function () { V.state.transaksi.walletId = w.value; root.App.render(); };
    const by = el('tx-by');   if (by) by.onchange = function () { V.state.transaksi.by = by.value; root.App.render(); };
    const bk = el('tx-buku'); if (bk) bk.onchange = function () { Buku.pilih(bk.value); };
    const c = el('tx-cat');    if (c) c.onchange = function () { V.state.transaksi.catId = c.value; root.App.render(); };
    const ty = el('tx-type');  if (ty) ty.onchange = function () { V.state.transaksi.type = ty.value; root.App.render(); };
    const q = el('tx-q');
    if (q) {
      let tmr = null;
      q.oninput = function () {
        clearTimeout(tmr);
        tmr = setTimeout(function () {
          V.state.transaksi.q = q.value;
          root.App.render();
          const nx = el('tx-q'); if (nx) { nx.focus(); nx.setSelectionRange(nx.value.length, nx.value.length); }
        }, 320);
      };
    }
  };

  /* ============================================================
     VIEW: REKAP
     ============================================================ */
  V.rekap = function () {
    const db = root.Buku ? Buku.data() : root.App.db;
    const st = V.state.rekap;
    if (!st.ym) st.ym = U.monthOf(U.today());
    if (!st.year) st.year = U.yearOf(U.today());
    const yr = S.yearRange(db);

    const tabBtns =
        segBtn(st.tab, 'hari', 'Harian') + segBtn(st.tab, 'minggu', 'Mingguan') +
        segBtn(st.tab, 'bulan', 'Bulanan') + segBtn(st.tab, 'tahun', 'Tahunan');

    let picker = '', table = '', totalRow = '', caption = '';

    if (st.tab === 'hari') {
      picker = '<input type="month" id="rk-ym" aria-label="Bulan rekap" value="' + H(st.ym) + '" style="max-width:190px">';
      const from = st.ym + '-01', to = U.monthEnd(from);
      caption = U.fmtMonth(st.ym);
      const rows = S.byDay(db, from, to).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      if (!rows.length) table = emptyBox('calendar', 'Tidak ada transaksi pada bulan ini.');
      else {
        table = '<div class="tbl-wrap"><table><thead><tr><th>Tanggal</th><th>Hari</th><th class="n">Masuk</th><th class="n">Keluar</th><th class="n">Selisih</th><th class="n">Jml</th></tr></thead><tbody>' +
          rows.map(function (d) {
            return '<tr><td>' + H(U.fmtDate(d.date)) + '</td><td class="dim">' + U.DAYS[U.strToDate(d.date).getDay()] + '</td>' +
              '<td class="n" style="color:var(--in)">' + (d.income ? U.fmtNum(d.income) : '') + '</td>' +
              '<td class="n" style="color:var(--out)">' + (d.expense ? U.fmtNum(d.expense) : '') + '</td>' +
              '<td class="n" style="color:' + (d.net >= 0 ? 'var(--in)' : 'var(--out)') + '">' + (d.net >= 0 ? '+' : '−') + U.fmtNum(Math.abs(d.net)) + '</td>' +
              '<td class="n dim">' + d.count + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      const s = S.summary(db, from, to);
      totalRow = '<div class="row" style="font-size:13.5px;gap:18px"><span>Total <b>' + s.count + '</b> transaksi</span>' +
        '<span class="dim">Pemasukan <b style="color:var(--in)">' + U.fmtRp(s.income) + '</b></span>' +
        '<span class="dim">Pengeluaran <b style="color:var(--out)">' + U.fmtRp(s.expense) + '</b></span>' +
        '<span class="dim">Selisih <b style="color:' + (s.net >= 0 ? 'var(--in)' : 'var(--out)') + '">' + U.fmtRp(s.net) + '</b></span></div>';
      totalRow = s.count ? totalRow : '';
    }

    if (st.tab === 'minggu') {
      picker = '<input type="month" id="rk-ym" aria-label="Bulan rekap" value="' + H(st.ym) + '" style="max-width:190px">';
      const from = st.ym + '-01', to = U.monthEnd(from);
      caption = 'Minggu dalam ' + U.fmtMonth(st.ym);
      const rows = S.byWeek(db, from, to);
      if (!rows.length) table = emptyBox('calendar', 'Tidak ada transaksi pada bulan ini.');
      else {
        table = '<div class="tbl-wrap"><table><thead><tr><th>Periode Minggu</th><th class="n">Hari aktif</th><th class="n">Masuk</th><th class="n">Keluar</th><th class="n">Selisih</th><th class="n">Jml</th></tr></thead><tbody>' +
          rows.map(function (d) {
            return '<tr><td>' + H(U.fmtDate(d.week)) + ' – ' + H(U.fmtDate(d.end)) + '</td>' +
              '<td class="n dim">' + d.activeDays + '</td>' +
              '<td class="n" style="color:var(--in)">' + (d.income ? U.fmtNum(d.income) : '') + '</td>' +
              '<td class="n" style="color:var(--out)">' + (d.expense ? U.fmtNum(d.expense) : '') + '</td>' +
              '<td class="n" style="color:' + (d.net >= 0 ? 'var(--in)' : 'var(--out)') + '">' + (d.net >= 0 ? '+' : '−') + U.fmtNum(Math.abs(d.net)) + '</td>' +
              '<td class="n dim">' + d.count + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      const s = S.summary(db, from, to);
      totalRow = s.count ? '<div class="row" style="font-size:13.5px;gap:18px"><span class="dim">Total <b>' + s.count + '</b> transaksi</span>' +
        '<span class="dim">Masuk <b style="color:var(--in)">' + U.fmtRp(s.income) + '</b></span>' +
        '<span class="dim">Keluar <b style="color:var(--out)">' + U.fmtRp(s.expense) + '</b></span></div>' : '';
    }

    if (st.tab === 'bulan') {
      picker = '<select id="rk-year" style="max-width:140px">' +
        Array.from({ length: Number(yr.max) - Number(yr.min) + 1 }, function (_, i) { return String(Number(yr.min) + i); })
          .map(function (y) { return '<option value="' + y + '"' + (y === st.year ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>';
      caption = 'Tahun ' + st.year;
      const rows = S.byMonth(db, st.year + '-01', st.year + '-12');
      if (!rows.length) table = emptyBox('calendar', 'Tidak ada transaksi pada tahun ini.');
      else {
        table = '<div class="tbl-wrap"><table><thead><tr><th>Bulan</th><th class="n">Masuk</th><th class="n">Keluar</th><th class="n">Selisih</th><th class="n">Pindah dana</th><th class="n">Jml</th></tr></thead><tbody>' +
          rows.map(function (d) {
            return '<tr><td>' + H(U.fmtMonth(d.month)) + '</td>' +
              '<td class="n" style="color:var(--in)">' + (d.income ? U.fmtNum(d.income) : '') + '</td>' +
              '<td class="n" style="color:var(--out)">' + (d.expense ? U.fmtNum(d.expense) : '') + '</td>' +
              '<td class="n" style="color:' + (d.net >= 0 ? 'var(--in)' : 'var(--out)') + '">' + (d.net >= 0 ? '+' : '−') + U.fmtNum(Math.abs(d.net)) + '</td>' +
              '<td class="n dim">' + (d.moved ? U.fmtNum(d.moved) : '') + '</td>' +
              '<td class="n dim">' + d.count + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      const s = S.summaryYear(db, st.year);
      totalRow = '<div class="row" style="font-size:13.5px;gap:18px"><span class="dim">Setahun: <b>' + s.count + '</b> transaksi</span>' +
        '<span class="dim">Masuk <b style="color:var(--in)">' + U.fmtRp(s.income) + '</b></span>' +
        '<span class="dim">Keluar <b style="color:var(--out)">' + U.fmtRp(s.expense) + '</b></span>' +
        '<span class="dim">Selisih <b style="color:' + (s.net >= 0 ? 'var(--in)' : 'var(--out)') + '">' + U.fmtRp(s.net) + '</b></span></div>';
      totalRow = s.count ? totalRow : '';
    }

    if (st.tab === 'tahun') {
      caption = 'Semua tahun';
      const rows = S.byYear(db);
      if (!rows.length) table = emptyBox('calendar', 'Belum ada data tahunan.');
      else {
        table = '<div class="tbl-wrap"><table><thead><tr><th>Tahun</th><th class="n">Masuk</th><th class="n">Keluar</th><th class="n">Selisih</th><th class="n">Pindah dana</th><th class="n">Jml</th></tr></thead><tbody>' +
          rows.map(function (d) {
            return '<tr><td><b>' + H(d.year) + '</b></td>' +
              '<td class="n" style="color:var(--in)">' + U.fmtNum(d.income) + '</td>' +
              '<td class="n" style="color:var(--out)">' + U.fmtNum(d.expense) + '</td>' +
              '<td class="n" style="color:' + (d.net >= 0 ? 'var(--in)' : 'var(--out)') + '"><b>' + (d.net >= 0 ? '+' : '−') + U.fmtNum(Math.abs(d.net)) + '</b></td>' +
              '<td class="n dim">' + (d.moved ? U.fmtNum(d.moved) : '') + '</td>' +
              '<td class="n dim">' + d.count + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
    }

    return '<div class="card"><div class="row"><div class="seg" id="rk-tab" style="width:auto">' + tabBtns + '</div>' +
        '<span class="spacer"></span>' + picker + '</div>' +
        '<div class="mb" style="margin-top:12px"></div>' +
        '<div class="tbl-head row" style="margin-bottom:10px"><span class="dim" style="font-size:13px">Rekap ' + H(caption) + '</span></div>' +
        table + (totalRow ? '<div class="mt" style="border-top:1px solid var(--line);padding-top:14px">' + totalRow + '</div>' : '') +
      '</div>' +
      '<div class="card mt"><div class="card-head"><h2>Grafik Rekap</h2>' +
        '<button class="btn sm" onclick="V.exportExcel()">' + wrapIco('download') + 'Unduh Excel</button>' +
          '<button class="btn sm" onclick="V.exportCSV()">CSV</button></div>' +
        '<p class="chart-period">' + H('Periode: ' + caption) + '</p>' +
        (st.tab === 'tahun'
          ? periodChart(S.byYear(db).map(function (d) { return { label: d.year, income: d.income, expense: d.expense }; }), 'column')
          : st.tab === 'bulan'
            ? periodChart(S.byMonth(db, st.year + '-01', st.year + '-12').map(function (d) { return { label: U.fmtMonth(d.month), axisLabel: U.fmtMonthShort(d.month).replace(/ \d{2}$/, ''), income: d.income, expense: d.expense }; }), 'column')
            : st.tab === 'minggu'
              ? periodChart(S.byWeek(db, st.ym + '-01', U.monthEnd(st.ym + '-01')).map(function (d) { return { label: U.fmtDate(d.week) + ' – ' + U.fmtDate(d.end), axisLabel: U.fmtDate(d.week).replace(/ \d{4}$/, ''), income: d.income, expense: d.expense }; }), 'column')
              : periodChart(dailyChartData(db, st.ym + '-01', U.monthEnd(st.ym + '-01')), 'column')
        ) +
      '</div>';
  };

  V.rekapBind = function () {
    const tb = el('rk-tab');
    if (tb) tb.addEventListener('click', function (e) {
      const b = e.target.closest('[data-seg]'); if (!b) return;
      V.state.rekap.tab = b.dataset.seg; root.App.render();
    });
    const ym = el('rk-ym'); if (ym) ym.onchange = function () { V.state.rekap.ym = ym.value || V.state.rekap.ym; root.App.render(); };
    const yr = el('rk-year'); if (yr) yr.onchange = function () { V.state.rekap.year = yr.value; root.App.render(); };
  };

  /* Ekspor dari UI selalu meminta sumber buku; tidak memakai tampilan gabungan. */
  V.bukuBackup = function (sumber) {
    if (sumber === 'pribadi') {
      if (root.K && K.aktif()) throw Error('Beralih dari mode keluarga lama sebelum mengakses buku pribadi.');
      return root.Buku ? Buku.pribadi() : root.App.db;
    }
    if (sumber !== 'keluarga' || !root.Buku || !root.K || !K.terbuka ||
        Buku.akun !== K.nama || !Buku.keluarga || Buku.memuat || Buku.sibuk) {
      throw Error('Muat ulang buku keluarga dengan sesi yang aktif terlebih dahulu.');
    }
    return Buku.keluarga;
  };

  V.pilihEkspor = function (format) {
    V.modal.open({
      title: 'Ekspor ' + (format === 'json' ? 'backup JSON' : format === 'xlsx' ? 'Excel' : 'CSV'),
      body: '<p>Pilih buku yang akan diunduh. Seluruh periode disertakan; data pribadi dan keluarga tidak dicampur.</p>' +
        '<div class="field mt"><label for="ekspor-buku">Sumber data</label><select id="ekspor-buku"><option value="pribadi">Buku pribadi</option><option value="keluarga">Buku keluarga</option></select></div>' +
        '<p class="hint">Excel: tabel transaksi terformat. JSON: backup lengkap buku. CSV: data teks tanpa format tabel. Backup keluarga tidak menyertakan gambar struk yang tidak disimpan di server.</p>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="ekspor-unduh">Unduh</button>'
    });
    el('ekspor-unduh').onclick = function () {
      const sumber = el('ekspor-buku').value;
      try {
        V.bukuBackup(sumber);
        if (format === 'json') V.exportJSON(sumber);
        else if (format === 'xlsx') V.exportExcel(sumber);
        else V.exportCSV(null, sumber);
        V.modal.close();
      } catch (e) { V.toast(e.message, 'err'); }
    };
  };

  V.exportExcel = function (sumber) {
    if (!sumber) return V.pilihEkspor('xlsx');
    const bytes = root.Excel.buat(V.bukuBackup(sumber), sumber, U.today());
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'kantongkita-' + U.today() + '-' + sumber + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    V.toast('Excel buku ' + sumber + ' diunduh', 'ok');
  };

  V.exportCSV = function (db, sumber) {
    if (!db && !sumber) return V.pilihEkspor('csv');
    const buku = db || V.bukuBackup(sumber);
    root.App.download('kantongkita-' + U.today() + '-' + (sumber || 'rekap') + '.csv', 'text/csv', '﻿' + S.toCSV(buku));
    V.toast('CSV seluruh transaksi buku diunduh', 'ok');
  };

  /* ============================================================
     VIEW: MENU — daftar semua fitur (dipakai navigasi bawah di HP)
     ============================================================ */
  const MENU_FITUR = [
    ['dashboard', 'Beranda', 'Ringkasan saldo dan aktivitas terbaru.', 'home'],
    ['transaksi', 'Catatan Transaksi', 'Semua pemasukan, pengeluaran, dan transfer.', 'receipt'],
    ['rekap', 'Rekap Transaksi', 'Ringkasan harian sampai tahunan.', 'chart'],
    ['anggaran', 'Anggaran per Kategori', 'Batas pengeluaran tiap kategori.', 'folder'],
    ['target', 'Target Tabungan', 'Kumpulkan dana untuk tujuan tertentu.', 'target'],
    ['langganan', 'Langganan Bulanan', 'Tagihan rutin yang harus dibayar.', 'refresh'],
    ['dompet', 'Dompet & Bank', 'Saldo tunai, rekening, dan e-wallet.', 'wallet'],
    ['kategori', 'Kategori', 'Kategori pemasukan dan pengeluaran.', 'tag']
  ];
  const MENU_LAIN = [
    ['profil', 'Profil', 'Pisahkan catatan keuanganmu.', 'user'],
    ['pengaturan', 'Pengaturan', 'Backup, sinkronisasi, dan preferensi.', 'settings']
  ];

  /* Halaman fitur terakhir yang dibuka — supaya Menu bisa menawarkannya lagi. */
  function halamanTerakhir() {
    try { return (root.App && root.App.terakhirBuka && root.App.terakhirBuka()) || ''; } catch (e) { return ''; }
  }

  V.menu = function () {
    const kartu = function (row) {
      return '<a class="menu-link" href="#/' + row[0] + '">' +
        '<span class="menu-ic">' + U.icon(row[3] || 'tag') + '</span>' +
        '<span class="menu-txt"><strong>' + row[1] + '</strong><span>' + row[2] + '</span></span>' +
        '<span class="menu-go" aria-hidden="true">›</span>' +
      '</a>';
    };
    const terakhir = halamanTerakhir();
    const akhir = terakhir && terakhir !== 'menu'
      ? MENU_FITUR.concat(MENU_LAIN).filter(function (r) { return r[0] === terakhir; })[0]
      : null;
    /* Kartu akun hanya relevan kalau memang ada akun yang login. */
    const akun = root.K && root.K.terbuka && root.K.nama ? root.K.nama : '';
    const kartuAkun = akun
      ? '<div class="card mt"><div class="card-head"><h2>Akun login</h2><span class="spacer"></span>' +
        '<span class="tag ok">masuk</span></div>' +
        '<p class="muted">Masuk sebagai <b>' + H(akun) + '</b>. Keluar tidak menghapus catatan yang tersimpan di perangkat ini.</p>' +
        '<div class="actions"><button class="btn" style="min-height:44px" onclick="App.emailAkun(this)">Status / verifikasi email</button>' +
        '<button class="btn danger" style="min-height:44px" onclick="App.keluarAkun(this)">Keluar akun</button></div></div>'
      : '';

    return (akhir ? '<div class="card menu-terakhir"><div class="card-head"><h2>Terakhir Dibuka</h2>' +
        '<span class="tag">' + H(akhir[1]) + '</span></div>' +
        '<nav class="menu-grid">' + kartu(akhir) + '</nav></div>' : '') +
    '<div class="card' + (akhir ? ' mt' : '') + '"><div class="card-head"><h2>Semua Fitur</h2></div>' +
      '<nav class="menu-grid" aria-label="Daftar fitur">' + MENU_FITUR.map(kartu).join('') + '</nav>' +
    '</div>' +
    '<div class="card mt"><div class="card-head"><h2>Lainnya</h2></div>' +
      '<nav class="menu-grid" aria-label="Menu lainnya">' + MENU_LAIN.map(kartu).join('') + '</nav>' +
    '</div>' + kartuAkun;
  };

  /* ============================================================
     VIEW: DOMPET & BANK
     ============================================================ */
  V.dompet = function () {
    const db = root.Buku && Buku.bersama() ? Buku.keluarga : root.App.db;
    const bal = S.walletBalances(db);
    const total = S.totalBalance(db);
    const list = (db.wallets || []).filter(function (w) { return !w.archived; });

    const cards = list.map(function (w) {
      const b = bal[w.id] || 0;
      const n = S.txCountForWallet(db, w.id);
      const types = { cash: 'Uang tunai', bank: 'Rekening bank', ewallet: 'E-wallet', credit: 'Kartu kredit', investment: 'Investasi', other: 'Lainnya' };
      return '<article class="card wallet-card" style="--wallet-color:' + H(w.color || '#5955EF') + '">' +
        '<div class="wallet-heading"><span class="ico-badge">' + emo(w.icon) + '</span>' +
          '<div class="wallet-identity"><h3>' + H(w.name) + '</h3><span class="muted">' + H(types[w.type] || w.type) + '</span></div></div>' +
        '<div class="wallet-balance"><span class="muted">Saldo saat ini</span><strong>' + U.fmtRp(b) + '</strong></div>' +
        '<div class="wallet-meta">' + n + ' transaksi tercatat' +
          (w.initial ? '<span>Saldo awal ' + U.fmtRp(w.initial) + '</span>' : '') + '</div>' +
        '<footer class="wallet-actions"><button class="btn sm ghost" onclick="V.walletForm(\'' + w.id + '\')">' + wrapIco('edit') + 'Ubah</button>' +
          '<button class="btn sm ghost danger" onclick="V.walletDelete(\'' + w.id + '\')">' + wrapIco('trash') + 'Hapus</button></footer></article>';
    }).join('');

    // pindah dana cepat
    const moves = S.filterTx(db, {}).filter(function (t) { return t.type === 'move'; }).slice(0, 8);
    const adaKeluarga = !!(root.Buku && root.Buku.akun && !Buku.berpasangan());
    const tombolKeluarga = adaKeluarga
      ? '<button class="btn" onclick="Buku.dompet()">' + wrapIco('users') + 'Tambah Dompet Keluarga</button>'
      : '';

    return '<div class="card"><div class="card-head"><h2>Pilihan Dompet / Bank</h2>' +
        '<span class="total-pill">Total: ' + U.fmtRp(total) + '</span>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
          tombolKeluarga +
          '<button class="btn primary" onclick="V.walletForm()">' + wrapIco('plus') + (root.Buku && Buku.bersama() ? 'Tambah Dompet</button>' : 'Tambah Dompet Pribadi</button>') +
        '</div></div>' +
      (adaKeluarga ? '<p class="hint" style="margin:4px 0 12px;">Dompet di bawah ini hanya ada di akunmu. Pakai “Tambah Dompet Keluarga” agar terlihat juga oleh pasangan.</p>' : '') +
      (cards ? '<div class="grid cols-3 wallet-grid">' + cards + '</div>'
             : emptyBox('wallet', 'Belum ada dompet. Tambahkan rekening, e-wallet, atau uang tunai.')) +
    '</div>' +

    '<div class="card mt"><div class="card-head"><h2>Catatan Perpindahan Dana</h2>' +
      '<button class="btn sm" onclick="V.txForm(null,\'move\')">' + wrapIco('plus') + 'Pindah Dana</button></div>' +
      (moves.length ? '<div class="list">' + moves.map(function (t) { return V.txRow(db, t); }).join('') + '</div>'
                    : emptyBox('refresh', 'Belum ada perpindahan dana antar dompet.')) +
    '</div>';
  };

  V.walletForm = function (id) {
    const ctx = root.Buku && Buku.bersama() ? Buku.konteks(id, 'keluarga') : null;
    if (root.Buku && Buku.bersama() && !ctx) return;
    const db = ctx ? ctx.db : root.App.db;
    const w = id ? db.wallets.filter(function (x) { return x.id === id; })[0] : null;
    const TYPES = [['cash', 'Tunai'], ['bank', 'Rekening Bank'], ['ewallet', 'E-Wallet'], ['credit', 'Kartu Kredit'], ['investment', 'Investasi'], ['other', 'Lainnya']];
    const f = w || { id: '', name: '', type: 'bank', icon: '🏦', color: '#3d7bff', initial: 0 };

    V.modal.open({
      title: w ? 'Ubah Dompet' : 'Tambah Dompet',
      body:
        '<div class="field"><label>Nama</label><input type="text" id="w-name" autocomplete="off" value="' + H(f.name) + '" placeholder="contoh: BCA Gozali"></div>' +
        '<div class="field"><label>Jenis</label><select id="w-type">' +
          TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (f.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Ikon</label>' + pilihanEmoji('w-icons', IKON_DOMPET, f.icon) +
          '<input type="hidden" id="w-icon" value="' + H(f.icon) + '"></div>' +
        '<div class="field"><label>Warna</label>' + pilihanSwatch('w-colors', WARNA_DOMPET, f.color, 'data-color') + '</div>' +
        '<div class="field"><label>Saldo awal <span class="muted">(opsional)</span></label>' +
          '<div class="money-input"><b>Rp</b><input type="text" inputmode="numeric" id="w-initial" value="' + (f.initial ? U.fmtNum(f.initial) : '') + '" placeholder="0"></div>' +
          '<span class="hint">Saldo saat ini di dompet ini sebelum dicatat di aplikasi.</span></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="w-save">Simpan</button>'
    });

    let color = f.color;
    el('w-icons').addEventListener('click', function (e) {
      const b = e.target.closest('[data-emoji]'); if (!b) return;
      el('w-icon').value = b.dataset.emoji;
      tandaiPilihan(el('w-icons'), b);
    });
    el('w-colors').addEventListener('click', function (e) {
      const b = e.target.closest('[data-color]'); if (!b) return;
      color = b.dataset.color;
      tandaiPilihan(el('w-colors'), b);
    });
    const initIn = el('w-initial');
    initIn.addEventListener('input', function () {
      const v = U.parseAmount(initIn.value); initIn.value = v ? U.fmtNum(v) : '';
    });

    el('w-save').onclick = async function () {
      const name = el('w-name').value.trim();
      if (!name) { V.toast('Nama dompet wajib diisi', 'err'); return; }
      const obj = {
        id: w ? w.id : U.uid('wlt'),
        name: name, type: el('w-type').value, icon: el('w-icon').value.trim() || '💳',
        color: color, initial: U.parseAmount(el('w-initial').value),
        archived: w ? !!w.archived : false
      };
      if (w) { const i = db.wallets.findIndex(function (x) { return x.id === w.id; }); db.wallets[i] = obj; }
      else db.wallets.push(obj);
      if (ctx && !db.categories.length) db.categories = S.seedDB().categories;
      if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
      V.toast(w ? 'Dompet diperbarui' : 'Dompet ditambahkan', 'ok');
      V.modal.close();
    };
  };

  V.walletDelete = async function (id) {
    const ctx = root.Buku && Buku.bersama() ? Buku.konteks(id, 'keluarga') : null;
    if (root.Buku && Buku.bersama() && !ctx) return;
    const db = ctx ? ctx.db : root.App.db;
    const w = db.wallets.filter(function (x) { return x.id === id; })[0];
    const n = S.txCountForWallet(db, id);
    const aktif = (db.wallets || []).filter(function (x) { return !x.archived; }).length;
    if (aktif <= 1) { V.toast('Minimal harus ada 1 dompet aktif', 'err'); return; }
    const ok = await V.confirm('Hapus dompet "' + H(w.name) + '"?',
      n ? 'Ada <b>' + n + ' transaksi</b> yang memakai dompet ini. Menghapus dompet akan <b>menghapus juga transaksi tersebut</b>. Lanjutkan?'
        : 'Dompet ini belum dipakai transaksi apa pun.',
      'Hapus dompet', true);
    if (!ok) return;
    const txs = db.transactions.filter(function (t) { return t.walletId === id || t.walletTo === id; });
    txs.forEach(function (t) { if (t.receiptId) root.App.deleteReceipt(t.receiptId); });
    db.transactions = db.transactions.filter(function (t) { return t.walletId !== id && t.walletTo !== id; });
    (db.goals || []).forEach(function (g) { if (g.walletId === id) g.walletId = ''; });
    (db.subscriptions || []).forEach(function (s) { if (s.walletId === id) s.walletId = ''; });
    db.wallets = db.wallets.filter(function (x) { return x.id !== id; });
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast('Dompet dihapus', 'ok');
  };

  /* ============================================================
     VIEW: KATEGORI
     ============================================================ */
  V.kategori = function () {
    const db = root.Buku && Buku.bersama() ? Buku.keluarga : root.App.db;
    const st = V.state.kategori;
    const from = U.monthStart(U.today()), to = U.monthEnd(U.today());
    const cats = (db.categories || []).filter(function (c) { return !c.archived && c.type === st.tab; });
    const used = {};
    S.byCategory(db, from, to, st.tab).forEach(function (r) { used[r.categoryId] = r.amount; });

    const rows = cats.map(function (c) {
      const n = S.txCountForCategory(db, c.id);
      const amt = used[c.id] || 0;
      return '<div class="item">' +
        '<div class="ico ' + (c.type === 'in' ? 'in' : 'out') + '">' + emo(c.icon) + '</div>' +
        '<div class="body"><div class="t1">' + H(c.name) + '</div>' +
          '<div class="t2">' + n + ' transaksi · bulan ini ' + U.fmtRp(amt) + '</div></div>' +
        '<div class="right">' + iconBtn('Ubah', 'edit', 'V.catForm(\'' + c.id + '\')') +
          iconBtn('Hapus', 'trash', 'V.catDelete(\'' + c.id + '\')') + '</div>' +
      '</div>';
    }).join('');

    return '<div class="card"><div class="card-head">' +
        '<div class="seg" style="width:auto" id="ct-tab">' +
          segBtn(st.tab, 'out', ARAH.out + 'Pengeluaran', 'out') + segBtn(st.tab, 'in', ARAH.in + 'Pemasukan', 'in') +
        '</div>' +
        '<span class="spacer"></span>' +
        '<button class="btn primary" onclick="V.catForm(null,\'' + st.tab + '\')">' + wrapIco('plus') + 'Tambah Kategori</button></div>' +
      (rows ? '<div class="list">' + rows + '</div>'
            : emptyBox('tag', 'Belum ada kategori. Tambahkan dulu.')) +
    '</div>' +
    '<div class="card mt"><div class="card-head"><h2>Pemakaian Kategori Bulan Ini</h2></div>' +
      categoryBars(db, from, to) + '</div>';
  };

  V.kategoriBind = function () {
    const t = el('ct-tab');
    if (t) t.addEventListener('click', function (e) {
      const b = e.target.closest('[data-seg]'); if (!b) return;
      V.state.kategori.tab = b.dataset.seg; root.App.render();
    });
  };

  V.catForm = function (id, presetType) {
    const ctx = root.Buku && Buku.bersama() ? Buku.konteks(id, 'keluarga') : null;
    if (root.Buku && Buku.bersama() && !ctx) return;
    const db = ctx ? ctx.db : root.App.db;
    const c = id ? db.categories.filter(function (x) { return x.id === id; })[0] : null;
    const f = c || { id: '', name: '', type: presetType || 'out', icon: '🏷️' };
    const EMOJI = ['🍽️','🚗','🛒','💡','🏠','💊','📚','🎬','📶','🏦','🤲','🐖','👕','✈️','🎁','💼','🏪','📈','➕','➖','🧾','☕','⛽','🅿️','🎮','💄','👶','🐶'];

    V.modal.open({
      title: c ? 'Ubah Kategori' : 'Tambah Kategori',
      body:
        '<div class="field"><label>Nama</label><input type="text" id="c-name" autocomplete="off" value="' + H(f.name) + '" placeholder="contoh: Kopi &amp; Jajan"></div>' +
        '<div class="field"><label>Jenis</label><div class="seg" id="c-type">' +
          segBtn(f.type, 'out', ARAH.out + 'Pengeluaran', 'out') + segBtn(f.type, 'in', ARAH.in + 'Pemasukan', 'in') + '</div></div>' +
        '<div class="field"><label>Ikon</label>' + pilihanEmoji('c-icons', EMOJI, f.icon) +
          '<input type="hidden" id="c-icon" value="' + H(f.icon) + '"></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="c-save">Simpan</button>'
    });

    let type = f.type, icon = f.icon;
    el('c-type').addEventListener('click', function (e) {
      const b = e.target.closest('[data-seg]'); if (!b) return;
      type = b.dataset.seg;
      Array.prototype.forEach.call(el('c-type').children, function (x) {
        const on = x === b;
        x.className = on ? 'on ' + (type === 'in' ? 'in' : 'out') : '';
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
    el('c-icons').addEventListener('click', function (e) {
      const b = e.target.closest('[data-emoji]'); if (!b) return;
      el('c-icon').value = b.dataset.emoji;
      icon = b.dataset.emoji;
      tandaiPilihan(el('c-icons'), b);
    });

    el('c-save').onclick = async function () {
      const name = el('c-name').value.trim();
      if (!name) { V.toast('Nama kategori wajib diisi', 'err'); return; }
      const obj = { id: c ? c.id : U.uid('cat'), name: name, type: type, icon: icon || '🏷️', archived: c ? !!c.archived : false };
      if (c) { const i = db.categories.findIndex(function (x) { return x.id === c.id; }); db.categories[i] = obj; }
      else db.categories.push(obj);
      if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
      V.toast(c ? 'Kategori diperbarui' : 'Kategori ditambahkan', 'ok');
      V.modal.close();
    };
  };

  V.catDelete = async function (id) {
    const ctx = root.Buku && Buku.bersama() ? Buku.konteks(id, 'keluarga') : null;
    if (root.Buku && Buku.bersama() && !ctx) return;
    const db = ctx ? ctx.db : root.App.db;
    const c = db.categories.filter(function (x) { return x.id === id; })[0];
    const n = S.txCountForCategory(db, id);
    const nb = (db.budgets || []).filter(function (b) { return b.categoryId === id; });
    const ns = (db.subscriptions || []).filter(function (s) { return s.categoryId === id; });
    const ekstra = (nb.length ? ' Anggaran kategori ini juga ikut dihapus.' : '') +
                  (ns.length ? ' ' + ns.length + ' langganan jadi tanpa kategori.' : '');
    const ok = await V.confirm('Hapus kategori "' + H(c.name) + '"?',
      (n ? 'Ada <b>' + n + ' transaksi</b> memakai kategori ini. Transaksinya <b>tetap ada</b> tapi jadi tanpa kategori.'
         : 'Kategori ini belum dipakai.') + ekstra,
      'Hapus', true);
    if (!ok) return;
    db.transactions.forEach(function (t) { if (t.categoryId === id) t.categoryId = ''; });
    (db.subscriptions || []).forEach(function (s) { if (s.categoryId === id) s.categoryId = ''; });
    db.budgets = (db.budgets || []).filter(function (b) { return b.categoryId !== id; });
    db.categories = db.categories.filter(function (x) { return x.id !== id; });
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast('Kategori dihapus', 'ok');
  };

  /* ============================================================
     VIEW: PENGATURAN
     ============================================================ */
  /* Sinkronisasi Google Drive sedang dimatikan. Saklar sebenarnya ada di
     js/gdrive.js (GDrive.terkunci); di sini hanya soal tampilan. */
  V.driveTerkunci = function () { return !!(root.GDrive && root.GDrive.terkunci); };

  V.pengaturan = function () {
    const db = root.App.db;
    const st = db.settings;
    const bytes = (function () { try { return (localStorage.getItem(root.App.storageKey()) || '').length; } catch (e) { return 0; } })();
    const rcpCount = Object.keys(db.receipts || {}).length;
    const rcpBytes = U.sum(Object.keys(db.receipts || {}).map(function (k) { return (db.receipts[k].data || '').length; }));

    return '' +
    '<div class="card"><div class="card-head"><h2>Backup &amp; Pemulihan</h2></div>' +
      '<p class="dim" style="font-size:13px;margin-bottom:14px">Ringkasan di bawah adalah buku pribadi di perangkat ini. Buku keluarga disimpan di server. ' +
      'Rutin unduh backup supaya aman kalau browser dibersihkan atau ganti perangkat.</p>' +
      '<div class="grid cols-4" style="margin-bottom:16px">' +
        '<div class="stat"><div class="lbl">Transaksi</div><div class="val" style="font-size:18px">' + db.transactions.length + '</div></div>' +
        '<div class="stat"><div class="lbl">Dompet</div><div class="val" style="font-size:18px">' + db.wallets.length + '</div></div>' +
        '<div class="stat"><div class="lbl">Kategori</div><div class="val" style="font-size:18px">' + db.categories.length + '</div></div>' +
        '<div class="stat"><div class="lbl">Ukuran data</div><div class="val" style="font-size:18px">' + (bytes / 1024).toFixed(0) + ' KB</div>' +
          '<div class="sub">' + rcpCount + ' struk · ' + (rcpBytes / 1024).toFixed(0) + ' KB</div></div>' +
      '</div>' +
      '<div class="row">' +
        '<button class="btn primary" onclick="V.exportJSON()">' + wrapIco('download') + 'Unduh Backup (JSON)</button>' +
        '<button class="btn" onclick="V.exportExcel()">' + wrapIco('download') + 'Excel (.xlsx)</button>' +
        '<button class="btn" onclick="V.exportCSV()">' + wrapIco('download') + 'CSV (data teks)</button>' +
        '<label for="st-impor-buku">Tujuan pemulihan</label><select id="st-impor-buku" aria-label="Buku tujuan pemulihan"><option value="pribadi">Buku pribadi</option><option value="keluarga">Buku keluarga</option></select>' +
        '<label class="btn" style="cursor:pointer">' + wrapIco('folder') + 'Impor Backup<input type="file" id="st-import" accept=".json,application/json" hidden></label>' +
        '<span class="spacer"></span>' +
        '<button class="btn danger" onclick="V.resetAll()">' + wrapIco('alert') + 'Reset Data Pribadi</button>' +
      '</div>' +
      '<div class="row mt" style="gap:10px"><label class="row" style="font-size:13px;gap:8px;cursor:pointer">' +
        '<input type="checkbox" id="st-pw-import" style="width:auto"> Impor menggantikan seluruh isi buku tujuan (bukan menggabung)</label></div>' +
    '</div>' +

    '<div class="card mt"><div class="card-head"><h2>Penyimpanan &amp; sinkronisasi</h2></div>' +
      '<p class="dim"><strong>Buku pribadi:</strong> tersimpan di perangkat ini. Jika akun mendukung cloud pribadi, perubahan juga dikirim ke cloud. Status berikut adalah hasil proses terakhir, bukan jaminan koneksi saat ini.</p>' +
      '<span class="net-dot" id="st-net-dot"><span></span><em>Belum ada konfirmasi sinkronisasi</em></span>' +
      '<p role="status">' + H(App.statusSinkronKeluarga()) + '</p>' +
      '<p class="dim">Buku bersama disimpan terpisah di server. Tombol di bawah mengirim salinan pribadi jika tersedia dan memuat ulang buku bersama; keduanya tidak digabung.</p>' +
      '<div class="row">' +
        '<button class="btn primary" onclick="App.manualSyncCloud()">' + wrapIco('refresh') + 'Sinkronkan Sekarang (Cloudflare)</button>' +
      '</div>' +
    '</div>' +

    (V.driveTerkunci() ?
    '<div class="card mt"><div class="card-head"><h2>Sinkronisasi Google Drive</h2>' +
      '<span class="net-dot"><span></span><em>Dinonaktifkan</em></span></div>' +
      '<p class="dim" style="font-size:13px;margin-bottom:14px">' +
        'Fitur ini dinonaktifkan sementara. Catatan tetap aman dan tersimpan di perangkat ini.</p>' +
      '<div class="row">' +
        '<button class="btn primary" id="st-drive-connect" disabled style="opacity:.5">' + wrapIco('cloud') + 'Sambungkan Drive</button>' +
      '</div>' +
    '</div>' :
    '<div class="card mt"><div class="card-head"><h2>Sinkronisasi Google Drive</h2>' +
      '<span class="net-dot' + (st.driveEnabled && st.driveFileId ? ' on' : '') + '"><span></span><em>' +
        (st.driveEnabled && st.driveFileId ? (st.lastSync ? 'Terhubung · ' + H(U.fmtDate(String(st.lastSync).slice(0, 10))) : 'Terhubung') : 'Belum tersambung') + '</em></span></div>' +
      '<p class="dim" style="font-size:13px;margin-bottom:14px">' +
        'Supaya data ikut tersimpan ke Drive, isi <b>OAuth Client ID</b> dari Google Cloud Console di bawah, ' +
        'lalu klik <b>Sambungkan Drive</b>. Tanpa Client ID, aplikasi tetap berjalan normal dengan penyimpanan lokal.</p>' +
      '<div class="field"><label>OAuth Client ID</label>' +
        '<input type="text" id="st-client" aria-describedby="st-client-hint" value="' + H(st.driveClientId) + '" placeholder="xxxxx.apps.googleusercontent.com">' +
        '<span class="hint" id="st-client-hint">Buat di console.cloud.google.com → APIs &amp; Services → Credentials → OAuth client ID → Web application. ' +
        'Tambahkan <code>' + H(location.origin || 'file://') + '</code> ke Authorized JavaScript origins, dan aktifkan <b>Google Drive API</b>.</span></div>' +
      '<div class="row">' +
        '<button class="btn primary" id="st-drive-connect" ' + (st.driveClientId ? '' : 'disabled style="opacity:.5"') + '>' + wrapIco('cloud') + 'Sambungkan Drive</button>' +
        '<button class="btn" id="st-drive-push" ' + (st.driveFileId ? '' : 'disabled style="opacity:.5"') + '>' + wrapIco('upload') + 'Kirim ke Drive</button>' +
        '<button class="btn" id="st-drive-pull" ' + (st.driveFileId ? '' : 'disabled style="opacity:.5"') + '>' + wrapIco('download') + 'Ambil dari Drive</button>' +
        '<button class="btn danger" id="st-drive-off" ' + (st.driveFileId ? '' : 'disabled style="opacity:.5"') + '>Putuskan</button>' +
      '</div>' +
      (st.lastSync ? '<div class="muted mt" style="font-size:12px">Sinkron terakhir: ' + H(new Date(st.lastSync).toLocaleString('id-ID')) + '</div>' : '') +
    '</div>') +

    '<div class="card mt"><div class="card-head"><h2>Tentang</h2></div>' +
      '<div class="tbl-wrap"><table><tbody>' +
        '<tr><td class="dim">Versi aplikasi</td><td>1.0.0 (Tahap 1)</td></tr>' +
        '<tr><td class="dim">Versi skema data</td><td>' + db.version + '</td></tr>' +
        '<tr><td class="dim">Dibuat</td><td>' + H(db.meta.created ? new Date(db.meta.created).toLocaleString('id-ID') : '-') + '</td></tr>' +
        '<tr><td class="dim">Terakhir diubah</td><td>' + H(db.meta.updated ? new Date(db.meta.updated).toLocaleString('id-ID') : '-') + '</td></tr>' +
        '<tr><td class="dim">Penyimpanan</td><td>localStorage' + (!V.driveTerkunci() && st.driveEnabled && st.driveFileId ? ' + Google Drive' : '') + '</td></tr>' +
      '</tbody></table></div>' +
      '<p class="dim mt" style="font-size:12.5px">Fitur tahap berikutnya: monitor langganan bulanan, target tabungan, anggaran per kategori, dan grafik lanjutan.</p>' +
    '</div>';
  };

  V.pengaturanBind = function () {
    const imp = el('st-import');
    if (imp) imp.onchange = function () { V.importJSON(imp.files[0]); };
    const cl = el('st-client');
    if (cl) {
      cl.oninput = function () {
        const val = cl.value.trim();
        root.App.db.settings.driveClientId = val;
        const dc = el('st-drive-connect');
        if (dc) {
          dc.disabled = !val;
          dc.style.opacity = val ? '1' : '.5';
        }
      };
      cl.onchange = function () {
        root.App.db.settings.driveClientId = cl.value.trim();
        root.App.save();
        root.App.render();
      };
    }
    const dc = el('st-drive-connect'); if (dc) dc.onclick = function () { V.driveConnect(); };
    const dp = el('st-drive-push');    if (dp) dp.onclick = function () { V.drivePush(); };
    const dl = el('st-drive-pull');    if (dl) dl.onclick = function () { V.drivePull(); };
    const dof = el('st-drive-off');    if (dof) dof.onclick = function () { V.driveOff(); };
  };

  V.exportJSON = function (sumber) {
    if (!sumber) return V.pilihEkspor('json');
    const db = JSON.parse(JSON.stringify(V.bukuBackup(sumber)));
    db.backup = { format: 'kantongkita', version: 1, sumber: sumber, waktu: new Date().toISOString() };
    const f = S.Persist.exportFile(db, sumber);
    root.App.download(f.name, 'application/json', f.text);
    V.toast('Backup buku ' + sumber + ' diunduh', 'ok');
  };

  V.importJSON = function (file) {
    if (!file) return;
    const sumber = el('st-impor-buku') ? el('st-impor-buku').value : 'pribadi';
    const replace = !!(el('st-pw-import') && el('st-pw-import').checked);
    const akun = root.K && K.nama;
    const profil = root.App.storageKey();
    const revisi = root.Buku && Buku.revisi;
    const fr = new FileReader();
    fr.onload = async function () {
      try {
        let raw;
        try { raw = JSON.parse(fr.result); } catch (e) { throw Error('Berkas bukan JSON yang valid'); }
        const keys = ['wallets', 'categories', 'transactions', 'budgets', 'goals', 'subscriptions'];
        if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
            keys.some(k => !Array.isArray(raw[k])) ||
            keys.some(k => raw[k].some(x => !x || typeof x !== 'object' || !x.id || x._sumber || x._id)) ||
            !raw.receipts || typeof raw.receipts !== 'object' || Array.isArray(raw.receipts)) {
          throw Error('Berkas itu bukan backup KantongKita yang lengkap');
        }
        if (raw.backup && (!['savingduit', 'kantongkita'].includes(raw.backup.format) || raw.backup.version !== 1 || raw.backup.sumber !== sumber)) {
          throw Error('Sumber backup berbeda. Pilih buku tujuan yang sesuai; data tidak diimpor.');
        }
        const cekSesi = function () {
          if ((root.K && K.nama) !== akun || root.App.storageKey() !== profil) throw Error('Akun/profil berubah. Ulangi impor.');
          if (sumber === 'keluarga' && Buku.revisi !== revisi) throw Error('Buku keluarga berubah. Muat ulang lalu ulangi impor.');
          return V.bukuBackup(sumber);
        };
        cekSesi();
        const ok = await V.confirm('Impor ke buku ' + sumber + '?',
          (raw.backup ? '' : '<b>Backup lama: sumber buku tidak diketahui. Pastikan tujuan benar.</b><br>') +
          (sumber === 'keluarga' ? 'Hasilnya terlihat oleh semua anggota keluarga.<br>' : 'Hanya buku pribadi yang diubah.<br>') +
          (replace ? 'Seluruh isi buku tujuan diganti. ' : 'Data digabung berdasarkan ID. ID yang bertabrakan ditolak. ') +
          raw.transactions.length + ' transaksi. Unduh backup buku tujuan terlebih dahulu.', 'Impor', replace);
        if (!ok) return;
        const current = cekSesi();
        const hasil = S.normalize(JSON.parse(JSON.stringify(replace ? raw : current)));
        if (!replace) {
          keys.forEach(function (key) {
            const have = new Map(hasil[key].map(x => [x.id, x]));
            raw[key].forEach(function (x) {
              if (have.has(x.id)) {
                if (JSON.stringify(have.get(x.id)) !== JSON.stringify(x)) throw Error('ID bertabrakan pada ' + key + '. Tidak ada data yang diubah.');
              } else { hasil[key].push(JSON.parse(JSON.stringify(x))); have.set(x.id, x); }
            });
          });
          Object.keys(raw.receipts).forEach(function (id) {
            if (hasil.receipts[id] && JSON.stringify(hasil.receipts[id]) !== JSON.stringify(raw.receipts[id])) throw Error('ID struk bertabrakan. Tidak ada data yang diubah.');
            hasil.receipts[id] = raw.receipts[id];
          });
        }
        keys.forEach(function (key) {
          if (new Set(hasil[key].map(x => x.id)).size !== hasil[key].length) throw Error('ID duplikat dalam backup.');
        });
        const wallets = new Set(hasil.wallets.map(x => x.id)), cats = new Set(hasil.categories.map(x => x.id));
        if (hasil.transactions.some(t => typeof t.amount !== 'number' || !Number.isFinite(t.amount) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.date) || !wallets.has(t.walletId) || (t.walletTo && !wallets.has(t.walletTo)) || (t.categoryId && !cats.has(t.categoryId)) || Object.keys(S.validateTx(t)).length || !['in', 'out', 'move'].includes(t.type))) throw Error('Transaksi tidak valid atau referensi dompet/kategori tidak ditemukan.');
        if (hasil.budgets.some(x => x.categoryId && !cats.has(x.categoryId))) throw Error('Kategori anggaran tidak ditemukan.');
        hasil.meta.updated = new Date().toISOString();
        if (sumber === 'keluarga') {
          await Buku.simpan(hasil, revisi);
          root.App.render();
        } else {
          root.App.db = hasil;
          root.App.saveAndRender();
        }
        V.toast('Impor buku ' + sumber + ' selesai', 'ok');
      } catch (e) { V.toast(e.message || 'Impor gagal. Data tidak diubah.', 'err'); }
    };
    fr.readAsText(file);
  };

  V.resetAll = async function () {
    const ok = await V.confirm('Reset data pribadi?',
      'Semua dompet, kategori, transaksi, dan struk pribadi akan <b>dihapus</b> dan diganti dengan contoh awal. Buku keluarga tidak diubah. ' +
      'Pastikan kamu sudah mengunduh backup.', 'Ya, reset', true);
    if (!ok) return;
    root.App.db = S.seedDB();
    root.App.saveAndRender();
    V.toast('Data direset ke awal', 'ok');
  };

  /* ---------- Google Drive ---------- */
  V.driveConnect = function () {
    if (V.driveTerkunci()) { V.toast('Sinkronisasi Google Drive sedang dinonaktifkan', 'info'); return; }
    const cl = el('st-client');
    if (cl && cl.value.trim()) {
      root.App.db.settings.driveClientId = cl.value.trim();
      root.App.save();
    }
    const cid = root.App.db.settings.driveClientId;
    if (!cid) { V.toast('Isi OAuth Client ID dulu', 'err'); return; }
    if (!root.GDrive) { V.toast('Modul Drive belum dimuat pada versi ini', 'err'); return; }
    V.toast('Membuka login Google...', 'info');
    root.GDrive.connect(cid).then(function () {
      root.App.db.settings.driveEnabled = true;
      root.App.save();
      V.toast('Drive berhasil tersambung! Menyiapkan berkas...', 'ok');
      return root.GDrive.ensureFile(root.App.db).then(function () {
        root.App.save();
        root.App.render();
        V.toast('Google Drive siap digunakan', 'ok');
      });
    }).catch(function (e) {
      V.toast('Gagal menyambung: ' + e.message, 'err');
    });
  };
  V.drivePush = function () {
    if (V.driveTerkunci()) { V.toast('Sinkronisasi Google Drive sedang dinonaktifkan', 'info'); return; }
    if (!root.GDrive) { V.toast('Modul Drive belum dimuat', 'err'); return; }
    root.GDrive.push(root.App.db).then(function () {
      root.App.db.settings.lastSync = new Date().toISOString();
      root.App.save(); V.toast('Tersimpan ke Drive', 'ok'); root.App.render();
    }).catch(function (e) { V.toast('Gagal kirim: ' + e.message, 'err'); });
  };
  V.drivePull = function () {
    if (V.driveTerkunci()) { V.toast('Sinkronisasi Google Drive sedang dinonaktifkan', 'info'); return; }
    if (!root.GDrive) { V.toast('Modul Drive belum dimuat', 'err'); return; }
    root.GDrive.pull().then(async function (remote) {
      if (!remote) { V.toast('Belum ada file di Drive', 'err'); return; }
      const ok = await V.confirm('Ambil data dari Drive?', 'Data lokal akan diganti dengan versi dari Drive.', 'Ambil', true);
      if (!ok) return;
      root.App.db = S.normalize(remote);
      root.App.db.settings.lastSync = new Date().toISOString();
      root.App.saveAndRender();
      V.toast('Data diambil dari Drive', 'ok');
    }).catch(function (e) { V.toast('Gagal ambil: ' + e.message, 'err'); });
  };
  V.driveOff = async function () {
    if (V.driveTerkunci()) { V.toast('Sinkronisasi Google Drive sedang dinonaktifkan', 'info'); return; }
    const ok = await V.confirm('Putuskan Drive?', 'Data lokal tetap ada, hanya sinkronisasi yang dimatikan.', 'Putuskan', true);
    if (!ok) return;
    const db = root.App.db;
    db.settings.driveEnabled = false; db.settings.driveFileId = ''; db.settings.lastSync = '';
    root.App.saveAndRender();
    V.toast('Drive diputus', 'ok');
  };

  /* ============================================================
     VIEW: ANGGARAN (batas pengeluaran per kategori)
     ============================================================ */
  V.anggaran = function () {
    const db = root.Buku ? Buku.data() : root.App.db;
    const today = U.today();
    const rows = S.budgetStatus(db, today);
    const tot = S.budgetTotal(db, today);

    const kartu = rows.map(function (r) {
      const u = r.usage, c = r.category;
      const habis = u.limit > 0 && u.left <= 0;
      return '<div class="card card-sm">' +
        '<div class="card-head">' +
          '<div class="ico-badge ' + (u.over ? 'out' : 'in') + '">' + emo(c.icon) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="t1">' + H(c.name) + (r.valid ? '' : ' <span class="tag out">kategori hilang</span>') + '</div>' +
            '<div class="t2">' + (r.budget.period === 'year' ? 'per tahun' : 'per bulan') +
              (r.budget.note ? ' · ' + H(r.budget.note) : '') + '</div>' +
          '</div>' +
          pctTag(u.pct, u.over) +
          iconBtn('Ubah', 'edit', 'V.budgetForm(\'' + r.budget.id + '\')') +
          iconBtn('Hapus', 'trash', 'V.budgetDelete(\'' + r.budget.id + '\')') +
        '</div>' +
        progBar(u.pct, u.over ? 'over' : (u.pct >= 80 ? 'warn' : '')) +
        '<div class="row" style="justify-content:space-between;margin-top:9px;font-size:12.5px">' +
          '<span class="num">' + U.fmtRp(u.used) + ' <span class="muted">dari</span> ' + U.fmtRp(u.limit) + '</span>' +
          '<span class="num ' + (habis ? 'val-out' : 'val-in') + '">' +
            (habis ? 'lewat ' + U.fmtRp(-u.left) : 'sisa ' + U.fmtRp(u.left)) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    const catOut = (db.categories || []).filter(function (c) { return !c.archived && c.type === 'out'; });
    const dipakai = {};
    (db.budgets || []).forEach(function (b) { dipakai[b.categoryId] = true; });
    const belum = catOut.filter(function (c) { return !dipakai[c.id]; });

    return '<div class="card"><div class="card-head">' +
        '<span class="muted" style="font-size:12px">' + U.fmtMonth(U.monthOf(today)) + '</span>' +
        '<span class="spacer"></span>' +
        '<button class="btn primary" onclick="V.budgetForm()">' + wrapIco('plus') + 'Tambah Anggaran</button></div>' +
      (rows.length
        ? '<div class="grid cols-3">' + kartu + '</div>'
        : emptyBox('target', 'Belum ada anggaran. Pasang batas pengeluaran supaya lebih terkendali.')) +
      (rows.length ? '<div class="grid cols-4 mt">' +
        '<div class="stat"><div class="lbl">Total anggaran</div><div class="val" style="font-size:17px">' + U.fmtRpShort(tot.limit) + '</div></div>' +
        '<div class="stat out"><div class="lbl">Terpakai</div><div class="val" style="font-size:17px">' + U.fmtRpShort(tot.used) + '</div>' +
          '<div class="sub">' + U.round1(tot.pct) + '% dari anggaran</div></div>' +
        '<div class="stat' + (tot.left < 0 ? ' out' : ' in') + '"><div class="lbl">' + (tot.left < 0 ? 'Lebih' : 'Sisa') + '</div>' +
          '<div class="val" style="font-size:17px">' + U.fmtRpShort(Math.abs(tot.left)) + '</div></div>' +
        '<div class="stat"><div class="lbl">Kategori dianggarkan</div><div class="val" style="font-size:17px">' + rows.filter(function (r) { return r.valid; }).length + '</div>' +
          '<div class="sub">dari ' + catOut.length + ' kategori pengeluaran</div></div>' +
      '</div>' : '') +
    '</div>' +

    (belum.length ? '<div class="card mt"><div class="card-head"><h2>Belum Dianggarkan</h2>' +
      '<span class="muted" style="font-size:12px">klik untuk memasang batas</span></div>' +
      '<div class="row" style="gap:8px">' + belum.map(function (c) {
        return '<button class="btn sm" onclick="V.budgetForm(null,\'' + c.id + '\')">' + emo(c.icon) + H(c.name) + '</button>';
      }).join('') + '</div></div>' : '') +

    (rows.length ? '<div class="card mt"><div class="card-head"><h2>Pemakaian Anggaran Bulan Ini</h2></div>' +
      '<div class="tbl-wrap"><table><thead><tr><th>Kategori</th><th>Batas</th><th>Terpakai</th><th>Sisa</th><th style="width:150px">Progres</th></tr></thead><tbody>' +
      rows.map(function (r) {
        const u = r.usage;
        return '<tr><td>' + emo(r.category.icon) + H(r.category.name) + '</td>' +
          '<td class="num">' + U.fmtRp(u.limit) + '</td>' +
          '<td class="num">' + U.fmtRp(u.used) + '</td>' +
          '<td class="num ' + (u.left < 0 ? 'val-out' : '') + '">' + U.fmtRp(u.left) + '</td>' +
          '<td>' + progBar(u.pct, u.over ? 'over' : (u.pct >= 80 ? 'warn' : '')) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' : '');
  };

  V.budgetForm = function (id, presetCat, sumber) {
    if (root.Buku && !id && !presetCat && !sumber) { Buku.pilihSumber(pilihan => V.budgetForm(null, null, pilihan)); return; }
    const ctx = root.Buku ? Buku.konteks(id || presetCat, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) { if (id) id = ctx.id; else if (presetCat) presetCat = ctx.id; }
    const db = ctx ? ctx.db : root.App.db;
    const b = id ? (db.budgets || []).filter(function (x) { return x.id === id; })[0] : null;
    const catOut = (db.categories || []).filter(function (c) { return !c.archived && c.type === 'out'; });
    if (!catOut.length) { V.toast('Belum ada kategori pengeluaran, tambahkan dulu di menu Kategori', 'err'); return; }
    const f = b || { id: '', categoryId: presetCat || '', limit: '', period: 'month', note: '' };

    V.modal.open({
      title: b ? 'Ubah Anggaran' : 'Tambah Anggaran',
      body:
        (ctx ? '<p class="hint">' + (ctx.sumber === 'keluarga' ? 'Terlihat oleh keluarga' : 'Hanya kamu') + '</p>' : '') +
        '<div class="field"><label>Kategori pengeluaran</label>' +
          '<select id="b-cat">' + pilihanKategori(db, f.categoryId, 'out') + '</select></div>' +
        '<div class="field"><label>Batas anggaran</label>' +
          '<div class="money-input"><b>Rp</b><input type="text" inputmode="numeric" id="b-limit" value="' +
            (f.limit ? U.fmtNum(f.limit) : '') + '" placeholder="contoh: 1.500.000"></div>' +
          '<span class="hint">Batas pengeluaran untuk kategori ini.</span></div>' +
        '<div class="field"><label>Periode</label><select id="b-period">' +
          opsiNilai([['month', 'Per bulan'], ['year', 'Per tahun']], f.period) + '</select></div>' +
        '<div class="field"><label>Catatan <span class="muted">(opsional)</span></label>' +
          '<input type="text" id="b-note" value="' + H(f.note) + '" placeholder="contoh: jatah makan sebulan"></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="b-save">Simpan</button>'
    });

    const limIn = el('b-limit');
    limIn.addEventListener('input', function () {
      const v = U.parseAmount(limIn.value); limIn.value = v ? U.fmtNum(v) : '';
    });

    el('b-save').onclick = async function () {
      const catId = el('b-cat').value;
      const limit = U.parseAmount(limIn.value);
      if (!catId) { V.toast('Pilih kategori dulu', 'err'); return; }
      if (!(limit > 0)) { V.toast('Batas anggaran harus lebih dari 0', 'err'); return; }
      const lain = (db.budgets || []).filter(function (x) { return x.categoryId === catId && (!b || x.id !== b.id); })[0];
      if (lain) { V.toast('Kategori ini sudah punya anggaran, ubah yang ada saja', 'err'); return; }
      const obj = {
        id: b ? b.id : U.uid('bud'),
        categoryId: catId, limit: limit,
        period: el('b-period').value, note: el('b-note').value.trim()
      };
      if (el('b-save').disabled) return;
      el('b-save').disabled = true;
      if (b) { const i = db.budgets.findIndex(function (x) { return x.id === b.id; }); db.budgets[i] = obj; }
      else db.budgets.push(obj);
      if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
      V.toast(b ? 'Anggaran diperbarui' : 'Anggaran ditambahkan', 'ok');
      V.modal.close();
    };
  };

  V.budgetDelete = async function (id, sumber) {
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const b = (db.budgets || []).filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    const c = db.categories.filter(function (x) { return x.id === b.categoryId; })[0];
    const ok = await V.confirm('Hapus anggaran ' + H(c ? c.name : 'kategori ini') + '?',
      'Transaksi yang sudah dicatat <b>tidak terhapus</b>, hanya batas anggarannya yang dihilangkan.', 'Hapus', true);
    if (!ok) return;
    db.budgets = db.budgets.filter(function (x) { return x.id !== id; });
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast('Anggaran dihapus', 'ok');
  };

  /* ============================================================
     VIEW: TARGET TABUNGAN
     ============================================================ */
  V.target = function () {
    const db = root.Buku ? Buku.data() : root.App.db;
    const today = U.today();
    const list = S.goalStatus(db, today);
    const tot = S.goalTotal(db);

    const kartu = list.map(function (r) {
      const g = r.goal, p = r.progress;
      const badge = p.done ? '<span class="tag ok">tercapai</span>'
                  : r.late ? '<span class="tag over">terlambat</span>'
                  : (r.daysLeft !== null && r.daysLeft <= 31 ? '<span class="tag warn">' + H(sisaHari(r.daysLeft)) + '</span>' : '');
      return '<div class="card card-sm">' +
        '<div class="card-head">' +
          '<div class="ico-badge ' + (p.done ? 'in' : 'move') + '">' + emo(g.icon || '🎯') + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="t1">' + H(g.name) + ' ' + badge + '</div>' +
            '<div class="t2">' + (g.due ? 'tenggat ' + H(U.fmtDate(g.due)) + ' · ' + H(sisaHari(r.daysLeft)) : 'tanpa tenggat') +
              (r.wallet ? ' · ' + emo(r.wallet.icon) + H(r.wallet.name) : '') + '</div>' +
          '</div>' +
          iconBtn('Ubah', 'edit', 'V.goalForm(\'' + g.id + '\')') +
          iconBtn('Hapus', 'trash', 'V.goalDelete(\'' + g.id + '\')') +
        '</div>' +
        progBar(p.pct, p.done ? 'in' : (r.late ? 'over' : '')) +
        '<div class="row" style="justify-content:space-between;margin-top:9px;font-size:13px">' +
          '<span class="num"><b>' + U.fmtRp(p.saved) + '</b> <span class="muted">dari</span> ' + U.fmtRp(p.target) + '</span>' +
          '<span class="num muted">' + U.round1(p.rawPct) + '%</span>' +
        '</div>' +
        '<div class="row mt" style="gap:7px">' +
          '<button class="btn sm primary" onclick="V.goalAdd(\'' + g.id + '\')">' + wrapIco('plus') + 'Nabung</button>' +
          (p.saved > 0 ? '<button class="btn sm" onclick="V.goalAdd(\'' + g.id + '\',true)">' + wrapIco('minus') + 'Tarik</button>' : '') +
          '<span class="spacer"></span>' +
          (p.done ? '<span class="muted" style="font-size:12px">Selesai</span>'
                  : '<span class="muted" style="font-size:12px">' + (r.monthlyNeed === null ? 'sisa ' + U.fmtRp(p.left)
                     : 'perlu ' + U.fmtRp(r.monthlyNeed) + '/bulan') + '</span>') +
        '</div>' +
        (g.note ? '<div class="muted" style="font-size:12px;margin-top:9px">' + H(g.note) + '</div>' : '') +
      '</div>';
    }).join('');

    return '<div class="card"><div class="card-head"><span class="spacer"></span>' +
        '<button class="btn primary" onclick="V.goalForm()">' + wrapIco('plus') + 'Tambah Target</button></div>' +
      (list.length
        ? '<div class="grid cols-3">' + kartu + '</div>'
        : emptyBox('target', 'Belum ada target tabungan. Misalnya: dana darurat, laptop baru, liburan.')) +
      (list.length ? '<div class="grid cols-4 mt">' +
        '<div class="stat"><div class="lbl">Total target</div><div class="val" style="font-size:17px">' + U.fmtRpShort(tot.target) + '</div>' +
          '<div class="sub">' + tot.total + ' target</div></div>' +
        '<div class="stat in"><div class="lbl">Terkumpul</div><div class="val" style="font-size:17px">' + U.fmtRpShort(tot.saved) + '</div>' +
          '<div class="sub">' + U.round1(tot.pct) + '% dari total target</div></div>' +
        '<div class="stat"><div class="lbl">Kurang</div><div class="val" style="font-size:17px">' + U.fmtRpShort(Math.max(0, tot.target - tot.saved)) + '</div></div>' +
        '<div class="stat"><div class="lbl">Tercapai</div><div class="val" style="font-size:17px">' + tot.done + ' <span class="muted" style="font-size:13px">/ ' + tot.total + '</span></div></div>' +
      '</div>' : '') +
    '</div>';
  };

  V.goalForm = function (id, sumber) {
    if (root.Buku && !id && !sumber) { Buku.pilihSumber(pilihan => V.goalForm(null, pilihan)); return; }
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const g = id ? (db.goals || []).filter(function (x) { return x.id === id; })[0] : null;
    const f = g || { id: '', name: '', icon: '🎯', target: '', saved: '', walletId: '', due: '', note: '' };

    V.modal.open({
      title: g ? 'Ubah Target' : 'Tambah Target Tabungan',
      body:
        (ctx ? '<p class="hint">' + (ctx.sumber === 'keluarga' ? 'Terlihat oleh keluarga' : 'Hanya kamu') + '</p>' : '') +
        '<div class="field"><label>Nama target</label>' +
          '<input type="text" id="g-name" autocomplete="off" value="' + H(f.name) + '" placeholder="contoh: Dana darurat"></div>' +
        '<div class="field"><label>Ikon</label>' + pilihanEmoji('g-icons', IKON_TARGET, f.icon) +
          '<input type="hidden" id="g-icon" value="' + H(f.icon) + '"></div>' +
        '<div class="field"><label>Target dana</label>' +
          '<div class="money-input"><b>Rp</b><input type="text" inputmode="numeric" id="g-target" value="' +
            (f.target ? U.fmtNum(f.target) : '') + '" placeholder="contoh: 20.000.000"></div></div>' +
        '<div class="field"><label>Sudah terkumpul <span class="muted">(opsional)</span></label>' +
          '<div class="money-input"><b>Rp</b><input type="text" inputmode="numeric" id="g-saved" value="' +
            (f.saved ? U.fmtNum(f.saved) : '') + '" placeholder="0"></div></div>' +
        '<div class="field"><label>Dompet tujuan <span class="muted">(opsional)</span></label>' +
          '<select id="g-wallet">' + pilihanDompet(db, f.walletId) + '</select>' +
          '<span class="hint">Penanda saja, uangnya tetap dihitung di saldo dompet.</span></div>' +
        '<div class="field"><label>Tenggat <span class="muted">(opsional)</span></label>' +
          '<input type="date" id="g-due" value="' + H(f.due) + '">' +
          '<span class="hint">Dengan tenggat, aplikasi menghitung berapa yang perlu ditabung per bulan.</span></div>' +
        '<div class="field"><label>Catatan <span class="muted">(opsional)</span></label>' +
          '<input type="text" id="g-note" value="' + H(f.note) + '" placeholder="contoh: untuk beli laptop kerja"></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="g-save">Simpan</button>'
    });

    el('g-icons').addEventListener('click', function (e) {
      const b = e.target.closest('[data-emoji]'); if (!b) return;
      el('g-icon').value = b.dataset.emoji;
      tandaiPilihan(el('g-icons'), b);
    });

    ['g-target', 'g-saved'].forEach(function (id2) {
      const inp = el(id2);
      inp.addEventListener('input', function () {
        const v = U.parseAmount(inp.value); inp.value = v ? U.fmtNum(v) : '';
      });
    });

    el('g-save').onclick = async function () {
      const name = el('g-name').value.trim();
      const target = U.parseAmount(el('g-target').value);
      if (!name) { V.toast('Nama target wajib diisi', 'err'); return; }
      if (!(target > 0)) { V.toast('Target dana harus lebih dari 0', 'err'); return; }
      const obj = {
        id: g ? g.id : U.uid('goal'),
        name: name, icon: el('g-icon').value.trim() || '🎯',
        target: target, saved: U.parseAmount(el('g-saved').value),
        walletId: el('g-wallet').value, due: el('g-due').value,
        note: el('g-note').value.trim()
      };
      if (el('g-save').disabled) return;
      el('g-save').disabled = true;
      if (g) { const i = db.goals.findIndex(function (x) { return x.id === g.id; }); db.goals[i] = obj; }
      else db.goals.push(obj);
      if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
      V.toast(g ? 'Target diperbarui' : 'Target ditambahkan', 'ok');
      V.modal.close();
    };
  };

  // + Nabung / − Tarik dari sebuah target
  V.goalAdd = function (id, minus, sumber) {
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const g = (db.goals || []).filter(function (x) { return x.id === id; })[0];
    if (!g) return;
    const p = S.goalProgress(g);
    V.modal.open({
      title: (minus ? 'Tarik dari ' : 'Nabung ke ') + H(g.name),
      body:
        (ctx ? '<p class="hint">' + (ctx.sumber === 'keluarga' ? 'Terlihat oleh keluarga' : 'Hanya kamu') + '</p>' : '') +
        '<div class="field"><label>Nominal</label>' +
          '<div class="money-input"><b>Rp</b><input type="text" inputmode="numeric" id="ga-amt" value="" placeholder="0"></div>' +
          '<span class="hint">Terkumpul sekarang ' + U.fmtRp(p.saved) + ' dari ' + U.fmtRp(p.target) +
            ' · sisa ' + U.fmtRp(p.left) + '</span></div>' +
        (minus ? '' : '<div class="row" style="gap:7px;margin-bottom:13px">' + [50000, 100000, 500000, 1000000].map(function (v) {
          return '<button class="btn sm" data-cepat="' + v + '">+' + U.fmtRpShort(v) + '</button>';
        }).join('') + '</div>'),
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="ga-save">' +
        (minus ? 'Tarik' : 'Nabung') + '</button>'
    });

    const inp = el('ga-amt');
    inp.addEventListener('input', function () {
      const v = U.parseAmount(inp.value); inp.value = v ? U.fmtNum(v) : '';
    });
    const cepat = el('modal-body').querySelector('[data-cepat]');
    if (cepat) el('modal-body').addEventListener('click', function (e) {
      const b = e.target.closest('[data-cepat]'); if (!b) return;
      const v = U.parseAmount(inp.value) + Number(b.dataset.cepat);
      inp.value = U.fmtNum(v);
    });

    el('ga-save').onclick = async function () {
      const amt = U.parseAmount(inp.value);
      if (!(amt > 0)) { V.toast('Nominal harus lebih dari 0', 'err'); return; }
      if (el('ga-save').disabled) return;
      el('ga-save').disabled = true;
      if (minus) {
        const baru = Math.max(0, Number(g.saved || 0) - amt);
        const nyata = Number(g.saved || 0) - baru;
        g.saved = baru;

      } else {
        g.saved = Number(g.saved || 0) + amt;

      }
      if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
      V.modal.close();
    };
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
  };

  V.goalDelete = async function (id, sumber) {
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const g = (db.goals || []).filter(function (x) { return x.id === id; })[0];
    if (!g) return;
    const ok = await V.confirm('Hapus target "' + H(g.name) + '"?',
      'Catatan target ini akan dihapus. <b>Saldo dompet dan transaksi tidak berubah.</b>', 'Hapus', true);
    if (!ok) return;
    db.goals = db.goals.filter(function (x) { return x.id !== id; });
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast('Target dihapus', 'ok');
  };

  /* ============================================================
     VIEW: LANGGANAN BULANAN
     ============================================================ */
  V.langganan = function () {
    const db = root.Buku ? Buku.data() : root.App.db;
    const today = U.today();
    const list = S.subStatus(db, today);
    const totalBulan = S.subMonthlyTotal(db);
    const totalTahun = S.subYearlyTotal(db);
    const semua = (db.subscriptions || []).filter(function (s) { return s.active === false; });
    const dekat = S.subDueSoon(db, 7, today);

    const kartu = list.map(function (r) {
      const s = r.sub;
      const siklus = { month: '/bulan', year: '/tahun', week: '/minggu' }[s.cycle || 'month'];
      const badge = r.paidThisMonth
        ? '<span class="tag ok">sudah dibayar</span>'
        : r.daysLeft < 0 ? '<span class="tag over">terlambat</span>'
        : r.daysLeft <= 3 ? '<span class="tag over">' + H(sisaHari(r.daysLeft)) + '</span>'
        : r.daysLeft <= 7 ? '<span class="tag warn">' + H(sisaHari(r.daysLeft)) + '</span>'
        : '<span class="tag">' + H(sisaHari(r.daysLeft)) + '</span>';
      return '<div class="card card-sm' + (r.paidThisMonth ? ' dim-card' : '') + '">' +
        '<div class="card-head">' +
          '<div class="ico-badge ' + (r.paidThisMonth ? 'in' : 'out') + '">' + emo(s.icon || '🔁') + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="t1">' + H(s.name) + ' ' + badge + '</div>' +
            '<div class="t2">Jatuh tempo ' + H(U.fmtDate(r.due)) +
              (r.category ? ' · ' + emo(r.category.icon) + H(r.category.name) : '') + '</div>' +
          '</div>' +
          iconBtn('Ubah', 'edit', 'V.subForm(\'' + s.id + '\')') +
          iconBtn('Hapus', 'trash', 'V.subDelete(\'' + s.id + '\')') +
        '</div>' +
        '<div style="font-size:21px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.4px">' +
          U.fmtRp(s.amount) + '<span class="muted" style="font-size:12px;font-weight:500"> ' + siklus + '</span></div>' +
        ((s.cycle || 'month') !== 'month'
          ? '<div class="muted" style="font-size:12px;margin-top:5px">setara ' + U.fmtRpShort(S.subMonthlyCost(s)) + '/bulan</div>' : '') +
        (s.note ? '<div class="muted" style="font-size:12px;margin-top:6px">' + H(s.note) + '</div>' : '') +
        '<div class="row mt" style="gap:7px">' +
          (r.paidThisMonth
            ? '<button class="btn sm" onclick="V.subUnpay(\'' + s.id + '\',\'' + U.monthOf(today) + '\')">Batalkan tanda lunas</button>'
            : '<button class="btn sm primary" onclick="V.subPay(\'' + s.id + '\')">' + wrapIco('check') + 'Tandai dibayar</button>') +
          '<span class="spacer"></span>' +
          '<button class="btn sm ghost" onclick="V.subToggle(\'' + s.id + '\')">' + (s.active === false ? 'Aktifkan' : 'Matikan') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    const kartuMati = semua.map(function (s) {
      return '<div class="item">' +
        '<div class="ico out">' + emo(s.icon || '🔁') + '</div>' +
        '<div class="body"><div class="t1">' + H(s.name) + '</div>' +
          '<div class="t2">' + U.fmtRp(s.amount) + ' · dimatikan, tidak dihitung</div></div>' +
        '<div class="right"><button class="btn sm ghost" onclick="V.subToggle(\'' + s.id + '\')">Aktifkan</button>' +
        iconBtn('Hapus', 'trash', 'V.subDelete(\'' + s.id + '\')') + '</div>' +
      '</div>';
    }).join('');

    return (dekat.length ? '<div class="card alert"><div class="card-head"><h2>Segera Jatuh Tempo</h2>' +
        '<span class="tag warn">' + dekat.length + ' langganan</span></div>' +
      '<div class="muted" style="font-size:13px">Total ' + U.fmtRp(U.sum(dekat, function (r) { return Number(r.sub.amount); })) +
        ' akan keluar dalam 7 hari ke depan: ' + dekat.map(function (r) { return H(r.sub.name); }).join(', ') + '.</div></div>' : '') +

    '<div class="card' + (dekat.length ? ' mt' : '') + '"><div class="card-head"><span class="spacer"></span>' +
        '<button class="btn primary" onclick="V.subForm()">' + wrapIco('plus') + 'Tambah Langganan</button></div>' +
      (list.length
        ? '<div class="grid cols-3">' + kartu + '</div>'
        : emptyBox('refresh', 'Belum ada langganan tercatat. Netflix, Spotify, iCloud, sewa domain. Masukkan di sini supaya tidak lupa.')) +
      (list.length ? '<div class="grid cols-3 mt">' +
        '<div class="stat out"><div class="lbl">Total per bulan</div><div class="val" style="font-size:18px">' + U.fmtRpShort(totalBulan) + '</div>' +
          '<div class="sub">' + list.length + ' langganan aktif</div></div>' +
        '<div class="stat out"><div class="lbl">Total per tahun</div><div class="val" style="font-size:18px">' + U.fmtRpShort(totalTahun) + '</div>' +
          '<div class="sub">setara ' + U.fmtRpShort(totalTahun / 12) + '/bulan</div></div>' +
        '<div class="stat"><div class="lbl">Sudah dibayar bulan ini</div><div class="val" style="font-size:18px">' +
          list.filter(function (r) { return r.paidThisMonth; }).length + ' <span class="muted" style="font-size:13px">/ ' + list.length + '</span></div></div>' +
      '</div>' : '') +
    '</div>' +

    (semua.length ? '<div class="card mt"><div class="card-head"><h2>Langganan Dimatikan</h2></div>' +
      '<div class="list">' + kartuMati + '</div></div>' : '');
  };

  V.subForm = function (id, sumber) {
    if (root.Buku && !id && !sumber) { Buku.pilihSumber(pilihan => V.subForm(null, pilihan)); return; }
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const s = id ? (db.subscriptions || []).filter(function (x) { return x.id === id; })[0] : null;
    const f = s || { id: '', name: '', icon: '🔁', amount: '', cycle: 'month', day: U.strToDate(U.today()).getDate(),
                    walletId: '', categoryId: '', note: '', active: true };

    V.modal.open({
      title: s ? 'Ubah Langganan' : 'Tambah Langganan',
      body:
        (ctx ? '<p class="hint">' + (ctx.sumber === 'keluarga' ? 'Terlihat oleh keluarga' : 'Hanya kamu') + '</p>' : '') +
        '<div class="field"><label>Nama langganan</label>' +
          '<input type="text" id="s-name" autocomplete="off" value="' + H(f.name) + '" placeholder="contoh: Netflix"></div>' +
        '<div class="field"><label>Ikon</label>' + pilihanEmoji('s-icons', IKON_LANGGANAN, f.icon) +
          '<input type="hidden" id="s-icon" value="' + H(f.icon) + '"></div>' +
        '<div class="row" style="gap:12px;align-items:flex-start">' +
          '<div class="field" style="flex:1"><label>Nominal</label>' +
            '<div class="money-input"><b>Rp</b><input type="text" inputmode="numeric" id="s-amount" value="' +
              (f.amount ? U.fmtNum(f.amount) : '') + '" placeholder="contoh: 54.000"></div></div>' +
          '<div class="field" style="flex:1"><label>Siklus</label><select id="s-cycle">' +
            opsiNilai(S.SUB_CYCLES, f.cycle) + '</select></div>' +
        '</div>' +
        '<div class="field"><label>Tanggal jatuh tempo</label>' +
          '<input type="number" id="s-day" min="1" max="31" value="' + H(f.day) + '">' +
          '<span class="hint" id="s-day-hint" aria-live="polite"></span></div>' +
        '<div class="field"><label>Dompet pembayar</label><select id="s-wallet">' + pilihanDompet(db, f.walletId) + '</select></div>' +
        '<div class="field"><label>Kategori</label><select id="s-cat">' + pilihanKategori(db, f.categoryId, 'out') + '</select></div>' +
        '<div class="field"><label>Catatan <span class="muted">(opsional)</span></label>' +
          '<input type="text" id="s-note" value="' + H(f.note) + '" placeholder="contoh: paket keluarga 4 layar"></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn primary" id="s-save">Simpan</button>'
    });

    el('s-icons').addEventListener('click', function (e) {
      const b = e.target.closest('[data-emoji]'); if (!b) return;
      el('s-icon').value = b.dataset.emoji;
      tandaiPilihan(el('s-icons'), b);
    });

    const amtIn = el('s-amount');
    amtIn.addEventListener('input', function () {
      const v = U.parseAmount(amtIn.value); amtIn.value = v ? U.fmtNum(v) : '';
    });

    const hint = function () {
      const c = el('s-cycle').value, d = Number(el('s-day').value) || 1;
      const h = el('s-day-hint');
      if (c === 'month') h.textContent = 'Tanggal 1–31 setiap bulan. Untuk tanggal 29–31, bulan yang lebih pendek memakai hari terakhir.';
      else if (c === 'year') h.textContent = 'Tanggal 1–28; bulan mengikuti bulan saat langganan ini pertama dicatat.';
      else h.textContent = 'Mingguan: 1 = Senin, 7 = Minggu.';
      el('s-day').max = c === 'week' ? '7' : (c === 'year' ? '28' : '31');
      if (c === 'week') el('s-day').value = U.clamp(d, 1, 7);
      if (c === 'year') el('s-day').value = U.clamp(d, 1, 28);
    };
    el('s-cycle').addEventListener('change', hint);
    hint();

    el('s-save').onclick = async function () {
      const name = el('s-name').value.trim();
      const amount = U.parseAmount(amtIn.value);
      if (!name) { V.toast('Nama langganan wajib diisi', 'err'); return; }
      if (!(amount > 0)) { V.toast('Nominal harus lebih dari 0', 'err'); return; }
      const cycle = el('s-cycle').value;
      const maxDay = cycle === 'week' ? 7 : (cycle === 'year' ? 28 : 31);
      const obj = {
        id: s ? s.id : U.uid('sub'),
        name: name, icon: el('s-icon').value.trim() || '🔁',
        amount: amount, cycle: cycle,
        day: U.clamp(Number(el('s-day').value) || 1, 1, maxDay),
        ym: U.monthOf(U.today()),
        walletId: el('s-wallet').value, categoryId: el('s-cat').value,
        note: el('s-note').value.trim(),
        active: s ? s.active !== false : true
      };
      if (el('s-save').disabled) return;
      el('s-save').disabled = true;
      if (s) { const i = db.subscriptions.findIndex(function (x) { return x.id === s.id; }); db.subscriptions[i] = obj; }
      else db.subscriptions.push(obj);
      if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
      V.toast(s ? 'Langganan diperbarui' : 'Langganan ditambahkan', 'ok');
      V.modal.close();
    };
  };

  // Tandai sebuah langganan lunas bulan ini = catat transaksi + penanda di catatan
  V.subPay = async function (id, sumber) {
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const s = (db.subscriptions || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    const today = U.today();
    if (S.subPaidIn(db, s, U.monthOf(today))) { V.toast('Bulan ini sudah ditandai lunas', 'err'); return; }
    const walletId = s.walletId || ((db.wallets || [])[0] || {}).id;
    if (!walletId) { V.toast('Belum ada dompet, tambahkan dulu di menu Dompet & Bank', 'err'); return; }
    const tx = S.mkTx({
      date: today, type: 'out', amount: s.amount, walletId: walletId,
      categoryId: s.categoryId || '',
      note: s.name + ' /sub:' + s.id + '/ ' + U.monthOf(today)
    });
    db.transactions.push(tx);
    s.lastPaid = today;
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast('Dibayar: ' + s.name + ' ' + U.fmtRp(s.amount), 'ok');
  };

  // Batalkan tanda lunas: buang transaksi penandanya
  V.subUnpay = async function (id, ym, sumber) {
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const s = (db.subscriptions || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    const key = '/sub:' + s.id + '/ ' + ym;
    const tx = (db.transactions || []).filter(function (t) { return String(t.note || '').indexOf(key) > -1; })[0];
    if (!tx) { V.toast('Tidak ada penanda pembayaran untuk dibatalkan', 'err'); return; }
    const ok = await V.confirm('Batalkan tanda lunas ' + H(s.name) + '?',
      'Transaksi pengeluaran ' + U.fmtRp(tx.amount) + ' pada ' + H(U.fmtDate(tx.date)) + ' akan <b>dihapus</b>.',
      'Batalkan', true);
    if (!ok) return;
    db.transactions = db.transactions.filter(function (t) { return t.id !== tx.id; });
    s.lastPaid = '';
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast('Tanda lunas dibatalkan', 'ok');
  };

  V.subToggle = async function (id, sumber) {
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const s = (db.subscriptions || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    s.active = s.active === false;
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast(s.active ? s.name + ' diaktifkan lagi' : s.name + ' dimatikan (tidak dihitung)', 'ok');
  };

  V.subDelete = async function (id, sumber) {
    const ctx = root.Buku ? Buku.konteks(id, sumber) : null;
    if (root.Buku && !ctx) return;
    if (ctx) id = ctx.id;
    const db = ctx ? ctx.db : root.App.db;
    const s = (db.subscriptions || []).filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    const ok = await V.confirm('Hapus langganan "' + H(s.name) + '"?',
      'Catatan langganannya dihapus. <b>Transaksi pembayaran yang sudah tercatat tetap ada.</b>', 'Hapus', true);
    if (!ok) return;
    db.subscriptions = db.subscriptions.filter(function (x) { return x.id !== id; });
    if (ctx) { if (!await Buku.simpanKonteks(ctx)) return; } else root.App.saveAndRender();
    V.toast('Langganan dihapus', 'ok');
  };

  /* ============================================================
     VIEW: PROFIL — beberapa "akun" lokal
     Tiap profil menyimpan datanya sendiri (lihat S.Profiles).
     ============================================================ */
  V.profil = function () {
    const P = S.Profiles;
    const list = P.list();
    const aktif = P.activeId();
    const berSandi = P.countPinned();
    const akun = root.K && root.K.terbuka && root.K.nama ? root.K.nama : '';

    /* Akun yang sedang login ditampilkan terpisah dari profil lokal, supaya
       jelas mana yang tersimpan di server dan mana yang di perangkat ini. */
    const kartuAkun = akun
      ? '<div class="card"><div class="card-head"><h2>Akun login</h2><span class="spacer"></span>' +
          '<span class="tag ok">masuk</span></div>' +
          '<div class="profil-list"><div class="profil-card on">' +
            '<div class="pc-ic">' + (avatarNama((P.active() || {}).icon) ? profilIcon(P.active().icon) : U.icon('user')) + '</div>' +
            '<div class="pc-main"><div class="pc-nama">' + H(akun) + '</div>' +
              '<div class="pc-info muted">Untuk masuk dan membuka buku keluarga. Pasangan memakai akun sendiri.</div>' +
            '</div>' +
            '<div class="pc-act"><button class="btn sm" onclick="App.emailAkun(this)">Status email</button>' +
              '<button class="btn sm ghost" onclick="App.keluarAkun(this)">Keluar</button></div>' +
          '</div></div>' +
        '</div>'
      : '<div class="card"><div class="card-head"><h2>Akun login</h2></div>' +
          '<p class="muted">Belum masuk. Akun login berbeda dari profil lokal di perangkat ini.</p>' +
          '<a class="btn" href="/#/masuk">Masuk ke akun</a></div>';

    const keluargaAktif = !!(root.K && root.K.aktif && root.K.aktif());
    const kartuKeluarga = '<section class="card mt" aria-labelledby="profil-keluarga-title">' +
      '<div class="card-head"><h2 id="profil-keluarga-title">Keluarga</h2></div>' +
      '<p class="muted" style="margin:-4px 0 14px">Satu buku bersama untuk dua akun, masing-masing tetap masuk dengan akun sendiri.</p>' +
      (akun
        ? '<div class="row">' + (root.Buku ? '<button class="btn primary" id="profil-tambah-keluarga" onclick="Buku.undang(this)">' + wrapIco('plus') + 'Undang pasangan</button>' : '<a class="btn primary" id="profil-tambah-keluarga" href="/#/dashboard">' + wrapIco('plus') + 'Buka dashboard</a>') +
            (root.Buku ? '<button class="btn" onclick="App.go(\'dashboard\')">Lihat dashboard bersama</button></div>' : '<button class="btn" onclick="App.gantiMode(\'keluarga\')"' + (keluargaAktif ? ' disabled' : '') + '>' + (keluargaAktif ? 'Buku keluarga sedang aktif' : 'Buka buku keluarga') + '</button></div>')
        : '<div class="row"><a class="btn primary" href="/#/masuk">Buat akun pertama</a>' +
            '<a class="btn" href="/#/masuk">Masuk lalu gunakan kode pasangan</a></div>') +
      '<details class="lipat"><summary>' + wrapIco('chevron') + 'Cara mengundang pasangan</summary><div class="lipat-isi">' +
        '<ol><li>Pemilik akun membuat undangan lalu mengirim kodenya ke pasangan.</li>' +
          '<li>Pasangan membuat akun atau masuk di perangkat sendiri, lalu memasukkan kode lewat <b>Undang pasangan</b> di dashboard.</li>' +
          '<li>Setelah bergabung, keduanya memakai buku keluarga yang sama.</li></ol>' +
        '<p class="muted" style="margin:10px 0 0">Hanya pemilik keluarga yang dapat mengundang, dan hanya selama anggota belum berjumlah dua. Maksimal 2 anggota, kode berlaku 24 jam dan sekali pakai. Buku keluarga memerlukan internet.</p>' +
      '</div></details>' +
      '<p class="hint"><b>Data lama tidak otomatis digabung.</b> Catatan pribadi dan profil lokal tetap terpisah dari buku keluarga.</p>' +
    '</section>';

    const kartu = list.map(function (p) {
      const ini = p.id === aktif;
      const terkunci = p.pinHash && P.isLocked(p.id);
      const isi = (function () {
        try {
          const d = S.Persist.loadFor(p.id);
          if (!d) return { tx: 0, saldo: 0, kosong: true };
          return { tx: (d.transactions || []).length, saldo: S.totalBalance(d), kosong: false };
        } catch (e) { return { tx: 0, saldo: 0, kosong: true }; }
      })();

      return '<div class="profil-card' + (ini ? ' on' : '') + '" style="--pc:' + H(p.color) + '">' +
        '<div class="pc-ic">' + profilIcon(p.icon) + '</div>' +
        '<div class="pc-main">' +
          '<div class="pc-nama">' + H(p.name) +
            (ini ? ' <span class="tag ok">aktif</span>' : '') +
            (p.pinHash ? ' <span class="tag">' + wrapIco('lock') + 'bersandi</span>' : '') +
            (terkunci ? ' <span class="tag warn">terkunci</span>' : '') +
          '</div>' +
          '<div class="pc-info muted">' +
            (isi.kosong ? 'Belum ada data' : isi.tx + ' transaksi · saldo ' + U.fmtRp(isi.saldo)) +
          '</div>' +
        '</div>' +
        '<div class="pc-act">' +
          (ini ? '' : '<button class="btn sm" onclick="V.profilPakai(\'' + p.id + '\')">Pakai</button>') +
          iconBtn('Ubah', 'edit', 'V.profilForm(\'' + p.id + '\')') +
          (list.length > 1 ? iconBtn('Hapus', 'trash', 'V.profilDelete(\'' + p.id + '\')') : '') +
        '</div>' +
      '</div>';
    }).join('');

    return kartuAkun + kartuKeluarga + '<div class="card' + (kartuAkun ? ' mt' : '') + '"><div class="card-head">' +
        '<h2>Profil di perangkat ini</h2><span class="spacer"></span>' +
        '<button class="btn primary" id="profil-baru" onclick="V.profilForm()">' + wrapIco('plus') + 'Profil Baru</button></div>' +
      '<p class="muted" style="margin:-4px 0 14px">Pisahkan catatan untuk orang atau usaha yang berbeda. ' +
        'Setiap profil punya catatan, dompet, anggaran, dan target sendiri. Ini <b>bukan akun pasangan</b>.</p>' +
      (keluargaAktif ? '<p class="hint">Saat ini buku keluarga sedang aktif. Daftar berikut adalah profil lokal, bukan daftar anggota keluarga.</p>' : '') +
      '<div class="profil-list">' + kartu + '</div>' +
    '</div>' +

    '<div class="card mt"><div class="card-head"><h2>Pengamanan</h2></div>' +
      '<p class="muted" style="margin:-4px 0 12px">' +
        (berSandi
          ? 'Ada ' + berSandi + ' profil bersandi. Tombol Kunci di sidebar menyembunyikan semua catatan sampai sandi dimasukkan.'
          : 'Belum ada profil bersandi. Tambahkan sandi lewat tombol Ubah di atas supaya catatan tidak sembarangan dibuka.') +
      '</p>' +
      (berSandi ? '<button class="btn" onclick="V.profilKunci()">' + wrapIco('lock') + 'Kunci Sekarang</button>' : '') +
      '<p class="hint">Sandi menjaga dari orang yang memakai browser ini. Ini <b>bukan</b> enkripsi.</p>' +
    '</div>';
  };

  V.profilForm = function (id) {
    const P = S.Profiles;
    const p = id ? P.get(id) : null;
    const list = P.list();
    const f = p || { id: '', name: '', icon: IKON_PROFIL[0], color: WARNA_PROFIL[0] };
    const bolehSandi = list.length > 1 || !!p;

    V.modal.open({
      title: p ? 'Ubah Profil' : 'Profil Baru',
      body:
        '<div class="field"><label>Nama profil</label>' +
          '<input type="text" id="p-nama" value="' + H(f.name) + '" placeholder="contoh: Pribadi, Usaha, Anak" maxlength="24"></div>' +
        '<div class="field"><label>Avatar profil</label><div class="profile-avatar-grid" id="p-avatar">' +
          AVATAR_PROFIL.map(function (name) {
            const key = 'avatar:' + name.toLowerCase();
            return '<button type="button" class="profile-avatar-option' + (f.icon === key ? ' on' : '') + '" data-avatar="' + key + '" aria-label="Pilih avatar ' + name + '" aria-pressed="' + (f.icon === key) + '">' + profilIcon(key) + '</button>';
          }).join('') + '</div><span class="hint">Disimpan untuk profil di perangkat ini, bukan foto akun cloud.</span>' +
          '<small class="hint">Avatar Adventurer oleh <a href="https://www.dicebear.com/styles/adventurer/" target="_blank" rel="noopener noreferrer">Lisa Wischofsky / DiceBear</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Warna dan bingkai disesuaikan.</small></div>' +
        '<div class="field"><label>Atau gunakan ikon lama</label>' + pilihanEmoji('p-ikon', IKON_PROFIL, f.icon) + '</div>' +
        '<div class="field"><label>Warna</label>' + pilihanSwatch('p-warna', WARNA_PROFIL, f.color, 'data-warna') + '</div>' +
        '<div class="field"><label>Sandi <span class="muted">(opsional)</span></label>' +
          '<input type="password" id="p-pin" inputmode="numeric" autocomplete="new-password" ' +
            'placeholder="' + (p && p.pinHash ? 'biarkan kosong bila tidak ingin mengubah' : 'contoh: 1234 (boleh kosong)') + '">' +
          (p && p.pinHash ? '<span class="hint">Kosongkan = sandi tidak diubah. Isi <b>0</b> lalu simpan = hapus sandi.</span>' : '<span class="hint">4–8 angka. Kosongkan kalau tidak perlu sandi.</span>') +
        '</div>',
      foot: '<button class="btn" data-close>Batal</button>' +
            '<button class="btn primary" id="p-save">Simpan</button>'
    });

    // ikon & warna: pilih lewat tombol, bukan teks
    let ikon = f.icon, warna = f.color;
    el('p-ikon').addEventListener('click', function (e) {
      const b = e.target.closest('[data-emoji]'); if (!b) return;
      ikon = b.dataset.emoji;
      tandaiPilihan(el('p-ikon'), b);
      Array.from(el('p-avatar').querySelectorAll('button')).forEach(function (button) { button.classList.remove('on'); button.setAttribute('aria-pressed','false'); });
    });
    el('p-avatar').addEventListener('click', function (e) {
      const b = e.target.closest('[data-avatar]'); if (!b || !avatarNama(b.dataset.avatar)) return;
      ikon = b.dataset.avatar;
      Array.from(el('p-avatar').querySelectorAll('button')).forEach(function (button) { const selected = button === b; button.classList.toggle('on', selected); button.setAttribute('aria-pressed', String(selected)); });
      Array.from(el('p-ikon').querySelectorAll('button')).forEach(function (button) { button.classList.remove('on'); button.setAttribute('aria-pressed','false'); });
    });
    el('p-warna').addEventListener('click', function (e) {
      const b = e.target.closest('[data-warna]'); if (!b) return;
      warna = b.dataset.warna;
      tandaiPilihan(el('p-warna'), b);
    });

    el('p-save').onclick = function () {
      const nama = el('p-nama').value.trim();
      const pinRaw = el('p-pin').value.trim();

      if (!nama) { V.toast('Nama profil tidak boleh kosong', 'err'); return; }
      if (pinRaw && !/^[0-9]{4,8}$/.test(pinRaw)) {
        if (pinRaw !== '0') { V.toast('Sandi harus 4–8 angka', 'err'); return; }
      }

      if (p) {
        // pin: undefined = jangan ubah | '' = hapus | '0' = hapus | angka = ganti
        let pin;
        if (pinRaw === '') pin = undefined;
        else if (pinRaw === '0') pin = '';
        else pin = pinRaw;
        S.Profiles.update(p.id, { name: nama, icon: ikon, color: warna }, pin);
        V.toast('Profil diperbarui', 'ok');
      } else {
        const baru = S.Profiles.create(nama, ikon, warna, pinRaw || '');
        V.toast('Profil "' + nama + '" dibuat (masih kosong)', 'ok');
        V.modal.close();
        root.App.pindahProfil(baru.id, true);
        return;
      }
      V.modal.close();
      if (p && p.id === S.Profiles.activeId()) root.App.muatProfil();
      V.updateProfilBtn();
      root.App.render();
    };
  };

  V.profilPakai = function (id) {
    const P = S.Profiles;
    if (id === P.activeId()) { V.toast('Profil ini sudah aktif'); return; }
    V.modal.open({
      title: 'Pindah ke profil ini?',
      body: '<p>Data yang sekarang terbuka akan diganti dengan data profil <b>' +
            H((P.get(id) || {}).name || '') + '</b>.</p>' +
            '<p class="muted" style="margin-top:8px">Catatanmu tidak hilang, hanya disimpan, dan bisa dibuka lagi kapan saja.</p>',
      foot: '<button class="btn" data-close>Batal</button>' +
            '<button class="btn primary" id="pp-ok">Pindah</button>'
    });
    el('pp-ok').onclick = function () { V.modal.close(); root.App.pindahProfil(id); };
  };

  V.profilDelete = async function (id) {
    const P = S.Profiles;
    const p = P.get(id);
    if (!p) return;
    if (P.list().length <= 1) { V.toast('Minimal harus ada 1 profil', 'err'); return; }

    V.modal.open({
      title: 'Hapus profil "' + H(p.name) + '"?',
      body: '<p style="color:var(--out)"><b>Seluruh data profil ini akan hilang permanen:</b> semua transaksi, dompet, anggaran, target, langganan, dan struk.</p>' +
            '<p style="margin-top:10px">Tidak ada cara mengembalikannya. Kalau ragu, unduh dulu backupnya lewat profil tersebut.</p>' +
            '<div class="field" style="margin-top:14px"><label>Ketik ULANG nama profil <b>' + H(p.name) + '</b> untuk memastikan</label>' +
            '<input type="text" id="pd-konfirm" placeholder="' + H(p.name) + '" autocomplete="off"></div>',
      foot: '<button class="btn" data-close>Batal</button>' +
            '<button class="btn danger" id="pd-ok" disabled>Hapus Permanen</button>'
    });

    const inp = el('pd-konfirm'), btn = el('pd-ok');
    inp.addEventListener('input', function () { btn.disabled = inp.value.trim() !== p.name; });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !btn.disabled) btn.click(); });
    btn.onclick = function () {
      if (inp.value.trim() !== p.name) return;
      const wasActive = P.activeId() === id;
      S.Profiles.remove(id);
      V.modal.close();
      if (wasActive) root.App.muatProfil();
      root.App.render();
      V.toast('Profil dihapus', 'ok');
    };
  };

  /* Minta sandi sebelum membuka profil yang terkunci. */
  V.profilGate = function (onOk) {
    const P = S.Profiles;
    const p = P.active();
    if (!p) { if (onOk) onOk(); return; }

    V.modal.open({
      title: (avatarNama(p.icon) ? '' : p.icon + '  ') + p.name,
      body: '<p class="muted">Profil ini dilindungi sandi. Masukkan sandi untuk melihat catatan.</p>' +
            '<div class="field" style="margin-top:14px"><label>Sandi</label>' +
            '<input type="password" id="pg-pin" inputmode="numeric" autocomplete="current-password" ' +
            'aria-describedby="pg-err" placeholder="••••"></div>' +
            '<div class="hint" id="pg-err" aria-live="polite" style="color:var(--out)"></div>',
      foot: '<button class="btn" id="pg-lain">Ganti Profil</button>' +
            '<button class="btn primary" id="pg-ok">Buka</button>',
      lock: true
    });

    const inp = el('pg-pin');
    setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50);

    function coba() {
      if (P.checkPin(p.id, inp.value)) {
        P.unlock(p.id);
        V.modal.close(true);              // modal terkunci: tutup paksa
        root.App.applyLockUI();
        root.App.render();
        V.updateProfilBtn();
        V.toast('Selamat datang, ' + p.name, 'ok');
        if (onOk) onOk();
      } else {
        el('pg-err').textContent = 'Sandi salah. Coba lagi.';
        inp.value = ''; inp.focus();
      }
    }
    el('pg-ok').onclick = coba;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') coba(); });
    el('pg-lain').onclick = function () { V.modal.close(); root.App.go('profil'); };
  };

  /* Perbarui tombol profil di sidebar. Kalau sudah masuk, nama akun yang
     tampil lebih dulu, dengan nama profil lokal sebagai keterangan. */
  V.updateProfilBtn = function () {
    const p = S.Profiles.active();
    const akun = root.K && root.K.terbuka && root.K.nama ? root.K.nama : '';
    const ic = el('pb-ic'), nm = el('pb-nama'), ket = el('pb-ket');
    /* Ikon sidebar: profil lokal memakai emoji pilihannya, akun login memakai
       ikon garis supaya tidak tertukar dengan emoji profil. */
    if (ic) {
      if (akun && !avatarNama(p && p.icon)) { ic.innerHTML = U.icon('user'); ic.querySelector('.ui-icon').setAttribute('aria-hidden', 'true'); }
      else ic.innerHTML = profilIcon(p ? p.icon : '👤');
    }
    if (nm) nm.textContent = akun || (p ? p.name : 'Profil');
    if (ket) ket.textContent = akun
      ? (p ? p.name + ' · lokal' : 'catatan lokal')
      : 'profil lokal';
    const btn = el('btn-profil');
    if (btn) btn.title = akun
      ? 'Masuk sebagai ' + akun + '. Catatan disimpan di perangkat ini.'
      : 'Profil lokal di perangkat ini';
    const k = el('btn-kunci');
    if (k) k.hidden = !(p && p.pinHash) || S.Profiles.isLocked(p.id);
    /* Tombol keluar hanya berguna kalau memang ada akun yang login. */
    const keluar = el('btn-keluar');
    if (keluar) keluar.hidden = !akun;
  };

  V.profilKunci = function () {
    const P = S.Profiles;
    const p = P.active();
    if (!p || !p.pinHash) { V.toast('Profil ini tidak bersandi', 'err'); return; }
    P.lock(p.id);
    V.toast('Catatan dikunci', 'ok');
    root.App.applyLockUI();
    root.App.render();
    V.profilGate();
  };

  root.V = V;
})(typeof window !== 'undefined' ? window : globalThis);