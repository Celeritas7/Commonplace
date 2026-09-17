#!/usr/bin/env python3
"""
nb_to_note.py — convert a Jupyter notebook into an interactive HTML study note.

Usage:
    python nb_to_note.py input.ipynb --tag classical-ml --title "My topic" \
        --source "Notion / my notebook" -o classical-ml/my-topic.html

What it does:
  - markdown cells  -> prose (LaTeX $...$ / $$...$$ preserved for MathJax)
  - code cells      -> editable, runnable Pyodide cells (NumPy works)
  - saved outputs   -> shown beneath each cell (text + PNG images)
  - wraps it all in the same themed note chrome as _template.html
"""
import json, re, html, sys, argparse, base64, os

try:
    import markdown as md
except Exception:
    md = None

MATH_BLOCK = re.compile(r'(\$\$.*?\$\$|\$[^$\n]+?\$)', re.S)

def render_markdown(text):
    """Markdown -> HTML, protecting math spans from the markdown processor."""
    spans = []
    def stash(m):
        spans.append(m.group(0)); return f"\x00MATH{len(spans)-1}\x00"
    protected = MATH_BLOCK.sub(stash, text)
    if md:
        body = md.markdown(protected, extensions=['fenced_code', 'tables'])
    else:  # minimal fallback
        body = "<p>" + protected.replace("\n\n", "</p><p>") + "</p>"
    for i, s in enumerate(spans):
        body = body.replace(f"\x00MATH{i}\x00", s)
    return body

def code_outputs(outputs):
    """Render saved notebook outputs (text streams, results, PNGs)."""
    chunks = []
    for o in outputs:
        t = o.get("output_type")
        if t == "stream":
            chunks.append(html.escape("".join(o.get("text", []))))
        elif t in ("execute_result", "display_data"):
            data = o.get("data", {})
            if "image/png" in data:
                b64 = data["image/png"]
                if isinstance(b64, list): b64 = "".join(b64)
                chunks.append(f'<img src="data:image/png;base64,{b64}" '
                              f'style="max-width:100%;border-radius:8px;margin:.4rem 0"/>')
            elif "text/plain" in data:
                chunks.append(html.escape("".join(data["text/plain"])))
        elif t == "error":
            chunks.append(html.escape("\n".join(o.get("traceback", []))))
    return "\n".join(chunks)

def convert(nb_path, tag, title, source):
    nb = json.load(open(nb_path, encoding="utf-8"))
    parts, ci = [], 0
    for cell in nb.get("cells", []):
        src = "".join(cell.get("source", []))
        if cell.get("cell_type") == "markdown":
            if src.strip():
                parts.append(f'<div class="md">{render_markdown(src)}</div>')
        elif cell.get("cell_type") == "code":
            if not src.strip():
                continue
            out = code_outputs(cell.get("outputs", []))
            out_html = (f'<div class="code-out" id="out{ci}">{out}</div>'
                        if out else f'<div class="code-out" id="out{ci}"></div>')
            parts.append(f'''<div class="code-cell">
  <textarea id="code{ci}" spellcheck="false">{html.escape(src)}</textarea>
  <div class="code-bar"><button class="btn run" data-i="{ci}">&#9654; Run</button>
    <span class="meta status" id="st{ci}"></span></div>
  {out_html}
</div>''')
            ci += 1
    return TEMPLATE.format(title=html.escape(title), tag=html.escape(tag),
                           source=html.escape(source), body="\n".join(parts))

