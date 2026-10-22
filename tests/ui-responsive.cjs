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
  w.V.state.dashboard.chart='30d';w.App.render();
  check(!!d.querySelector('.line-chart svg'),width+' daily trend rendered');
  check(d.getElementById('content').scrollWidth<=d.getElementById('content').clientWidth+1,width+' trend overflow');
  const details=d.querySelector('.buku-detail');check(details&&!details.open,width+' family details collapsed');
  if(!details)throw Error('family detail missing at '+width+' view '+w.App.view+' shared '+w.Buku.bersama());details.open=true;await new Promise(r=>setTimeout(r,15));
  check(d.getElementById('content').scrollWidth<=d.getElementById('content').clientWidth+1,width+' expanded members overflow');
  w.V.walletForm();
  const save=d.getElementById('w-save'),rect=save.getBoundingClientRect();
  check(rect.height>=44,width+' wallet save touch size');
  check(rect.right<=width+1,width+' wallet modal overflow');
  check(d.querySelector('label[for="w-name"]'),width+' wallet name accessible label');
  w.V.modal.close();
 }
 // Empty shared state must offer a useful action and retain data boundary.
 w.Buku.keluarga=w.S.normalize({});w.App.view='dashboard';w.App.render();
 check(!!d.querySelector('.wallet-onboarding .btn'),'empty wallet CTA');
 w.V.txForm();check(!!d.getElementById('w-name'),'empty transaction flow creates wallet first');w.V.modal.close();
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
