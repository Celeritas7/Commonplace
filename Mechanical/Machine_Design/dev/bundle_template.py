"""
bundle_template.py - unpack / repack the app template inside Machine_Design/index.html.

index.html is a bundled page: the app itself (markup + the Component class) is one
JSON string inside <script type="__bundler/template">. Edit it as plain HTML:

    python dev/bundle_template.py extract     # index.html -> dev/template.html
    (edit dev/template.html)
    python dev/bundle_template.py pack        # dev/template.html -> index.html

dev/template.html is the editable source and is kept in git, so the two must stay
in sync: always pack after editing. `check` exits 1 when they differ.
"""

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BUNDLE = HERE.parent / "index.html"
SOURCE = HERE / "template.html"
PAT = re.compile(r'(<script type="__bundler/template">)(\s*)(.*?)(\s*)(</script>)', re.S)


def encode(text):
    # Same encoding the bundler uses: raw UTF-8, "</" escaped so the script tag can't close early.
    return json.dumps(text, ensure_ascii=False).replace("</", "<\\u002F")


def read_bundle():
    html = BUNDLE.read_text(encoding="utf-8")
    m = PAT.search(html)
    if not m:
        sys.exit("template script not found in " + str(BUNDLE))
    return html, m


def main(cmd):
    html, m = read_bundle()
    current = json.loads(m.group(3))
    if cmd == "extract":
        SOURCE.write_text(current, encoding="utf-8", newline="\n")
        print("wrote", SOURCE)
    elif cmd == "pack":
        new = SOURCE.read_text(encoding="utf-8")
        out = html[:m.start(3)] + encode(new) + html[m.end(3):]
        BUNDLE.write_text(out, encoding="utf-8", newline="")
        print("packed", SOURCE.name, "->", BUNDLE.name, "(changed)" if new != current else "(no change)")
    elif cmd == "check":
        same = SOURCE.read_text(encoding="utf-8") == current
        print("in sync" if same else "OUT OF SYNC: run pack (or extract)")
        sys.exit(0 if same else 1)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
