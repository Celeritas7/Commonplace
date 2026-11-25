-- REVIEW CANDIDATE ONLY; requires the six CP migrations and reviewed legacy
-- trigger definitions. The new signup path is installed CLOSED.
begin;
do $$
declare expected record;
begin
 if to_regprocedure('cp_private.is_admin()') is null then raise exception 'CP foundation required'; end if;
 for expected in select * from (values
  ('chatak_enforce_allowlist()','8422957d42e1adb8cebab426a677377e'),
  ('chatak_handle_new_user()','48f98a54655222bd7289a2aa25785848'),
  ('chatak_link_auth_user()','f2af9f153b6d887b3f496572c32a588c'),
  ('handle_new_user()','ac6e1b4921b4fbe5fa393246e0234e74')) reviewed(signature,body_hash)
 loop
  if not exists(select 1 from pg_proc p where p.oid=to_regprocedure('public.'||expected.signature)
   and p.prosecdef and p.prorettype='trigger'::regtype and pg_get_userbyid(p.proowner)='postgres'
   and md5(replace(p.prosrc,E'\r\n',E'\n'))=expected.body_hash) then
   raise exception 'signup definition changed since review';
  end if;
 end loop;
 if (select count(*) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal)<>4
  or exists(select 1 from (values
   ('chatak_allowlist_gate','chatak_enforce_allowlist()',7),
   ('chatak_link_auth_user','chatak_link_auth_user()',5),
   ('chatak_on_auth_user_created','chatak_handle_new_user()',5),
   ('on_auth_user_created','handle_new_user()',5)) trigger_spec(name,signature,kind)
   where not exists(select 1 from pg_trigger t where t.tgrelid='auth.users'::regclass
    and t.tgname=trigger_spec.name and t.tgfoid=to_regprocedure('public.'||trigger_spec.signature)
    and t.tgtype=trigger_spec.kind and t.tgenabled='O' and t.tgqual is null)) then
  raise exception 'Auth trigger configuration changed since review';
 end if;
end $$;
create table cp_private.signup_control(id boolean primary key check(id),enabled boolean not null);
insert into cp_private.signup_control values(true,false);
create table cp_private.signup_admissions(
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email=lower(btrim(email)) and length(email) between 3 and 254),
 expires_at timestamptz not null,
 created_by uuid not null references public.cp_memberships(user_id) on delete restrict,
 created_at timestamptz not null default now(),
 revoked_at timestamptz,
 claimed_user_id uuid unique references auth.users(id) on delete restrict deferrable initially deferred,
 claimed_at timestamptz,
 check((claimed_user_id is null)=(claimed_at is null))
);
alter table cp_private.signup_control enable row level security;
alter table cp_private.signup_admissions enable row level security;
revoke all on cp_private.signup_control,cp_private.signup_admissions from public,anon,authenticated,service_role;

create function public.cp_admin_prepare_signup(login_email text,valid_hours integer default 24) returns uuid
language plpgsql security definer set search_path='' as $$
declare normalized text:=lower(btrim(login_email)); result uuid;
begin
 update cp_private.mutation_lock set revision=revision+1 where id=true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 if normalized is null or length(normalized)>254 or normalized!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or valid_hours is null or valid_hours not between 1 and 168 then raise exception 'invalid signup request' using errcode='22023'; end if;
 if exists(select 1 from auth.users where lower(email)=normalized) then
  raise exception 'account already exists; use verified registration' using errcode='22023';
 end if;
 if exists(select 1 from public.authentication_mode_user_roles where lower(email)=normalized) then
  raise exception 'legacy application admission exists; review separately' using errcode='22023';
 end if;
 insert into cp_private.signup_admissions(email,expires_at,created_by)
 values(normalized,now()+make_interval(hours=>valid_hours),auth.uid())
 on conflict(email) do update set expires_at=excluded.expires_at,created_by=excluded.created_by,
  created_at=now(),revoked_at=null
  where signup_admissions.claimed_user_id is null returning id into result;
 if result is null then raise exception 'signup request already consumed' using errcode='23505'; end if;
 -- signup.* targets an admission ID; no email or authentication secret in audit.
 insert into public.cp_audit(actor_id,target_id,action,detail)
 values(auth.uid(),result,'signup.prepare',jsonb_build_object('valid_hours',valid_hours));
 return result;
