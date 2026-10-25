'use strict';
// Prototipe terisolasi: tidak ada API, storage persisten, atau sesi akun nyata.
const money = n => 'Rp' + new Intl.NumberFormat('id-ID').format(n);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const TODAY = '2026-10-25';
const categories = {food:['🍜','Makan & minum'], ride:['🛵','Transportasi'], shop:['🛍️','Belanja'], salary:['💼','Pendapatan'], other:['📝','Lainnya']};
const books = {
 personal:{name:'Buku pribadi',greeting:'Selamat datang, Gozali 👋',opening:{bank:3200000,cash:500000},entries:[
 {note:'Makan siang',amount:35000,type:'out',category:'food',wallet:'cash',date:TODAY},
 {note:'Perjalanan ke kantor',amount:18000,type:'out',category:'ride',wallet:'cash',date:TODAY},
 {note:'Belanja mingguan',amount:247000,type:'out',category:'shop',wallet:'bank',date:'2026-10-24'},
 {note:'Gaji Oktober',amount:6500000,type:'in',category:'salary',wallet:'bank',date:'2026-10-01'}]},
 family:{name:'Buku keluarga',greeting:'Rencana bersama, ruang terpisah 👋',opening:{bank:2000000,cash:200000},entries:[
 {note:'Belanja dapur keluarga',amount:185000,type:'out',category:'shop',wallet:'bank',date:TODAY},
 {note:'Iuran rumah tangga',amount:3000000,type:'in',category:'salary',wallet:'bank',date:'2026-10-01'}]}
};
let activeBook = 'personal', page = 'home', filter = 'all', query = '', toastTimer;
const screen = document.getElementById('screen');
const entryDialog = document.getElementById('entry-dialog');
const infoDialog = document.getElementById('info-dialog');
const form = document.getElementById('entry-form');
function totals(book = books[activeBook]) {
 const balances = {...book.opening}; let income = 0, expense = 0;
 for (const t of book.entries) { balances[t.wallet] += t.type === 'in' ? t.amount : -t.amount; if(t.date.startsWith('2026-10-')) { if(t.type === 'in') income += t.amount; else expense += t.amount; } }
 return {balances,income,expense,balance:balances.bank+balances.cash};
}
function datestr(date) { return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00')); }
function sortedEntries(){return books[activeBook].entries.map((t,i)=>({...t,order:i})).sort((a,b)=>b.date.localeCompare(a.date)||b.order-a.order);}
function row(t) {
 const [emoji,cat] = categories[t.category];
 return `<div class="tx"><span class="tx-icon" aria-hidden="true">${emoji}</span><div class="tx-text"><b>${esc(t.note)}</b><small>${cat} · ${t.wallet==='bank'?'Rekening':'Tunai'}</small></div><span class="tx-amount ${t.type==='in'?'positive':''}">${t.type==='in'?'+':'−'}${money(t.amount)}</span></div>`;
}
function rows(entries) { return entries.length ? `<div class="tx-list">${entries.map(row).join('')}</div>` : '<div class="card empty">Belum ada transaksi yang cocok.<br>Coba filter atau kata pencarian lain.</div>'; }
function heading(title,action,label) {return `<div class="section-head"><h2>${title}</h2>${action?`<button class="text-btn" data-action="${action}">${label}</button>`:''}</div>`;}
function addButton(){return `<button class="primary" data-action="add">${icon('plus')} Catat transaksi</button>`;}
function walletCards(){const {balances}=totals();return `<div class="wallets"><button class="wallet" data-action="wallets"><span class="emoji" aria-hidden="true">🏦</span><small>Rekening utama</small><b>${money(balances.bank)}</b></button><button class="wallet" data-action="wallets"><span class="emoji" aria-hidden="true">👛</span><small>Tunai</small><b>${money(balances.cash)}</b></button></div>`;}
function budgetCard() {
 const spent = books[activeBook].entries.filter(t=>t.type==='out'&&t.category==='food'&&t.date.startsWith('2026-10-')).reduce((n,t)=>n+t.amount,0);
 const limit = 1000000, percentage=Math.round(spent/limit*100);
 return `<div class="card budget"><div class="budget-head"><h3>🍜 Makan & minum</h3><b>${percentage}%</b></div><p>${money(spent)} dari ${money(limit)}<br>${spent<=limit?'Sisa anggaran '+money(limit-spent):'Melebihi anggaran '+money(spent-limit)}</p><div class="progress" role="progressbar" aria-label="Anggaran makan terpakai" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(percentage,100)}"><span style="width:${Math.min(percentage,100)}%"></span></div></div>`;
}
function render() {
 const book = books[activeBook], t = totals();
 document.getElementById('book-label').textContent = book.name;
 document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 if(page==='home')screen.innerHTML = `<p class="greeting">${book.greeting}</p><h1 class="page-title">Uangmu, dalam kendali.</h1>${activeBook==='family'?'<p class="notice">Demo buku keluarga terpisah. Tidak menampilkan atau mengimpor transaksi pribadi.</p>':''}<section class="card balance" aria-label="Ringkasan saldo"><div class="label"><span>Total saldo</span>${icon('wallet')}</div><h2>${money(t.balance)}</h2><div class="foot"><span>2 dompet · ${book.name}</span><span class="pill">Data contoh</span></div></section><div class="stats"><div class="stat"><small>↙ Masuk · Oktober 2026</small><b>${money(t.income)}</b></div><div class="stat out"><small>↗ Keluar · Oktober 2026</small><b>${money(t.expense)}</b></div></div>${addButton()}${heading('Dompet kamu','wallets','Lihat semua ↗')}${walletCards()}${heading('Transaksi terbaru','history','Lihat semua ↗')}${rows(sortedEntries().slice(0,3))}${heading('Jaga pengeluaran','plans','Rencana ↗')}${budgetCard()}`;
 if(page==='history') {
  screen.innerHTML = `<p class="greeting">Jejak kecil, gambaran besar.</p><h1 class="page-title">Riwayat transaksi</h1><label class="sr-only" for="search">Cari catatan transaksi</label><input class="search" id="search" type="search" placeholder="Cari catatan transaksi…" value="${esc(query)}"><div class="filters" aria-label="Filter transaksi">${[['all','Semua'],['out','Keluar'],['in','Masuk']].map(([id,label])=>`<button data-filter="${id}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div>${addButton()}<div id="history-results"></div>`;
  renderHistory();
 }
 if(page==='plans')screen.innerHTML = `<p class="greeting">Pelan-pelan, jadi kenyataan.</p><h1 class="page-title">Rencana keuangan</h1><p class="page-subtitle">Oktober 2026 · ${book.name}</p>${heading('Anggaran bulanan')}${budgetCard()}${heading('Target tabungan','goal','Detail ↗')}<div class="card goal"><div class="goal-top"><span aria-hidden="true">🏡</span><small>Target contoh</small></div><h3>${activeBook==='personal'?'Dana darurat':'Liburan keluarga'}</h3><p><b>${money(3000000)}</b> dari ${money(10000000)}<br>30% terkumpul · saldo target ilustrasi</p><div class="progress" role="progressbar" aria-label="Target terkumpul" aria-valuemin="0" aria-valuemax="100" aria-valuenow="30"><span style="width:30%"></span></div></div><div class="notice">Anggaran makan dihitung dari transaksi demo buku ini. Target adalah ilustrasi; belum ada fitur alokasi tabungan di prototipe.</div>`;
 if(page==='more')screen.innerHTML = `<p class="greeting">Ruang untuk semuanya.</p><h1 class="page-title">Lainnya</h1><div class="card account-card"><div class="initial">G</div><div><b>Gozali · profil contoh</b><p>Mode demo lokal<br>Belum terhubung akun sungguhan</p></div></div><div class="menu-list">${[['wallets','Dompet','2 dompet di buku ini'],['categories','Kategori','Atur pengelompokan transaksi'],['books','Buku & keluarga','Data pribadi dan bersama terpisah'],['sync','Status data','Demo lokal · tidak ada koneksi server']].map(([id,title,sub])=>`<button data-action="${id}"><span>${title}<small>${sub}</small></span>${icon('arrow')}</button>`).join('')}</div><div class="menu-list">${[['backup','Backup & pemulihan','Direncanakan untuk versi native'],['account','Akun & keamanan','Login dan biometrik: tahap berikutnya'],['about','Tentang prototipe','Native Android · konsep desain 01']].map(([id,title,sub])=>`<button data-action="${id}"><span>${title}<small>${sub}</small></span>${icon('arrow')}</button>`).join('')}</div><p class="notice">Tidak ada data asli yang dibaca. Muat ulang halaman untuk mengembalikan semua data contoh.</p>`;
}
function renderHistory(){
 const list=sortedEntries().filter(t=>(filter==='all'||t.type===filter)&&t.note.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id')));
 const groups = new Map();for(const t of list){if(!groups.has(t.date))groups.set(t.date,[]);groups.get(t.date).push(t);}
 document.getElementById('history-results').innerHTML = list.length ? [...groups].map(([date,items])=>`<h2 class="date-heading">${date===TODAY?'25 Oktober 2026 · hari contoh':datestr(date)}</h2>${rows(items)}`).join('') : rows([]);
}
function navigate(next){page=next;query='';filter='all';render();screen.scrollTop=0;screen.focus({preventScroll:true});}
function info(title,html){document.getElementById('info-title').textContent=title;document.getElementById('info-body').innerHTML=html;infoDialog.showModal();}
function action(id) {
 if(['home','history','plans','more'].includes(id)){navigate(id);return;}
 if(id==='add'){form.reset();form.elements.date.value=TODAY;document.getElementById('form-error').textContent='';document.getElementById('form-book').textContent='Disimpan ke '+books[activeBook].name+' · hanya demo';entryDialog.showModal();return;}
 if(id==='books') {info('Pilih ruang keuangan',`<p>Buku contoh terpisah. Mengganti buku tidak menyalin transaksi.</p>${[['personal','Buku pribadi','Hanya catatan pribadi demo.'],['family','Buku keluarga','Catatan bersama demo, bukan akun keluarga nyata.']].map(([id,name,note])=>`<button class="book-option" data-book="${id}">${name}${id===activeBook?' ✓':''}<small>${note}</small></button>`).join('')}`);return;}
 if(id==='wallets'){const t=totals();info('Dompet buku ini',`<p>${esc(books[activeBook].name)} · data contoh</p>${walletCards().replaceAll('data-action="wallets"','data-action="wallet-info"')}<p>Total saldo: <b>${money(t.balance)}</b></p><p>Pengelolaan dompet, saldo awal dan transfer akan dibuat di Compose. Tidak ada transfer uang sungguhan.</p>`);return;}
 const content={
 'wallet-info':['Dompet demo','Saldo berasal dari saldo awal ditambah pemasukan dan dikurangi pengeluaran di buku demo ini. Ubah dompet belum dibuat dalam prototipe.'],
 categories:['Kategori transaksi','Kategori demo: makan & minum, transportasi, belanja, pendapatan dan lainnya. Pengelolaan kategori direncanakan pada tahap keuangan lokal.'],
 sync:['Data tinggal di tab ini','Tidak ada permintaan API, antrean sinkron atau penyimpanan permanen. Dalam aplikasi native nanti, catatan tersimpan di database HP; sinkron akun baru aktif setelah kontrak API dan penanganan konflik selesai.'],
 backup:['Backup & pemulihan','Belum aktif dalam mockup. Rencana native: ekspor JSON melalui pemilih file Android, validasi dan preview sebelum restore. Prototipe ini tidak dapat dipakai untuk menyimpan salinan data penting.'],
 account:['Akun & keamanan','Profil Gozali adalah contoh visual. Login, verifikasi email, pengamanan sesi dan pengunci biometrik belum dibuat di preview native maupun mockup ini. Tidak ada formulir password di sini.'],
 about:['Native, bukan bungkus web','Target implementasi: Kotlin + Jetpack Compose. Halaman HTML ini hanya untuk meninjau desain dan alur. Aplikasi produksi, database cloud, dan APK yang ada tidak diubah.'],
 goal:['Target tabungan contoh','Dana terkumpul Rp3.000.000 dari Rp10.000.000 adalah ilustrasi desain. Pada versi native nanti, penambahan alokasi tabungan harus berasal dari dompet dan memiliki jejak transaksi yang jelas.']
 };
 if(content[id]) {if(infoDialog.open)infoDialog.close();info(content[id][0],`<p>${content[id][1]}</p>`);}
}
document.addEventListener('click',e=>{
 const close=e.target.closest('[data-close]');if(close){close.closest('dialog').close();return;}
 const nav=e.target.closest('[data-page]');if(nav){navigate(nav.dataset.page);return;}
 const book=e.target.closest('[data-book]');if(book){activeBook=book.dataset.book;infoDialog.close();navigate('home');return;}
 const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));renderHistory();return;}
 const button=e.target.closest('[data-action]');if(button)action(button.dataset.action);
});
screen.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;renderHistory();}});
document.getElementById('book-switch').addEventListener('click',()=>action('books'));
document.getElementById('account').addEventListener('click',()=>action('account'));
function validEntry(amount,date,note){
 return /^[0-9]{1,12}$/.test(amount)&&Number(amount)>0&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>='2000-01-01'&&date<='2100-12-31'&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date&&note.trim().length>0&&note.trim().length<=80;
}
form.addEventListener('submit',e=>{
 e.preventDefault();const d=new FormData(form),amount=d.get('amount'),date=d.get('date'),note=d.get('note').trim(),type=d.get('type'),wallet=d.get('wallet'),category=d.get('category');
 const error=document.getElementById('form-error');
 if(!validEntry(amount,date,note)||!['in','out'].includes(type)||!['bank','cash'].includes(wallet)||!Object.hasOwn(categories,category)){error.textContent='Periksa nominal, tanggal dan catatan. Nominal harus lebih dari nol.';return;}
 // shortcut: hanya 100 entri per buku agar agregasi demo tetap dalam rentang integer aman; APK memakai batas domain dan overflow checks sendiri.
 if(books[activeBook].entries.length>=100){error.textContent='Batas 100 transaksi demo tercapai. Reload untuk reset.';return;}
 books[activeBook].entries.push({note,amount:Number(amount),type,category,wallet,date});entryDialog.close();render();
 const toast=document.getElementById('toast');toast.textContent='Tercatat di '+books[activeBook].name+' · demo sementara';toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3500);
});
render();
