-- REVIEW CANDIDATE ONLY; requires the six CP migrations and reviewed legacy
-- hardened trigger definitions. The new signup path is installed CLOSED.
-- Preparation only: not an upgrade/replay script for an installed candidate.
begin;
do $$
declare expected record;
begin
 -- Fingerprint one installed contract from each immutable migration. This also
 -- supports installations applied directly in SQL without CLI migration history.
 if exists(select 1 from (values
  ('cp_private.is_admin()','52805502a30011bfc90beb58b31366a2'),
  ('cp_private.bump_member_revision()','3ec9a6950c83307786d7b5f471757de8'),
  ('public.cp_admin_profile(uuid)','487cfe9b66d84716c36c63660b81f826'),
  ('public.cp_read_material(uuid)','b417100e57d42e31d1286a4df8d5d152'),
  ('public.cp_offline_snapshot(text)','7986bad4cc5fb7b57ae0847151ffc231'),
  ('public.cp_admin_register(text,text)','dfc8462dcce068f277e062c2322e08d2'),
  ('cp_private.material_admin_lock()','f659c1b74df8f62b0ddb04cbe663a3cb'),
  ('public.cp_set_learner(uuid,text,text)','8ac4e5f4dd14d55c463f8611a0dc21b9')
 ) foundation(signature,body_hash) where not exists(
  select 1 from pg_proc p where p.oid=to_regprocedure(foundation.signature)
  and pg_get_userbyid(p.proowner)='postgres' and p.proconfig @> array['search_path=""']
  and p.prosecdef=(foundation.signature not in ('cp_private.bump_member_revision()','public.cp_offline_snapshot(text)'))
  and md5(replace(p.prosrc,E'\r\n',E'\n'))=foundation.body_hash
 )) then raise exception 'complete reviewed U1 through U9 foundation required'; end if;
 if not exists(select 1 from cp_private.mutation_lock where id=true) then raise exception 'administrator mutation lock required'; end if;
 if not exists(select 1 from pg_attribute where attrelid='auth.users'::regclass
  and attname='is_anonymous' and atttypid='boolean'::regtype and not attisdropped) then
  raise exception 'reviewed Auth identity shape required';
 end if;
 -- Reviewed hardened baseline; neither the old permissive routines nor a
 -- changed execution configuration may be silently accepted.
 for expected in select * from (values
  ('chatak_enforce_allowlist()','9648e02701ec0e1a252555a440332974','search_path=""'),
  ('chatak_handle_new_user()','48f98a54655222bd7289a2aa25785848','search_path=public'),
  ('chatak_link_auth_user()','bf25dc2ff8f698fd694a97801478da3c','search_path=""'),
  ('handle_new_user()','84adae8817ca5b4e889da3632fba57e8','search_path=""')) reviewed(signature,body_hash,configuration)
 loop
  if not exists(select 1 from pg_proc p where p.oid=to_regprocedure('public.'||expected.signature)
   and p.prosecdef and p.prorettype='trigger'::regtype and pg_get_userbyid(p.proowner)='postgres'
   and p.proconfig=array[expected.configuration]
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
    and t.tgtype=trigger_spec.kind and t.tgenabled='O' and t.tgqual is null
    and t.tgconstraint=0 and not t.tgdeferrable and not t.tginitdeferred and t.tgnargs=0)) then
  raise exception 'Auth trigger configuration changed since review';
 end if;
 if exists(select 1 from pg_trigger t join pg_proc p on p.oid=t.tgfoid
  where p.pronamespace='public'::regnamespace and p.pronargs=0 and
  p.proname in ('chatak_enforce_allowlist','chatak_link_auth_user','chatak_handle_new_user','handle_new_user')
  and t.tgrelid<>'auth.users'::regclass) then raise exception 'unexpected signup trigger attachment'; end if;
