# Dokumentasi KantongKita

- [Panduan aplikasi, arsitektur, pengembangan, dan deployment](panduan.md)
- [Database dan akun](database.md)
- [Keamanan database, backup, migrasi, dan retensi](database-safety.md)
- [Konfigurasi email](email-setup.md)
- [Sistem desain](design-system.md)

Status rilis terbaru dan hasil pengujian: [README proyek](../README.md#pembaruan-ikon-uang-hijau--23-oktober-2026).

Salinan bersih tidak memuat dependensi, riwayat Git, rahasia, atau database pengguna. Jalankan `npm install` untuk memasang dependensi. Autentikasi Cloudflare dan secret email harus disiapkan terpisah; lihat panduan. ZIP source bukan backup data keuangan dan bukan salinan lengkap riwayat Git.

## Rebrand KantongKita

Nama produk, repo GitHub, ekspor baru, dan APK memakai **KantongKita**. Format backup baru `kantongkita` versi 1; restore tetap menerima backup `savingduit` versi 1 dengan validasi sumber buku yang sama.

Identifier teknis berikut sengaja dipertahankan agar data, sesi, instalasi, dan tautan pengguna lama tidak terputus:
- URL produksi `moneyplanner.darmintompel.my.id`, origin email dan Worker `savingduit.gozalirp.workers.dev`.
- Nama resource Cloudflare Worker `savingduit`, D1 `savingduit-db`, serta UUID database.
- Kunci localStorage `savingduit.*`, berkas data server dev `savingduit-cloud.json`, dan nama berkas integrasi Drive lama yang masih dikunci.
- Android application ID `com.savingduit.app`: mengubahnya membuat aplikasi lain, bukan pembaruan instalasi lama.
- Riwayat commit/versi rilis lama tetap asli; tidak rewrite history.

Perubahan domain, resource, atau application ID membutuhkan rencana migrasi tersendiri; bukan penggantian teks biasa.
