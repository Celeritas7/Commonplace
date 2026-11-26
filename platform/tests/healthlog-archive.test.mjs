import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAcceptanceDatabase, access, users } from './acceptance-fixture.mjs';
import { legacyFixture } from './shared-access-fixture.mjs';
const read = name => readFile(new URL('../operations/general-apps/'+name,import.meta.url),'utf8');
const candidate = await read('06_healthlog_archive.sql');
const fixture = await readFile(new URL('./healthlog-archive-fixture.sql',import.meta.url),'utf8');
const id = n => '60000000-0000-4000-8000-'+String(n).padStart(12,'0');
const tables=['healthlog_clinics_old','healthlog_visits_old','healthlog_medicines_old','healthlog_dose_logs_old'];
const deny = f => assert.rejects(f,e=>e.code==='42501');
async function snapshot(db) {
 await db.exec('reset role');
 const result={};
 for(const table of tables) result[table]=(await db.query(`select to_jsonb(t) row from ${table} t order by to_jsonb(t)::text`)).rows;
 return result;
}
async function baseline() {
 const db=await createAcceptanceDatabase();
 try {
  await db.exec(legacyFixture); await db.exec(fixture);
  await db.exec(`insert into code_sensei_users values('${id(90)}','Synthetic');
   insert into authentication_mode_user_roles(id,email,role,auth_user_id) values(1,'b@example.invalid','operator','${users.b}');
   insert into healthlog_clinics_old(id,user_id,name,phone,address) values
    ('${id(1)}','clinic-only-a','Clinic A','fictional','Synthetic A'),('${id(2)}','old-b','Clinic B',null,null);
   insert into healthlog_visits_old(id,user_id,clinic_id,clinic_name,visit_date,concern,notes,cost_consult) values
    ('${id(3)}','old-a','${id(1)}','Clinic A','2026-01-01','Synthetic concern','Retain A 日本語',12.34),
    ('${id(4)}','old-b','${id(2)}','Clinic B','2026-01-02','Synthetic concern','Retain B',56.78),
    ('${id(7)}','${users.b}',null,'Archived clinic','2026-01-03','Synthetic','UUID-looking key belongs to A',0);
   insert into healthlog_medicines_old(id,visit_id,name,dose,name_verified,name_verified_at) values
    ('${id(5)}','${id(3)}','Synthetic A','test only',true,'2026-01-01'),('${id(6)}','${id(4)}','Synthetic B',null,false,null);
   insert into healthlog_dose_logs_old values('dose-only-a','${id(5)}','2026-01-01','morning',false,'2026-01-01'),
    ('old-b','${id(6)}','2026-01-02','night',true,'2026-01-02');
   -- Reduced current-client control: separate UUID table, owner policy and view.
   create table healthlog_visits(id uuid primary key,user_id uuid not null,local_id text,notes text);
   alter table healthlog_visits enable row level security;
   create policy current_owner on healthlog_visits for all using(user_id=auth.uid()) with check(user_id=auth.uid());
   create view healthlog_visit_totals with (security_invoker=true) as select * from healthlog_visits;
   grant select on healthlog_visit_totals to authenticated;
   insert into healthlog_visits values('${id(80)}','${users.a}','local-a','Current A'),('${id(81)}','${users.b}','local-b','Current B');`);
  await db.exec(await read('01_access_foundation.sql'));
  await db.exec(`insert into ga_private.owner_links(app,legacy_id,auth_user_id) values
   ('code-sensei','${id(90)}','${users.a}'),('healthlog-archive','old-a','${users.a}'),
   ('healthlog-archive','clinic-only-a','${users.a}'),('healthlog-archive','dose-only-a','${users.a}'),
   ('healthlog-archive','${users.b}','${users.a}'),('healthlog-archive','old-b','${users.b}');
   insert into ga_private.eagle_members values('${users.b}');
   insert into ga_private.client_cutovers values('code-sensei','synthetic',now()),('healthlog-archive','synthetic',now()),('eagle','synthetic',now());`);
  await db.exec(await read('02_legacy_policy_guards.sql'));
  return db;
 } catch(e) { await db.close(); throw e; }
}

