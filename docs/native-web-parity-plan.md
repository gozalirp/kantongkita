# Smart Savings Native Android — parity dengan web

25 Oktober 2026 · **Rencana untuk persetujuan desain, belum implementasi parity**.
Keputusan pemilik: Android dulu, UI Kotlin + Jetpack Compose, Smart Savings, **fitur setara web sebagai target akhir**. Dokumen ini menggantikan batas MVP pada `native-android-plan.md`; prinsip keamanan dan isolasi preview di sana tetap berlaku. Tidak menjanjikan tanggal rilis.

Mockup lengkap: [buka Smart Savings parity](native-parity/index.html). Mockup = demonstrasi UX, bukan APK, autentikasi, cloud atau backup produksi.

## Baseline audit

Source yang diperiksa: `public/js/views.js` (gerbang, form transaksi, pengaturan, target, langganan), `public/js/buku-gabungan.js` (mode buku, provenance, revisi), `docs/alur-aplikasi.md` (auth, undangan, ekspor dan API), `docs/database-safety.md`, `docs/design-system.md`, serta preview `android-native/`. Baseline adalah folder kerja lokal, bukan verifikasi semua fitur deploy terbaru. Catatan lama di layar pengaturan menyebut fitur tahap berikutnya padahal implementasinya ada: kode dan tes menjadi acuan, bukan copy pemasaran lama.

## Matriks kesetaraan / acceptance

Semua baris berikut **wajib untuk parity rilis akhir**, bukan wishlist. Pada APK saat ini hanya dashboard, daftar, tambah/hapus dan SQLite sederhana tersedia; tidak satu baris pun dianggap selesai penuh.

| ID | Fitur web / detail wajib | Layar mockup | Bukti penerimaan native nanti |
|---|---|---|---|
| P01 | Gerbang login, daftar, username/password, email sesuai config | Akun → login/daftar | Tidak menampilkan saldo sebelum sesi sah; password manager/paste; rate limit & error diuji |
| P02 | Recovery code sekali tampil, recover, email status/resend/verify/reset | Akun → pemulihan/email | Masa berlaku, token sekali pakai, sesi dicabut setelah reset; tautan dibuka aman; kode tak di-log |
| P03 | Dashboard saldo, range, tren 30 hari/6/12 bulan, komposisi, tabel angka | Beranda/statistik | Nilai/chart dibanding fixture web; tanggal kosong/skala nol; tabel aksesibel |
| P04 | Riwayat: tipe, tanggal/rentang, dompet, kategori, pencarian, pelaku sesuai mode buku | Riwayat/filter/detail | Filter kombinasi, urutan tanggal dan state back cocok; nominal panjang tidak tabrakan |
| P05 | Transaksi masuk/keluar/pindah dana, CRUD, catatan opsional, tanggal | Form/detail | Integer rupiah, referensi valid; transfer satu buku dua dompet; update/delete atomik; transfer bukan income/expense |
| P06 | Struk gambar/PDF pribadi, tampil/hapus; bukan upload keluarga | Form/detail struk | Batas ukuran/type nyata, SAF/Photo Picker, file privat; tidak berpura-pura struk ikut cloud bila tidak didukung |
| P07 | Dompet/bank: saldo awal, tipe, ikon, edit, arsip/hapus sesuai referensi | Dompet/detail/form | Saldo awal+ledger identik web; relasi transaksi tidak rusak saat arsip/hapus |
| P08 | Kategori masuk/keluar, ikon, edit, arsip/hapus | Kategori/form | Kategori per buku dan tipe; historical reference aman |
| P09 | Rekap harian/bulanan/tahunan, kategori dan nilai detail | Rekap | Semua agregat dibanding golden fixtures web lintas TZ; tanggal transaksi tetap LocalDate |
| P10 | Anggaran kategori/periode, nilai terpakai/sisa/lebih, CRUD | Rencana/anggaran/form | Filter kategori/transfer/periode sama web; overbudget tidak dipotong diam-diam |
| P11 | Target: CRUD, deadline, saved, nabung/tarik | Target/detail/form | **Saved target hanya pencatat progres, tidak mengubah dompet** sesuai `V.goalAdd`; tarik tidak negatif |
| P12 | Langganan mingguan/bulanan/tahunan, aktif/nonaktif, jatuh tempo, total ekuivalen | Langganan/form | Formula & due-date sama helper web; tidak mengubah rule siklus tanpa keputusan produk |
| P13 | Tandai lunas/batalkan | Langganan/konfirmasi | Bayar membuat satu transaksi berpenanda periode; bayar ulang ditolak; batal menghapus transaksi penanda; hapus langganan tidak menghapus pembayaran lama |
| P14 | Profil perangkat, avatar/emoji, PIN, ganti/kunci/hapus | Profil/form/kunci | Metadata lokal dipisah akun cloud; PIN bukan password; avatar allowlist, migrasi tidak merusak profil |
| P15 | Akun, anggota, undang/link/join sesuai aturan owner/partner | Keluarga/undangan/gabung | Role di server, undangan 24 jam, error perpindahan buku ditangani; tidak menambah endpoint keluar/kick yang belum diverifikasi |
| P16 | Buku pribadi/keluarga, gabungan hanya presentasi sesuai kondisi web | Pemilih buku, penanda sumber | Paired mode web dapat memprioritaskan buku keluarga; mode persis diputuskan setelah contract tests. Tidak menyimpan/ekspor snapshot gabungan |
| P17 | Bagikan catatan lama dengan pilihan dompet | Keluarga → bagikan | Transfer butuh kedua dompet; salin transaksi/kategori terkait saja, asli tetap; target/budget/sub/struk tidak ikut; import ulang idempoten |
| P18 | Sinkron pribadi/keluarga, manual sync, offline/error/409/sesi habis | Status data → simulator | Revisi guard, draft terselamatkan, retry tanpa duplikasi, sesi/akun tidak tertukar; keluarga gagal tidak diganti data pribadi |
| P19 | Ekspor XLSX/CSV/JSON dengan sumber eksplisit | Backup/ekspor/pilih sumber | XLSX valid angka/tanggal; CSV formula injection aman; JSON kantongkita v1 & legacy savingduit v1; tidak bocor gabungan/akun |
| P20 | Restore JSON: tujuan, validasi, preview, penggantian | Backup → restore | Bukan merge; invalid tidak menulis; referensi/ID/source diperiksa; keluarga revision-safe, backup sebelum replace |
| P21 | Reset pribadi, informasi penyimpanan/skema | Pengaturan/reset | Konfirmasi eksplisit; tidak reset keluarga atau akun; unsynced draft dilindungi |
| P22 | Google Drive dinonaktifkan | Pengaturan | Ditampilkan dinonaktifkan, tidak menambah OAuth atau mengklaim sync Drive |

