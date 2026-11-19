// Local test server, on one port (8821 unless --port): the app under /primer/, as GitHub Pages serves it,
// with stage 0 and the docs beside it, and a small stand-in for GitHub's API under /__gh.
// The stand-in only knows made-up test keys, listed in KEYS below, and a made-up data repo: the files under
// tests/fixtures/data, or another folder given with --data (a lesson folder in the data repo's layout).
//
//   node tests/serve.mjs [--port 8821] [--data <folder>]
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = {};
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) args[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
}
const PORT = Number(args.port) || 8821;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'data');
let DATA = args.data || FIXTURES;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.md': 'text/plain; charset=utf-8' };

let swBump = 0;
let served = [];   // every app path asked of this server, so a test can tell what the worker answered itself

// ---------- the stand-in for GitHub

const OWNER = 'test-owner', REPO = `/repos/${OWNER}/primer-data`;
const KEYS = {
  'test-good': {},
  'test-wrong-repo': { noRepo: true },
  'test-read-only': { readOnly: true },
  'test-all-repos': { others: ['some-other-private-repo', 'another-private-repo'], open: true },
  'test-listed-only': { others: ['listed-but-closed'], open: false }, // lists a repo it can't really open
};

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir).catch(() => [])) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}
async function seed() {
  const files = new Map();
  for (const p of await walk(DATA)) {
    const rel = relative(DATA, p).split(sep).join('/');
    if (rel.startsWith('notes/') || rel.startsWith('progress/')) continue;
    files.set(rel, await readFile(p));
  }
  return files;
}
let files = await seed();
const shas = new Map();
const shaOf = path => {
  const value = files.get(path);
  if (shas.get(path)?.value !== value) shas.set(path, { value, sha: createHash('sha1').update(path).update(value).digest('hex') });
  return shas.get(path).sha;
};
let down = false, fail = null, conflicts = 0, writes = 0, slow = 0, refuse = null;

async function api(req, res, url, body, raw) {
  const send = (status, b, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(typeof b === 'string' || Buffer.isBuffer(b) ? b : JSON.stringify(b));
  };
  const path = url.pathname.slice('/__gh'.length);
  // Controls for the tests: no key needed, and they never see a key.
  if (path === '/__files') { send(200, [...files.keys()]); return; }
  if (path === '/__file') { const f = files.get(url.searchParams.get('path')); send(200, f === undefined ? 'null' : f); return; }
  if (path === '/__writes') { send(200, { writes }); return; }
  if (path === '/__down') { down = url.searchParams.get('on') === '1'; send(200, { down }); return; }
  if (path === '/__slow') { slow = Number(url.searchParams.get('ms')) || 0; send(200, { slow }); return; }
  // a file that won't come down: blobs whose path holds this text are refused (a download that stops partway)
  if (path === '/__refuse') { refuse = url.searchParams.get('match') || null; send(200, { refuse }); return; }
  if (path === '/__conflict') { conflicts = Number(url.searchParams.get('n')); send(200, { conflicts }); return; }
  if (path === '/__fail') {
    const code = Number(url.searchParams.get('code'));
    fail = code ? { code, message: url.searchParams.get('message') || 'Refused' } : null;
    send(200, { fail });
    return;
  }
  if (path === '/__reset') { // back to how it started; ?data=<folder> seeds it from another folder, ?data=fixtures from the made-up one
    const d = url.searchParams.get('data');
    if (d) DATA = d === 'fixtures' ? FIXTURES : d;
    files = await seed(); down = false; fail = null; conflicts = 0; writes = 0; slow = 0; refuse = null; send(200, { files: files.size }); return; }
  if (path === '/__put') { files.set(url.searchParams.get('path'), raw); send(200, { files: files.size }); return; }
  if (path === '/__del') { files.delete(url.searchParams.get('path')); send(200, { files: files.size }); return; }
  if (down) { req.socket.destroy(); return; }
  if (slow) await new Promise(r => setTimeout(r, slow));

  const who = KEYS[(req.headers.authorization || '').replace('Bearer ', '')];
  if (!who) { send(401, { message: 'Bad credentials' }); return; }
  if (who.noRepo && path.startsWith(REPO)) { send(404, { message: 'Not Found' }); return; }
  if (path === REPO) { send(200, { full_name: `${OWNER}/primer-data`, private: true }); return; }
  if (path === '/user/repos') {
    const list = [{ name: 'primer-data', full_name: `${OWNER}/primer-data`, private: true }, { name: 'primer', full_name: `${OWNER}/primer`, private: false }];
    for (const n of who.others || []) list.push({ name: n, full_name: `${OWNER}/${n}`, private: true });
    send(200, list);
    return;
  }
  const other = path.match(new RegExp(`^/repos/${OWNER}/([^/]+)$`));
  if (other) {
    if ((who.others || []).includes(other[1]) && who.open) send(200, { full_name: `${OWNER}/${other[1]}`, private: true });
    else send(404, { message: 'Not Found' });
    return;
  }
  if (path.startsWith(`${REPO}/contents/`) && req.method === 'PUT') {
    if (who.readOnly) { send(403, { message: 'Resource not accessible by personal access token' }); return; }
    if (conflicts > 0) { conflicts--; send(409, { message: 'is at 4a39207fb015aacf5d7eb595e813a7119a209b58 but expected 888841dd0f4216a7ef1996bb76fb45b15e5b073e' }); return; }
    if (fail) { send(fail.code, { message: fail.message }); return; }
    const p = decodeURIComponent(path.slice(`${REPO}/contents/`.length));
    const { content, sha } = JSON.parse(body);
    if (files.has(p) && !sha) { send(422, { message: '"sha" wasn\'t supplied.' }); return; }
    files.set(p, Buffer.from(content, 'base64'));
    writes++;
    send(201, { content: { path: p, sha: shaOf(p) } });
    return;
  }
  if (path === `${REPO}/git/trees/main`) { send(200, { tree: [...files.keys()].map(p => ({ path: p, type: 'blob', sha: shaOf(p) })) }); return; }
  if (path.startsWith(`${REPO}/git/blobs/`)) {
    const sha = path.split('/').pop();
    const p = [...files.keys()].find(k => shaOf(k) === sha);
    if (!p || (refuse && p.includes(refuse))) { send(404, { message: 'Not Found' }); return; }
    send(200, files.get(p), { 'Content-Type': 'application/vnd.github.raw+json' });
    return;
  }
  send(404, { message: 'Not Found' });
}

// ---------- the app, under /primer/

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  if (url.pathname.startsWith('/__gh')) {
    try { await api(req, res, url, raw.toString(), raw); } catch (e) { res.writeHead(500); res.end(String(e)); }
    return;
  }
  if (url.pathname === '/__served') { const out = served; if (url.searchParams.get('clear')) served = []; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out)); return; }
  if (url.pathname === '/__swbump') { swBump++; res.writeHead(200); res.end(String(swBump)); return; }
  if (!url.pathname.startsWith('/primer/')) { res.writeHead(404); res.end('not found'); return; }
  let rel = decodeURIComponent(url.pathname.slice('/primer/'.length));
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  served.push(url.pathname);
  try {
    let body = await readFile(file);
    if (rel === 'sw.js' && swBump) body = Buffer.concat([body, Buffer.from(`\n// bump ${swBump}\n`)]); // stands in for a new release
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`app http://localhost:${PORT}/primer/  stand-in http://localhost:${PORT}/__gh  data ${DATA}`));
