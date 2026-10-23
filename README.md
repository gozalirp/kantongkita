# SavingDuit

Aplikasi pencatat keuangan pribadi dan keluarga, dengan antarmuka responsif, penyimpanan lokal, dan sinkronisasi terautentikasi ke Cloudflare D1.

**Aplikasi:** https://moneyplanner.darmintompel.my.id
**Alamat Worker:** https://savingduit.gozalirp.workers.dev

## Dokumentasi

| Panduan | Isi |
|---|---|
| [Panduan lengkap](DOKUMENTASI.md) | Penggunaan, arsitektur, pengembangan, dan deployment |
| [Database dan akun](docs/database.md) | Daftar tabel, relasi, cara melihat akun dengan aman |
| [Keamanan penyimpanan](docs/database-safety.md) | Konflik revisi, migrasi indeks, retensi, dan penerapan produksi |
| [Email dan pemulihan](EMAIL_SETUP.md) | Konfigurasi Resend dan pengujian pemulihan akun |
| [Sistem desain](design-system/savingduit/MASTER.md) | Identitas visual dan aturan komponen |

## Fitur

- Transaksi pemasukan, pengeluaran, transfer, dompet, kategori, anggaran, target tabungan, dan langganan.
- Profil lokal dengan PIN; akun server memakai autentikasi tersendiri. PIN bukan pengganti password akun.
- Buku pribadi terpisah dari buku keluarga. Membagikan riwayat pribadi memerlukan pilihan eksplisit.
- Ekspor **Excel (.xlsx)** bertabel, **CSV** untuk pengolahan data, dan **JSON** untuk backup/pemulihan; sumber buku dipilih sebelum unduh.
- PWA yang dapat dipasang melalui browser. Koneksi internet diperlukan untuk autentikasi dan akses buku server.
- Integrasi Google Drive **sedang dikunci**, bukan opsi backup aktif.

## Perintah

```bash
npm start                # server Node lama, localhost:8765; bukan pengujian login produksi
npm run dev              # Worker dan D1 lokal; siapkan skema terlebih dahulu
npm test                 # unit, DOM, SQLite lokal, dan keamanan
npm run test:browser     # pengujian browser dan responsif
npm run deploy           # menerbitkan frontend + Worker; bukan migrasi D1
```

Lihat [penyiapan D1 lokal](DOKUMENTASI.md#pengembangan-lokal) sebelum menguji akun. Jangan memakai database produksi untuk fixture pengujian.

## Status perubahan database

Perbaikan keamanan simpan, migrasi `0005_database_indexes.sql`, dan cron retensi sudah ada di kode. **Pada pembaruan dokumen ini, migrasi 0005 dan Worker dengan perbaikan tersebut belum diterapkan ke produksi.** Ikuti [panduan penerapan](docs/database-safety.md), bukan sekadar menganggap commit sudah live.

Commit, push, migrasi, dan deploy merupakan tindakan terpisah. Jangan menyimpan rahasia, dump DB, atau data akun ke Git.
