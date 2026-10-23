const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const context = { TextEncoder, S: {filterTx: db => db.transactions} };
vm.createContext(context);vm.runInContext(fs.readFileSync('public/js/excel.js','utf8'),context);
const tx = {date:'2026-10-23',type:'out',amount:123456.75,walletId:'w',categoryId:'c',note:'=HYPERLINK("x") & <catatan> 🐱',by:'pasangan'};
const db = {wallets:[{id:'w',name:'Bank & Tunai'}], categories:[{id:'c',name:'Makan'}],transactions:[tx,{...tx,type:'in',amount:99}]};
function unzip(bytes) {
 const result = {};const b=Buffer.from(bytes);let offset=0;
 while(b.readUInt32LE(offset)===0x04034b50){const size=b.readUInt32LE(offset+18),n=b.readUInt16LE(offset+26),e=b.readUInt16LE(offset+28);const name=b.toString('utf8',offset+30,offset+30+n);offset+=30+n+e;result[name]=b.toString('utf8',offset,offset+size);offset+=size;}return result;
}
function xml(text){const d=new JSDOM(text,{contentType:'application/xml'});return d.window.document;}
const before=JSON.stringify(db);
const bytes=context.Excel.buat(db,'keluarga','2026-10-23');
const parts=unzip(bytes);assert.equal(Object.keys(parts).length,8);
for(const text of Object.values(parts))xml(text);
const sheet=xml(parts['xl/worksheets/sheet1.xml']);
assert.equal(sheet.querySelector('pane').getAttribute('state'),'frozen');
assert.equal(sheet.querySelectorAll('col').length,8);
assert.equal(sheet.querySelector('c[r="C5"] v').textContent,'123456.75');
assert.equal(sheet.querySelector('c[r="C5"]').getAttribute('t'),null);
assert.equal(sheet.querySelector('c[r="H5"]').getAttribute('t'),'inlineStr');
assert.equal(sheet.querySelector('c[r="H5"] t').textContent,tx.note);
assert.equal(sheet.querySelectorAll('f').length,0,'untrusted text never becomes a formula');
assert.equal(sheet.querySelector('c[r="A5"] v').textContent,'46318');
assert.equal(sheet.querySelector('c[r="G5"] t').textContent,'pasangan');
assert.equal(xml(parts['xl/tables/table1.xml']).querySelector('autoFilter').getAttribute('ref'),'A4:H6');
assert(parts['xl/styles.xml'].includes('FFFFC982'));
assert.equal(JSON.stringify(db),before);
const empty=unzip(context.Excel.buat({...db,transactions:[]},'pribadi','2026-10-23'));
assert.equal(xml(empty['xl/tables/table1.xml']).querySelector('table').getAttribute('ref'),'A4:H5');
if(process.argv[2])fs.writeFileSync(process.argv[2],bytes);
console.log('PASS: XLSX XML, table/filter, freeze, numeric money/date, UTF-8, safe text, empty book, immutable source');
