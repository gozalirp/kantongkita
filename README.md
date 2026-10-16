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
- `index.html` — Halaman utama aplikasi (Single Page App).
- `css/` — Tampilan antarmuka responsif dan modern.
- `js/`
  - `app.js` — Logika bootstrap, router navigasi, dan auto-sync Cloudflare D1.
  - `store.js` — Model data keuangan, validasi, normalisasi, dan profil.
  - `views.js` — Komponen tampilan UI (Dashboard, Transaksi, Rekap, dll).
  - `util.js` — Helper format mata uang rupiah, tanggal, dan kalkulasi.
  - `gdrive.js` — Driver sinkronisasi cadangan Google Drive.
- `worker.js` — Cloudflare Worker API (`GET /api/sync`, `POST /api/sync`, `GET /api/health`).
- `wrangler.toml` — Konfigurasi deployment Cloudflare Workers + D1 Database.
- `manifest.json` & `sw.js` — Konfigurasi Progressive Web App (PWA).
- `icon-192.png` & `icon-512.png` — Icon aplikasi resolusi tinggi.
- `server.js` & `buka.bat` — Server lokal alternatif jika ingin dijalankan offline di komputer.

---

## 🚀 Perintah Deployment (Cloudflare)
Untuk memperbarui kode ke Cloudflare:
```bash
wrangler deploy
```
