import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { buildStagingPackage } from "../../tools/staging-package.mjs";
import {
  projectNamespace,
  stagingClientOptions,
} from "../../auth/configuration.mjs";
const origin = "https://commonplace-staging.example.invalid";
const project = "abcdefghijklmnopqrst";
const api = `https://${project}.supabase.co`;
const owner = "10000000-0000-4000-8000-000000000002";
let output, config;
test.beforeAll(async () => {
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
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

async function harness(context) {
  const requests = [],
    unexpected = [],
    errors = [];
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
  const token =
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({
      sub: owner,
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
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "synthetic-refresh",
          user,
        });
      if (url.pathname === "/auth/v1/user") return json(user);
      if (url.pathname === "/auth/v1/logout")
        return route.fulfill({ status: 204, headers });
      if (url.pathname === "/rest/v1/cp_memberships")
        return json([{ role: "learner", status: "active" }]);
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
  return { requests, unexpected, errors };
}
async function login(page) {
  await page.goto(origin + "/platform/auth/index.html");
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
  await page.goto(callback.href);
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
  await page.evaluate(
    ({ key, owner }) => {
      localStorage.setItem("legacy-note", "Keep this study note");
      localStorage.setItem(key, JSON.stringify({ owner, unlocked: true }));
    },
    { key: "cp:u8:" + projectNamespace(config) + ":saved-owner", owner },
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
