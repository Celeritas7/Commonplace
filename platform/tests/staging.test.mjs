import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  validateStagingConfiguration,
  projectNamespace,
  stagingClientOptions,
} from "../auth/configuration.mjs";
import { finishLogin, lockAndSignOut } from "../auth/login.mjs";
import {
  buildStagingPackage,
  repositoryRoot,
} from "../tools/staging-package.mjs";

const keys = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const config = {
  version: 1,
  environment: "staging",
  origin: "https://commonplace-staging.example.invalid",
  project_ref: "abcdefghijklmnopqrst",
  publishable_key: "sb_publishable_synthetic_test_only",
  offline_hours: 1,
  offline_public_jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
};
test("staging configuration accepts selected General_apps but refuses Technical, secret keys and unsafe overrides", () => {
  assert.equal(
    validateStagingConfiguration(config).project_ref,
    config.project_ref,
  );
  assert.equal(
    validateStagingConfiguration({
      ...config,
      project_ref: "wylxvmkcrexwfpjpbhyy",
    }).project_ref,
    "wylxvmkcrexwfpjpbhyy",
  );
  for (const patch of [
    { environment: "production" },
    { project_ref: "ulgrfumbwjovbjzjiems" },
    { origin: "https://celeritas7.github.io" },
    { origin: "https://commonplace-gamma.vercel.app" },
    { origin: "http://example.invalid" },
    { origin: config.origin + "/path" },
    { origin: "https://user@example.invalid" },
    { publishable_key: "sb_secret_not_a_browser_key" },
    { publishable_key: "eyJhbGciOiJIUzI1NiJ9.synthetic.signature" },
    { clientModule: "https://evil.invalid/payload.mjs" },
    { offline_public_jwk: { ...config.offline_public_jwk, d: "private" } },
    { offline_hours: 0 },
    { offline_hours: 169 },
  ])
    assert.throws(() => validateStagingConfiguration({ ...config, ...patch }));
  assert.equal(stagingClientOptions(config).auth.detectSessionInUrl, false);
  assert.notEqual(
    stagingClientOptions(config).auth.storageKey,
    "sb-" + config.project_ref + "-auth-token",
  );
});
function fixture({
  member = { role: "learner", status: "active" },
  session = true,
  verified = true,
} = {}) {
  const calls = [];
  const client = {
    auth: {
      initialize: async () => {
        calls.push("initialize");
      },
      exchangeCodeForSession: async (code) => {
        calls.push("exchange:" + code);
        return {};
      },
      getSession: async () => ({
        data: {
          session: session
            ? { user: { user_metadata: { role: "administrator" } } }
            : null,
        },
      }),
      getUser: async () => {
        calls.push("verify");
        return { data: { user: verified ? { id: "verified-uuid" } : null } };
      },
      signOut: async () => {
        calls.push("signout");
        return {};
      },
    },
    from(table) {
      assert.equal(table, "cp_memberships");
      return {
        select() {
          return {
            eq(column, id) {
              assert.equal(column, "user_id");
              assert.equal(id, "verified-uuid");
              return { maybeSingle: async () => ({ data: member }) };
            },
          };
        },
      };
    },
  };
  return { client, calls };
}
test("PKCE completion precedes URL cleanup and routing uses verified membership, not metadata or next parameters", async () => {
  const { client, calls } = fixture();
  const result = await finishLogin(client, {
    href:
      config.origin +
      "/platform/auth/index.html?code=synthetic&next=https://evil.invalid",
    replace: (path) => calls.push("replace:" + path),
  });
  assert.deepEqual(calls, [
    "initialize",
    "exchange:synthetic",
    "replace:/platform/auth/index.html?next=https%3A%2F%2Fevil.invalid",
    "verify",
  ]);
  assert.equal(result.path, "/platform/learn/index.html");
  const admin = fixture({
    member: { role: "administrator", status: "active" },
  });
  assert.equal(
    (
      await finishLogin(admin.client, {
        href: config.origin,
        replace: () => {
          throw Error("Unexpected cleanup");
        },
      })
    ).path,
    "/platform/admin/index.html",
  );
});
test("callback failures cannot reuse an old session or expose provider error text", async () => {
  for (const suffix of [
    "?error=denied&error_description=secret-provider-text",
    "?code=a&code=b",
    "#access_token=unexpected&refresh_token=secret",
  ]) {
    const { client, calls } = fixture();
    let cleaned;
    await assert.rejects(
      () =>
        finishLogin(client, {
          href: config.origin + "/platform/auth/index.html" + suffix,
          replace: (path) => {
            cleaned = path;
          },
        }),
      (error) =>
        !error.message.includes("secret") &&
        /Sign-in could not finish/.test(error.message),
    );
    assert.deepEqual(calls, ["initialize"]);
    assert.equal(cleaned, "/platform/auth/index.html");
  }
  const { client, calls } = fixture();
  client.auth.exchangeCodeForSession = async () => ({
    error: { message: "secret-token" },
  });
  await assert.rejects(
    () =>
      finishLogin(client, {
        href: config.origin + "?code=a",
        replace: () => calls.push("cleaned"),
      }),
    /Sign-in could not finish/,
  );
  assert.deepEqual(calls, ["initialize", "cleaned"]);
});
test("inactive, unregistered and unverifiable identities do not get a workspace destination", async () => {
  for (const member of [
    null,
    { role: "learner", status: "revoked" },
    { role: "administrator", status: "suspended" },
    { role: "invented", status: "active" },
  ]) {
    const { client } = fixture({ member });
    assert.deepEqual(
      await finishLogin(client, { href: config.origin, replace: () => {} }),
      { state: "unassigned" },
    );
  }
  await assert.rejects(
    () =>
      finishLogin(fixture({ verified: false }).client, {
        href: config.origin,
        replace: () => {},
      }),
    /verified/,
  );
  assert.deepEqual(
    await finishLogin(fixture({ session: false }).client, {
      href: config.origin,
      replace: () => {},
    }),
    { state: "signed-out" },
  );
});
test("signout locks only this staging owner before a failed request and preserves progress", async () => {
  const { client } = fixture();
  const saved = new Map([
    ["legacy-progress", "keep"],
    ["owned-note", "keep"],
  ]);
  client.auth.signOut = async (options) => {
    assert.deepEqual(options, { scope: "local" });
    assert.equal(
      JSON.parse(
        saved.get("cp:u8:" + projectNamespace(config) + ":saved-owner"),
      ).unlocked,
      false,
    );
    return { error: {} };
  };
  await assert.rejects(
    () =>
      lockAndSignOut(client, config, { setItem: (k, v) => saved.set(k, v) }),
    /Saved study is locked/,
  );
  assert.equal(saved.get("legacy-progress"), "keep");
  assert.equal(saved.get("owned-note"), "keep");
});
test("staging package contains complete hashed public dependencies, separate Edge/migration files and no activation of source", async () => {
  const output = await mkdtemp(join(tmpdir(), "cp-staging-test-"));
  const deployment = await readFile(
    join(repositoryRoot, "platform/admin/deployment.mjs"),
  );
  try {
    const review = await buildStagingPackage({
      output,
      configuration: config,
      sourceCommit: "1".repeat(40),
    });
    assert.equal(review.deployed, false);
    assert.equal(review.migrations_applied, false);
    assert.equal(review.backend_scope, "unverified");
    assert.equal(review.hosted_readiness, "not-assessed-by-package-builder");
    assert.equal(
      Object.keys(review.files).filter((p) =>
        p.startsWith("server/supabase/migrations/"),
      ).length,
      6,
    );
    assert.ok(
      !Object.keys(review.files)
        .filter((p) => p.startsWith("public/"))
        .some((p) => /preview|sample|\.sql$|\/supabase\/|\/tests\//.test(p)),
    );
    for (const [path, meta] of Object.entries(review.files)) {
      const bytes = await readFile(join(output, path));
      assert.equal(bytes.length, meta.bytes);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        meta.sha256,
      );
      if (path.startsWith("server/supabase/migrations/"))
        assert.deepEqual(
          bytes,
          await readFile(
            join(repositoryRoot, "platform", path.slice("server/".length)),
          ),
        );
      if (path.startsWith("server/preflight/"))
        assert.deepEqual(
          bytes,
          await readFile(
            join(
              repositoryRoot,
              "platform/acceptance",
              path.slice("server/preflight/".length),
            ),
          ),
        );
    }
    const manifest = (
      await readFile(
        join(output, "public/platform/learn/shell-manifest.js"),
        "utf8",
      )
    )
      .split("self.CP_SHELL=")[1]
      .slice(0, -2);
    for (const asset of JSON.parse(manifest).assets)
      assert.equal(review.files["public/" + asset.path].sha256, asset.sha256);
    assert.ok(
      !JSON.parse(manifest).assets.some(
        (a) => a.path === "platform/admin/index.html",
      ),
    );
    assert.ok(
      JSON.parse(manifest).assets.some(
        (a) => a.path === "platform/vendor/supabase.mjs",
      ),
    );
    assert.deepEqual(
      await readFile(join(repositoryRoot, "platform/admin/deployment.mjs")),
      deployment,
    );
    assert.match(
      await readFile(join(output, "public/platform/auth/config.mjs"), "utf8"),
      /sb_publishable_/,
    );
    assert.match(
      await readFile(
        join(output, "server/supabase/functions/offline-lease/index.ts"),
        "utf8",
      ),
      /\.\.\/_shared\/offline/,
    );
    await assert.rejects(
      () =>
        buildStagingPackage({
          output,
          configuration: config,
          sourceCommit: "1".repeat(40),
        }),
      /empty output/,
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
test("General_apps review package preserves separate auth storage and marks the backend shared without certifying readiness", async () => {
  const output = await mkdtemp(join(tmpdir(), "cp-general-apps-test-"));
  try {
    const generalApps = { ...config, project_ref: "wylxvmkcrexwfpjpbhyy" };
    const review = await buildStagingPackage({
      output,
      configuration: generalApps,
      sourceCommit: "2".repeat(40),
    });
    assert.equal(review.project_ref, generalApps.project_ref);
    assert.equal(review.backend_scope, "shared-existing");
    assert.equal(review.hosted_readiness, "not-assessed-by-package-builder");
    assert.equal(review.deployed, false);
    assert.equal(review.migrations_applied, false);
    assert.equal(
      stagingClientOptions(generalApps).auth.storageKey,
      "cp:commonplace-staging-wylxvmkcrexwfpjpbhyy:auth",
    );
    for (const name of [
      "shared-project-catalog.sql",
      "GENERAL-APPS-TARGET.md",
      "GENERAL-APPS-REVIEW.md",
    ])
      assert.ok(review.files["server/preflight/" + name]);
    assert.ok(
      !Object.keys(review.files).some((path) =>
        /general-apps\/|shared-access-fixture|capture-recovery/.test(path),
      ),
    );
    assert.ok(
      !Object.keys(review.files).some(
        (path) =>
          path.startsWith("public/") &&
          /preflight|GENERAL-APPS-(TARGET|REVIEW)/.test(path),
      ),
    );
    const source = await readFile(
      join(repositoryRoot, "platform/auth/config.mjs"),
      "utf8",
    );
    assert.match(source, /export const authConfiguration = null;/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
