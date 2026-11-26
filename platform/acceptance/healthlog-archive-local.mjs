// Called only after full-stack.mjs has validated its disposable local stack.
// All users, maps, health records and attestations are fictional fixtures.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
export async function healthlogArchiveAcceptance({a,b,unregistered,owner,sql,check,client,data,denied,withBlockedWriter}) {
 const tables=['healthlog_clinics_old','healthlog_visits_old','healthlog_medicines_old','healthlog_dose_logs_old'];
 const clinicA=randomUUID(),clinicB=randomUUID(),medicineA=randomUUID(),medicineB=randomUUID();
 const candidate=await readFile(new URL('../operations/general-apps/06_healthlog_archive.sql',import.meta.url),'utf8');
 const snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async table=>[table,
  await sql(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${table} t`)])));
 let before;
 await check('HealthLog archive cutover waits for mapping changes and preserves every original record',async()=>{
  await sql(`insert into public.healthlog_clinics_old(id,user_id,name) values
   ('${clinicA}','clinic-only-a','Synthetic A'),('${clinicB}','archive-b','Synthetic B');
   update public.healthlog_visits_old set clinic_id='${clinicA}' where user_id='archive-a';
   update public.healthlog_visits_old set clinic_id='${clinicB}' where user_id='archive-b';
   insert into public.healthlog_medicines_old(id,visit_id,name)
    select '${medicineA}',id,'Synthetic A' from public.healthlog_visits_old where user_id='archive-a';
   insert into public.healthlog_medicines_old(id,visit_id,name)
    select '${medicineB}',id,'Synthetic B' from public.healthlog_visits_old where user_id='archive-b';
   insert into public.healthlog_dose_logs_old(user_id,medicine_id,log_date,slot,taken) values
    ('dose-only-a','${medicineA}','2026-01-01','morning',false),('archive-b','${medicineB}','2026-01-02','night',true);
   insert into ga_private.owner_links(app,legacy_id,auth_user_id) values
    ('healthlog-archive','clinic-only-a','${a.id}'),('healthlog-archive','dose-only-a','${a.id}');`);
  before=await snapshot();
  await withBlockedWriter(6,"delete from ga_private.owner_links where app='healthlog-archive' and legacy_id='clinic-only-a'",candidate,/mappings required/);
  assert.deepEqual(await snapshot(),before);
  assert.equal(await sql("select count(*) from pg_policies where policyname='ha_owner_read'"),'0');
  await sql(`insert into ga_private.owner_links(app,legacy_id,auth_user_id) values('healthlog-archive','clinic-only-a','${a.id}')`);
  await sql(candidate);
  assert.deepEqual(await snapshot(),before);
 });
 await check('HealthLog real JWT archive reads, direct-write denial and revocation preserve history',async()=>{
  for(const table of tables) {
   assert.equal(data(await a.client.from(table).select('*'),'Archive A').length,1);
   assert.equal(data(await b.client.from(table).select('*'),'Archive B').length,1);
   assert.deepEqual(data(await unregistered.client.from(table).select('*'),'Commonplace-only archive denial'),[]);
   assert.deepEqual(data(await owner.client.from(table).select('*'),'CP administrator has no implicit health access'),[]);
   denied(await client().from(table).select('*'),'Anonymous archive read');
   const own=data(await a.client.from(table).select('*'),'Original archive row')[0];
   denied(await a.client.from(table).insert(own),'Archive insert');
   denied(await a.client.from(table).delete().eq(table==='healthlog_dose_logs_old'?'user_id':'id',table==='healthlog_dose_logs_old'?own.user_id:own.id),'Archive delete');
   const patch=table==='healthlog_medicines_old'?{name:'unexpected'}: {user_id:'unexpected'};
   denied(await a.client.from(table).update(patch).eq(table==='healthlog_dose_logs_old'?'user_id':'id',table==='healthlog_dose_logs_old'?own.user_id:own.id),'Archive update');
  }
  await sql(`delete from ga_private.owner_links where app='healthlog-archive' and auth_user_id='${a.id}'`);
  for(const table of tables) {
   assert.deepEqual(data(await a.client.from(table).select('*'),'Revoked archive mapping'),[]);
   assert.equal(data(await b.client.from(table).select('*'),'Unchanged archive B').length,1);
  }
  assert.deepEqual(await snapshot(),before);
 });
}
