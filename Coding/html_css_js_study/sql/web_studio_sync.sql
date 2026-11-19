-- Commonplace Web Studio personal study synchronization.
-- Target: General_apps (wylxvmkcrexwfpjpbhyy), PostgreSQL 17.
-- Additive, one-time migration. No existing Commonplace tables are changed.
-- Use the application RPC for optimistic concurrency; never blind-upsert this table.

create table public.commonplace_web_studio (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision between 1 and 9007199254740991),
  snapshot jsonb not null,
  updated_at timestamptz not null default statement_timestamp(),
  constraint web_studio_snapshot_shape check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ? 'version' and snapshot -> 'version' = '1'::jsonb
    and snapshot ? 'study' and jsonb_typeof(snapshot -> 'study') in ('object', 'null')
    and snapshot ? 'legacy' and jsonb_typeof(snapshot -> 'legacy') in ('object', 'null')
  ),
  constraint web_studio_snapshot_size check (octet_length(snapshot::text) <= 8388608)
);

alter table public.commonplace_web_studio enable row level security;
revoke all on public.commonplace_web_studio from public, anon, authenticated;
grant select, insert, update on public.commonplace_web_studio to authenticated;

create policy web_studio_select_own on public.commonplace_web_studio
  for select to authenticated using ((select auth.uid()) = user_id);
create policy web_studio_insert_own on public.commonplace_web_studio
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy web_studio_update_own on public.commonplace_web_studio
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The invoker RPC needs INSERT/UPDATE privileges. Enforce immutable ownership,
-- a single revision step, and server timestamps for direct writes as well.
-- This is not a substitute for CAS: a client must still call the RPC below.
create function public.web_studio_stamp_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.revision <> 1 then
      raise exception 'The initial Web Studio revision must be 1' using errcode = '23514';
    end if;
  elsif new.user_id is distinct from old.user_id or new.revision <> old.revision + 1 then
    raise exception 'Web Studio ownership is immutable and revisions must advance by one' using errcode = '23514';
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
revoke all on function public.web_studio_stamp_revision() from public, anon, authenticated;
create trigger web_studio_revision_guard
  before insert or update on public.commonplace_web_studio
  for each row execute function public.web_studio_stamp_revision();

-- Contract: expected_revision = 0 for an account with no row; otherwise the
-- last revision returned by a read. expected_owner binds the prepared data to
-- its account; ownership is always derived from auth.uid(), never this argument.
-- Returns {conflict:false, revision, snapshot} after a successful write, or
-- {conflict:true, revision, snapshot} with the latest row after a lost race.
-- If the row is absent, a conflict returns revision 0 and snapshot null.
create function public.web_studio_sync_write(expected_revision bigint, new_snapshot jsonb, expected_owner uuid)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved_revision bigint;
  saved_snapshot jsonb;
begin
  if owner_id is null then
    raise exception 'Sign in to synchronize Web Studio' using errcode = '42501';
  end if;
  if expected_owner is distinct from owner_id then
    raise exception 'The signed-in account changed. Retry with the account that owns this study data' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 or expected_revision >= 9007199254740991 then
    raise exception 'Invalid expected Web Studio revision' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    -- ON CONFLICT serializes concurrent first writes using the unique user key.
    insert into public.commonplace_web_studio (user_id, revision, snapshot)
      values (owner_id, 1, new_snapshot)
      on conflict (user_id) do nothing
      returning revision, snapshot into saved_revision, saved_snapshot;
  else
    -- PostgreSQL rechecks this predicate after waiting for a concurrent writer.
    update public.commonplace_web_studio
      set revision = revision + 1, snapshot = new_snapshot
      where user_id = owner_id and revision = expected_revision
      returning revision, snapshot into saved_revision, saved_snapshot;
  end if;
  if found then
    return jsonb_build_object('conflict', false, 'revision', saved_revision, 'snapshot', saved_snapshot);
  end if;
  select revision, snapshot into saved_revision, saved_snapshot
    from public.commonplace_web_studio where user_id = owner_id;
  return jsonb_build_object('conflict', true, 'revision', coalesce(saved_revision, 0), 'snapshot', saved_snapshot);
end;
$$;
revoke all on function public.web_studio_sync_write(bigint, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.web_studio_sync_write(bigint, jsonb, uuid) to authenticated;

comment on table public.commonplace_web_studio is
  'Account-owned Web Studio learning state, revision-checked via web_studio_sync_write. Lessons and downloaded packs stay outside this table.';
