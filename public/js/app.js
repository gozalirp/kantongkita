/* ============================================================
   app.js — bootstrap, router, penyimpanan, render
   ============================================================ */
(function (root) {
  'use strict';
  const U = root.U, S = root.S, V = root.V;

  const VIEWS = ['menu', 'dashboard', 'transaksi', 'rekap', 'anggaran', 'target', 'langganan', 'dompet', 'kategori', 'pengaturan', 'profil'];
  const TITLES = {
    menu: 'Menu', dashboard: 'Dashboard', transaksi: 'Catatan Transaksi', rekap: 'Rekap Transaksi',
    anggaran: 'Anggaran per Kategori', target: 'Target Tabungan', langganan: 'Langganan Bulanan',
    dompet: 'Dompet & Bank', kategori: 'Kategori', pengaturan: 'Pengaturan', profil: 'Profil',
    masuk: 'Masuk ke akun'
  };
  const PREFIX = {
    menu: 'V.menu()', dashboard: 'V.dashboard()', transaksi: 'V.transaksi()', rekap: 'V.rekap()',
    anggaran: 'V.anggaran()', target: 'V.target()', langganan: 'V.langganan()',
    dompet: 'V.dompet()', kategori: 'V.kategori()', pengaturan: 'V.pengaturan()', profil: 'V.profil()',
    masuk: 'V.gerbangMasuk()'
  };
  const BIND = {
    menu: null, dashboard: 'V.dashboardBind()', transaksi: 'V.transaksiBind()', rekap: 'V.rekapBind()',
    anggaran: null, target: null, langganan: null,
    dompet: null, kategori: 'V.kategoriBind()', pengaturan: 'V.pengaturanBind()', profil: null, masuk: null
  };

  /* Kunci sepenuhnya halaman yang tidak butuh data keuangan — tetap bisa dibuka
     walau profil sedang terkunci (supaya orang bisa pindah profil). */
  const VIEW_BEBAS = ['menu', 'profil', 'pengaturan', 'masuk'];
  /* Halaman yang tidak masuk daftar ini disembunyikan saat profil terkunci. */
  const VIEW_DATA = ['dashboard', 'transaksi', 'rekap', 'anggaran', 'target', 'langganan', 'dompet', 'kategori'];

  const App = {
    db: null,
    view: 'dashboard',
    terkunci: false,
    _inited: false,
    /* Keadaan layar masuk. Disimpan di App, bukan di DOM, supaya bertahan
       saat kartu dirender ulang (pindah tab, atau kode pemulihan tampil). */
    _gerbangPesan: '',
    _gerbangDaftar: false,
    _gerbangKode: '',
    _gerbangAkun: null,
    _emailAktif: false,

    keluarAkun: async function (button) {
      if (!confirm('Keluar dari akun? Catatan di perangkat ini tidak akan dihapus.')) return;
      if (button) button.disabled = true;
      try {
        const response = await fetch('/api/family/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (!response.ok && response.status !== 401) throw Error('Gagal keluar. Coba lagi.');
        location.reload();
      } catch (error) { V.toast(error.message || 'Periksa koneksi internet.', 'err'); }
      finally { if (button) button.disabled = false; }
    },

    emailAkun: async function (button) {
      button.disabled = true;
      try {
        const response = await fetch('/api/family/email/status', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        if (!data.email) { V.toast('Akun ini belum memiliki email. Kode pemulihan tetap bisa digunakan.'); return; }
        if (data.verified) { V.toast('Email ' + data.email + ' sudah terverifikasi.'); return; }
        const sent = await fetch('/api/family/email/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const result = await sent.json();
        if (!sent.ok) throw Error(result.error);
        V.toast('Email verifikasi dikirim ke ' + data.email + '.');
      } catch (error) { V.toast(error.message || 'Periksa koneksi internet.', 'err'); }
      finally { button.disabled = false; }
    },

    /* ---------- penyimpanan ---------- */
    storageKey: function () { return S.Persist.key(); },

    load: function () {
      let raw = S.Persist.load();
      if (!raw) { this.db = S.seedDB(); this.save(); }
      else this.db = S.normalize(raw);
      return this.db;
    },

    /* Muat data sesuai mode aktif. Mode pribadi tetap sinkron seperti dulu;
       mode keluarga menunggu server. */
    muat: async function () {
      if (!root.K || !K.aktif()) { K && K.init(); return this.load(); }
      try {
        const buku = await K.muat();
        this.db = S.normalize(buku);
        this.dbBaru = true;
        return this.db;
      } catch (e) {
        /* Tidak bisa memuat buku bersama: jangan tampilkan data pribadi
           seolah-olah itu buku keluarga. */
        this.db = S.seedDB();
        this.dbBaru = true;
        V.toast(e.message === 'LOGIN'
          ? 'Sesi keluarga berakhir. Masuk lagi untuk melihat buku bersama.'
          : 'Tidak bisa memuat buku keluarga. Periksa koneksi.', 'err');
        return this.db;
      }
    },

    save: function () {
      this.db.meta.updated = new Date().toISOString();

      /* Mode keluarga: data tidak ditulis ke localStorage supaya catatan
         pribadi tidak tertimpa buku bersama. */
      if (root.K && K.aktif()) {
        this.simpanKeluarga();
        return 'keluarga';
      }

      const r = S.Persist.save(this.db);
      if (r === 'slim') V.toast('Penyimpanan penuh — struk dihapus otomatis, transaksi tetap aman', 'err');

      /* Salinan pribadi ke server, hanya bila sudah login. Lokal tetap sumber
         utama; server dipakai untuk membuka catatan di perangkat lain. */
      this.simpnPribadiTertunda();

      /* Auto-Sync ke Cloudflare D1 di background (Hybrid Offline-First) */
      this.syncCloudPush();

      if (root.GDrive && this.db.settings.driveEnabled && this.db.settings.driveFileId) {
        clearTimeout(this._pushT);
        const self = this;
        this._pushT = setTimeout(function () {
          root.GDrive.push(self.db).then(function () {
            self.db.settings.lastSync = new Date().toISOString();
            S.Persist.save(self.db);
            App.updateNetDot(true);
          }).catch(function () { App.updateNetDot(false); });
        }, 4000);
      }
      return r;
    },

    /* Kirim buku bersama ke server. Hasilnya diberitahukan hanya bila
       penting, supaya tidak berisik setiap kali menyimpan. */
    /* Kirim salinan pribadi dengan jeda supaya tidak menembak server pada
       setiap ketikan. Ketikan beruntun hanya mengirim keadaan terakhir. */
    simpnPribadiTertunda: function () {
      if (!root.K || !K.punyaCloud) return;
      const self = this;
      clearTimeout(this._pribadiT);
      this._pribadiT = setTimeout(function () { self.simpanPribadiSekarang(); }, 1200);
    },

    /* Kirim salinan pribadi sekarang juga. Dipakai juga saat halaman ditutup. */
    simpanPribadiSekarang: function () {
      if (!root.K || !K.punyaCloud) return Promise.resolve('pribadi');
      return K.simpanPribadi(this.db).then(function (hasil) {
        if (hasil === 'ok') App.updateNetDot(true, 'Catatan pribadi tersimpan di cloud');
        else if (hasil === 'bentrok') {
          V.toast('Catatan pribadi ini berbeda dari salinan cloud. Salinan cloud tidak ditimpa.', 'err');
          K.muatPribadi().then(function (jauh) {
            if (jauh && jauh.transactions) V.toast('Versi cloud punya ' + jauh.transactions.length + ' transaksi. Backup lokal dulu sebelum memilih.', 'err');
          });
        } else if (hasil === 'keluar') V.toast('Sesi berakhir. Catatan baru tetap tersimpan di perangkat ini.', 'err');
        else if (hasil === 'luring') App.updateNetDot(false, 'Offline — salinan cloud tertunda');
        return hasil;
      });
    },

    simpanKeluarga: function () {
      const self = this;
      const dikirim = this.db;
      fetch('/api/family/save', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: K.revisi, book: K.rakit(dikirim) })
      }).then(function (r) {
        if (r.status === 200) {
          K.revisi += 1;
          /* Server mengisi 'by'. Samakan di data lokal supaya penanda pencatat
             langsung benar tanpa perlu muat ulang. */
          (dikirim.transactions || []).forEach(function (t) {
            if (!t.by && K.nama) t.by = K.nama;
          });
          self.updateNetDot(true, 'Keluarga tersimpan');
          return;
        }
        if (r.status === 401) { K.keluar(); V.toast('Sesi keluarga berakhir. Kembali ke catatan pribadi.', 'err'); self.gantiMode(); return; }
        if (r.status === 409) { V.toast('Data diubah anggota lain. Menampilkan versi terbaru…', 'err'); self.sinkronKeluarga(); return; }
        V.toast('Gagal menyimpan ke buku keluarga.', 'err');
      }).catch(function () {
        V.toast('Offline — perubahan belum terkirim ke buku keluarga.', 'err');
      });
    },

    /* Ambil ulang buku bersama dari server tanpa memuat ulang halaman. */
    sinkronKeluarga: async function () {
      await this.muat();
      this.render();
    },

    /* Pindah antara catatan pribadi dan buku keluarga. */
    gantiMode: async function (tujuan) {
      const dari = root.K ? K.mode : 'pribadi';
      const ke = tujuan || (dari === 'keluarga' ? 'pribadi' : 'keluarga');
      if (root.K) {
        const hasil = await K.pindah(ke);
        if (!hasil.ok) { V.toast(hasil.pesan, 'err'); return; }
      }
      await this.muat();
      this.terapkanModeUI();
      V.toast(ke === 'keluarga' ? 'Buku keluarga aktif' : 'Catatan pribadi aktif', 'ok');
      this.render();
    },

    /* Tanda mode di kepala aplikasi, dan tautan ke halaman akun. */
    terapkanModeUI: function () {
      const aktif = root.K && K.aktif();
      const pill = document.getElementById('mode-pill');
      if (pill) {
        pill.textContent = aktif ? '👨‍👩‍👧 Keluarga' : '👤 Pribadi';
        pill.classList.toggle('keluarga', aktif);
        pill.title = aktif ? 'Buku bersama keluarga' : 'Catatan pribadi di perangkat ini';
      }
      document.body.classList.toggle('mode-keluarga', aktif);
    },
    syncCloudPush: function () {
      clearTimeout(this._cloudPushT);
      const self = this;
      this._cloudPushT = setTimeout(function () {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(self.db)
        }).then(function (res) {
          if (res.ok) {
            App.updateNetDot(true, 'Cloudflare Aktif');
          }
        }).catch(function () {
          App.updateNetDot(false, 'Offline (Lokal)');
        });
      }, 1500);
    },

    /* Auto-Sync Cloudflare Pull (Background saat buka aplikasi) */
    syncCloudPull: function () {
      const self = this;
      fetch('/api/sync')
        .then(function (res) { return res.json(); })
        .then(function (res) {
          if (res && res.ok && res.data) {
            const cloudUpdated = res.data.meta && res.data.meta.updated;
            const localUpdated = self.db && self.db.meta && self.db.meta.updated;
            // Jika data di cloud lebih baru, perbarui data lokal
            if (!localUpdated || (cloudUpdated && cloudUpdated > localUpdated)) {
              self.db = S.normalize(res.data);
              S.Persist.save(self.db);
              self.render();
              V.toast('Data disinkronkan otomatis dari Cloud');
            }
            App.updateNetDot(true, 'Cloudflare Aktif');
          } else {
            // Jika cloud kosong, kirim data lokal sekarang ke cloud
            if (self.db) self.syncCloudPush();
          }
        })
        .catch(function () {
          App.updateNetDot(false, 'Offline (Lokal)');
        });
    },

    /* Manual Trigger Sync Cloudflare dari Button Topbar / Pengaturan */
    manualSyncCloud: function () {
      const btn = document.getElementById('btn-sync-cloud');
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
      V.toast('Menyinkronkan data dengan Cloud...');
      const self = this;
      
      // Ambil data terbaru di server dulu
      fetch('/api/sync')
        .then(function (res) { return res.json(); })
        .then(function (res) {
          if (res && res.ok && res.data) {
            const cloudUpdated = res.data.meta && res.data.meta.updated;
            const localUpdated = self.db && self.db.meta && self.db.meta.updated;
            if (cloudUpdated && cloudUpdated > localUpdated) {
              self.db = S.normalize(res.data);
              S.Persist.save(self.db);
              self.render();
              V.toast('Berhasil mengambil data terbaru dari Cloud! ☁️', 'ok');
              if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
              App.updateNetDot(true, 'Cloudflare Aktif');
              return;
            }
          }
          // Jika lokal lebih baru atau sama, dorong ke cloud
          return fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(self.db)
          }).then(function (postRes) {
            if (postRes.ok) {
              V.toast('Berhasil mengirim data lokal ke Cloud! ☁️', 'ok');
              App.updateNetDot(true, 'Cloudflare Aktif');
            } else {
              V.toast('Gagal menyinkronkan data ke Cloud', 'err');
            }
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
          });
        })
        .catch(function (err) {
          V.toast('Koneksi gagal: pastikan ada internet', 'err');
          if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
          App.updateNetDot(false, 'Offline (Lokal)');
        });
    },

    saveAndRender: function () { this.save(); this.render(); },

    deleteReceipt: function (rid) {
      if (!rid) return;
      delete this.db.receipts[rid];
    },

    /* ---------- unduh ---------- */
    download: function (name, mime, text) {
      const a = document.createElement('a');
      a.href = 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(text);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); }, 0);
    },

    /* ---------- net indicator ---------- */
    updateNetDot: function (online, label) {
      const d = document.getElementById('net-dot');
      if (!d) return;
      const on = !!online;
      d.classList.toggle('on', on);
      if (label) {
        d.querySelector('em').textContent = label;
      } else {
        d.querySelector('em').textContent = on ? 'Tersinkron' : 'Lokal';
      }
    },

    /* ---------- profil ---------- */
    /* Muat ulang data dari profil yang sedang aktif. */
    muatProfil: function () {
      this.db = this.load();
      this.applyLockUI();
      return this.db;
    },

    /* Pindah profil. clearData=true untuk profil baru (belum ada isi). */
    pindahProfil: function (id, clearData) {
      if (!S.Profiles.setActive(id)) return false;
      if (clearData) { try { S.Persist.clear(); } catch (e) {} }
      this.muatProfil();
      location.hash = '#/dashboard';
      this.view = 'dashboard';
      this.applyLockUI();
      this.render();
      if (this.terkunci) V.profilGate();
      return true;
    },

    /* Sembunyikan menu berisi data keuangan saat profil terkunci.
       Status selalu dihitung ulang dari sumbernya supaya tidak basi. */
    applyLockUI: function () {
      const pid = S.Profiles.activeId();
      const p = S.Profiles.get(pid);
      this.terkunci = !!(p && p.pinHash && S.Profiles.isLocked(pid));
      const lock = this.terkunci;
      const body = document.body;
      if (body) body.classList.toggle('terkunci', lock);
      Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
        if (VIEW_DATA.indexOf(a.dataset.view) > -1) a.hidden = lock;
      });
      V.updateProfilBtn && V.updateProfilBtn();
    },

    /* ---------- router ---------- */
    parseHash: function () {
      const h = (location.hash || '').replace(/^#\/?/, '');
      const name = h.split('?')[0];
      return VIEWS.indexOf(name) > -1 ? name : 'dashboard';
    },

    go: function (view) {
      location.hash = '#/' + view;
    },

    /* ---------- halaman terakhir (dipakai Menu → "Terakhir Dibuka") ---------- */
    terakhirBuka: function () {
      try { return localStorage.getItem('savingduit.ui.terakhir') || ''; } catch (e) { return ''; }
    },

    /* jejak halaman dalam sesi ini — dipakai tab Menu sebagai tombol kembali */
    jejak: [],
    catatJejak: function (name) {
      if (this.jejak[this.jejak.length - 1] === name) return;
      this.jejak.push(name);
      if (this.jejak.length > 30) this.jejak.shift();
    },
    sebelumMenu: function () {
      const bersih = this.jejak.filter(function (v) { return v !== 'menu'; });
      return bersih[bersih.length - 1] || '';
    },
    catatTerakhir: function (name) {
      if (!name || name === 'menu') return;
      try { localStorage.setItem('savingduit.ui.terakhir', name); } catch (e) { /* mode privat */ }
    },

    render: function () {
      const name = this.view;
      this.catatTerakhir(name);
      this.catatJejak(name);
      const tabMenu = document.querySelector('.bnav-item[data-bview="menu"]');
      if (tabMenu) {
        const bisaBalik = name === 'menu' && !!this.sebelumMenu();
        const lbl = tabMenu.querySelector('.bnav-lbl');
        if (lbl) lbl.textContent = bisaBalik ? 'Kembali' : 'Menu';
        tabMenu.setAttribute('aria-label', bisaBalik ? 'Kembali ke halaman sebelumnya' : 'Menu daftar fitur');
      }
      document.getElementById('page-title').textContent = TITLES[name];
      /* Saat gerbang tertutup, saldo di kepala pun tidak boleh tampil. */
      const gerbang = root.K && K.uiGerbang && !K.bolehBuka() && name === 'masuk';
      const pill = document.getElementById('total-pill');
      pill.textContent = (this.terkunci || gerbang) ? '🔒' : U.fmtRp(S.totalBalance(this.db));
      pill.hidden = !!gerbang;   // saat gerbang: gembok saja, tanpa angka
      pill.setAttribute('aria-label', gerbang ? 'Terkunci sampai masuk' : 'Total saldo');
      document.getElementById('content').innerHTML = this.terkunci && VIEW_DATA.indexOf(name) > -1
        ? '<div class="card"><div class="empty"><span class="e-ic">🔒</span>' +
          '<p>Profil ini terkunci.</p><p class="muted" style="margin-top:8px">Masukkan sandi untuk membuka catatan.</p>' +
          '<button class="btn primary" style="margin-top:14px" onclick="V.profilGate()">Buka dengan Sandi</button></div></div>'
        : eval(PREFIX[name]);
      U.polishIcons(document);
      if (name === 'dashboard') this.cekJKeluarga();
      if (name === 'masuk') V.gerbangBind();
      const content = document.getElementById('content');
      content.dataset.page = name;
      const descriptions = {
        menu: 'Semua fitur Money Planner dalam satu tempat.',
        transaksi: 'Semua pemasukan, pengeluaran, dan transfer dalam satu tempat.',
        rekap: 'Pahami kebiasaan keuanganmu lewat ringkasan dan statistik.',
        anggaran: 'Atur batas pengeluaran agar rencana tetap di jalurnya.',
        target: 'Sisihkan sedikit demi sedikit untuk hal yang berarti.',
        langganan: 'Pantau tagihan rutin agar tidak ada yang terlewat.',
        dompet: 'Kelola saldo tunai, rekening, dan uang digitalmu.',
        kategori: 'Rapikan catatan dengan kategori yang sesuai kebutuhanmu.',
        pengaturan: 'Kelola backup, sinkronisasi, dan preferensi aplikasi.',
        profil: 'Pisahkan catatan keuangan pribadi dan kebutuhan lainnya.'
      };
      if (descriptions[name] && !this.terkunci) {
        const heading = document.createElement('header');
        heading.className = 'page-intro';
        const title = document.createElement('h2');
        title.textContent = TITLES[name];
        const description = document.createElement('p');
        description.textContent = descriptions[name];
        heading.append(title, description);
        content.prepend(heading);
      }
      if (!this.terkunci && BIND[name]) eval(BIND[name]);
      Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
        a.classList.toggle('active', a.dataset.view === name);
        if (a.dataset.view === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      Array.prototype.forEach.call(document.querySelectorAll('#bottom-nav .bnav-item'), function (a) {
        a.classList.toggle('active', a.dataset.bview === name);
        if (a.dataset.bview === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      document.getElementById('content').scrollTop = 0;
    },

    navigate: function () {
      const v = this.parseHash();
      this.view = (root.K && K.uiGerbang && !K.bolehBuka()) ? 'masuk' : v;
      this.applyLockUI();
      this.updateNetDot(!!(this.db && this.db.settings.driveEnabled && this.db.settings.driveFileId));
      this.render();
      const sb = document.querySelector('.sidebar');
      if (sb) sb.classList.remove('open');
      document.querySelector('.scrim').classList.remove('show');
    },

    /* Kartu "Buat akun / Masuk" di beranda disembunyikan kalau sudah login.
       Offline atau server tidak menjawab: kartu dibiarkan apa adanya. */
    cekJKeluarga: function () {
      const card = document.querySelector('#content .fam-masuk');
      if (!card) return;
      const lalu = this._famCek;
      if (lalu && Date.now() - lalu.at < 60000) {
        if (lalu.login) card.hidden = true;
        return;
      }
      fetch('/api/family/me', { credentials: 'same-origin' })
        .then(function (r) {
          const login = r.status === 200;
          card.hidden = login;
          App._famCek = { at: Date.now(), login: login };
        })
        .catch(function () {});
    },

    /* ---------- init ---------- */
    init: function () {
      if (this._inited) return;
      this._inited = true;

      // pastikan daftar profil ada (sekaligus memindahkan data lama ke profil pertama)
      S.Profiles.list();
      if (root.K) K.init();

      /* Wajib masuk sebelum dashboard. Tanpa jalan pintas: data keuangan tidak
         ditampilkan dan tidak dimuat sebelum sesi terbukti. */
      const self = this;
      if (root.K && K.uiGerbang && !K.bolehBuka()) {
        this.load();          // db perlu ada untuk render; isinya tidak ditampilkan
        document.getElementById('content').innerHTML =
          '<div class="card"><div class="empty"><span class="e-ic">🔒</span>' +
          '<p>Memeriksa sesi…</p></div></div>';
        K.uiGerbang().then(function (boleh) {
          if (!boleh) { self.tampilkanGerbang(); return; }
          self.mulai();
        });
        return;
      }
      this.mulai();
    },

    /* Isi terkunci sampai sesi terbukti: navigasi disembunyikan dan halaman
       diarahkan ke layar masuk. */
    tampilkanGerbang: function () {
      document.body.classList.add('wajib-masuk');
      this._gerbangTertutup = true;
      this.view = 'masuk';
      this.render();
    },

    mulai: function () {
      /* Dipanggil ulang setelah gerbang dibuka: jangan pasang pengait dua kali. */
      if (this._mulaiAktif) {
        document.body.classList.remove('wajib-masuk');
        this._gerbangTertutup = false;
        this.navigate();
        return;
      }
      this._mulaiAktif = true;
      this._gerbangTertutup = false;
      document.body.classList.remove('wajib-masuk');

      /* Mode keluarga perlu menunggu server, jadi aplikasi dimulai setelah
         data siap. Mode pribadi dibuka seketika seperti sebelumnya. */
      if (root.K && K.aktif()) {
        document.getElementById('content').innerHTML =
          '<div class="card"><div class="empty"><span class="e-ic">👨‍👩‍👧</span>' +
          '<p>Memuat buku keluarga…</p></div></div>';
        const self = this;
        this.muat().then(function () {
          self.terapkanModeUI();
          self.siapkan();
        });
        return;
      }
      this.load();
      this.terapkanModeUI();
      this.siapkan();

      /* Bila sudah login, ambil salinan pribadi dari server. Hanya diisi bila
         perangkat ini belum punya catatan, supaya data lokal tidak tertimpa. */
      if (root.K) this.tarikPribadi();

      /* Kirim sisa perubahan saat halaman ditinggalkan. */
      window.addEventListener('pagehide', function () { App.simpanPribadiSekarang(); });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') App.simpanPribadiSekarang();
      });
    },

    /* Ambil salinan pribadi dari server. Kosong secara default: perangkat baru
       boleh mengisinya, perangkat yang sudah berisi tidak ditimpa. */
    tarikPribadi: async function () {
      if (!root.K) return null;
      /* jangan ikut memutuskan gerbang di sini (balapan = true). */
      const login = await K.periksaPribadi(true);
      if (login !== true) return null;
      const jauh = await K.muatPribadi();
      if (!jauh || !jauh.transactions) return null;
      const lokal = this.db;
      if (lokal.transactions && lokal.transactions.length) return null;   // jangan timpa
      this.db = S.normalize(jauh);
      S.Persist.save(this.db);
      this.render();
      V.toast('Catatan pribadi dimuat dari cloud.', 'ok');
      return this.db;
    },

    /* Sisa persiapan setelah data tersedia (dipakai kedua mode). */
    siapkan: function () {
      this.applyLockUI();

      window.addEventListener('hashchange', this.navigate.bind(this));

      /* Tab Menu di navigasi bawah: tekan sekali membuka daftar fitur,
         tekan lagi = kembali ke halaman sebelumnya (pengganti gestur kembali). */
      const tabMenu = document.querySelector('.bnav-item[data-bview="menu"]');
      if (tabMenu) {
        tabMenu.addEventListener('click', function (e) {
          if (App.view !== 'menu') return;            // sedang di halaman lain -> buka daftar
          const sebelum = App.sebelumMenu();
          if (!sebelum) return;                        // tidak ada tujuan -> tetap di daftar
          e.preventDefault();
          App.go(sebelum);
        });
      }

      // sidebar mobile
      const sb = document.querySelector('.sidebar'), sc = document.querySelector('.scrim');
      document.getElementById('hamburger').onclick = function () { sb.classList.add('open'); sc.classList.add('show'); };
      sc.onclick = function () { sb.classList.remove('open'); sc.classList.remove('show'); };

      // modal
      document.getElementById('modal-wrap').addEventListener('click', function (e) {
        if (e.target.id === 'modal-wrap' || e.target.closest('[data-close]')) V.modal.close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') V.modal.close();
        if (e.key === 'n' && e.altKey && document.getElementById('modal-wrap').hidden && !App.terkunci) {
          e.preventDefault(); V.txForm();
        }
      });

      // backup otomatis harian (unduh sekali sehari)
      const last = this.db.settings.lastBackup ? this.db.settings.lastBackup.slice(0, 10) : '';
      if (last && U.diffDays(U.today(), last) >= 7) {
        setTimeout(function () { V.toast('Sudah seminggu sejak backup terakhir — pertimbangkan unduh backup di Pengaturan'); }, 1500);
      }

      if (root.GDrive && this.db.settings.driveClientId) root.GDrive.clientId = this.db.settings.driveClientId;

      this.navigate();
      V.updateProfilBtn && V.updateProfilBtn();

      // Coba sinkronisasi otomatis dari Cloudflare D1
      this.syncCloudPull();

      // profil bersandi yang belum dibuka -> langsung minta sandi
      if (this.terkunci) setTimeout(function () { V.profilGate(); }, 200);
    }
  };

  root.App = App;

  if (typeof document !== 'undefined' && document.getElementById('app')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { App.init(); });
      // jaring pengaman: kalau DOMContentLoaded sudah lewat/tidak pernah menyala
      setTimeout(function () { App.init(); }, 0);
    } else {
      App.init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = App;
})(typeof window !== 'undefined' ? window : globalThis);