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
   insert into eagle_unit_progress(notes) values('Shared workspace');
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
    await db.exec(awaitedPolicies);

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
    await t.test(
      "legacy conflicting rows owned by B remain untouched even when A owns the task",
      async () => {
        await db.query(
          "insert into roadmap_study_sessions(user_id,task_id,day_key,source) values($1,$2,'conflict','legacy')",
          [users.b, taskA],
        );
        const before = (
          await db.query(
            "select * from roadmap_study_sessions where day_key='conflict'",
          )
        ).rows;
        await denied(() =>
          as(users.a, "select roadmap_start_session($1,'conflict')", [taskA]),
        );
        await db.exec("reset role");
        assert.deepEqual(
          (
            await db.query(
              "select * from roadmap_study_sessions where day_key='conflict'",
            )
          ).rows,
          before,
        );
      },
    );
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
        const claimed = (
          await db.query(
            "select claimed_user_id from cp_private.signup_admissions where email='new@example.invalid'",
          )
        ).rows[0].claimed_user_id;
        assert.equal(claimed, id(10));
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
              "select cp_admin_register('new@example.invalid','New learner')",
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
              "select cp_admin_register('new@example.invalid','New learner') id",
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
        await as(users.admin, "select cp_admin_revoke_signup($1)", [
          revoked.id,
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
