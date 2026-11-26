-- REVIEW CANDIDATE ONLY. Unapplied; outside the six Commonplace migrations.
-- Requires the revised 01, then 02; verified mappings, archive-consumer evidence
-- and recovery approval. No data migration, reassignment, deletion or backfill.
begin;
set local search_path=pg_catalog,public;
lock table ga_private.owner_links,ga_private.client_cutovers in share mode;
lock table public.healthlog_clinics_old,public.healthlog_visits_old,
 public.healthlog_medicines_old,public.healthlog_dose_logs_old in access exclusive mode;
create temp table ha_reviewed(table_name text primary key,shape text,constraints jsonb) on commit drop;
insert into ha_reviewed values
 ('healthlog_clinics_old','id:uuid:true,user_id:text:true,name:text:true,phone:text:false,address:text:false,created_at:timestamp with time zone:false','[{"name":"healthlog_clinics_pkey","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"healthlog_clinics_user_id_name_key","validated":true,"definition":"UNIQUE (user_id, name)"}]'::jsonb),
 ('healthlog_dose_logs_old','user_id:text:true,medicine_id:uuid:true,log_date:date:true,slot:text:true,taken:boolean:true,updated_at:timestamp with time zone:false','[{"name":"healthlog_dose_logs_medicine_id_fkey","validated":true,"definition":"FOREIGN KEY (medicine_id) REFERENCES healthlog_medicines_old(id) ON DELETE CASCADE"},{"name":"healthlog_dose_logs_pkey","validated":true,"definition":"PRIMARY KEY (user_id, medicine_id, log_date, slot)"},{"name":"healthlog_dose_logs_slot_check","validated":true,"definition":"CHECK ((slot = ANY (ARRAY[''morning''::text, ''noon''::text, ''evening''::text, ''night''::text])))"}]'::jsonb),
 ('healthlog_medicines_old','id:uuid:true,visit_id:uuid:true,name:text:true,dose:text:false,slots:text[]:true,days:integer:true,sort:integer:false,name_verified:boolean:true,name_verified_at:timestamp with time zone:false','[{"name":"healthlog_medicines_days_check","validated":true,"definition":"CHECK ((days >= 1))"},{"name":"healthlog_medicines_pkey","validated":true,"definition":"PRIMARY KEY (id)"},{"name":"healthlog_medicines_visit_id_fkey","validated":true,"definition":"FOREIGN KEY (visit_id) REFERENCES healthlog_visits_old(id) ON DELETE CASCADE"}]'::jsonb),
 ('healthlog_visits_old','id:uuid:true,user_id:text:true,clinic_id:uuid:false,clinic_name:text:true,doctor:text:false,visit_date:date:true,concern:text:true,notes:text:false,follow_up:date:false,cost_consult:numeric(10,2):true,cost_meds:numeric(10,2):true,cost_other:numeric(10,2):true,created_at:timestamp with time zone:false','[{"name":"healthlog_visits_clinic_id_fkey","validated":true,"definition":"FOREIGN KEY (clinic_id) REFERENCES healthlog_clinics_old(id) ON DELETE SET NULL"},{"name":"healthlog_visits_pkey","validated":true,"definition":"PRIMARY KEY (id)"}]'::jsonb);
