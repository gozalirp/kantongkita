# LDPlayer Android9 — smoke QA25 Oktober2026

User mengizinkan ADB lokal diaktifkan dan emulator restart. Konfigurasi awal tersimpan `.tools/ldplayer-config-before-qa.json`; basicSettings.adbDebug0→1, root tetap false. LDPlayer9 index0, serial emulator-5554, Android9,720×1280/density320. Tidak uninstall atau clear data.

## Temuan dan fix
Startup awal gagal menampilkan buku: `Ledger cannot be cast to java.lang.AutoCloseable`. SQLiteOpenHelper di Android9 belum implement AutoCloseable seperti API modern; Kotlin `.use` menyebabkan cast runtime. `BookStore.importLegacy` kini menggunakan try/finally close eksplisit. Unit/Robolectric35+assemble+lint lulus ulang `.tools/emulator-qa-build.log`; tes Android9 ulang menunjukkan buku terbuka tanpa error.

## Uji yang benar-benar dilakukan
- Update install `adb install -r` sukses, data lama tidak dihapus.
- Dashboard tampil saldo Rp0, daftar/menu terbuka.
- Menu→Akun: form username/password, daftar/recovery dan cek sesi tampil.
- Klik cek sesi tanpa login: HTTPS live GET/me menghasilkan `Silakan login`, tidak crash. Tidak memakai kredensial atau membuat akun produksi.
- Form transaksi: tambah expense catatan `QA-EMULATOR` nominal10000; saldo jadi Rp-10.000, expense Rp10.000.
- Force-stop/start: transaksi tetap muncul di riwayat (screenshot XML `.tools/emulator-persisted.xml`). Ini cold restart durability, BUKAN recovery draft belum tersimpan.
- Hapus hanya transaksi test QA-EMULATOR lewat dialog konfirmasi: saldo kembali Rp0. Tidak menghapus catatan user lainnya.
- Bukti screenshots/XML `.tools/emulator-{home,account,fixed-home}.png` dan `.tools/emulator-*.xml`.

## Belum dibuktikan
Login sukses/Keystore persistent account, daftar/recovery/invite/link E2E tidak dijalankan karena belum ada staging/demo account. Sync cloud, outbox, receipts, exports dan parity lainnya belum tersedia. Tidak mengklaim ini pengganti QA seluruh22 fitur, physical device, TalkBack, font200%, Android26 dan36. Tidak menerbitkan APK final.

Catatan automation: satu dump uiautomator timeout idle saat keyboard; state sesudahnya diperiksa ulang dari dump baru dan saldo/list, bukan menganggap timeout sebagai pass. ADB lokal tetap aktif sesuai izin; backup config tersedia jika ingin dinonaktifkan kembali.
