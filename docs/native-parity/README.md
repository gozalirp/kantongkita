# Smart Savings — full web parity UX

## Acuan terbaru: tampilan web MoneyPlanner pengguna

Pada 25 Oktober 2026 tab MoneyPlanner pengguna dipinjam dengan izin dan diperiksa secara visual, termasuk preview mobile yang sedang terbuka. `web-match.css` kini memprioritaskan gaya web aktual: saldo oranye, ringkasan mint/lilac/kuning, kartu putih membulat dengan outline hitam dan bayangan pendek, latar abu-krem bersih. Dashboard memuat pengantar, catat transaksi, saldo, ringkasan, dompet, grafik demo, dan catatan. Nav menjadi Beranda / Transaksi / tambah / Rekap / Menu; Rencana tetap tersedia di Menu. Buku keluarga menampilkan panel bersama. Ini adaptasi, bukan salinan pixel-perfect; header dan grafik masih disederhanakan. Tidak menyalin data pribadi dari tab pengguna dan tidak menulis ke produksi.

## Skin terdahulu: neobrutalism penuh

`neo.css` menjadi skin visual di atas layout `parity.css`: palet kuning/oranye/mint/ungu solid, border tinta 3px, radius kartu 6px, bayangan offset tanpa blur, tipografi lebih tegas, tombol tekan ber-offset, list/nav/form/dialog seragam. Background titik hanya area presentasi desktop; area catatan tetap bersih. Tidak mengubah logika finansial atau fitur. Ikon tetap renderer asli web.

## Penyempurnaan visual: lebih sederhana

- Beranda fokus saldo, catat/transfer, dua pintasan dan transaksi terbaru. Target pindah ke Rencana; status cloud jadi tautan kecil.
- Lainnya dikelompokkan menjadi Catatan & laporan / Kamu & keluarga / Data & aplikasi. Halaman turunan punya tombol kembali dan penanda nav induk.
- Navigasi bawah tetap terlihat dalam frame, isi layar scroll sendiri. Penjelasan preview bisa dibuka seperlunya.
- `icons.js` merupakan snapshot renderer **U.icon asli dari `public/js/util.js`**, bukan icon pack baru. Bentuk path tetap sama; tile pastel, outline dan offset shadow memberikan presentasi neobrutalism. Tes membandingkan snapshot dengan source. Tidak memuat kode app/store produksi atau mengubah aset web.
- Screenshot: `preview.png` desktop, `preview-mobile.png` layout sempit (520px). Respons 320–1440 dicek melalui iframe tes; screenshot Chrome Windows punya batas minimum outer-window sehingga bukan bukti viewport HP 390px.


Preview: http://127.0.0.1:8772/native-parity/ (server `python -m http.server 8772 --bind 127.0.0.1 --directory docs`). Bisa juga buka `index.html` langsung; tidak ada fetch/module/storage dependency.

Acuan: [rencana parity & 22 area penerimaan](../native-web-parity-plan.md). Prototype awal tetap di `../native-mockup/` dan `../native-mockup-quiet/`.

## Yang dapat dicoba

17 halaman via pemilih layar: beranda, riwayat, rencana, lainnya, dompet, kategori, rekap, statistik, anggaran, target, langganan, profil perangkat, akun, keluarga, backup, pengaturan, status data.

- Tambah/edit/hapus transaksi, income/expense/transfer, kategori sesuai jenis, nominal integer, dompet transfer berbeda.
- CRUD sederhana dompet/kategori/rencana. Saldo awal form demo hanya positif; referensi transaksi memblokir hapus dompet/kategori. Arsip, ikon/tipe dompet dan aturan delete referensi rencana belum lengkap: spesifikasi native ada di matriks, bukan diklaim berfungsi di sini.
- Cari catatan dan filter jenis/dompet/kategori/tanggal. Menerapkan pencarian baru mengganti filter, bukan menggabungkannya; filter pelaku hanya ilustrasi disabled. Native wajib kombinasi filter dan pelaku sesuai mode buku.
- Nabung/tarik target tidak mengubah saldo; tarik floor 0. Bayar/batalkan langganan menambah/menghapus transaksi contoh. Toggle aktif; due-date dan grafik masih ilustrasi, bukan seluruh mesin hitung web.
- Dua buku demo terisolasi. Pilihan buku menyederhanakan paired-mode web; gabungan hanya penjelasan, tidak ada export/save gabungan.
- Rekap periode hari/bulan/tahun pada data contoh, tabel angka. Batang grafik bersifat dekoratif/ilustrasi, diberi label.
- Alur akun/daftar/recovery/email/PIN/avatar/profil, undang/link/join, bagikan dompet, file/struk/ekspor/restore dan status cloud berupa **simulasi eksplisit**. Tidak ada auth, cryptography, file picker/file writer, undangan atau jaringan sungguhan. Jangan masukkan kredensial asli.
- Restore invalid memperlihatkan validasi contoh; restore valid tidak mengganti data. Reset pribadi mengembalikan buku pribadi demo saja; keluarga utuh. 409 menahan draft secara ilustrasi, bukan merge.

