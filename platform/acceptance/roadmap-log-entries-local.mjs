// Synthetic identities and records, only in the guarded disposable Supabase stack.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapLogAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const task=randomUUID(),moving=randomUUID();let params;
 const entry={task_id:task,log_date:'2026-11-25',context:'@home',duration_minutes:35,notes:'Keep 日本語 notes'};
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const call=p=>`select ga_roadmap_add_log('${p.p_entry_id}',${literal(JSON.stringify(p.p_entry))},'${p.p_request_id}')`;
 const count=async id=>sql(`select count(*) from roadmap_daily_logs where id='${id}'`);
 const row=async id=>data(await a.client.from('roadmap_daily_logs').select('*').eq('id',id).single(),'Current owned log');
 await check('Roadmap log creation and concurrent retry preserve original date, notes and historical records',async()=>{
  await sql(`insert into roadmap_tasks(id,user_id,title,kind,done,streak) values
   ('${task}','${a.id}','Log fixture task','task',true,4),('${moving}','${a.id}','Moving log fixture','task',false,0)`);
  const history=randomUUID();await sql(`insert into roadmap_daily_logs(id,user_id,task_id,notes) values('${history}','${a.id}','${task}','Keep existing history')`);
  const before=await row(history),taskBefore=await sql(`select to_jsonb(t) from roadmap_tasks t where id='${task}'`);
  await sql(await readFile(new URL('../operations/general-apps/14_roadmap_log_entries.sql',import.meta.url),'utf8'));
  assert.deepEqual(await row(history),before);
  params={p_entry_id:randomUUID(),p_entry:entry,p_request_id:randomUUID()};
  let ready=false;for(let n=0;n<30;n++){const r=await b.client.rpc('ga_roadmap_add_log',params);if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready,'Log RPC schema reloaded');
  const replies=await Promise.all([a.client.rpc('ga_roadmap_add_log',params),a.client.rpc('ga_roadmap_add_log',params)]);
  const first=data(replies[0],'First log'),again=data(replies[1],'Concurrent log retry');assert.deepEqual(first.entry,again.entry);
  assert.equal(first.entry.log_date,entry.log_date);assert.equal(first.entry.notes,entry.notes);assert.equal(first.entry.user_id,undefined);
  assert.equal(await count(params.p_entry_id),'1');assert.equal(await sql(`select count(*) from ga_private.roadmap_log_receipts where entry_id='${params.p_entry_id}'`),'1');
  assert.equal(await sql(`select to_jsonb(t) from roadmap_tasks t where id='${task}'`),taskBefore);assert.deepEqual(await row(history),before);
  denied(await client().rpc('ga_roadmap_add_log',params),'Unsigned log');
  assert.deepEqual(data(await b.client.from('roadmap_daily_logs').select('*').eq('id',params.p_entry_id),'Foreign log'),[]);
 });
 await check('Roadmap logs reject competing identities and a task ownership change committed while waiting',async()=>{
  const p={...params,p_entry_id:randomUUID(),p_request_id:randomUUID()};
  const replies=await Promise.all([a.client.rpc('ga_roadmap_add_log',p),a.client.rpc('ga_roadmap_add_log',{...p,p_request_id:randomUUID()})]);
  assert.equal(replies.filter(r=>!r.error).length,1);assert.equal(replies.find(r=>r.error)?.error.code,'42501');assert.equal(await count(p.p_entry_id),'1');
  denied(await a.client.rpc('ga_roadmap_add_log',{...params,p_entry:{...entry,notes:'Different retry'}}),'Changed payload','22023');
  const stale={...params,p_entry_id:randomUUID(),p_request_id:randomUUID(),p_entry:{...entry,task_id:moving}};
  await withBlockedWriter(27,`update roadmap_tasks set user_id='${b.id}' where id='${moving}'`,`begin;${claim}${call(stale)};commit;`,/daily log task unavailable/);
  assert.equal(await count(stale.p_entry_id),'0');
 });
 await check('Roadmap log receipt failure rolls back creation; current replay retains edits and never resurrects deletion',async()=>{
  const p={...params,p_entry_id:randomUUID(),p_request_id:randomUUID(),p_entry:{...entry,task_id:null}};
  await sql(`create function fixture_log_receipt_failure() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_log_failure before insert on ga_private.roadmap_log_receipts for each row execute function fixture_log_receipt_failure()`);
  denied(await a.client.rpc('ga_roadmap_add_log',p),'Suppressed log receipt');assert.equal(await count(p.p_entry_id),'0');
  await sql('drop trigger fixture_log_failure on ga_private.roadmap_log_receipts;drop function fixture_log_receipt_failure()');
  data(await a.client.rpc('ga_roadmap_add_log',p),'Original log retry');
  data(await a.client.from('roadmap_daily_logs').update({notes:'Keep later edit'}).eq('id',p.p_entry_id).select().single(),'Later log notes');
  assert.equal(data(await a.client.rpc('ga_roadmap_add_log',p),'Current log replay').entry.notes,'Keep later edit');
  await withBlockedWriter(30,`update roadmap_daily_logs set user_id='${b.id}' where id='${p.p_entry_id}'`,`begin;${claim}${call(p)};commit;`,/daily log access denied/);
  await sql(`delete from roadmap_daily_logs where id='${p.p_entry_id}'`);denied(await a.client.rpc('ga_roadmap_add_log',p),'Deleted log replay');assert.equal(await count(p.p_entry_id),'0');
  assert.equal(await sql(`select count(*) from ga_private.roadmap_log_receipts where entry_id='${p.p_entry_id}'`),'1');
  await sql(`delete from roadmap_tasks where id='${task}'`);
  assert.equal(data(await a.client.rpc('ga_roadmap_add_log',params),'Retained log after task deletion').entry.task_id,null);
 });
 await check('Roadmap log replay observes committed pause and verification revocation',async()=>{
  await withBlockedWriter(28,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(params)};commit;`,/daily log access denied/);
  denied(await a.client.rpc('ga_roadmap_add_log',params),'Paused log replay');await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(29,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(params)};commit;`,/daily log access denied/);
  denied(await a.client.rpc('ga_roadmap_add_log',params),'Revoked log replay');await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
