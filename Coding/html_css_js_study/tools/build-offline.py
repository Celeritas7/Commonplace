#!/usr/bin/env python3
"""Build Web Studio's exact offline pack; --check fails if any dependency changed.

Run from anywhere: python3 Coding/html_css_js_study/tools/build-offline.py
No network or third-party packages are used. URLs are relative to the app, with
query/fragment aliases intentionally represented by one canonical file entry.
"""
from __future__ import annotations

import argparse
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = "offline-assets.json"
EXTENSIONS = {".html", ".js", ".css", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2"}
EXCLUDED = {OUTPUT, "sw.js"}
SHARED = {"_lib/gate.js", "_lib/supabase.js", "_lib/progress-backup.js", "_lib/quiz/quiz.js", "_lib/autoscroll.js", "extras.js"}
CSS_URL = re.compile(r"url\(\s*['\"]?([^\s'\"()]+)['\"]?\s*\)|@import\s+['\"]([^'\"]+)['\"]", re.I)
# Static imports and runtime URLs are dependencies; arbitrary study examples and
# exported backup filenames are not. Computed shared URLs are listed below.
JS_URL = re.compile(r"(?:\b(?:importScripts|fetch|import|Worker|SharedWorker|URL)\s*\(\s*|\bfrom\s*|\.(?:src|href)\s*=\s*)['\"]([^'\"\n]+)['\"]")
JS_RELATIVE = re.compile(r"['\"]((?:\.\.?/)[^\s'\"<>]+\.(?:js|css|json|woff2?|png|svg)(?:[?#][^\s'\"<>]*)?)['\"]")


class Resources(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.urls: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag in {"script", "img", "source", "audio", "video", "iframe", "embed"} and values.get("src"):
            self.urls.append(values["src"])
        if tag == "video" and values.get("poster"):
            self.urls.append(values["poster"])
        if tag == "object" and values.get("data"):
            self.urls.append(values["data"])
        if tag == "link" and values.get("href") and set(values.get("rel", "").lower().split()) & {"stylesheet", "manifest", "icon", "apple-touch-icon", "preload", "modulepreload"}:
            self.urls.append(values["href"])
        if tag in {"img", "source"} and values.get("srcset"):
            self.urls.extend(item.strip().split()[0] for item in values["srcset"].split(",") if item.strip() and not item.strip().startswith("data:"))


def allowed(path: Path, root: Path, repo: Path) -> bool:
    if path.is_relative_to(root):
        # Never pull developer/test/database artifacts into the study download.
        parts = path.relative_to(root).parts
        return not any(part in {"tests", "tools", "sql", "docs", ".git"} for part in parts)
    return path.is_relative_to(repo / "_lib/fonts") or path.relative_to(repo).as_posix() in SHARED


def target_for(ref: str, source: Path, root: Path, repo: Path) -> Path | None:
    parsed = urlsplit(ref)
    if parsed.scheme or parsed.netloc or not parsed.path or ref.startswith("#"):
        return None  # Online services, data/blob URLs and in-page anchors.
    if parsed.path.startswith("/"):
        raise ValueError(f"Use a relative offline resource URL in {source.relative_to(repo)}: {ref}")
    path = (source.parent / unquote(parsed.path)).resolve()
    if not path.is_relative_to(repo) or not allowed(path, root, repo):
        raise ValueError(f"Offline resource leaves Web Studio/shared dependencies: {source.relative_to(repo)} → {ref}")
    if path.name in EXCLUDED:
        return None  # Worker/manifest are independently refreshed control files.
    if not path.is_file():
        raise ValueError(f"Missing offline resource: {source.relative_to(repo)} → {ref}")
    return path


def dependencies(path: Path) -> list[str]:
    if path.suffix not in {".html", ".css", ".js", ".json"}:
        return []
    content = path.read_text(encoding="utf-8")
    refs: list[str] = []
    if path.suffix == ".html":
        parser = Resources()
        parser.feed(content)
        refs.extend(parser.urls)
    if path.suffix in {".html", ".css"}:
        refs.extend(a or b for a, b in CSS_URL.findall(content))
    if path.suffix == ".js":
        refs.extend(ref for ref in JS_URL.findall(content) if Path(urlsplit(ref).path).suffix.lower() in EXTENSIONS)
        refs.extend(JS_RELATIVE.findall(content))
    if path.name == "manifest.json" and path.parent.name == "pwa":
        manifest = json.loads(content)
        refs.extend(icon["src"] for icon in manifest.get("icons", []) if icon.get("src"))
        refs.extend(manifest[key] for key in ["start_url"] if manifest.get(key))
    return refs


def build(root: Path = ROOT) -> dict:
    root = root.resolve()
    repo = root.parents[1]
    index = root / "index.html"
    if not index.is_file():
        raise ValueError("Web Studio index.html is missing")
    files = {index}
    # New app modules automatically enter the pack, including dynamically loaded
    # modules. Tests/docs/SQL and other Commonplace sections never enter this set.
    files.update(path for path in root.iterdir() if path.is_file() and path.suffix in {".js", ".css", ".html"} and path.name not in EXCLUDED)
    for directory in ("data", "vendor", "pwa", "assets"):
        files.update(path for path in (root / directory).rglob("*") if path.is_file() and path.suffix in EXTENSIONS)
    resolved = set()
    for candidate in files:
        path = candidate.resolve()
        if not path.is_relative_to(repo) or not allowed(path, root, repo):
            raise ValueError(f"Offline resource leaves Web Studio/shared dependencies: {candidate}")
        resolved.add(path)
    files = resolved
    content = index.read_text(encoding="utf-8")
    # These loaders derive paths by replacing their own script URL, so ordinary
    # HTML/CSS/import traversal cannot see the complete filename.
    dynamic = ["_lib/supabase.js", "extras.js"]
    if not re.search(r"\bCP_QUIZ_OFF\s*=\s*true\b", content):
        dynamic.append("_lib/quiz/quiz.js")
    if not re.search(r"\bCP_AUTOSCROLL_OFF\s*=\s*true\b", content):
        dynamic.append("_lib/autoscroll.js")
    for name in dynamic:
        path = (repo / name).resolve()
        if not path.is_relative_to(repo) or not allowed(path, root, repo):
            raise ValueError(f"Offline resource leaves Web Studio/shared dependencies: {name}")
        if not path.is_file():
            raise ValueError(f"Missing dynamically loaded offline resource: {name}")
        files.add(path)
    pending = list(files)
    while pending:
        source = pending.pop()
        for ref in dependencies(source):
            path = target_for(ref, source, root, repo)
            if path is not None and path not in files:
                files.add(path)
                pending.append(path)
    entries = []
    for path in files:
        data = path.read_bytes()
        entries.append({"url": os.path.relpath(path, root).replace(os.sep, "/"), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    entries.sort(key=lambda entry: entry["url"])
    canonical = json.dumps(entries, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return {"version": 1, "revision": hashlib.sha256(canonical).hexdigest(), "bytes": sum(entry["bytes"] for entry in entries), "files": entries}


def render(manifest: dict) -> str:
    return json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail rather than write if the manifest is stale")
    args = parser.parse_args()
    try:
        manifest = build(ROOT)
        text = render(manifest)
        output = ROOT / OUTPUT
        if args.check:
            if not output.is_file() or output.read_text(encoding="utf-8") != text:
                print("Web Studio offline manifest is stale. Run python3 Coding/html_css_js_study/tools/build-offline.py and commit offline-assets.json.", file=sys.stderr)
                return 1
        else:
            output.write_text(text, encoding="utf-8")
        print(f"Web Studio: {len(manifest['files'])} files, {manifest['bytes']:,} bytes ({manifest['bytes'] / 1_000_000:.2f} MB), revision {manifest['revision'][:12]}" + ("; manifest current" if args.check else ""))
        return 0
    except (OSError, ValueError) as error:
        print(f"Offline manifest could not be built: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
