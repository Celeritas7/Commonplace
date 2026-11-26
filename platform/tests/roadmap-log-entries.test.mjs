import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8');
const candidate=await read('14_roadmap_log_entries.sql');
const id=n=>'e0000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function baseline(install=true){
 const db=await createAcceptanceDatabase();try{
  await db.exec(legacyFixture);
  for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
  for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql'])await db.exec(await read(f));
  await db.exec(`insert into roadmap_tasks(id,user_id,title,kind,done,streak,streak_day) values
   ('${id(1)}','${users.a}','Keep task','task',true,4,'2026-11-25'),
   ('${id(2)}','${users.b}','Other owner','task',false,0,null),('${id(3)}','${users.a}','Folder','group',false,0,null);
   insert into roadmap_daily_logs(id,user_id,task_id,log_date,notes) values('${id(4)}','${users.a}','${id(1)}','2026-11-25','Keep historical 日本語');
   insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,verification,feedback)
    values('${id(5)}','${users.a}','${id(1)}','2026-11-25','study-app','app','{"keep":"proof"}')`);
  await db.exec(`update auth.users set email_confirmed_at=null where id='${users.fresh}'`);
  if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}
}
const snapshot=async db=>{await db.exec('reset role');return(await db.query(`select
 (select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t) tasks,
 (select jsonb_agg(to_jsonb(l) order by id) from roadmap_daily_logs l) logs,
 (select jsonb_agg(to_jsonb(s) order by id) from roadmap_study_sessions s) sessions`)).rows[0]};
