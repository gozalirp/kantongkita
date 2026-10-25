# Akun native — implementasi lokal, belum release

25 Oktober2026. Scope keseluruhan user tetap login/recovery/sesi, keluarga/buku, sync/outbox/conflict, struk/portabilitas/PIN/reports dan device QA. Dokumen ini tidak menyatakan scope keseluruhan selesai.

## Kode baru
- `AccountApi.kt`: HTTPS origin tetap, endpoint allowlist, session cookie per instance (bukan CookieHandler global), Origin header tetap, no redirect, timeout, bounded20MB response, no automatic POST retry, error401 clears session, errors do not accept cookies.
- `SecureSession.kt`: token64hex saja, AES-GCM Android Keystore, private preferences, synchronous persistence checks. Password/recovery tidak disimpan. allowBackup=false tetap. Kehilangan key menghapus ciphertext sesi; tidak menghapus keuangan.
- `AccountScreen.kt`: Menu→Akun dan keluarga. Login, daftar/email, recovery code, cek sesi tersimpan, anggota/role, invite/link/logout. IO network via Dispatchers.IO. Secrets in memory, not rememberSaveable. Tidak otomatis mengunggah buku lokal.
- Manifest INTERNET ditambahkan; cleartext tetap dilarang.

## Bukti
35 unit/Robolectric tests lulus termasuk5 client contract tests baru; assembleDebug/lintDebug sukses `.tools/account-build.log`. Transport diuji dengan injected fake response, BUKAN live authenticated E2E. Keystore perangkat belum diuji. Tidak memakai kredensial asli, tidak membuat akun produksi atau mengubah server. Tidak publish APK development sebagai final.

## Gap wajib
Pemilih buku cloud dan akses keuangan terisolasi belum dihubungkan. UI akun tidak otomatis membuka saldo cloud. Email verify/reset browser handoff dan email config validation/error details belum lengkap; account login me failure recovery UX, lifecycle cancellation/redaction/screenshot handling perlu hardening. Undangan belum seluruh konfirmasi migrasi family diuji. Metadata unknown masih hilang jika memakai BookJson model roundtrip; raw cloud store wajib sebelum sync. Tidak ada transport outbox/retry integration. Data lokal lama tidak otomatis diupload.

`adb devices` kosong; emulator package belum terpasang. Ini blocker device QA, bukan blocker coding. Seluruh fitur lainnya tetap pending, tidak tandai final.
