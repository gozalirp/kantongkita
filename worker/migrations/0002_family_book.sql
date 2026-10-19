-- Buku keluarga bisa tumbuh melewati batas satu pernyataan SQL D1 (~100 KB),
-- jadi isinya disimpan sebagai beberapa potongan di tabel terpisah.
-- family_data tetap dipakai untuk nomor revisi; data lamanya diabaikan
-- (saat ini belum ada buku keluarga di produksi).
CREATE TABLE IF NOT EXISTS family_data_parts (
 family_id TEXT NOT NULL REFERENCES families(id),
 idx INTEGER NOT NULL,
 chunk TEXT NOT NULL,
 PRIMARY KEY (family_id, idx)
);
