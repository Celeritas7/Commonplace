-- Full shared incident only. Execute standalone in one session, without a wrapper
-- transaction. Each section commits independently and can be run separately.
create temporary table if not exists ga_containment_result(component text primary key,outcome text not null);
truncate pg_temp.ga_containment_result;

begin;
do $$ begin
 update cp_private.signup_control set enabled=false where id;
 if not found then raise exception 'missing signup control'; end if;
 insert into pg_temp.ga_containment_result values('signup','stopped');
exception when others then
 insert into pg_temp.ga_containment_result values('signup','check required: '||sqlstate);
end $$;
commit;

begin;
do $$ declare route text; begin
 foreach route in array array['claude-proxy','code-exec'] loop
  begin
   update ga_private.edge_routes set paused=true where function_name=route;
   if not found then raise exception 'missing route'; end if;
   insert into pg_temp.ga_containment_result values(route,'stopped');
  exception when others then
   insert into pg_temp.ga_containment_result values(route,'check required: '||sqlstate);
  end;
 end loop;
end $$;
commit;

begin;
do $$ begin
 update ga_private.roadmap_control set paused=true where id;
 if not found then raise exception 'missing Roadmap control'; end if;
 insert into pg_temp.ga_containment_result values('roadmap pause','stopped');
exception when others then
 insert into pg_temp.ga_containment_result values('roadmap pause','check required: '||sqlstate);
end $$;
commit;

begin;
do $$ declare signature text; routine regprocedure; role_name text;
begin
 foreach signature in array array['public.roadmap_start_session(uuid,text,text)',
  'public.roadmap_complete_session(uuid,text,text,integer,jsonb,text)',
  'public.ga_roadmap_set_daily_task(uuid,timestamptz,boolean,text,uuid)',
  'public.ga_roadmap_edit_comparison(uuid,timestamptz,jsonb,uuid)',
  'public.ga_roadmap_preview_import(uuid)',
  'public.ga_roadmap_import_comparison(uuid,uuid,text,jsonb,uuid)',
  'public.ga_roadmap_reset_daily_tasks(jsonb,text,text,uuid)',
  'public.ga_roadmap_edit_tasks(jsonb,uuid)',
  'public.ga_roadmap_add_log(uuid,jsonb,uuid)',
  'public.ga_roadmap_create_tasks(jsonb,uuid)','public.ga_roadmap_structure(jsonb,uuid)'] loop
  begin
   routine:=to_regprocedure(signature);
   -- Candidates 08/10/11/12/13/14/15/16 are optional until their separate installation windows.
   if routine is null and signature in ('public.ga_roadmap_set_daily_task(uuid,timestamptz,boolean,text,uuid)',
    'public.ga_roadmap_edit_comparison(uuid,timestamptz,jsonb,uuid)',
    'public.ga_roadmap_preview_import(uuid)','public.ga_roadmap_import_comparison(uuid,uuid,text,jsonb,uuid)',
    'public.ga_roadmap_reset_daily_tasks(jsonb,text,text,uuid)',
    'public.ga_roadmap_edit_tasks(jsonb,uuid)','public.ga_roadmap_add_log(uuid,jsonb,uuid)',
    'public.ga_roadmap_create_tasks(jsonb,uuid)','public.ga_roadmap_structure(jsonb,uuid)') then continue; end if;
   if routine is null then raise exception 'missing routine'; end if;
   execute format('revoke execute on function %s from public,anon,authenticated,service_role',routine);
   foreach role_name in array array['anon','authenticated','service_role'] loop
    if has_function_privilege(role_name,routine,'execute') then
     insert into pg_temp.ga_containment_result values(signature,'inherited execution requires review');
     exit;
    end if;
   end loop;
   insert into pg_temp.ga_containment_result values(signature,'stopped') on conflict do nothing;
  exception when others then
   insert into pg_temp.ga_containment_result values(signature,'check required: '||sqlstate);
  end;
 end loop;
end $$;
commit;

select component,outcome from pg_temp.ga_containment_result order by component;
do $$ declare incomplete text; begin
 select string_agg(component||' ('||outcome||')',', ' order by component) into incomplete
 from pg_temp.ga_containment_result where outcome<>'stopped';
 if incomplete is not null then raise exception 'Containment incomplete: %',incomplete; end if;
end $$;
