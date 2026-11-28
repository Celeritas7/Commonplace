import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
// Only called inside the guarded, disposable local Auth/Postgres acceptance runner.
export async function roadmapConsumerAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const seq=22000020,task=randomUUID(),sid='synthetic-consumer-'+randomUUID(),day='2026-11-28';
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'",json=x=>literal(JSON.stringify(x));
 const address={board_id:'synthetic-consumer',item_key:'study:日本語',sub_id:'one',opaque:{keep:'exact'}};
 const answerPayload={suggestion_id:sid,action:'skip',reason:'Keep 日本語',at:'2026-11-28T01:00:00Z',app:'wf'};
 const studyPayload={task_id:task,day_key:day,duration:12,mode:'srs',source:'japanese-study-app-advanced'};
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const answer=(n=seq,request=randomUUID(),date=day)=>a.client.rpc('ga_roadmap_receive_suggestion_event',{p_seq:n,p_request_id:request,p_day_key:date});
 const study=n=>a.client.rpc('ga_roadmap_receive_study_event',{p_seq:n}),ack=n=>a.client.rpc('ga_roadmap_ack_consumer_event',{p_seq:n}),status=n=>a.client.rpc('ga_roadmap_consumer_status',{p_seq:n});
 const putStudy=n=>sql(`insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values(${n},'${a.id}','jlpt','rm','session.completed',${json({task_id:task,day_key:day})},${json(studyPayload)},'jlpt:session:${randomUUID()}')`);
 let first;
 await check('Consumer gates deny by default and concurrent suggestion receives share one original receipt',async()=>{
  await sql(await readFile(new URL('../operations/general-apps/22_roadmap_consumer_acknowledgements.sql',import.meta.url),'utf8'));
  await sql(`insert into roadmap_tasks(id,user_id,title) values('${task}','${a.id}','Synthetic consumer');
   insert into roadmap_suggestions(id,user_id,rm_task_id,task,title,say,until) values('${sid}','${a.id}','${task}',${json(address)},'Synthetic','Keep',now()+interval '1 day');
   insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values(${seq},'${a.id}','wf','rm','suggestion.answered',${json({suggestion_id:sid,opaque:{keep:'日本語'}})},${json(answerPayload)},'wf:ans:${sid}');
   insert into akatsuki_vocab(user_id,ns,id,schema) values
    ('${a.id}','kind','suggestion.answered','{"required":["suggestion_id","action","at","app"],"optional":["reason"]}'),
    ('${a.id}','enum','answer_action','{"values":["start","skip","dismiss"]}') on conflict(user_id,ns,id) do update set schema=excluded.schema;`);
  let ready=false;for(let n=0;n<30;n++){const r=await answer();if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  await sql(`insert into ga_private.roadmap_consumer_access(auth_user_id,from_app,kind,enabled,review_ref) values
   ('${a.id}','wf','suggestion.answered',true,'Synthetic review'),('${a.id}','jlpt','session.completed',true,'Synthetic review')`);
  const results=await Promise.all([answer(),answer(undefined,randomUUID(),'2026-11-29')]);first=data(results[0],'First answer');const second=data(results[1],'Concurrent answer');
  assert.equal(first.receipt_id,second.receipt_id);assert.deepEqual(first.normalized,second.normalized);assert.deepEqual(first.effect,second.effect);assert.deepEqual(first.effect.src_addr,address);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_answer_receipts where auth_user_id='${a.id}' and seq=${seq}`),'1');
  denied(await client().rpc('ga_roadmap_receive_suggestion_event',{p_seq:seq,p_request_id:randomUUID(),p_day_key:day}),'Unsigned consumer');
  denied(await b.client.rpc('ga_roadmap_receive_suggestion_event',{p_seq:seq,p_request_id:randomUUID(),p_day_key:day}),'Foreign consumer');
  denied(await a.client.rpc('ga_roadmap_answer_suggestion',{p_payload:first.normalized,p_request_id:randomUUID()}),'Old answer API');
  denied(await a.client.rpc('ga_roadmap_receive_study_report',{p_seq:seq+10}),'Old study API');
 });
 await check('Suggestion acknowledgement requires the original follow-up and concurrent retries create one immutable receipt',async()=>{
  denied(await ack(seq),'Missing follow-up','40001');assert.equal(data(await status(seq),'Pending status').status,'pending');
  const e=first.effect;await sql(`insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,src_clock,payload,idempotency_key) values(${seq+1},'${a.id}',${literal(e.from_app)},${literal(e.to_app)},${literal(e.kind)},${json(e.src_addr)},null,${json(e.payload)},${literal(e.idempotency_key)})`);
  await sql(`update akatsuki_requests set src_clock='changed' where seq=${seq+1}`);denied(await ack(seq),'Changed follow-up','40001');await sql(`update akatsuki_requests set src_clock=null where seq=${seq+1}`);
  const results=await Promise.all([ack(seq),ack(seq)]);assert.deepEqual(results.map(r=>data(r,'Concurrent ack').replayed).sort(),[false,true]);
  const before=await sql(`select to_jsonb(t) from akatsuki_requests t where seq=${seq}`);assert.equal(data(await ack(seq),'Replay').replayed,true);assert.equal(await sql(`select to_jsonb(t) from akatsuki_requests t where seq=${seq}`),before);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_consumer_acknowledged where auth_user_id='${a.id}' and seq=${seq}`),'1');
  assert.equal(await sql(`select reply is null and reply_seq is null from akatsuki_requests where seq=${seq}`),'t');assert.equal(data(await status(seq),'Private status').status,'delivered');
  denied(await b.client.rpc('ga_roadmap_consumer_status',{p_seq:seq}),'Foreign status');
 });
 await check('Study receive and acknowledgement retain newer notes and never close a newer same-address request',async()=>{
  await putStudy(seq+10);const results=await Promise.all([study(seq+10),study(seq+10)]);const one=data(results[0],'First study'),two=data(results[1],'Concurrent study');assert.equal(one.session.id,two.session.id);
  await putStudy(seq+11);data(await study(seq+11),'Newer study');data(await ack(seq+11),'Newer ack');
  await sql(`update roadmap_study_sessions set feedback=feedback||'{"notes":"Keep newer notes"}' where task_id='${task}'`);
  const before=await sql(`select to_jsonb(t) from roadmap_study_sessions t where task_id='${task}'`);data(await ack(seq+10),'Late study ack');assert.equal(await sql(`select to_jsonb(t) from roadmap_study_sessions t where task_id='${task}'`),before);
  await putStudy(seq+12);assert.equal(data(await ack(seq+10),'Old replay').replayed,true);assert.equal(await sql(`select status from akatsuki_requests where seq=${seq+12}`),'pending');
  assert.equal(await sql(`select last_seq from akatsuki_cursors where user_id='${a.id}' and app='rm'`),String(seq+11));
  await sql(`update akatsuki_requests set status='delivered' where seq=${seq+12}`);denied(await status(seq+12),'Unproven mutable status','40001');await sql(`update akatsuki_requests set status='pending' where seq=${seq+12}`);
 });
 await check('Consumer receipt failure rolls acknowledgement status and cursor back in one transaction',async()=>{
  data(await study(seq+12),'Next study');const cursor=await sql(`select last_seq from akatsuki_cursors where user_id='${a.id}' and app='rm'`);
  await sql(`create function fixture_consumer_ack_fail() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_consumer_ack_fail before insert on ga_private.roadmap_consumer_acknowledged for each row execute function fixture_consumer_ack_fail()`);
  denied(await ack(seq+12),'Atomic failure','40001');assert.equal(await sql(`select status from akatsuki_requests where seq=${seq+12}`),'pending');assert.equal(await sql(`select last_seq from akatsuki_cursors where user_id='${a.id}' and app='rm'`),cursor);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_consumer_acknowledged where auth_user_id='${a.id}' and seq=${seq+12}`),'0');
  await sql('drop trigger fixture_consumer_ack_fail on ga_private.roadmap_consumer_acknowledged;drop function fixture_consumer_ack_fail()');
 });
 await check('Consumer acknowledgement rechecks committed source, identity, event and task changes after lock waits',async()=>{
  const call=`begin;${claim}select ga_roadmap_ack_consumer_event(${seq+12});commit;`;
  await withBlockedWriter(62,`update ga_private.roadmap_consumer_access set enabled=false where auth_user_id='${a.id}' and kind='session.completed'`,call,/consumer source review required/);await sql(`update ga_private.roadmap_consumer_access set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(63,`update ga_private.roadmap_study_sources set enabled=false where auth_user_id='${a.id}'`,call,/study caller review required/);await sql(`update ga_private.roadmap_study_sources set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(64,'update ga_private.roadmap_control set paused=true',call,/consumer access denied/);await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(65,`update auth.users set email_confirmed_at=null where id='${a.id}'`,call,/consumer access denied/);await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
  await withBlockedWriter(66,`update akatsuki_requests set user_id='${b.id}' where seq=${seq+12}`,call,/consumer event unavailable/);await sql(`update akatsuki_requests set user_id='${a.id}' where seq=${seq+12}`);
  await withBlockedWriter(67,`update akatsuki_requests set src_clock='changed' where seq=${seq+12}`,call,/consumer evidence changed/);await sql(`update akatsuki_requests set src_clock=null where seq=${seq+12}`);
  await withBlockedWriter(68,`update roadmap_tasks set user_id='${b.id}',parent_id=null where id='${task}'`,call,/study task unavailable/);await sql(`update roadmap_tasks set user_id='${a.id}' where id='${task}'`);
  data(await ack(seq+12),'Ack after review');
 });
}
