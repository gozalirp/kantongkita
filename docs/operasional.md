# Operasional, deployment dan pemulihan

Runbook KantongKita, 23 Oktober 2026. Untuk operator yang telah mendapat izin. Dokumen tidak memberikan izin baru untuk menulis database produksi. Referensi [infrastruktur](infrastruktur.md), [alur](alur-aplikasi.md), [database safety](database-safety.md), [email](email-setup.md).

## 1. Peta akses dan persiapan

- GitHub: akses repo untuk source, push dan log/artifact Actions.
- Cloudflare: Worker, D1, domain/routing, secret dan logs sesuai role.
- DNS dan Resend: pengelolaan sender/email; credential disimpan privat.
- Lokal: Node/npm yang kompatibel; workflow APK menggunakan Node 20. Jalankan `npm install`, bukan `npm ci` karena repo belum memiliki package-lock.
- Jangan membagikan `.dev.vars`, `.env`, cookie, recovery code, dump SQL, atau output yang mengandung token. Backup privat tidak berada di repo/ZIP source.

## 2. Jalankan lokal

```bash
npm install
# Terapkan migrasi 0001 sampai 0005 secara berurutan ke D1 LOKAL.
# Perintah lengkap terdapat di panduan.md bagian pengembangan lokal.
npm run dev
npm test
npm run test:browser
```

Gunakan `--local` pada D1 untuk fixture. `npm start` hanya server Node lama port 8765 dan tidak mencerminkan semua API login Worker. Jangan membuat bypass autentikasi dalam `public/`. Jangan mengirim email pengujian ke orang nyata tanpa izin.

## 3. Checklist rilis frontend/backend

### Sebelum deploy

1. Periksa `git status`, diff dan tujuan perubahan; jangan memasukkan berkas sementara/credential.
2. Jalankan tes yang sesuai. Bila utilitas/icon/UI berubah jalankan `npm test` dan `npm run test:browser`; bila DB berubah jalankan juga uji safety lokal.
3. Perbarui docs dan versi cache `public/sw.js` bila aset berubah. Pastikan tidak ada demo/fixture/bypass di aset produksi.
4. Catat commit, Worker version produksi sebelum deploy, kebutuhan backup dan rencana rollback. Periksa `wrangler.toml`: resource, domain, binding dan vars.
5. Pastikan ada izin deploy. Izin push/commit tidak otomatis berarti izin migrasi/reset data.

### Deploy

```bash
npm run deploy
```

Wrangler mengunggah `public/` dan Worker. Bila autentikasi gagal, berhenti dan login resmi dengan persetujuan operator; jangan mengambil credential browser atau memakai jalur bypass. `npx wrangler login` membuka proses login resmi. Deploy ini **tidak menjalankan migrasi D1**.

### Sesudah deploy

- Simpan Worker version ID dari output deploy dan versi SW.
- GET `/api/health`: 200 berarti handler berjalan, bukan audit seluruh DB/login/email.
- Bandingkan aset yang berubah dengan source (byte/hash), bukan hanya status HTTP.
- GET `/api/family/me` tanpa cookie harus 401 saat fitur aktif. Jangan mencetak cookie untuk pengujian.
- Periksa tampilan responsif; nyatakan terpisah apakah HP fisik sudah diuji.
- Jangan melakukan transaksi/restore/reset fixture di buku produksi.
- Update status rilis docs serta arsip source bila diminta. Push dan build APK dicek terpisah.

## 4. Migrasi database: gerbang wajib

1. Review SQL dan cek skema/migrasi yang sudah ada secara baca-saja.
2. Dapatkan izin khusus migrasi. Deploy UI tidak menjadi izin menyentuh DB.
3. Simpan ekspor SQL dan titik Time Travel **di luar repo dan paket E**, batasi ACL, catat waktu dan checksum privat. Jangan menyalin dump ke chat.
4. Pastikan backup benar-benar berhasil. Auth error atau file error bukan backup.
5. Terapkan hanya SQL yang diperlukan; jangan ulang seluruh skema ke produksi atau menjalankan fixture.
6. Verifikasi FK/index/revisi yang relevan secara baca-saja. Catat hasil dan jangan menyebut FK check sebagai validasi semua nominal keuangan.

