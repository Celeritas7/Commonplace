-- READ ONLY. Run as a trusted operator before any Commonplace hosted writes.
-- Inventory, not a PASS/FAIL or automatic remediation script. No application
-- rows, Auth identities, keys, Storage objects or function bodies are returned.
-- Policy expressions may contain identifiers: retain the output privately.
-- public/Storage are the initial review scope. Reconcile schema_access with the
-- project's actual Data API exposed-schema settings; add other exposed schemas
-- below. A SQL session's pgrst settings are not proof of gateway configuration.
with review_schemas(name) as (values ('public'), ('storage')),
browser_roles(name) as (values ('anon'), ('authenticated')),
relations as (
  select c.*, n.nspname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select name from review_schemas)
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
), functions as (
  select p.*, n.nspname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select name from review_schemas) and p.prokind = 'f'
    and not exists (
      select 1 from pg_depend d
      where d.classid = 'pg_proc'::regclass and d.objid = p.oid
        and d.deptype = 'e'
    )
), inventory as (
  select 'scope'::text as kind, 'review'::text as object,
    jsonb_build_object(
      'schemas', (select jsonb_agg(name order by name) from review_schemas),
      'gateway_schema_configuration_verified', false,
      'authorization_verified', false
    ) as details
  union all
  select 'schema_access', quote_ident(n.nspname) || ':' || r.name,
    jsonb_build_object(
      'usage', has_schema_privilege(r.name, n.oid, 'USAGE'),
      'create', has_schema_privilege(r.name, n.oid, 'CREATE'),
      'included_in_review', n.nspname in (select name from review_schemas)
    )
  from pg_namespace n cross join browser_roles r
  where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'relation', format('%I.%I', nspname, relname),
    jsonb_build_object(
      'kind', relkind, 'rls', relrowsecurity, 'force_rls', relforcerowsecurity,
      'owner', pg_get_userbyid(relowner), 'options', coalesce(reloptions, '{}')
    )
  from relations
  union all
  select 'relation_access', format('%I.%I:%s', nspname, relname, r.name),
    jsonb_build_object(
      'table_privileges', (select coalesce(jsonb_agg(v order by v), '[]')
        from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
          ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) privileges(v)
        where has_table_privilege(r.name, c.oid, v)),
      'any_column_privileges', (select coalesce(jsonb_agg(v order by v), '[]')
        from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) privileges(v)
        where has_any_column_privilege(r.name, c.oid, v))
    )
  from relations c cross join browser_roles r
  union all
  select 'policy', format('%I.%I:%I', schemaname, tablename, policyname),
    jsonb_build_object('mode', permissive, 'roles', roles, 'command', cmd,
      'using', qual, 'with_check', with_check)
  from pg_policies where schemaname in (select name from review_schemas)
  union all
  select 'function', format('%I.%I(%s)', nspname, proname, oidvectortypes(proargtypes)),
    jsonb_build_object(
      'security_definer', prosecdef, 'owner', pg_get_userbyid(proowner),
      'return_type', pg_get_function_result(oid),
      'trigger_function', prorettype in ('trigger'::regtype, 'event_trigger'::regtype),
      'configuration', coalesce(proconfig, '{}'),
      'anon_execute', has_function_privilege('anon', oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', oid, 'EXECUTE'),
      'body_md5', md5(prosrc)
    )
  from functions
  union all
  select 'auth_trigger', format('%I.%I:%I', n.nspname, c.relname, t.tgname),
    jsonb_build_object('enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid),
      'function', format('%I.%I(%s)', fn.nspname, p.proname, oidvectortypes(p.proargtypes)))
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace fn on fn.oid = p.pronamespace
  where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal
  union all
  select 'bucket', id,
    jsonb_build_object('public', public, 'file_size_limit', file_size_limit,
      'allowed_mime_types', allowed_mime_types)
  from storage.buckets
)
select kind, object, details from inventory order by kind, object;
