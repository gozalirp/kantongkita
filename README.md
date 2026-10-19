# 💰 SavingDuit

Aplikasi pencatat keuangan pribadi modern, cepat, dan aman dengan arsitektur **Hybrid Offline-First + Auto-Sync Cloudflare D1**.

Live App: **[https://savingduit.gozalirp.workers.dev](https://savingduit.gozalirp.workers.dev)**

---

## ✨ Fitur Utama
1. **Multi-Profil & Kunci PIN:** Dukungan banyak profil (Pribadi, Bisnis, dsb) dengan proteksi PIN.
2. **Pencatatan Keuangan Lengkap:** Transaksi (Pemasukan, Pengeluaran, Transfer), Anggaran per Kategori, Target Tabungan, Langganan Rutin, dan Multi-Dompet/Bank.
3. **Penyimpanan Hybrid (Offline-First):** Data tersimpan super cepat di memori internal browser/HP, dan otomatis tersinkron ke **Cloudflare D1 Database** di latar belakang.
4. **Sinkronisasi Multi-Device:** Tombol `[🔄 Sync]` di topbar untuk sinkronisasi instan antar HP dan Laptop.
5. **Cadangan Opsional:** Mendukung ekspor/impor file JSON fisik serta integrasi Google Drive.
6. **PWA Ready (Aplikasi Android):** Dapat di-install langsung dari browser Chrome menjadi aplikasi mandiri di Android tanpa butuh Google Play Store.

---

## 🛠️ Struktur Berkas

Frontend dan backend dipisah dalam dua folder terpisah, tetap dalam satu proyek.

### 🎨 `public/` — Frontend
- `index.html` — Halaman utama aplikasi (Single Page App).
- `manifest.json` & `sw.js` — Konfigurasi Progressive Web App (PWA).
- `icon-192.png` & `icon-512.png` — Icon aplikasi resolusi tinggi.
- `css/` — Tampilan antarmuka responsif dan modern.
- `js/`
  - `app.js` — Logika bootstrap, router navigasi, dan auto-sync Cloudflare D1.
  - `store.js` — Model data keuangan, validasi, normalisasi, dan profil.
  - `views.js` — Komponen tampilan UI (Dashboard, Transaksi, Rekap, dll).
  - `util.js` — Helper format mata uang rupiah, tanggal, dan kalkulasi.
  - `gdrive.js` — Driver sinkronisasi cadangan Google Drive.

### ⚙️ `worker/` — Backend
- `worker.js` — Cloudflare Worker API (`GET /api/sync`, `POST /api/sync`, `GET /api/health`) untuk produksi.
- `server.js` — Server Node.js untuk pengujian lokal.

### 📦 Berkas pendukung
- `wrangler.toml` — Konfigurasi: `main = worker/worker.js`, `assets = public/`, dan binding D1.
- `buka.bat` — Server lokal, klik dua kali untuk menjalankan.
- `tests/` — Uji otomatis (logika, profil, DOM, dan browser sungguhan).
- `.github/workflows/` — CI build otomatis Android APK.

---

## 🚀 Perintah
```bash
npm start          # jalankan server lokal (http://localhost:8765)
npm run dev        # uji backend dengan wrangler dev + D1 lokal
npm test           # jalankan uji otomatis
npm run deploy     # deploy frontend + backend ke Cloudflare
```
