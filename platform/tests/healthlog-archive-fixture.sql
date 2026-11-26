-- Exact reviewed archive columns, constraints and permissive policy baseline.
-- Synthetic records only. Replace the intentionally reduced shared fixture.
drop table public.healthlog_visits_old;
drop table public.healthlog_clinics_old;
drop table public.healthlog_dose_logs_old;
create table public.healthlog_clinics_old (
 id uuid default gen_random_uuid() constraint healthlog_clinics_pkey primary key,
 user_id text not null, name text not null, phone text, address text,
 created_at timestamptz default now(), constraint healthlog_clinics_user_id_name_key unique(user_id,name)
);
create table public.healthlog_visits_old (
 id uuid default gen_random_uuid() constraint healthlog_visits_pkey primary key,
 user_id text not null, clinic_id uuid constraint healthlog_visits_clinic_id_fkey references public.healthlog_clinics_old(id) on delete set null,
 clinic_name text not null, doctor text, visit_date date not null, concern text not null, notes text, follow_up date,
 cost_consult numeric(10,2) not null default 0, cost_meds numeric(10,2) not null default 0,
 cost_other numeric(10,2) not null default 0, created_at timestamptz default now()
);
create table public.healthlog_medicines_old (
 id uuid default gen_random_uuid() constraint healthlog_medicines_pkey primary key,
 visit_id uuid not null constraint healthlog_medicines_visit_id_fkey references public.healthlog_visits_old(id) on delete cascade,
 name text not null, dose text, slots text[] not null default '{morning}',
 days integer not null default 1 constraint healthlog_medicines_days_check check(days>=1),
 sort integer default 0, name_verified boolean not null default false, name_verified_at timestamptz
);
create table public.healthlog_dose_logs_old (
 user_id text not null, medicine_id uuid not null constraint healthlog_dose_logs_medicine_id_fkey references public.healthlog_medicines_old(id) on delete cascade,
 log_date date not null, slot text not null constraint healthlog_dose_logs_slot_check check(slot in ('morning','noon','evening','night')),
 taken boolean not null default true, updated_at timestamptz default now(),
 constraint healthlog_dose_logs_pkey primary key(user_id,medicine_id,log_date,slot)
);
alter table public.healthlog_clinics_old enable row level security;
alter table public.healthlog_visits_old enable row level security;
alter table public.healthlog_medicines_old enable row level security;
alter table public.healthlog_dose_logs_old enable row level security;
create policy "all clinics" on public.healthlog_clinics_old for all using(true) with check(true);
create policy "all visits" on public.healthlog_visits_old for all using(true) with check(true);
create policy "all medicines" on public.healthlog_medicines_old for all using(true) with check(true);
create policy "all dose logs" on public.healthlog_dose_logs_old for all using(true) with check(true);
grant all on public.healthlog_clinics_old,public.healthlog_visits_old,public.healthlog_medicines_old,public.healthlog_dose_logs_old to anon,authenticated,service_role;
