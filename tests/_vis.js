const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const ROOT=__dirname+'/..';
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'css/style.css'),'utf8');
const dom=new JSDOM(html,{url:'http://localhost/',pretendToBeVisual:true});
const {window}=dom;
// masukkan CSS seperti aslinya
const st=window.document.createElement('style'); st.textContent=css;
window.document.head.appendChild(st);
const mw=window.document.getElementById('modal-wrap');
console.log('atribut hidden          :', mw.hasAttribute('hidden'));
console.log('dianggap tersembunyi?   :', mw.hidden);
console.log('getComputedStyle display:', window.getComputedStyle(mw).display);
console.log((window.getComputedStyle(mw).display==='none') ? '\n=> BENAR: overlay tersembunyi' : '\n=> BUG: overlay TETAP TERLIHAT dan menutupi seluruh layar');
console.log('toast (kosong) display  :', window.getComputedStyle(window.document.getElementById('toasts')).display, '(padding 11px + border saat ada toast!)');
