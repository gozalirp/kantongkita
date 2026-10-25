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

Status push, Worker version baru, health dan hash aset dicatat setelah deploy. Pengujian login/tulis produksi bukan bagian smoke check; acceptance native penuh masih terbuka.
