# KantongKita Native Android — rencana produk & implementasi

> **Pembaruan cakupan 25 Oktober 2026:** pemilik memilih Smart Savings dan **setara fitur web**, bukan berhenti di MVP. Acuan cakupan/gate terbaru: [rencana parity](native-web-parity-plan.md); mockup terbaru: [Smart Savings parity](native-parity/index.html). Tahapan MVP di bawah tetap berguna untuk urutan pengerjaan, bukan batas rilis akhir.

Status: **rencana untuk ditinjau, bukan implementasi/komitmen rilis**. 25 Oktober 2026.
Pilihan pemilik: **Android dulu**. Mockup: [native-mockup/index.html](native-mockup/index.html).

## 1. Keputusan inti

Bangun UI Android sungguhan menggunakan **Kotlin + Jetpack Compose Material 3**, melanjutkan `android-native/`. Bukan WebView, TWA, Capacitor, atau halaman HTML yang dimasukkan ke APK. HTML pendamping hanya prototipe desain; Compose harus diimplementasikan terpisah.

Pertahankan identitas Smart Savings saat ini: oranye #F5790B, hijau uang #166534/#86EFAC, latar #F5F3EF, outline tinta 2px dan bayangan tegas. Kartu pendamping mint, lilac dan kuning. Plus Jakarta Sans dibundel sebagai resource font pada Android dengan lisensi yang sesuai, bukan bergantung Google Fonts saat runtime. Komponen native tetap mengutamakan aksesibilitas dan perilaku Android.

## 2. Kondisi kode yang sudah ada

- Kotlin 2.1.20, Compose, SDK 36, min SDK 26, JDK 17. Identitas uji `com.savingduit.app.nativepreview`.
- `MainActivity.kt`: ringkasan saldo lokal, daftar, tambah/hapus transaksi dan konfirmasi hapus.
- `Ledger.kt`: SQLiteOpenHelper, nominal Long rupiah, tanggal ISO dan validasi dasar. `onUpgrade` sengaja gagal daripada menghapus data.
- Belum ada akun, izin internet, sinkron, dompet/kategori, edit, profil, keluarga atau backup native. README melaporkan build/lint/unit test historis; pada pekerjaan planning ini tidak dijalankan ulang.
- Backend web memakai Cloudflare Worker + D1 dan penyimpanan buku berbasis revisi. Jangan menganggap draft `worker/account-profiles.mjs` sudah aktif di produksi.
- Folder kerja ini tidak memiliki metadata `.git`; buat snapshot/backup sebelum implementasi berikutnya. Jangan menimpa APK web/TWA pengguna.

## 3. Batas MVP

### Tahap A — MVP offline yang layak diuji
1. Buku pribadi lokal dengan dompet, kategori, saldo awal dan transaksi masuk/keluar/transfer.
2. Beranda, pencarian/filter riwayat, tambah/ubah/hapus dengan konfirmasi dan rekap bulanan.
3. Backup/restore JSON melalui Storage Access Framework; pemeriksaan format, versi dan preview sebelum impor.
4. Anggaran kategori, target tabungan, pengaturan dasar dan status data yang jujur.
5. Seluruh perubahan tersimpan setelah process death/restart; tidak ada reset DB tersembunyi.

### Tahap B — akun dan sinkron aman
1. Login/daftar/verifikasi email/pemulihan memakai kontrak API yang sudah diverifikasi di staging.
2. Database dipisahkan menurut akun dan buku. Data lokal tidak otomatis masuk ke akun; tampilkan preview dan persetujuan impor.
3. Sinkron buku pribadi dengan revisi server, antrean lokal, retry yang idempoten dan konflik yang tidak menimpa diam-diam.
4. Buku keluarga dengan pemeriksaan anggota/role server dan batas privasi eksplisit.

### Sesudah fondasi stabil
Langganan/pengingat melalui WorkManager sesuai batas Android, ekspor CSV/XLSX, profil/avatar dan kenyamanan biometrik. Biometrik hanya pengunci tampilan, bukan pengganti autentikasi server. iOS, OCR struk, koneksi bank, pembayaran, gamifikasi dan integrasi Drive tidak masuk lingkup awal.