## Arsitektur implementasi minimum

Lanjut modul tunggal `android-native/app`; UI Compose + Navigation Compose, ViewModel/StateFlow, repository, SQLite/Room sesuai kompleksitas skema dan migrasi teruji. Jangan mulai dari ulang project, jangan bungkus HTML jadi WebView. HTML ini hanya spesifikasi visual.

Skema multi-buku perlu identitas `(accountId, bookId, entityId)` agar ID sama tidak tabrakan. Koleksi wallet/category/transaction/budget/goal/subscription/receipt dipisahkan, dengan foreign keys dan mutasi atomik. Metadata profil perangkat tidak disamakan dengan akun. Migrasi preview DB v1 diuji menjaga catatan; identity preview tetap `com.savingduit.app.nativepreview` sampai keputusan migrasi produksi disetujui.

Nominal Long rupiah utuh, validasi batas+overflow pada item dan agregat; bukan Float. Golden fixture mengikat definisi saldo awal, transfer, target yang tidak memotong dompet, langganan berpenanda periode, carry/rounding dan tanggal sesuai helper web. Jangan 'memperbaiki' aturan bisnis saat porting tanpa keputusan terpisah.

## API dan auth: jangan berasumsi native langsung cocok

API sekarang berbasis cookie sesi (login 7 hari), bukan OAuth/refresh-token API. Audit handler aktif `worker/family.mjs` sebelum client network: Origin/CSRF checks, cookie jar, redirect, timeout/error, rate limit dan expiry. Rancang transport Android aman bersama contract tests; **jangan menghapus Origin/CSRF server supaya native bisa masuk**, jangan menyisipkan secret service di APK. Jika perubahan backend diperlukan, spesifikasi + persetujuan deploy terpisah.

Endpoint dasar `/api/family/`: activate/join/login/recover; me/logout/invite/link; data/save; personal/data/personal/save; email/config/status/resend/request-reset/reset/verify. `/api/sync` legacy diblokir; `/transaction` ditutup 410. Draft account-profiles bukan kontrak produksi. Email token fragment perlu Android App Links terverifikasi atau browser handoff yang aman; tidak otomatis mengubah domain/assetlinks sekarang.

