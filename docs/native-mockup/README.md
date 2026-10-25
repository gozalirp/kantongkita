# Mockup Native Android

Buka `index.html` di Chrome/Edge; tidak perlu npm install atau build. Untuk preview HTTP dari root project:

```sh
python -m http.server 8772 --bind 127.0.0.1 --directory docs
```

Buka http://127.0.0.1:8772/native-mockup/ . Server hanya terikat localhost; HP lain tidak dapat mengakses alamat localhost PC ini.

- Desktop menampilkan frame HP dan pengantar; viewport <=740px menampilkan aplikasi penuh.
- Empat tab aktif; form catat transaksi mengubah saldo/riwayat demo. Pencarian, filter dan pergantian buku aktif.
- Pilihan buku keluarga memakai dataset terpisah. Rekap Oktober hanya menghitung tanggal Oktober 2026; saldo dompet menghitung semua tanggal.
- Akun, sinkron, backup, pengelolaan dompet/kategori dan detail target hanya penjelasan rencana, bukan implementasi. Transfer/edit/hapus tidak disimulasikan.
- Tidak ada API, localStorage, sesi akun atau service worker. Reload mengembalikan demo awal.
- Font Google Fonts opsional memerlukan internet; bila offline memakai system sans-serif. Tidak mengirim data keuangan ke layanan font.
- Sumber rencana: `../native-android-plan.md`. Screenshot desktop: `preview-desktop.png`.

## Validasi

`node tests/native-mockup.cjs` — Chrome headless, 306 pemeriksaan lolos pada 25 Oktober 2026: navigasi, overflow 320–1440px, target tombol, simpan/validasi/escaping, pencarian/filter, isolasi buku, periode dan form pada tinggi 844/420/300px. Screenshot desktop ditinjau. Ini bukan pengujian APK, TalkBack, keyboard virtual atau perangkat fisik.
