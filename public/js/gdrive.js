/* ============================================================
   gdrive.js — sinkronisasi opsional ke Google Drive
   Pakai Google Identity Services (GIS) + Drive REST v3.
   File disimpan di appDataFolder (tersembunyi, hanya aplikasi ini).
   ============================================================ */
(function (root) {
  'use strict';

  const FILE_NAME = 'savingduit.json';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

  const G = {
    token: null,
    exp: 0,
    clientId: '',
    _gisReady: null
  };

  function loadGIS() {
    if (root.google && root.google.accounts && root.google.accounts.oauth2) return Promise.resolve();
    if (G._gisReady) return G._gisReady;
    G._gisReady = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = function () {
        if (root.google && root.google.accounts) resolve();
        else reject(new Error('Google Identity Services gagal dimuat'));
      };
      s.onerror = function () { reject(new Error('Tidak bisa memuat skrip Google (cek koneksi internet)')); };
      document.head.appendChild(s);
    });
    return G._gisReady;
  }

  G.connect = function (clientId) {
    G.clientId = clientId || G.clientId;
    if (!G.clientId) return Promise.reject(new Error('Client ID kosong'));
    if (location.protocol === 'file:') {
      return Promise.reject(new Error('Buka lewat http:// atau https:// (bukan file://) agar login Google bisa jalan'));
    }
    return loadGIS().then(function () {
      return new Promise(function (resolve, reject) {
        let done = false;
        try {
          const tc = root.google.accounts.oauth2.initTokenClient({
            client_id: G.clientId,
            scope: SCOPE,
            callback: function (resp) {
              done = true;
              if (resp && resp.access_token) {
                G.token = resp.access_token;
                G.exp = Date.now() + ((resp.expires_in || 3500) * 1000);
                resolve(G.token);
              } else if (resp && resp.error) {
                reject(new Error('Google OAuth error: ' + (resp.error_description || resp.error)));
              } else {
                reject(new Error('Izin ditolak atau jendela ditutup'));
              }
            },
            error_callback: function (e) {
              done = true;
              const msg = (e && (e.message || e.type)) || '';
              if (msg.indexOf('popup_closed') > -1 || msg.indexOf('user_closed') > -1) {
                reject(new Error('Jendela login ditutup sebelum selesai'));
              } else {
                reject(new Error(msg || 'Gagal membuka popup Google (cek Authorized Origins)'));
              }
            }
          });
          tc.requestAccessToken({ prompt: G.token ? '' : 'consent' });
        } catch (err) {
          done = true;
          reject(new Error('Inisialisasi OAuth gagal: ' + err.message));
        }
        setTimeout(function () {
          if (!done) {
            done = true;
            reject(new Error('Waktu login habis. Pastikan popup tidak diblokir browser.'));
          }
        }, 120000);
      });
    });
  };

  function auth() {
    if (G.token && Date.now() < G.exp - 30000) return Promise.resolve(G.token);
    if (!G.clientId) return Promise.reject(new Error('Belum tersambung ke Drive'));
    return G.connect(G.clientId);
  }

  function api(path, opt) {
    opt = opt || {};
    return auth().then(function (t) {
      return fetch('https://www.googleapis.com/drive/v3' + path, {
        method: opt.method || 'GET',
        headers: Object.assign({ Authorization: 'Bearer ' + t }, opt.headers || {}),
        body: opt.body
      });
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (txt) {
          throw new Error('Drive error ' + res.status + ': ' + txt.slice(0, 180));
        });
      }
      return opt.raw ? res : res.json();
    });
  }

  // cari file di appDataFolder
  G.findFile = function () {
    const q = encodeURIComponent("name='" + FILE_NAME + "' and trashed=false");
    return api('/files?spaces=appDataFolder&q=' + q + '&fields=files(id,name,modifiedTime,size)')
      .then(function (j) { return (j.files && j.files[0]) || null; });
  };

  // buat file kalau belum ada
  G.ensureFile = function (db) {
    const st = db.settings;
    if (st.driveFileId) return Promise.resolve(st.driveFileId);
    return G.findFile().then(function (f) {
      if (f) { st.driveFileId = f.id; st.driveEnabled = true; return f.id; }
      return auth().then(function (t) {
        const meta = { name: FILE_NAME, parents: ['appDataFolder'] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(db)], { type: 'application/json' }));
        return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: form
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j.id) throw new Error('Gagal membuat file di Drive');
          st.driveFileId = j.id; st.driveEnabled = true;
          return j.id;
        });
      });
    });
  };

  G.push = function (db) {
    return G.ensureFile(db).then(function (id) {
      return auth().then(function (t) {
        return fetch('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media', {
          method: 'PATCH',
          headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
          body: JSON.stringify(db)
        });
      }).then(function (r) {
        if (!r.ok) throw new Error('Gagal mengunggah (HTTP ' + r.status + ')');
        return true;
      });
    });
  };

  G.pull = function () {
    return G.findFile().then(function (f) {
      if (!f) return null;
      return auth().then(function (t) {
        return fetch('https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media', {
          headers: { Authorization: 'Bearer ' + t }
        });
      }).then(function (r) {
        if (!r.ok) throw new Error('Gagal mengunduh (HTTP ' + r.status + ')');
        return r.json();
      });
    });
  };

  G.disconnect = function () {
    const t = G.token; G.token = null;
    if (t && root.google && root.google.accounts && root.google.accounts.oauth2) {
      try { root.google.accounts.oauth2.revoke(t, function () {}); } catch (e) {}
    }
  };

  root.GDrive = G;
})(typeof window !== 'undefined' ? window : globalThis);