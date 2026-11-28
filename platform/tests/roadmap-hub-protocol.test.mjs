import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {protocolFixture,readCandidate,putEvent,address,access,users} from './roadmap-hub-protocol-support.mjs';
const candidate=await readCandidate('21_roadmap_hub_acknowledgements.sql'),readContainment=await readCandidate('90_containment.sql');
const api=db=>{const {as}=access(db);return{as,receive:(seq,owner=users.a)=>as(owner,'select ga_roadmap_receive_task_event($1) r',[seq]).then(r=>r.rows[0].r),ack:(seq,owner=users.a)=>as(owner,'select ga_roadmap_ack_task_event($1) r',[seq]).then(r=>r.rows[0].r)}};
async function enable(db){await db.exec(`reset role;insert into ga_private.roadmap_mirror_access values('${users.a}',true,'Synthetic review'),('${users.b}',true,'Synthetic review');insert into ga_private.roadmap_hub_access values('${users.a}',true,'Synthetic protocol review'),('${users.b}',true,'Synthetic protocol review')`)}
async function snapshot(db){await db.exec('reset role');const out={};for(const table of ['akatsuki_requests','akatsuki_links','akatsuki_cursors','ga_private.roadmap_hub_acknowledged','roadmap_tasks'])out[table]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') r from ${table} t`)).rows[0].r;return out}
test('pinned legacy protocol reproduces remaining source limitations with synthetic identities only',async t=>{
 const db=await protocolFixture(),{as}=access(db);try{
  const manifest=JSON.parse(await readFile(new URL('./roadmap-hub-protocol-source.json',import.meta.url),'utf8'));
  const fixture=await readFile(new URL('./roadmap-hub-protocol-fixture.sql',import.meta.url));assert.ok(JSON.stringify(manifest).includes(createHash('sha256').update(fixture).digest('hex')));
  await putEvent(db,10);await putEvent(db,20);
  await t.test('late legacy ack rewinds pair sequence and replaces its target',async()=>{
   await as(users.a,"select akatsuki_ack('rm',20,'{\"id\":\"new\"}')");await as(users.a,"select akatsuki_ack('rm',10,'{\"id\":\"old\"}')");
   const r=(await as(users.a,'select seq,b_addr from akatsuki_links')).rows[0];assert.equal(Number(r.seq),10);assert.deepEqual(r.b_addr,{id:'old'});
  });
  await t.test('legacy terminal ack can change status and reply repeatedly',async()=>{
   await as(users.a,"select akatsuki_ack('rm',10,null,'{\"answer\":1}','rejected')");const before=(await as(users.a,'select reply_seq from akatsuki_requests where seq=10')).rows[0].reply_seq;
   await as(users.a,"select akatsuki_ack('rm',10,null,'{\"answer\":2}','delivered')");const r=(await as(users.a,'select status,reply,reply_seq from akatsuki_requests where seq=10')).rows[0];assert.equal(r.status,'delivered');assert.deepEqual(r.reply,{answer:2});assert.ok(Number(r.reply_seq)>Number(before));
  });
  await t.test('canonical del does not orphan; rm source misses links; wf orphan affects other targets too',async()=>{
   await putEvent(db,30,{del:true});await as(users.a,"select akatsuki_ack('rm',30,'{\"id\":\"old\"}')");assert.equal((await as(users.a,'select orphaned_at from akatsuki_links')).rows[0].orphaned_at,null);
   assert.equal((await as(users.a,"select akatsuki_orphan('rm',$1) n",[address])).rows[0].n,0);
   await as(users.a,"insert into akatsuki_links(a_app,a_addr,b_app,b_addr,kind) values('wf',$1,'other','{}','task.upsert')",[address]);
   assert.equal((await as(users.a,"select akatsuki_orphan('wf',$1) n",[address])).rows[0].n,2);
  });
  await t.test('address-based late reply targets the newest request, not the original',async()=>{
   const r=await as(users.a,"select akatsuki_reply('rm','wf','task.upsert',$1,'{\"oldCallback\":true}') seq",[address]);assert.equal(Number(r.rows[0].seq),30);
  });
  await t.test('owner RLS isolates accounts but app strings are claims and stale documents overwrite newer state',async()=>{
   await as(users.a,"insert into akatsuki_requests(from_app,to_app,kind,src_addr,payload,idempotency_key) values('another-app','rm','task.upsert','{}','{}','claimed-sender')");
   assert.equal((await as(users.b,"select count(*)::int n from akatsuki_requests where idempotency_key='claimed-sender'")).rows[0].n,0);
   await as(users.a,"insert into akatsuki_state(doc,path,owner_app,updated_by,value) values('synthetic','path','other-app','other-app','{\"new\":true}')");
   const before=(await as(users.a,'select seq from akatsuki_state')).rows[0].seq;
   await as(users.a,"update akatsuki_state set value='{\"old\":true}',updated_by='other-app'");const r=(await as(users.a,'select seq,value from akatsuki_state')).rows[0];assert.ok(Number(r.seq)>Number(before));assert.deepEqual(r.value,{old:true});
  });
 }finally{await db.close()}
});
test('checked mirror protocol uses original owned evidence, atomic acknowledgements and monotonic links',async t=>{
 const db=await protocolFixture(),a=api(db);try{
  await db.exec(candidate);await putEvent(db,100);
  await t.test('default-deny gate, unsigned and foreign owner calls cannot receive or ack',async()=>{
   await assert.rejects(()=>a.receive(100),e=>e.code==='42501');await enable(db);
   for(const owner of [null,users.b]){await assert.rejects(()=>a.receive(100,owner),e=>e.code==='42501');await assert.rejects(()=>a.ack(100,owner),e=>e.code==='42501')}
   await assert.rejects(()=>a.ack(100),e=>e.code==='40001');
   await assert.rejects(()=>a.as(users.a,'select ga_roadmap_receive_task($1,$2,100)',[address,{title:'Browser spoof'}]),e=>e.code==='42501');
   for(const table of ['roadmap_hub_access','roadmap_hub_received','roadmap_hub_acknowledged'])await assert.rejects(()=>a.as(users.a,'select * from ga_private.'+table),e=>e.code==='42501');
  });
  let first;
  await t.test('server derives payload/target and preserves opaque address; acknowledgement is separate from receive',async()=>{
   first=await a.receive(100);assert.equal(first.payload.title,'Keep 日本語');assert.deepEqual(first.address,address);assert.equal(first.from_app,'wf');assert.equal(first.kind,'task.upsert');
   assert.equal((await a.as(users.a,'select status from akatsuki_requests where seq=100')).rows[0].status,'pending');
   const r=await a.ack(100);assert.equal(r.outcome,'paired');assert.deepEqual(r.address,address);
   const link=(await a.as(users.a,'select * from akatsuki_links')).rows[0];assert.deepEqual(link.b_addr,{id:first.task_id});assert.equal(Number(link.seq),100);
  });
  await t.test('lost acknowledgement retry is immutable and leaves link, event, cursor timestamps unchanged',async()=>{
   const before=await snapshot(db);assert.equal((await a.ack(100)).replayed,true);assert.deepEqual(await snapshot(db),before);
   assert.equal((await a.receive(100)).task_id,first.task_id);assert.equal((await a.ack(100)).replayed,true);assert.deepEqual(await snapshot(db),before);
  });
  await t.test('out-of-order acknowledgements cannot rewind a newer link or replace current task values',async()=>{
   await putEvent(db,110,{title:'Earlier'});await putEvent(db,120,{title:'Newer'});await a.receive(110);await a.receive(120);await a.ack(120);
   const before=await snapshot(db);assert.equal((await a.ack(110)).outcome,'superseded');const after=await snapshot(db);assert.deepEqual(after.akatsuki_links,before.akatsuki_links);assert.deepEqual(after.roadmap_tasks,before.roadmap_tasks);assert.equal(Number(after.akatsuki_cursors[0].last_seq),120);
  });
  await t.test('del marks only exact wf→rm link orphaned and preserves the task and unrelated target',async()=>{
   await a.as(users.a,"insert into akatsuki_links(a_app,a_addr,b_app,b_addr,kind) values('wf',$1,'other','{}','task.upsert')",[address]);
   await putEvent(db,130,{del:true});const r=await a.receive(130);assert.equal(r.task_id,first.task_id);assert.equal(r.source_deleted,true);assert.equal((await a.ack(130)).outcome,'orphaned');
   const links=(await a.as(users.a,'select b_app,orphaned_at from akatsuki_links order by b_app')).rows;assert.equal(links[0].orphaned_at,null);assert.ok(links[1].orphaned_at);
  });
  await t.test('deleted-first source has no invented target, and suppression never recreates local deletions',async()=>{
   await putEvent(db,140,{del:true},{...address,sub_id:'gone'});assert.equal((await a.receive(140)).task_id,null);assert.equal((await a.ack(140)).outcome,'unpaired');
   await putEvent(db,150,{title:'Before local delete'},{...address,sub_id:'local'});const r=await a.receive(150);await db.exec(`reset role;delete from roadmap_tasks where id='${r.task_id}'`);
   await assert.rejects(()=>a.ack(150),e=>e.code==='40001');assert.equal((await a.receive(150)).suppressed,true);assert.equal((await a.ack(150)).outcome,'unpaired');
   assert.equal((await a.as(users.a,'select count(*)::int n from roadmap_tasks where id=$1',[r.task_id])).rows[0].n,0);
  });
  await t.test('changed event evidence and status refuse rather than accepting a different request',async()=>{
   await putEvent(db,160);await a.receive(160);await db.exec("reset role;update akatsuki_requests set src_clock='changed' where seq=160");
   await assert.rejects(()=>a.receive(160),e=>e.code==='40001');await assert.rejects(()=>a.ack(160),e=>e.code==='40001');
   await db.exec("reset role;update akatsuki_requests set src_clock=null,status='skipped' where seq=160");await assert.rejects(()=>a.ack(160),e=>e.code==='40001');
   await db.exec("reset role;update akatsuki_requests set status='pending' where seq=160");await a.ack(160);
  });
  await t.test('wrong direction, ambiguous deletion, malformed payload and unsafe sequences have no receipt',async()=>{
   await putEvent(db,170,{deleted:true});await assert.rejects(()=>a.receive(170),e=>e.code==='22023');
   await db.exec("reset role;update akatsuki_requests set payload='{\"title\":\"Ok\"}',from_app='other' where seq=170");await assert.rejects(()=>a.receive(170),e=>e.code==='22023');
   await db.exec("reset role;update akatsuki_requests set from_app='wf',payload='{\"done\":\"yes\"}' where seq=170");await assert.rejects(()=>a.receive(170),e=>e.code==='22023');
   for(const seq of [null,0,9007199254740992])await assert.rejects(()=>a.receive(seq),e=>e.code==='22023');
   await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from ga_private.roadmap_hub_received where seq=170')).rows[0].n,0);
  });
  await t.test('legacy delivered requests and conflicting target links need reconciliation',async()=>{
   await putEvent(db,180);await db.exec("update akatsuki_requests set status='delivered' where seq=180");await assert.rejects(()=>a.receive(180),e=>e.code==='40001');
   await putEvent(db,190);await a.receive(190);await a.as(users.a,"update akatsuki_links set b_addr='{\"id\":\"wrong\"}' where b_app='rm'");await assert.rejects(()=>a.ack(190),e=>e.code==='40001');
   await a.as(users.a,"update akatsuki_links set b_addr=$1 where b_app='rm'",[{id:first.task_id}]);await a.ack(190);
  });
  await t.test('receipt/event/link/cursor failures roll the entire acknowledgement back',async()=>{
   await putEvent(db,200);await a.receive(200);
   for(const [table,operation] of [['ga_private.roadmap_hub_acknowledged','insert'],['akatsuki_requests','update'],['akatsuki_links','update'],['akatsuki_cursors','insert']]){
    await db.exec(`reset role;create function fixture_stop_ack() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_stop_ack before ${operation} on ${table} for each row execute function fixture_stop_ack()`);
    const before=await snapshot(db);await assert.rejects(()=>a.ack(200),e=>e.code==='40001');assert.deepEqual(await snapshot(db),before);
    await db.exec(`drop trigger fixture_stop_ack on ${table};drop function fixture_stop_ack()`);
   }await a.ack(200);
  });
  await t.test('pause, gate revocation, unverified accounts and target owner changes deny pending acknowledgements',async()=>{
   await putEvent(db,210);const r=await a.receive(210);
   for(const [off,on] of [["update ga_private.roadmap_control set paused=true","update ga_private.roadmap_control set paused=false"],["update ga_private.roadmap_hub_access set enabled=false","update ga_private.roadmap_hub_access set enabled=true"],[`update auth.users set email_confirmed_at=null where id='${users.a}'`,`update auth.users set email_confirmed_at=now() where id='${users.a}'`]]){
    await db.exec('reset role;'+off);await assert.rejects(()=>a.ack(210),e=>e.code==='42501');await db.exec('reset role;'+on);
   }
   await db.exec(`reset role;update roadmap_tasks set user_id='${users.b}',parent_id=null where id='${r.task_id}'`);await assert.rejects(()=>a.ack(210),e=>e.code==='42501');
   await db.exec(`reset role;update roadmap_tasks set user_id='${users.a}' where id='${r.task_id}'`);await a.ack(210);
  });
 }finally{await db.close()}
});
test('installation rejects catalog drift atomically and containment closes the new routes',async()=>{
 const db=await protocolFixture();try{
  await db.exec('alter table akatsuki_links add column unexpected text');await assert.rejects(()=>db.exec(candidate),/review hub protocol baseline/);await db.exec('rollback');
  assert.equal((await db.query("select to_regclass('ga_private.roadmap_hub_access')::text t")).rows[0].t,null);
  await db.exec('alter table akatsuki_links drop column unexpected');await db.exec(candidate);
  await assert.rejects(()=>db.exec(readContainment),/Containment incomplete: signup/);
  for(const fn of ['ga_roadmap_receive_task_event(bigint)','ga_roadmap_ack_task_event(bigint)'])assert.equal((await db.query("select has_function_privilege('authenticated',$1,'execute') yes",['public.'+fn])).rows[0].yes,false);
 }finally{await db.close()}
});
