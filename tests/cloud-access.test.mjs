import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../worker/worker.js', import.meta.url), 'utf8');
const bundledSource = source.replace("import { family } from './family.mjs';", 'const family = () => { throw Error("Unexpected family route"); };');
const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(bundledSource).toString('base64'));
let touched = false;
const env = { DB: { prepare() { touched = true; throw Error('Database must not be accessed'); } } };
for (const method of ['GET', 'POST', 'OPTIONS']) {
  const response = await worker.fetch(new Request('https://example.test/api/sync', { method }), env);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await response.json()).code, 'FAMILY_SETUP_REQUIRED');
}
assert.equal(touched, false);
assert.equal((await worker.fetch(new Request('https://example.test/api/health'), env)).status, 200);
console.log('PASS: legacy cloud read/write blocked, no database access, health available');