do $preflight$
declare t record; relation regclass; actual jsonb; expected jsonb; p record;
begin
 -- Pin the mapping and privilege helpers this installer relies upon. Updating
 -- only these hashes is not a compatibility review.
 for p in select * from (values
  ('ga_private.check_owner_link()','b8d02d42df39b5c1f627b932bd36aaf8',false,'v'),
  ('ga_private.owns_legacy(text,text)','6c5e76f8f25b63d3fb59838d0e448c3a',true,'s'),
  ('ga_private.set_browser_access(regclass,boolean)','711eb18ae3b913ba0b2ff7af68216137',false,'v'),
  ('ga_private.keep_archive_key()','81bf8ad470013067714e93c62a7d13ff',false,'v')
 ) f(signature,body_hash,definer,volatility) loop
  if not exists(select from pg_proc where oid=to_regprocedure(p.signature)
   and pg_get_userbyid(proowner)='postgres' and prosecdef=p.definer
   and provolatile::text=p.volatility and proconfig=array['search_path=""']
   and md5(replace(prosrc,E'\r\n',E'\n'))=p.body_hash)
  then raise exception 'review HealthLog foundation drift: %',p.signature; end if;
 end loop;
 if not exists(select from ga_private.client_cutovers
  where app='healthlog-archive' and verified_at<=now())
 then raise exception 'HealthLog archive consumer evidence required'; end if;
 if exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname like 'healthlog%old%'
   and c.relkind in ('r','v','m','p') and not exists(select from ha_reviewed where table_name=c.relname))
 then raise exception 'review additional HealthLog archives'; end if;
 if exists(select from pg_views where schemaname not in ('pg_catalog','information_schema')
   and definition ~* 'healthlog_(visits|clinics|medicines|dose_logs)_old')
  or exists(select from pg_matviews where definition ~* 'healthlog_(visits|clinics|medicines|dose_logs)_old')
 then raise exception 'review HealthLog archive views'; end if;
 if exists(select from pg_proc f join pg_namespace n on n.oid=f.pronamespace
  where n.nspname not in ('pg_catalog','information_schema') and f.prokind='f'
   and f.prosrc ~* 'healthlog_(visits|clinics|medicines|dose_logs)_old'
   and f.oid not in ('ga_private.check_owner_link()'::regprocedure,'ga_private.owns_legacy(text,text)'::regprocedure))
 then raise exception 'review HealthLog archive routines'; end if;
 if exists(select from pg_constraint c where c.contype='f'
  and c.confrelid in (select ('public.'||table_name)::regclass from ha_reviewed)
  and c.conrelid not in (select ('public.'||table_name)::regclass from ha_reviewed))
 then raise exception 'review external HealthLog archive relationships'; end if;

 for t in select * from ha_reviewed order by table_name loop
  relation:=('public.'||t.table_name)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r'
    and relrowsecurity and not relispartition and pg_get_userbyid(relowner)='postgres')
   or exists(select from pg_inherits where inhrelid=relation or inhparent=relation)
   or (select string_agg(attname||':'||format_type(atttypid,atttypmod)||':'||attnotnull::text,',' order by attnum)
       from pg_attribute where attrelid=relation and attnum>0 and not attisdropped)<>t.shape
  then raise exception 'review HealthLog archive shape: %',relation; end if;
  select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid),
    'validated',convalidated) order by conname) into actual from pg_constraint where conrelid=relation;
  if actual is distinct from t.constraints then raise exception 'review HealthLog archive constraints: %',relation; end if;
  select jsonb_agg(jsonb_build_object('name',policyname,'permissive',permissive,'roles',roles,
   'cmd',cmd,'using',qual,'check',with_check) order by policyname) into actual
   from pg_policies where schemaname='public' and tablename=t.table_name;
  expected:=jsonb_build_array(jsonb_build_object('name',case t.table_name
    when 'healthlog_clinics_old' then 'all clinics' when 'healthlog_visits_old' then 'all visits'
    when 'healthlog_medicines_old' then 'all medicines' else 'all dose logs' end,
   'permissive','PERMISSIVE','roles',array['public'],'cmd','ALL','using','true','check','true'));
  if t.table_name='healthlog_visits_old' then
   expected:=expected||'[
    {"name":"ga_authenticated_guard","permissive":"RESTRICTIVE","roles":["public"],"cmd":"ALL","using":"(auth.uid() IS NOT NULL)","check":"(auth.uid() IS NOT NULL)"},
    {"name":"ga_owner_guard","permissive":"RESTRICTIVE","roles":["authenticated"],"cmd":"ALL","using":"ga_private.owns_legacy(''healthlog-archive''::text, user_id)","check":"ga_private.owns_legacy(''healthlog-archive''::text, user_id)"}
   ]'::jsonb;
  end if;
  if actual is distinct from expected then raise exception 'review HealthLog archive policies: %',relation; end if;
  if exists(select from pg_trigger where tgrelid=relation and not tgisinternal
   and not(t.table_name='healthlog_visits_old' and tgname='keep_archive_key' and tgenabled='O'
    and pg_get_triggerdef(oid)='CREATE TRIGGER keep_archive_key BEFORE UPDATE ON public.healthlog_visits_old FOR EACH ROW WHEN ((old.user_id IS DISTINCT FROM new.user_id)) EXECUTE FUNCTION ga_private.keep_archive_key()'))
   or (select count(*) from pg_trigger where tgrelid=relation and not tgisinternal)
      <>(case when t.table_name='healthlog_visits_old' then 1 else 0 end)
   or exists(select from pg_rewrite where ev_class=relation)
  then raise exception 'review HealthLog archive triggers or rules: %',relation; end if;
 end loop;

 -- Preserve keys that exist only in clinics or dose logs. Multiple reviewed
 -- keys may belong to one verified person; similar text is never identity proof.
 perform 1 from auth.users u join ga_private.owner_links l on l.auth_user_id=u.id
  where l.app='healthlog-archive' for share of u;
 if exists(select from (
   select user_id from public.healthlog_clinics_old union select user_id from public.healthlog_visits_old
   union select user_id from public.healthlog_dose_logs_old
  ) k where not exists(select from ga_private.owner_links l join auth.users u on u.id=l.auth_user_id
   where l.app='healthlog-archive' and l.legacy_id=k.user_id and u.email_confirmed_at is not null
    and u.is_anonymous is false))
 then raise exception 'verified HealthLog archive mappings required; no records changed'; end if;
 if exists(select from public.healthlog_visits_old v join public.healthlog_clinics_old c on c.id=v.clinic_id
   join ga_private.owner_links vl on vl.app='healthlog-archive' and vl.legacy_id=v.user_id
   join ga_private.owner_links cl on cl.app='healthlog-archive' and cl.legacy_id=c.user_id
   where vl.auth_user_id<>cl.auth_user_id)
  or exists(select from public.healthlog_dose_logs_old d join public.healthlog_medicines_old m on m.id=d.medicine_id
   join public.healthlog_visits_old v on v.id=m.visit_id
   join ga_private.owner_links dl on dl.app='healthlog-archive' and dl.legacy_id=d.user_id
   join ga_private.owner_links vl on vl.app='healthlog-archive' and vl.legacy_id=v.user_id
   where dl.auth_user_id<>vl.auth_user_id)
 then raise exception 'review cross-owner HealthLog archive relationships; no records changed'; end if;
