// A headless browser to look at the app with: Edge (or Chrome) started without any window, driven through
// its debugging port. Used by `primer fit`, by the tests and by the art tools. Needs Node 22 or newer
// (the built-in WebSocket). Nothing to install.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Where Edge or Chrome is, the way stage0/scene/tools/capture.mjs looks: a path given, PRIMER_BROWSER, then
// the usual places on Windows, Linux and macOS.
export function findBrowser(given) {
  if (given) return given;
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
  throw new Error('No browser found. Set PRIMER_BROWSER to Edge or Chrome.');
}

// Closes a browser left on this debugging port by a run that stopped early.
async function closeLeftover(port) {
  try {
    const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const old = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise((res, rej) => { old.onopen = res; old.onerror = rej; });
    old.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    await sleep(800);
  } catch { /* nothing there */ }
}

export async function launch({ port = 9341, browser, width = 414, height = 896, scale = 1, mobile = true, touch = true } = {}) {
  await closeLeftover(port);
  const profile = mkdtempSync(join(tmpdir(), 'primer-edge-'));
  const proc = spawn(findBrowser(browser), ['--headless=new', '--disable-gpu', '--mute-audio', '--hide-scrollbars', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!target) { proc.kill(); throw new Error('The browser did not start.'); }

  let ws = null, nextId = 1;
  const waiting = new Map(), listeners = new Set();
  const errors = [];
  const attach = async t => {
    ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && waiting.has(d.id)) {
        const { res, rej } = waiting.get(d.id);
        waiting.delete(d.id);
        if (d.error) rej(new Error(d.error.message)); else res(d.result);
      }
      if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
      if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map(a => a.value || a.description).join(' '));
      for (const fn of listeners) fn(d);
    };
  };
  await attach(target);
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = nextId++;
    waiting.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const ev = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`${expression.slice(0, 160)}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  const size = async (w, h, s = scale) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: s, mobile });
  };
  const setUp = async () => {
    await send('Page.enable');
    await send('Runtime.enable');
    await size(width, height);
    if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  };
  await setUp();
  return {
    send, ev, size, errors, port,
    on: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    get target() { return target; },
    async go(url, wait = 'window.__primerReady === true', ms = 15000) {
      await send('Page.navigate', { url });
      if (!wait) { await sleep(600); return; }
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        await sleep(100);
        try { if (await ev(wait)) return; } catch { /* still loading */ }
      }
      throw new Error(`${url}: never ready`);
    },
    async shot(file, { format = 'png', clip } = {}) {
      const r = await send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 85 } : {}), captureBeyondViewport: false, ...(clip ? { clip } : {}) });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    // Kills the page's process outright, the way a phone can, and carries on in a new tab.
    async crash() {
      send('Page.crash').catch(() => {});
      await sleep(500);
      const old = target;
      target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
      await fetch(`http://127.0.0.1:${port}/json/close/${old.id}`).catch(() => {});
      await attach(target);
      await setUp();
    },
    async close() {
      try { await send('Browser.close'); } catch { /* already gone */ }
      await sleep(500);
      proc.kill();
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it */ }
    },
  };
}

// Touch, as a finger would: a tap, a drag, and a long press.
export function fingers(b) {
  const touch = (type, pts) => b.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const tapAt = async (x, y) => { await touch('touchStart', [[x, y]]); await sleep(40); await touch('touchEnd', []); await sleep(140); };
  const rect = sel => b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right}})()`);
  return {
    touch, tapAt, rect,
    async tap(sel) {
      const r = await rect(sel);
      if (!r || !r.w) throw new Error(`nothing to tap: ${sel}`);
      await tapAt(r.x, r.y);
    },
    async drag(x, y, dx, dy, { ms = 240, steps = 10, hold = 0 } = {}) {
      await touch('touchStart', [[x, y]]);
      for (let i = 1; i <= steps; i++) { await sleep(ms / steps); await touch('touchMove', [[x + (dx * i) / steps, y + (dy * i) / steps]]); }
      if (hold) await sleep(hold);
      await touch('touchEnd', []);
      await sleep(160);
    },
  };
}

export const writeJson = (file, v) => writeFileSync(file, JSON.stringify(v, null, 1));
