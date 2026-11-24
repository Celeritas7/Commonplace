import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const owner='10000000-0000-4000-8000-000000000001', a='10000000-0000-4000-8000-000000000002', b='10000000-0000-4000-8000-000000000003', unverified='10000000-0000-4000-8000-000000000004';
test('PostgreSQL authorization matrix (isolated; auth.uid fixture, no hosted calls)', async t => {
 const db=new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create role service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
 alter default privileges grant execute on functions to anon,authenticated,service_role;
 create schema auth; create table auth.users(id uuid primary key, email_confirmed_at timestamptz, email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users values('${owner}',now(),'owner@example.invalid'),('${a}',now(),'a@example.invalid'),('${b}',now(),'b@example.invalid'),('${unverified}',null,'unverified@example.invalid');`);
 for (const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort()) await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 const as=async(user,sql)=>{
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
  await db.exec(`set role ${user?'authenticated':'anon'}`);
  return db.query(sql);
 };
 const scalar=async(user,sql)=>(await as(user,sql)).rows[0].n;
 const denied=async(user,sql,code='42501')=>assert.rejects(()=>as(user,sql),e=>e.code===code);
 await t.test('bootstrap requires verified UUID and cannot be called anonymously or by learners',async()=>{
  await denied(null,`select cp_private.bootstrap_owner('${owner}')`);
  await denied(a,`select cp_private.bootstrap_owner('${a}')`);
  await db.exec('reset role');
  await assert.rejects(()=>db.exec(`select cp_private.bootstrap_owner('${unverified}')`),/verified/);
  await db.exec(`select cp_private.bootstrap_owner('${owner}')`);
  await assert.rejects(()=>db.exec(`select cp_private.bootstrap_owner('${a}')`),/already bootstrapped/);
 });
 await t.test('anonymous denied and signup has zero access by default',async()=>{
  await denied(null,'select * from public.cp_sections');
  await denied(null,`select public.cp_set_learner('${a}','active','A')`);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_sections'),0);
  await as(owner,`select public.cp_set_learner('${a}','active','A')`);
  await as(owner,`select public.cp_set_learner('${b}','active','B')`);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_sections'),0);
  await denied(owner,`select public.cp_set_learner('${unverified}','active','X')`,'22023');
 });
 await t.test('no self promotion, direct grant writes, admin mutation, or audit forgery',async()=>{
  await denied(a,`update public.cp_memberships set role='administrator' where user_id='${a}'`);
  await denied(a,`select public.cp_set_learner('${b}','revoked','B')`);
  await denied(a,`select public.cp_set_section_grant('${a}','coding.python','allow')`);
  await denied(a,`insert into public.cp_section_grants values('${a}','coding.python','allow')`);
  await denied(owner,`insert into public.cp_audit(actor_id,target_id,action,detail) values('${a}','${a}','fake','{}')`);
 });
 await t.test('sole administrator cannot be demoted, revoked or deleted through API',async()=>{
  for(const status of ['active','suspended','revoked']) await denied(owner,`select public.cp_set_learner('${owner}','${status}','Changed')`);
  await denied(owner,`delete from public.cp_memberships where user_id='${owner}'`);
  await db.exec('reset role');
  await assert.rejects(()=>db.exec(`delete from auth.users where id='${owner}'`),e=>e.code==='23503');
 });
 await t.test('Excel-only grant exposes its hub, never siblings, planned courses or parent wildcard',async()=>{
  await as(owner,`select public.cp_set_section_grant('${a}','office.excel','allow')`);
  const ids=(await as(a,'select id from public.cp_sections order by id')).rows.map(r=>r.id);
  assert.deepEqual(ids,['office','office.excel']);
  await denied(owner,`select public.cp_set_section_grant('${a}','office','allow')`,'22023');
  await denied(owner,`select public.cp_set_section_grant('${a}','office.power-query','allow')`,'22023');
  assert.equal(await scalar(b,'select count(*)::int n from public.cp_sections'),0);
 });
 const insert=(uid,section,id='lesson-1')=>`insert into public.cp_study_state values('${uid}','${section}','${id}','note','{"text":"private"}')`;
 await t.test('own authorized work only; no cross-owner read, insert, update or reassignment',async()=>{
  await as(a,insert(a,'office.excel'));
  await denied(a,insert(a,'coding.python'));
  await denied(a,insert(b,'office.excel'));
  assert.equal(await scalar(b,'select count(*)::int n from public.cp_study_state'),0);
  assert.equal(await scalar(owner,'select count(*)::int n from public.cp_study_state'),0);
  assert.equal((await as(b,"update public.cp_study_state set value='{}' returning *")).rows.length,0);
  await denied(a,`update public.cp_study_state set user_id='${b}'`);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_memberships'),1);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_audit'),0);
 });
 await t.test('deny and revoked/suspended memberships take effect with the same identity token',async()=>{
  await as(owner,`select public.cp_set_section_grant('${a}','office.excel','deny')`);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_study_state'),0);
  await denied(a,insert(a,'office.excel','lesson-2'));
  await as(owner,`select public.cp_set_section_grant('${a}','office.excel','allow')`);
  for (const status of ['suspended','revoked']) {
   await as(owner,`select public.cp_set_learner('${a}','${status}','A')`);
   assert.equal(await scalar(a,'select count(*)::int n from public.cp_sections'),0);
   assert.equal(await scalar(a,'select count(*)::int n from public.cp_study_state'),0);
   await denied(a,insert(a,'office.excel','lesson-2'));
  }
  await as(owner,`select public.cp_set_learner('${a}','active','A')`);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_study_state'),1);
 });
 await t.test('new descendants do not acquire an existing learner grant',async()=>{
  await db.exec('reset role');
  await db.exec("insert into public.cp_sections values('office.future','office','Future','section')");
  assert.equal(await scalar(a,"select count(*)::int n from public.cp_sections where id='office.future'"),0);
  await denied(a,insert(a,'office.future'));
 });
 await t.test('invalid status/decision rolls back mutation and audit; API cannot truncate records',async()=>{
  const before=await scalar(owner,'select count(*)::int n from public.cp_audit');
  await denied(owner,`select public.cp_set_learner('${a}','invalid','A')`,'23514');
  await denied(owner,`select public.cp_set_section_grant('${a}','office.excel','invalid')`,'23514');
  assert.equal(await scalar(owner,'select count(*)::int n from public.cp_audit'),before);
  await denied(a,'truncate public.cp_study_state');
  await denied(owner,'truncate public.cp_memberships');
 });
 await t.test('U2 directory and email registration reject anonymous/learner callers',async()=>{
  await denied(null,'select public.cp_admin_directory()');
  await denied(a,'select public.cp_admin_directory()');
  await denied(a,"select public.cp_admin_register('unknown@example.invalid','X')");
  await denied(a,`select public.cp_admin_save('${a}',0,'X','active',array['coding.python'])`);
  const result=await as(owner,'select public.cp_admin_directory() data');
  assert.equal(result.rows[0].data.members.find(m=>m.user_id===a).email,'a@example.invalid');
 });
 await t.test('U2 registration binds one confirmed email to UUID and cannot reactivate existing membership',async()=>{
  await denied(owner,"select public.cp_admin_register('unverified@example.invalid','New')",'22023');
  await denied(owner,"select public.cp_admin_register('missing@example.invalid','New')",'22023');
  await denied(owner,"select public.cp_admin_register('a@example.invalid','New')",'23505');
  await db.exec('reset role');await db.exec(`update auth.users set email_confirmed_at=now() where id='${unverified}'`);
  const result=await as(owner,"select public.cp_admin_register('  UNVERIFIED@example.invalid  ','New learner') id");
  assert.equal(result.rows[0].id,unverified);
  assert.equal((await as(unverified,'select status from public.cp_memberships')).rows[0].status,'suspended');
  assert.equal(await scalar(unverified,'select count(*)::int n from public.cp_sections'),0);
 });
 await t.test('U2 save is atomic and stale revisions including U1 writes are rejected',async()=>{
  const revision=async()=>String((await as(owner,`select access_revision from public.cp_memberships where user_id='${a}'`)).rows[0].access_revision);
  let rev=await revision();
  await as(owner,`select public.cp_admin_save('${a}',${rev},'Excel learner','active',array['office.excel'])`);
  await denied(owner,`select public.cp_admin_save('${a}',${rev},'Stale','revoked',array[]::text[])`,'40001');
  rev=await revision();
  await denied(owner,`select public.cp_admin_save('${a}',${rev},'Bad','revoked',array['office'])`,'22023');
  assert.equal(await revision(),rev);
  assert.equal((await as(a,'select status from public.cp_memberships')).rows[0].status,'active');
  await as(owner,`select public.cp_set_section_grant('${a}','coding.python','allow')`);
  await denied(owner,`select public.cp_admin_save('${a}',${rev},'Old','active',array['office.excel'])`,'40001');
  rev=await revision();await as(owner,`select public.cp_admin_save('${a}',${rev},'Excel learner','revoked',array['office.excel'])`);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_sections'),0);
  rev=await revision();await as(owner,`select public.cp_admin_save('${a}',${rev},'Excel learner','active',array['office.excel'])`);
  assert.deepEqual((await as(a,'select id from public.cp_sections order by id')).rows.map(r=>r.id),['office','office.excel']);
  await denied(owner,`select public.cp_admin_save('${owner}',0,'Owner','revoked',array[]::text[])`,'22023');
 });
 await t.test('U3 profile/group RPCs and direct writes reject learners and anonymous users',async()=>{
  for(const user of [null,a,b]) {
   await denied(user,`select public.cp_admin_profile('${a}')`);
   await denied(user,`select public.cp_admin_save_profile('${a}',0,'{}',array[]::uuid[])`);
   await denied(user,"select public.cp_admin_save_profile_group(null,0,'Sales','')");
  }
  await denied(a,`insert into public.cp_learning_profiles(user_id) values('${a}')`);
  await denied(a,"insert into public.cp_profile_groups(name) values('Escalate')");
 });
 let groupId;
 await t.test('U3 admin creates group and profile without granting new section access',async()=>{
  groupId=(await as(owner,"select public.cp_admin_save_profile_group(null,0,'Import-export','Sales scenarios') id")).rows[0].id;
  await as(owner,`select public.cp_admin_save_profile('${a}',0,'{"background":"Sales","difficulty":"beginner","countries_markets":["Japan","Philippines"]}',array['${groupId}']::uuid[])`);
  await as(owner,`select public.cp_admin_save_profile('${b}',0,'{"occupation":"Other learner"}',array['${groupId}']::uuid[])`);
  assert.deepEqual((await as(a,'select id from public.cp_sections order by id')).rows.map(r=>r.id),['office','office.excel']);
  assert.equal(await scalar(b,'select count(*)::int n from public.cp_sections'),0);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_profile_groups'),0);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_profile_group_members'),0);
 });
 await t.test('U3 learners read only their own active profile and cannot modify ownership',async()=>{
  const rows=(await as(a,'select user_id,profile from public.cp_learning_profiles')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].user_id,a);assert.equal(rows[0].profile.background,'Sales');
  assert.equal((await as(b,'select user_id from public.cp_learning_profiles')).rows[0].user_id,b);
  await denied(a,`update public.cp_learning_profiles set user_id='${b}'`);
  await denied(a,"update public.cp_learning_profiles set profile='{}'");
  await as(owner,`select public.cp_set_learner('${a}','revoked','A')`);
  assert.equal(await scalar(a,'select count(*)::int n from public.cp_learning_profiles'),0);
  await as(owner,`select public.cp_set_learner('${a}','active','A')`);
 });
 await t.test('U3 schema rejects authority/identity fields, bad types and oversized arrays atomically',async()=>{
  for(const profile of [{role:'administrator'},{email:'a@example.invalid'},{difficulty:'expert'},{background:7},{scenarios:Array(21).fill('x')},{occupation:'x'.repeat(2001)},{learning_objectives:[null]}]) {
   await denied(owner,`select public.cp_admin_save_profile('${a}',1,'${JSON.stringify(profile)}',array[]::uuid[])`,'22023');
  }
  await denied(owner,`select public.cp_admin_save_profile('${a}',1,'{}',array['99999999-0000-4000-8000-000000000000']::uuid[])`,'22023');
  const result=(await as(owner,`select public.cp_admin_profile('${a}') data`)).rows[0].data;
  assert.equal(result.revision,'1');assert.equal(result.profile.background,'Sales');assert.deepEqual(result.group_ids,[groupId]);
 });
 await t.test('U3 stale profile/group saves fail; saved profile can remove groups without changing permissions',async()=>{
  await as(owner,`select public.cp_admin_save_profile('${a}',1,'{"background":"Updated"}',array[]::uuid[])`);
  await denied(owner,`select public.cp_admin_save_profile('${a}',1,'{}',array[]::uuid[])`,'40001');
  await as(owner,`select public.cp_admin_save_profile_group('${groupId}',1,'Trade professionals','Reusable group')`);
  await denied(owner,`select public.cp_admin_save_profile_group('${groupId}',1,'Stale','')`,'40001');
  await denied(owner,"select public.cp_admin_save_profile_group(null,0,' trade PROFESSIONALS ','')",'23505');
  const result=(await as(owner,`select public.cp_admin_profile('${a}') data`)).rows[0].data;
  assert.deepEqual(result.group_ids,[]);assert.equal(result.revision,'2');assert.equal(result.groups[0].revision,'2');
  assert.deepEqual((await as(a,'select id from public.cp_sections order by id')).rows.map(r=>r.id),['office','office.excel']);
  const audit=(await as(owner,"select detail from public.cp_audit where action='profile.save'")).rows;
  assert.ok(audit.every(r=>!JSON.stringify(r.detail).includes('background')));
 });
 await t.test('audit records actor from session and failed operations leave no successful audit event',async()=>{
  const before=await scalar(owner,'select count(*)::int n from public.cp_audit');
  await denied(a,`select public.cp_set_section_grant('${a}','office.vba','allow')`);
  assert.equal(await scalar(owner,'select count(*)::int n from public.cp_audit'),before);
  const rows=(await as(owner,'select actor_id,action from public.cp_audit')).rows;
  assert.ok(rows.filter(r=>r.action!=='owner.bootstrap').every(r=>r.actor_id===owner));
 });
 await t.test('all application tables have RLS; privileged bootstrap has no API execute grant',async()=>{
  await db.exec('reset role');
  const rows=(await db.query("select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'cp_%'")).rows;
  assert.equal(rows.length,8); assert.ok(rows.every(r=>r.relrowsecurity));
  for(const role of ['anon','authenticated','service_role']) {
   const result=await db.query(`select has_function_privilege('${role}','cp_private.bootstrap_owner(uuid)','EXECUTE') as allowed`);
   assert.equal(result.rows[0].allowed,false);
  }
 });
 } finally { await db.close(); }
});
