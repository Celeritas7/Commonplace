-- U9 real PostgREST regression: safeupdate rejects an unfiltered UPDATE.
-- Target the existing singleton explicitly. Do not disable safeupdate.
-- CREATE OR REPLACE preserves owners, ACLs, signatures and security settings.
-- The original migrations remain immutable; no data or policy is changed.
begin;

create or replace function public.cp_set_learner(target uuid, new_status text, new_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update cp_private.mutation_lock set revision = revision + 1 where id = true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode = '42501'; end if;
 if not exists(select 1 from auth.users where id = target and email_confirmed_at is not null) then
  raise exception 'verified account required' using errcode = '22023';
 end if;
 if exists(select 1 from public.cp_memberships where user_id = target and role = 'administrator') then
  raise exception 'designated owner cannot be changed by this operation' using errcode = '42501';
 end if;
 insert into public.cp_memberships(user_id,role,status,display_name) values (target,'learner',new_status,new_name)
 on conflict (user_id) do update set status = excluded.status, display_name = excluded.display_name;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'learner.set',jsonb_build_object('status',new_status));
end; $$;

create or replace function public.cp_set_section_grant(target uuid, section text, new_decision text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update cp_private.mutation_lock set revision = revision + 1 where id = true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode = '42501'; end if;
 if not exists(select 1 from public.cp_memberships where user_id = target and role = 'learner') then raise exception 'learner required' using errcode = '22023'; end if;
 if not exists(select 1 from public.cp_sections where id = section and kind = 'section') then raise exception 'explicit study section required' using errcode = '22023'; end if;
 insert into public.cp_section_grants values(target,section,new_decision)
 on conflict(user_id,section_id) do update set decision = excluded.decision;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'grant.set',jsonb_build_object('section',section,'decision',new_decision));
end; $$;

create or replace function cp_private.bootstrap_owner(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update cp_private.mutation_lock set revision = revision + 1 where id = true;
 if exists(select 1 from public.cp_memberships where role = 'administrator') then raise exception 'owner already bootstrapped'; end if;
 if not exists(select 1 from auth.users where id = target and email_confirmed_at is not null) then raise exception 'verified account required'; end if;
 insert into public.cp_memberships(user_id,role,status) values(target,'administrator','active');
 insert into public.cp_audit(actor_id,target_id,action,detail) values(null,target,'owner.bootstrap','{}');
end; $$;

create or replace function public.cp_admin_register(login_email text, learner_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare matches uuid[]; target uuid;
begin
 update cp_private.mutation_lock set revision=revision+1 where id = true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 if login_email is null or length(btrim(login_email)) not between 3 and 320 then raise exception 'valid login email required' using errcode='22023'; end if;
 select array_agg(id) into matches from auth.users where lower(email)=lower(btrim(login_email)) and email_confirmed_at is not null;
 if coalesce(cardinality(matches),0) <> 1 then raise exception 'one verified account required' using errcode='22023'; end if;
 target := matches[1];
 if exists(select 1 from public.cp_memberships where user_id=target) then raise exception 'account already registered; edit its existing access' using errcode='23505'; end if;
 -- Starts suspended and with no grants. Registration cannot reactivate old access.
 perform public.cp_set_learner(target,'suspended',learner_name);
 return target;
end; $$;

create or replace function public.cp_admin_save(target uuid, expected_revision bigint, learner_name text, new_status text, allowed_sections text[]) returns text
language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; sid text;
begin
 update cp_private.mutation_lock set revision=revision+1 where id = true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 select access_revision into current_revision from public.cp_memberships where user_id=target and role='learner';
 if not found then raise exception 'learner required' using errcode='22023'; end if;
 if expected_revision is null or current_revision <> expected_revision then raise exception 'access changed; reload before saving' using errcode='40001'; end if;
 if allowed_sections is null or cardinality(allowed_sections)>500 then raise exception 'explicit section list required' using errcode='22023'; end if;
 if exists(select 1 from unnest(allowed_sections) x where x is null or not exists(select 1 from public.cp_sections s where s.id=x and s.kind='section')) then raise exception 'invalid study section' using errcode='22023'; end if;
 perform public.cp_set_learner(target,new_status,learner_name);
 delete from public.cp_section_grants where user_id=target;
 -- Save a reviewed leaf snapshot; absence is default deny, never wildcard access.
 for sid in select distinct x from unnest(allowed_sections) x loop
  insert into public.cp_section_grants values(target,sid,'allow');
 end loop;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'access.replace',jsonb_build_object('status',new_status,'allowed',to_jsonb(allowed_sections),'previous_revision',current_revision::text));
 select access_revision into current_revision from public.cp_memberships where user_id=target;
 return current_revision::text;
end; $$;

create or replace function public.cp_admin_save_profile(target uuid, expected_revision bigint, new_profile jsonb, group_ids uuid[]) returns text
language plpgsql security definer set search_path='' as $$
declare current_revision bigint; gid uuid;
begin
 update cp_private.mutation_lock set revision=revision+1 where id = true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 if not exists(select 1 from public.cp_memberships where user_id=target and role='learner') then raise exception 'learner required' using errcode='22023'; end if;
 select coalesce((select revision from public.cp_learning_profiles where user_id=target),0) into current_revision;
 if expected_revision is null or expected_revision<>current_revision then raise exception 'profile changed; reload before saving' using errcode='40001'; end if;
 if not cp_private.valid_learning_profile(new_profile) then raise exception 'invalid professional profile' using errcode='22023'; end if;
 if group_ids is null or cardinality(group_ids)>50 or exists(select 1 from unnest(group_ids) x where x is null or not exists(select 1 from public.cp_profile_groups where id=x)) then raise exception 'invalid profile groups' using errcode='22023'; end if;
 insert into public.cp_learning_profiles(user_id,profile,revision) values(target,new_profile,1)
 on conflict(user_id) do update set profile=excluded.profile,revision=cp_learning_profiles.revision+1,updated_at=now();
 delete from public.cp_profile_group_members where user_id=target;
 for gid in select distinct x from unnest(group_ids) x loop insert into public.cp_profile_group_members values(target,gid); end loop;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'profile.save',jsonb_build_object('revision',(current_revision+1)::text,'group_count',cardinality(group_ids)));
 return (current_revision+1)::text;
