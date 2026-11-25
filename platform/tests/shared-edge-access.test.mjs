import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { createEdgeHandler } from "../operations/general-apps/edge/handler.mjs";
import { executionRoute } from "../operations/general-apps/edge/code-exec/route.mjs";
import { claudeRoute } from "../operations/general-apps/edge/claude-proxy/route.mjs";

async function harness(name, mode = "allowed", provider, overrides = {}) {
  const counts = { identity: 0, entitlement: 0, budget: 0, provider: 0 };
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
        rpc: async (rpc, args) => {
          assert.equal(rpc, "ga_reserve_edge");
          assert.deepEqual(args, {
            requested_function: name,
            verified_user: "synthetic-user",
          });
          counts.budget++;
          const code = {
            "budget-failure": "XX000",
            withdrawn: "42501",
            capped: "AK210",
          }[mode];
          return {
            data: !code,
            error: code ? { code, message: "private diagnostic" } : null,
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
            error:
              mode === "auth-outage"
                ? { status: 503 }
                : mode === "invalid-user"
                  ? { message: "invalid" }
                  : null,
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
  const route = name === "claude-proxy" ? claudeRoute : executionRoute;
  const handler = createEdgeHandler(
    { ...route, ...overrides },
    createClient,
    (k) => env[k],
    async (url, options) => {
      counts.provider++;
      assert.equal(options.redirect, "error");
      assert.ok(options.signal);
      if (provider) return provider(url, options);
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
  );
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
      ["auth-outage", 503],
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
      budget: 1,
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

const input = (body) =>
  new Request("https://synthetic.invalid/", {
    method: "POST",
    headers: { authorization: "Bearer synthetic-user-token" },
    body: JSON.stringify(body),
  });
test("invalid AI conversations, execution bodies and byte limits cost nothing", async () => {
  for (const [route, body, expected] of [
    ["claude-proxy", { messages: [] }, 400],
    ["claude-proxy", { messages: [{ role: "user", content: null }] }, 400],
    [
      "claude-proxy",
      { messages: [{ role: "user", content: "ok" }], max_tokens: 0 },
      400,
    ],
    [
      "claude-proxy",
      { messages: [{ role: "user", content: "界".repeat(14000) }] },
      413,
    ],
    ["code-exec", null, 400],
    ["code-exec", { source_code: "code", stdin: "x".repeat(32769) }, 413],
  ]) {
    const h = await harness(route);
    assert.equal((await h.handler(input(body))).status, expected);
    assert.equal(h.counts.budget, 0);
    assert.equal(h.counts.provider, 0);
  }
});
test("final reservation can withdraw or cap either route", async () => {
  for (const route of ["claude-proxy", "code-exec"])
    for (const [mode, status] of [
      ["withdrawn", 403],
      ["capped", 429],
      ["budget-failure", 503],
    ]) {
      const h = await harness(route, mode);
      assert.equal((await h.handler(h.request())).status, status);
      assert.equal(h.counts.provider, 0);
    }
});
test("upstream faults are sanitized and only actual C++ outcomes enter grading", async () => {
  for (const payload of [
    {},
    { status: { id: 13, description: "internal" } },
    { status: { id: 1, description: "queued" } },
    { status: { id: 3, description: "ok" }, stdout: "%" },
  ]) {
    const h = await harness("code-exec", "allowed", () =>
      Response.json(payload),
    );
    assert.equal((await h.handler(h.request())).status, 502);
  }
  const h = await harness("code-exec", "allowed", () =>
    Response.json({
      status: { id: 6, description: "Compilation Error" },
      compile_output: btoa("line 2"),
    }),
  );
  assert.equal(
    (await (await h.handler(h.request())).json()).compile_output,
    "line 2",
  );
  for (const route of ["code-exec", "claude-proxy"]) {
    for (const upstream of [
      () => new Response("private diagnostic", { status: 403 }),
      () => {
        throw Error("private diagnostic");
      },
      () => new Response("x".repeat(524289)),
    ]) {
      const h = await harness(route, "allowed", upstream);
      const r = await h.handler(h.request());
      assert.equal(r.status, 502);
      assert.ok(!(await r.text()).includes("private diagnostic"));
    }
  }
});

test("both routes stop reading stalled provider bodies before returning a public error", async () => {
  for (const name of ["code-exec", "claude-proxy"]) {
    let cancelled = false;
    const body = new ReadableStream({
      cancel() {
        cancelled = true;
      },
    });
    const h = await harness(name, "allowed", () => new Response(body), {
      timeoutMs: 15,
    });
    const timer = setTimeout(() => {}, 1000);
    try {
      assert.equal((await h.handler(h.request())).status, 502);
      assert.ok(cancelled);
    } finally {
      clearTimeout(timer);
    }
  }
});

test("C++ playground preserves the draft and grades only terminal learner results", async () => {
  const page = await readFile(
    new URL(
      "../../Coding/c_and_cpp_study/cpp_playground.html",
      import.meta.url,
    ),
    "utf8",
  );
  const run = page.match(/function runCode\(\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(run, "playground run entry point");
  for (const [id, expected] of [
    [3, [true]],
    [6, [false]],
    [13, []],
    [undefined, []],
  ]) {
    const h = await harness("code-exec", "allowed", () =>
      Response.json({ status: { id, description: "fixture" } }),
    );
    const attempts = [],
      source = "int main(){}";
    let finish;
    const finished = new Promise((resolve) => {
      finish = resolve;
    });
    const controls = new Map();
    const button = {
      set disabled(value) {
        if (!value) finish();
      },
    };
    const ui = {
      navigator: { onLine: true },
      currentUser: { id: "fixture" },
      activeExercise: null,
      cm: { getValue: () => source },
      setStatus() {},
      showGrade() {},
      esc: (s) => s,
      $: (key) => {
        if (key === "run-btn") return button;
        if (!controls.has(key)) controls.set(key, {});
        return controls.get(key);
      },
      sb: {
        functions: {
          invoke: async (name, { body }) => {
            assert.equal(name, "code-exec");
            assert.equal(body.source_code, source);
            const response = await h.handler(input(body));
            return response.ok
              ? { data: await response.json() }
              : { error: { context: response } };
          },
        },
      },
      saveAttempt: (row) => {
        attempts.push(row.passed);
      },
    };
    runInNewContext(run + ";runCode()", ui);
    await finished;
    assert.deepEqual(attempts, expected);
    if (!expected.length)
      assert.match(controls.get("term").innerHTML, /no usable result/);
  }
});
