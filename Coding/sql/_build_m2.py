"""Bundle Module 2 in the same format as Module 1.

Module 1 is the existing bundled HTML file. We:
  1. Extract its manifest + template
  2. Replace the content asset (UUID 8d3d5625-...) with our authored Module 2 content
  3. Update the <title> in the template
  4. Re-emit, escaping </ as </ so embedded </script> doesn't prematurely close
"""
import json, base64, gzip, re

src = open("module-01.html").read()


def find_block(text, tag):
    """Find the inner content slice of a script block by type attribute."""
    start = text.find('<script type="' + tag + '">')
    cs = text.find(">", start) + 1
    end = text.find("</script>", cs)
    return cs, end


# ---- read original ----
m_cs, m_ce = find_block(src, "__bundler/manifest")
e_cs, e_ce = find_block(src, "__bundler/ext_resources")
# Template needs the special-decoded form (the </ inside is encoded as </)
t_start = src.find('<script type="__bundler/template">')
t_cs = src.find(">", t_start) + 1
# Find the LAST </script> after t_cs but before end of file — but actually the template
# block uses escaped </ so its terminator IS the literal </script>.
# So normal find works. The other blocks' </script> are easy.
t_ce = src.find("</script>", t_cs)

manifest = json.loads(src[m_cs:m_ce])
ext_resources = json.loads(src[e_cs:e_ce])
template_str = json.loads(src[t_cs:t_ce])

print("Loaded original:")
print(f"  manifest entries: {len(manifest)}")
print(f"  template length: {len(template_str)} chars")
print(f"  ext_resources: {ext_resources}")

# ---- substitute content ----
new_content = open("_m2_content.js").read()
gz = gzip.compress(new_content.encode("utf-8"))
b64 = base64.b64encode(gz).decode("ascii")
CONTENT_UUID = "8d3d5625-efae-46cb-9572-62dbc177c2fb"
manifest[CONTENT_UUID] = {
    "data": b64,
    "mime": "application/javascript",
    "compressed": True,
}

# Update title in template
template_str = template_str.replace(
    "SQL · Retrieving Data — Module 01",
    "SQL · Filtering & Sorting — Module 02",
)


def escape_close_tags(json_str):
    """Replace </ with <\\u002F inside the JSON string content.

    The JSON we're embedding contains literal </script>, </title>, etc. If the
    browser HTML parser sees </script> it will close the wrapping <script type=...>
    block prematurely. Escaping the / as a Unicode escape keeps the JSON valid
    while making the embedded text safe to put inside <script>.
    """
    return json_str.replace("</", "<\\u002F")


# ---- emit ----
new_manifest_json = json.dumps(manifest, separators=(",", ":"))
new_template_json = escape_close_tags(json.dumps(template_str))
new_ext_json = json.dumps(ext_resources)

out = src
# Replace in reverse file order so earlier indices remain valid for the next
# substitution. Layout: manifest (early) -> ext_resources -> template (late)
# So: template first, then ext_resources, then manifest.
t_cs2, t_ce2 = find_block(out, "__bundler/template")
out = out[:t_cs2] + new_template_json + out[t_ce2:]

e_cs2, e_ce2 = find_block(out, "__bundler/ext_resources")
out = out[:e_cs2] + new_ext_json + out[e_ce2:]

m_cs2, m_ce2 = find_block(out, "__bundler/manifest")
out = out[:m_cs2] + new_manifest_json + out[m_ce2:]

open("module-02.html", "w").write(out)
print("\nWrote module-02.html:", len(out), "bytes")
print("Title check:", "SQL · Filtering & Sorting" in out)
