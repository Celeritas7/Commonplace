'use strict';
// Phase 2 Cloudflare pilot: READ-ONLY verification of an operator-supplied
// *.pages.dev hostname. No cookies, auth credentials or writes are sent.
// Never run this with a production Commonplace/GitHub Pages origin.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'dist-cloudflare');
const STUDY = 'Commonplace/Coding/html_css_js_study/';
const STUDY_URL = '/' + STUDY;
const DIGEST = data => crypto.createHash('sha256').update(data).digest('hex');
const MAX_BYTES = 25 * 1024 * 1024;

function stagingOrigin(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Cloudflare staging URL is required (e.g. https://your-pilot.pages.dev/).');
  }
  let url;
  try { url = new URL(input); } catch (_) { throw new Error('Use a valid https://*.pages.dev/ URL.'); }
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Only the HTTPS root of a Cloudflare Pages pilot may be inspected; do not supply credentials, paths or query strings.');
  }
  const hostname = url.hostname.toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+pages\.dev$/.test(hostname) ||
      hostname === 'pages.dev' || hostname.endsWith('.pages.dev.pages.dev')) {
    throw new Error('The target must be a distinct *.pages.dev staging hostname, not GitHub Pages, Vercel or production.');
  }
  return url.origin;
}
function pilotFiles(stagedManifest, origin) {
  assert(stagedManifest && stagedManifest.version === 1 && Array.isArray(stagedManifest.files));
  assert.equal(DIGEST(Buffer.from(JSON.stringify(stagedManifest.files))),
    stagedManifest.revision, 'Local staging manifest is not internally consistent');
  const result = [], seen = new Set();
  for (const entry of stagedManifest.files) {
    assert(entry && typeof entry.url === 'string' && /^[A-Za-z0-9_./-]+$/.test(entry.url));
    assert(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && entry.bytes <= MAX_BYTES);
    assert(/^[a-f0-9]{64}$/.test(entry.sha256));
    const url = new URL(entry.url, origin + STUDY_URL);
    assert.equal(url.origin, origin);
    assert(url.pathname.startsWith('/Commonplace/'),
      'Refusing an asset outside the expected Commonplace staging subtree');
    assert(!seen.has(url.pathname), 'Duplicate asset: ' + url.pathname);
    seen.add(url.pathname);
    result.push({ path: url.pathname, bytes: entry.bytes, sha256: entry.sha256 });
  }
  assert.equal(stagedManifest.bytes, result.reduce((n, entry) => n + entry.bytes, 0));
  return result;
}
async function request(origin, resource, { expectMissing = false } = {}) {
  const target = new URL(resource, origin);
  assert.equal(target.origin, origin);
  assert(!target.username && !target.password && !target.search && !target.hash);
  // No cookies/auth headers, redirects or third-party URLs; the check is
  // deliberately unable to authenticate or modify account data.
  const response = await fetch(target.href, {
    redirect: 'manual',
    headers: { Accept: expectMissing ? 'text/html' : '*/*' },
    signal: AbortSignal.timeout(15000)
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error(resource + ': unexpected redirect; Cloudflare staging links must remain on this origin');
  }
  if (expectMissing) {
    assert.equal(response.status, 404,
      resource + ': staging must return HTTP 404, never reveal developer, admin, or Python source');
    return { response, body: Buffer.alloc(0) };
  }
  assert.equal(response.status, 200, resource + ': expected HTTP 200, got ' + response.status);
  const declared = Number(response.headers.get('content-length') || 0);
  assert(!declared || declared <= MAX_BYTES,
    resource + ': response exceeds Cloudflare pilot file-size policy');
  const body = Buffer.from(await response.arrayBuffer());
  assert(body.length <= MAX_BYTES, resource + ': response exceeds file-size limit');
  return { response, body };
}
function matchingMime(response, pathname) {
  const mime = (response.headers.get('content-type') || '').toLowerCase();
  if (pathname.endsWith('.js')) return /javascript|ecmascript/.test(mime);
  if (pathname.endsWith('.css')) return mime.includes('text/css');
  if (pathname.endsWith('.html')) return mime.includes('text/html');
  if (pathname.endsWith('.json')) return mime.includes('json');
  return true;
}
function readExpected() {
  const manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT, STUDY, 'offline-assets.json')));
  assert.equal(manifest.files.length, 58, 'Review the new manifest before changing the expected Web Studio pilot count');
  return manifest;
}
async function verify(originInput) {
  const origin = stagingOrigin(originInput);
  const manifest = readExpected(), paths = pilotFiles(manifest, origin);
  const local = relative => fs.readFileSync(path.join(OUTPUT, relative));
  console.log('Checking isolated Cloudflare Pages pilot: ' + origin);
  const home = await request(origin, '/');
  assert(home.body.toString('utf8').includes('Web Studio staging'),
    'The root is not the dedicated Web Studio staging landing page');
  assert(/noindex/i.test(home.response.headers.get('x-robots-tag') || ''),
    'Staging must opt out of search indexing through _headers');
  const [liveManifest, worker] = await Promise.all([
    request(origin, STUDY_URL + 'offline-assets.json'),
    request(origin, STUDY_URL + 'sw.js')
  ]);
  assert(matchingMime(liveManifest.response, 'offline-assets.json'),
    'Hosted manifest returned wrong MIME type');
  assert(matchingMime(worker.response, 'sw.js'), 'Hosted worker returned wrong MIME type');
  assert.equal(DIGEST(worker.body), DIGEST(local(STUDY + 'sw.js')),
    'Live service worker does not match the built staging worker');
  assert(/no-store/i.test(liveManifest.response.headers.get('cache-control') || ''),
    'Staging manifest must not be cached by CDN/browser');
  assert(/no-cache|max-age=0/i.test(worker.response.headers.get('cache-control') || ''),
    'Staging service worker needs update-friendly cache headers');
  const received = JSON.parse(liveManifest.body.toString('utf8'));
  assert.equal(received.revision, manifest.revision,
    'Hosted staging pack is stale or belongs to a different build');
  assert.equal(received.files.length, paths.length);
  assert.equal(received.bytes, manifest.bytes);
  assert.equal(DIGEST(Buffer.from(JSON.stringify(received.files))), received.revision);
  console.log('PASS staging landing, release manifest, service worker and update headers');

  let checked = 0;
  for (const asset of paths) {
    const { body, response } = await request(origin, asset.path);
    assert(matchingMime(response, asset.path), asset.path + ': incorrect static-asset MIME type');
    assert.equal(body.length, asset.bytes, asset.path + ': live file size differs from built pack');
    assert.equal(DIGEST(body), asset.sha256,
      asset.path + ': live SHA-256 differs from built manifest');
    checked++;
  }
  console.log('PASS ' + checked + ' exact deployed study assets (SHA-256 / size / MIME)');

  const stagedSync = (await request(origin, STUDY_URL + 'studio-cloud.js')).body.toString('utf8');
  assert(stagedSync.includes('Cloud sync is disabled in this Cloudflare pilot') &&
    !stagedSync.includes('web_studio_sync_write') &&
    !stagedSync.includes('supabase.co'), 'Staging sync module must be local-only');
  assert.equal(DIGEST((await request(origin, '/Commonplace/_lib/gate.js')).body),
    DIGEST(local('Commonplace/_lib/gate.js')), 'Original shared gate must remain unchanged');
  for (const forbidden of [
    '/Commonplace/platform/README.md',
    '/Commonplace/Coding/Python/index.html',
    '/Commonplace/Coding/html_css_js_study/tests/worker.cjs',
    '/Commonplace/Coding/html_css_js_study/docs/PHASE5_IPAD_ACCEPTANCE.md',
    '/Commonplace/.github/workflows/web-studio.yml'
  ]) await request(origin, forbidden, { expectMissing: true });
  console.log('PASS local-only pilot sync, unchanged login gate and excluded-source HTTP 404');
  console.log('Live static deployment: PASS. OAuth and physical iPad offline startup: NOT TESTED.');
}
if (require.main === module) {
  verify(process.env.CLOUDFLARE_STAGING_URL || process.argv[2]).catch(error => {
    console.error('Live pilot verification failed:', error.message);
    process.exitCode = 1;
  });
}
module.exports = { stagingOrigin, pilotFiles, matchingMime, verify };
