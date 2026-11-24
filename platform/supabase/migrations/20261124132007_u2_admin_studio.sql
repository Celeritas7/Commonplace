begin;
alter table public.cp_memberships add column access_revision bigint not null default 0;
-- Every write path, including the earlier U1 RPCs, invalidates stale editors.
create function cp_private.bump_member_revision() returns trigger
language plpgsql set search_path = '' as $$
begin new.access_revision := old.access_revision + 1; return new; end; $$;
create trigger cp_member_revision before update on public.cp_memberships for each row execute function cp_private.bump_member_revision();
create function cp_private.bump_grant_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.cp_memberships set access_revision = access_revision + 1 where user_id = coalesce(new.user_id,old.user_id);
 return null;
end; $$;
create trigger cp_grant_revision after insert or update or delete on public.cp_section_grants for each row execute function cp_private.bump_grant_revision();

-- Read email only after an active-admin check; never expose auth.users itself.
create function public.cp_admin_directory() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 select jsonb_build_object(
 'members', coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'display_name',m.display_name,'role',m.role,'status',m.status,'revision',m.access_revision::text,
 'allowed',coalesce((select jsonb_agg(g.section_id order by g.section_id) from public.cp_section_grants g where g.user_id=m.user_id and g.decision='allow'),'[]'::jsonb)))
 from public.cp_memberships m join auth.users u on u.id=m.user_id),'[]'::jsonb),
 'sections',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.cp_sections s),'[]'::jsonb)
 ) into result;
 return result;
end; $$;
create function public.cp_admin_register(login_email text, learner_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare matches uuid[]; target uuid;
begin
 update cp_private.mutation_lock set revision=revision+1;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 if login_email is null or length(btrim(login_email)) not between 3 and 320 then raise exception 'valid login email required' using errcode='22023'; end if;
 select array_agg(id) into matches from auth.users where lower(email)=lower(btrim(login_email)) and email_confirmed_at is not null;
 if coalesce(cardinality(matches),0) <> 1 then raise exception 'one verified account required' using errcode='22023'; end if;
 target := matches[1];
 if exists(select 1 from public.cp_memberships where user_id=target) then raise exception 'account already registered; edit its existing access' using errcode='23505'; end if;
 -- Starts suspended and with no grants. Registration cannot reactivate old access.
 perform public.cp_set_learner(target,'suspended',learner_name);
 return target;
end; $$;
create function public.cp_admin_save(target uuid, expected_revision bigint, learner_name text, new_status text, allowed_sections text[]) returns text
language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; sid text;
begin
 update cp_private.mutation_lock set revision=revision+1;
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 select access_revision into current_revision from public.cp_memberships where user_id=target and role='learner';
 if not found then raise exception 'learner required' using errcode='22023'; end if;
 if expected_revision is null or current_revision <> expected_revision then raise exception 'access changed; reload before saving' using errcode='40001'; end if;
 if allowed_sections is null or cardinality(allowed_sections)>500 then raise exception 'explicit section list required' using errcode='22023'; end if;
 if exists(select 1 from unnest(allowed_sections) x where x is null or not exists(select 1 from public.cp_sections s where s.id=x and s.kind='section')) then raise exception 'invalid study section' using errcode='22023'; end if;
 perform public.cp_set_learner(target,new_status,learner_name);
 delete from public.cp_section_grants where user_id=target;
 -- Save a reviewed leaf snapshot; absence is default deny, never wildcard access.
 for sid in select distinct x from unnest(allowed_sections) x loop
  insert into public.cp_section_grants values(target,sid,'allow');
 end loop;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'access.replace',jsonb_build_object('status',new_status,'allowed',to_jsonb(allowed_sections),'previous_revision',current_revision::text));
 select access_revision into current_revision from public.cp_memberships where user_id=target;
 return current_revision::text;
end; $$;
revoke all on function cp_private.bump_member_revision(), cp_private.bump_grant_revision() from public,anon,authenticated,service_role;
revoke all on function public.cp_admin_directory(), public.cp_admin_register(text,text), public.cp_admin_save(uuid,bigint,text,text,text[]) from public,anon,authenticated,service_role;
grant execute on function public.cp_admin_directory(), public.cp_admin_register(text,text), public.cp_admin_save(uuid,bigint,text,text,text[]) to authenticated;
-- Human-readable labels; IDs and existing routes remain unchanged.
update public.cp_sections s set title=v.title from (values
 ('office','Office Work'),('office.excel','Excel Study'),('office.vba','VBA and Macros'),('office.power-query','Power Query'),
 ('coding.cpp','C and C++'),('coding.sql','SQL'),('coding.ai','AI Study'),('coding.bat','BAT'),('coding.web','HTML, CSS and JavaScript'),
 ('maths','Mathematics'),('maths.algebra-trigonometry','Algebra and Trigonometry'),
 ('mechanical.gdt','Geometric Dimensioning & Tolerancing'),('mechanical.cmti','CMTI'),('languages','Language Study')
) as v(id,title) where s.id=v.id;
commit;
