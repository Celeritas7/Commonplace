// Invoked only inside full-stack.mjs's guarded disposable local Supabase stack.
import assert from 'node:assert/strict';
import { eagleCandidate,eagleSeed,eagleTables,eagleId as id } from '../tests/eagle-workspace-fixture.mjs';
export async function eagleWorkspaceAcceptance({a,b,unregistered,owner,sql,check,client,data,denied,withBlockedWriter,pause}) {
 const claim=user=>`set local role authenticated;select set_config('request.jwt.claim.sub','${user.id}',true);
  select set_config('request.jwt.claims','{"sub":"${user.id}","role":"authenticated","is_anonymous":false}',true);`;
 const snapshot=async()=>Object.fromEntries(await Promise.all(eagleTables.map(async table=>[table,
  await sql(`select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from public.${table} t`)])));
 await check('Eagle exact graph cutover preserves saved progress and waits for membership evidence',async()=>{
  // Candidate 02 also requires a writer JWT for trusted maintenance updates.
  await sql(`begin;select set_config('request.jwt.claim.sub','${b.id}',true);${eagleSeed}commit;`);
  const before=await snapshot();
  await sql("update ga_private.client_cutovers set evidence_ref='eagle-graph-v1:synthetic-local' where app='eagle'");
  await withBlockedWriter(7,"update ga_private.client_cutovers set evidence_ref='not-reviewed' where app='eagle'",eagleCandidate,/cutover evidence/);
  assert.deepEqual(await snapshot(),before);
  await sql("update ga_private.client_cutovers set evidence_ref='eagle-graph-v1:synthetic-local' where app='eagle'");
  await sql(eagleCandidate);assert.deepEqual(await snapshot(),before);
  for(let i=0;i<30;i++) {
   const r=await b.client.rpc('ga_eagle_delete_project',{target_id:id(99)});
   if(r.error?.code==='42501') return;
   await pause(100);
  }
  throw Error('Eagle RPC schema did not reload');
 });
 await check('Eagle real JWT roles protect linked Logi rows and reject mismatched progress',async()=>{
  assert.equal(data(await a.client.rpc('ga_eagle_workspace_role'),'Viewer role'),'viewer');
  assert.equal(data(await unregistered.client.rpc('ga_eagle_workspace_role'),'Unlisted role'),null);
  assert.equal(data(await a.client.from('eagle_unit_progress').select('*').eq('id',id(17)),'Eagle viewer')[0].actual_min,42);
  assert.deepEqual(data(await unregistered.client.from('eagle_units').select('*'),'Unlisted shared admin'),[]);
  denied(await client().from('eagle_unit_progress').select('*'),'Anonymous Eagle');
  const before=await snapshot();
  for(const actor of [a,unregistered]) {
   denied(await actor.client.from('logi_nodes').update({name:'forbidden'}).eq('id',id(9)),'Indirect node write');
   denied(await actor.client.rpc('ga_eagle_delete_project',{target_id:id(1)}),'Atomic project denial');
  }
  denied(await b.client.from('eagle_unit_progress').update({node_id:id(10)}).eq('id',id(17)),'Wrong assembly');
  denied(await b.client.from('eagle_units').update({version_id:id(7)}).eq('id',id(15)),'Wrong version');
  assert.deepEqual(await snapshot(),before);
  assert.equal(data(await b.client.from('eagle_unit_progress').update({notes:'Authorized edit'}).eq('id',id(17)).select('*'),'Operator edit')[0].actual_min,42);
 });
 await check('Eagle graph serialization blocks concurrent parent corruption and stale snapshots',async()=>{
  await sql(`insert into logi_nodes(id,assembly_id,name) values('${id(19)}','${id(5)}','Concurrent node')`);
  await withBlockedWriter(8,`${claim(b)}insert into eagle_units(id,assembly_id,name) values('${id(18)}','${id(5)}','Concurrent unit')`,
   `begin;${claim(unregistered)}update logi_nodes set name='forbidden' where id='${id(19)}';commit;`,/Eagle writer required/);
  assert.equal(await sql(`select name from logi_nodes where id='${id(19)}'`),'Concurrent node');
  await withBlockedWriter(9,`${claim(b)}update eagle_units set notes='First transaction' where id='${id(18)}'`,
   `begin isolation level repeatable read;${claim(b)}select count(*) from eagle_units;
    update logi_nodes set name='stale write' where id='${id(19)}';commit;`,/could not serialize/);
  assert.equal(await sql(`select name from logi_nodes where id='${id(19)}'`),'Concurrent node');
 });
 await check('Eagle atomic deletion and node archival preserve records on any refused step',async()=>{
  const before=await snapshot();
  await sql(`create table fixture_eagle_hold(assembly_id uuid references logi_assemblies);insert into fixture_eagle_hold values('${id(3)}')`);
  denied(await b.client.rpc('ga_eagle_delete_project',{target_id:id(1)}),'Parent FK refusal');
  assert.deepEqual(await snapshot(),before);
  await sql('drop table fixture_eagle_hold');
  // A failed second step must restore the links removed by the first step.
  await sql(`create function fixture_refuse_node() returns trigger language plpgsql as $$begin raise exception 'fixture refusal';end;$$;
   create trigger fixture_refuse_node before update on logi_nodes for each row execute function fixture_refuse_node()`);
  denied(await b.client.rpc('ga_eagle_archive_node',{target_id:id(9)}),'Node refusal');
  assert.deepEqual(await snapshot(),before);
  await sql('drop trigger fixture_refuse_node on logi_nodes;drop function fixture_refuse_node()');
  assert.equal(data(await b.client.rpc('ga_eagle_archive_node',{target_id:id(9)}),'Node archive'),id(9));
  assert.equal(data(await b.client.from('eagle_unit_progress').select('*').eq('id',id(17)),'Preserved node progress')[0].actual_min,42);
  assert.equal(data(await b.client.rpc('ga_eagle_delete_assembly',{target_id:id(3)}),'Assembly delete'),id(3));
  assert.equal(data(await owner.client.rpc('ga_eagle_delete_project',{target_id:id(1)}),'Project delete'),id(1));
 });
 await check('Eagle concurrent revocation denies an existing JWT without touching saved records',async()=>{
  const before=await snapshot();
  await withBlockedWriter(10,`delete from ga_private.eagle_members where auth_user_id='${b.id}'`,
   `begin;${claim(b)}update logi_nodes set name='revoked' where id='${id(19)}';commit;`,/Eagle writer required/);
  assert.deepEqual(data(await b.client.from('eagle_units').select('*'),'Revoked session'),[]);
  denied(await b.client.rpc('ga_eagle_delete_project',{target_id:id(2)}),'Revoked delete');
  assert.deepEqual(await snapshot(),before);
 });
}
