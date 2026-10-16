# SavingDuit 💰

Aplikasi pencatat keuangan pribadi — **web app lokal**, jalan di browser tanpa internet.
Semua data disimpan di komputer kamu sendiri (localStorage), plus bisa di-backup ke Google Drive.

## Cara pakai (paling gampang)

1. Klik dua kali **`buka.bat`**
2. Browser terbuka otomatis di `http://localhost:8765`
3. Selesai. Tutup jendela hitam untuk mematikan.

Butuh Node.js (sudah terpasang kalau `node -v` jalan). Kalau tidak punya, buka `index.html`
langsung dengan klik dua kali — semua fitur jalan, hanya Google Drive yang butuh server.

## Fitur

### Sudah ada (Tahap 1)

| Fitur | Keterangan |
|---|---|
| **Catatan pemasukan & pengeluaran** | Tanggal, nominal, dompet, kategori, catatan teks, struk |
| **Pindah dana antar dompet** | Jenis "Pindah Dana" — saldo asal turun, tujuan naik, total tidak berubah |
| **Upload struk/bukti bayar** | Foto/gambar struk disimpan langsung di data (maks 2 MB per berkas) |
| **Pilihan dompet/bank** | Tunai, Rekening Bank, E-Wallet + warna & ikon sendiri |
| **Tampilan saldo rekening** | Saldo per dompet + total di header |
| **Kategori** | 18 kategori bawaan (pemasukan & pengeluaran), bisa tambah/ubah/hapus |
| **Rekap transaksi** | Per hari, minggu, bulan, dan tahun |
| **Grafik pengeluaran vs pemasukan** | Diagram batang CSS, rentang 30 hari / 6 bulan / 12 bulan |
| **Grafik pengeluaran per kategori** | Proporsi tiap kategori |
| **Pencarian & filter** | Cari teks, filter jenis/dompet/kategori/periode |
| **Export / Import JSON** | Backup lengkap, bisa mode gabung atau ganti |
| **Export CSV** | Untuk dibuka di Excel / Google Sheets |
| **Backup ke Google Drive** | Opsional, perlu Client ID sendiri (lihat di bawah) |
| **Jalan di HP** | Tampilan responsif, sidebar bisa dibuka-tutup |

### Sudah ada (Tahap 2)

| Fitur | Keterangan |
|---|---|
| **Anggaran per kategori** | Batas pengeluaran bulanan atau tahunan, dengan bilah progres dan peringatan saat mendekati/melewati batas |
| **Target tabungan** | Target dana dengan tenggat opsional; aplikasi menghitung berapa yang perlu ditabung per bulan |
| **Tombol Nabung / Tarik** | Menambah atau mengurangi saldo target secara manual (tanpa mengubah saldo dompet, supaya tidak terhitung dua kali) |
| **Monitor langganan** | Netflix, Spotify, sewa domain, dll. Siklus bulanan / tahunan / mingguan, dinormalkan jadi biaya per bulan & per tahun |
| **Jatuh tempo & peringatan** | Daftar langganan yang jatuh tempo dalam 7 hari ke depan muncul di atas |
| **Tandai dibayar** | Sekali klik → membuat transaksi pengeluaran + penanda di catatan (`/sub:<id>/ <bulan>`), bisa dibatalkan |
| **Ringkasan dashboard** | Tiga kartu: pemakaian anggaran, total langganan, progres target |

### Sudah ada (Tahap 3) — banyak profil / akun

| Fitur | Keterangan |
|---|---|
| **Beberapa profil** | Pisahkan catatan, misalnya "Pribadi" dan "Usaha". Tiap profil punya dompet, kategori, transaksi, anggaran sendiri |
| **Profil tidak saling bocor** | Data disimpan di kunci `localStorage` yang berbeda per profil |
| **Sandi profil (opsional)** | Tiap profil bisa diberi sandi 4–8 angka |
| **Tombol 🔒 Kunci** | Mengunci catatan seketika; menu keuangan disembunyikan sampai sandi dimasukkan |
| **Layar sandi yang tidak bisa ditembus** | Klik di luar atau tekan Esc tidak akan menutup layar sandi |
| **Migrasi otomatis** | Data lama (sebelum ada profil) otomatis dipindah ke profil pertama bernama "Pribadi" — tidak ada yang hilang |
| **Hapus profil aman** | Wajib mengetik ulang nama profil; profil terakhir tidak bisa dihapus |

