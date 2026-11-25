import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { authorizeEdge } from "../operations/general-apps/edge/authorize.mjs";

async function harness(name, mode = "allowed") {
  const counts = { identity: 0, entitlement: 0, budget: 0, provider: 0 };
  let handler;
  const source = await readFile(
    new URL(
      `../operations/general-apps/edge/${name}/index.ts`,
      import.meta.url,
    ),
    "utf8",
  );
  const env = {
    SUPABASE_URL: "https://synthetic.invalid",
    SUPABASE_ANON_KEY: "synthetic-public-key",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-key",
    ANTHROPIC_API_KEY: "synthetic-ai-key",
    JUDGE0_RAPIDAPI_KEY: "synthetic-execution-key",
  };
  const createClient = (_url, key, options) => {
    if (key === env.SUPABASE_SERVICE_ROLE_KEY)
      return {
        rpc: async (rpc) => {
          assert.equal(rpc, "akatsuki_fn_budget_take");
          counts.budget++;
          return {
            error:
              mode === "budget-failure"
                ? { message: "synthetic failure", code: "XX000" }
                : null,
          };
        },
      };
    assert.equal(key, env.SUPABASE_ANON_KEY);
    assert.equal(
      options.global.headers.Authorization,
      "Bearer synthetic-user-token",
    );
    return {
      auth: {
        getUser: async (token) => {
          assert.equal(token, "synthetic-user-token");
          counts.identity++;
          return {
            error: mode === "invalid-user" ? { message: "invalid" } : null,
            data: {
              user: {
                id: "synthetic-user",
                is_anonymous: mode === "anonymous-user",
                user_metadata: { role: "administrator" },
              },
            },
          };
        },
      },
      rpc: async (rpc, args) => {
        assert.equal(rpc, "ga_can_call_edge");
        assert.deepEqual({ ...args }, { requested_function: name });
        counts.entitlement++;
        if (mode === "network-failure") throw Error("private provider error");
        return {
          error: mode === "rpc-failure" ? { message: "failure" } : null,
          data:
            mode === "unentitled"
              ? false
              : mode === "malformed-result"
                ? "true"
                : true,
        };
      },
    };
  };
  const script = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ""));
  vm.runInNewContext(script, {
    createClient,
    authorizeEdge,
    Response,
    Request,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    Deno: {
      env: { get: (key) => env[key] },
      serve: (fn) => {
        handler = fn;
      },
    },
    console: { warn: () => {} },
    fetch: async () => {
      counts.provider++;
      return Response.json(
        name === "claude-proxy"
          ? { content: [{ type: "text", text: "Synthetic answer" }] }
          : {
              stdout: btoa("ok"),
              status: { id: 3, description: "Accepted" },
              exit_code: 0,
            },
      );
    },
  });
  const request = (
    headers = { authorization: "Bearer synthetic-user-token" },
    method = "POST",
  ) =>
    new Request("https://synthetic.invalid/edge", {
      method,
      headers: { ...headers, "content-type": "application/json" },
      ...(method === "POST"
        ? {
            body: JSON.stringify(
              name === "claude-proxy"
                ? { messages: [{ role: "user", content: "synthetic" }] }
                : { source_code: "int main(){}", stdin: "" },
            ),
          }
        : {}),
    });
  return { handler, counts, request };
}
for (const name of ["claude-proxy", "code-exec"]) {
  test(`${name} rejects unauthorized callers before budget or paid execution`, async () => {
    for (const [mode, status] of [
      ["invalid-user", 401],
      ["anonymous-user", 401],
      ["unentitled", 403],
      ["rpc-failure", 503],
      ["network-failure", 503],
      ["malformed-result", 403],
    ]) {
      const h = await harness(name, mode);
      const r = await h.handler(h.request());
      assert.equal(r.status, status, mode);
      assert.equal(h.counts.provider, 0);
      assert.equal(h.counts.budget, 0);
    }
    for (const headers of [
      { "x-cs-secret": "public-client-secret" },
      { authorization: "Bearer sb_publishable_not_a_user" },
      {},
    ]) {
      const h = await harness(name);
      assert.equal((await h.handler(h.request(headers))).status, 401);
      assert.deepEqual(h.counts, {
        identity: 0,
        entitlement: 0,
        budget: 0,
        provider: 0,
      });
    }
  });
  test(`${name} retains its permitted request contract and harmless preflight`, async () => {
    const h = await harness(name);
    const response = await h.handler(h.request());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(
      name === "claude-proxy" ? body.content[0].text : body.stdout,
      name === "claude-proxy" ? "Synthetic answer" : "ok",
    );
    assert.deepEqual(h.counts, {
      identity: 1,
      entitlement: 1,
      budget: name === "claude-proxy" ? 1 : 0,
      provider: 1,
    });
    const preflight = await harness(name);
    assert.equal(
      (await preflight.handler(preflight.request({}, "OPTIONS"))).status,
      200,
    );
    assert.equal(
      (await preflight.handler(preflight.request({}, "GET"))).status,
      405,
    );
    assert.deepEqual(preflight.counts, {
      identity: 0,
      entitlement: 0,
      budget: 0,
      provider: 0,
    });
  });
}
test("authorized AI request still fails closed if the existing budget check fails", async () => {
  const h = await harness("claude-proxy", "budget-failure");
  assert.equal((await h.handler(h.request())).status, 503);
  assert.equal(h.counts.budget, 1);
  assert.equal(h.counts.provider, 0);
});
