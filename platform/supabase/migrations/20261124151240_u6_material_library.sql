-- Isolated U6 implementation. Apply only after the documented staging gates.
begin;
create function cp_private.json_valid(v jsonb,s jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare item jsonb; k text; rule jsonb; n numeric;
begin
 if s ? 'anyOf' then for rule in select * from jsonb_array_elements(s->'anyOf') loop if cp_private.json_valid(v,rule) then return true; end if; end loop; return false; end if;
 if s ? 'const' then return v is not distinct from s->'const'; end if;
 if s ? 'enum' then return exists(select 1 from jsonb_array_elements(s->'enum') x where x=v); end if;
 if v is null or jsonb_typeof(v) is distinct from s->>'type' then return false; end if;
 if s->>'type'='object' then
  if not(v ?& array(select jsonb_array_elements_text(s->'required'))) or v-array(select jsonb_object_keys(s->'properties'))<>'{}'::jsonb then return false; end if;
  for k,rule in select * from jsonb_each(s->'properties') loop if not cp_private.json_valid(v->k,rule) then return false; end if; end loop;
 elsif s->>'type'='array' then
  if jsonb_array_length(v)<coalesce((s->>'minItems')::int,0) or jsonb_array_length(v)>(s->>'maxItems')::int then return false; end if;
  if s->>'uniqueItems'='true' and (select count(*)<>count(distinct x) from jsonb_array_elements(v) x) then return false; end if;
  for item in select * from jsonb_array_elements(v) loop if not cp_private.json_valid(item,s->'items') then return false; end if; end loop;
 elsif s->>'type'='string' then
  if length(v#>>'{}')<coalesce((s->>'minLength')::int,0) or length(v#>>'{}')>(s->>'maxLength')::int then return false; end if;
  if s ? 'minLength' and btrim(v#>>'{}')='' then return false; end if;
  if s ? 'pattern' and not (v#>>'{}' ~ (s->>'pattern')) then return false; end if;
 elsif s->>'type'='number' then
  n:=(v#>>'{}')::numeric;
  if n<(s->>'minimum')::numeric or n>(s->>'maximum')::numeric or (s->>'integer'='true' and n<>trunc(n)) then return false; end if;
 end if;
 return true;
exception when others then return false;
end; $$;
create function cp_private.valid_material(v jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare schema jsonb := $schema${"type":"object","properties":{"schema_version":{"const":1},"section_id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,79}$"},"title":{"type":"string","minLength":1,"maxLength":160},"material_type":{"enum":["example","explanation","guided_exercise","practice","quiz","tutorial","answer_sheet","project","dataset","code"]},"content":{"anyOf":[{"type":"object","properties":{"format":{"const":"bundle"},"bundle":{"type":"object","properties":{"concept":{"type":"object","properties":{"schema_version":{"const":1},"kind":{"const":"concept"},"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true},"section_id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"title":{"type":"string","minLength":1,"maxLength":160},"explanation":{"type":"string","minLength":1,"maxLength":8000},"objectives":{"type":"array","items":{"type":"string","minLength":1,"maxLength":500},"minItems":1,"maxItems":20,"uniqueItems":false}},"required":["schema_version","kind","id","version","section_id","title","explanation","objectives"],"additionalProperties":false},"scenario":{"type":"object","properties":{"schema_version":{"const":1},"kind":{"const":"scenario"},"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true},"title":{"type":"string","minLength":1,"maxLength":160},"context":{"type":"string","minLength":1,"maxLength":4000},"instructions":{"type":"string","minLength":1,"maxLength":4000}},"required":["schema_version","kind","id","version","title","context","instructions"],"additionalProperties":false},"dataset":{"type":"object","properties":{"schema_version":{"const":1},"kind":{"const":"dataset"},"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true},"title":{"type":"string","minLength":1,"maxLength":160},"columns":{"type":"array","items":{"type":"object","properties":{"key":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"label":{"type":"string","minLength":1,"maxLength":80},"type":{"enum":["text","number"]},"unit":{"type":"string","maxLength":40}},"required":["key","label","type","unit"],"additionalProperties":false},"minItems":1,"maxItems":16,"uniqueItems":false},"rows":{"type":"array","items":{"type":"array","items":{"anyOf":[{"type":"string","minLength":1,"maxLength":300},{"type":"number","minimum":-1000000000000.0,"maximum":1000000000000.0}]},"minItems":1,"maxItems":16,"uniqueItems":false},"minItems":1,"maxItems":200,"uniqueItems":false}},"required":["schema_version","kind","id","version","title","columns","rows"],"additionalProperties":false},"lesson":{"type":"object","properties":{"schema_version":{"const":1},"kind":{"const":"lesson"},"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true},"section_id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"title":{"type":"string","minLength":1,"maxLength":160},"concept_ref":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true}},"required":["id","version"],"additionalProperties":false},"scenario_ref":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true}},"required":["id","version"],"additionalProperties":false},"dataset_ref":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true}},"required":["id","version"],"additionalProperties":false},"required_capabilities":{"type":"array","items":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"minItems":1,"maxItems":20,"uniqueItems":true},"activities":{"type":"array","items":{"anyOf":[{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"type":{"const":"explanation"},"instruction":{"type":"string","minLength":1,"maxLength":2000}},"required":["id","type","instruction"],"additionalProperties":false},{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"type":{"const":"sum-column"},"instruction":{"type":"string","minLength":1,"maxLength":2000},"column_key":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"}},"required":["id","type","instruction","column_key"],"additionalProperties":false}]},"minItems":1,"maxItems":50,"uniqueItems":false}},"required":["schema_version","kind","id","version","section_id","title","concept_ref","scenario_ref","dataset_ref","required_capabilities","activities"],"additionalProperties":false}},"required":["concept","scenario","dataset","lesson"],"additionalProperties":false}},"required":["format","bundle"],"additionalProperties":false},{"type":"object","properties":{"format":{"const":"dataset"},"dataset":{"type":"object","properties":{"schema_version":{"const":1},"kind":{"const":"dataset"},"id":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"version":{"type":"number","minimum":1,"maximum":9007199254740991,"integer":true},"title":{"type":"string","minLength":1,"maxLength":160},"columns":{"type":"array","items":{"type":"object","properties":{"key":{"type":"string","pattern":"^[a-z][a-z0-9.-]{0,99}$"},"label":{"type":"string","minLength":1,"maxLength":80},"type":{"enum":["text","number"]},"unit":{"type":"string","maxLength":40}},"required":["key","label","type","unit"],"additionalProperties":false},"minItems":1,"maxItems":16,"uniqueItems":false},"rows":{"type":"array","items":{"type":"array","items":{"anyOf":[{"type":"string","minLength":1,"maxLength":300},{"type":"number","minimum":-1000000000000.0,"maximum":1000000000000.0}]},"minItems":1,"maxItems":16,"uniqueItems":false},"minItems":1,"maxItems":200,"uniqueItems":false}},"required":["schema_version","kind","id","version","title","columns","rows"],"additionalProperties":false}},"required":["format","dataset"],"additionalProperties":false},{"type":"object","properties":{"format":{"const":"document"},"blocks":{"type":"array","items":{"anyOf":[{"type":"object","properties":{"kind":{"const":"paragraph"},"text":{"type":"string","minLength":1,"maxLength":8000}},"required":["kind","text"],"additionalProperties":false},{"type":"object","properties":{"kind":{"const":"code"},"language":{"type":"string","minLength":1,"maxLength":40},"text":{"type":"string","minLength":1,"maxLength":12000}},"required":["kind","language","text"],"additionalProperties":false},{"type":"object","properties":{"kind":{"const":"question"},"text":{"type":"string","minLength":1,"maxLength":2000},"choices":{"type":"array","items":{"type":"string","minLength":1,"maxLength":500},"minItems":2,"maxItems":8,"uniqueItems":true}},"required":["kind","text","choices"],"additionalProperties":false}]},"minItems":1,"maxItems":60,"uniqueItems":false}},"required":["format","blocks"],"additionalProperties":false},{"type":"object","properties":{"format":{"const":"attachment"}},"required":["format"],"additionalProperties":false}]}},"required":["schema_version","section_id","title","material_type","content"],"additionalProperties":false}$schema$::jsonb; c jsonb; b jsonb; d jsonb; a jsonb; r jsonb; col jsonb; i integer;
begin
 if v is null or octet_length(v::text)>262144 or not cp_private.json_valid(v,schema) then return false; end if;
 c:=v->'content';
 if c->>'format'='bundle' then
  b:=c->'bundle'; d:=b->'dataset';
  if b->'lesson'->>'section_id'<>v->>'section_id' or b->'concept'->>'section_id'<>v->>'section_id' then return false; end if;
  foreach i in array array[1,2,3] loop
   r:=b->(array['concept','scenario','dataset'])[i];a:=b->'lesson'->((array['concept','scenario','dataset'])[i]||'_ref');
   if a->'id'<>r->'id' or a->'version'<>r->'version' then return false; end if;
  end loop;
  if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(b->'lesson'->'activities') x) then return false; end if;
  if exists(select 1 from jsonb_array_elements_text(b->'lesson'->'required_capabilities') x where x not in ('explanation.text.v1','excel.sum.b2-b4.v1')) then return false; end if;
  if b->'lesson'->'required_capabilities' ? 'excel.sum.b2-b4.v1' then
   if v->>'section_id'<>'office.excel' or jsonb_array_length(d->'rows')<>3 or jsonb_array_length(d->'columns')<>2 or d->'columns'->0->>'type'<>'text' or d->'columns'->1->>'type'<>'number' or (select count(*) from jsonb_array_elements(b->'lesson'->'activities') x where x->>'type'='sum-column')<>1 then return false; end if;
  elsif exists(select 1 from jsonb_array_elements(b->'lesson'->'activities') x where x->>'type'<>'explanation') then return false; end if;
  for a in select * from jsonb_array_elements(b->'lesson'->'activities') loop
   if a->>'type'='sum-column' and (a->>'column_key'<>d->'columns'->1->>'key' or not exists(select 1 from jsonb_array_elements(d->'columns') x where x->>'key'=a->>'column_key' and x->>'type'='number')) then return false; end if;
  end loop;
 elsif c->>'format'='dataset' then d:=c->'dataset'; end if;
 if d is not null then
  if (select count(*)<>count(distinct x->>'key') from jsonb_array_elements(d->'columns') x) then return false; end if;
  for r in select * from jsonb_array_elements(d->'rows') loop
   if jsonb_array_length(r)<>jsonb_array_length(d->'columns') then return false; end if;
   for i in 0..jsonb_array_length(r)-1 loop col:=d->'columns'->i;if jsonb_typeof(r->i)<>(case when col->>'type'='text' then 'string' else 'number' end) then return false; end if; end loop;
  end loop;
 end if;
 return true;
exception when others then return false;
end; $$;
create table public.cp_materials(id uuid primary key default gen_random_uuid(),section_id text not null references public.cp_sections(id),created_at timestamptz not null default now());
create table public.cp_material_versions(
 id uuid primary key default gen_random_uuid(),material_id uuid not null references public.cp_materials(id),version integer not null check(version>0),
 payload jsonb not null check(cp_private.valid_material(payload)),state text not null default 'draft' check(state in ('draft','published','archived')),
 revision bigint not null default 1,asset jsonb,upload_nonce uuid,upload_by uuid,created_by uuid not null,reviewed_by uuid,published_at timestamptz,created_at timestamptz not null default now(),
 unique(material_id,version),check(revision>0),check(state<>'published' or reviewed_by is not null)
);
create table public.cp_material_assignments(
 id uuid primary key default gen_random_uuid(),version_id uuid not null references public.cp_material_versions(id),learner_id uuid references public.cp_memberships(user_id),group_id uuid references public.cp_profile_groups(id),
 decision text not null check(decision in ('allow','deny','none')),answers_released boolean not null default false,
 check((learner_id is null)<>(group_id is null)),check(group_id is null or decision<>'deny')
);
create unique index cp_material_to_learner on public.cp_material_assignments(version_id,learner_id) where learner_id is not null;
create unique index cp_material_to_group on public.cp_material_assignments(version_id,group_id) where group_id is not null;
create index cp_material_by_learner on public.cp_material_assignments(learner_id,version_id);
create index cp_material_by_group on public.cp_material_assignments(group_id,version_id);
create function cp_private.can_read_material(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select cp_private.is_admin() or exists(
  select 1 from public.cp_material_versions v join public.cp_materials m on m.id=v.material_id
  where v.id=target and v.state='published' and cp_private.can_study(m.section_id)
  and not exists(select 1 from public.cp_material_assignments a where a.version_id=v.id and a.learner_id=auth.uid() and a.decision='deny')
  and exists(select 1 from public.cp_material_assignments a where a.version_id=v.id and a.decision='allow'
   and (a.learner_id=auth.uid() or exists(select 1 from public.cp_profile_group_members g where g.group_id=a.group_id and g.user_id=auth.uid()))
   and (v.payload->>'material_type'<>'answer_sheet' or a.answers_released))
 );
$$;
alter table public.cp_materials enable row level security;
alter table public.cp_material_versions enable row level security;
alter table public.cp_material_assignments enable row level security;
revoke all on public.cp_materials,public.cp_material_versions,public.cp_material_assignments from public,anon,authenticated;
grant select on public.cp_materials,public.cp_material_versions,public.cp_material_assignments to authenticated;
create policy materials_read on public.cp_materials for select to authenticated using(cp_private.is_admin() or exists(select 1 from public.cp_material_versions v where v.material_id=cp_materials.id and cp_private.can_read_material(v.id)));
create policy versions_read on public.cp_material_versions for select to authenticated using(cp_private.can_read_material(id));
create policy assignments_admin_read on public.cp_material_assignments for select to authenticated using(cp_private.is_admin());

-- A private service-only bucket: even pre-existing broad permissive policies
-- cannot grant a client direct read, write or signed-URL creation for this bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cp-materials','cp-materials',false,10485760,array['application/octet-stream']) on conflict(id) do nothing;
do $$ begin if exists(select 1 from storage.buckets where id='cp-materials' and (public or file_size_limit is distinct from 10485760 or allowed_mime_types is distinct from array['application/octet-stream'])) then raise exception 'cp-materials bucket configuration conflict; inspect before migration'; end if; end; $$;
create policy cp_material_objects_private on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'cp-materials') with check(bucket_id<>'cp-materials');
create policy cp_material_bucket_private on storage.buckets as restrictive for all to anon,authenticated using(id<>'cp-materials') with check(id<>'cp-materials');
create function cp_private.material_admin_lock() returns void language plpgsql security definer set search_path='' as $$
begin update cp_private.mutation_lock set revision=revision+1; if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if; end; $$;
create function public.cp_admin_material_library() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 return jsonb_build_object('versions',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'material_id',v.material_id,'version',v.version,'title',v.payload->>'title','section_id',v.payload->>'section_id','material_type',v.payload->>'material_type','state',v.state,'revision',v.revision::text) order by v.created_at desc,v.id) from public.cp_material_versions v),'[]'),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.cp_profile_groups),'[]'));
end; $$;
create function public.cp_admin_material_detail(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v public.cp_material_versions;
begin
 if not cp_private.is_admin() then raise exception 'administrator required' using errcode='42501'; end if;
 select * into v from public.cp_material_versions where id=target;if not found then raise exception 'material not found' using errcode='22023'; end if;
 return jsonb_build_object('id',v.id,'material_id',v.material_id,'version',v.version,'revision',v.revision::text,'state',v.state,'payload',v.payload,'asset',v.asset,'upload_pending',v.upload_nonce is not null,
 'audience',jsonb_build_object('learners',coalesce((select jsonb_agg(learner_id) from public.cp_material_assignments where version_id=target and learner_id is not null and decision='allow'),'[]'),
 'groups',coalesce((select jsonb_agg(group_id) from public.cp_material_assignments where version_id=target and group_id is not null and decision='allow'),'[]'),
 'excluded',coalesce((select jsonb_agg(learner_id) from public.cp_material_assignments where version_id=target and learner_id is not null and decision='deny'),'[]'),
 'release_answers',coalesce((select bool_and(answers_released) from public.cp_material_assignments where version_id=target and decision='allow'),false)));
end; $$;
create function public.cp_admin_material_save(target uuid,expected_revision bigint,draft jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.cp_material_versions; mid uuid; result uuid;
begin
 perform cp_private.material_admin_lock();
 if not cp_private.valid_material(draft) or not exists(select 1 from public.cp_sections where id=draft->>'section_id' and kind='section') then raise exception 'invalid material schema or section' using errcode='22023'; end if;
 if target is null then
  if expected_revision is distinct from 0 then raise exception 'new material revision required' using errcode='40001'; end if;
  insert into public.cp_materials(section_id) values(draft->>'section_id') returning id into mid;
  insert into public.cp_material_versions(material_id,version,payload,created_by) values(mid,1,draft,auth.uid()) returning id into result;
 else
  select * into v from public.cp_material_versions where id=target;
  if not found or v.revision is distinct from expected_revision then raise exception 'material changed' using errcode='40001'; end if;
  if v.state<>'draft' or v.payload->>'section_id'<>draft->>'section_id' then raise exception 'only drafts in the original section may be edited' using errcode='22023'; end if;
  update public.cp_material_versions set payload=draft,revision=revision+1,upload_nonce=null,upload_by=null,asset=case when draft->'content'->>'format'='attachment' then asset else null end where id=target;result:=target;
 end if;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),result,'material.draft','{}');return result;
end; $$;
create function public.cp_admin_material_copy(target uuid,expected_revision bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.cp_material_versions; result uuid; next_version integer;
begin
 perform cp_private.material_admin_lock();select * into v from public.cp_material_versions where id=target;
 if not found or v.revision is distinct from expected_revision then raise exception 'material changed' using errcode='40001'; end if;
 select max(version)+1 into next_version from public.cp_material_versions where material_id=v.material_id;
 insert into public.cp_material_versions(material_id,version,payload,asset,created_by) values(v.material_id,next_version,v.payload,v.asset,auth.uid()) returning id into result;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),result,'material.version',jsonb_build_object('source',target,'version',next_version));return result;
