import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8'),candidate=await read('16_roadmap_structure.sql');
const id=n=>'16000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function fixture(install=true){const db=await createAcceptanceDatabase();try{
 await db.exec(legacyFixture);for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
 for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql','15_roadmap_task_creation.sql'])await db.exec(await read(f));
 await db.exec(`insert into roadmap_tasks(id,user_id,parent_id,title,kind,tags,done,streak) values
 ('${id(1)}','${users.a}',null,'Root','group','{}',false,0),('${id(2)}','${users.a}',null,'Destination','group','{}',false,0),
 ('${id(3)}','${users.a}','${id(1)}','Study 日本語','task','{parked}',true,4),('${id(4)}','${users.a}','${id(1)}','Nested','group','{}',false,0),
 ('${id(5)}','${users.a}','${id(4)}','Child','task','{}',false,0),('${id(9)}','${users.b}',null,'Foreign','group','{}',false,0);
 insert into roadmap_task_resources(id,user_id,task_id,label,url) values('${id(6)}','${users.a}','${id(3)}','Keep link','https://example.invalid');
 insert into roadmap_daily_logs(id,user_id,task_id,notes) values('${id(7)}','${users.a}','${id(3)}','Keep 日本語 notes');
 insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,verification,feedback,completed_at,duration_min)
 values('${id(8)}','${users.a}','${id(3)}','2026-11-25','study-app','app','{"keep":"proof"}',now(),25);
 insert into roadmap_comparisons(id,user_id,task_id,title,notes) values('${id(10)}','${users.a}','${id(3)}','Keep comparison','Keep notes');
 insert into roadmap_suggestions(id,user_id,rm_task_id,task,title,say,until) values('suggestion','${users.a}','${id(3)}','{}','Keep suggestion','Keep',now()+interval '1 day');
 update auth.users set email_confirmed_at=null where id='${users.fresh}'`);
 if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}}
