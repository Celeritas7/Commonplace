-- REVIEW CANDIDATE ONLY. Requires 01/03/09/15/18/19 and reviewed Akatsuki catalog.
-- No hosted installation. This is an owner-authorized mirror protocol, not sender attestation.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.akatsuki_requests,public.akatsuki_links,public.akatsuki_cursors in access exclusive mode;
lock table ga_private.roadmap_control,ga_private.roadmap_mirror_pairs in share mode;
do $$ declare expected record; relation regclass; begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then raise exception 'review Roadmap control';end if;
 for expected in select * from (values
  ('akatsuki_requests','d859af562b848ed64ed6deeaf3900a6b','bdd73d58944c8fa9175cb65555163bad'),
  ('akatsuki_links','e58a695eede985cd1f0ad56c17444446','85a91168f3879ed50aab83c7d32ac69e'),
  ('akatsuki_cursors','14420495a085b480fcfe1dc9450a060a','029578ea1976d38c3982c17a0a0e6d8a')
 ) t(tbl,columns_hash,constraints_hash) loop
  relation:=format('public.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=relation and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select md5(string_agg(conname||':'||pg_get_constraintdef(oid)||':'||convalidated,E'\n' order by conname)) from pg_constraint where conrelid=relation) is distinct from expected.constraints_hash
   or exists(select from pg_trigger where tgrelid=relation and not tgisinternal)
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl and cmd='ALL' and roles='{authenticated}'
    and permissive='PERMISSIVE' and qual='(user_id = auth.uid())' and with_check=qual) then raise exception 'review hub protocol baseline: %',expected.tbl;end if;
 end loop;
 if not exists(select from pg_proc where oid='public.ga_roadmap_receive_task(jsonb,jsonb,bigint)'::regprocedure and prosecdef and pg_get_userbyid(proowner)='postgres'
  and proconfig=array['search_path=""','TimeZone=UTC'] and md5(replace(prosrc,chr(13),''))='6ef7a17f8bbe57eeb6f349f0f1fb2856') then raise exception 'review candidate 19 receiver';end if;
end $$;

-- Empty operator-only gate. Review original hub rows, links and pending receipts
-- before enabling an owner; declarations/headers do not authenticate an app.
create table ga_private.roadmap_hub_access(auth_user_id uuid primary key,enabled boolean not null default false,review_ref text not null check(length(btrim(review_ref))>0));
create table ga_private.roadmap_hub_received(
 auth_user_id uuid not null,seq bigint not null,evidence jsonb not null,received_at timestamptz not null default now(),primary key(auth_user_id,seq)
);
create table ga_private.roadmap_hub_acknowledged(
 auth_user_id uuid not null,seq bigint not null,result jsonb not null,acknowledged_at timestamptz not null default now(),primary key(auth_user_id,seq),
 foreign key(auth_user_id,seq) references ga_private.roadmap_hub_received(auth_user_id,seq)
);
alter table ga_private.roadmap_hub_access enable row level security;
alter table ga_private.roadmap_hub_received enable row level security;
alter table ga_private.roadmap_hub_acknowledged enable row level security;
revoke all on ga_private.roadmap_hub_access,ga_private.roadmap_hub_received,ga_private.roadmap_hub_acknowledged from public,anon,authenticated,service_role;

create function ga_private.roadmap_hub_actor() returns uuid language plpgsql set search_path='' as $$
declare actor uuid:=auth.uid();begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'hub mirror access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'hub mirror access denied' using errcode='42501';end if;
 perform from ga_private.roadmap_mirror_access where auth_user_id=actor and enabled for share;
 if not found then raise exception 'mirror reconciliation required' using errcode='42501';end if;
 perform from ga_private.roadmap_hub_access where auth_user_id=actor and enabled for share;
 if not found then raise exception 'hub protocol review required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));return actor;
