-- Synthetic catalog only, from pinned Akatsuki R001/R023; no hosted rows.
create table if not exists akatsuki_state (
  user_id    uuid not null default auth.uid(),
  doc        text not null,                           -- 'calapp_sukkiri'
  path       text not null,                           -- 'cycles' 'garbage' 'away' 'done' 'block' 'show'
  item_key   text not null default '',                -- 'sk_bath' 'g_moeru' '2026-11-03' or '' for scalars
  owner_app  text not null,
  value      jsonb,
  seq        bigint not null default 0,
  updated_by text,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, doc, path, item_key)
);

create or replace function akatsuki_state_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.owner_app <> old.owner_app then
    raise exception 'akatsuki: % may not change the owner of %.%/% (owner %)', new.updated_by, new.doc, new.path, new.item_key, old.owner_app;
  end if;
  if new.updated_by is distinct from new.owner_app then
    raise exception 'akatsuki: % does not own %.%/% (owner %)', new.updated_by, new.doc, new.path, new.item_key, new.owner_app;
  end if;
  new.seq := nextval('akatsuki_seq');
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists akatsuki_state_guard on akatsuki_state;
create trigger akatsuki_state_guard before insert or update on akatsuki_state for each row execute function akatsuki_state_guard();

create table if not exists akatsuki_places (
  user_id     uuid not null default auth.uid(),
  id          text not null,                          -- slug: 'home', 'shin-okubo'.  Stable; apps store this.
  label       text not null,                          -- 'Shin-Ōkubo'
  class       text not null,                          -- vocab enum place_class — what the suggester matches on
  aliases     text[] not null default '{}',           -- old labels / other apps' words ('train', 'Train')
  ord         int not null default 100,
  lat         double precision,                       -- R018 fills these
  lng         double precision,
  radius_m    int,
  added_by    text not null,                          -- app id
  seq         bigint not null default nextval('akatsuki_seq'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  retired_at  timestamptz,                            -- never deleted; retired places keep old tasks readable
  primary key (user_id, id)
);
alter table akatsuki_places enable row level security;
drop policy if exists akatsuki_places_read on akatsuki_places;
create policy akatsuki_places_read on akatsuki_places for select to authenticated using (user_id = auth.uid());
-- no insert/update/delete policy: writes only through the RPCs below
comment on table akatsuki_places is 'R023 — the one place list. Hub-owned. Read: select. Write: akatsuki_place_add / _edit / _retire.';

create or replace function akatsuki_place_slug(p text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(translate(coalesce(p, ''),
    'ŌōŪūĀāĒēĪīÔôÛûÂâÊêÎîÖöÜüÄäÉéÈèÀàÇç', 'OoUuAaEeIiOoUuAaEeIiOoUuAaEeEeAaCc')), '[^a-z0-9]+', '-', 'g'))
$$;

-- add: returns the existing place when the label (or an alias) already matches.  status created | exists
create or replace function akatsuki_place_add(p_label text, p_class text, p_app text)
returns table (id text, label text, class text, status text)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_slug text := akatsuki_place_slug(p_label);
begin
  if v_uid is null then perform akatsuki_fail('42501', 'not_signed_in', 'place_add needs a signed-in user'); end if;
  if v_slug = '' then perform akatsuki_fail('AK112', 'empty_label', 'place label is empty'); end if;
  if not exists (select 1 from akatsuki_vocab v where v.user_id = v_uid and v.ns = 'enum' and v.id = 'place_class'
                  and v.schema->'values' ? coalesce(p_class, 'out')) then
    perform akatsuki_fail('AK111', 'bad_place_class', format('class %s is not in vocab enum place_class', p_class)); end if;
  return query
    select p.id, p.label, p.class, 'exists'::text from akatsuki_places p
     where p.user_id = v_uid and p.retired_at is null
       and (p.id = v_slug or akatsuki_place_slug(p.label) = v_slug or exists (select 1 from unnest(p.aliases) a where akatsuki_place_slug(a) = v_slug))
     limit 1;
  if found then return; end if;
  -- a retired one with the same slug comes back
  update akatsuki_places p set retired_at = null, label = trim(p_label), class = coalesce(p_class, p.class), seq = nextval('akatsuki_seq'), updated_at = now()
   where p.user_id = v_uid and p.id = v_slug and p.retired_at is not null;
  if found then return query select v_slug, trim(p_label), coalesce(p_class, 'out'), 'created'::text; return; end if;
  insert into akatsuki_places (user_id, id, label, class, added_by) values (v_uid, v_slug, trim(p_label), coalesce(p_class, 'out'), p_app);
  return query select v_slug, trim(p_label), coalesce(p_class, 'out'), 'created'::text;
end $$;

-- edit: label / class / ord / aliases.  The id never changes — apps store it.
create or replace function akatsuki_place_edit(p_id text, p jsonb, p_app text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then perform akatsuki_fail('42501', 'not_signed_in', 'place_edit needs a signed-in user'); end if;
  if p ? 'class' and not exists (select 1 from akatsuki_vocab v where v.user_id = v_uid and v.ns = 'enum' and v.id = 'place_class' and v.schema->'values' ? (p->>'class')) then
    perform akatsuki_fail('AK111', 'bad_place_class', format('class %s is not in vocab enum place_class', p->>'class')); end if;
  update akatsuki_places x set
    aliases = case when p ? 'label' and p->>'label' <> x.label then array(select distinct a from unnest(x.aliases || x.label) a) else x.aliases end
              || coalesce(array(select jsonb_array_elements_text(p->'aliases')), '{}'),
    label = coalesce(nullif(trim(p->>'label'), ''), x.label),
    class = coalesce(p->>'class', x.class),
    ord   = coalesce((p->>'ord')::int, x.ord),
    seq = nextval('akatsuki_seq'), updated_at = now()
   where x.user_id = v_uid and x.id = p_id;
  if not found then perform akatsuki_fail('AK113', 'place_unknown', format('no place %s', p_id)); end if;
end $$;

create or replace function akatsuki_place_retire(p_id text, p_app text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform akatsuki_fail('42501', 'not_signed_in', 'place_retire needs a signed-in user'); end if;
  update akatsuki_places set retired_at = now(), seq = nextval('akatsuki_seq'), updated_at = now()
   where user_id = auth.uid() and id = p_id and retired_at is null;
  if not found then perform akatsuki_fail('AK113', 'place_unknown', format('no live place %s', p_id)); end if;
end $$;

grant select on akatsuki_places to authenticated;
grant execute on function akatsuki_place_add(text, text, text), akatsuki_place_edit(text, jsonb, text), akatsuki_place_retire(text, text) to authenticated;
revoke execute on function akatsuki_place_add(text, text, text), akatsuki_place_edit(text, jsonb, text), akatsuki_place_retire(text, text) from anon;


alter table akatsuki_state enable row level security;
drop policy if exists akatsuki_state_owner on akatsuki_state;
create policy akatsuki_state_owner on akatsuki_state for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