test('HealthLog full archive preserves history and isolates verified owners',async t=>{
 const db=await baseline(),{as}=access(db);
 try {
  const before=await snapshot(db);
  // Reproduce the gap left by candidate 02: anonymous access to sibling tables.
  assert.equal((await as(null,'select * from healthlog_medicines_old')).rows.length,2);
  await db.exec('reset role'); await db.exec(candidate);
  assert.deepEqual(await snapshot(db),before);
  for(const table of tables) await t.test(table+' denies anonymous, unrelated accounts and all browser writes',async()=>{
   const a=(await as(users.a,`select * from ${table}`)).rows;
   const b=(await as(users.b,`select * from ${table}`)).rows;
   assert.equal(a.length,table==='healthlog_visits_old'?2:1);assert.equal(b.length,1);
   assert.equal((await as(users.fresh,`select * from ${table}`)).rows.length,0);
   assert.equal((await as(users.admin,`select * from ${table}`)).rows.length,0);
   await deny(()=>as(null,`select * from ${table}`));
   await deny(()=>as(users.a,`delete from ${table}`));
   await deny(()=>as(users.a,`update ${table} set ${table==='healthlog_medicines_old'?'name=name':'user_id=user_id'}`));
   await deny(()=>as(users.a,`insert into ${table} select * from ${table}`));
   for(const privilege of ['TRUNCATE','TRIGGER','REFERENCES','MAINTAIN']) {
    await db.exec('reset role');
    assert.equal((await db.query('select has_table_privilege($1,$2,$3) ok',['authenticated',table,privilege])).rows[0].ok,false);
   }
  });
  await t.test('multiple original keys and UUID-shaped text are mapped without casting or rewriting',async()=>{
   assert.deepEqual((await as(users.a,'select user_id from healthlog_visits_old order by user_id')).rows.map(r=>r.user_id),[users.b,'old-a']);
   assert.equal((await as(users.a,'select user_id from healthlog_clinics_old')).rows[0].user_id,'clinic-only-a');
   assert.equal((await as(users.a,'select user_id,taken from healthlog_dose_logs_old')).rows[0].taken,false);
   await deny(()=>as(users.a,"update ga_private.owner_links set auth_user_id=$1",[users.a]));
   await db.exec('reset role');
   await assert.rejects(()=>db.query("insert into ga_private.owner_links values('healthlog-archive','does-not-exist',$1)",[users.a]),/source key/);
  });
  await t.test('read-only policies remain effective if browser DML grants are accidentally restored',async()=>{
   await db.exec('reset role; grant insert,update,delete on healthlog_visits_old to authenticated');
   assert.equal((await as(users.a,"update healthlog_visits_old set notes='bad' returning id")).rows.length,0);
   assert.equal((await as(users.a,'delete from healthlog_visits_old returning id')).rows.length,0);
   await deny(()=>as(users.a,"insert into healthlog_visits_old(user_id,clinic_name,visit_date,concern) values('old-a','x','2026-01-01','x')"));
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('current UUID table and view retain their original owner read/write contract',async()=>{
   assert.equal((await as(users.a,'select * from healthlog_visit_totals')).rows[0].notes,'Current A');
   await as(users.a,"update healthlog_visits set notes='Edited A' where local_id='local-a'");
   assert.equal((await as(users.b,'select * from healthlog_visits')).rows[0].notes,'Current B');
   await deny(()=>as(users.b,"insert into healthlog_visits values($1,$2,'forged','x')",[id(82),users.a]));
  });
  await t.test('mapping revocation, unverified accounts and anonymous JWTs immediately hide the whole graph',async()=>{
   await db.exec(`reset role; delete from ga_private.owner_links where app='healthlog-archive' and auth_user_id='${users.a}'`);
   for(const table of tables) assert.equal((await as(users.a,`select * from ${table}`)).rows.length,0);
   await db.exec(`reset role; update auth.users set email_confirmed_at=null where id='${users.b}'`);
   for(const table of tables) assert.equal((await as(users.b,`select * from ${table}`)).rows.length,0);
   await db.exec(`reset role; update auth.users set email_confirmed_at=now() where id='${users.b}'; select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   for(const table of tables) assert.equal((await as(users.b,`select * from ${table}`)).rows.length,0);
   assert.deepEqual(await snapshot(db),before);
  });
 }finally{await db.close();}
});

test('HealthLog installer refuses drift or incomplete ownership atomically',async t=>{
 const db=await baseline();
 const cases=[
  ['missing consumer evidence',"delete from ga_private.client_cutovers where app='healthlog-archive'",/consumer evidence/],
  ['future consumer evidence',"update ga_private.client_cutovers set verified_at=now()+interval '1 day' where app='healthlog-archive'",/consumer evidence/],
  ['clinic-only mapping missing',"delete from ga_private.owner_links where legacy_id='clinic-only-a'",/mappings required/],
  ['dose-only mapping missing',"delete from ga_private.owner_links where legacy_id='dose-only-a'",/mappings required/],
  ['unverified owner',`update auth.users set email_confirmed_at=null where id='${users.a}'`,/mappings required/],
  ['anonymous owner',`update auth.users set is_anonymous=true where id='${users.a}'`,/mappings required/],
  ['cross-owner clinic',`update healthlog_visits_old set clinic_id='${id(2)}' where id='${id(3)}'`,/cross-owner/],
  ['cross-owner dose',`update healthlog_dose_logs_old set medicine_id='${id(6)}' where user_id='dose-only-a'`,/cross-owner/],
  ['extra policy','create policy unexpected on healthlog_clinics_old using(true)',/policies/],
  ['changed column','alter table healthlog_clinics_old add column unexpected text',/shape/],
  ['constraint drift','alter table healthlog_medicines_old drop constraint healthlog_medicines_visit_id_fkey',/constraints/],
  ['extra archive','create table healthlog_unknown_old(id integer)',/additional/],
  ['archive view','create view healthlog_archive_leak as select * from healthlog_medicines_old',/archive views/],
  ['archive materialized view','create materialized view healthlog_archive_leak as select * from healthlog_medicines_old',/archive views/],
  ['archive RPC',"create function public.archive_leak() returns setof healthlog_medicines_old language sql security definer as $$select * from healthlog_medicines_old$$",/archive routines/],
  ['external cascade','create table external_parent(id uuid primary key,visit_id uuid references healthlog_visits_old on delete cascade)',/external/],
  ['column privileges','grant update(phone) on healthlog_clinics_old to authenticated',/column grants/],
  ['inherited privileges','create role archive_reader; grant archive_reader to anon; grant select on healthlog_clinics_old to archive_reader',/unexpected effective/],
  ['helper drift',"create or replace function ga_private.owns_legacy(app_name text,legacy_owner text) returns boolean language sql stable security definer set search_path='' as $$select true$$",/foundation drift/],
 ];
 try {
  for(const [name,change,expected] of cases) await t.test(name,async()=>{
   // Put the fixture perturbation and candidate into one rollback-only transaction.
   await db.exec('begin');
   try { await db.exec(change); await assert.rejects(()=>db.exec(candidate.replace(/^begin;$/m,'').replace(/^commit;$/m,'')),expected); }
   finally { await db.exec('rollback'); }
   assert.equal((await db.query("select count(*)::int n from pg_policies where policyname like 'ha_%'")).rows[0].n,0);
   assert.equal((await db.query("select has_table_privilege('anon','healthlog_clinics_old','SELECT') ok")).rows[0].ok,true);
  });
  await db.exec(candidate);
 }finally{await db.close();}
});