TEMPLATE = r'''<!DOCTYPE html>
<html lang="en" data-tag="{tag}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title} — AI study note</title>
<script>window.MathJax={{tex:{{inlineMath:[['$','$'],['\\(','\\)']]}}}};</script>
<script async src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js"></script>
<style>
:root{{--bg:#fbfaf7;--surface:#fff;--text:#23221f;--muted:#6b6a64;--border:#e7e4dc;--code-bg:#f4f2ec;--accent:#534ab7}}
html[data-tag="deep-learning"]{{--accent:#0f6e56}} html[data-tag="nlp-llm"]{{--accent:#993c1d}}
html[data-tag="math"]{{--accent:#185fa5}} html[data-tag="libraries"]{{--accent:#854f0b}} html[data-tag="projects"]{{--accent:#993556}}
html[data-theme="dark"]{{--bg:#1a1916;--surface:#23221f;--text:#ecebe6;--muted:#a3a199;--border:#3a3833;--code-bg:#2a2925}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.7;font-size:17px}}
.wrap{{max-width:820px;margin:0 auto;padding:2rem 1.25rem 5rem}}
h1{{font-size:2rem;font-weight:650;margin:.2rem 0 .4rem}} h2{{font-size:1.3rem;font-weight:600;margin:2rem 0 .7rem;padding-top:.5rem;border-top:1px solid var(--border)}} h3{{font-size:1.05rem;margin:1.2rem 0 .4rem}}
a{{color:var(--accent)}} img{{max-width:100%}}
code{{font-family:ui-monospace,Menlo,Consolas,monospace;background:var(--code-bg);padding:.1em .35em;border-radius:5px;font-size:.9em}}
pre{{background:var(--code-bg);padding:.9rem 1rem;border-radius:10px;overflow:auto}} pre code{{background:none;padding:0}}
.md table{{border-collapse:collapse;margin:1rem 0}} .md td,.md th{{border:1px solid var(--border);padding:.4rem .7rem}}
.topbar{{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem}}
.chip{{font-size:.78rem;font-weight:600;color:#fff;background:var(--accent);padding:.2rem .6rem;border-radius:999px}}
.meta{{font-size:.85rem;color:var(--muted)}} .spacer{{flex:1}}
.btn{{font:inherit;font-size:.85rem;cursor:pointer;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:.35rem .7rem}} .btn:hover{{border-color:var(--accent)}}
.code-cell{{background:var(--code-bg);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin:1rem 0}}
.code-cell textarea{{width:100%;border:0;background:transparent;color:var(--text);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85rem;line-height:1.6;padding:.9rem 1rem;resize:vertical;min-height:90px;outline:none}}
.code-bar{{display:flex;align-items:center;gap:.6rem;padding:.5rem .8rem;border-top:1px solid var(--border)}}
.code-out{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.82rem;white-space:pre-wrap;padding:0 1rem;color:var(--muted)}}
.code-out:not(:empty){{padding:.7rem 1rem}}
footer{{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--border);font-size:.82rem;color:var(--muted)}}
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <span class="chip">#{tag}</span>
    <span class="meta">Source: {source}</span>
    <span class="spacer"></span>
    <button class="btn" id="reviewBtn">Mark reviewed</button>
    <button class="btn" id="themeBtn">&#9680; theme</button>
  </div>
  <h1>{title}</h1>
  {body}
  <footer>Converted from notebook · #{tag} · edit any code cell and Run.</footer>
</div>
<script>
const NID=location.pathname.split('/').pop()||'note',root=document.documentElement,$=s=>document.querySelector(s);
if(localStorage.getItem('theme-'+NID)==='dark')root.setAttribute('data-theme','dark');
$('#themeBtn').onclick=()=>{{const d=root.getAttribute('data-theme')==='dark';root.setAttribute('data-theme',d?'light':'dark');localStorage.setItem('theme-'+NID,d?'light':'dark');}};
const rb=$('#reviewBtn');function rr(){{const t=localStorage.getItem('reviewed-'+NID);rb.textContent=t?('Reviewed '+t):'Mark reviewed';}}
rb.onclick=()=>{{localStorage.setItem('reviewed-'+NID,new Date().toISOString().slice(0,10));rr();}};rr();
let pyodide=null;
document.querySelectorAll('.run').forEach(btn=>btn.onclick=async()=>{{
  const i=btn.dataset.i,st=document.getElementById('st'+i),out=document.getElementById('out'+i);
  if(!pyodide){{st.textContent='loading Python… (first run only)';
    await new Promise(r=>{{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';s.onload=r;document.head.appendChild(s);}});
    pyodide=await loadPyodide();await pyodide.loadPackage('numpy');st.textContent='';}}
  out.textContent='';pyodide.setStdout({{batched:t=>out.textContent+=t+"\n"}});
  try{{await pyodide.runPythonAsync(document.getElementById('code'+i).value);}}catch(e){{out.textContent+="\n"+e;}}
}});
</script>
</body>
</html>'''

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("notebook")
    ap.add_argument("--tag", default="classical-ml")
    ap.add_argument("--title", default=None)
    ap.add_argument("--source", default="Jupyter notebook")
    ap.add_argument("-o", "--out", default=None)
    a = ap.parse_args()
    title = a.title or os.path.splitext(os.path.basename(a.notebook))[0].replace("_", " ")
    out = a.out or os.path.splitext(a.notebook)[0] + ".html"
    html_doc = convert(a.notebook, a.tag, title, a.source)
    open(out, "w", encoding="utf-8").write(html_doc)
    print(f"wrote {out}  ({len(html_doc)//1024} KB)")
