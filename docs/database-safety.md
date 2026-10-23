# Perbaikan keamanan database

## Perubahan
- Simpan buku pribadi/keluarga: setiap DELETE/INSERT potongan memakai syarat revisi di dalam batch atomik yang sama. Penulis kalah menghasilkan 409 tanpa mengubah potongan. Tidak ada DELETE susulan setelah konflik.
- Endpoint `/api/family/transaction` lama mengembalikan 410; gunakan `/save` dengan buku lengkap dan revisi. UI saat ini sudah memakai jalur ini.
- Migrasi `0005_database_indexes.sql` hanya menambah indeks sesi user/expiry, token expiry, rate-limit window. Tidak mengubah isi buku.
- Cron harian 20:17 UTC membersihkan maksimal 1000 baris per tabel: sesi dan token yang sudah kedaluwarsa lebih dari sehari, serta rate-limit yang lebih tua dari tujuh hari. Undangan, akun, buku, keluarga kosong dan sync_store tidak dihapus.

## Penerapan produksi (belum dijalankan oleh perubahan kode)
1. Simpan backup D1 di lokasi privat di luar repo dan catat titik pemulihan Time Travel. Backup berisi hash autentikasi dan data keuangan; jangan commit atau bagikan.
2. Jalankan migrasi indeks `0005_database_indexes.sql` pada D1 produksi setelah memeriksa daftar migrasi. Jangan mengulang migrasi destruktif atau mereset database.
3. Deploy Worker (cron ikut diaktifkan); cek health dan sesi tanpa menulis data pengguna.
4. Verifikasi indeks dengan EXPLAIN QUERY PLAN dan foreign_key_check. Pengujian tulis hanya memakai akun/DB uji khusus.

## Keluarga tanpa anggota
Sengaja dipertahankan. Ini bukan pelanggaran foreign key. Bisa menyimpan riwayat buku/undangan lama. Penghapusan memerlukan inventaris ketergantungan dan persetujuan spesifik; tidak masuk cron.

## Pengujian
`node tests/database-safety.mjs`: SQLite in-memory dengan batch transaction dan interleaving terkontrol. Menguji konflik sesudah pembacaan revisi, first-save race, rollback, endpoint lama, indeks, retensi, dan preservasi buku. Ini bukan benchmark atau pembuktian konkurensi runtime D1 produksi.
