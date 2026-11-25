import { copyEdgeSources } from "../tools/edge-package.mjs";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const platformRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const CLI_VERSION = "3.3.0";
export function assertLocalStatus(s) {
  // No caller-supplied target, DNS alias, hosted URL, alternate path or redirect.
  const api = new URL(s.API_URL),
    db = new URL(s.DB_URL);
  if (
    api.href !== "http://127.0.0.1:54321/" ||
    api.username ||
    api.password ||
    !["postgres", "postgresql"].includes(db.protocol.slice(0, -1)) ||
    db.hostname !== "127.0.0.1" ||
    db.port !== "54322" ||
    db.pathname !== "/postgres" ||
    db.search ||
    db.hash ||
    !s.ANON_KEY ||
    !s.SERVICE_ROLE_KEY
  )
    throw Error(
      "Local acceptance refuses this target; expected the disposable loopback stack.",
    );
  return { url: api.origin, anon: s.ANON_KEY, service: s.SERVICE_ROLE_KEY };
}
export function safeDiagnostic(value, secrets = []) {
  let text = String(value);
  for (const secret of secrets.filter(Boolean))
    text = text.split(secret).join("[redacted]");
  return text
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[JWT redacted]",
    )
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[key redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[database URL redacted]")
    .split("\n")
    .slice(-30)
    .join("\n");
}
export async function prepareLocalStack(target, id) {
  if (!/^commonplace-u9-[a-f0-9]{16}$/.test(id))
    throw Error("Invalid disposable stack ID");
  if ((await readdir(target)).length)
    throw Error("Acceptance output must be empty");
  const write = async (path, body) => {
    const full = join(target, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body);
  };
  const config = (
    await readFile(join(platformRoot, "supabase/config.toml"), "utf8")
  ).replace(
    'project_id = "commonplace-local-acceptance"',
    `project_id = "${id}"`,
  );
  if (!config.includes(`project_id = "${id}"`) || /\[remotes\./.test(config))
    throw Error("Invalid local config");
  await write("supabase/config.toml", config);
  const hashes = {};
  for (const file of (
    await readdir(join(platformRoot, "supabase/migrations"))
  ).sort()) {
    if (!/^\d+_[a-z0-9_]+\.sql$/.test(file))
      throw Error("Unexpected migration file");
    const bytes = await readFile(
      join(platformRoot, "supabase/migrations", file),
    );
    await write("supabase/migrations/" + file, bytes);
    hashes["supabase/migrations/" + file] = createHash("sha256")
      .update(bytes)
      .digest("hex");
  }
  Object.assign(hashes, await copyEdgeSources(target));
  // The loopback-only runner mounts the original entrypoints behind a
  // provider transport fixture. The normal staging packager never calls this.
  const paid = "operations/general-apps/edge/";
  for (const file of [
    "handler.mjs",
    "authorize.mjs",
    "claude-proxy/index.ts",
    "claude-proxy/route.mjs",
    "code-exec/index.ts",
    "code-exec/route.mjs",
  ]) {
    const source = await readFile(join(platformRoot, paid, file));
    await write("supabase/functions/_shared/" + paid + file, source);
    hashes[paid + file] = createHash("sha256").update(source).digest("hex");
  }
  await write(
    "supabase/functions/_shared/mock-paid-provider.mjs",
    await readFile(join(platformRoot, "acceptance/mock-paid-provider.mjs")),
  );
  for (const name of ["claude-proxy", "code-exec"]) {
    await write(
      "supabase/functions/" + name + "/index.ts",
      'import "../_shared/mock-paid-provider.mjs";\nimport "../_shared/' +
        paid +
        name +
        '/index.ts";\n',
    );
  }
  await write("source-checksums.json", JSON.stringify(hashes, null, 2) + "\n");
  return hashes;
}
