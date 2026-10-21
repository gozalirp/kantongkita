# SavingDuit — Planner ungu pastel

## Arah desain
Acuan: gambar pengguna `Pictures/dashboard.png`. Antarmuka personal finance yang ramah, tenang, dan ringkas. Pertahankan Plus Jakarta Sans, sidebar ungu, kartu pastel, grafik horizontal dan donat. Desktop dua kolom pada dashboard; HP satu kolom dengan bottom navigation.

## Skill dan keputusan
Menggunakan panduan design, design-system, dan ui-ux-pro-max. Pencarian design-system personal finance menghasilkan saran dark/glass dan font kasual yang tidak cocok dengan referensi; tidak diterapkan. Pencarian style `dashboard minimal` cocok untuk hierarki, ruang, dan interaksi sederhana. Tidak menambahkan framework/dependensi.

## Token
- Primary/ink: #5147D9; navigation: #5955EF; background: #F4F5FC; panel putih.
- Pastel: lilac #EDEBFF, blue #E4F2FF, rose #FFE7EB, sand #FFF2CF.
- Teks utama #0F172A, sekunder #475569. Warna pemasukan/pengeluaran tetap semantik.
- Radius 12px kontrol, 18–20px kartu, 24px modal. Ritme jarak 8/12/16/24px.

## Komponen
Navigasi menggunakan SVG lokal tanpa dependensi. Emoji untuk pilihan profil/kategori pengguna dipertahankan sebagai data. Halaman memiliki judul dan deskripsi singkat. Navigasi aktif memakai aria-current. Modal memiliki labelledby; toast berupa live region. Disabled, focus-visible dan reduced-motion wajib dipertahankan. Target sentuh HP 44px, input 16px untuk menghindari zoom otomatis iOS.

## Bahasa ikon
Satu peran, satu bahasa. **Ikon garis (SVG) hanya untuk kontrol**: tombol aksi, pintasan navigasi, kepala modal, keadaan kosong, dan notifikasi status. **Emoji hanya untuk data pilihan pengguna**: dompet, kategori, target tabungan, langganan, dan profil, dibungkus `<span class="ui-emoji">` supaya ukurannya setara ikon garis.

Alasannya: 34 emoji hanya punya 20 bentuk garis, sehingga konversi memaksa arti berbeda tampil identik (Tunai dan GoPay sama-sama jadi "tag"; anggaran dan target sama-sama jadi sasaran). Emoji juga satu-satunya penanda yang benar-benar dibedakan pengguna. Karena itu `U.polishIcons` hanya memindai kontrol; jangan menambah `.ico`, `.ico-badge`, `.pc-ic`, `.pb-ic`, `.e-ic`, `.t2`, `.tag`, `.bar-cat`, `.lbl`, atau `.sub` ke daftar pemindaiannya. Emoji yang tidak punya bentuk garis setara dibiarkan, bukan dipaksa jadi bentuk generik.

Aksi per baris (ubah, hapus) disembunyikan sampai baris di-hover atau difokus di perangkat berpenunjuk halus **dengan lebar layar ≥560px**, dan selalu tampil di layar sentuh maupun layar sempit. Di bawah 560px angka dan aksi ditumpuk: dua sasaran sentuh 44px yang berdampingan memakan hampir seluruh lebar baris dan memotong nama dompet. Label `aria-label` wajib untuk tombol yang hanya berisi ikon.

Dua atribut, dua arti, jangan dicampur. `data-ikon="nama-bentuk"` hanya untuk slot ikon statis di kerangka HTML; `U.pasangIkonStatis` mengisi slot itu sekali lalu melepas atributnya supaya isi yang berasal dari data pengguna tidak tertimpa. Pemilih emoji (kategori, profil) memakai `data-emoji` karena isinya memang emoji, bukan nama bentuk. Ikon di dalam tombol berlabel memakai `wrapIco(nama)` sehingga jarak ikon ke teks diatur `gap` milik `.btn`, bukan spasi yang ditulis di teks. Panah arah dana (`↓ ↑ ⇄`) di tombol segmen tetap karakter teks: itu penanda arah, bukan hiasan, dan tidak ada bentuk garis yang lebih jelas.

## Batas perubahan
Tidak mengubah struktur penyimpanan, perhitungan keuangan, API, atau alur sinkronisasi. Tidak menghapus data. Pengujian simulasi tidak menggantikan pengecekan HP fisik.

## Tiga dial (dipakai sejak audit anti-slop 001)

- **ENERGY 1 (tenang).** Alat keuangan dipakai sambil menghitung uang, bukan dipamerkan. Tidak ada gerak yang menarik mata dari angka.
- **RHYTHM 2 (konsisten dengan beberapa jeda).** Halaman memakai pola yang sama supaya berpindah tab tidak terasa pindah aplikasi. Jeda hanya di dashboard (kartu statistik pastel) dan halaman masuk (satu kartu tengah).
- **MOTION 1 (nyaris diam).** Hanya tiga gerak: modal muncul 0,2 detik, toast masuk 0,18 detik, umpan balik tekan 0,08 detik. Semuanya dimatikan oleh `prefers-reduced-motion`.

## Alasan keputusan visual (R-31)

- **Gradien ungu `#5147D9 → #655CF1` pada tombol utama.** Satu-satunya gradien penuh di antarmuka. Dipakai supaya tombol aksi utama terbaca sebagai satu tingkat di atas permukaan datar di sekitarnya. Semua tombol sekunder tidak bergradien. Bayangannya kini ungu `rgba(81,71,217,...)`, bukan biru, supaya satu tombol tidak memakai dua keluarga warna.
- **Sisa biru `#80B8FF` dihapus.** Itu peninggalan palet biru sebelum navigasi menjadi ungu. Sekarang aksen hanya ungu dengan turunannya, ditambah tiga warna semantik (hijau masuk, rose keluar, amber peringatan).
- **Tanpa label uppercase di atas judul.** Label kecil bertracking lebar di atas H1 hanya mengulang maksud judul, jadi dihapus dan judulnya yang bekerja.
- **Blur hanya di dua tempat: topbar HP dan navigasi bawah HP.** Keduanya melayang di atas konten yang bergulir, jadi butuh pemisahan. Kartu statistik dibuat solid karena tidak melayang.
- **Titik status tanpa glow.** Titik menandai keadaan nyata (tersambung atau tidak), warnanya cukup. Glow hanya menambah terang tanpa menambah informasi.
- **Tangga elevasi bayangan.** Kartu `0 3px 16px` pada alfa 2% (nyaris rata, hanya pemisah), tombol aksi `0 4px 14px`, tombol mengambang HP `0 8px 20px`, modal `0 24px 80px`. Empat tingkat, bukan bayangan tebal di semua elemen.
- **Tema terang tetap, tanpa toggle (R-21).** Alasan produk: aplikasi ini dipakai di HP sambil melihat struk dan mencatat di siang hari, dan arah acuan pemilik adalah dashboard terang. Mode gelap belum dibangun, jadi tidak ada toggle yang bisa rusak (R-34).
- **Keadaan galat memakai kartu peringatan yang menetap** di atas isi halaman, dengan tombol Coba lagi. Toast sendirian tidak cukup karena hilang sendiri, sehingga halaman akan tampak normal padahal datanya gagal dimuat.
