import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
// Disposable local PostgreSQL/Auth only, through the existing guarded runner.
export async function roadmapSharedWritersAcceptance({a,b,sql,check,data,denied,withBlockedWriter,pause}){
 const target={kind:'document',doc:'task_tags',path:'rm',key:'synthetic-shared-writer'},place={kind:'place',id:'synthetic-shared-cafe'};
 const request=randomUUID(),change={op:'put',value:{nested:{note:'Keep 日本語'}}};let first,latest,placeSaved;
 const read=(t,actor=a)=>actor.client.rpc('ga_roadmap_shared_read',{p_target:t});
 const write=(t,revision,c,id=randomUUID(),actor=a)=>actor.client.rpc('ga_roadmap_shared_write',{p_target:t,p_expected_revision:revision,p_change:c,p_request_id:id});
 const lit=x=>"'"+String(typeof x==='object'?JSON.stringify(x):x).replaceAll("'","''")+"'";
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 await check('Shared writer gates deny by default; concurrent exact retries save one document and receipt',async()=>{
  await sql(await readFile(new URL('../tests/roadmap-shared-writer-fixture.sql',import.meta.url),'utf8'));
  await sql(await readFile(new URL('../operations/general-apps/23_roadmap_shared_writers.sql',import.meta.url),'utf8'));
  let ready=false;for(let n=0;n<30;n++){if((await read(target)).error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  await sql(`insert into ga_private.roadmap_shared_access values('${a.id}','document','task_tags','rm',true,'Synthetic review'),('${a.id}','place','','',true,'Synthetic review')`);
  const replies=await Promise.all([write(target,null,change,request),write(target,null,change,request)]);assert.deepEqual(replies.map(r=>data(r,'Concurrent shared write').replayed).sort(),[false,true]);
  first=data(replies[0],'Saved shared change');assert.equal(await sql(`select count(*) from ga_private.roadmap_shared_receipts where auth_user_id='${a.id}'`),'1');
  denied(await read(target,b),'Foreign shared read');
 });
 await check('Competing shared versions preserve the winning nested value; lost replies return current state',async()=>{
  const replies=await Promise.all([write(target,first.current.revision,{op:'put',value:{nested:{note:'A'}}}),write(target,first.current.revision,{op:'put',value:{nested:{note:'B'}}})]);
  assert.deepEqual(replies.map(r=>data(r,'Competing shared writes').status).sort(),['conflict','saved']);latest=data(await read(target),'Current shared value');
  const replay=data(await write(target,null,change,request),'Original shared retry');assert.equal(replay.replayed,true);assert.deepEqual(replay.current,latest);assert.equal(replay.applied_revision,first.applied_revision);
 });
 await check('Place versions retain coordinates and names through edit and retirement; stale restore cannot revive them',async()=>{
  placeSaved=data(await write(place,null,{op:'create',label:'Synthetic Quiet Cafe',class:'cafe',aliases:[],ord:100}),'New place');
  await sql(`update akatsuki_places set lat=35.9,lng=139.6,radius_m=80 where user_id='${a.id}' and id=${lit(place.id)}`);
  assert.equal(data(await write(place,placeSaved.current.revision,{op:'retire'}),'Stale place retirement').status,'conflict');
  const current=data(await read(place),'Place version');const edited=data(await write(place,current.revision,{op:'edit',patch:{label:'Renamed Cafe'}}),'Place edit');
  assert.equal(edited.current.record.lat,35.9);assert.ok(edited.current.record.aliases.includes('Synthetic Quiet Cafe'));
  const retired=data(await write(place,edited.current.revision,{op:'retire'}),'Place retirement');assert.ok(retired.current.record.retired_at);
  assert.equal(data(await write(place,edited.current.revision,{op:'restore'}),'Stale restore').status,'conflict');
 });
 await check('Shared receipt failure rolls back mutations and the unchanged draft can be retried',async()=>{
  await sql('create function fixture_shared_receipt_fail() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_shared_receipt_fail before insert on ga_private.roadmap_shared_receipts for each row execute function fixture_shared_receipt_fail()');
  const id=randomUUID();denied(await write(target,latest.revision,{op:'remove'},id),'Failed shared receipt','40001');assert.deepEqual(data(await read(target),'Unchanged document'),latest);
  await sql('drop trigger fixture_shared_receipt_fail on ga_private.roadmap_shared_receipts;drop function fixture_shared_receipt_fail()');
  const removed=data(await write(target,latest.revision,{op:'remove'},id),'Retried removal');assert.ok(removed.current.record.deleted_at);latest=removed.current;
 });
 await check('Shared writers observe legacy edits, revocation, verification and pause committed during lock waits',async()=>{
  const args=`${lit(target)}::jsonb,${lit(latest.revision)},${lit({op:'put',value:'stale'})}::jsonb,'${randomUUID()}'::uuid`;
  const conflict=`begin;${claim}do $$begin if public.ga_roadmap_shared_write(${args})->>'status'='conflict' then raise exception 'observed shared conflict';end if;end$$;commit;`;
  await withBlockedWriter(67,`update akatsuki_state set value='{"legacy":"kept"}',updated_by='rm' where user_id='${a.id}' and doc='task_tags' and item_key=${lit(target.key)}`,conflict,/observed shared conflict/);
  const call=`begin;${claim}select ga_roadmap_shared_write(${lit(target)}::jsonb,null,${lit(change)}::jsonb,'${request}'::uuid);commit;`;
  await withBlockedWriter(68,`update ga_private.roadmap_shared_access set enabled=false where auth_user_id='${a.id}'`,call,/shared writer review required/);
  await sql(`update ga_private.roadmap_shared_access set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(69,`update auth.users set email_confirmed_at=null where id='${a.id}'`,call,/shared access denied/);
  await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
  await withBlockedWriter(70,'update ga_private.roadmap_control set paused=true',call,/shared access denied/);await sql('update ga_private.roadmap_control set paused=false');
  assert.equal(data(await read(target),'Latest legacy document').record.value.legacy,'kept');
 });
}
