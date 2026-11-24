begin;
create function cp_private.valid_learning_profile(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; item jsonb;
begin
 if value is null or jsonb_typeof(value)<>'object' or octet_length(value::text)>32768 then return false; end if;
 for k,v in select * from jsonb_each(value) loop
  if k in ('background','occupation','industry','existing_knowledge','preferred_language','additional_requirements') then
   if jsonb_typeof(v)<>'string' or length(v#>>'{}')>2000 then return false; end if;
  elsif k='difficulty' then
   if jsonb_typeof(v)<>'string' or v#>>'{}' not in ('','beginner','intermediate','advanced','mixed') then return false; end if;
  elsif k in ('responsibilities','learning_objectives','countries_markets','currencies_units','scenarios') then
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v)>20 then return false; end if;
   for item in select * from jsonb_array_elements(v) loop
    if jsonb_typeof(item)<>'string' or length(item#>>'{}')>300 then return false; end if;
   end loop;
  else return false;
  end if;
 end loop;
 return true;
end; $$;
create table public.cp_learning_profiles (
 user_id uuid primary key references public.cp_memberships(user_id) on delete restrict,
 profile jsonb not null default '{}' check(cp_private.valid_learning_profile(profile)),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
create table public.cp_profile_groups (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 1 and 100),
 description text not null default '' check(length(description)<=500),
 revision bigint not null default 1 check(revision>0)
);
create unique index cp_profile_group_name on public.cp_profile_groups(lower(btrim(name)));
create table public.cp_profile_group_members (
 user_id uuid not null references public.cp_learning_profiles(user_id) on delete restrict,
 group_id uuid not null references public.cp_profile_groups(id) on delete restrict,
 primary key(user_id,group_id)
);
create index cp_profile_group_members_by_group on public.cp_profile_group_members(group_id,user_id);
alter table public.cp_learning_profiles enable row level security;
alter table public.cp_profile_groups enable row level security;
alter table public.cp_profile_group_members enable row level security;
revoke all on public.cp_learning_profiles,public.cp_profile_groups,public.cp_profile_group_members from public,anon,authenticated;
grant select on public.cp_learning_profiles,public.cp_profile_groups,public.cp_profile_group_members to authenticated;
create policy profile_read on public.cp_learning_profiles for select to authenticated using (
 cp_private.is_admin() or (user_id=(select auth.uid()) and exists(select 1 from public.cp_memberships m where m.user_id=(select auth.uid()) and m.status='active'))
);
create policy group_read on public.cp_profile_groups for select to authenticated using(cp_private.is_admin());
create policy group_members_read on public.cp_profile_group_members for select to authenticated using(cp_private.is_admin());

create function public.cp_admin_profile(target uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 if not exists(select 1 from public.cp_memberships where user_id=target and role='learner') then raise exception 'learner required' using errcode='22023'; end if;
 select jsonb_build_object('profile',coalesce((select profile from public.cp_learning_profiles where user_id=target),'{}'),
 'revision',coalesce((select revision::text from public.cp_learning_profiles where user_id=target),'0'),
 'group_ids',coalesce((select jsonb_agg(group_id order by group_id) from public.cp_profile_group_members where user_id=target),'[]'),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description,'revision',revision::text) order by name) from public.cp_profile_groups),'[]')) into result;
 return result;
end; $$;
create function public.cp_admin_save_profile(target uuid, expected_revision bigint, new_profile jsonb, group_ids uuid[]) returns text
language plpgsql security definer set search_path='' as $$
declare current_revision bigint; gid uuid;
begin
 update cp_private.mutation_lock set revision=revision+1;
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
create function public.cp_admin_save_profile_group(target uuid, expected_revision bigint, new_name text, new_description text) returns uuid
language plpgsql security definer set search_path='' as $$
declare gid uuid; rev bigint;
begin
 update cp_private.mutation_lock set revision=revision+1;
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
revoke all on function cp_private.valid_learning_profile(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.cp_admin_profile(uuid),public.cp_admin_save_profile(uuid,bigint,jsonb,uuid[]),public.cp_admin_save_profile_group(uuid,bigint,text,text) from public,anon,authenticated,service_role;
grant execute on function public.cp_admin_profile(uuid),public.cp_admin_save_profile(uuid,bigint,jsonb,uuid[]),public.cp_admin_save_profile_group(uuid,bigint,text,text) to authenticated;
commit;
