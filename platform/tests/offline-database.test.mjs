import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { storageFixture } from "./storage-fixture.mjs";
const admin = "10000000-0000-4000-8000-000000000001",
  a = "10000000-0000-4000-8000-000000000002",
  b = "10000000-0000-4000-8000-000000000003";
test("U8 migrated PostgreSQL: assigned snapshots, owner CAS, stale tokens and direct-write denial", async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges grant execute on functions to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${admin}',now(),'admin@example.invalid'),('${a}',now(),'a@example.invalid'),('${b}',now(),'b@example.invalid');`,
  );
  await db.exec(storageFixture);
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  ).sort())
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(`select cp_private.bootstrap_owner('${admin}');`);
  const as = async (user, sql, params = []) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user || "",
    ]);
    await db.exec(`set role ${user ? "authenticated" : "anon"}`);
    return db.query(sql, params);
  };
  const scalar = async (user, sql, p = []) =>
    (await as(user, sql, p)).rows[0].data;
  for (const user of [a, b]) {
    await as(admin, "select cp_set_learner($1,'active','Learner')", [user]);
    await as(admin, "select cp_set_section_grant($1,'office.excel','allow')", [
      user,
    ]);
  }
  const payload = {
    schema_version: 1,
    section_id: "office.excel",
    title: "Owned lesson",
    material_type: "explanation",
    content: {
      format: "document",
      blocks: [{ kind: "paragraph", text: "SUM practice" }],
    },
  };
  const id = await scalar(
    admin,
    "select cp_admin_material_save(null,0,$1) data",
    [payload],
  );
  await as(
    admin,
    "select cp_admin_material_transition($1,1,'published',true)",
    [id],
  );
  await as(admin, "select cp_admin_material_assign($1,2,$2)", [
    id,
    { learners: [a, b], groups: [], excluded: [], release_answers: false },
  ]);
  const read = (user, record = "sum") =>
    scalar(user, "select cp_sync_read($1,$2,'office.excel',$3,'note') data", [
      user,
      id,
      record,
    ]);
  const put = (
    user,
    rev,
    value,
    operation = crypto.randomUUID(),
    record = "sum",
  ) =>
    scalar(
      user,
      "select cp_sync_write($1,$2,'office.excel',$3,'note',$4,$5,$6) data",
      [user, id, record, rev, operation, value],
    );
  await t.test(
    "snapshot omits unassigned, draft and other-owner data; anonymous requests fail",
    async () => {
      const snap = await scalar(
        a,
        "select cp_offline_snapshot('office.excel') data",
      );
      assert.equal(snap.owner, a);
      assert.deepEqual(
        snap.materials.map((m) => m.id),
        [id],
      );
      assert.equal(snap.materials[0].owner_id, a);
      await assert.rejects(
        () => scalar(null, "select cp_offline_snapshot('office.excel') data"),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        () => scalar(a, "select cp_offline_snapshot('coding.python') data"),
        (e) => e.code === "42501",
      );
    },
  );
  await t.test(
    "CAS is idempotent after a lost acknowledgement; stale and reused operations cannot overwrite",
    async () => {
      const op = crypto.randomUUID(),
        v = { version: 1, text: "First note" };
      assert.deepEqual(await read(a), { revision: "0", value: null });
      const saved = await put(a, "0", v, op);
      assert.equal(saved.status, "saved");
      assert.equal(saved.revision, "1");
      assert.deepEqual(await put(a, "0", v, op), saved);
      const conflict = await put(a, "0", { text: "Old device" });
      assert.equal(conflict.status, "conflict");
      assert.deepEqual(conflict.value, v);
      await assert.rejects(
        () => put(a, "1", { text: "Changed reuse" }, op),
        (e) => e.code === "22023",
      );
      assert.equal((await put(a, "1", { text: "Second" })).revision, "2");
      assert.equal((await put(a, "0", v, op)).status, "conflict");
    },
  );
  await t.test(
    "own data only, including administrators, with raw DML and revision forgery denied",
    async () => {
      assert.deepEqual(await read(b), { revision: "0", value: null });
      assert.deepEqual(await read(admin), { revision: "0", value: null });
      for (const sql of [
        "update cp_study_state set value='{}'",
        "delete from cp_study_state",
        "update cp_study_state set revision=99",
        `insert into cp_study_state(user_id,section_id,record_id,kind,value) values('${a}','office.excel','x','note','{}')`,
      ])
        await assert.rejects(
          () => as(a, sql),
          (e) => e.code === "42501",
        );
      assert.equal(
        (await as(b, "select * from cp_study_state")).rows.length,
        0,
      );
      await assert.rejects(
        () =>
          scalar(
            b,
            "select cp_sync_write($1,$2,'office.excel','sum','note',0,$3,'{}') data",
            [a, id, crypto.randomUUID()],
          ),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        () =>
          scalar(
            b,
            "select cp_sync_read($1,$2,'office.excel','sum','note') data",
            [a, id],
          ),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        () =>
          as(a, "select cp_private.check_study_material($1,'office.excel')", [
            id,
          ]),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        () => put(a, "-1", {}),
        (e) => e.code === "22023",
      );
    },
  );
  await t.test(
    "assignment and membership revocation deny both synchronization and renewal with old identity",
    async () => {
      await as(admin, "select cp_admin_material_assign($1,3,$2)", [
        id,
        { learners: [b], groups: [], excluded: [a], release_answers: false },
      ]);
      assert.deepEqual(
        (await scalar(a, "select cp_offline_snapshot('office.excel') data"))
          .materials,
        [],
      );
      await assert.rejects(
        () => read(a),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        () => put(a, "2", { text: "Denied" }),
        (e) => e.code === "42501",
      );
      await as(admin, `select cp_set_learner('${b}','revoked','B')`);
      await assert.rejects(
        () => scalar(b, "select cp_offline_snapshot('office.excel') data"),
        (e) => e.code === "42501",
      );
      await assert.rejects(
        () => put(b, "0", {}),
        (e) => e.code === "42501",
      );
      await db.exec("reset role");
      assert.equal(
        (
          await db.query(
            "select value->>'text' v from cp_study_state where user_id=$1",
            [a],
          )
        ).rows[0].v,
        "Second",
      );
    },
  );
  await db.close();
});