const entry={task_id:id(1),log_date:'2026-11-25',context:'@home',duration_minutes:35,notes:'Keep 日本語 and <script>text</script>'};
test('daily log creation confirms original-day records once without changing existing work',async t=>{
 const db=await baseline(false),{as}=access(db);let sequence=100;
 const add=async(input=entry,n=sequence++,actor=users.a,request=n+1000)=>(await as(actor,'select ga_roadmap_add_log($1,$2,$3) result',[id(n),input,id(request)])).rows[0].result;
 try{
  const before=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),before);
  await t.test('owned and general logs retain exact fields, date and private creation evidence',async()=>{
   const first=await add(entry,10);assert.equal(first.replayed,false);assert.equal(first.entry.id,id(10));assert.equal(first.entry.user_id,undefined);
   const {id:ignored,created_at,...fields}=first.entry;assert.deepEqual(fields,entry);assert.ok(Date.parse(created_at));
   const general=await add({...entry,task_id:null,context:null,notes:null},11);assert.equal(general.entry.task_id,null);
   const after=await snapshot(db);assert.deepEqual(after.tasks,before.tasks);assert.deepEqual(after.sessions,before.sessions);
   assert.deepEqual(after.logs.find(l=>l.id===id(4)),before.logs[0]);
   assert.equal((await db.query('select count(*) n from ga_private.roadmap_log_receipts')).rows[0].n,2);
   const history=(await db.query('select created_log from ga_private.roadmap_log_receipts where entry_id=$1',[id(10)])).rows[0].created_log;
   assert.deepEqual(history,first.entry);await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_log_receipts'),e=>e.code==='42501');
  });
  await t.test('lost acknowledgement retry returns current log and never repeats or changes the original date',async()=>{
   const first=await add(entry,10);assert.equal(first.replayed,true);assert.equal(first.entry.log_date,'2026-11-25');
   await as(users.a,'update roadmap_daily_logs set notes=$1 where id=$2',['Newer notes',id(10)]);
   const replay=await add(entry,10);assert.equal(replay.entry.notes,'Newer notes');
   await assert.rejects(()=>add({...entry,log_date:'2026-11-26'},10),e=>e.code==='22023');
   await assert.rejects(()=>add(entry,12,users.a,1010),e=>e.code==='22023');
   await assert.rejects(()=>add(entry,10,users.a,2010),e=>e.code==='42501');
   await db.exec('reset role');assert.equal((await db.query('select count(*) n from roadmap_daily_logs where id=$1',[id(10)])).rows[0].n,1);
  });
  await t.test('foreign, missing and group tasks, anonymous and unverified identities cannot add a log',async()=>{
   const before=await snapshot(db);
   for(const task_id of [id(2),id(3),id(99)])await assert.rejects(()=>add({...entry,task_id}),e=>e.code==='42501');
   for(const actor of [null,users.fresh])await assert.rejects(()=>add({...entry,task_id:null},sequence++,actor),e=>e.code==='42501');
   await assert.rejects(()=>add(entry,sequence++,users.b),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('invalid fields, dates, duration and UTF-8/JSON size limits send no partial rows',async()=>{
   const before=await snapshot(db);
   for(const bad of [null,[],{},Object.fromEntries(Object.entries(entry).filter(([k])=>k!=='notes')),
    ...[{user_id:users.b},{created_at:'2020-01-01'},{id:id(7)},{notes:[]},{context:1},{task_id:'bad'},
    {log_date:'2026-02-30'},{log_date:'0000-01-01'},{log_date:'today'},
    {duration_minutes:null},{duration_minutes:'35'},{duration_minutes:1.5},{duration_minutes:0},{duration_minutes:1441},
    {notes:'あ'.repeat(5462)},{context:'あ'.repeat(43)},{notes:'\n'.repeat(16384)}].map(p=>({...entry,...p}))])
    await assert.rejects(()=>add(bad),e=>e.code==='22023');
   assert.deepEqual(await snapshot(db),before);
   const boundary=await add({...entry,notes:'x'.repeat(16384),context:'x'.repeat(128),duration_minutes:1440});assert.equal(boundary.entry.notes.length,16384);
  });
  await t.test('failed or suppressed row/receipt writes and altered insert fields roll back the complete operation',async()=>{
   for(const [table,body] of [
    ['roadmap_daily_logs',"raise exception 'fixture log failure';"],['roadmap_daily_logs','return null;'],
    ['roadmap_daily_logs',"new.notes:='Unexpected changed notes';return new;"],
    ['ga_private.roadmap_log_receipts',"raise exception 'fixture receipt failure';"],['ga_private.roadmap_log_receipts','return null;'],
   ]){
    await db.exec(`reset role;create function fixture_log_failure() returns trigger language plpgsql as $$begin ${body}end;$$;
     create trigger fixture_log_failure before insert on ${table} for each row execute function fixture_log_failure()`);
    const before=await snapshot(db);await assert.rejects(()=>add(entry,20));assert.deepEqual(await snapshot(db),before);
    await db.exec(`reset role;drop trigger fixture_log_failure on ${table};drop function fixture_log_failure()`);
   }
   assert.equal((await add(entry,20)).replayed,false);
  });
  await t.test('existing or foreign log identities cannot be adopted as newly confirmed creates',async()=>{
   await assert.rejects(()=>add(entry,4),e=>e.code==='42501');
   await assert.rejects(()=>add({...entry,task_id:null},10,users.b),e=>e.code==='42501');
  });
  await t.test('pause and verification/anonymous revocation also deny previously successful retries',async()=>{
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');await assert.rejects(()=>add(entry,10),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);
   await assert.rejects(()=>add(entry,10),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}';select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   await assert.rejects(()=>add(entry,10),e=>e.code==='42501');await db.exec("reset role;select set_config('request.jwt.claims','{}',false)");
  });
  await t.test('task deletion preserves owned logs and original retry; log deletion never resurrects a record',async()=>{
   await as(users.a,'delete from roadmap_tasks where id=$1',[id(1)]);
   const replay=await add(entry,10);assert.equal(replay.entry.task_id,null);assert.equal(replay.entry.notes,'Newer notes');
   await as(users.a,'delete from roadmap_daily_logs where id=$1',[id(10)]);await assert.rejects(()=>add(entry,10),e=>e.code==='42501');
   await assert.rejects(()=>add({...entry,task_id:null},10,users.a,3010),e=>e.code==='42501');
   await db.exec('reset role');assert.equal((await db.query('select count(*) n from ga_private.roadmap_log_receipts where entry_id=$1',[id(10)])).rows[0].n,1);
   assert.equal((await db.query('select count(*) n from roadmap_daily_logs where id=$1',[id(10)])).rows[0].n,0);
  });
 }finally{await db.close()}
});
test('daily log candidate rejects schema, ownership and unexpected trigger drift',async t=>{
 for(const change of ['alter table roadmap_daily_logs add column unexpected text',
  'alter policy roadmap_daily_logs_owner on roadmap_daily_logs using (true)',
  'alter table roadmap_daily_logs drop constraint roadmap_daily_logs_task_id_fkey',
  `create function fixture_drift() returns trigger language plpgsql as $$begin return new;end;$$;create trigger unexpected before insert on roadmap_daily_logs for each row execute function fixture_drift()`])
  await t.test(change.slice(0,90),async()=>{const db=await baseline(false);try{await db.exec(change);const old=await snapshot(db);
   await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');assert.deepEqual(await snapshot(db),old);
  }finally{await db.close()}});
});
test('containment revokes optional daily log creation even when pausing fails',async()=>{
 const db=await baseline();try{await db.exec(await read('04_commonplace_signup.sql'));await db.exec('delete from ga_private.roadmap_control');
  const stop=await read('90_containment.sql');await assert.rejects(()=>db.exec(stop),/Containment incomplete/);await db.exec('rollback');
  assert.equal((await db.query("select has_function_privilege('authenticated','ga_roadmap_add_log(uuid,jsonb,uuid)','execute') ok")).rows[0].ok,false);
 }finally{await db.close()}
});
