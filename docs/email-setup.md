# Email dan pemulihan akun KantongKita

[← Panduan aplikasi](panduan.md) · [Struktur database](database.md)

Provider: Resend (Free). Pengirim: `KantongKita <akun@mail.darmintompel.my.id>`.
Origin tautan selalu `https://moneyplanner.darmintompel.my.id`.

## Konfigurasi produksi

Langkah ini untuk penyiapan atau pemeriksaan konfigurasi, bukan perintah yang harus diulang pada sistem yang sudah aktif. Periksa skema dan konfigurasi lebih dahulu; buat backup privat sebelum menerapkan migrasi. Jangan merotasi secret atau mengirim email uji tanpa izin.

### Langkah penyiapan
1. Verifikasi domain `mail.darmintompel.my.id` di Resend; DNS DKIM dan kedua CNAME harus verified / DNS only. Receiving tidak diperlukan.
2. Buat API key Resend dengan Sending access terbatas domain tersebut. Jangan tempel key ke chat atau source code.
3. Dari folder proyek: `npx wrangler secret put RESEND_API_KEY`, tempel key di prompt rahasia.
4. Terapkan tabel baru (tidak menghapus data): `npx wrangler d1 execute savingduit-db --remote --file worker/migrations/0004_account_email.sql`.
5. Deploy: `npx wrangler deploy`.
6. Periksa `/api/family/email/config` menghasilkan `enabled: true`. Uji inbox dengan akun uji atas izin pemilik alamat, verifikasi email, request reset, tautan satu kali, login baru, dan logout.

## Perilaku
- Saat provider belum dikonfigurasi, pendaftaran lama dan kode pemulihan tetap tersedia. Field email tidak ditampilkan.
- Setelah aktif, akun baru (termasuk undangan) wajib email unik dan harus verifikasi sebelum reset lewat email.
- Akun lama tanpa email tetap memakai kode pemulihan; penambahan/penggantian email akun lama belum disediakan.
- Verifikasi berlaku 24 jam; reset 30 menit; token disimpan sebagai SHA-256 dan dikonsumsi atomik satu kali.
- Reset menutup semua sesi akun. Pemulihan lewat kode juga membatalkan tautan email yang masih aktif.
- Menu → Status / verifikasi email mengirim ulang verifikasi untuk email belum terverifikasi.
- Keluar akun menutup sesi server tanpa menghapus localStorage/keuangan di perangkat. Perlu internet; jika gagal, sesi tidak diklaim sudah keluar.
- Penerimaan email tergantung status sender, kuota Resend, dan filter spam. Jangan hanya mengandalkan email: simpan kode pemulihan.

## Uji lokal
`node tests/account-email.mjs` memakai SQLite memory dan mock Resend; tidak mengirim email atau membuat akun produksi.
