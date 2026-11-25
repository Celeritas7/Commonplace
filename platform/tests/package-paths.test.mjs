import { test } from "node:test";
import assert from "node:assert/strict";
import { posix, win32 } from "node:path";
import { isWithinDirectory } from "../tools/path-containment.mjs";

test("Windows containment accepts native, mixed-separator, spaced and Unicode paths", () => {
  const root = String.raw`C:\Study Projects\共通\Commonplace`;
  for (const candidate of [
    root,
    root + "\\",
    root + String.raw`\platform\learn\index.html`,
    "c:/Study Projects/共通/Commonplace/platform/learn/index.html",
    root + String.raw`\platform\..\icons\icon-192.png`,
    root + String.raw`\..notes\example.mjs`,
  ])
    assert.equal(isWithinDirectory(root, candidate, win32), true, candidate);
  for (const candidate of [
    root + String.raw`\..`,
    root + String.raw`\platform\..\..\outside.mjs`,
    root + String.raw`-sibling\platform\learn\index.html`,
    String.raw`D:\Study Projects\共通\Commonplace\index.html`,
    String.raw`C:Study Projects\共通\Commonplace\index.html`,
    "platform/learn/index.html",
  ])
    assert.equal(isWithinDirectory(root, candidate, win32), false, candidate);
});

test("Windows UNC paths remain within the same server and share", () => {
  const root = String.raw`\\server\study share\Commonplace`;
  for (const candidate of [root, root + String.raw`\platform\learn\index.html`])
    assert.equal(isWithinDirectory(root, candidate, win32), true);
  for (const candidate of [
    String.raw`\\other-server\study share\Commonplace\index.html`,
    String.raw`\\server\other-share\Commonplace\index.html`,
    root + String.raw`\..\outside.mjs`,
    root + String.raw`-sibling\index.html`,
  ])
    assert.equal(isWithinDirectory(root, candidate, win32), false, candidate);
});

test("POSIX containment rejects traversal and prefix siblings without rejecting similar child names", () => {
  const root = "/Study Projects/共通/Commonplace";
  for (const candidate of [
    root,
    root + "/",
    root + "/platform/learn/index.html",
    root + "/platform/../icons/icon-192.png",
    root + "/..notes/example.mjs",
  ])
    assert.equal(isWithinDirectory(root, candidate, posix), true, candidate);
  for (const candidate of [
    root + "/..",
    root + "/platform/../../outside.mjs",
    root + "-sibling/index.html",
    "/other/index.html",
    "platform/index.html",
  ])
    assert.equal(isWithinDirectory(root, candidate, posix), false, candidate);
  assert.equal(isWithinDirectory("relative/root", root, posix), false);
});