end $$;
create table cp_private.signup_control(id boolean primary key check(id),enabled boolean not null);
insert into cp_private.signup_control values(true,false);
create table cp_private.signup_admissions(
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email=lower(btrim(email)) and length(email) between 3 and 254),
 expires_at timestamptz not null,
 created_by uuid not null references public.cp_memberships(user_id) on delete restrict,
 created_at timestamptz not null default now(),
 revision integer not null default 1,
 revoked_at timestamptz,
 released_at timestamptz,
 completed_at timestamptz,
 claimed_user_id uuid unique references auth.users(id) on delete restrict deferrable initially deferred,
 claimed_at timestamptz,
 check((claimed_user_id is null)=(claimed_at is null)),
 check(released_at is null or claimed_user_id is null),
 check(completed_at is null or (claimed_user_id is not null and revoked_at is null))
);
alter table cp_private.signup_control enable row level security;
alter table cp_private.signup_admissions enable row level security;
revoke all on cp_private.signup_control,cp_private.signup_admissions from public,anon,authenticated,service_role;

-- All admin transitions share the same authorization/serialization as membership edits.
create function public.cp_admin_prepare_signup(login_email text,valid_hours integer default 24) returns uuid
language plpgsql security definer set search_path='' as $$
declare normalized text:=lower(btrim(login_email)); result uuid;
begin
 perform cp_private.material_admin_lock();
 if normalized is null or length(normalized)>254 or normalized!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or valid_hours is null or valid_hours not between 1 and 168 then raise exception 'invalid signup request' using errcode='22023'; end if;
 if exists(select 1 from auth.users where lower(email)=normalized) then
  raise exception 'account already exists; review its identity' using errcode='22023';
 end if;
 if exists(select 1 from public.authentication_mode_user_roles where lower(email)=normalized) then
  raise exception 'legacy application admission exists; review separately' using errcode='22023';
 end if;
 -- Creation never revives a withdrawn request. Renewals require its current revision.
 insert into cp_private.signup_admissions(email,expires_at,created_by)
 values(normalized,clock_timestamp()+make_interval(hours=>valid_hours),auth.uid())
 on conflict(email) do nothing returning id into result;
 if result is null then raise exception 'review existing admission' using errcode='40001'; end if;
 insert into public.cp_audit(actor_id,target_id,action,detail)
 values(auth.uid(),result,'signup.prepare',jsonb_build_object('valid_hours',valid_hours));
 return result;
end; $$;

create function cp_private.lock_signup(admission uuid, expected_revision integer) returns cp_private.signup_admissions
language plpgsql security definer set search_path='' as $$
declare s cp_private.signup_admissions;
begin
 perform cp_private.material_admin_lock();
 select * into s from cp_private.signup_admissions where id=admission for update;
 if not found or s.revision is distinct from expected_revision then
  raise exception 'reload signup request' using errcode='40001';
 end if;
 return s;
end; $$;

create function public.cp_admin_review_signup(admission uuid,expected_revision integer,decision text,valid_hours integer default 24) returns void
language plpgsql security definer set search_path='' as $$
declare s cp_private.signup_admissions; changed_at timestamptz;
begin
 s:=cp_private.lock_signup(admission,expected_revision);
 changed_at:=clock_timestamp();
 if s.completed_at is not null or s.released_at is not null then
  raise exception 'admission already closed' using errcode='22023';
 end if;
 case decision
 when 'withdraw' then
  if s.revoked_at is not null then raise exception 'already withdrawn' using errcode='22023'; end if;
  update cp_private.signup_admissions set revoked_at=changed_at,revision=revision+1 where id=admission;
 when 'renew' then
  if valid_hours is null or valid_hours not between 1 and 168 then raise exception 'invalid expiry' using errcode='22023'; end if;
  if exists(select 1 from public.authentication_mode_user_roles where lower(email)=s.email)
   or exists(select 1 from auth.users where lower(email)=s.email and id is distinct from s.claimed_user_id)
   or (s.claimed_user_id is not null and not exists(select 1 from auth.users where id=s.claimed_user_id and lower(email)=s.email))
   then raise exception 'identity conflict requires review' using errcode='22023'; end if;
  update cp_private.signup_admissions set revoked_at=null,expires_at=changed_at+make_interval(hours=>valid_hours),
   revision=revision+1 where id=admission;
 when 'release' then
  if s.claimed_user_id is not null or (s.revoked_at is null and s.expires_at>changed_at) then
   raise exception 'only withdrawn or expired unused requests can be released' using errcode='22023'; end if;
  update cp_private.signup_admissions set released_at=changed_at,revision=revision+1 where id=admission;
 else raise exception 'unknown signup decision' using errcode='22023';
 end case;
 insert into public.cp_audit(actor_id,target_id,action,detail)
 values(auth.uid(),admission,'signup.'||decision,jsonb_build_object('previous_revision',s.revision));