Data hanya memori, reload mereset. Tidak menyentuh localStorage, cookie, service worker, endpoint, database, APK atau folder native. Tidak menambah dependency. Sistem font lokal, tidak memakai Google Fonts request.

## Pemeriksaan

`node --check docs/native-parity/parity.js` lulus.
`node tests/native-parity.cjs` — **279 checks passed**, Chrome headless: 17 halaman pada 320/375/430/768/1024/1440, tidak overflow, alur transaksi CRUD/transfer, escaping, saldo, target, pembayaran langganan, isolasi buku, guard referensi, filter rentang, dialog per area, restore invalid, konflik, rekap harian, dialog tinggi pendek, target nav >=48px, lima SVG navigasi, nama aksesibel, pengelompokan menu, tombol kembali, nav induk aktif, dan ikon identik renderer web. Regresi mockup 01/02 masing-masing 306 serta galeri 53 juga lulus.

Tes tidak membuktikan kelengkapan semua rumus web/security. Belum TalkBack, emulator/HP fisik, font scaling native 200%, audit kontras menyeluruh, backend contract test atau usability test. Mockup bukan Compose; seluruh P01–P22 harus diimplementasikan dan diuji sebelum APK disebut setara web. UI/UX Pro Max dibaca sebagai panduan; dataset/search engine tidak dijalankan.

Statistik/dashboard kini memakai diagram donat yang diadaptasi dari renderer SVG web (public/js/views.js): palet kategori sama, total tengah, insight kategori terbesar, legenda nominal/persentase, serta empty state dan kelompok Lainnya. Data dihitung dari pengeluaran demo Oktober 2026, bukan batang dekoratif; filter periode lengkap tetap belum diimplementasikan. Tes terbaru: 284 checks passed.

## Restyle neobrutalism.dev (25 Oktober 2026)
Situs dan halaman Styling diperiksa melalui browser: border 2px, radius kecil 5px, hard shadow 4px, kontrol tegas. Diadaptasi dalam web-match.css tanpa memasang React/Tailwind/shadcn ke proyek. Aksen oranye dan palet ringkasan KantongKita dipertahankan; grid hanya presentasi luar, area aplikasi bersih. Target kontrol utama 48px, fokus terlihat, reduced motion; pie/donut web tetap. 286 checks passed. Ini bukan full Hallmark redesign/render audit atau pencarian dataset UI/UX Pro Max; tidak ada perubahan Compose/APK/backend/produksi. Referensi: https://www.neobrutalism.dev/styling .

## Kalender tanggal
Input tanggal transaksi, deadline target, jatuh tempo langganan, dan rentang filter sekarang memakai kalender inline bergaya https://www.neobrutalism.dev/docs/calendar (calendar.js). Label Indonesia, 42 sel termasuk bulan sebelah, navigasi bulan, pilihan tersorot, Hari ini, tutup/Escape, panah keyboard dan kosongkan khusus tanggal opsional. Nilai form tetap ISO YYYY-MM-DD, tidak memakai UTC untuk perpindahan tanggal. Tidak mengimpor React DayPicker atau dependensi baru. Input periode anggaran (bulan) tetap native. 296 regression checks passed; belum diuji TalkBack/perangkat fisik.

## Nominal & Sora
Semua input nominal memakai pemisah ribuan titik secara live dan saat edit (1.000 / 10.000 / 1.000.000), keyboard numeric, serta normalisasi terpusat sebelum FormData masuk ke logika simpan. Nilai model tetap integer rupiah; negatif, pecahan, karakter tidak valid dan nilai di atas 999.999.999.999 ditolak. Font Sora variable dibundel lokal dari google/fonts/ofl/sora; lisensi SIL OFL ada di fonts/OFL.txt, tanpa request font eksternal saat preview. 305 checks passed termasuk font benar-benar termuat, angka tersimpan benar, CRUD/filter/kalender dan layout. Belum validasi IME/perangkat Android fisik.
