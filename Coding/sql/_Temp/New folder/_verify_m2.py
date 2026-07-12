import json, base64, gzip, re

text = open("module-02.html").read()


def find_block(text, tag):
    start = text.find('<script type="' + tag + '">')
    cs = text.find(">", start) + 1
    end = text.find("</script>", cs)
    return cs, end


m_cs, m_ce = find_block(text, "__bundler/manifest")
t_cs, t_ce = find_block(text, "__bundler/template")

manifest = json.loads(text[m_cs:m_ce])
template_str = json.loads(text[t_cs:t_ce])

# Title
title_m = re.search(r'<title>([^<]+)</title>', template_str)
print("Title:", title_m.group(1) if title_m else "NOT FOUND")

# Confirm template has Module 2 references
for kw in ["Filtering & Sorting", "Module 02"]:
    found = kw in template_str
    print(f"  template contains '{kw}': {found}")

# Decode content asset
CONTENT_UUID = "8d3d5625-efae-46cb-9572-62dbc177c2fb"
e = manifest[CONTENT_UUID]
data = base64.b64decode(e["data"])
if e.get("compressed"):
    data = gzip.decompress(data)
content = data.decode("utf-8")

print("\nContent extracted:", len(content), "chars")
print("--- Keyword check ---")
for kw in ["Filtering & Sorting", "WHERE", "ORDER BY", "LIMIT", "n: 2"]:
    cnt = content.count(kw)
    print(f"  {'OK' if cnt > 0 else 'MISS'} '{kw}': {cnt}")

print("\nManifest entries:", len(manifest), "(expect 20)")
