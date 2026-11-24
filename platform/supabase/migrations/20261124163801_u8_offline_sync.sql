-- U8: additive, isolated migration. No hosted project is modified by this file.
begin;
alter table public.cp_study_state add column revision bigint not null default 1 check(revision>0);
alter table public.cp_study_state add column material_version_id uuid references public.cp_material_versions(id);
alter table public.cp_study_state add column last_operation uuid;
-- Preserve existing rows and owner/section RLS reads. All new writes must use CAS;
-- otherwise a stale direct UPDATE/DELETE could defeat synchronization revisions.
revoke insert,update,delete on public.cp_study_state from anon,authenticated;

create function cp_private.check_study_material(target uuid, section text) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not cp_private.can_study(section) or not cp_private.can_read_material(target)
  or not exists(select 1 from public.cp_material_versions where id=target and state='published' and payload->>'section_id'=section)
 then raise exception 'assigned study unavailable' using errcode='42501'; end if;
end; $$;

create function public.cp_sync_read(expected_owner uuid, target uuid, section text, record text, record_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.cp_study_state;
begin
 if expected_owner is null or expected_owner is distinct from auth.uid() then raise exception 'account changed' using errcode='42501'; end if;
 perform cp_private.check_study_material(target,section);
 select * into r from public.cp_study_state where user_id=auth.uid() and section_id=section and record_id=record and kind=record_kind;
 if not found then return jsonb_build_object('revision','0','value',null); end if;
 if r.material_version_id is not null and r.material_version_id<>target then raise exception 'material identity mismatch' using errcode='22023'; end if;
 return jsonb_build_object('revision',r.revision::text,'value',r.value);
end; $$;

create function public.cp_sync_write(expected_owner uuid, target uuid, section text, record text, record_kind text, expected_revision bigint, operation uuid, new_value jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.cp_study_state; actual bigint;
begin
 -- Same short transaction lock as access/publication mutations: check the current
 -- grant AFTER acquiring it, including revocation while a request was waiting.
 update cp_private.mutation_lock set revision=revision+1;
 if expected_owner is null or expected_owner is distinct from auth.uid() then raise exception 'account changed' using errcode='42501'; end if;
 perform cp_private.check_study_material(target,section);
 if operation is null or expected_revision is null or expected_revision<0 or record is null or length(record) not between 1 and 160
  or record_kind is null or record_kind not in ('progress','bookmark','highlight','note')
  or jsonb_typeof(new_value) is distinct from 'object' or octet_length(new_value::text)>65536
 then raise exception 'invalid study record' using errcode='22023'; end if;
 select * into r from public.cp_study_state where user_id=auth.uid() and section_id=section and record_id=record and kind=record_kind;
 actual:=coalesce(r.revision,0);
 if r.material_version_id is not null and r.material_version_id<>target then raise exception 'material identity mismatch' using errcode='22023'; end if;
 if r.last_operation=operation then
  if r.value<>new_value then raise exception 'operation reused for different work' using errcode='22023'; end if;
  return jsonb_build_object('status','saved','revision',actual::text,'value',r.value);
 end if;
 if actual<>expected_revision then
  return jsonb_build_object('status','conflict','revision',actual::text,'value',r.value);
 end if;
 insert into public.cp_study_state(user_id,section_id,record_id,kind,value,revision,material_version_id,last_operation)
 values(auth.uid(),section,record,record_kind,new_value,1,target,operation)
 on conflict(user_id,section_id,record_id,kind) do update set value=excluded.value,revision=cp_study_state.revision+1,material_version_id=excluded.material_version_id,last_operation=excluded.last_operation;
 return jsonb_build_object('status','saved','revision',(actual+1)::text,'value',new_value);
end; $$;

-- Invoker/RLS snapshot: the Edge signer receives only this caller's currently
-- authorized published data. A snapshot is not itself a signed offline lease.
create function public.cp_offline_snapshot(section text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; member public.cp_memberships;
begin
 select * into member from public.cp_memberships where user_id=auth.uid() and status='active';
 if not found or not cp_private.can_study(section) then raise exception 'study access unavailable' using errcode='42501'; end if;
 select jsonb_build_object('owner',auth.uid(),'display_name',member.display_name,'section',section,
  'profile',coalesce((select profile from public.cp_learning_profiles where user_id=auth.uid()),'{}'),
  'materials',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'owner_id',auth.uid(),'publication_state',v.state,'version',v.version,'payload',v.payload,'asset',v.asset) order by v.id)
    from public.cp_material_versions v where v.state='published' and v.payload->>'section_id'=section and cp_private.can_read_material(v.id)),'[]')) into result;
 if jsonb_array_length(result->'materials')>100 or octet_length(result::text)>4194304 then raise exception 'offline pack is too large; split assignments' using errcode='22023'; end if;
 return result;
end; $$;
revoke all on function cp_private.check_study_material(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.cp_sync_read(uuid,uuid,text,text,text),public.cp_sync_write(uuid,uuid,text,text,text,bigint,uuid,jsonb),public.cp_offline_snapshot(text) from public,anon,authenticated,service_role;
grant execute on function public.cp_sync_read(uuid,uuid,text,text,text),public.cp_sync_write(uuid,uuid,text,text,text,bigint,uuid,jsonb),public.cp_offline_snapshot(text) to authenticated;
commit;
