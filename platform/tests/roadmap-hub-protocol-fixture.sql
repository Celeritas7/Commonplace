-- SYNTHETIC CATALOG ONLY. Exact table/function excerpts pinned in roadmap-hub-protocol-source.json.
-- Source seed blocks and real identities are excluded; never apply this fixture to hosted databases.

create table if not exists akatsuki_cursors (
  user_id    uuid not null default auth.uid(),
  app        text not null,
  last_seq   bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, app)
);

create table if not exists akatsuki_links (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  a_app          text not null,
  a_addr         jsonb not null,
  a_clock        text,
  b_app          text not null,
  b_addr         jsonb,
  b_clock        text,
  kind           text not null,
  seq            bigint,                              -- last akatsuki_seq that touched it
  source         text,                                -- which side moved last
  orphaned_at    timestamptz,                         -- set, never deleted: the row is KEPT
  last_synced_at timestamptz not null default now(),
  unique (user_id, a_app, a_addr, b_app)
);

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

create or replace function akatsuki_orphan(p_a_app text, p_a_addr jsonb)
returns int language sql security invoker as $$
  with u as (update akatsuki_links set orphaned_at = coalesce(orphaned_at, now())
             where user_id = auth.uid() and a_app = p_a_app and a_addr = p_a_addr returning 1)
  select count(*)::int from u
$$;

create or replace function akatsuki_fail(p_code text, p_name text, p_msg text)
returns void language plpgsql as $$
begin
  raise exception using errcode = p_code, message = 'akatsuki ' || p_code || ': ' || p_msg, hint = p_name;
end $$;

create or replace function akatsuki_ack(p_app text, p_seq bigint, p_b_addr jsonb default null, p_reply jsonb default null, p_status text default 'delivered')
returns void
language plpgsql security invoker as $$
declare r akatsuki_requests;
begin
  if p_status not in ('delivered','rejected','skipped') then
    perform akatsuki_fail('AK109','bad_status', format('ack status %s — use delivered | rejected | skipped, or akatsuki_defer', p_status));
  end if;
  update akatsuki_requests
     set status = p_status, delivered_at = now(), next_try_at = null,
         reply = coalesce(p_reply, reply),
         reply_seq = case when p_reply is not null then nextval('akatsuki_seq') else reply_seq end
   where user_id = auth.uid() and seq = p_seq and to_app = p_app
  returning * into r;
  if not found then perform akatsuki_fail('AK107','not_addressed', format('seq %s is not addressed to %s', p_seq, p_app)); end if;

  insert into akatsuki_cursors (app, last_seq) values (p_app, p_seq)
  on conflict (user_id, app) do update set last_seq = greatest(akatsuki_cursors.last_seq, excluded.last_seq), updated_at = now();

  if p_b_addr is not null then
    insert into akatsuki_links (a_app, a_addr, a_clock, b_app, b_addr, kind, seq, source)
    values (r.from_app, r.src_addr, r.src_clock, p_app, p_b_addr, r.kind, p_seq, r.from_app)
    on conflict (user_id, a_app, a_addr, b_app) do update
      set b_addr = excluded.b_addr, a_clock = excluded.a_clock, seq = excluded.seq, source = excluded.source,
          last_synced_at = now(), orphaned_at = case when (r.payload->>'deleted')::boolean then now() else null end;
  end if;
end $$;

create or replace function akatsuki_reply(p_app text, p_from_app text, p_kind text, p_src_addr jsonb, p_reply jsonb)
returns bigint
language plpgsql security invoker as $$
declare v_seq bigint;
begin
  update akatsuki_requests
     set reply = p_reply, reply_seq = nextval('akatsuki_seq')
   where seq = (select r.seq from akatsuki_requests r
                 where r.user_id = auth.uid() and r.to_app = p_app and r.from_app = p_from_app
                   and r.kind = p_kind and r.src_addr = p_src_addr
                 order by r.seq desc limit 1)
  returning seq into v_seq;
  if v_seq is null then
    perform akatsuki_fail('AK108','no_request', format('no %s from %s at %s addressed to %s', p_kind, p_from_app, p_src_addr, p_app));
  end if;
  return v_seq;
end $$;

create trigger akatsuki_state_guard before insert or update on akatsuki_state for each row execute function akatsuki_state_guard();
do $$ declare name text;begin
 foreach name in array array['akatsuki_cursors','akatsuki_links','akatsuki_state'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('create policy %I on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',name||'_owner',name);
 end loop;
end $$;
grant select,insert,update,delete on akatsuki_cursors,akatsuki_links,akatsuki_state to authenticated;
grant usage,select on sequence akatsuki_seq to authenticated;
