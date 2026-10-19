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

## Batas perubahan
Tidak mengubah struktur penyimpanan, perhitungan keuangan, API, atau alur sinkronisasi. Tidak menghapus data. Pengujian simulasi tidak menggantikan pengecekan HP fisik.