end $$;
create function ga_private.roadmap_hub_event(p_actor uuid,p_seq bigint) returns public.akatsuki_requests language plpgsql set search_path='' as $$
declare event public.akatsuki_requests;begin
 if p_seq is null or p_seq<1 or p_seq>9007199254740991 then raise exception 'invalid hub sequence' using errcode='22023';end if;
 select * into event from public.akatsuki_requests where user_id=p_actor and seq=p_seq for update;
 if not found then raise exception 'hub event unavailable' using errcode='42501';end if;
 if event.from_app<>'wf' or event.to_app<>'rm' or event.kind<>'task.upsert' or event.payload ? 'deleted' then
  raise exception 'unexpected mirror event contract' using errcode='22023';end if;
 if event.status not in ('pending','delivered') or event.reply is not null or event.reply_seq is not null then
  raise exception 'hub event state requires review' using errcode='40001';end if;
 return event;
end $$;
create function ga_private.roadmap_hub_evidence(event public.akatsuki_requests) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('from_app',event.from_app,'to_app',event.to_app,'kind',event.kind,'src_addr',event.src_addr,
  'src_clock',event.src_clock,'payload',event.payload,'idempotency_key',event.idempotency_key)
$$;
revoke all on function ga_private.roadmap_hub_actor(),ga_private.roadmap_hub_event(uuid,bigint),ga_private.roadmap_hub_evidence(public.akatsuki_requests) from public,anon,authenticated,service_role;

create function public.ga_roadmap_receive_task_event(p_seq bigint) returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=ga_private.roadmap_hub_actor();event public.akatsuki_requests;prior ga_private.roadmap_hub_received;evidence jsonb;result jsonb;begin
 event:=ga_private.roadmap_hub_event(actor,p_seq);evidence:=ga_private.roadmap_hub_evidence(event);
 select * into prior from ga_private.roadmap_hub_received where auth_user_id=actor and seq=p_seq for update;
 if found then
  if prior.evidence<>evidence then raise exception 'stored hub evidence changed' using errcode='40001';end if;
 elsif event.status<>'pending' then raise exception 'legacy delivered event requires reconciliation' using errcode='40001';end if;
 -- Candidate 19 retains original sequence ordering and prevents resurrection.
 result:=public.ga_roadmap_receive_task(event.src_addr,event.payload,p_seq);
 if prior.seq is null then
  insert into ga_private.roadmap_hub_received(auth_user_id,seq,evidence) values(actor,p_seq,evidence);
  if not found then raise exception 'hub receive receipt not saved' using errcode='40001';end if;
 end if;
 return result||jsonb_build_object('payload',event.payload,'from_app','wf','to_app','rm','kind','task.upsert');
end $$;

-- The browser supplies only the original sequence after it has applied the
-- receive result to its view. Target IDs/addresses and deletion state come from
-- private server receipts and the current owned mirror, never ack parameters.
create function public.ga_roadmap_ack_task_event(p_seq bigint) returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=ga_private.roadmap_hub_actor();event public.akatsuki_requests;after_event public.akatsuki_requests;
 received ga_private.roadmap_hub_received;applied ga_private.roadmap_mirror_receipts;prior ga_private.roadmap_hub_acknowledged;
 pair ga_private.roadmap_mirror_pairs;link public.akatsuki_links;target public.roadmap_tasks;target_addr jsonb;result jsonb;
 evidence jsonb;outcome text;orphaned boolean;cursor_seq bigint;link_exists boolean;
