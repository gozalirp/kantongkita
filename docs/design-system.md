# KantongKita — Planner ungu pastel

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
Navigasi menggunakan SVG lokal tanpa dependensi. Emoji untuk pilihan profil/kategori pengguna dipertahankan sebagai data. Halaman memiliki judul dan deskripsi singkat.

Setiap halaman HTML (`index.html`, `akun-email.html`) wajib memuat tautan Google Fonts Plus Jakarta Sans sendiri. `style.css` hanya menyebut nama fontnya; tanpa tautan itu browser diam-diam jatuh ke sans-serif sistem dan halaman terlihat beda tanpa ada yang error. Navigasi aktif memakai aria-current. Modal memiliki labelledby; toast berupa live region. Disabled, focus-visible dan reduced-motion wajib dipertahankan. Target sentuh HP 44px, input 16px untuk menghindari zoom otomatis iOS.

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


## Penyempurnaan UI/UX lintas halaman (2026-10-22)
- Pertahankan warna ungu pastel dan Plus Jakarta Sans. Hasil pencarian skill untuk finance minimalism mendukung hierarki bersih, tetapi pola landing page trust/sales dan palet navy/gold tidak cocok untuk aplikasi ini sehingga tidak diterapkan.
- Kartu keluarga menampilkan ringkasan singkat; anggota, penjelasan privasi, dan impor lama berada di disclosure native `details/summary`. Galat tetap terlihat di luar disclosure.
- Saldo utama paling menonjol; angka tabular; warna pastel sebagai latar, bukan warna teks bermakna. Label tetap minimal 12px, form 13px/16px mobile.
- Kondisi dashboard tanpa dompet menawarkan tombol Tambah dompet. Akun bersama langsung membuka form transaksi tanpa pemilih sumber tambahan; jika dompet kosong, buka form dompet dahulu.
- Tombol minimal 44px di HP, skip-link ke konten, checkbox pilihan data lama bersasaran besar, halaman tidak boleh overflow horizontal pada 375/768/1024/1440px.
- Tes `tests/ui-responsive.cjs` menguji layout Chrome 11 halaman dengan buku keluarga, disclosure, form, kondisi kosong, label, dan reduced motion. Tes hit-target lama menggulir tombol ke viewport sebelum memeriksa elementFromPoint.

## Grafik berdasarkan fungsi menu (2026-10-22)
Permintaan terbaru menggantikan semua-pie: dashboard 6/12 bulan dan rekap agregat menggunakan batang berpasangan dengan skala nol bersama; tren 30 hari dan rekap harian menggunakan garis (masuk utuh, keluar putus-putus), hari kosong diisi nol pada presentasi tanpa mengubah model. Komposisi kategori dashboard memakai donat; peringkat halaman kategori memakai batang horizontal terurut. Nominal dan persentase komposisi tampil dalam legenda; grafik waktu menyediakan tabel nominal yang bisa dibuka, bukan tooltip-only. Anggaran/target tetap indikator progres, bukan pie. Tidak menambah dependensi.


## Revisi visual aktif — Smart Savings (22 Oktober 2026)

Bagian ini menggantikan arahan warna pastel-ungu sebelumnya. Referensi yang
berhasil diakses: Gm Shamim, **Smart Kids Money Saving & Challenge App**,
https://dribbble.com/shots/27782282-Smart-Kids-Money-Saving-Challenge-App.
Adaptasi, bukan salinan aset/fitur: tidak memakai avatar, logo pembayaran,
fitur Pro, streak, atau angka contoh dari karya tersebut.

- Identitas: oranye `#F5790B`, tinta `#171717`, latar `#F5F3EF`, panel putih.
- Sidebar desktop kuning lembut `#FFEBAD`, halaman aktif oranye.
- Link/teks aksen `#9A3900`; tombol oranye memakai teks hitam, bukan putih.
- Kartu pendamping: mint `#BCEFE6`, ungu `#E9D8FF`, kuning `#FFEDAD`.
- Garis kartu 2px; bayangan cetak 3px 5px tanpa blur; radius 20–24px.
- Dashboard: saldo oranye selebar grid, tiga ringkasan di desktop; di HP
  pemasukan/pengeluaran berpasangan dan selisih selebar grid.
- Pertahankan Plus Jakarta Sans, SVG, target sentuh, safe-area, fokus dan
  reduced-motion. Struktur navigasi, alur keluarga dan semua kalkulasi tetap.
- Jangan menambah gamifikasi atau fitur referensi yang belum benar-benar ada.


