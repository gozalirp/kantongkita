# Database dan akun

[← Panduan aplikasi](../DOKUMENTASI.md) · [Keamanan dan migrasi](database-safety.md)

## Akses melalui Cloudflare

1. Login ke https://dash.cloudflare.com/ dan pilih akun pemilik proyek.
2. Buka **Storage & databases → D1 SQL Database**.
3. Pilih **savingduit-db**.
4. Gunakan **Studio** untuk melihat tabel atau **Console** untuk menjalankan query.

Nama/menu dashboard bisa berubah. Hak akses Cloudflare berbeda dari akun pengguna SavingDuit; jangan memberikan akses dashboard kepada pengguna biasa untuk melihat bukunya.

**Gunakan SELECT untuk pemeriksaan.** Jangan mengedit baris akun, keluarga, revisi, atau potongan buku secara manual. Simpan backup privat sebelum migrasi. Jangan membagikan tangkapan layar yang memuat email, hash, atau token.

## Tabel dan relasi

| Tabel | Kunci utama / relasi | Isi |
|---|---|---|
| `families` | `id` | Identitas keluarga |
| `family_users` | `id`; `family_id → families` | Username, hash password/recovery, peran |
| `family_sessions` | `token_hash`; `user_id → family_users` | Sesi login dan kedaluwarsa |
| `family_invites` | `token_hash`; keluarga unik | Undangan sekali pakai/kedaluwarsa |
| `family_data` | `family_id → families` | Revisi buku keluarga, penulis terakhir, JSON legacy |
| `family_data_parts` | `(family_id, idx)` | Potongan JSON buku keluarga |
| `personal_data` | `user_id → family_users` | Revisi buku pribadi |
| `personal_data_parts` | `(user_id, idx)` | Potongan JSON buku pribadi |
| `account_emails` | `user_id`; email unik | Email dan waktu verifikasi |
| `account_email_tokens` | `token_hash`; `(user_id, purpose)` unik | Hash token verifikasi/reset |
| `family_rate_limits` | `key_hash` | Jendela waktu dan jumlah percobaan |
| `family_activation` | `id = 1`; `family_id` unik | Struktur aktivasi lama |
| `sync_store` | `key` | Penyimpanan legacy; endpoint `/api/sync` diblokir |

Tabel `_cf_KV` adalah internal Cloudflare; jangan dimodifikasi untuk keperluan aplikasi. Indeks primary key dan UNIQUE biasanya dibuat SQLite secara otomatis, meskipun bukan indeks bernama buatan aplikasi.

```text
families ──< family_users ──< family_sessions
   │              ├──────── account_emails
   │              ├──────< account_email_tokens
   │              ├──────── personal_data
   │              └──────< personal_data_parts
   ├──────── family_data
   ├──────< family_data_parts
   └──────── family_invites
```

`UNIQUE(family_id, role)` membatasi satu owner dan satu partner per keluarga. Waktu autentikasi memakai detik Unix; `sync_store.updated_at` legacy memakai teks.

## Di mana transaksi disimpan?

Bukan di tabel `transactions`. Dompet, kategori, transaksi, anggaran, target, dan langganan menjadi koleksi JSON di buku. Baca potongan berdasarkan `idx`, gabungkan, lalu parse JSON. Nomor revisi disimpan di tabel induk.

- Buku keluarga: diidentifikasi `family_id`.
- Buku pribadi: diidentifikasi `user_id`, bukan `family_id`.
- Jangan menempelkan isi JSON keluarga ke buku pribadi, atau ID tampilan gabungan ke penyimpanan asli.
- Untuk melihat transaksi dalam tabel, lebih aman memakai Rekap atau ekspor Excel daripada mengedit potongan SQL.
- Password asli tidak dapat dibaca; hanya hash yang tersimpan. Token sesi/reset juga disimpan sebagai hash, bukan token asli.

## Query baca-saja

### Daftar akun tanpa rahasia autentikasi

```sql
SELECT username, role, family_id,
       datetime(created_at, 'unixepoch') AS dibuat_utc
FROM family_users
ORDER BY created_at DESC;
```

### Akun dan status email

Email merupakan data pribadi; jalankan hanya bila diperlukan.

```sql
SELECT u.username, u.role, e.email,
       CASE WHEN e.verified_at IS NOT NULL
            THEN 'Sudah' ELSE 'Belum' END AS email_terverifikasi
FROM family_users AS u
LEFT JOIN account_emails AS e ON e.user_id = u.id
ORDER BY u.created_at DESC;
```

### Jumlah akun dan buku

```sql
SELECT
  (SELECT COUNT(*) FROM family_users) AS akun,
  (SELECT COUNT(*) FROM families) AS keluarga,
  (SELECT COUNT(*) FROM personal_data) AS buku_pribadi,
  (SELECT COUNT(*) FROM family_data) AS buku_keluarga;
```

Jumlah baris keluarga tidak harus sama dengan jumlah keluarga beranggota: perpindahan anggota dapat meninggalkan baris historis. Jangan otomatis menghapusnya.

### Integritas relasi dan struktur

```sql
PRAGMA foreign_key_check;

SELECT name, sql
FROM sqlite_schema
WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%'
ORDER BY type, name;
```

Hasil kosong dari `foreign_key_check` berarti tidak ditemukan pelanggaran foreign key, bukan berarti seluruh isi JSON atau kalkulasi keuangan sudah valid.

## Migrasi dan retensi

Migrasi `0001`–`0004` membentuk struktur akun/buku/email. `0005_database_indexes.sql` menambahkan indeks tanpa menghapus data.

**Status saat dokumen diperbarui:** `0005` dan Worker dengan cron retensi belum diterapkan ke produksi. Detail kebijakan dan urutan backup → migrasi → deploy ada di [database-safety.md](database-safety.md).

Jangan mengganti struktur menjadi tabel transaksi terpisah tanpa rancangan migrasi, isolasi akun, kompatibilitas klien, backup, dan rencana pemulihan. Perubahan tersebut tidak diperlukan untuk sekadar merapikan tampilan ekspor.
