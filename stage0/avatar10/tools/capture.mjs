// Takes the stills of the tenth avatar round (six variants each of round 9's Plump and Bean) in a headless
// browser. Never opens a window. Copied from the ninth round's tool, with its own ports.
//
//   node tools/capture.mjs --stills all          shots/crow-<id>.png (12), a lineup and a face sheet per family
//                                                (shots/crow-lineup-plump.png, shots/crow-faces-plump.png, and
//                                                the same for bean) and shots/crow-icons.png (all twelve small)
//   node tools/capture.mjs --stills crow-plump-keen,crow-faces-plump   some of them
//   node tools/capture.mjs --url "lineup=crow-lineup-bean&room=1" --name room --out <folder>
//                                                one picture of any setting (its size is taken from the page,
//                                                or give --size 414x414)
//
// Options: --out <folder>, --browser <path to Edge or Chrome>, --port 8910, --debug-port 9352,
// --tmp <folder> for the browser's throwaway profile (the system temp folder otherwise).
// Needs Node 22 or newer (it uses the built-in WebSocket). No packages to install.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map(a => { const [k, ...v] = a.trim().split(' '); return [k, v.join(' ') || true]; }));
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = args.out || ROOT;
const PORT = Number(args.port) || 8910;
const DEBUG_PORT = Number(args['debug-port']) || 9352;
const SCALE = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((res, rej) => { server.once('error', rej); server.listen(PORT, '127.0.0.1', res); });
const base = `http://127.0.0.1:${PORT}/index.html`;

function findBrowser() {
  if (args.browser) return args.browser;
  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  for (const tail of [['Microsoft', 'Edge', 'Application', 'msedge.exe'], ['Google', 'Chrome', 'Application', 'chrome.exe']]) {
    for (const root of roots) { const p = join(root, ...tail); if (existsSync(p)) return p; }
  }
  for (const p of ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    if (existsSync(p)) return p;
  }
  throw new Error('No browser found. Pass --browser <path>.');
}

const TMP = typeof args.tmp === 'string' ? args.tmp : tmpdir();
mkdirSync(TMP, { recursive: true });
const profile = mkdtempSync(join(TMP, 'primer-avatar10-'));
const browser = spawn(findBrowser(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=414,414', 'about:blank'], { stdio: 'ignore', windowsHide: true });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
}
if (!target) { browser.kill(); server.close(); throw new Error('The browser did not start.'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let nextId = 1;
const waiting = new Map();
const pageErrors = [];
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && waiting.has(d.id)) {
    const { res, rej } = waiting.get(d.id);
    waiting.delete(d.id);
    if (d.error) rej(new Error(d.error.message)); else res(d.result);
  }
  if (d.method === 'Runtime.exceptionThrown') pageErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') pageErrors.push(d.params.args.map(a => a.value || a.description).join(' '));
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = nextId++;
  waiting.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const ev = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expression}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
};
const shot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64');
const viewport = (w, h, s = SCALE) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: s, mobile: false });

async function open(query, w = 414, h = 414, s = SCALE) {
  await viewport(w, h, s);
  await send('Page.navigate', { url: `${base}?${query}` });
  for (let i = 0; i < 150; i++) {
    await sleep(100);
    if (pageErrors.length) throw new Error(`${query}: ${pageErrors.join('\n')}`);
    try { if (await ev('window.ready === true')) return; } catch { /* still loading */ }
  }
  throw new Error(`${query}: the page never became ready`);
}
// a page whose canvas sets its own size: open it, then fit the viewport to the canvas
async function openFitted(query) {
  const s = /(^|&)room=/.test(query) ? 1 : SCALE;
  await open(query, 1800, 900, s);
  const [w, h] = await ev('[parseInt(document.getElementById("art").style.width), parseInt(document.getElementById("art").style.height)]');
  await viewport(w, h, s);
  await sleep(150);
}
// crow-plump -> pic=crow-plump; crow-lineup -> lineup=crow-lineup
let LINEUPS = [];
const queryFor = name => LINEUPS.includes(name) ? `lineup=${name}` : `pic=${name}`;

let failed = false;
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await open('');
  const { pictures, extra, lineups } = await ev('window.catalogue');
  LINEUPS = lineups;

  if (args.url) {
    if (args.size) {
      const [w, h] = String(args.size).split('x').map(Number);
      await open(String(args.url), w, h);
    } else await openFitted(String(args.url));
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, `${args.name || 'page'}.png`), await shot());
    console.log(`${args.name || 'page'}.png`);
  }

  if (args.stills) {
    const all = [...pictures, ...lineups];
    const names = args.stills === 'all' || args.stills === true ? [...all] : String(args.stills).split(',');
    all.push(...extra);
    const dir = args.out ? OUT : join(OUT, 'shots');
    mkdirSync(dir, { recursive: true });
    for (const name of names) {
      if (!all.includes(name)) throw new Error(`No picture called ${name}`);
      if (lineups.includes(name)) await openFitted(queryFor(name));
      else await open(queryFor(name));
      writeFileSync(join(dir, `${name}.png`), await shot());
      console.log(`${name}.png`);
    }
  }
} catch (e) {
  failed = true;
  console.error(String(e.message || e));
} finally {
  try { await send('Browser.close'); } catch { /* already gone */ }
  await sleep(600);
  browser.kill();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it for a moment */ }
}
process.exit(failed ? 1 : 0);
