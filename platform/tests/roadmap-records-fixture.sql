-- Reviewed catalog shape only. No hosted rows, identities or personal data.
-- Loaded after roadmap-session-fixture.sql in disposable test databases.
create table public.roadmap_comparison_items (
 id uuid default gen_random_uuid() not null,
 user_id uuid default auth.uid() not null,
 comparison_id uuid not null,
 name text not null,
 brand text,
 model text,
 image_url text,
 url text,
 shop text,
 price numeric,
 currency text default 'JPY'::text not null,
 quality numeric,
 life_years numeric,
 warranty_months integer,
 size text,
 rating numeric,
 review_count integer,
 pros text[] default '{}'::text[] not null,
 cons text[] default '{}'::text[] not null,
 extra jsonb default '{}'::jsonb not null,
 notes text,
 position integer default 0 not null,
 created_at timestamp with time zone default now() not null
);
create table public.roadmap_comparisons (
 id uuid default gen_random_uuid() not null,
 user_id uuid default auth.uid() not null,
 task_id uuid,
 title text not null,
 need text,
 weights jsonb default '{}'::jsonb not null,
 source text,
 notes text,
 chosen_item uuid,
 created_at timestamp with time zone default now() not null,
 updated_at timestamp with time zone default now() not null
);
create table public.roadmap_contexts_map (
 id text not null,
 label text not null,
 user_id uuid default auth.uid() not null
);
create table public.roadmap_daily_logs (
 id uuid default gen_random_uuid() not null,
 user_id uuid default auth.uid() not null,
 task_id uuid,
 log_date date default CURRENT_DATE,
 context text,
 duration_minutes integer,
 notes text,
 created_at timestamp with time zone default now()
);
create table public.roadmap_projects (
 id text not null,
 user_id uuid default auth.uid() not null,
 label text not null,
 short text default ''::text not null,
 hue integer default 220 not null,
 role_id text,
 position integer default 0 not null,
 created_at timestamp with time zone default now() not null,
 updated_at timestamp with time zone default now() not null
);
create table public.roadmap_role_locations (
 role_id text not null,
 location_id text not null,
 user_id uuid default auth.uid() not null
);
create table public.roadmap_roles (
 id text not null,
 user_id uuid default auth.uid() not null,
 label text not null,
 subtitle text default ''::text not null,
 badge text default ''::text not null,
 mood text default ''::text not null,
 hue integer default 220 not null,
 start_hour integer default 9 not null,
 end_hour integer default 19 not null,
 weekend_active boolean default false not null,
 weekend_start integer,
 weekend_end integer,
 position integer default 0 not null,
 created_at timestamp with time zone default now() not null,
 updated_at timestamp with time zone default now() not null
);
create table public.roadmap_suggestion_answers (
 id bigint generated always as identity not null,
 user_id uuid default auth.uid() not null,
 seq bigint,
 suggestion_id text not null,
 from_app text not null,
 action text not null,
 reason text,
 answered_at_app text,
 received_at timestamp with time zone default now() not null
);
create table public.roadmap_suggestions (
 id text not null,
 user_id uuid default auth.uid() not null,
 task jsonb not null,
 rm_task_id uuid,
 title text not null,
 level text,
 ctx jsonb default '{}'::jsonb not null,
 tone_step smallint default 0 not null,
 say text not null,
 made_at timestamp with time zone default now() not null,
 until timestamp with time zone not null,
 answer text,
 reason text,
 answer_app text,
 answered_at timestamp with time zone,
 missed boolean,
 done_at timestamp with time zone
);
create table public.roadmap_task_resources (
 id uuid default gen_random_uuid() not null,
 user_id uuid default auth.uid() not null,
 task_id uuid not null,
 label text not null,
 url text not null,
 kind text default 'web'::text not null,
 position integer default 0 not null,
 created_at timestamp with time zone default now() not null
);
create table public.roadmap_user_settings (
 user_id uuid default auth.uid() not null,
 role_overrides jsonb default '{}'::jsonb,
 custom_rules jsonb default '{}'::jsonb,
 preferences jsonb default '{}'::jsonb,
 updated_at timestamp with time zone default now()
);
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_life_years_check CHECK ((life_years >= (0)::numeric));
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_pkey PRIMARY KEY (id);
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_price_check CHECK ((price >= (0)::numeric));
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_quality_check CHECK (((quality >= (0)::numeric) AND (quality <= (5)::numeric)));
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)));
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_review_count_check CHECK ((review_count >= 0));
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_warranty_months_check CHECK ((warranty_months >= 0));
alter table public.roadmap_comparisons add constraint roadmap_comparisons_pkey PRIMARY KEY (id);
alter table public.roadmap_contexts_map add constraint roadmap_contexts_map_pkey PRIMARY KEY (id);
alter table public.roadmap_daily_logs add constraint roadmap_daily_logs_pkey PRIMARY KEY (id);
alter table public.roadmap_projects add constraint roadmap_projects_hue_check CHECK (((hue >= 0) AND (hue <= 360)));
alter table public.roadmap_projects add constraint roadmap_projects_pkey PRIMARY KEY (id, user_id);
alter table public.roadmap_role_locations add constraint roadmap_role_locations_pkey PRIMARY KEY (role_id, location_id, user_id);
alter table public.roadmap_roles add constraint roadmap_roles_end_hour_check CHECK (((end_hour >= 0) AND (end_hour <= 23)));
alter table public.roadmap_roles add constraint roadmap_roles_hue_check CHECK (((hue >= 0) AND (hue <= 360)));
alter table public.roadmap_roles add constraint roadmap_roles_pkey PRIMARY KEY (id, user_id);
alter table public.roadmap_roles add constraint roadmap_roles_start_hour_check CHECK (((start_hour >= 0) AND (start_hour <= 23)));
alter table public.roadmap_roles add constraint roadmap_roles_weekend_end_check CHECK (((weekend_end >= 0) AND (weekend_end <= 23)));
alter table public.roadmap_roles add constraint roadmap_roles_weekend_start_check CHECK (((weekend_start >= 0) AND (weekend_start <= 23)));
alter table public.roadmap_suggestion_answers add constraint roadmap_suggestion_answers_pkey PRIMARY KEY (id);
alter table public.roadmap_suggestion_answers add constraint roadmap_suggestion_answers_user_id_seq_key UNIQUE (user_id, seq);
alter table public.roadmap_suggestions add constraint roadmap_suggestions_pkey PRIMARY KEY (id);
alter table public.roadmap_suggestions add constraint roadmap_suggestions_tone_step_check CHECK (((tone_step >= 0) AND (tone_step <= 5)));
alter table public.roadmap_task_resources add constraint roadmap_task_resources_kind_check CHECK ((kind = ANY (ARRAY['web'::text, 'app'::text])));
alter table public.roadmap_task_resources add constraint roadmap_task_resources_pkey PRIMARY KEY (id);
alter table public.roadmap_user_settings add constraint roadmap_user_settings_pkey PRIMARY KEY (user_id);
alter table public.roadmap_comparison_items add constraint roadmap_comparison_items_comparison_id_fkey FOREIGN KEY (comparison_id) REFERENCES roadmap_comparisons(id) ON DELETE CASCADE;
alter table public.roadmap_comparisons add constraint roadmap_comparisons_task_id_fkey FOREIGN KEY (task_id) REFERENCES roadmap_tasks(id) ON DELETE SET NULL;
alter table public.roadmap_contexts_map add constraint roadmap_contexts_map_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.roadmap_daily_logs add constraint roadmap_daily_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES roadmap_tasks(id) ON DELETE SET NULL;
alter table public.roadmap_projects add constraint roadmap_projects_role_id_user_id_fkey FOREIGN KEY (role_id, user_id) REFERENCES roadmap_roles(id, user_id) ON DELETE SET NULL;
alter table public.roadmap_role_locations add constraint roadmap_role_locations_role_id_user_id_fkey FOREIGN KEY (role_id, user_id) REFERENCES roadmap_roles(id, user_id) ON DELETE CASCADE;
alter table public.roadmap_suggestion_answers add constraint roadmap_suggestion_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.roadmap_suggestions add constraint roadmap_suggestions_rm_task_id_fkey FOREIGN KEY (rm_task_id) REFERENCES roadmap_tasks(id) ON DELETE SET NULL;
alter table public.roadmap_suggestions add constraint roadmap_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.roadmap_task_resources add constraint roadmap_task_resources_task_id_fkey FOREIGN KEY (task_id) REFERENCES roadmap_tasks(id) ON DELETE CASCADE;
alter table public.roadmap_comparison_items enable row level security;
grant all on public.roadmap_comparison_items to anon,authenticated,service_role;
create policy roadmap_comparison_items_owner on public.roadmap_comparison_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.roadmap_comparisons enable row level security;
grant all on public.roadmap_comparisons to anon,authenticated,service_role;
create policy roadmap_comparisons_owner on public.roadmap_comparisons for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
CREATE TRIGGER roadmap_comparisons_updated_at BEFORE UPDATE ON public.roadmap_comparisons FOR EACH ROW EXECUTE FUNCTION roadmap_set_updated_at();
alter table public.roadmap_contexts_map enable row level security;
grant all on public.roadmap_contexts_map to anon,authenticated,service_role;
create policy roadmap_contexts_map_owner on public.roadmap_contexts_map for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.roadmap_daily_logs enable row level security;
grant all on public.roadmap_daily_logs to anon,authenticated,service_role;
create policy roadmap_daily_logs_owner on public.roadmap_daily_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.roadmap_projects enable row level security;
grant all on public.roadmap_projects to anon,authenticated,service_role;
create policy roadmap_projects_owner on public.roadmap_projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
CREATE TRIGGER roadmap_projects_set_updated_at BEFORE UPDATE ON public.roadmap_projects FOR EACH ROW EXECUTE FUNCTION roadmap_set_updated_at();
alter table public.roadmap_role_locations enable row level security;
grant all on public.roadmap_role_locations to anon,authenticated,service_role;
create policy roadmap_role_locations_owner on public.roadmap_role_locations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.roadmap_roles enable row level security;
grant all on public.roadmap_roles to anon,authenticated,service_role;
create policy roadmap_roles_owner on public.roadmap_roles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
CREATE TRIGGER roadmap_roles_set_updated_at BEFORE UPDATE ON public.roadmap_roles FOR EACH ROW EXECUTE FUNCTION roadmap_set_updated_at();
alter table public.roadmap_suggestion_answers enable row level security;
grant all on public.roadmap_suggestion_answers to anon,authenticated,service_role;
create policy roadmap_suggestion_answers_own on public.roadmap_suggestion_answers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.roadmap_suggestions enable row level security;
grant all on public.roadmap_suggestions to anon,authenticated,service_role;
create policy roadmap_suggestions_own on public.roadmap_suggestions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.roadmap_task_resources enable row level security;
grant all on public.roadmap_task_resources to anon,authenticated,service_role;
create policy roadmap_task_resources_owner on public.roadmap_task_resources for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.roadmap_user_settings enable row level security;
grant all on public.roadmap_user_settings to anon,authenticated,service_role;
create policy roadmap_user_settings_owner on public.roadmap_user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
CREATE TRIGGER roadmap_user_settings_set_updated_at BEFORE UPDATE ON public.roadmap_user_settings FOR EACH ROW EXECUTE FUNCTION roadmap_set_updated_at();
grant all on sequence public.roadmap_suggestion_answers_id_seq to anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.roadmap_save_comparison(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := coalesce(auth.uid(), nullif(p->>'user_id', '')::uuid);
  tid uuid := nullif(p->>'task_id', '')::uuid;
  ttl text := coalesce(nullif(trim(p->>'title'), ''), nullif(trim(p->>'task_title'), ''));
  cap uuid; shop uuid; cid uuid; it jsonb; n int := 0;
begin
  if uid is null then raise exception 'roadmap_save_comparison: no user (sign in, or pass user_id)'; end if;
  if ttl is null then raise exception 'roadmap_save_comparison: title is required'; end if;
  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'roadmap_save_comparison: items must be a non-empty array';
  end if;

  if tid is not null and not exists (select 1 from roadmap_tasks where id = tid and user_id = uid) then
    raise exception 'roadmap_save_comparison: task % not found', tid;
  end if;
  if tid is null and nullif(trim(p->>'task_title'), '') is not null then
    select id into tid from roadmap_tasks
     where user_id = uid and kind = 'task' and coalesce(done, false) = false
       and lower(title) = lower(trim(p->>'task_title'))
     order by created_at desc limit 1;
  end if;
  if tid is null then
    select id into cap from roadmap_tasks
     where user_id = uid and parent_id is null and kind = 'group' and title = 'Captured' and 'inbox' = any(tags)
     order by created_at limit 1;
    if cap is null then
      insert into roadmap_tasks (user_id, title, kind, tags) values (uid, 'Captured', 'group', '{inbox}') returning id into cap;
    end if;
    select id into shop from roadmap_tasks
     where user_id = uid and parent_id = cap and kind = 'group' and title = 'Shopping' order by created_at limit 1;
    if shop is null then
      insert into roadmap_tasks (user_id, parent_id, title, kind, tags) values (uid, cap, 'Shopping', 'group', '{shop}') returning id into shop;
    end if;
    insert into roadmap_tasks (user_id, parent_id, title, kind, tags, position)
    values (uid, shop, 'Buy ' || ttl, 'task', '{outside,short-burst,parked}',
            coalesce((select max(position) + 1 from roadmap_tasks where parent_id = shop), 0))
    returning id into tid;
  end if;

  select id into cid from roadmap_comparisons where user_id = uid and task_id = tid and lower(title) = lower(ttl) limit 1;
  if cid is null then
    insert into roadmap_comparisons (user_id, task_id, title, need, weights, source, notes)
    values (uid, tid, ttl, p->>'need', coalesce(p->'weights', '{}'), p->>'source', p->>'notes')
    returning id into cid;
  else
    update roadmap_comparisons
       set need = coalesce(p->>'need', need), source = coalesce(p->>'source', source),
           notes = coalesce(p->>'notes', notes), weights = coalesce(p->'weights', weights), chosen_item = null
     where id = cid;
    delete from roadmap_comparison_items where comparison_id = cid;
  end if;

  for it in select * from jsonb_array_elements(p->'items') loop
    insert into roadmap_comparison_items (
      user_id, comparison_id, name, brand, model, image_url, url, shop, price, currency,
      quality, life_years, warranty_months, size, rating, review_count, pros, cons, extra, notes, position)
    values (
      uid, cid, coalesce(nullif(trim(it->>'name'), ''), 'Product ' || (n + 1)),
      it->>'brand', it->>'model', it->>'image_url', it->>'url', it->>'shop',
      (it->>'price')::numeric, coalesce(it->>'currency', 'JPY'),
      (it->>'quality')::numeric, (it->>'life_years')::numeric, (it->>'warranty_months')::int,
      it->>'size', (it->>'rating')::numeric, (it->>'review_count')::int,
      coalesce((select array_agg(x) from jsonb_array_elements_text(it->'pros') x), '{}'),
      coalesce((select array_agg(x) from jsonb_array_elements_text(it->'cons') x), '{}'),
      coalesce(it->'extra', '{}'), it->>'notes', n);
    n := n + 1;
  end loop;
  return cid;
end $function$;

revoke all on function public.roadmap_save_comparison(jsonb) from public,anon;
grant execute on function public.roadmap_save_comparison(jsonb) to authenticated;