Migrasi 0005 indeks telah diterapkan pada 23 Oktober 2026. Tidak perlu diterapkan ulang untuk ikon hijau. Rincian batch/revision guard dan pemeriksaan ada di [database-safety.md](database-safety.md).

## 5. Rollback aplikasi

Rollback kode berbeda dengan restore data. Untuk bug UI/API tanpa kerusakan data:

1. Bekukan rilis berikutnya dan catat versi aktif/kejadian. Lindungi perubahan lokal pengguna sebelum menyarankan hapus cache/storage.
2. Pilih Worker deployment yang sebelumnya diketahui baik di Cloudflare Dashboard bagian deployments/versions; periksa aset dan binding terkait.
3. Dengan izin, gunakan fasilitas rollback deployment yang tersedia di dashboard. Jika memakai CLI, periksa `npx wrangler rollback --help` versi terpasang dahulu; jangan mengira commit Git otomatis menunjuk versi Worker.
4. Pastikan kode lama masih kompatibel dengan skema saat ini. Rollback tidak menjalankan down migration atau mengembalikan isi D1.
5. Verifikasi health, aset, status API dan PWA. Cache perangkat mungkin tertinggal; jangan langsung menghapus localStorage.
6. Catat target versi, alasan, hasil dan tindak lanjut source. Revert commit dapat dipakai untuk rilis perbaikan terkontrol, bukan menulis ulang history.

Tidak dilakukan rollback nyata saat penulisan dokumen ini.

## 6. Pemulihan data D1

Time Travel dan ekspor SQL adalah opsi operator, bukan tombol restore buku pengguna. Pemulihan D1 dapat mengembalikan akun, sesi, keanggotaan dan seluruh buku sekaligus serta membuang perubahan valid setelah titik pemulihan.

1. Hentikan perubahan berisiko dan tentukan cakupan, waktu kejadian, serta apakah pemulihan satu buku cukup.
2. Cadangkan keadaan saat ini sebelum tindakan pemulihan. Dapatkan persetujuan dampak kehilangan perubahan.
3. Periksa jendela retensi dan prosedur Time Travel Cloudflare yang berlaku pada akun; jangan mengasumsikan retensi tanpa batas. Untuk CLI periksa `npx wrangler d1 time-travel --help`.
4. Uji backup secara terisolasi terlebih dahulu bila memungkinkan. Jangan mengimpor dump ke DB produksi yang masih berisi tabel tanpa rencana jelas.
5. Jalankan restore hanya oleh operator berwenang, pada target yang sudah diperiksa, dalam jendela pemeliharaan yang disepakati.
6. Verifikasi skema, FK, revisi, akses akun dan buku terkait tanpa fixture finansial. Tinjau pembatalan sesi karena token lama dapat ikut kembali.
7. Catat hasil, celah data dan pemulihan perubahan sesudah titik restore.

Restore D1/Time Travel belum diuji end-to-end dalam sesi ini. Backup source E **tidak bisa** menggantikan backup D1 atau backup JSON pengguna.

## 7. Penanganan gangguan

