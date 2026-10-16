/* server.js — Full Web Server + Sync API untuk SavingDuit (Lokal & Cloud Run)
   Port default 8765, atau baca dari process.env.PORT (standar Cloud Run).
   Data tersimpan aman di folder data/savingduit-cloud.json
*/
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT, 10) || parseInt(process.argv[2], 10) || 8765;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'savingduit-cloud.json');

// Pastikan folder data tersedia
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function sendJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(function (req, res) {
  const parsedUrl = req.url.split('?');
  const pathname = decodeURIComponent(parsedUrl[0]);

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    return res.end();
  }

  // ==================== REST API ENDPOINTS ====================
  // Health check endpoint untuk Cloud Run
  if (pathname === '/api/health') {
    return sendJSON(res, 200, { status: 'ok', service: 'SavingDuit Cloud', time: new Date().toISOString() });
  }

  // GET /api/sync — Ambil data dari server
  if (pathname === '/api/sync' && req.method === 'GET') {
    fs.readFile(DATA_FILE, 'utf8', function (err, content) {
      if (err) {
        if (err.code === 'ENOENT') {
          return sendJSON(res, 200, { ok: true, data: null, message: 'Belum ada data di cloud' });
        }
        return sendJSON(res, 500, { ok: false, error: err.message });
      }
      try {
        const parsed = JSON.parse(content);
        return sendJSON(res, 200, { ok: true, data: parsed, updated: parsed.meta && parsed.meta.updated });
      } catch (e) {
        return sendJSON(res, 500, { ok: false, error: 'Data cloud rusak' });
      }
    });
    return;
  }

  // POST /api/sync — Simpan data ke server
  if (pathname === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () {
      try {
        const payload = JSON.parse(body);
        if (!payload || typeof payload !== 'object') {
          return sendJSON(res, 400, { ok: false, error: 'Payload tidak valid' });
        }
        if (!payload.meta) payload.meta = {};
        payload.meta.cloudUpdated = new Date().toISOString();

        fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8', function (err) {
          if (err) return sendJSON(res, 500, { ok: false, error: err.message });
          return sendJSON(res, 200, { ok: true, message: 'Data berhasil disinkronkan ke Cloud', time: payload.meta.cloudUpdated });
        });
      } catch (err) {
        return sendJSON(res, 400, { ok: false, error: 'Format JSON salah: ' + err.message });
      }
    });
    return;
  }

  // ==================== STATIC FILE SERVING ====================
  let rel = pathname;
  if (rel === '/' || rel === '') rel = '/index.html';

  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('403 Forbidden');
  }

  fs.readFile(file, function (err, buf) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Tidak ditemukan: ' + rel);
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
});

server.on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.log('Port ' + PORT + ' sudah dipakai. Coba port lain.');
  } else {
    console.log('Gagal jalan: ' + e.message);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('');
  console.log('  SavingDuit Server Siap:');
  console.log('  ->  Port:    ' + PORT);
  console.log('  ->  API:     http://localhost:' + PORT + '/api/health');
  console.log('  ->  Lokal:   http://localhost:' + PORT);
  console.log('');
});