-- Synthetic fixture only. Exact reviewed columns/constraints; permissive parent
-- policies model the public write path without copying private email literals.
drop table public.eagle_unit_progress,public.eagle_units,public.logi_versions,public.logi_assemblies,public.logi_projects;
create table public.logi_projects (
 id uuid not null default gen_random_uuid(),
 name text not null,
 description text,
 icon text default '📁'::text,
 color text default '#3498db'::text,
 is_visible boolean not null default true,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now(),
 serial_prefix text
);
create table public.logi_assemblies (
 id uuid not null default gen_random_uuid(),
 name text not null,
 description text,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now(),
 project_id uuid,
 is_visible boolean not null default true,
 current_version_id uuid
);
create table public.logi_versions (
 id uuid not null default gen_random_uuid(),
 assembly_id uuid not null,
 version text not null default '1.0'::text,
 status text not null default 'draft'::text,
 notes text,
 created_by text,
 created_at timestamp with time zone default now()
);
create table public.logi_nodes (
 id uuid not null default gen_random_uuid(),
 assembly_id uuid,
 name text not null,
 part_number text,
 qty integer default 1,
 status text,
 group_num integer,
 sequence_num integer,
 notes text,
 is_final boolean default false,
 is_orphan boolean default false,
 deleted boolean default false,
 x double precision,
 y double precision,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now(),
 is_locked boolean default false,
 tree_y real,
 tree_x real,
 sequence_tag text,
 version_id uuid,
 people_required integer default 1,
 time_estimate_min integer,
 flagged boolean default false,
 location text
);
create table public.logi_links (
 id uuid not null default gen_random_uuid(),
 assembly_id uuid,
 child_id uuid,
 parent_id uuid,
 fastener text,
 fastener_qty integer,
 deleted boolean default false,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now(),
 loctite text,
 torque_value numeric,
 torque_unit text default 'Nm'::text,
 qty integer default 1,
 label_position double precision default 0.5,
 version_id uuid
);
create table public.logi_revisions (
 id uuid not null default gen_random_uuid(),
 assembly_id uuid,
 label text,
 note text,
 created_at timestamp with time zone default now(),
 created_by text,
 snapshot jsonb
);
create table public.eagle_units (
 id uuid not null default gen_random_uuid(),
 assembly_id uuid not null,
 sn text,
 name text not null,
 state text not null default 'planned'::text,
 start_date date,
 target_date date,
 shipped_date date,
 notes text,
 created_at timestamp with time zone not null default now(),
 created_by text,
 version_id uuid
);
create table public.eagle_unit_progress (
 id uuid not null default gen_random_uuid(),
 unit_id uuid not null,
 node_id uuid not null,
 status text not null default 'todo'::text,
 actual_min integer,
 override_estimate integer,
 completed_at timestamp with time zone,
 completed_by text,
 notes text,
 created_at timestamp with time zone not null default now(),
 updated_at timestamp with time zone not null default now()
);
alter table public.logi_projects add constraint logi_projects_name_key UNIQUE (name);
alter table public.logi_projects add constraint logi_projects_pkey PRIMARY KEY (id);
alter table public.logi_assemblies add constraint logi_assemblies_name_key UNIQUE (name);
alter table public.logi_assemblies add constraint logi_assemblies_pkey PRIMARY KEY (id);
alter table public.logi_versions add constraint logi_versions_assembly_id_version_key UNIQUE (assembly_id, version);
alter table public.logi_versions add constraint logi_versions_pkey PRIMARY KEY (id);
alter table public.logi_versions add constraint logi_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'frozen'::text, 'production'::text])));
alter table public.logi_nodes add constraint logi_nodes_pkey PRIMARY KEY (id);
alter table public.logi_nodes add constraint logi_nodes_status_check CHECK (((status = ANY (ARRAY['NOT_STARTED'::text, 'IN_PROGRESS'::text, 'DONE'::text, 'BLOCKED'::text, 'ON_HOLD'::text, 'REVIEW'::text])) OR (status IS NULL)));
alter table public.logi_links add constraint logi_links_child_id_parent_id_key UNIQUE (child_id, parent_id);
alter table public.logi_links add constraint logi_links_pkey PRIMARY KEY (id);
alter table public.logi_revisions add constraint logi_revisions_pkey PRIMARY KEY (id);
alter table public.eagle_units add constraint eagle_units_pkey PRIMARY KEY (id);
alter table public.eagle_units add constraint eagle_units_state_check CHECK ((state = ANY (ARRAY['planned'::text, 'active'::text, 'shipped'::text])));
alter table public.eagle_unit_progress add constraint eagle_unit_progress_pkey PRIMARY KEY (id);
alter table public.eagle_unit_progress add constraint eagle_unit_progress_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'wip'::text, 'done'::text, 'blocked'::text])));
alter table public.eagle_unit_progress add constraint eagle_unit_progress_unit_id_node_id_key UNIQUE (unit_id, node_id);
alter table public.logi_assemblies add constraint logi_assemblies_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES logi_versions(id);
alter table public.logi_assemblies add constraint logi_assemblies_project_id_fkey FOREIGN KEY (project_id) REFERENCES logi_projects(id) ON DELETE CASCADE;
alter table public.logi_versions add constraint logi_versions_assembly_id_fkey FOREIGN KEY (assembly_id) REFERENCES logi_assemblies(id) ON DELETE CASCADE;
alter table public.logi_nodes add constraint logi_nodes_assembly_id_fkey FOREIGN KEY (assembly_id) REFERENCES logi_assemblies(id) ON DELETE CASCADE;
alter table public.logi_nodes add constraint logi_nodes_version_id_fkey FOREIGN KEY (version_id) REFERENCES logi_versions(id) ON DELETE CASCADE;
alter table public.logi_links add constraint logi_links_assembly_id_fkey FOREIGN KEY (assembly_id) REFERENCES logi_assemblies(id) ON DELETE CASCADE;
alter table public.logi_links add constraint logi_links_child_id_fkey FOREIGN KEY (child_id) REFERENCES logi_nodes(id) ON DELETE CASCADE;
alter table public.logi_links add constraint logi_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES logi_nodes(id) ON DELETE CASCADE;
alter table public.logi_links add constraint logi_links_version_id_fkey FOREIGN KEY (version_id) REFERENCES logi_versions(id) ON DELETE CASCADE;
alter table public.logi_revisions add constraint logi_revisions_assembly_id_fkey FOREIGN KEY (assembly_id) REFERENCES logi_assemblies(id) ON DELETE CASCADE;
alter table public.eagle_units add constraint eagle_units_assembly_id_fkey FOREIGN KEY (assembly_id) REFERENCES logi_assemblies(id) ON DELETE CASCADE;
alter table public.eagle_units add constraint eagle_units_version_id_fkey FOREIGN KEY (version_id) REFERENCES logi_versions(id) ON DELETE SET NULL;
alter table public.eagle_unit_progress add constraint eagle_unit_progress_node_id_fkey FOREIGN KEY (node_id) REFERENCES logi_nodes(id);
alter table public.eagle_unit_progress add constraint eagle_unit_progress_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES eagle_units(id) ON DELETE CASCADE;
alter table public.logi_projects enable row level security;
grant all on public.logi_projects to anon,authenticated,service_role;
create policy fixture_public_all on public.logi_projects for all to public using(true) with check(true);
alter table public.logi_assemblies enable row level security;
grant all on public.logi_assemblies to anon,authenticated,service_role;
create policy fixture_public_all on public.logi_assemblies for all to public using(true) with check(true);
alter table public.logi_versions enable row level security;
grant all on public.logi_versions to anon,authenticated,service_role;
create policy fixture_public_all on public.logi_versions for all to public using(true) with check(true);
alter table public.logi_nodes enable row level security;
grant all on public.logi_nodes to anon,authenticated,service_role;
create policy fixture_public_all on public.logi_nodes for all to public using(true) with check(true);
alter table public.logi_links enable row level security;
grant all on public.logi_links to anon,authenticated,service_role;
create policy fixture_public_all on public.logi_links for all to public using(true) with check(true);
alter table public.logi_revisions enable row level security;
grant all on public.logi_revisions to anon,authenticated,service_role;
create policy fixture_public_all on public.logi_revisions for all to public using(true) with check(true);
alter table public.eagle_units enable row level security;
grant all on public.eagle_units to anon,authenticated,service_role;
create policy eagle_units_authenticated_all on public.eagle_units for all to authenticated using(true) with check(true);
alter table public.eagle_unit_progress enable row level security;
grant all on public.eagle_unit_progress to anon,authenticated,service_role;
create policy eagle_unit_progress_authenticated_all on public.eagle_unit_progress for all to authenticated using(true) with check(true);
create function public.eagle_set_updated_at() returns trigger language plpgsql as $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
create trigger eagle_unit_progress_updated_at before update on public.eagle_unit_progress for each row execute function public.eagle_set_updated_at();

-- The shared role registry retains its reviewed policy contract. Only a verified
-- shared administrator can change roles; ordinary members cannot self-promote.
drop policy own_role on public.authentication_mode_user_roles;
drop policy fixture_registry_admin on public.authentication_mode_user_roles;
create policy amur_self_read on public.authentication_mode_user_roles for select to authenticated
 using(lower(email)=lower(auth.jwt()->>'email'));
create policy chatak_roles_admin_write on public.authentication_mode_user_roles for all to public
 using(public.chatak_role()='admin') with check(public.chatak_role()='admin');
create policy chatak_roles_self_read on public.authentication_mode_user_roles for select to public
 using(auth_user_id=auth.uid() or lower(email)=lower(coalesce(auth.jwt()->>'email','')));
