import { test, expect } from "@playwright/test";
test("a saved draft survives a failed refresh without showing a false success or creating a duplicate", async ({
  page,
}) => {
  await page.evaluate(async () => {
    const { mountMaterialLibrary } = await import(
      "/platform/admin/material-library.mjs"
    );
    const { materialPreviewAPI } = await import(
      "/platform/materials/preview-api.mjs"
    );
    const api = materialPreviewAPI(() => []),
      read = api.material;
    let failOnce = true;
    api.material = async (id) => {
      if (failOnce) {
        failOnce = false;
        throw Error("Connection lost while refreshing material.");
      }
      return read(id);
    };
    const root = document.createElement("main");
    document.body.replaceChildren(root);
    mountMaterialLibrary(root, api, {
      sections: [{ id: "office.excel", title: "Excel Study", kind: "section" }],
      members: [],
    });
  });
  await page
    .getByLabel("Material title", { exact: true })
    .fill("Saved during interruption");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".notice.error")).toContainText("Connection lost");
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reload library", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 1 · draft", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Saved during interruption · v1 · draft",
      exact: true,
    }),
  ).toHaveCount(1);
});
test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/platform/admin/preview.html");
  await page
    .getByRole("button", { name: "Material library", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeVisible();
});
test("central library creates, previews, publishes, assigns, versions and archives without changing study access", async ({
  page,
}) => {
  await page
    .getByLabel("Material title", { exact: true })
    .fill("Shipment inventory");
  await page
    .getByRole("button", { name: "Excel SUM example", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preview draft", exact: true })
    .click();
  await expect(page.locator(".material-preview")).toContainText(
    "Prepare a shipment to Manila",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Version 1 · draft", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish reviewed version", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save assignments", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "I reviewed this saved content and any attached file.",
    })
    .check();
  await page
    .getByRole("button", { name: "Publish reviewed version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 1 · published", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Material title", { exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Assigned learners", { exact: true })
    .selectOption("preview-learner");
  await page
    .getByRole("button", { name: "Save assignments", exact: true })
    .click();
  await expect(
    page.getByLabel("Assigned learners", { exact: true }),
  ).toHaveValues(["preview-learner"]);
  await page
    .getByRole("button", { name: "Create next draft version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 2 · draft", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Assigned learners", { exact: true }),
  ).toHaveValues([]);
  await page
    .getByRole("button", {
      name: "Shipment inventory · v1 · published",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Archive version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 1 · archived", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "People & access", exact: true })
    .click();
  await page.getByRole("button", { name: /Sample learner/ }).click();
  await expect(page.locator(".access-preview")).toContainText(
    "Direct landing: Excel Study",
  );
  await expect(page.locator(".access-preview")).not.toContainText("VBA");
});
test("imports remain drafts, unsafe fields are rejected and imported code is rendered as text on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const payload = {
    schema_version: 1,
    title: "Imported practice",
    section_id: "office.excel",
    material_type: "practice",
    content: {
      format: "document",
      blocks: [
        { kind: "paragraph", text: '<img src=x onerror="window.pwned=true">' },
        { kind: "code", language: "javascript", text: "window.pwned=true;" },
      ],
    },
  };
  await page.getByLabel("Import material JSON", { exact: true }).setInputFiles({
    name: "unsafe.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...payload, state: "published" })),
  });
  await expect(page.locator(".notice.error")).toContainText("unsupported");
  await page.getByLabel("Import material JSON", { exact: true }).setInputFiles({
    name: "lesson.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(page.getByLabel("Material title", { exact: true })).toHaveValue(
    payload.title,
  );
  await page
    .getByRole("button", { name: "Preview draft", exact: true })
    .click();
  await expect(
    page.locator(".material-preview img,.material-preview script"),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Version 1 · draft", exact: true }),
  ).toBeVisible();
});
test("attachment drafts cannot publish without a validated file; leaving unsaved work asks first", async ({
  page,
}) => {
  await page.getByLabel("Material title", { exact: true }).fill("Workbook");
  await page
    .getByRole("button", { name: "Downloadable file", exact: true })
    .click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "I reviewed this saved content and any attached file.",
    })
    .check();
  await expect(
    page.getByRole("button", { name: "Publish reviewed version", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Material title", { exact: true })
    .fill("Unsaved title");
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "People & access", exact: true })
    .click();
  await expect(page.getByLabel("Material title", { exact: true })).toHaveValue(
    "Unsaved title",
  );
});
