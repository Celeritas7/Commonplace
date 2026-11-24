'use strict';
// Build a deliberately narrow Cloudflare Pages PILOT. Never publish a complete
// Commonplace checkout: it includes unfinished admin/backend source and large
// Python runtime files. The original GitHub Pages tree is not changed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'Coding', 'html_css_js_study');
const OUT = path.join(ROOT, 'dist-cloudflare');
const WEB_PREFIX = 'Coding/html_css_js_study/';
const SHARED = new Set([
  '_lib/gate.js', '_lib/supabase.js', '_lib/progress-backup.js', 'extras.js'
]);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// Stage-only transport: the real gate is still present, but a test profile
// cannot read or write the owner's production study snapshot. Do not put this
// version into the source Web Studio or its GitHub Pages deployment.
const STAGING_CLOUD = [
  '/* Cloudflare staging pilot: intentional local-only study data. */',
  '(function (root) {',
  " 'use strict';",
  ' root.WebStudioCloud = { mount: function (options) {',
  '   var pane = options && options.root;',
  '   if (!pane) return null;',
  "   var status = pane.querySelector('#wb-sync-status');",
  "   var account = pane.querySelector('#wb-sync-account');",
  "   var retry = pane.querySelector('#wb-sync-now');",
  "   var apply = pane.querySelector('#wb-sync-apply');",
  "   var summary = pane.querySelector('.wb-sync-details summary');",
  "   if (status) { status.dataset.state = 'offline';",
  "     status.textContent = 'Cloud sync is disabled in this Cloudflare pilot. Work saves only in this browser. Export a study backup before leaving.'; }",
  "   if (account) account.textContent = 'Staging preview — local storage only';",
  "   if (summary) summary.textContent = 'Staging · sync disabled';",
  "   if (retry) { retry.disabled = true; retry.title = 'Production account sync is disabled in this staging build'; }",
  '   if (apply) apply.hidden = true;',
  '   return { staging: true };',
  ' } };',
  '})(window);',
  ''
].join('\n');

