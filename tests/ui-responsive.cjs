/* Chrome layout checks for the shared dashboard and all application pages. No production requests. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { spawn } = require('node:child_process');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(chrome)) { console.error('Chrome not found; set CHROME_PATH'); process.exit(1); }
const root = path.resolve('public');
const script = `<!doctype html><html><body><iframe id="app" style="border:0;height:850px" src="/index.html"></iframe><pre id="result">WAITING</pre><script>
window.addEventListener('load',()=>setTimeout(async()=>{
 const frame=document.getElementById('app'),w=frame.contentWindow,d=w.document,fail=[];let count=0;
 const check=(yes,label)=>{count++;if(!yes)fail.push(label)};
 try {
 w.fetch=async()=>({ok:false,status:503,json:async()=>({})});
 w.K.uiGerbang=false;w.K.bolehBuka=()=>true;w.App.terkunci=false;d.body.classList.remove('wajib-masuk');
 w.K.terbuka=true;w.K.nama='dummy';w.Buku.akun='dummy';w.Buku.jumlah=2;w.Buku.revisi=0;
 w.Buku.anggota=[{username:'dummy',role:'owner'},{username:'dummy2',role:'partner'}];
 w.Buku.keluarga=w.S.normalize({wallets:[{id:'shared',name:'Tabungan keluarga dengan nama yang panjang sekali',initial:123456789012,icon:'🏦',type:'bank'}],categories:[{id:'food',name:'Makanan',type:'out',icon:'🍽️'}]});
 w.Buku.keluarga.transactions=[{id:'out',date:w.U.today(),type:'out',amount:50000,walletId:'shared',categoryId:'food',note:''},{id:'in',date:w.U.today(),type:'in',amount:100000,walletId:'shared',categoryId:'',note:''}];
 for(const width of [375,768,1024,1440]){
  frame.style.width=width+'px';await new Promise(r=>setTimeout(r,40));
  for(const page of ['dashboard','transaksi','rekap','anggaran','target','langganan','dompet','kategori','pengaturan','profil','menu']){
   w.App.view=page;w.App.render();await new Promise(r=>setTimeout(r,15));
   const content=d.getElementById('content');
   check(d.documentElement.scrollWidth<=width+1,width+' '+page+' document overflow');
   check(content.scrollWidth<=content.clientWidth+1,width+' '+page+' content overflow');
   check(!!d.getElementById('page-title').textContent,width+' '+page+' title');
   check(content.getBoundingClientRect().width>0,width+' '+page+' visible');
  }
  w.App.view='rekap';w.V.state.rekap.ym='2026-10';w.V.state.rekap.year='2026';
  for(const tab of ['hari','minggu','bulan','tahun']){
   w.V.state.rekap.tab=tab;w.App.render();
   const labels=Array.from(d.querySelectorAll('.column-label'));
   check(labels.length>0,width+' '+tab+' axis labels exist');
   check(labels.every(e=>w.getComputedStyle(e).whiteSpace==='nowrap'&&e.getBoundingClientRect().height<=33),width+' '+tab+' single line labels');
   const visible=labels.filter(e=>w.getComputedStyle(e).visibility==='visible');
   check(visible.every((e,i)=>!i||e.getBoundingClientRect().left>=visible[i-1].getBoundingClientRect().right+2),width+' '+tab+' labels no overlap');
   check(d.getElementById('content').scrollWidth<=d.getElementById('content').clientWidth+1,width+' '+tab+' chart contained');
   check(!d.querySelector('.column-scroll')&&d.querySelector('.column-plot').scrollWidth<=d.querySelector('.column-plot').clientWidth+1,width+' '+tab+' plot fits without scroll');
   check(!d.querySelector('.column-chart .sr-only'),width+' '+tab+' no leaked accessibility text');
   check(d.querySelectorAll('.column-axis span').length===5,width+' '+tab+' numeric axis');
   if(tab==='hari')check(labels.map(e=>e.textContent).join(',')===Array.from({length:31},(_,i)=>String(i+1)).join(','),width+' daily dates ordered 1-31');
  }
  w.App.view='dashboard';w.App.render();
  const hero=d.querySelector('.planner-dashboard>.grid>.stat');
  check(w.getComputedStyle(hero).backgroundColor==='rgb(245, 121, 11)',width+' orange balance hero');
  check(w.getComputedStyle(hero).borderTopWidth==='2px',width+' outlined balance hero');
  check(w.getComputedStyle(d.querySelector('.planner-dashboard .card')).boxShadow!=='none',width+' printed card shadow');
  w.V.state.dashboard.chart='30d';w.App.render();
  check(!!d.querySelector('.line-chart svg'),width+' daily trend rendered');
  check(d.getElementById('content').scrollWidth<=d.getElementById('content').clientWidth+1,width+' trend overflow');
  const scrollHost=d.getElementById('content');
  scrollHost.scrollTop=180;const posisi=scrollHost.scrollTop;
  check(posisi>0,width+' dashboard can scroll for period test');
  d.querySelector('#dash-chart [data-seg="12m"]').click();
  check(Math.abs(scrollHost.scrollTop-posisi)<=1,width+' period switch preserves scroll');
  w.App.view='transaksi';w.App.render();
  check(scrollHost.scrollTop===0,width+' changing page resets scroll');
  w.App.view='dashboard';w.App.render();
  const details=d.querySelector('.buku-detail');check(details&&!details.open,width+' family details collapsed');
  if(!details)throw Error('family detail missing at '+width+' view '+w.App.view+' shared '+w.Buku.bersama());details.open=true;await new Promise(r=>setTimeout(r,15));
  check(d.getElementById('content').scrollWidth<=d.getElementById('content').clientWidth+1,width+' expanded members overflow');
  w.V.walletForm();
  const save=d.getElementById('w-save'),rect=save.getBoundingClientRect();
  check(rect.height>=44,width+' wallet save touch size');
  check(rect.right<=width+1,width+' wallet modal overflow');
  check(d.querySelector('label[for="w-name"]'),width+' wallet name accessible label');
  w.V.modal.close();
 w.App.view='pengaturan';w.App.render();
 w.V.exportJSON();
 check(!!d.getElementById('ekspor-buku'),width+' backup asks for source book');
 check(d.getElementById('ekspor-buku').options.length===2,width+' backup keeps books separate');
 check(d.getElementById('ekspor-unduh').getBoundingClientRect().right<=width+1,width+' backup picker fits screen');
 w.V.modal.close();
 // Halaman Profil: penjelasan panjang dilipat supaya halaman tetap pendek.
 w.App.view='profil';w.App.render();await new Promise(r=>setTimeout(r,20));
 const lipat=d.querySelector('.lipat'),ringkas=lipat&&lipat.querySelector('summary'),profil=d.getElementById('content');
 check(!!lipat&&!lipat.open,width+' profil explanation folded by default');
 check(!!ringkas&&ringkas.getBoundingClientRect().height>=44,width+' folded heading touch size');
 check(!!ringkas.querySelector('svg.ui-icon'),width+' folded heading shows an indicator');
 check(profil.textContent.includes('bukan akun pasangan'),width+' profil keeps the local-profile warning');
 check(d.querySelectorAll('#content .card, #content section.card').length===4,width+' profil stays four cards');
 check(profil.scrollHeight<=(width<=500?1750:1300),width+' profil page stays short '+profil.scrollHeight);
 lipat.open=true;await new Promise(r=>setTimeout(r,20));
 check(w.getComputedStyle(lipat.querySelector('.ui-icon-wrap')).transform!=='none',width+' folded heading marks its open state');
 check(profil.scrollWidth<=profil.clientWidth+1,width+' folded profil has no overflow');
 lipat.open=false;
 }
 // Empty shared state must offer a useful action and retain data boundary.
 w.Buku.keluarga=w.S.normalize({});w.App.view='dashboard';w.App.render();
 check(!!d.querySelector('.wallet-onboarding .btn'),'empty wallet CTA');
 w.V.txForm();check(!!d.getElementById('w-name'),'empty transaction flow creates wallet first');w.V.modal.close();
 // Navigasi: satu pola per ukuran layar, tinggi seragam, teks >=4.5:1.
 const px=s=>((s||'').replace(/[^0-9.]+/g,' ').trim().split(' ').filter(Boolean)).map(Number);
 const lum=c=>{const m=px(c);if(m.length<3)return NaN;const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2])};
 const cr=(a,b)=>{const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return Math.round(((hi+0.05)/(lo+0.05))*100)/100};
 const over=(fg,bg)=>{const m=px(fg),n=px(bg);if(m.length<3||n.length<3)return 'rgb(0,0,0)';const a=m.length>3?m[3]:1;return 'rgb('+[0,1,2].map(i=>Math.round(m[i]*a+n[i]*(1-a))).join(',')+')'};
 const kontras=(a,b,label)=>check(cr(a,b)>=4.5,label+' '+cr(a,b)+':1');
 for(const width of [375,1440]){
  frame.style.width=width+'px';await new Promise(r=>setTimeout(r,60));
  const side=d.getElementById('sidebar');
  check(!d.getElementById('hamburger')&&!d.getElementById('scrim'),width+' dead sidebar drawer stays removed');
  if(w.getComputedStyle(side).display!=='none'){
   const sbg=w.getComputedStyle(side).backgroundColor;
   const items=Array.from(side.querySelectorAll('#nav a'));
   check(items.length===10,width+' sidebar lists 10 pages');
   check(items.every(a=>a.getBoundingClientRect().height>=44),width+' sidebar rows reach 44px');
   check(new Set(items.map(a=>Math.round(a.getBoundingClientRect().height))).size===1,width+' sidebar rows uniform height');
   check(new Set(items.map(a=>Math.round(a.querySelector('.nav-lbl').getBoundingClientRect().left))).size===1,width+' sidebar labels share one left edge');
   check(items.every(a=>a.querySelector('.nav-lbl').getBoundingClientRect().height<24),width+' sidebar labels stay on one line');
   check(items.filter(a=>a.getAttribute('aria-current')==='page').length===1,width+' exactly one current page');
   const aktif=items.filter(a=>a.classList.contains('active'))[0],pasif=items.filter(a=>!a.classList.contains('active'))[0];
   kontras(w.getComputedStyle(aktif).color,over(w.getComputedStyle(aktif).backgroundColor,sbg),width+' active row contrast');
   kontras(over(w.getComputedStyle(pasif).color,sbg),sbg,width+' resting row contrast');
   const bi=d.querySelector('.brand-icon');
   kontras(w.getComputedStyle(bi).color,over(w.getComputedStyle(bi).backgroundColor,sbg),width+' logo mark contrast');
   kontras(over(w.getComputedStyle(d.querySelector('.net-dot')).color,sbg),sbg,width+' sync status text contrast');
   check(d.querySelector('.profil-btn').getBoundingClientRect().height>=44,width+' account card touch size');
   const kaki=d.querySelector('.sidebar-foot'),kartu=d.querySelector('.profil-btn'),aksi=kaki.querySelector('.pb-aksi'),kiri=e=>Math.round(e.getBoundingClientRect().left);
   const ikon=items[0].querySelector('.ic').getBoundingClientRect();
   check(!!aksi&&aksi.querySelectorAll('button').length===2,width+' account actions share one row');
   check(kiri(kartu)===kiri(items[0]),width+' account card shares the menu left edge');
   check(Math.abs(kartu.getBoundingClientRect().width-items[0].getBoundingClientRect().width)<1,width+' account card matches menu row width');
   check(Math.abs(kiri(d.querySelector('.pb-ic'))-ikon.left)<=1,width+' account icon aligns with menu icons');
   check(Math.abs(kiri(d.querySelector('.pb-teks'))-kiri(items[0].querySelector('.nav-lbl')))<=1,width+' account text aligns with menu labels');
   const bt=Array.from(aksi.querySelectorAll('button')),kunci=d.getElementById('btn-kunci'),keluar=d.getElementById('btn-keluar');
   check(w.getComputedStyle(aksi).display==='none',width+' empty account actions collapse');
   kunci.hidden=false;keluar.hidden=false;
   const celah=bt[1].getBoundingClientRect().left-bt[0].getBoundingClientRect().right;
   check(celah>=6,width+' account actions keep a gap '+Math.round(celah)+'px');
   check(bt.every(b=>b.getBoundingClientRect().height>=44),width+' account actions reach 44px');
   check(bt.every(b=>b.getBoundingClientRect().width>=88),width+' account actions stay readable');
   check(d.querySelector('.net-dot').getBoundingClientRect().top-aksi.getBoundingClientRect().bottom>=6,width+' sync status not touching account actions');
   kunci.hidden=true;keluar.hidden=true;
   check(Math.abs(kiri(d.querySelector('.net-dot span'))-ikon.left)<=1,width+' sync dot aligns with menu icons');
   check(kaki.getBoundingClientRect().height<=170,width+' footer stays compact');
   check(d.querySelector('#btn-keluar').getAttribute('aria-label')==='Keluar akun',width+' short logout label keeps a full accessible name');
  }
  const bn=d.getElementById('bottom-nav');
  if(w.getComputedStyle(bn).display!=='none'&&bn.getBoundingClientRect().height>0){
   const its=Array.from(bn.querySelectorAll('.bnav-item')),fab=bn.querySelector('.bnav-fab'),br=bn.getBoundingClientRect();
   check(its.length===4&&!!fab,width+' bottom bar keeps 4 tabs plus one action');
   check(its.every(a=>a.getBoundingClientRect().height>=44),width+' bottom tabs reach 44px');
   check(new Set(its.map(a=>Math.round(a.querySelector('.bnav-lbl').getBoundingClientRect().top))).size===1,width+' bottom labels share one baseline');
   check(its.every(a=>a.querySelector('.bnav-lbl').scrollWidth<=a.querySelector('.bnav-lbl').clientWidth+1),width+' bottom labels not cut off');
   const fr=fab.getBoundingClientRect();
   check(fr.top>=br.top-1&&fr.bottom<=br.bottom+1,width+' center action stays inside the bar');
   check(fr.width>=44&&fr.height>=44,width+' center action touch size');
   check(fr.left-(its[1].getBoundingClientRect().right)>=2,width+' center action not touching its neighbours');
   const a2=its.filter(a=>a.classList.contains('active'))[0],p2=its.filter(a=>!a.classList.contains('active'))[0];
   check(Math.abs(a2.querySelector('.bnav-lbl').getBoundingClientRect().top-p2.querySelector('.bnav-lbl').getBoundingClientRect().top)<0.5,width+' current tab does not shift its label');
   kontras(w.getComputedStyle(a2).color,'rgb(254,254,255)',width+' current tab contrast');
   kontras(w.getComputedStyle(p2).color,'rgb(254,254,255)',width+' resting tab contrast');
   check(bn.getBoundingClientRect().bottom<=w.innerHeight+1,width+' bottom bar sits on the screen edge');
  }
 }
 // Reduced-motion CSS and keyboard navigation entry point.
 check(!!d.querySelector('.skip-link[href="#content"]'),'skip link');
 check(w.getComputedStyle(d.querySelector('.btn')).transitionDuration==='0s','reduced-motion honored');
 document.getElementById('result').textContent=JSON.stringify({count,fail});
 }catch(e){document.getElementById('result').textContent=JSON.stringify({count,fail:[e.stack]});}
},300));
<\/script></body></html>`;
const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json' };
const server = http.createServer((req,res)=>{
 if(req.url==='/__ui_probe'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(script);}
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
});
server.listen(0,'127.0.0.1',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'savingduit-ui-'));
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--force-prefers-reduced-motion','--user-data-dir='+dir,'--virtual-time-budget=30000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__ui_probe']);
 let out='';child.stdout.on('data',b=>out+=b);child.stderr.resume();
 child.on('close',()=>{
  server.close();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  const match=out.match(/<pre id="result">(.*?)<\/pre>/s);
  if(!match||match[1]==='WAITING'){console.error('No responsive test result');process.exitCode=1;return;}
  const data=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  console.log(JSON.stringify(data,null,2));process.exitCode=data.fail.length?1:0;
 });
});
