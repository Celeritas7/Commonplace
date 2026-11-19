#!/usr/bin/env python3
"""Dependency/integrity regression checks for the generated study download."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location("offline_manifest", Path(__file__).resolve().parents[1] / "tools/build-offline.py")
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


class OfflineManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp.name)
        self.root = self.repo / "Coding/html_css_js_study"
        self.root.mkdir(parents=True)
        self.write("index.html", '<script src="../../_lib/gate.js"></script><script>window.CP_QUIZ_OFF=true;window.CP_AUTOSCROLL_OFF=true;</script><script src="studio.js?v=1.7"></script><link rel="stylesheet" href="studio.css?v=1.7"><link rel="manifest" href="pwa/manifest.json"><a href="../index.html">Coding</a>')
        self.write("studio.js", "window.study = true;")
        self.write("studio.css", '@import "../../_lib/fonts/site.css";')
        self.write("pwa/manifest.json", '{"start_url":"../index.html","icons":[{"src":"icon.png"}]}')
        self.write("pwa/icon.png", b"fixture-png")
        self.write("../../_lib/fonts/site.css", '@font-face{src:url("f/study.woff2?font=1")}')
        self.write("../../_lib/fonts/f/study.woff2", b"fixture-font")
        for path in ["../../_lib/gate.js", "../../_lib/supabase.js", "../../extras.js", "../../_lib/quiz/quiz.js", "../../_lib/autoscroll.js"]:
            self.write(path, "/* local fixture */")

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(value if isinstance(value, bytes) else value.encode())
        return path

    def manifest(self):
        return BUILD.build(self.root)

    def urls(self):
        return [entry["url"] for entry in self.manifest()["files"]]

    def main(self, *args):
        previous_root, previous_argv = BUILD.ROOT, sys.argv
        BUILD.ROOT, sys.argv = self.root, ["build-offline.py", *args]
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                return BUILD.main()
        finally:
            BUILD.ROOT, sys.argv = previous_root, previous_argv

    def test_deterministic_hashes_sizes_and_revision(self):
        manifest = self.manifest()
        self.assertEqual(manifest, self.manifest())
        self.assertEqual(manifest["version"], 1)
        self.assertEqual(manifest["bytes"], sum(entry["bytes"] for entry in manifest["files"]))
        self.assertEqual(self.urls(), sorted(self.urls()))
        canonical = json.dumps(manifest["files"], ensure_ascii=False, separators=(",", ":")).encode()
        self.assertEqual(manifest["revision"], hashlib.sha256(canonical).hexdigest())
        for entry in manifest["files"]:
            data = (self.root / entry["url"]).read_bytes()
            self.assertEqual(entry["bytes"], len(data))
            self.assertEqual(entry["sha256"], hashlib.sha256(data).hexdigest())
            self.assertEqual(list(entry), ["url", "bytes", "sha256"])

    def test_shared_login_change_invalidates_manifest_and_check_does_not_rewrite(self):
        self.assertEqual(self.main("--check"), 1)
        self.assertEqual(self.main(), 0)
        output = self.root / BUILD.OUTPUT
        original, mtime = output.read_bytes(), output.stat().st_mtime_ns
        self.assertEqual(self.main("--check"), 0)
        self.assertEqual(output.stat().st_mtime_ns, mtime)
        self.write("../../_lib/gate.js", "/* authentication fix */")
        self.assertEqual(self.main("--check"), 1)
        self.assertEqual(output.read_bytes(), original)
        self.assertEqual(output.stat().st_mtime_ns, mtime)
        self.assertEqual(self.main(), 0)
        self.assertNotEqual(output.read_bytes(), original)
        self.assertEqual(self.main("--check"), 0)

    def test_new_modules_images_and_repair_auto_discovered(self):
        self.write("offline.js", "/* progress manager */")
        self.write("offline-repair.html", '<a href="index.html">Return</a>')
        self.write("assets/diagram.svg", "<svg></svg>")
        self.write("data/new-lessons.json", "{}")
        self.assertTrue({"offline.js", "offline-repair.html", "assets/diagram.svg", "data/new-lessons.json"}.issubset(self.urls()))

    def test_control_files_docs_tests_and_unrelated_navigation_not_downloaded(self):
        self.write("sw.js", "/* no recursive manifest */")
        self.write("offline-assets.json", "{}")
        self.write("docs/example.html", "not study content")
        self.write("tests/example.js", "not study content")
        self.write("sql/schema.sql", "not study content")
        self.write("../index.html", "another section")
        self.assertFalse({"sw.js", "offline-assets.json", "docs/example.html", "tests/example.js", "sql/schema.sql", "../index.html"}.intersection(self.urls()))

    def test_query_and_fragment_aliases_have_one_canonical_file(self):
        with (self.root / "index.html").open("a") as stream:
            stream.write('<script src="studio.js?v=other#code"></script>')
        self.assertEqual(self.urls().count("studio.js"), 1)
        self.assertIn("../../_lib/fonts/f/study.woff2", self.urls())
        self.assertFalse(any("?" in value or "#" in value for value in self.urls()))

    def test_missing_html_resource_fails_loudly(self):
        (self.root / "studio.js").unlink()
        with self.assertRaisesRegex(ValueError, "Missing offline resource.*studio.js"):
            self.manifest()

    def test_missing_transitive_font_resource_fails_loudly(self):
        (self.repo / "_lib/fonts/f/study.woff2").unlink()
        with self.assertRaisesRegex(ValueError, "Missing offline resource.*study.woff2"):
            self.manifest()

    def test_online_and_embedded_assets_stay_outside_pack(self):
        with (self.root / "index.html").open("a") as stream:
            stream.write('<img src="https://example.invalid/cloud.png"><img src="data:image/png;base64,AAAA"><a href="https://drive.google.com/book">Book</a>')
        self.assertFalse(any("https:" in value or "data:" in value for value in self.urls()))

    def test_resource_from_other_section_is_rejected(self):
        self.write("../Python/foreign.js", "/* another app */")
        with (self.root / "index.html").open("a") as stream:
            stream.write('<script src="../Python/foreign.js"></script>')
        with self.assertRaisesRegex(ValueError, "leaves Web Studio"):
            self.manifest()

    def test_literal_javascript_runtime_dependency_is_followed(self):
        self.write("studio.js", 'const sdk = new URL("../../_lib/supabase.js", document.currentScript.src);fetch("data/review.json");')
        self.write("data/review.json", "[]")
        self.assertIn("../../_lib/supabase.js", self.urls())
        (self.root / "data/review.json").unlink()
        with self.assertRaisesRegex(ValueError, "Missing offline resource.*review.json"):
            self.manifest()

    def test_dynamic_shared_modules_follow_page_opt_outs(self):
        self.assertIn("../../extras.js", self.urls())
        self.assertNotIn("../../_lib/quiz/quiz.js", self.urls())
        self.assertNotIn("../../_lib/autoscroll.js", self.urls())
        path = self.root / "index.html"
        path.write_text(path.read_text().replace("CP_QUIZ_OFF=true", "CP_QUIZ_OFF=false").replace("CP_AUTOSCROLL_OFF=true", "CP_AUTOSCROLL_OFF=false"))
        self.assertIn("../../_lib/quiz/quiz.js", self.urls())
        self.assertIn("../../_lib/autoscroll.js", self.urls())

    def test_symlink_cannot_import_other_section(self):
        target = self.write("../Python/private.js", "/* another section */")
        (self.root / "private.js").symlink_to(target)
        with self.assertRaisesRegex(ValueError, "leaves Web Studio"):
            self.manifest()


if __name__ == "__main__":
    unittest.main(verbosity=2)
