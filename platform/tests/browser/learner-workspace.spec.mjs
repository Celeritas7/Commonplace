import { test, expect } from "@playwright/test";
async function install(page, query = "", path = "/platform/learn/index.html") {
  await page.goto(path + query);
  await page.evaluate(async () => {
    const { createSampleClient } = await import(
      "/platform/learn/sample-client.mjs"
    );
    const { createAccountStore } = await import(
      "/platform/lib/account-store.mjs"
    );
    const { mountLearningWorkspace } = await import(
      "/platform/learn/workspace.mjs"
    );
    const f = await createSampleClient();
    window.u7 = f;
    f.store = createAccountStore(localStorage, "browser-u7");
    f.dispose = mountLearningWorkspace(document.querySelector("#app"), {
      enabled: true,
      client: f.client,
      store: f.store,
    });
  });
  await expect(
    page.getByRole("heading", { name: "Excel Study", exact: true }),
  ).toBeVisible();
}
const formula = (page) => page.getByLabel("Formula for B5", { exact: true });
test("Excel-only learner opens personalized materials using the existing Ribbon, with no other sections or admin tools", async ({
  page,
}) => {
  await install(page);
  await expect(
    page.getByRole("heading", {
      name: "Prepare a shipment to Manila",
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Admin Studio", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("a")).toHaveCount(0);
  await expect(page.getByText("VBA and Macros", { exact: true })).toHaveCount(
    0,
  );
  await page.getByText("Your learning focus", { exact: true }).click();
  await expect(page.locator(".learn-profile")).toContainText(
    "Sales follow-ups",
  );
  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await page.getByRole("button", { name: "AutoSum", exact: true }).click();
  await expect(page.locator(".excel-note")).toContainText("location preview");
  await formula(page).fill("=SUM(B2:B4)");
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("25");
  await expect(page.locator(".learn-completion")).toHaveText("Studied");
  await page.getByLabel("B2, Used cameras", { exact: true }).fill("20");
  await expect(page.locator(".learn-completion")).toHaveText("In progress");
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("33");
  await formula(page).fill("=1+2");
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await expect(page.locator(".assigned-feedback")).toContainText("Enter =SUM");
});
test("same-owner refresh preserves work; account changes clear it and isolate persistent notes and completion", async ({
  page,
}) => {
  await install(page);
  await page.evaluate(() =>
    localStorage.setItem("commonplace_excel_preview_v1", "keep my old work"),
  );
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("A private inventory note");
  await page.getByRole("button", { name: "Bookmark", exact: true }).click();
  await formula(page).fill("=SUM(B2:B4)");
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await page.evaluate(() => u7.state.emit("TOKEN_REFRESHED"));
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "A private inventory note",
  );
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "A private inventory note",
  );
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("25");
  await expect(
    page.getByRole("button", { name: "Bookmarked", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() =>
    u7.state.emit("SIGNED_IN", "10000000-0000-4000-8000-000000000003"),
  );
  await expect(page.locator("[data-private]")).toBeEmpty();
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("—");
  await page.evaluate(() =>
    u7.state.emit("SIGNED_IN", "10000000-0000-4000-8000-000000000002"),
  );
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "A private inventory note",
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("commonplace_excel_preview_v1"),
    ),
  ).toBe("keep my old work");
});
test("quiz responses restore per published version, without exposing unreleased answer sheets", async ({
  page,
}) => {
  await install(page);
  await expect(
    page.getByRole("button", { name: /SUM answer sheet/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Check your SUM knowledge/ }).click();
  await expect(
    page.getByRole("button", { name: "Mark as studied", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("=SUM(B2:B4)", { exact: true }).check();
  await page
    .getByRole("button", { name: "Mark as studied", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Prepare a shipment to Manila/ })
    .click();
  await page.getByRole("button", { name: /Check your SUM knowledge/ }).click();
  await expect(page.getByLabel("=SUM(B2:B4)", { exact: true })).toBeChecked();
  await expect(page.locator(".learn-completion")).toHaveText("Studied");
  await page.evaluate(() => {
    u7.state.allowed.add(u7.state.ids.answers);
  });
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await page.getByRole("button", { name: /SUM answer sheet/ }).click();
  await expect(page.locator(".learn-content")).toContainText("SUM adds them.");
});
test("file downloads require fresh access and a delayed response cannot download after an account switch", async ({
  page,
}) => {
  await install(page);
  await page.getByRole("button", { name: /Inventory practice file/ }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download tutorial", exact: true })
    .click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe("Inventory-practice.txt");
  let late = 0;
  page.on("download", () => late++);
  await page.evaluate(() => {
    u7.state.hooks.download = () =>
      new Promise((resolve) => {
        u7.releaseDownload = resolve;
      });
  });
  await page
    .getByRole("button", { name: "Download tutorial", exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => !!u7.releaseDownload)).toBe(true);
  await page.evaluate(() => {
    u7.state.emit("SIGNED_IN", "10000000-0000-4000-8000-000000000003");
    u7.releaseDownload();
  });
  await expect(page.locator("[data-private]")).toBeEmpty();
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Excel Study", exact: true }),
  ).toBeVisible();
  expect(late).toBe(0);
});
test("revoked materials, denied sections and offline transitions never fall back to public examples", async ({
  page,
}) => {
  await install(page);
  await page.getByLabel("Your notes", { exact: true }).fill("Keep this note");
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(page.locator("[data-notice]")).toContainText(
    "Connect to the internet",
  );
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Keep this note",
  );
  await page.evaluate(() => u7.state.allowed.delete(u7.state.ids.sum));
  await page
    .getByRole("button", { name: /Prepare a shipment to Manila/ })
    .click();
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(page.locator("[data-notice]")).toContainText("unavailable");
  await page.evaluate(() => {
    u7.state.sections = [];
  });
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(page.locator("[data-notice]")).toContainText(
    "section is unavailable",
  );
  await expect(page.locator("[data-excel-simulator]")).toHaveCount(0);
});
test("a late material read cannot reinsert private content after sign-out", async ({
  page,
}) => {
  await install(page);
  await page.evaluate(() => {
    u7.state.hooks.cp_read_material = () =>
      new Promise((resolve) => (u7.releaseRead = resolve));
  });
  await page.getByRole("button", { name: /Check your SUM knowledge/ }).click();
  await expect.poll(() => page.evaluate(() => !!u7.releaseRead)).toBe(true);
  await page.evaluate(() => {
    u7.state.emit("SIGNED_OUT");
    u7.releaseRead();
  });
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(page.locator("[data-notice]")).toContainText("Account changed");
});
test("direct material URLs do not reveal unassigned content and callback fragments are preserved", async ({
  page,
}) => {
  await install(
    page,
    "?section=office.excel&material=20000000-0000-4000-8000-000000000004#access_token=synthetic-return",
  );
  await expect(page.locator(".learn-reader")).toContainText(
    "requested material is unavailable",
  );
  await expect(page.locator(".learn-content")).toHaveCount(0);
  expect(await page.evaluate(() => location.hash)).toBe(
    "#access_token=synthetic-return",
  );
  await page
    .getByRole("button", { name: /Prepare a shipment to Manila/ })
    .click();
  await expect(formula(page)).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe(
    "#access_token=synthetic-return",
  );
});
test("imported text stays inert and the personalized worksheet fits phone and iPad widths", async ({
  page,
}) => {
  await install(page, "", "/platform/");
  await page.evaluate(() => {
    const m = u7.state.items.get(u7.state.ids.sum);
    m.payload.content.bundle.scenario.context =
      '<img src=x onerror="window.executed=true">';
    m.payload.content.bundle.dataset.rows[0][0] =
      "LongUnbrokenProductName".repeat(12);
    u7.state.profile.occupation = "<script>window.executed=true</script>";
  });
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(formula(page)).toBeVisible();
  await expect(
    page.locator(
      ".learn-content img,.learn-content script,.learn-profile script",
    ),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.executed)).toBeUndefined();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Apply formula", exact: true }),
    ).toBeVisible();
  }
  await formula(page).fill("=SUM(B2:B4)");
  await page
    .getByRole("button", { name: "Apply formula", exact: true })
    .click();
  await expect(page.getByLabel("B5 total", { exact: true })).toHaveText("25");
});
test("the live platform entries remain disabled regardless of URL or local role claims", async ({
  page,
}) => {
  await page.goto("/platform/learn/index.html?section=office.excel");
  await page.evaluate(() => localStorage.setItem("role", "administrator"));
  await page.reload();
  await expect(
    page.getByText("Live learner access has not been activated.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator("[data-private]")).toHaveCount(0);
  await page.goto("/platform/");
  await expect(
    page.getByText("The new multi-user platform is not activated.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("save failures are visible and keep the previous saved work", async ({
  page,
}) => {
  await install(page);
  await page.getByLabel("Your notes", { exact: true }).fill("Last saved note");
  await page.evaluate(() => {
    u7.originalPut = u7.store.put;
    u7.store.put = () => {
      throw Error("Quota exceeded");
    };
  });
  await page.getByLabel("Your notes", { exact: true }).fill("Unsaved note");
  await expect(page.locator(".learn-save-status")).toContainText(
    "could not be saved",
  );
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Unsaved note",
  );
  await page.evaluate(() => (u7.store.put = u7.originalPut));
  await page
    .getByRole("button", { name: "Refresh access", exact: true })
    .click();
  await expect(page.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Last saved note",
  );
});
test("foreground revalidation closes a revoked account instead of keeping its private view", async ({
  page,
}) => {
  await install(page);
  await expect(formula(page)).toBeVisible();
  await page.evaluate(() => {
    u7.state.status = "revoked";
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.locator("[data-private]")).toBeEmpty();
  await expect(page.locator("[data-notice]")).toContainText(
    "could not be verified",
  );
});
