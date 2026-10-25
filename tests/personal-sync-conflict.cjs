// Local-only regression: never authorize a stale personal draft by reading a new revision.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
(async () => {
  let revision = 1, posts = 0;
  let cloud = {transactions: [{id: 'remote', note: 'Change from another device'}]};
  const window = {localStorage: {getItem() { return null; }, setItem() {}}};
  const context = {window, fetch: async (url, options) => {
    if (url.endsWith('/personal/data')) return {status: 200, json: async () => ({revision, data: cloud})};
    if (url.endsWith('/personal/save')) {
      posts++;
      const payload = JSON.parse(options.body);
      if (payload.revision !== revision) return {status: 409, json: async () => ({})};
      cloud = payload.book; revision++;
      return {status: 200, json: async () => ({revision})};
    }
    throw Error('Unexpected endpoint: ' + url);
  }};
  vm.runInNewContext(fs.readFileSync('public/js/keluarga-mode.js', 'utf8'), context);
  const K = window.K;
  K.punyaCloud = true;
  const stale = {transactions: [{id: 'local', note: 'Stale local draft'}]};
  assert.equal(await K.simpanPribadi(stale), 'bentrok');
  assert.equal((await K.muatPribadi()).transactions[0].id, 'remote');
  assert.equal(K.revisiPribadi, 0);
  assert.equal(await K.simpanPribadi(stale), 'bentrok');
  assert.equal(posts, 1);
  assert.equal(cloud.transactions[0].id, 'remote');
  assert.equal(stale.transactions[0].id, 'local');
  // Even transient network failure releases the single-flight lock.
  const w = {localStorage: window.localStorage};
  vm.runInNewContext(fs.readFileSync('public/js/keluarga-mode.js', 'utf8'), {window: w, fetch: async () => {throw Error('offline');}});
  w.K.punyaCloud = true;
  assert.equal(await w.K.simpanPribadi(stale), 'luring');
  assert.equal(w.K.sibukPribadi, false);
  console.log('PASS: personal 409 freezes base revision, preserves both books and blocks stale retry (local simulation only)');
})().catch(e => { console.error(e); process.exitCode = 1; });
