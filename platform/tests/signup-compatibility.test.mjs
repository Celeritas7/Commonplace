import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createAcceptanceDatabase, access, users } from "./acceptance-fixture.mjs";
import { legacyFixture, preHardeningLegacyFixture } from "./shared-access-fixture.mjs";

const candidate = await readFile(new URL("../operations/general-apps/04_commonplace_signup.sql", import.meta.url), "utf8");
const persisted = ["auth.users", "public.authentication_mode_user_roles", "public.chatak_profiles",
  "public.alarm_settings", "public.cp_memberships", "public.cp_audit", "public.code_sensei_user_notes"];
async function snapshot(db, tables = persisted) {
  await db.exec("reset role");
  const result = {};
  for (const table of tables) result[table] = (await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') data from ${table} t`)).rows[0].data;
  return result;
}
const definitions = async db => (await db.query(`select p.proname,pg_get_functiondef(p.oid) body,
 pg_get_userbyid(p.proowner) owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in
 ('chatak_enforce_allowlist','chatak_handle_new_user','chatak_link_auth_user','handle_new_user','chatak_role') order by 1`)).rows;

test("signup installer refuses the superseded baseline and execution/body drift atomically", async t => {
  for (const [name, fixture, change, expected] of [
    ["old Auth bodies", preHardeningLegacyFixture, "alter table auth.users add column is_anonymous boolean default false", /definition changed/],
    ["changed search path", legacyFixture, "alter function chatak_link_auth_user() set search_path=public", /definition changed/],
    ["changed execution mode", legacyFixture, "alter function handle_new_user() security invoker", /definition changed/],
    ["changed body", legacyFixture, "create or replace function chatak_enforce_allowlist() returns trigger language plpgsql security definer set search_path='' as $$begin return new; end$$", /definition changed/],
    ["missing identity flag", legacyFixture, "alter table auth.users drop column is_anonymous", /identity shape/],
  ]) await t.test(name, async () => {
    const db = await createAcceptanceDatabase();
    try {
      await db.exec(fixture);
      await db.exec(change);
      const before = await definitions(db), data = await snapshot(db);
      await assert.rejects(() => db.exec(candidate), expected);
      await db.exec("rollback");
      assert.deepEqual(await definitions(db), before);
      assert.deepEqual(await snapshot(db), data);
      assert.equal((await db.query("select to_regclass('cp_private.signup_control') installed")).rows[0].installed, null);
    } finally { await db.close(); }
  });
});

// Run the same behavioral contract against the reviewed baseline and its CP
// replacement. This prevents a fingerprint-only update from hiding regressions.
for (const install of [false, true]) test(`${install ? "CP signup replacement" : "hardened legacy baseline"} retains identity and role safeguards`, async t => {
  const db = await createAcceptanceDatabase();
  const { as } = access(db);
  const system = async (sql, args = []) => { await db.exec("reset role"); return db.query(sql, args); };
  const insert = (id, email, anonymous = false) => system(`insert into auth.users(id,email,is_anonymous,raw_user_meta_data)
    values($1,$2,$3,'{"role":"admin","is_anonymous":false}')`, [id, email, anonymous]);
  const approve = (id, email, role = "viewer") => system("insert into authentication_mode_user_roles(id,email,role) values($1,$2,$3)", [id,email,role]);
  const refused = async (call, expected) => {
    const before = await snapshot(db);
    await assert.rejects(call, expected);
    assert.deepEqual(await snapshot(db), before);
  };
  let viewer;
  try {
    await db.exec(legacyFixture);
    await db.query("select cp_private.bootstrap_owner($1)", [users.admin]);
    await db.query("insert into authentication_mode_user_roles(id,email,role,auth_user_id) values(90,'admin@example.invalid','admin',$1),(91,'a@example.invalid','operator',$2)", [users.admin,users.a]);
    await db.query("insert into code_sensei_users(id) values($1)", [users.a]);
    await db.query("insert into code_sensei_user_notes(user_id,note_text) values($1,'Retained note and bookmark reference')", [users.a]);
    const existing = await snapshot(db);
    const roleSource = (await definitions(db)).find(x => x.proname === "chatak_role");
    const registryCatalog = async () => (await db.query(`select c.relacl::text grants,
      (select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_policies p where p.schemaname='public'
       and p.tablename='authentication_mode_user_roles') policies
      from pg_class c where c.oid='public.authentication_mode_user_roles'::regclass`)).rows;
    const registryBefore = await registryCatalog();
    if (install) await db.exec(candidate);
    await t.test("installation preserves existing rows, UUID role helper and registry grants/policies", async () => {
      assert.deepEqual(await snapshot(db), existing);
      assert.deepEqual((await definitions(db)).find(x => x.proname === "chatak_role"), roleSource);
      assert.deepEqual(await registryCatalog(), registryBefore);
      if (install) assert.equal((await db.query("select enabled from cp_private.signup_control")).rows[0].enabled, false);
    });

    await t.test("approved roles survive spoofed metadata and retain legacy profiles/settings", async () => {
      for (const [i, role] of ["admin","operator","viewer"].entries()) {
        const id = randomUUID(), email = `approved-${role}@example.invalid`;
        await approve(100+i,email,role);
        await insert(id,email);
        assert.deepEqual((await system("select role,auth_user_id from authentication_mode_user_roles where id=$1",[100+i])).rows,
          [{role,auth_user_id:id}]);
        assert.equal((await as(id,"select chatak_role() role")).rows[0].role, role === "operator" ? "editor" : role);
        assert.deepEqual((await system(`select (select count(*)::int from chatak_profiles where id=$1) profiles,
          (select count(*)::int from alarm_settings where user_id=$1) settings,
          (select count(*)::int from cp_memberships where user_id=$1) memberships`,[id])).rows,
          [{profiles:1,settings:1,memberships:0}]);
        if (role === "viewer") viewer={id,email};
      }
    });

    await t.test("missing, anonymous and unknown identity flags fail before any side effect", async () => {
      for (const [i, flag] of [true,null].entries()) {
        const email=`anonymous-${i}@example.invalid`;
        await approve(110+i,email);
        await refused(() => insert(randomUUID(),email,flag), /not_allowed/);
      }
      await approve(112,"missing-id@example.invalid");
      await refused(() => insert(null,"missing-id@example.invalid"), /not_allowed/);
      await approve(113,"  ");
      for (const email of [null,"","  ","unlisted@example.invalid"])
        await refused(() => insert(randomUUID(),email), /not_allowed/);
    });

    await t.test("conflicting UUIDs and case-ambiguous approvals cannot move an identity", async () => {
      await system("update authentication_mode_user_roles set email='stale-address@example.invalid' where id=91");
      await refused(() => insert(randomUUID(),"stale-address@example.invalid"), {code:"42501",message:"registry_link_conflict"});
      await approve(114,"duplicate@example.invalid");
      await approve(115,"Duplicate@example.invalid","operator");
      await refused(() => insert(randomUUID(),"duplicate@example.invalid"), /not_allowed/);
    });

    await t.test("suppressed registry update aborts signup and rolls back all side effects", async () => {
      await approve(116,"suppressed@example.invalid");
      await db.exec(`create function pg_temp.skip_link() returns trigger language plpgsql as $$begin return null; end$$;
        create trigger fixture_skip_link before update on authentication_mode_user_roles for each row execute function pg_temp.skip_link()`);
      try { await refused(() => insert(randomUUID(),"suppressed@example.invalid"), {code:"42501",message:"registry_link_conflict"}); }
      finally { await db.exec("drop trigger fixture_skip_link on authentication_mode_user_roles"); }
    });

    await t.test("settings postcondition catches an update that leaves the identity unlinked", async () => {
      await approve(117,"changed-link@example.invalid");
      await db.exec(`create function pg_temp.clear_link() returns trigger language plpgsql as $$begin new.auth_user_id:=null; return new; end$$;
        create trigger fixture_clear_link before update on authentication_mode_user_roles for each row execute function pg_temp.clear_link()`);
      try { await refused(() => insert(randomUUID(),"changed-link@example.invalid"), {code:"42501",message:"registry_link_required"}); }
      finally { await db.exec("drop trigger fixture_clear_link on authentication_mode_user_roles"); }
    });

    await t.test("repeating the same UUID link is idempotent; the linker itself rejects anonymous identities", async () => {
      // Invoke AFTER handlers with an already existing identity without trying
      // to insert a duplicate primary key into auth.users. Never a hosted test.
      await db.exec(`create temp table fixture_repeat(id uuid,email text,is_anonymous boolean);
        create trigger a_link after insert on fixture_repeat for each row execute function chatak_link_auth_user();
        create trigger b_profile after insert on fixture_repeat for each row execute function chatak_handle_new_user();
        create trigger c_settings after insert on fixture_repeat for each row execute function handle_new_user()`);
      const before=await snapshot(db);
      await db.query("insert into fixture_repeat values($1,$2,false)",[viewer.id,viewer.email]);
      assert.deepEqual(await snapshot(db),before);
      await refused(() => db.query("insert into fixture_repeat values($1,$2,true)",[viewer.id,viewer.email]),/not_allowed/);
      await db.exec("drop table fixture_repeat");
    });

    await t.test("old email/admin metadata cannot elevate a viewer and a removed UUID stays denied", async () => {
      await system(`select set_config('request.jwt.claims','{"email":"admin@example.invalid","is_anonymous":false,"user_metadata":{"role":"admin"}}',false)`);
      assert.equal((await as(viewer.id,"select chatak_role() role")).rows[0].role,"viewer");
      assert.equal((await as(viewer.id,"update authentication_mode_user_roles set role='admin' where auth_user_id=$1 returning id",[viewer.id])).rows.length,0);
      await system(`select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
      assert.equal((await as(users.admin,"select chatak_role() role")).rows[0].role,null);
      await system(`select set_config('request.jwt.claims','{}',false)`);
      await system("delete from authentication_mode_user_roles where auth_user_id=$1",[viewer.id]);
      assert.equal((await as(viewer.id,"select chatak_role() role")).rows[0].role,null);
    });
  } finally { await db.close(); }
});

test("CP-only admission rejects anonymous claims without consuming the reservation", async () => {
  const db=await createAcceptanceDatabase();
  const {as}=access(db);
  try {
    await db.exec(legacyFixture);
    await db.exec(candidate);
    await db.query("select cp_private.bootstrap_owner($1)",[users.admin]);
    const email="cp-only@example.invalid", person=randomUUID();
    const admission=(await as(users.admin,"select cp_admin_prepare_signup($1) id",[email])).rows[0].id;
    await db.exec("reset role; update cp_private.signup_control set enabled=true");
    const tables=[...persisted,"cp_private.signup_admissions"];
    for (const [id,flag] of [[person,true],[person,null],[null,false]]) {
      const before=await snapshot(db,tables);
      await assert.rejects(() => db.query("insert into auth.users(id,email,is_anonymous) values($1,$2,$3)",[id,email,flag]),/not_allowed/);
      assert.deepEqual(await snapshot(db,tables),before);
    }
    await db.query("insert into auth.users(id,email,is_anonymous) values($1,$2,false)",[person,email]);
    assert.equal((await db.query("select claimed_user_id from cp_private.signup_admissions where id=$1",[admission])).rows[0].claimed_user_id,person);
    assert.equal((await as(person,"select chatak_role() role")).rows[0].role,null);
    await db.exec("reset role");
    for (const [table,column] of [["authentication_mode_user_roles","auth_user_id"],["chatak_profiles","id"],["alarm_settings","user_id"],["cp_memberships","user_id"]])
      assert.equal((await db.query(`select count(*)::int n from ${table} where ${column}=$1`,[person])).rows[0].n,0);
  } finally { await db.close(); }
});
