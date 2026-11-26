// Real synthetic JWTs and lock waits, only in the disposable loopback stack.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapStructureAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const root=randomUUID(),dest=randomUUID(),task=randomUUID(),child=randomUUID(),session=randomUUID(),log=randomUUID(),resource=randomUUID(),dailyRequest=randomUUID();let params;
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const call=p=>`select ga_roadmap_structure(${literal(JSON.stringify(p.p_payload))},'${p.p_request_id}')`;
 const target=async(id,patch)=>{const r=data(await a.client.from('roadmap_tasks').select('*').eq('id',id).single(),'Read synthetic target');return {id,label:r.title,expected_updated_at:r.updated_at,...patch}};
 const move=async(id=task,parent=dest)=>({p_request_id:randomUUID(),p_payload:{kind:'move',tasks:[await target(id,{parent_id:parent,position:0})]}});
 await check('Roadmap structural moves and new folders commit once under concurrent JWT retries',async()=>{
  await sql(`insert into roadmap_tasks(id,user_id,title,kind,parent_id) values
   ('${root}','${a.id}','Structural source','group',null),('${dest}','${a.id}','Structural destination','group',null),
   ('${task}','${a.id}','Structural task','task','${root}'),('${child}','${a.id}','Structural child','task','${root}');
   insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,verification,feedback,completed_at) values
   ('${session}','${a.id}','${task}','2026-11-26','study-app','app','{"keep":"proof"}',now());
   insert into roadmap_daily_logs(id,user_id,task_id,notes) values('${log}','${a.id}','${task}','Keep 日本語 notes');
   insert into roadmap_task_resources(id,user_id,task_id,label,url) values('${resource}','${a.id}','${task}','Keep link','https://example.invalid')`);
  await sql(`update roadmap_tasks set tags='{daily-routine}' where id='${task}'`);
  data(await a.client.rpc('ga_roadmap_set_daily_task',{p_task_id:task,p_expected_updated_at:(await target(task)).expected_updated_at,
   p_done:true,p_day_key:'2026-11-26',p_request_id:dailyRequest}),'Daily proof before structural preparation');
  const before=await sql(`select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t`);
  await sql(await readFile(new URL('../operations/general-apps/16_roadmap_structure.sql',import.meta.url),'utf8'));
  assert.equal(await sql(`select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t`),before);
  const probe=await move();let ready=false;for(let n=0;n<30;n++){const r=await b.client.rpc('ga_roadmap_structure',probe);if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  params=await move();const folder=randomUUID();params.p_payload.folder={id:folder,title:'Atomic folder',parent_id:null,tags:[]};params.p_payload.tasks[0].parent_id=folder;
  const results=await Promise.all([a.client.rpc('ga_roadmap_structure',params),a.client.rpc('ga_roadmap_structure',params)]);
  assert.deepEqual(data(results[0],'First move').tasks,data(results[1],'Move retry').tasks);assert.equal(data(results[0],'Atomic move').tasks.length,2);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_structure_receipts where request_id='${params.p_request_id}'`),'1');
  denied(await client().rpc('ga_roadmap_structure',probe),'Unsigned move');denied(await b.client.rpc('ga_roadmap_structure',probe),'Foreign move');
 });
 await check('Roadmap structure rechecks target ownership, new descendants and stale edits after lock waits',async()=>{
  const foreign=await move(child);
  await withBlockedWriter(35,`update roadmap_tasks set parent_id=null,user_id='${b.id}' where id='${child}'`,`begin;${claim}${call(foreign)};commit;`,/structural target unavailable/);
  await sql(`update roadmap_tasks set user_id='${a.id}',parent_id='${root}' where id='${child}'`);
  const stale=await move(child);
  await withBlockedWriter(36,`update roadmap_tasks set title='Later title' where id='${child}'`,`begin;${claim}${call(stale)};commit;`,/task changed/);
  const deletion={p_request_id:randomUUID(),p_payload:{kind:'delete',tasks:[await target(root),await target(child)]}},newChild=randomUUID();
  // The inserting transaction holds an FK key-share lock on the parent.
  await withBlockedWriter(37,`insert into roadmap_tasks(id,user_id,title,parent_id) values('${newChild}','${a.id}','Concurrent child','${root}')`,
   `begin;${claim}${call(deletion)};commit;`,/deletion subtree changed/);
  assert.equal(await sql(`select count(*) from roadmap_tasks where id in ('${root}','${child}','${newChild}')`),'3');
 });
 await check('Roadmap deletion retains study proof and notes and rolls back suppressed history capture',async()=>{
  const folder=params.p_payload.folder.id,p={p_request_id:randomUUID(),p_payload:{kind:'delete',tasks:[await target(folder),await target(task)]}};
  const before=await sql(`select jsonb_build_object('task',(select to_jsonb(t) from roadmap_tasks t where id='${task}'),
   'session',(select to_jsonb(s) from roadmap_study_sessions s where id='${session}'),'log',(select to_jsonb(l) from roadmap_daily_logs l where id='${log}'))`);
  await sql(`create function fixture_structure_failure() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_structure_failure before insert on ga_private.roadmap_structure_receipts for each row execute function fixture_structure_failure()`);
  denied(await a.client.rpc('ga_roadmap_structure',p),'Suppressed delete receipt');
  assert.equal(await sql(`select jsonb_build_object('task',(select to_jsonb(t) from roadmap_tasks t where id='${task}'),
   'session',(select to_jsonb(s) from roadmap_study_sessions s where id='${session}'),'log',(select to_jsonb(l) from roadmap_daily_logs l where id='${log}'))`),before);
  await sql('drop trigger fixture_structure_failure on ga_private.roadmap_structure_receipts;drop function fixture_structure_failure()');
  const results=await Promise.all([a.client.rpc('ga_roadmap_structure',p),a.client.rpc('ga_roadmap_structure',p)]);results.forEach(r=>assert.deepEqual(new Set(data(r,'Delete retry').deleted_ids),new Set([folder,task])));
  assert.equal(await sql(`select task_id is null and verification='app' and feedback='{"keep":"proof"}'::jsonb from roadmap_study_sessions where id='${session}'`),'t');
  assert.equal(await sql(`select task_id is null and notes='Keep 日本語 notes' from roadmap_daily_logs where id='${log}'`),'t');
  assert.equal(await sql(`select before_state->'roadmap_task_resources'->0->>'url' from ga_private.roadmap_structure_receipts where request_id='${p.p_request_id}'`),'https://example.invalid');
  assert.equal(await sql(`select before_state->'roadmap_daily_receipts'->0->>'request_id' from ga_private.roadmap_structure_receipts where request_id='${p.p_request_id}'`),dailyRequest);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_daily_receipts where request_id='${dailyRequest}'`),'0');

  assert.deepEqual(data(await b.client.from('roadmap_study_sessions').select('*').eq('id',session),'Foreign proof'),[]);
  params=p;
 });
 await check('Roadmap structural replays fail after committed pause or verification revocation without recreating deletion',async()=>{
  await withBlockedWriter(38,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(params)};commit;`,/structure access denied/);
  denied(await a.client.rpc('ga_roadmap_structure',params),'Paused deletion replay');await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(39,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(params)};commit;`,/structure access denied/);
  denied(await a.client.rpc('ga_roadmap_structure',params),'Unverified deletion replay');await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
  assert.equal(await sql(`select count(*) from roadmap_tasks where id='${task}'`),'0');
 });
}
