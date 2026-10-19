/* ============================================================
   gen-docx.js — pembuat Dokumentasi Proyek SavingDuit (.docx)
   Jalankan: node docs-build/gen-docx.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, Footer, PageNumber, TabStopType, TabStopPosition, VerticalAlign
} = require('docx');

const OUT_DIR = 'C:/Users/gozali.rahman/Documents';
const OUT_FILE = path.join(OUT_DIR, 'Dokumentasi_Proyek_SavingDuit.docx');
const SHOTS = path.join(__dirname);

/* ---------- Palet ---------- */
const C = {
  biru: '1D4ED8', biruMuda: '2563EB', biruBg: 'DBEAFE', biruTua: '1E3A8A',
  teks: '1F2937', abu: '6B7280', abuBg: 'F3F4F6', abuGaris: 'D1D5DB',
  hijau: '059669', hijauBg: 'ECFDF5', hijauGaris: '10B981',
  kuning: 'B45309', kuningBg: 'FFFBEB', kuningGaris: 'F59E0B',
  merah: 'B91C1C', merahBg: 'FEF2F2', merahGaris: 'EF4444',
  putih: 'FFFFFF'
};
const FONT = 'Calibri';
const MONO = 'Consolas';

/* ---------- Pembantu penulisan ---------- */
const R = (text, o = {}) => new TextRun({
  text, font: o.font || FONT, size: o.size || 21,
  bold: !!o.bold, italics: !!o.italics, color: o.color || C.teks
});

const P = (children, o = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [children],
  alignment: o.align,
  spacing: { before: o.before == null ? 0 : o.before, after: o.after == null ? 120 : o.after, line: o.line || 276 },
  indent: o.indent ? { left: o.indent } : undefined,
  border: o.border
});

const para = (text, o = {}) => P([R(text, o)], o);

/* Judul bab: ada nomor + garis bawah tipis */
function h1(text) {
  return new Paragraph({
    children: [R(text, { size: 30, bold: true, color: C.biru })],
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: C.biruBg, space: 6 } },
    keepNext: true
  });
}
function h2(text) {
  return new Paragraph({
    children: [R(text, { size: 24, bold: true, color: C.biruMuda })],
    spacing: { before: 260, after: 110 }, keepNext: true
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    children: [R(text)],
    bullet: { level },
    spacing: { before: 0, after: 70, line: 276 }
  });
}
/* Butir dengan awalan tebal: "**Label** — isi" */
function bulletB(label, text) {
  return new Paragraph({
    children: [R(label, { bold: true }), R(' — ' + text)],
    bullet: { level: 0 },
    spacing: { before: 0, after: 70, line: 276 }
  });
}

/* Blok kode: tabel satu sel dengan latar abu */
function code(lines, o = {}) {
  const arr = Array.isArray(lines) ? lines : String(lines).split('\n');
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris },
      left: { style: BorderStyle.SINGLE, size: 18, color: C.biru },
      right: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris }
    },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: o.fill || C.abuBg },
        margins: { top: 130, bottom: 130, left: 180, right: 140 },
        children: arr.map((l, i) => new Paragraph({
          children: [new TextRun({ text: l === '' ? ' ' : l, font: MONO, size: 17, color: o.color || '111827' })],
          spacing: { before: 0, after: i === arr.length - 1 ? 0 : 10, line: 240 }
        }))
      })]
    })]
  });
}

/* Kotak sorotan (catatan / peringatan / tips) */
function callout(kind, title, text) {
  const map = {
    info: { bg: C.biruBg, garis: C.biru, judul: C.biruTua, ikon: 'ℹ️' },
    tip: { bg: C.hijauBg, garis: C.hijauGaris, judul: C.hijau, ikon: '✅' },
    warn: { bg: C.kuningBg, garis: C.kuningGaris, judul: C.kuning, ikon: '⚠️' },
    danger: { bg: C.merahBg, garis: C.merahGaris, judul: C.merah, ikon: '⛔' }
  }[kind];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: map.garis },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: map.garis },
      left: { style: BorderStyle.SINGLE, size: 18, color: map.garis },
      right: { style: BorderStyle.SINGLE, size: 4, color: map.garis }
    },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: map.bg },
        margins: { top: 130, bottom: 130, left: 180, right: 160 },
        children: [
          new Paragraph({
            children: [R(map.ikon + '  ' + title, { bold: true, size: 21, color: map.judul })],
            spacing: { before: 0, after: 70 }
          }),
          new Paragraph({
            children: [R(text, { size: 20 })],
            spacing: { before: 0, after: 0, line: 270 }
          })
        ]
      })]
    })]
  });
}

/* Sel tabel isi */
function sel(text, o = {}) {
  const isi = Array.isArray(text) ? text : [text];
  return new TableCell({
    width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: isi.map((t, i) => (typeof t === 'string'
      ? new Paragraph({
          children: [new TextRun({
            text: t, font: o.mono ? MONO : FONT, size: o.size || 19,
            bold: o.bold, color: o.color || C.teks
          })],
          spacing: { before: 0, after: i === isi.length - 1 ? 0 : 40, line: 250 }
        })
      : t))
  });
}

/* Tabel data: headers = [], rows = [[...]], widths = [] persen */
function table(headers, rows, widths) {
  const head = new TableRow({
    tableHeader: true,
    children: headers.map((hd, i) => sel(hd, {
      width: widths ? widths[i] : undefined, fill: C.biruTua, bold: true, color: C.putih, size: 19
    }))
  });
  const body = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => {
      if (c && typeof c === 'object' && !Array.isArray(c) && c.raw) return c.raw;
      return sel(c, {
        width: widths ? widths[i] : undefined,
        fill: ri % 2 === 1 ? 'F8FAFC' : C.putih
      });
    })
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris },
      left: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris },
      right: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris }
    },
    rows: [head, ...body]
  });
}

