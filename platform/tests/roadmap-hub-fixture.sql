-- Synthetic catalog fixture derived from Akatsuki R001/R010/R017. No hosted rows.
create sequence public.akatsuki_seq;
create table akatsuki_requests (
  seq             bigint primary key default nextval('akatsuki_seq'),
  user_id         uuid not null default auth.uid(),
  from_app        text not null,
  to_app          text not null,
  kind            text not null,
  src_addr        jsonb not null,                     -- origin's opaque address, stored as given
  src_clock       text,                               -- origin's clock value, recorded not trusted
  payload         jsonb not null,
  idempotency_key text not null,
  status          text not null default 'pending' check (status in ('pending','delivered','rejected','skipped')),
  reply           jsonb,                              -- request/reply: target writes here, origin reads back
  error           text,
  created_at      timestamptz not null default now(),
  delivered_at    timestamptz,
  unique (user_id, idempotency_key)
);
create table akatsuki_vocab (
  user_id  uuid not null default auth.uid(),
  ns       text not null check (ns in ('context','kind','icon','palette')),
  id       text not null,                             -- '@train' 'task.upsert' 'flame' '#c0392b'
  schema   jsonb,                                     -- kinds only: {"required":[...],"optional":[...]}
  meta     jsonb not null default '{}',
  version  int  not null default 1,
  primary key (user_id, ns, id)
);
alter table akatsuki_requests add column reply_seq bigint;
alter table akatsuki_requests add column attempts int not null default 0;
alter table akatsuki_requests add column next_try_at timestamptz;
alter table akatsuki_vocab drop constraint akatsuki_vocab_ns_check;
alter table akatsuki_vocab add constraint akatsuki_vocab_ns_check check(ns in ('context','kind','icon','palette','enum','error'));
alter table akatsuki_requests enable row level security;
alter table akatsuki_vocab enable row level security;
create policy akatsuki_requests_owner on akatsuki_requests for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy akatsuki_vocab_owner on akatsuki_vocab for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
