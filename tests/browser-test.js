/* ============================================================
   tests/browser-test.js — uji di browser SUNGGUHAN (Chrome headless)
   Fokus: hal yang jsdom TIDAK bisa tangkap — cascade CSS, `hidden`,
   apakah elemen benar-benar bisa diklik (elementFromPoint).

   Latar belakang: bug nyata di mana `.modal-wrap{display:grid}` menimpa
   atribut `hidden` HTML, sehingga overlay modal selalu menutupi layar.
   jsdom melaporkan "display: none" (salah), Chrome melaporkan "grid".
   Hanya uji di browser sungguhan yang bisa menangkapnya.

   Jalankan:  node tests/browser-test.js
   Lewati otomatis (exit 0) kalau Chrome tidak terpasang.
   ============================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', 'public');
const PROBE = path.join(ROOT, '_probe.html');
const PORT = 8877 + Math.floor(Math.random() * 200);

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; fails.push(name + (extra ? '  \u2192 ' + extra : '')); console.log('  \u2717 ' + name + (extra ? '  \u2192 ' + extra : '')); }
}
function section(t) { console.log('\n' + t); }

/* ---------- cari Chrome ---------- */
function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  for (const c of cands) { try { if (fs.statSync(c).isFile()) return c; } catch (e) {} }
  return null;
}

