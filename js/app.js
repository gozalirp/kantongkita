/* ============================================================
   app.js — bootstrap, router, penyimpanan, render
   ============================================================ */
(function (root) {
  'use strict';
  const U = root.U, S = root.S, V = root.V;

  const VIEWS = ['dashboard', 'transaksi', 'rekap', 'anggaran', 'target', 'langganan', 'dompet', 'kategori', 'pengaturan', 'profil'];
  const TITLES = {
    dashboard: 'Dashboard', transaksi: 'Catatan Transaksi', rekap: 'Rekap Transaksi',
    anggaran: 'Anggaran per Kategori', target: 'Target Tabungan', langganan: 'Langganan Bulanan',
    dompet: 'Dompet & Bank', kategori: 'Kategori', pengaturan: 'Pengaturan', profil: 'Profil'
  };
  const PREFIX = {
    dashboard: 'V.dashboard()', transaksi: 'V.transaksi()', rekap: 'V.rekap()',
    anggaran: 'V.anggaran()', target: 'V.target()', langganan: 'V.langganan()',
    dompet: 'V.dompet()', kategori: 'V.kategori()', pengaturan: 'V.pengaturan()', profil: 'V.profil()'
  };
  const BIND = {
    dashboard: 'V.dashboardBind()', transaksi: 'V.transaksiBind()', rekap: 'V.rekapBind()',
    anggaran: null, target: null, langganan: null,
    dompet: null, kategori: 'V.kategoriBind()', pengaturan: 'V.pengaturanBind()', profil: null
  };

  /* Kunci sepenuhnya halaman yang tidak butuh data keuangan — tetap bisa dibuka
     walau profil sedang terkunci (supaya orang bisa pindah profil). */
  const VIEW_BEBAS = ['profil', 'pengaturan'];
  /* Halaman yang tidak masuk daftar ini disembunyikan saat profil terkunci. */
  const VIEW_DATA = ['dashboard', 'transaksi', 'rekap', 'anggaran', 'target', 'langganan', 'dompet', 'kategori'];

  const App = {
    db: null,
    view: 'dashboard',
    terkunci: false,
    _inited: false,

    /* ---------- penyimpanan ---------- */
    storageKey: function () { return S.Persist.key(); },

    load: function () {
      let raw = S.Persist.load();
      if (!raw) { this.db = S.seedDB(); this.save(); }
      else this.db = S.normalize(raw);
      return this.db;
    },

    save: function () {
      this.db.meta.updated = new Date().toISOString();
      const r = S.Persist.save(this.db);
      if (r === 'slim') V.toast('Penyimpanan penuh — struk dihapus otomatis, transaksi tetap aman', 'err');
      
      // Auto-Sync ke Cloudflare D1 di background (Hybrid Offline-First)
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

    /* Auto-Sync Cloudflare Push (Background) */
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

    render: function () {
      const name = this.view;
      document.getElementById('page-title').textContent = TITLES[name];
      document.getElementById('total-pill').textContent = this.terkunci ? '🔒' : U.fmtRp(S.totalBalance(this.db));
      document.getElementById('content').innerHTML = this.terkunci && VIEW_DATA.indexOf(name) > -1
        ? '<div class="card"><div class="empty"><span class="e-ic">🔒</span>' +
          '<p>Profil ini terkunci.</p><p class="muted" style="margin-top:8px">Masukkan sandi untuk membuka catatan.</p>' +
          '<button class="btn primary" style="margin-top:14px" onclick="V.profilGate()">Buka dengan Sandi</button></div></div>'
        : eval(PREFIX[name]);
      if (!this.terkunci && BIND[name]) eval(BIND[name]);
      Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
        a.classList.toggle('active', a.dataset.view === name);
      });
      Array.prototype.forEach.call(document.querySelectorAll('#bottom-nav .bnav-item'), function (a) {
        a.classList.toggle('active', a.dataset.bview === name);
      });
      document.getElementById('content').scrollTop = 0;
    },

    navigate: function () {
      const v = this.parseHash();
      this.view = v;
      this.applyLockUI();
      this.updateNetDot(this.db.settings.driveEnabled && this.db.settings.driveFileId);
      this.render();
      const sb = document.querySelector('.sidebar');
      if (sb) sb.classList.remove('open');
      document.querySelector('.scrim').classList.remove('show');
    },

    /* ---------- init ---------- */
    init: function () {
      if (this._inited) return;
      this._inited = true;

      // pastikan daftar profil ada (sekaligus memindahkan data lama ke profil pertama)
      S.Profiles.list();
      this.load();
      this.applyLockUI();

      window.addEventListener('hashchange', this.navigate.bind(this));

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