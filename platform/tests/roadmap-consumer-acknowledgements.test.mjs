import {test} from 'node:test';import assert from 'node:assert/strict';
import {consumerFixture,enableConsumers,putConsumer,publishEffect,consumerApi,consumerSnapshot,id,users,readCandidate,suggestionPayload,studyPayload,address} from './roadmap-consumer-support.mjs';
const read22=await readCandidate('22_roadmap_consumer_acknowledgements.sql'),read90=await readCandidate('90_containment.sql');
test('checked suggestion answers bind the original event, follow-up and terminal acknowledgement',async t=>{
 const db=await consumerFixture(),a=consumerApi(db);try{
  await putConsumer(db,100);
  await t.test('empty gates, foreign/unsigned users and fabricated old hub arguments are denied',async()=>{
   await assert.rejects(()=>a.answer(100),e=>e.code==='42501');await enableConsumers(db);
   for(const owner of [null,users.b])for(const fn of [()=>a.answer(100,id(100),'2026-11-28',owner),()=>a.ack(100,owner),()=>a.status(100,owner)])await assert.rejects(fn,e=>e.code==='42501');
   await assert.rejects(()=>a.as(users.a,'select ga_roadmap_answer_suggestion($1,$2)',[{suggestion_id:'synthetic-answer',action:'skip',reason:'Forged',from_app:'wf',seq:100,day_key:'2026-11-28',at:null},id(100)]),e=>e.code==='42501');
   for(const table of ['roadmap_consumer_access','roadmap_consumer_received','roadmap_consumer_acknowledged'])await assert.rejects(()=>a.as(users.a,'select * from ga_private.'+table),e=>e.code==='42501');
   await assert.rejects(()=>a.ack(100),e=>e.code==='40001');assert.equal((await a.status(100)).status,'pending');
  });
  let result;
  await t.test('server reads exact answer and preserves one logical day/request across devices',async()=>{
   result=await a.answer(100);assert.equal(result.normalized.reason,suggestionPayload.reason);assert.equal(result.normalized.from_app,'wf');assert.equal(result.seq,100);
   const later=await a.answer(100,id(101),'2026-11-29');assert.equal(later.receipt_id,result.receipt_id);assert.equal(later.normalized.day_key,'2026-11-28');assert.deepEqual(later.effect,result.effect);
   assert.equal((await consumerSnapshot(db)).roadmap_suggestion_answers.length,1);
  });
  await t.test('unpublished, changed or refused follow-up cannot be acknowledged by trusting the browser',async()=>{
   await assert.rejects(()=>a.ack(100),e=>e.code==='40001');await publishEffect(db,result,150);
   await db.exec("update akatsuki_requests set src_clock='changed' where seq=150");await assert.rejects(()=>a.ack(100),e=>e.code==='40001');
   await db.exec("reset role;update akatsuki_requests set src_clock=null,status='rejected' where seq=150");await assert.rejects(()=>a.ack(100),e=>e.code==='40001');
   await db.exec("reset role;update akatsuki_requests set status='delivered',reply='{\"status\":\"unknown\"}' where seq=150");await assert.rejects(()=>a.ack(100),e=>e.code==='40001');
   await db.exec("reset role;update akatsuki_requests set status='pending',reply=null where seq=150");
  });
  await t.test('ack closes only its sequence, has no address-based reply, and leaves newer same-address request untouched',async()=>{
   await putConsumer(db,200,{key:'later-original-request'});const before=await consumerSnapshot(db);const ack=await a.ack(100);assert.equal(ack.kind,'suggestion.answered');assert.equal(ack.outcome,'applied');
   const after=await consumerSnapshot(db);assert.deepEqual(after.akatsuki_requests.find(r=>r.seq===200),before.akatsuki_requests.find(r=>r.seq===200));assert.equal(after.akatsuki_requests.find(r=>r.seq===100).reply_seq,null);assert.deepEqual(after.akatsuki_links,before.akatsuki_links);
   const saved=await consumerSnapshot(db);assert.equal((await a.ack(100)).replayed,true);assert.equal((await a.status(100)).status,'delivered');assert.deepEqual(await consumerSnapshot(db),saved);
  });
  await t.test('changed evidence and legacy delivered flags cannot masquerade as checked acknowledgement',async()=>{
   await db.exec("reset role;update akatsuki_requests set payload=payload||'{\"action\":\"dismiss\"}' where seq=100");
   for(const fn of [()=>a.answer(100),()=>a.ack(100),()=>a.status(100)])await assert.rejects(fn,e=>e.code==='40001');
   await db.exec('reset role');await db.query('update akatsuki_requests set payload=$1 where seq=100',[suggestionPayload]);
   await db.exec("update akatsuki_requests set status='delivered' where seq=200");await assert.rejects(()=>a.status(200),e=>e.code==='40001');await assert.rejects(()=>a.answer(200),e=>['22023','40001'].includes(e.code));
  });
  await t.test('unknown suggestions acknowledge a durable log without adopting another owner; native answers remain separate',async()=>{
   await putConsumer(db,210,{payload:{...suggestionPayload,suggestion_id:'unknown',action:'dismiss'},addr:{suggestion_id:'unknown'}});const r=await a.answer(210);assert.equal(r.outcome,'unknown');assert.equal(r.effect,null);assert.equal((await a.ack(210)).outcome,'unknown');
   const p={suggestion_id:'native-missing',action:'start',reason:null,from_app:'rm',seq:null,day_key:'2026-11-28',at:null};
   const r2=(await a.as(users.a,'select ga_roadmap_answer_local_suggestion($1,$2) r',[p,id(211)])).rows[0].r;assert.equal(r2.outcome,'unknown');assert.equal(r2.effect,null);
  });
  await t.test('malformed source, address, key, vocabulary and payload fail before applying',async()=>{
   for(const [n,patch] of [[220,{app:'other'}],[221,{action:'invented'}],[222,{extra:'script'}],[223,{reason:'日'.repeat(1366)}],[224,{reason:' '.repeat(4097)}]]){
    const sid='invalid-'+n;await putConsumer(db,n,{payload:{...suggestionPayload,suggestion_id:sid,...patch},addr:{suggestion_id:sid}});await assert.rejects(()=>a.answer(n),e=>e.code==='22023');
   }
   await putConsumer(db,225,{payload:{...suggestionPayload,suggestion_id:'bad-address'},addr:{suggestion_id:'other'}});await assert.rejects(()=>a.answer(225),e=>e.code==='22023');
   await putConsumer(db,226,{key:'bad-key'});await assert.rejects(()=>a.answer(226),e=>e.code==='22023');
   const whitespace='\u00a0Keep 日本語\u3000';await putConsumer(db,227,{payload:{...suggestionPayload,suggestion_id:'unicode-trim',reason:whitespace},addr:{suggestion_id:'unicode-trim'}});assert.equal((await a.answer(227)).normalized.reason,'Keep 日本語');
   await db.exec("reset role;update akatsuki_vocab set schema='{\"values\":[\"invented\"]}' where id='answer_action'");await assert.rejects(()=>a.answer(100),e=>e.code==='40001');await db.exec("reset role;update akatsuki_vocab set schema='{\"values\":[\"start\",\"skip\",\"dismiss\"]}' where id='answer_action'");
  });
 }finally{await db.close()}
});
test('checked study delivery and caller status retain original evidence through replay, failures and revocation',async t=>{
 const db=await consumerFixture(),a=consumerApi(db);try{await enableConsumers(db);await putConsumer(db,300,{kind:'session.completed'});
  await t.test('study requires receipt before ack; old receiver is private and repeated receives preserve completion',async()=>{
   await assert.rejects(()=>a.ack(300),e=>e.code==='40001');await assert.rejects(()=>a.as(users.a,'select ga_roadmap_receive_study_report(300)'),e=>e.code==='42501');
   const r=await a.study(300),r2=await a.study(300);assert.deepEqual(r.session,r2.session);assert.equal(r2.replayed,true);assert.equal((await a.status(300)).status,'pending');
  });
  await t.test('receipt, cursor and event failures rollback every ack write; receive receipt failure rolls domain writes back',async()=>{
   for(const [table,op] of [['ga_private.roadmap_consumer_acknowledged','insert'],['akatsuki_requests','update'],['akatsuki_cursors','insert']]){
    await db.exec(`reset role;create function fixture_consumer_fail() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_consumer_fail before ${op} on ${table} for each row execute function fixture_consumer_fail()`);const before=await consumerSnapshot(db);
    await assert.rejects(()=>a.ack(300),e=>e.code==='40001');assert.deepEqual(await consumerSnapshot(db),before);await db.exec(`drop trigger fixture_consumer_fail on ${table};drop function fixture_consumer_fail()`);
   }
   await putConsumer(db,310,{kind:'session.completed',payload:{...studyPayload,day_key:'2026-11-29'}});
   await db.exec('create function fixture_consumer_fail() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_consumer_fail before insert on ga_private.roadmap_consumer_received for each row execute function fixture_consumer_fail()');const before=await consumerSnapshot(db);
   await assert.rejects(()=>a.study(310),e=>e.code==='40001');assert.deepEqual(await consumerSnapshot(db),before);await db.exec('drop trigger fixture_consumer_fail on ga_private.roadmap_consumer_received;drop function fixture_consumer_fail()');
  });
  await t.test('later local notes and new same-address request survive a late ack; cursor never decreases',async()=>{
   await putConsumer(db,320,{kind:'session.completed',payload:{...studyPayload,duration:18}});await a.study(320);await a.ack(320);
   await db.exec("reset role;update roadmap_study_sessions set feedback=feedback||'{\"notes\":\"Keep later edit\"}'");const before=await consumerSnapshot(db);await a.ack(300);const after=await consumerSnapshot(db);
   assert.deepEqual(after.roadmap_study_sessions,before.roadmap_study_sessions);assert.equal(after.akatsuki_cursors[0].last_seq,320);assert.equal((await a.status(300)).status,'delivered');
   assert.equal((await a.ack(300)).replayed,true);
  });
  await t.test('revocation, pause, changed evidence and foreign ownership deny status as well as writes',async()=>{
   for(const [off,on] of [["update ga_private.roadmap_consumer_access set enabled=false","update ga_private.roadmap_consumer_access set enabled=true"],["update ga_private.roadmap_study_sources set enabled=false","update ga_private.roadmap_study_sources set enabled=true"],["update ga_private.roadmap_control set paused=true","update ga_private.roadmap_control set paused=false"],[`update auth.users set email_confirmed_at=null where id='${users.a}'`,`update auth.users set email_confirmed_at=now() where id='${users.a}'`]]){
    await db.exec('reset role;'+off);for(const fn of [()=>a.study(300),()=>a.ack(300),()=>a.status(300)])await assert.rejects(fn,e=>e.code==='42501');await db.exec('reset role;'+on);
   }
   await db.exec("update akatsuki_requests set src_clock='changed' where seq=300");await assert.rejects(()=>a.status(300),e=>e.code==='40001');await assert.rejects(()=>a.ack(300),e=>e.code==='40001');
   await assert.rejects(()=>a.status(300,users.b),e=>e.code==='42501');await assert.rejects(()=>a.study(300,null),e=>e.code==='42501');
  });
 }finally{await db.close()}
});
test('candidate refuses implementation drift atomically and does not adopt older unchecked receipts',async()=>{
 const db=await consumerFixture(false),a=consumerApi(db);try{
  await putConsumer(db,400,{kind:'session.completed'});await a.as(users.a,'select ga_roadmap_receive_study_report(400)');
  await db.exec("reset role;alter function ga_roadmap_answer_suggestion(jsonb,uuid) set timezone='Asia/Tokyo'");await assert.rejects(()=>db.exec(read22),/review consumer dependency/);await db.exec('rollback');
  assert.equal((await db.query("select to_regclass('ga_private.roadmap_consumer_access')::text t")).rows[0].t,null);await db.exec("alter function ga_roadmap_answer_suggestion(jsonb,uuid) set timezone='UTC'");await db.exec(read22);await enableConsumers(db);
  await assert.rejects(()=>a.study(400),e=>e.code==='40001');
  await db.exec('reset role');await assert.rejects(()=>db.exec(read90),/Containment incomplete: signup/);
  for(const name of ['ga_roadmap_answer_local_suggestion(jsonb,uuid)','ga_roadmap_receive_suggestion_event(bigint,uuid,text)','ga_roadmap_receive_study_event(bigint)','ga_roadmap_ack_consumer_event(bigint)','ga_roadmap_consumer_status(bigint)'])assert.equal((await db.query("select has_function_privilege('authenticated',$1,'execute') yes",['public.'+name])).rows[0].yes,false);
 }finally{await db.close()}
});
