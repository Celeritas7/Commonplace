import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildStagingPackage, repositoryRoot } from "./staging-package.mjs";
const run = promisify(execFile);
try {
  const [configFile, output, ...extra] = process.argv.slice(2);
  if (!configFile || !output || extra.length)
    throw Error(
      "Usage: npm run prepare:staging -- config.json /absolute/empty/output",
    );
  if (
    (
      await run("git", ["status", "--porcelain"], { cwd: repositoryRoot })
    ).stdout.trim()
  )
    throw Error(
      "Commit or isolate your source changes before preparing a reviewable package.",
    );
  const text = await readFile(configFile, "utf8");
  if (Buffer.byteLength(text) > 16384)
    throw Error("Configuration is too large.");
  const sourceCommit = (
    await run("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot })
  ).stdout.trim();
  const review = await buildStagingPackage({
    output,
    configuration: JSON.parse(text),
    sourceCommit,
  });
  console.log(
    `Prepared staging files for review (${Object.keys(review.files).length} files). Nothing was deployed or applied.`,
  );
} catch (error) {
  // Do not echo configuration contents, keys or a JSON parser excerpt.
  console.error(
    error instanceof SyntaxError
      ? "Invalid configuration JSON."
      : error.message,
  );
  process.exitCode = 1;
}
