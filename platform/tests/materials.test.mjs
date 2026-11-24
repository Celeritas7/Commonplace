import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { storageFixture } from "./storage-fixture.mjs";
import { validateMaterial, parseMaterial } from "../materials/contracts.mjs";
import { exampleBundle } from "../content/examples.mjs";
const owner = "10000000-0000-4000-8000-000000000001",
  a = "10000000-0000-4000-8000-000000000002",
  b = "10000000-0000-4000-8000-000000000003";
const document = () => ({
  schema_version: 1,
  section_id: "office.excel",
  title: "Inventory practice",
  material_type: "practice",
  content: {
    format: "document",
    blocks: [
      { kind: "paragraph", text: "Calculate stock for Manila." },
      { kind: "code", language: "python", text: 'print("example only")' },
    ],
  },
});
test("published import schema and database validator share the same structural contract", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL("../materials/schema.json", import.meta.url),
      "utf8",
    ),
  );
  const sql = await readFile(
    new URL(
      "../supabase/migrations/20261124151240_u6_material_library.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.deepEqual(
    JSON.parse(sql.match(/\$schema\$([\s\S]*?)\$schema\$/)[1]),
    schema,
  );
});
test("material import accepts data-only formats and refuses publication/identity fields and answers in quiz blocks", () => {
  assert.deepEqual(parseMaterial(JSON.stringify(document())), document());
  for (const change of [
    (x) => (x.state = "published"),
    (x) => (x.user_id = a),
    (x) => (x.content.blocks[0].html = "<script>x</script>"),
    (x) =>
      (x.content.blocks = [
        { kind: "question", text: "Total?", choices: ["1", "2"], answer: 1 },
      ]),
    (x) => (x.content = { format: "url", url: "https://example.invalid" }),
    (x) => (x.title = ""),
  ]) {
    const x = document();
    change(x);
    assert.throws(() => validateMaterial(x));
  }
  assert.throws(() => parseMaterial(" ".repeat(262145)));
});
test("material library PostgreSQL permissions, publication, assignments, files and revisions", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;alter default privileges grant execute on functions to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${owner}','owner@example.invalid',now()),('${a}','a@example.invalid',now()),('${b}','b@example.invalid',now());`,
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
    await db.query("select cp_private.bootstrap_owner($1)", [owner]);
    async function as(user, sql, args = []) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user || "",
      ]);
      await db.exec("set role " + (user ? "authenticated" : "anon"));
      return db.query(sql, args);
    }
    const rpc = async (
      user,
      name,
      args,
      placeholders = args.map((_, i) => "$" + (i + 1)).join(","),
    ) =>
      (await as(user, `select ${name}(${placeholders}) value`, args)).rows[0]
        .value;
    const detail = (id) => rpc(owner, "cp_admin_material_detail", [id]);
    const transition = async (id, state, reviewed = true) =>
      rpc(owner, "cp_admin_material_transition", [
        id,
        (await detail(id)).revision,
        state,
        reviewed,
      ]);
    const audience = async (id, values) =>
      rpc(owner, "cp_admin_material_assign", [
        id,
        (await detail(id)).revision,
        {
          learners: [],
          groups: [],
          excluded: [],
          release_answers: false,
          ...values,
        },
      ]);
    for (const id of [a, b])
      await rpc(owner, "cp_set_learner", [id, "active", "Test learner"]);
    await rpc(owner, "cp_set_section_grant", [a, "office.excel", "allow"]);
    let id, group;
    await t.test(
      "only administrator can save or list materials; arbitrary client writes and invalid imports fail",
      async () => {
        for (const user of [null, a, b]) {
          await assert.rejects(
            () => rpc(user, "cp_admin_material_library", []),
            (e) => e.code === "42501",
          );
          await assert.rejects(
            () => rpc(user, "cp_admin_material_save", [null, "0", document()]),
            (e) => e.code === "42501",
          );
        }
        await assert.rejects(
          () =>
            as(
              owner,
              "insert into cp_materials(section_id) values('office.excel')",
            ),
          (e) => e.code === "42501",
        );
        for (const change of [
          (x) => (x.state = "published"),
          (x) => (x.content.blocks[0].html = "bad"),
          (x) => (x.section_id = "office"),
          (x) =>
            (x.content.blocks = [
              {
                kind: "question",
                text: "Total?",
                choices: ["1", "2"],
                answer: 0,
              },
            ]),
        ]) {
          const x = document();
          change(x);
          await assert.rejects(
            () => rpc(owner, "cp_admin_material_save", [null, "0", x]),
            (e) => e.code === "22023",
          );
        }
        id = await rpc(owner, "cp_admin_material_save", [
          null,
          "0",
          document(),
        ]);
        assert.equal((await detail(id)).state, "draft");
        assert.equal(
          (await as(a, "select * from cp_material_versions")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "bundles are validated again on the server, including references, cell types and unsupported capabilities",
      async () => {
        const payload = {
          ...document(),
          content: { format: "bundle", bundle: exampleBundle("trade") },
        };
        validateMaterial(payload);
        const bundleId = await rpc(owner, "cp_admin_material_save", [
          null,
          "0",
          payload,
        ]);
        assert.ok(bundleId);
        for (const change of [
          (x) => x.content.bundle.lesson.scenario_ref.version++,
          (x) => (x.content.bundle.dataset.rows[0][1] = "bad"),
          (x) =>
            x.content.bundle.lesson.required_capabilities.push(
              "excel.run-script.v1",
            ),
          (x) => x.content.bundle.dataset.rows.push(["fourth", 4]),
        ]) {
          const bad = structuredClone(payload);
          change(bad);
          await assert.rejects(
            () => rpc(owner, "cp_admin_material_save", [null, "0", bad]),
            (e) => e.code === "22023",
          );
        }
      },
    );
    await t.test(
      "review and assignment are separate, published versions immutable, stale writes fail",
      async () => {
        await assert.rejects(
          () => transition(id, "published", false),
          (e) => e.code === "22023",
        );
        await transition(id, "published");
        await assert.rejects(
          () => rpc(a, "cp_read_material", [id]),
          (e) => e.code === "42501",
        );
        await audience(id, { learners: [a, b] });
        assert.equal((await rpc(a, "cp_read_material", [id])).owner_id, a);
        await assert.rejects(
          () => rpc(b, "cp_read_material", [id]),
          (e) => e.code === "42501",
        );
        assert.deepEqual(
          (await as(a, "select id from cp_materials")).rows.map((r) => r.id),
          [(await detail(id)).material_id],
        );
        assert.equal(
          (await as(a, "select * from cp_material_assignments")).rows.length,
          0,
        );
        await assert.rejects(
          async () =>
            rpc(owner, "cp_admin_material_save", [
              id,
              (await detail(id)).revision,
              document(),
            ]),
          (e) => e.code === "22023",
        );
        await assert.rejects(
          () =>
            rpc(owner, "cp_admin_material_transition", [
              id,
              "1",
              "archived",
              false,
            ]),
          (e) => e.code === "40001",
        );
        const copy = await rpc(owner, "cp_admin_material_copy", [
          id,
          (await detail(id)).revision,
        ]);
        const copied = await detail(copy);
        assert.equal(copied.state, "draft");
        assert.equal(copied.version, 2);
        assert.deepEqual(copied.audience.learners, []);
        await assert.rejects(
          () => rpc(a, "cp_read_material", [copy]),
          (e) => e.code === "42501",
        );
      },
    );
    await t.test(
      "group assignments respect live membership, explicit exclusions and section permissions",
      async () => {
        group = await rpc(owner, "cp_admin_save_profile_group", [
          null,
          "0",
          "Import-export",
          "",
        ]);
        for (const user of [a, b])
          await rpc(owner, "cp_admin_save_profile", [user, "0", {}, [group]]);
        await audience(id, { groups: [group] });
        assert.equal((await rpc(a, "cp_read_material", [id])).id, id);
        await assert.rejects(
          () => rpc(b, "cp_read_material", [id]),
          (e) => e.code === "42501",
        );
        await audience(id, { groups: [group], excluded: [a] });
        await assert.rejects(
          () => rpc(a, "cp_read_material", [id]),
          (e) => e.code === "42501",
        );
        await audience(id, { groups: [group] });
        await rpc(owner, "cp_admin_save_profile", [a, "1", {}, []]);
        await assert.rejects(
          () => rpc(a, "cp_read_material", [id]),
          (e) => e.code === "42501",
        );
        await audience(id, { learners: [a] });
        await rpc(owner, "cp_set_learner", [a, "revoked", "A"]);
        await assert.rejects(
          () => rpc(a, "cp_read_material", [id]),
          (e) => e.code === "42501",
        );
        await rpc(owner, "cp_set_learner", [a, "active", "A"]);
        await transition(id, "archived");
        await assert.rejects(
          () => rpc(a, "cp_read_material", [id]),
          (e) => e.code === "42501",
        );
        assert.equal(
          (await rpc(a, "cp_learner_materials", ["office.excel"])).length,
          0,
        );
      },
    );
    await t.test(
      "answer sheets need an explicit release even when published and assigned",
      async () => {
        const answer = await rpc(owner, "cp_admin_material_save", [
          null,
          "0",
          { ...document(), material_type: "answer_sheet" },
        ]);
        await transition(answer, "published");
        await audience(answer, { learners: [a] });
        await assert.rejects(
          () => rpc(a, "cp_read_material", [answer]),
          (e) => e.code === "42501",
        );
        await audience(answer, { learners: [a], release_answers: true });
        assert.equal((await rpc(a, "cp_read_material", [answer])).id, answer);
        await audience(answer, { learners: [a] });
        await assert.rejects(
          () => rpc(a, "cp_read_material", [answer]),
          (e) => e.code === "42501",
        );
      },
    );
    await t.test(
      "private bucket denies direct clients even with broad existing policies; file attestation is service-only and cannot race publication",
      async () => {
        const fileId = await rpc(owner, "cp_admin_material_save", [
          null,
          "0",
          { ...document(), content: { format: "attachment" } },
        ]);
        await assert.rejects(
          () => transition(fileId, "published"),
          (e) => e.code === "22023",
        );
        const slot = await rpc(owner, "cp_admin_material_begin_upload", [
          fileId,
          (await detail(fileId)).revision,
        ]);
        const receipt = {
          filename: "Tutorial.txt",
          mime: "text/plain",
          bytes: 10,
          sha256: "a".repeat(64),
        };
        for (const user of [null, a, owner])
          await assert.rejects(
            () =>
              rpc(user, "cp_service_material_finish_upload", [
                fileId,
                slot.nonce,
                owner,
                receipt,
              ]),
            (e) => e.code === "42501",
          );
        await db.exec("reset role;set role service_role");
        await db.query(
          "insert into storage.objects(bucket_id,name) values('cp-materials',$1)",
          [slot.path],
        );
        await db.query(
          "select cp_service_material_finish_upload($1,$2,$3,$4)",
          [fileId, slot.nonce, owner, receipt],
        );
        for (const user of [null, a, owner]) {
          assert.equal(
            (
              await as(
                user,
                "select * from storage.objects where bucket_id='cp-materials'",
              )
            ).rows.length,
            0,
          );
          await assert.rejects(
            () =>
              as(
                user,
                "insert into storage.objects(bucket_id,name) values('cp-materials','forged')",
              ),
            (e) => e.code === "42501",
          );
          assert.equal(
            (
              await as(
                user,
                "select * from storage.buckets where id='cp-materials'",
              )
            ).rows.length,
            0,
          );
        }
        await transition(fileId, "published");
        await audience(fileId, { learners: [a] });
        assert.equal(
          (await rpc(a, "cp_read_material", [fileId])).asset.path,
          slot.path,
        );
        await db.exec("reset role;set role service_role");
        await assert.rejects(
          () =>
            db.query("select cp_service_material_finish_upload($1,$2,$3,$4)", [
              fileId,
              slot.nonce,
              owner,
              receipt,
            ]),
          (e) => e.code === "40001",
        );
        const actions = (
          await as(
            owner,
            "select action from cp_audit where action like 'material.%'",
          )
        ).rows.map((r) => r.action);
        for (const action of [
          "material.draft",
          "material.published",
          "material.archived",
          "material.assign",
          "material.file",
          "material.version",
        ])
          assert.ok(actions.includes(action));
      },
    );
  } finally {
    await db.close();
  }
});
