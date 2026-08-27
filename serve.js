// Commonplace study server (Node fallback) — same behavior as serve.py:
// serves the app folder and injects the study layer into every HTML page.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = 8137;
const HERE = __dirname;
const ROOT = path.resolve(process.argv[2] || process.cwd());
const TAG = '<script src="/__cp/extras.js" defer></script>';
const MIME = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

if (!fs.existsSync(path.join(ROOT, 'index.html'))) { console.error('No index.html in ' + ROOT); process.exit(1); }

http.createServer((req, res) => {
  let clean;
  try { clean = decodeURIComponent(req.url.split('?')[0].split('#')[0]); } catch (e) { res.writeHead(400); res.end('Bad request'); return; }
  const send = (code, body, type) => { res.writeHead(code, { 'Content-Type': type || 'text/plain', 'Cache-Control': 'no-store' }); res.end(body); };
  if (clean.startsWith('/__cp/')) {
    const fn = path.join(HERE, path.basename(clean));
    if (fs.existsSync(fn)) send(200, fs.readFileSync(fn), 'text/javascript; charset=utf-8');
    else send(404, 'Not found');
    return;
  }
  let fp = path.normalize(path.join(ROOT, clean));
  if (!fp.startsWith(ROOT)) { send(403, 'Forbidden'); return; }
  try {
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
    if (!fs.existsSync(fp)) { send(404, 'Not found: ' + clean); return; }
    const ext = path.extname(fp).toLowerCase();
    if (ext === '.html' || ext === '.htm') {
      let html = fs.readFileSync(fp, 'utf8');
      html = html.includes('</body>') ? html.replace('</body>', TAG + '</body>') : html + TAG;
      send(200, html, MIME['.html']);
    } else {
      send(200, fs.readFileSync(fp), MIME[ext] || 'application/octet-stream');
    }
  } catch (e) { send(500, 'Server error'); }
}).listen(PORT, () => {
  console.log('Commonplace study server (Node)\n  Serving: ' + ROOT + '\n  Open:    http://localhost:' + PORT + '/\n  (Close this window to stop.)');
});
