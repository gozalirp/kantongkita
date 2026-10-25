# Konsep 02 — Quiet Ledger

Alternatif desain untuk ditinjau; tidak menggantikan identitas produksi atau konsep 01.

Preview: http://127.0.0.1:8772/native-mockup-quiet/

Dari root project: `python -m http.server 8772 --bind 127.0.0.1 --directory docs`.
Bisa juga membuka `index.html` langsung. Memakai CSS dan logika demo bersama dari `../native-mockup/`, sehingga folder-f0lder tersebut perlu tetap berdampingan.

## Arah desain

- Forest green #214D3C untuk kartu saldo dan penekanan utama, ivory #F7F8F3 untuk latar, sage/lime lembut untuk kontrol.
- Menghapus outline hitam tebal dan bayangan cetak: border halus memisahkan data, bukan menjadi fokus.
- Manrope untuk angka/judul dan DM Sans untuk label. Font via Google Fonts, fallback sistem bila offline; font produksi Android nantinya harus dibundel dengan lisensinya.
- Hierarki: saldo total → perbandingan masuk/keluar → aksi catat → dompet → transaksi → anggaran. Angka tabular, teks nominal dapat membungkus, warna tidak menjadi satu-satunya pembeda masuk/keluar.
- Navigasi bawah aktif memakai permukaan pill lembut; target minimum tombol 44px. Target Compose nantinya minimum 48dp, bukan konversi CSS piksel secara mentah.
- Progressive disclosure: detail dompet dan status tidak memenuhi beranda; tampil setelah diminta. Pilihan buku selalu terlihat, terpisah dari akun.

## Apa yang berbeda / tetap

Ini alternatif **visual dan hierarki**, bukan arsitektur informasi baru. Empat tab dan alur transaksi sengaja sama agar pemilik bisa membandingkan estetika tanpa harus belajar alur baru. Tidak menambahkan grafik dekoratif, saldo palsu tersinkron, fitur investasi/bank atau gamifikasi.

Catat/filter/cari/ganti buku berfungsi dengan data demo memori yang sama seperti konsep 01. Login, sinkron, backup dan pengelolaan dompet belum aktif; reload mereset data. Bukan UI Compose atau aplikasi native yang sudah selesai.

## Transparansi skill dan pengujian

Skill bernama UI/UX Ultra Pro Max tidak tersedia di sesi pada saat pembuatan. Konsep ini dibuat menggunakan prinsip UI/UX langsung, **bukan hasil menjalankan skill tersebut**.

`node tests/native-mockup.cjs --quiet`: 306 pemeriksaan lolos (layout 320–1440px, target tombol, form pendek, validasi, saldo, filter dan isolasi buku). Konsep 01 diuji ulang: 306 lolos. Screenshot desktop ditinjau. Tidak ada pengujian HP fisik/TalkBack, audit kontras menyeluruh atau studi usability pengguna; warna/bahasa label masih perlu dievaluasi sebelum implementasi Compose.
