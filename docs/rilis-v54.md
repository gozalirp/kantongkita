# Rilis v54 — 23 Oktober 2026

## Status

**Sudah deploy** ke https://moneyplanner.darmintompel.my.id pada23Oktober2026.

- Worker aktif: `51b18ad2-bcd4-4377-a08f-55c6075ff704`.
- Service worker: `kantongkita-v54`.
- Enam aset live (`sw.js`, `css/style.css`, `js/util.js`, `js/views.js`, `index.html`, `akun-email.html`) HTTP200 dan identik byte dengan source lokal.
- `/api/health`200; `/api/family/me` tanpa sesi401 sesuai harapan. Ini pemeriksaan read-only, bukan validasi login dua akun atau simpan buku.
- Versi sebelumnya v52: `83526cce-4dfa-4dfc-b776-d3eafeb6bfb4`.
- Binding D1, domain dan cron tetap; tidak ada migrasi atau tulis data finansial.

## Isi

Responsif v51, modal VisualViewport v52, judul statistik tidak tertimpa kontrol v53, dan koreksi arah selisih label tanggal transaksi v54. Service worker `kantongkita-v54`. Font tetap Plus Jakarta Sans; Space Grotesk hanya preview dan tidak disertakan. Tidak ada perubahan API/skema/cron/identifier/domain atau penulisan buku produksi.

## Pengujian

`npm test` lolos (smoke317, DOM370); `npm run test:browser` lolos (browser152, responsif3222). Regresi mencakup11 halaman,12 lebar320–1440px,7 formulir, label/kontrol overlap, heading24px, navigasi dan viewport keyboard simulasi. Label tanggal teruji48 kasus unit serta integrasi daftar lintas tahun dan tidak memutasi data. Smoke lolos di Asia/Jakarta, Asia/Makassar, Asia/Jayapura, UTC, America/New_York dan Pacific/Auckland.

Ini tidak membuktikan Safari/iPhone fisik, seluruh kombinasi data, email nyata, visual Excel, concurrency produksi, restore D1 atau cron pertama.

## Distribusi dan pemulihan

Deployment dilakukan dari working tree berbasis `ed36199`; setelah deployment, source/tes/docs/PDF disiapkan dalam commit lokal atas permintaan pengguna. Push belum dilakukan. ZIP/salinan E tetap v50, upload Drive tetap terblokir; tidak disinkronkan otomatis. Build APK tidak diverifikasi. Untuk pembaruan PWA, tutup/buka atau reload; jangan hapus data situs.

Rollback kode terpisah dari DB dan membutuhkan persetujuan; versi sebelumnya v52 tercatat di atas. Tidak perlu migrasi maupun restore database untuk rollback perubahan UI ini. Lihat [runbook](operasional.md).
