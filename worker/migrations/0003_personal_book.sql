-- Buku pribadi per akun, terpisah dari buku keluarga.
-- Kuncinya user_id (bukan family_id), jadi anggota lain dalam satu keluarga
-- tidak bisa membaca isi buku ini meskipun mereka berbagi keluarga yang sama.
-- Isi dipecah seperti buku keluarga karena D1 membatasi ukuran satu nilai teks.
CREATE TABLE IF NOT EXISTS personal_data (
 user_id TEXT PRIMARY KEY REFERENCES family_users(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS personal_data_parts (
 user_id TEXT NOT NULL REFERENCES family_users(id) ON DELETE CASCADE,
 idx INTEGER NOT NULL,
 chunk TEXT NOT NULL,
 PRIMARY KEY (user_id, idx)
);
