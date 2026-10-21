/* ============================================================
   store.js — model data + logika murni + penyimpanan
   ============================================================ */
(function (root) {
  'use strict';
  const U = root.U;

  const DB_KEY = 'savingduit.db.v1';
  const SESSION_KEY = 'savingduit.session';
  const DB_VERSION = 1;

  /* ============================================================
     1. SCHEMA — bentuk data kosong + seed awal
     ============================================================ */
  function emptyDB() {
    return {
      version: DB_VERSION,
      wallets: [],
      categories: [],
      transactions: [],
      receipts: {},          // id -> {name, mime, size, data}
      budgets: [],           // disiapkan untuk tahap 2
      goals: [],             // disiapkan untuk tahap 2
      subscriptions: [],     // disiapkan untuk tahap 2
      settings: {
        currency: 'Rp',
        driveClientId: '',
        driveFileId: '',
        driveEnabled: false,
        lastSync: '',
        lastBackup: ''
      },
      meta: { created: '', updated: '' }
    };
  }

  // Kategori default: tipe 'out' untuk pengeluaran, 'in' untuk pemasukan
  const SEED_CATEGORIES = [
    ['Gaji',           'in',  '💼'],
    ['Bonus / THR',    'in',  '🎁'],
    ['Usaha',          'in',  '🏪'],
    ['Bunga / Dividen','in',  '📈'],
    ['Lain-lain masuk','in',  '➕'],
    ['Makan & Minum',  'out', '🍽️'],
    ['Transport',      'out', '🚗'],
    ['Belanja Harian', 'out', '🛒'],
    ['Tagihan & Utilitas','out','💡'],
    ['Sewa / KPR',     'out', '🏠'],
    ['Kesehatan',      'out', '💊'],
    ['Pendidikan',     'out', '📚'],
    ['Hiburan',        'out', '🎬'],
    ['Pulsa & Internet','out','📶'],
    ['Cicilan / Hutang','out','🏦'],
    ['Donasi',         'out', '🤲'],
    ['Tabungan & Investasi','out','🐖'],
    ['Lain-lain keluar','out','➖']
  ];

  // Dompet default
  const SEED_WALLETS = [
    ['Tunai',        'cash',    '💵', '#22c55e'],
    ['Rekening Bank','bank',    '🏦', '#3d7bff'],
    ['E-Wallet',     'ewallet', '📱', '#a78bfa']
  ];

  function seedDB() {
    const db = emptyDB();
    SEED_WALLETS.forEach(function (w, i) {
      db.wallets.push({ id: 'wlt_seed' + i, name: w[0], type: w[1], icon: w[2], color: w[3], initial: 0, archived: false });
    });
    SEED_CATEGORIES.forEach(function (c, i) {
      db.categories.push({ id: 'cat_seed' + i, name: c[0], type: c[1], icon: c[2], archived: false });
    });
    db.meta.created = new Date().toISOString();
    db.meta.updated = db.meta.created;
    return db;
  }

  /* ============================================================
     2. LOGIKA MURNI — dipakai UI dan tes
     ============================================================ */
  const S = {};

  // ---- transaksi valid? ----
  S.isValidTx = function (t) {
    if (!t || !t.date || !t.type) return false;
    if (!['in', 'out', 'move'].includes(t.type)) return false;
    if (!(Number(t.amount) > 0)) return false;
    if (t.type === 'move') {
      if (!t.walletId || !t.walletTo) return false;
      if (t.walletId === t.walletTo) return false;
    } else if (!t.walletId) return false;
    return true;
  };

  // ---- uang masuk/keluar dari satu dompet ----
  // move diperlakukan netral untuk total kekayaan, tapi memindah saldo antar dompet
  S.effectOnWallet = function (t, walletId) {
    if (!S.isValidTx(t)) return 0;
    if (t.type === 'in')   return t.walletId === walletId ? Number(t.amount) : 0;
    if (t.type === 'out')  return t.walletId === walletId ? -Number(t.amount) : 0;
    if (t.type === 'move') {
      let d = 0;
      if (t.walletId === walletId) d -= Number(t.amount);
      if (t.walletTo === walletId) d += Number(t.amount);
      return d;
    }
    return 0;
  };

  // ---- saldo tiap dompet ----
  S.walletBalances = function (db) {
    const out = {};
    (db.wallets || []).forEach(function (w) { out[w.id] = Number(w.initial) || 0; });
    (db.transactions || []).forEach(function (t) {
      if (!S.isValidTx(t)) return;
      if (t.walletId in out)   out[t.walletId]   += S.effectOnWallet(t, t.walletId);
      if (t.type === 'move' && t.walletTo in out) out[t.walletTo] += Number(t.amount);
    });
    return out;
  };

  S.walletBalance = function (db, walletId) { return S.walletBalances(db)[walletId] || 0; };

  S.totalBalance = function (db) {
    const b = S.walletBalances(db);
    return U.sum(Object.keys(b).map(function (k) { return b[k]; }));
  };

  // ---- filter periode ----
  S.inRange = function (ds, from, to) {
    if (from && ds < from) return false;
    if (to && ds > to) return false;
    return true;
  };

  S.filterTx = function (db, opt) {
    opt = opt || {};
    let list = (db.transactions || []).filter(S.isValidTx);
    if (opt.from) list = list.filter(function (t) { return t.date >= opt.from; });
    if (opt.to)   list = list.filter(function (t) { return t.date <= opt.to; });
    if (opt.walletId) {
      list = list.filter(function (t) { return t.walletId === opt.walletId || t.walletTo === opt.walletId; });
    }
    if (opt.categoryId) list = list.filter(function (t) { return t.categoryId === opt.categoryId; });
    if (opt.type && opt.type !== 'all') list = list.filter(function (t) { return t.type === opt.type; });
    if (opt.q) {
      const q = String(opt.q).toLowerCase();
      list = list.filter(function (t) { return String(t.note || '').toLowerCase().indexOf(q) > -1; });
    }
    return U.sortDesc(list, function (t) { return t.date + '~' + (t.createdAt || ''); });
  };

  // ---- ringkasan ----
  S.summary = function (db, from, to) {
    const list = S.filterTx(db, { from: from, to: to });
    let income = 0, expense = 0, moved = 0, countIn = 0, countOut = 0, countMove = 0;
    list.forEach(function (t) {
      const a = Number(t.amount);
      if (t.type === 'in')   { income += a;  countIn++; }
      if (t.type === 'out')  { expense += a; countOut++; }
      if (t.type === 'move') { moved += a;   countMove++; }
    });
    return {
      income: income, expense: expense, moved: moved,
      net: income - expense,
      count: list.length, countIn: countIn, countOut: countOut, countMove: countMove,
      list: list
    };
  };

  // ringkasan N hari terakhir (termasuk hari ini)
  S.summaryDays = function (db, days, endDate) {
    const to = endDate || U.today();
    const from = U.addDays(to, -(days - 1));
    return S.summary(db, from, to);
  };

  // ringkasan per bulan berjalan
  S.summaryMonth = function (db, ym) {
    const m = ym || U.monthOf(U.today());
    return S.summary(db, m + '-01', U.monthEnd(m + '-01'));
  };

  S.summaryYear = function (db, y) {
    const yr = y || U.yearOf(U.today());
    return S.summary(db, yr + '-01-01', yr + '-12-31');
  };

  // ---- pengeluaran per kategori ----
  S.byCategory = function (db, from, to, type) {
    const t = type || 'out';
    const list = S.filterTx(db, { from: from, to: to, type: t });
    const map = new Map();
    list.forEach(function (tx) {
      const k = tx.categoryId || '__none';
      map.set(k, (map.get(k) || 0) + Number(tx.amount));
    });
    const catById = {};
    (db.categories || []).forEach(function (c) { catById[c.id] = c; });
    const arr = [];
    map.forEach(function (amt, k) {
      const c = catById[k];
      arr.push({
        categoryId: k,
        name: c ? c.name : '(tanpa kategori)',
        icon: c ? c.icon : '❔',
        amount: amt
      });
    });
    return arr.sort(function (a, b) { return b.amount - a.amount; });
  };

  // ---- rekap per hari (untuk grafik & tabel) ----
  S.byDay = function (db, from, to) {
    const list = S.filterTx(db, { from: from, to: to });
    const map = new Map();
    list.forEach(function (t) {
      const d = map.get(t.date) || { date: t.date, income: 0, expense: 0, moved: 0, count: 0 };
      if (t.type === 'in') d.income += Number(t.amount);
      if (t.type === 'out') d.expense += Number(t.amount);
      if (t.type === 'move') d.moved += Number(t.amount);
      d.count++;
      map.set(t.date, d);
    });
    const arr = Array.from(map.values());
    arr.forEach(function (d) { d.net = d.income - d.expense; });
    return arr.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  };

  // ---- rekap per minggu (Senin–Minggu) ----
  S.byWeek = function (db, from, to) {
    const list = S.filterTx(db, { from: from, to: to });
    const map = new Map();
    list.forEach(function (t) {
      const ws = U.weekStart(t.date);
      const d = map.get(ws) || { week: ws, end: U.addDays(ws, 6), income: 0, expense: 0, moved: 0, count: 0, days: {} };
      if (t.type === 'in') d.income += Number(t.amount);
      if (t.type === 'out') d.expense += Number(t.amount);
      if (t.type === 'move') d.moved += Number(t.amount);
      d.count++; d.days[t.date] = true;
      map.set(ws, d);
    });
    const arr = Array.from(map.values());
    arr.forEach(function (d) { d.net = d.income - d.expense; d.activeDays = Object.keys(d.days).length; });
    return arr.sort(function (a, b) { return a.week < b.week ? -1 : 1; });
  };

  // ---- rekap per bulan ----
  S.byMonth = function (db, fromYM, toYM) {
    const list = S.filterTx(db, { from: fromYM + '-01', to: U.monthEnd(toYM + '-01') });
    const map = new Map();
    list.forEach(function (t) {
      const m = U.monthOf(t.date);
      const d = map.get(m) || { month: m, income: 0, expense: 0, moved: 0, count: 0 };
      if (t.type === 'in') d.income += Number(t.amount);
      if (t.type === 'out') d.expense += Number(t.amount);
      if (t.type === 'move') d.moved += Number(t.amount);
      d.count++;
      map.set(m, d);
    });
    const arr = Array.from(map.values());
    arr.forEach(function (d) { d.net = d.income - d.expense; });
    return arr.sort(function (a, b) { return a.month < b.month ? -1 : 1; });
  };

  // ---- rekap per tahun ----
  S.byYear = function (db) {
    const list = S.filterTx(db, {});
    const map = new Map();
    list.forEach(function (t) {
      const y = U.yearOf(t.date);
      const d = map.get(y) || { year: y, income: 0, expense: 0, moved: 0, count: 0 };
      if (t.type === 'in') d.income += Number(t.amount);
      if (t.type === 'out') d.expense += Number(t.amount);
      if (t.type === 'move') d.moved += Number(t.amount);
      d.count++;
      map.set(y, d);
    });
    const arr = Array.from(map.values());
    arr.forEach(function (d) { d.net = d.income - d.expense; });
    return arr.sort(function (a, b) { return a.year < b.year ? -1 : 1; });
  };

  S.yearRange = function (db) {
    const ys = (db.transactions || []).map(function (t) { return U.yearOf(t.date); });
    ys.push(U.yearOf(U.today()));
    return { min: ys.reduce(function (a, b) { return a < b ? a : b; }), max: ys.reduce(function (a, b) { return a > b ? a : b; }) };
  };

  // ---- validasi menyimpan transaksi ----
  S.validateTx = function (form) {
    const errs = {};
    if (!form.date) errs.date = 'Tanggal wajib diisi';
    if (!(U.parseAmount(form.amount) > 0)) errs.amount = 'Nominal harus lebih dari 0';
    if (form.type === 'move') {
      if (!form.walletId) errs.walletId = 'Pilih dompet asal';
      if (!form.walletTo) errs.walletTo = 'Pilih dompet tujuan';
      if (form.walletId && form.walletId === form.walletTo) errs.walletTo = 'Dompet asal dan tujuan tidak boleh sama';
    } else if (!form.walletId) {
      errs.walletId = 'Pilih dompet';
    }
    return errs;
  };

  S.mkTx = function (form) {
    return {
      id: form.id || U.uid('tx'),
      date: form.date,
      type: form.type,
      amount: U.parseAmount(form.amount),
      walletId: form.walletId || '',
      walletTo: form.type === 'move' ? (form.walletTo || '') : '',
      categoryId: form.categoryId || '',
      note: String(form.note || '').trim(),
      receiptId: form.receiptId || '',
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // ---- hapus dompet/kategori: apa yang akan terdampak? ----
  S.txCountForWallet = function (db, walletId) {
    return (db.transactions || []).filter(function (t) {
      return S.isValidTx(t) && (t.walletId === walletId || t.walletTo === walletId);
    }).length;
  };
  S.txCountForCategory = function (db, catId) {
    return (db.transactions || []).filter(function (t) { return t.categoryId === catId; }).length;
  };

  // ---- impor/ekspor ----
  S.normalize = function (raw) {
    const db = emptyDB();
    if (!raw || typeof raw !== 'object') return seedDB();
    ['wallets', 'categories', 'transactions', 'budgets', 'goals', 'subscriptions'].forEach(function (k) {
      if (Array.isArray(raw[k])) db[k] = raw[k];
    });
    if (raw.receipts && typeof raw.receipts === 'object') db.receipts = raw.receipts;
    if (raw.settings && typeof raw.settings === 'object') Object.assign(db.settings, raw.settings);
    if (raw.meta && typeof raw.meta === 'object') Object.assign(db.meta, raw.meta);
    db.version = DB_VERSION;
    // pastikan tiap transaksi punya id
    db.transactions = db.transactions.map(function (t) {
      if (!t.id) t.id = U.uid('tx');
      return t;
    });
    return db;
  };

  S.toJSON = function (db) { return JSON.stringify(db, null, 2); };

  S.toCSV = function (db) {
    const catById = {}, wById = {};
    (db.categories || []).forEach(function (c) { catById[c.id] = c.name; });
    (db.wallets || []).forEach(function (w) { wById[w.id] = w.name; });
    const head = ['Tanggal', 'Jenis', 'Nominal', 'Dompet', 'Ke Dompet', 'Kategori', 'Catatan'];
    const rows = S.filterTx(db, {}).map(function (t) {
      const jenis = t.type === 'in' ? 'Pemasukan' : t.type === 'out' ? 'Pengeluaran' : 'Pindah Dana';
      return [
        t.date, jenis, String(Number(t.amount)),
        wById[t.walletId] || '', t.walletTo ? (wById[t.walletTo] || '') : '',
        catById[t.categoryId] || '', t.note || ''
      ].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; });
    });
    return [head.join(',')].concat(rows.map(function (r) { return r.join(','); })).join('\r\n');
  };

  S.periodLabel = function (preset, from, to) {
    switch (preset) {
      case 'today': return 'Hari ini';
      case 'week':  return 'Minggu ini';
      case 'month': return 'Bulan ini';
      case 'year':  return 'Tahun ini';
      case 'lastmonth': return 'Bulan lalu';
      case 'lastyear': return 'Tahun lalu';
      case '7d': return '7 hari terakhir';
      case '30d': return '30 hari terakhir';
      case 'all': return 'Semua waktu';
      default: return from && to ? (U.fmtDate(from) + ' sampai ' + U.fmtDate(to)) : 'Semua waktu';
    }
  };

  S.rangeFor = function (preset, today) {
    const t = today || U.today();
    let from = '', to = '';
    switch (preset) {
      case 'today': from = to = t; break;
      case 'week': { const ws = U.weekStart(t); from = ws; to = U.addDays(ws, 6); break; }
      case 'month': from = U.monthStart(t); to = U.monthEnd(t); break;
      case 'year': { const y = U.yearOf(t); from = y + '-01-01'; to = y + '-12-31'; break; }
      case 'lastmonth': { const d = U.strToDate(U.monthStart(t)); d.setMonth(d.getMonth() - 1); const ym = U.monthOf(U.dateToStr(d)); from = ym + '-01'; to = U.monthEnd(ym + '-01'); break; }
      case 'lastyear': { const y = String(Number(U.yearOf(t)) - 1); from = y + '-01-01'; to = y + '-12-31'; break; }
      case '7d':  to = t; from = U.addDays(t, -6); break;
      case '30d': to = t; from = U.addDays(t, -29); break;
      default: from = ''; to = '';
    }
    return { from: from, to: to };
  };

  /* ============================================================
     3. PERSISTENCE — adapter ganti-ganti backend
     ============================================================ */
  function pickStorage() {
    try {
      const s = root.localStorage; s.setItem('__t', '1'); s.removeItem('__t'); return s;
    } catch (e) {
      try {
        const s = root.sessionStorage; s.setItem('__t', '1'); s.removeItem('__t'); return s;
      } catch (e2) { return null; }
    }
  }
  const store = pickStorage();

  const Persist = {
    backend: 'local',   // 'local' | 'drive'
    _mem: null,
    key: function () {
      try { return DB_KEY + '::' + (store.getItem(SESSION_KEY) || ''); }
      catch (e) { return DB_KEY; }
    },

    load: function () {
      if (!store) return this._mem;
      try {
        const raw = store.getItem(this.key());
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) { return null; }
    },

    save: function (db) {
      this._mem = db;
      if (!store) return false;
      try { store.setItem(this.key(), JSON.stringify(db)); return true; }
      catch (e) {
        // kuota penuh — coba buang struk terbesar
        try {
          const slim = JSON.parse(JSON.stringify(db));
          slim.receipts = {};
          store.setItem(this.key(), JSON.stringify(slim));
          return 'slim';
        } catch (e2) { return false; }
      }
    },

    clear: function () { if (store) store.removeItem(this.key()); },

    /* Baca data profil lain (tanpa mengubah profil aktif) — dipakai halaman Profil
       untuk menampilkan ringkasan tiap profil. */
    loadFor: function (profileId) {
      if (!store) return null;
      try {
        const raw = store.getItem(DB_KEY + '::' + profileId);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    exportFile: function (db, label) {
      return {
        name: 'savingduit-backup-' + U.today() + (label ? '-' + label : '') + '.json',
        mime: 'application/json',
        text: S.toJSON(db)
      };
    }
  };

  /* ============================================================
     4. ANGGARAN PER KATEGORI
     Bentuk: {id, categoryId, limit, period:'month'|'year', note}
     ============================================================ */
  S.budgetFor = function (db, catId) {
    return (db.budgets || []).filter(function (b) { return b.categoryId === catId; })[0] || null;
  };

  // Rentang tanggal anggaran berdasarkan periodenya
  S.budgetRange = function (b, today) {
    const t = today || U.today();
    if (b && b.period === 'year') return { from: U.yearOf(t) + '-01-01', to: U.yearOf(t) + '-12-31' };
    return { from: U.monthStart(t), to: U.monthEnd(t) };
  };

  // Berapa yang sudah terpakai untuk satu anggaran
  S.budgetUsage = function (db, b, today) {
    if (!b || !b.categoryId) return { used: 0, limit: 0, left: 0, pct: 0, over: false, from: '', to: '' };
    const r = S.budgetRange(b, today);
    const limit = Math.max(0, Number(b.limit) || 0);
    let used = 0;
    (db.transactions || []).forEach(function (t) {
      if (!S.isValidTx(t)) return;
      if (t.type !== 'out') return;
      if (t.categoryId !== b.categoryId) return;
      if (!S.inRange(t.date, r.from, r.to)) return;
      used += Number(t.amount);
    });
    const left = limit - used;
    return {
      used: used, limit: limit, left: left,
      pct: limit > 0 ? (used / limit) * 100 : (used > 0 ? 100 : 0),
      over: used > limit,
      from: r.from, to: r.to
    };
  };

  // Daftar semua anggaran + pemakaiannya, urut paling kritis dulu
  S.budgetStatus = function (db, today) {
    const catById = {};
    (db.categories || []).forEach(function (c) { catById[c.id] = c; });
    const arr = (db.budgets || []).map(function (b) {
      const u = S.budgetUsage(db, b, today);
      const c = catById[b.categoryId];
      return {
        budget: b, usage: u,
        category: c || { id: b.categoryId, name: '(kategori terhapus)', icon: '❔', type: 'out' },
        valid: !!c
      };
    });
    return arr.sort(function (a, b) {
      // kategori yang masih ada lebih dulu: anggaran yatim bukan hal yang
      // bisa ditindaklanjuti user, cukup ditampilkan sebagai peringatan.
      if (a.valid !== b.valid) return a.valid ? -1 : 1;
      if (a.usage.over !== b.usage.over) return a.usage.over ? -1 : 1;
      return b.usage.pct - a.usage.pct;
    });
  };

  S.budgetTotal = function (db, today) {
    let limit = 0, used = 0;
    S.budgetStatus(db, today).forEach(function (r) {
      if (!r.valid) return;
      if (r.budget.period === 'year') return;   // anggaran tahunan tidak dijumlahkan ke bulanan
      limit += r.usage.limit; used += r.usage.used;
    });
    return { limit: limit, used: used, left: limit - used, pct: limit > 0 ? (used / limit) * 100 : 0 };
  };

  /* ============================================================
     5. TARGET TABUNGAN (saving goals)
     Bentuk: {id, name, icon, target, saved, walletId, due, note, done}
     `saved` bisa diisi manual; transaksi ke dompet tujuan tidak dihitung
     otomatis supaya tidak dobel hitung dengan saldo dompet.
     ============================================================ */
  S.goalProgress = function (g) {
    const target = Math.max(0, Number(g && g.target) || 0);
    const saved = Math.max(0, Number(g && g.saved) || 0);
    const left = Math.max(0, target - saved);
    const pct = target > 0 ? Math.min(100, (saved / target) * 100) : (saved > 0 ? 100 : 0);
    return {
      target: target, saved: saved, left: left,
      pct: pct, done: target > 0 && saved >= target,
      rawPct: target > 0 ? (saved / target) * 100 : 0
    };
  };

  // Perlu menabung berapa per bulan supaya selesai sebelum `due`?
  S.goalMonthlyNeed = function (g, base) {
    const p = S.goalProgress(g);
    if (p.done) return 0;
    if (!g || !g.due) return null;
    const t = base || U.today();
    const hari = U.diffDays(g.due, t);
    if (hari <= 0) return p.left;               // sudah lewat / hari ini
    const bulan = Math.max(1, Math.ceil(hari / 30.44));
    return Math.ceil(p.left / bulan);
  };

  S.goalStatus = function (db, today) {
    const t = today || U.today();
    const wById = {};
    (db.wallets || []).forEach(function (w) { wById[w.id] = w; });
    return (db.goals || []).map(function (g) {
      const p = S.goalProgress(g);
      const sisaHari = g.due ? U.diffDays(g.due, t) : null;
      return {
        goal: g, progress: p,
        wallet: wById[g.walletId] || null,
        daysLeft: sisaHari,
        monthlyNeed: S.goalMonthlyNeed(g, t),
        late: p.done ? false : (sisaHari !== null && sisaHari < 0)
      };
    }).sort(function (a, b) {
      if (a.progress.done !== b.progress.done) return a.progress.done ? 1 : -1;
      if (a.late !== b.late) return a.late ? -1 : 1;
      const da = a.daysLeft === null ? Infinity : a.daysLeft;
      const db2 = b.daysLeft === null ? Infinity : b.daysLeft;
      if (da !== db2) return da - db2;
      return b.progress.pct - a.progress.pct;
    });
  };

  S.goalTotal = function (db) {
    let target = 0, saved = 0, done = 0;
    (db.goals || []).forEach(function (g) {
      const p = S.goalProgress(g);
      target += p.target; saved += Math.min(p.saved, p.target);
      if (p.done) done++;
    });
    return {
      target: target, saved: saved, total: (db.goals || []).length, done: done,
      pct: target > 0 ? (saved / target) * 100 : 0
    };
  };

  /* ============================================================
     6. LANGGANAN BULANAN
     Bentuk: {id, name, icon, amount, cycle:'month'|'year'|'week',
              day, ym, walletId, categoryId, note, active, lastPaid}
     `ym` (YYYY-MM) = nominal terakhir naik (penanda harga baru).
     ============================================================ */
  S.SUB_CYCLES = [['month', 'Bulanan'], ['year', 'Tahunan'], ['week', 'Mingguan']];

  S.subMonthlyCost = function (sub) {
    const a = Math.max(0, Number(sub && sub.amount) || 0);
    const c = sub && sub.cycle ? sub.cycle : 'month';
    if (c === 'year') return a / 12;
    if (c === 'week') return a * 52 / 12;
    return a;
  };

  S.subYearlyCost = function (sub) {
    const a = Math.max(0, Number(sub && sub.amount) || 0);
    const c = sub && sub.cycle ? sub.cycle : 'month';
    if (c === 'year') return a;
    if (c === 'week') return a * 52;
    return a * 12;
  };

  // Tagihan berikutnya (tanggal). Selalu >= hari ini.
  S.subNextDue = function (sub, today) {
    const t = today || U.today();
    const c = sub.cycle || 'month';
    if (c === 'year') {
      const day = Number(sub.day) || 1;
      const bulan = sub.ym ? String(sub.ym).slice(5, 7) : U.monthOf(t);
      let cand = U.dateInMonth(U.yearOf(t) + '-' + bulan, day);
      if (cand < t) cand = U.dateInMonth((Number(U.yearOf(t)) + 1) + '-' + bulan, day);
      return cand;
    }
    if (c === 'week') {
      const day = U.clamp(Number(sub.day) || 1, 1, 7);
      const ws = U.weekStart(t);
      let cand = U.addDays(ws, day - 1);
      if (cand < t) cand = U.addDays(cand, 7);
      return cand;
    }
    let cand = U.dateInMonth(U.monthOf(t), sub.day);
    if (cand < t) cand = U.dateInMonth(U.ymOffset(1, t), sub.day);
    return cand;
  };

  S.subDaysLeft = function (sub, today) {
    const t = today || U.today();
    return U.diffDays(S.subNextDue(sub, t), t);
  };

  // Apakah bulan `ym` sudah dibayar? dilihat dari catatan transaksi
  S.subPaidIn = function (db, sub, ym) {
    const key = '/sub:' + sub.id + '/ ' + ym;
    return (db.transactions || []).some(function (t) { return String(t.note || '').indexOf(key) > -1; });
  };

  // Daftar langganan + status pembayaran bulan ini, urut paling dekat jatuh tempo
  S.subStatus = function (db, today) {
    const t = today || U.today();
    const ym = U.monthOf(t);
    const catById = {};
    (db.categories || []).forEach(function (c) { catById[c.id] = c; });
    const arr = (db.subscriptions || []).map(function (sub) {
      const due = S.subNextDue(sub, t);
      return {
        sub: sub, due: due, daysLeft: U.diffDays(due, t),
        paidThisMonth: S.subPaidIn(db, sub, ym),
        dueThisMonth: U.monthOf(due) === ym,
        monthly: S.subMonthlyCost(sub),
        category: catById[sub.categoryId] || null
      };
    });
    const aktif = arr.filter(function (r) { return r.sub.active !== false; });
    return aktif.sort(function (a, b) {
      if (a.paidThisMonth !== b.paidThisMonth) return a.paidThisMonth ? 1 : -1;
      return a.daysLeft - b.daysLeft;
    });
  };

  S.subMonthlyTotal = function (db, onlyActive) {
    return U.sum((db.subscriptions || []).filter(function (s) {
      return onlyActive === false ? true : s.active !== false;
    }).map(S.subMonthlyCost));
  };

  S.subYearlyTotal = function (db, onlyActive) {
    return U.sum((db.subscriptions || []).filter(function (s) {
      return onlyActive === false ? true : s.active !== false;
    }).map(S.subYearlyCost));
  };

  // Berapa langganan yang jatuh tempo dalam N hari ke depan dan belum dibayar
  S.subDueSoon = function (db, days, today) {
    const n = days === undefined ? 7 : days;
    return S.subStatus(db, today).filter(function (r) {
      return !r.paidThisMonth && r.daysLeft <= n;
    });
  };

  /* ============================================================
     7. PROFIL — beberapa "akun" lokal, tiap profil data sendiri
     Tiap profil punya kunci penyimpanan sendiri:
       DB_KEY::<id profil>
     Karena itu data antar profil terpisah total tanpa kode tambahan.
     ============================================================ */
  const PROFILES_KEY = 'savingduit.profiles';
  const ACTIVE_KEY = 'savingduit.profile.active';
  const LOCKED_KEY = 'savingduit.profile.locked';

  function read(key, def) {
    if (!store) return def;
    try { const v = store.getItem(key); return v === null ? def : JSON.parse(v); }
    catch (e) { return def; }
  }
  function write(key, val) {
    if (!store) return false;
    try { store.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  /* Kunci penyimpanan data memakai SESSION_KEY (lihat Persist.key()).
     Jadi tiap kali profil aktif berubah, SESSION_KEY harus ikut disetel. */
  function syncSession(id) {
    if (!store) return;
    try {
      if (id) store.setItem(SESSION_KEY, id);
      else store.removeItem(SESSION_KEY);
    } catch (e) { /* abaikan */ }
  }

  /* Hash PIN sederhana (djb2 + garam). Bukan kripto kelas militer, tapi
     cukup supaya PIN tidak terbaca apa adanya di localStorage. */
  function hashPin(pin, salt) {
    const s = 'sd::' + salt + '::' + pin;
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }

  const Profiles = {
    KEY: PROFILES_KEY,
    ACTIVE: ACTIVE_KEY,
    LOCKED: LOCKED_KEY,
    hashPin: hashPin,

    /* Semua profil terdaftar. Kalau belum ada DAN ada data lama
       (kunci DB_KEY polos), data lama itu otomatis jadi profil pertama. */
    list: function () {
      let arr = read(PROFILES_KEY, null);
      if (Array.isArray(arr) && arr.length) return arr;

      // migrasi: apakah ada data versi lama tanpa profil?
      let ada = false;
      if (store) {
        try { ada = !!store.getItem(DB_KEY); } catch (e) { ada = false; }
      }
      const first = {
        id: 'pf_default',
        name: 'Pribadi',
        icon: '🏠',
        color: '#5b8def',
        pinHash: '',
        salt: '',
        created: new Date().toISOString()
      };
      arr = [first];
      write(PROFILES_KEY, arr);
      write(ACTIVE_KEY, first.id);
      syncSession(first.id);

      // pindahkan data lama ke kunci profil pertama (sekali saja)
      if (store && ada) {
        try {
          const lama = store.getItem(DB_KEY);
          if (lama !== null && store.getItem(DB_KEY + '::' + first.id) === null) {
            store.setItem(DB_KEY + '::' + first.id, lama);
          }
          store.removeItem(DB_KEY);
        } catch (e) { /* biarkan, data tetap di kunci lama */ }
      }
      return arr;
    },

    save: function (arr) { return write(PROFILES_KEY, arr); },

    get: function (id) {
      return Profiles.list().filter(function (p) { return p.id === id; })[0] || null;
    },

    activeId: function () {
      const list = Profiles.list();
      let id = read(ACTIVE_KEY, '');
      if (!id || !list.some(function (p) { return p.id === id; })) {
        id = list[0] ? list[0].id : '';
        write(ACTIVE_KEY, id);
      }
      syncSession(id);
      return id;
    },

    active: function () { return Profiles.get(Profiles.activeId()); },

    setActive: function (id) {
      if (!Profiles.get(id)) return false;
      write(ACTIVE_KEY, id);
      syncSession(id);
      return true;
    },

    hasPin: function (p) { return !!(p && p.pinHash); },

    checkPin: function (id, pin) {
      const p = Profiles.get(id);
      if (!p) return false;
      if (!p.pinHash) return true;                 // tanpa PIN = selalu boleh
      return hashPin(String(pin == null ? '' : pin), p.salt) === p.pinHash;
    },

    /** Buat profil baru. pin kosong = tanpa sandi. Mengembalikan objek profil. */
    create: function (name, icon, color, pin) {
      const list = Profiles.list();
      const salt = U.uid('sl');
      const p = {
        id: U.uid('pf'),
        name: String(name || '').trim() || ('Profil ' + (list.length + 1)),
        icon: icon || '👤',
        color: color || '#5b8def',
        pinHash: pin ? hashPin(String(pin), salt) : '',
        salt: salt,
        created: new Date().toISOString()
      };
      list.push(p);
      Profiles.save(list);
      return p;
    },

    update: function (id, patch, pin) {
      const list = Profiles.list();
      const p = list.filter(function (x) { return x.id === id; })[0];
      if (!p) return false;
      if (patch && typeof patch.name === 'string' && patch.name.trim()) p.name = patch.name.trim();
      if (patch && patch.icon) p.icon = patch.icon;
      if (patch && patch.color) p.color = patch.color;
      if (pin !== undefined && pin !== null) {
        if (String(pin) === '') { p.pinHash = ''; p.salt = ''; }
        else { p.salt = p.salt || U.uid('sl'); p.pinHash = hashPin(String(pin), p.salt); }
      }
      Profiles.save(list);
      return true;
    },

    /* Hapus profil + seluruh datanya. Profil terakhir tidak boleh dihapus. */
    remove: function (id) {
      const list = Profiles.list();
      if (list.length <= 1) return false;
      const p = list.filter(function (x) { return x.id === id; })[0];
      if (!p) return false;
      const sisa = list.filter(function (x) { return x.id !== id; });
      Profiles.save(sisa);
      try { if (store) store.removeItem(DB_KEY + '::' + id); } catch (e) { /* abaikan */ }
      if (Profiles.activeId() === id) {
        write(ACTIVE_KEY, sisa[0].id);
        syncSession(sisa[0].id);
      }
      return true;
    },

    /* ---- status kunci pada sesi browser ini (dilupakan saat tab ditutup) ---- */
    isLocked: function (id) {
      const arr = read(LOCKED_KEY, []);
      return Array.isArray(arr) && arr.indexOf(id) > -1;
    },
    lock: function (id) {
      const arr = read(LOCKED_KEY, []);
      const a = Array.isArray(arr) ? arr : [];
      if (a.indexOf(id) === -1) a.push(id);
      write(LOCKED_KEY, a);
    },
    unlock: function (id) {
      const arr = read(LOCKED_KEY, []);
      if (!Array.isArray(arr)) return;
      write(LOCKED_KEY, arr.filter(function (x) { return x !== id; }));
    },

    /* Berapa profil yang punya PIN — dipakai untuk menyembunyikan tombol kunci
       kalau memang tidak ada sandi sama sekali. */
    countPinned: function () {
      return Profiles.list().filter(function (p) { return !!p.pinHash; }).length;
    },

    /* Status awal saat aplikasi dibuka */
    bootState: function () {
      const id = Profiles.activeId();
      const p = Profiles.get(id);
      return { id: id, profile: p, needUnlock: !!(p && p.pinHash && Profiles.isLocked(id)) };
    }
  };

  S.Profiles = Profiles;
  S.Persist = Persist;
  S.emptyDB = emptyDB;
  S.seedDB = seedDB;
  S.DB_VERSION = DB_VERSION;
  S.SEED_CATEGORIES = SEED_CATEGORIES;
  S.SEED_WALLETS = SEED_WALLETS;
  S.DB_KEY = DB_KEY;
  root.S = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);