-- REVIEW CANDIDATE ONLY. Restrictive guards supplement existing policies.
-- Does not reassign, delete or rewrite existing application records.
begin;
do $$
declare target text;
begin
 if exists(select app from (values ('code-sensei'),('healthlog-archive'),('eagle')) required(app)
  except select app from ga_private.client_cutovers where verified_at<=now()) then
  raise exception 'affected client cutover evidence required';
 end if;
 -- Stop on unowned or unmapped records, including records created during the
 -- review. Make the checks and policy replacement one locked transaction.
 lock table public.code_sensei_users,public.code_sensei_user_notes,
  public.code_sensei_progress,public.healthlog_visits_old,public.eagle_unit_progress
  in share row exclusive mode;
 if exists(select 1 from public.code_sensei_users u
  where not exists(select 1 from ga_private.owner_links l where l.app='code-sensei' and l.legacy_id=u.id::text))
  or exists(select 1 from public.code_sensei_user_notes where user_id is null)
  or exists(select 1 from public.code_sensei_progress where user_id is null)
  or exists(select 1 from public.healthlog_visits_old v where not exists(
   select 1 from ga_private.owner_links l where l.app='healthlog-archive' and l.legacy_id=v.user_id)) then
  raise exception 'verified owner mapping required; existing data was not changed';
 end if;
 if exists(select 1 from ga_private.owner_links l join auth.users u on u.id=l.auth_user_id
  where u.email_confirmed_at is null) then raise exception 'mapped Auth identity must be verified'; end if;
 foreach target in array array['code_sensei_users','code_sensei_user_notes','code_sensei_progress','healthlog_visits_old','eagle_unit_progress'] loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=target and c.relkind='r' and c.relrowsecurity) then
   raise exception 'reviewed RLS table required';
  end if;
  -- Also deny anonymous access through inherited or column-level grants.
  execute format('create policy ga_authenticated_guard on public.%I as restrictive for all to public using(auth.uid() is not null) with check(auth.uid() is not null)',target);
 end loop;
end $$;

revoke all on public.code_sensei_users,public.code_sensei_user_notes,
 public.code_sensei_progress,public.healthlog_visits_old,public.eagle_unit_progress
 from public,anon,authenticated;
grant select on public.code_sensei_users to authenticated;
grant select,insert,update,delete on public.code_sensei_user_notes,
 public.code_sensei_progress,public.healthlog_visits_old,public.eagle_unit_progress to authenticated;
create policy ga_owner_guard on public.code_sensei_users as restrictive for all
 to authenticated using(ga_private.owns_legacy('code-sensei',id::text))
 with check(ga_private.owns_legacy('code-sensei',id::text));
create policy ga_owner_guard on public.code_sensei_user_notes as restrictive for all
 to authenticated using(ga_private.owns_legacy('code-sensei',user_id::text))
 with check(ga_private.owns_legacy('code-sensei',user_id::text));
create policy ga_owner_guard on public.code_sensei_progress as restrictive for all
 to authenticated using(ga_private.owns_legacy('code-sensei',user_id::text))
 with check(ga_private.owns_legacy('code-sensei',user_id::text));
create policy ga_owner_guard on public.healthlog_visits_old as restrictive for all
 to authenticated using(ga_private.owns_legacy('healthlog-archive',user_id))
 with check(ga_private.owns_legacy('healthlog-archive',user_id));
-- Eagle is a shared assembly workspace: preserve that model. A viewer reads;
-- a linked admin/operator writes. No arbitrary owner column is invented.
create policy ga_read_guard on public.eagle_unit_progress as restrictive for select
 to authenticated using((select ga_private.linked_legacy_role()) in ('admin','operator','viewer'));
create policy ga_insert_guard on public.eagle_unit_progress as restrictive for insert
 to authenticated with check((select ga_private.linked_legacy_role()) in ('admin','operator'));
create policy ga_update_guard on public.eagle_unit_progress as restrictive for update
 to authenticated using((select ga_private.linked_legacy_role()) in ('admin','operator'))
 with check((select ga_private.linked_legacy_role()) in ('admin','operator'));
create policy ga_delete_guard on public.eagle_unit_progress as restrictive for delete
 to authenticated using((select ga_private.linked_legacy_role()) in ('admin','operator'));
commit;
