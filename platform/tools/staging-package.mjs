import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  realpath,
} from "node:fs/promises";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  validateStagingConfiguration,
  projectNamespace,
} from "../auth/configuration.mjs";
import { copyEdgeSources } from "./edge-package.mjs";

export const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const digest = (data) => createHash("sha256").update(data).digest("hex");
const page = (title, entry, { learner = false } = {}) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${title} · Commonplace staging</title><link rel="stylesheet" href="../admin/studio.css"><link rel="stylesheet" href="../learn/learn.css">${learner ? '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="../../icons/apple-touch-icon.png"><link rel="stylesheet" href="../../Office_work/Excel_study/excel-ribbon.css">' : ""}</head><body><nav class="learn-offline-tools"><span>Commonplace staging</span> · <a href="../auth/index.html?account">Account</a></nav><div id="app"><main class="learn-main learn-panel"><h1>${title}</h1><p>Opening your workspace…</p><p><a href="../auth/index.html">Sign in with Google</a></p></main></div>${learner ? '<script src="../../Office_work/Excel_study/excel-ribbon.js"></script>' : ""}<script type="module" src="${entry}"></script></body></html>`;

// Preparation only: writes an empty external directory; never contacts a backend,
// provisions resources, changes repository config or runs migrations/deployment.
export async function buildStagingPackage({
  output,
  configuration,
  sourceCommit,
}) {
  const config = validateStagingConfiguration(configuration);
  await crypto.subtle.importKey(
    "jwk",
    config.offline_public_jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  if (!/^[a-f0-9]{40}$/.test(sourceCommit))
    throw Error("A source commit is required.");
  const target = resolve(output);
  await mkdir(target, { recursive: true });
  const actualTarget = await realpath(target),
    actualRoot = await realpath(repositoryRoot);
  if (
    actualTarget === actualRoot ||
    actualTarget.startsWith(actualRoot + "/") ||
    (await readdir(target)).length
  )
    throw Error("Choose an empty output directory outside the repository.");
  const files = {},
    publicFiles = new Map();
  const write = async (name, bytes) => {
    await mkdir(dirname(join(target, name)), { recursive: true });
    await writeFile(join(target, name), bytes);
    files[name] = { bytes: Buffer.byteLength(bytes), sha256: digest(bytes) };
  };
  const sdkPackage = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "platform/node_modules/@supabase/supabase-js/package.json",
      ),
    ),
  );
  const dependencies = JSON.parse(
    await readFile(join(repositoryRoot, "platform/package.json")),
  ).dependencies;
  if (sdkPackage.version !== dependencies["@supabase/supabase-js"])
    throw Error("Run npm ci with the committed dependency lock.");
  const sdk = await readFile(
    join(
      repositoryRoot,
      "platform/node_modules/@supabase/supabase-js/dist/umd/supabase.js",
    ),
    "utf8",
  );
  if (!sdk.startsWith("var supabase="))
    throw Error("Review the changed SDK browser bundle before packaging.");
  publicFiles.set(
    "platform/vendor/supabase.mjs",
    Buffer.from(
      sdk.replace(/\/\/# sourceMappingURL=.*$/m, "") +
        "\nexport const createClient = supabase.createClient;\n",
    ),
  );
  publicFiles.set(
    "platform/auth/config.mjs",
    Buffer.from(
      "export const authConfiguration = " + JSON.stringify(config) + ";\n",
    ),
  );
  const deploymentSource = await readFile(
    join(repositoryRoot, "platform/admin/deployment.mjs"),
    "utf8",
  );
  if (!deploymentSource.includes("export const deployment = null;"))
    throw Error("Repository activation changed; review before staging.");
  const deployment = {
    projectNamespace: projectNamespace(config),
    clientModule: "../auth/client.mjs",
    offline: { enabled: true, publicJwk: config.offline_public_jwk },
  };
  publicFiles.set(
    "platform/admin/deployment.mjs",
    Buffer.from(
      deploymentSource.replace(
        "export const deployment = null;",
        "export const deployment = " + JSON.stringify(deployment) + ";",
      ),
    ),
  );
  publicFiles.set(
    "platform/learn/index.html",
    Buffer.from(page("Your learning", "entry.mjs", { learner: true })),
  );
  publicFiles.set(
    "platform/admin/index.html",
    Buffer.from(page("Admin Studio", "entry.mjs")),
  );
  const seen = new Set();
  async function add(name) {
    const full = resolve(repositoryRoot, name);
    if (!full.startsWith(repositoryRoot + "/"))
      throw Error("Public dependency escaped repository.");
    name = relative(repositoryRoot, full).replaceAll("\\", "/");
    if (
      /\b(?:tests|supabase|tools|acceptance|node_modules)\//.test(name) ||
      /(?:preview|sample)(?:[.-]|\/)/.test(name) ||
      !/\.(?:mjs|js|html|css|webmanifest|png)$/.test(name)
    )
      throw Error("Unexpected public dependency: " + name);
    if (seen.has(name)) return;
    seen.add(name);
    const bytes = publicFiles.get(name) || (await readFile(full));
    publicFiles.set(name, bytes);
    if (name.startsWith("platform/vendor/")) return;
    const source = bytes.toString("utf8");
    if (/\.(?:mjs|js)$/.test(name)) {
      for (const m of source.matchAll(
        /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g,
      ))
        await add(relative(repositoryRoot, resolve(dirname(full), m[1])));
    }
    if (name.endsWith(".html")) {
      for (const m of source.matchAll(
        /(?:src|href)="([^"#?:]+\.(?:mjs|js|css|webmanifest|png))"/g,
      ))
        await add(relative(repositoryRoot, resolve(dirname(full), m[1])));
    }
  }
  await add("platform/learn/index.html");
  // Client module uses a reviewed dynamic deployment path, not a literal import.
  await add("platform/auth/client.mjs");
  await add("icons/icon-192.png");
  await add("icons/apple-touch-icon.png");
  const assets = [...seen]
    .sort()
    .map((path) => ({
      path,
      bytes: publicFiles.get(path).length,
      sha256: digest(publicFiles.get(path)),
    }));
  const shellVersion = digest(JSON.stringify(assets)).slice(0, 16);
  await add("platform/admin/index.html");
  await add("platform/auth/index.html");
  await add("platform/learn/sw.js");
  publicFiles.set(
    "platform/learn/shell-manifest.js",
    Buffer.from(
      "/* Generated staging public assets only. */\nself.CP_SHELL=" +
        JSON.stringify({ version: shellVersion, assets }) +
        ";\n",
    ),
  );
  const landing =
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Commonplace staging</title><h1>Commonplace staging</h1><p><a href="/platform/auth/index.html">Sign in with Google</a></p><p><a href="/platform/learn/index.html">Open saved study</a></p></html>\n';
  publicFiles.set("index.html", Buffer.from(landing));
  publicFiles.set("platform/index.html", Buffer.from(landing));
  const apiOrigin = `https://${config.project_ref}.supabase.co`;
  publicFiles.set(
    "_headers",
    Buffer.from(
      `/*\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' ${apiOrigin} wss://${config.project_ref}.supabase.co; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n`,
    ),
  );
  for (const [name, bytes] of publicFiles) await write("public/" + name, bytes);
  await write(
    "public/platform/vendor/LICENSE.supabase",
    await readFile(
      join(
        repositoryRoot,
        "platform/node_modules/@supabase/supabase-js/LICENSE",
      ),
    ),
  );
  const backend = join(target, "server");
  await copyEdgeSources(backend);
  for (const name of (
    await readdir(join(repositoryRoot, "platform/supabase/migrations"))
  ).sort()) {
    if (!/^\d+_[a-z0-9_]+\.sql$/.test(name))
      throw Error("Unexpected migration file.");
    await write(
      "server/supabase/migrations/" + name,
      await readFile(
        join(repositoryRoot, "platform/supabase/migrations", name),
      ),
    );
  }
  await write(
    "server/supabase/config.toml",
    `# Hosted staging function settings only. No automatic remote link.\nproject_id = "commonplace-staging-${config.project_ref}"\n[functions.material-files]\nverify_jwt = true\nimport_map = "./functions/material-files/deno.json"\n[functions.offline-lease]\nverify_jwt = true\nimport_map = "./functions/material-files/deno.json"\n`,
  );
  await write(
    "server/edge.env.example",
    `COMMONPLACE_APP_ORIGIN=${config.origin}\nCOMMONPLACE_PROJECT_NAMESPACE=${projectNamespace(config)}\nCOMMONPLACE_OFFLINE_HOURS=${config.offline_hours}\nCOMMONPLACE_OFFLINE_PRIVATE_JWK=SET_THIS_SERVER_SIDE_ONLY\n`,
  );
  // These are operator review inputs, never browser/offline assets. Accepting a
  // target configuration does not attest the shared project's access rules.
  for (const name of ["shared-project-catalog.sql", "GENERAL-APPS-TARGET.md"])
    await write(
      "server/preflight/" + name,
      await readFile(join(repositoryRoot, "platform/acceptance", name)),
    );
  // Include checksums for the copied Edge graph as well as generated files.
  async function record(dir) {
    for (const entry of await readdir(join(target, dir), {
      withFileTypes: true,
    })) {
      const name = dir + "/" + entry.name;
      if (entry.isDirectory()) await record(name);
      else {
        const bytes = await readFile(join(target, name));
        files[name] = { bytes: bytes.length, sha256: digest(bytes) };
      }
    }
  }
  await record("server");
  const review = {
    version: 1,
    environment: "staging",
    source_commit: sourceCommit,
    origin: config.origin,
    project_ref: config.project_ref,
    backend_scope:
      config.project_ref === "wylxvmkcrexwfpjpbhyy"
        ? "shared-existing"
        : "unverified",
    hosted_readiness: "not-assessed-by-package-builder",
    namespace: projectNamespace(config),
    offline_hours: config.offline_hours,
    sdk_version: sdkPackage.version,
    dependency_lock_sha256: digest(
      await readFile(join(repositoryRoot, "platform/package-lock.json")),
    ),
    shell_version: shellVersion,
    deployed: false,
    migrations_applied: false,
    files,
  };
  await writeFile(
    join(target, "review.json"),
    JSON.stringify(review, null, 2) + "\n",
  );
  await writeFile(
    join(target, "README.txt"),
    "STAGING PREPARATION ONLY — not deployed or approved for learner use.\nPublish only public/ to the reviewed HTTPS origin. Never publish server/.\nUse the repository platform/acceptance/HOSTED-STAGING.md runbook.\nReview server/preflight before hosted writes. General_apps is a shared live project, not a disposable fixture.\nVerify review.json checksums before every deployment. No private signing key is included.\n",
  );
  return review;
}
