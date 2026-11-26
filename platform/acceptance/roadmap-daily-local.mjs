// Only invoked from the loopback/container-guarded disposable Supabase runner.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export async function roadmapDailyAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}) {
 const task=randomUUID(),request=randomUUID(),day='2026-11-26';
 const candidate=await readFile(new URL('../operations/general-apps/08_roadmap_daily_actions.sql',import.meta.url),'utf8');
 const claim=actor=>`set local role authenticated;select set_config('request.jwt.claim.sub','${actor.id}',true);
  select set_config('request.jwt.claims','{"sub":"${actor.id}","role":"authenticated","is_anonymous":false}',true);`;
 const row=async()=>data(await a.client.from('roadmap_tasks').select('*').eq('id',task).single(),'Owned daily task');
 let params,first;
 await check('Roadmap atomic daily contract preserves task/session history during installation',async()=>{
  await sql(`insert into roadmap_tasks(id,user_id,title,tags) values('${task}','${a.id}','Synthetic atomic task','{daily-routine}')`);
  const before=await row();await sql(candidate);assert.deepEqual(await row(),before);
  params={p_task_id:task,p_expected_updated_at:before.updated_at,p_done:true,p_day_key:day,p_request_id:request};
  let available=false;
  for(let i=0;i<30;i++) {
   const result=await b.client.rpc('ga_roadmap_set_daily_task',params);
   if(result.error?.code==='42501'){available=true;break}await pause(100);
  }
  assert.ok(available,'Daily RPC schema reload');
 });
 await check('Roadmap real JWT daily retries save once and reject stale, foreign and anonymous actions',async()=>{
  const [x,y]=await Promise.all([a.client.rpc('ga_roadmap_set_daily_task',params),a.client.rpc('ga_roadmap_set_daily_task',params)]);
  first=data(x,'First daily action');const again=data(y,'Concurrent replay');
  assert.equal(first.task.done,true);assert.deepEqual(first.task,again.task);assert.deepEqual(first.session,again.session);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_daily_receipts where task_id='${task}'`),'1');
  assert.equal(await sql(`select count(*) from roadmap_study_sessions where task_id='${task}'`),'1');
  denied(await b.client.rpc('ga_roadmap_set_daily_task',params),'Foreign daily action');
  denied(await client().rpc('ga_roadmap_set_daily_task',params),'Anonymous daily action');
  denied(await a.client.rpc('ga_roadmap_set_daily_task',{...params,p_done:false,p_request_id:randomUUID()}),'Stale daily action','40001');
 });
 await check('Roadmap failed session write rolls back the task and allows its original action to recover',async()=>{
  const before=await row(),undo={...params,p_expected_updated_at:before.updated_at,p_done:false,p_request_id:randomUUID()};
  await sql(`create function fixture_daily_refuse() returns trigger language plpgsql as $$begin raise exception 'fixture session refusal';end;$$;
   create trigger fixture_daily_refuse before update on roadmap_study_sessions for each row execute function fixture_daily_refuse()`);
  denied(await a.client.rpc('ga_roadmap_set_daily_task',undo),'Refused session','P0001');assert.deepEqual(await row(),before);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_daily_receipts where task_id='${task}'`),'1');
  await sql('drop trigger fixture_daily_refuse on roadmap_study_sessions;drop function fixture_daily_refuse()');
  const result=data(await a.client.rpc('ga_roadmap_set_daily_task',undo),'Recovered undo');
  assert.equal(result.task.done,false);assert.equal(result.session.completed_at,null);
  const old=data(await a.client.rpc('ga_roadmap_set_daily_task',params),'Old acknowledgement replay');
  assert.equal(old.replayed,true);assert.equal(old.task.done,false);
 });
 await check('Roadmap daily actions preserve concurrent study-app proof and observe a committed pause',async()=>{
  const before=await row(),next={...params,p_expected_updated_at:before.updated_at,p_request_id:randomUUID()};
  await withBlockedWriter(11,`${claim(a)}select roadmap_complete_session('${task}','synthetic-study','${day}',37,'{"answer":"Keep 日本語"}','app')`,
   `begin;${claim(a)}select ga_roadmap_set_daily_task('${task}','${before.updated_at}',true,'${day}','${next.p_request_id}');
    do $$begin if not exists(select from roadmap_study_sessions where task_id='${task}' and verification='app') then
     raise exception 'proof lost';end if;end$$;rollback;select 1/0;`,/division by zero/);
  // The waiter's deliberate rollback leaves the first writer's proof intact.
  const result=data(await a.client.rpc('ga_roadmap_set_daily_task',next),'Manual action after proof');
  assert.equal(result.session.verification,'app');assert.equal(result.session.duration_min,37);
  assert.deepEqual(result.session.feedback,{answer:'Keep 日本語'});
  await withBlockedWriter(12,'update ga_private.roadmap_control set paused=true',
   `begin;${claim(a)}select ga_roadmap_set_daily_task('${task}','${before.updated_at}',true,'${day}','${next.p_request_id}');commit;`,/session access denied/);
  denied(await a.client.rpc('ga_roadmap_set_daily_task',next),'Paused replay');
  await sql('update ga_private.roadmap_control set paused=false');
 });
}
