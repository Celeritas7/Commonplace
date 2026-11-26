import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8');
const candidate=await read('12_roadmap_daily_reset.sql'),stop=await read('90_containment.sql');
const id=n=>'c0000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function baseline(install=true){
 const db=await createAcceptanceDatabase();try{
  await db.exec(legacyFixture);await db.exec(await readFile(new URL('./roadmap-session-fixture.sql',import.meta.url),'utf8'));
  for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','08_roadmap_daily_actions.sql'])await db.exec(await read(f));
  for(let n=1;n<=10;n++)await db.query(`insert into roadmap_tasks(id,user_id,title,kind,tags,done,streak,streak_day,updated_at)
   values($1,$2,$3,'task','{daily-routine}',true,4,((clock_timestamp()-interval '4 hours') at time zone 'Asia/Tokyo')::date-1,now()-interval '2 days')`,[id(n),n===10?users.b:users.a,'Retain task '+n]);
  await db.exec(`insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,completed_at,verification,feedback)
   values('${id(100)}','${users.a}','${id(1)}',current_date::text,'study-app',now(),'app','{"keep":"proof"}')`);
  if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e;}
}
const snapshot=async db=>{await db.exec('reset role');return(await db.query(`select
 (select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t) tasks,
 (select jsonb_agg(to_jsonb(s) order by id) from roadmap_study_sessions s) sessions`)).rows[0]};
