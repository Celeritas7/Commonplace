import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Same source package for runner-local verification and reviewed hosted staging.
export async function copyEdgeSources(target) {
  const hashes = {};
  const write = async (path, body) => {
    const full = join(target, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body);
  };
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
  return hashes;
}