end; $$;
create function public.cp_admin_material_transition(target uuid,expected_revision bigint,next_state text,reviewed boolean) returns void language plpgsql security definer set search_path='' as $$
declare v public.cp_material_versions;
begin
 perform cp_private.material_admin_lock();select * into v from public.cp_material_versions where id=target;
 if not found or v.revision is distinct from expected_revision then raise exception 'material changed' using errcode='40001'; end if;
 if next_state='published' then
  if v.state<>'draft' or reviewed is distinct from true or v.upload_nonce is not null or (v.payload->'content'->>'format'='attachment' and v.asset is null) or not cp_private.valid_material(v.payload) then raise exception 'review a complete validated draft before publishing' using errcode='22023'; end if;
 elsif next_state<>'archived' or v.state='archived' then raise exception 'invalid publication transition' using errcode='22023'; end if;
 update public.cp_material_versions set state=next_state,revision=revision+1,upload_nonce=null,upload_by=null,reviewed_by=case when next_state='published' then auth.uid() else reviewed_by end,published_at=case when next_state='published' then now() else published_at end where id=target;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'material.'||next_state,jsonb_build_object('version',v.version));
end; $$;
create function public.cp_admin_material_assign(target uuid,expected_revision bigint,audience jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v public.cp_material_versions; uid uuid; gid uuid; k text; item jsonb;
begin
 perform cp_private.material_admin_lock();select * into v from public.cp_material_versions where id=target;
 if not found or v.revision is distinct from expected_revision then raise exception 'material changed' using errcode='40001'; end if;
 if audience is null or v.state<>'published' or jsonb_typeof(audience) is distinct from 'object' or not(audience ?& array['learners','groups','excluded','release_answers']) or audience-array['learners','groups','excluded','release_answers']<>'{}' or jsonb_typeof(audience->'release_answers')<>'boolean' then raise exception 'published material and explicit audience required' using errcode='22023'; end if;
 foreach k in array array['learners','groups','excluded'] loop
  if jsonb_typeof(audience->k)<>'array' or jsonb_array_length(audience->k)>500 then raise exception 'invalid audience' using errcode='22023'; end if;
  for item in select * from jsonb_array_elements(audience->k) loop
   if jsonb_typeof(item)<>'string' then raise exception 'invalid audience ID' using errcode='22023'; end if;
   uid:=(item#>>'{}')::uuid;
   if (k='groups' and not exists(select 1 from public.cp_profile_groups where id=uid)) or (k<>'groups' and not exists(select 1 from public.cp_memberships where user_id=uid and role='learner')) then raise exception 'unknown recipient' using errcode='22023'; end if;
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements_text(audience->'learners') x where audience->'excluded' ? x) then raise exception 'recipient cannot be allowed and excluded' using errcode='22023'; end if;
 update public.cp_material_assignments set decision='none',answers_released=false where version_id=target;
 foreach k in array array['learners','excluded'] loop
  for uid in select value::uuid from jsonb_array_elements_text(audience->k) loop
   insert into public.cp_material_assignments(version_id,learner_id,decision,answers_released) values(target,uid,case when k='excluded' then 'deny' else 'allow' end,(audience->>'release_answers')::boolean)
   on conflict(version_id,learner_id) where learner_id is not null do update set decision=excluded.decision,answers_released=excluded.answers_released;
  end loop;
 end loop;
 for gid in select value::uuid from jsonb_array_elements_text(audience->'groups') loop
  insert into public.cp_material_assignments(version_id,group_id,decision,answers_released) values(target,gid,'allow',(audience->>'release_answers')::boolean)
  on conflict(version_id,group_id) where group_id is not null do update set decision='allow',answers_released=excluded.answers_released;
 end loop;
 update public.cp_material_versions set revision=revision+1 where id=target;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'material.assign',audience);
