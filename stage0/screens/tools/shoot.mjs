// Takes a picture of every sketch in a headless browser. Never opens a window.
//
//   node tools/shoot.mjs                  every sketch -> shots/<name>.png, 828 x 1792
//   node tools/shoot.mjs --only home-A,shop
//   node tools/shoot.mjs --out <folder>   write somewhere else
//   node tools/shoot.mjs --list <file>    also save a picture of the list page (it is always checked)
//   node tools/shoot.mjs --browser <path to Edge or Chrome>
//
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
const SCREENS = fileURLToPath(new URL('..', import.meta.url));
const ROOT = fileURLToPath(new URL('../..', import.meta.url)); // stage0, so ../scene/vendor resolves
const OUT = args.out || join(SCREENS, 'shots');
const W = 414, H = 896, SCALE = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/screens/index.html`;

function findBrowser() {
  if (args.browser) return args.browser;
  if (process.env.PRIMER_BROWSER) return process.env.PRIMER_BROWSER;
  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const tails = [['Microsoft', 'Edge', 'Application', 'msedge.exe'], ['Google', 'Chrome', 'Application', 'chrome.exe']];
  for (const tail of tails) for (const root of roots) {
    const p = join(root, ...tail);
    if (existsSync(p)) return p;
  }
  for (const p of ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    if (existsSync(p)) return p;
  }
  throw new Error('No browser found. Pass --browser <path>.');
}

const debugPort = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'primer-shots-'));
const browser = spawn(findBrowser(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
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
const ev = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;

let failed = false;
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: true });

  // the list of pictures lives in js/main.js; read it from there so the two never drift
  const source = await readFile(join(SCREENS, 'js', 'main.js'), 'utf8');
  const shots = [...source.matchAll(/\['([\w-]+)', '(\w+)', '(\w+)', '[^']*'\]/g)].map(m => ({ file: m[1], screen: m[2], tabs: m[3] }));
  const only = args.only ? String(args.only).split(',') : null;
  mkdirSync(OUT, { recursive: true });

  for (const shot of shots) {
    if (only && !only.includes(shot.file)) continue;
    await send('Page.navigate', { url: `${base}?screen=${shot.screen}&tabs=${shot.tabs}` });
    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) {
      await sleep(150);
      if (pageErrors.length) throw new Error(`${shot.file}: ${pageErrors.join('\n')}`);
      try { ready = (await ev('window.ready === true && document.readyState === "complete"')) === true; } catch { /* still loading */ }
    }
    if (!ready) throw new Error(`${shot.file}: the page never became ready`);
    await sleep(120);
    // anything that sticks out of its box is worth knowing about
    const spill = await ev(`[...document.querySelectorAll('#phone *')].filter(e => !e.closest('svg') && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline').map(e => (e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 30)).slice(0, 8).join(' | ')`);
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(OUT, `${shot.file}.png`), Buffer.from(r.data, 'base64'));
    console.log(`${shot.file}.png${spill ? `   spills: ${spill}` : ''}`);
  }

  // the list page should load too, with every picture found
  if (!only) {
    await send('Page.navigate', { url: base });
    let state = null;
    for (let i = 0; i < 60 && !state; i++) {
      await sleep(150);
      try { if (await ev('window.ready === true && document.readyState === "complete"')) state = await ev(`(() => { const im = [...document.images]; return im.filter(i => i.naturalWidth > 0).length + ' of ' + im.length; })()`); } catch { /* still loading */ }
    }
    if (pageErrors.length) throw new Error(`list: ${pageErrors.join('\n')}`);
    console.log(`list page: ${state || 'never became ready'} pictures loaded`);
    if (args.list) writeFileSync(String(args.list), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
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