## 4. Peta layar & alur

Navigasi bawah: **Beranda · Riwayat · Rencana · Lainnya**. Aksi tambah transaksi tampil jelas pada beranda/riwayat, bukan dipaksakan sebagai tab. Pilihan buku berada di header, terpisah dari menu akun.

| Layar | Isi / tindakan |
|---|---|
| Awal | Penjelasan lokasi data; gunakan lokal atau masuk. Jangan menyebut tersinkron bila belum ada konfirmasi server. |
| Beranda | Saldo, masuk/keluar periode, dompet, anggaran ringkas, transaksi terkini. |
| Riwayat | Pencarian, filter tipe/periode/dompet, daftar berkelompok tanggal, detail dan edit. |
| Form transaksi | Masuk/keluar/transfer, nominal, dompet, kategori, tanggal, catatan; transfer memilih dua dompet berbeda. |
| Rencana | Anggaran kategori dan target tabungan; nominal/sisa ditampilkan, tidak bergantung warna saja. |
| Dompet | Saldo, riwayat dompet dan form saldo awal. |
| Buku keluarga | Anggota, role, buku terpisah dan peringatan privasi sebelum membagikan data. |
| Lainnya | Akun, dompet, kategori, backup/restore, status sinkron, pengaturan. |
| Status/galat | Kosong, offline, perubahan menunggu, konflik, sesi habis dan gagal simpan. |

Alur utama: buka buku → catat pengeluaran → validasi → commit DB lokal atomik → ringkasan diperbarui → tandai antrean bila akun cloud aktif → kirim ketika aman → tampilkan waktu konfirmasi server. Tombol simpan tidak menghapus form bila gagal.

## 5. Arsitektur minimum

Tetap satu modul `app`; tidak membuat banyak modul atau framework DI sebelum dibutuhkan. Pecah `MainActivity` menjadi layar Compose, ViewModel + StateFlow, repository sederhana dan data source. Gunakan Navigation Compose untuk back stack/saved state. SQLite yang ada tetap fondasi tahap pertama; Room menjadi pilihan saat skema dompet/akun mulai dikerjakan, hanya bersama migrasi eksplisit dan tes dari DB v1. Jangan menambah dua lapisan database permanen.

- Semua I/O database/network di luar main thread; lifecycle-aware state collection.
- Nominal disimpan Long rupiah utuh, bukan Float/Double. Batas nominal dan overflow agregasi diperiksa; validasi tanggal/relasi dompet di lapisan data.
- Transfer atomik: debit/kredit satu operasi; tidak dihitung sebagai pemasukan/pengeluaran. Kategori, dompet, transaksi, anggaran dan target terikat buku.
- Tanggal transaksi = LocalDate ISO; timestamp sinkron = UTC. Jangan menggeser tanggal buku mengikuti zona waktu.
- Database lokal adalah sumber tampilan; server sumber revisi cloud yang sudah disepakati. UI tidak menyamakan offline dengan berhasil sinkron.
- WorkManager dipakai untuk sinkron terjadwal setelah kontrak sinkron siap, bukan service background terus-menerus.

## 6. Akun, konflik dan keamanan

Sebelum menulis client network, inventaris route/auth/cookie/header, CSRF, expiry, logout dan format error **dari implementasi Worker aktif**, lalu buat contract tests staging. Jangan mengasumsikan endpoint refresh/token baru tersedia. Pilih HTTP client setelah kontrak jelas; tidak ada secret di APK.

Kredensial sesi disimpan menggunakan penyimpanan terlindungi Android Keystore yang sesuai desain sesi; tidak di log/backup. Jangan menyebut Keystore sebagai enkripsi seluruh database. Putuskan kebijakan enkripsi data-keuangan-at-rest sebelum beta cloud berdasarkan threat model. Blok backup Android yang membawa sesi/DB lintas akun; backup finansial manual harus diberi peringatan sensitivitas dan lokasi file.