| Gejala | Pemeriksaan aman | Jangan dilakukan |
|---|---|---|
| Health gagal/5xx | Domain, deployment, logs Worker dengan redaksi data, status Cloudflare | Reset DB untuk menguji |
| Health 200 tapi login gagal | Status API, origin, cookie host, sesi, flag FAMILY_ENABLED | Menganggap health membuktikan DB sehat |
| 401 | Login ulang di origin utama; backup perubahan lokal dulu | Cetak/bagikan cookie |
| 403 | Origin dan otorisasi/role/undangan | Matikan pemeriksaan origin |
| 409 saat simpan | Muat ulang versi terbaru, tinjau perubahan, input ulang | Paksa revision atau overwrite buku terbaru |
| 413 | Besar payload, lampiran/data buku | Memotong JSON/parts manual |
| 429 | Tunggu window 15 menit dan periksa pola request | Hapus limiter produksi secara massal |
| 503 keluarga | Flag fitur, konfigurasi dan gangguan runtime | Pindahkan ke /api/sync legacy |
| Email tidak datang | Kesiapan secret/sender, verifikasi email, spam, provider logs privat, cooldown | Sebut respons generik sebagai bukti kirim |
| Ikon/tampilan lama | SW aktif, versi aset dan cache browser | Hapus seluruh storage tanpa backup |
| Data keluarga tidak terlihat | Akun, anggota, sumber/filter dan hasil muat | Ganti diam-diam dengan buku pribadi |
| APK gagal | Actions/log/artifact, Capacitor dan API origin | Mengklaim push sama dengan APK siap rilis |

## 8. Cron dan monitoring

Cron `17 20 * * *` UTC (03:17 WIB hari berikutnya) menghapus maksimal 1.000 baris per tabel per run: sesi/token email yang kedaluwarsa lebih dari satu hari dan rate limit yang lebih tua dari tujuh hari. Tidak menghapus buku, akun, keluarga atau undangan. Jika backlog besar, pembersihan memerlukan beberapa run.

Scheduled handler sudah dideploy; eksekusi cron pertama belum diobservasi dalam bukti sesi. Periksa invocation/errors di Cloudflare dan agregat baca-saja jika perlu, tanpa manual cleanup. Repo belum membuktikan alert otomatis, uptime probe berkala, SLO atau backup terjadwal. Rekomendasi berikut bukan fitur yang sudah terpasang: probe health+API, notifikasi error dan anggaran biaya, jadwal backup privat, serta latihan restore terisolasi.

## 9. Paket source di drive E

`E:\KantongKita` adalah salinan bersih untuk serah-terima: source terpilih yang dilacak Git dan docs lokal terbaru, ditambah manifest hash serta ZIP dan checksum. Paket tidak membawa `.git`, `node_modules`, `.wrangler`, credential atau backup finansial. ZIP berisi source/docs, bukan dependency terpasang.

Penerima menjalankan `npm install`, menyiapkan akun/binding/secret sendiri, lalu mengikuti setup D1 lokal. Manifest mencatat commit basis serta fakta docs bisa lebih baru daripada commit; jangan menganggap arsip tanpa `.git` bisa langsung push. Perubahan dalam E tidak tersinkron otomatis kembali ke repo.

## 10. Catatan rilis dan bukti

| Rilis | Bukti/status |
|---|---|
| Rebrand | Worker `03ef9e32-4824-4001-841b-73bde5799067`, SW v49; historis |
| Ikon hijau | Commit `fe9eb7f`, dipush main; Worker `afa976b3-a9b1-4c8d-940f-5be11096672c`, SW v50; historis |
| QA ikon | npm test/DOM 366; browser 152; responsif 457 lolos saat perubahan |
| Verifikasi deploy | Dua PNG, util.js, CSS dan SW identik byte; health 200 |
| Dokumentasi ini | Perubahan docs dan paket E; bukan deploy atau tes ulang seluruh aplikasi |

Build APK setelah push terakhir belum dicek hasilnya di pekerjaan dokumentasi ini. HP fisik, visual Excel, email nyata, production concurrency dan pemulihan DB tetap ruang validasi terpisah.

## Rilis terbaru dan pembaruan cache

Lihat [rilis v54](rilis-v54.md) untuk Worker aktif, hasil tes dan verifikasi aset. Tutup/buka ulang aplikasi atau reload agar service worker baru aktif; jangan hapus data situs. Bila perubahan belum tampil, pastikan versi cache yang dimuat sebelum menyimpulkan fix gagal. Rilis ini tidak memperbarui ZIP E atau memicu build APK melalui push.
