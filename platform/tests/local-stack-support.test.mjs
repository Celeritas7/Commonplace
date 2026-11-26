import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { exampleBundle } from "../content/examples.mjs";
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
test("disposable package keeps source bytes and executable curriculum dependencies inside the functions mount", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cp-stack-test-"));
  try {
    const hashes = await prepareLocalStack(
      dir,
      "commonplace-u9-1234567890abcdef",
    );
    assert.equal(
      Object.keys(hashes).filter((p) => p.startsWith("supabase/migrations/"))
        .length,
      6,
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
              : "supabase/functions/_shared/platform/" + path,
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
      assert.ok(entry.includes('from "../_shared/platform/'));
      assert.ok(!entry.includes("../../../"));
      assert.ok(
        JSON.parse(
          await readFile(join(dir, `supabase/functions/${name}/deno.json`)),
        ).imports["@supabase/supabase-js"],
      );
    }
    const reviewedCurriculum = [
      "Office_work/Excel_study/curriculum.mjs",
      "Office_work/Excel_study/excel-curriculum.js",
      "Office_work/Excel_study/formula-syntax.js",
    ];
    assert.deepEqual(Object.keys(hashes).filter((path) => path.startsWith("../")).sort(),
      reviewedCurriculum.map((path) => "../" + path));

    const mount = await realpath(join(dir, "supabase/functions"));
    async function filesUnder(directory) {
      const files = [];
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        assert.ok(entry.isDirectory() || entry.isFile(), "Package contains only regular files and directories");
        files.push(...(entry.isDirectory() ? await filesUnder(path) : [path]));
      }
      return files;
    }
    const files = await filesUnder(mount);
    const shared = join(mount, "_shared");
    assert.deepEqual(files.map((path) => relative(shared, path).split(sep).join("/"))
      .filter((path) => path.startsWith("Office_work/")).sort(), reviewedCurriculum);
    const insideMount = (path) => {
      const name = relative(mount, path);
      assert.ok(name !== ".." && !name.startsWith(".." + sep) && !isAbsolute(name),
        "Every local module import must remain inside the functions mount");
    };
    let importsChecked = 0;
    for (const file of files.filter((path) => /\.(?:mjs|js|ts)$/.test(path))) {
      const source = await readFile(file, "utf8");
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) {
        const dependency = resolve(dirname(file), match[1]);
        insideMount(dependency);
        insideMount(await realpath(dependency));
        assert.ok(files.includes(dependency), "Every local module import resolves to a packaged file");
        importsChecked++;
      }
    }
    assert.ok(importsChecked > 0);

    // Import the artifact itself, not repository modules, to catch broken
    // relative imports that a checksum-only package check cannot expose.
    const contract = await import(pathToFileURL(join(shared, "platform/content/excel-contract.mjs")).href);
    const { curriculum } = await import(pathToFileURL(join(shared, reviewedCurriculum[0])).href);
    const prepared = contract.prepareExcelExercise(exampleBundle("trade"));
    assert.deepEqual(prepared.curriculumRef, { id: "sum", version: 1 });
    assert.deepEqual(prepared.runtimeRef, { id: "assigned-sum", version: 1 });
    assert.equal(curriculum.evaluateFormula(prepared.runtimeRef, prepared.worksheet.formula,
      prepared.worksheet.rows.map((row) => String(row[1]))).result, 25);
    assert.deepEqual(contract.EXCEL_PHASE_A_CAPABILITIES, ["explanation.text.v1", "excel.sum.b2-b4.v1"]);
    for (const capability of ["excel.average.b2-b4.v1", "excel.sum.b2-b4.v2"]) {
      const unsupported = exampleBundle("trade");
      unsupported.lesson.required_capabilities = ["explanation.text.v1", capability];
      assert.throws(() => contract.prepareExcelExercise(unsupported));
    }
    assert.throws(() => curriculum.resolveRuntime({ id: "assigned-sum", version: 2 }));
    await assert.rejects(
      () => prepareLocalStack(dir, "commonplace-u9-1234567890abcdef"),
      /empty/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