/* Spasi kosong */
const gap = (n = 140) => new Paragraph({ children: [], spacing: { before: 0, after: n } });

/* Gambar + keterangan */
function gambar(file, lebar, tinggi, caption) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) return para('(gambar tidak ditemukan: ' + file + ')', { italics: true, color: C.abu, size: 18 });
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [new ImageRun({
        type: 'png', data: fs.readFileSync(p),
        transformation: { width: lebar, height: tinggi }
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 220 },
      children: [R(caption, { size: 17, italics: true, color: C.abu })]
    })
  ];
}

/* Dua gambar berdampingan dalam tabel tanpa garis */
function gambar2(kiri, kanan) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
    },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 0, bottom: 0, left: 0, right: 100 },
          children: gambar(kiri[0], 228, 494, kiri[1])
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          margins: { top: 0, bottom: 0, left: 100, right: 0 },
          children: kanan ? gambar(kanan[0], 228, 494, kanan[1])
            : [new Paragraph({ children: [], spacing: { after: 0 } })]
        })
      ]
    })]
  });
}

/* ============================================================
   ISI DOKUMEN
   ============================================================ */
const isi = [];

/* ---------- Halaman judul ---------- */
isi.push(
  new Paragraph({ children: [], spacing: { before: 1400, after: 0 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: '💸', font: FONT, size: 96 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
    children: [R('SavingDuit', { size: 72, bold: true, color: C.biru })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
    children: [R('Aplikasi Pencatat Keuangan Pribadi', { size: 30, color: C.teks })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 420 },
    children: [R('Web  ·  PWA  ·  Android (APK)', { size: 22, color: C.abu })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: C.biruBg, space: 10 } },
    children: [R('DOKUMENTASI PROYEK', { size: 26, bold: true, color: C.biruMuda })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
    children: [R('Arsitektur  ·  Struktur Kode  ·  Pemasangan  ·  Penyebaran', { size: 20, color: C.abu })]
  }),
  new Paragraph({ children: [], spacing: { before: 0, after: 900 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
    children: [R('Disusun: 19 Oktober 2026', { size: 20, color: C.abu })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
    children: [R('Versi dokumen 1.0 · commit e572a89', { size: 19, color: C.abu })]
  }),
  new Paragraph({ children: [], pageBreakBefore: true })
);

/* ---------- Daftar isi ---------- */
isi.push(h1('Daftar Isi'));
const toc = [
  ['1.', 'Ringkasan Proyek'],
  ['2.', 'Daftar Fitur'],
  ['3.', 'Arsitektur Aplikasi'],
  ['4.', 'Pemisahan Frontend dan Backend'],
  ['5.', 'Struktur Folder'],
  ['6.', 'Bagian Frontend — public/'],
  ['7.', 'Bagian Backend — worker/'],
  ['8.', 'Teknologi yang Digunakan'],
  ['9.', 'Menjalankan di Komputer Lokal'],
  ['10.', 'Penyebaran (Deploy) ke Cloudflare'],
  ['11.', 'Membuat APK Android'],
  ['12.', 'Pengujian Otomatis'],
  ['13.', 'Tampilan Aplikasi'],
  ['14.', 'Catatan Penting & Rencana Lanjutan'],
  ['15.', 'Informasi Proyek']
];
toc.forEach(function (t) {
  isi.push(new Paragraph({
    children: [R(t[0] + '\t' + t[1], { size: 21 })],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { before: 0, after: 90 }
  }));
});

/* ---------- 1. Ringkasan ---------- */
isi.push(h1('1. Ringkasan Proyek'));
isi.push(para('SavingDuit adalah aplikasi pencatat keuangan pribadi yang berjalan sepenuhnya di peramban milik pengguna. Seluruh data keuangan disimpan lebih dahulu di perangkat (localStorage) sehingga aplikasi tetap bisa dipakai tanpa sambungan internet dan terasa instan saat menyimpan transaksi. Sebagai cadangan sekaligus penghubung antar perangkat, data juga dikirim otomatis ke basis data serverless Cloudflare D1 di latar belakang.'));
isi.push(para('Dari satu kode sumber yang sama, aplikasi tersedia dalam tiga bentuk:'));
isi.push(bulletB('Situs web', 'dibuka langsung lewat peramban di https://savingduit.gozalirp.workers.dev'));
isi.push(bulletB('PWA (Progressive Web App)', 'dapat "Dipasang" dari peramban HP sehingga muncul seperti aplikasi biasa'));
isi.push(bulletB('APK Android', 'berkas siap pasang untuk dipasang langsung ke HP Android'));
isi.push(gap(80));
isi.push(table(
  ['Bagian', 'Keterangan'],
  [
    ['Nama aplikasi', 'SavingDuit'],
    ['Jenis', 'Aplikasi pencatat keuangan pribadi (personal finance tracker)'],
    ['Bahasa antarmuka', 'Indonesia'],
    ['Platform', 'Web, PWA, dan Android (APK)'],
    ['Cara pakai', 'Offline-first — data disimpan di perangkat lebih dahulu'],
    ['Cadangan data', 'Cloudflare D1 (otomatis) dan Google Drive (manual, opsional)'],
    ['Keamanan', 'PIN/sandi per profil, pemisahan data antar profil'],
    ['Status', 'Aktif dan sudah tayang di alamat produksi'],
    ['Jumlah baris kode', '± 4.541 baris (frontend 4.380 + backend 222, di luar test)']
  ],
  [30, 70]
));
isi.push(gap(160));

/* ---------- 2. Fitur ---------- */
isi.push(h1('2. Daftar Fitur'));
isi.push(para('Aplikasi memiliki sepuluh halaman utama yang dapat dicapai dari bilah navigasi bawah pada layar HP.'));
isi.push(gap(60));
isi.push(table(
  ['Halaman', 'Isi'],
  [
    ['📊 Dashboard', 'Saldo total, ringkasan pemasukan dan pengeluaran bulan berjalan, grafik pengeluaran per kategori, daftar anggaran, dan ringkasan target tabungan.'],
    ['📝 Catatan Transaksi', 'Mencatat pemasukan, pengeluaran, dan pemindahan dana antar dompet. Dilengkapi pencarian, penyaringan, serta ubah dan hapus.'],
    ['📅 Rekap Transaksi', 'Rekapitulasi per bulan dan per kategori, grafik tren, perbandingan pemasukan dan pengeluaran.'],
    ['🎯 Anggaran per Kategori', 'Menetapkan batas pengeluaran bulanan atau tahunan untuk tiap kategori, dengan indikator pemakaian dan peringatan bila hampir atau sudah terlampaui.'],
    ['🏆 Target Tabungan', 'Menetapkan target dana beserta tenggat, lalu aplikasi menghitung berapa yang perlu ditabung setiap bulan. Tersedia tombol menabung dan menarik dana.'],
    ['🔁 Langganan Bulanan', 'Mencatat langganan berulang (misalnya layanan streaming atau internet rumah) beserta tanggal jatuh tempo, supaya tidak terlewat.'],
    ['🏦 Dompet & Bank', 'Beberapa dompet sekaligus (tunai, rekening bank, e-wallet) dengan saldo awal dan warnanya masing-masing.'],
    ['🏷️ Kategori', 'Kategori bawaan untuk pemasukan dan pengeluaran, dapat ditambah, diubah, diarsipkan, atau dihapus.'],
    ['⚙️ Pengaturan', 'Cadangan dan pemulihan, sinkronisasi Cloudflare D1, sambungan Google Drive, serta informasi versi aplikasi.'],
    ['👤 Profil', 'Beberapa profil dalam satu perangkat, masing-masing dengan data yang benar-benar terpisah dan PIN sendiri.']
  ],
  [26, 74]
));
isi.push(gap(140));
isi.push(h2('2.1 Kemampuan Lain'));
isi.push(bullet('Multi-profil dengan pemisahan data total — satu profil tidak bisa melihat data profil lain.'));
isi.push(bullet('PIN atau sandi per profil, beserta mode terkunci yang menyembunyikan menu berisi data keuangan.'));
isi.push(bullet('Foto struk sebagai lampiran transaksi, tersimpan lokal di perangkat.'));
isi.push(bullet('Ekspor dan impor cadangan dalam berkas JSON.'));
isi.push(bullet('Cadangan opsional ke Google Drive memakai OAuth Client ID milik pengguna sendiri.'));
isi.push(bullet('Sinkronisasi latar belakang otomatis ke Cloudflare D1, dengan indikator keadaan sambungan pada bilah atas.'));
isi.push(bullet('Tampilan khusus HP: bilah navigasi bawah, tombol melayang untuk mencatat cepat, efek kartu kaca, dan animasi sentuh.'));
isi.push(bullet('Dapat dipasang sebagai aplikasi (PWA) maupun dipasang sebagai APK Android.'));
isi.push(gap(160));

/* ---------- 3. Arsitektur ---------- */
isi.push(h1('3. Arsitektur Aplikasi'));
isi.push(para('SavingDuit memakai pendekatan hybrid offline-first. Artinya, saat pengguna mencatat sesuatu, aplikasi tidak menunggu balasan dari server — data langsung ditulis ke perangkat, lalu dikirim ke server di belakang layar. Hasilnya aplikasi terasa cepat dan tetap berfungsi saat internet mati.'));
isi.push(gap(40));
isi.push(h2('3.1 Alur Data'));
isi.push(code([
  '        PERANGKAT PENGGUNA  (HP Android / Laptop)',
  '  ┌────────────────────────────────────────────────────┐',
  '  │  public/   index.html  +  css/style.css  +  js/*   │',
  '  │                                                    │',
  '  │   (1) Pengguna mencatat transaksi                  │',
  '  │            │                                       │',
  '  │            ▼                                       │',
  '  │   (2) localStorage  ── tersimpan SEKETIKA, tanpa   │',
  '  │            │            menunggu jaringan          │',
  '  │            ▼                                       │',
  '  │   (3) Sinkron latar belakang (1,5 detik kemudian)  │',
  '  └───────────────────┬────────────────────────────────┘',
  '                      │  HTTP  /api/sync',
  '                      ▼',
  '        CLOUDFLARE EDGE  (server terdekat, Jakarta)',
  '  ┌────────────────────────────────────────────────────┐',
  '  │  worker/worker.js                                  │',
  '  │     GET  /api/health   memeriksa status            │',
  '  │     GET  /api/sync     mengambil data tersimpan    │',
  '  │     POST /api/sync     menyimpan data              │',
  '  │            │                                       │',
  '  │            ▼                                       │',
  '  │  D1 (basis data SQL)                               │',
  '  │     tabel  sync_store   ──  key = \'main_data\'      │',
  '  └────────────────────────────────────────────────────┘'
]));
isi.push(gap(120));
isi.push(callout('info', 'Mengapa data disimpan di perangkat lebih dahulu?',
  'Agar aplikasi tidak pernah macet menunggu jaringan. Bila internet sedang mati, pengguna tetap bisa mencatat transaksi seperti biasa; data akan menyusul terkirim begitu sambungan pulih. Indikator pada bilah atas akan menunjukkan "Cloudflare Aktif" atau "Offline (Lokal)".'));
isi.push(gap(140));

/* ---------- 4. Pemisahan Frontend & Backend ---------- */
isi.push(h1('4. Pemisahan Frontend dan Backend'));
isi.push(para('Kode proyek dipisahkan menjadi dua folder yang jelas batasnya: public/ untuk segala sesuatu yang dilihat dan dijalankan pengguna, dan worker/ untuk segala sesuatu yang berjalan di server. Meskipun terpisah secara folder, keduanya tetap berada dalam satu repositori dan disebarkan sekaligus dalam satu kali deploy.'));
isi.push(gap(40));
isi.push(table(
  ['', 'FRONTEND', 'BACKEND'],
  [
    ['Folder', 'public/', 'worker/'],
    ['Berjalan di', 'Perangkat pengguna (peramban / WebView Android)', 'Server Cloudflare (edge)'],
    ['Bahasa', 'HTML, CSS, JavaScript (tanpa kerangka kerja)', 'JavaScript (Cloudflare Workers)'],
    ['Tugas', 'Tampilan, logika aplikasi, penyimpanan lokal', 'Menyimpan dan membagikan data'],
    ['Berkas utama', 'index.html, css/, js/, sw.js, manifest.json', 'worker.js (produksi), server.js (lokal)'],
    ['Akses data', 'localStorage di perangkat', 'Basis data D1 di Cloudflare'],
    ['Cara menyebar', 'Ikat pada Worker; berkas statis disajikan otomatis (assets)', 'wrangler deploy']
  ],
  [18, 41, 41]
));
isi.push(gap(140));

isi.push(h2('4.1 Titik Sambung Antara Keduanya'));
isi.push(para('Satu-satunya penghubung antara frontend dan backend adalah tiga alamat API berikut. Tidak ada cara lain frontend mengakses server, sehingga batas ini mudah diawasi dan diuji.'));
isi.push(gap(40));
isi.push(table(
  ['Metode', 'Alamat', 'Fungsi', 'Contoh Balasan'],
  [
    ['GET', '/api/health', 'Memeriksa apakah server hidup', '{"status":"ok", ...}'],
    ['GET', '/api/sync', 'Mengambil data keuangan yang tersimpan di cloud', '{"ok":true,"data":{...}}'],
    ['POST', '/api/sync', 'Menyimpan data keuangan ke cloud', '{"ok":true,"updated_at":"..."}']
  ],
  [12, 20, 40, 28]
));
isi.push(gap(120));
isi.push(para('Karena frontend memanggil alamat tersebut secara relatif (misalnya fetch(\'/api/sync\')), keduanya bisa berjalan di satu domain yang sama tanpa konfigurasi alamat tambahan.'));
isi.push(gap(140));

isi.push(h2('4.2 Mengapa Dua Folder, Bukan Dua Server'));
isi.push(para('Ada tiga tingkatan pemisahan yang mungkin dipilih. Proyek ini sengaja memilih tingkat pertama karena paling sederhana namun sudah menyelesaikan seluruh kebutuhan.'));
isi.push(gap(40));
isi.push(table(
  ['Tingkatan', 'Bentuk', 'Kapan dipakai'],
  [
    ['Tingkat 1  (dipakai)', 'Dua folder, satu repositori, satu kali deploy', 'Backend masih ringkas, satu pengembang, siklus rilis menyatu.'],
    ['Tingkat 2', 'Dua repositori atau dua penyebaran terpisah', 'API dipakai pihak ketiga sehingga butuh kontrak yang stabil dan berversi; backend tumbuh besar dengan migrasi dan test sendiri; frontend pindah ke penyedia lain.'],
    ['Tingkat 3', 'Dua repositori dengan tim terpisah', 'Tingkat 2 ditambah beban pemeliharaan paling besar.']
  ],
  [20, 34, 46]
));
isi.push(gap(120));
isi.push(callout('tip', 'Keuntungan sampingan yang sudah terasa',
  'Sebelum pemisahan ini, seluruh isi repositori ikut terunggah ke internet dan bisa diunduh siapa saja — termasuk wrangler.toml yang memuat identitas basis data. Setelah pemisahan, hanya folder public/ yang disajikan; berkas seperti /wrangler.toml, /package.json, dan /tests/ kini dibalas 404 (tidak ditemukan).'));
isi.push(gap(160));

/* ---------- 5. Struktur Folder ---------- */
isi.push(h1('5. Struktur Folder'));
isi.push(code([
  'savingduit/',
  '│',
  '├── public/                     🎨 FRONTEND — berkas yang dilihat pengguna',
  '│   ├── index.html              kerangka halaman, bilah atas, navigasi bawah',
  '│   ├── manifest.json           keterangan aplikasi untuk PWA',
  '│   ├── sw.js                   service worker — agar bisa dibuka offline',
  '│   ├── icon-192.png            ikon aplikasi 192 x 192',
  '│   ├── icon-512.png            ikon aplikasi 512 x 512',
  '│   ├── css/',
  '│   │   └── style.css           seluruh tampilan aplikasi',
  '│   └── js/',
  '│       ├── app.js              pengatur alur, router halaman, sinkron cloud',
  '│       ├── store.js            model data, hitungan, penyimpanan lokal',
  '│       ├── views.js            semua tampilan dan formulir',
  '│       ├── util.js             format rupiah, tanggal, pembuat id',
  '│       └── gdrive.js           cadangan ke Google Drive',
  '│',
  '├── worker/                     ⚙️ BACKEND — berjalan di server Cloudflare',
  '│   ├── worker.js               server produksi (Cloudflare Workers + D1)',
  '│   └── server.js               server lokal untuk pengembangan',
  '│',
  '├── tests/                      🧪 pengujian otomatis',
  '│   ├── smoke.js                uji logika inti',
  '│   ├── profile-test.js         uji multi-profil dan PIN',
  '│   ├── dom-test.js             uji tampilan tanpa peramban sungguhan',
  '│   └── browser-test.js         uji di peramban Chrome sungguhan',
  '│',
  '├── .github/workflows/',
  '│   └── build-apk.yml           otomatisasi pembuatan APK Android',
  '│',
  '├── wrangler.toml               konfigurasi Cloudflare Workers + D1',
  '├── package.json                daftar perintah npm',
  '├── buka.bat                    pintasan menjalankan di Windows',
  '├── README.md                   ringkasan singkat proyek',
  '└── DOKUMENTASI.md              dokumentasi versi teks'
]));
isi.push(gap(140));

/* ---------- 6. Frontend ---------- */
isi.push(h1('6. Bagian Frontend — public/'));
isi.push(para('Frontend ditulis tanpa kerangka kerja apa pun (tanpa React, Vue, atau sejenisnya). Seluruhnya HTML, CSS, dan JavaScript biasa. Pilihan ini membuat berkasnya kecil, cepat dimuat, dan mudah diperiksa siapa pun.'));
isi.push(gap(60));
isi.push(table(
  ['Berkas', 'Baris', 'Tugas'],
  [
    ['index.html', '124', 'Kerangka halaman: bilah atas, konten, bilah navigasi bawah, tempat modal.'],
    ['css/style.css', '477', 'Seluruh tampilan. Dibuat mobile-first dengan efek kartu kaca (glassmorphism).'],
    ['js/app.js', '330', 'Pengatur alur: router berbasis hash, orkestrasi tampilan, dan sinkronisasi cloud.'],
    ['js/store.js', '912', 'Model data, perhitungan saldo dan rekap, serta penyimpanan ke localStorage.'],
    ['js/views.js', '2.078', 'Semua tampilan dan formulir, dari dashboard hingga pengaturan.'],
    ['js/util.js', '167', 'Alat bantu: format rupiah, tanggal, pembuat id, dan penguraian angka.'],
    ['js/gdrive.js', '175', 'Cadangan dan pemulihan ke Google Drive melalui OAuth.'],
    ['sw.js', '56', 'Service worker: menyimpan berkas agar aplikasi bisa dibuka tanpa internet.'],
    ['manifest.json', '—', 'Keterangan untuk PWA: nama, ikon, warna tema.']
  ],
  [20, 10, 70]
));
isi.push(gap(120));
isi.push(h2('6.1 Peran Setiap Lapisan'));
isi.push(bulletB('app.js', 'menerima perintah pengguna, memanggil store.js untuk mengubah data, lalu meminta views.js menggambar ulang tampilan. Di sini juga sinkronisasi ke cloud dijalankan.'));
isi.push(bulletB('store.js', 'satu-satunya tempat data keuangan diubah. Karena terpisah, semua perhitungan bisa diuji tanpa membuka peramban.'));
isi.push(bulletB('views.js', 'hanya bertugas menampilkan dan mengumpulkan masukan formulir; tidak menyimpan data sendiri.'));
isi.push(bulletB('util.js', 'dipakai bersama sehingga format rupiah dan tanggal selalu seragam di seluruh aplikasi.'));
isi.push(gap(160));

/* ---------- 7. Backend ---------- */
isi.push(h1('7. Bagian Backend — worker/'));
isi.push(para('Backend sengaja dibiarkan sangat ringkas — hanya sekitar 75 baris untuk versi produksi. Tugasnya cuma tiga: memberi tahu bahwa server hidup, menyimpan data terbaru, dan mengembalikan data tersimpan ketika diminta.'));
isi.push(gap(60));
isi.push(table(
  ['Berkas', 'Baris', 'Kapan dipakai'],
  [
    ['worker.js', '75', 'Di server Cloudflare saat aplikasi sudah tayang (produksi).'],
    ['server.js', '147', 'Di komputer sendiri saat mengembangkan aplikasi. Dijalankan lewat npm start.']
  ],
  [20, 12, 68]
));
isi.push(gap(120));
isi.push(h2('7.1 Perbedaan Kedua Berkas'));
isi.push(para('worker.js memakai basis data D1 milik Cloudflare. server.js menyimpan datanya di berkas JSON di dalam komputer, dan sekaligus melayani berkas frontend dari folder public/ supaya pengembangan bisa dilakukan tanpa internet. Keduanya menyediakan alamat API yang sama persis, sehingga hasil pengujian di komputer tetap berlaku di produksi.'));
isi.push(gap(60));
isi.push(h2('7.2 Ciri Khas Backend'));
isi.push(bullet('Semua balasan memakai format JSON.'));
isi.push(bullet('Header CORS diizinkan lintas asal (Access-Control-Allow-Origin: *), sehingga aplikasi Android yang berjalan di alamat internal dapat tetap menghubungi server.'));
isi.push(bullet('Data disimpan sebagai satu baris pada tabel sync_store dengan penanda key bernilai \'main_data\' — cukup untuk kebutuhan aplikasi pribadi satu pengguna.'));
isi.push(bullet('Penulisan terakhir selalu menang: data yang datang belakangan menimpa data sebelumnya.'));
isi.push(gap(140));
isi.push(callout('warn', 'Basis data D1',
  'Basis data bernama savingduit-db dengan satu tabel sync_store. Tabel ini membuat versi skema tersendiri agar perubahan bentuk data di masa depan bisa dilacak.'));
isi.push(gap(160));

/* ---------- 8. Teknologi ---------- */
isi.push(h1('8. Teknologi yang Digunakan'));
isi.push(table(
  ['Bagian', 'Teknologi', 'Alasan dipilih'],
  [
    ['Tampilan', 'HTML + CSS + JavaScript murni', 'Tanpa kerangka kerja, tidak perlu proses build, berkas kecil dan cepat.'],
    ['Tata letak', 'CSS modern (grid, flexbox, backdrop-filter)', 'Menghadirkan nuansa aplikasi HP tanpa pustaka tambahan.'],
    ['Penyimpanan lokal', 'localStorage peramban', 'Selalu tersedia dan sangat cepat; cukup untuk data keuangan pribadi.'],
    ['Server', 'Cloudflare Workers', 'Tanpa server yang perlu dirawat, berjalan di titik terdekat pengguna.'],
    ['Basis data', 'Cloudflare D1 (SQL)', 'Basis data SQL milik Cloudflare, menyatu dengan Worker tanpa biaya sambungan.'],
    ['Aplikasi Android', 'Capacitor', 'Membungkus kode web yang sudah ada menjadi APK tanpa menulis ulang.'],
    ['Pembuatan APK', 'GitHub Actions', 'Membangun APK di server GitHub, tidak perlu memasang Android SDK di komputer.'],
    ['Pengujian', 'Skrip Node + jsdom + Chrome headless', 'Menguji logika dan tampilan tanpa pustaka pengujian yang berat.']
  ],
  [18, 30, 52]
));
isi.push(gap(160));

/* ---------- 9. Menjalankan lokal ---------- */
isi.push(h1('9. Menjalankan di Komputer Lokal'));
isi.push(h2('9.1 Cara Tercepat (Windows)'));
isi.push(para('Klik dua kali berkas buka.bat pada folder proyek, lalu buka alamat http://localhost:8765 di peramban.'));
isi.push(gap(60));
isi.push(h2('9.2 Lewat Perintah npm'));
isi.push(code([
  'npm start        # menjalankan server lokal  ->  http://localhost:8765',
  'npm run dev      # menjalankan mode pengembangan Cloudflare (wrangler dev)',
  'npm test         # menjalankan seluruh uji logika',
  'npm run test:browser   # menjalankan uji di peramban Chrome sungguhan'
]));
isi.push(gap(120));
isi.push(para('Bila berhasil, jendela perintah akan menampilkan keterangan berikut:'));
isi.push(code([
  '  SavingDuit Server Siap:',
  '  ->  Port:    8765',
  '  ->  API:     http://localhost:8765/api/health',
  '  ->  Lokal:   http://localhost:8765'
]));
isi.push(gap(120));
isi.push(h2('9.3 Memastikan Backend Berjalan'));
isi.push(code([
  'curl http://localhost:8765/api/health',
  '#  {"status":"ok","service":"SavingDuit Cloud","time":"..."}',
  '',
  'curl http://localhost:8765/api/sync',
  '#  {"ok":true,"data":null,"message":"Belum ada data di cloud"}'
]));
isi.push(gap(160));

/* ---------- 10. Deploy ---------- */
isi.push(h1('10. Penyebaran (Deploy) ke Cloudflare'));
isi.push(para('Penyebaran dilakukan dengan satu perintah. Perintah ini akan mengunggah berkas frontend dari folder public/ sekaligus kode backend dari worker/worker.js, lalu mengaktifkannya pada alamat produksi.'));
isi.push(code([
  'npx wrangler deploy'
]));
isi.push(gap(120));
isi.push(para('Hasil yang diharapkan:'));
isi.push(code([
  '  Read 13 files from the assets directory  ...\\savingduit\\public',
  '  Binding        env.DB (savingduit-db)      D1 Database',
  '  Uploaded savingduit',
  '  Deployed savingduit triggers',
  '    https://savingduit.gozalirp.workers.dev'
]));
isi.push(gap(120));
isi.push(table(
  ['Pengaturan', 'Nilai', 'Arti'],
  [
    ['name', 'savingduit', 'Nama Worker di Cloudflare.'],
    ['main', 'worker/worker.js', 'Berkas backend yang dijalankan di server.'],
    ['assets.directory', 'public', 'Hanya folder ini yang disajikan sebagai berkas statis.'],
    ['d1_databases.binding', 'DB', 'Nama pegangan basis data di dalam kode (env.DB).'],
    ['d1_databases.database_name', 'savingduit-db', 'Nama basis data D1 yang dipakai.']
  ],
  [26, 22, 52]
));
isi.push(gap(140));
isi.push(callout('warn', 'Perhatikan jumlah berkas aset',
  'Baris "Read 13 files from the assets directory" menandakan hanya isi folder public/ yang diunggah. Bila angka itu jauh lebih besar, berarti penyaringan folder belum bekerja dan berkas internal berisiko bisa diunduh publik.'));
isi.push(gap(160));

/* ---------- 11. APK ---------- */
isi.push(h1('11. Membuat APK Android'));
isi.push(para('APK dibangun secara otomatis di server GitHub setiap kali perubahan dikirim ke cabang main. Dengan cara ini tidak perlu memasang Android SDK dan Gradle di komputer sendiri, yang sering menjadi sumber kendala di Windows.'));
isi.push(gap(60));
isi.push(h2('11.1 Tahapan di Dalam GitHub Actions'));
isi.push(table(
  ['No', 'Tahap', 'Keterangan'],
  [
    ['1', 'Checkout Source Code', 'Mengambil kode terbaru dari repositori.'],
    ['2', 'Setup Node.js', 'Menyiapkan Node.js versi 20.'],
    ['3', 'Setup Java (JDK 21)', 'Java 21 diperlukan oleh Capacitor versi 7 dan 8.'],
    ['4', 'Install Dependencies', 'Memasang Capacitor core, CLI, dan Android.'],
    ['5', 'Create Capacitor Config', 'Menulis konfigurasi: id aplikasi com.savingduit.app, nama SavingDuit, dan webDir diarahkan ke public/.'],
    ['6', 'Initialize Android Platform', 'Menjalankan npx cap add android lalu npx cap sync android, serta menyeragamkan versi pustaka Kotlin.'],
    ['7', 'Setup Gradle Cache', 'Menyimpan cadangan unduhan Gradle agar build berikutnya lebih cepat.'],
    ['8', 'Build Android Debug APK', 'Menjalankan ./gradlew assembleDebug untuk menghasilkan APK.'],
    ['9', 'Upload APK Artifact', 'Mengunggah hasil APK agar bisa diunduh dari halaman Actions.']
  ],
  [7, 30, 63]
));
isi.push(gap(120));
isi.push(h2('11.2 Mengunduh Hasil APK'));
isi.push(bullet('Buka halaman Actions pada repositori GitHub.'));
isi.push(bullet('Pilih pelaksanaan (run) terbaru yang bertanda centang hijau.'));
isi.push(bullet('Pada bagian Artifacts, unduh berkas bernama SavingDuit-App.'));
isi.push(bullet('Ekstrak berkas tersebut; di dalamnya terdapat app-debug.apk yang siap dipasang ke HP.'));
isi.push(gap(100));
isi.push(para('Salinan APK juga sudah disediakan di komputer pada folder apk/app-debug.apk dengan ukuran sekitar 4,1 MB.'));
isi.push(gap(120));
isi.push(callout('tip', 'Kendala yang pernah terjadi dan sudah diatasi',
  'Percobaan awal sempat gagal karena bentrok kelas Kotlin — proyek memuat dua versi pustaka Kotlin sekaligus (1.8.22 dan 1.6.21). Masalah itu diatasi dengan menyeragamkan seluruh pustaka org.jetbrains.kotlin ke versi 1.8.22 melalui pengaturan resolutionStrategy pada berkas build.gradle. Selain itu pemasangan Java dinaikkan dari JDK 17 ke JDK 21 agar sesuai dengan Capacitor 7/8.'));
isi.push(gap(120));
isi.push(callout('warn', 'Satu hal yang perlu diperhatikan saat membaca hasil build',
  'Perintah Gradle sempat disalurkan melalui tee supaya keluarannya bisa disimpan sebagai catatan. Akibatnya status pekerjaan bisa terbaca "berhasil" walaupun Gradle sebenarnya gagal, karena tee selalu mengembalikan kode keluar yang baik. Karena itu, bila APK tidak ditemukan, periksa berkas catatan Gradle dan bukan hanya status pekerjaannya.'));
isi.push(gap(160));

/* ---------- 12. Pengujian ---------- */
isi.push(h1('12. Pengujian Otomatis'));
isi.push(para('Terdapat empat berkas pengujian. Satu di antaranya, dom-test.js, sudah gagal sejak sebelum pemisahan folder karena lingkungan jsdom tidak menyediakan fungsi fetch yang dipanggil aplikasi. Hal ini sudah dipastikan bukan akibat pemisahan folder — dibuktikan dengan menjalankan pengujian yang sama pada versi kode sebelum pemisahan, dan hasilnya gagal dengan pesan yang identik.'));
isi.push(gap(60));
isi.push(table(
  ['Berkas uji', 'Menguji apa', 'Hasil terakhir'],
  [
    ['tests/smoke.js', 'Logika inti: saldo, rekap, anggaran, target, langganan', '269 lulus, 0 gagal'],
    ['tests/profile-test.js', 'Multi-profil dan PIN', '86 lulus, 0 gagal'],
    ['tests/browser-test.js', 'Tampilan di peramban Chrome sungguhan', '133 lulus, 0 gagal'],
    ['tests/dom-test.js', 'Tampilan tanpa peramban (jsdom)', 'Gagal — sebab sudah ada sebelum pemisahan']
  ],
  [26, 48, 26]
));
isi.push(gap(120));
isi.push(callout('info', 'Satu pengujian tampilan sempat rapuh dan sudah diperbaiki',
  'browser-test.js menghitung jumlah lembar gaya (stylesheet) dan mengharapkan tepat satu. Kenyataannya berkas huruf dari Google Fonts juga terhitung, sehingga hasil uji berubah-ubah bergantung keadaan jaringan. Pemeriksaan itu kini diubah menjadi hanya menghitung css/style.css, dan hasilnya menjadi tetap: 133 lulus, 0 gagal.'));
isi.push(gap(160));

/* ---------- 13. Tampilan ---------- */
isi.push(h1('13. Tampilan Aplikasi'));
isi.push(para('Seluruh gambar di bawah diambil langsung dari aplikasi yang sedang berjalan, pada ukuran layar HP. Data yang terlihat hanyalah data contoh untuk keperluan dokumentasi.'));
isi.push(gap(120));
isi.push(gambar2(['shot-dashboard.png', 'Dashboard — saldo, ringkasan bulan berjalan, dan grafik pengeluaran per kategori'],
                ['shot-transaksi.png', 'Catatan Transaksi — riwayat pemasukan dan pengeluaran']));
isi.push(gap(60));
isi.push(gambar2(['shot-rekap.png', 'Rekap Transaksi — rekapitulasi per bulan dan per kategori'],
                ['shot-anggaran.png', 'Anggaran per Kategori — batas pengeluaran beserta indikator pemakaian']));
isi.push(gap(60));
isi.push(gambar2(['shot-target.png', 'Target Tabungan — target dana, tenggat, dan hitungan tabungan per bulan'], null));
isi.push(gap(160));

/* ---------- 14. Catatan ---------- */
isi.push(h1('14. Catatan Penting & Rencana Lanjutan'));
isi.push(h2('14.1 Sinkronisasi Cloud Belum Berjalan di Dalam APK'));
isi.push(para('Aplikasi versi APK masih belum bisa menyinkronkan data ke cloud. Sebabnya, di dalam APK seluruh berkas web disajikan dari alamat internal https://localhost. Ketika aplikasi memanggil /api/sync, permintaan itu menuju https://localhost/api/sync — padahal di HP tidak ada server yang mendengarkan alamat tersebut. Akibatnya indikator pada bilah atas akan selalu menampilkan "Offline (Lokal)".'));
isi.push(gap(60));
isi.push(callout('warn', 'Ini bukan akibat pemisahan folder',
  'Kendala ini sudah ada sejak sebelum pemisahan frontend dan backend dilakukan. Aplikasi tetap berjalan normal karena semua data disimpan di perangkat; yang tidak berfungsi hanyalah pencadangan otomatis dan kesinambungan data antar perangkat.'));
isi.push(gap(100));
isi.push(para('Rencana perbaikannya ringkas: membuat satu berkas pengaturan alamat server di frontend, lalu memakai alamat itu pada empat tempat pemanggilan /api/sync di dalam js/app.js. Untuk versi web nilainya dikosongkan (memakai domain yang sama), sedangkan untuk versi APK diisi alamat produksi https://savingduit.gozalirp.workers.dev. Header CORS di worker.js sudah mengizinkan lintas asal, sehingga tidak perlu diubah.'));
isi.push(gap(120));
isi.push(h2('14.2 Rencana Lain'));
isi.push(bullet('Mengubah APK dari versi debug menjadi versi release, yang memerlukan kunci penandatanganan (signing key) tersendiri.'));
isi.push(bullet('Mengganti ikon dan layar pembuka Android agar selaras dengan identitas SavingDuit.'));
isi.push(bullet('Memasang APK di HP sungguhan untuk mencoba seluruh alur dari awal sampai akhir.'));
isi.push(bullet('Menambahkan evaluasi berkala (scheduled evaluation) pada Cloudflare untuk pencadangan otomatis.'));
isi.push(gap(160));

/* ---------- 15. Informasi ---------- */
isi.push(h1('15. Informasi Proyek'));
isi.push(table(
  ['Keterangan', 'Nilai'],
  [
    ['Alamat produksi', 'https://savingduit.gozalirp.workers.dev'],
    ['Repositori GitHub', 'https://github.com/gozalirp/savingduit'],
    ['Halaman pembuatan APK', 'https://github.com/gozalirp/savingduit/actions'],
    ['Berkas APK lokal', 'savingduit/apk/app-debug.apk  (± 4,1 MB)'],
    ['Folder proyek', 'C:\\Users\\gozali.rahman\\Project\\savingduit'],
    ['Akun Cloudflare', 'Gozalirp@gmail.com'],
    ['ID akun Cloudflare', '2989803fb8af0f180ee1d8cc6f6f5a19'],
    ['Nama Worker', 'savingduit'],
    ['Basis data D1', 'savingduit-db'],
    ['ID basis data D1', '5b96f65a-d387-4565-9d39-a2a17f3f8866'],
    ['Tabel D1', 'sync_store  (key = \'main_data\')'],
    ['Berkas konfigurasi', 'wrangler.toml']
  ],
  [32, 68]
));
isi.push(gap(200));
isi.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  border: { top: { style: BorderStyle.SINGLE, size: 8, color: C.biruBg, space: 12 } },
  children: [R('Dokumen ini disusun berdasarkan keadaan kode pada commit e572a89.', { size: 18, italics: true, color: C.abu })],
  spacing: { before: 0, after: 40 }
}));
isi.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [R('SavingDuit — Dokumentasi Proyek', { size: 18, color: C.abu })],
  spacing: { before: 0, after: 0 }
}));

