-- Isolated U1 foundation. NOT applied to a hosted project by this repository.
begin;
create schema cp_private;
revoke all on schema cp_private from public, anon, authenticated;

create table public.cp_memberships (
 user_id uuid primary key references auth.users(id) on delete restrict,
 role text not null check (role in ('administrator','learner')),
 status text not null check (status in ('active','suspended','revoked')),
 display_name text not null default '' check (length(display_name) <= 120),
 check (role <> 'administrator' or status = 'active')
);
-- U1 deliberately supports exactly one designated owner, never first-signup admin.
create unique index cp_single_administrator on public.cp_memberships(role) where role = 'administrator';
create table public.cp_sections (
 id text primary key check (id ~ '^[a-z][a-z0-9.-]{0,79}$'),
 parent_id text references public.cp_sections(id),
 title text not null,
 kind text not null check (kind in ('hub','section','planned')),
 check (parent_id is null or parent_id <> id)
);
create table public.cp_section_grants (
 user_id uuid not null references public.cp_memberships(user_id) on delete restrict,
 section_id text not null references public.cp_sections(id),
 decision text not null check (decision in ('allow','deny')),
 primary key (user_id, section_id)
);
create table public.cp_study_state (
 user_id uuid not null references public.cp_memberships(user_id) on delete restrict,
 section_id text not null references public.cp_sections(id),
 record_id text not null check (length(record_id) between 1 and 160),
 kind text not null check (kind in ('progress','bookmark','highlight','note')),
 value jsonb not null check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 65536),
 primary key (user_id,section_id,record_id,kind)
);
create table public.cp_audit (
 id bigint generated always as identity primary key,
 actor_id uuid, target_id uuid not null,
 action text not null, detail jsonb not null,
 occurred_at timestamptz not null default now()
);
create table cp_private.mutation_lock (id boolean primary key default true check (id), revision bigint not null default 0);
insert into cp_private.mutation_lock default values;
revoke all on cp_private.mutation_lock from public, anon, authenticated, service_role;
revoke all on sequence public.cp_audit_id_seq from public, anon, authenticated;

