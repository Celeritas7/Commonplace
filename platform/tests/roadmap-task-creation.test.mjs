import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8');
const candidate=await read('15_roadmap_task_creation.sql'),id=n=>'f0000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function baseline(install=true){
 const db=await createAcceptanceDatabase();try{
  await db.exec(legacyFixture);for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
  for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql'])await db.exec(await read(f));
  await db.exec(`insert into roadmap_tasks(id,user_id,title,kind,done,streak,streak_day) values
   ('${id(1)}','${users.a}','Keep folder','group',false,0,null),('${id(2)}','${users.b}','Other folder','group',false,0,null),
   ('${id(3)}','${users.a}','Keep task','task',true,4,'2026-11-25');
   insert into roadmap_daily_logs(id,user_id,task_id,log_date,notes) values('${id(4)}','${users.a}','${id(3)}','2026-11-25','Keep notes 日本語');
   insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,verification,feedback)
    values('${id(5)}','${users.a}','${id(3)}','2026-11-25','study-app','app','{"keep":"proof"}');
   update auth.users set email_confirmed_at=null where id='${users.fresh}'`);
  if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}
}
const snapshot=async db=>{await db.exec('reset role');return(await db.query(`select
 (select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t) tasks,
 (select jsonb_agg(to_jsonb(l) order by id) from roadmap_daily_logs l) logs,
 (select jsonb_agg(to_jsonb(s) order by id) from roadmap_study_sessions s) sessions`)).rows[0]};
const task=(n=10)=>({kind:'task',parent_id:id(1),items:[{id:id(n),title:'Keep 日本語 <script>text</script>',tags:['home']}]});
const capture=(n=20)=>({kind:'capture',text:'buy paper!, study Japanese, buy pens',items:[
 {id:id(n),title:'buy paper',tags:['outside','short-burst','high','parked'],folder:'Shopping'},
 {id:id(n+1),title:'study Japanese',tags:['parked'],folder:'Languages'},
 {id:id(n+2),title:'buy pens',tags:['outside','short-burst','parked'],folder:'Shopping'}]});
