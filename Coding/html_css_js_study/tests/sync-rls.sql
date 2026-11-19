-- Run as the SQL-editor administrator after applying Coding/html_css_js_study/sql/web_studio_sync.sql.
-- All test writes are rolled back; no auth users are created or modified.
-- One existing auth user supplies a valid FK. A second UUID is only a JWT claim
-- inside this transaction, testing isolation without creating a login account.
begin;
set local plpgsql.check_asserts = on;
select set_config('test.web_studio_owner', (select id::text from auth.users order by id limit 1), true);
select set_config('test.web_studio_other',
  case when current_setting('test.web_studio_owner', true) = '00000000-0000-4000-8000-000000000001'
    then '00000000-0000-4000-8000-000000000002'
    else '00000000-0000-4000-8000-000000000001' end, true);
do $$
begin
  if nullif(current_setting('test.web_studio_owner', true), '') is null then
    raise exception 'This rollback-only test requires one existing auth user';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.web_studio_owner'), 'role', 'authenticated')::text, true);
select set_config('request.jwt.claim.sub', current_setting('test.web_studio_owner'), true);
do $$
declare
  before_revision bigint;
  first_write jsonb;
  second_write jsonb;
  stale_write jsonb;
  first_snapshot jsonb := '{"version":1,"study":{"version":1,"project":{"html":"<p>sync SQL test</p>","css":"","js":""}},"legacy":null}';
  next_snapshot jsonb := '{"version":1,"study":{"version":1,"lessons":{"html-elements":{"note":"SQL test revision 2"}}},"legacy":null}';
begin
  select coalesce(max(revision), 0) into before_revision from public.commonplace_web_studio;
  first_write := public.web_studio_sync_write(before_revision, first_snapshot, current_setting('test.web_studio_owner')::uuid);
  assert first_write ->> 'conflict' = 'false', 'Owner first write rejected';
  assert (first_write ->> 'revision')::bigint = before_revision + 1, 'Revision did not increment';
  assert first_write -> 'snapshot' = first_snapshot, 'Write returned a different snapshot';
  assert (select count(*) from public.commonplace_web_studio) = 1, 'Owner cannot select own row';
  second_write := public.web_studio_sync_write(before_revision + 1, next_snapshot, current_setting('test.web_studio_owner')::uuid);
  assert second_write ->> 'conflict' = 'false', 'Owner CAS update failed';
  stale_write := public.web_studio_sync_write(before_revision + 1, first_snapshot, current_setting('test.web_studio_owner')::uuid);
  assert stale_write ->> 'conflict' = 'true', 'Stale revision was accepted';
  assert stale_write -> 'snapshot' = next_snapshot, 'Conflict did not return latest data';
  assert (stale_write ->> 'revision')::bigint = before_revision + 2, 'Conflict advanced revision';
  begin
    perform public.web_studio_sync_write(before_revision + 2, '{"version":2,"study":null,"legacy":null}', current_setting('test.web_studio_owner')::uuid);
    raise exception 'Invalid snapshot unexpectedly accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.web_studio_sync_write(before_revision + 2, jsonb_build_object('version',1,'study',null,'legacy',null,'tooLarge',repeat('x',8388608)), current_setting('test.web_studio_owner')::uuid);
    raise exception 'Oversized snapshot unexpectedly accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.web_studio_sync_write(before_revision + 2, first_snapshot, current_setting('test.web_studio_other')::uuid);
    raise exception 'A snapshot prepared for a different account was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.web_studio_sync_write(before_revision + 2, first_snapshot, null);
    raise exception 'A missing expected owner was accepted';
  exception when insufficient_privilege then null;
  end;
  assert (select revision from public.commonplace_web_studio) = before_revision + 2, 'Owner mismatch changed a revision';
  begin
    update public.commonplace_web_studio set revision = revision + 2;
    raise exception 'Skipped revision unexpectedly accepted';
  exception when check_violation then null;
  end;
end $$;

-- A different authenticated identity can neither read nor mutate the first one.
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.web_studio_other'), 'role', 'authenticated')::text, true);
select set_config('request.jwt.claim.sub', current_setting('test.web_studio_other'), true);
do $$
declare affected integer;
begin
  assert (select count(*) from public.commonplace_web_studio) = 0, 'Cross-account SELECT leaked data';
  update public.commonplace_web_studio set revision = revision + 1, snapshot = '{"version":1,"study":null,"legacy":null}'
    where user_id = current_setting('test.web_studio_owner')::uuid;
  get diagnostics affected = row_count;
  assert affected = 0, 'Cross-account UPDATE was accepted';
  begin
    insert into public.commonplace_web_studio(user_id,revision,snapshot)
      values(current_setting('test.web_studio_owner')::uuid,1,'{"version":1,"study":null,"legacy":null}');
    raise exception 'Cross-account INSERT was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

-- No auth claim, even with the authenticated role, cannot call the writer.
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  begin
    perform public.web_studio_sync_write(0,'{"version":1,"study":null,"legacy":null}', current_setting('test.web_studio_owner')::uuid);
    raise exception 'Missing-identity RPC call was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.commonplace_web_studio;
    raise exception 'Anonymous SELECT was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.web_studio_sync_write(0,'{"version":1,"study":null,"legacy":null}', current_setting('test.web_studio_owner')::uuid);
    raise exception 'Anonymous RPC call was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS: owner write/read, CAS conflicts, snapshot/size/revision validation, two-identity RLS, expected-owner guard, missing identity and anonymous denial; all writes rolled back' as result;
rollback;