end; $$;

create or replace function public.cp_admin_save_profile_group(target uuid, expected_revision bigint, new_name text, new_description text) returns uuid
language plpgsql security definer set search_path='' as $$
declare gid uuid; rev bigint;
begin
 update cp_private.mutation_lock set revision=revision+1 where id = true;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 if target is null then
  if expected_revision is distinct from 0 then raise exception 'new group requires revision zero' using errcode='40001'; end if;
  insert into public.cp_profile_groups(name,description) values(btrim(new_name),new_description) returning id into gid;
 else
  select revision into rev from public.cp_profile_groups where id=target;
  if not found or expected_revision is null or expected_revision<>rev then raise exception 'group changed; reload before saving' using errcode='40001'; end if;
  update public.cp_profile_groups set name=btrim(new_name),description=new_description,revision=revision+1 where id=target;
  gid:=target;
 end if;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),gid,'profile_group.save','{}');
 return gid;
end; $$;

create or replace function cp_private.material_admin_lock() returns void language plpgsql security definer set search_path='' as $$
begin update cp_private.mutation_lock set revision=revision+1 where id = true; if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if; end; $$;

create or replace function public.cp_service_material_finish_upload(target uuid,nonce uuid,actor uuid,receipt jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v public.cp_material_versions;
begin
 update cp_private.mutation_lock set revision=revision+1 where id = true;
 if not exists(select 1 from public.cp_memberships where user_id=actor and role='administrator' and status='active') then raise exception 'administrator required' using errcode='42501'; end if;
 select * into v from public.cp_material_versions where id=target;
 if not found or v.state<>'draft' or v.upload_nonce is distinct from nonce or v.upload_by is distinct from actor or nonce is null then raise exception 'upload became stale' using errcode='40001'; end if;
 if receipt is null or jsonb_typeof(receipt) is distinct from 'object' or jsonb_typeof(receipt->'filename') is distinct from 'string' or jsonb_typeof(receipt->'mime') is distinct from 'string' or jsonb_typeof(receipt->'sha256') is distinct from 'string' or jsonb_typeof(receipt->'bytes') is distinct from 'number' or not(receipt ?& array['filename','mime','bytes','sha256']) or receipt-array['filename','mime','bytes','sha256']<>'{}' or (receipt->>'filename') !~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{0,119}\.(xlsx|pdf|png|jpg|jpeg|txt)$' or (receipt->>'sha256') !~ '^[0-9a-f]{64}$' or (receipt->>'bytes')::bigint not between 1 and 10485760 or receipt->>'mime' not in ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/pdf','image/png','image/jpeg','text/plain') then raise exception 'invalid validated receipt' using errcode='22023'; end if;
 update public.cp_material_versions set asset=receipt||jsonb_build_object('path',target::text||'/'||nonce::text),upload_nonce=null,upload_by=null,revision=revision+1 where id=target;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(actor,target,'material.file',jsonb_build_object('sha256',receipt->>'sha256','bytes',receipt->'bytes'));
end; $$;

create or replace function public.cp_sync_write(expected_owner uuid, target uuid, section text, record text, record_kind text, expected_revision bigint, operation uuid, new_value jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.cp_study_state; actual bigint;
begin
 -- Same short transaction lock as access/publication mutations: check the current
 -- grant AFTER acquiring it, including revocation while a request was waiting.
 update cp_private.mutation_lock set revision=revision+1 where id = true;
 if expected_owner is null or expected_owner is distinct from auth.uid() then raise exception 'account changed' using errcode='42501'; end if;
 perform cp_private.check_study_material(target,section);
 if operation is null or expected_revision is null or expected_revision<0 or record is null or length(record) not between 1 and 160
  or record_kind is null or record_kind not in ('progress','bookmark','highlight','note')
  or jsonb_typeof(new_value) is distinct from 'object' or octet_length(new_value::text)>65536
 then raise exception 'invalid study record' using errcode='22023'; end if;
 select * into r from public.cp_study_state where user_id=auth.uid() and section_id=section and record_id=record and kind=record_kind;
 actual:=coalesce(r.revision,0);
 if r.material_version_id is not null and r.material_version_id<>target then raise exception 'material identity mismatch' using errcode='22023'; end if;
 if r.last_operation=operation then
  if r.value<>new_value then raise exception 'operation reused for different work' using errcode='22023'; end if;
  return jsonb_build_object('status','saved','revision',actual::text,'value',r.value);
 end if;
 if actual<>expected_revision then
  return jsonb_build_object('status','conflict','revision',actual::text,'value',r.value);
 end if;
 insert into public.cp_study_state(user_id,section_id,record_id,kind,value,revision,material_version_id,last_operation)
 values(auth.uid(),section,record,record_kind,new_value,1,target,operation)
 on conflict(user_id,section_id,record_id,kind) do update set value=excluded.value,revision=cp_study_state.revision+1,material_version_id=excluded.material_version_id,last_operation=excluded.last_operation;
 return jsonb_build_object('status','saved','revision',(actual+1)::text,'value',new_value);
end; $$;

commit;