/* ---------- server statis sementara ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function startServer() {
  return new Promise(function (resolve) {
    const srv = http.createServer(function (req, res) {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (rel === '/') rel = '/index.html';
      const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.\/|\.\.\\|[\/\\])+/, ''));
      fs.readFile(file, function (err, buf) {
        if (err) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store' });
        res.end(buf);
      });
    });
    srv.listen(PORT, function () { resolve(srv); });
  });
}

/* ---------- halaman pemeriksa (dijalankan DI DALAM browser) ---------- */
const PROBE_HTML = `<!doctype html><meta charset="utf-8"><title>probe</title>
<style>body{font:13px monospace}iframe{width:1100px;height:700px}</style>
<iframe id="f" src="/index.html"></iframe><pre id="out">waiting</pre>
<script>
var L=[];
function say(m){L.push(m);document.getElementById('out').textContent=L.join('\\n');}
function err(e){say('ERR '+(e&&e.message?e.message:e));}
var __mulai=false;
function __start(){ if(__mulai) return; __mulai=true; try{ s1(); }catch(e){ err(e); } }
window.addEventListener('load',function(){setTimeout(__start,1500);});
setTimeout(__start,4000);
var d,w;
function hit(sel){
  try{
    var e=d.querySelector(sel); if(!e) return 'TIDAK ADA';
    var r=e.getBoundingClientRect(); if(!r.width||!r.height) return 'ukuran-0';
    var h=d.elementFromPoint(r.left+r.width/2,r.top+r.height/2); if(!h) return 'kosong';
    if(h===e||e.contains(h)) return 'BISA_DIKLIK';
    if(e.parentNode&&e.parentNode.contains(h)) return 'BISA_DIKLIK';
    return 'TERTUTUP#'+h.id+'<'+h.tagName+'>';
  }catch(x){return 'ERR '+x.message;}
}
function s1(){try{
  d=document.getElementById('f').contentDocument;w=document.getElementById('f').contentWindow;
  w.localStorage.clear();
  say('T stylesheet|'+Array.prototype.filter.call(d.styleSheets,function(s){return s.href&&s.href.indexOf('css/style.css')>-1;}).length);
  say('T overlay-display|'+w.getComputedStyle(d.getElementById('modal-wrap')).display);
  say('T overlay-rect|'+Math.round(d.getElementById('modal-wrap').getBoundingClientRect().width));
  say('T modal-title-bawaan|'+JSON.stringify(d.getElementById('modal-title').textContent));
  say('T menu-dashboard|'+hit('[data-view="dashboard"]'));
  say('T menu-transaksi|'+hit('[data-view="transaksi"]'));
  say('T menu-rekap|'+hit('[data-view="rekap"]'));
  say('T menu-dompet|'+hit('[data-view="dompet"]'));
  say('T menu-kategori|'+hit('[data-view="kategori"]'));
  say('T menu-anggaran|'+hit('[data-view="anggaran"]'));
  say('T menu-target|'+hit('[data-view="target"]'));
  say('T menu-langganan|'+hit('[data-view="langganan"]'));
  say('T menu-pengaturan|'+hit('[data-view="pengaturan"]'));
  say('T menu-profil|'+hit('[data-view="profil"]'));
  say('T tombol-profil-sidebar|'+hit('#btn-profil'));
  say('T topbar-total|'+hit('#total-pill'));
  var manageSelector='#content .planner-wallets button';
  var b=d.querySelector(manageSelector);
  say('T tombol-konten|'+(b?b.textContent.trim()+'|'+hit(manageSelector):'TIDAK ADA'));
  say('T planner-donut|'+!!d.querySelector('.planner-donut[role="img"][aria-label]'));
  say('T planner-chart|'+!!d.querySelector('#dash-chart'));
  say('T content-svg|'+(d.querySelectorAll('#content .ui-icon').length > 0));
  var probe=d.createElement('div');
  probe.innerHTML='<button class="btn" title="Modifier">✏️</button><input value="🏠"><span class="ico">🏦</span>';
  d.body.appendChild(probe);
  w.U.polishIcons(probe);
  say('T icon-conversion|'+(probe.querySelectorAll('svg').length===2 && probe.querySelector('input').value==='🏠' && !!probe.querySelector('button').getAttribute('aria-label')));
  w.U.polishIcons(probe);
  say('T icon-idempotent|'+(probe.querySelectorAll('svg').length===2));
  probe.remove();
  d.querySelector('[data-view="transaksi"]').click();
  setTimeout(s2,400);
}catch(e){err(e);}}
function s2(){try{
  say('T judul-halaman|'+d.getElementById('page-title').textContent);
  say('T baris-transaksi|'+d.querySelectorAll('#content .tx-row,#content tbody tr').length);
  var tin=d.querySelector('#content .btn, #content button');
  say('T tombol-di-transaksi|'+(tin?tin.textContent.trim():'TIDAK ADA'));
  w.V.txForm(); setTimeout(s3,350);
}catch(e){err(e);}}
function s3(){try{
  say('T form-terbuka|'+(!d.getElementById('modal-wrap').hidden));
  say('T overlay-display-terbuka|'+w.getComputedStyle(d.getElementById('modal-wrap')).display);
  say('T input-nominal|'+hit('#f-amount'));
  say('T tombol-simpan|'+hit('#f-save'));
  say('T tombol-tutup|'+hit('#modal-foot [data-close], #modal [data-close]'));
  var a=d.getElementById('f-amount');
  a.value='123.456';a.dispatchEvent(new w.Event('input',{bubbles:true}));
  var n=d.getElementById('f-note');
  n.value='tes klik';n.dispatchEvent(new w.Event('input',{bubbles:true}));
  say('T hint-nominal|'+d.getElementById('f-amount-hint').textContent.trim());
  d.getElementById('f-save').click(); setTimeout(s4,400);
}catch(e){err(e);}}
function s4(){try{
  var t=w.App.db.transactions;
  say('T jumlah-transaksi|'+t.length);
  say('T nominal-tersimpan|'+(t[0]?t[0].amount:'-'));
  say('T catatan-tersimpan|'+(t[0]?JSON.stringify(t[0].note):'-'));
  say('T modal-tertutup|'+d.getElementById('modal-wrap').hidden);
  say('T overlay-display-lagi|'+w.getComputedStyle(d.getElementById('modal-wrap')).display);
  say('T topbar-setelah-simpan|'+d.getElementById('total-pill').textContent);
  // buka konfirmasi, pastikan tombolnya bisa diklik
  w.V.confirm('Uji','pesan','OK',true).then(function(v){ say('T konfirmasi-hasil|'+v); });
  w.__txBefore=w.App.db.transactions.length;
  setTimeout(s5,300);
}catch(e){err(e);}}
function s5(){try{
  say('T tombol-ok-konfirmasi|'+hit('#cf-ok'));
  say('T overlay-display-konfirmasi|'+w.getComputedStyle(d.getElementById('modal-wrap')).display);
  var okbtn=d.getElementById('cf-ok'); if(okbtn) okbtn.click();
  setTimeout(s6,300);
}catch(e){err(e);}}
function s6(){try{
  say('T modal-tertutup-2|'+d.getElementById('modal-wrap').hidden);
  // ---- uji halaman Tahap 2 ----
  sMenu();
}catch(e){err(e);}}
function s7(){try{
  say('T anggaran-judul|'+d.getElementById('page-title').textContent);
  say('T anggaran-kosong|'+(d.querySelector('#content .empty')?'YA':'TIDAK'));
  var tambah=Array.prototype.filter.call(d.querySelectorAll('#content button'),function(b){return /Tambah Anggaran/.test(b.textContent);})[0];
  say('T anggaran-tombol|'+(tambah?'ADA':'TIDAK ADA'));
  w.V.budgetForm(); setTimeout(s8,350);
}catch(e){err(e);}}
function s8(){try{
  say('T bform-terbuka|'+(!d.getElementById('modal-wrap').hidden));
  var sel=d.getElementById('b-cat'); var opt=null;
  for(var i=0;i<sel.options.length;i++){ if(sel.options[i].value && /Makan/.test(sel.options[i].textContent)){opt=sel.options[i].value;break;} }
  say('T bform-punya-kategori|'+(opt?'YA':'TIDAK'));
  sel.value=opt; sel.dispatchEvent(new w.Event('change',{bubbles:true}));
  var lim=d.getElementById('b-limit');
  lim.value='1.000.000'; lim.dispatchEvent(new w.Event('input',{bubbles:true}));
  say('T bform-nominal-terformat|'+lim.value);
  say('T bform-simpan-bisa-diklik|'+hit('#b-save'));
  d.getElementById('b-save').click(); setTimeout(s9,400);
}catch(e){err(e);}}
function sMenu(){try{
  d.querySelector('.bnav-item[data-bview="menu"]').click();
  setTimeout(function(){try{
    say('T menu-judul|'+d.getElementById('page-title').textContent);
    var link=d.querySelectorAll('#content .menu-link');
    say('T menu-jumlah|'+link.length);
    var tujuan=Array.prototype.map.call(link,function(a){return (a.getAttribute('href')||'').replace('#/','');});
    say('T menu-semua-fitur|'+['dashboard','transaksi','rekap','anggaran','target','langganan','dompet','kategori','profil','pengaturan'].every(function(v){return tujuan.indexOf(v)>-1;}));
    var beranda=Array.prototype.filter.call(link,function(a){return a.getAttribute('href')==='#/dashboard';})[0];
    (beranda||link[0]).click();
    setTimeout(function(){try{
      say('T menu-tautan-jalan|'+d.getElementById('page-title').textContent);
      d.querySelector('.bnav-item[data-bview="menu"]').click();
      setTimeout(function(){try{
        var kotak=d.querySelector('#content .menu-terakhir');
        say('T menu-terakhir-ada|'+(kotak?'ADA':'TIDAK ADA'));
        var tautan=kotak&&kotak.querySelector('.menu-link');
        say('T menu-terakhir-tujuan|'+(tautan?(tautan.getAttribute('href')||'').replace('#/',''):'-'));
        var semua=d.querySelectorAll('#content .menu-link');
        say('T menu-daftar-tetap-lengkap|'+semua.length);
        var lbl=d.querySelector('.bnav-item[data-bview="menu"] .bnav-lbl');
        say('T menu-label-balik|'+(lbl?lbl.textContent:'-'));
        d.querySelector('.bnav-item[data-bview="menu"]').click();
        setTimeout(function(){try{
          say('T menu-tap-lagi|'+d.getElementById('page-title').textContent);
          say('T menu-label-pulih|'+d.querySelector('.bnav-item[data-bview="menu"] .bnav-lbl').textContent);
          w.App.db.budgets=[]; w.App.db.goals=[]; w.App.db.subscriptions=[];
          d.querySelector('[data-view="anggaran"]').click();
          setTimeout(s7,400);
        }catch(e){err(e);}},400);
      }catch(e){err(e);}},400);
    }catch(e){err(e);}},400);
  }catch(e){err(e);}},400);
}catch(e){err(e);}}
function s9(){try{
  say('T anggaran-tersimpan|'+w.App.db.budgets.length);
  say('T anggaran-batas|'+(w.App.db.budgets[0]?w.App.db.budgets[0].limit:'-'));
  say('T anggaran-kartu-muncul|'+(d.querySelector('#content .prog')?'YA':'TIDAK'));
  say('T anggaran-persen-di-balik|'+w.S.budgetStatus(w.App.db,'2026-10-15')[0].usage.pct);
  d.querySelector('[data-view="target"]').click(); setTimeout(s10,400);
}catch(e){err(e);}}
function s10(){try{
  say('T target-judul|'+d.getElementById('page-title').textContent);
  w.V.goalForm(); setTimeout(s11,350);
}catch(e){err(e);}}
function s11(){try{
  d.getElementById('g-name').value='Dana darurat';
  var gt=d.getElementById('g-target'); gt.value='20.000.000'; gt.dispatchEvent(new w.Event('input',{bubbles:true}));
  say('T gform-target-terformat|'+gt.value);
  d.getElementById('g-save').click(); setTimeout(s12,400);
}catch(e){err(e);}}
function s12(){try{
  say('T target-tersimpan|'+w.App.db.goals.length);
  say('T target-jumlah|'+(w.App.db.goals[0]?w.App.db.goals[0].target:'-'));
  var nb=Array.prototype.filter.call(d.querySelectorAll('#content button'),function(b){return b.textContent.indexOf('Nabung')>-1 && b.textContent.indexOf('+')>-1;})[0];
  say('T target-tombol-nabung|'+(nb?'ADA':'TIDAK ADA'));
  nb.click(); setTimeout(s13,350);
}catch(e){err(e);}}
function s13(){try{
  say('T nabung-modal|'+(!d.getElementById('modal-wrap').hidden));
  var inp=d.getElementById('ga-amt');
  inp.value='2.500.000'; inp.dispatchEvent(new w.Event('input',{bubbles:true}));
  say('T nabung-terformat|'+inp.value);
  say('T nabung-simpan-bisa-diklik|'+hit('#ga-save'));
  d.getElementById('ga-save').click(); setTimeout(s14,400);
}catch(e){err(e);}}
function s14(){try{
  say('T target-terkumpul|'+(w.App.db.goals[0]?w.App.db.goals[0].saved:'-'));
  say('T target-persen|'+Math.round(w.S.goalProgress(w.App.db.goals[0]).pct));
  d.querySelector('[data-view="langganan"]').click(); setTimeout(s15,400);
}catch(e){err(e);}}
function s15(){try{
  say('T langganan-judul|'+d.getElementById('page-title').textContent);
  w.V.subForm(); setTimeout(s16,350);
}catch(e){err(e);}}
function s16(){try{
  d.getElementById('s-name').value='Netflix';
  var am=d.getElementById('s-amount'); am.value='54.000'; am.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.getElementById('s-day').value='20';
  d.getElementById('s-cycle').dispatchEvent(new w.Event('change',{bubbles:true}));
  say('T sform-jatuh-tempo-hint|'+d.getElementById('s-day-hint').textContent.slice(0,20));
  say('T sform-simpan-bisa-diklik|'+hit('#s-save'));
  d.getElementById('s-save').click(); setTimeout(s17,400);
}catch(e){err(e);}}
function s17(){try{
  say('T langganan-tersimpan|'+w.App.db.subscriptions.length);
  say('T langganan-nominal|'+(w.App.db.subscriptions[0]?w.App.db.subscriptions[0].amount:'-'));
  say('T langganan-tanggal|'+(w.App.db.subscriptions[0]?w.App.db.subscriptions[0].day:'-'));
  w.__txBefore=w.App.db.transactions.length;
  say('T langganan-tx-sebelum|'+w.__txBefore);
  var bayar=Array.prototype.filter.call(d.querySelectorAll('#content button'),function(b){return /Tandai dibayar/.test(b.textContent);})[0];
  say('T langganan-tombol-bayar|'+(bayar?'ADA':'TIDAK ADA'));
  bayar.click(); setTimeout(s18,500);
}catch(e){err(e);}}
function s18(){try{
  say('T langganan-tx-sesudah|'+w.App.db.transactions.length);
  say('T langganan-transaksi-dibuat|'+(w.App.db.transactions.length===w.__txBefore+1?'YA':'TIDAK'));
  var tx=w.App.db.transactions[w.App.db.transactions.length-1];
  say('T langganan-catatan|'+JSON.stringify(tx.note));
  say('T langganan-nominal-tx|'+tx.amount);
  say('T langganan-tanda-lunas|'+(d.querySelector('#content .tag.ok')?'YA':'TIDAK'));
  // halaman-halaman Tahap 2 harus bisa dibuka tanpa error
  ['anggaran','target','langganan','dashboard'].forEach(function(vw){
    d.querySelector('[data-view="'+vw+'"]').click();
  });
  d.querySelector('[data-view="dashboard"]').click();
  setTimeout(s19,600);
}catch(e){err(e);}}
function s19(){try{
  say('T dashboard-ringkasan-tahap2|'+(d.querySelectorAll('#content .prog').length>0?'ADA':'TIDAK ADA'));
  say('T dashboard-anggaran-muncul|'+(/Anggaran Bulan Ini/.test(d.getElementById('content').innerHTML)?'YA':'TIDAK'));
  var fam=d.querySelector('#content .fam-masuk a');
  say('T dashboard-keluarga|'+(fam&&/keluarga\.html/.test(fam.getAttribute('href'))&&fam.getBoundingClientRect().height>10?'ADA':'TIDAK'));
  var bad=L.filter(function(x){return String(x).indexOf('TERTUTUP')>-1||String(x).indexOf('ERR')>-1||String(x).indexOf('ukuran-0')>-1;});
  say('T ringkas|'+(bad.length?bad.length+' MASALAH':'BERSIH'));
  // lanjut uji profil
  d.querySelector('[data-view="profil"]').click();
  setTimeout(s20,500);
}catch(e){err(e);}}

/* ---------------- profil ---------------- */
function s20(){try{
  say('T profil-judul|'+d.getElementById('page-title').textContent);
  say('T profil-kartu|'+d.querySelectorAll('#content .profil-card').length);
  say('T profil-tombol-baru|'+hit('#content .btn.primary'));
  say('T profil-nama-aktif|'+d.getElementById('pb-nama').textContent.trim());
  say('T profil-ikon-sidebar|'+d.getElementById('pb-ic').textContent.trim());
  say('T profil-btn-sidebar-terlihat|'+(d.getElementById('btn-profil').getBoundingClientRect().width>40?'YA':'TIDAK'));
  say('T profil-kunci-tersembunyi|'+(d.getElementById('btn-kunci').hidden?'YA':'TIDAK'));
  // buka form profil baru
  var b=d.querySelector('#content .btn.primary');
  b.click();
  setTimeout(s21,400);
}catch(e){err(e);}}
function s21(){try{
  say('T pform-terbuka|'+(!d.getElementById('modal-wrap').hidden));
  say('T pform-overlay-display|'+w.getComputedStyle(d.getElementById('modal-wrap')).display);
  say('T pform-nama|'+hit('#p-nama'));
  say('T pform-pin|'+hit('#p-pin'));
  say('T pform-tombol-simpan|'+hit('#p-save'));
  say('T pform-ikon|'+d.querySelectorAll('#p-ikon .ikon-btn').length);
  say('T pform-warna|'+d.querySelectorAll('#p-warna .warna-btn').length);
  say('T pform-ikon-bisa-diklik|'+hit('#p-ikon .ikon-btn'));
  var ik=d.querySelectorAll('#p-ikon .ikon-btn')[2];
  var wl=d.querySelectorAll('#p-warna .warna-btn')[1];
  say('T pform-ikon-dipilih|'+ik.getAttribute('data-ikon'));
  say('T pform-warna-dipilih|'+wl.getAttribute('data-warna'));
  ik.click(); wl.click();
  var n=d.getElementById('p-nama');n.value='Usaha Browser';n.dispatchEvent(new w.Event('input',{bubbles:true}));
  var p=d.getElementById('p-pin');p.value='4321';p.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.getElementById('p-save').click();
  setTimeout(s22,600);
}catch(e){err(e);}}
function s22(){try{
  var P=w.S.Profiles, list=P.list();
  say('T profil-jumlah|'+list.length);
  var np=list.filter(function(x){return x.name==='Usaha Browser';})[0];
  say('T profil-aktif-baru|'+(P.activeId()===(np?np.id:'')?'YA':'TIDAK'));
  say('T profil-ikon-tersimpan|'+(np?np.icon:'-'));
  say('T profil-bersandi|'+(np&&np.pinHash?'YA':'TIDAK'));
  say('T profil-pin-hash-bukan-teks|'+(np&&np.pinHash!=='4321'?'YA':'TIDAK'));
  say('T profil-induk-kosong|'+((w.App.db.transactions||[]).length));
  say('T profil-sidebar-berubah|'+d.getElementById('pb-nama').textContent.trim());
  say('T profil-modal-tertutup|'+d.getElementById('modal-wrap').hidden);
  say('T profil-tombol-kunci-muncul|'+(d.getElementById('btn-kunci').hidden?'TIDAK':'YA'));
  say('T profil-film-baris|'+(d.querySelectorAll('#content .profil-card, #content .card').length));
  // setelah profil baru dibuat, app sengaja pindah ke Dashboard
  say('T profil-setelah-buat|'+d.getElementById('page-title').textContent);
  // kunci profil sekarang
  d.getElementById('btn-kunci').click();
  setTimeout(s23,600);
}catch(e){err(e);}}
function s23(){try{
  say('T kunci-status|'+(w.S.Profiles.isLocked(w.S.Profiles.activeId())?'TERKUNCI':'TERBUKA'));
  say('T kunci-layar-muncul|'+(!d.getElementById('modal-wrap').hidden));
  say('T kunci-layar-display|'+w.getComputedStyle(d.getElementById('modal-wrap')).display);
  say('T kunci-input-ada|'+hit('#pg-pin'));
  say('T kunci-pesan-di-body|'+(d.getElementById('modal-body').textContent.indexOf('sandi')>-1?'YA':'TIDAK'));
  // coba tutup paksa dengan klik luar + Esc: harus tetap terbuka
  d.getElementById('modal-wrap').click();
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  say('T kunci-tahan-tutup|'+(!d.getElementById('modal-wrap').hidden?'YA':'TIDAK'));
  // sandi salah
  var i=d.getElementById('pg-pin');i.value='0000';i.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.getElementById('pg-ok').click();
  setTimeout(s24,400);
}catch(e){err(e);}}
function s24(){try{
  say('T kunci-sandi-salah-tetap-terkunci|'+(w.S.Profiles.isLocked(w.S.Profiles.activeId())?'YA':'TIDAK'));
  say('T kunci-pesan-error|'+d.getElementById('pg-err').textContent.trim().slice(0,30));
  // lihat: menu data harus sembunyi saat terkunci
  say('T kunci-menu-disembunyikan|'+(d.querySelector('[data-view="dashboard"]').hidden?'YA':'TIDAK'));
  say('T kunci-menu-profil-tetap-muncul|'+(d.querySelector('[data-view="profil"]').hidden?'TIDAK':'YA'));
  // isi sandi benar
  var i=d.getElementById('pg-pin');i.value='4321';i.dispatchEvent(new w.Event('input',{bubbles:true}));
  d.getElementById('pg-ok').click();
  setTimeout(s25,600);
}catch(e){err(e);}}
function s25(){try{
  say('T buka-berhasil|'+(!w.S.Profiles.isLocked(w.S.Profiles.activeId())?'YA':'TIDAK'));
  say('T buka-modal-tertutup|'+d.getElementById('modal-wrap').hidden);
  say('T buka-menu-kembali|'+(d.querySelector('[data-view="dashboard"]').hidden?'TIDAK':'YA'));
  say('T buka-body-tidak-terkunci|'+(d.body.classList.contains('terkunci')?'YA(TIDAK BOLEH)':'TIDAK'));
  // tulis catatan di profil ini
  w.App.db.transactions=[w.S.mkTx({date:w.U.today(),type:'out',amount:222222,walletId:w.App.db.wallets[0].id,note:'hanya-usaha-browser'})];
  w.App.save();
  w.__idUsaha=w.S.Profiles.activeId();
  w.__idPribadi=w.S.Profiles.list().filter(function(x){return x.name==='Pribadi';})[0].id;
  d.querySelector('[data-view="profil"]').click();
  setTimeout(s26,500);
}catch(e){err(e);}}
function s26(){try{
  // pindah ke profil Pribadi lewat tombol "Pakai"
  var cards=Array.prototype.slice.call(d.querySelectorAll('#content .profil-card'));
  say('T pindah-kartu-ada|'+cards.length);
  var sasaran=cards.filter(function(c){return c.textContent.indexOf('Pribadi')>-1;})[0];
  var btn=sasaran?sasaran.querySelector('.btn'):null;
  say('T pindah-tombol-pakai-ada|'+(btn?btn.textContent.trim():'TIDAK ADA'));
  btn.click();
  setTimeout(s27,500);
}catch(e){err(e);}}
function s27(){try{
  say('T pindah-konfirmasi-muncul|'+(!d.getElementById('modal-wrap').hidden));
  say('T pindah-tombol-ok-ada|'+hit('#pp-ok'));
  d.getElementById('pp-ok').click();
  setTimeout(s28,700);
}catch(e){err(e);}}
function s28(){try{
  var P=w.S.Profiles;
  say('T pindah-berhasil|'+(P.activeId()===w.__idPribadi?'YA':'TIDAK'));
  say('T pindah-sidebar-nama|'+d.getElementById('pb-nama').textContent.trim());
  say('T pindah-idak-ada-bocor|'+(JSON.stringify(w.App.db.transactions).indexOf('hanya-usaha-browser')===-1?'YA':'TIDAK'));
  say('T pindah-halaman-dashboard|'+d.getElementById('page-title').textContent);
  say('T pindah-saldo-bed|'+w.S.totalBalance(w.App.db));
  // balik ke profil Usaha, buktikan datanya utuh
  P.setActive(w.__idUsaha); w.App.muatProfil(); w.App.render();
  setTimeout(s29,400);
}catch(e){err(e);}}
function s29(){try{
  say('T balik-data-utuh|'+(JSON.stringify(w.App.db.transactions).indexOf('hanya-usaha-browser')>-1?'YA':'TIDAK'));
  say('T balik-jumlah-transaksi|'+(w.App.db.transactions||[]).length);
  // hapus profil Usaha lewat UI
  d.querySelector('[data-view="profil"]').click();
  setTimeout(s30,500);
}catch(e){err(e);}}
function s30(){try{
  var cards=Array.prototype.slice.call(d.querySelectorAll('#content .profil-card'));
  var kartu=cards.filter(function(c){return c.textContent.indexOf('Usaha Browser')>-1;})[0];
  say('T hapus-kartu-ada|'+(kartu?'YA':'TIDAK'));
  var tombols=kartu?kartu.querySelectorAll('.btn'):[];
  say('T hapus-tombol-ada|'+tombols.length);
  tombols[tombols.length-1].click();
  setTimeout(s31,500);
}catch(e){err(e);}}
function s31(){try{
  say('T hapus-modal-muncul|'+(!d.getElementById('modal-wrap').hidden));
  say('T hapus-peringatan|'+(d.getElementById('modal-body').textContent.indexOf('hilang permanen')>-1?'YA':'TIDAK'));
  say('T hapus-tombol-awal-mati|'+(d.getElementById('pd-ok').disabled?'YA':'TIDAK'));
  var i=d.getElementById('pd-konfirm');
  i.value='salah';i.dispatchEvent(new w.Event('input',{bubbles:true}));
  say('T hapus-nama-salah-tetap-mati|'+(d.getElementById('pd-ok').disabled?'YA':'TIDAK'));
  i.value='Usaha Browser';i.dispatchEvent(new w.Event('input',{bubbles:true}));
  say('T hapus-nama-benar-tombol-hidup|'+(d.getElementById('pd-ok').disabled?'TIDAK':'YA'));
  d.getElementById('pd-ok').click();
  setTimeout(s32,700);
}catch(e){err(e);}}
function s32(){try{
  var P=w.S.Profiles;
  say('T hapus-jumlah-profil|'+P.list().length);
  say('T hapus-sudah-hilang|'+(P.list().filter(function(x){return x.name==='Usaha Browser';}).length===0?'YA':'TIDAK'));
  say('T hapus-data-hilang|'+(w.S.Persist.loadFor(w.__idUsaha)===null?'YA':'TIDAK'));
  say('T hapus-aktif-pindah|'+(P.activeId()===w.__idPribadi?'YA':'TIDAK'));
  say('T hapus-profil-terakhir-ditolak|'+(P.remove(w.__idPribadi)===false?'YA':'TIDAK'));
  // pastikan halaman profil masih bisa dibuka setelah semua ini
  d.querySelector('[data-view="profil"]').click();
  setTimeout(s33,500);
}catch(e){err(e);}}
function s33(){try{
  say('T akhir-halaman-profil|'+(d.getElementById('content').innerHTML.indexOf('profil-list')>-1?'YA':'TIDAK'));
  say('T akhir-tombol-tambah|'+hit('#content .btn.primary'));
  say('T akhir-nav-dashboard|'+hit('[data-view="dashboard"]'));
  var nol=[];
  Array.prototype.forEach.call(d.querySelectorAll('#content .profil-card'),function(c){
    if(c.getBoundingClientRect().width<40) nol.push('kartu-ukuran-0');
  });
  say('T akhir-tidak-ada-ukuran-0|'+(nol.length?nol.join(','):'BERSIH'));
  say('T akhir-menu-bisa-diklik|'+hit('[data-view="dashboard"]'));
  document.title='DONE';
}catch(e){err(e);}}

</script>`;

