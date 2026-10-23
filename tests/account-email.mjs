import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { family } from '../worker/family.mjs';
import { digest } from '../worker/family-security.mjs';
const db = new DatabaseSync(':memory:');
for (const file of ['0001_family.sql','0002_family_book.sql','0003_personal_book.sql','0004_account_email.sql']) db.exec(readFileSync(new URL('../worker/migrations/' + file, import.meta.url), 'utf8'));
const wrap = (sql, values = []) => ({
  bind(...v) { return wrap(sql, v); },
  async first() { return db.prepare(sql).get(...values) || null; },
  async all() { return { results: db.prepare(sql).all(...values) }; },
  async run() { return { meta: { changes: db.prepare(sql).run(...values).changes } }; }
});
const env = { DB: { prepare: wrap, async batch(items) { db.exec('BEGIN'); try { const result = []; for (const item of items) result.push(await item.run()); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } } }, RESEND_API_KEY: 'test-only', EMAIL_FROM: 'KantongKita <akun@example.com>', APP_ORIGIN: 'https://moneyplanner.darmintompel.my.id' };
const mail = [];
let deliveryFails = false;
globalThis.fetch = async (url, options) => { assert.equal(url, 'https://api.resend.com/emails'); mail.push(JSON.parse(options.body)); return { ok: !deliveryFails }; };
async function call(path, body, cookie, origin = env.APP_ORIGIN) {
  const response = await family(new Request(env.APP_ORIGIN + '/api/family/' + path, { method: body ? 'POST' : 'GET', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: response.status, body: await response.json(), cookie: response.headers.get('Set-Cookie')?.split(';')[0] };
}
const secret = text => text.match(/#(?:verify|reset)=([a-f0-9]{64})/)[1];
const password = 'password-panjang-123';
let r = await call('activate', { username: 'email_test', password, email: 'USER@gmail.com' });
assert.equal(r.status, 200); assert.equal(r.body.emailSent, true); const recovery = r.body.recovery;
assert.equal(mail[0].to[0], 'user@gmail.com'); const verification = secret(mail[0].text);
assert.equal(db.prepare('SELECT token_hash FROM account_email_tokens').get().token_hash, await digest(verification));
await call('email/request-reset', { email: 'user@gmail.com' }); assert.equal(mail.length, 1, 'unverified email cannot reset');
assert.equal((await call('email/verify', { token: verification }, null, 'https://evil.test')).status, 403);
assert.equal((await call('email/verify', { token: verification })).status, 200);
assert.equal((await call('email/verify', { token: verification })).status, 400);
const login = await call('login', { username: 'email_test', password }); assert.equal(login.status, 200);
r = await call('email/request-reset', { email: 'user@gmail.com' });
const unknown = await call('email/request-reset', { email: 'unknown@gmail.com' }); assert.deepEqual(unknown.body, r.body);
const reset = secret(mail.at(-1).text);
assert.equal((await call('email/reset', { token: reset, password: 'short' })).status, 400);
await call('email/request-reset', { email: 'user@gmail.com' }); assert.equal(mail.length, 2, 'cooldown');
const changed = 'password-baru-456';
assert.equal((await call('email/reset', { token: reset, password: changed })).status, 200);
assert.equal((await call('me', null, login.cookie)).status, 401);
assert.equal((await call('email/reset', { token: reset, password })).status, 400);
assert.equal((await call('login', { username: 'email_test', password })).status, 401);
const newLogin = await call('login', { username: 'email_test', password: changed }); assert.equal(newLogin.status, 200);
assert.equal((await call('logout', {}, newLogin.cookie)).status, 200);
assert.equal((await call('me', null, newLogin.cookie)).status, 401);
assert.equal((await call('recover', { username: 'email_test', code: recovery, password })).status, 200, 'backup recovery preserved');
db.prepare('UPDATE family_rate_limits SET attempts=0').run();
await call('email/request-reset', { email: 'user@gmail.com' }); const expired = secret(mail.at(-1).text);
db.prepare('UPDATE account_email_tokens SET expires_at=0').run();
assert.equal((await call('email/reset', { token: expired, password })).status, 400);
deliveryFails = true;
r = await call('activate', { username: 'delivery_fail', password, email: 'fail@gmail.com' }); assert.equal(r.status, 200); assert.equal(r.body.emailSent, false); assert.ok(r.body.recovery);
assert.equal((await call('activate', { username: 'bad_email', password, email: 'bad\r\nemail@gmail.com' })).status, 400);
delete env.RESEND_API_KEY;
assert.equal((await call('email/request-reset', { email: 'user@gmail.com' })).status, 503);
assert.equal((await call('activate', { username: 'legacy_user', password })).status, 200);
console.log('PASS: email signup, verification, hashed single-use/expired tokens, origin, enumeration, cooldown, password reset, session revocation, recovery, logout, delivery failures, legacy signup.');
