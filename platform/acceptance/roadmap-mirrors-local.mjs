import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
export async function roadmapMirrorsAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const address={board_id:'synthetic-mirror',item_key:'study:日本語',sub_id:'task',extra:{keep:'exact'}};
 const params={p_address:address,p_payload:{title:'Synthetic mirror',done:false},p_seq:18000001};let task;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const call=p=>`select ga_roadmap_receive_task(${literal(JSON.stringify(p.p_address))},${literal(JSON.stringify(p.p_payload))},${p.p_seq})`;
 await check('Roadmap mirrors default-deny admission and atomically pair concurrent JWT retries',async()=>{
  const before=await sql('select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t');
  await sql(await readFile(new URL('../operations/general-apps/18_roadmap_mirror_delivery.sql',import.meta.url),'utf8'));
  assert.equal(await sql('select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t'),before);
  let ready=false;for(let n=0;n<30;n++){const r=await a.client.rpc('ga_roadmap_receive_task',params);if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  denied(await client().rpc('ga_roadmap_receive_task',params),'Unsigned mirror');denied(await b.client.rpc('ga_roadmap_receive_task',params),'Unreviewed owner');
  await sql(`insert into ga_private.roadmap_mirror_access values('${a.id}',true,'Synthetic clean-owner review')`);
  const results=await Promise.all([a.client.rpc('ga_roadmap_receive_task',params),a.client.rpc('ga_roadmap_receive_task',params)]);
  const x=data(results[0],'Mirror first'),y=data(results[1],'Mirror replay');task=x.task_id;assert.equal(task,y.task_id);assert.deepEqual(x.tasks,y.tasks);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_mirror_receipts where auth_user_id='${a.id}' and seq=${params.p_seq}`),'1');
  assert.equal(await sql(`select count(*) from roadmap_tasks where user_id='${a.id}' and id='${task}'`),'1');
  assert.deepEqual(data(await b.client.from('roadmap_tasks').select('*').eq('id',task),'Foreign mirror'),[]);
 });
 await check('Roadmap mirrors retain newest edits and local deletion across lost acknowledgements',async()=>{
  const newer={...params,p_seq:18000003,p_payload:{title:'Newer mirror',done:true}},older={...params,p_seq:18000002,p_payload:{title:'Old mirror'}};
  const x=data(await a.client.rpc('ga_roadmap_receive_task',newer),'Newer mirror');const y=data(await a.client.rpc('ga_roadmap_receive_task',older),'Old mirror');assert.deepEqual(y.tasks,x.tasks);assert.equal(y.last_seq,newer.p_seq);
  denied(await a.client.rpc('ga_roadmap_receive_task',{...params,p_payload:{title:'Changed request'}}),'Changed mirror sequence','22023');
  await sql(`create function fixture_mirror_receipt_fail() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_mirror_receipt_fail before insert on ga_private.roadmap_mirror_receipts for each row execute function fixture_mirror_receipt_fail()`);
  const before=await sql('select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t');
  denied(await a.client.rpc('ga_roadmap_receive_task',{...params,p_address:{...address,sub_id:'rollback'},p_seq:18000004}),'Lost mirror receipt','40001');
  assert.equal(await sql('select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t'),before);
  await sql('drop trigger fixture_mirror_receipt_fail on ga_private.roadmap_mirror_receipts;drop function fixture_mirror_receipt_fail()');
  await sql(`delete from roadmap_tasks where id='${task}'`);
  const removed=data(await a.client.rpc('ga_roadmap_receive_task',params),'Deleted local mirror');assert.equal(removed.suppressed,true);assert.deepEqual(removed.tasks,[]);
  const fresh=data(await a.client.rpc('ga_roadmap_receive_task',{...params,p_address:{...address,sub_id:'lock-wait'},p_seq:18000005}),'Wait mirror');task=fresh.task_id;
 });
 await check('Roadmap mirror replay rechecks committed ownership, review access, pause and verification after waits',async()=>{
  const p={...params,p_address:{...address,sub_id:'lock-wait'},p_seq:18000005};
  await withBlockedWriter(43,`update roadmap_tasks set parent_id=null,user_id='${b.id}' where id='${task}'`,`begin;${claim}${call(p)};commit;`,/mirror task unavailable/);
  await withBlockedWriter(44,`update ga_private.roadmap_mirror_access set enabled=false where auth_user_id='${a.id}'`,`begin;${claim}${call(params)};commit;`,/mirror reconciliation required/);
  denied(await a.client.rpc('ga_roadmap_receive_task',params),'Revoked mirror replay');await sql(`update ga_private.roadmap_mirror_access set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(45,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(params)};commit;`,/mirror access denied/);await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(46,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(params)};commit;`,/mirror access denied/);await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
