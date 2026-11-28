import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
// Only called by the guarded disposable local Auth/Postgres acceptance runner.
export async function roadmapConsumersAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const task=randomUUID(),request=randomUUID(),seq=22000010,day='2026-11-28',sid='synthetic-consumer-answer';
 const lit=x=>"'"+String(x).replaceAll("'","''")+"'";
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const answer=()=>a.client.rpc('ga_roadmap_receive_suggestion_event',{p_seq:seq,p_request_id:request,p_day_key:day});
 const receive=n=>a.client.rpc('ga_roadmap_receive_study_event',{p_seq:n}),ack=n=>a.client.rpc('ga_roadmap_ack_consumer_event',{p_seq:n});
 const putStudy=(n,duration=15)=>sql(`insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key)
  values(${n},'${a.id}','jlpt','rm','session.completed',${lit(JSON.stringify({task_id:task,day_key:day}))},${lit(JSON.stringify({task_id:task,day_key:day,duration,mode:'goi'}))},'jlpt:session:${randomUUID()}')`);
 await check('Consumer source gates deny by default; concurrent original answers apply one session and receipt',async()=>{
  await sql(await readFile(new URL('../operations/general-apps/22_roadmap_consumer_acknowledgements.sql',import.meta.url),'utf8'));
  await sql(`insert into roadmap_tasks(id,user_id,title) values('${task}','${a.id}','Synthetic consumer study');
   insert into roadmap_suggestions(id,user_id,rm_task_id,task,title,say,until) values('${sid}','${a.id}','${task}','{"board_id":"rm"}','Synthetic','Study',now()+interval '1 day');
   insert into akatsuki_vocab(user_id,ns,id,schema) values
    ('${a.id}','kind','suggestion.answered','{"required":["suggestion_id","action","at","app"],"optional":["reason"]}'),
    ('${a.id}','enum','answer_action','{"values":["start","skip","dismiss"]}') on conflict(user_id,ns,id) do update set schema=excluded.schema;
   insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key)
    values(${seq},'${a.id}','wf','rm','suggestion.answered','{"suggestion_id":"${sid}"}','{"suggestion_id":"${sid}","action":"start","app":"wf","at":"2026-11-28T01:00:00Z"}','wf:ans:${sid}')`);
  let ready=false;for(let n=0;n<30;n++){if((await answer()).error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  await sql(`insert into ga_private.roadmap_consumer_access(auth_user_id,from_app,kind,enabled,review_ref) values
   ('${a.id}','wf','suggestion.answered',true,'Synthetic review'),('${a.id}','jlpt','session.completed',true,'Synthetic review')`);
  const results=await Promise.all([answer(),answer()]);assert.deepEqual(results.map(r=>data(r,'Concurrent answer').replayed).sort(),[false,true]);
  assert.equal(await sql(`select count(*) from roadmap_study_sessions where task_id='${task}'`),'1');
  denied(await b.client.rpc('ga_roadmap_receive_suggestion_event',{p_seq:seq,p_request_id:request,p_day_key:day}),'Foreign answer');
  denied(await client().rpc('ga_roadmap_ack_consumer_event',{p_seq:seq}),'Unsigned ack');
  denied(await a.client.rpc('ga_roadmap_answer_suggestion',{p_payload:{},p_request_id:request}),'Old caller-supplied answer');
 });
 await check('Concurrent exact consumer acknowledgements produce one immutable reply and checked sender status',async()=>{
  const results=await Promise.all([ack(seq),ack(seq)]);assert.deepEqual(results.map(r=>data(r,'Concurrent consumer ack').replayed).sort(),[false,true]);
  const before=await sql(`select to_jsonb(r) from akatsuki_requests r where seq=${seq}`);
  assert.equal(data(await ack(seq),'Consumer replay').replayed,true);assert.equal(await sql(`select to_jsonb(r) from akatsuki_requests r where seq=${seq}`),before);
  assert.equal(data(await a.client.rpc('ga_roadmap_consumer_status',{p_seq:seq}),'Checked status').reply.request_seq,seq);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_consumer_acknowledged where auth_user_id='${a.id}'`),'1');
 });
 await check('Older study reply closes its own sequence while preserving newer same-address completion and cursor',async()=>{
  await putStudy(seq+1,5);await putStudy(seq+2,25);data(await receive(seq+2),'New study');data(await ack(seq+2),'New study ack');
  assert.equal(data(await receive(seq+1),'Old study').outcome,'superseded');assert.equal(data(await ack(seq+1),'Old study ack').reply.request_seq,seq+1);
  assert.equal(await sql(`select duration_min from roadmap_study_sessions where task_id='${task}'`),'25');
  assert.equal(await sql(`select last_seq from akatsuki_cursors where user_id='${a.id}' and app='rm'`),String(seq+2));
 });
 await check('Consumer receipt failure rolls back event reply and cursor; legacy delivered flags cannot confirm a sender',async()=>{
  await putStudy(seq+3,30);data(await receive(seq+3),'Study before failed ack');
  await sql('create function fixture_consumer_ack_fail() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_consumer_ack_fail before insert on ga_private.roadmap_consumer_acknowledged for each row execute function fixture_consumer_ack_fail()');
  denied(await ack(seq+3),'Consumer ack rollback','40001');assert.equal(await sql(`select status from akatsuki_requests where seq=${seq+3}`),'pending');
  assert.equal(await sql(`select reply_seq is null from akatsuki_requests where seq=${seq+3}`),'t');
  assert.equal(await sql(`select last_seq from akatsuki_cursors where user_id='${a.id}' and app='rm'`),String(seq+2));
  await sql('drop trigger fixture_consumer_ack_fail on ga_private.roadmap_consumer_acknowledged;drop function fixture_consumer_ack_fail()');
  await sql(`update akatsuki_requests set status='delivered' where seq=${seq+3}`);denied(await a.client.rpc('ga_roadmap_consumer_status',{p_seq:seq+3}),'Unchecked delivered row','40001');
  await sql(`update akatsuki_requests set status='pending' where seq=${seq+3}`);
 });
 await check('Consumer acknowledgement rechecks committed revocation, ownership, verification and pause after lock waits',async()=>{
  const call=`begin;${claim}select ga_roadmap_ack_consumer_event(${seq+3});commit;`;
  await withBlockedWriter(62,`update ga_private.roadmap_consumer_access set enabled=false where auth_user_id='${a.id}'`,call,/consumer source review required/);
  await sql(`update ga_private.roadmap_consumer_access set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(63,`update akatsuki_requests set user_id='${b.id}' where seq=${seq+3}`,call,/consumer event unavailable/);
  await sql(`update akatsuki_requests set user_id='${a.id}' where seq=${seq+3}`);
  await withBlockedWriter(64,`update auth.users set email_confirmed_at=null where id='${a.id}'`,call,/consumer access denied/);
  await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
  await withBlockedWriter(65,'update ga_private.roadmap_control set paused=true',call,/consumer access denied/);await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(66,`update ga_private.roadmap_study_sources set enabled=false where auth_user_id='${a.id}'`,call,/study caller review required/);
  await sql(`update ga_private.roadmap_study_sources set enabled=true where auth_user_id='${a.id}'`);
  data(await ack(seq+3),'Consumer ack after review');
 });
}
