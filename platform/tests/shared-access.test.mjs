import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createAcceptanceDatabase,
  access,
  users,
} from "./acceptance-fixture.mjs";
import { legacyFixture } from "./shared-access-fixture.mjs";

const candidate = (name) =>
  readFile(
    new URL("../operations/general-apps/" + name, import.meta.url),
    "utf8",
  );
const id = (n) => "30000000-0000-4000-8000-" + String(n).padStart(12, "0");
const legacyA = id(1),
  legacyB = id(2),
  taskA = id(3),
  taskB = id(4);
const denied = (fn) => assert.rejects(fn, (e) => e.code === "42501");
const awaitedPolicies = await candidate("02_legacy_policy_guards.sql");
const sessionRepair = await candidate("03_roadmap_session_owner.sql");
const signupRepair = await candidate("04_commonplace_signup.sql");

test("review candidates preserve legacy data and deny unauthorized identities", async (t) => {
  const db = await createAcceptanceDatabase();
  const { as } = access(db);
  try {
    await db.exec(legacyFixture);
    await db.exec(`select cp_private.bootstrap_owner('${users.admin}');
   insert into authentication_mode_user_roles(id,email,role,auth_user_id) values
    (1,'a@example.invalid','viewer','${users.a}'),(2,'b@example.invalid','operator','${users.b}');
   insert into code_sensei_users values('${legacyA}','Legacy A'),('${legacyB}','Legacy B');
   insert into code_sensei_user_notes(user_id,note_text) values('${legacyA}','Keep A note'),('${legacyB}','Keep B note');
   insert into code_sensei_progress(user_id,topic_id,status) values('${legacyA}','topic','done'),('${legacyB}','topic','started');
   insert into healthlog_visits_old(user_id,notes) values('old-a','Keep A history'),('old-b','Keep B history');
   insert into logi_projects values('${id(20)}');
   insert into logi_assemblies values('${id(21)}','${id(20)}');
   insert into eagle_units(id,assembly_id) values('${id(22)}','${id(21)}');
   insert into eagle_unit_progress(unit_id,notes) values('${id(22)}','Shared workspace');
   insert into roadmap_tasks(id,user_id,title) values('${taskA}','${users.a}','A'),('${taskB}','${users.b}','B');
  `);
    await db.exec(await candidate("01_access_foundation.sql"));

    await t.test(
      "enforcement refuses missing cutovers and ownership mappings without mutating data",
      async () => {
        await assert.rejects(() => db.exec(awaitedPolicies), /client cutover/);
        await db.exec("rollback");
        assert.equal(
          (await db.query("select count(*)::int n from code_sensei_user_notes"))
            .rows[0].n,
          2,
        );
        await db.exec(
          "insert into ga_private.client_cutovers values('code-sensei','synthetic JWT client check',now()),('healthlog-archive','synthetic archive check',now()),('eagle','synthetic shared-role check',now())",
        );
        await assert.rejects(
          () => db.exec(awaitedPolicies),
          /owner mapping required/,
        );
        await db.exec("rollback");
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from pg_policies where policyname='ga_owner_guard'",
            )
          ).rows[0].n,
          0,
        );
      },
    );
    await db.exec(`insert into ga_private.owner_links values
   ('code-sensei','${legacyA}','${users.a}'),('code-sensei','${legacyB}','${users.b}'),
   ('healthlog-archive','old-a','${users.a}'),('healthlog-archive','old-b','${users.b}');`);
    await db.exec(`insert into ga_private.eagle_members values('${users.a}'),('${users.b}')`);
    await t.test("installer rejects changed policies, column grants and inherited rights atomically", async () => {
      for (const [change, undo, expected] of [
        ["drop policy allow_all on code_sensei_progress",
         "create policy allow_all on code_sensei_progress using(true) with check(true)", /policy baseline/],
        ["alter policy allow_all on code_sensei_progress using(false)",
         "alter policy allow_all on code_sensei_progress using(true)", /policy baseline/],
        ["revoke update on code_sensei_progress from anon","grant update on code_sensei_progress to anon", /grant baseline/],
        ["grant update(name) on code_sensei_users to authenticated","revoke update(name) on code_sensei_users from authenticated", /column grants/],
        ["create role synthetic_reader; grant synthetic_reader to anon; grant select on code_sensei_progress to synthetic_reader",
         "drop owned by synthetic_reader; drop role synthetic_reader", /unexpected effective/],
      ]) {
        await db.exec(change);
        await assert.rejects(() => db.exec(awaitedPolicies), expected);
        await db.exec("rollback");
        assert.equal((await db.query("select count(*)::int n from pg_policies where policyname='ga_authenticated_guard'")).rows[0].n, 0);
        assert.equal((await db.query("select has_table_privilege('anon','code_sensei_users','SELECT') ok")).rows[0].ok, true);
        await db.exec(undo);
      }
    });
    await db.exec(awaitedPolicies);
    await t.test("operator mapping corrections require a confirmed UUID and a valid source and retain history", async () => {
      await db.query("update auth.users set email_confirmed_at=null where id=$1",[users.fresh]);
      await assert.rejects(() => db.query("update ga_private.owner_links set auth_user_id=$1 where legacy_id='old-b'", [users.fresh]), /must be verified/);
      await assert.rejects(() => db.query("insert into ga_private.owner_links values('healthlog-archive','missing',$1)", [users.a]), /source key/);
      await assert.rejects(() => db.query("insert into ga_private.owner_links values('code-sensei',$1,$2)", [id(98),users.fresh]), /must be verified/);
      await assert.rejects(() => db.query("insert into ga_private.owner_links values('code-sensei',$1,$2)", [id(98),users.admin]), e => e.code==="23503");
      await assert.rejects(() => db.query("update ga_private.owner_links set auth_user_id=$1 where legacy_id=$2", [users.a,legacyB]), e => e.code==="23505");
      await db.query("update auth.users set email_confirmed_at=now() where id=$1",[users.fresh]);
      await db.query("update ga_private.owner_links set auth_user_id=$1 where legacy_id='old-b'", [users.a]);
      assert.equal((await as(users.a,"select id from healthlog_visits_old")).rows.length,2);
      await denied(() => as(users.a,"update healthlog_visits_old set user_id='old-b' where user_id='old-a'"));
      await db.exec("reset role");
      await db.query("update ga_private.owner_links set auth_user_id=$1 where legacy_id='old-b'", [users.b]);
      assert.deepEqual((await db.query("select previous_owner,new_owner from ga_private.owner_link_history where operation='UPDATE' and legacy_id='old-b' order by changed_at")).rows,
        [{previous_owner:users.b,new_owner:users.a},{previous_owner:users.a,new_owner:users.b}]);
      await db.query("update auth.users set email_confirmed_at=null where id=$1",[users.b]);
      assert.equal((await as(users.b,"select * from code_sensei_user_notes")).rows.length,0);
      await denied(() => as(users.b,"select code_sensei_current_user_id()"));
      await db.exec("reset role");
      await db.query("update auth.users set email_confirmed_at=now() where id=$1",[users.b]);
    });

    await t.test(
      "legacy owner mappings preserve IDs and deny cross-account reads and writes",
      async () => {
        assert.equal(
          (await as(users.a, "select code_sensei_current_user_id() id")).rows[0]
            .id,
          legacyA,
        );
        assert.equal(
          (await as(users.b, "select code_sensei_current_user_id() id")).rows[0]
            .id,
          legacyB,
        );
        assert.deepEqual(
          (await as(users.a, "select note_text from code_sensei_user_notes"))
            .rows,
          [{ note_text: "Keep A note" }],
        );
        assert.equal(
          (await as(users.a, "select notes from healthlog_visits_old")).rows[0]
            .notes,
          "Keep A history",
        );
        assert.equal(
          (
            await as(
              users.a,
              "update code_sensei_user_notes set note_text='wrong' where user_id=$1 returning id",
              [legacyB],
            )
          ).rows.length,
          0,
        );
        await denied(() =>
          as(
            users.a,
            "insert into code_sensei_user_notes(user_id,note_text) values($1,'wrong')",
            [legacyB],
          ),
        );
        await denied(() =>
          as(
            users.a,
            "update code_sensei_user_notes set user_id=$1 where user_id=$2",
            [legacyB, legacyA],
          ),
        );
        await denied(() =>
          as(users.a, "update code_sensei_users set name='wrong'"),
        );
        assert.equal(
          (
            await as(
              users.a,
              "update code_sensei_progress set status='reviewed' where user_id=$1 returning id",
              [legacyA],
            )
          ).rows.length,
          1,
        );
        await db.exec("reset role");
        assert.equal(
          (await db.query("select count(*)::int n from code_sensei_user_notes"))
            .rows[0].n,
          2,
        );
      },
    );
    await t.test(
      "anonymous column grants and unregistered metadata cannot bypass restrictive policies",
      async () => {
        await db.exec(
          "reset role; grant select(note_text) on code_sensei_user_notes to anon",
        );
        assert.equal(
          (await as(null, "select note_text from code_sensei_user_notes")).rows
            .length,
          0,
        );
        await denied(() => as(null, "select code_sensei_current_user_id()"));
        await db.query("select set_config('request.jwt.claims',$1,false)", [
          JSON.stringify({
            email: "a@example.invalid",
            user_metadata: { role: "admin" },
          }),
        ]);
        assert.equal(
          (await as(users.fresh, "select * from code_sensei_user_notes")).rows
            .length,
          0,
        );
        await denied(() =>
          as(users.fresh, "select code_sensei_current_user_id()"),
        );
        await denied(() => as(users.a, "select * from ga_private.owner_links"));
        await denied(() =>
          as(
            users.a,
            "insert into ga_private.owner_links values('code-sensei',$1,$2)",
            [id(90), users.a],
          ),
        );
      },
    );
    await t.test(
      "shared Eagle workspace retains viewer reads and operator writes with UUID membership",
      async () => {
        assert.equal(
          (await as(users.a, "select * from eagle_unit_progress")).rows.length,
          1,
        );
        assert.equal(
          (
            await as(
              users.a,
              "update eagle_unit_progress set notes='wrong' returning id",
            )
          ).rows.length,
          0,
        );
        await denied(() =>
          as(users.a, "insert into eagle_unit_progress(notes) values('wrong')"),
        );
        assert.equal(
          (
            await as(
              users.b,
              "update eagle_unit_progress set notes='Approved edit' returning id",
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (await as(users.fresh, "select * from eagle_unit_progress")).rows
            .length,
          0,
        );
        await db.exec("reset role");
      },
    );
    await t.test(
      "Edge entitlements default deny and respond to expiry and revocation",
      async () => {
        assert.equal(
          (await as(users.a, "select ga_can_call_edge('code-exec') allowed"))
            .rows[0].allowed,
          false,
        );
        await db.exec(
          `reset role; insert into ga_private.edge_grants values('code-exec','${users.a}',now()+interval '1 hour',false)`,
        );
        assert.equal(
          (await as(users.a, "select ga_can_call_edge('code-exec') allowed"))
            .rows[0].allowed,
          true,
        );
        assert.equal(
          (await as(users.a, "select ga_can_call_edge('claude-proxy') allowed"))
            .rows[0].allowed,
          false,
        );
        assert.equal(
          (await as(users.b, "select ga_can_call_edge('code-exec') allowed"))
            .rows[0].allowed,
          false,
        );
        await denied(() =>
          as(users.a, "update ga_private.edge_grants set revoked=false"),
        );
        await db.exec(
          "reset role; update ga_private.edge_grants set expires_at=now()-interval '1 second' where function_name='code-exec'",
        );
        assert.equal(
          (await as(users.a, "select ga_can_call_edge('code-exec') allowed"))
            .rows[0].allowed,
          false,
        );
        await db.exec(
          "reset role; update ga_private.edge_grants set expires_at=now()+interval '1 hour',revoked=true where function_name='code-exec'",
        );
        assert.equal(
          (await as(users.a, "select ga_can_call_edge('code-exec') allowed"))
            .rows[0].allowed,
          false,
        );
        await db.exec("reset role");
      },
    );

    await t.test("Eagle roles apply to units and upstream cascades preserve the entire transaction", async () => {
      // A linked role from another app alone gives no Eagle membership.
      await db.exec(`insert into authentication_mode_user_roles(id,email,role,auth_user_id)
        values(42,'team@example.invalid','admin','${users.admin}')`);
      for (const user of [users.a,users.admin,users.fresh]) {
        assert.equal((await as(user,"delete from eagle_units returning id")).rows.length,0);
        await denied(() => as(user,"delete from logi_projects where id=$1",[id(20)]));
      }
      await denied(() => as(users.a,"truncate logi_projects cascade"));
      await db.exec("reset role");
      assert.equal((await db.query("select count(*)::int n from eagle_unit_progress")).rows[0].n,1);
      await db.query("insert into ga_private.eagle_members values($1)",[users.admin]);
      assert.equal((await as(users.admin,"select id from eagle_units")).rows.length,1);
      assert.equal((await as(users.b,"delete from logi_projects where id=$1 returning id",[id(20)])).rows.length,1);
      assert.equal((await as(users.admin,"select id from eagle_units")).rows.length,0);
      await db.exec("reset role");
      assert.equal((await db.query("select id from eagle_unit_progress")).rows.length,0);
    });

    await t.test("Roadmap installation preserves a historical owner mismatch and rolls back both RPCs", async () => {
      await db.query("insert into roadmap_study_sessions(user_id,task_id,day_key,source) values($1,$2,'conflict','legacy')",[users.b,taskA]);
      await assert.rejects(() => db.exec(sessionRepair), e => e.code==="23503");
      await db.exec("rollback");
      assert.deepEqual((await db.query("select user_id,source from roadmap_study_sessions where day_key='conflict'")).rows,
        [{user_id:users.b,source:"legacy"}]);
      assert.equal((await db.query("select count(*)::int n from pg_constraint where conname='ga_task_owner'")).rows[0].n,0);
      // Remove only this deliberately inconsistent synthetic fixture.
      await db.exec("delete from roadmap_study_sessions where day_key='conflict'");
    });
    await db.exec(await candidate("03_roadmap_session_owner.sql"));
    await t.test(
      "session RPC preserves own retries and rejects other task owners",
      async () => {
        const first = (
          await as(
            users.a,
            "select roadmap_start_session($1,'2026-11-25','roadmap') id",
            [taskA],
          )
        ).rows[0].id;
        assert.equal(
          (
            await as(
              users.a,
              "select roadmap_start_session($1,'2026-11-25','other') id",
              [taskA],
            )
          ).rows[0].id,
          first,
        );
        assert.equal(
          (
            await as(
              users.a,
              "select source from roadmap_study_sessions where id=$1",
              [first],
            )
          ).rows[0].source,
          "roadmap",
        );
        await denied(() =>
          as(users.a, "select roadmap_start_session($1,'2026-11-25')", [taskB]),
        );
        await denied(() =>
          as(users.a, "select roadmap_start_session($1,'2026-11-25')", [
            id(91),
          ]),
        );
        await denied(() =>
          as(null, "select roadmap_start_session($1,'2026-11-25')", [taskA]),
        );
        await db.exec("reset role");
      },
    );
    await t.test("Roadmap direct writes, task hierarchies, completion, retry and undo respect ownership", async () => {
      const foreignKey = e => e.code==="23503";
      await assert.rejects(() => as(users.b,"insert into roadmap_study_sessions(task_id,day_key,source) values($1,'new','app')",[taskA]), foreignKey);
      await assert.rejects(() => as(users.a,"update roadmap_tasks set parent_id=$1 where id=$2",[taskB,taskA]), foreignKey);
      const args = [taskA,"roadmap","new",4,{a:1},"manual"];
      const complete = "select roadmap_complete_session($1,$2,$3,$4,$5,$6) id";
      const result = (await as(users.a,complete,args)).rows[0].id;
      assert.ok(result);
      assert.equal((await as(users.a,complete,[taskA,"review","new",null,{b:2},"api"])).rows[0].id,result);
      assert.deepEqual((await as(users.a,"select source,duration_min,feedback from roadmap_study_sessions where id=$1",[result])).rows,
        [{source:"review",duration_min:4,feedback:{a:1,b:2}}]);
      await denied(() => as(users.b,complete,args));
      await denied(() => as(null,complete,args));
      await denied(() => as(users.a,"update roadmap_study_sessions set user_id=$1 where id=$2",[users.b,result]));
      await assert.rejects(() => as(users.a,"update roadmap_study_sessions set task_id=$1 where id=$2",[taskB,result]), foreignKey);
      assert.equal((await as(users.a,"update roadmap_study_sessions set completed_at=null,verification='manual' where id=$1 returning id",[result])).rows[0].id,result);
      assert.ok((await as(users.a,"insert into roadmap_study_sessions(day_key,source) values('free','app') returning id")).rows[0].id);
      await db.exec("reset role");
      // Simulate a future trigger suppressing a write. Both RPCs must return an error.
      await db.exec("create function pg_temp.skip_session_update() returns trigger language plpgsql as $$begin return null; end$$; create trigger skip_update before update on roadmap_study_sessions for each row execute function pg_temp.skip_session_update()");
      await denied(() => as(users.a,complete,args));
      await denied(() => as(users.a,"select roadmap_start_session($1,'new')",[taskA]));
      await db.exec("reset role; drop trigger skip_update on roadmap_study_sessions");
    });
    await t.test(
      "session function has a fixed search path and stops a stale repair from overwriting it",
      async () => {
        await db.exec(
          "create temp table roadmap_tasks(id uuid,user_id uuid); create temp table roadmap_study_sessions(id uuid)",
        );
        assert.equal(
          (
            await as(
              users.a,
              "select roadmap_start_session($1,'safe-path') id",
              [taskA],
            )
          ).rows.length,
          1,
        );
        await db.exec("reset role");
        await assert.rejects(
          () => db.exec(sessionRepair),
          /changed since review/,
        );
        await db.exec("rollback");
      },
    );

    await t.test(
      "unexpected Auth-trigger drift stops signup installation",
      async () => {
        await db.exec(
          "create trigger unexpected_auth_side_effect after insert on auth.users for each row execute function chatak_handle_new_user()",
        );
        await assert.rejects(
          () => db.exec(signupRepair),
          /trigger configuration changed/,
        );
        await db.exec(
          "rollback; drop trigger unexpected_auth_side_effect on auth.users",
        );
      },
    );
    await db.exec(signupRepair);
    await t.test(
      "only the verified CP administrator can prepare or inspect pending signups",
      async () => {
        for (const actor of [null, users.a, users.fresh]) {
          await denied(() =>
            as(
              actor,
              "select cp_admin_prepare_signup('new@example.invalid',24)",
            ),
          );
          await denied(() => as(actor, "select cp_admin_signup_directory()"));
        }
        await assert.rejects(
          () =>
            as(
              users.admin,
              "select cp_admin_prepare_signup('a@example.invalid',24)",
            ),
          /account already exists/,
        );
        await assert.rejects(
          () => as(users.admin, "select cp_admin_prepare_signup('bad',24)"),
          /invalid signup/,
        );
        await as(
          users.admin,
          "select cp_admin_prepare_signup(' New@Example.invalid ',24)",
        );
        const list = (
          await as(users.admin, "select cp_admin_signup_directory() data")
        ).rows[0].data;
        assert.equal(list[0].email, "new@example.invalid");
        await denied(() =>
          as(
            users.admin,
            "update cp_private.signup_control set enabled=true where id=true",
          ),
        );
        await denied(() =>
          as(users.a, "select * from cp_private.signup_admissions"),
        );
        await db.exec("reset role");
      },
    );
    await t.test(
      "new signup admission is closed until a trusted rollout step enables it",
      async () => {
        await assert.rejects(
          () =>
            db.query(
              "insert into auth.users(id,email) values($1,'new@example.invalid')",
              [id(10)],
            ),
          /not_allowed/,
        );
        assert.equal(
          (
            await db.query(
              "select claimed_user_id from cp_private.signup_admissions where email='new@example.invalid'",
            )
          ).rows[0].claimed_user_id,
          null,
        );
        await db.exec("delete from cp_private.signup_control where id=true");
        await assert.rejects(
          () =>
            db.query(
              "insert into auth.users(id,email) values($1,'new@example.invalid')",
              [id(10)],
            ),
          /not_allowed/,
        );
        await db.exec(
          "insert into cp_private.signup_control values(true,false)",
        );
        await db.exec(
          "update cp_private.signup_control set enabled=true where id=true",
        );
        await assert.rejects(
          () =>
            db.query(
              "insert into auth.users(id,email) values($1,'unlisted@example.invalid')",
              [id(11)],
            ),
          /not_allowed/,
        );
      },
    );
    await t.test(
      "CP-only Auth signup binds a UUID without granting legacy or CP membership",
      async () => {
        await db.query(
          "insert into auth.users(id,email,raw_user_meta_data) values($1,'new@example.invalid','{\"role\":\"admin\"}')",
          [id(10)],
        );
        const admission = (await db.query(
          "select id,revision,claimed_user_id from cp_private.signup_admissions where email='new@example.invalid'",
        )).rows[0];
        assert.equal(admission.claimed_user_id, id(10));
        for (const [table, column] of [
          ["authentication_mode_user_roles", "auth_user_id"],
          ["chatak_profiles", "id"],
          ["alarm_settings", "user_id"],
          ["cp_memberships", "user_id"],
        ])
          assert.equal(
            (
              await db.query(
                `select count(*)::int n from public.${table} where ${column}=$1`,
                [id(10)],
              )
            ).rows[0].n,
            0,
          );
        await assert.rejects(
          () =>
            db.query(
              "insert into auth.users(id,email) values($1,'new@example.invalid')",
              [id(12)],
            ),
          /not_allowed/,
        );
        await assert.rejects(
          () =>
            as(
              users.admin,
              "select cp_admin_complete_signup($1,$2,'New learner')", [admission.id,admission.revision],
            ),
          /verified/i,
        );
        await db.exec("reset role");
        await db.query(
          "update auth.users set email_confirmed_at=now() where id=$1",
          [id(10)],
        );
        assert.equal(
          (
            await as(
              users.admin,
              "select cp_admin_complete_signup($1,$2,'New learner') id", [admission.id,admission.revision],
            )
          ).rows[0].id,
          id(10),
        );
        assert.equal(
          (await as(id(10), "select * from cp_sections")).rows.length,
          0,
        );
        assert.equal(
          (await as(id(10), "select * from code_sensei_user_notes")).rows
            .length,
          0,
        );
        assert.equal(
          (await as(id(10), "select * from eagle_unit_progress")).rows.length,
          0,
        );
        assert.equal(
          (await as(id(10), "select ga_can_call_edge('code-exec') allowed"))
            .rows[0].allowed,
          false,
        );
        await db.exec("reset role");
      },
    );
    await t.test(
      "existing legacy viewer signup keeps its approved role and side effects",
      async () => {
        await db.exec(
          "insert into authentication_mode_user_roles(id,email,role) values(3,'legacy@example.invalid','viewer')",
        );
        await assert.rejects(
          () =>
            as(
              users.admin,
              "select cp_admin_prepare_signup('legacy@example.invalid',24)",
            ),
          /legacy application/,
        );
        await db.exec("reset role");
        await db.query(
          "insert into auth.users(id,email,raw_user_meta_data) values($1,'legacy@example.invalid','{\"role\":\"admin\"}')",
          [id(13)],
        );
        assert.equal(
          (
            await db.query(
              "select role from authentication_mode_user_roles where auth_user_id=$1",
              [id(13)],
            )
          ).rows[0].role,
          "viewer",
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from chatak_profiles where id=$1",
              [id(13)],
            )
          ).rows[0].n,
          1,
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from alarm_settings where user_id=$1",
              [id(13)],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "expired/revoked invitations deny signup and a failed Auth insert rolls back its claim",
      async () => {
        for (const name of ["expired", "revoked", "failure"])
          await as(users.admin, "select cp_admin_prepare_signup($1,24)", [
            name + "@example.invalid",
          ]);
        const revoked = (
          await as(users.admin, "select cp_admin_signup_directory() data")
        ).rows[0].data.find((x) => x.email === "revoked@example.invalid");
        await as(users.admin, "select cp_admin_review_signup($1,$2,'withdraw')", [
          revoked.id, revoked.revision,
        ]);
        await db.exec(
          "reset role; update cp_private.signup_admissions set expires_at=now()-interval '1 hour' where email='expired@example.invalid'",
        );
        for (const name of ["expired", "revoked"])
          await assert.rejects(
            () =>
              db.query("insert into auth.users(id,email) values($1,$2)", [
                id(14),
                name + "@example.invalid",
              ]),
            /not_allowed/,
          );
        await db.exec(
          "alter table auth.users add constraint fixture_email_check check(email<>'failure@example.invalid')",
        );
        await assert.rejects(
          () =>
            db.query(
              "insert into auth.users(id,email) values($1,'failure@example.invalid')",
              [id(15)],
            ),
          /fixture_email_check/,
        );
        assert.equal(
          (
            await db.query(
              "select claimed_user_id from cp_private.signup_admissions where email='failure@example.invalid'",
            )
          ).rows[0].claimed_user_id,
          null,
        );
      },
    );
    await t.test(
      "post-candidate CP catalog and containment preserve saved records",
      async () => {
        await db.exec("reset role");
        const findings = (
          await db.query(
            await readFile(
              new URL("../acceptance/catalog.sql", import.meta.url),
              "utf8",
            ),
          )
        ).rows;
        assert.deepEqual(findings, []);
        await db.exec(await candidate("90_containment.sql"));
        assert.equal(
          (await db.query("select enabled from cp_private.signup_control"))
            .rows[0].enabled,
          false,
        );
        await denied(() => as(users.a,"select roadmap_complete_session($1,'roadmap')",[taskA]));
        await denied(() =>
          as(users.a, "select roadmap_start_session($1,'blocked')", [taskA]),
        );
        assert.equal(
          (await as(users.a, "select * from code_sensei_user_notes")).rows
            .length,
          1,
        );
        await db.exec("reset role");
        assert.equal(
          (await db.query("select count(*)::int n from code_sensei_user_notes"))
            .rows[0].n,
          2,
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from cp_memberships where user_id=$1",
              [id(10)],
            )
          ).rows[0].n,
          1,
        );
      },
    );
  } finally {
    await db.close();
  }
});

