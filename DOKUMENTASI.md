# 📚 Dokumentasi Lengkap Aplikasi SavingDuit

Selamat datang di dokumentasi resmi **SavingDuit**, aplikasi pencatat keuangan pribadi modern, cepat, dan aman dengan arsitektur **Hybrid Offline-First + Auto-Sync Cloudflare D1 Database**.

---

## 📱 Unduh & Pasang APK Android (Standalone Native App)

Aplikasi SavingDuit telah berhasil di-compile secara otomatis melalui GitHub Actions CI/CD dan siap dipasang di smartphone Android:

- **File APK Lokal**: `C:/Users/gozali.rahman/Project/savingduit/apk/app-debug.apk` (Ukuran: ~4.1 MB)
- **Unduh dari GitHub**: [GitHub Actions Run #25 (Artifact: SavingDuit-App)](https://github.com/gozalirp/savingduit/actions/runs/39196344948)
- **Versi Web / PWA Langsung**: [https://savingduit.gozalirp.workers.dev](https://savingduit.gozalirp.workers.dev)

---

## 📌 Daftar Isi
1. [Ikhtisar Arsitektur](#-ikhtisar-arsitektur)
2. [Fitur-Fitur Utama](#-fitur-fitur-utama)
3. [Panduan Pemasangan di HP (Android PWA)](#-panduan-pemasangan-di-hp-android-pwa)
4. [Mekanisme Sinkronisasi Data (Cloudflare D1)](#-mekanisme-sinkronisasi-data-cloudflare-d1)
5. [Cadangan Tambahan (Google Drive & JSON)](#-cadangan-tambahan-google-drive--json)
6. [Struktur Proyek](#-struktur-proyek)
7. [Panduan Pengembang (Development & Deployment)](#-panduan-pengembang-development--deployment)

---

## 🏗️ Ikhtisar Arsitektur

SavingDuit dirancang dengan pendekatan **Hybrid Offline-First**:
```text
  [ Perangkat Pengguna: HP / Laptop ]
       │
       ▼ (Menulis instan < 1ms)
  [ localStorage (Memori Lokal HP/Browser) ]
       │
       ▼ (Auto-Sync Latar Belakang / Tombol Sync)
  [ Cloudflare Workers API (/api/sync) ]
       │
       ▼ (Simpan ke Edge Database Terdistribusi)
  [ Cloudflare D1 (Serverless SQLite Database) ]
```

- **Kecepatan Lokal:** Setiap transaksi langsung dicatat ke memori lokal tanpa menunggu respons jaringan internet. Pengguna tidak akan merasakan lag/loading.
- **Ketahanan Cloud:** Data otomatis disalin ke database Cloudflare D1 sehingga catatan keuangan tidak akan hilang meskipun cache browser dihapus atau berganti HP baru.

---

## 🌟 Fitur-Fitur Utama

### 1. Multi-Profil & Keamanan PIN
- Mendukung beberapa profil mandiri (misal: **Pribadi**, **Usaha / Freelance**, **Keluarga**).
- Setiap profil dapat dikunci secara terpisah menggunakan kode PIN 6 digit dengan hashing SHA-256.

### 2. Manajemen Transaksi Komprehensif
- Tiga tipe mutasi: **Pemasukan**, **Pengeluaran**, dan **Transfer Antar Rekening**.
- Pemilihan dompet/rekening sumber dan rekening tujuan.
- Kategorisasi fleksibel lengkap dengan ikon emoji.
- Dukungan lampiran foto struk/nota belanja (disimpan efisien dalam format kompresi).

### 3. Anggaran & Monitoring Keuangan
- **Anggaran per Kategori:** Tetapkan batas belanja bulanan dan pantau persentase realisasinya (indikator warna hijau/kuning/merah).
- **Target Tabungan:** Pasang tujuan dana impian dengan visualisasi progress bar.
- **Monitor Langganan Rutin:** Rekap pengeluaran berulang (Netflix, Spotify, Internet, Gym, dll) untuk mencegah kebocoran kas.

### 4. Rekapitulasi & Visualisasi Data
- Rekap bulanan, per kategori, dan per dompet.
- Grafik visual bar chart dan rincian transaksi bersih.

---

## 📱 Panduan Pemasangan di HP (Android PWA)

SavingDuit sudah dilengkapi standar **Progressive Web App (PWA)** sehingga dapat langsung di-install sebagai aplikasi asli di Android tanpa perlu download dari Google Play Store:

1. Buka browser **Google Chrome** di HP Android Anda.
2. Akses tautan resmi:
   ```text
   https://savingduit.gozalirp.workers.dev
   ```
3. Ketuk menu **titik tiga (⋮)** di sudut kanan atas Chrome.
4. Pilih opsi **"Install App"** atau **"Tambahkan ke Layar Utama" (Add to Home screen)**.
5. Ketuk **Install**.
6. **Selesai!** Aplikasi SavingDuit akan muncul di menu aplikasi HP dengan ikon resmi dan berjalan layar penuh (*full screen*) seperti aplikasi native.

---

## 🔄 Mekanisme Sinkronisasi Data (Cloudflare D1)

### 1. Sinkronisasi Otomatis (Background Auto-Sync)
- **Saat Menambah/Mengubah Data:** 1,5 detik setelah transaksi disimpan, sistem di latar belakang otomatis mengirim data terbaru ke database Cloudflare D1.
- **Saat Membuka Aplikasi:** Aplikasi secara otomatis membandingkan timestamp data lokal dengan data di cloud. Jika data di cloud lebih baru (misal baru dicatat lewat laptop), data di HP akan otomatis diperbarui.

### 2. Tombol Manual Sync `[🔄 Sync]`
- Terletak di bar atas (topbar) di samping saldo serta pada menu **Pengaturan**.
- Berfungsi untuk memaksa pertukaran data seketika antara perangkat Anda dan server Cloudflare.

---

## 🛡️ Cadangan Tambahan (Google Drive & JSON)

Untuk keamanan data berlapis, tersedia dua opsi cadangan manual:

1. **Ekspor File JSON:** Di menu *Pengaturan* -> *Unduh Backup (JSON)*. File ini bisa disimpan di laptop, flashdisk, atau email.
2. **Sinkronisasi Google Drive:**
   - Masukkan **Google OAuth Client ID** di halaman Pengaturan.
   - Klik **Sambungkan Drive** untuk menyimpan salinan cadangan langsung ke Google Drive pribadi (`appDataFolder/savingduit.json`).

---

## 📁 Struktur Proyek

Proyek ini dipisah menjadi dua bagian yang jelas: **frontend** (tampilan, ada di `public/`) dan **backend** (API, ada di `worker/`). Keduanya tetap dalam satu proyek dan di-deploy bersamaan sebagai satu Worker.

```text
savingduit/
│
├── public/                     # 🎨 FRONTEND — semua yang dilihat pengguna
│   ├── index.html              # Halaman antarmuka Single Page Application
│   ├── manifest.json           # Metadata aplikasi mobile (PWA)
│   ├── sw.js                   # Service Worker untuk offline support & caching
│   ├── icon-192.png            # Asset logo aplikasi 192x192
│   ├── icon-512.png            # Asset logo aplikasi 512x512
│   ├── css/
│   │   └── style.css           # Seluruh stylesheet antarmuka responsif
│   └── js/
│       ├── app.js              # Inisialisasi, routing, dan auto-sync Cloudflare
│       ├── store.js            # Logika database lokal, validasi, dan profil
│       ├── views.js            # Komponen template antarmuka
│       ├── util.js             # Utilitas pemformatan mata uang, tanggal, kalkulasi
│       └── gdrive.js           # Integrasi cadangan Google Drive API
│
├── worker/                     # ⚙️ BACKEND — API & database
│   ├── worker.js               # Cloudflare Worker API + REST D1 (PRODUKSI)
│   └── server.js               # Server Node.js untuk pengujian lokal (DEV)
│
├── tests/                      # 🧪 Uji otomatis (smoke, profil, DOM, browser)
├── .github/workflows/          # 🤖 CI: build otomatis Android APK
│
├── wrangler.toml               # Konfigurasi: main = worker/worker.js, assets = public/
├── package.json                # Perintah npm (start, dev, deploy, test)
├── buka.bat                    # Script pembuka server lokal (klik dua kali)
├── DOKUMENTASI.md              # Panduan komprehensif ini
└── README.md                   # Ringkasan cepat proyek
```

### Batas Frontend ↔ Backend

Hanya ada **satu** titik sambung antara keduanya, yaitu HTTP API:

| Endpoint | Method | Fungsi |
| --- | --- | --- |
| `/api/health` | GET | Cek status server |
| `/api/sync` | GET | Ambil data dari cloud |
| `/api/sync` | POST | Simpan data ke cloud |

Frontend memanggilnya lewat **path relatif** (`fetch('/api/sync')`), sehingga tidak perlu konfigurasi URL apa pun selama keduanya satu domain. `wrangler.toml` mengarahkan `/api/*` ke `worker/worker.js`, dan sisanya dilayani sebagai file statis dari `public/`.

---

## 💻 Panduan Pengembang (Development & Deployment)

### Menjalankan di Komputer Lokal
Jika ingin menjalankan dan mengembangkan secara lokal:
```bash
npm start
# atau klik dua kali berkas 'buka.bat'
```
Aplikasi akan aktif di `http://localhost:8765`. Perintah ini menjalankan `worker/server.js`, yang melayani API sekaligus file statis dari `public/`.

### Mengubah Frontend
Semua berkas tampilan ada di `public/`. Cukup edit, lalu muat ulang browser (Ctrl+F5). Tidak perlu langkah build, tidak perlu menyentuh backend.

### Mengubah Backend
Semua logika API ada di `worker/worker.js`. Untuk menguji perubahan secara lokal dengan lingkungan Cloudflare sungguhan (termasuk database D1):
```bash
npm run dev
```

### Menjalankan Uji Otomatis
```bash
npm test                 # uji logika & DOM (cepat)
npm run test:browser     # uji di Chrome sungguhan (perlu Chrome terpasang)
```

### Deployment ke Cloudflare Workers
Pastikan tool Wrangler sudah login:
```bash
wrangler whoami
```
Untuk mengunggah versi terbaru ke internet (frontend + backend sekaligus):
```bash
npm run deploy
```

---
*Dokumentasi ini dibuat untuk memudahkan penggunaan, pemeliharaan, dan pengembangan aplikasi SavingDuit di masa mendatang.*
