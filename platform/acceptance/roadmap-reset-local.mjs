// Synthetic callers inside the guarded, disposable local Supabase runner only.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapResetAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const ids=Array.from({length:6},()=>randomUUID()),request=randomUUID();let params,day;
 const rows=async(targets=ids)=>data(await a.client.from('roadmap_tasks').select('*').in('id',targets).order('id'),'Reset fixture rows');
 const targets=records=>records.map(t=>({id:t.id,expected_updated_at:t.updated_at}));
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const call=p=>`select ga_roadmap_reset_daily_tasks(${literal(JSON.stringify(p.p_tasks))},${literal(p.p_day_key)},${literal(p.p_timezone)},'${p.p_request_id}')`;
 await check('Roadmap reset installation and concurrent retry preserve streaks and session evidence',async()=>{
  day=await sql("select ((clock_timestamp()-interval '4 hours') at time zone 'Asia/Tokyo')::date::text");
  for(const id of ids)await sql(`insert into roadmap_tasks(id,user_id,title,kind,tags,done,streak,streak_day,updated_at)
   values('${id}','${a.id}','Keep daily task','task','{daily-routine}',true,4,'${day}'::date-1,now()-interval '2 days')`);
  const proof=randomUUID();await sql(`insert into roadmap_study_sessions(id,user_id,task_id,day_key,source,completed_at,verification,feedback)
   values('${proof}','${a.id}','${ids[0]}','${day}','study-app',now(),'app','{"retain":"proof"}')`);
  const before=await rows(),history=await sql(`select to_jsonb(s) from roadmap_study_sessions s where id='${proof}'`);
  await sql(await readFile(new URL('../operations/general-apps/12_roadmap_daily_reset.sql',import.meta.url),'utf8'));assert.deepEqual(await rows(),before);
  params={p_tasks:targets(before.filter(t=>ids.slice(0,2).includes(t.id))),p_day_key:day,p_timezone:'Asia/Tokyo',p_request_id:request};
  let ready=false;for(let n=0;n<30;n++){const result=await b.client.rpc('ga_roadmap_reset_daily_tasks',params);if(result.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready,'Reset RPC schema reloaded');
  const replies=await Promise.all([a.client.rpc('ga_roadmap_reset_daily_tasks',params),a.client.rpc('ga_roadmap_reset_daily_tasks',params)]);
  const first=data(replies[0],'First reset'),again=data(replies[1],'Concurrent reset retry');assert.deepEqual(first.tasks,again.tasks);
  assert.ok(first.tasks.every(t=>!t.done&&t.streak===4));assert.equal(await sql(`select count(*) from ga_private.roadmap_reset_receipts where request_id='${request}'`),'1');
  assert.equal(await sql(`select to_jsonb(s) from roadmap_study_sessions s where id='${proof}'`),history);
  denied(await client().rpc('ga_roadmap_reset_daily_tasks',params),'Unsigned reset');
 });
 await check('Roadmap reset rejects competing versions and observes a task edit committed while waiting',async()=>{
  const current=(await rows([ids[0]]))[0];
  data(await a.client.rpc('ga_roadmap_set_daily_task',{p_task_id:ids[0],p_expected_updated_at:current.updated_at,p_done:true,p_day_key:day,p_request_id:randomUUID()}),'New completion');
  const replay=data(await a.client.rpc('ga_roadmap_reset_daily_tasks',params),'Old reset replay');assert.equal(replay.tasks.find(t=>t.id===ids[0]).done,true);
  const p={...params,p_tasks:targets(await rows([ids[2]])),p_request_id:randomUUID()};
  const results=await Promise.all([a.client.rpc('ga_roadmap_reset_daily_tasks',p),a.client.rpc('ga_roadmap_reset_daily_tasks',{...p,p_request_id:randomUUID()})]);
  assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.find(r=>r.error)?.error.code,'40001');
  const stale={...params,p_tasks:targets(await rows(ids.slice(3,5))),p_request_id:randomUUID()};
  await withBlockedWriter(20,`update roadmap_tasks set title='Newer editor work' where id='${ids[3]}'`,`begin;${claim}${call(stale)};commit;`,/task changed/);
  assert.ok((await rows(ids.slice(3,5))).every(t=>t.done));
 });
 await check('Roadmap reset history failure rolls back a full batch and retains a safe original retry',async()=>{
  const before=await rows([ids[4],ids[5]]),p={...params,p_tasks:targets(before),p_request_id:randomUUID()};
  await sql(`create function fixture_reset_receipt_failure() returns trigger language plpgsql as $$begin raise exception 'fixture reset failure';end;$$;
   create trigger fixture_reset_failure before insert on ga_private.roadmap_reset_receipts for each row execute function fixture_reset_receipt_failure()`);
  denied(await a.client.rpc('ga_roadmap_reset_daily_tasks',p),'Reset history failure','P0001');assert.deepEqual(await rows([ids[4],ids[5]]),before);
  await sql('drop trigger fixture_reset_failure on ga_private.roadmap_reset_receipts;drop function fixture_reset_receipt_failure()');
  assert.ok(data(await a.client.rpc('ga_roadmap_reset_daily_tasks',p),'Original reset retry').tasks.every(t=>!t.done));
 });
 await check('Roadmap reset replay observes a committed pause and verification revocation',async()=>{
  await withBlockedWriter(21,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(params)};commit;`,/daily reset access denied/);
  denied(await a.client.rpc('ga_roadmap_reset_daily_tasks',params),'Paused reset replay');await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(22,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(params)};commit;`,/daily reset access denied/);
  denied(await a.client.rpc('ga_roadmap_reset_daily_tasks',params),'Revoked reset replay');await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
