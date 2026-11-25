import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { storageFixture } from "./storage-fixture.mjs";

const inventory = await readFile(
  new URL("../acceptance/shared-project-catalog.sql", import.meta.url), "utf8",
);
test("shared-project inventory works before CP migrations and retains restrictive policies, inherited grants, views and Auth side effects", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      grant usage on schema public to anon, authenticated;
      create schema auth;
      create table auth.users(id uuid);
      create table public.other_progress(owner_id uuid, note text);
      insert into public.other_progress values(gen_random_uuid(), 'PRIVATE_ROW_MUST_NOT_APPEAR');
      alter table public.other_progress enable row level security;
      grant select on public.other_progress to public;
      grant update(note) on public.other_progress to authenticated;
      create policy broad on public.other_progress for all using(true) with check(true);
      create policy narrow on public.other_progress as restrictive to authenticated using(false);
      create view public.owner_view as select * from public.other_progress;
      create view public.invoker_view with(security_invoker=true) as select * from public.other_progress;
      create function public.callable(uuid) returns int language sql security definer
        as $$select 1$$;
      create function public.on_signup() returns trigger language plpgsql security definer
        set search_path=public as $$begin return new; end$$;
      create trigger signup after insert on auth.users for each row execute function public.on_signup();
      create schema other_api;
      grant usage on schema other_api to authenticated;
    `);
    await db.exec(storageFixture);
    await db.exec("insert into storage.buckets(id,public) values('existing-assets',true)");
    await db.exec("begin read only");
    const rows = (await db.query(inventory)).rows;
    await db.exec("rollback");
    const row = (kind, object) => rows.find((r) => r.kind === kind && r.object === object)?.details;
    assert.equal(row("scope", "review").authorization_verified, false);
    assert.equal(row("relation", "public.other_progress").rls, true);
    assert.deepEqual(row("relation_access", "public.other_progress:anon").table_privileges, ["SELECT"]);
    assert.ok(row("relation_access", "public.other_progress:authenticated").any_column_privileges.includes("UPDATE"));
    assert.ok(!row("relation_access", "public.other_progress:authenticated").table_privileges.includes("UPDATE"));
    assert.equal(row("policy", "public.other_progress:broad").mode, "PERMISSIVE");
    assert.equal(row("policy", "public.other_progress:narrow").mode, "RESTRICTIVE");
    assert.deepEqual(row("relation", "public.owner_view").options, []);
    assert.ok(row("relation", "public.invoker_view").options.includes("security_invoker=true"));
    assert.equal(row("function", "public.callable(uuid)").anon_execute, true);
    assert.equal(row("function", "public.callable(uuid)").security_definer, true);
    assert.equal(row("auth_trigger", "auth.users:signup").function, "public.on_signup()");
    assert.equal(row("bucket", "existing-assets").public, true);
    assert.deepEqual(row("schema_access", "other_api:authenticated"), {
      usage: true, create: false, included_in_review: false,
    });
    assert.ok(!JSON.stringify(rows).includes("PRIVATE_ROW_MUST_NOT_APPEAR"));
    assert.equal((await db.query("select count(*)::int n from other_progress")).rows[0].n, 1);
  } finally {
    await db.close();
  }
});
