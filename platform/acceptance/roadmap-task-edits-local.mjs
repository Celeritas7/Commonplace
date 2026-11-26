// Synthetic users and records in the guarded disposable Supabase stack only.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapTaskEditsAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const ids=Array.from({length:6},()=>randomUUID());let params;
 const rows=async(targets=ids)=>data(await a.client.from('roadmap_tasks').select('*').in('id',targets).order('id'),'Task edit fixture rows');
 const targets=records=>records.map(t=>({id:t.id,expected_updated_at:t.updated_at,patch:{title:'Confirmed title',tags:['daily-routine','kept']}}));
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const call=p=>`select ga_roadmap_edit_tasks(${literal(JSON.stringify(p.p_tasks))},'${p.p_request_id}')`;
 await check('Roadmap metadata installation and concurrent retry preserve completion and session history',async()=>{
  for(const id of ids)await sql(`insert into roadmap_tasks(id,user_id,title,kind,tags,done,streak,streak_day,updated_at)
   values('${id}','${a.id}','Keep task','task','{daily-routine}',true,4,'2026-11-25',now()-interval '2 days')`);
  const proof=randomUUID();await sql(`insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,completed_at,verification,feedback)
   values('${proof}','${a.id}','${ids[0]}','2026-11-25','study-app',now(),'app','{"retain":"proof"}')`);
  const before=await rows(),history=await sql(`select to_jsonb(s) from roadmap_study_sessions s where id='${proof}'`);
  await sql(await readFile(new URL('../operations/general-apps/13_roadmap_task_edits.sql',import.meta.url),'utf8'));assert.deepEqual(await rows(),before);
  params={p_tasks:targets(before.filter(t=>ids.slice(0,2).includes(t.id))),p_request_id:randomUUID()};
  let ready=false;for(let n=0;n<30;n++){const result=await b.client.rpc('ga_roadmap_edit_tasks',params);if(result.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready,'Edit RPC schema reloaded');
  const results=await Promise.all([a.client.rpc('ga_roadmap_edit_tasks',params),a.client.rpc('ga_roadmap_edit_tasks',params)]);
  const first=data(results[0],'First edit'),again=data(results[1],'Concurrent edit retry');assert.deepEqual(first.tasks,again.tasks);
  assert.ok(first.tasks.every(t=>t.title==='Confirmed title'&&t.done&&t.streak===4&&t.user_id===undefined));
  assert.equal(await sql(`select count(*) from ga_private.roadmap_task_edit_receipts where request_id='${params.p_request_id}'`),'1');
  assert.equal(await sql(`select to_jsonb(s) from roadmap_study_sessions s where id='${proof}'`),history);
  denied(await client().rpc('ga_roadmap_edit_tasks',params),'Unsigned metadata edit');
 });
 await check('Roadmap metadata competing edits and lock-wait changes reject stale whole batches',async()=>{
  const p={p_tasks:targets(await rows([ids[2]])),p_request_id:randomUUID()};
  const results=await Promise.all([a.client.rpc('ga_roadmap_edit_tasks',p),a.client.rpc('ga_roadmap_edit_tasks',{...p,p_request_id:randomUUID()})]);
  assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.find(r=>r.error)?.error.code,'40001');
  const stale={p_tasks:targets(await rows(ids.slice(3,5))),p_request_id:randomUUID()},untouched=(await rows([ids[4]]))[0];
  await withBlockedWriter(23,`update roadmap_tasks set title='Newer editor work' where id='${ids[3]}'`,`begin;${claim}${call(stale)};commit;`,/task changed/);
  assert.deepEqual((await rows([ids[4]]))[0],untouched);
  const newer={p_tasks:targets(await rows([ids[0]])),p_request_id:randomUUID()};newer.p_tasks[0].patch={title:'Latest saved title'};
  data(await a.client.rpc('ga_roadmap_edit_tasks',newer),'Newer title');
  assert.equal(data(await a.client.rpc('ga_roadmap_edit_tasks',params),'Original edit replay').tasks.find(t=>t.id===ids[0]).title,'Latest saved title');
 });
 await check('Roadmap metadata receipt failure rolls back the batch and the exact retry remains usable',async()=>{
  const before=await rows(ids.slice(4)),p={p_tasks:targets(before),p_request_id:randomUUID()};
  await sql(`create function fixture_task_receipt_failure() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_task_failure before insert on ga_private.roadmap_task_edit_receipts for each row execute function fixture_task_receipt_failure()`);
  denied(await a.client.rpc('ga_roadmap_edit_tasks',p),'Suppressed edit history');assert.deepEqual(await rows(ids.slice(4)),before);
  await sql('drop trigger fixture_task_failure on ga_private.roadmap_task_edit_receipts;drop function fixture_task_receipt_failure()');
  assert.equal(data(await a.client.rpc('ga_roadmap_edit_tasks',p),'Original task retry').tasks.length,2);
  await withBlockedWriter(26,`update roadmap_tasks set user_id='${b.id}' where id='${ids[5]}'`,`begin;${claim}${call(p)};commit;`,/task edit access denied/);
  assert.equal(data(await b.client.from('roadmap_tasks').select('id').eq('id',ids[5]),'Transferred synthetic row').length,1);
 });
 await check('Roadmap metadata replay observes committed pause and verification revocation',async()=>{
  await withBlockedWriter(24,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(params)};commit;`,/task edit access denied/);
  denied(await a.client.rpc('ga_roadmap_edit_tasks',params),'Paused metadata replay');await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(25,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(params)};commit;`,/task edit access denied/);
  denied(await a.client.rpc('ga_roadmap_edit_tasks',params),'Revoked metadata replay');await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
