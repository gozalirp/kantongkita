# Dokumentasi KantongKita

- [Panduan aplikasi, arsitektur, pengembangan, dan deployment](panduan.md)
- [Infrastruktur: komponen, hosting, konfigurasi dan batas keamanan](infrastruktur.md)
- [Alur aplikasi: akun, transaksi, sinkronisasi dan backup](alur-aplikasi.md)
- [Runbook operasional: deploy, rollback, pemulihan dan gangguan](operasional.md)
- [Database dan akun](database.md)
- [Keamanan database, backup, migrasi, dan retensi](database-safety.md)
- [Konfigurasi email](email-setup.md)
- [Sistem desain](design-system.md)

Status rilis terbaru dan hasil pengujian: [README proyek](rilis-v54.md).

Salinan bersih tidak memuat dependensi, riwayat Git, rahasia, atau database pengguna. Jalankan `npm install` untuk memasang dependensi. Autentikasi Cloudflare dan secret email harus disiapkan terpisah; lihat panduan. ZIP source bukan backup data keuangan dan bukan salinan lengkap riwayat Git.

- [Catatan rilis v54 dan bukti deployment](rilis-v54.md)

## Rebrand KantongKita

Nama produk, repo GitHub, ekspor baru, dan APK memakai **KantongKita**. Format backup baru `kantongkita` versi 1; restore tetap menerima backup `savingduit` versi 1 dengan validasi sumber buku yang sama.

Identifier teknis berikut sengaja dipertahankan agar data, sesi, instalasi, dan tautan pengguna lama tidak terputus:
- URL produksi `moneyplanner.darmintompel.my.id`, origin email dan Worker `savingduit.gozalirp.workers.dev`.
- Nama resource Cloudflare Worker `savingduit`, D1 `savingduit-db`, serta UUID database.
- Kunci localStorage `savingduit.*`, berkas data server dev `savingduit-cloud.json`, dan nama berkas integrasi Drive lama yang masih dikunci.
- Android application ID `com.savingduit.app`: mengubahnya membuat aplikasi lain, bukan pembaruan instalasi lama.
- Riwayat commit/versi rilis lama tetap asli; tidak rewrite history.

Perubahan domain, resource, atau application ID membutuhkan rencana migrasi tersendiri; bukan penggantian teks biasa.

## Urutan baca untuk serah-terima

Mulai dari infrastruktur → alur aplikasi → panduan lokal → database/email → runbook operasional. Diagram Mermaid dirender otomatis di GitHub; di pembaca Markdown tanpa Mermaid blok diagram tetap tersedia sebagai teks. Ketiga dokumen teknis baru mencakup kondisi aktual dan batas validasi, bukan klaim semua rekomendasi sudah diterapkan.

## Versi PDF

[Dokumentasi lengkap v54 (PDF)](KantongKita-Dokumentasi-v54.pdf) menggabungkan README dan10 dokumen inti di indeks ini (termasuk indeks dan rilis). Lima diagram Mermaid dirender. PDF snapshot23Oktober2026; Markdown adalah sumber utama untuk pembaruan berikutnya. Tidak berisi data pengguna.
