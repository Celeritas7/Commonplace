import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8'),candidate=await read('19_roadmap_completion_replies.sql');
const id=n=>'19000000-0000-4000-8000-'+String(n).padStart(12,'0');
const address={board_id:'board',item_key:'study:日本語',sub_id:'task',extra:{keep:'exact'}};
async function fixture(install=true){const db=await createAcceptanceDatabase();try{
 await db.exec(legacyFixture);for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql','roadmap-hub-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
 for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql','15_roadmap_task_creation.sql','18_roadmap_mirror_delivery.sql'])await db.exec(await read(f));
 await db.exec(`insert into ga_private.roadmap_mirror_access values('${users.a}',true,'Synthetic pairs'),('${users.b}',true,'Synthetic pairs');
 insert into akatsuki_vocab(user_id,ns,id,schema) select id,'enum','wf_apply_status','{"values":["applied","already","unknown","stale"]}' from auth.users;
 update auth.users set email_confirmed_at=null where id='${users.fresh}'`);
 if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}}
const api=db=>{const {as}=access(db);return{
 mirror:(n=10,p={title:'Mirror',done:false},owner=users.a,addr=address)=>as(owner,'select ga_roadmap_receive_task($1,$2,$3) r',[addr,p,n]).then(r=>r.rows[0].r),
 prepare:(task,request,sid=null,owner=users.a)=>as(owner,'select ga_roadmap_prepare_done($1,$2,$3) r',[task,request,sid]).then(r=>r.rows[0].r),
 reply:(request,owner=users.a)=>as(owner,'select ga_roadmap_reconcile_done($1) r',[request]).then(r=>r.rows[0].r),
 recovery:(owner=users.a)=>as(owner,'select ga_roadmap_done_recovery() r').then(r=>r.rows[0].r),as}}
