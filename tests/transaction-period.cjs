const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<main id="view"></main>', { url: 'http://localhost/', runScripts: 'outside-only' });
const w = dom.window;
for (const file of ['util.js', 'store.js', 'views.js']) w.eval(fs.readFileSync('public/js/' + file, 'utf8'));
const { V, S } = w;
w.U.today = () => '2026-11-03';
const db = S.seedDB();
db.transactions = [
  ['oct', '2026-10-31', 100], ['nov', '2026-11-01', 200],
  ['dec', '2026-12-01', 300], ['old', '2025-11-01', 400],
  ['leap', '2024-02-29', 500], ['march', '2024-03-01', 600]
].map(([id, date, amount]) => ({ id, date, amount, type: 'out', walletId: db.wallets[0].id, note: id }));
const $ = id => w.document.getElementById(id);
w.App = { db, render() { $('view').innerHTML = V.transaksi(); V.transaksiBind(); } };
function change(id, value) { $(id).value = value; $(id).dispatchEvent(new w.Event('change')); }
function preset(value) { w.document.querySelector('#tx-preset [data-seg="' + value + '"]').click(); }
function ids() { return Array.from(w.document.querySelectorAll('[data-tx]'), el => el.dataset.tx).sort(); }
V.state.transaksi.date = '2026-11-02';
w.App.render();
assert.equal($('tx-month').options.length, 12);
assert.equal($('tx-month').selectedOptions[0].textContent, 'November');
assert.deepEqual(ids(), ['nov']);
change('tx-month', '10');
assert.deepEqual(ids(), ['oct']);
assert($('view').textContent.includes('Oktober 2026'));
change('tx-month', '11'); change('tx-year', '2025');
assert.deepEqual(ids(), ['old']);
change('tx-year', '2024'); change('tx-month', '02');
assert.equal(V.state.transaksi.to, '2024-02-29');
assert.deepEqual(ids(), ['leap']);
preset('today'); change('tx-date', '2026-11-01');
assert.deepEqual(ids(), ['nov']);
preset('week');
assert.equal(V.state.transaksi.from, '2026-10-28');
assert.equal(V.state.transaksi.to, '2026-11-03');
assert(!$('tx-date'), 'weekly mode has no date field');
assert.deepEqual(ids(), ['nov', 'oct']);
assert($('view').textContent.includes('7 hari terakhir'));
w.U.today = () => '2026-11-07';
w.App.render();
assert.equal(V.state.transaksi.from, '2026-11-01');
assert.equal(V.state.transaksi.to, '2026-11-07');
assert.deepEqual(ids(), ['nov'], 'weekly range follows today, not the selected daily date');
preset('year');
assert.deepEqual(ids(), ['dec', 'nov', 'oct']);
change('tx-year', '2025'); assert.deepEqual(ids(), ['old']);
change('tx-year', ''); assert.equal(V.state.transaksi.date, '2025-11-01');
preset('all'); assert.equal(ids().length, 6);
assert(!$('tx-year')); assert(!$('tx-month')); assert(!$('tx-date'));
preset('month'); assert.deepEqual(ids(), ['old']);
V.state.transaksi.q = 'missing'; w.App.render(); assert.deepEqual(ids(), []);
assert.equal(db.transactions.length, 6, 'filtering never changes transactions');
dom.window.close();
console.log('Transaction period filters: passed');
