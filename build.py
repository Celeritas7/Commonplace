"""
build.py — Convert Automobile_app/content/ → Commonplace/Mechanical/

Walks the Automobile_app v2 markdown notes, renders each to a self-contained
HTML page that matches the existing SQL-book styling, generates per-folder
index pages, and emits a subject-root index that the Commonplace landing-page
links to.

Run:
    python build.py            # build everything
    python build.py --force    # ignore mtimes, rebuild everything

Configuration is the CONFIG dict below — edit paths there if either side moves.

Image references in the source markdown (`../../docs/<Folder>/IMG*.jpg`) are
left untouched — they will be broken until the source images are hosted
somewhere reachable by the Commonplace site. That's a separate task.
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import markdown as md

# --------------------------------------------------------------------------- #
# CONFIG
# --------------------------------------------------------------------------- #

CONFIG = {
    "source_root": Path(r"D:\Coding\App_generation\Mechanical\Automobile_app\content"),
    # The Automobile subject now lives under Mechanical/Automobile/. The Mechanical/
    # folder itself becomes a hub (emit_hub_index) that lists subjects + related links.
    "output_root": Path(r"D:\Coding\App_generation\General_purpose\Commonplace\Mechanical\Automobile"),
    # Directory levels from the subject root (output_root) up to the Commonplace root.
    # Commonplace/Mechanical/Automobile -> Commonplace is 2 hops. Used for "Commonplace
    # home" links. If you move output_root, update this.
    "root_offset": 2,
    "subject_title": "Automobile Mechanisms",
    "subject_tagline": "First-principles notes on engines, chassis, electronics, and dynamics — built from a 2013 BMW India dealer-training notebook.",
    "subject_status_badge": "Pass 1 in progress",
    "subject_kicker": "Mechanical",
    "home_href": "../index.html",
    # The Mechanical hub page (one level above the subject).
    "hub_title": "Mechanical",
    "hub_kicker": "Commonplace",
    "hub_tagline": "Mechanical engineering notes and study tools.",
    # External / companion resources — rendered on the Mechanical hub only.
    # These are NOT generated from the markdown content tree.
    "related_links": [
        {
            "label": "External app · 507 movements",
            "title": "Brown's 507 Mechanical Movements",
            "summary": "Interactive study app for Henry T. Brown's 1868 classic — searchable diagrams, Wikimedia animations, notes, bookmarks, and dark mode.",
            "href": "file:///D:/%23%23%23%23%23%23%23%23%23Database/%23Mechanical/3_Advanced_study/Mechanisms/mechanisms_book.html",
        },
    ],
}

# Display-name overrides for folders (preserves source spelling but cleans
# the underscore for the rendered title).
FOLDER_DISPLAY_OVERRIDES = {
    "Intro": "Introduction",
    "Engine_systems": "Engine Systems",
    "Petrol_deisel": "Petrol & Diesel",
    "Fuel_system": "Fuel System",
    "Exhaust_system": "Exhaust System",
    "Material": "Materials",
    "N42": "N42 Engine",
    "Clutch_brakes_suspensions": "Clutch, Brakes & Suspension",
    "Torque_convertor_gears": "Torque Converter & Gears",
    "Steering_Wheels_tyres": "Steering, Wheels & Tyres",
    "Electronics_electrical": "Electronics & Electrical",
    "Battery": "Battery",
    "AC_system": "AC System",
    "Airbags": "Airbags",
    "Head_up_display": "Head-up Display",
    "Driving_physics": "Driving Physics",
    "Miscllinous": "Miscellaneous",
}

# --------------------------------------------------------------------------- #
# Page template (mirrors the SQL-book aesthetic — single file, no external CSS)
# --------------------------------------------------------------------------- #

PAGE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title} · Mechanical · Commonplace</title>

<!-- KaTeX for math rendering -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"
  onload="renderMathInElement(document.body, {{ delimiters: [
    {{left: '$$', right: '$$', display: true}},
    {{left: '$', right: '$', display: false}}
  ], throwOnError: false }});"></script>

<style>
  :root {{
    --bg:#fafafa; --paper:#fff; --text:#1f2937; --text-soft:#4b5563; --text-mute:#6b7280;
    --border:#e5e7eb; --border-soft:#f1f3f5;
    --accent:#4f46e5; --accent-2:#7c3aed; --accent-soft:#ede9fe;
    --code-bg:#0f172a; --code-fg:#e0e7ff;
  }}
  * {{ box-sizing: border-box; }}
  html {{ scroll-behavior: smooth; }}
  body {{
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, system-ui, sans-serif;
    color: var(--text); background: var(--bg); line-height: 1.65; font-size: 16px;
  }}
  .topnav {{
    position: sticky; top: 0; z-index: 50;
    background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(8px);
    border-bottom: 1px solid var(--border);
    padding: 12px 28px; display: flex; align-items: center; gap: 16px;
  }}
  .topnav .brand {{ font-weight: 700; font-size: 15px; letter-spacing: -0.2px; color: var(--text); text-decoration: none; }}
  .topnav .brand .dot {{
    display: inline-block; width: 8px; height: 8px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
    border-radius: 2px; margin-right: 8px; transform: translateY(-1px);
  }}
  .topnav .crumb {{ color: var(--text-mute); font-size: 13px; }}
  .topnav .crumb a {{ color: var(--text-mute); text-decoration: none; }}
  .topnav .crumb a:hover {{ color: var(--accent); }}
  .topnav .crumb .sep {{ margin: 0 6px; opacity: 0.5; }}

  .wrap {{ max-width: 880px; margin: 0 auto; padding: 28px 28px 80px; }}

  .module-hero {{
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #fff; border-radius: 16px; padding: 32px 36px 28px; margin-bottom: 32px;
    box-shadow: 0 12px 32px rgba(79,70,229,0.18); position: relative; overflow: hidden;
  }}
  .module-hero::after {{
    content: ""; position: absolute; right: -60px; top: -60px; width: 240px; height: 240px;
    background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%); pointer-events: none;
  }}
  .module-hero .meta {{ font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.88); margin-bottom: 10px; }}
  .module-hero h1 {{ margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2; }}
  .module-hero .source {{ margin-top: 14px; font-size: 13px; color: rgba(255,255,255,0.85); }}

  h1 {{ font-size: 32px; }}
  h2 {{ font-size: 24px; font-weight: 800; letter-spacing: -0.3px; margin: 32px 0 12px; color: var(--text); scroll-margin-top: 80px; }}
  h3 {{ font-size: 18px; font-weight: 700; margin: 24px 0 8px; color: var(--text); scroll-margin-top: 80px; }}
  h4 {{ font-size: 14px; font-weight: 700; margin: 20px 0 6px; color: var(--accent); letter-spacing: 0.2px; }}
  p {{ color: var(--text-soft); margin: 12px 0; }}
  p strong, li strong {{ color: var(--text); }}
  ul, ol {{ color: var(--text-soft); padding-left: 24px; }}
  li {{ margin: 6px 0; }}
  a {{ color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s; }}
  a:hover {{ border-bottom-color: var(--accent); }}

  code {{
    background: var(--accent-soft); color: var(--accent);
    padding: 1px 6px; border-radius: 4px; font-size: 0.93em;
    font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  }}
  pre {{
    background: var(--code-bg); color: var(--code-fg);
    padding: 18px 20px; border-radius: 10px; overflow-x: auto;
    font-size: 13.5px; line-height: 1.5; margin: 16px 0;
    font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  }}
  pre code {{ background: transparent; color: inherit; padding: 0; }}

  blockquote {{
    border-left: 4px solid var(--accent); background: var(--accent-soft);
    padding: 10px 16px; margin: 16px 0; color: var(--text-soft); border-radius: 0 8px 8px 0;
  }}
  blockquote p {{ margin: 4px 0; }}
  blockquote p:first-child {{ margin-top: 0; }}
  blockquote p:last-child {{ margin-bottom: 0; }}

  table {{
    border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14.5px;
    background: var(--paper); border-radius: 10px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }}
  th, td {{ padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }}
  th {{ background: #f9fafb; font-weight: 700; color: var(--text); font-size: 12.5px;
        text-transform: uppercase; letter-spacing: 0.5px; }}
  tr:last-child td {{ border-bottom: none; }}

  img {{
    max-width: 100%; height: auto; border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin: 16px 0;
    background: #f3f4f6;
  }}
  img:not([src]), img[src=""] {{ display: none; }}

  hr {{ border: 0; border-top: 1px solid var(--border); margin: 32px 0; }}

  .footer-nav {{
    display: flex; justify-content: space-between; gap: 16px; margin-top: 48px;
    padding-top: 24px; border-top: 1px solid var(--border); font-size: 14px;
  }}
  .footer-nav a {{ color: var(--text-soft); padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px; }}
  .footer-nav a:hover {{ border-color: var(--accent); color: var(--accent); }}
  .footer-nav .spacer {{ flex: 1; }}

  @media (max-width: 700px) {{
    .wrap {{ padding: 18px 16px 60px; }}
    .module-hero {{ padding: 24px 22px; }}
    .module-hero h1 {{ font-size: 26px; }}
  }}
</style>
</head>
<body>
  <nav class="topnav">
    <a class="brand" href="{home_href}"><span class="dot"></span>Commonplace</a>
    <div class="crumb">{breadcrumbs}</div>
  </nav>
  <div class="wrap">
    {hero}
    <article>
      {body}
    </article>
    <div class="footer-nav">
      <a href="{up_href}">↑ {up_label}</a>
      <span class="spacer"></span>
      <a href="{home_href}">Commonplace home</a>
    </div>
  </div>
</body>
</html>
"""

INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title} · Commonplace</title>
<style>
  :root {{
    --bg:#fafafa; --paper:#fff; --text:#1f2937; --text-soft:#4b5563; --text-mute:#6b7280;
    --border:#e5e7eb; --accent:#4f46e5; --accent-2:#7c3aed; --accent-soft:#ede9fe;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, system-ui, sans-serif;
    color: var(--text); background: var(--bg); line-height: 1.65; font-size: 16px;
  }}
  .topnav {{
    position: sticky; top: 0; z-index: 50;
    background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(8px);
    border-bottom: 1px solid var(--border);
    padding: 12px 28px; display: flex; align-items: center; gap: 16px;
  }}
  .topnav .brand {{ font-weight: 700; font-size: 15px; letter-spacing: -0.2px; color: var(--text); text-decoration: none; }}
  .topnav .brand .dot {{
    display: inline-block; width: 8px; height: 8px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
    border-radius: 2px; margin-right: 8px; transform: translateY(-1px);
  }}
  .topnav .crumb {{ color: var(--text-mute); font-size: 13px; }}
  .topnav .crumb a {{ color: var(--text-mute); text-decoration: none; }}
  .topnav .crumb a:hover {{ color: var(--accent); }}
  .topnav .crumb .sep {{ margin: 0 6px; opacity: 0.5; }}

  .wrap {{ max-width: 980px; margin: 0 auto; padding: 60px 28px 80px; }}
  .hero {{
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #fff; border-radius: 16px; padding: 44px 40px; margin-bottom: 36px;
    box-shadow: 0 12px 32px rgba(79,70,229,0.18); position: relative; overflow: hidden;
  }}
  .hero::after {{
    content: ""; position: absolute; right: -60px; top: -60px; width: 240px; height: 240px;
    background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%);
  }}
  .hero .kicker {{ font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.88); margin-bottom: 12px; }}
  .hero h1 {{ margin: 0; font-size: 38px; font-weight: 800; letter-spacing: -0.5px; }}
  .hero p {{ font-size: 16px; color: rgba(255,255,255,0.94); max-width: 620px; margin-top: 14px; }}
  .hero .badge {{
    display: inline-block; margin-top: 18px;
    background: rgba(255,255,255,0.18); color: #fff; font-size: 11px;
    font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
    padding: 5px 12px; border-radius: 999px;
  }}

  h2 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-mute); margin: 0 0 16px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 36px; }}
  .card {{
    background: var(--paper); border: 1px solid var(--border);
    border-radius: 12px; padding: 22px 24px; text-decoration: none; color: inherit;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    display: flex; flex-direction: column;
  }}
  .card:hover {{ border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(79,70,229,0.12); }}
  .card .label {{ font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 1.5px; text-transform: uppercase; }}
  .card .title {{ font-size: 18px; font-weight: 700; margin: 6px 0 8px; color: #0f172a; }}
  .card .summary {{ font-size: 13.5px; color: var(--text-mute); line-height: 1.55; }}

  @media (max-width: 700px) {{
    .wrap {{ padding: 32px 16px 60px; }}
    .hero {{ padding: 28px 22px; }}
    .hero h1 {{ font-size: 28px; }}
  }}
</style>
</head>
<body>
  <nav class="topnav">
    <a class="brand" href="{home_href}"><span class="dot"></span>Commonplace</a>
    <div class="crumb">{breadcrumbs}</div>
  </nav>
  <div class="wrap">
    <div class="hero">
      <div class="kicker">{kicker}</div>
      <h1>{title}</h1>
      <p>{tagline}</p>
      {badge_html}
    </div>

    {sections_html}
  </div>
</body>
</html>
"""

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def display_name(folder_or_file: str) -> str:
    """Map a raw folder/file slug to a readable display name."""
    if folder_or_file in FOLDER_DISPLAY_OVERRIDES:
        return FOLDER_DISPLAY_OVERRIDES[folder_or_file]
    # e.g. "01-friction-and-slip" -> "01 — Friction and Slip"
    stem = folder_or_file
    if re.match(r"^\d{2}-", stem):
        num, rest = stem.split("-", 1)
        return f"{num} — " + rest.replace("-", " ").title()
    return stem.replace("_", " ")


def extract_summary(md_text: str) -> str:
    """Pull the first paragraph after the '## Overview' heading as the card summary."""
    m = re.search(r"^##\s+Overview\s*$([\s\S]*?)(?=^##\s|\Z)", md_text, flags=re.M)
    body = m.group(1).strip() if m else md_text
    # strip any leading blank lines, image refs, or blockquotes
    for line in body.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("!") or s.startswith(">") or s.startswith("#") or s.startswith("`"):
            continue
        # Truncate to ~240 chars at a word boundary
        s = re.sub(r"\[(.+?)\]\([^)]+\)", r"\1", s)   # strip markdown links
        s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)         # strip bold
        s = re.sub(r"\*(.+?)\*", r"\1", s)             # strip italics
        s = re.sub(r"`(.+?)`", r"\1", s)               # strip inline code
        if len(s) > 240:
            s = s[:240].rsplit(" ", 1)[0] + "…"
        return s
    return ""


def extract_title(md_text: str) -> str:
    """First H1 in the markdown file."""
    m = re.search(r"^#\s+(.+?)\s*$", md_text, flags=re.M)
    return m.group(1).strip() if m else ""


def extract_source_line(md_text: str) -> str:
    """Pull the '> Source images:' blockquote line."""
    m = re.search(r"^>\s*\*\*Source images:\*\*\s*(.+?)\s*$", md_text, flags=re.M)
    return m.group(1).strip() if m else ""


def rewrite_links(html_text: str) -> str:
    """Turn cross-folder .md links into .html links."""
    return re.sub(
        r'href="([^"]+?)\.md(#[^"]*)?"',
        lambda m: f'href="{m.group(1)}.html{m.group(2) or ""}"',
        html_text,
    )


def render_markdown(md_text: str) -> str:
    """Run the markdown library with our extension set."""
    return md.markdown(
        md_text,
        extensions=["tables", "fenced_code", "attr_list", "sane_lists"],
        output_format="html5",
    )


# --------------------------------------------------------------------------- #
# Crawl + emit
# --------------------------------------------------------------------------- #

@dataclass
class MdFile:
    src: Path
    rel: Path          # relative to source_root
    title: str
    summary: str
    source_line: str

@dataclass
class FolderNode:
    rel: Path                       # relative to source_root (Path('.') for root)
    files: list[MdFile]
    subfolders: list["FolderNode"]


def scan(folder: Path, source_root: Path) -> FolderNode:
    """Recursively scan the source tree."""
    rel = folder.relative_to(source_root) if folder != source_root else Path()
    node = FolderNode(rel=rel, files=[], subfolders=[])
    for entry in sorted(folder.iterdir()):
        if entry.is_dir():
            node.subfolders.append(scan(entry, source_root))
        elif entry.suffix == ".md":
            txt = entry.read_text(encoding="utf-8")
            node.files.append(MdFile(
                src=entry,
                rel=entry.relative_to(source_root),
                title=extract_title(txt) or entry.stem,
                summary=extract_summary(txt),
                source_line=extract_source_line(txt),
            ))
    return node


def folder_label(rel: Path) -> str:
    """Display label for the folder index hero ('Driving Physics' etc.)."""
    if str(rel) in (".", ""):
        return CONFIG["subject_title"]
    return display_name(rel.name)


def build_breadcrumbs(rel: Path, home_label: str) -> str:
    """Build the topnav breadcrumb HTML for a page at this rel path."""
    parts = [(home_label, CONFIG["home_href"])]
    parts.append((CONFIG["subject_title"], "../" * len(rel.parts) + "index.html" if rel.parts else "index.html"))
    crumbs = []
    walk = Path()
    depth = len(rel.parts)
    for i, p in enumerate(rel.parts[:-1] if rel.suffix else rel.parts):
        walk = walk / p
        href = "../" * (depth - i - 1) + "index.html"
        crumbs.append((display_name(p), href))
    sep = '<span class="sep">›</span>'
    rendered = []
    for label, href in parts + crumbs:
        rendered.append(f'<a href="{html.escape(href)}">{html.escape(label)}</a>')
    return sep.join(rendered)


# --------------------------------------------------------------------------- #
# Reader-mode cleanup
#
# The v2 source markdown is the Pass-1 transcription audit trail — it includes
# scaffolding the reader on the train doesn't need:
#   - "## Open Questions / Uncertainty" section at the bottom
#   - inline "[?]" uncertainty markers
#   - "[MISFILED CONTENT — preserved in place]" blockquote callouts
# Reader mode is on by default. Pass --raw to keep everything.
# --------------------------------------------------------------------------- #

READER_MODE = True

_OPEN_QUESTIONS_RE = re.compile(
    r"\n+(?:---\s*\n+)?##\s+Open\s+Questions[\s\S]*$",
    re.IGNORECASE,
)
_MISFILED_RE = re.compile(
    r"""
    (?:^---[ \t]*\n+)?              # optional preceding horizontal rule
    ^>\s*\*\*`?\[MISFILED\sCONTENT  # blockquote opener with the marker
    [^\n]*                          # rest of the opening line
    (?:\n>[^\n]*)*                  # remaining blockquote lines (incl. empty `>`)
    \n*                             # any blank lines after
    (?:^---[ \t]*\n+)?              # optional trailing horizontal rule
    """,
    re.MULTILINE | re.VERBOSE,
)
_INLINE_UNCERTAINTY_RE = re.compile(r"\s*\[\?\]\s*")


def apply_reader_mode(md_text: str) -> str:
    """Strip Pass-1 transcription scaffolding for clean reading."""
    md_text = _OPEN_QUESTIONS_RE.sub("\n", md_text)
    md_text = _MISFILED_RE.sub("", md_text)
    md_text = _INLINE_UNCERTAINTY_RE.sub(" ", md_text)
    return md_text


def emit_page(mdfile: MdFile, output_root: Path) -> Path:
    """Render one .md file to .html, return the output path."""
    src_text = mdfile.src.read_text(encoding="utf-8")

    # Strip the leading H1 + Source-images blockquote (we render those in the hero)
    body_text = re.sub(r"^#\s+.+?\n", "", src_text, count=1, flags=re.M)
    body_text = re.sub(r"^>\s*\*\*Source images:\*\*[^\n]*\n", "", body_text, count=1, flags=re.M)

    if READER_MODE:
        body_text = apply_reader_mode(body_text)

    body_html = render_markdown(body_text)
    body_html = rewrite_links(body_html)

    # Path on disk
    rel_out = mdfile.rel.with_suffix(".html")
    out_path = output_root / rel_out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    depth = len(rel_out.parts) - 1   # 1 for top-level folder, 2 for nested
    up_href = "index.html"
    up_label = display_name(rel_out.parent.name) if depth > 0 else CONFIG["subject_title"]
    home_href = "../" * (depth + CONFIG["root_offset"]) + "index.html"  # back to Commonplace root
    hub_href = "../" * (depth + 1) + "index.html"                       # the Mechanical hub

    # Breadcrumbs: Commonplace › Mechanical › Automobile Mechanisms › Folder › ...
    crumbs = [('Commonplace', home_href),
              (CONFIG["hub_title"], hub_href),
              (CONFIG["subject_title"], "../" * depth + "index.html")]
    walk = Path()
    for i, p in enumerate(rel_out.parts[:-1]):
        walk = walk / p
        href = "../" * (depth - i - 1) + "index.html"
        crumbs.append((display_name(p), href))
    sep = '<span class="sep">›</span>'
    breadcrumbs_html = sep.join(
        f'<a href="{html.escape(href)}">{html.escape(label)}</a>' for label, href in crumbs
    )

    hero = (
        '<div class="module-hero">'
        f'  <div class="meta">{html.escape(display_name(rel_out.parent.name) if depth > 0 else CONFIG["subject_title"])}</div>'
        f'  <h1>{html.escape(mdfile.title)}</h1>'
        + (f'  <div class="source">Source images: {html.escape(mdfile.source_line)}</div>' if mdfile.source_line else '')
        + '</div>'
    )

    out_html = PAGE_HTML.format(
        title=html.escape(mdfile.title),
        breadcrumbs=breadcrumbs_html,
        hero=hero,
        body=body_html,
        up_href=up_href,
        up_label=html.escape(up_label),
        home_href=home_href,
    )
    out_path.write_text(out_html, encoding="utf-8")
    return out_path


def emit_folder_index(node: FolderNode, output_root: Path, is_subject_root: bool = False) -> Path:
    """Render an index.html for the folder, with cards for each topic + sub-folder."""
    rel_out_dir = node.rel
    out_path = output_root / rel_out_dir / "index.html"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    depth = len(rel_out_dir.parts)
    home_href = "../" * (depth + CONFIG["root_offset"]) + "index.html"
    hub_href = "../" * (depth + 1) + "index.html"   # the Mechanical hub

    # Breadcrumbs: Commonplace › Mechanical › [Automobile Mechanisms › Folder …]
    crumbs = [('Commonplace', home_href), (CONFIG["hub_title"], hub_href)]
    if not is_subject_root:
        crumbs.append((CONFIG["subject_title"], "../" * depth + "index.html"))
    walk = Path()
    for i, p in enumerate(rel_out_dir.parts[:-1]) if not is_subject_root else []:
        walk = walk / p
        href = "../" * (depth - i - 1) + "index.html"
        crumbs.append((display_name(p), href))
    sep = '<span class="sep">›</span>'
    breadcrumbs_html = sep.join(
        f'<a href="{html.escape(href)}">{html.escape(label)}</a>' for label, href in crumbs
    )

    title = CONFIG["subject_title"] if is_subject_root else folder_label(rel_out_dir)
    tagline = CONFIG["subject_tagline"] if is_subject_root else (
        f"Notes in the {folder_label(rel_out_dir)} section."
    )
    badge_html = (
        f'<div class="badge">{html.escape(CONFIG["subject_status_badge"])}</div>'
        if is_subject_root else ""
    )

    # Sections: sub-folders first (as cards), then files
    sections = []
    if node.subfolders:
        cards = []
        for sub in node.subfolders:
            sub_count = count_files(sub)
            href = f"{sub.rel.name}/index.html"
            label = display_name(sub.rel.name)
            cards.append(
                f'<a class="card" href="{html.escape(href)}">'
                f'  <span class="label">Section · {sub_count} {"topic" if sub_count == 1 else "topics"}</span>'
                f'  <div class="title">{html.escape(label)}</div>'
                f'  <div class="summary">{html.escape(short_section_summary(sub))}</div>'
                f'</a>'
            )
        sections.append('<h2>Sections</h2><div class="grid">' + "".join(cards) + "</div>")

    if node.files:
        cards = []
        for f in node.files:
            href = f.src.stem + ".html"
            num_match = re.match(r"^(\d{2})-(.*)$", f.src.stem)
            label_num = num_match.group(1) if num_match else "·"
            cards.append(
                f'<a class="card" href="{html.escape(href)}">'
                f'  <span class="label">Topic {html.escape(label_num)}</span>'
                f'  <div class="title">{html.escape(f.title)}</div>'
                f'  <div class="summary">{html.escape(f.summary)}</div>'
                f'</a>'
            )
        sections.append('<h2>Topics</h2><div class="grid">' + "".join(cards) + "</div>")

    out_html = INDEX_HTML.format(
        title=html.escape(title),
        kicker=html.escape(CONFIG["subject_kicker"] if is_subject_root else CONFIG["subject_title"]),
        tagline=html.escape(tagline),
        badge_html=badge_html,
        sections_html="".join(sections) or "<p>No topics yet.</p>",
        breadcrumbs=breadcrumbs_html,
        home_href=home_href,
    )
    out_path.write_text(out_html, encoding="utf-8")
    return out_path


def emit_hub_index(tree: FolderNode, output_root: Path) -> Path:
    """Render the Mechanical hub index, one level above the subject root.

    Lists each subject as a card plus any related/companion links. Written to
    output_root.parent/index.html (e.g. Commonplace/Mechanical/index.html).
    """
    hub_dir = output_root.parent
    out_path = hub_dir / "index.html"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # The hub sits one level below the Commonplace root.
    home_href = "../index.html"
    breadcrumbs_html = f'<a href="{html.escape(home_href)}">Commonplace</a>'

    total = count_files(tree)
    subject_card = (
        f'<a class="card" href="{html.escape(output_root.name)}/index.html">'
        f'  <span class="label">Subject · {total} {"topic" if total == 1 else "topics"}</span>'
        f'  <div class="title">{html.escape(CONFIG["subject_title"])}</div>'
        f'  <div class="summary">{html.escape(CONFIG["subject_tagline"])}</div>'
        f'</a>'
    )
    sections = ['<h2>Subjects</h2><div class="grid">' + subject_card + "</div>"]

    if CONFIG.get("related_links"):
        cards = []
        for link in CONFIG["related_links"]:
            cards.append(
                f'<a class="card" href="{html.escape(link["href"])}">'
                f'  <span class="label">{html.escape(link.get("label", "Related"))}</span>'
                f'  <div class="title">{html.escape(link["title"])}</div>'
                f'  <div class="summary">{html.escape(link.get("summary", ""))}</div>'
                f'</a>'
            )
        sections.append('<h2>Related</h2><div class="grid">' + "".join(cards) + "</div>")

    out_html = INDEX_HTML.format(
        title=html.escape(CONFIG["hub_title"]),
        kicker=html.escape(CONFIG["hub_kicker"]),
        tagline=html.escape(CONFIG["hub_tagline"]),
        badge_html="",
        sections_html="".join(sections),
        breadcrumbs=breadcrumbs_html,
        home_href=home_href,
    )
    out_path.write_text(out_html, encoding="utf-8")
    return out_path


def count_files(node: FolderNode) -> int:
    """Recursively count .md files under a folder node."""
    return len(node.files) + sum(count_files(s) for s in node.subfolders)


def short_section_summary(node: FolderNode) -> str:
    """One-line teaser for a section card: list the first 2-3 topic titles."""
    titles = [f.title for f in node.files[:3]]
    for sub in node.subfolders[:2]:
        if len(titles) >= 4:
            break
        titles.append(display_name(sub.rel.name))
    if not titles:
        return "Section in progress."
    s = "; ".join(titles)
    return (s[:200] + "…") if len(s) > 200 else s


def walk_and_emit(node: FolderNode, output_root: Path, is_subject_root: bool, counters: dict) -> None:
    """Recursively render this folder's index + every page in it + every sub-folder."""
    emit_folder_index(node, output_root, is_subject_root=is_subject_root)
    counters["indices"] += 1
    for f in node.files:
        emit_page(f, output_root)
        counters["pages"] += 1
    for sub in node.subfolders:
        walk_and_emit(sub, output_root, is_subject_root=False, counters=counters)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="(reserved — currently always rebuilds)")
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Keep the Pass-1 transcription scaffolding (Open Questions, [?] markers, MISFILED callouts). "
             "Default is reader mode: those are stripped.",
    )
    args = parser.parse_args()

    global READER_MODE
    READER_MODE = not args.raw

    source_root: Path = CONFIG["source_root"]
    output_root: Path = CONFIG["output_root"]

    if not source_root.exists():
        print(f"ERROR: source_root does not exist: {source_root}", file=sys.stderr)
        return 1

    output_root.mkdir(parents=True, exist_ok=True)

    print(f"Mode: {'reader (cleaned)' if READER_MODE else 'raw (full transcription)'}")
    print(f"Scanning {source_root} ...")
    tree = scan(source_root, source_root)
    total = count_files(tree)
    print(f"Found {total} markdown files.")

    counters = {"pages": 0, "indices": 0}
    walk_and_emit(tree, output_root, is_subject_root=True, counters=counters)

    hub_path = emit_hub_index(tree, output_root)

    print(f"Wrote {counters['pages']} topic pages + {counters['indices']} index pages")
    print(f"Subject root: {output_root}")
    print(f"Hub index:    {hub_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
