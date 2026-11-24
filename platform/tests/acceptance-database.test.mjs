import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  createAcceptanceDatabase,
  seedAcceptance,
  access,
  users,
} from "./acceptance-fixture.mjs";

const preflight = await readFile(
  new URL("../acceptance/catalog.sql", import.meta.url),
  "utf8",
);
async function snapshot(db) {
  const result = {};
  const tables = (
    await db.query(
      "select tablename from pg_tables where schemaname='public' and left(tablename,3)='cp_' order by tablename",
    )
  ).rows;
  for (const { tablename } of tables) {
    const name = '"' + tablename.replaceAll('"', '""') + '"';
    result[tablename] = (
      await db.query(
        `select to_jsonb(t) value from public.${name} t order by to_jsonb(t)::text`,
      )
    ).rows;
  }
  return result;
}
test("U9 final migrated catalog and authorization boundaries", async (t) => {
  const db = await createAcceptanceDatabase();
  try {
    const material = await seedAcceptance(db),
      { as, scalar } = access(db);
    await t.test(
      "all migrations satisfy the operator catalog preflight",
      async () => {
        assert.deepEqual((await db.query(preflight)).rows, []);
      },
    );
    await t.test(
      "preflight detects permission drift and missing U8 functions",
      async () => {
        await db.exec(
          "begin; alter table cp_material_versions disable row level security; grant update on cp_memberships to authenticated; grant select(display_name) on cp_memberships to anon; grant execute on function cp_read_material(uuid) to anon; drop function cp_offline_snapshot(text);",
        );
        const failures = (await db.query(preflight)).rows.map(
          (r) => r.check_id,
        );
        for (const expected of [
          "rls_disabled",
          "browser_table_privilege",
          "browser_column_privilege",
          "anonymous_function",
          "missing_function",
        ])
          assert.ok(failures.includes(expected), expected);
        await db.exec("rollback");
      },
    );
    await t.test(
      "new accounts default deny and metadata cannot promote a learner",
      async () => {
        assert.equal(
          (await as(users.fresh, "select * from cp_sections")).rows.length,
          0,
        );
        await as(users.a, "select set_config('request.jwt.claims',$1,false)", [
          JSON.stringify({
            sub: users.a,
            user_metadata: { role: "administrator" },
            app_metadata: { role: "administrator" },
          }),
        ]);
        for (const query of [
          "select cp_admin_directory()",
          "select cp_admin_material_library()",
          "select cp_private.bootstrap_owner('" + users.a + "')",
          "update cp_memberships set role='administrator'",
        ])
          await assert.rejects(
            () => as(users.a, query),
            (e) => e.code === "42501",
          );
      },
    );
    await t.test(
      "authorized A, unassigned B and anonymous direct reads stay distinct after U8",
      async () => {
        assert.equal(
          (
            await scalar(users.a, "select cp_read_material($1) data", [
              material,
            ])
          ).id,
          material,
        );
        for (const who of [users.b, null])
          await assert.rejects(
            () => scalar(who, "select cp_read_material($1) data", [material]),
            (e) => e.code === "42501",
          );
        assert.equal(
          (
            await as(
              users.b,
              "select * from cp_material_versions where id=$1",
              [material],
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (await as(users.a, "select * from cp_material_assignments")).rows
            .length,
          0,
        );
        await scalar(
          users.a,
          "select cp_sync_write($1,$2,'office.excel','acceptance','note',0,$3,$4) data",
          [
            users.a,
            material,
            crypto.randomUUID(),
            { version: 1, text: "A only" },
          ],
        );
        for (const who of [users.b, users.admin])
          assert.equal(
            (
              await as(who, "select * from cp_study_state where user_id=$1", [
                users.a,
              ])
            ).rows.length,
            0,
          );
      },
    );
    await t.test(
      "private Storage stays denied despite broad unrelated policies",
      async () => {
        await db.exec(
          "reset role; insert into storage.objects(bucket_id,name) values('cp-materials','synthetic/protected');",
        );
        for (const who of [null, users.a, users.b, users.admin]) {
          assert.equal(
            (
              await as(
                who,
                "select * from storage.objects where bucket_id='cp-materials'",
              )
            ).rows.length,
            0,
          );
          await assert.rejects(
            () =>
              as(
                who,
                "insert into storage.objects(bucket_id,name) values('cp-materials','forged')",
              ),
            (e) => e.code === "42501",
          );
          assert.equal(
            (
              await as(
                who,
                "update storage.buckets set public=true where id='cp-materials' returning id",
              )
            ).rows.length,
            0,
          );
        }
      },
    );
    await t.test(
      "stale identity loses access on archive; source work and audit survive",
      async () => {
        await as(
          users.admin,
          "select cp_admin_material_transition($1,3,'archived',false)",
          [material],
        );
        await assert.rejects(
          () => scalar(users.a, "select cp_read_material($1) data", [material]),
          (e) => e.code === "42501",
        );
        await assert.rejects(
          () =>
            scalar(
              users.a,
              "select cp_sync_read($1,$2,'office.excel','acceptance','note') data",
              [users.a, material],
            ),
          (e) => e.code === "42501",
        );
        await db.exec("reset role");
        assert.equal(
          (await db.query("select count(*)::int n from cp_study_state")).rows[0]
            .n,
          1,
        );
        assert.ok(
          (await db.query("select count(*)::int n from cp_audit")).rows[0].n >
            0,
        );
      },
    );
  } finally {
    await db.close();
  }
});

test("U9 isolated snapshot restore preserves data, revisions, ACLs and denial after U7 to U8 upgrade", async () => {
  const db = await createAcceptanceDatabase({ beforeU8: true });
  let restored;
  try {
    const material = await seedAcceptance(db),
      { as } = access(db);
    const legacy = { version: 1, text: "Preserved U7 note" };
    await as(
      users.a,
      "insert into cp_study_state(user_id,section_id,record_id,kind,value) values($1,'office.excel','legacy-note','note',$2)",
      [users.a, legacy],
    );
    await db.exec("reset role");
    const file = (
      await readdir(new URL("../supabase/migrations/", import.meta.url))
    ).find((f) => f.includes("_u8_"));
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
    const { scalar } = access(db),
      op = crypto.randomUUID(),
      value = { version: 1, text: "Queued work uploaded once" };
    const args = [users.a, material, op, value];
    const write =
      "select cp_sync_write($1,$2,'office.excel','current-note','note',0,$3,$4) data";
    const receipt = await scalar(users.a, write, args);
    await db.exec("reset role");
    const before = (
      await db.query(
        "select user_id,record_id,value,revision::text,last_operation,material_version_id from cp_study_state order by record_id",
      )
    ).rows;
    assert.deepEqual(
      before.find((r) => r.record_id === "legacy-note").value,
      legacy,
    );
    const allRows = await snapshot(db);
    const dump = await db.dumpDataDir("gzip");
    const bytes = Buffer.from(await dump.arrayBuffer());
    assert.ok(bytes.length > 0);
    restored = new PGlite({ loadDataDir: new Blob([bytes]) });
    assert.deepEqual((await restored.query(preflight)).rows, []);
    assert.deepEqual(await snapshot(restored), allRows);
    assert.deepEqual(
      (
        await restored.query(
          "select user_id,record_id,value,revision::text,last_operation,material_version_id from cp_study_state order by record_id",
        )
      ).rows,
      before,
    );
    const copy = access(restored);
    assert.deepEqual(await copy.scalar(users.a, write, args), receipt);
    assert.equal(
      (await copy.as(users.b, "select * from cp_study_state")).rows.length,
      0,
    );
    await assert.rejects(
      () => copy.as(users.a, "update cp_study_state set value='{}'"),
      (e) => e.code === "42501",
    );
    await copy.as(
      users.admin,
      "select cp_set_learner($1,'revoked','Synthetic learner')",
      [users.a],
    );
    await assert.rejects(
      () => copy.scalar(users.a, write, args),
      (e) => e.code === "42501",
    );
  } finally {
    await restored?.close();
    await db.close();
  }
});
