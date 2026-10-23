# Panduan SavingDuit

Panduan penggunaan dan pemeliharaan aplikasi pencatat keuangan pribadi dan keluarga.

**Web:** https://moneyplanner.darmintompel.my.id
**Worker:** https://savingduit.gozalirp.workers.dev

## Daftar isi

1. [Penggunaan aplikasi](#penggunaan-aplikasi)
2. [Backup dan ekspor](#backup-dan-ekspor)
3. [Pemasangan di HP](#pemasangan-di-hp)
4. [Arsitektur dan batas data](#arsitektur-dan-batas-data)
5. [Struktur proyek](#struktur-proyek)
6. [Pengembangan lokal](#pengembangan-lokal)
7. [Pengujian](#pengujian)
8. [Deployment dan migrasi](#deployment-dan-migrasi)
9. [Pemecahan masalah](#pemecahan-masalah)

## Penggunaan aplikasi

### Akun dan profil

- Akun server digunakan untuk login, sinkronisasi pribadi, dan keanggotaan keluarga.
- Profil lokal memisahkan catatan pada perangkat. PIN profil bukan password server, bukan enkripsi seluruh database, dan tidak menggantikan autentikasi akun.
- Pemulihan memakai kode pemulihan atau email terverifikasi, sesuai kondisi akun. Simpan kode pemulihan di tempat privat.
- Detail konfigurasi email: [EMAIL_SETUP.md](EMAIL_SETUP.md).

### Buku pribadi dan keluarga

- Buku pribadi terikat pada pemilik akun; pasangan tidak mendapat akses melalui API buku pribadi.
- Dua anggota yang bergabung memakai satu buku keluarga. Perubahan buku bersama terlihat oleh kedua anggota setelah pemuatan/sinkronisasi berhasil.
- Riwayat pribadi tidak otomatis dipindahkan ke keluarga. Gunakan pilihan impor data lama secara eksplisit.
- Jangan menyamakan tampilan gabungan dengan satu buku asli. Tampilan gabungan dapat memiliki ID sementara berawalan sumber.
- Buku keluarga yang gagal dimuat tidak boleh digantikan diam-diam dengan buku pribadi.

### Pencatatan dan laporan

Aplikasi menyediakan pemasukan, pengeluaran, transfer, dompet, kategori, anggaran, target tabungan, langganan, grafik, dan Rekap. Transfer antar dompet bukan pemasukan atau pengeluaran baru.

Filter Transaksi mencakup pencarian, periode, dompet/kategori, pencatat, dan sumber buku ketika relevan. Filter tampilan tidak menentukan periode file ekspor: ekspor saat ini mencakup seluruh transaksi buku yang dipilih.

## Backup dan ekspor

Tersedia di Pengaturan; Excel dan CSV juga dapat diakses dari Rekap. Sebelum mengunduh, pilih **Buku pribadi** atau **Buku keluarga**.

| Format | Kegunaan | Isi dan batasan |
|---|---|---|
| Excel `.xlsx` | Laporan yang nyaman dibaca | Tabel bergaris, warna baris, filter, header beku, angka Rupiah, tanggal, pencatat, catatan |
| CSV `.csv` | Pengolahan data | Teks UTF-8; tidak menyimpan desain tabel; pemisah kolom dapat perlu disetel saat impor ke spreadsheet |
| JSON `.json` | Backup dan pemulihan | Koleksi buku beserta penanda sumber; bukan laporan untuk dibaca sebagai tabel |

- Ekspor mencakup **seluruh periode**, bukan hanya filter layar.
- Nama file mencantumkan sumber buku. Ekspor keluarga memerlukan sesi yang sesuai dan buku keluarga sudah termuat.
- Gambar struk yang hanya ada di perangkat tidak ikut tersimpan pada buku server. Backup JSON bukan cadangan seluruh akun: tidak memuat password, sesi, keanggotaan, atau seluruh profil perangkat.
- Sinkronisasi bukan pengganti backup. Jangan menganggap data aman di cloud sebelum penyimpanan berhasil.
- Google Drive sementara **dikunci**; gunakan unduhan manual.

### Pemulihan JSON

1. Unduh backup buku tujuan sebelum melakukan pemulihan.
2. Pilih tujuan **pribadi/keluarga**, lalu pilih file JSON.
3. Untuk backup baru, sumber file harus cocok dengan tujuan. Backup lama tanpa sumber memerlukan pemeriksaan manual dan diberi peringatan.
4. Mode gabung menambahkan entri berdasarkan ID; benturan isi untuk ID sama ditolak. Mode ganti menggantikan seluruh isi buku tujuan, bukan seluruh akun.
5. Periksa dialog konfirmasi. Pemulihan keluarga memengaruhi seluruh anggota keluarga.

Referensi transaksi rusak dan perubahan revisi keluarga selama konfirmasi ditolak. Excel/CSV tidak digunakan untuk pemulihan JSON. Tombol **Reset Data Pribadi** terpisah dari pemulihan dan tidak dimaksudkan untuk mereset buku keluarga.

## Pemasangan di HP

### PWA — jalur yang direkomendasikan

1. Buka alamat web utama di Chrome Android.
2. Pilih menu browser → **Install app / Tambahkan ke layar utama**.
3. Jalankan dari ikon aplikasi.

Cache PWA membantu memuat aset aplikasi; ini tidak berarti login dan buku keluarga dapat dipakai sepenuhnya tanpa internet.

### APK

Build tersedia melalui [GitHub Actions](https://github.com/gozalirp/savingduit/actions), apabila workflow berhasil. Jangan merujuk APK lokal lama sebagai rilis terbaru.

Workflow saat ini membungkus aset `public/` dengan Capacitor dan tidak menetapkan `server.url` produksi. Karena API memakai path relatif, konektivitas APK ke backend produksi belum boleh dianggap siap. PWA dan APK memiliki konteks penyimpanan berbeda. Pengujian HP fisik tetap diperlukan.

## Arsitektur dan batas data

```text
Browser / PWA
  ├─ localStorage: profil dan arsip pribadi perangkat
  └─ HTTPS /api/family/*: autentikasi dan sinkronisasi
       └─ Cloudflare Worker
            └─ D1
               ├─ akun, sesi, undangan, email
               ├─ buku pribadi per user_id
               └─ buku keluarga per family_id
```

Isi buku keuangan disimpan sebagai JSON yang dipecah menjadi potongan teks; belum ada tabel SQL terpisah untuk tiap transaksi, dompet, atau kategori. Kolom revisi mengendalikan konflik penulisan. Lihat [struktur database](docs/database.md).

| Endpoint | Metode | Tujuan |
|---|---|---|
| `/api/health` | GET | Status dasar Worker, bukan pemeriksaan lengkap DB |
| `/api/family/me` | GET | Akun dan anggota keluarga sesi aktif |
| `/api/family/data` | GET | Buku keluarga dan revisi |
| `/api/family/save` | POST | Simpan buku keluarga lengkap dengan revisi |
| `/api/family/personal/data` | GET | Buku pribadi milik akun aktif |
| `/api/family/personal/save` | POST | Simpan buku pribadi dengan revisi |
| `/api/family/link` | POST | Gabungkan keanggotaan lewat undangan dengan pemeriksaan terkait |
| `/api/sync` | GET/POST | Jalur lama diblokir; bukan API sinkronisasi aktif |
| `/api/family/transaction` | POST | Ditutup pada kode terbaru dengan 410; jangan dipakai klien baru |

Endpoint akun dan pemulihan lainnya berada di `worker/family.mjs` dan `worker/account-email.mjs`. POST memerlukan origin yang sesuai; operasi terautentikasi menggunakan cookie sesi. Jangan menyalin cookie/token ke dokumentasi atau log publik.

## Struktur proyek

```text
public/
  index.html, akun-email.html     Halaman aplikasi dan pemulihan
  css/style.css                  Antarmuka responsif
  js/app.js                      Bootstrap, navigasi, persistensi/sinkronisasi
  js/store.js, util.js            Model, kalkulasi, normalisasi, utilitas
  js/views.js                    Tampilan dan formulir
  js/buku-gabungan.js             Batas buku pribadi/keluarga dan tampilan
  js/keluarga-mode.js             Integrasi akun/cloud dan mode lama
  js/uiGerbang.js                 Gerbang autentikasi
  js/excel.js                     Pembuatan berkas XLSX tanpa CDN
  js/gdrive.js                    Integrasi Drive yang sedang dikunci
  manifest.json, sw.js            PWA dan cache aset
worker/
  worker.js                      Routing API, aset, jadwal pemeliharaan
  family.mjs, family-security.mjs Akun, otorisasi, dan buku
  account-email.mjs              Verifikasi dan pemulihan email
  maintenance.mjs                Retensi autentikasi terbatas
  migrations/                    Skema dan indeks D1
  server.js                      Server pengembangan Node lama
 tests/                          Tes otomatis dan skrip integrasi lokal
 docs/                           Panduan database dan operasional
 design-system/savingduit/       Pedoman desain
 wrangler.toml                   Konfigurasi Worker, D1, aset, cron
```

## Pengembangan lokal

### Worker dan D1 lokal

Gunakan `npm run dev` untuk pengujian backend yang sesuai arsitektur produksi. Terapkan berkas SQL ke **database lokal**, berurutan:

```bash
npx wrangler d1 execute savingduit-db --local --file worker/migrations/0001_family.sql
npx wrangler d1 execute savingduit-db --local --file worker/migrations/0002_family_book.sql
npx wrangler d1 execute savingduit-db --local --file worker/migrations/0003_personal_book.sql
npx wrangler d1 execute savingduit-db --local --file worker/migrations/0004_account_email.sql
npx wrangler d1 execute savingduit-db --local --file worker/migrations/0005_database_indexes.sql
npm run dev
```

`--local` penting: jangan menggantinya menjadi `--remote` untuk fixture uji. Gunakan akun uji khusus. Konfigurasi pengiriman email lokal tidak boleh mengirim pesan ke pemilik alamat tanpa izin.

### Server Node lama

`npm start` melayani `http://localhost:8765`, tetapi tidak menyediakan seluruh API autentikasi Worker terbaru. Cocok untuk kebutuhan statis/legacy, bukan bukti bahwa login produksi bekerja.

Jangan menambahkan bypass login ke berkas publik. Server preview sementara dengan fixture bukan konfigurasi produksi.

## Pengujian

```bash
npm test
npm run test:browser
node tests/database-safety.mjs
node tests/excel.cjs
```

- `npm test`: logika, profil, DOM, keamanan, SQLite lokal, ekspor dan batas buku.
- `npm run test:browser`: tes browser dan responsif; membutuhkan lingkungan browser yang sesuai.
- `database-safety.mjs`: konflik terkontrol, first-save race, rollback, indeks, dan retensi di SQLite memory.
- `excel.cjs`: struktur XML/ZIP XLSX, angka/tanggal, teks aman, tabel/filter, dan buku kosong.
- Skrip `tests/family-*.mjs` tertentu membutuhkan Worker lokal pada port yang tertulis di masing-masing skrip; tidak semuanya dijalankan oleh `npm test`.

Tes lokal bukan bukti konkurensi runtime D1, pengiriman email nyata, kualitas visual Microsoft Excel, atau perilaku HP fisik.

## Deployment dan migrasi

**Status saat pembaruan dokumen:** ekspor Excel dan pilihan buku sudah diterbitkan. Perbaikan DB, indeks `0005`, serta cron retensi baru ada di kode dan belum diterapkan ke produksi.

1. Periksa perubahan dan jalankan tes.
2. Untuk perubahan DB, simpan backup privat di luar repo dan catat titik pemulihan Time Travel.
3. Periksa skema produksi sebelum menerapkan SQL. Deploy Worker tidak otomatis menjalankan migrasi.
4. Terapkan hanya migrasi yang diperlukan setelah diizinkan.
5. Deploy frontend dan Worker dengan `npm run deploy`.
6. Periksa health, aset, dan skema secara baca-saja. Jangan memakai data nyata untuk tes tulis.

Instruksi khusus perbaikan DB tersedia di [database-safety.md](docs/database-safety.md). Commit, push, migrasi dan deploy terpisah. Push ke branch utama dapat memicu build APK; keberhasilan push tidak menjamin build APK berhasil.

Rahasia Resend disimpan melalui Wrangler secret, bukan `wrangler.toml` atau Git. Jangan commit dump DB, token, cookie, hash autentikasi, dan backup pengguna.

## Pemecahan masalah

| Gejala | Langkah aman |
|---|---|
| Tampilan/tombol masih versi lama | Refresh paksa atau tutup-buka PWA; jangan langsung hapus penyimpanan |
| Buku keluarga gagal dimuat | Periksa internet dan sesi, kemudian muat ulang; jangan menyalin buku pribadi sebagai pengganti |
| Konflik revisi saat menyimpan | Muat data terbaru, periksa perubahan anggota lain, ulangi perubahan dengan sadar |
| CSV menumpuk satu kolom | Gunakan impor CSV dengan delimiter koma, atau pilih Excel `.xlsx` |
| File ekspor bukan buku yang diinginkan | Periksa sumber yang dipilih dan nama file; ekspor ulang dari sumber yang benar |
| Email pemulihan tidak masuk | Periksa spam, status verifikasi, konfigurasi/kuota provider; gunakan kode pemulihan bila sesuai |

Jangan membersihkan localStorage sebelum backup: arsip pribadi lokal dan gambar struk dapat hilang.
