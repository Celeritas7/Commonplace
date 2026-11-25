import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { buildStagingPackage } from "../../tools/staging-package.mjs";
import {
  projectNamespace,
  stagingClientOptions,
} from "../../auth/configuration.mjs";
import { createSampleClient } from "../../learn/sample-client.mjs";
import { materialBytes, digest, signLease } from "../../offline/lease.mjs";
const origin = "https://commonplace-staging.example.invalid";
const project = "abcdefghijklmnopqrst";
const api = `https://${project}.supabase.co`;
const owner = "10000000-0000-4000-8000-000000000002";
let output, config, signingKey;
test.beforeAll(async () => {
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  signingKey = keys.privateKey;
  config = {
    version: 1,
    environment: "staging",
    origin,
    project_ref: project,
    publishable_key: "sb_publishable_synthetic_test_only",
    offline_hours: 1,
    offline_public_jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
  };
  output = await mkdtemp(join(tmpdir(), "cp-staging-browser-"));
  await buildStagingPackage({
    output,
    configuration: config,
    sourceCommit: "1".repeat(40),
  });
});
test.afterAll(async () => {
  await rm(output, { recursive: true, force: true });
});

async function harness(context, study) {
  const requests = [],
    unexpected = [],
    errors = [];
  const membership = { role: "learner", status: "active" };
  const user = {
    id: owner,
    aud: "authenticated",
    role: "authenticated",
    email: "synthetic@example.invalid",
    app_metadata: { provider: "google" },
    user_metadata: { role: "administrator" },
    identities: [],
    created_at: new Date().toISOString(),
  };
  const encode = (data) =>
    Buffer.from(JSON.stringify(data)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const token = () =>
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({
      sub: user.id,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + 3600,
      session_id: "10000000-0000-4000-8000-000000000005",
    }) +
    ".synthetic";
  const headersFile = await readFile(join(output, "public/_headers"), "utf8");
  const csp = headersFile
    .split("\n")
    .find((line) => line.includes("Content-Security-Policy:"))
    .split("Content-Security-Policy: ")[1];
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    requests.push({
      url: url.href,
      method: request.method(),
      body: request.postData(),
    });
    if (url.origin === origin) {
      let file = url.pathname.slice(1) || "index.html";
      if (file.endsWith("/")) file += "index.html";
      try {
        const body = await readFile(join(output, "public", file));
        const type = {
          ".html": "text/html",
          ".mjs": "text/javascript",
          ".js": "text/javascript",
          ".css": "text/css",
          ".webmanifest": "application/manifest+json",
          ".png": "image/png",
        }[extname(file)];
        return route.fulfill({
          body,
          contentType: type || "text/plain",
          headers: {
            "Content-Security-Policy": csp,
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
          },
        });
      } catch {
        unexpected.push(url.pathname);
        return route.fulfill({ status: 404 });
      }
    }
    if (url.origin === api) {
      if (url.pathname === "/auth/v1/authorize")
        return route.fulfill({
          contentType: "text/html",
          body: "<h1>Simulated Google handoff</h1>",
        });
      const headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      const json = (body) => route.fulfill({ json: body, headers });
      if (url.pathname === "/auth/v1/token")
        return json({
          access_token: token(),
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "synthetic-refresh",
          user,
        });
      if (request.headers().authorization !== "Bearer " + token())
        return route.fulfill({
          status: 401,
          headers,
          json: { message: "Fixture session expired" },
        });
      if (url.pathname === "/auth/v1/user") return json(user);
      if (url.pathname === "/auth/v1/logout")
        return route.fulfill({ status: 204, headers });
      if (url.pathname === "/rest/v1/cp_memberships")
        return json(
          user.id === owner ? [{ user_id: owner, ...membership }] : [],
        );
      if (study && user.id === owner) {
        if (url.pathname === "/functions/v1/offline-lease")
          return json(study.token);
        if (url.pathname === "/rest/v1/cp_sections")
          return json(study.sample.state.sections);
        if (url.pathname === "/rest/v1/cp_learning_profiles")
          return json([{ profile: study.sample.state.profile }]);
        if (url.pathname === "/rest/v1/rpc/cp_sync_read")
          return json({ revision: "0", value: null });
        if (url.pathname === "/rest/v1/rpc/cp_sync_write") {
          // Keep edits queued on the test device throughout the account round trip.
          return route.fulfill({
            status: 503,
            headers,
            json: { code: "fixture_offline" },
          });
        }
        if (
          [
            "/rest/v1/rpc/cp_read_material",
            "/rest/v1/rpc/cp_learner_materials",
          ].includes(url.pathname)
        ) {
          const r = await study.sample.client.rpc(
            url.pathname.split("/").pop(),
            request.postDataJSON(),
          );
          return json(r.data);
        }
      }
      // The destination workspace has separate acceptance coverage. Return no
      // assignments, never use fixture errors to infer a security boundary.
      if (url.pathname.startsWith("/rest/v1/")) return json([]);
      if (url.pathname.startsWith("/functions/v1/"))
        return route.fulfill({
          status: 403,
          headers,
          json: {
            error: "Synthetic lease is not supplied by this login fixture",
          },
        });
    }
    unexpected.push(url.href);
    await route.abort();
  });
  context.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  return { requests, unexpected, errors, user, membership };
}
async function googleHandoff(page) {
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(
    page.getByRole("heading", { name: "Simulated Google handoff" }),
  ).toBeVisible();
  const authorize = new URL(page.url());
  expect(authorize.searchParams.get("provider")).toBe("google");
  expect(authorize.searchParams.get("code_challenge_method")).toBe("s256");
  expect(authorize.searchParams.get("code_challenge")).toBeTruthy();
  const callback = new URL(authorize.searchParams.get("redirect_to"));
  expect(callback.origin + callback.pathname).toBe(
    origin + "/platform/auth/index.html",
  );
  callback.searchParams.set("code", "synthetic-code");
  callback.searchParams.set("next", "https://untrusted.invalid/admin");
  return callback.href;
}
async function login(page) {
  await page.goto(origin + "/platform/auth/index.html");
  await page.goto(await googleHandoff(page));
  await expect(page).toHaveURL(origin + "/platform/learn/index.html");
}
test("checked-in login stays inactive and never contacts a backend", async ({
  page,
}) => {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  await page.goto("/platform/auth/index.html");
  await expect(
    page.getByText(
      "This test login has not been configured. Existing Commonplace sign-in is unchanged.",
    ),
  ).toBeVisible();
  expect(
    urls.some((url) => url.includes("supabase.co") || url.includes("/vendor/")),
  ).toBe(false);
});
test("packaged SDK completes PKCE before routing using verified membership", async ({
  page,
  context,
}) => {
  const state = await harness(context);
  page.on("pageerror", (error) => state.errors.push(error.message));
  await login(page);
  const exchange = state.requests.find((r) => r.url.includes("/auth/v1/token"));
  expect(JSON.parse(exchange.body).auth_code).toBe("synthetic-code");
  expect(JSON.parse(exchange.body).code_verifier).toBeTruthy();
  expect(state.requests.some((r) => r.url.includes("/auth/v1/user"))).toBe(
    true,
  );
  expect(
    state.requests.some((r) => r.url.includes("user_id=eq." + owner)),
  ).toBe(true);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});