async function snapshot(db){await db.exec('reset role');const out={};for(const name of ['roadmap_tasks','roadmap_study_sessions','roadmap_daily_logs','roadmap_task_resources','roadmap_comparisons','roadmap_suggestions'])out[name]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') rows from ${name} t`)).rows[0].rows;return out}
async function target(db,n,patch){await db.exec('reset role');const r=(await db.query('select to_jsonb(t) row from roadmap_tasks t where id=$1',[id(n)])).rows[0].row;return {id:r.id,label:r.title,expected_updated_at:r.updated_at,...patch}}
test('structural actions are versioned, atomic and preserve study history',async t=>{
 const db=await fixture(false),{as}=access(db);let seq=1000;
 const run=async(p,n=seq++,actor=users.a)=>(await as(actor,'select ga_roadmap_structure($1,$2) result',[p,id(n)])).rows[0].result;
 try{
  const original=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),original);
  await t.test('moves/reorders commit together and retries keep later metadata',async()=>{
   const p={kind:'move',tasks:[await target(db,3,{parent_id:id(2),position:1}),await target(db,5,{parent_id:id(2),position:0})]};
   const r=await run(p,101);assert.equal(r.tasks.length,2);assert.ok(r.tasks.every(r=>r.parent_id===id(2)));assert.deepEqual(r.deleted_ids,[]);
   await as(users.a,'update roadmap_tasks set title=$1 where id=$2',['Later title',id(3)]);
   const replay=await run(p,101);assert.equal(replay.replayed,true);assert.equal(replay.tasks.find(r=>r.id===id(3)).title,'Later title');
   const current=await snapshot(db);for(const table of Object.keys(original).filter(k=>k!=='roadmap_tasks'))assert.deepEqual(current[table],original[table]);
   assert.equal(current.roadmap_tasks.find(r=>r.id===id(3)).streak,4);
   await assert.rejects(async()=>run({...p,tasks:[p.tasks[0]]},101),e=>e.code==='22023');
   await assert.rejects(()=>run(p),e=>e.code==='40001');
  });
  await t.test('new folder plus moves are atomic and one request does not create duplicate folders',async()=>{
   const p={kind:'move',folder:{id:id(20),title:'Named folder',parent_id:null,tags:[]},tasks:[await target(db,3,{parent_id:id(20),position:0})]};
   const r=await run(p,102);assert.equal(r.tasks.length,2);assert.equal(r.tasks.find(r=>r.id===id(20)).kind,'group');assert.equal((await run(p,102)).replayed,true);
   await assert.rejects(async()=>run({...p,folder:{...p.folder,id:id(1)}}),e=>['42501','40001'].includes(e.code));
  });
  await t.test('foreign/non-group parents, cycles and mirror targets refuse every write',async()=>{
   for(const parent_id of [id(9),id(3),id(99)]){const before=await snapshot(db);await assert.rejects(async()=>run({kind:'move',tasks:[await target(db,4,{parent_id,position:0})]}),e=>e.code==='42501');assert.deepEqual(await snapshot(db),before)}
   const before=await snapshot(db);await assert.rejects(async()=>run({kind:'move',tasks:[await target(db,1,{parent_id:id(4),position:0})]}),e=>e.code==='22023');assert.deepEqual(await snapshot(db),before);
   await db.exec(`update roadmap_tasks set tags='{wf}' where id='${id(5)}'`);await assert.rejects(async()=>run({kind:'delete',tasks:[await target(db,5)]}),e=>e.code==='42501');await db.exec(`reset role;update roadmap_tasks set tags='{}' where id='${id(5)}'`);
  });
  await t.test('a group containing a mirror cannot move its descendants indirectly',async()=>{
   await db.exec(`reset role;update roadmap_tasks set tags='{wf}',parent_id='${id(4)}' where id='${id(5)}'`);
   const before=await snapshot(db);await assert.rejects(async()=>run({kind:'move',tasks:[await target(db,4,{parent_id:id(2),position:0})]}),e=>e.code==='42501');assert.deepEqual(await snapshot(db),before);
   await db.exec(`update roadmap_tasks set tags='{}',parent_id='${id(2)}' where id='${id(5)}'`);
  });
  await t.test('bad fields, sizes, duplicates and unverified identities cannot mutate the tree',async()=>{
   const row=await target(db,5,{parent_id:null,position:0}),p={kind:'move',tasks:[row]},before=await snapshot(db);
   for(const bad of [null,[],{}, {...p,user_id:users.b}, {...p,tasks:[]}, {...p,tasks:[row,row]},
    ...[{position:-1},{position:1.5},{position:2147483648},{id:'bad'},{expected_updated_at:'today'},{label:'x'.repeat(4097)},{done:true}].map(x=>({...p,tasks:[{...row,...x}]})),
    {...p,tasks:Array.from({length:101},(_,n)=>({...row,id:id(500+n)}))}])await assert.rejects(()=>run(bad),e=>e.code==='22023');
   for(const actor of [null,users.fresh,users.b])await assert.rejects(()=>run(p,seq++,actor),e=>e.code==='42501');assert.deepEqual(await snapshot(db),before);
  });
  await t.test('suppressed changes or receipt writes roll back moves and new folder reservations',async()=>{
   const p={kind:'move',folder:{id:id(21),title:'Rollback folder',parent_id:null,tags:[]},tasks:[await target(db,3,{parent_id:id(21),position:0})]};
   for(const [table,event,body] of [['roadmap_tasks','update','return null;'],['ga_private.roadmap_structure_receipts','insert','return null;']]){
    await db.exec(`reset role;create function fixture_struct_fail() returns trigger language plpgsql as $$begin ${body}end;$$;create trigger fixture_struct_fail before ${event} on ${table} for each row execute function fixture_struct_fail()`);
    const before=await snapshot(db);await assert.rejects(()=>run(p,103));assert.deepEqual(await snapshot(db),before);
    assert.equal((await db.query('select count(*) n from ga_private.roadmap_creation_ids where id=$1',[id(21)])).rows[0].n,0);
    await db.exec(`drop trigger fixture_struct_fail on ${table};drop function fixture_struct_fail()`);
   }
  });
  await t.test('deletion requires the complete current subtree and retains sessions/logs/comparisons',async()=>{
   const parentOnly={kind:'delete',tasks:[await target(db,1)]};await assert.rejects(()=>run(parentOnly),e=>e.code==='40001');
   const p={kind:'delete',tasks:[await target(db,20),await target(db,3)]},before=await snapshot(db);
   await db.exec(`create function fixture_session_hold() returns trigger language plpgsql as $$begin return null;end;$$;
    create trigger fixture_session_hold before update on roadmap_study_sessions for each row execute function fixture_session_hold()`);
   await assert.rejects(()=>run(p,104),e=>e.code==='42501');assert.deepEqual(await snapshot(db),before);
   await db.exec('drop trigger fixture_session_hold on roadmap_study_sessions;drop function fixture_session_hold()');
   const r=await run(p,104);assert.deepEqual(new Set(r.deleted_ids),new Set([id(20),id(3)]));assert.deepEqual(r.tasks,[]);
   const after=await snapshot(db);assert.equal(after.roadmap_tasks.some(t=>t.id===id(3)),false);assert.deepEqual(after.roadmap_task_resources,[]);
   for(const table of ['roadmap_study_sessions','roadmap_daily_logs','roadmap_comparisons','roadmap_suggestions']){
    const link=table==='roadmap_suggestions'?'rm_task_id':'task_id';assert.equal(after[table][0][link],null);
    const strip=({updated_at,[link]:_,...x})=>x;assert.deepEqual(strip(after[table][0]),strip(before[table][0]));
   }
   await db.exec('reset role');const history=(await db.query('select before_state from ga_private.roadmap_structure_receipts where request_id=$1',[id(104)])).rows[0].before_state;
   assert.equal(history.roadmap_task_resources[0].url,'https://example.invalid');assert.deepEqual(history.roadmap_study_sessions[0].feedback,{keep:'proof'});
   assert.equal((await run(p,104)).replayed,true);
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_structure_receipts'),e=>e.code==='42501');
   await assert.rejects(()=>as(users.a,'select ga_roadmap_create_tasks($1,$2)',[{kind:'task',parent_id:null,items:[{id:id(3),title:'Reuse',tags:[]}]},id(105)]),e=>e.code==='42501');
   await db.exec(`reset role;insert into roadmap_tasks(id,user_id,title) values('${id(3)}','${users.b}','Legacy reused identity')`);
   await assert.rejects(()=>run(p,104),e=>e.code==='40001');assert.equal((await snapshot(db)).roadmap_tasks.find(t=>t.id===id(3)).user_id,users.b);
  });
  await t.test('failed deletion or lost history capture keeps tasks and all linked study records',async()=>{
   const p={kind:'delete',tasks:[await target(db,5)]};
   for(const [table,event] of [['roadmap_tasks','delete'],['ga_private.roadmap_structure_receipts','insert']]){
    await db.exec(`reset role;create function fixture_struct_fail() returns trigger language plpgsql as $$begin return null;end;$$;create trigger fixture_struct_fail before ${event} on ${table} for each row execute function fixture_struct_fail()`);
    const before=await snapshot(db);await assert.rejects(()=>run(p,106));assert.deepEqual(await snapshot(db),before);
    await db.exec(`drop trigger fixture_struct_fail on ${table};drop function fixture_struct_fail()`);
   }
   assert.equal((await run(p,106)).replayed,false);
  });
  await t.test('revocation also rejects successful replays',async()=>{
   const p={kind:'delete',tasks:[await target(db,4)]};await run(p,107);
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');await assert.rejects(()=>run(p,107),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);await assert.rejects(()=>run(p,107),e=>e.code==='42501');
  });
 }finally{await db.close()}
});
test('structure installer rejects source or inbound cascade drift',async t=>{
 for(const change of ['alter table roadmap_daily_logs add column surprise text','alter policy roadmap_tasks_owner on roadmap_tasks using(true)',
  'alter table roadmap_study_sessions drop constraint ga_session_task_owner','create table unexpected_link(id uuid references roadmap_tasks(id) on delete cascade)'])
  await t.test(change,async()=>{const db=await fixture(false);try{await db.exec(change);const before=await snapshot(db);await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before)}finally{await db.close()}});
});
test('containment revokes structural execution even with missing pause control',async()=>{
 const db=await fixture();try{await db.exec(await read('04_commonplace_signup.sql'));await db.exec('delete from ga_private.roadmap_control');const stop=await read('90_containment.sql');
  await assert.rejects(()=>db.exec(stop),/Containment incomplete/);await db.exec('rollback');assert.equal((await db.query("select has_function_privilege('authenticated','ga_roadmap_structure(jsonb,uuid)','execute') ok")).rows[0].ok,false);
 }finally{await db.close()}
});
test('new folders cannot cross the owner-tree limit and strand an uncertain retry',async()=>{
 const db=await fixture(),{as}=access(db);try{
  await db.exec(`insert into roadmap_tasks(id,user_id,title)
   select ('16000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'${users.a}','Capacity fixture' from generate_series(10000,14994) n`);
  const p={kind:'move',tasks:[],folder:{id:id(90),title:'At capacity',parent_id:null,tags:[]}};
  const run=()=>as(users.a,'select ga_roadmap_structure($1,$2) result',[p,id(190)]);
  await assert.rejects(run,e=>e.code==='22023');
  await db.exec('reset role');assert.equal((await db.query('select count(*) n from roadmap_tasks where user_id=$1',[users.a])).rows[0].n,5000);
  assert.equal((await db.query('select count(*) n from ga_private.roadmap_creation_ids where id=$1',[id(90)])).rows[0].n,0);
  const deletion={kind:'delete',tasks:[await target(db,10000)]};await as(users.a,'select ga_roadmap_structure($1,$2)',[deletion,id(191)]);
  assert.equal((await run()).rows[0].result.replayed,false);assert.equal((await run()).rows[0].result.replayed,true);
 }finally{await db.close()}
});
