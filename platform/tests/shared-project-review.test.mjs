import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

// Local-only semantic reproductions from the shared-project review. Names,
// identities and records are synthetic. No hosted URL, key or data is used.
// Passing these tests confirms the observed risky behavior, not remediation.
const a = "20000000-0000-4000-8000-000000000001";
const b = "20000000-0000-4000-8000-000000000002";
test("shared-project review reproduces authorization dependencies in isolated PostgreSQL", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      create table owner_notes(user_id uuid, note text);
      create table shared_notes(user_id uuid, note text);
      insert into owner_notes values('${b}','Synthetic B work');
      insert into shared_notes values('${b}','Synthetic B work');
      alter table owner_notes enable row level security;
      alter table shared_notes enable row level security;
      grant select,insert,update,delete on owner_notes,shared_notes to anon,authenticated;
      create policy own on owner_notes for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
      create policy broad on shared_notes for all using(true) with check(true);
    `);
    const as = async (id, sql, params = []) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
      await db.exec(id ? "set role authenticated" : "set role anon");
      return db.query(sql, params);
    };
    await t.test("owner policies deny other accounts while an unrestricted shared policy permits them", async () => {
      for (const id of [null, a]) {
        assert.equal((await as(id, "select * from owner_notes")).rows.length, 0);
        assert.equal((await as(id, "update owner_notes set note='wrong' returning user_id")).rows.length, 0);
        assert.equal((await as(id, "select * from shared_notes")).rows.length, 1);
        assert.equal((await as(id, "update shared_notes set note='exposed' returning user_id")).rows[0].user_id, b);
      }
      await as(b, "update owner_notes set note='Own edit'");
      assert.equal((await as(b, "select note from owner_notes")).rows[0].note, "Own edit");
    });
    await db.exec("reset role");
    await db.exec(`
      create table app_roles(id int primary key,email text unique,role text,name text,auth_user_id uuid unique,updated_at timestamptz);
      create table app_profiles(id uuid primary key,email text);
      create table app_settings(user_id uuid primary key);
      create function review_allowlist() returns trigger language plpgsql security definer as $$
      begin
        if not exists(select 1 from app_roles where lower(email)=lower(new.email)) then
          raise exception 'not_allowed';
        end if;
        return new;
      end$$;
      create function review_link() returns trigger language plpgsql security definer as $$
      begin
        update app_roles set auth_user_id=new.id,updated_at=now()
          where lower(email)=lower(new.email) and (auth_user_id is null or auth_user_id<>new.id);
        return new;
      end$$;
      create function review_profile() returns trigger language plpgsql security definer as $$
      begin
        insert into app_profiles values(new.id,new.email) on conflict(id) do nothing;
        return new;
      end$$;
      create function review_defaults() returns trigger language plpgsql security definer as $$
      declare v_next int;
      begin
        select coalesce(max(id),0)+1 into v_next from app_roles;
        insert into app_roles(id,email,role,name,auth_user_id)
          values(v_next,new.email,'operator',coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),new.id)
          on conflict(auth_user_id) do nothing;
        update app_roles set auth_user_id=new.id where auth_user_id is null and lower(email)=lower(new.email);
        insert into app_settings values(new.id) on conflict(user_id) do nothing;
        return new;
      end$$;
      create trigger a_gate before insert on auth.users for each row execute function review_allowlist();
      create trigger b_link after insert on auth.users for each row execute function review_link();
      create trigger c_profile after insert on auth.users for each row execute function review_profile();
      create trigger d_defaults after insert on auth.users for each row execute function review_defaults();
    `);
    await t.test("shared signup gate rejects an unlisted learner and approved signup has cross-app side effects", async () => {
      await assert.rejects(
        () => db.query("insert into auth.users(id,email) values($1,'learner@example.invalid')", [a]),
        /not_allowed/,
      );
      assert.equal((await db.query("select count(*)::int n from auth.users")).rows[0].n, 0);
      await db.exec("insert into app_roles(id,email,role) values(1,'learner@example.invalid','viewer')");
      await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'learner@example.invalid','{\"role\":\"admin\"}')", [a]);
      const roles = (await db.query("select role,auth_user_id from app_roles")).rows;
      assert.deepEqual(roles, [{ role: "viewer", auth_user_id: a }]);
      assert.equal((await db.query("select count(*)::int n from app_profiles")).rows[0].n, 1);
      assert.equal((await db.query("select count(*)::int n from app_settings")).rows[0].n, 1);
    });
    await db.exec(`
      create table review_tasks(id uuid primary key,user_id uuid not null);
      create table review_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),
        task_id uuid references review_tasks,day_key text not null,started_at timestamptz,unique(task_id,day_key));
      insert into review_tasks values('${b}','${b}');
      insert into review_sessions(user_id,task_id,day_key) values('${b}','${b}','synthetic-day');
      alter table review_sessions enable row level security;
      create policy own on review_sessions for all using(user_id=auth.uid()) with check(user_id=auth.uid());
      grant select,update on review_sessions to authenticated;
      create function review_start_session(p_task uuid,p_day text) returns uuid language plpgsql security definer as $$
      declare v_id uuid;
      begin
        insert into review_sessions(task_id,day_key,started_at) values(p_task,p_day,now())
        on conflict(task_id,day_key) do update set started_at=coalesce(review_sessions.started_at,now())
        returning id into v_id;
        return v_id;
      end$$;
    `);
    await t.test("an owner default does not protect the conflict path in a definer upsert", async () => {
      const before = (await db.query("select * from review_sessions")).rows[0];
      assert.equal(before.started_at, null);
      assert.equal((await as(a, "select * from review_sessions")).rows.length, 0);
      const result = await as(a, "select review_start_session($1,'synthetic-day') id", [b]);
      assert.equal(result.rows[0].id, before.id);
      await db.exec("reset role");
      const after = (await db.query("select * from review_sessions")).rows[0];
      assert.equal(after.user_id, b);
      assert.notEqual(after.started_at, null);
    });
  } finally {
    await db.close();
  }
});