/* Jalankan browser tanpa memblokir event loop (server harus tetap melayani). */
function runHeadless(chrome, url) {
  return new Promise(function (resolve, reject) {
    const args = ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
      '--disable-extensions', '--hide-scrollbars', '--window-size=1200,800',
      '--virtual-time-budget=60000', '--dump-dom', url];
    const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(function () {
      try { child.kill('SIGKILL'); } catch (e) {}
      out ? resolve(out) : reject(new Error('browser melebihi batas waktu'));
    }, 90000);
    child.stdout.on('data', function (b) { out += b.toString(); });
    child.on('error', function (e) { clearTimeout(timer); reject(e); });
    child.on('close', function () { clearTimeout(timer); resolve(out); });
  });
}

/* ---------- jalankan ---------- */
(async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.log('\n  Chrome/Edge tidak ditemukan — tes browser dilewati.');
    console.log('  Setel CHROME_PATH kalau browser dipasang di lokasi lain.\n');
    process.exit(0);
  }
  console.log('  Browser: ' + chrome);

  fs.writeFileSync(PROBE, PROBE_HTML, 'utf8');
  const srv = await startServer();

  let dom = '';
  try {
    dom = await runHeadless(chrome, 'http://localhost:' + PORT + '/_probe.html');
  } catch (e) {
    console.log('\n  Gagal menjalankan browser: ' + e.message);
    cleanup(srv);
    process.exit(1);
  }
  cleanup(srv);

  const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
  if (!m) { console.log('\n  Tidak dapat membaca hasil dari browser.'); process.exit(1); }

  const raw = m[1].split(String.fromCharCode(13)).join('')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const vals = {};
  raw.split('\n').forEach(function (line) {
    const p = line.split('|');
    if (p[0] && p[0].indexOf('T ') === 0) { vals[p[0].slice(2)] = p.slice(1); }
  });
  const v = k => (vals[k] || [''])[0];
  const vAll = k => (vals[k] || ['']);

  if (v('ringkas') === '') { console.log('\n  Browser tidak menyelesaikan pemeriksaan. Hasil mentah:\n' + raw); process.exit(1); }

  section('1. CSS benar-benar dimuat di browser');
  ok('stylesheet termuat', v('stylesheet') === '1', 'dapat ' + v('stylesheet'));
  ok('overlay modal TERSEMBUNYI saat mulai (bug display:grid vs hidden)',
     v('overlay-display') === 'none', 'display = ' + v('overlay-display'));
  ok('overlay modal tidak memakan ruang layar', v('overlay-rect') === '0', 'lebar = ' + v('overlay-rect'));
  ok('judul modal bawaan kosong (bukan kata "Judul")', v('modal-title-bawaan') === '""',
     'dapat ' + v('modal-title-bawaan'));

  section('2. Semua menu sidebar bisa diklik (elementFromPoint)');
  ['dashboard', 'transaksi', 'rekap', 'anggaran', 'target', 'langganan', 'dompet', 'kategori', 'pengaturan'].forEach(function (name) {
    ok('menu ' + name + ' bisa diklik', v('menu-' + name) === 'BISA_DIKLIK', 'hasil = ' + v('menu-' + name));
  });
  ok('pil total saldo bisa diklik', v('topbar-total') === 'BISA_DIKLIK', 'hasil = ' + v('topbar-total'));
  ok('tombol "Kelola" di konten bisa diklik',
     /Kelola/.test(vAll('tombol-konten')[0] || '') && (vAll('tombol-konten')[1] === 'BISA_DIKLIK'),
     'hasil = ' + vAll('tombol-konten').join(' | '));

  ok('diagram donat dashboard memiliki label aksesibel', v('planner-donut') === 'true');
  ok('pemilih periode statistik tetap tersedia', v('planner-chart') === 'true');
  ok('ikon SVG tersedia dalam konten dashboard', v('content-svg') === 'true');
  ok('menu menampilkan daftar fitur', Number(v('menu-jumlah')) >= 10);
  ok('menu memuat seluruh fitur, bukan langsung Pengaturan', v('menu-semua-fitur') === 'true');
  ok('tautan menu membuka halaman yang dituju', /Catatan Transaksi|Dashboard/.test(v('menu-tautan-jalan')));
  ok('menu menawarkan halaman terakhir dibuka di paling atas', v('menu-terakhir-ada') === 'ADA' && v('menu-terakhir-tujuan') === 'dashboard', 'ada=' + v('menu-terakhir-ada') + ' tujuan=' + v('menu-terakhir-tujuan'));
  ok('daftar fitur tetap lengkap walau ada bagian Terakhir Dibuka', Number(v('menu-daftar-tetap-lengkap')) >= 11);
  ok('tab Menu berubah jadi tombol kembali saat daftar terbuka', v('menu-label-balik') === 'Kembali');
  ok('tekan tab Menu sekali lagi kembali ke halaman sebelumnya', v('menu-tap-lagi') === 'Dashboard');
  ok('label tab Menu pulih setelah keluar dari daftar', v('menu-label-pulih') === 'Menu');
  ok('ikon diganti tanpa mengubah input dan memiliki label', v('icon-conversion') === 'true');
  ok('penggantian ikon aman dipanggil berulang', v('icon-idempotent') === 'true');

  section('3. Navigasi nyata lewat klik di browser');
  ok('judul halaman berubah jadi "Catatan Transaksi"',
     v('judul-halaman') === 'Catatan Transaksi', 'dapat ' + v('judul-halaman'));
  ok('halaman transaksi punya tombol', v('tombol-di-transaksi') !== 'TIDAK ADA', 'dapat ' + v('tombol-di-transaksi'));

  section('4. Form modal: terbuka, terlihat, bisa diketik, bisa disimpan');
  ok('form terbuka', v('form-terbuka') === 'true', 'dapat ' + v('form-terbuka'));
  ok('overlay terlihat saat form terbuka', v('overlay-display-terbuka') === 'grid', 'display = ' + v('overlay-display-terbuka'));
  ok('input nominal bisa diklik', v('input-nominal') === 'BISA_DIKLIK', 'hasil = ' + v('input-nominal'));
  ok('tombol Simpan bisa diklik', v('tombol-simpan') === 'BISA_DIKLIK', 'hasil = ' + v('tombol-simpan'));
  ok('tombol tutup (X) bisa diklik', v('tombol-tutup') === 'BISA_DIKLIK', 'hasil = ' + v('tombol-tutup'));
  ok('nominal yang diketik langsung dibaca & diformat aplikasi',
     v('hint-nominal').indexOf('123.456') > -1, 'dapat ' + v('hint-nominal'));
  ok('transaksi benar-benar tersimpan', v('jumlah-transaksi') === '1', 'jumlah = ' + v('jumlah-transaksi'));
  ok('nominal tersimpan benar', v('nominal-tersimpan') === '123456', 'dapat ' + v('nominal-tersimpan'));
  ok('catatan tersimpan benar', v('catatan-tersimpan') === '"tes klik"', 'dapat ' + v('catatan-tersimpan'));
  ok('modal tertutup setelah simpan', v('modal-tertutup') === 'true', 'dapat ' + v('modal-tertutup'));
  ok('overlay kembali tersembunyi setelah simpan', v('overlay-display-lagi') === 'none',
     'display = ' + v('overlay-display-lagi'));

  section('5. Saldo di topbar ikut terhitung di browser');
  ok('topbar menampilkan nominal negatif hasil pengeluaran',
     v('topbar-setelah-simpan') === 'Rp -123.456', 'dapat ' + v('topbar-setelah-simpan'));

  section('6. Konfirmasi modal bisa diklik & resolve');
  ok('tombol OK konfirmasi bisa diklik', v('tombol-ok-konfirmasi') === 'BISA_DIKLIK',
     'hasil = ' + v('tombol-ok-konfirmasi'));
  ok('overlay terlihat saat konfirmasi', v('overlay-display-konfirmasi') === 'grid',
     'display = ' + v('overlay-display-konfirmasi'));
  ok('konfirmasi resolve true setelah tombol OK diklik', v('konfirmasi-hasil') === 'true',
     'dapat ' + v('konfirmasi-hasil'));
  ok('modal tertutup setelah konfirmasi', v('modal-tertutup-2') === 'true', 'dapat ' + v('modal-tertutup-2'));

  section('7. Anggaran: halaman, form, simpan, hitung ulang');
  ok('judul halaman anggaran', v('anggaran-judul') === 'Anggaran per Kategori', 'dapat ' + v('anggaran-judul'));
  ok('tanpa anggaran tampil kotak kosong', v('anggaran-kosong') === 'YA', 'dapat ' + v('anggaran-kosong'));
  ok('tombol Tambah Anggaran ada di konten', v('anggaran-tombol') === 'ADA', 'dapat ' + v('anggaran-tombol'));
  ok('form anggaran terbuka', v('bform-terbuka') === 'true', 'dapat ' + v('bform-terbuka'));
  ok('pilihan kategori terisi', v('bform-punya-kategori') === 'YA', 'dapat ' + v('bform-punya-kategori'));
  ok('nominal anggaran diformat saat diketik', v('bform-nominal-terformat') === '1.000.000',
     'dapat ' + v('bform-nominal-terformat'));
  ok('tombol Simpan anggaran bisa diklik', v('bform-simpan-bisa-diklik') === 'BISA_DIKLIK',
     'hasil = ' + v('bform-simpan-bisa-diklik'));
  ok('anggaran benar-benar tersimpan', v('anggaran-tersimpan') === '1', 'jumlah = ' + v('anggaran-tersimpan'));
  ok('batas anggaran tersimpan sebagai angka', v('anggaran-batas') === '1000000', 'dapat ' + v('anggaran-batas'));
  ok('kartu anggaran muncul dengan bilah progres', v('anggaran-kartu-muncul') === 'YA',
     'dapat ' + v('anggaran-kartu-muncul'));
  ok('perhitungan pemakaian jalan di browser', v('anggaran-persen-di-balik') !== 'ERR',
     'pct = ' + v('anggaran-persen-di-balik'));

  section('8. Target tabungan: halaman, form, simpan, menabung');
  ok('judul halaman target', v('target-judul') === 'Target Tabungan', 'dapat ' + v('target-judul'));
  ok('target tersimpan', v('target-tersimpan') === '1', 'jumlah = ' + v('target-tersimpan'));
  ok('target dana tersimpan sebagai angka', v('target-jumlah') === '20000000', 'dapat ' + v('target-jumlah'));
  ok('nominal target diformat saat diketik', v('gform-target-terformat') === '20.000.000',
     'dapat ' + v('gform-target-terformat'));
  ok('tombol Nabung ada di kartu target', v('target-tombol-nabung') === 'ADA',
     'dapat ' + v('target-tombol-nabung'));
  ok('modal Nabung terbuka', v('nabung-modal') === 'true', 'dapat ' + v('nabung-modal'));
  ok('nominal nabung diformat saat diketik', v('nabung-terformat') === '2.500.000',
     'dapat ' + v('nabung-terformat'));
  ok('tombol Nabung bisa diklik', v('nabung-simpan-bisa-diklik') === 'BISA_DIKLIK',
     'hasil = ' + v('nabung-simpan-bisa-diklik'));
  ok('saldo target bertambah', v('target-terkumpul') === '2500000', 'dapat ' + v('target-terkumpul'));
  ok('persen target dihitung (2,5jt dari 20jt = 13%)', v('target-persen') === '13',
     'dapat ' + v('target-persen') + '%');

  section('9. Langganan: halaman, form, simpan, tandai dibayar');
  ok('judul halaman langganan', v('langganan-judul') === 'Langganan Bulanan', 'dapat ' + v('langganan-judul'));
  ok('langganan tersimpan', v('langganan-tersimpan') === '1', 'jumlah = ' + v('langganan-tersimpan'));
  ok('nominal langganan tersimpan', v('langganan-nominal') === '54000', 'dapat ' + v('langganan-nominal'));
  ok('tanggal jatuh tempo tersimpan', v('langganan-tanggal') === '20', 'dapat ' + v('langganan-tanggal'));
  ok('petunjuk jatuh tempo tampil', /Tanggal/.test(v('sform-jatuh-tempo-hint')),
     'dapat ' + v('sform-jatuh-tempo-hint'));
  ok('tombol Simpan langganan bisa diklik', v('sform-simpan-bisa-diklik') === 'BISA_DIKLIK',
     'hasil = ' + v('sform-simpan-bisa-diklik'));
  ok('tombol Tandai dibayar ada', v('langganan-tombol-bayar') === 'ADA', 'dapat ' + v('langganan-tombol-bayar'));
  ok('menandai dibayar membuat 1 transaksi baru', v('langganan-transaksi-dibuat') === 'YA',
     v('langganan-tx-sebelum') + ' -> ' + v('langganan-tx-sesudah'));
  ok('catatan transaksi memuat penanda /sub:', /\/sub:s/.test(v('langganan-catatan')),
     'catatan = ' + v('langganan-catatan'));
  ok('nominal transaksi langganan benar', v('langganan-nominal-tx') === '54000',
     'dapat ' + v('langganan-nominal-tx'));
  ok('badge "sudah dibayar" muncul', v('langganan-tanda-lunas') === 'YA',
     'dapat ' + v('langganan-tanda-lunas'));

  section('10. Dashboard menampilkan ringkasan Tahap 2');
  ok('dashboard punya bilah progres', v('dashboard-ringkasan-tahap2') === 'ADA',
     'dapat ' + v('dashboard-ringkasan-tahap2'));
  ok('kartu Anggaran Bulan Ini muncul', v('dashboard-anggaran-muncul') === 'YA',
     'dapat ' + v('dashboard-anggaran-muncul'));
  ok('pintu masuk keuangan keluarga ada di dashboard', v('dashboard-keluarga') === 'ADA',
     'dapat ' + v('dashboard-keluarga'));

  section('11. Ringkasan: tidak ada elemen tertutup / ukuran nol');
  ok('tidak ada elemen yang tertutup atau berukuran nol', v('ringkas') === 'BERSIH',
     'dapat: ' + v('ringkas'));

  section('12. Menu & tombol profil ada dan bisa diklik');
  ok('menu Profil bisa diklik', v('menu-profil') === 'BISA_DIKLIK', 'dapat ' + v('menu-profil'));
  ok('tombol profil di sidebar bisa diklik', v('tombol-profil-sidebar') === 'BISA_DIKLIK',
     'dapat ' + v('tombol-profil-sidebar'));
  ok('halaman Profil terbuka', v('profil-judul') === 'Profil', 'dapat ' + v('profil-judul'));
  ok('daftar profil tampil', Number(v('profil-kartu')) >= 1, 'dapat ' + v('profil-kartu'));
  ok('tombol "+ Profil Baru" bisa diklik', v('profil-tombol-baru') === 'BISA_DIKLIK',
     'dapat ' + v('profil-tombol-baru'));
  ok('nama profil aktif tampil di sidebar', (v('profil-nama-aktif') || '').length > 0,
     'dapat ' + v('profil-nama-aktif'));
  ok('tombol profil di sidebar punya ukuran nyata', v('profil-btn-sidebar-terlihat') === 'YA',
     'dapat ' + v('profil-btn-sidebar-terlihat'));
  ok('profil tanpa sandi -> tombol kunci tersembunyi', v('profil-kunci-tersembunyi') === 'YA',
     'dapat ' + v('profil-kunci-tersembunyi'));

  section('13. Form profil: terbuka, terlihat, bisa dipilih, bisa disimpan');
  ok('form profil terbuka', v('pform-terbuka') === 'true', 'dapat ' + v('pform-terbuka'));
  ok('overlay form profil benar-benar tampil (bukan grid nyangkut)', v('pform-overlay-display') === 'grid',
     'dapat ' + v('pform-overlay-display'));
  ok('field nama bisa diklik', v('pform-nama') === 'BISA_DIKLIK', 'dapat ' + v('pform-nama'));
  ok('field sandi bisa diklik', v('pform-pin') === 'BISA_DIKLIK', 'dapat ' + v('pform-pin'));
  ok('tombol simpan bisa diklik', v('pform-tombol-simpan') === 'BISA_DIKLIK', 'dapat ' + v('pform-tombol-simpan'));
  ok('pilihan ikon tersedia (>4)', Number(v('pform-ikon')) > 4, 'dapat ' + v('pform-ikon'));
  ok('pilihan warna tersedia (>4)', Number(v('pform-warna')) > 4, 'dapat ' + v('pform-warna'));
  ok('tombol ikon bisa diklik', v('pform-ikon-bisa-diklik') === 'BISA_DIKLIK', 'dapat ' + v('pform-ikon-bisa-diklik'));

  section('14. Profil baru: tersimpan, bersandi, langsung aktif');
  ok('profil bertambah jadi 2', Number(v('profil-jumlah')) === 2, 'dapat ' + v('profil-jumlah'));
  ok('profil baru langsung aktif', v('profil-aktif-baru') === 'YA', 'dapat ' + v('profil-aktif-baru'));
  ok('ikon yang dipilih tersimpan', v('profil-ikon-tersimpan') === v('pform-ikon-dipilih'),
     'dapat ' + v('profil-ikon-tersimpan') + ', pilih ' + v('pform-ikon-dipilih'));
  ok('sandi terpasang', v('profil-bersandi') === 'YA', 'dapat ' + v('profil-bersandi'));
  ok('sandi disimpan sebagai hash, bukan teks biasa', v('profil-pin-hash-bukan-teks') === 'YA',
     'dapat ' + v('profil-pin-hash-bukan-teks'));
  ok('profil baru tidak mewarisi transaksi', Number(v('profil-induk-kosong')) === 0,
     'dapat ' + v('profil-induk-kosong'));
  ok('nama di sidebar ikut berubah', v('profil-sidebar-berubah') === 'Usaha Browser',
     'dapat ' + v('profil-sidebar-berubah'));
  ok('modal tertutup setelah simpan', v('profil-modal-tertutup') === 'true',
     'dapat ' + v('profil-modal-tertutup'));
  ok('tombol 🔒 Kunci muncul di sidebar', v('profil-tombol-kunci-muncul') === 'YA',
     'dapat ' + v('profil-tombol-kunci-muncul'));
  ok('setelah buat profil baru, aplikasi pindah ke Dashboard', v('profil-setelah-buat') === 'Dashboard',
     'dapat ' + v('profil-setelah-buat'));

  section('15. Mengunci profil: layar sandi muncul & tidak bisa ditembus');
  ok('profil jadi terkunci', v('kunci-status') === 'TERKUNCI', 'dapat ' + v('kunci-status'));
  ok('layar sandi muncul', v('kunci-layar-muncul') === 'true', 'dapat ' + v('kunci-layar-muncul'));
  ok('layar sandi benar-benar tampil', v('kunci-layar-display') === 'grid', 'dapat ' + v('kunci-layar-display'));
  ok('field sandi bisa diklik', v('kunci-input-ada') === 'BISA_DIKLIK', 'dapat ' + v('kunci-input-ada'));
  ok('ada penjelasan sandi', v('kunci-pesan-di-body') === 'YA', 'dapat ' + v('kunci-pesan-di-body'));
  ok('klik luar & tombol Esc tidak bisa menutup layar sandi', v('kunci-tahan-tutup') === 'YA',
     'dapat ' + v('kunci-tahan-tutup'));
  ok('sandi salah tetap terkunci', v('kunci-sandi-salah-tetap-terkunci') === 'YA',
     'dapat ' + v('kunci-sandi-salah-tetap-terkunci'));
  ok('ada pesan kesalahan saat sandi salah', (v('kunci-pesan-error') || '').indexOf('salah') > -1,
     'dapat ' + v('kunci-pesan-error'));
  ok('menu berisi data disembunyikan saat terkunci', v('kunci-menu-disembunyikan') === 'YA',
     'dapat ' + v('kunci-menu-disembunyikan'));
  ok('menu Profil tetap bisa dibuka saat terkunci', v('kunci-menu-profil-tetap-muncul') === 'YA',
     'dapat ' + v('kunci-menu-profil-tetap-muncul'));

  section('16. Sandi benar membuka profil');
  ok('sandi benar membuka profil', v('buka-berhasil') === 'YA', 'dapat ' + v('buka-berhasil'));
  ok('layar sandi tertutup', v('buka-modal-tertutup') === 'true', 'dapat ' + v('buka-modal-tertutup'));
  ok('menu data muncul kembali', v('buka-menu-kembali') === 'YA', 'dapat ' + v('buka-menu-kembali'));
  ok('penanda terkunci di body dibersihkan', v('buka-body-tidak-terkunci') === 'TIDAK',
     'dapat ' + v('buka-body-tidak-terkunci'));

  section('17. Pindah profil: data tidak bocor antar profil');
  ok('tombol "Pakai" ada di kartu profil lain', (v('pindah-tombol-pakai-ada') || '') === 'Pakai',
     'dapat ' + v('pindah-tombol-pakai-ada'));
  ok('konfirmasi pindah muncul', v('pindah-konfirmasi-muncul') === 'true', 'dapat ' + v('pindah-konfirmasi-muncul'));
  ok('tombol pindah bisa diklik', v('pindah-tombol-ok-ada') === 'BISA_DIKLIK', 'dapat ' + v('pindah-tombol-ok-ada'));
  ok('profil berpindah', v('pindah-berhasil') === 'YA', 'dapat ' + v('pindah-berhasil'));
  ok('nama di sidebar ikut berubah', v('pindah-sidebar-nama') === 'Pribadi', 'dapat ' + v('pindah-sidebar-nama'));
  ok('catatan profil lain TIDAK terlihat', v('pindah-idak-ada-bocor') === 'YA',
     'dapat ' + v('pindah-idak-ada-bocor'));
  ok('kembali ke Dashboard setelah pindah', v('pindah-halaman-dashboard') === 'Dashboard',
     'dapat ' + v('pindah-halaman-dashboard'));
  ok('saldo profil ini beda (data terpisah)', String(v('pindah-saldo-bed')) !== '222222',
     'dapat ' + v('pindah-saldo-bed'));
  ok('balik ke profil lama, datanya masih utuh', v('balik-data-utuh') === 'YA', 'dapat ' + v('balik-data-utuh'));
  ok('jumlah transaksi tetap 1', Number(v('balik-jumlah-transaksi')) === 1,
     'dapat ' + v('balik-jumlah-transaksi'));

  section('18. Hapus profil: peringatan, konfirmasi nama, data bersih');
  ok('kartu profil yang akan dihapus ada', v('hapus-kartu-ada') === 'YA', 'dapat ' + v('hapus-kartu-ada'));
  ok('modal hapus muncul', v('hapus-modal-muncul') === 'true', 'dapat ' + v('hapus-modal-muncul'));
  ok('ada peringatan data hilang permanen', v('hapus-peringatan') === 'YA', 'dapat ' + v('hapus-peringatan'));
  ok('tombol hapus mati sebelum nama diketik', v('hapus-tombol-awal-mati') === 'YA',
     'dapat ' + v('hapus-tombol-awal-mati'));
  ok('nama salah -> tombol tetap mati', v('hapus-nama-salah-tetap-mati') === 'YA',
     'dapat ' + v('hapus-nama-salah-tetap-mati'));
  ok('nama benar -> tombol hidup', v('hapus-nama-benar-tombol-hidup') === 'YA',
     'dapat ' + v('hapus-nama-benar-tombol-hidup'));
  ok('profil terhapus (tinggal 1)', Number(v('hapus-jumlah-profil')) === 1, 'dapat ' + v('hapus-jumlah-profil'));
  ok('profil benar-benar hilang dari daftar', v('hapus-sudah-hilang') === 'YA', 'dapat ' + v('hapus-sudah-hilang'));
  ok('data profil terhapus juga hilang', v('hapus-data-hilang') === 'YA', 'dapat ' + v('hapus-data-hilang'));
  ok('profil aktif pindah otomatis', v('hapus-aktif-pindah') === 'YA', 'dapat ' + v('hapus-aktif-pindah'));
  ok('profil terakhir tidak bisa dihapus', v('hapus-profil-terakhir-ditolak') === 'YA',
     'dapat ' + v('hapus-profil-terakhir-ditolak'));

  section('19. Setelah semua urusan profil, aplikasi masih sehat');
  ok('halaman profil masih bisa dibuka', v('akhir-halaman-profil') === 'YA', 'dapat ' + v('akhir-halaman-profil'));
  ok('tombol "+ Profil Baru" masih bisa diklik', v('akhir-tombol-tambah') === 'BISA_DIKLIK',
     'dapat ' + v('akhir-tombol-tambah'));
  ok('menu Dashboard masih bisa diklik', v('akhir-menu-bisa-diklik') === 'BISA_DIKLIK',
     'dapat ' + v('akhir-menu-bisa-diklik'));
  ok('tidak ada kartu profil berukuran nol', v('akhir-tidak-ada-ukuran-0') === 'BERSIH',
     'dapat ' + v('akhir-tidak-ada-ukuran-0'));

  console.log('\n' + '='.repeat(56));
  console.log('  LULUS: ' + pass + '   GAGAL: ' + fail);
  if (fail) { console.log('\n  Yang gagal:'); fails.forEach(f => console.log('   - ' + f)); }
  console.log('='.repeat(56));
  process.exit(fail ? 1 : 0);
})();

function cleanup(srv) {
  try { srv.close(); } catch (e) {}
  if (!process.env.KEEP_PROBE) try { fs.unlinkSync(PROBE); } catch (e) {}
}