> **Catatan tentang sandi:** sandi ini hanya **penghalang supaya tidak dilihat orang yang lewat**, bukan keamanan sungguhan. Data tetap tersimpan di `localStorage` browser dan bisa dibaca lewat Developer Tools. Jangan pakai sandi yang sama dengan akun penting.

### Belum ada (rencana berikutnya)

- Grafik dengan Chart.js (interaktif, tooltip)
- Anggaran yang berulang otomatis tiap bulan (sekarang tinggal diubah manual)
- Akun yang benar-benar tersinkron antar-perangkat (butuh server; sekarang sinkron hanya lewat Export/Import atau Google Drive)

## Backup ke Google Drive (opsional, ~5 menit)

Aplikasi ini **tidak** punya server sendiri, jadi kamu perlu Client ID milikmu sendiri.
Gratis, dan data tetap di Drive-mu sendiri (folder tersembunyi `appDataFolder`).

1. Buka <https://console.cloud.google.com/>
2. Buat project baru, misalnya `savingduit`
3. Menu **APIs & Services → Library** → cari **Google Drive API** → **Enable**
4. Menu **APIs & Services → OAuth consent screen** → pilih **External** → isi nama app
   → di **Test users** tambahkan email Google-mu sendiri
5. Menu **APIs & Services → Credentials** → **Create credentials → OAuth client ID**
   → jenis **Web application**
   → di **Authorized JavaScript origins** tambahkan `http://localhost:8765`
6. Copy **Client ID** (akhiran `.apps.googleusercontent.com`)
7. Tempel di aplikasi → halaman **Pengaturan** → bagian **Google Drive**
8. Klik **Sambungkan** → izinkan → **Kirim ke Drive** / **Ambil dari Drive**

Kalau tidak mau repot, lewati saja — pakai **Unduh Backup** tiap bulan sudah aman.

## Struktur berkas

```
savingduit/
├── index.html          kerangka halaman
├── buka.bat            launcher Windows (server + buka browser)
├── server.js           server statis lokal (tanpa dependensi)
├── css/style.css       tema gelap, responsif
├── js/util.js          pembantu murni: format uang/tanggal, dll
├── js/store.js         skema data + seluruh perhitungan (murni, mudah dites)
├── js/gdrive.js        sambungan Google Drive (opsional)
├── js/views.js         semua halaman & form
├── js/app.js           router, simpan/muat, render
└── tests/
    ├── smoke.js          uji logika murni (269 pemeriksaan)
    ├── dom-test.js       uji UI dengan jsdom (301 pemeriksaan)
    ├── profile-test.js   uji multi-profil & sandi (86 pemeriksaan)
    └── browser-test.js   uji di Chrome sungguhan (133 pemeriksaan)
```

## Menjalankan tes

```bash
node tests/smoke.js                 # 269 pemeriksaan logika
node tests/profile-test.js          # 86 pemeriksaan profil & sandi

mkdir -p /tmp/sdtest && npm i jsdom --prefix /tmp/sdtest
NODE_PATH=/tmp/sdtest/node_modules node tests/dom-test.js   # 301 pemeriksaan UI

node tests/browser-test.js          # 133 pemeriksaan di Chrome sungguhan
```

`browser-test.js` penting: ia memeriksa hal yang **jsdom tidak bisa tangkap**,
misalnya cascade CSS dan apakah elemen benar-benar bisa diklik
(`elementFromPoint`). Lewati otomatis kalau Chrome tidak terpasang.

## Prinsip teknis

- **Uang disimpan sebagai bilangan bulat rupiah** — tidak ada galat pembulatan.
- **Tanggal disimpan sebagai teks `YYYY-MM-DD`** — tidak ada masalah zona waktu.
- **Minggu dimulai hari Senin.**
- **`store.js` murni**: semua fungsi hanya menerima data dan mengembalikan hasil,
  tanpa menyentuh DOM. Karena itu bisa diuji tanpa browser.
- **Lapisan penyimpanan terpisah** (`S.Persist`): sekarang localStorage,
  gampang diganti Google Drive tanpa mengubah kode lain.
- **Semua teks pengguna di-escape** sebelum masuk HTML (ada tes XSS).
- **Overlay modal dikendalikan kelas `.show`, bukan `display` langsung.**
  Menulis `display:grid` di `.modal-wrap` akan menimpa atribut `hidden` HTML
  (stylesheet bawaan browser prioritasnya paling lemah) sehingga overlay
  menutupi layar terus walau sudah diberi `hidden`. Ini bug nyata yang pernah
  terjadi; `tests/browser-test.js` sekarang menjaganya.