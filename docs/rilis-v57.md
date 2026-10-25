# Rilis v57 — web conflict guard dan source native preview

## Cakupan

- Cadangkan source Kotlin/Compose native, tes dan dokumentasi ke GitHub. Tambahkan workflow build native debug terpisah; bukan rilis Android final.
- Web personal sync: tahan save ulang setelah 409 dan jangan mengesahkan draft lama melalui diagnostic GET. Tes regresi tersedia.
- Perbaikan tinggi halaman profil pada HP 320px sesudah font Sora, tanpa mengecilkan area sentuh.
- Service-worker cache v57; tambah Digital Asset Links TWA yang disiapkan sebelumnya. Ini bukan verifikasi App Links native.
- Draft account-profiles API default nonaktif (`ACCOUNT_PROFILES_ENABLED=false`). Source migrasi 0006 disimpan, **tidak dijalankan**.
- Koreksi klaim paritas penuh pada [status native](native-parity-complete.md). P01–P22 tetap mengacu acceptance asli.

## Uji sebelum publikasi

- `npm ci` dan `npm test` pada clone publikasi lulus, termasuk tes konflik dan gate draft profiles.
- Browser 152 checks lulus; responsif 3.222 checks lulus setelah perbaikan profil 320px.
- Native clone: testDebugUnitTest + assembleDebug + lintDebug berhasil; 66 tests pada 15 suite.
- Pemeriksaan path staged dan pola secret umum lulus; tidak memasukkan DB finansial, credential, APK, build output atau `.tools`.

## Operasional

Sebelum deploy, versi aktif terakhir yang terlihat: `9f7f189d-8dce-4075-ae65-0167f834c647`. Rollback kode melalui Wrangler rollback bukan restore data. Tidak ada migrasi, reset D1, secret rotation atau transaksi produksi yang diizinkan/dilakukan oleh rilis ini.

## Hasil publikasi

- Source dipush ke `gozalirp/kantongkita`, branch `main`, commit `aaeca3b248dcbeef4a1a51d1dc6816223caed330`.
- Worker version: `af5f80f0-df27-4518-9864-aff939033725`.
- URL: https://moneyplanner.darmintompel.my.id — cache SW v57.
- Enam aset identik byte dengan clone publikasi: `sw.js`, `js/keluarga-mode.js`, `css/style.css`, `.well-known/assetlinks.json`, `index.html`, `fonts/Sora-Variable.ttf`.
- GET `/api/health` 200; tanpa cookie `/api/family/me` dan `/api/family/profiles` 401. Ini memeriksa health dan gerbang sesi, bukan kesehatan seluruh database atau fungsi profil berautentikasi.
- Konfigurasi deploy mengonfirmasi `ACCOUNT_PROFILES_ENABLED=false`. Tidak menjalankan migrasi 0006, D1 write/restore/reset maupun login/transaksi produksi.
- Python HTTP client sempat ditolak 403; verifikasi diulang lewat Node fetch dan curl standar, tanpa mengubah proteksi server.

Pengujian login/tulis produksi bukan bagian smoke check; acceptance native penuh masih terbuka. Keberhasilan build lokal bukan bukti GitHub Actions selesai.