-- Definer helpers avoid recursive membership RLS. They inspect only auth.uid(),
-- never caller-provided identity or editable JWT user metadata.
create function cp_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.cp_memberships where user_id = auth.uid() and role = 'administrator' and status = 'active');
$$;
create function cp_private.can_study(section text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (
  select 1 from public.cp_memberships m join public.cp_sections s on s.id = section
  where m.user_id = auth.uid() and m.status = 'active' and s.kind = 'section'
  and (m.role = 'administrator' or exists (
   select 1 from public.cp_section_grants g where g.user_id = m.user_id and g.section_id = s.id and g.decision = 'allow'))
 );
$$;
-- Hub visibility is presentation only, not a grant to descendants.
create function cp_private.can_see_section(section text) returns boolean
language sql stable security definer set search_path = '' as $$
 with recursive descendants as (
  select id from public.cp_sections where id = section
  union all select s.id from public.cp_sections s join descendants d on s.parent_id = d.id
 ) select cp_private.is_admin() or exists(select 1 from descendants where cp_private.can_study(id));
$$;

alter table public.cp_memberships enable row level security;
alter table public.cp_sections enable row level security;
alter table public.cp_section_grants enable row level security;
alter table public.cp_study_state enable row level security;
alter table public.cp_audit enable row level security;
alter table cp_private.mutation_lock enable row level security;
revoke all on public.cp_memberships, public.cp_sections, public.cp_section_grants, public.cp_study_state, public.cp_audit from public, anon, authenticated;
grant select on public.cp_memberships, public.cp_sections, public.cp_section_grants, public.cp_audit to authenticated;
grant select, insert, update, delete on public.cp_study_state to authenticated;
create policy membership_read on public.cp_memberships for select to authenticated using (user_id = (select auth.uid()) or cp_private.is_admin());
create policy section_read on public.cp_sections for select to authenticated using (cp_private.can_see_section(id));
create policy grant_read on public.cp_section_grants for select to authenticated using (user_id = (select auth.uid()) or cp_private.is_admin());
create policy audit_read on public.cp_audit for select to authenticated using (cp_private.is_admin());
create policy state_read on public.cp_study_state for select to authenticated using (user_id = (select auth.uid()) and cp_private.can_study(section_id));
create policy state_insert on public.cp_study_state for insert to authenticated with check (user_id = (select auth.uid()) and cp_private.can_study(section_id));
create policy state_update on public.cp_study_state for update to authenticated using (user_id = (select auth.uid()) and cp_private.can_study(section_id)) with check (user_id = (select auth.uid()) and cp_private.can_study(section_id));
create policy state_delete on public.cp_study_state for delete to authenticated using (user_id = (select auth.uid()) and cp_private.can_study(section_id));

-- Serializes administration, checks authority AFTER the lock, and audits atomically.
create function public.cp_set_learner(target uuid, new_status text, new_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update cp_private.mutation_lock set revision = revision + 1;
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
create function public.cp_set_section_grant(target uuid, section text, new_decision text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update cp_private.mutation_lock set revision = revision + 1;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode = '42501'; end if;
 if not exists(select 1 from public.cp_memberships where user_id = target and role = 'learner') then raise exception 'learner required' using errcode = '22023'; end if;
 if not exists(select 1 from public.cp_sections where id = section and kind = 'section') then raise exception 'explicit study section required' using errcode = '22023'; end if;
 insert into public.cp_section_grants values(target,section,new_decision)
 on conflict(user_id,section_id) do update set decision = excluded.decision;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'grant.set',jsonb_build_object('section',section,'decision',new_decision));
end; $$;
-- Operational bootstrap only: not exposed to anon/authenticated/service_role.
-- Operator must verify this UUID is the intended owner in the TARGET auth project.
create function cp_private.bootstrap_owner(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 update cp_private.mutation_lock set revision = revision + 1;
 if exists(select 1 from public.cp_memberships where role = 'administrator') then raise exception 'owner already bootstrapped'; end if;
 if not exists(select 1 from auth.users where id = target and email_confirmed_at is not null) then raise exception 'verified account required'; end if;
 insert into public.cp_memberships(user_id,role,status) values(target,'administrator','active');
 insert into public.cp_audit(actor_id,target_id,action,detail) values(null,target,'owner.bootstrap','{}');
end; $$;
revoke all on all functions in schema cp_private from public, anon, authenticated, service_role;
grant usage on schema cp_private to authenticated;
grant execute on function cp_private.is_admin(), cp_private.can_study(text), cp_private.can_see_section(text) to authenticated;
revoke all on function public.cp_set_learner(uuid,text,text), public.cp_set_section_grant(uuid,text,text) from public, anon, authenticated;
grant execute on function public.cp_set_learner(uuid,text,text), public.cp_set_section_grant(uuid,text,text) to authenticated;
insert into public.cp_sections(id,parent_id,title,kind) values
('coding',null,'Coding','hub'),
('coding.sql','coding','Sql','section'),
('coding.cpp','coding','Cpp','section'),
('coding.python','coding','Python','section'),
('coding.ai','coding','Ai','section'),
('coding.bat','coding','Bat','section'),
('coding.web','coding','Web','section'),
('mechanical',null,'Mechanical','hub'),
('mechanical.automobile','mechanical','Automobile','section'),
('mechanical.calculations','mechanical','Calculations','section'),
('mechanical.cmti','mechanical','Cmti','section'),
('mechanical.gdt','mechanical','Gdt','section'),
('mechanical.harness','mechanical','Harness','section'),
('mechanical.hoses','mechanical','Hoses','section'),
('mechanical.machine-design','mechanical','Machine Design','section'),
('mechanical.manufacturing','mechanical','Manufacturing','section'),
('mechanical.motion','mechanical','Motion','section'),
('mechanical.sheet-metal','mechanical','Sheet Metal','section'),
('mechanical.movements','mechanical','Movements','section'),
('maths',null,'Maths','hub'),
('maths.statistics','maths','Statistics','section'),
('maths.algebra-trigonometry','maths','Algebra Trigonometry','section'),
('maths.calculus','maths','Calculus','planned'),
('maths.linear-algebra','maths','Linear Algebra','planned'),
('office',null,'Office','hub'),
('office.excel','office','Excel','section'),
('office.vba','office','Vba','section'),
('office.power-query','office','Power Query','planned'),
('languages',null,'Languages','planned'),
('languages.japanese','languages','Japanese','planned'),
('languages.german','languages','German','planned'),
('languages.sanskrit','languages','Sanskrit','planned'),
('languages.french','languages','French','planned'),
('exercises',null,'Exercises','planned');
commit;
