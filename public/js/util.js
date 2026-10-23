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
  /* Ikon SVG lokal; nilai ikon dalam penyimpanan tetap utuh. */
  U.icon = function (name) {
    const shapes = {
      edit:'M16 3l5 5-12 12H4v-5z M14 5l5 5', trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
      download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4', upload:'M12 16V4 M7 9l5-5 5 5 M4 17v4h16v-4',
      lock:'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3', cloud:'M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11z',
      refresh:'M4 9a8 8 0 0 1 13-5l3 3 M20 3v4h-4 M20 15a8 8 0 0 1-13 5l-3-3 M4 21v-4h4',
      wallet:'M3 6h17v15H3z M3 6l13-3v3 M15 11h6v5h-6z', tag:'M3 3h8l10 10-8 8L3 11z M7 7h.01',
      target:'M21 12a9 9 0 1 1-9-9 M17 12a5 5 0 1 1-5-5 M12 12l9-9',
      user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a8 8 0 0 1 16 0v2',
      folder:'M3 5h7l2 3h9v13H3z', receipt:'M5 3h14v18l-3-2-4 2-4-2-3 2z M8 7h8 M8 11h8 M8 15h5',
      chart:'M4 3v18h17 M8 16v-5 M13 16V7 M18 16V4', search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
      calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16', info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7h.01',
      alert:'M12 3l10 18H2z M12 9v5 M12 17h.01', check:'M4 12l5 5L20 6', plus:'M12 5v14 M5 12h14', minus:'M5 12h14',
      home:'M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7', briefcase:'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M12 10v5',
      clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2', heart:'M12 21L3 12a5 5 0 0 1 9-7 5 5 0 0 1 9 7z',
      cart:'M2 3h3l3 13h11l3-9H6 M9 21h.01 M18 21h.01', car:'M3 16V9l3-5h12l3 5v7z M3 10h18 M6 16v4 M18 16v4 M7 13h.01 M17 13h.01',
      book:'M12 5Q6 1 2 4v16q4-3 10 0 6-3 10 0V4q-4-3-10 1v15', food:'M4 3v6q0 3 3 3V3 M7 12v9 M18 3q-5 6 0 9v9 M18 3v9',
      settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z', grid:'M4 6h16 M4 12h16 M4 18h16', gift:'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8C9 8 6 6.5 6 4.5A2.5 2.5 0 0 1 11 4.1L12 8c1-3.9 6-3.9 6-1.5C18 6.6 15 8 12 8', arrow:'M12 4v16 M6 14l6 6 6-6',
      chevron:'M9 5l7 7-7 7', close:'M6 6l12 12 M18 6L6 18', eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', pause:'M9 5v14 M15 5v14', play:'M8 5l11 7-11 7z'
    };
    return '<svg class="ui-icon' + (name === 'wallet' ? ' ui-icon-money' : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (shapes[name] || shapes.tag) + '"/></svg>';
  };

  /* Ikon emoji hanya diganti di kontrol aksi (tombol, pintasan, kepala modal).
     Emoji milik pengguna di dalam kartu data (dompet, kategori, target,
     langganan, profil) dibiarkan apa adanya: di situlah emoji jadi penanda
     yang dipilih sendiri, bukan hiasan. Menggantinya dengan bentuk generik
     justru menghapus makna, karena 34 emoji hanya punya 20 bentuk. */
  U.polishIcons = function (scope) {
    if (!scope || typeof document === 'undefined') return;
    const names = {'✏':'edit','🗑':'trash','⬇':'download','📥':'download','⬆':'upload','📤':'upload','🔒':'lock','☁':'cloud','🔄':'refresh','🔁':'refresh','💰':'wallet','💳':'wallet','🏦':'wallet','🏷':'tag','🎯':'target','🏆':'target','👤':'user','👦':'user','👧':'user','🧑':'user','👨':'user','📦':'folder','📂':'folder','🧾':'receipt','📝':'receipt','📈':'chart','📉':'chart','🔍':'search','📅':'calendar','ℹ':'info','❔':'info','⚠':'alert','🎉':'check','💪':'check','➕':'plus','➖':'minus','🏠':'home','🏢':'home','💼':'briefcase','🏪':'briefcase','⏰':'clock','💊':'heart','🤲':'heart','🛒':'cart','🚗':'car','📚':'book','🎓':'book','🍽':'food','☕':'food','🎁':'gift','🍃':'heart','⚡':'refresh','🔗':'refresh','💡':'info','🐖':'wallet','🐷':'wallet','✕':'close','✖':'close','›':'chevron','‹':'chevron','👁':'eye','⏸':'pause','▶':'play'};
    /* Daftar sempit dan disengaja: hanya elemen yang memang kontrol.
       Jangan tambahkan .ico, .ico-badge, .pc-ic, .pb-ic, .e-ic, .lbl, .sub,
       .tag, .bar-cat, atau .t2 ke sini; itu semua data pengguna. */
    const selector = '.modal-head h2,.btn,.seg button,.brand-icon,.bnav-fab,#total-pill,#btn-sync-cloud,#mode-pill';
    /* Wadah data pengguna: emoji di sini adalah penanda yang dipilih sendiri,
       jadi tidak pernah dikonversi walau berada di dalam lingkup pemindaian. */
    const dataSelectors = '.ico,.ico-badge,.pc-ic,.pb-ic,.e-ic,.t2,.tag,.bar-cat,.lbl,.sub,.ui-emoji';
    const dari = [scope].concat(Array.from(scope.querySelectorAll(selector)));
    dari.forEach(function (box) {
      if (box !== scope && box.closest('svg')) return;
      const walker = document.createTreeWalker(box, 4);
      const nodes = []; let node;
      while ((node = walker.nextNode())) {
        if (!node.parentElement.closest('svg,option,textarea,script,style,' + dataSelectors)) nodes.push(node);
      }
      nodes.forEach(function (text) {
        const value = text.nodeValue;
        /* Satu regex untuk memindai lalu mengganti, supaya tidak ada dua pola
           yang bisa berbeda diam-diam. matchAll selalu mulai dari awal. */
        const hits = Array.from(value.matchAll(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu));
        /* Hanya emoji yang punya bentuk setara yang diganti. Emoji lain
           dibiarkan: bentuk "tag" generik akan menyamakan arti yang berbeda. */
        const ada = hits.some(function (m) {
          return names[m[0].replace(/\uFE0F/g, '')] || names[Array.from(m[0])[0]];
        });
        if (!ada) return;
        const fragment = document.createDocumentFragment(); let last = 0;
        hits.forEach(function (m) {
          const emoji = m[0], offset = m.index;
          fragment.appendChild(document.createTextNode(value.slice(last, offset)));
          const key = names[emoji.replace(/\uFE0F/g, '')] || names[Array.from(emoji)[0]];
          if (key) {
            const span = document.createElement('span'); span.className = 'ui-icon-wrap';
            span.innerHTML = U.icon(key);
            fragment.appendChild(span);
          } else {
            fragment.appendChild(document.createTextNode(emoji));
          }
          last = offset + emoji.length;
        });
        fragment.appendChild(document.createTextNode(value.slice(last)));
        text.replaceWith(fragment);
      });
      /* Tombol yang isinya hanya ikon tetap butuh nama untuk pembaca layar.
         Diperiksa setelah konversi, karena saat itu emoji sudah jadi SVG. */
      const btn = box.nodeType === 1 ? box.closest('button') : null;
      if (btn && !btn.hasAttribute('aria-label') && !btn.textContent.trim() && btn.querySelector('svg.ui-icon')) {
        btn.setAttribute('aria-label', btn.title || 'Ikon');
      }
    });
  };

  /* Label formulir harus benar-benar terhubung ke kontrolnya. Label yang
     cuma bersebelahan secara visual tidak dibacakan pembaca layar dan tidak
     memfokuskan apa pun saat diklik. Satu lintasan setelah render, karena
     markup formulir tersebar di banyak tempat dan ditulis tangan. */
  U.ikatLabel = function (scope) {
    const box = scope || (typeof document !== 'undefined' ? document : null);
    if (!box || !box.querySelectorAll) return;
    const fields = box.querySelectorAll('.field');
    Array.prototype.forEach.call(fields, function (field) {
      const label = field.querySelector('label');
      const grup = field.querySelector('.ikon-pilih,.warna-pilih,.seg');
      /* Kontrol isian dilewati kalau tersembunyi: kolom emoji sekarang jadi
         wadah nilai, bukan sesuatu yang bisa diketik. */
      const ctl = field.querySelector('input:not([type=hidden]),select,textarea');
      const target = ctl || grup;
      if (label && !label.htmlFor && target) {
        if (ctl) {
          if (!ctl.id) ctl.id = U.uid('fld');
          label.htmlFor = ctl.id;
        } else {
          /* Field tanpa isian (pemilih ikon/warna): jadikan kelompok berlabel. */
          if (!label.id) label.id = U.uid('lbl');
          grup.setAttribute('role', 'group');
          grup.setAttribute('aria-labelledby', label.id);
        }
      }
      /* Petunjuk di bawah kontrol ikut dibacakan sebagai bagian dari kontrol. */
      const hint = field.querySelector('.hint[id]');
      if (hint && target) {
        const ada = (target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        if (ada.indexOf(hint.id) < 0) {
          ada.push(hint.id);
          target.setAttribute('aria-describedby', ada.join(' '));
        }
      }
    });
  };

  /* Ikon statis di HTML dasar. Ditulis sebagai atribut supaya markup tetap
     terbaca walau JavaScript belum jalan; tidak memakai emoji di sana karena
     emoji di kerangka aplikasi hanya jadi hiasan yang ikut berubah-ubah
     tergantung font sistem.
     Atribut dilepas setelah dicat: sebagian tempat (ikon profil di sidebar)
     nanti diisi ulang oleh data pengguna dan tidak boleh ditimpa. */
  U.pasangIkonStatis = function (scope) {
    const box = scope || (typeof document !== 'undefined' ? document : null);
    if (!box) return;
    const slots = box.querySelectorAll('[data-ikon]');
    Array.prototype.forEach.call(slots, function (el) {
      const shape = el.getAttribute('data-ikon');
      el.removeAttribute('data-ikon');
      if (!shape) return;
      el.innerHTML = U.icon(shape);
    });
  };

  root.U = U;
})(typeof window !== 'undefined' ? window : globalThis);