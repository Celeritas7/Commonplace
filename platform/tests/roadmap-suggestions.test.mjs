import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8'),candidate=await read('17_roadmap_suggestion_delivery.sql');
const id=n=>'17000000-0000-4000-8000-'+String(n).padStart(12,'0');
const address={board_id:'board',item_key:'study:MEDICINE/日本語',sub_id:'task',extra:{keep:'exact'}};
async function fixture(install=true){const db=await createAcceptanceDatabase();try{
 await db.exec(legacyFixture);for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
 for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql'])await db.exec(await read(f));
 await db.exec(`insert into roadmap_tasks(id,user_id,title) values('${id(1)}','${users.a}','Keep notes and proof'),('${id(2)}','${users.b}','Foreign task');
 insert into roadmap_daily_logs(user_id,task_id,notes) values('${users.a}','${id(1)}','Keep 日本語 notes');
 insert into roadmap_study_sessions(user_id,task_id,day_key,source,verification,feedback,completed_at,duration_min)
 values('${users.a}','${id(1)}','2026-11-26','study-app','app','{"keep":"proof"}',now(),25);
 update auth.users set email_confirmed_at=null where id='${users.fresh}'`);
 for(const [sid,owner,task,addr] of [['native',users.a,id(1),{...address,board_id:'rm'}],['external',users.a,id(1),address],['other',users.b,id(2),address],['second',users.a,id(1),address]])
  await db.query('insert into roadmap_suggestions(id,user_id,rm_task_id,task,title,say,until) values($1,$2,$3,$4,$5,$5,now()+interval \'1 day\')',[sid,owner,task,addr,'Keep suggestion']);
 if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}}
