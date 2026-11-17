// Films the scene, one exact frame at a time, in a headless browser. Never opens a window.
//
//   node tools/capture.mjs --look night            film  -> films/night.mp4
//   node tools/capture.mjs --look all              all four looks
//   node tools/capture.mjs --look mix --still 17.8 one full-size picture -> stills/mix.png
//   node tools/capture.mjs --look mix --shots 1,6,12 --out <folder>   quick check frames
//   node tools/capture.mjs --look mix --storm bands               the scene with one hurricane drawing -> films/mix-bands.mp4
//   node tools/capture.mjs --look mix --storm all --closeup       each drawing close up, a square 4 second loop -> films/storm-<id>.mp4
//   node tools/capture.mjs --look mix --storm all --closeup --still 1   the close-up as a picture -> stills/storm-<id>.png
//   node tools/capture.mjs --look mix --storm all --still 17.8    the whole scene with each drawing -> stills/storm-<id>-scene.png
//
// Options: --out <folder> (default: the scene folder), --fps 30, --crf 24, --hold 0.5, --name <file name without .mp4>,
//          --browser <path to Edge or Chrome>, --ffmpeg <path> (default: ffmpeg on PATH),
//          --port <local server port>, --debug-port <browser debugging port> (both picked freely if left out).
// The films kept in films/ were made with --crf 24 (bright, mix), 25 (night) and 27 (paper), to stay near 2 MB each,
// and the storm close-ups with --crf 22. mix-r1.mp4 is the Mix film from before the hurricane was redrawn.
// Needs Node 22 or newer (it uses the built-in WebSocket). No packages to install.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map(a => { const [k, ...v] = a.trim().split(' '); return [k, v.join(' ') || true]; }));
const SCENE = fileURLToPath(new URL('..', import.meta.url));
const OUT = args.out || SCENE;
const LOOKS = args.look === 'all' || !args.look ? ['night', 'bright', 'paper', 'mix'] : String(args.look).split(',');
const FPS = Number(args.fps) || 30;
const CRF = Number(args.crf) || 24;
const CLOSEUP = Boolean(args.closeup);
const ALL_STORMS = ['bands', 'paper', 'pinwheel', 'puffs', 'disc', 'r1-noglow', 'r1'];
const STORMS = !args.storm ? [null] : args.storm === 'all' ? ALL_STORMS : String(args.storm).split(',');
const HOLD = CLOSEUP ? 0 : args.hold === undefined ? 0.5 : Number(args.hold);   // a loop must not rest on its last frame
const DURATION = CLOSEUP ? 4 : 20;
const W = 414, H = CLOSEUP ? 414 : 896, SCALE = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

const server = await serve(Number(args.port) || 0);
const base = `http://127.0.0.1:${server.address().port}`;
const debugPort = Number(args['debug-port']) || 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'primer-film-'));
const browser = spawn(findBrowser(), ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
}
if (!target) { browser.kill(); throw new Error('The browser did not start.'); }

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
const frame = async t => {
  await ev(`window.seek(${t})`);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  return Buffer.from(r.data, 'base64');
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: true });

async function open(look, storm) {
  const extra = (storm ? `&storm=${storm}` : '') + (CLOSEUP ? '&closeup=1' : '');
  await send('Page.navigate', { url: `${base}/index.html?look=${look}&film=1&dpr=${SCALE}${extra}` });
  for (let i = 0; i < 80; i++) {
    await sleep(150);
    if (pageErrors.length) throw new Error(pageErrors.join('\n'));
    try { if (await ev('window.ready === true')) return; } catch { /* still loading */ }
  }
  throw new Error(`${look}${storm ? ' ' + storm : ''}: the page never became ready`);
}

let failed = false;
try {
  for (const look of LOOKS) for (const storm of STORMS) {
    await open(look, storm);
    // a storm's own films and stills are named after it; the scene is named after its look
    const label = storm ? (CLOSEUP ? `storm-${storm}` : `${look}-${storm}`) : look;
    if (args.shots) {
      mkdirSync(OUT, { recursive: true });
      for (const t of String(args.shots).split(',').map(Number)) {
        writeFileSync(join(OUT, `${label}${CLOSEUP && !storm ? '-close' : ''}-${t.toFixed(2).padStart(5, '0')}.png`), await frame(t));
      }
      console.log(`${label}: shots written`);
      continue;
    }
    if (args.still !== undefined) {
      mkdirSync(join(OUT, 'stills'), { recursive: true });
      const name = storm ? `storm-${storm}${CLOSEUP ? "" : "-scene"}` : look;
      writeFileSync(join(OUT, 'stills', `${name}.png`), await frame(Number(args.still)));
      console.log(`${name}: still written`);
      continue;
    }
    mkdirSync(join(OUT, 'films'), { recursive: true });
    const file = join(OUT, 'films', `${args.name || label}.mp4`);
    const ff = spawn(args.ffmpeg || 'ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-an', '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', String(CRF), '-pix_fmt', 'yuv420p',
      '-profile:v', 'high', '-movflags', '+faststart', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', code => (code === 0 ? res() : rej(new Error(`ffmpeg exited with ${code}`)))));
    const total = Math.round((DURATION + HOLD) * FPS);
    for (let i = 0; i < total; i++) {
      const png = await frame(Math.min(DURATION, i / FPS));
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 100 === 0) console.log(`${label}: frame ${i} of ${total}`);
    }
    ff.stdin.end();
    await done;
    if (pageErrors.length) throw new Error(pageErrors.join('\n'));
    console.log(`${label}: ${file}`);
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
