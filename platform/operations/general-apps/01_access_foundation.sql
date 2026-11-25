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
 primary key(app,legacy_id)
);
create index on ga_private.owner_links(auth_user_id,app);
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
alter table ga_private.edge_grants enable row level security;
alter table ga_private.client_cutovers enable row level security;
revoke all on all tables in schema ga_private from public,anon,authenticated,service_role;

create function ga_private.owns_legacy(app_name text,legacy_owner text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from ga_private.owner_links l
  where l.app=app_name and l.legacy_id=legacy_owner and l.auth_user_id=auth.uid());
$$;
create function ga_private.linked_legacy_role() returns text
language sql stable security definer set search_path='' as $$
 select role from public.authentication_mode_user_roles
 where auth_user_id=auth.uid() and role in ('admin','operator','viewer');
$$;
revoke all on all functions in schema ga_private from public,anon,authenticated,service_role;
grant usage on schema ga_private to authenticated;
grant execute on function ga_private.owns_legacy(text,text),ga_private.linked_legacy_role() to authenticated;

-- Own identity only. No name lookup, caller-supplied user ID or email fallback.
create function public.code_sensei_current_user_id() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare matches uuid[];
begin
 if auth.uid() is null then raise exception 'verified identity required' using errcode='42501'; end if;
 select array_agg(u.id) into matches from public.code_sensei_users u
 join ga_private.owner_links l on l.app='code-sensei' and l.legacy_id=u.id::text
 where l.auth_user_id=auth.uid();
 if coalesce(cardinality(matches),0)<>1 then
  raise exception 'one verified legacy identity required' using errcode='42501';
 end if;
 return matches[1];
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