const payload=(sid='native',action='start',seq=null)=>({suggestion_id:sid,action,seq,reason:action==='skip'?' Keep 日本語 reason ':null,from_app:'roadmap',day_key:'2026-11-27',at:'2026-11-27T01:00:00Z'});
async function snapshot(db){await db.exec('reset role');const out={};for(const name of ['roadmap_tasks','roadmap_daily_logs','roadmap_study_sessions','roadmap_suggestions','roadmap_suggestion_answers'])out[name]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') rows from ${name} t`)).rows[0].rows;return out}
test('suggestion answers commit atomically, replay once and retain an exact hub effect',async t=>{
 const db=await fixture(false),{as}=access(db);let n=1000;
 const run=async(p,request=n++,actor=users.a)=>(await as(actor,'select ga_roadmap_answer_suggestion($1,$2) r',[p,id(request)])).rows[0].r;
 try{
  const original=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),original);
  await t.test('first answer starts the session in the same transaction; a retry never overwrites completed proof',async()=>{
   const p={...payload(),day_key:'2026-11-26'},r=await run(p,100);assert.equal(r.outcome,'applied');assert.equal(r.suggestion.answer,'start');assert.equal(r.effect,null);
   const after=await snapshot(db);assert.equal(after.roadmap_study_sessions.length,1);assert.deepEqual(after.roadmap_study_sessions[0].feedback,{keep:'proof'});assert.equal(after.roadmap_study_sessions[0].duration_min,25);
   assert.equal((await run(p,100)).replayed,true);assert.deepEqual(await snapshot(db),after);
   await assert.rejects(()=>run({...p,action:'skip'},100),e=>e.code==='22023');
   const later=await run({...payload(),action:'dismiss'},101);assert.equal(later.outcome,'already_answered');assert.equal(later.suggestion.answer,'start');assert.equal(later.effect,null);
  });
  await t.test('skip records the exact original JSON address and one stable request key',async()=>{
   const p=payload('external','skip',27),r=await run(p,102);assert.equal(r.outcome,'applied');assert.deepEqual(r.effect.src_addr,address);
   assert.deepEqual(r.effect.payload,{...address,reason:'Keep 日本語 reason',at:r.effect.payload.at,suggestion_id:'external'});assert.equal(r.effect.idempotency_key,'rm:answer:'+id(102));
   const replay=await run({...p,day_key:'2026-11-28'},103);assert.equal(replay.replayed,true);assert.equal(replay.request_id,id(103));assert.equal(replay.receipt_id,id(102));assert.deepEqual(replay.effect,r.effect);
   await assert.rejects(()=>run({...p,reason:'Changed'},104),e=>e.code==='22023');
   assert.equal((await snapshot(db)).roadmap_suggestion_answers.filter(r=>r.seq===27).length,1);
  });
  await t.test('unknown and foreign suggestions log only without exposing or mutating the foreign row',async()=>{
   for(const sid of ['missing','other']){const r=await run(payload(sid,'start',30+n));assert.equal(r.outcome,'unknown');assert.equal(r.suggestion,null);assert.equal(r.effect,null)}
   assert.deepEqual((await as(users.b,'select answer from roadmap_suggestions')).rows,[{answer:null}]);
   assert.equal((await as(users.b,'select * from roadmap_suggestion_answers')).rows.length,0);
  });
  await t.test('native skip creates no hub request; already answered receipts cannot replay a start',async()=>{
   const r=await run(payload('native','skip'));assert.equal(r.effect,null);assert.equal(r.outcome,'already_answered');
   await db.exec(`reset role;insert into roadmap_suggestions(id,user_id,task,title,say,until) values('native-skip','${users.a}','{"board_id":"rm","item_key":"local","sub_id":"x"}','Native','Native',now())`);
   assert.equal((await run(payload('native-skip','skip'))).effect,null);
  });
  await t.test('legacy event logs require reconciliation instead of guessing a successful follow-up',async()=>{
   await as(users.a,"insert into roadmap_suggestion_answers(seq,suggestion_id,from_app,action) values(999,'second','rm','start')");const before=await snapshot(db);
   await assert.rejects(()=>run(payload('second','start',999)),e=>e.code==='40001');assert.deepEqual(await snapshot(db),before);
  });
  await t.test('receipt/log/session failures roll back the entire answer',async()=>{
   for(const [table,operation] of [['ga_private.roadmap_answer_receipts','insert'],['roadmap_suggestion_answers','insert'],['roadmap_study_sessions','insert'],['roadmap_suggestions','update']]){
    const before=await snapshot(db);await db.exec(`create function fixture_answer_fail() returns trigger language plpgsql as $$begin return null;end;$$;create trigger fixture_answer_fail before ${operation} on ${table} for each row execute function fixture_answer_fail()`);
    await assert.rejects(()=>run(payload('second')),e=>['40001','42501'].includes(e.code));assert.deepEqual(await snapshot(db),before);
    await db.exec(`drop trigger fixture_answer_fail on ${table};drop function fixture_answer_fail()`);
   }
  });
  await t.test('malformed, over-limit and unverifiable requests leave existing study records untouched',async()=>{
   const p=payload('second'),before=await snapshot(db);
   for(const bad of [null,[],{}, {...p,owner:users.b},{...p,action:'execute'},{...p,seq:0},{...p,seq:1.5},{...p,seq:9007199254740992},
    {...p,suggestion_id:'あ'.repeat(67)},{...p,reason:'あ'.repeat(1366)},{...p,reason:{}},{...p,at:[]},{...p,from_app:''},{...p,day_key:'2026-02-30'}])
    await assert.rejects(()=>run(bad),e=>e.code==='22023');
   for(const actor of [null,users.fresh])await assert.rejects(()=>run(p,n++,actor),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('private receipts and anonymous callers stay denied; pause also stops replays',async()=>{
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_answer_receipts'),e=>e.code==='42501');
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');await assert.rejects(()=>run(payload('external','skip',27),102),e=>e.code==='42501');
   await db.exec('reset role;update ga_private.roadmap_control set paused=false');
   await db.exec(`update auth.users set email_confirmed_at=null where id='${users.a}'`);await assert.rejects(()=>run(payload('external','skip',27),102),e=>e.code==='42501');
  });
 }finally{await db.close()}
});
test('suggestion candidate refuses catalog drift without changing records or leaving receipts installed',async()=>{
 const db=await fixture(false);try{
  await db.exec('alter table roadmap_suggestions add column unexpected text');const before=await snapshot(db);
  await assert.rejects(()=>db.exec(candidate),/baseline/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
  assert.equal((await db.query("select to_regclass('ga_private.roadmap_answer_receipts') r")).rows[0].r,null);
 }finally{await db.close()}
});
