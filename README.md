# KantongKita

Aplikasi pencatat keuangan pribadi dan keluarga, dengan antarmuka responsif, penyimpanan lokal, dan sinkronisasi terautentikasi ke Cloudflare D1.

**Aplikasi:** https://moneyplanner.darmintompel.my.id
**Alamat Worker:** https://savingduit.gozalirp.workers.dev

## Dokumentasi

| Panduan | Isi |
|---|---|
| [Panduan lengkap](docs/panduan.md) | Penggunaan, arsitektur, pengembangan, dan deployment |
| [Database dan akun](docs/database.md) | Daftar tabel, relasi, cara melihat akun dengan aman |
| [Keamanan penyimpanan](docs/database-safety.md) | Konflik revisi, migrasi indeks, retensi, dan penerapan produksi |
| [Email dan pemulihan](docs/email-setup.md) | Konfigurasi Resend dan pengujian pemulihan akun |
| [Sistem desain](docs/design-system.md) | Identitas visual dan aturan komponen |

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

Lihat [penyiapan D1 lokal](docs/panduan.md#pengembangan-lokal) sebelum menguji akun. Jangan memakai database produksi untuk fixture pengujian.

## Status perubahan database

Perbaikan keamanan simpan, migrasi `0005_database_indexes.sql`, dan cron retensi sudah ada di kode. **Sudah diterapkan ke produksi pada 23 Oktober 2026**, termasuk UI neobrutal, migrasi 0005, Worker save atomik, dan cron retensi. Ikuti [panduan penerapan](docs/database-safety.md), bukan sekadar menganggap commit sudah live.

Commit, push, migrasi, dan deploy merupakan tindakan terpisah. Jangan menyimpan rahasia, dump DB, atau data akun ke Git.

## Riwayat rilis chart — 23 Oktober 2026

Chart **30 Hari** memakai dua garis solid, tanpa area bertumpuk atau garis putus-putus. Detail per tanggal tersedia melalui hover, sentuh, dan keyboard; tabel nominal tetap tersedia. Chart 6/12 bulan dan donut tidak berubah.

- Worker: `b6cca5a1-50fd-4b9f-a30b-03067484eb9a`; service worker: `savingduit-v48`.
- Aset CSS/views/SW live sesuai byte lokal; health 200.
- Pengujian lokal: DOM 366, browser 152, responsif 449 lolos; belum pemeriksaan HP fisik.
- Semua panduan proyek terpusat di [docs](docs/README.md). README ini tetap menjadi pintu masuk repo.

## Rebrand KantongKita — 23 Oktober 2026

Branding aplikasi, PWA, email, ekspor, dan APK memakai **KantongKita**. Repo: https://github.com/gozalirp/kantongkita.

Worker live: `03ef9e32-4824-4001-841b-73bde5799067`, SW `kantongkita-v49`. Delapan aset utama terverifikasi sesuai lokal; health 200. Seluruh suite npm, DOM 366, browser 152 dan responsif 449 lolos. Backup lama tetap bisa diimpor; format asing ditolak.

Alamat aplikasi, identifier penyimpanan/database, dan Android application ID lama dipertahankan untuk kompatibilitas; lihat [catatan rebrand](docs/README.md#rebrand-kantongkita). Nama aplikasi di PWA yang sudah terpasang mungkin memerlukan pembaruan browser atau pemasangan ulang setelah memastikan data tersinkron/terbackup.

## Pembaruan ikon uang hijau — 23 Oktober 2026

- Logo dan semua ikon SVG uang/dompet bawaan memakai hijau tua `#166534` dan hijau muda `#86EFAC`; ikon koin PWA juga hijau.
- Warna utama oranye, chart, dan emoji kategori/dompet pilihan pengguna tidak berubah. Tidak ada perubahan data, API, atau migrasi database.
- Service worker lokal: `kantongkita-v50`. **Sudah deploy**, Worker `afa976b3-a9b1-4c8d-940f-5be11096672c` / SW v50. Kelima aset berubah identik byte dengan source; health 200.
- Validasi: `npm test` lolos (DOM 366); browser 152 dan responsif 457 lolos, termasuk warna stroke/fill logo. Ikon PWA pada HP terpasang belum diperiksa.
- Detail visual: [sistem desain](docs/design-system.md#ikon-uang-hijau--23-oktober-2026). Salinan/ZIP drive E diperbarui ke v50 beserta dokumentasi infrastruktur/alur/operasional; upload Drive masih terblokir konflik ekstensi browser.

## Dokumentasi teknis dan serah-terima

- [Infrastruktur](docs/infrastruktur.md): hosting, domain, Worker/D1, Resend, cron, APK, trust boundary dan konfigurasi.
- [Alur aplikasi](docs/alur-aplikasi.md): diagram login, transaksi, simpan revision-safe, pasangan, pemulihan dan ekspor/impor.
- [Operasional](docs/operasional.md): checklist rilis, backup/migrasi, rollback, gangguan dan batas pemulihan.

Dokumen tersedia pula di paket bersih `E:\KantongKita`. Paket E masih snapshot v50 dan tidak otomatis mengikuti source terbaru; manifest paket mencatat commit basis dan perubahan lokal.

## Responsif HP/tablet — riwayat v51

Kartu tablet 601–860px memakai dua kolom; modal menyesuaikan tinggi layar landscape dan input mobile 16px. QA lokal: npm test lolos, browser 152 dan responsif 1356 lolos pada 12 lebar serta 9 pasangan ukuran portrait/landscape. Detail dan batas verifikasi ada di [sistem desain](docs/design-system.md). Diterbitkan bersama v52; kini tercakup dalam v54.


## Rilis v54 — 23 Oktober 2026

**Sudah deploy**, Worker `51b18ad2-bcd4-4377-a08f-55c6075ff704`, SW `kantongkita-v54`. Enam aset identik byte; health200. Bukti dan batas verifikasi: [catatan rilis](docs/rilis-v54.md).

- Responsif HP/tablet dan modal transaksi mengikuti VisualViewport agar footer tetap terjangkau ketika keyboard muncul (v51–v52).
- Judul Statistik keuangan dan kontrol periode ditata dua baris sampai860px, mencegah teks tertimpa (v53).
- Label transaksi Kemarin/Hari ini/Besok dikoreksi tanpa mengubah data tanggal atau nominal (v54).
- npm test lolos: smoke317, DOM370; browser152 dan responsif3222 lolos. Smoke juga diuji6 zona waktu.
- Font produksi tetap Plus Jakarta Sans; Space Grotesk baru preview. Safari/iPhone fisik belum diverifikasi.
- Tidak ada migrasi DB, reset atau refresh paket E dalam rilis ini. Paket E tetap v50. Setelah deploy, source/tes/docs/PDF disiapkan dalam commit lokal; belum push.

## Dokumentasi PDF

Unduh [Dokumentasi lengkap KantongKita v54](docs/KantongKita-Dokumentasi-v54.pdf): gabungan README dan seluruh panduan inti, dengan diagram infrastruktur/alur yang dirender. PDF adalah snapshot 23 Oktober 2026; Markdown tetap sumber utama. Tidak memuat data buku atau rahasia.
