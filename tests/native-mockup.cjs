/* Isolated Chrome checks: mockup only, no production API or real account. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const {spawn} = require('node:child_process');
const root = path.resolve('docs');
const concept = process.argv.includes('--quiet') ? 'native-mockup-quiet' : 'native-mockup';
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if(!fs.existsSync(chrome))throw Error('Chrome not found; set CHROME_PATH');
const harness = `<!doctype html><html><body><iframe id="app" src="/${concept}/index.html" style="width:390px;height:844px;border:0"></iframe><pre id="result">WAIT</pre><script>
window.addEventListener('load',async()=>{
const frame=document.getElementById('app'),w=frame.contentWindow,d=w.document,fail=[];let count=0;
const check=(ok,label)=>{count++;if(!ok)fail.push(label);};
const wait=()=>new Promise(r=>setTimeout(r,25));
const click=s=>{const b=d.querySelector(s);if(!b)throw Error('missing '+s);b.click();};
try{
 check(w.totals().balance===9900000,'initial balance');
 check(w.totals().expense===300000,'initial expenses');
 check(!w.validEntry('0','2026-10-25','test'),'reject zero');
 check(!w.validEntry('1.5','2026-10-25','test'),'reject decimals');
 check(!w.validEntry('1000000000000','2026-10-25','test'),'reject oversize');
 check(!w.validEntry('12','2026-02-30','test'),'reject invalid date');
 check(!w.validEntry('12','2026-10-25','  '),'reject blank note');
 check(w.validEntry('25000','2026-10-25','test'),'valid entry');
 for(const width of [320,360,390,414,600,768,1024,1440]){
 frame.style.width=width+'px';await wait();
 for(const page of ['home','history','plans','more']){
 w.navigate(page);await wait();
 check(d.documentElement.scrollWidth<=width+1,width+' '+page+' document width');
 const screen=d.getElementById('screen');
 check(screen.scrollWidth<=screen.clientWidth+1,width+' '+page+' content width');
 check(!!screen.querySelector('h1'),width+' '+page+' heading');
 check(d.querySelector('[aria-current="page"]').dataset.page===page,width+' '+page+' navigation');
 for(const button of screen.querySelectorAll('button'))check(button.getBoundingClientRect().height>=44,width+' '+page+' touch target');
 }
 }
 frame.style.width='390px';await wait();w.navigate('home');click('[data-action="add"]');
 let f=d.getElementById('entry-form');
 f.elements.amount.value='25000';f.elements.note.value='<img src=x onerror=alert(1)>';f.elements.wallet.value='cash';f.requestSubmit();
 check(!d.getElementById('entry-dialog').open,'save closes form');
 check(w.totals().balance===9875000,'save updates balance');
 check(w.totals().expense===325000,'save updates expenses');
 check(!d.querySelector('#screen img'),'note escaped not rendered');
 w.navigate('history');
 const search=d.getElementById('search');search.value='<img';search.dispatchEvent(new w.Event('input',{bubbles:true}));
 check(d.querySelectorAll('#history-results .tx').length===1,'search results');
 click('[data-filter="in"]');check(d.querySelectorAll('#history-results .tx').length===0,'combined income filter');
 search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));
 check(d.querySelectorAll('#history-results .tx').length===1,'income only');
 click('#book-switch');click('[data-book="family"]');
 check(w.totals().balance===5015000,'family isolated balance');
 check(d.getElementById('book-label').textContent==='Buku keluarga','family label');
 check(!d.getElementById('screen').textContent.includes('<img'),'personal note not in family');
 click('#book-switch');click('[data-book="personal"]');check(w.totals().balance===9875000,'personal data retained');
 // Out-of-period records affect wallet balance, not October cards/budget.
 w.action('add');f.elements.amount.value='1000';f.elements.note.value='November';f.elements.date.value='2026-11-01';f.requestSubmit();
 check(w.totals().expense===325000,'monthly total excludes November');
 check(w.totals().balance===9874000,'all dates in wallet balance');
 for(const height of [844,420,300]){
 frame.style.height=height+'px';w.action('add');await wait();
 const dialog=d.getElementById('entry-dialog'),r=dialog.getBoundingClientRect(),save=dialog.querySelector('[type="submit"]').getBoundingClientRect();
 check(r.top>=0&&r.bottom<=height+1,height+' dialog contained');
 check(save.top>=0&&save.bottom<=height+1,height+' save visible');
 dialog.close();
 }
 for(const id of ['wallets','categories','sync','backup','account','about','goal']){
 w.action(id);check(d.getElementById('info-dialog').open,id+' information');d.getElementById('info-dialog').close();
 }
 w.navigate('home');
}catch(e){fail.push(e.stack);}
document.getElementById('result').textContent=JSON.stringify({count,fail});
});</script>`;
const server=http.createServer((req,res)=>{
 if(req.url==='/test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(harness);return;}
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(file));
});
server.listen(0,'127.0.0.1',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kk-native-mockup-'));
 const child=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--user-data-dir='+temp,'--dump-dom','--virtual-time-budget=15000','http://127.0.0.1:'+server.address().port+'/test']);
 let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
 child.on('error',e=>{console.error(e);server.close();process.exitCode=1;});
 child.on('close',()=>{
 try{
 const match=out.match(/<pre id="result">([^<]+)<\/pre>/);
 if(!match)throw Error('No test result: '+err.slice(-1000));
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&'));
 if(result.fail.length)throw Error(JSON.stringify(result,null,2));
 console.log(concept+': '+result.count+' checks passed');
 }catch(e){console.error(e.message);process.exitCode=1;}
 finally{server.close();fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
 });
});