async function enable(db){await db.exec(`reset role;insert into ga_private.roadmap_completion_access values('${users.a}',true,'Synthetic contract review'),('${users.b}',true,'Synthetic contract review')`)}
async function publish(db,p,seq=20,owner=users.a){await db.exec('reset role');const e=p.effect;await db.query('insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values($1,$2,$3,$4,$5,$6,$7,$8)',[seq,owner,e.from_app,e.to_app,e.kind,e.src_addr,e.payload,e.idempotency_key])}
async function answer(db,status='applied',reply_seq=30,seq=20){await db.exec('reset role');await db.query("update akatsuki_requests set reply=$1,reply_seq=$2,status='delivered' where seq=$3",[{status},reply_seq,seq])}
async function snapshot(db){await db.exec('reset role');const out={};for(const name of ['roadmap_tasks','roadmap_suggestions','roadmap_daily_logs','roadmap_study_sessions'])out[name]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') rows from ${name} t`)).rows[0].rows;return out}
test('durable completion requests and server-read replies preserve task ownership, ordering and study records',async t=>{
 const db=await fixture(false),a=api(db);try{
  const mirror=await a.mirror(),task=mirror.task_id;await db.exec(`reset role;
   insert into roadmap_suggestions(id,user_id,rm_task_id,task,title,say,until) values('synthetic','${users.a}','${task}','${JSON.stringify(address)}','Keep','Keep',now()+interval '1 day');
   insert into roadmap_daily_logs(user_id,task_id,notes) values('${users.a}','${task}','Keep notes');
   insert into roadmap_study_sessions(user_id,task_id,day_key,source,verification,feedback,completed_at) values('${users.a}','${task}','2026-11-27','study-app','app','{"keep":"proof"}',now())`);
  const before=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),before);
  await t.test('empty completion access denies even an approved mirror owner',async()=>{await assert.rejects(()=>a.prepare(task,id(1)),e=>e.code==='42501');await enable(db)});
  let p;
  await t.test('request is saved before publish, same pending task coalesces across devices, address and timestamp stay exact',async()=>{
   await db.exec(`reset role;create function fixture_alias_fail() returns trigger language plpgsql as $$begin return null;end;$$;create trigger fixture_alias_fail before insert on ga_private.roadmap_done_aliases for each row execute function fixture_alias_fail()`);
   await assert.rejects(()=>a.prepare(task,id(1),'synthetic'),e=>e.code==='40001');await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from ga_private.roadmap_done_requests')).rows[0].n,0);
   await db.exec('drop trigger fixture_alias_fail on ga_private.roadmap_done_aliases;drop function fixture_alias_fail()');
   p=await a.prepare(task,id(1),'synthetic');assert.deepEqual(p.effect.src_addr,address);assert.equal(p.effect.idempotency_key,'rm:done:'+id(1));
   assert.deepEqual(await a.prepare(task,id(1),'synthetic'),p);const other=await a.prepare(task,id(2));assert.equal(other.request_id,p.request_id);assert.deepEqual(other.effect,p.effect);
   await assert.rejects(()=>a.prepare(task,id(1),'changed'),e=>e.code==='22023');assert.equal((await a.reply(id(1))).state,'unpublished');
   assert.equal((await a.recovery()).length,1);assert.equal((await snapshot(db)).roadmap_tasks.find(t=>t.id===task).done,false);
  });
  await t.test('only a matching server hub row can apply; missing reply remains pending',async()=>{
   await publish(db,p);assert.equal((await a.reply(id(1))).state,'pending');await db.exec("reset role;update akatsuki_requests set payload=payload||'{\"changed\":true}'");
   await assert.rejects(()=>a.reply(id(1)),e=>e.code==='40001');await db.exec('reset role');await db.query('update akatsuki_requests set payload=$1',[p.effect.payload]);
   for(const [reply,seq] of [[{status:'invented'},30],[{status:'applied'},20],[{status:'applied',extra:'あ'.repeat(5500)},30]]){
    await db.exec('reset role');await db.query('update akatsuki_requests set reply=$1,reply_seq=$2',[reply,seq]);await assert.rejects(()=>a.reply(id(1)),e=>e.code==='40001');
   }
   await db.exec('reset role;update akatsuki_requests set reply=null,reply_seq=null');
   await assert.rejects(()=>a.reply(id(1),users.b),e=>e.code==='42501');await assert.rejects(()=>a.prepare(task,id(3),null,users.b),e=>e.code==='42501');
  });
  await t.test('receipt failure rolls back task checkbox and suggestion completion together',async()=>{
   await answer(db);const snap=await snapshot(db);await db.exec(`create function fixture_done_fail() returns trigger language plpgsql as $$begin return null;end;$$;
    create trigger fixture_done_fail before insert on ga_private.roadmap_done_receipts for each row execute function fixture_done_fail()`);
   await assert.rejects(()=>a.reply(id(1)),e=>e.code==='40001');assert.deepEqual(await snapshot(db),snap);
   await db.exec('drop trigger fixture_done_fail on ga_private.roadmap_done_receipts;drop function fixture_done_fail()');
   const r=await a.reply(id(1));assert.equal(r.state,'applied');assert.equal(r.tasks[0].done,true);const saved=await snapshot(db);assert.ok(saved.roadmap_suggestions[0].done_at);
   assert.deepEqual(saved.roadmap_daily_logs,before.roadmap_daily_logs);assert.deepEqual(saved.roadmap_study_sessions,before.roadmap_study_sessions);
   await a.reply(id(1));assert.deepEqual(await snapshot(db),saved);assert.deepEqual(await a.recovery(),[]);
   const alias=await a.prepare(task,id(2));assert.equal(alias.request_id,id(1));assert.equal(alias.closed,true);
  });
  await t.test('late task.upsert cannot undo a newer completion reply, and replay never undoes newer source truth',async()=>{
   const old=await a.mirror(25,{title:'Old update',done:false});assert.equal(old.tasks.at(-1).done,true);assert.equal(old.last_seq,30);
   const latest=await a.mirror(40,{title:'Latest source',done:false});assert.equal(latest.tasks.at(-1).done,false);
   const replay=await a.reply(id(1));assert.equal(replay.state,'superseded');assert.equal(replay.tasks[0].title,'Latest source');assert.equal(replay.tasks[0].done,false);
   const next=await a.prepare(task,id(3));assert.notEqual(next.effect.idempotency_key,p.effect.idempotency_key);await publish(db,next,50);await answer(db,'already',60,50);
   await a.mirror(65,{title:'Even newer',done:false});const stale=await a.reply(id(3));assert.equal(stale.state,'superseded');assert.equal(stale.tasks[0].done,false);
  });
  await t.test('reply discovery uses reply_seq for each request, so a late response or failure cannot skip another',async()=>{
   const t2=(await a.mirror(70,{title:'Other'},users.a,{...address,sub_id:'other'})).task_id;
   const x=await a.prepare(t2,id(4));await publish(db,x,80);await answer(db,'applied',100,80);await answer(db,'already',110,20);
   const list=await a.recovery();assert.deepEqual(list.map(r=>r.request_id),[id(4),id(1)]);
   await a.reply(id(1));assert.deepEqual((await a.recovery()).map(r=>r.request_id),[id(4)]);await a.reply(id(4));
   await answer(db,'stale',100,80);await assert.rejects(()=>a.reply(id(4)),e=>e.code==='40001');await answer(db,'applied',100,80);
  });
  await t.test('unknown source retains an orphan; local deletion is not recreated; original recovery stays readable',async()=>{
   await db.exec(`reset role;update roadmap_tasks set tags='{wf,lang,fullstack,keep-local}' where id='${task}'`);
   const next=await a.prepare(task,id(5));await publish(db,next,120);await answer(db,'unknown',130,120);const r=await a.reply(id(5));assert.equal(r.state,'unknown');assert.deepEqual(r.tasks[0].tags,['wf','lang','fullstack','keep-local','orphaned']);
   assert.equal((await a.prepare(task,id(5))).publishable,false);await a.mirror(135,{title:'Source returned',done:false});
   const next2=await a.prepare(task,id(6));await publish(db,next2,140);await answer(db,'applied',150,140);await db.exec(`reset role;delete from roadmap_tasks where id='${task}'`);
   const gone=await a.reply(id(6));assert.equal(gone.state,'removed');assert.deepEqual(gone.tasks,[]);assert.equal((await a.prepare(task,id(6))).publishable,false);
   const never=await a.mirror(160,{title:'No recreation'});assert.equal(never.suppressed,true);
  });
  await t.test('unknown vocabulary, private access, pause and revocation block even replay',async()=>{
   await assert.rejects(()=>a.as(users.a,'select * from ga_private.roadmap_done_requests'),e=>e.code==='42501');
   for(const actor of [null,users.fresh])await assert.rejects(()=>a.recovery(actor),e=>e.code==='42501');
   await db.exec(`reset role;update akatsuki_vocab set schema='{"values":["applied","already","unknown","stale","invented"]}' where user_id='${users.a}'`);await assert.rejects(()=>a.reply(id(1)),e=>e.code==='40001');
   await db.exec(`reset role;update akatsuki_vocab set schema='{"values":["applied","already","unknown","stale"]}' where user_id='${users.a}'`);
   for(const [stop,start] of [['update ga_private.roadmap_control set paused=true','update ga_private.roadmap_control set paused=false'],
    [`update ga_private.roadmap_completion_access set enabled=false where auth_user_id='${users.a}'`,`update ga_private.roadmap_completion_access set enabled=true where auth_user_id='${users.a}'`],
    [`update auth.users set email_confirmed_at=null where id='${users.a}'`,`update auth.users set email_confirmed_at=now() where id='${users.a}'`]]){
    await db.exec('reset role;'+stop);await assert.rejects(()=>a.reply(id(1)),e=>e.code==='42501');await db.exec('reset role;'+start);
   }
  });
 }finally{await db.close()}
});
test('completion installation refuses drift and rolls back all new objects',async()=>{
 const db=await fixture(false);try{await db.exec('alter table roadmap_tasks add column unreviewed text');await assert.rejects(()=>db.exec(candidate),/baseline/);await db.exec('rollback');
 assert.equal((await db.query("select to_regclass('ga_private.roadmap_done_requests') r")).rows[0].r,null);
 }finally{await db.close()}
});