test('daily reset confirms atomic checkbox changes and preserves historical evidence',async t=>{
 const db=await baseline(false),{as}=access(db);let number=500;
 const targets=async(...ids)=>(await db.query('select id,updated_at::text expected_updated_at from roadmap_tasks where id=any($1) order by id',[ids])).rows.map(r=>({...r,expected_updated_at:r.expected_updated_at.replace(' ','T').replace(/\+00$/,'+00:00')}));
 const today=(await db.query("select ((clock_timestamp()-interval '4 hours') at time zone 'Asia/Tokyo')::date::text today")).rows[0].today;
 const reset=async(tasks,request=number++,actor=users.a,day=today,zone='Asia/Tokyo')=>(await as(actor,
  'select ga_roadmap_reset_daily_tasks($1,$2,$3,$4) result',[tasks,day,zone,id(request)])).rows[0].result;
 try{
  const initial=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),initial);
  let original,first;
  await t.test('only acknowledged checkboxes and their versions change; streaks, notes and sessions remain intact',async()=>{
   original=await targets(id(1),id(2));first=await reset(original,200);
   assert.equal(first.tasks.length,2);assert.ok(first.tasks.every(r=>r.done===false&&r.streak===4&&r.user_id===undefined));
   const after=await snapshot(db);assert.deepEqual(after.sessions,initial.sessions);
   const strip=r=>{const {done,updated_at,...other}=r;return other};
   assert.deepEqual(after.tasks.map(strip),initial.tasks.map(strip));
   assert.equal((await db.query('select count(*) n from ga_private.roadmap_reset_receipts')).rows[0].n,1);
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_reset_receipts'),e=>e.code==='42501');
  });
  await t.test('uncertain retries save once; replay returns a newer current completion instead of resetting it',async()=>{
   await db.exec("reset role;set timezone='Asia/Tokyo'");assert.equal((await reset([...original].reverse(),200)).replayed,true);
   await as(users.a,'select ga_roadmap_set_daily_task($1,$2,true,$3,$4)',[id(1),first.tasks[0].updated_at,today,id(201)]);
   const replay=await reset(original,200);assert.equal(replay.tasks[0].done,true);
   assert.equal(replay.tasks[0].streak,5);assert.equal(replay.tasks[0].streak_day,today);
   await assert.rejects(()=>reset(original,200,users.a,today,'UTC'),e=>e.code==='22023');
   await db.exec("reset role;set timezone='UTC'");
  });
  await t.test('one stale, foreign or missing task rejects the whole batch',async()=>{
   const tasks=await targets(id(3),id(4)),before=await snapshot(db);
   await assert.rejects(()=>reset([{...tasks[0],expected_updated_at:'2020-01-01T00:00:00Z'},tasks[1]]),e=>e.code==='40001');
   await assert.rejects(()=>reset([...tasks,{id:id(10),expected_updated_at:tasks[0].expected_updated_at}]),e=>e.code==='42501');
   await assert.rejects(()=>reset([...tasks,{id:id(99),expected_updated_at:tasks[0].expected_updated_at}]),e=>e.code==='42501');
   for(const actor of [users.b,users.fresh,null])await assert.rejects(()=>reset(tasks,number++,actor),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('failed or suppressed second-row and history writes roll back every checkbox',async()=>{
   for(const [table,event,body] of [
    ['roadmap_tasks','update',`if new.id='${id(4)}' then raise exception 'fixture reset failure';end if;return new;`],
    ['roadmap_tasks','update',`if new.id='${id(4)}' then return null;end if;return new;`],
    ['ga_private.roadmap_reset_receipts','insert',"raise exception 'fixture receipt failure';"],
    ['ga_private.roadmap_reset_receipts','insert','return null;'],
   ]){
    await db.exec(`reset role;create function fixture_reset_failure() returns trigger language plpgsql as $$begin ${body}end;$$;
     create trigger fixture_failure before ${event} on ${table} for each row execute function fixture_reset_failure()`);
    const tasks=await targets(id(3),id(4)),before=await snapshot(db);await assert.rejects(()=>reset(tasks,202));assert.deepEqual(await snapshot(db),before);
    await db.exec(`reset role;drop trigger fixture_failure on ${table};drop function fixture_reset_failure()`);
   }
   assert.ok((await reset(await targets(id(3),id(4)),202)).tasks.every(r=>r.done===false));
  });
  await t.test('malformed, duplicate, empty, oversized and unknown-day requests cannot reset tasks',async()=>{
   const tasks=await targets(id(5)),before=await snapshot(db);
   for(const bad of [null,{},[],[tasks[0],tasks[0]],[{...tasks[0],done:false}],[{id:id(5),expected_updated_at:'now'}],
    Array.from({length:101},(_,n)=>({...tasks[0],id:id(300+n)})),[{...tasks[0],padding:'x'.repeat(33000)}]])
    await assert.rejects(()=>reset(bad),e=>e.code==='22023');
   for(const [day,zone,code] of [['2000-01-01','Asia/Tokyo','40001'],['2099-01-01','Asia/Tokyo','40001'],
    ['2026-02-31','Asia/Tokyo','22023'],[today,'Not/AZone','22023']])await assert.rejects(()=>reset(tasks,number++,users.a,day,zone),e=>e.code===code);
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('already unchecked, current-day, future and non-daily rows are never cleared as stale',async()=>{
   await db.exec(`reset role;update roadmap_tasks set done=false where id='${id(6)}';
    update roadmap_tasks set title='Current-day edit' where id='${id(7)}';
    alter table roadmap_tasks disable trigger roadmap_tasks_set_updated_at;
    update roadmap_tasks set updated_at=now()+interval '2 days' where id='${id(8)}';
    update roadmap_tasks set tags='{}' where id='${id(9)}';
    alter table roadmap_tasks enable trigger roadmap_tasks_set_updated_at`);
   const before=await snapshot(db);
   for(const n of [6,7,8,9])await assert.rejects(async()=>reset(await targets(id(n))),e=>e.code===(n===9?'22023':'40001'));
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('pause, revoked verification and anonymous identities block original replays',async()=>{
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');await assert.rejects(()=>reset(original,200),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);
   await assert.rejects(()=>reset(original,200),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}';select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   await assert.rejects(()=>reset(original,200),e=>e.code==='42501');await db.exec("reset role;select set_config('request.jwt.claims','{}',false)");
  });
  await t.test('old receipts survive deletion but cannot recreate a task',async()=>{
   await as(users.a,'delete from roadmap_tasks where id=$1',[id(2)]);await assert.rejects(()=>reset(original,200),e=>e.code==='42501');
   await db.exec('reset role');assert.equal((await db.query('select count(*) n from ga_private.roadmap_reset_receipts where request_id=$1',[id(200)])).rows[0].n,1);
  });
 }finally{await db.close();}
});
test('daily reset preparation stops on reviewed schema, trigger or daily-action drift',async t=>{
 for(const change of ['alter table roadmap_tasks add column unexpected text','alter table roadmap_tasks disable trigger roadmap_tasks_set_updated_at',
  'alter function public.ga_roadmap_set_daily_task(uuid,timestamptz,boolean,text,uuid) security invoker'])
  await t.test(change,async()=>{const db=await baseline(false);try{await db.exec(change);const old=await snapshot(db);
   await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');assert.deepEqual(await snapshot(db),old);
  }finally{await db.close();}});
});
test('containment revokes the optional daily-reset endpoint when pausing fails',async()=>{
 const db=await baseline();try{await db.exec(await read('04_commonplace_signup.sql'));await db.exec('delete from ga_private.roadmap_control');
  await assert.rejects(()=>db.exec(stop),/Containment incomplete/);await db.exec('rollback');
  assert.equal((await db.query("select has_function_privilege('authenticated','ga_roadmap_reset_daily_tasks(jsonb,text,text,uuid)','execute') ok")).rows[0].ok,false);
 }finally{await db.close();}
});
