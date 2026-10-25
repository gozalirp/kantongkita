# Native QA — 25 Oktober 2026

**Release gate: FAIL / belum final.** Checklist ini menilai implementasi Kotlin, bukan layar mockup HTML. Tidak ada deployment atau akses data produksi.

## Cakupan22 fitur

| ID | Status aktual / bukti dan gap |
|---|---|
| P01 | BELUM: login/daftar dan sesi native tidak tersedia. |
| P02 | BELUM: recovery/email/token native tidak tersedia. |
| P03 | SEBAGIAN: saldo dan donut ada; tren/range/golden fixture chart dan perangkat belum diverifikasi. |
| P04 | SEBAGIAN: daftar/pencarian ada; kombinasi filter lengkap/pelaku/back belum lulus QA. |
| P05 | SEBAGIAN: model CRUD/transfer/regresi unit lulus; UI keyboard/rotasi/process death belum diuji. |
| P06 | BELUM: file struk SAF/gambar/PDF belum tersedia. |
| P07 | SEBAGIAN: dompet CRUD/arsip/guard referensi ada; UI dan parity ikon belum tuntas. |
| P08 | SEBAGIAN: kategori CRUD/arsip/guard referensi ada; UI belum teruji perangkat. |
| P09 | SEBAGIAN: rekap sederhana; periode/golden lintas TZ belum tuntas. |
| P10 | SEBAGIAN: skema limit/period dan CRUD ada; penggunaan/sisa/periode belum lengkap. |
| P11 | SEBAGIAN: CRUD/nabung/tarik model lulus; UI dan deadline belum lulus acceptance. |
| P12 | SEBAGIAN: CRUD/aktif ada; engine due mingguan/tahunan dan ekuivalen belum parity. |
| P13 | SEBAGIAN: bayar/undo dan collision ID dites; penanda masih bulanan, siklus lain belum diterima. |
| P14 | BELUM: profil/PIN/avatar native. |
| P15 | BELUM: akun/anggota/invite/join native. |
| P16 | SEBAGIAN: database scoped/CAS ada; pemilih buku autentikasi dan gabungan belum ada. |
| P17 | BELUM: selective sharing catatan lama lintas buku. |
| P18 | BELUM: transport/outbox/session/retry/UI conflict; utility merge dan persistence bukan sync internet. |
| P19 | BELUM: ekspor file XLSX/CSV/JSON native. |
| P20 | BELUM: SAF import/preview/backup rollback native. |
| P21 | BELUM: reset pribadi terkonfirmasi dan pengaman pending. |
| P22 | BELUM diverifikasi: penanda Drive nonaktif di pengaturan native. |

## Bug ditemukan dan diperbaiki pada putaran ini

1. Pembayaran langganan memakai `saveTransaction()` yang merupakan upsert: ID pembayaran bentrok bisa mengganti transaksi lama. Sekarang ID pembayaran wajib baru; regresi lulus.
2. `SyncDraft` menerima revisi negatif, snapshot remote tanpa pasangan revisi dan revisi mundur. Constructor sekarang menolak state tersebut.
3. Respons GET lebih lama bisa menggantikan snapshot konflik yang lebih baru; isi berbeda pada revisi sama juga diterima. Sekarang ditolak tanpa mutasi.
4. Mengedit local kembali ke base setelah409 membuat flag konflik hilang walau remote belum diselesaikan. Konflik kini tetap terkunci sampai resolusi eksplisit.
5. ACK bisa melompati revisi basis. Sekarang harus tepat basis+1, sesuai kontrak full-book revision. Belum bukti respons transport terikat request: transport belum ada.
6. Startup membaca database legacy setiap kali meski migrasi sudah selesai. Setelah marker sukses, startup hanya membaca scoped DB; legacy rusak tidak lagi menghalangi startup. Regresi Robolectric lulus.
7. Merge independen bisa menghasilkan referensi rusak (hapus dompet vs transaksi baru, ubah tipe kategori vs transaksi baru). Hasil merge kini divalidasi dengan BookJson/Book.validate; jika invalid, `merged=null` dan konflik `/validation`. Metadata unknown tetap pada raw JSON, bukan di-reencode dari model.

## Bukti tes

- Lima tes regresi pertama gagal sebelum fix: `.tools/qa-red.log` (27 tests,5 failures).
- Sesudah fix + validasi merge: **30 tes native lulus**, `assembleDebug` dan `lintDebug` sukses: `.tools/qa-native.log`.
- `npm test` lulus: `.tools/qa-web.log`. Ini suite lokal, bukan seluruh alur browser/produksi.
- `adb devices`: tidak ada perangkat terhubung. Tidak ada bukti TalkBack, font200%, perangkat kecil, keyboard, rotasi, Doze atau dua-perangkat E2E.
- Tidak menerbitkan APK baru sebagai final; hasil unit/build bukan acceptance semua fitur.

## Blocker utama sebelum final

Fitur BELUM pada matriks wajib diimplementasikan, serializer model belum menyimpan seluruh metadata web sehingga dilarang mengirim hasil roundtrip model ke cloud, pengujian kontrak/staging dan perangkat nyata belum berjalan. Perubahan web409 sebelumnya masih memory-only dan family draft-loss belum selesai. Tidak ada janji bahwa aplikasi sedang dikerjakan di background setelah sesi balasan berhenti.
