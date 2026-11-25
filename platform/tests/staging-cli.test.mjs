import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { repositoryRoot } from "../tools/staging-package.mjs";
const run = promisify(execFile);

test("staging CLI packages a clean checkout with spaces and Unicode paths and refuses reuse or dirty source", async () => {
  const temp = await mkdtemp(join(tmpdir(), "cp staging 共通 "));
  const source = join(temp, "source checkout");
  const output = join(temp, "review output");
  try {
    await mkdir(source);
    for (const folder of ["platform", "Office_work/Excel_study", "icons"]) {
      await cp(join(repositoryRoot, folder), join(source, folder), {
        recursive: true,
        filter: (path) =>
          ![
            "node_modules",
            "test-results",
            "playwright-report",
            ".temp",
          ].includes(basename(path)),
      });
    }
    // This isolated source fixture uses the already-installed, pinned packages.
    // A directory junction on Windows needs no symbolic-link privilege.
    await symlink(
      join(repositoryRoot, "platform/node_modules"),
      join(source, "platform/node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await writeFile(join(source, ".gitignore"), "platform/node_modules\n");
    const git = (args) => run("git", args, { cwd: source });
    await git(["init", "--quiet"]);
    await git(["config", "core.autocrlf", "false"]);
    await git(["config", "core.hooksPath", join(temp, "no-hooks")]);
    await git(["add", "."]);
    await git([
      "-c",
      "user.name=Synthetic staging test",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      "Synthetic staging source",
    ]);
    const commit = (await git(["rev-parse", "HEAD"])).stdout.trim();
    const keys = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const configuration = {
      version: 1,
      environment: "staging",
      origin: "https://staging.example.invalid",
      project_ref: "abcdefghijklmnopqrst",
      publishable_key: "sb_publishable_synthetic_test_only",
      offline_hours: 1,
      offline_public_jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
    };
    const configFile = join(temp, "staging configuration 共通.json");
    await writeFile(configFile, JSON.stringify(configuration));
    const command = (target) =>
      run(
        process.execPath,
        [
          join(source, "platform/tools/prepare-staging.mjs"),
          configFile,
          target,
        ],
        { cwd: source },
      );
    const result = await command(output);
    assert.match(result.stdout, /Prepared staging files for review/);
    assert.match(result.stdout, /Nothing was deployed or applied/);
    assert.ok(!result.stdout.includes(configuration.publishable_key));
    const reviewBytes = await readFile(join(output, "review.json"));
    const review = JSON.parse(reviewBytes);
    assert.equal(review.source_commit, commit);
    assert.equal(review.deployed, false);
    assert.equal(review.migrations_applied, false);
    for (const [path, metadata] of Object.entries(review.files)) {
      assert.ok(!path.includes("\\"));
      const bytes = await readFile(join(output, path));
      assert.equal(bytes.length, metadata.bytes, path);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        metadata.sha256,
        path,
      );
    }
    assert.equal((await git(["status", "--porcelain"])).stdout.trim(), "");
    await assert.rejects(
      () => command(output),
      (error) => error.code === 1 && /empty output/.test(error.stderr),
    );
    assert.deepEqual(await readFile(join(output, "review.json")), reviewBytes);
    await writeFile(
      join(source, "uncommitted-note.txt"),
      "Synthetic unsaved work",
    );
    const secondOutput = join(temp, "another output");
    await assert.rejects(
      () => command(secondOutput),
      (error) => error.code === 1 && /Commit or isolate/.test(error.stderr),
    );
    assert.ok(!(await readdir(temp)).includes("another output"));
    assert.equal(
      await readFile(join(source, "uncommitted-note.txt"), "utf8"),
      "Synthetic unsaved work",
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
