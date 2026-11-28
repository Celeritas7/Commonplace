import {test} from 'node:test';import assert from 'node:assert/strict';
import {writerFixture,enableWriters,writerApi,documentTarget as doc,placeTarget as place,placeChange,id,access,users,readCandidate} from './roadmap-shared-writer-support.mjs';
async function fixture(work){const db=await writerFixture();try{await enableWriters(db);await work(db,writerApi(db))}finally{await db.close()}}
const denied=(work,code='42501')=>assert.rejects(work,e=>e.code===code);
async function count(db){await db.exec('reset role');return (await db.query('select count(*)::int n from ga_private.roadmap_shared_receipts')).rows[0].n}

test('shared writers default deny; owner/source gates and private receipts are independent',async()=>{
 const db=await writerFixture();try{await denied(()=>writerApi(db).read(doc));await denied(()=>writerApi(db,null).read(doc));await enableWriters(db);
  const api=writerApi(db),saved=await api.write(doc,null,{op:'put',value:{note:'Keep private 日本語'}});assert.equal(saved.current.record.user_id,users.a);
  await denied(()=>writerApi(db,users.b).read(doc));await enableWriters(db,users.b);assert.equal((await writerApi(db,users.b).read(doc)).record,null);
  await denied(()=>access(db).as(users.a,'select * from ga_private.roadmap_shared_receipts'));
  await denied(()=>access(db).as(users.a,'insert into ga_private.roadmap_shared_access values($1,\'place\',\'\',\'\',true,\'client\')',[users.a]));
 }finally{await db.close()}
});
test('document stale writes preserve nested newer values; lost response replays never rewrite current data',async()=>fixture(async(db,api)=>{
 const first=await api.write(doc,null,{op:'put',value:{nested:{keep:'first'},a:[1,2]}});
 const change={op:'put',value:{nested:{keep:'newer'},a:[3,4]}};
 const newer=await api.write(doc,first.current.revision,change,id(2));
 const conflict=await api.write(doc,first.current.revision,{op:'put',value:{old:true}},id(3));assert.equal(conflict.status,'conflict');assert.deepEqual(conflict.current,newer.current);assert.equal(await count(db),2);
 const replay=await api.write(doc,null,{op:'put',value:{nested:{keep:'first'},a:[1,2]}});assert.equal(replay.replayed,true);assert.equal(replay.applied_revision,first.applied_revision);assert.deepEqual(replay.current,newer.current);
 await denied(()=>api.write(doc,null,{op:'put',value:'changed'}),'22023');assert.deepEqual(await api.read(doc),newer.current);
}));
test('absent removal leaves a tombstone and exact retries cannot resurrect or remove a later document',async()=>fixture(async(db,api)=>{
 const removed=await api.write(doc,null,{op:'remove'});assert.ok(removed.current.record.deleted_at);
 assert.equal((await api.write(doc,null,{op:'put',value:'stale'},id(2))).status,'conflict');
 const renewed=await api.write(doc,removed.current.revision,{op:'put',value:'reviewed'},id(3));
 const replay=await api.write(doc,null,{op:'remove'});assert.deepEqual(replay.current,renewed.current);assert.equal(replay.current.record.deleted_at,null);
 assert.equal(await count(db),2);
}));
test('legacy document edits are included in the whole-row version; a different document writer is refused',async()=>fixture(async(db,api)=>{
 const first=await api.write(doc,null,{op:'put',value:{old:true}});
 await access(db).as(users.a,"update akatsuki_state set value='{\"manual\":true}',updated_by='rm' where doc='task_tags'");
 assert.equal((await api.write(doc,first.current.revision,{op:'remove'},id(2))).status,'conflict');
 await db.exec("reset role;alter table akatsuki_state disable trigger akatsuki_state_guard;update akatsuki_state set owner_app='wf';alter table akatsuki_state enable trigger akatsuki_state_guard");
 await denied(()=>api.read(doc));await denied(()=>api.write(doc,null,{op:'put',value:{old:true}}));
}));
test('place edits preserve stable identity, original aliases, coordinates and retirement; restore requires its own reviewed version',async()=>fixture(async(db,api)=>{
 const first=await api.write(place,null,placeChange);await db.exec("reset role;update akatsuki_places set lat=35.9,lng=139.6,radius_m=80");
 assert.equal((await api.write(place,first.current.revision,{op:'edit',patch:{label:'stale'}},id(2))).status,'conflict');
 const read=await api.read(place),edited=await api.write(place,read.revision,{op:'edit',patch:{label:'New cafe',aliases:['Cafe'],ord:3}},id(3));
 assert.equal(edited.current.record.id,place.id);assert.equal(edited.current.record.lat,35.9);assert.equal(edited.current.record.radius_m,80);assert.ok(edited.current.record.aliases.includes(placeChange.label));
 const retired=await api.write(place,edited.current.revision,{op:'retire'},id(4));assert.ok(retired.current.record.retired_at);
 assert.deepEqual((await api.write(place,null,placeChange)).current,retired.current);
 assert.equal((await api.write(place,edited.current.revision,{op:'restore'},id(5))).status,'conflict');
 const restored=await api.write(place,retired.current.revision,{op:'restore'},id(6));assert.equal(restored.current.record.retired_at,null);assert.equal(restored.current.record.lat,35.9);
}));
test('place label/alias collisions roll back without reviving a retired place or consuming a receipt',async()=>fixture(async(db,api)=>{
 const first=await api.write(place,null,placeChange);const retired=await api.write(place,first.current.revision,{op:'retire'},id(2));
 await api.write({kind:'place',id:'second'},null,{...placeChange,label:'Another cafe',aliases:[placeChange.label]},id(3));
 await denied(()=>api.write(place,retired.current.revision,{op:'restore'},id(4)),'23505');assert.deepEqual(await api.read(place),retired.current);assert.equal(await count(db),3);
}));
test('removed place on receipt replay remains missing; no retry recreates a deleted row',async()=>fixture(async(db,api)=>{
 const saved=await api.write(place,null,placeChange);await db.exec('reset role;delete from akatsuki_places');
 const replay=await api.write(place,null,placeChange);assert.equal(replay.replayed,true);assert.equal(replay.applied_revision,saved.applied_revision);assert.equal(replay.current.record,null);
}));
test('unknown operations, coordinate patches, invalid classes and oversized changes cannot write',async()=>fixture(async(db,api)=>{
 for(const change of [{...placeChange,class:null},{...placeChange,class:'unknown'},{...placeChange,aliases:[null]},{...placeChange,ord:1.5},{...placeChange,label:''}])await denied(()=>api.write(place,null,change),'22023');
 const created=await api.write(place,null,placeChange);
 for(const patch of [{lat:35.1},{id:'different'},{aliases:{}},{label:null},{ord:null}])await denied(()=>api.write(place,created.current.revision,{op:'edit',patch},id(2)),'22023');
 await denied(()=>api.write(doc,null,{op:'put',value:'x'.repeat(40000)},id(3)),'22023');
 await denied(()=>api.read({...doc,doc:'another-app'}),'22023');await denied(()=>api.write(doc,null,{op:'remove',value:'extra'},id(3)),'22023');
 assert.equal(await count(db),1);
}));
test('gate, verified identity and pause revocation also refuse original receipt replay',async()=>fixture(async(db,api)=>{
 await api.write(doc,null,{op:'put',value:'keep'});
 for(const [revoke,restore] of [
  ['update ga_private.roadmap_shared_access set enabled=false','update ga_private.roadmap_shared_access set enabled=true'],
  [`update auth.users set email_confirmed_at=null where id='${users.a}'`,`update auth.users set email_confirmed_at=now() where id='${users.a}'`],
  ['update ga_private.roadmap_control set paused=true','update ga_private.roadmap_control set paused=false']]){
  await db.exec('reset role;'+revoke);await denied(()=>api.write(doc,null,{op:'put',value:'keep'}));await db.exec('reset role;'+restore);
 }
 assert.equal((await api.write(doc,null,{op:'put',value:'keep'})).replayed,true);
}));
test('receipt failure rolls the document/place write back and the original request remains usable',async()=>fixture(async(db,api)=>{
 await db.exec('reset role;create function fixture_shared_fail() returns trigger language plpgsql as $$begin return null;end$$;create trigger fixture_shared_fail before insert on ga_private.roadmap_shared_receipts for each row execute function fixture_shared_fail()');
 for(const [target,change] of [[doc,{op:'put',value:'keep'}],[place,placeChange]]){await denied(()=>api.write(target,null,change),'40001');assert.equal((await api.read(target)).record,null)}
 await db.exec('reset role;drop trigger fixture_shared_fail on ga_private.roadmap_shared_receipts');assert.equal((await api.write(doc,null,{op:'put',value:'keep'})).status,'saved');
}));
test('unexpected after-image changes and unsafe sequence values roll back before a receipt is committed',async()=>fixture(async(db,api)=>{
 await db.exec("reset role;create function fixture_shared_corrupt() returns trigger language plpgsql as $$begin new.value:='\"unexpected\"';return new;end$$;create trigger z_shared_corrupt before insert or update on akatsuki_state for each row execute function fixture_shared_corrupt()");
 await denied(()=>api.write(doc,null,{op:'put',value:'keep'}),'40001');assert.equal((await api.read(doc)).record,null);assert.equal(await count(db),0);
 await db.exec("reset role;drop trigger z_shared_corrupt on akatsuki_state;select setval('akatsuki_seq',9007199254740991)");
 await denied(()=>api.write(doc,null,{op:'put',value:'keep'}),'22023');assert.equal((await api.read(doc)).record,null);assert.equal(await count(db),0);
}));
test('catalog/policy/function drift aborts the entire installation without changing the original trigger',async()=>{
 for(const drift of ["alter table akatsuki_places add column unexpected text","create policy bad on akatsuki_places for update to authenticated using(true)","alter function akatsuki_state_guard() set search_path=public"]){
  const db=await writerFixture(false);try{await db.exec(drift);await assert.rejects(async()=>db.exec(await readCandidate('23_roadmap_shared_writers.sql')));await db.exec('rollback');
   assert.equal((await db.query("select to_regclass('ga_private.roadmap_shared_receipts') r")).rows[0].r,null);
  }finally{await db.close()}
 }
});
test('containment revokes shared read/write without removing documents, places or receipts',async()=>fixture(async(db,api)=>{
 await api.write(doc,null,{op:'put',value:'keep'});await db.exec('reset role;create table cp_private.signup_control(id boolean primary key,enabled boolean);insert into cp_private.signup_control values(true,false)');await db.exec(await readCandidate('90_containment.sql'));
 await denied(()=>api.read(doc));await denied(()=>api.write(doc,null,{op:'put',value:'keep'}));assert.equal(await count(db),1);
 assert.equal((await db.query('select value from akatsuki_state')).rows[0].value,'keep');
}));
