import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8');
const candidate=await read('13_roadmap_task_edits.sql');
const id=n=>'d0000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function baseline(install=true){
 const db=await createAcceptanceDatabase();try{
  await db.exec(legacyFixture);await db.exec(await readFile(new URL('./roadmap-session-fixture.sql',import.meta.url),'utf8'));
  for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql'])await db.exec(await read(f));
  for(let n=1;n<=6;n++)await db.query(`insert into roadmap_tasks(id,user_id,title,kind,tags,done,streak,streak_day,updated_at)
   values($1,$2,$3,$4,$5,true,4,'2026-11-25',now()-interval '2 days')`,[id(n),n===6?users.b:users.a,'Retain task '+n,n===3?'group':'task',n===5?['wf']:['daily-routine']]);
  await db.exec(`insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,completed_at,verification,feedback)
   values('${id(100)}','${users.a}','${id(1)}','2026-11-25','study-app',now(),'app','{"keep":"proof"}')`);
  if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}
}
const snapshot=async db=>{await db.exec('reset role');return(await db.query(`select
 (select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t) tasks,
 (select jsonb_agg(to_jsonb(s) order by id) from roadmap_study_sessions s) sessions`)).rows[0]};
test('task metadata edits are atomic, versioned, recoverable and owner isolated',async t=>{
 const db=await baseline(false),{as}=access(db);let number=200;
 const targets=async(...ns)=>(await db.query('select id,updated_at::text expected_updated_at from roadmap_tasks where id=any($1) order by id',[ns.map(id)])).rows
  .map(r=>({...r,expected_updated_at:r.expected_updated_at.replace(' ','T').replace(/\+00$/,'+00:00'),patch:{title:'New title'}}));
 const edit=async(tasks,request=number++,actor=users.a)=>(await as(actor,'select ga_roadmap_edit_tasks($1,$2) result',[tasks,id(request)])).rows[0].result;
 try{
  const before=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),before);
  let original,first;
  await t.test('batch commits only metadata with private before/after history',async()=>{
   original=await targets(1,2,3);original[1].patch={tags:['daily-routine','kept','@home']};original[2].patch={expanded:false};
   first=await edit(original,100);assert.equal(first.tasks.length,3);assert.equal(first.replayed,false);
   assert.equal(first.tasks[0].title,'New title');assert.deepEqual(first.tasks[1].tags,['daily-routine','kept','@home']);assert.equal(first.tasks[2].expanded,false);
   assert.ok(first.tasks.every(r=>r.user_id===undefined&&r.done===true&&r.streak===4&&r.streak_day==='2026-11-25'));
   const after=await snapshot(db);assert.deepEqual(after.sessions,before.sessions);
   const strip=({title,tags,expanded,updated_at,...rest})=>rest;assert.deepEqual(after.tasks.map(strip),before.tasks.map(strip));
   const history=(await db.query('select * from ga_private.roadmap_task_edit_receipts where request_id=$1',[id(100)])).rows[0];
   assert.equal(history.before_tasks[0].title,'Retain task 1');assert.equal(history.after_tasks[0].title,'New title');
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_task_edit_receipts'),e=>e.code==='42501');
  });
  await t.test('retry returns current state and never replaces a newer edit or revision',async()=>{
   assert.equal((await edit([...original].reverse(),100)).replayed,true);
   const newer=await targets(1);newer[0].patch={title:'More recent work'};await edit(newer);
   assert.equal((await edit(original,100)).tasks[0].title,'More recent work');
   await assert.rejects(()=>edit(original.map(t=>({...t,patch:{title:'Changed retry'}})),100),e=>e.code==='22023');
   await db.exec('reset role');assert.equal((await db.query('select count(*) n from ga_private.roadmap_task_edit_receipts where request_id=$1',[id(100)])).rows[0].n,1);
  });
  await t.test('stale, foreign, missing and unverified targets reject the full batch',async()=>{
   const current=await targets(1,2),before=await snapshot(db);
   await assert.rejects(()=>edit([current[0],{...current[1],expected_updated_at:'2000-01-01T00:00:00Z'}]),e=>e.code==='40001');
   for(const n of [6,99])await assert.rejects(()=>edit([...current,{...current[0],id:id(n)}]),e=>e.code==='42501');
   for(const actor of [users.b,users.fresh,null])await assert.rejects(()=>edit(current,number++,actor),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('second-row and receipt failures or suppressed writes roll back everything',async()=>{
   for(const [table,event,body] of [
    ['roadmap_tasks','update',`if new.id='${id(2)}' then raise exception 'fixture failure';end if;return new;`],
    ['roadmap_tasks','update',`if new.id='${id(2)}' then return null;end if;return new;`],
    ['roadmap_tasks','update',`new.done:=false;return new;`],
    ['ga_private.roadmap_task_edit_receipts','insert',"raise exception 'fixture history failure';"],
    ['ga_private.roadmap_task_edit_receipts','insert','return null;'],
   ]){
    await db.exec(`reset role;create function fixture_edit_failure() returns trigger language plpgsql as $$begin ${body}end;$$;
     create trigger fixture_failure before ${event} on ${table} for each row execute function fixture_edit_failure()`);
    const current=await targets(1,2),before=await snapshot(db);await assert.rejects(()=>edit(current));assert.deepEqual(await snapshot(db),before);
    await db.exec(`reset role;drop trigger fixture_failure on ${table};drop function fixture_edit_failure()`);
   }
  });
  await t.test('field, type, count, UTF-8 byte and duplicate validation never partially saves',async()=>{
   const [row]=await targets(1),before=await snapshot(db);
   for(const patch of [{},{title:''},{title:' \n\t'},{title:null},{title:'あ'.repeat(1366)},{expanded:null},{expanded:'false'},
    {done:false},{parent_id:null},{position:5},{streak:0},{user_id:users.b},{tags:{}},{tags:[null]},{tags:['a','a']},{tags:['']},
    {tags:['あ'.repeat(27)]},{tags:Array.from({length:33},(_,i)=>'tag'+i)},...['wf','orphaned','wf-orphan'].map(x=>({tags:[x]}))])
    await assert.rejects(()=>edit([{...row,patch}]),e=>e.code==='22023');
   for(const bad of [null,{},[],[row,row],[{...row,unexpected:true}],[{...row,expected_updated_at:'now'}],
    Array.from({length:101},(_,n)=>({...row,id:id(n+400)})),
    Array.from({length:20},(_,n)=>({...row,id:id(n+400),patch:{title:'x'.repeat(4096)}}))])
    await assert.rejects(()=>edit(bad),e=>e.code==='22023');
   assert.deepEqual(await snapshot(db),before);
   assert.equal((await edit([{...row,patch:{title:'x'.repeat(4096),tags:[],expanded:false}}])).tasks[0].title.length,4096);
  });
  await t.test('Weekly Focus mirror metadata remains with its owner',async()=>{
   const [mirror]=await targets(5);for(const patch of [{title:'Override'},{tags:[]}])
    await assert.rejects(()=>edit([{...mirror,patch}]),e=>e.code==='22023');
   assert.equal((await edit([{...mirror,patch:{expanded:false}}])).tasks[0].title,'Retain task 5');
  });
  await t.test('pause, revoked verification and anonymous claims also reject replay',async()=>{
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');await assert.rejects(()=>edit(original,100),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);
   await assert.rejects(()=>edit(original,100),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}';select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   await assert.rejects(()=>edit(original,100),e=>e.code==='42501');await db.exec("reset role;select set_config('request.jwt.claims','{}',false)");
  });
  await t.test('retained history cannot recreate a deleted task',async()=>{
   await as(users.a,'delete from roadmap_tasks where id=$1',[id(2)]);await assert.rejects(()=>edit(original,100),e=>e.code==='42501');
   await db.exec('reset role');assert.equal((await db.query('select count(*) n from ga_private.roadmap_task_edit_receipts where request_id=$1',[id(100)])).rows[0].n,1);
  });
 }finally{await db.close()}
});
test('task edit preparation refuses schema, policy or trigger drift',async t=>{
 for(const change of ['alter table roadmap_tasks add column unexpected text','alter table roadmap_tasks disable trigger roadmap_tasks_set_updated_at',
  'alter policy owner on roadmap_tasks using (true)'])await t.test(change,async()=>{
  const db=await baseline(false);try{
   // The baseline policy name is read from the catalog instead of assuming it.
   if(change.startsWith('alter policy')){const name=(await db.query("select policyname from pg_policies where tablename='roadmap_tasks'")).rows[0].policyname;await db.exec(`alter policy "${name}" on roadmap_tasks using (true)`)}else await db.exec(change);
   const before=await snapshot(db);await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
  }finally{await db.close()}
 });
});
test('containment revokes task metadata edits even when pause fails',async()=>{
 const db=await baseline();try{await db.exec(await read('04_commonplace_signup.sql'));await db.exec('delete from ga_private.roadmap_control');
  const stop=await read('90_containment.sql');await assert.rejects(()=>db.exec(stop),/Containment incomplete/);await db.exec('rollback');
  assert.equal((await db.query("select has_function_privilege('authenticated','ga_roadmap_edit_tasks(jsonb,uuid)','execute') ok")).rows[0].ok,false);
 }finally{await db.close()}
});