test('task creation and capture preserve records and recover original identities atomically',async t=>{
 const db=await baseline(false),{as}=access(db);let seq=1000;
 const create=async(payload,request=seq++,actor=users.a)=>(await as(actor,'select ga_roadmap_create_tasks($1,$2) result',[payload,id(request)])).rows[0].result;
 try{
  const old=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),old);
  await t.test('single task creation and replay keep current metadata without changing history',async()=>{
   const r=await create(task(),10);assert.equal(r.replayed,false);assert.equal(r.tasks.length,1);assert.equal(r.tasks[0].title,task().items[0].title);
   assert.equal(r.tasks[0].parent_id,id(1));assert.equal(r.tasks[0].done,false);assert.equal(r.tasks[0].streak,0);assert.equal(r.tasks[0].user_id,undefined);
   await as(users.a,'update roadmap_tasks set title=$1,tags=$2 where id=$3',['Later title',['office'],id(10)]);
   const replay=await create(task(),10);assert.equal(replay.replayed,true);assert.equal(replay.tasks[0].title,'Later title');assert.deepEqual(replay.tasks[0].tags,['office']);
   await assert.rejects(()=>create({...task(),parent_id:null},10),e=>e.code==='22023');
   const now=await snapshot(db);assert.deepEqual(now.logs,old.logs);assert.deepEqual(now.sessions,old.sessions);
   for(const row of old.tasks)assert.deepEqual(now.tasks.find(t=>t.id===row.id),row);
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_creation_receipts'),e=>e.code==='42501');
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_creation_ids'),e=>e.code==='42501');
  });
  await t.test('capture batch creates one root and one folder per category, reuses them on new batches',async()=>{
   const r=await create(capture(),20);assert.equal(r.tasks.length,6);assert.equal(r.tasks.filter(t=>t.kind==='task').length,3);
   assert.equal(r.tasks.filter(t=>t.title==='Shopping').length,1);const root=r.tasks.find(t=>t.title==='Captured');assert.deepEqual(root.tags,['inbox']);
   assert.deepEqual((await create(capture(),20)).tasks,r.tasks);
   const next=await create(capture(30),30);assert.equal(next.tasks.find(t=>t.title==='Captured').id,root.id);
   assert.equal(next.tasks.find(t=>t.title==='Shopping').id,r.tasks.find(t=>t.title==='Shopping').id);
   await db.exec('reset role');assert.equal((await db.query("select count(*) n from roadmap_tasks where title='Captured'")).rows[0].n,1);
   const receipt=(await db.query('select created_rows from ga_private.roadmap_creation_receipts where request_id=$1',[id(20)])).rows[0];assert.equal(receipt.created_rows.length,6);
  });
  await t.test('existing or foreign UUIDs and invalid/missing/foreign parents cannot be adopted',async()=>{
   for(const parent_id of [id(2),id(3),id(99)])await assert.rejects(()=>create({...task(40),parent_id}),e=>e.code==='42501');
   for(const n of [1,2,10])await assert.rejects(()=>create(task(n)),e=>e.code==='42501');
   await assert.rejects(()=>create({...task(40),parent_id:null},40,null),e=>e.code==='42501');
   await assert.rejects(()=>create({...task(40),parent_id:null},40,users.fresh),e=>e.code==='42501');
   await assert.rejects(()=>create(task(),10,users.b),e=>e.code==='42501');
   await db.exec(`reset role;update roadmap_tasks set tags='{wf}' where id='${id(1)}'`);
   await assert.rejects(()=>create(task(40)),e=>e.code==='42501');await db.exec(`reset role;update roadmap_tasks set tags='{}' where id='${id(1)}'`);
  });
  await t.test('count, bytes, field validation and reserved mirror tags reject before partial creation',async()=>{
   const before=await snapshot(db),p=task(40),item=p.items[0];
   for(const bad of [null,[],{}, {...p,user_id:users.b},{...p,kind:'group'},{...p,items:[]},{...p,items:[item,item]},
    {...p,parent_id:'bad'}, {...capture(40),items:Array.from({length:33},(_,n)=>({...capture().items[0],id:id(400+n)}))},
    {...capture(40),text:'あ'.repeat(10923)},
    ...[{id:'bad'},{title:''},{title:'\n\t '},{title:'あ'.repeat(1366)},{done:true},{tags:null},{tags:['wf']},{tags:['x','x']},{tags:['x'.repeat(81)]},
    {tags:Array.from({length:33},(_,n)=>String(n))}].map(x=>({...p,items:[{...item,...x}]})),
    {...capture(40),items:[{...capture(40).items[0],folder:'Unknown'}]},
    {...capture(40),items:[{...capture(40).items[0],tags:[]}]},
    {...capture(40),items:Array.from({length:32},(_,n)=>({...capture().items[0],id:id(500+n),title:'x'.repeat(4096)}))},
   ])await assert.rejects(()=>create(bad),e=>e.code==='22023');
   assert.deepEqual(await snapshot(db),before);
   const boundary=await create({...p,items:[{...item,title:'x'.repeat(4096),tags:Array.from({length:32},(_,n)=>String(n)+'x'.repeat(78))}]});assert.equal(boundary.tasks[0].title.length,4096);
  });
  await t.test('capture receipt or row failure rolls back every new folder, task and identity reservation',async()=>{
   // A distinct owner has no capture root yet; all three inserts must roll back together.
   for(const [table,body] of [
    ['roadmap_tasks',"if new.kind='task' then raise exception 'fixture failure';end if;return new;"],
    ['roadmap_tasks',"if new.kind='task' then return null;end if;return new;"],
    ['roadmap_tasks',"new.title:='Changed';return new;"],
    ['ga_private.roadmap_creation_receipts','return null;'],['ga_private.roadmap_creation_ids','return null;'],
   ]){
    await db.exec(`reset role;create function fixture_creation_failure() returns trigger language plpgsql as $$begin ${body}end;$$;
     create trigger fixture_creation_failure before insert on ${table} for each row execute function fixture_creation_failure()`);
    const before=await snapshot(db),claims=(await db.query('select count(*) n from ga_private.roadmap_creation_ids')).rows[0].n;
    await assert.rejects(()=>create(capture(60),60,users.b));assert.deepEqual(await snapshot(db),before);
    assert.equal((await db.query('select count(*) n from ga_private.roadmap_creation_ids')).rows[0].n,claims);
    await db.exec(`drop trigger fixture_creation_failure on ${table};drop function fixture_creation_failure()`);
   }
   assert.equal((await create(capture(60),60,users.b)).replayed,false);
  });
  await t.test('ambiguous or repurposed capture folders require review without creating another copy',async()=>{
   await db.exec(`reset role;insert into roadmap_tasks(id,user_id,title,kind,tags) values('${id(80)}','${users.a}','Captured','group','{inbox}')`);
   const before=await snapshot(db);await assert.rejects(()=>create(capture(90)),e=>e.code==='22023');assert.deepEqual(await snapshot(db),before);
   await db.exec(`delete from roadmap_tasks where id='${id(80)}';update roadmap_tasks set tags='{}' where user_id='${users.a}' and title='Captured'`);
   await assert.rejects(()=>create(capture(90)),e=>e.code==='22023');await db.exec(`reset role;update roadmap_tasks set tags='{inbox}' where user_id='${users.a}' and title='Captured'`);
  });
  await t.test('pause, verification and anonymous revocation deny original retries',async()=>{
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');await assert.rejects(()=>create(task(),10),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);
   await assert.rejects(()=>create(task(),10),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}';select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   await assert.rejects(()=>create(task(),10),e=>e.code==='42501');await db.exec("reset role;select set_config('request.jwt.claims','{}',false)");
  });
  await t.test('deletion cannot resurrect tasks, folders or reuse reserved UUIDs with a fresh request',async()=>{
   await as(users.a,'delete from roadmap_tasks where id=$1',[id(10)]);await assert.rejects(()=>create(task(),10),e=>e.code==='42501');
   await assert.rejects(()=>create(task(),99),e=>e.code==='42501');
   await as(users.a,"delete from roadmap_tasks where title='Captured'");await assert.rejects(()=>create(capture(),20),e=>e.code==='42501');
   await assert.rejects(()=>create(capture(),100),e=>e.code==='42501');await db.exec('reset role');
   assert.equal((await db.query("select count(*) n from roadmap_tasks where user_id=$1 and title='Captured'",[users.a])).rows[0].n,0);
  });
 }finally{await db.close()}
});
test('task creation installation refuses schema/policy/parent/trigger drift',async t=>{
 for(const change of ['alter table roadmap_tasks add column unexpected text',
  'alter policy roadmap_tasks_owner on roadmap_tasks using (true)',
  'alter table roadmap_tasks drop constraint ga_parent_owner',
  `create function fixture_drift() returns trigger language plpgsql as $$begin return new;end;$$;create trigger unexpected before insert on roadmap_tasks for each row execute function fixture_drift()`])
  await t.test(change,async()=>{const db=await baseline(false);try{await db.exec(change);const before=await snapshot(db);await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before)}finally{await db.close()}});
});
test('containment revokes task creation even if the pause row is missing',async()=>{
 const db=await baseline();try{await db.exec(await read('04_commonplace_signup.sql'));await db.exec('delete from ga_private.roadmap_control');
  await assert.rejects(()=>db.exec(awaitedContainment),/Containment incomplete/);await db.exec('rollback');
  assert.equal((await db.query("select has_function_privilege('authenticated','ga_roadmap_create_tasks(jsonb,uuid)','execute') ok")).rows[0].ok,false);
 }finally{await db.close()}
});
const awaitedContainment=await read('90_containment.sql');
