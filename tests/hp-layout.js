/* ============================================================
   Server sementara untuk menguji tata letak SavingDuit pada ukuran HP.

   Cara pakai:
     1) node tests/hp-layout.js
     2) buka  http://localhost:8899/__hp.html  di Chrome
     3) hasil uji tertulis di  tests/hp-hasil.txt   (di-*gitignore*)

   Uji ini memeriksa, untuk tiap lebar layar HP:
     - luapan mendatar (halaman bisa digeser ke samping)  -> harus 0
     - elemen yang menembus tepi layar                    -> harus 0
     - konten terakhir tertutup bilah navigasi bawah
     - kepala halaman tertutup takik (notch)
     - area ketuk bilah navigasi (harus >= 44px)

   Takik/lubang speaker disimulasikan lewat variabel --sat/--sab/--sal/--sar
   yang dipasang di :root pada public/css/style.css. Di HP asli nilainya
   otomatis dari env(safe-area-inset-*), jadi halaman aplikasi TIDAK berubah
   (dan karena itu aman: berkas ini ada di tests/, tidak ikut ter-deploy).

   Catatan: uji ini butuh Chrome headless. Contoh:
     chrome --headless=new --remote-debugging-port=9225 \
            --user-data-dir=C:\\tmp\\hp --window-size=1200,1000 \
            http://localhost:8899/__hp.html
   Chrome TIDAK boleh memakai --dump-dom (terlalu cepat); halaman ini
   mengirim hasilnya sendiri ke server lewat POST /__hasil.
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const HARNESS = path.join(__dirname, 'hp-layout.html');
const HASIL = path.join(__dirname, 'hp-hasil.txt');
const PORT = 8899;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml'
};

try { fs.unlinkSync(HASIL); } catch (e) { /* belum ada */ }

http.createServer(function (req, res) {
  if (req.method === 'POST' && req.url === '/__hasil') {
    let b = '';
    req.on('data', function (c) { b += c; });
    req.on('end', function () {
      fs.writeFileSync(HASIL, b, 'utf8');
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
      res.end('ok');
    });
    return;
  }

  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';

  /* Halaman uji diambil dari tests/, bukan dari public/ — supaya tidak
     pernah ikut ter-deploy. */
  const f = u === '/__hp.html' ? HARNESS : path.resolve(PUB, '.' + u);
  if (u !== '/__hp.html' && f.indexOf(PUB) !== 0) { res.writeHead(403); res.end('403'); return; }

  fs.readFile(f, function (e, d) {
    if (e) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(PORT, function () {
  console.log('uji tata letak HP siap di http://localhost:' + PORT + '/__hp.html');
});
