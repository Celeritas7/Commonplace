// Run only by the guarded, disposable local Supabase acceptance runner.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export async function roadmapRecordsAcceptance({a,b,unregistered,sql,check,client,data,denied,withBlockedWriter}) {
 const taskA=randomUUID(),taskB=randomUUID(),comparisonA=randomUUID(),comparisonB=randomUUID();
 const itemA=randomUUID(),itemB=randomUUID(),logA=randomUUID(),resourceA=randomUUID();
 const tag=randomUUID(),role='role-'+tag,project='project-'+tag,suggestion='suggestion-'+tag;
 const tables=['roadmap_comparisons','roadmap_comparison_items','roadmap_daily_logs','roadmap_task_resources',
  'roadmap_suggestions','roadmap_suggestion_answers','roadmap_roles','roadmap_projects','roadmap_role_locations',
  'roadmap_contexts_map','roadmap_user_settings'];
 const claim=actor=>`set local role authenticated;select set_config('request.jwt.claim.sub','${actor.id}',true);
  select set_config('request.jwt.claims','{"sub":"${actor.id}","role":"authenticated","is_anonymous":false}',true);`;
 const snap=async()=>sql(`select jsonb_object_agg(name,rows)::text from (
  ${tables.map(t=>`select '${t}' name,coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') rows from ${t} t`).join(' union all ')}
 ) snapshots`);
 await check('Roadmap record constraints preserve existing histories and browser privileges are bounded',async()=>{
  await sql(`
   insert into roadmap_tasks(id,user_id,title) values('${taskA}','${a.id}','Record A'),('${taskB}','${b.id}','Record B');
   insert into roadmap_comparisons(id,user_id,task_id,title,notes,weights) values
    ('${comparisonA}','${a.id}','${taskA}','Fixture A','Keep 日本語','{"price":2}'),
    ('${comparisonB}','${b.id}','${taskB}','Fixture B','Keep B','{}');
   insert into roadmap_comparison_items(id,user_id,comparison_id,name,price) values
    ('${itemA}','${a.id}','${comparisonA}','Product A',50),('${itemB}','${b.id}','${comparisonB}','Product B',60);
   update roadmap_comparisons set chosen_item='${itemA}' where id='${comparisonA}';
   insert into roadmap_daily_logs(id,user_id,task_id,notes) values('${logA}','${a.id}','${taskA}','Keep 日本語');
   insert into roadmap_task_resources(id,user_id,task_id,label,url) values('${resourceA}','${a.id}','${taskA}','Resource','https://example.invalid/lesson');
   insert into roadmap_roles(id,user_id,label) values('${role}','${a.id}','Role');
   insert into roadmap_projects(id,user_id,role_id,label) values('${project}','${a.id}','${role}','Project');
   insert into roadmap_role_locations values('${role}','retired-place','${a.id}');
   insert into roadmap_contexts_map(id,user_id,label) values('${tag}','${a.id}','Context');
   insert into roadmap_user_settings(user_id,preferences) values('${a.id}','{"notes":"Keep 日本語"}');
   insert into roadmap_suggestions(id,user_id,task,rm_task_id,title,say,until)
    values('${suggestion}','${a.id}','{}','${taskA}','Task','Try',now()+interval '1 day');
   insert into roadmap_suggestion_answers(user_id,seq,suggestion_id,from_app,action)
    values('${a.id}',41,'unknown-expired','fixture','skip');
  `);
  const before=await snap();
  await sql(await readFile(new URL('../operations/general-apps/09_roadmap_record_ownership.sql',import.meta.url),'utf8'));
  assert.equal(await snap(),before);
  assert.equal(await sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=any(array[${tables.map(t=>"'"+t+"'").join(',')}])
    and (has_table_privilege('authenticated',c.oid,'truncate') or has_table_privilege('anon',c.oid,'select'))`),'0');
 });
 await check('Roadmap real JWT reads and writes reject foreign records and parent links',async()=>{
  for(const table of tables){
   assert.ok(data(await a.client.from(table).select('user_id'),'Owned '+table).some(r=>r.user_id===a.id),table);
   assert.deepEqual(data(await b.client.from(table).select('*').eq('user_id',a.id),'Foreign '+table),[]);
   assert.deepEqual(data(await unregistered.client.from(table).select('*'),'Fresh '+table),[]);
   denied(await client().from(table).select('*'),'Unsigned '+table);
   assert.deepEqual(data(await b.client.from(table).delete().eq('user_id',a.id).select('user_id'),'Foreign delete '+table),[]);
  }
  for(const [table,key] of [['roadmap_daily_logs','task_id'],['roadmap_task_resources','task_id'],
   ['roadmap_suggestions','rm_task_id'],['roadmap_comparisons','task_id']])
   denied(await a.client.from(table).update({[key]:taskB}).eq('user_id',a.id),'Foreign parent '+table,'23503');
  denied(await a.client.from('roadmap_comparison_items').update({comparison_id:comparisonB}).eq('id',itemA),'Foreign item parent','23503');
  denied(await a.client.from('roadmap_comparisons').update({chosen_item:itemB}).eq('id',comparisonA),'Foreign pick','23503');
  // A legitimate current browser settings upsert and an unknown hub reply still work.
  data(await a.client.from('roadmap_user_settings').upsert({preferences:{notes:'Preserved edit'}},{onConflict:'user_id'}).select().single(),'Settings upsert');
  data(await a.client.from('roadmap_suggestion_answers').upsert({seq:42,suggestion_id:'unknown',from_app:'fixture',action:'skip'},
   {onConflict:'user_id,seq',ignoreDuplicates:true}).select().single(),'Unknown answer');
 });
 await check('Roadmap comparison imports remain atomic and optional history links retain owners',async()=>{
  const input={task_id:taskA,title:'Fixture A',items:[{name:'New product',price:100}]};
  assert.equal(data(await a.client.rpc('roadmap_save_comparison',{p:input}),'Comparison import'),comparisonA);
  const before=await snap();
  denied(await a.client.rpc('roadmap_save_comparison',{p:{...input,items:[{name:'Invalid',price:-1}]}}),'Invalid replacement','23514');
  assert.equal(await snap(),before);
  data(await a.client.from('roadmap_tasks').delete().eq('id',taskA).select().single(),'Owned task delete');
  for(const [table,col,id] of [['roadmap_comparisons','task_id',comparisonA],['roadmap_daily_logs','task_id',logA],
   ['roadmap_suggestions','rm_task_id',suggestion]]){
   const row=data(await a.client.from(table).select('*').eq('id',id).single(),'Retained history');
   assert.equal(row[col],null);assert.equal(row.user_id,a.id);
  }
  assert.deepEqual(data(await a.client.from('roadmap_task_resources').select('*').eq('id',resourceA),'Cascaded own resource'),[]);
  data(await a.client.from('roadmap_roles').delete().eq('id',role).select().single(),'Owned role delete');
  const row=data(await a.client.from('roadmap_projects').select('*').eq('id',project).single(),'Retained project');
  assert.equal(row.role_id,null);assert.equal(row.user_id,a.id);
  assert.equal(data(await b.client.from('roadmap_comparison_items').select('*').eq('id',itemB).single(),'Other account retained').comparison_id,comparisonB);
 });
 await check('Roadmap child insertion observes a concurrently committed parent owner change',async()=>{
  const moving=randomUUID(),child=randomUUID();
  await sql(`insert into roadmap_tasks(id,user_id,title) values('${moving}','${a.id}','Moving fixture')`);
  await withBlockedWriter(13,`update roadmap_tasks set user_id='${b.id}' where id='${moving}'`,
   `begin;${claim(a)}insert into roadmap_daily_logs(id,task_id,notes) values('${child}','${moving}','Denied race');commit;`,/foreign key constraint/);
  assert.equal(await sql(`select count(*) from roadmap_daily_logs where id='${child}'`),'0');
 });
}
