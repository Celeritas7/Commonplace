-- Read-only U9 catalog preflight, run by a trusted operator on the selected target.
-- No learner records, keys, emails or file bytes are returned. Zero rows means
-- these structural checks passed, NOT that hosted/device acceptance passed.
with expected_tables(name) as (values
 ('cp_memberships'),('cp_sections'),('cp_section_grants'),('cp_study_state'),
 ('cp_audit'),('cp_learning_profiles'),('cp_profile_groups'),
 ('cp_profile_group_members'),('cp_materials'),('cp_material_versions'),
 ('cp_material_assignments')
), core_functions(signature) as (values
 ('public.cp_set_learner(uuid,text,text)'),
 ('public.cp_set_section_grant(uuid,text,text)'),
 ('public.cp_admin_directory()'),('public.cp_admin_register(text,text)'),
 ('public.cp_admin_save(uuid,bigint,text,text,text[])'),
 ('public.cp_admin_profile(uuid)'),
 ('public.cp_admin_save_profile(uuid,bigint,jsonb,uuid[])'),
 ('public.cp_admin_save_profile_group(uuid,bigint,text,text)'),
 ('public.cp_admin_material_library()'),('public.cp_admin_material_detail(uuid)'),
 ('public.cp_admin_material_save(uuid,bigint,jsonb)'),
 ('public.cp_admin_material_copy(uuid,bigint)'),
 ('public.cp_admin_material_transition(uuid,bigint,text,boolean)'),
 ('public.cp_admin_material_assign(uuid,bigint,jsonb)'),
 ('public.cp_admin_material_begin_upload(uuid,bigint)'),
 ('public.cp_service_material_finish_upload(uuid,uuid,uuid,jsonb)'),
 ('public.cp_read_material(uuid)'),('public.cp_learner_materials(text)'),
 ('public.cp_sync_read(uuid,uuid,text,text,text)'),
 ('public.cp_sync_write(uuid,uuid,text,text,text,bigint,uuid,jsonb)'),
 ('public.cp_offline_snapshot(text)')
), expected_functions(signature) as (
 select signature from core_functions
 union all select signature from (values
  ('public.cp_admin_prepare_signup(text,integer)'),
  ('public.cp_admin_revoke_signup(uuid)'),
  ('public.cp_admin_signup_directory()')) signup(signature)
 where to_regclass('cp_private.signup_control') is not null
), tables as (
 select c.*, n.nspname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where (n.nspname='public' and left(c.relname,3)='cp_') or n.nspname='cp_private'
), functions as (
 select p.*, n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='public' and left(p.proname,3)='cp_') or n.nspname='cp_private'
), findings as (
 select 'missing_table' as check_id, 'public.'||name as object
 from expected_tables where to_regclass('public.'||name) is null
 union all
 select 'missing_function', signature from expected_functions
 where to_regprocedure(signature) is null
 union all
 select 'missing_private_lock', 'cp_private.mutation_lock'
 where to_regclass('cp_private.mutation_lock') is null
 union all
 select 'rls_disabled', nspname||'.'||relname from tables
 where relkind in ('r','p') and not relrowsecurity
 union all
 select 'unexpected_public_relation', 'public.'||relname from tables
 where nspname='public' and relkind in ('r','p','v','m','f')
 and (relname not in (select name from expected_tables) or relkind not in ('r','p'))
 union all
 select 'browser_table_privilege', nspname||'.'||relname||':'||role||':'||privilege
 from tables cross join (values ('anon'),('authenticated')) r(role)
 cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) g(privilege)
 where relkind in ('r','p') and has_table_privilege(role,oid,privilege)
 and not (nspname='public' and role='authenticated' and privilege='SELECT')
 union all
 select 'browser_column_privilege', nspname||'.'||relname||':'||role||':'||privilege
 from tables cross join (values ('anon'),('authenticated')) r(role)
 cross join (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) g(privilege)
 where relkind in ('r','p') and has_any_column_privilege(role,oid,privilege)
 and not (nspname='public' and role='authenticated' and privilege='SELECT')
 union all
 select 'missing_select_grant', 'public.'||relname from tables
 where nspname='public' and relkind in ('r','p')
 and not has_table_privilege('authenticated',oid,'SELECT')
 union all
 select 'anonymous_function', nspname||'.'||proname from functions
 where has_function_privilege('anon',oid,'EXECUTE')
 union all
 select 'unexpected_function', oid::regprocedure::text from functions
 where nspname='public' and not exists
 (select 1 from expected_functions where to_regprocedure(signature)=functions.oid)
 union all
 select 'function_search_path', nspname||'.'||proname from functions
 where not coalesce(proconfig @> array['search_path=""'],false)
 union all
 select 'function_browser_grant', nspname||'.'||proname from functions
 where has_function_privilege('authenticated',oid,'EXECUTE') <>
   case when nspname='public' then proname<>'cp_service_material_finish_upload'
   else proname in ('is_admin','can_study','can_see_section','can_read_material') end
 union all
 select 'service_receipt_grant', nspname||'.'||proname from functions
 where proname='cp_service_material_finish_upload'
 and not has_function_privilege('service_role',oid,'EXECUTE')
 union all
 select 'missing_sync_column', 'public.cp_study_state.'||name
 from (values ('revision'),('last_operation'),('material_version_id')) columns(name)
 where not exists(select 1 from information_schema.columns c where c.table_schema='public'
 and c.table_name='cp_study_state' and c.column_name=name)
 union all
 select 'private_bucket_configuration', 'storage.buckets/cp-materials'
 where not exists(select 1 from storage.buckets where id='cp-materials' and not public
 and file_size_limit=10485760 and allowed_mime_types=array['application/octet-stream'])
 union all
 select 'storage_restrictive_guard', 'storage.'||relation||':'||name
 from (values ('objects','cp_material_objects_private'),('buckets','cp_material_bucket_private')) guards(relation,name)
 where not exists(select 1 from pg_policy p where p.polrelid=to_regclass('storage.'||relation)
 and p.polname=name and not p.polpermissive and p.polcmd='*'
 and p.polqual is not null and p.polwithcheck is not null
 and p.polroles @> array[(select oid from pg_roles where rolname='anon'),(select oid from pg_roles where rolname='authenticated')])
)
select check_id, object from findings order by check_id, object;