end $preflight$;

-- Current desktop/mobile sync uses the separate UUID-owned tables. No observed
-- client writes these archives. Retain owner reads; archive writes stay operator-only.
do $protect$
declare t record; relation regclass; predicate text;
begin
 for t in select * from ha_reviewed order by table_name loop
  relation:=('public.'||t.table_name)::regclass;
  perform ga_private.set_browser_access(relation,false);
  predicate:=case t.table_name
   when 'healthlog_clinics_old' then 'ga_private.owns_legacy(''healthlog-archive'',user_id)'
   when 'healthlog_visits_old' then 'ga_private.owns_legacy(''healthlog-archive'',user_id)'
   when 'healthlog_medicines_old' then 'exists(select from public.healthlog_visits_old v where v.id=visit_id)'
   else 'ga_private.owns_legacy(''healthlog-archive'',user_id) and exists(select from public.healthlog_medicines_old m where m.id=medicine_id)' end;
  execute format('create policy ha_owner_read on %s as restrictive for select to public using(%s)',relation,predicate);
  execute format('create policy ha_no_insert on %s as restrictive for insert to public with check(false)',relation);
  execute format('create policy ha_no_update on %s as restrictive for update to public using(false) with check(false)',relation);
  execute format('create policy ha_no_delete on %s as restrictive for delete to public using(false)',relation);
 end loop;
end $protect$;
commit;

