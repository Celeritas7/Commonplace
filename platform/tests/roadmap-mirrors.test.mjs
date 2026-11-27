import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8'),candidate=await read('18_roadmap_mirror_delivery.sql');
const id=n=>'18000000-0000-4000-8000-'+String(n).padStart(12,'0');
const address={board_id:'board/a',item_key:'study:日本語',sub_id:'task',extra:{keep:'exact'}};
async function fixture(install=true){const db=await createAcceptanceDatabase();try{
 await db.exec(legacyFixture);for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
 for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql','15_roadmap_task_creation.sql'])await db.exec(await read(f));
 await db.exec(`insert into roadmap_tasks(id,user_id,title) values('${id(1)}','${users.a}','Keep personal task');
 insert into roadmap_daily_logs(user_id,task_id,notes) values('${users.a}','${id(1)}','Keep 日本語 notes');
 update auth.users set email_confirmed_at=null where id='${users.fresh}'`);
 if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}}
async function snapshot(db){await db.exec('reset role');const out={};for(const name of ['roadmap_tasks','roadmap_daily_logs','roadmap_study_sessions'])out[name]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') rows from ${name} t`)).rows[0].rows;return out}
async function enable(db,owner=users.a){await db.exec(`reset role;insert into ga_private.roadmap_mirror_access values('${owner}',true,'synthetic review') on conflict(auth_user_id) do update set enabled=true`)}
test('durable mirror pairing, ordering and recovery retain personal study data',async t=>{
 const db=await fixture(false),{as}=access(db);let seq=100;const run=(p={title:'Learn',done:false},n=seq++,addr=address,owner=users.a)=>as(owner,'select ga_roadmap_receive_task($1,$2,$3) r',[addr,p,n]).then(r=>r.rows[0].r);
 try{
  const original=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),original);
  await t.test('new owners are denied until original pair reconciliation is explicitly reviewed',async()=>{
   await assert.rejects(()=>run(),e=>e.code==='42501');await enable(db);
   for(const owner of [null,users.b,users.fresh])await assert.rejects(()=>run(undefined,seq++,address,owner),e=>e.code==='42501');
  });
  let first;
  await t.test('lost acknowledgement or browser/device replay creates one task and one folder',async()=>{
   first=await run({title:'Learn 日本語',done:true},200);assert.equal(first.tasks.length,2);assert.equal(first.tasks.at(-1).done,true);assert.deepEqual(first.address,address);
   const before=await snapshot(db),r=await run({done:true,title:'Learn 日本語'},200);assert.equal(r.task_id,first.task_id);assert.equal(r.replayed,true);assert.deepEqual(await snapshot(db),before);
   assert.equal((await snapshot(db)).roadmap_tasks.length,3);
  });
  await t.test('newer sequences win; stale deliveries and replays return the latest row without rewriting it',async()=>{
   await db.exec(`reset role;update roadmap_tasks set streak=7,expanded=false,tags=tags||'{keep-local}' where id='${first.task_id}'`);
   const newRow=(await run({title:'Newer',done:false,lat:true},202)).tasks.at(-1);assert.equal(newRow.streak,7);assert.equal(newRow.expanded,false);assert.ok(newRow.tags.includes('keep-local'));assert.ok(newRow.tags.includes('parked'));
   for(const [n,p] of [[201,{title:'Older',done:true}],[200,{title:'Learn 日本語',done:true}]]){
    const r=await run(p,n);assert.equal(r.last_seq,202);assert.deepEqual(r.tasks.at(-1),newRow);
   }
   await assert.rejects(()=>run({title:'Different'},202),e=>e.code==='22023');
   await assert.rejects(()=>run({title:'Learn 日本語',done:true},200,{...address,extra:{keep:'changed'}}),e=>e.code==='22023');
  });
  await t.test('origin deletion retains row/history; local deletion is never resurrected even after reload',async()=>{
   const r=await run({del:true},203);assert.equal(r.source_deleted,true);assert.equal(r.tasks.at(-1).title,'Newer');assert.ok(r.tasks.at(-1).tags.includes('orphaned'));
   const restored=await run({title:'Active again'},204);assert.ok(!restored.tasks.at(-1).tags.includes('orphaned'));
   await db.exec(`reset role;delete from roadmap_tasks where id='${first.task_id}'`);
   for(const [n,p] of [[204,{title:'Active again'}],[205,{title:'Must not resurrect'}]]){const x=await run(p,n);assert.equal(x.suppressed,true);assert.deepEqual(x.tasks,[]);assert.equal(x.task_id,first.task_id)}
   const tomb=await run({del:true},206,{...address,sub_id:'deleted-first'});assert.equal(tomb.task_id,null);assert.equal(tomb.suppressed,true);
   const later=await run({title:'No resurrection'},207,{...address,sub_id:'deleted-first'});assert.equal(later.task_id,null);
   const after=await snapshot(db);assert.deepEqual(after.roadmap_daily_logs,original.roadmap_daily_logs);assert.deepEqual(after.roadmap_study_sessions,original.roadmap_study_sessions);
   assert.deepEqual(after.roadmap_tasks.find(t=>t.id===id(1)),original.roadmap_tasks[0]);
  });
  await t.test('full JSON addresses and delimiter collisions remain independent; owners cannot see one another',async()=>{
   const a={board_id:'a/b',item_key:'c',sub_id:'d'},b={board_id:'a',item_key:'b/c',sub_id:'d'};
   const x=await run({title:'A'},300,a),y=await run({title:'B'},301,b),z=await run({title:'Extra'},302,{...a,extra:1});assert.equal(new Set([x.task_id,y.task_id,z.task_id]).size,3);
   await enable(db,users.b);const other=await run({title:'Own'},300,a,users.b);assert.notEqual(other.task_id,x.task_id);
   assert.deepEqual((await as(users.b,'select * from roadmap_tasks where id=$1',[x.task_id])).rows,[]);
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_mirror_pairs'),e=>e.code==='42501');
  });
  await t.test('pair or receipt failure rolls back task creation and folder creation together',async()=>{
   for(const table of ['ga_private.roadmap_mirror_pairs','ga_private.roadmap_mirror_receipts']){
    const before=await snapshot(db);await db.exec(`create function fixture_mirror_fail() returns trigger language plpgsql as $$begin return null;end;$$;create trigger fixture_mirror_fail before insert on ${table} for each row execute function fixture_mirror_fail()`);
    await assert.rejects(()=>run({title:'Atomic'},seq++,{...address,sub_id:'failure'+table}),e=>e.code==='40001');assert.deepEqual(await snapshot(db),before);
    await db.exec(`drop trigger fixture_mirror_fail on ${table};drop function fixture_mirror_fail()`);
   }
  });
  await t.test('malformed and multibyte over-limit requests preserve records',async()=>{
   const before=await snapshot(db);
   for(const p of [null,[],{}, {title:''},{title:'あ'.repeat(1366)},{title:'ok',done:'false'},{title:'ok',lat:null},{del:1},{title:4},{title:'ok',extra:'あ'.repeat(5500)}])await assert.rejects(()=>run(p),e=>e.code==='22023');
   for(const a of [{},[],{...address,sub_id:''},{...address,extra:'あ'.repeat(1366)}])await assert.rejects(()=>run({title:'ok'},seq++,a),e=>e.code==='22023');
   for(const n of [null,0,-1,9007199254740992])await assert.rejects(()=>run({title:'ok'},n),e=>e.code==='22023');
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('pause, review revocation and lost verification also deny previously successful receipts',async()=>{
   for(const [stop,start] of [['update ga_private.roadmap_control set paused=true','update ga_private.roadmap_control set paused=false'],
    [`update ga_private.roadmap_mirror_access set enabled=false where auth_user_id='${users.a}'`,`update ga_private.roadmap_mirror_access set enabled=true where auth_user_id='${users.a}'`],
    [`update auth.users set email_confirmed_at=null where id='${users.a}'`,`update auth.users set email_confirmed_at=now() where id='${users.a}'`]]){
    await db.exec('reset role;'+stop);await assert.rejects(()=>run({title:'Learn 日本語',done:true},200),e=>e.code==='42501');await db.exec('reset role;'+start);
   }
  });
 }finally{await db.close()}
});
test('legacy mirrors and ambiguous folders require review, and catalog drift refuses installation',async()=>{
 for(const kind of ['legacy','folder','drift']){const db=await fixture(false),{as}=access(db);try{
  if(kind==='drift'){
   await db.exec('alter table roadmap_tasks add column unexpected text');await assert.rejects(()=>db.exec(candidate),/baseline/);await db.exec('rollback');
   assert.equal((await db.query("select to_regclass('ga_private.roadmap_mirror_pairs') r")).rows[0].r,null);continue;
  }
  await db.exec(candidate);await enable(db);
  await db.exec(kind==='legacy'?`insert into roadmap_tasks(user_id,title,tags) values('${users.a}','Unpaired','{wf}')`:`insert into roadmap_tasks(user_id,title,kind) values('${users.a}','Languages','group')`);
  const before=await snapshot(db);await assert.rejects(()=>as(users.a,'select ga_roadmap_receive_task($1,$2,1)',[address,{title:'No guessed pair'}]),e=>e.code==='40001');assert.deepEqual(await snapshot(db),before);
 }finally{await db.close()}}
});
test('first-folder rollback and record capacity do not prevent a valid receipt replay',async()=>{
 const db=await fixture(),{as}=access(db);try{
  await enable(db);const call=(n,addr=address)=>as(users.a,'select ga_roadmap_receive_task($1,$2,$3) r',[addr,{title:'Capacity mirror'},n]);
  const before=await snapshot(db);await db.exec(`create function fixture_first_pair_fail() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_first_pair_fail before insert on ga_private.roadmap_mirror_pairs for each row execute function fixture_first_pair_fail()`);
  await assert.rejects(()=>call(1),e=>e.code==='40001');assert.deepEqual(await snapshot(db),before);
  assert.equal((await db.query('select count(*)::int n from ga_private.roadmap_creation_ids')).rows[0].n,0);
  await db.exec('drop trigger fixture_first_pair_fail on ga_private.roadmap_mirror_pairs;drop function fixture_first_pair_fail()');
  const first=(await call(1)).rows[0].r;await db.exec(`reset role;insert into roadmap_tasks(user_id,title) select '${users.a}','Capacity '||n from generate_series(1,4997) n`);
  assert.equal((await call(1)).rows[0].r.task_id,first.task_id);
  await assert.rejects(()=>call(2,{...address,sub_id:'exceeds'}),e=>e.code==='22023');
  await db.exec('reset role');assert.equal((await db.query(`select count(*)::int n from roadmap_tasks where user_id='${users.a}'`)).rows[0].n,5000);
 }finally{await db.close()}
});