end; $$;
create function public.cp_learner_materials(section text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'version',v.version,'title',v.payload->>'title','material_type',v.payload->>'material_type') order by v.created_at,v.id),'[]') from public.cp_material_versions v
 where v.payload->>'section_id'=section and v.state='published' and cp_private.can_read_material(v.id);
$$;
create function public.cp_read_material(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v public.cp_material_versions;
begin
 if not cp_private.can_read_material(target) then raise exception 'material unavailable' using errcode='42501'; end if;
 select * into v from public.cp_material_versions where id=target;if not found then raise exception 'material unavailable' using errcode='42501'; end if;
 return jsonb_build_object('id',v.id,'owner_id',auth.uid(),'publication_state',v.state,'version',v.version,'payload',v.payload,'asset',v.asset);
end; $$;
create function public.cp_admin_material_begin_upload(target uuid,expected_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.cp_material_versions; nonce uuid:=gen_random_uuid();
begin
 perform cp_private.material_admin_lock();select * into v from public.cp_material_versions where id=target;
 if not found or v.revision is distinct from expected_revision then raise exception 'material changed' using errcode='40001'; end if;
 if v.state<>'draft' or v.payload->'content'->>'format'<>'attachment' then raise exception 'attachment draft required' using errcode='22023'; end if;
 update public.cp_material_versions set revision=revision+1,upload_nonce=nonce,upload_by=auth.uid() where id=target;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(auth.uid(),target,'material.upload.begin',jsonb_build_object('nonce',nonce));
 return jsonb_build_object('nonce',nonce,'path',target::text||'/'||nonce::text);
end; $$;
-- Only the file-validation service may attest bytes. The actor is obtained from
-- getUser by that service, never a browser-supplied administrator flag.
create function public.cp_service_material_finish_upload(target uuid,nonce uuid,actor uuid,receipt jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v public.cp_material_versions;
begin
 update cp_private.mutation_lock set revision=revision+1;
 if not exists(select 1 from public.cp_memberships where user_id=actor and role='administrator' and status='active') then raise exception 'administrator required' using errcode='42501'; end if;
 select * into v from public.cp_material_versions where id=target;
 if not found or v.state<>'draft' or v.upload_nonce is distinct from nonce or v.upload_by is distinct from actor or nonce is null then raise exception 'upload became stale' using errcode='40001'; end if;
 if receipt is null or jsonb_typeof(receipt) is distinct from 'object' or jsonb_typeof(receipt->'filename') is distinct from 'string' or jsonb_typeof(receipt->'mime') is distinct from 'string' or jsonb_typeof(receipt->'sha256') is distinct from 'string' or jsonb_typeof(receipt->'bytes') is distinct from 'number' or not(receipt ?& array['filename','mime','bytes','sha256']) or receipt-array['filename','mime','bytes','sha256']<>'{}' or (receipt->>'filename') !~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{0,119}\.(xlsx|pdf|png|jpg|jpeg|txt)$' or (receipt->>'sha256') !~ '^[0-9a-f]{64}$' or (receipt->>'bytes')::bigint not between 1 and 10485760 or receipt->>'mime' not in ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/pdf','image/png','image/jpeg','text/plain') then raise exception 'invalid validated receipt' using errcode='22023'; end if;
 update public.cp_material_versions set asset=receipt||jsonb_build_object('path',target::text||'/'||nonce::text),upload_nonce=null,upload_by=null,revision=revision+1 where id=target;
 insert into public.cp_audit(actor_id,target_id,action,detail) values(actor,target,'material.file',jsonb_build_object('sha256',receipt->>'sha256','bytes',receipt->'bytes'));
end; $$;
revoke all on function cp_private.json_valid(jsonb,jsonb),cp_private.valid_material(jsonb),cp_private.material_admin_lock(),cp_private.can_read_material(uuid) from public,anon,authenticated,service_role;
grant execute on function cp_private.can_read_material(uuid) to authenticated;
revoke all on function public.cp_admin_material_library(),public.cp_admin_material_detail(uuid),public.cp_admin_material_save(uuid,bigint,jsonb),public.cp_admin_material_copy(uuid,bigint),public.cp_admin_material_transition(uuid,bigint,text,boolean),public.cp_admin_material_assign(uuid,bigint,jsonb),public.cp_admin_material_begin_upload(uuid,bigint),public.cp_read_material(uuid),public.cp_learner_materials(text),public.cp_service_material_finish_upload(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.cp_admin_material_library(),public.cp_admin_material_detail(uuid),public.cp_admin_material_save(uuid,bigint,jsonb),public.cp_admin_material_copy(uuid,bigint),public.cp_admin_material_transition(uuid,bigint,text,boolean),public.cp_admin_material_assign(uuid,bigint,jsonb),public.cp_admin_material_begin_upload(uuid,bigint),public.cp_read_material(uuid),public.cp_learner_materials(text) to authenticated;
grant execute on function public.cp_service_material_finish_upload(uuid,uuid,uuid,jsonb) to service_role;
commit;
