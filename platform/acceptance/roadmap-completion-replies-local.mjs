import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapCompletionAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const address={board_id:'synthetic-done',item_key:'study:日本語',sub_id:'task',extra:{keep:'exact'}};let task,prepared,params;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const call=id=>`select ga_roadmap_reconcile_done('${id}')`;
 const publish=async(p,seq)=>{const e=p.effect;await sql(`insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values(${seq},'${a.id}','rm','wf','task.done',${literal(JSON.stringify(e.src_addr))},${literal(JSON.stringify(e.payload))},${literal(e.idempotency_key)})`)};
 await check('Roadmap completion prepares one durable request before publish under concurrent real JWTs',async()=>{
  await sql(await readFile(new URL('../tests/roadmap-hub-fixture.sql',import.meta.url),'utf8'));
  const m=data(await a.client.rpc('ga_roadmap_receive_task',{p_address:address,p_payload:{title:'Synthetic completion',done:false},p_seq:19000010}),'Completion mirror');task=m.task_id;
  const before=await sql(`select to_jsonb(t) from roadmap_tasks t where id='${task}'`);
  await sql(await readFile(new URL('../operations/general-apps/19_roadmap_completion_replies.sql',import.meta.url),'utf8'));
  assert.equal(await sql(`select to_jsonb(t) from roadmap_tasks t where id='${task}'`),before);
  params={p_task_id:task,p_request_id:randomUUID(),p_suggestion_id:null};let ready=false;
  for(let n=0;n<30;n++){const r=await a.client.rpc('ga_roadmap_prepare_done',params);if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  await sql(`insert into ga_private.roadmap_completion_access values('${a.id}',true,'Synthetic protocol review');
   insert into akatsuki_vocab(user_id,ns,id,schema) values('${a.id}','enum','wf_apply_status','{"values":["applied","already","unknown","stale"]}')`);
  const results=await Promise.all([a.client.rpc('ga_roadmap_prepare_done',params),a.client.rpc('ga_roadmap_prepare_done',{...params,p_request_id:randomUUID()})]);
  prepared=data(results[0],'Prepared request');const other=data(results[1],'Concurrent request');assert.equal(prepared.request_id,other.request_id);assert.deepEqual(prepared.effect,other.effect);assert.deepEqual(prepared.effect.src_addr,address);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_done_requests where auth_user_id='${a.id}'`),'1');assert.equal(await sql('select count(*) from akatsuki_requests'),'0');
  denied(await client().rpc('ga_roadmap_prepare_done',params),'Unsigned completion');denied(await b.client.rpc('ga_roadmap_reconcile_done',{p_request_id:prepared.request_id}),'Foreign completion');
 });
 await check('Roadmap completion receipts survive lost responses and order correctly against task.upsert',async()=>{
  await publish(prepared,19000020);await sql(`update akatsuki_requests set reply='{"status":"applied"}',reply_seq=19000030 where seq=19000020`);
  await sql(`create function fixture_completion_receipt_fail() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_completion_receipt_fail before insert on ga_private.roadmap_done_receipts for each row execute function fixture_completion_receipt_fail()`);
  denied(await a.client.rpc('ga_roadmap_reconcile_done',{p_request_id:prepared.request_id}),'Lost completion receipt','40001');
  assert.equal(await sql(`select done from roadmap_tasks where id='${task}'`),'f');
  await sql('drop trigger fixture_completion_receipt_fail on ga_private.roadmap_done_receipts;drop function fixture_completion_receipt_fail()');
  const result=data(await a.client.rpc('ga_roadmap_reconcile_done',{p_request_id:prepared.request_id}),'Confirmed completion');assert.equal(result.state,'applied');assert.equal(result.tasks[0].done,true);
  const old=data(await a.client.rpc('ga_roadmap_receive_task',{p_address:address,p_payload:{title:'Older',done:false},p_seq:19000025}),'Late source');assert.equal(old.tasks.at(-1).done,true);assert.equal(old.last_seq,19000030);
  await a.client.rpc('ga_roadmap_receive_task',{p_address:address,p_payload:{title:'Latest',done:false},p_seq:19000040});
  const replay=data(await a.client.rpc('ga_roadmap_reconcile_done',{p_request_id:prepared.request_id}),'Completion replay');assert.equal(replay.tasks[0].done,false);assert.equal(replay.tasks[0].title,'Latest');
  const alias=data(await a.client.rpc('ga_roadmap_prepare_done',params),'Original preparation replay');assert.equal(alias.request_id,prepared.request_id);assert.equal(alias.closed,true);
  assert.deepEqual(data(await a.client.rpc('ga_roadmap_done_recovery',{}),'Closed recovery'),[]);
 });
 await check('Roadmap completion rechecks hub ownership, task ownership and account revocation after lock waits',async()=>{
  const next=data(await a.client.rpc('ga_roadmap_prepare_done',{...params,p_request_id:randomUUID()}),'New completion');assert.notEqual(next.request_id,prepared.request_id);await publish(next,19000050);
  await sql(`update akatsuki_requests set reply='{"status":"already"}',reply_seq=19000060 where seq=19000050`);
  await withBlockedWriter(47,`update akatsuki_requests set user_id='${b.id}' where seq=19000050`,
   `begin;${claim}do $$declare r jsonb;begin r:=ga_roadmap_reconcile_done('${next.request_id}');if r->>'state'<>'unpublished' then raise exception 'foreign hub reply exposed';end if;raise exception 'foreign hub reply safely hidden';end$$;commit;`,/foreign hub reply safely hidden/);
  assert.equal(await sql(`select done from roadmap_tasks where id='${task}'`),'f');await sql(`update akatsuki_requests set user_id='${a.id}' where seq=19000050`);
  await withBlockedWriter(48,`update roadmap_tasks set parent_id=null,user_id='${b.id}' where id='${task}'`,`begin;${claim}${call(next.request_id)};commit;`,/completion task unavailable/);
  await withBlockedWriter(49,`update ga_private.roadmap_completion_access set enabled=false where auth_user_id='${a.id}'`,`begin;${claim}${call(prepared.request_id)};commit;`,/completion reconciliation required/);
  await sql(`update ga_private.roadmap_completion_access set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(50,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(prepared.request_id)};commit;`,/completion access denied/);await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(51,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(prepared.request_id)};commit;`,/completion access denied/);await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