`409` berarti simpan salinan lokal + revisi dasar, ambil versi server lalu minta pengguna memilih/pulihkan; tidak mengirim ulang snapshot lama dengan revisi baru. MVP tidak melakukan auto-merge keuangan. Gunakan UUID operasi/stable IDs dan persistensi antrean agar retry tidak menggandakan transaksi. Logout/switch akun tidak boleh menjatuhkan perubahan belum sinkron: tawarkan sinkron/backup dahulu, lalu bersihkan sesi dan pisahkan data. Sesi habis tidak menghapus catatan lokal.

Backend saat ini menulis buku lengkap dengan revisi secara atomik; jangan menambahkan endpoint transaksi lama (`410`) atau menembak API produksi dari mockup. Role keluarga selalu diperiksa server; tidak ada impor buku pribadi ke keluarga tanpa persetujuan dan ringkasan isi.

## 7. Urutan kerja & gerbang selesai

| Fase | Hasil | Syarat lanjut |
|---|---|---|
| 0 — desain (pekerjaan ini) | Rencana + HTML interaktif terisolasi | Pemilik menilai navigasi, gaya dan cakupan. |
| 1 — fondasi | Pecah layar, tema Compose, navigasi, skema & migrasi | Build/lint/unit test lolos, migrasi v1 mempertahankan semua catatan. |
| 2 — keuangan lokal | Dompet, kategori, CRUD/transfer, filter, rekap | Tes saldo/transfer/overflow; restart/process death tidak kehilangan data. |
| 3 — MVP offline | Anggaran, target, backup/restore | Impor invalid tidak menimpa DB; round-trip backup cocok; QA HP fisik. |
| 4 — akun cloud | Auth + penyimpanan sesi + sync pribadi | Kontrak staging lolos, offline/retry/409/sesi habis/switch akun aman. |
| 5 — keluarga | Role, undangan dan pemisahan buku | Tes akses silang akun/anggota ditolak dan impor eksplisit. |
| 6 — beta/rilis | Uji perangkat, signing, distribusi | Tidak ada blocker kehilangan data, checklist privasi & recovery lengkap. |

Belum menetapkan tanggal rilis: fase cloud bergantung audit kontrak dan QA perangkat. APK preview terpisah dapat diberikan tiap fase; keputusan identitas produksi dan migrasi perlu persetujuan tersendiri.

## 8. Pengujian wajib sebelum aplikasi disebut siap

- Unit: uang/tanggal, agregasi, transfer, dompet terhapus, anggaran dan pembulatan; tanpa float.
- Database: migrasi dari v1, rollback transaksi gagal, process death, restore duplikat/rusak, akun/buku tidak tertukar.
- Contract/staging: 401/403/409/429/5xx, timeouts, retry, sesi kedaluwarsa, dua perangkat menulis bersamaan, anggota keluarga dicabut.
- Compose instrumented: back gesture, rotasi, keyboard nominal, empty/error/loading, TalkBack, teks 200%, landscape dan edge-to-edge.
- Perangkat: Android minimum yang didukung + versi baru, setidaknya HP kecil dan satu HP fisik pemilik. Uji Doze dan putus jaringan saat simpan.
- Release: keystore release privat di luar repo, versi/label jelas, backup kebijakan benar, privacy policy/Data Safety sesuai data nyata. Build debug bukan build Play Store.

## 9. Kontrak mockup HTML

`docs/native-mockup/` berisi prototipe lokal, tanpa API, login nyata, localStorage, service worker atau akses buku produksi. Data tetap di memori tab dan reset saat reload. Tersedia beranda, riwayat/filter, form tambah transaksi, pilihan buku pribadi/keluarga, rencana dan menu dompet/status. Keluarga memakai dataset demo terpisah, bukan menggabungkan saldo pribadi. Fitur belum dibuat native ditandai sebagai rencana. Preview bukan bukti keamanan, sinkronisasi, persistensi atau performa APK.

Buka `index.html` langsung atau jalankan server localhost. Test prototipe: `node tests/native-mockup.cjs`. Tidak menambahkan prototipe ke `public/`, manifest, service worker, pipeline APK atau deploy produksi.
