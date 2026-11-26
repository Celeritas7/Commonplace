import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
const read=name=>readFile(new URL('../operations/general-apps/'+name,import.meta.url),'utf8');
const fixture=await readFile(new URL('./roadmap-session-fixture.sql',import.meta.url),'utf8');
const candidate=await read('08_roadmap_daily_actions.sql');
const id=n=>'80000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function baseline() {
 const db=await createAcceptanceDatabase();
 try {
  await db.exec(legacyFixture);await db.exec(fixture);
  await db.exec(await read('01_access_foundation.sql'));await db.exec(await read('03_roadmap_session_owner.sql'));
  await db.exec(`insert into roadmap_tasks(id,user_id,title,tags) values
   ('${id(1)}','${users.a}','Daily A','{daily-routine}'),('${id(2)}','${users.b}','Daily B','{daily-routine}');
   insert into roadmap_study_sessions(user_id,task_id,day_key,source,feedback,duration_min)
   values('${users.a}',null,'legacy-day','original','{"notes":"Keep 日本語"}',42)`);
  return db;
 } catch(e) {await db.close();throw e;}
}
async function snapshot(db) {
 await db.exec('reset role');const result={};
 for(const t of ['roadmap_tasks','roadmap_study_sessions'])
  result[t]=(await db.query(`select to_jsonb(t) row from ${t} t order by id`)).rows;
 return result;
}
test('daily task and session changes commit atomically and retry once',async t=>{
 const db=await baseline(),{as}=access(db);
 const row=async task=>(await as(users.a,'select * from roadmap_tasks where id=$1',[task])).rows[0];
 const action=async(request=10,done=true,task=id(1),stamp=null,actor=users.a)=>{
  const updated=stamp??(await row(task)).updated_at;
  return (await as(actor,'select ga_roadmap_set_daily_task($1,$2,$3,$4,$5) result',[task,updated,done,'2026-11-26',id(request)])).rows[0].result;
 };
 try {
  const original=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),original);
  let first,stamp;
  await t.test('confirmed result includes the committed task and matching session',async()=>{
   stamp=(await row(id(1))).updated_at;first=await action(10,true,id(1),stamp);
   assert.equal(first.task.done,true);assert.equal(first.task.streak,1);assert.equal(first.session.verification,'manual');
   assert.equal(first.session.task_id,id(1));assert.equal(first.request_id,id(10));assert.equal(first.replayed,false);
   assert.equal(first.task.user_id,undefined);
   assert.equal((await as(users.a,'select * from roadmap_session_days')).rows.length,1);
   assert.equal((await as(users.b,'select * from roadmap_session_days')).rows.length,0);
  });
  await t.test('lost acknowledgement retries preserve the original completion and receipt',async()=>{
   await db.exec("reset role;set timezone='Asia/Tokyo'");
   const again=await action(10,true,id(1),stamp);
   await db.exec("reset role;set timezone='UTC'");
   assert.equal(again.replayed,true);assert.equal(again.task.done,first.task.done);assert.equal(again.session.id,first.session.id);
   assert.equal(Date.parse(again.session.completed_at),Date.parse(first.session.completed_at));
   await db.exec('reset role');
   assert.equal((await db.query('select count(*) n from ga_private.roadmap_daily_receipts')).rows[0].n,1);
   await assert.rejects(()=>action(10,false,id(1),stamp),e=>e.code==='22023');
  });
  await t.test('stale edits and foreign/anonymous identities cannot change or replay another owner',async()=>{
   await assert.rejects(()=>action(11,false,id(1),stamp),e=>e.code==='40001');
   await assert.rejects(()=>action(10,true,id(1),stamp,users.b),e=>e.code==='42501');
   await assert.rejects(()=>action(10,true,id(1),stamp,null),e=>e.code==='42501');
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_daily_receipts'),e=>e.code==='42501');
  });
  await t.test('failed session write rolls the checkbox and receipt back, retaining all old records',async()=>{
   await db.exec(`reset role;create function fixture_refuse() returns trigger language plpgsql as $$begin raise exception 'synthetic session failure';end;$$;
    create trigger fixture_refuse before update on roadmap_study_sessions for each row execute function fixture_refuse()`);
   const before=await snapshot(db);await assert.rejects(()=>action(12,false),/synthetic session failure/);
   assert.deepEqual(await snapshot(db),before);
   assert.equal((await db.query('select count(*) n from ga_private.roadmap_daily_receipts')).rows[0].n,1);
   await db.exec('drop trigger fixture_refuse on roadmap_study_sessions;drop function fixture_refuse()');
   const undo=await action(12,false);assert.equal(undo.task.done,false);assert.equal(undo.session.completed_at,null);
   const oldRetry=await action(10,true,id(1),stamp);
   assert.equal(oldRetry.replayed,true);assert.equal(oldRetry.task.done,false);assert.equal(oldRetry.session.completed_at,null);
  });
  await t.test('silent trigger suppression is a failure, not a saved session',async()=>{
   await db.exec(`reset role;create function fixture_suppress() returns trigger language plpgsql as $$begin return null;end;$$;
    create trigger fixture_suppress before update on roadmap_study_sessions for each row execute function fixture_suppress()`);
   const before=await snapshot(db);await assert.rejects(()=>action(13,true),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),before);
   await db.exec('drop trigger fixture_suppress on roadmap_study_sessions;drop function fixture_suppress()');
  });
  await t.test('study-app evidence, duration, feedback and legacy null-task history survive manual actions',async()=>{
   await as(users.a,"select roadmap_complete_session($1,'study-app','2026-11-26',37,'{\"answer\":\"Keep 日本語\"}','app')",[id(1)]);
   const before=(await as(users.a,'select * from roadmap_study_sessions where task_id=$1',[id(1)])).rows[0];
   await action(14,true);await action(15,false);
   const after=(await as(users.a,'select * from roadmap_study_sessions where task_id=$1',[id(1)])).rows[0];
   assert.deepEqual(after,before);
   assert.deepEqual((await as(users.a,'select feedback,duration_min from roadmap_study_sessions where task_id is null')).rows,[{feedback:{notes:'Keep 日本語'},duration_min:42}]);
  });
  await t.test('paused, unverified and anonymous identities cannot replay a saved action',async()=>{
   await db.exec("reset role;update ga_private.roadmap_control set paused=true");
   await assert.rejects(()=>action(10,true,id(1),stamp),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);
   await assert.rejects(()=>action(10,true,id(1),stamp),e=>e.code==='42501');
   await assert.rejects(()=>as(users.a,"select roadmap_start_session($1,'2026-11-26')",[id(1)]),e=>e.code==='42501');
   await assert.rejects(()=>as(users.a,"select roadmap_complete_session($1,'roadmap','2026-11-26')",[id(1)]),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}';select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   await assert.rejects(()=>action(10,true,id(1),stamp),e=>e.code==='42501');
  });
 } finally {await db.close();}
});
test('containment closes the new action even when its pause row is missing',async()=>{
 const db=await baseline();try {
  await db.exec(candidate);await db.exec(await read('04_commonplace_signup.sql'));
  await db.exec('delete from ga_private.roadmap_control');
  await assert.rejects(()=>db.exec(awaitStop),/Containment incomplete/);
  await db.exec('rollback');
  assert.equal((await db.query("select has_function_privilege('authenticated','public.ga_roadmap_set_daily_task(uuid,timestamptz,boolean,text,uuid)','execute') ok")).rows[0].ok,false);
 } finally {await db.close();}
});
const awaitStop=await read('90_containment.sql');

test('changed session contract or schema stops candidate 08 without rewriting saved work',async t=>{
 for(const change of ["alter table roadmap_tasks add column unexpected text","alter function roadmap_start_session(uuid,text,text) security invoker"]) await t.test(change,async()=>{
  const db=await baseline();try {
   await db.exec(change);const before=await snapshot(db);
   await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');
   assert.deepEqual(await snapshot(db),before);
   assert.equal((await db.query("select to_regclass('ga_private.roadmap_daily_receipts') value")).rows[0].value,null);
  } finally {await db.close();}
 });
});
