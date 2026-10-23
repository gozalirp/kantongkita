import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { family } from '../worker/family.mjs';
import { digest } from '../worker/family-security.mjs';
import { maintenance } from '../worker/maintenance.mjs';
const db = new DatabaseSync(':memory:');
for (const f of readdirSync('worker/migrations').filter(f=>f.endsWith('.sql')).sort()) db.exec(readFileSync('worker/migrations/'+f,'utf8'));
const wrap=(sql,values=[])=>({bind(...v){return wrap(sql,v);},async first(){return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}});
let beforeBatch=null, failAt=-1;
const env={DB:{prepare:wrap,async batch(items){if(beforeBatch){const hook=beforeBatch;beforeBatch=null;await hook();}db.exec('BEGIN');try{const out=[];for(let i=0;i<items.length;i++){if(i===failAt)throw Error('injected failure');out.push(await items[i].run());}db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const now=Math.floor(Date.now()/1000);
db.exec("INSERT INTO families VALUES('f',1); INSERT INTO family_users VALUES('u','f','owner','hash','recovery','owner',1)");
db.prepare('INSERT INTO family_sessions VALUES(?,?,?)').run(await digest('a'.repeat(64)),'u',now+3600);
const book=note=>({wallets:[],categories:[],budgets:[],goals:[],subscriptions:[],transactions:[{id:'t',type:'in',amount:100,date:'2026-10-23',note}]});
async function call(path,body){const r=await family(new Request('https://example.test/api/family/'+path,{method:body?'POST':'GET',headers:{Origin:'https://example.test',Cookie:'__Host-sd_session='+'a'.repeat(64)},body:body?JSON.stringify(body):undefined}),env);return {status:r.status,body:await r.json()};}
// Match the actual cookie name used by authentication.
for(const [path,table,key] of [['save','family_data','family_id'],['personal/save','personal_data','user_id']]){
  assert.equal((await call(path,{revision:0,book:book('initial')})).status,200);
  const winning=JSON.stringify(book('winning'));
  // Inject winner AFTER the losing writer's SELECT but BEFORE its batch.
  beforeBatch=async()=>{db.prepare(`UPDATE ${table} SET revision=2`).run();db.prepare(`UPDATE ${table}_parts SET chunk=? WHERE idx=0`).run(winning);};
  assert.equal((await call(path,{revision:1,book:book('loser')})).status,409);
  assert.equal(db.prepare(`SELECT chunk FROM ${table}_parts`).get().chunk,winning);
  assert.equal(db.prepare(`SELECT revision FROM ${table}`).get().revision,2);
  failAt=2;
  assert.equal((await call(path,{revision:2,book:book('failed')})).status,409);
  failAt=-1;
  assert.equal(db.prepare(`SELECT chunk FROM ${table}_parts`).get().chunk,winning,'batch failure rolls back deletes');
  assert.equal((await call(path,{revision:-1,book:book('bad')})).status,400);
}
// First-save race must also preserve the winner.
db.exec('DELETE FROM personal_data_parts; DELETE FROM personal_data');
beforeBatch=async()=>{db.prepare('INSERT INTO personal_data VALUES(?,?,?)').run('u',1,now);db.prepare('INSERT INTO personal_data_parts VALUES(?,?,?)').run('u',0,JSON.stringify(book('first winner')));};
assert.equal((await call('personal/save',{revision:0,book:book('first loser')})).status,409);
assert.equal(JSON.parse(db.prepare('SELECT chunk FROM personal_data_parts').get().chunk).transactions[0].note,'first winner');
const before=db.prepare('SELECT chunk FROM family_data_parts').get().chunk;
assert.equal((await call('transaction',{revision:2,transaction:{}})).status,410);
assert.equal(db.prepare('SELECT chunk FROM family_data_parts').get().chunk,before);
assert(db.prepare("EXPLAIN QUERY PLAN SELECT token_hash FROM family_sessions WHERE user_id='u'").all().some(x=>x.detail.includes('idx_family_sessions_user')));
db.prepare('INSERT INTO family_sessions VALUES(?,?,?)').run('expired','u',now-90000);
db.prepare('INSERT INTO family_sessions VALUES(?,?,?)').run('recent','u',now-60);
db.prepare('INSERT INTO account_email_tokens VALUES(?,?,?,?)').run('old-token','u','reset',now-90000);
db.prepare('INSERT INTO family_rate_limits VALUES(?,?,?)').run('old-rate',now-8*86400,10);
await maintenance(env,now);
assert.equal(db.prepare("SELECT COUNT(*) n FROM family_sessions WHERE token_hash='expired'").get().n,0);
assert.equal(db.prepare("SELECT COUNT(*) n FROM family_sessions WHERE token_hash='recent'").get().n,1);
assert.equal(db.prepare('SELECT COUNT(*) n FROM account_email_tokens').get().n,0);
assert.equal(db.prepare("SELECT COUNT(*) n FROM family_rate_limits WHERE key_hash='old-rate'").get().n,0);
assert.equal(db.prepare('SELECT chunk FROM family_data_parts').get().chunk,before);
assert.equal(db.prepare('SELECT COUNT(*) n FROM families').get().n,1);
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
console.log('PASS: atomic stale-write/first-save guards, rollback, retired endpoint, indexes, bounded auth retention, books preserved');