begin
 event:=ga_private.roadmap_hub_event(actor,p_seq);evidence:=ga_private.roadmap_hub_evidence(event);
 select * into received from ga_private.roadmap_hub_received where auth_user_id=actor and seq=p_seq for share;
 if not found or received.evidence<>evidence then raise exception 'receive original event before acknowledgement' using errcode='40001';end if;
 select * into applied from ga_private.roadmap_mirror_receipts where auth_user_id=actor and seq=p_seq for share;
 if not found or applied.address<>event.src_addr or applied.payload<>event.payload then raise exception 'applied mirror receipt requires review' using errcode='40001';end if;
 select * into prior from ga_private.roadmap_hub_acknowledged where auth_user_id=actor and seq=p_seq;
 if found then
  if event.status<>'delivered' then raise exception 'acknowledged hub state changed' using errcode='40001';end if;
  return prior.result||jsonb_build_object('replayed',true);
 end if;
 if event.status<>'pending' then raise exception 'legacy acknowledgement requires reconciliation' using errcode='40001';end if;
 select * into pair from ga_private.roadmap_mirror_pairs where auth_user_id=actor and address_hash=md5(event.src_addr::text) for update;
 if not found or pair.address<>event.src_addr or pair.last_seq<p_seq then raise exception 'mirror pairing requires review' using errcode='40001';end if;
 if pair.task_id is not null then
  select * into target from public.roadmap_tasks where id=pair.task_id and user_id=actor for share;
  if not found then
   if exists(select from public.roadmap_tasks where id=pair.task_id) then raise exception 'mirror task unavailable' using errcode='42501';end if;
   if not pair.suppressed then raise exception 'reload mirror before acknowledgement' using errcode='40001';end if;
  elsif target.kind<>'task' then raise exception 'mirror target changed' using errcode='40001';end if;
  target_addr:=jsonb_build_object('id',pair.task_id);
 end if;
 select * into link from public.akatsuki_links where user_id=actor and a_app='wf' and a_addr=event.src_addr and b_app='rm' for update;
 link_exists:=found;
 if link_exists and (link.b_addr is distinct from target_addr or link.kind<>'task.upsert' or link.seq is null) then raise exception 'existing hub link requires reconciliation' using errcode='40001';end if;
 orphaned:=pair.source_deleted or pair.suppressed;
 if greatest(pair.last_seq,pair.effect_seq)>p_seq or link_exists and link.seq>p_seq then outcome:='superseded';
 elsif target_addr is null or pair.suppressed and not link_exists then outcome:='unpaired';
 else
  outcome:=case when orphaned then 'orphaned' else 'paired' end;
  if link_exists then
   update public.akatsuki_links set a_clock=event.src_clock,seq=p_seq,source='wf',last_synced_at=now(),
    orphaned_at=case when orphaned then coalesce(link.orphaned_at,now()) else null end
    where id=link.id and user_id=actor;
  else
   insert into public.akatsuki_links(user_id,a_app,a_addr,a_clock,b_app,b_addr,kind,seq,source,orphaned_at)
    values(actor,'wf',event.src_addr,event.src_clock,'rm',target_addr,'task.upsert',p_seq,'wf',case when orphaned then now() else null end)
    on conflict(user_id,a_app,a_addr,b_app) do nothing;
  end if;
  if not found then raise exception 'hub link changed; retry original acknowledgement' using errcode='40001';end if;
 end if;
 update public.akatsuki_requests set status='delivered',delivered_at=now(),next_try_at=null where user_id=actor and seq=p_seq and status='pending' returning * into after_event;
 if not found or after_event.status<>'delivered' or ga_private.roadmap_hub_evidence(after_event)<>evidence then raise exception 'hub acknowledgement not saved' using errcode='40001';end if;
 insert into public.akatsuki_cursors(user_id,app,last_seq) values(actor,'rm',p_seq)
  on conflict(user_id,app) do update set last_seq=greatest(public.akatsuki_cursors.last_seq,excluded.last_seq),updated_at=now() returning last_seq into cursor_seq;
 if not found or cursor_seq<p_seq then raise exception 'hub cursor not saved' using errcode='40001';end if;
 result:=jsonb_build_object('seq',p_seq,'address',event.src_addr,'status','delivered','outcome',outcome,'replayed',false);
 insert into ga_private.roadmap_hub_acknowledged(auth_user_id,seq,result) values(actor,p_seq,result);
 if not found then raise exception 'hub acknowledgement receipt not saved' using errcode='40001';end if;
 return result;
end $$;
-- Retain the old implementation for the checked wrapper; close browser calls to
-- its former caller-supplied payload interface in the same installation window.
revoke all on function public.ga_roadmap_receive_task(jsonb,jsonb,bigint) from public,anon,authenticated,service_role;
revoke all on function public.ga_roadmap_receive_task_event(bigint),public.ga_roadmap_ack_task_event(bigint) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_receive_task_event(bigint),public.ga_roadmap_ack_task_event(bigint) to authenticated;
commit;
