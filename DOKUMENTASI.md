# 📚 Dokumentasi Lengkap Aplikasi SavingDuit

Selamat datang di dokumentasi resmi **SavingDuit**, aplikasi pencatat keuangan pribadi modern, cepat, dan aman dengan arsitektur **Hybrid Offline-First + Auto-Sync Cloudflare D1 Database**.

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

```text
savingduit/
├── index.html          # Halaman antarmuka Single Page Application
├── worker.js           # Cloudflare Worker API & handler REST D1
├── wrangler.toml       # Konfigurasi binding database D1 & edge route
├── manifest.json       # Metadata aplikasi mobile (PWA)
├── sw.js               # Service Worker untuk offline support & caching
├── icon-192.png        # Asset logo aplikasi 192x192
├── icon-512.png        # Asset logo aplikasi 512x512
├── DOKUMENTASI.md      # Panduan komprehensif ini
├── README.md           # Ringkasan cepat proyek
├── buka.bat            # Script pembuka server lokal (opsional)
├── server.js           # Server Node.js untuk pengujian lokal
├── css/
│   └── style.css       # Seluruh stylesheet antarmuka responsif
└── js/
    ├── app.js          # Inisialisasi, routing, dan auto-sync Cloudflare
    ├── store.js        # Logika database lokal, validasi, dan profil
    ├── views.js        # Komponen template antarmuka
    ├── util.js         # Utilitas pemformatan mata uang, tanggal, dan kalkulasi
    └── gdrive.js       # Integrasi cadangan Google Drive API
```

---

## 💻 Panduan Pengembang (Development & Deployment)

### Menjalankan di Komputer Lokal
Jika ingin menjalankan dan mengembangkan secara lokal:
```bash
# Jalankan menggunakan server lokal bawaan
node server.js
# atau klik dua kali berkas 'buka.bat'
```
Aplikasi akan aktif di `http://localhost:8765`.

### Deployment ke Cloudflare Workers
Pastikan tool Wrangler sudah login:
```bash
wrangler whoami
```
Untuk mengunggah versi terbaru ke internet:
```bash
wrangler deploy
```

---
*Dokumentasi ini dibuat untuk memudahkan penggunaan, pemeliharaan, dan pengembangan aplikasi SavingDuit di masa mendatang.*
