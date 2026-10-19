/* ============================================================
   util.js — helper murni (tanpa DOM, bisa dites di Node)
   ============================================================ */
(function (root) {
  'use strict';

  const U = {};

  /* ---------- id ---------- */
  let seq = 0;
  U.uid = function (prefix) {
    seq = (seq + 1) % 100000;
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + '_' +
      seq.toString(36) + Math.floor(Math.random() * 1296).toString(36);
  };

  /* ---------- angka & uang ---------- */
  U.parseAmount = function (v) {
    if (typeof v === 'number') return isFinite(v) ? Math.round(v) : 0;
    if (v == null) return 0;
    // buang semua kecuali digit, minus, koma, titik
    let s = String(v).replace(/[^\d.,-]/g, '');
    if (!s) return 0;
    const neg = s[0] === '-';
    s = s.replace(/-/g, '');
    const hasDot = s.indexOf('.') > -1;
    const hasComma = s.indexOf(',') > -1;
    if (hasDot && hasComma) {
      // yang paling belakang = desimal
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (hasComma) {
      // "1,5" desimal vs "1,500" ribuan
      s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
    } else if (hasDot) {
      s = /\.\d{1,2}$/.test(s) ? s : s.replace(/\./g, '');
    }
    const n = parseFloat(s);
    if (!isFinite(n)) return 0;
    return Math.round(neg ? -n : n);
  };

  U.fmtNum = function (n) {
    const v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  U.fmtRp = function (n) { return 'Rp ' + U.fmtNum(n); };
  U.fmtRpShort = function (n) {
    const v = Math.round(Number(n) || 0), a = Math.abs(v), sgn = v < 0 ? '-' : '';
    if (a >= 1e12) return sgn + 'Rp ' + (a / 1e12).toFixed(1).replace('.0', '') + ' T';
    if (a >= 1e9)  return sgn + 'Rp ' + (a / 1e9).toFixed(1).replace('.0', '') + ' M';
    if (a >= 1e6)  return sgn + 'Rp ' + (a / 1e6).toFixed(1).replace('.0', '') + ' jt';
    if (a >= 1e4)  return sgn + 'Rp ' + (a / 1e3).toFixed(0) + ' rb';
    return U.fmtRp(v);
  };

  /* ---------- tanggal (pakai string YYYY-MM-DD, bebas timezone) ---------- */
  U.today = function () { return U.dateToStr(new Date()); };
  U.dateToStr = function (d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  };
  U.strToDate = function (s) {
    const p = String(s || '').split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) || 1);
  };
  U.monthOf = function (ds) { return String(ds).slice(0, 7); };          // YYYY-MM
  U.yearOf = function (ds) { return String(ds).slice(0, 4); };           // YYYY
  U.addDays = function (ds, n) { const d = U.strToDate(ds); d.setDate(d.getDate() + n); return U.dateToStr(d); };
  U.diffDays = function (a, b) { return Math.round((U.strToDate(a) - U.strToDate(b)) / 86400000); };

  // Senin = awal minggu
  U.weekStart = function (ds) {
    const d = U.strToDate(ds), wd = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - wd);
    return U.dateToStr(d);
  };
  U.monthStart = function (ds) { return U.monthOf(ds) + '-01'; };
  U.monthEnd = function (ds) {
    const p = U.monthOf(ds).split('-');
    return U.dateToStr(new Date(Number(p[0]), Number(p[1]), 0));
  };

  // Geser bulan (aman untuk tanggal 31: 31 Jan -1 bulan = 28/29 Feb)
  U.addMonths = function (ds, n) {
    const p = String(ds).split('-');
    const y = Number(p[0]), m = Number(p[1]) - 1 + n;
    const last = new Date(y, m + 1, 0).getDate();
    const d = Math.min(Number(p[2]) || 1, last);
    return U.dateToStr(new Date(y, m, d));
  };

  // Tanggal ke-`day` di bulan `ym`. Kalau bulan itu tidak punya hari sebesar
  // itu (31 di Februari), dipakai hari terakhir bulan tersebut (28/29).
  U.dateInMonth = function (ym, day) {
    const last = Number(U.monthEnd(ym + '-01').slice(8, 10));
    const d = Math.min(Math.max(1, Math.round(day) || 1), last);
    return ym + '-' + String(d).padStart(2, '0');
  };

  // yyyy-mm relatif (bulan ini = 0, bulan lalu = -1, …)
  U.ymOffset = function (n, base) { return U.monthOf(U.addMonths(U.monthStart(base || U.today()), n)); };

  // Berapa hari lagi sampai tanggal `day` (1-31) berikutnya.
  U.daysUntilDay = function (day, base) {
    const t = base || U.today();
    let target = U.dateInMonth(U.monthOf(t), day);
    if (target < t) target = U.dateInMonth(U.ymOffset(1, t), day);
    return U.diffDays(target, t);
  };

  const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const BLN3 = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  U.MONTHS = BLN; U.MONTHS3 = BLN3; U.DAYS = HARI;

  U.fmtDate = function (ds) {
    if (!ds) return '-';
    const d = U.strToDate(ds);
    return d.getDate() + ' ' + BLN3[d.getMonth()] + ' ' + d.getFullYear();
  };
  U.fmtDateLong = function (ds) {
    const d = U.strToDate(ds);
    return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear();
  };
  U.fmtMonth = function (ym) {
    const p = String(ym).split('-');
    return BLN[Number(p[1]) - 1] + ' ' + p[0];
  };
  U.fmtMonthShort = function (ym) {
    const p = String(ym).split('-');
    return BLN3[Number(p[1]) - 1] + ' ' + String(p[0]).slice(2);
  };
  U.relativeDate = function (ds) {
    const d = U.diffDays(U.today(), ds);
    if (d === 0) return 'Hari ini';
    if (d === -1) return 'Kemarin';
    if (d === 1) return 'Besok';
    if (d < 0 && d > -7) return Math.abs(d) + ' hari lalu';
    return U.fmtDate(ds);
  };

  /* ---------- misc ---------- */
  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  U.sum = function (arr, fn) { return arr.reduce((a, x) => a + (fn ? fn(x) : x), 0); };
  U.groupBy = function (arr, fn) {
    const m = new Map();
    for (const x of arr) { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
    return m;
  };
  U.sortDesc = function (arr, fn) {
    return arr.slice().sort((a, b) => {
      const ka = fn(a), kb = fn(b);
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
  };
  U.clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };
  U.pct = function (part, whole) { return whole > 0 ? (part / whole) * 100 : 0; };
  U.round1 = function (n) { return Math.round(n * 10) / 10; };

  if (typeof module !== 'undefined' && module.exports) module.exports = U;
  root.U = U;
})(typeof window !== 'undefined' ? window : globalThis);