end; $$;

create function public.cp_admin_complete_signup(admission uuid,expected_revision integer,learner_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare s cp_private.signup_admissions;
begin
 s:=cp_private.lock_signup(admission,expected_revision);
 -- Hold the Auth row through the membership write so a concurrent email change
 -- cannot invalidate the check. A reservation is never transferred to a new UUID.
 perform 1 from auth.users where id=s.claimed_user_id and lower(email)=s.email and email_confirmed_at is not null for share;
 if not found then raise exception 'verified reserved identity required' using errcode='22023'; end if;
 if s.revoked_at is not null or s.released_at is not null or s.completed_at is not null or s.expires_at<=clock_timestamp() then
  raise exception 'admission not open for completion' using errcode='22023'; end if;
 if exists(select 1 from public.cp_memberships where user_id=s.claimed_user_id) then
  raise exception 'account already registered' using errcode='23505'; end if;
 update cp_private.signup_admissions set completed_at=clock_timestamp(),revision=revision+1 where id=admission;
 perform public.cp_set_learner(s.claimed_user_id,'suspended',learner_name);
 insert into public.cp_audit(actor_id,target_id,action,detail)
 values(auth.uid(),admission,'signup.complete',jsonb_build_object('previous_revision',s.revision));
 return s.claimed_user_id;
end; $$;

-- The original UUID-based member setter is also an admin entry point. Only a
-- genuinely new learner row needs this guard; existing membership edits keep working.
create function cp_private.check_signup_membership() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users u join cp_private.signup_admissions s
   on (s.claimed_user_id=u.id or s.email=lower(u.email)) where u.id=new.user_id and s.released_at is null
   and (s.completed_at is null or s.claimed_user_id is distinct from u.id)) then
  raise exception 'complete the verified signup request' using errcode='CP001';
 end if;
 return new;
end; $$;
revoke all on function cp_private.check_signup_membership() from public,anon,authenticated,service_role;
create trigger cp_check_signup_membership after insert on public.cp_memberships
 for each row when (new.role='learner') execute function cp_private.check_signup_membership();

-- Preserve existing-account registration while routing both the reserved email
-- and the reserved UUID through the new completion operation.
create or replace function public.cp_admin_register(login_email text,learner_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare normalized text:=lower(btrim(login_email)); target uuid;
begin
 perform cp_private.material_admin_lock();
 if normalized is null or length(normalized) not between 3 and 320 then raise exception 'valid login email required' using errcode='22023'; end if;
 begin
  select id into strict target from auth.users where lower(email)=normalized and email_confirmed_at is not null for share;
 exception when no_data_found or too_many_rows then raise exception 'one verified account required' using errcode='22023';
 end;
 if exists(select 1 from cp_private.signup_admissions where released_at is null and (email=normalized or claimed_user_id=target)) then
  raise exception 'use signup request for verified registration' using errcode='CP001'; end if;
 if exists(select 1 from public.cp_memberships where user_id=target) then raise exception 'account already registered' using errcode='23505'; end if;
 perform public.cp_set_learner(target,'suspended',learner_name);
 return target;
end; $$;

-- Read only: request preparation never opens this private admission gate.
create function public.cp_admin_signup_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare signup_enabled boolean;
begin
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 select enabled into signup_enabled from cp_private.signup_control where id=true;
 return jsonb_build_object('status',case when signup_enabled then 'enabled'
  when signup_enabled=false then 'paused' else 'unavailable' end);
end; $$;

create function public.cp_admin_signup_directory() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('state',case
  when s.completed_at is not null then 'completed' when s.released_at is not null then 'released'
  when s.revoked_at is not null then 'withdrawn' when s.expires_at<=statement_timestamp() then 'expired'
  when s.claimed_user_id is null then 'pending' when lower(u.email) is distinct from s.email then 'identity_changed'
  when u.email_confirmed_at is null then 'awaiting_confirmation' else 'verified' end) order by s.created_at desc)
  from cp_private.signup_admissions s left join auth.users u on u.id=s.claimed_user_id),'[]');
