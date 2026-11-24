import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { storageFixture } from "./storage-fixture.mjs";

export const users = {
  admin: "10000000-0000-4000-8000-000000000001",
  a: "10000000-0000-4000-8000-000000000002",
  b: "10000000-0000-4000-8000-000000000003",
  fresh: "10000000-0000-4000-8000-000000000004",
};
export async function createAcceptanceDatabase({
  beforeU8 = false,
  beforeU9 = false,
} = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges grant execute on functions to anon,authenticated,service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
    create function auth.uid() returns uuid language sql stable as
    $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
  `);
  for (const [name, id] of Object.entries(users))
    await db.query("insert into auth.users values($1,now(),$2)", [
      id,
      name + "@example.invalid",
    ]);
  await db.exec(storageFixture);
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  ).sort()) {
    if (
      (beforeU8 && file.includes("_u8_")) ||
      (beforeU9 && file.includes("_u9_"))
    )
      break;
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  }
  return db;
}
export function access(db) {
  const as = async (user, sql, params = []) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user || "",
    ]);
    await db.exec(`set role ${user ? "authenticated" : "anon"}`);
    return db.query(sql, params);
  };
  return { as, scalar: async (...args) => (await as(...args)).rows[0].data };
}
export async function seedAcceptance(db) {
  await db.exec(`select cp_private.bootstrap_owner('${users.admin}');`);
  const { as, scalar } = access(db);
  for (const user of [users.a, users.b]) {
    await as(
      users.admin,
      "select cp_set_learner($1,'active','Synthetic learner')",
      [user],
    );
    await as(
      users.admin,
      "select cp_set_section_grant($1,'office.excel','allow')",
      [user],
    );
  }
  const payload = {
    schema_version: 1,
    section_id: "office.excel",
    title: "Synthetic acceptance lesson",
    material_type: "explanation",
    content: {
      format: "document",
      blocks: [{ kind: "paragraph", text: "Practice SUM." }],
    },
  };
  const material = await scalar(
    users.admin,
    "select cp_admin_material_save(null,0,$1) data",
    [payload],
  );
  await as(
    users.admin,
    "select cp_admin_material_transition($1,1,'published',true)",
    [material],
  );
  await as(users.admin, "select cp_admin_material_assign($1,2,$2)", [
    material,
    {
      learners: [users.a],
      groups: [],
      excluded: [],
      release_answers: false,
    },
  ]);
  await db.exec("reset role");
  return material;
}
