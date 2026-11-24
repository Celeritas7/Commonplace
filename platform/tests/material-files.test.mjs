import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { zipSync, strToU8 } from "fflate";
import { PDFDocument } from "pdf-lib";
import {
  inspectAttachment,
  sha256,
  MAX_FILE_BYTES,
} from "../materials/file-policy.mjs";
import { createFileHandler } from "../materials/file-handler.mjs";
const bytes = strToU8("Practice notes.");
const workbook = (extra) =>
  zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "_rels/.rels": strToU8("<Relationships/>"),
    "xl/workbook.xml": strToU8("<workbook/>"),
    "xl/worksheets/sheet1.xml": strToU8(
      "<worksheet><c><f>SUM(B2:B4)</f></c></worksheet>",
    ),
    ...extra,
  });
test("attachment inspection accepts static documents and bounded workbooks, rejects unsafe types and container contents", async () => {
  assert.equal(
    (await inspectAttachment(bytes, "Practice.txt")).sha256,
    await sha256(bytes),
  );
  assert.equal(
    (await inspectAttachment(workbook({}), "Practice.xlsx")).mime,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const images = JSON.parse(
    await readFile(
      new URL("./fixtures/image-bytes.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [ext, base64] of Object.entries(images))
    assert.equal(
      (
        await inspectAttachment(
          new Uint8Array(Buffer.from(base64, "base64")),
          "Diagram." + ext,
        )
      ).mime,
      ext === "png" ? "image/png" : "image/jpeg",
    );
  const doc = await PDFDocument.create();
  doc.addPage();
  assert.equal(
    (await inspectAttachment(await doc.save(), "Lesson.pdf")).mime,
    "application/pdf",
  );
  doc.addJavaScript("unsafe", 'app.alert("bad")');
  await assert.rejects(async () =>
    inspectAttachment(await doc.save(), "Active.pdf"),
  );
  for (const [data, name] of [
    [bytes, "x.html"],
    [bytes, "../x.txt"],
    [bytes, "fake.pdf"],
    [bytes, "fake.png"],
    [new Uint8Array(MAX_FILE_BYTES + 1), "Huge.txt"],
    [strToU8("bad\0text"), "Bad.txt"],
  ])
    await assert.rejects(() => inspectAttachment(data, name));
  for (const extra of [
    { "../escape.xml": strToU8("<x/>") },
    { "xl/vbaProject.bin": bytes },
    {
      "xl/_rels/workbook.xml.rels": strToU8(
        '<Relationships><Relationship TargetMode="External" Target="https://bad.invalid"/></Relationships>',
      ),
    },
    {
      "xl/_rels/workbook.xml.rels": strToU8(
        '<Relationships><Relationship Target="https://bad.invalid"/></Relationships>',
      ),
    },
    {
      "xl/worksheets/sheet1.xml": strToU8(
        '<worksheet><f>WEBSERVICE("https://bad.invalid")</f></worksheet>',
      ),
    },
    {
      "xl/workbook.xml": strToU8(
        '<workbook><definedNames><definedName name="secret">WEBSERVICE("https://bad.invalid")</definedName></definedNames></workbook>',
      ),
    },
    {
      "xl/worksheets/sheet1.xml": strToU8(
        '<!DOCTYPE x [<!ENTITY a "x">]><worksheet/>',
      ),
    },
    { "xl/worksheets/sheet1.xml": strToU8("<worksheet>") },
    {
      "xl/sharedStrings.xml": strToU8("<sst>" + "x".repeat(200000) + "</sst>"),
    },
  ])
    await assert.rejects(() =>
      inspectAttachment(workbook(extra), "Unsafe.xlsx"),
    );
});
function fixture() {
  const f = {
    user: "10000000-0000-4000-8000-000000000001",
    deny: false,
    revokeOnSecondRead: false,
    reads: 0,
    failFinish: false,
    ambiguous: false,
    uploads: 0,
    removes: 0,
    downloads: 0,
    body: bytes,
    receipt: null,
    calls: [],
  };
  const user = {
    auth: {
      async getUser() {
        return { data: { user: f.user ? { id: f.user } : null } };
      },
    },
    async rpc(name, args) {
      f.calls.push(name);
      if (
        f.deny ||
        (name === "cp_read_material" && f.revokeOnSecondRead && ++f.reads > 1)
      )
        return { error: { code: "42501" } };
      if (name === "cp_admin_material_begin_upload")
        return {
          data: {
            nonce: "10000000-0000-4000-8000-000000000009",
            path: "version/nonce",
          },
        };
      if (name === "cp_read_material")
        return {
          data: {
            asset: {
              ...(await inspectAttachment(bytes, "Practice.txt")),
              path: "version/nonce",
            },
          },
        };
      return { data: {} };
    },
  };
  const service = {
    async rpc(name, args) {
      f.receipt = args.receipt;
      return f.ambiguous
        ? { error: {} }
        : f.failFinish
          ? { error: { code: "40001" } }
          : { data: null };
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "cp-materials");
        return {
          async upload(path, data, options) {
            f.uploads++;
            assert.equal(options.upsert, false);
            assert.equal(options.contentType, "application/octet-stream");
            return { data: {} };
          },
          async remove() {
            f.removes++;
            return { data: {} };
          },
          async download() {
            f.downloads++;
            return { data: new Blob([f.body]) };
          },
        };
      },
    },
  };
  f.handler = createFileHandler({
    origin: "https://study.example.invalid",
    clients: () => ({ user, service }),
  });
  f.request = (action, body = bytes, overrides = {}) =>
    new Request("https://backend.example.invalid/material-files", {
      method: "POST",
      headers: {
        Origin: "https://study.example.invalid",
        Authorization: "Bearer synthetic",
        "x-cp-action": action,
        "x-cp-version": "10000000-0000-4000-8000-000000000010",
        "x-cp-revision": "1",
        "x-cp-filename": "Practice.txt",
        ...overrides,
      },
      body,
    });
  return f;
}
test("file service requires verified user, admin upload and approved origin before any private file write", async () => {
  const f = fixture();
  f.user = null;
  assert.equal((await f.handler(f.request("upload"))).status, 401);
  assert.equal(f.uploads, 0);
  f.user = "verified";
  f.deny = true;
  assert.equal((await f.handler(f.request("upload"))).status, 403);
  assert.equal(f.uploads, 0);
  f.deny = false;
  assert.equal(
    (
      await f.handler(
        f.request("upload", bytes, { Origin: "https://untrusted.invalid" }),
      )
    ).status,
    403,
  );
  assert.equal(f.uploads, 0);
  assert.equal(
    (await f.handler(f.request("upload", bytes, { "x-cp-filename": "x.js" })))
      .status,
    400,
  );
  assert.equal(f.uploads, 0);
  const ok = await f.handler(f.request("upload"));
  assert.equal(ok.status, 200);
  assert.equal(f.uploads, 1);
  assert.equal(f.receipt.sha256, await sha256(bytes));
  assert.equal(ok.headers.get("Cache-Control"), "no-store");
});
test("stale uploads are cleaned up and revocations/integrity failures stop authorized downloads", async () => {
  const f = fixture();
  f.failFinish = true;
  assert.equal((await f.handler(f.request("upload"))).status, 409);
  assert.equal(f.removes, 1);
  const uncertain = fixture();
  uncertain.ambiguous = true;
  assert.equal(
    (await uncertain.handler(uncertain.request("upload"))).status,
    400,
  );
  assert.equal(uncertain.removes, 0);
  const g = fixture();
  const response = await g.handler(g.request("download"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Disposition"), /^attachment;/);
  assert.equal(
    response.headers.get("Content-Type"),
    "application/octet-stream",
  );
  assert.equal(await response.text(), "Practice notes.");
  g.deny = true;
  assert.equal((await g.handler(g.request("download"))).status, 403);
  assert.equal(g.downloads, 1);
  const h = fixture();
  h.body = strToU8("Different notes");
  assert.equal((await h.handler(h.request("download"))).status, 400);
  const i = fixture();
  i.revokeOnSecondRead = true;
  assert.equal((await i.handler(i.request("download"))).status, 403);
});
