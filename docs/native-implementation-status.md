# Status implementasi native — 25 Oktober 2026

User mengotorisasi implementasi Kotlin + Jetpack Compose penuh, bukan mockup/website wrapper. Target tetap P01–P22 pada native-web-parity-plan.md. **Belum selesai dan belum siap disebut APK parity.**

## Sudah masuk kode native
- `Book.kt`: model enam koleksi sesuai kontrak web, validasi referensi/uang/tanggal, saldo/transfer, transaksi CRUD, aturan goal independen saldo, pembayaran langganan membuat expense dan undo.
- `BookJson.kt`: payload allowlist enam koleksi, rupiah integer, budget memakai `limit/period/note` seperti web.
- `BookStore.kt`: SQLite scoped account/book, generation compare-and-swap, draft/base/remote conflict persisten. Buku combined dilarang disimpan. Migrasi preview lama satu kali hanya ke device-local; tabel/database lama tidak dihapus atau otomatis ditempelkan akun cloud.
- Compose: nav Beranda/Transaksi/+/Rekap/Menu; transaksi edit/delete/transfer; form dompet/kategori/anggaran/target/langganan, arsip/referensi, setor/tarik, bayar/batal tagihan. Sora lokal berlisensi, format nominal bertitik, kalender Indonesia, donut palette web.
- Tidak ada WebView/TWA atau runtime JavaScript di native.

## Rekonsiliasi tambahan (belum tersambung transport/UI)
- `BookReconciliation.kt` menggabungkan snapshot base/local/remote per ID dan field, mempertahankan metadata JSON unknown.
- Perubahan independen dapat digabung; edit/edit, edit/hapus dan benturan ID baru menghasilkan daftar konflik tanpa payload untuk dikirim.
- Delapan regression test tambahan lulus (total22). QA lanjutan kini memvalidasi hasil dengan BookJson/Book.validate: hapus dompet vs transaksi baru atau perubahan tipe kategori yang merusak referensi menghasilkan `merged=null` dan `/validation`. Belum transport, outbox atau UI resolusi; bukan bukti internet sync.

## Bukti saat ini
- Gradle8.13/JDK17/SDK36: `:app:testDebugUnitTest :app:assembleDebug :app:lintDebug` PASS.
- 14 unit/Robolectric tests: finance semantics, invalid input/reference, JSON roundtrip, revision conflicts, in-flight edits, legacy migration once, account isolation, persistence reopen, stale generation rejection.
- `npm test` full PASS setelah mendeklarasikan jsdom+lockfile.
- `tests/personal-sync-conflict.cjs` PASS:409 tidak lagi diikuti GET yang menaikkan base revision draft lama dalam sesi yang sama. Patch web lokal belum deployed; belum solusi durable lintas reload.
- `adb devices`: tidak ada perangkat terhubung. Robolectric bukan pengganti tes UI/emulator/HP.

## Belum selesai (wajib, bukan dikeluarkan dari scope)
- Native HTTPS, INTERNET permission, secure auth/cookie/session, email/recovery, profile/PIN/avatar, family/invite/permissions dan pilihan buku.
- Durable transport/outbox/retry/401/409 reconciliation end-to-end, termasuk konflik setelah restart dan edit bersamaan.
- Full reports/filter/date/due engine, budget usage, subscription due summaries, actual web iconography, neobrutalism shadow/pressed/polish dan font weight calibration.
- Receipts/files/export/restore/settings/backup dan aksesibilitas/performance/process death di perangkat.
- Retensi unknown web metadata (`by`, receipts/profile/settings) belum lengkap; jangan hubungkan serializer ke cloud produksi sebelum audit field-loss selesai.
- Penanganan konflik web keluarga saat ini masih memuat ulang server setelah409 dan dapat membuang draft; wajib diperbaiki. Personal lock patch belum melindungi reload dan belum UI resolusi.
- Local UI database access masih sinkron; perlu IO dispatcher dan draft process-death recovery sebelum release.

## Toolchain lokal
- Java: `C:/Users/Administrator/Documents/Project/cleanyourtv/work/toolchain/java/jdk-17.0.20.1+1`
- SDK: `C:/Users/Administrator/Documents/Project/cleanyourtv/work/toolchain/android-sdk`
- Gradle: `.tools/gradle-8.13/bin/gradle.bat` (`.tools` ignored)
- Build logs `.tools/*build.log`, latest `.tools/persistence-tests.log`.

Belum ada deploy, migrasi cloud, akses akun asli atau penulisan data produksi. APK build development bukan aplikasi final yang diminta user; jangan kabarkan selesai sebelum seluruh gate terpenuhi.