/* ============================================================
   RAKIT DOKUMEN
   ============================================================ */
const doc = new Document({
  creator: 'Dokumentasi Proyek SavingDuit',
  title: 'Dokumentasi Proyek SavingDuit',
  description: 'Dokumentasi arsitektur, struktur kode, pemasangan, dan penyebaran aplikasi SavingDuit',
  styles: {
    default: {
      document: { run: { font: FONT, size: 21, color: C.teks } }
    }
  },
  sections: [{
    properties: {
      page: { margin: { top: 1134, bottom: 1134, left: 1247, right: 1134 } }
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.abuGaris, space: 8 } },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: 'SavingDuit — Dokumentasi Proyek\t', font: FONT, size: 16, color: C.abu }),
            new TextRun({ text: 'Halaman ', font: FONT, size: 16, color: C.abu }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.abu }),
            new TextRun({ text: ' dari ', font: FONT, size: 16, color: C.abu }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: C.abu })
          ],
          spacing: { before: 0, after: 0 }
        })]
      })
    },
    children: isi
  }]
});

Packer.toBuffer(doc).then(function (buf) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('OK  ->  ' + OUT_FILE);
  console.log('Ukuran: ' + (buf.length / 1024).toFixed(1) + ' KB');
}).catch(function (e) {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
