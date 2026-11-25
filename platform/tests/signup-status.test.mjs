import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createAcceptanceDatabase,
  access,
  users,
} from "./acceptance-fixture.mjs";
import { legacyFixture } from "./shared-access-fixture.mjs";

test("signup status is read-only, administrator-only and never guesses a missing control", async (t) => {
  const db = await createAcceptanceDatabase();
  const { as, scalar } = access(db);
  const status = () =>
    scalar(users.admin, "select cp_admin_signup_status() data");
  async function system(sql) {
    await db.exec("reset role");
    return db.query(sql);
  }
  const snapshot = () =>
    system(`select
    (select jsonb_agg(to_jsonb(c)) from cp_private.signup_control c) control,
    (select jsonb_agg(to_jsonb(a) order by id) from cp_private.signup_admissions a) admissions,
    (select jsonb_agg(to_jsonb(m) order by user_id) from cp_memberships m) memberships,
    (select jsonb_agg(to_jsonb(a) order by id) from cp_audit a) audit,
    (select jsonb_agg(to_jsonb(l)) from cp_private.mutation_lock l) locks`);
  try {
    await db.exec(legacyFixture);
    await db.exec(
      await readFile(
        new URL(
          "../operations/general-apps/04_commonplace_signup.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.query("select cp_private.bootstrap_owner($1)", [users.admin]);
    await as(
      users.admin,
      "select cp_set_learner($1,'active','Synthetic learner')",
      [users.a],
    );
    await as(
      users.admin,
      "select cp_set_learner($1,'revoked','Revoked learner')",
      [users.b],
    );

    await t.test(
      "preparing requests does not enable signup and reads change no saved data",
      async () => {
        assert.deepEqual(await status(), { status: "paused" });
        await as(
          users.admin,
          "select cp_admin_prepare_signup('status-test@example.invalid')",
        );
        for (const enabled of [false, true]) {
          await system(
            `update cp_private.signup_control set enabled=${enabled} where id=true`,
          );
          const before = await snapshot();
          assert.deepEqual(await status(), {
            status: enabled ? "enabled" : "paused",
          });
          assert.deepEqual(await snapshot(), before);
        }
        await system("delete from cp_private.signup_control where id=true");
        assert.deepEqual(await status(), { status: "unavailable" });
        await system(
          "insert into cp_private.signup_control values(true,false)",
        );
        assert.deepEqual(await status(), { status: "paused" });
      },
    );

    await t.test(
      "anonymous, active, revoked and unregistered learners cannot read the flag",
      async () => {
        await system(`select set_config('request.jwt.claims',
        '{"role":"authenticated","user_metadata":{"role":"administrator"}}',false)`);
        for (const actor of [null, users.a, users.b, users.fresh]) {
          await assert.rejects(
            () => as(actor, "select cp_admin_signup_status()"),
            { code: "42501" },
          );
        }
        assert.deepEqual(
          (
            await system(`select role,
        has_function_privilege(role,'public.cp_admin_signup_status()','EXECUTE') allowed
        from (values('anon'),('authenticated'),('service_role')) r(role) order by role`)
          ).rows,
          [
            { role: "anon", allowed: false },
            { role: "authenticated", allowed: true },
            { role: "service_role", allowed: false },
          ],
        );
      },
    );

    await t.test(
      "even the administrator browser cannot read or change the private control directly",
      async () => {
        const before = await snapshot();
        for (const actor of [null, users.admin, users.a]) {
          for (const sql of [
            "select * from cp_private.signup_control",
            "update cp_private.signup_control set enabled=true",
          ]) {
            await assert.rejects(() => as(actor, sql), { code: "42501" });
          }
        }
        assert.deepEqual(await snapshot(), before);
        assert.deepEqual(await status(), { status: "paused" });
      },
    );
  } finally {
    await db.close();
  }
});
