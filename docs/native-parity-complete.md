# Status implementasi native — koreksi klaim selesai

Dokumen ini menggantikan laporan sebelumnya yang keliru menyatakan seluruh P01–P22 selesai dan terverifikasi penuh. Nomor acceptance tetap mengikuti [matriks asli](native-web-parity-plan.md), bukan penomoran ulang dalam laporan lama.

## Bukti yang tersedia

- Build lokal `testDebugUnitTest`, `assembleDebug`, `lintDebug` berhasil pada increment terakhir.
- 66 pengujian pada 15 kelas/suite, bukan 67 suite. Hasil terhitung dari XML laporan Gradle. Ini tidak membuktikan parity seluruh alur.
- APK debug native terpasang menggunakan `adb install -r` di emulator Android 9, tanpa uninstall/clear data.
- Navigasi pengaturan, batal reset, layar rekap, filter riwayat, dan layar struk diuji. Uji navigasi ini bukan verifikasi seluruh chart/CRUD.
- Aktivasi PIN, salah PIN, buka PIN benar, dan kunci setelah background diuji. PIN QA telah dihapus kembali.
- Snapshot finansial perangkat setelah QA sama dengan baseline. Tidak dilakukan transaksi finansial produksi.

## Implementasi tersedia, acceptance masih terbuka

| Acceptance asli | Implementasi dan batas |
|---|---|
| P01–P02 akun/recovery | Client API, sesi terlindungi, recovery/email UI dan tes kontrak lokal tersedia. Login/recovery/email nyata belum E2E dengan staging. |
| P03–P05 dashboard/riwayat/transaksi | Perhitungan, filter, transaksi dan chart native tersedia; kesetaraan penuh lintas perangkat, pelaku transaksi dan semua golden fixture belum disahkan. |
| P06 struk | Penyimpanan privat dan SAF tersedia; round-trip file nyata, kamera dan seluruh edge case belum tervalidasi penuh. |
| P07–P13 dompet/kategori/rekap/anggaran/target/langganan | Model, editor dan tes lokal tersedia. Cloud menggunakan editor entitas terpisah; semua alur pembayaran/batal langganan dan integrasi cloud belum disahkan E2E. |
| P14 profil/PIN | Profil lokal, PBKDF2, cooldown, kunci background dan FLAG_SECURE tersedia. Bukan enkripsi database dan bukan biometrik. |
| P15 keluarga | Akun/undangan client tersedia; role, expiry, perpindahan keluarga dan dua akun belum diuji staging. |
| P16–P17 pemilih buku/gabungan/bagikan | Cloud pribadi/keluarga, gabungan cache hanya baca dan salin dompet terpilih tersedia. Navigasi terpadu serta perilaku paired mode web belum lengkap. |
| P18 sinkronisasi | Outbox SQLite, manual retry, pemeriksaan revisi, konflik dan cache sesi 24 jam tersedia. Retry/backoff otomatis dan E2E web↔native dua klien belum selesai. |
| P19–P20 ekspor/restore | JSON/CSV/XLSX dan undo lokal tersedia; pilihan sumber cloud/family, kompatibilitas seluruh format web/legacy dan restore keluarga revision-safe belum lengkap. |
| P21–P22 pengaturan | Reset perangkat dengan konfirmasi dan undo serta indikator Drive nonaktif tersedia. QA reset hanya buka/batal, tidak mengklaim reset destruktif diuji di perangkat. |

## Gerbang rilis yang belum terpenuhi

- Akun staging aman untuk pengujian tulis, dua akun/perangkat, 401/403/409/429/5xx serta logout/switch account dengan draft.
- Sinkronisasi internet nyata lintas web/native, retry otomatis dan integrasi semua layar cloud.
- Parity sumber ekspor/restore, seluruh aturan langganan, permissions dan reference fixtures.
- QA HP fisik, Android terbaru, TalkBack, font 200%, process death dan Doze seluruh fitur.
- Signing/release final dan keputusan migrasi dari TWA.

GitHub menyimpan source pengembangan ini; deploy Cloudflare hanya memperbarui Worker dan `public/`, bukan memasang APK native. Tidak ada izin migrasi/reset D1 yang tersirat dalam deploy.
