-- REVIEW CANDIDATE ONLY. No auto-deployment or automatic identity backfill.
-- Run only after the recovery and affected-client prerequisites in README.md.
begin;
create schema ga_private;
revoke all on schema ga_private from public, anon, authenticated, service_role;

-- Preserve legacy record IDs. A trusted operator must verify each Auth UUID;
-- names, email strings and a UUID-looking legacy value are not identity proof.
create table ga_private.owner_links (
 app text not null check(app in ('code-sensei','healthlog-archive')),
 legacy_id text not null check(length(legacy_id) between 1 and 256),
 auth_user_id uuid not null references auth.users(id) on delete restrict,
 code_user_id uuid generated always as
  (case when app='code-sensei' then legacy_id::uuid end) stored
  references public.code_sensei_users(id) on delete restrict,
 check(app<>'code-sensei' or legacy_id=code_user_id::text),
 primary key(app,legacy_id)
);
create unique index code_sensei_one_identity on ga_private.owner_links(auth_user_id)
 where app='code-sensei';
create index on ga_private.owner_links(auth_user_id,app);

create table ga_private.owner_link_history (
 changed_at timestamptz not null default clock_timestamp(),
 login_role name not null default session_user,
 acting_role text not null default current_setting('role'),
 operation text not null, app text not null, legacy_id text not null,
 previous_owner uuid, new_owner uuid
);
create function ga_private.check_owner_link() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.app,new.legacy_id) is distinct from (old.app,old.legacy_id) then
  raise exception 'retire the original mapping before changing its source key';
 end if;
 perform 1 from auth.users where id=new.auth_user_id and email_confirmed_at is not null for share;
 if not found then raise exception 'mapped Auth identity must be verified'; end if;
 if new.app='healthlog-archive' then
  perform 1 from public.healthlog_visits_old where user_id=new.legacy_id limit 1 for share;
  if not found then raise exception 'archive source key does not exist'; end if;
 end if;
 return new;
end; $$;
create trigger check_owner_link before insert or update on ga_private.owner_links
 for each row execute function ga_private.check_owner_link();
create function ga_private.record_owner_link() returns trigger
language plpgsql set search_path='' as $$
begin
 insert into ga_private.owner_link_history(operation,app,legacy_id,previous_owner,new_owner)
 values(tg_op,coalesce(new.app,old.app),coalesce(new.legacy_id,old.legacy_id),old.auth_user_id,new.auth_user_id);
 return null;
end; $$;
create trigger record_owner_link after insert or update or delete on ga_private.owner_links
 for each row execute function ga_private.record_owner_link();

-- A role shared with another application does not itself admit the user to Eagle.
create table ga_private.eagle_members (
 auth_user_id uuid primary key references auth.users(id) on delete restrict
);
create table ga_private.edge_grants (
 function_name text not null check(function_name in ('code-exec','claude-proxy')),
 auth_user_id uuid not null references auth.users(id) on delete restrict,
 expires_at timestamptz not null,
 revoked boolean not null default false,
 primary key(function_name,auth_user_id)
);
-- Evidence references only: never store secrets or raw recovery data here.
-- These entries are operator attestations, not automatically detected readiness.
create table ga_private.client_cutovers (
 app text primary key check(app in ('code-sensei','healthlog-archive','eagle')),
 evidence_ref text not null check(length(btrim(evidence_ref)) between 1 and 512),
 verified_at timestamptz not null
);
alter table ga_private.owner_links enable row level security;
alter table ga_private.owner_link_history enable row level security;
alter table ga_private.eagle_members enable row level security;
alter table ga_private.edge_grants enable row level security;
alter table ga_private.client_cutovers enable row level security;
revoke all on all tables in schema ga_private from public,anon,authenticated,service_role;

create function ga_private.owns_legacy(app_name text,legacy_owner text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from ga_private.owner_links l join auth.users u on u.id=l.auth_user_id
  where u.email_confirmed_at is not null and l.app=app_name and l.legacy_id=legacy_owner and l.auth_user_id=auth.uid()
  and (l.app='code-sensei' or exists(select from public.healthlog_visits_old v where v.user_id=l.legacy_id)));
$$;
create function ga_private.linked_legacy_role() returns text
language sql stable security definer set search_path='' as $$
 select r.role from public.authentication_mode_user_roles r
 join ga_private.eagle_members e using(auth_user_id)
 join auth.users u on u.id=e.auth_user_id and u.email_confirmed_at is not null
 where e.auth_user_id=auth.uid() and r.role in ('admin','operator','viewer');
$$;
-- Called only by the transactional installers. Check effective privileges after
-- rewriting direct grants, including rights inherited from another role.
create function ga_private.set_browser_access(target regclass, writable boolean) returns void
language plpgsql set search_path='' as $$
declare browser name; privilege text; allowed boolean; privileges text[] :=
 array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES'];
begin
 if current_setting('server_version_num')::int>=170000 then privileges:=array_append(privileges,'MAINTAIN'); end if;
 if exists(select from pg_attribute a, lateral aclexplode(a.attacl) acl
  where a.attrelid=target and a.attnum>0 and not a.attisdropped and
   case when acl.grantee=0 then true else pg_has_role('anon',acl.grantee,'USAGE') or
    pg_has_role('authenticated',acl.grantee,'USAGE') end) then
  raise exception 'review browser column grants on %',target;
 end if;
 execute format('revoke all on table %s from public,anon,authenticated',target);
 execute format('grant select on table %s to authenticated',target);
 if writable then execute format('grant insert,update,delete on table %s to authenticated',target); end if;
 foreach browser in array array['anon','authenticated'] loop
  if exists(select from pg_roles r, pg_class c where r.rolname=browser and c.oid=target
    and (r.rolsuper or r.rolbypassrls or pg_has_role(r.oid,c.relowner,'USAGE'))) then
   raise exception 'browser role can bypass row security on %',target;
  end if;
  foreach privilege in array privileges loop
   allowed:=browser='authenticated' and (privilege='SELECT' or writable and privilege in ('INSERT','UPDATE','DELETE'));
   if has_table_privilege(browser,target,privilege)<>allowed or
      has_table_privilege(browser,target,privilege||' WITH GRANT OPTION') then
    raise exception 'unexpected effective % privilege for % on %',privilege,browser,target;
   end if;
  end loop;
 end loop;
end; $$;
revoke all on all functions in schema ga_private from public,anon,authenticated,service_role;
grant usage on schema ga_private to authenticated;
grant execute on function ga_private.owns_legacy(text,text),ga_private.linked_legacy_role() to authenticated;

-- Own identity only. No name lookup, caller-supplied user ID or email fallback.
create function public.code_sensei_current_user_id() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare result uuid;
begin
 select l.code_user_id into result from ga_private.owner_links l
 where l.app='code-sensei' and l.auth_user_id=auth.uid()
  and ga_private.owns_legacy(l.app,l.legacy_id);
 if result is null then raise exception 'one verified legacy identity required' using errcode='42501'; end if;
 return result;
end; $$;
-- The Edge handler verifies the user with Auth first, then uses this caller-JWT
-- RPC. Grant rows are managed by trusted operators, never frontend role metadata.
create function public.ga_can_call_edge(requested_function text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from ga_private.edge_grants g where g.function_name=requested_function
  and g.auth_user_id=auth.uid() and not g.revoked and g.expires_at>now());
$$;
revoke all on function public.code_sensei_current_user_id(),public.ga_can_call_edge(text)
 from public,anon,authenticated,service_role;
grant execute on function public.code_sensei_current_user_id(),public.ga_can_call_edge(text) to authenticated;
commit;
