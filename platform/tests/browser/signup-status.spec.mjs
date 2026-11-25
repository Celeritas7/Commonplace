import { test, expect } from "@playwright/test";

async function fixture(page, status = "paused") {
  await page.goto("/platform/admin/");
  await page.evaluate(async (status) => {
    const { mountAdminStudio } = await import("/platform/admin/studio.mjs");
    const { createAdminAPI } = await import("/platform/admin/api.mjs");
    const state = (window.signupStatusTest = {
      user: "synthetic-admin",
      statusReply: { data: { status } },
      rows: [],
      calls: [],
      statusCalls: 0,
    });
    const client = {
      auth: {
        getUser: async () => ({ data: { user: { id: state.user } } }),
        onAuthStateChange(fn) {
          state.event = fn;
          return { data: { subscription: { unsubscribe() {} } } };
        },
      },
      async rpc(name, args) {
        state.calls.push({ name, args });
        if (name === "cp_admin_directory")
          return { data: { members: [], sections: [] } };
        if (name === "cp_admin_signup_status") {
          state.statusCalls++;
          const reply = structuredClone(state.statusReply);
          if (state.holdStatus)
            await new Promise((resolve) => {
              state.releaseStatus = resolve;
            });
          if (state.networkError) throw Error("Synthetic network interruption");
          return reply;
        }
        if (name === "cp_admin_signup_directory") {
          if (state.directoryError)
            return { error: { code: state.directoryError } };
          return { data: structuredClone(state.rows) };
        }
        if (name === "cp_admin_prepare_signup") {
          state.rows.push({
            id: "synthetic-request",
            revision: 1,
            email: args.login_email,
            state: "pending",
            expires_at: "2027-01-01T00:00:00Z",
          });
          return { data: "synthetic-request" };
        }
        throw Error("Unexpected RPC: " + name);
      },
    };
    const root = document.createElement("div");
    document.body.replaceChildren(root);
    mountAdminStudio(
      root,
      createAdminAPI({ client, enabled: true, online: () => true }),
    );
  }, status);
  await page
    .getByRole("button", { name: "Signup requests", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reload signup requests" }),
  ).toBeEnabled();
}
const banner = (page) =>
  page.getByRole("status", { name: "Signup availability" });
const reload = (page) =>
  page.getByRole("button", { name: "Reload signup requests" });

test("paused signup is visible before any requests and remains paused after preparation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await expect(banner(page)).toContainText("Signup paused");
  await expect(banner(page)).toContainText(
    "preparing a request does not enable signup",
  );
  await expect(page.getByText("No signup requests.")).toBeVisible();
  await page.getByLabel("Login email").fill("new-learner@example.invalid");
  await page.getByRole("button", { name: "Prepare 24-hour request" }).click();
  await expect(
    page.getByRole("heading", { name: "new-learner@example.invalid" }),
  ).toBeVisible();
  await expect(banner(page)).toContainText("Signup paused");
  expect(await page.evaluate(() => window.signupStatusTest.statusCalls)).toBe(
    2,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: /enable signup/i }),
  ).toHaveCount(0);
});

test("reload replaces a previously enabled status and same-owner refresh preserves the check", async ({
  page,
}) => {
  await fixture(page, "enabled");
  await expect(banner(page)).toContainText("approved, unexpired request");
  await page.evaluate(() => {
    window.signupStatusTest.statusReply = { data: { status: "paused" } };
    window.signupStatusTest.holdStatus = true;
  });
  await reload(page).click();
  await expect(banner(page)).toContainText("Checking signup status");
  await expect(banner(page)).not.toContainText("Signup enabled");
  expect(await banner(page).evaluate(node => !!node.closest("[inert]"))).toBe(false);
  await expect(page.locator("[data-managed-editor]")).toHaveAttribute("inert", "");
  await expect(reload(page)).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => !!window.signupStatusTest.releaseStatus))
    .toBe(true);
  await page.evaluate(() => {
    const state = window.signupStatusTest;
    state.event("TOKEN_REFRESHED", { user: { id: state.user } });
    state.releaseStatus();
  });
  await expect(banner(page)).toContainText("Signup paused");
  await expect(reload(page)).toBeEnabled();
});

test("missing, malformed and failed status reads never leave a stale enabled banner", async ({
  page,
}) => {
  await fixture(page, "enabled");
  for (const failure of [
    { statusReply: { error: { code: "PGRST202" } } },
    { statusReply: { data: { status: "unavailable" } } },
    { statusReply: { data: { enabled: true } } },
    { statusReply: { data: { status: true } } },
    { networkError: true },
  ]) {
    await page.evaluate(
      (failure) => Object.assign(window.signupStatusTest, failure),
      failure,
    );
    await reload(page).click();
    await expect(banner(page)).toContainText("Signup status unavailable");
    await expect(banner(page)).not.toContainText("Signup enabled");
    await expect(
      page.getByRole("button", { name: "Prepare 24-hour request" }),
    ).toBeEnabled();
    await page.evaluate(() =>
      Object.assign(window.signupStatusTest, {
        statusReply: { data: { status: "enabled" } },
        networkError: false,
      }),
    );
    await reload(page).click();
    await expect(banner(page)).toContainText("Signup enabled");
  }
});

test("directory failure clears rows and enabled status until a successful reload", async ({
  page,
}) => {
  await fixture(page, "enabled");
  await page.evaluate(() => {
    window.signupStatusTest.directoryError = "PGRST202";
  });
  await reload(page).click();
  await expect(banner(page)).toContainText("Signup status unavailable");
  await expect(
    page.getByText("Signup requests are unavailable on this installation."),
  ).toBeVisible();
  await expect(page.getByLabel("Login email")).toHaveCount(0);
  await page.evaluate(() => {
    window.signupStatusTest.directoryError = null;
  });
  await reload(page).click();
  await expect(banner(page)).toContainText("Signup enabled");
});

for (const target of ["status", "directory"]) {
  test(`${target} permission denial clears the entire private workspace`, async ({
    page,
  }) => {
    await fixture(page, "enabled");
    await page.evaluate((target) => {
      if (target === "status")
        window.signupStatusTest.statusReply = { error: { code: "42501" } };
      else window.signupStatusTest.directoryError = "42501";
    }, target);
    await reload(page).click();
    await expect(page.locator("#workspace")).toBeEmpty();
    await expect(
      page.getByRole("button", { name: "Reload access" }),
    ).toBeEnabled();
  });
}

for (const event of ["SIGNED_OUT", "SIGNED_IN", "offline"]) {
  test(`a late enabled result cannot restore private data after ${event}`, async ({
    page,
  }) => {
    await fixture(page, "enabled");
    await page.evaluate(() => {
      window.signupStatusTest.holdStatus = true;
    });
    await reload(page).click();
    await expect
      .poll(() => page.evaluate(() => !!window.signupStatusTest.releaseStatus))
      .toBe(true);
    await page.evaluate((event) => {
      const state = window.signupStatusTest;
      if (event === "offline") window.dispatchEvent(new Event("offline"));
      else {
        state.user = event === "SIGNED_OUT" ? null : "another-synthetic-user";
        state.event(event, state.user ? { user: { id: state.user } } : null);
      }
      state.releaseStatus();
    }, event);
    await expect(page.locator("#workspace")).toBeEmpty();
    await expect(banner(page)).toHaveCount(0);
    // Let both the API rejection and the panel's disposal guard finish.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    await expect(page.locator("#workspace")).toBeEmpty();
  });
}