## Penyempurnaan kontrol — referensi Neobrutalism.dev (23 Oktober 2026)
- Referensi langsung: https://www.neobrutalism.dev/docs/button dan registry button/tabs/badge. Adaptasi CSS lokal, bukan menyalin komponen React/Base UI atau memasang dependensi.
- Tombol: outline 2px, radius 10px, bayangan keras 2px/3px, feedback tekan bergeser ke bayangan. Disabled tidak bergerak; reduced-motion tetap dihormati.
- Sidebar: menu aktif oranye ber-outline, ikon SVG duotone lama dipertahankan dalam wadah persegi kecil. Navigasi HP memakai penanda aktif kotak membulat, bukan tambahan menu baru.
- Menu fitur: outline 2px, ikon berbingkai, jarak kartu 12–14px. Tabs/filter memakai selected border + shadow, tidak hanya warna. Badge dan toast mengikuti outline yang konsisten.
- Donut, batang/area statistik, kalender transaksi, struktur kartu yang disetujui dan emoji data pengguna tidak diganti. Nilai/ID kontrol, alur navigasi, privasi, API dan hitungan keuangan tetap.
- Bagian ini mencatat tahap preview historis; perubahan UI tersebut telah diterbitkan. Tidak mengadopsi seluruh 64 komponen untuk fitur yang tidak diperlukan.


## Pembaruan 30 Hari — 23 Oktober 2026

Bagian ini menggantikan aturan area chart harian sebelumnya. Statistik dashboard 30 Hari memakai dua garis lurus **solid**, tanpa polygon/area bertumpuk dan tanpa grid putus-putus. Pemasukan mint dengan marker lingkaran; pengeluaran oranye dengan marker kotak. Marker hanya muncul untuk tanggal terpilih. Detail tanggal/nominal/selisih dapat diakses melalui pointer, sentuh, fokus, panah kiri/kanan, Home/End, dan tabel. Chart 6/12 Bulan serta donut tetap.


## Ikon uang hijau — 23 Oktober 2026

Semua SVG bawaan bertipe `wallet` memakai outline hijau tua `#166534` dan isi hijau muda `#86EFAC`, termasuk logo, navigasi, dan kontrol. Ikon PWA koin memakai latar hijau tua, lingkaran hijau muda dan koin hijau `#22C55E`. Warna utama oranye, warna seri chart, dan emoji kategori/dompet pilihan pengguna tetap. Perubahan ini tidak menyentuh data.

Status: perubahan ikon hijau sudah deploy dengan SW `kantongkita-v50`, Worker `afa976b3-a9b1-4c8d-940f-5be11096672c`. Tes DOM 366, browser 152, dan responsif 457 lolos; cache/ikon PWA pada HP fisik belum diverifikasi.


## Responsif HP dan tablet — v51

- Tablet portrait 601–860px memakai dua kolom kartu ringkasan/dashboard dan grid umum, bukan empat kartu sempit atau satu kolom panjang. HP sampai 600px mempertahankan aturan kartu yang ada.
- Sidebar tetap mulai 861px; bottom navigation hanya sampai 860px. Warna oranye/hijau, chart solid dan pemisahan buku tidak diubah.
- Modal menggunakan tinggi viewport dinamis (`dvh`), body dapat scroll dan kepala/tombol tidak menyusut. Landscape tinggi sampai 500px memakai padding vertikal ringkas supaya tombol tetap terjangkau.
- Input/select/textarea memakai 16px sampai lebar 1180px untuk menghindari zoom fokus otomatis pada perangkat mobile yang menerapkannya.
- QA Chrome lokal: 12 lebar 320, 360, 375, 414, 600, 768, 820, 860, 861, 1024, 1180, 1440px; 11 halaman, chart dan modal. Tambahan 9 pasangan ukuran portrait/landscape (termasuk 844×390) memeriksa batas navigasi, modal/footer, target 44px dan ukuran input. Total responsif 1356, browser 152, serta npm test lolos.
- Status: v51 diterbitkan bersama v52; lihat status terbaru pada catatan rilis v54. Ini emulasi layout Chrome/iframe, bukan pengujian perangkat fisik, keyboard virtual iOS/Android, safe-area notch nyata atau Safari.


## Modal transaksi iPhone — v52

