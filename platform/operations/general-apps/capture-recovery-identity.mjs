// Read-only local inputs. No database/network connection or raw row export.
import { open, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function fingerprint(path, archive = false) {
  const file = await open(path, "r");
  try {
    const before = await file.stat();
    if (!before.isFile()) throw Error("A regular input file is required.");
    const sha = createHash("sha256");
    let bytes = 0,
      header = Buffer.alloc(0);
    for await (const chunk of file.createReadStream({ autoClose: false })) {
      sha.update(chunk);
      bytes += chunk.length;
      if (header.length < 5)
        header = Buffer.concat([header, chunk.subarray(0, 5 - header.length)]);
    }
    const after = await file.stat();
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      bytes !== before.size
    )
      throw Error("Input changed while hashing; retry with a stable file.");
    if (archive && header.toString("ascii") !== "PGDMP")
      throw Error("Expected a PostgreSQL custom-format dump.");
    return {
      name: basename(path),
      bytes,
      sha256: sha.digest("hex"),
      ...(archive ? { header: "PGDMP" } : {}),
    };
  } finally {
    await file.close();
  }
}
export function parseRestoreReport(text) {
  const names = {
    source_tables: "Source table-data blocks",
    restored_tables: "R2 table-data blocks",
    source_rows: "Source total rows",
    restored_rows: "R2 total rows",
    matching_tables: "Matching table fingerprints",
    table_differences: "Table differences",
  };
  const metrics = {};
  for (const [key, label] of Object.entries(names)) {
    const matches = [
      ...text.matchAll(new RegExp("^" + label + ":\\s*(\\d+)\\s*$", "gm")),
    ];
    if (matches.length !== 1)
      throw Error("Expected exactly one CP3 metric: " + label);
    const value = Number(matches[0][1]);
    if (!Number.isSafeInteger(value)) throw Error("Invalid CP3 count.");
    metrics[key] = value;
  }
  const sourceHashes = [
    ...text.matchAll(
      /^Source (?:dump|archive) SHA-?256:\s*([a-fA-F0-9]{64})\s*$/gm,
    ),
  ];
  if (sourceHashes.length > 1)
    throw Error("Ambiguous source archive hashes in report.");
  return {
    metrics,
    embedded_archive_sha256: sourceHashes[0]?.[1].toLowerCase() || null,
    reported_public_data_match:
      metrics.source_tables > 0 &&
      metrics.source_tables === metrics.restored_tables &&
      metrics.matching_tables === metrics.source_tables &&
      metrics.source_rows === metrics.restored_rows &&
      metrics.table_differences === 0,
  };
}
export async function captureRecoveryIdentity({
  archivePath,
  reportPath,
  expectedArchiveSha256,
  confirmRestoreInput = false,
}) {
  if (expectedArchiveSha256 && !/^[a-fA-F0-9]{64}$/.test(expectedArchiveSha256))
    throw Error("Invalid expected SHA-256.");
  if ((await stat(reportPath)).size > 1024 * 1024)
    throw Error("CP3 report exceeds the 1 MiB limit.");
  const archive = await fingerprint(archivePath, true),
    report = await fingerprint(reportPath);
  const bytes = await readFile(reportPath);
  if (createHash("sha256").update(bytes).digest("hex") !== report.sha256)
    throw Error("Report changed while reading.");
  const parsed = parseRestoreReport(
    new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, ""),
  );
  const embedded = parsed.embedded_archive_sha256;
  const relationship = embedded
    ? embedded === archive.sha256
      ? "embedded-hash-match"
      : "embedded-hash-mismatch"
    : confirmRestoreInput
      ? "operator-asserted-input"
      : "unverified-input";
  return {
    version: 1,
    captured_at: new Date().toISOString(),
    archive,
    restore_report: { ...report, ...parsed },
    archive_vs_expected: expectedArchiveSha256
      ? archive.sha256 === expectedArchiveSha256.toLowerCase()
        ? "matches"
        : "different"
      : "not-provided",
    restore_input_relationship: relationship,
    operator_confirmed_input: confirmRestoreInput,
    runtime_recovery: {
      auth: "not-established",
      rls: "not-established",
      private_storage: "not-established",
    },
    deployment_ready: false,
  };
}
async function main() {
  const args = process.argv.slice(2),
    options = {};
  const fields = {
    "--archive": "archivePath",
    "--report": "reportPath",
    "--expected-sha256": "expectedArchiveSha256",
    "--out": "out",
  };
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === "--confirm-restore-input") {
      if (options.confirmRestoreInput) throw Error("Duplicate option.");
      options.confirmRestoreInput = true;
      continue;
    }
    if (
      !fields[key] ||
      !args[i + 1] ||
      args[i + 1].startsWith("--") ||
      options[fields[key]]
    )
      throw Error("Invalid or duplicate option.");
    options[fields[key]] = args[++i];
  }
  if (!options.archivePath || !options.reportPath || !options.out)
    throw Error(
      "Use --archive exact.dump --report CP3-report.txt --out new-private-evidence.json [--expected-sha256 HASH] [--confirm-restore-input].",
    );
  const result = await captureRecoveryIdentity(options);
  await writeFile(options.out, JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log("Saved private metadata evidence: " + resolve(options.out));
  console.log(
    "Input relationship: " +
      result.restore_input_relationship +
      "; hosted recovery remains unverified.",
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