end; $$;
create function cp_private.is_commonplace_signup(identity_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from cp_private.signup_admissions where claimed_user_id=identity_id);
$$;
revoke all on function cp_private.is_commonplace_signup(uuid),cp_private.lock_signup(uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.cp_admin_prepare_signup(text,integer),public.cp_admin_review_signup(uuid,integer,text,integer),
 public.cp_admin_complete_signup(uuid,integer,text),public.cp_admin_signup_directory(),public.cp_admin_signup_status() from public,anon,authenticated,service_role;
grant execute on function public.cp_admin_prepare_signup(text,integer),public.cp_admin_review_signup(uuid,integer,text,integer),
 public.cp_admin_complete_signup(uuid,integer,text),public.cp_admin_signup_directory(),public.cp_admin_signup_status() to authenticated;

-- Lock the exact preapproval in the BEFORE gate. The Auth FK can be written
-- only after insertion. Recheck uniqueness there before linking the same row.
create function cp_private.legacy_signup_approval(login_email text,identity_id uuid) returns public.authentication_mode_user_roles
language plpgsql security definer set search_path='' as $$
declare approved public.authentication_mode_user_roles;
begin
 if identity_id is null or login_email is null or btrim(login_email)='' then raise exception 'not_allowed'; end if;
 select * into strict approved from public.authentication_mode_user_roles
  where lower(email)=lower(login_email) for update;
 if approved.auth_user_id is not null and approved.auth_user_id is distinct from identity_id then
  raise exception using errcode='42501',message='registry_link_conflict';
 end if;
 return approved;
exception when no_data_found or too_many_rows then raise exception 'not_allowed';
end; $$;
revoke all on function cp_private.legacy_signup_approval(text,uuid) from public,anon,authenticated,service_role;

create or replace function public.chatak_enforce_allowlist() returns trigger
language plpgsql security definer set search_path='' as $$
declare s cp_private.signup_admissions; claim_time timestamptz;
begin
 -- Apply the hardened identity gate to both legacy and CP-only admissions,
 -- before a request can reserve a UUID or change its revision.
 if new.id is null or new.is_anonymous is distinct from false
  or new.email is null or btrim(new.email)='' then raise exception 'not_allowed'; end if;
 select * into s from cp_private.signup_admissions where email=lower(new.email) for update;
 if found and s.released_at is null then
  if exists(select 1 from public.authentication_mode_user_roles where lower(email)=s.email) then raise exception 'not_allowed'; end if;
  -- Hold the control row through commit. Closing waits for admitted transactions.
  perform 1 from cp_private.signup_control where id=true and enabled for share;
  claim_time:=clock_timestamp();
  if not found or s.revoked_at is not null or s.expires_at<=claim_time or s.claimed_user_id is not null then raise exception 'not_allowed'; end if;
  update cp_private.signup_admissions set claimed_user_id=new.id,claimed_at=claim_time,revision=revision+1 where id=s.id;
  return new;
 end if;
 perform cp_private.legacy_signup_approval(new.email,new.id);
 return new;
end; $$;

create or replace function public.chatak_link_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare approved public.authentication_mode_user_roles;
begin
 if new.id is null or new.is_anonymous is distinct from false
  or new.email is null or btrim(new.email)='' then raise exception 'not_allowed'; end if;
 if cp_private.is_commonplace_signup(new.id) then return new; end if;
 approved:=cp_private.legacy_signup_approval(new.email,new.id);
 if approved.auth_user_id is null then
  update public.authentication_mode_user_roles set auth_user_id=new.id,updated_at=now()
   where id=approved.id and auth_user_id is null;
  if not found then raise exception using errcode='42501',message='registry_link_conflict'; end if;
 end if;
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
begin
 if cp_private.is_commonplace_signup(new.id) then return new; end if;
 -- Retain the hardened postcondition even if a later trigger suppresses or
 -- changes a link. Never create settings for a legacy identity left unlinked.
 if not exists(select 1 from public.authentication_mode_user_roles r
  where r.auth_user_id=new.id and lower(r.email)=lower(new.email)) then
  raise exception using errcode='42501',message='registry_link_required';
 end if;
 insert into public.alarm_settings(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end; $$;
revoke all on function public.chatak_enforce_allowlist(),public.chatak_link_auth_user(),
 public.chatak_handle_new_user(),public.handle_new_user() from public,anon,authenticated,service_role;
commit;