test("provider errors clear callback data and leave a usable login without an automatic loop", async ({
  page,
  context,
}) => {
  const state = await harness(context);
  await page.goto(
    origin +
      "/platform/auth/index.html?error=access_denied&error_description=private-provider-details",
  );
  await expect(page.getByRole("status")).toContainText(
    "Sign-in could not finish",
  );
  await expect(page).toHaveURL(origin + "/platform/auth/index.html");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  expect(await page.locator("body").textContent()).not.toContain(
    "private-provider-details",
  );
  expect(
    state.requests.some(
      (r) =>
        r.url.includes("/auth/v1/authorize") ||
        r.url.includes("/auth/v1/token"),
    ),
  ).toBe(false);
});
test("account page allows signout while retaining saved work and locking offline selection", async ({
  page,
  context,
}) => {
  await harness(context);
  await login(page);
  await expect(
    page.getByRole("button", { name: "Resume saved study", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() =>
    localStorage.setItem("legacy-note", "Keep this study note"),
  );
  await page.goto(origin + "/platform/auth/index.html?account");
  await expect(
    page.getByRole("link", { name: "Continue to your workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Signed out. Your saved work has been kept.",
  );
  const saved = await page.evaluate(
    ({ key, auth }) => ({
      marker: JSON.parse(localStorage.getItem(key)),
      note: localStorage.getItem("legacy-note"),
      session: localStorage.getItem(auth),
    }),
    {
      key: "cp:u8:" + projectNamespace(config) + ":saved-owner",
      auth: stagingClientOptions(config).auth.storageKey,
    },
  );
  expect(saved.marker.unlocked).toBe(false);
  expect(saved.note).toBe("Keep this study note");
  expect(saved.session).toBeNull();
});

for (const [scenario, membership, previous] of [
  ["suspended learner", { role: "learner", status: "suspended" }, owner],
  [
    "administrator with a previous learner selector",
    { role: "administrator", status: "active" },
    "10000000-0000-4000-8000-000000000003",
  ],
]) {
  test(
    "account verification locks offline resume · " + scenario,
    async ({ page, context }) => {
      const state = await harness(context);
      await login(page);
      await expect(
        page.getByRole("button", { name: "Resume saved study", exact: true }),
      ).toBeEnabled();
      const key = "cp:u8:" + projectNamespace(config) + ":saved-owner";
      await page.evaluate(
        ({ key, previous }) => {
          const selector = JSON.parse(localStorage.getItem(key));
          localStorage.setItem(
            key,
            JSON.stringify({ ...selector, owner: previous }),
          );
        },
        { key, previous },
      );
      await page.close();
      Object.assign(state.membership, membership);
      const account = await context.newPage();
      await account.goto(origin + "/platform/auth/index.html?account");
      await expect(account.getByRole("status")).toContainText(
        membership.role === "administrator"
          ? "authorized workspace"
          : "needs to activate",
      );
      await expect(
        account.getByRole("link", { name: "Open saved study" }),
      ).toBeHidden();
      expect(
        await account.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)).unlocked,
          key,
        ),
      ).toBe(false);
      await account.close();
      await context.setOffline(true);
      const cold = await context.newPage();
      await cold.goto(origin + "/platform/learn/index.html");
      await expect(
        cold.getByRole("button", { name: "Resume saved study", exact: true }),
      ).toBeDisabled();
    },
  );
}

test("closing the learner tab and changing Google accounts locks a cold offline reopen and preserves the original pack", async ({
  page,
  context,
}) => {
  const namespace = projectNamespace(config);
  const sample = await createSampleClient();
  const material = {
    ...sample.state.items.get(sample.state.ids.quiz),
    owner_id: owner,
  };
  sample.state.allowed = new Set([material.id]);
  const body = materialBytes(material, owner, "office.excel");
  const hash = await digest(body);
  const issued = Date.now();
  const token = await signLease(
    {
      version: 1,
      namespace,
      origin,
      owner,
      section: "office.excel",
      display_name: "Synthetic learner",
      profile: sample.state.profile,
      issued_at: issued,
      expires_at: issued + 3600000,
      materials: [
        {
          id: material.id,
          version: material.version,
          title: material.payload.title,
          material_type: material.payload.material_type,
          body_sha256: hash,
          body_bytes: Buffer.byteLength(body),
          asset: null,
        },
      ],
    },
    signingKey,
  );
  const state = await harness(context, { sample, token });
  await login(page);
  await expect(page.getByLabel("Your notes", { exact: true })).toBeVisible();
  // Model an existing installation. Use the actual signed pack format and
  // persistent browser stores; the staged learner host reads and validates them.
  await page.evaluate(
    async ({ namespace, owner, token, hash, body, issued }) => {
      const { openOwnedDatabase, ownedKey } = await import(
        "/platform/offline/database.mjs"
      );
      const db = await openOwnedDatabase(namespace);
      await db.put("documents", ownedKey(owner, hash), body);
      await db.put("packs", ownedKey(owner, "office.excel"), {
        token,
        phase: "ready",
        last_seen: issued,
      });
      db.close();
    },
    { namespace, owner, token, hash, body, issued },
  );
  await context.setOffline(true);
  await expect(page.getByText(/Studying saved assignments/)).toBeVisible();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Original offline note");
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(page.locator(".learn-save-status")).toContainText(
    "Saved on this device",
  );
  await expect(
    page.getByRole("button", { name: "Bookmarked", exact: true }),
  ).toBeVisible();
  await page.close();
  await context.setOffline(false);

  const account = await context.newPage();
  await account.goto(origin + "/platform/auth/index.html?account");
  await expect(
    account.getByRole("link", { name: "Continue to your workspace" }),
  ).toBeVisible();
  const callback = await googleHandoff(account);
  // Same-origin storage is inspected from a separate blank static document
  // while the account picker is open, before any callback can perform a lock.
  const observer = await context.newPage();
  await observer.goto(origin + "/icons/icon-192.png");
  const markerKey = "cp:u8:" + namespace + ":saved-owner";
  expect(
    await observer.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).unlocked,
      markerKey,
    ),
  ).toBe(false);
  await observer.close();
  state.user.id = "10000000-0000-4000-8000-000000000003";
  await account.goto(callback);
  await expect(account.getByRole("status")).toContainText("needs to activate");
  await expect(
    account.getByRole("link", { name: "Open saved study" }),
  ).toBeHidden();
  await account.close();

  await context.setOffline(true);
  const cold = await context.newPage();
  const before = state.requests.filter((r) => r.url.startsWith(api)).length;
  await cold.goto(origin + "/platform/learn/index.html");
  await expect(
    cold.getByRole("button", { name: "Resume saved study", exact: true }),
  ).toBeDisabled();
  await expect(cold.locator("[data-private]")).toBeEmpty();
  expect(state.requests.filter((r) => r.url.startsWith(api))).toHaveLength(
    before,
  );
  await cold.close();

  await context.setOffline(false);
  const returning = await context.newPage();
  await returning.goto(origin + "/platform/auth/index.html?account");
  await expect(returning.getByRole("status")).toContainText(
    "needs to activate",
  );
  const back = await googleHandoff(returning);
  state.user.id = owner;
  await returning.goto(back);
  await expect(returning.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Original offline note",
  );
  await returning.close();

  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto(origin + "/platform/learn/index.html");
  await reopened
    .getByRole("button", { name: "Resume saved study", exact: true })
    .click();
  await expect(reopened.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Original offline note",
  );
  await expect(
    reopened.getByRole("button", { name: "Bookmarked", exact: true }),
  ).toBeVisible();
  await expect(reopened.getByText(/change\(s\) waiting to sync/)).toBeVisible();
  expect(state.errors).toEqual([]);
});
