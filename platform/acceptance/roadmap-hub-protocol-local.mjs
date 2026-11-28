import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
// Only invoked by the guarded disposable full-stack acceptance runner.
export async function roadmapHubProtocolAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const address={board_id:'synthetic-protocol',item_key:'study:日本語',sub_id:'one',opaque:{keep:'exact'}},seq=21000010;let task;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const put=(n,p={title:'Synthetic protocol',done:false})=>sql(`insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values(${n},'${a.id}','wf','rm','task.upsert',${literal(JSON.stringify(address))},${literal(JSON.stringify(p))},'synthetic-protocol:${n}')`);
 const receive=n=>a.client.rpc('ga_roadmap_receive_task_event',{p_seq:n}),ack=n=>a.client.rpc('ga_roadmap_ack_task_event',{p_seq:n});
 await check('Hub protocol gate denies by default; concurrent owned receives create one mirror from stored evidence',async()=>{
  await sql(await readFile(new URL('../tests/roadmap-hub-protocol-fixture.sql',import.meta.url),'utf8'));
  await sql(await readFile(new URL('../operations/general-apps/21_roadmap_hub_acknowledgements.sql',import.meta.url),'utf8'));await put(seq);
  let ready=false;for(let n=0;n<30;n++){const r=await receive(seq);if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  await sql(`insert into ga_private.roadmap_hub_access values('${a.id}',true,'Synthetic review'),('${b.id}',true,'Synthetic review')`);
  const [one,two]=await Promise.all([receive(seq),receive(seq)]);const first=data(one,'First mirror'),second=data(two,'Concurrent mirror');task=first.task_id;assert.equal(task,second.task_id);assert.deepEqual(first.address,address);assert.equal(first.payload.title,'Synthetic protocol');
  assert.equal(await sql(`select count(*) from ga_private.roadmap_hub_received where auth_user_id='${a.id}'`),'1');
  denied(await client().rpc('ga_roadmap_receive_task_event',{p_seq:seq}),'Unsigned mirror');denied(await b.client.rpc('ga_roadmap_receive_task_event',{p_seq:seq}),'Foreign mirror');
  denied(await a.client.rpc('ga_roadmap_receive_task',{p_address:address,p_payload:{title:'Forged'},p_seq:seq+1}),'Old browser receive');
 });
 await check('Concurrent acknowledgements are atomic and replay without timestamp or link churn',async()=>{
  const results=await Promise.all([ack(seq),ack(seq)]);assert.deepEqual(results.map(r=>data(r,'Concurrent ack').replayed).sort(),[false,true]);
  const before=await sql(`select to_jsonb(t) from akatsuki_links t where user_id='${a.id}' and a_addr=${literal(JSON.stringify(address))}`);
  assert.equal(data(await ack(seq),'Replay ack').replayed,true);assert.equal(await sql(`select to_jsonb(t) from akatsuki_links t where user_id='${a.id}' and a_addr=${literal(JSON.stringify(address))}`),before);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_hub_acknowledged where auth_user_id='${a.id}'`),'1');
 });
 await check('Older acknowledgement preserves newest link; canonical del retains the mirrored task',async()=>{
  await put(seq+1,{title:'Older'});await put(seq+2,{title:'Newer'});data(await receive(seq+1),'Older receive');data(await receive(seq+2),'Newer receive');data(await ack(seq+2),'Newer ack');
  assert.equal(data(await ack(seq+1),'Late ack').outcome,'superseded');assert.equal(await sql(`select seq from akatsuki_links where user_id='${a.id}' and a_addr=${literal(JSON.stringify(address))}`),String(seq+2));
  await put(seq+3,{del:true});data(await receive(seq+3),'Delete receive');assert.equal(data(await ack(seq+3),'Delete ack').outcome,'orphaned');assert.equal(await sql(`select count(*) from roadmap_tasks where id='${task}'`),'1');
 });
 await check('Protocol receipt failure rolls event, link and cursor back together',async()=>{
  await put(seq+4,{title:'After orphan'});data(await receive(seq+4),'Receipt receive');
  await sql(`create function fixture_hub_ack_fail() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_hub_ack_fail before insert on ga_private.roadmap_hub_acknowledged for each row execute function fixture_hub_ack_fail()`);
  denied(await ack(seq+4),'Ack rollback','40001');assert.equal(await sql(`select status from akatsuki_requests where seq=${seq+4}`),'pending');assert.equal(await sql(`select seq from akatsuki_links where user_id='${a.id}' and a_addr=${literal(JSON.stringify(address))}`),String(seq+3));
  await sql('drop trigger fixture_hub_ack_fail on ga_private.roadmap_hub_acknowledged;drop function fixture_hub_ack_fail()');
 });
 await check('Acknowledgements recheck revocation, original event and target owner after committed lock waits',async()=>{
  const call=`begin;${claim}select ga_roadmap_ack_task_event(${seq+4});commit;`;
  await withBlockedWriter(57,`update ga_private.roadmap_hub_access set enabled=false where auth_user_id='${a.id}'`,call,/hub protocol review required/);await sql(`update ga_private.roadmap_hub_access set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(58,`update akatsuki_requests set user_id='${b.id}' where seq=${seq+4}`,call,/hub event unavailable/);await sql(`update akatsuki_requests set user_id='${a.id}' where seq=${seq+4}`);
  await withBlockedWriter(59,`update roadmap_tasks set user_id='${b.id}',parent_id=null where id='${task}'`,call,/mirror task unavailable/);await sql(`update roadmap_tasks set user_id='${a.id}' where id='${task}'`);
  await withBlockedWriter(60,'update ga_private.roadmap_control set paused=true',call,/hub mirror access denied/);await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(61,`update auth.users set email_confirmed_at=null where id='${a.id}'`,call,/hub mirror access denied/);await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
  data(await ack(seq+4),'Ack after review');
 });
}