Footer simpan tetap di luar area scroll form. Wrapper mengikuti `visualViewport.height` dan `offsetTop` melalui event resize/scroll untuk keyboard iOS yang tidak selalu mengubah `dvh`. HP memakai padding modal lebih ringkas; perangkat pointer coarse tidak otomatis memfokuskan input saat modal dibuka sehingga keyboard tidak muncul tanpa pilihan pengguna. Desktop tetap mendapat fokus awal. Listener hanya membaca ukuran viewport, tidak membaca isi input atau mengubah payload buku.

Tes regresi memakai form transaksi keluarga dan pribadi pada lebar iPhone 11 Pro 375px, tinggi viewport simulasi 724/420/300px dan offset 24px; tombol simpan tetap terlihat saat body discroll. npm test lolos, browser 152 dan responsif 1382 lolos. Ini simulasi Chrome, belum verifikasi Safari/keyboard iPhone fisik. v52 telah deploy dengan Worker `83526cce-4dfa-4dfc-b776-d3eafeb6bfb4`; commit/push perubahan v52 belum dilakukan.

## Judul statistik HP — v53

Reproduksi browser live emulasi 375×812 mengonfirmasi kontrol periode menimpa judul Statistik keuangan. Pada lebar sampai860px kepala kartu chart kini vertikal: judul penuh di atas, pilihan periode lebar penuh di bawah, target tombol tetap44px. Preview CSS di browser terverifikasi visual; tidak menyimpan atau mengubah buku. Tes menambahkan pemeriksaan geometri judul tidak bertumpuk dengan kontrol di8 lebar mobile/tablet. Browser152/responsif1398 lolos. Termasuk rilis v54; belum Safari fisik.


## Audit regresi tabrakan layout — 23 Oktober 2026

Tes responsif diperluas dari sekadar scrollWidth ke batas teks yang benar-benar digambar (`Range.getClientRects`) terhadap tombol/select/input di kepala kartu, intro, welcome dan kepala buku. Label kontrol diuji agar tidak melampaui box. Sebelas halaman diuji pada 12 lebar 320–1440px; judul 24px juga diuji pada lima halaman sebagai stress test (bukan emulasi penuh Dynamic Type iOS).

Tujuh formulir (transaksi, dompet, kategori, anggaran, target, langganan, profil) diperiksa di setiap lebar: buka, batas horizontal dialog/body, footer terlihat, label aksi tidak meluber dan target tinggi44px. Tes viewport keyboard transaksi tetap dipertahankan. Tidak ada tabrakan tambahan ditemukan pada fixture yang diuji setelah perbaikan judul statistik v53. npm test lolos, browser152/responsif3222 lolos. Ini tidak membuktikan semua kombinasi data atau Safari/perangkat fisik bebas masalah. V53 tercakup dalam rilis v54.


## Koreksi label tanggal transaksi — v54

`U.relativeDate` sebelumnya menghitung hari ini minus tanggal transaksi, sedangkan cabang label mengharapkan tanggal transaksi minus hari ini. Arah selisih dikoreksi di helper bersama; tanggal tersimpan/nominal/pengurutan tidak diubah. Hari -1 Kemarin, 0 Hari ini, +1 Besok, -2 sampai -6 “N hari lalu”; tanggal lain tetap format tanggal lengkap (termasuk masa depan selain besok). Ditambah48 kasus regresi yang gagal sebelum fix dan lolos sesudahnya: pergantian bulan/tahun, kabisat, dan sekitar DST; smoke juga lolos pada TZ America/New_York. npm test lolos, smoke317/browser152/responsif3222. Status deployment terbaru di [catatan rilis v54](rilis-v54.md); perubahan belum commit/push. Font Space Grotesk tetap preview saja, belum diubah di source.


### Pemeriksaan akhir label tanggal v54

Audit seluruh pemakai `diffDays` menunjukkan target tabungan, langganan, hari jatuh tempo dan pengingat backup memakai arah selisih sesuai tujuannya; tidak diubah. Tes integrasi DOM tambahan memastikan daftar transaksi menampilkan31Des2025 sebagai Kemarin,1Jan2026 Hari ini dan2Jan2026 Besok ketika hari ini1Jan2026, tanpa memutasi buku. Tes fixture awal memakai filter tipe kosong lalu diperbaiki menjadi `all` sesuai kontrak UI. Seluruh npm test dan browser lolos (DOM370, browser152, responsif3222). Smoke317 juga lolos pada Asia/Jakarta, Asia/Makassar, Asia/Jayapura, UTC, America/New_York dan Pacific/Auckland. Pada tahap QA tidak ada deploy/commit/push atau tulis buku produksi; deployment selanjutnya dicatat di [rilis v54](rilis-v54.md). Tidak ada verifikasi Safari fisik.
