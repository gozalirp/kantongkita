/* Buat Word alur proyek tanpa mengubah aplikasi: node docs-build/gen-alur.cjs */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,HeadingLevel,Footer,PageNumber,AlignmentType,BorderStyle}=require('docx');
const blue='1E3A8A', ink='243247';
const sections=[];
const p=(text,opts={})=>new Paragraph({children:[new TextRun({text,font:'Calibri',size:22,color:ink})],spacing:{after:130,line:285},...opts});
const h=(text)=>new Paragraph({text,heading:HeadingLevel.HEADING_1,spacing:{before:120,after:220}});
const flow=(steps)=>new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:steps.map((s,i)=>new TableRow({children:[new TableCell({shading:{fill:i%2?'F3F4F6':'EAF1FC'},children:[p((i+1)+'. '+s,{alignment:AlignmentType.CENTER,spacing:{before:90,after:90}})]})]}))});
function table(headers,rows){return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[headers,...rows].map((r,i)=>new TableRow({tableHeader:i===0,children:r.map(t=>new TableCell({shading:{fill:i===0?blue:i%2?'F3F4F6':'FFFFFF'},borders:{bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'}},children:[new Paragraph({children:[new TextRun({text:t,font:'Calibri',size:20,bold:i===0,color:i===0?'FFFFFF':ink})],spacing:{before:70,after:70}})]}))}))});}
function page(title,content){sections.push({children:[h(title),...content]});}
page('SavingDuit — Alur Proyek',[
 p('Panduan alur pengguna, fitur, dan penyimpanan data',{spacing:{after:400}}),
 p('Aplikasi pencatatan keuangan pribadi dan keluarga untuk dua anggota. Dokumen ini menjelaskan perjalanan pengguna dari membuka aplikasi hingga menyimpan dan melihat catatan bersama.'),
 table(['Informasi','Keterangan'],[['Proyek','SavingDuit'],['Situs','https://savingduit.gozalirp.workers.dev'],['Dasar penyusunan','Kode proyek pada commit 9f4b2eb'],['Tanggal dokumen',new Date().toLocaleDateString('id-ID')],['Cakupan','Web/PWA; mode Pribadi dan Keluarga; autentikasi; transaksi; fitur keuangan; alur data.']]),
 p('Ringkasan utama',{heading:HeadingLevel.HEADING_2}),
 p('Mode Pribadi menyimpan catatan per profil pada browser dan dapat digunakan offline. Mode Keluarga menggunakan satu buku di server untuk maksimal dua akun, sehingga membutuhkan internet. Keduanya tidak digabung secara otomatis.'),
 p('Cara membaca: setiap bagan bernomor dibaca dari atas ke bawah. Cabang keputusan ditulis secara eksplisit dengan “Jika”. Dokumen menggambarkan implementasi saat ini, bukan rancangan fitur yang belum tersedia.')]);
page('1. Alur utama penggunaan',[
 flow(['Pengguna membuka situs atau PWA SavingDuit.','Aplikasi membaca pilihan mode terakhir pada perangkat.','Jika Pribadi: muat profil dan catatan dari localStorage; buka PIN bila profil terkunci. Bila sudah login, salinan perangkat kosong dapat diisi dari cloud.','Jika Keluarga: periksa sesi akun, lalu ambil buku bersama dan nomor revisinya dari API.','Dashboard menampilkan saldo, pemasukan/pengeluaran, anggaran, dan ringkasan dari buku aktif.','Pengguna memilih Transaksi, Dompet, Kategori, Anggaran, Target, Langganan, atau Rekap.','Setiap perubahan disimpan ke tujuan sesuai mode aktif.','Pengguna memeriksa hasil, membuat backup, atau berpindah mode.']),
 p('Jika sesi keluarga tidak valid atau server tidak dapat dijangkau, aplikasi menampilkan pemberitahuan. Data pribadi tidak boleh ditampilkan seolah-olah merupakan data keluarga.'),
 table(['Mode','Sumber data','Internet','Siapa yang bisa melihat'],[['Pribadi (tanpa login)','localStorage per profil di browser','Tidak wajib','Hanya pengguna perangkat itu'],['Pribadi (sudah login)','localStorage + salinan personal_data milik akun','Tidak wajib untuk mencatat','Hanya akun itu; anggota keluarga lain tidak bisa'],['Keluarga','Cloudflare Worker + D1 (family_data)','Wajib untuk memuat/menyimpan','Dua anggota keluarga yang sama']])]);
page('2. Alur akun dan keluarga',[
 p('A. Membuat akun pertama',{heading:HeadingLevel.HEADING_2}),
 flow(['Buka halaman akun → pilih Buat akun.','Isi username dan password minimal 12 karakter; tidak ada kode aktivasi.','Server membuat keluarga baru, akun pemilik, dan kode pemulihan.','Kode pemulihan tampil sekali di kartu yang sama, lalu pengguna menekan Masuk sekarang.','Pendaftaran berikutnya juga boleh: setiap akun baru mendapat keluarga dan buku sendiri.']),
 p('B. Menghubungkan pasangan',{heading:HeadingLevel.HEADING_2}),
 flow(['Pemilik masuk → Buat undangan pasangan.','Server menerbitkan kode undangan sekali pakai, berlaku 24 jam.','Pasangan memilih Punya kode undangan? → isi username/password sendiri dan kode undangan.','Server memvalidasi undangan dan menambahkan akun partner ke keluarga yang sama.','Pasangan menyimpan kode pemulihan, masuk, lalu membuka aplikasi dalam mode Keluarga.']),
 p('Maksimal dua anggota. Undangan baru menggantikan undangan lama. Anggota partner tidak dapat membuat undangan. Akun keluarga berbeda dari profil lokal browser.')]);
page('3. Alur masuk, pemulihan, dan pindah mode',[
 table(['Proses','Alur'],[['Masuk','Username + password → verifikasi hash di server → cookie sesi → baca identitas dan buku keluarga.'],['Lupa password','Pilih Lupa password? → username + kode pemulihan + password baru → validasi kode → ganti password dan kode pemulihan → hapus sesi lama → masuk kembali.'],['Logout','Kirim logout → hapus sesi server dan cookie → kembali ke formulir Masuk.'],['Pribadi → Keluarga','Tekan tombol mode → periksa sesi → jika belum masuk, tampilkan pesan → jika valid, muat buku dan revisi server.'],['Keluarga → Pribadi','Tekan tombol mode → ubah pilihan mode → muat kembali buku profil lokal tanpa menyalin data keluarga ke localStorage.']]),
 p('Bagan pindah mode',{heading:HeadingLevel.HEADING_2}),
 flow(['Tekan indikator Pribadi/Keluarga di kepala aplikasi.','Tentukan mode tujuan.','Jika tujuan Keluarga: pastikan akun sudah masuk dan internet tersedia.','Muat buku dari sumber yang sesuai.','Perbarui indikator mode dan render ulang halaman menggunakan App.db.']),
 p('Penting: tidak ada penggabungan otomatis antara buku pribadi dan keluarga. Pastikan mode aktif sebelum mencatat. Kehilangan password sekaligus kode pemulihan tidak dapat ditangani melalui email karena aplikasi tidak memakai email/OTP.')]);
page('4. Alur pencatatan dan fitur keuangan',[
 p('Transaksi',{heading:HeadingLevel.HEADING_2}),
 flow(['Pilih Catat transaksi.','Pilih jenis: pemasukan, pengeluaran, atau pindah dana.','Isi tanggal, nominal, dompet, kategori jika sesuai, dan catatan. Untuk pindah dana, tentukan dompet tujuan.','Validasi isian → tambahkan/perbarui transaksi pada buku aktif.','Simpan sesuai mode → hitung ulang saldo dan ringkasan halaman.','Dalam mode Keluarga, transaksi ditandai username pencatat.']),
 table(['Fitur','Alur singkat'],[['Dompet & Bank','Buat dompet dan saldo awal → gunakan pada transaksi → lihat saldo berdasarkan pergerakan dana.'],['Kategori','Kelola kategori pemasukan/pengeluaran → pilih pada transaksi → gunakan untuk pengelompokan laporan.'],['Anggaran','Tentukan kategori, periode, dan batas → bandingkan dengan pengeluaran → lihat progres penggunaan.'],['Target tabungan','Buat target dan nominal sasaran → catat progres/setoran → pantau pencapaian.'],['Langganan','Catat pembayaran berulang dan jatuh tempo → tandai pembayaran melalui fitur yang tersedia → pantau kewajiban berikutnya.'],['Rekap','Pilih periode/filter → hitung ringkasan dari buku aktif → lihat grafik/daftar → ekspor CSV bila diperlukan.']]),
 p('Perhitungan dilakukan oleh lapisan store dan view yang sama untuk kedua mode; sumber buku dan tujuan penyimpanannya yang berbeda.')]);
page('5. Alur penyimpanan dan konflik',[
 p('A. Penyimpanan Pribadi',{heading:HeadingLevel.HEADING_2}),
 flow(['Pengguna mengubah buku aktif.','App.save() memperbarui metadata.','Mode Pribadi: simpan ke localStorage dengan kunci profil (selalu berhasil, meski offline).','Jika sudah login: kirim salinan ke personal_data setelah jeda 1,2 detik.','Saat halaman ditutup, sisa perubahan dikirim langsung.','Render kembali tampilan. Backup dapat diunduh melalui Pengaturan.']),
 p('Lokal tetap sumber utama. Salinan cloud hanya untuk membuka catatan di perangkat lain, bukan pengganti backup unduhan.'),
 p('C. Buku Pribadi di Cloud',{heading:HeadingLevel.HEADING_2}),
 flow(['Akun masuk, lalu aplikasi memeriksa sesi dan nomor revisi buku pribadi.','Kirim POST /api/family/personal/save berisi revision dan book.','Server memeriksa sesi, bentuk buku, dan kecocokan revisi.','Revisi cocok: potongan isi diganti, revisi naik, balas 200.','Revisi berbeda: balas 409 dan salinan cloud TIDAK ditimpa.','Perangkat baru: bila catatan lokal masih kosong, isi cloud dimuatkan; bila sudah berisi, lokal dibiarkan.']),
 p('Kunci data buku pribadi adalah user_id, bukan family_id. Pasangan dalam satu keluarga tetap tidak dapat membaca isi buku pribadi satu sama lain.'),
 p('Bila salinan pribadi bentrok, aplikasi memberi tahu dan menyarankan mengunduh backup lokal lebih dulu. Perubahan tidak digabung otomatis.')]),
 p('B. Penyimpanan Keluarga',{heading:HeadingLevel.HEADING_2}),
 flow(['Ambil koleksi buku bersama dari App.db.','Kirim POST /api/family/save berisi revision dan book.','Server memeriksa sesi, bentuk data, dan revisi.','Revisi cocok: simpan buku ke D1 dan naikkan revisi; balas 200.','Revisi berbeda: tolak 409; klien menampilkan pesan lalu memuat buku server terbaru.','Jika offline/gagal: tampilkan perubahan belum tersimpan.']),
 p('Konflik bukan penggabungan otomatis. Perubahan klien yang ditolak tidak dianggap tersimpan dan dapat tergantikan saat versi server dimuat. Periksa buku terbaru sebelum mengulang perubahan.'),
 p('Buku keluarga disimpan dalam potongan teks 90.000 karakter di family_data_parts. Permintaan dibatasi 500.000 karakter; ini bukan kapasitas tanpa batas.')
page('6. Arsitektur dan peta data',[
 flow(['Browser/PWA menjalankan HTML, CSS dan JavaScript.','app.js mengelola App.db, navigasi, pemuatan dan penyimpanan.','views.js menyajikan antarmuka; store.js menyediakan pengelolaan data dan perhitungan.','Pribadi menuju localStorage per profil. Keluarga menuju API /api/family/*.','Cloudflare Worker memeriksa sesi dan memvalidasi permintaan.','Cloudflare D1 menyimpan akun, sesi, undangan, revisi, serta potongan buku.']),
 table(['Komponen','Isi/tanggung jawab'],[['Buku bersama','wallets, categories, transactions, budgets, goals, subscriptions.'],['Tidak dibagikan','Gambar struk dan pengaturan perangkat tidak dikirim melalui K.rakit().'],['families / family_users','Hubungan keluarga, identitas dan role owner/partner.'],['family_sessions / family_invites','Sesi dan undangan sekali pakai.'],['family_activation','Penanda buku lama; tidak lagi dipakai sebagai penjaga pendaftaran.'],['family_data / family_data_parts','Revisi, data lama, dan potongan buku bersama.'],['personal_data / personal_data_parts','Buku pribadi per akun (kunci user_id), tidak terlihat anggota keluarga lain.'],['/api/sync','Jalur sinkronisasi lama diblokir 503; bukan jalur keluarga aktif.']]),
 p('Halaman /keluarga juga memiliki formulir transaksi sederhana. Untuk fitur lengkap, pilih Buka aplikasi dan pastikan mode Keluarga aktif.')]);
page('7. Backup, keamanan, dan pemeriksaan',[
 p('Unduh backup melalui Pengaturan secara berkala. Periksa mode dan isi file sebelum menganggap semua buku sudah tercadangkan. Menghapus data situs dapat menghapus catatan pribadi lokal.'),
 p('Integrasi Google Drive memerlukan konfigurasi OAuth yang sesuai; dokumen ini tidak menganggapnya sudah aktif. Pengemasan APK juga perlu verifikasi tersendiri untuk jalur akun web.'),
 p('Password keluarga disimpan sebagai hash bersalt. Server memakai cookie sesi, pemeriksaan Origin pada POST dan pembatasan percobaan. PIN profil lokal berbeda dari password keluarga.'),
 p('Pendaftaran bersifat terbuka: siapa pun yang memegang alamat aplikasi boleh membuat akun, dan tiap akun mendapat buku catatannya sendiri (keluarga terpisah). Tabel family_activation tidak lagi menjadi penjaga pendaftaran; barisnya dipertahankan agar akun yang sudah ada tetap dapat masuk.'),
 table(['Skenario','Hasil yang diperiksa'],[['Offline pada Pribadi','Catatan lokal dapat ditambah dan dibuka kembali; salinan cloud tertunda.'],['Perangkat baru','Perangkat tanpa transaksi memuat salinan pribadi dari cloud; perangkat yang sudah berisi tidak ditimpa.'],['Buku pribadi dan pasangan','Pasangan melihat buku pribadi kosong dan tidak dapat membaca isi milik pasangannya.'],['Pindah dua arah','Data pribadi tidak tercampur dengan keluarga.'],['Dua anggota','Buku yang sama terlihat setelah memuat versi server terbaru.'],['Revisi basi','409 dan pemberitahuan; tidak diam-diam menimpa buku server.'],['Jaringan terputus','Jangan anggap perubahan tersimpan. Periksa server sebelum mengulang agar tidak dobel.'],['Keluarga kedua','Pendaftaran akun lain berhasil dan mendapat buku kosong sendiri; buku keluarga pertama tidak terlihat.']]),
 p('Rujukan: public/js/app.js, keluarga.js, keluarga-mode.js, store.js, views.js; worker/family.mjs, family-security.mjs, worker.js; worker/migrations/*.sql.'),
 p('Dokumen dibuat dari pembacaan kode. Penyusunan tidak membuat akun atau mengubah data produksi.')]);
const footer=new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'SavingDuit | Halaman ',size:18,color:'64748B'}),new TextRun({children:[PageNumber.CURRENT],size:18})]})]});
const doc=new Document({creator:'SavingDuit',title:'Alur Proyek SavingDuit',styles:{default:{document:{run:{font:'Calibri',size:22}}},paragraphStyles:[{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:32,bold:true,color:blue}}]},sections:sections.map(s=>({properties:{page:{size:{width:11906,height:16838},margin:{top:900,bottom:900,left:1000,right:1000}}},footers:{default:footer},children:s.children}))});
(async () => {
  const buf = await Packer.toBuffer(doc);
  assert(buf[0] === 0x50 && buf[1] === 0x4b);
  const out = path.resolve('documents/Alur_Proyek_SavingDuit.docx');
  fs.writeFileSync(out, buf);
  assert(buf.length > 10000);
  const kopi = path.join(process.env.USERPROFILE, 'Documents', 'Alur_Proyek_SavingDuit.docx');
  let tujuan = kopi;
  try { fs.copyFileSync(out, kopi); }
  catch (e) { tujuan = '(belum tersalin: ' + e.code + ')'; }
  console.log(out + '\n' + tujuan + '\n' + buf.length + ' bytes; ' + sections.length + ' bagian');
})().catch((e) => { console.error(e); process.exit(1); });
