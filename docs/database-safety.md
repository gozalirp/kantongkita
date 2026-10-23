# Perbaikan keamanan database

[← Struktur database](database.md) · [Panduan aplikasi](panduan.md)

**Status 23 Oktober 2026:** backup privat SQL + titik Time Travel tersimpan di luar repo; indeks `0005` dan Worker perbaikan DB sudah diterapkan. Versi Worker `4bdb20f9-0bb9-4c47-902b-512eb271516a`, SW `savingduit-v47`. Health 200, empat indeks terverifikasi, query sesi menggunakan indeks user, dan foreign_key_check tidak melaporkan pelanggaran. Cron terpasang; eksekusi terjadwal pertamanya belum diamati.

## Perubahan
- Simpan buku pribadi/keluarga: setiap DELETE/INSERT potongan memakai syarat revisi di dalam batch atomik yang sama. Penulis kalah menghasilkan 409 tanpa mengubah potongan. Tidak ada DELETE susulan setelah konflik.
- Endpoint `/api/family/transaction` lama mengembalikan 410; gunakan `/save` dengan buku lengkap dan revisi. UI saat ini sudah memakai jalur ini.
- Migrasi `0005_database_indexes.sql` hanya menambah indeks sesi user/expiry, token expiry, rate-limit window. Tidak mengubah isi buku.
- Cron harian 20:17 UTC membersihkan maksimal 1000 baris per tabel: sesi dan token yang sudah kedaluwarsa lebih dari sehari, serta rate-limit yang lebih tua dari tujuh hari. Undangan, akun, buku, keluarga kosong dan sync_store tidak dihapus.

## Prosedur penerapan produksi (rollout 23 Oktober 2026 selesai)
1. Simpan backup D1 di lokasi privat di luar repo dan catat titik pemulihan Time Travel. Backup berisi hash autentikasi dan data keuangan; jangan commit atau bagikan.
2. Jalankan migrasi indeks `0005_database_indexes.sql` pada D1 produksi setelah memeriksa daftar migrasi. Jangan mengulang migrasi destruktif atau mereset database.
   Perintah khusus indeks (hanya setelah backup dan persetujuan produksi):

   ```bash
   npx wrangler d1 execute savingduit-db --remote --file worker/migrations/0005_database_indexes.sql
   ```

3. Deploy Worker (cron ikut diaktifkan); cek health dan sesi tanpa menulis data pengguna.
4. Verifikasi indeks dengan EXPLAIN QUERY PLAN dan foreign_key_check. Pengujian tulis hanya memakai akun/DB uji khusus.

## Keluarga tanpa anggota
Sengaja dipertahankan. Ini bukan pelanggaran foreign key. Bisa menyimpan riwayat buku/undangan lama. Penghapusan memerlukan inventaris ketergantungan dan persetujuan spesifik; tidak masuk cron.

## Pengujian
`node tests/database-safety.mjs`: SQLite in-memory dengan batch transaction dan interleaving terkontrol. Menguji konflik sesudah pembacaan revisi, first-save race, rollback, endpoint lama, indeks, retensi, dan preservasi buku. Ini bukan benchmark atau pembuktian konkurensi runtime D1 produksi.

## Verifikasi baca-saja setelah penerapan

```sql
PRAGMA foreign_key_check;
EXPLAIN QUERY PLAN SELECT token_hash FROM family_sessions WHERE user_id = 'audit-no-user';
SELECT name FROM sqlite_schema WHERE type = 'index' AND name LIKE 'idx_%';
```

Pastikan pencarian sesi menggunakan `idx_family_sessions_user`. Jangan menguji konflik dengan mengubah buku pengguna produksi. Pemulihan Worker lama tidak otomatis memulihkan data; pemulihan D1 harus diputuskan terpisah dan mempertimbangkan penulisan setelah titik backup.