Lokal adalah sumber tampilan dan penyelamat draft, bukan bukti cloud tersimpan. Worker menerima buku lengkap+revision. `409`: simpan snapshot lokal dan basis revisi, muat versi remote, tampilkan perbedaan/rute recovery; tidak auto-increment revisi dan menimpa. Outbox persisten hanya diaktifkan setelah idempotensi full-book/retry dan aturan keluarga teruji. Tidak menambahkan auto-merge finansial dalam parity.

## Tahapan, dependensi, gerbang

1. **Desain & baseline (pekerjaan ini)**: matriks, mockup seluruh area, tanda simulasi. Pemilik review scope dan UX.
2. **Kontrak data & fondasi**: golden fixtures web, skema buku, migrasi v1, tema Smart Savings, navigasi & aksesibilitas. Gate: fixture saldo/transfer/TZ+migrasi lolos.
3. **Core offline parity**: transaksi lengkap/struk, dompet/kategori, filter, dashboard/rekap. Gate: seluruh CRUD & process death/rotasi/keyboard HP fisik aman.
4. **Perencanaan & portabilitas**: anggaran/target/langganan, profil/PIN/avatar, ekspor/restore/reset. Gate: P10–14/P19–22 lolos termasuk round-trip backup dan invalid import rollback.
5. **Akun pribadi**: audit native-auth, login/daftar/email/recovery, sesi secure, buku scoped, sinkron pribadi. Gate: staging 401/403/409/429/5xx, login account A→B dan logout unsynced tidak bocor/hilang.
6. **Keluarga & integrasi lintas perangkat**: undang/link/join, buku sumber, salin pilihan, sinkron revisi. Gate: web↔native, 2 akun/2 perangkat, role/expired invite, source/privacy dan retry lulus.
7. **Release candidate parity**: seluruh P01–P22 memiliki bukti lulus; TalkBack, font 200%, Android min+terbaru, HP kecil/tablet/landscape, Doze & offline. Signing release privat, Data Safety/privacy, backup policy dan rollback disetujui. Tidak menyebut setara web saat masih ada fitur wajib placeholder.

Tiap fase boleh APK uji terpisah. Estimasi waktu ditetapkan setelah fase kontrak dan daftar gap selesai; jangan menjanjikan selesai dalam beberapa hari berdasarkan mockup.

## Migrasi, keamanan, operasional

- Backend/D1 dapat dipakai bersama hanya setelah kontrak benar; tidak perlu pindah DB otomatis. Semua tes tulis memakai staging/akun demo khusus.
- Browser/TWA private storage tidak dapat dibaca APK native. Migrasi lewat cloud atau JSON tervalidasi; tunjukkan sumber/tujuan/preview dan cadangan, jangan menghapus TWA dulu.
- Sesi dilindungi Keystore sesuai threat model; tidak masuk log/backup. Keystore tidak otomatis mengenkripsi DB. Putuskan database/receipt at-rest encryption dan kebijakan Android auto-backup sebelum beta cloud.
- Logout/switch akun: lindungi perubahan belum sinkron dan pisahkan cache. Pengunci PIN hanya perangkat; recovery cloud terpisah. Tidak menyimpan password plaintext.
- Restore full book destruktif perlu konfirmasi dan rollback lokal; keluarga gunakan revision guard. Reset pribadi tidak berarti izin reset keluarga.
- Style Smart Savings: warna primer oranye/ikon uang hijau, target native 48dp, label isi terbaca, focus/TalkBack, edge-to-edge/safe area, font sistem 200%, reduced motion. Skill UI/UX Pro Max dibaca manual; search dataset belum dijalankan, jangan klaim output generator.

## Kontrak mockup & definisi selesai pekerjaan ini

Semua 22 area memiliki layar/demo atau state eksplisit dalam `docs/native-parity/`. CRUD utama, transfer, target, pembayaran langganan, filter buku dan simulasi status berjalan di memori. Auth/email/undangan/PIN/struk/ekspor/restore adalah **simulasi berlabel**, bukan implementasi keamanan/file/cloud. Tidak menerima kredensial asli, tidak mengirim email/API, tidak mengunduh file finansial atau membaca DB. Reload mengembalikan data demo.

Checklist mockup diuji dengan `node tests/native-parity.cjs`; hasil dicatat README setelah dijalankan. Tes layout Chrome tidak menggantikan implementasi Compose, QA fisik, atau membuktikan seluruh rumus web telah di-port.
