// Films and stills of the answer-form sketches, and a test that each one works by real touch, all in a
// headless browser. Never opens a window.
//
//   node tools/capture.mjs --film all                  every form -> films/<form>.mp4 (828 by 1792, 30 fps, no sound)
//   node tools/capture.mjs --film number-dial          one form (or several, comma separated)
//   node tools/capture.mjs --still all                 one full-size picture each, as the wrong answer plays out -> shots/<form>.png
//   node tools/capture.mjs --shots 1,3.5,6 --form number-dial --out <folder>    frames at those seconds, to look at
//   node tools/capture.mjs --touch all                 the ghost's moves sent as real touches; checks it marks wrong, then right
//
// Options: --port 8872 (the local server), --debug-port 9391, --browser <path to Edge or Chrome>, --crf 27,
//          --after 1.35 (a still is taken this long after the first Check).
// Needs Node 22 or newer (the built-in WebSocket) and ffmpeg on the PATH for films. Nothing to install.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = {};
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) args[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
}
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ALL = ['number-dial', 'number-tower', 'number-pile', 'match-snap', 'match-string', 'match-sort', 'spot-pin', 'spot-regions', 'spot-lasso'];
const pick = v => (v === 'all' || v === true ? ALL : String(v).split(','));
const PORT = Number(args.port) || 8872, DEBUG = Number(args['debug-port']) || 9391;
const W = 414, H = 896;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- a plain file server for this folder
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(normalize(ROOT)) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise((res, rej) => { server.once('error', rej); server.listen(PORT, '127.0.0.1', res); });
const BASE = `http://127.0.0.1:${PORT}`;

// ---- the browser
function findBrowser() {
  if (args.browser) return args.browser;
  if (process.env.PRIMER_BROWSER) return process.env.PRIMER_BROWSER;
  for (const root of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean)) {
    for (const tail of [['Microsoft', 'Edge', 'Application', 'msedge.exe'], ['Google', 'Chrome', 'Application', 'chrome.exe']]) {
      const p = join(root, ...tail);
      if (existsSync(p)) return p;
    }
  }
  throw new Error('No browser found. Pass --browser <path>.');
}
const profile = mkdtempSync(join(tmpdir(), 'primer-inputs-'));
const browser = spawn(findBrowser(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', `--remote-debugging-port=${DEBUG}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
}
if (!target) { browser.kill(); server.close(); throw new Error('The browser did not start.'); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let nextId = 1;
const waiting = new Map(), errors = [];
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && waiting.has(d.id)) {
    const { res, rej } = waiting.get(d.id);
    waiting.delete(d.id);
    if (d.error) rej(new Error(d.error.message)); else res(d.result);
  }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map(a => a.value || a.description).join(' '));
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = nextId++;
  waiting.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const ev = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 120)}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
};
const shot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64');
await send('Runtime.enable');
await send('Page.enable');

async function open(url, scale) {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: scale, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  errors.length = 0;
  await send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) {
    await sleep(120);
    if (errors.length) throw new Error(errors.join('\n'));
    try { if (await ev('window.ready === true')) return; } catch { /* still loading */ }
  }
  throw new Error(`${url}: never ready`);
}

// Runs a film's frames in order; calls each(i, frame) and stops when the page says it's done.
async function run(id, each, extra = '') {
  await open(`${BASE}/index.html?form=${id}&film=1${extra}`, 2);
  for (let i = 0; i < 30 * 12; i++) {
    const f = await ev(`window.frame(${i})`);
    if (errors.length) throw new Error(errors.join('\n'));
    if (await each(i, f) === false || f.done) return f;
  }
  throw new Error(`${id}: the film never ended`);
}

let failed = false;
try {
  if (args.film) {
    mkdirSync(join(ROOT, 'films'), { recursive: true });
    for (const id of pick(args.film)) {
      const file = join(ROOT, 'films', `${id}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-an',
        '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', String(Number(args.crf) || 27), '-pix_fmt', 'yuv420p',
        '-profile:v', 'high', '-movflags', '+faststart', '-r', '30', file], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', code => (code === 0 ? res() : rej(new Error(`ffmpeg exited with ${code}`)))));
      const f = await run(id, async () => { const png = await shot(); if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r)); });
      ff.stdin.end();
      await done;
      const kb = Math.round(statSync(file).size / 1024);
      console.log(`${id}: ${f.t.toFixed(2)} s, ${kb} KB, marked ${f.results.join(' then ')}${kb > 1500 ? '  (OVER 1.5 MB)' : ''}`);
    }
  }
  if (args.still) {
    mkdirSync(join(ROOT, 'shots'), { recursive: true });
    const after = Number(args.after) || 1.35;
    for (const id of pick(args.still)) {
      let first = null;
      await run(id, async (i, f) => {
        if (first === null && f.results.length) first = f.t;
        if (first !== null && f.t >= first + after) { writeFileSync(join(ROOT, 'shots', `${id}.png`), await shot()); return false; }
      }, '&nohand=1');
      console.log(`${id}: shots/${id}.png`);
    }
  }
  if (args.shots) {
    const out = args.out || join(ROOT, 'shots');
    mkdirSync(out, { recursive: true });
    const times = String(args.shots).split(',').map(Number);
    for (const id of pick(args.form || 'all')) {
      await run(id, async (i, f) => {
        const t = times.find(x => Math.abs(x - f.t) < 1 / 60);
        if (t !== undefined) writeFileSync(join(out, `${id}-${t.toFixed(2).padStart(5, '0')}.png`), await shot());
        if (f.t > Math.max(...times)) return false;
      });
      console.log(`${id}: frames in ${out}`);
    }
  }
  if (args.touch) {
    // Real touches go through the browser at scale 1 (at scale 2 a screenshot can re-send a held touch).
    for (const id of pick(args.touch)) {
      await open(`${BASE}/index.html?form=${id}&touch=1`, 1);
      const t0 = Date.now();
      let held = false;
      while (Date.now() - t0 < 20000) {
        // moves that piled up since the last look are sent as one, the latest, as a touch screen would
        const due = (await ev('window.__take()')).filter((m, i, all) => !(m.type === 'pointermove' && all[i + 1] && all[i + 1].type === 'pointermove'));
        for (const { type, x, y } of due) {
          if (type === 'pointerdown') { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); held = true; }
          else if (type === 'pointermove' && held) await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
          else if (type === 'pointerup') { await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); held = false; }
        }
        if (!due.length && !(await ev('window.__ghostBusy()'))) break;
        await sleep(8);
      }
      await sleep(400);
      const results = await ev('window.__results.slice()');
      const ok = results.join() === 'wrong,right' && !errors.length;
      if (!ok) failed = true;
      const state = ok ? '' : await ev(`(() => { const b = document.querySelector('.lfoot .btn'); return '; then the button said ' + b.textContent + (b.disabled ? ' (off)' : '') + ', answered ' + window.__form.answered(); })()`);
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}: by real touch it marked ${results.join(' then ') || 'nothing'}${state}${errors.length ? `; errors: ${errors.join(' | ')}` : ''}`);
    }
  }
} catch (e) {
  failed = true;
  console.error(String(e.stack || e.message || e));
} finally {
  try { await send('Browser.close'); } catch { /* already gone */ }
  await sleep(600);
  browser.kill();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it */ }
}
process.exit(failed ? 1 : 0);