test("containment preserves grants and commits independent stops on Roadmap drift", async () => {
  const db = await createAcceptanceDatabase();
  const stop = await candidate("90_containment.sql");
  const rows = async (q) => (await db.query(q)).rows;
  try {
    await db.exec(legacyFixture);
    for (const f of [
      "01_access_foundation.sql",
      "03_roadmap_session_owner.sql",
      "04_commonplace_signup.sql",
    ])
      await db.exec(await candidate(f));
    await db.exec(`insert into ga_private.edge_grants values('code-exec','${users.a}',now()+interval '1 day',false),
      ('code-exec','${users.b}',now()+interval '1 day',true);
      alter function public.roadmap_complete_session(uuid,text,text,integer,jsonb,text) rename to legacy_completion;
      create role inherited_roadmap; grant inherited_roadmap to authenticated;
      grant execute on function public.roadmap_start_session(uuid,text,text) to inherited_roadmap;
      update cp_private.signup_control set enabled=true;`);
    await db.exec(
      `insert into roadmap_tasks(id,user_id,title) values('${taskA}','${users.a}','Fixture')`,
    );
    const { as } = access(db);
    assert.ok(
      (await as(users.a, "select roadmap_start_session($1,'test') id", [taskA]))
        .rows[0].id,
    );
    await db.exec("reset role");
    const before = await rows(
      "select * from ga_private.edge_grants order by auth_user_id",
    );
    await assert.rejects(() => db.exec(stop), /Containment incomplete/);
    await db.exec("rollback");
    assert.deepEqual(
      await rows("select enabled from cp_private.signup_control"),
      [{ enabled: false }],
    );
    assert.deepEqual(
      await rows("select distinct paused from ga_private.edge_routes"),
      [{ paused: true }],
    );
    assert.deepEqual(
      await rows("select * from ga_private.edge_grants order by auth_user_id"),
      before,
    );
    assert.deepEqual(
      await rows("select paused from ga_private.roadmap_control"),
      [{ paused: true }],
    );
    assert.equal(
      (
        await rows(
          "select has_function_privilege('authenticated','public.roadmap_start_session(uuid,text,text)','execute') inherited",
        )
      )[0].inherited,
      true,
    );
    assert.equal(
      (await as(users.a, "select ga_can_call_edge('code-exec') ok")).rows[0].ok,
      false,
    );
    await denied(() =>
      as(users.a, "select roadmap_start_session($1,'test')", [taskA]),
    );
    await db.exec(
      "reset role; update ga_private.edge_routes set paused=false where function_name='code-exec'",
    );
    assert.equal(
      (await as(users.a, "select ga_can_call_edge('code-exec') ok")).rows[0].ok,
      true,
    );
    assert.equal(
      (await as(users.b, "select ga_can_call_edge('code-exec') ok")).rows[0].ok,
      false,
    );
  } finally {
    await db.close();
  }
});
