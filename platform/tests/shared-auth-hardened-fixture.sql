-- Isolated fixture for the hardened legacy Auth contract reviewed 2026-11-26.
-- Definitions contain no hosted identities/data. Never deploy test fixtures.
-- Only fill the reduced PGlite Auth shape; real Supabase already owns these.
do $fixture$
begin
 if not exists(select 1 from pg_attribute where attrelid='auth.users'::regclass
  and attname='is_anonymous' and not attisdropped) then
  alter table auth.users add column is_anonymous boolean default false;
 end if;
 if to_regprocedure('auth.jwt()') is null then
  execute $sql$create function auth.jwt() returns jsonb language sql stable as
   $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$$sql$;
 end if;
end $fixture$;

CREATE OR REPLACE FUNCTION public.chatak_enforce_allowlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE linked_id uuid;
BEGIN
  IF NEW.id IS NULL OR NEW.is_anonymous IS DISTINCT FROM false
     OR NEW.email IS NULL OR pg_catalog.btrim(NEW.email) = '' THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  BEGIN
    SELECT r.auth_user_id INTO STRICT linked_id
    FROM public.authentication_mode_user_roles r
    WHERE pg_catalog.lower(r.email) = pg_catalog.lower(NEW.email)
    FOR UPDATE;
  EXCEPTION WHEN no_data_found OR too_many_rows THEN
    RAISE EXCEPTION 'not_allowed';
  END;
  IF linked_id IS NOT NULL AND linked_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='registry_link_conflict';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chatak_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.chatak_profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.chatak_link_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE registry_id integer;
DECLARE linked_id uuid;
BEGIN
  IF NEW.id IS NULL OR NEW.is_anonymous IS DISTINCT FROM false
     OR NEW.email IS NULL OR pg_catalog.btrim(NEW.email) = '' THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  BEGIN
    SELECT r.id, r.auth_user_id INTO STRICT registry_id, linked_id
    FROM public.authentication_mode_user_roles r
    WHERE pg_catalog.lower(r.email) = pg_catalog.lower(NEW.email)
    FOR UPDATE;
  EXCEPTION WHEN no_data_found OR too_many_rows THEN
    RAISE EXCEPTION 'not_allowed';
  END;
  IF linked_id IS NOT NULL AND linked_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='registry_link_conflict';
  END IF;
  IF linked_id IS NULL THEN
    UPDATE public.authentication_mode_user_roles AS r
       SET auth_user_id = NEW.id, updated_at = pg_catalog.now()
     WHERE r.id = registry_id AND r.auth_user_id IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='registry_link_conflict';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chatak_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT CASE WHEN count(*) = 1 THEN
    CASE max(r.role)
      WHEN 'admin' THEN 'admin'
      WHEN 'operator' THEN 'editor'
      WHEN 'viewer' THEN 'viewer'
      ELSE NULL
    END
  END
  FROM public.authentication_mode_user_roles AS r
  JOIN auth.users AS u ON u.id = r.auth_user_id
  WHERE r.auth_user_id = (SELECT auth.uid())
    AND u.is_anonymous IS FALSE
    AND coalesce(
      (SELECT auth.jwt() ->> 'is_anonymous'),
      'false'
    ) = 'false';
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.authentication_mode_user_roles r
    WHERE r.auth_user_id = NEW.id
      AND pg_catalog.lower(r.email) = pg_catalog.lower(NEW.email)
  ) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='registry_link_required';
  END IF;
  INSERT INTO public.alarm_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Reduced administration boundary: retained UUID role semantics are exercised.
create policy fixture_registry_admin on public.authentication_mode_user_roles for all to authenticated
 using(public.chatak_role()='admin') with check(public.chatak_role()='admin');
revoke truncate on public.authentication_mode_user_roles from anon,authenticated;
