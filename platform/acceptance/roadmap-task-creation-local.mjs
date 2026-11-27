// Synthetic JWTs only, in the guarded disposable Supabase stack.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapCreationAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const parent=randomUUID(),moving=randomUUID();let params;
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const call=p=>`select ga_roadmap_create_tasks(${literal(JSON.stringify(p.p_payload))},'${p.p_request_id}')`;
 const capture=()=>({p_request_id:randomUUID(),p_payload:{kind:'capture',text:'buy paper!, study Japanese, buy pens',items:[
  {id:randomUUID(),title:'buy paper',tags:['outside','high','parked'],folder:'Shopping'},
  {id:randomUUID(),title:'study Japanese',tags:['parked'],folder:'Languages'},
  {id:randomUUID(),title:'buy pens',tags:['outside','parked'],folder:'Shopping'}]}});
 const simple=()=>({p_request_id:randomUUID(),p_payload:{kind:'task',parent_id:parent,items:[{id:randomUUID(),title:'Synthetic new task 日本語',tags:['home']}]}});
 await check('Roadmap concurrent task/capture retries commit once and retain existing records',async()=>{
  await sql(`insert into roadmap_tasks(id,user_id,title,kind) values
   ('${parent}','${a.id}','Creation fixture parent','group'),('${moving}','${a.id}','Moving creation parent','group')`);
  const before=await sql(`select to_jsonb(t) from roadmap_tasks t where id='${parent}'`);
  await sql(await readFile(new URL('../operations/general-apps/15_roadmap_task_creation.sql',import.meta.url),'utf8'));
  assert.equal(await sql(`select to_jsonb(t) from roadmap_tasks t where id='${parent}'`),before);
  const probe=simple();let ready=false;for(let n=0;n<30;n++){const r=await b.client.rpc('ga_roadmap_create_tasks',probe);if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  params=capture();const results=await Promise.all([a.client.rpc('ga_roadmap_create_tasks',params),a.client.rpc('ga_roadmap_create_tasks',params)]);
  const first=data(results[0],'Capture first'),second=data(results[1],'Capture retry');assert.deepEqual(first.tasks,second.tasks);assert.equal(first.tasks.length,6);
  assert.equal(first.tasks.filter(t=>t.kind==='task').length,3);assert.ok(first.tasks.every(t=>t.user_id===undefined));
  assert.equal(await sql(`select count(*) from ga_private.roadmap_creation_receipts where request_id='${params.p_request_id}'`),'1');
  const more=await Promise.all([a.client.rpc('ga_roadmap_create_tasks',capture()),a.client.rpc('ga_roadmap_create_tasks',capture())]);more.forEach(r=>data(r,'Parallel new capture'));
  assert.equal(await sql(`select count(*) from roadmap_tasks where user_id='${a.id}' and title='Captured'`),'1');
  assert.equal(await sql(`select count(*) from roadmap_tasks where user_id='${a.id}' and kind='group' and title='Shopping'`),'1');
  denied(await client().rpc('ga_roadmap_create_tasks',simple()),'Unsigned create');
  assert.deepEqual(data(await b.client.from('roadmap_tasks').select('*').eq('id',params.p_payload.items[0].id),'Foreign task'),[]);
 });
 await check('Roadmap creation rejects competing UUIDs and parent revocation committed during lock waits',async()=>{
  const p=simple(),results=await Promise.all([a.client.rpc('ga_roadmap_create_tasks',p),a.client.rpc('ga_roadmap_create_tasks',{...p,p_request_id:randomUUID()})]);
  assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.find(r=>r.error)?.error.code,'42501');
  assert.equal(await sql(`select count(*) from roadmap_tasks where id='${p.p_payload.items[0].id}'`),'1');
  denied(await a.client.rpc('ga_roadmap_create_tasks',{...params,p_payload:{...params.p_payload,text:'changed retry'}}),'Changed capture','22023');
  const stale=simple();stale.p_payload.parent_id=moving;
  await withBlockedWriter(31,`update roadmap_tasks set user_id='${b.id}' where id='${moving}'`,`begin;${claim}${call(stale)};commit;`,/task parent unavailable/);
  assert.equal(await sql(`select count(*) from roadmap_tasks where id='${stale.p_payload.items[0].id}'`),'0');
 });
 await check('Roadmap failed capture rolls back folders and UUIDs; replay keeps edits without recreating deletion',async()=>{
  const p=capture();
  await sql(`create function fixture_creation_receipt_failure() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_creation_failure before insert on ga_private.roadmap_creation_receipts for each row execute function fixture_creation_receipt_failure()`);
  denied(await b.client.rpc('ga_roadmap_create_tasks',p),'Suppressed creation receipt');
  assert.equal(await sql(`select count(*) from roadmap_tasks where user_id='${b.id}' and title='Captured'`),'0');
  assert.equal(await sql(`select count(*) from ga_private.roadmap_creation_ids where request_id='${p.p_request_id}'`),'0');
  await sql('drop trigger fixture_creation_failure on ga_private.roadmap_creation_receipts;drop function fixture_creation_receipt_failure()');
  data(await b.client.rpc('ga_roadmap_create_tasks',p),'Original capture retry');
  const edited=params.p_payload.items[0].id;
  data(await a.client.from('roadmap_tasks').update({title:'Keep later edit',tags:['home']}).eq('id',edited).select().single(),'Later task edit');
  assert.equal(data(await a.client.rpc('ga_roadmap_create_tasks',params),'Current replay').tasks.find(t=>t.id===edited).title,'Keep later edit');
  const transfer=simple();data(await a.client.rpc('ga_roadmap_create_tasks',transfer),'Task before transfer');
  await withBlockedWriter(32,`update roadmap_tasks set parent_id=null,user_id='${b.id}' where id='${transfer.p_payload.items[0].id}'`,
   `begin;${claim}${call(transfer)};commit;`,/created task unavailable/);
  await sql(`delete from roadmap_tasks where id='${edited}'`);denied(await a.client.rpc('ga_roadmap_create_tasks',params),'Deleted capture replay');
  denied(await a.client.rpc('ga_roadmap_create_tasks',{...params,p_request_id:randomUUID()}),'Reserved deleted UUID');
  assert.equal(await sql(`select count(*) from roadmap_tasks where id='${edited}'`),'0');
 });
 await check('Roadmap creation and replay observe committed pause and verification revocation',async()=>{
  const p=simple();data(await a.client.rpc('ga_roadmap_create_tasks',p),'Task before revocation');
  await withBlockedWriter(33,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(p)};commit;`,/task creation access denied/);
  denied(await a.client.rpc('ga_roadmap_create_tasks',p),'Paused creation');await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(34,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(p)};commit;`,/task creation access denied/);
  denied(await a.client.rpc('ga_roadmap_create_tasks',p),'Unverified creation');await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
