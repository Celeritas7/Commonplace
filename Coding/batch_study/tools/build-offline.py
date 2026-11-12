"""Generate the complete BAT pack from repository files and local dependencies.
Run after any BAT or shared dependency edit. CI refreshes it on every push.
"""
from pathlib import Path
from urllib.parse import unquote
import hashlib,json,os,re
root=Path(__file__).resolve().parents[1]
repo=root.parents[1]
skip={'Temp','tools','tests','.git'}
files={p for p in root.rglob('*') if p.is_file() and not set(p.relative_to(root).parts)&skip and p.name not in {'sw.js','offline-assets.json','OFFLINE.md'} and '.tests.' not in p.name}
# Dependencies created dynamically by gate / reading-sync / dc runtime.
files.update(repo/p for p in ['_lib/supabase.js','_lib/dc/react.production.min.js','_lib/dc/react-dom.production.min.js','_lib/react/babel.min.js'])
pending=list(files)
while pending:
 p=pending.pop()
 if p.suffix not in {'.html','.js','.css','.json'}:continue
 text=p.read_text(errors='replace')
 refs=re.findall(r'''(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^)'"\s]+)''',text)
 refs=[a or b for a,b in refs]+re.findall(r'''["']((?:\.\./|\./|_lib/)[^"'<>\n]+)["']''',text)
 for ref in refs:
  ref=unquote(ref.split('?')[0].split('#')[0])
  if ':' in ref or not ref or ref.startswith('/'):continue
  target=(p.parent/ref).resolve()
  if (target.is_relative_to(root) or target.is_relative_to(repo/'_lib') or target in {repo/'extras.js',repo/'reading-sync.js'}) and target.is_file() and target not in files and target.name not in {'offline-assets.json','sw.js'}:
   files.add(target);pending.append(target)
entries=[]
for p in sorted(files):
 data=p.read_bytes();entries.append({'url':os.path.relpath(p,root).replace(os.sep,'/'),'bytes':len(data),'revision':hashlib.sha256(data).hexdigest()})
(root/'offline-assets.json').write_text(json.dumps({'files':entries},indent=2)+'\n')
print(len(entries),'files,',sum(f['bytes'] for f in entries),'bytes')
