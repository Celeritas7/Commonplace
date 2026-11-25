import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdminAPI } from "../admin/api.mjs";

function fixture() {
  const state = {
    online: true,
    calls: [],
    result: { data: { status: "paused" } },
  };
  const client = {
    auth: {
      async getUser() {
        return { data: { user: { id: "synthetic-admin" } } };
      },
      onAuthStateChange(fn) {
        state.event = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
    async rpc(name, args) {
      state.calls.push({ name, args });
      if (state.hold) await state.hold;
      return state.result;
    },
  };
  state.api = createAdminAPI({
    client,
    enabled: true,
    online: () => state.online,
  });
  return state;
}

test("signup status sends no claimed identity or role and accepts only the explicit status contract", async () => {
  const f = fixture();
  for (const status of ["enabled", "paused", "unavailable"]) {
    f.result = { data: { status } };
    assert.equal(await f.api.signupStatus(), status);
    assert.deepEqual(f.calls.at(-1), {
      name: "cp_admin_signup_status",
      args: {},
    });
  }
  for (const data of [
    null,
    true,
    "enabled",
    {},
    { enabled: true },
    { status: true },
    { status: "true" },
    { status: "ENABLED" },
  ]) {
    f.result = { data };
    await assert.rejects(() => f.api.signupStatus(), /unavailable/);
  }
  f.api.dispose();
});

test("signup status preserves server denial and offline/account-switch protection", async () => {
  const f = fixture();
  f.online = false;
  await assert.rejects(() => f.api.signupStatus(), /internet/);
  assert.equal(f.calls.length, 0);
  f.online = true;
  for (const code of ["42501", "PGRST202"]) {
    f.result = { error: { code } };
    await assert.rejects(() => f.api.signupStatus(), { code });
  }
  f.result = { data: { status: "enabled" } };
  let release;
  f.hold = new Promise((resolve) => {
    release = resolve;
  });
  const pending = f.api.signupStatus();
  await Promise.resolve();
  f.event("SIGNED_IN", { user: { id: "different-synthetic-user" } });
  release();
  await assert.rejects(() => pending, /Account changed/);
  f.api.dispose();
  await assert.rejects(() => f.api.signupStatus(), /internet/);
});