end; $$;
create function public.cp_admin_revoke_signup(admission uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update cp_private.mutation_lock set revision=revision+1 where id=true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 update cp_private.signup_admissions set revoked_at=now() where id=admission;
 if not found then raise exception 'signup request not found' using errcode='22023'; end if;
 insert into public.cp_audit(actor_id,target_id,action,detail)
 values(auth.uid(),admission,'signup.revoke','{}');
end; $$;
create function public.cp_admin_signup_directory() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc)
  from cp_private.signup_admissions s),'[]');
end; $$;
create function cp_private.is_commonplace_signup(identity_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from cp_private.signup_admissions where claimed_user_id=identity_id);
$$;
revoke all on function cp_private.is_commonplace_signup(uuid) from public,anon,authenticated,service_role;
revoke all on function public.cp_admin_prepare_signup(text,integer),public.cp_admin_revoke_signup(uuid),
 public.cp_admin_signup_directory() from public,anon,authenticated,service_role;
grant execute on function public.cp_admin_prepare_signup(text,integer),public.cp_admin_revoke_signup(uuid),
 public.cp_admin_signup_directory() to authenticated;

create or replace function public.chatak_enforce_allowlist() returns trigger
language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
 -- Lock the request once. The deferred FK allows binding the UUID in this
 -- BEFORE trigger; a failed Auth insert rolls the claim back atomically.
 select id into request_id from cp_private.signup_admissions
  where email=lower(new.email) for update;
 if request_id is not null then
  if exists(select 1 from public.authentication_mode_user_roles where lower(email)=lower(new.email)) then
   raise exception 'not_allowed'; -- Never silently convert CP-only into legacy access.
  end if;
  if not coalesce((select enabled from cp_private.signup_control where id=true),false) then raise exception 'not_allowed'; end if;
  update cp_private.signup_admissions set claimed_user_id=new.id,claimed_at=now()
   where id=request_id and revoked_at is null and expires_at>now() and claimed_user_id is null;
  if not found then raise exception 'not_allowed'; end if;
  return new;
 end if;
 if not exists(select 1 from public.authentication_mode_user_roles where lower(email)=lower(new.email)) then
  raise exception 'not_allowed';
 end if;
 return new;
end; $$;
create or replace function public.chatak_link_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if cp_private.is_commonplace_signup(new.id) then return new; end if;
 update public.authentication_mode_user_roles set auth_user_id=new.id,updated_at=now()
  where lower(email)=lower(new.email) and (auth_user_id is null or auth_user_id<>new.id);
 return new;
end; $$;
create or replace function public.chatak_handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if cp_private.is_commonplace_signup(new.id) then return new; end if;
 insert into public.chatak_profiles(id,email) values(new.id,new.email) on conflict(id) do nothing;
 return new;
end; $$;
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare next_id integer;
begin
 if cp_private.is_commonplace_signup(new.id) then return new; end if;
 -- Preserve the existing legacy path. No role is created for CP-only signups.
 select coalesce(max(id),0)+1 into next_id from public.authentication_mode_user_roles;
 insert into public.authentication_mode_user_roles(id,email,role,name,auth_user_id)
 values(next_id,new.email,'operator',coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),new.id)
 on conflict(auth_user_id) do nothing;
 update public.authentication_mode_user_roles set auth_user_id=new.id
  where auth_user_id is null and lower(email)=lower(new.email);
 insert into public.alarm_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end; $$;
-- Trigger execution remains intact; these routines are not browser RPCs.
revoke all on function public.chatak_enforce_allowlist(),public.chatak_link_auth_user(),
 public.chatak_handle_new_user(),public.handle_new_user() from public,anon,authenticated,service_role;
commit;
