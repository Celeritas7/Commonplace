import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  captureRecoveryIdentity,
  parseRestoreReport,
} from "../operations/general-apps/capture-recovery-identity.mjs";
const summary =
  "Source table-data blocks: 302\nR2 table-data blocks: 302\nSource total rows: 20889\nR2 total rows: 20889\nMatching table fingerprints: 302\nTable differences: 0\n";
test("recovery identity keeps archive integrity, historical association and runtime recovery distinct", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cp-recovery-identity-"));
  try {
    const archivePath = join(dir, "synthetic.dump"),
      reportPath = join(dir, "report.txt");
    const raw = Buffer.from("PGDMP-synthetic-not-a-restorable-backup");
    const sha = createHash("sha256").update(raw).digest("hex");
    await writeFile(archivePath, raw);
    await writeFile(reportPath, summary + "PRIVATE_RECORD_MUST_NOT_APPEAR\n");
    const evidence = await captureRecoveryIdentity({
      archivePath,
      reportPath,
      expectedArchiveSha256: sha,
    });
    assert.equal(evidence.archive.sha256, sha);
    assert.equal(evidence.archive_vs_expected, "matches");
    assert.equal(evidence.restore_input_relationship, "unverified-input");
    assert.equal(evidence.restore_report.reported_public_data_match, true);
    assert.equal(evidence.deployment_ready, false);
    assert.equal(evidence.runtime_recovery.auth, "not-established");
    assert.ok(
      !JSON.stringify(evidence).includes("PRIVATE_RECORD_MUST_NOT_APPEAR"),
    );
    assert.ok(!JSON.stringify(evidence).includes(dir));
    const asserted = await captureRecoveryIdentity({
      archivePath,
      reportPath,
      confirmRestoreInput: true,
    });
    assert.equal(
      asserted.restore_input_relationship,
      "operator-asserted-input",
    );
    await writeFile(reportPath, summary + "Source dump SHA256: " + sha + "\n");
    assert.equal(
      (await captureRecoveryIdentity({ archivePath, reportPath }))
        .restore_input_relationship,
      "embedded-hash-match",
    );
    const other = "f".repeat(64);
    await writeFile(
      reportPath,
      summary + "Source dump SHA256: " + other + "\n",
    );
    const mismatched = await captureRecoveryIdentity({
      archivePath,
      reportPath,
      expectedArchiveSha256: other,
      confirmRestoreInput: true,
    });
    assert.equal(
      mismatched.restore_input_relationship,
      "embedded-hash-mismatch",
    );
    assert.equal(mismatched.archive_vs_expected, "different");
    assert.deepEqual(await readFile(archivePath), raw);
    await writeFile(archivePath, "not a dump");
    await assert.rejects(
      () => captureRecoveryIdentity({ archivePath, reportPath }),
      /custom-format/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("recovery report parser refuses missing or ambiguous metrics and retains reported failures", () => {
  assert.throws(() => parseRestoreReport("PASS"), /CP3 metric/);
  assert.throws(
    () => parseRestoreReport(summary + "Source total rows: 1\n"),
    /exactly one/,
  );
  assert.equal(
    parseRestoreReport(
      summary.replace("Table differences: 0", "Table differences: 1"),
    ).reported_public_data_match,
    false,
  );
  assert.equal(
    parseRestoreReport(
      summary.replace("R2 total rows: 20889", "R2 total rows: 20888"),
    ).reported_public_data_match,
    false,
  );
});

test("CLI preserves original Windows bytes and distinguishes incomplete, conflicting and aligned evidence", async () => {
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const script = fileURLToPath(
    new URL(
      "../operations/general-apps/capture-recovery-identity.mjs",
      import.meta.url,
    ),
  );
  const dir = await mkdtemp(join(tmpdir(), "cp-recovery-cli-"));
  try {
    const archive = join(dir, "source"),
      report = join(dir, "report");
    const bytes = Buffer.from("PGDMPfixture");
    const hash = createHash("sha256").update(bytes).digest("hex");
    await writeFile(archive, bytes);
    for (const [i, [text, expected, status]] of [
      [summary, hash, 3],
      [summary + "Source dump SHA256: " + hash, hash, 0],
      [summary + "Source dump SHA256: " + hash, "f".repeat(64), 2],
      [summary.replace("differences: 0", "differences: 1"), hash, 2],
    ].entries()) {
      const raw = Buffer.concat([
        Buffer.from([255, 254]),
        Buffer.from(text, "utf16le"),
      ]);
      await writeFile(report, raw);
      const out = join(dir, "out" + i);
      const result = spawnSync(
        process.execPath,
        [
          script,
          "--archive",
          archive,
          "--report",
          report,
          "--out",
          out,
          "--expected-sha256",
          expected,
        ],
        { encoding: "utf8" },
      );
      assert.equal(result.status, status, result.stderr);
      const e = JSON.parse(await readFile(out));
      assert.equal(
        e.restore_report.sha256,
        createHash("sha256").update(raw).digest("hex"),
      );
      assert.equal(e.deployment_ready, false);
      assert.ok(result.stdout.includes(e.archive_vs_expected));
    }
    for (const value of [
      "",
      "invalid",
      "invalid\nSource archive SHA256: " + hash,
    ]) {
      assert.throws(
        () => parseRestoreReport(summary + "Source dump SHA256: " + value),
        /hash/i,
      );
    }
    assert.throws(
      () => parseRestoreReport(summary + "R2 total rows: invalid"),
      /exactly one/,
    );
    const read = () =>
      captureRecoveryIdentity({ archivePath: archive, reportPath: report });
    await writeFile(report, summary.padEnd(1024 * 1024));
    await read();
    await writeFile(report, summary.padEnd(1024 * 1024 + 1));
    await assert.rejects(read, /1 MiB/);
    await writeFile(archive, Buffer.from([208, 199, 196, 205, 208]));
    await assert.rejects(read, /custom-format/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
