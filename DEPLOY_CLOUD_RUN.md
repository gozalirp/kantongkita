# Panduan Deploy SavingDuit ke Google Cloud Run + Custom Domain

SavingDuit sudah siap dideploy ke **Google Cloud Run (Free Tier)** sebagai server cloud yang aktif 24 jam nonstop.

---

## 1. Persiapan Singkat (Hanya 1 Kali)

Pastikan kamu sudah menginstall **Google Cloud SDK / CLI (`gcloud`)** di laptop:
- Download installer resmi: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
- Setelah terinstall, buka Terminal / PowerShell dan ketik:
  ```bash
  gcloud auth login
  gcloud config set project savingduit
  ```

---

## 2. Deploy ke Cloud Run (Cukup 1 Baris Perintah!)

Buka Terminal di folder proyek `C:\Users\gozali.rahman\Project\savingduit`, lalu jalankan:

```bash
gcloud run deploy savingduit --source . --region asia-southeast2 --allow-unauthenticated
```
*(Catatan: `asia-southeast2` adalah region data center Google di **Jakarta** — koneksinya super cepat dan latensinya rendah!)*

Tunggu sekitar 1–2 menit sampai proses selesai. Kamu akan langsung mendapatkan **URL Server Resmi**, contoh:
`https://savingduit-xxxxxx-et.a.run.app`

---

## 3. Pasang Domain Pribadi ke Cloud Run

Supaya bisa diakses pakai nama domain kamu sendiri (misal `duit.namadomainkamu.com`):

1. Buka [Google Cloud Console — Cloud Run](https://console.cloud.google.com/run).
2. Klik nama layanan: **`savingduit`**.
3. Di tab navigasi atas atau tombol titik tiga, pilih **Manage Custom Domains** (Kelola Domain Kustom).
4. Klik **Add Mapping** (Tambahkan Pemetaan):
   - Pilih service: `savingduit`
   - Masukkan nama domain/subdomain kamu (contoh: `duit.namadomainkamu.com`).
5. Google Cloud akan menampilkan baris **DNS Record** (biasanya tipe `CNAME` yang mengarah ke `ghs.googlehosted.com`).
6. Masuk ke tempat kamu membeli domain (atau dashboard Cloudflare), lalu tambahkan CNAME Record tersebut.
7. Tunggu beberapa menit — domain kamu langsung aktif ber-HTTPS (SSL gembok hijau resmi dari Google).

---

## 4. Fitur Cloud Sync Bawaan

Server SavingDuit di Cloud Run sudah dilengkapi endpoint otomatis:
- `GET /api/sync` : Menarik data terbaru ke HP/laptop
- `POST /api/sync` : Menyimpan transaksi baru ke cloud
- `GET /api/health` : Pemeriksaan server otomatis