function safeFile(item) {
  assert(item && typeof item.url === 'string', 'Invalid study pack entry');
  // Every original offline manifest URL must be an ordinary unencoded path.
  assert(/^[A-Za-z0-9_./-]+$/.test(item.url) && !item.url.startsWith('/'),
    'Unsafe offline manifest URL: ' + String(item.url));
  const source = path.resolve(WEB, item.url);
  const rel = path.relative(ROOT, source).split(path.sep).join('/');
  const permitted = rel.startsWith(WEB_PREFIX) ||
    SHARED.has(rel) || rel.startsWith('_lib/fonts/');
  assert(permitted, 'Offline pack references a path outside the audited public study assets: ' + rel);
  const stat = fs.lstatSync(source);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Not an ordinary source file: ' + rel);
  assert(stat.size <= 25 * 1024 * 1024, 'Cloudflare Pages pilot asset exceeds 25 MiB: ' + rel);
  return { source, rel };
}
function put(rel, bytes) {
  const target = path.resolve(OUT, rel);
  assert(target.startsWith(OUT + path.sep), 'Refusing to write outside staging output');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
function build() {
  const sourceManifest = JSON.parse(fs.readFileSync(path.join(WEB, 'offline-assets.json'), 'utf8'));
  assert.equal(sourceManifest.version, 1);
  assert.equal(sourceManifest.revision, digest(Buffer.from(JSON.stringify(sourceManifest.files))),
    'Source Web Studio manifest integrity failed');
  const destination = path.join(OUT, 'Commonplace');
  assert(destination.startsWith(OUT + path.sep));
  if (fs.existsSync(OUT)) {
    assert(!fs.lstatSync(OUT).isSymbolicLink(), 'Staging output must not be a symlink');
    fs.rmSync(OUT, { recursive: true, force: true });
  }
  fs.mkdirSync(OUT, { recursive: true });
  const used = new Set();
  const stagedManifest = structuredClone(sourceManifest);
  for (const item of stagedManifest.files) {
    const { source, rel } = safeFile(item);
    assert(!used.has(rel), 'Duplicate staging file: ' + rel);
    used.add(rel);
    let bytes = fs.readFileSync(source);
    assert.equal(bytes.length, item.bytes, 'Study pack file size changed: ' + rel);
    assert.equal(digest(bytes), item.sha256, 'Study pack source hash changed: ' + rel);
    if (item.url === 'studio-cloud.js') {
      bytes = Buffer.from(STAGING_CLOUD, 'utf8');
      item.bytes = bytes.length;
      item.sha256 = digest(bytes);
    }
    put('Commonplace/' + rel, bytes);
  }
  assert(used.has(WEB_PREFIX + 'index.html') && used.has(WEB_PREFIX + 'studio-cloud.js'));
  assert(used.has('_lib/gate.js'), 'Do not bypass the original Commonplace login gate');
  assert(used.has('_lib/supabase.js'), 'Real gate sign-in must remain available');

  stagedManifest.bytes = stagedManifest.files.reduce((n, file) => n + file.bytes, 0);
  stagedManifest.revision = digest(Buffer.from(JSON.stringify(stagedManifest.files)));
  put('Commonplace/' + WEB_PREFIX + 'offline-assets.json',
      Buffer.from(JSON.stringify(stagedManifest, null, 2) + '\n'));

  // The worker is deliberately excluded from the generated offline pack.
  const workerSource = path.join(WEB, 'sw.js');
  assert(fs.lstatSync(workerSource).isFile() && !fs.lstatSync(workerSource).isSymbolicLink());
  put('Commonplace/' + WEB_PREFIX + 'sw.js', fs.readFileSync(workerSource));

  const landing = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow">',
    '<title>Commonplace — Web Studio staging pilot</title></head>',
    '<body style="font:16px/1.6 system-ui,sans-serif;max-width:700px;margin:10vh auto;padding:0 20px">',
    '<h1>Commonplace · Web Studio staging</h1>',
    '<p>This is an isolated Cloudflare Pages pilot, not the main Commonplace application.</p>',
    '<p>Study files are local to this browser. Production progress synchronization is disabled.</p>',
    '<p><a href="/Commonplace/Coding/html_css_js_study/offline.html">Open Web Studio pilot</a></p>',
    '<p>Keep using your existing GitHub Pages Home Screen icon for normal studying.</p>',
    '</body></html>\n'
  ].join('\n');
  put('index.html', Buffer.from(landing, 'utf8'));
  // Cloudflare Pages can otherwise serve the staging landing for unknown
  // paths as an SPA fallback (HTTP 200). A real 404 is essential: don't make
  // excluded admin/backend paths look like deployed application resources.
  put('404.html', Buffer.from([
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="robots" content="noindex,nofollow">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Not found · Commonplace staging</title></head>',
    '<body><main><h1>Not found</h1>',
    '<p>This page is not part of the isolated Web Studio staging pilot.</p>',
    '<a href="/">Back to staging landing</a></main></body></html>\n'
  ].join(''), 'utf8'));
  put('robots.txt', Buffer.from('User-agent: *\nDisallow: /\n'));
  put('_headers', Buffer.from([
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  X-Robots-Tag: noindex, nofollow',
    '',
    '/Commonplace/Coding/html_css_js_study/sw.js',
    '  Cache-Control: no-cache, max-age=0, must-revalidate',
    '',
    '/Commonplace/Coding/html_css_js_study/offline-assets.json',
    '  Cache-Control: no-store',
    '',
    '/Commonplace/_lib/gate.js',
    '  Cache-Control: no-cache, max-age=0, must-revalidate',
    ''
  ].join('\n')));
  console.log('Cloudflare Web Studio pilot: ' + stagedManifest.files.length +
    ' verified study assets + worker; revision ' + stagedManifest.revision.slice(0, 12));
  console.log('Output: dist-cloudflare/ (staging only, never committed)');
}
build();
