// Only called by the guarded disposable local Supabase runner.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function roadmapImportAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const task=randomUUID(),comparison=randomUUID(),product=randomUUID(),other=randomUUID(),request=randomUUID();
 const doc={title:'Synthetic import',notes:'Keep 日本語',items:[{id:product,name:'Original product',price:50,notes:'Keep product note'},{id:other,name:'Removed later',price:60}]};
 let createParams,created;
 const preview=async()=>data(await a.client.rpc('ga_roadmap_preview_import',{p_comparison_id:comparison}),'Import preview');
 const claim=actor=>`set local role authenticated;select set_config('request.jwt.claim.sub','${actor.id}',true);
  select set_config('request.jwt.claims','{"sub":"${actor.id}","role":"authenticated","is_anonymous":false}',true);`;
 const literal=v=>"'"+String(v).replaceAll("'","''")+"'";
 const call=p=>`select ga_roadmap_import_comparison('${p.p_comparison_id}','${p.p_task_id}',${literal(p.p_expected_revision)},${literal(JSON.stringify(p.p_document))},'${p.p_request_id}')`;
 await check('Roadmap import installation and concurrent creation preserve tasks and one acknowledged study',async()=>{
  await sql(`insert into roadmap_tasks(id,user_id,title,kind) values('${task}','${a.id}','Explicit import task','task')`);
  const before=await sql('select count(*) from roadmap_tasks');
  await sql(await readFile(new URL('../operations/general-apps/11_roadmap_comparison_imports.sql',import.meta.url),'utf8'));
  createParams={p_comparison_id:comparison,p_task_id:task,p_expected_revision:null,p_document:doc,p_request_id:request};
  let ready=false;
  for(let i=0;i<30;i++){
   const result=await b.client.rpc('ga_roadmap_import_comparison',createParams);
   if(result.error?.code==='42501'){ready=true;break}await pause(100);
  }
  assert.ok(ready,'Import RPC schema reloaded');
  const replies=await Promise.all([a.client.rpc('ga_roadmap_import_comparison',createParams),a.client.rpc('ga_roadmap_import_comparison',createParams)]);
  created=data(replies[0],'Create import');const replay=data(replies[1],'Duplicate create');
  assert.equal(created.revision,replay.revision);assert.equal(await sql('select count(*) from roadmap_tasks'),before);
  assert.equal(await sql(`select count(*) from ga_private.roadmap_import_receipts where comparison_id='${comparison}'`),'1');
  denied(await client().rpc('ga_roadmap_preview_import',{p_comparison_id:comparison}),'Unsigned preview');
  denied(await b.client.rpc('ga_roadmap_preview_import',{p_comparison_id:comparison}),'Foreign preview');
 });
 await check('Roadmap import conflicts preserve preferences, notes and complete replacement history',async()=>{
  data(await a.client.rpc('ga_roadmap_edit_comparison',{p_comparison_id:comparison,p_expected_updated_at:created.comparison.updated_at,
   p_patch:{chosen_item:product,weights:{price:3}},p_request_id:randomUUID()}),'Set choice');
  const state=await preview(),change={p_comparison_id:comparison,p_task_id:task,p_expected_revision:state.revision,
   p_document:{title:doc.title,items:[{id:product,name:'Retained product',price:55}]},p_request_id:randomUUID()};
  const replies=await Promise.all([a.client.rpc('ga_roadmap_import_comparison',change),
   a.client.rpc('ga_roadmap_import_comparison',{...change,p_request_id:randomUUID(),p_document:{...change.p_document,title:'Competing title'}})]);
  assert.equal(replies.filter(r=>!r.error).length,1);assert.equal(replies.find(r=>r.error)?.error.code,'40001');
  const result=data(replies.find(r=>!r.error),'Winning import');
  assert.equal(result.comparison.chosen_item,product);assert.deepEqual(result.comparison.weights,{price:3});
  assert.equal(result.comparison.notes,'Keep 日本語');assert.equal(result.items[0].notes,'Keep product note');
  assert.equal(result.items[0].created_at,created.items[0].created_at);
  const retained=JSON.parse(await sql(`select before_state from ga_private.roadmap_import_receipts where comparison_id='${comparison}' and before_state is not null`));
  assert.equal(retained.items.length,2);
  assert.equal(data(await a.client.rpc('ga_roadmap_import_comparison',createParams),'Old create replay').revision,result.revision);
 });
 await check('Roadmap imports detect child edits and insertions committed while waiting for locks',async()=>{
  for(const [n,writer] of [
   [16,`update roadmap_comparison_items set notes='Concurrent item edit' where id='${product}'`],
   [17,`insert into roadmap_comparison_items(id,user_id,comparison_id,name) values('${randomUUID()}','${a.id}','${comparison}','Concurrent insertion')`],
  ]){
   const before=await preview(),p={...createParams,p_expected_revision:before.revision,p_document:{title:doc.title,items:[{id:product,name:'Preserve'}]},p_request_id:randomUUID()};
   await withBlockedWriter(n,writer,`begin;${claim(a)}${call(p)};commit;`,/comparison changed/);
   assert.notEqual((await preview()).revision,before.revision);
  }
 });
 await check('Roadmap import receipt failure rolls back products and an unchanged request can recover',async()=>{
  const state=await preview(),p={...createParams,p_expected_revision:state.revision,p_document:{title:'Recovery',items:[{id:product,name:'New saved product',price:80}]},p_request_id:randomUUID()};
  await sql(`create function fixture_import_receipt_failure() returns trigger language plpgsql as $$begin raise exception 'fixture import failure';end;$$;
   create trigger fixture_import_failure before insert on ga_private.roadmap_import_receipts for each row execute function fixture_import_receipt_failure()`);
  denied(await a.client.rpc('ga_roadmap_import_comparison',p),'Atomic history failure','P0001');assert.deepEqual(await preview(),state);
  await sql('drop trigger fixture_import_failure on ga_private.roadmap_import_receipts;drop function fixture_import_receipt_failure()');
  assert.equal(data(await a.client.rpc('ga_roadmap_import_comparison',p),'Retained original retry').items[0].price,80);
 });
 await check('Roadmap import replays recheck committed pause and verification revocation',async()=>{
  const p={...createParams,p_expected_revision:(await preview()).revision,p_document:{title:'Pause review',items:[{id:product,name:'Preserve'}]},p_request_id:randomUUID()};
  data(await a.client.rpc('ga_roadmap_import_comparison',p),'Before pause');
  await withBlockedWriter(18,'update ga_private.roadmap_control set paused=true',`begin;${claim(a)}${call(p)};commit;`,/comparison import access denied/);
  denied(await a.client.rpc('ga_roadmap_import_comparison',p),'Paused replay');
  await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(19,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim(a)}${call(p)};commit;`,/comparison import access denied/);
  denied(await a.client.rpc('ga_roadmap_import_comparison',p),'Revoked replay');
  await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
