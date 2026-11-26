import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAcceptanceDatabase,access,users } from './acceptance-fixture.mjs';
import { legacyFixture } from './shared-access-fixture.mjs';
import { eagleFixture,eagleCandidate,eagleId as id,eagleTables,eagleSeed } from './eagle-workspace-fixture.mjs';
const read=name=>readFile(new URL('../operations/general-apps/'+name,import.meta.url),'utf8');
const deny=f=>assert.rejects(f,e=>e.code==='42501');
async function snapshot(db) {
 await db.exec('reset role');const result={};
 for(const t of eagleTables) result[t]=(await db.query(`select to_jsonb(t) row from ${t} t order by id`)).rows;
 return result;
}
async function baseline() {
 const db=await createAcceptanceDatabase();
 try {
  await db.exec(legacyFixture);await db.exec(eagleFixture);await db.exec(eagleSeed);
  await db.exec(await read('01_access_foundation.sql'));
  await db.exec(`insert into authentication_mode_user_roles(id,email,role,auth_user_id) values
   (1,'viewer@example.invalid','viewer','${users.a}'),(2,'operator@example.invalid','operator','${users.b}'),
   (3,'admin@example.invalid','admin','${users.admin}'),(4,'other@example.invalid','admin','${users.fresh}');
   insert into ga_private.eagle_members values('${users.a}'),('${users.b}'),('${users.admin}');
   insert into ga_private.client_cutovers values('code-sensei','synthetic',now()),('healthlog-archive','synthetic',now()),('eagle','eagle-graph-v1:synthetic',now());`);
  await db.exec(await read('02_legacy_policy_guards.sql'));return db;
 } catch(e) {await db.close();throw e;}
}
test('Eagle workspace protects shared progress and the actual Logi graph',async t=>{
 const db=await baseline(),{as}=access(db);
 try {
  const before=await snapshot(db);await db.exec(eagleCandidate);assert.deepEqual(await snapshot(db),before);
  await t.test('verified viewers read; only explicit writers edit; unrelated shared admins have no access',async()=>{
   assert.equal((await as(users.a,'select ga_eagle_workspace_role() role')).rows[0].role,'viewer');
   assert.equal((await as(users.fresh,'select ga_eagle_workspace_role() role')).rows[0].role,null);
   assert.equal((await as(users.a,'select * from eagle_unit_progress')).rows[0].notes,'Retain progress 日本語');
   assert.equal((await as(users.fresh,'select * from eagle_unit_progress')).rows.length,0);
   await deny(()=>as(null,'select * from eagle_units'));
   assert.equal((await as(users.a,"update eagle_unit_progress set notes='forbidden' returning id")).rows.length,0);
   await deny(()=>as(users.a,`insert into eagle_units(assembly_id,name) values('${id(3)}','forbidden')`));
   for(const user of [users.b,users.admin]) await as(user,`update eagle_unit_progress set notes='Retain progress 日本語' where id='${id(17)}'`);
   await deny(()=>as(users.a,`insert into ga_private.eagle_members values('${users.fresh}')`));
   assert.equal((await as(users.a,"update authentication_mode_user_roles set role='admin' returning id")).rows.length,0);
  });
  await t.test('nonwriters cannot change linked parent rows, including RLS-hidden child cascades',async()=>{
   const saved=await snapshot(db);
   for(const user of [users.a,users.fresh,null]) for(const [table,key,column] of [
    ['logi_projects',1,'name'],['logi_assemblies',3,'name'],['logi_versions',6,'notes'],
    ['logi_nodes',9,'name'],['logi_links',13,'fastener'],['logi_revisions',14,'label']]) {
    await deny(()=>as(user,`update ${table} set ${column}='forbidden' where id='${id(key)}'`));
    await deny(()=>as(user,`delete from ${table} where id='${id(key)}'`));
   }
   assert.deepEqual(await snapshot(db),saved);
   // Preserve existing policies for graph rows not linked to Eagle.
   await as(users.fresh,`update logi_assemblies set description='Unlinked edit' where id='${id(5)}'`);
   await as(users.b,`update logi_nodes set name='Authorized node' where id='${id(9)}'`);
  });
  await t.test('graph writes reject mismatched assemblies and versions without discarding progress',async()=>{
   const saved=await snapshot(db);
   for(const sql of [
    `update eagle_units set version_id='${id(7)}' where id='${id(15)}'`,
    `update eagle_unit_progress set node_id='${id(10)}' where id='${id(17)}'`,
    `update eagle_unit_progress set node_id='${id(12)}' where id='${id(17)}'`,
    `update logi_nodes set assembly_id='${id(4)}' where id='${id(9)}'`,
    `update logi_versions set assembly_id='${id(4)}' where id='${id(6)}'`])
    await assert.rejects(()=>as(users.b,sql),e=>e.code==='23514');
   assert.deepEqual(await snapshot(db),saved);
   await as(users.b,`insert into eagle_unit_progress(unit_id,node_id,notes) values('${id(15)}','${id(11)}','Legacy optional version')`);
  });
  await t.test('TRUNCATE and trigger bypass are unavailable on the entire parent graph',async()=>{
   for(const table of eagleTables) {
    await deny(()=>as(users.b,`truncate ${table} cascade`));
    await db.exec('reset role');
    for(const p of ['TRUNCATE','TRIGGER','REFERENCES','MAINTAIN'])
     assert.equal((await db.query('select has_table_privilege($1,$2,$3) ok',['authenticated',table,p])).rows[0].ok,false);
   }
  });
  await t.test('anonymous and unverified identities are denied even with a membership row',async()=>{
   await db.exec(`reset role; select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   assert.equal((await as(users.b,'select * from eagle_units')).rows.length,0);
   await deny(()=>as(users.b,`update logi_nodes set name='forbidden' where id='${id(9)}'`));
   await db.exec(`reset role; select set_config('request.jwt.claims','{}',false);update auth.users set is_anonymous=true where id='${users.b}'`);
   assert.equal((await as(users.b,'select * from eagle_units')).rows.length,0);
   await db.exec(`reset role;update auth.users set is_anonymous=false,email_confirmed_at=null where id='${users.b}'`);
   assert.equal((await as(users.b,'select * from eagle_units')).rows.length,0);
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.b}'`);
  });
  await t.test('atomic delete preserves children on denial and retains the existing FK checks',async()=>{
   const saved=await snapshot(db);
   for(const user of [users.a,users.fresh,null])
    await deny(()=>as(user,'select ga_eagle_delete_project($1)',[id(1)]));
   await assert.rejects(()=>as(users.b,`delete from logi_nodes where id='${id(9)}'`),e=>e.code==='23503');
   // A referencing external FK can also deny the entire RPC without partial loss.
   await db.exec(`reset role;create table fixture_hold(assembly_id uuid references logi_assemblies);insert into fixture_hold values('${id(3)}')`);
   await assert.rejects(()=>as(users.b,'select ga_eagle_delete_project($1)',[id(1)]),e=>e.code==='23503');
   assert.deepEqual(await snapshot(db),saved);
   await db.exec('reset role;drop table fixture_hold');
   assert.equal((await as(users.b,'select ga_eagle_delete_assembly($1) removed',[id(3)])).rows[0].removed,id(3));
   assert.equal((await as(users.b,'select * from eagle_unit_progress')).rows.length,0);
   assert.equal((await as(users.admin,'select ga_eagle_delete_project($1) removed',[id(1)])).rows[0].removed,id(1));
   assert.equal((await as(users.admin,'select * from logi_assemblies')).rows.length,1);
  });
  await t.test('membership revocation hides remaining units with the existing identity',async()=>{
   await as(users.b,`insert into eagle_units(assembly_id,name) values('${id(5)}','Before revocation')`);
   await db.exec(`reset role;delete from ga_private.eagle_members where auth_user_id='${users.b}'`);
   assert.equal((await as(users.b,'select * from eagle_units')).rows.length,0);
   await deny(()=>as(users.b,`update logi_assemblies set name='revoked' where id='${id(5)}'`));
  });
 } finally {await db.close();}
});
test('Eagle candidate refuses missing evidence, changed schema, unexpected dependencies or inconsistent source data atomically',async t=>{
 for(const [label,change,error] of [
  ['evidence',"update ga_private.client_cutovers set evidence_ref='synthetic' where app='eagle'",/cutover evidence/],
  ['schema','alter table eagle_units add column unexpected text',/graph shape/],
  ['policy','drop policy ga_read_guard on eagle_units',/role policies/],
  ['registry',"create policy bad_write on authentication_mode_user_roles for update using(true)",/role administration/],
  ['dependency','create table unexpected_child(unit_id uuid references eagle_units)',/additional Eagle graph/],
  ['data',`update eagle_units set version_id='${id(7)}' where id='${id(15)}'`,/same assembly/]
 ]) await t.test(label,async()=>{
  const db=await baseline();try {
   // Candidate 02 also guards trusted SQL maintenance; supply its verified writer.
   await db.exec(`select set_config('request.jwt.claim.sub','${users.b}',false);${change}`);
   const before=await snapshot(db);
   await assert.rejects(()=>db.exec(eagleCandidate),error);await db.exec('rollback');
   assert.deepEqual(await snapshot(db),before);
   assert.equal((await db.query("select to_regclass('ga_private.eagle_graph_serial') value")).rows[0].value,null);
  } finally {await db.close();}
 });
});
