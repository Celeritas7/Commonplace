import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  assertLocalStatus,
  safeDiagnostic,
  prepareLocalStack,
  platformRoot,
} from "../acceptance/local-stack-support.mjs";

test("local stack target guard rejects hosted credentials and alternate hosts, ports or paths", () => {
  const s = {
    API_URL: "http://127.0.0.1:54321",
    DB_URL: "postgresql://postgres:synthetic@127.0.0.1:54322/postgres",
    ANON_KEY: "synthetic-public",
    SERVICE_ROLE_KEY: "synthetic-secret",
  };
  assert.equal(assertLocalStatus(s).url, s.API_URL);
  for (const patch of [
    { API_URL: "https://project.supabase.co" },
    { API_URL: "http://localhost:54321" },
    { API_URL: s.API_URL + "/rest/v1" },
    { API_URL: "http://user@127.0.0.1:54321" },
    { DB_URL: "postgresql://postgres@remote.invalid:54322/postgres" },
    { DB_URL: "postgresql://postgres@127.0.0.1:5432/postgres" },
    { SERVICE_ROLE_KEY: "" },
  ])
    assert.throws(() => assertLocalStatus({ ...s, ...patch }));
});
test("diagnostics do not reveal captured keys, JWTs or database credentials", () => {
  const text = safeDiagnostic(
    "eyJabc.def.ghi sb_secret_example postgresql://user:password@host/db captured-value",
    ["captured-value"],
  );
  for (const secret of [
    "eyJabc",
    "sb_secret_example",
    "password",
    "captured-value",
  ])
    assert.ok(!text.includes(secret));
});
test("disposable package keeps migration/shared-module bytes and puts both Edge dependency graphs inside the functions mount", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cp-stack-test-"));
  try {
    const hashes = await prepareLocalStack(
      dir,
      "commonplace-u9-1234567890abcdef",
    );
    assert.equal(
      Object.keys(hashes).filter((p) => p.startsWith("supabase/migrations/"))
        .length,
      5,
    );
    for (const [path, hash] of Object.entries(hashes)) {
      const original = await readFile(join(platformRoot, path));
      assert.equal(createHash("sha256").update(original).digest("hex"), hash);
      if (!path.startsWith("supabase/functions/")) {
        const packaged = await readFile(
          join(
            dir,
            path.startsWith("supabase/")
              ? path
              : "supabase/functions/_shared/" + path,
          ),
        );
        assert.deepEqual(packaged, original);
      }
    }
    for (const name of ["material-files", "offline-lease"]) {
      const entry = await readFile(
        join(dir, `supabase/functions/${name}/index.ts`),
        "utf8",
      );
      assert.ok(entry.includes('from "../_shared/'));
      assert.ok(!entry.includes("../../../"));
      assert.ok(
        JSON.parse(
          await readFile(join(dir, `supabase/functions/${name}/deno.json`)),
        ).imports["@supabase/supabase-js"],
      );
    }
    await assert.rejects(
      () => prepareLocalStack(dir, "commonplace-u9-1234567890abcdef"),
      /empty/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
