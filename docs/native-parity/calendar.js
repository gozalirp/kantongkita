/* Calendar presentation adapted from neobrutalism.dev/docs/calendar; no React dependency. */
'use strict';
(() => {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d,12); };
  const pretty = s => s ? parse(s).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : 'Pilih tanggal';
  window.calendarField = (label,name,value,extra) => `<div class="field date-field"><span id="date-label-${name}">${label}</span><input type="date" name="${name}" value="${value}" ${extra} hidden><details class="date-picker"><summary aria-labelledby="date-label-${name} date-value-${name}"><span id="date-value-${name}">${pretty(value)}</span><span aria-hidden="true">▦</span></summary><div class="neo-calendar" aria-label="Kalender ${label}"></div></details></div>`;
  function draw(picker, date) {
    const input = picker.parentElement.querySelector('input');
    picker.dataset.month = iso(new Date(date.getFullYear(),date.getMonth(),1,12));
    const year = date.getFullYear(), month = date.getMonth();
    const start = new Date(year,month,1,12); start.setDate(1-start.getDay());
    const days = Array.from({length:42},(_,i) => {
      const d = new Date(start); d.setDate(start.getDate()+i); const value = iso(d);
      return `<button type="button" data-date="${value}" class="${d.getMonth()!==month?'outside ':''}${value===input.value?'selected':''}" aria-pressed="${value===input.value}" aria-label="${pretty(value)}" ${value===iso(new Date())?'aria-current="date"':''}>${d.getDate()}</button>`;
    });
    picker.querySelector('.neo-calendar').innerHTML = `<div class="calendar-heading"><button type="button" data-month="-1" aria-label="Bulan sebelumnya">‹</button><strong aria-live="polite">${months[month]} ${year}</strong><button type="button" data-month="1" aria-label="Bulan berikutnya">›</button></div><div class="calendar-week" aria-hidden="true">${['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(s=>`<span>${s}</span>`).join('')}</div><div class="calendar-days" role="group" aria-label="${months[month]} ${year}">${days.join('')}</div><div class="calendar-footer"><button type="button" data-calendar-today>Hari ini</button>${input.required?'':'<button type="button" data-date="">Kosongkan</button>'}<button type="button" data-calendar-close>Tutup</button></div>`;
  }
  document.addEventListener('toggle', e => {
    const picker=e.target;
    if(!picker.matches?.('.date-picker')||!picker.open)return;
    document.querySelectorAll('.date-picker[open]').forEach(p=>{if(p!==picker)p.open=false});
    draw(picker,parse(picker.parentElement.querySelector('input').value||iso(new Date())));
  },true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('.date-picker button'); if(!b)return;
    const p=b.closest('.date-picker'),input=p.parentElement.querySelector('input');
    if(b.hasAttribute('data-month')){const d=parse(p.dataset.month);d.setMonth(d.getMonth()+Number(b.dataset.month));draw(p,d);p.querySelector(`[data-month="${b.dataset.month}"]`).focus();return;}
    if(b.hasAttribute('data-date')||b.hasAttribute('data-calendar-today')){
      input.value=b.hasAttribute('data-calendar-today')?iso(new Date()):b.dataset.date;
      p.querySelector('summary span').textContent=pretty(input.value);
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    p.open=false;p.querySelector('summary').focus();
  });
  document.addEventListener('keydown',e=>{
    const p=e.target.closest('.date-picker');if(!p||!p.open)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();p.open=false;p.querySelector('summary').focus();return;}
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
    if(delta&&e.target.hasAttribute('data-date')&&e.target.dataset.date){e.preventDefault();const d=parse(e.target.dataset.date);d.setDate(d.getDate()+delta);draw(p,d);p.querySelector(`[data-date="${iso(d)}"]`).focus();}
  });
})();
