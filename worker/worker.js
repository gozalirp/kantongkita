import { family } from './family.mjs';
// worker.js — Cloudflare Worker API + Asset Fetcher
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/family/')) {
      if (env.FAMILY_ENABLED !== 'true') return Response.json({ ok: false, error: 'Akun keluarga sementara belum aktif: runtime login sedang diperbaiki.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      return family(request, env);
    }

    // Legacy single-row sync is public and cannot isolate family members.
    // Preserve its stored data, but block access until authenticated family sync replaces it.
    if (url.pathname === '/api/sync') {
      return Response.json({ ok: false, code: 'FAMILY_SETUP_REQUIRED',
        error: 'Sinkronisasi keluarga belum diaktifkan. Data lokal tetap tersedia.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    // Header CORS standar
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ==================== REST API ENDPOINTS ====================
    // GET /api/health — Cek status API
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', engine: 'Cloudflare Workers + D1', time: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/sync — Ambil data dari Cloudflare D1
    if (url.pathname === '/api/sync' && request.method === 'GET') {
      try {
        const row = await env.DB.prepare('SELECT data, updated_at FROM sync_store WHERE key = ?')
          .bind('main_data')
          .first();

        if (!row || !row.data) {
          return new Response(JSON.stringify({ ok: true, data: null, message: 'Belum ada data di cloud' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const parsed = JSON.parse(row.data);
        return new Response(JSON.stringify({ ok: true, data: parsed, updated_at: row.updated_at }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // POST /api/sync — Simpan data ke Cloudflare D1
    if (url.pathname === '/api/sync' && request.method === 'POST') {
      try {
        const bodyText = await request.text();
        const payload = JSON.parse(bodyText);
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO sync_store (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
        ).bind('main_data', bodyText, now).run();

        return new Response(JSON.stringify({ ok: true, message: 'Tersimpan otomatis ke Cloudflare D1', time: now }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Fallback jika memanggil file statis (HTML/CSS/JS) via Workers Assets
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  }
};
