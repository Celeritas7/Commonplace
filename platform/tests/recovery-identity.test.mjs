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
