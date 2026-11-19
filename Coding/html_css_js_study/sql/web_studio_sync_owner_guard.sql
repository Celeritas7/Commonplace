-- Upgrade an installation of the earlier two-argument Web Studio writer.
-- No study rows or table policies change. Apply instead of rerunning the
-- one-time base migration. The final base migration already has this guard.
-- Removing the old overload is essential: it cannot remain callable without
-- an expected account ID after the frontend starts passing expected_owner.
drop function if exists public.web_studio_sync_write(bigint, jsonb);

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

