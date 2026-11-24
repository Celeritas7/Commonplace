import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, relative, dirname, join } from "node:path";
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
  // Both function entries and their actual shared dependency graph are packaged
  // below functions/. This is compatible with the local Edge runtime mount.
  const seen = new Set();
  async function dependency(path) {
    path = resolve(path);
    if (!path.startsWith(platformRoot + "/") || !path.endsWith(".mjs"))
      throw Error("Unexpected Edge dependency");
    if (seen.has(path)) return;
    seen.add(path);
    const source = await readFile(path, "utf8"),
      name = relative(platformRoot, path).replaceAll("\\", "/");
    await write("supabase/functions/_shared/" + name, source);
    hashes[name] = createHash("sha256").update(source).digest("hex");
    for (const m of source.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g,
    ))
      await dependency(resolve(dirname(path), m[1]));
  }
  const imports = await readFile(
    join(platformRoot, "supabase/functions/material-files/deno.json"),
    "utf8",
  );
  for (const name of ["material-files", "offline-lease"]) {
    const entry = join(platformRoot, "supabase/functions", name, "index.ts"),
      source = await readFile(entry, "utf8");
    let output = source;
    for (const m of source.matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
      const path = resolve(dirname(entry), m[1]);
      await dependency(path);
      output = output.replace(
        m[1],
        "../_shared/" + relative(platformRoot, path).replaceAll("\\", "/"),
      );
    }
    await write(`supabase/functions/${name}/index.ts`, output);
    await write(`supabase/functions/${name}/deno.json`, imports);
    hashes[`supabase/functions/${name}/index.ts`] = createHash("sha256")
      .update(source)
      .digest("hex");
  }
  await write("source-checksums.json", JSON.stringify(hashes, null, 2) + "\n");
  return hashes;
}
