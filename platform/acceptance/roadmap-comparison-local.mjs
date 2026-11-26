// Runs only in the loopback/container-guarded disposable Supabase stack.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function roadmapComparisonAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const comparison=randomUUID(),foreign=randomUUID(),item=randomUUID(),request=randomUUID();
 const claim=actor=>`set local role authenticated;select set_config('request.jwt.claim.sub','${actor.id}',true);
  select set_config('request.jwt.claims','{"sub":"${actor.id}","role":"authenticated","is_anonymous":false}',true);`;
 const current=async()=>data(await a.client.from('roadmap_comparisons').select('*').eq('id',comparison).single(),'Current comparison');
 let original,params,first;
 await check('Roadmap comparison edit preparation preserves products and acknowledges one concurrent retry',async()=>{
  await sql(`insert into roadmap_comparisons(id,user_id,title,notes,weights) values
   ('${comparison}','${a.id}','Synthetic comparison','Keep 日本語','{"price":2}'),
   ('${foreign}','${b.id}','Foreign comparison','Keep B','{}');
   insert into roadmap_comparison_items(id,user_id,comparison_id,name,price,notes)
    values('${item}','${a.id}','${comparison}','Product',50,'Keep product')`);
  original=await current();
  await sql(await readFile(new URL('../operations/general-apps/10_roadmap_comparison_edits.sql',import.meta.url),'utf8'));
  assert.deepEqual(await current(),original);
  params={p_comparison_id:comparison,p_expected_updated_at:original.updated_at,p_patch:{weights:{price:3},chosen_item:item},p_request_id:request};
  let available=false;
  for(let i=0;i<30;i++){
   const result=await b.client.rpc('ga_roadmap_edit_comparison',params);
   if(result.error?.code==='42501'){available=true;break}await pause(100);
  }
  assert.ok(available,'Comparison edit RPC schema reload');
  const replies=await Promise.all([a.client.rpc('ga_roadmap_edit_comparison',params),a.client.rpc('ga_roadmap_edit_comparison',params)]);
  first=data(replies[0],'First comparison edit');const again=data(replies[1],'Concurrent retry');
  assert.deepEqual(first.comparison,again.comparison);assert.deepEqual(first.items,again.items);
  assert.equal(first.comparison.chosen_item,item);assert.equal(first.comparison.notes,'Keep 日本語');
  assert.equal(await sql(`select count(*) from ga_private.roadmap_comparison_receipts where comparison_id='${comparison}'`),'1');
  const joined=data(await a.client.from('roadmap_comparisons')
   .select('*,items:roadmap_comparison_items!roadmap_comparison_items_comparison_id_fkey(*)').eq('id',comparison).single(),'Staged joined snapshot');
  assert.equal(joined.items[0].id,item);
 });
 await check('Roadmap comparison real JWT edits reject foreign owners and serialize conflicting versions',async()=>{
  denied(await b.client.rpc('ga_roadmap_edit_comparison',params),'Foreign comparison edit');
  denied(await client().rpc('ga_roadmap_edit_comparison',params),'Unsigned comparison edit');
  denied(await a.client.rpc('ga_roadmap_edit_comparison',{...params,p_patch:{weights:{price:1}},p_request_id:randomUUID()}),'Stale comparison','40001');
  const row=await current();
  const next=weight=>({...params,p_expected_updated_at:row.updated_at,p_patch:{weights:{price:weight}},p_request_id:randomUUID()});
  const [x,y]=await Promise.all([a.client.rpc('ga_roadmap_edit_comparison',next(1)),a.client.rpc('ga_roadmap_edit_comparison',next(2))]);
  assert.equal([x,y].filter(r=>!r.error).length,1);assert.equal([x,y].find(r=>r.error)?.error.code,'40001');
  const winner=data([x,y].find(r=>!r.error),'Winning comparison');
  assert.deepEqual((await current()).weights,winner.comparison.weights);
  const old=data(await a.client.rpc('ga_roadmap_edit_comparison',params),'Old comparison replay');
  assert.deepEqual(old.comparison,winner.comparison);
 });
 await check('Roadmap comparison audit failure rolls back preferences and preserves its original retry',async()=>{
  const before=await current(),change={...params,p_expected_updated_at:before.updated_at,p_patch:{chosen_item:null},p_request_id:randomUUID()};
  await sql(`create function fixture_comparison_receipt_failure() returns trigger language plpgsql as $$begin raise exception 'fixture audit failure';end;$$;
   create trigger fixture_comparison_receipt_failure before insert on ga_private.roadmap_comparison_receipts
   for each row execute function fixture_comparison_receipt_failure()`);
  denied(await a.client.rpc('ga_roadmap_edit_comparison',change),'Receipt failure','P0001');assert.deepEqual(await current(),before);
  await sql('drop trigger fixture_comparison_receipt_failure on ga_private.roadmap_comparison_receipts;drop function fixture_comparison_receipt_failure()');
  assert.equal(data(await a.client.rpc('ga_roadmap_edit_comparison',change),'Original retry').comparison.chosen_item,null);
 });
 await check('Roadmap comparison replay observes a committed pause and revoked verification',async()=>{
  const call=`select ga_roadmap_edit_comparison('${comparison}','${original.updated_at}','${JSON.stringify(params.p_patch)}','${request}')`;
  await withBlockedWriter(14,'update ga_private.roadmap_control set paused=true',`begin;${claim(a)}${call};commit;`,/comparison access denied/);
  denied(await a.client.rpc('ga_roadmap_edit_comparison',params),'Paused old retry');
  await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(15,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim(a)}${call};commit;`,/comparison access denied/);
  denied(await a.client.rpc('ga_roadmap_edit_comparison',params),'Revoked verification');
  await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
