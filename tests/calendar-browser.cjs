// Isolated local Chrome QA. Uses disposable browser data and in-memory fixtures only.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { spawn } = require('node:child_process');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const root = path.resolve('public');
const probe = `<!doctype html><iframe id="app" src="/index.html" style="border:0;height:812px"></iframe><pre id="result">WAITING</pre><script>
window.onload=()=>setTimeout(async()=>{
 const frame=document.getElementById('app'),w=frame.contentWindow,d=w.document,fail=[];let count=0;
 const check=(ok,label)=>{count++;if(!ok)fail.push(label)};
 try {
 w.fetch=async()=>({ok:false,status:503,json:async()=>({})});
 w.K.uiGerbang=false;w.K.bolehBuka=()=>true;w.App.terkunci=false;d.body.classList.remove('wajib-masuk');
 w.K.terbuka=false;w.App.db=w.S.seedDB();w.App.db.wallets[0].initial=10000000;
 const open=(inputId)=>{const input=d.getElementById(inputId),toggle=d.getElementById(inputId==='f-date'?'f-calendar-toggle':inputId+'-toggle');
  check(input.hidden,inputId+' native input hidden');toggle.click();
  const host=d.getElementById(inputId==='f-date'?'f-calendar':inputId+'-calendar');
  host.scrollIntoView({block:'nearest'});const box=host.getBoundingClientRect();
  check(!host.hidden,inputId+' calendar opens');
  check(box.width>0&&box.left>=0&&box.right<=frame.clientWidth+1,inputId+' calendar fits '+frame.clientWidth+' '+JSON.stringify({left:box.left,right:box.right,width:box.width}));
  check(host.scrollWidth<=host.clientWidth+1,inputId+' no internal overflow '+frame.clientWidth+' '+host.scrollWidth+'/'+host.clientWidth);
  for(const b of host.querySelectorAll('button')){const r=b.getBoundingClientRect();check(r.height>=44,inputId+' touch height '+b.textContent);check(r.left>=box.left&&r.right<=box.right+1,inputId+' button contained '+b.textContent)}
  const selected=host.querySelector('[aria-pressed="true"]');if(selected){check(w.getComputedStyle(selected).boxShadow!=='none',inputId+' selected shadow');}
  check(w.getComputedStyle(host).borderTopWidth==='2px',inputId+' outlined border');
  check(w.getComputedStyle(host).boxShadow!=='none',inputId+' hard shadow');
  return host;
 };
 for(const width of [320,375,600,768,860,1024,1440]){
  frame.style.width=width+'px';await new Promise(r=>setTimeout(r,30));
  w.V.state.transaksi.preset='today';w.App.view='transaksi';w.App.render();
  let host=open('tx-date');host.querySelector('[data-date]').click();check(d.getElementById('tx-date').value===w.V.state.transaksi.date,'daily change persisted');
  w.V.txForm(null,'out');host=open('f-date');host.querySelector('[data-date]').click();check(d.getElementById('f-calendar').hidden,'transaction selection closes');w.V.modal.close();
  w.V.goalForm(null,'pribadi');host=open('g-due');host.querySelector('[data-date]').click();const value=d.getElementById('g-due').value;
  check(!!value,'goal date selected');d.getElementById('g-due-toggle').click();d.querySelector('#g-due-calendar .calendar-clear').click();check(d.getElementById('g-due').value==='','goal date clear');w.V.modal.close();
  w.App.view='rekap';w.V.state.rekap.tab='hari';w.App.render();host=open('rk-ym');host.querySelector('[data-date]').click();check(d.getElementById('rk-ym').value===w.V.state.rekap.ym,'recap month change persisted');
  check(d.documentElement.scrollWidth<=width+1,'page no overflow '+width);
 }
 }catch(e){fail.push(e.stack)}
 document.getElementById('result').textContent=JSON.stringify({count,fail});
},300);
<\/script>`;
const server = http.createServer((req,res)=>{
 if(req.url==='/__calendar_probe'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(probe);}
 const file=path.join(root,new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
});
server.listen(0,'127.0.0.1',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kantong-calendar-'));
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--user-data-dir='+dir,'--virtual-time-budget=20000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__calendar_probe']);
 let out='';child.stdout.on('data',b=>out+=b);child.stderr.resume();
 child.on('close',()=>{
  server.close();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  const match=out.match(/<pre id="result">(.*?)<\/pre>/s);
  if(!match||match[1]==='WAITING'){console.error('No calendar browser result');process.exitCode=1;return;}
  const data=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  console.log(JSON.stringify(data,null,2));process.exitCode=data.fail.length?1:0;
 });
});
