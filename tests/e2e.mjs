// Drives the app in headless Edge with real touch, against tests/serve.mjs and its stand-in for GitHub.
//   node tests/e2e.mjs [--shots <folder>] [--pilot <primer-data folder>]
// Starts the test server itself if nothing answers on its port. Uses debugging port 9341 and server port 8821,
// or PRIMER_TEST_DEBUG and PRIMER_TEST_PORT, so several copies can run at once.
// --pilot (or PRIMER_DATA) also plays the pilot topic from the data repo's working tree: each lesson and the
// test wrong and then right, and its chest. Facts and review are played on tests/fixtures/facts, with the
// app's clock moved on (__primer.clock.shift) to let days pass; their pictures are taken at 2x, as PNGs.
// Runs at device scale 1: at scale 2 a screenshot can re-send a held touch at half its coordinates.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { launch, fingers, sleep } from '../skill/cdp.mjs';

const args = {};
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) args[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
}
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PRIMER_TEST_PORT) || 8821, DEBUG = Number(process.env.PRIMER_TEST_DEBUG) || 9341, W = 414, H = 896, SAT = 48, SAB = 34;
const BASE = `http://127.0.0.1:${PORT}`;
const API = `${BASE}/__gh`;
const APP = `${BASE}/primer/?api=${API}&insets=${SAT},${SAB}`;
const SHOTS = args.shots || mkdtempSync(join(tmpdir(), 'primer-shots-'));
const PILOT = args.pilot || process.env.PRIMER_DATA || null;
mkdirSync(SHOTS, { recursive: true });

// The pixels of a PNG screenshot (8-bit RGB or RGBA, as the browser makes them), to compare two shots.
function pixels(b64) {
  const buf = Buffer.from(b64, 'base64');
  let p = 8, w = 0, h = 0, type = 6;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; }
    if (kind === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * bpp), row = w * bpp;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (row + 1)], src = y * (row + 1) + 1;
    for (let x = 0; x < row; x++) {
      const a = x >= bpp ? out[y * row + x - bpp] : 0, up = y ? out[(y - 1) * row + x] : 0, c = x >= bpp && y ? out[(y - 1) * row + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[y * row + x] = v & 255;
    }
  }
  return { w, h, bpp, out };
}
// How many pixels differ between two shots by more than a hair (gradients can dither by a step or two).
function differing(a, b) {
  const A = pixels(a), B = pixels(b);
  if (A.w !== B.w || A.h !== B.h) return Infinity;
  let n = 0;
  for (let i = 0; i < A.w * A.h; i++) {
    for (let k = 0; k < 3; k++) if (Math.abs(A.out[i * A.bpp + k] - B.out[i * B.bpp + k]) > 24) { n++; break; }
  }
  return n;
}

let passed = 0, failed = 0;
const ok = (cond, what, extra = '') => {
  if (cond) { passed++; console.log(`  ok   ${what}`); }
  else { failed++; console.log(`  FAIL ${what} ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`.slice(0, 900)); }
};
const api = p => fetch(API + p).then(r => r.json());

// ---------- the server

let server = null;
try { await fetch(`${BASE}/__served`); } catch {
  server = spawn(process.execPath, [join(ROOT, 'tests', 'serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { await sleep(150); try { await fetch(`${BASE}/__served`); break; } catch { /* not yet */ } }
}

const b = await launch({ port: DEBUG, width: W, height: H, scale: 1 });
const f = fingers(b);
const ev = b.ev;
const shot = name => b.shot(join(SHOTS, `${name}.jpg`), { format: 'jpeg' });
const text = () => ev('document.getElementById("app").innerText');
const go = async (url = APP) => b.go(url);
const queue = () => ev('__primer.store.queueAll().then(q=>q.map(i=>i.event))');
const isBatch = n => n.startsWith('progress/') && !n.includes('connect-check');
const sent = async () => {
  const names = (await api('/__files')).filter(isBatch);
  return Promise.all(names.map(async n => ({ name: n, ...JSON.parse(await (await fetch(`${API}/__file?path=${encodeURIComponent(n)}`)).text()) })));
};
// Everything sent and everything still waiting. A send can land between the two reads, so an event can be
// seen in both: drop repeats by eid, as the format says a reader must.
const everyEvent = async () => {
  const seen = new Set();
  return [...(await sent()).flatMap(x => x.events), ...await queue()].filter(e => !seen.has(e.eid) && seen.add(e.eid));
};
const bare = () => ev(`document.documentElement.classList.contains('bare') && getComputedStyle(document.querySelector('.tabs')).display === 'none'`);
const btn = () => ev(`(()=>{const b=document.querySelector('.lfoot .btn');return b?{text:b.textContent,disabled:b.disabled,cls:b.className}:null})()`);
const verdict = () => ev(`(()=>{const f=document.querySelector('.lfoot');return {cls:f.className,verdict:(f.querySelector('.lverdict')||{}).textContent||'',why:(f.querySelector('.lwhy')||{}).textContent||''}})()`);
const press = async () => { await f.tap('.lfoot .btn'); await sleep(450); };
const stepId = () => ev('__primer.run ? __primer.run.step.id : null');
const waitFor = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch { /* not yet */ } await sleep(100); } return false; };
const reloadLibrary = () => ev(`__primer.data.library().then(t => { __primer.app.topics = t; __primer.app.render(); return t.length })`);
// scenes
const scene = () => ev('__primer.run && __primer.run.scene ? __primer.run.scene.debug() : null');
const sceneState = (s, ms = 15000) => waitFor(`__primer.run && __primer.run.scene && __primer.run.scene.state === ${JSON.stringify(s)}`, ms);
// A slider's handle runs along a line in its track (across, up or down): the point a fraction p along it,
// in the page, for the slider in `scope` whose handle is `h` (a lesson's input, by default).
const runPoint = (p, scope = '.lbody', h = '__primer.run.input') => ev(`(()=>{const g=${h}.debug().run,r=document.querySelector(${JSON.stringify(scope + ' .pi-track')}).getBoundingClientRect();return {x:r.left+g.x0+(g.x1-g.x0)*${p},y:r.top+g.y0+(g.y1-g.y0)*${p}}})()`);
// The answer forms' one clock, for holding still while two screenshots are compared.
const clock = js => ev(`import('/primer/parts/inputs/clock.js').then(m=>{${js}})`);
const openNode = async id => {
  await f.tap(`.node[data-node=${id}]`);
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  await waitFor(`__primer.run && __primer.run.scene && __primer.run.scene.state !== 'loading'`);
};
// answer forms, by touch
const along = async (pts, ms = 480) => {
  await f.touch('touchStart', [[pts[0].x, pts[0].y]]);
  for (const p of pts.slice(1)) { await sleep(ms / pts.length); await f.touch('touchMove', [[p.x, p.y]]); }
  await sleep(60);
  await f.touch('touchEnd', []);
  await sleep(260);
};
const dialAt = (v, inp) => ev(`(()=>{const r=document.querySelector('.pi-dialbox').getBoundingClientRect(),s=Math.min(r.width,r.height)/300,a=Math.PI*0.75+(${v}-${inp.min})/(${inp.max}-${inp.min})*Math.PI*1.5;return {x:r.left+r.width/2+Math.cos(a)*106*s,y:r.top+r.height/2+Math.sin(a)*106*s}})()`);
const digitsFor = (v, n) => String(Math.round(v)).padStart(n, '0').split('').map(Number);
// Gives an answer the way a finger would: turns the dial round its ring, drags the pile's level, draws
// the strings, carries things into bins and pieces into sockets, taps the slider's track.
const answerBy = async (inp, value) => {
  if (inp.form === 'dial') {
    const from = (await ev('__primer.run.input.state()')).value, pts = [];
    for (let k = 0; k <= 16; k++) pts.push(await dialAt(from + ((value - from) * k) / 16, inp));
    await along(pts);
  } else if (inp.form === 'pile') {
    // the handle moves the count by how far it's dragged (taking hold doesn't jump it): drag by the
    // difference, and again if a finger's worth of rounding left it one off
    const unit = await ev(`(()=>{const r=[...document.querySelectorAll('.pi-row')].map(e=>e.getBoundingClientRect().top);return (r[0]-r[1])/${inp.per || 5}})()`);
    for (let k = 0; k < 4; k++) {
      const now = (await ev('__primer.run.input.state()')).value;
      if (now === value) break;
      const h = await f.rect('.pi-handle');
      await f.drag(h.x, h.y, 0, -(value - now) * unit, { steps: 14, ms: 380 });
      await sleep(200);
    }
  } else if (inp.form === 'slider') {
    // along the track whichever way it runs (right, up, or down into the sea)
    const pos = inp.scale === 'log' ? Math.log(value / inp.min) / Math.log(inp.max / inp.min) : (value - inp.min) / (inp.max - inp.min);
    const pt = await runPoint(pos);
    await f.tapAt(pt.x, pt.y);
  } else if (inp.form === 'number' && (inp.look || 'keys') === 'keys') {
    for (const ch of String(value)) await f.tap(`.lbody .pi-key[data-k="${ch}"]`);
  } else if (inp.form === 'number' && inp.look === 'wheels') {
    // the top drum rolled by finger, the others by their arrows
    const want = digitsFor(value, (await ev('__primer.run.input.debug()')).digits.length);
    for (let i = 0; i < want.length; i++) {
      const now = (await ev('__primer.run.input.debug()')).digits[i], by = (want[i] - now + 10) % 10;
      if (i === 0 && by) {
        const w = await f.rect(`.lbody .pi-drum[data-i="0"] .pi-dwin`);
        await f.drag(w.x, w.y, 0, -52 * by, { steps: 8 * by, ms: 160 * by, hold: 120 });
        await sleep(300);
      } else for (let k = 0; k < by; k++) await f.tap(`.lbody .pi-drum[data-i="${i}"] .pi-roll[data-d="1"]`);
    }
  } else if (inp.form === 'number' && inp.look === 'tape') {
    // dragged most of the way, a little at a time, then the mark tapped
    const px = (await ev('__primer.run.input.debug()')).px, band = await f.rect('.lbody .pi-tband');
    for (let k = 0; k < 6; k++) {
      const left = -((value - (await ev('__primer.run.input.state()')).value) / inp.step) * px;
      if (Math.abs(left) < px * 2) break;
      await f.drag(band.x, band.y, Math.max(-140, Math.min(140, left)), 0, { steps: 12, ms: 360, hold: 220 });
      await sleep(700);
    }
    for (let k = 0; k < 3; k++) {
      const now = (await ev('__primer.run.input.state()')).value;
      if (now === value) break;
      await f.tapAt(band.x + ((value - now) / inp.step) * px, band.y);
      await sleep(700);
    }
  } else if (inp.form === 'number' && inp.look === 'abacus') {
    const want = digitsFor(value, (await ev('__primer.run.input.debug()')).digits.length);
    for (let i = 0; i < want.length; i++) {
      const now = (await ev('__primer.run.input.debug()')).digits[i];
      if (now === want[i]) continue;
      await f.tap(`.lbody .pi-rod[data-i="${i}"] .pi-bead[data-b="${want[i] > now ? want[i] - 1 : want[i]}"]`);
      await sleep(320);
    }
  } else if (inp.form === 'string') {
    for (const [l, r] of Object.entries(value)) {
      const a = await f.rect(`.pi-end2[data-side=l][data-id="${l}"]`), z = await f.rect(`.pi-end2[data-side=r][data-id="${r}"]`);
      await f.drag(a.x, a.y, z.x - a.x, z.y - a.y, { steps: 14, ms: 360 });
    }
  } else if (inp.form === 'sort') {
    for (const [item, bin] of Object.entries(value)) {
      const a = await f.rect(`.pi-sorttile[data-id="${item}"]`), z = await f.rect(`.pi-bin[data-bin="${bin}"]`);
      await f.drag(a.x, a.y, z.x - a.x, z.y - a.y, { steps: 14, ms: 360 });
      await sleep(300);
    }
  } else if (inp.form === 'snap') {
    for (const [card, piece] of Object.entries(value)) {
      const c = await f.rect(`.pi-card[data-id="${card}"]`), p = await f.rect(`.pi-piece[data-id="${piece}"]`);
      await f.drag(p.x, p.y, c.right - p.left, c.y - p.y, { steps: 14, ms: 360 });
      await sleep(350);
    }
  } else if (inp.form === 'choice') {
    await f.tap(`.pi-opt[data-id="${value}"]`);
  } else if (inp.form === 'order') {
    for (let k = 0; k < 6; k++) {
      const now = (await ev('__primer.run.input.state()')).value;
      if (JSON.stringify(now) === JSON.stringify(value)) break;
      const i = now.findIndex((id, n) => id !== value[n]);
      const from = now.indexOf(value[i]);
      const a = await f.rect(`.pi-item[data-id="${value[i]}"]`);
      const rowH = (await f.rect('.pi-item:nth-child(2)')).y - (await f.rect('.pi-item:nth-child(1)')).y;
      await f.drag(a.x, a.y, 0, (i - from) * rowH, { steps: 14, ms: 360 });
      await sleep(300);
    }
  }
  await sleep(250);
};
// Answers whatever step is up, right or wrong, by touch: a check by its answer (or a wrong try, or a wrong
// option); a play step by tapping where its tries say, the globe or map first turned to face the place.
const answerStep = async right => {
  const s = await ev('__primer.run.step');
  if (s.kind === 'play') {
    const t = (s.tries || []).find(x => x.marked === (right ? 'right' : 'wrong'));
    const { lon, lat } = t.state.tapped;
    await ev(`__primer.run.play.run(['spinTo', [${lon}, ${lat}], 0])`);
    await sleep(300);
    const p = await ev(`__primer.run.play.where([${lon},${lat}])`);
    await f.tapAt(p.x, p.y);
    await sleep(250);
    return s;
  }
  const inp = s.input;
  const answer = s.answer ?? (inp.options || []).find(o => o.right)?.id;
  let value = answer;
  if (!right) {
    const tr = (s.tries || []).find(x => x.marked === 'wrong');
    value = inp.form === 'choice' ? inp.options.find(o => o.id !== answer).id : tr ? tr.state.value : inp.max;
  }
  await answerBy(inp, value);
  return s;
};

try {
  await api('/__reset?data=fixtures');

  console.log('First screen');
  await go();
  ok((await text()).includes('No lessons here yet'), 'with nothing pulled yet, Learn says so', await text());
  ok(await ev(`!!document.querySelector('.empty [data-go=connect]')`), 'and offers Connect');
  const tabs = await ev(`[...document.querySelectorAll('.tab')].map(t=>t.innerText.trim())`);
  ok(JSON.stringify(tabs) === JSON.stringify(['Learn', 'Practice', 'Home', 'Shop', 'Profile']), 'five tabs: Learn, Practice, Home, Shop, Profile', tabs);
  const knob = await ev(`(()=>{const k=document.querySelector('.tab.home .knob').getBoundingClientRect(),t=document.querySelector('.tabs').getBoundingClientRect();return {k:k.top,t:t.top}})()`);
  ok(knob.k < knob.t, 'Home is raised above the bar, in the centre', knob);
  const tabBottom = await ev(`document.querySelector('.tabs').getBoundingClientRect().bottom`);
  ok(Math.abs(tabBottom - H) < 1, 'the tab bar sits on the bottom, its labels clear of the home bar');
  await shot('01-learn-empty');

  console.log('The tabs');
  for (const [tab, word] of [['practice', 'Playground'], ['home', 'Your room comes later'], ['shop', 'Soon'], ['profile', 'Text size'], ['learn', 'No lessons']]) {
    await f.tap(`.tab[data-tab=${tab}]`);
    await sleep(500);
    ok((await text()).includes(word) && await ev(`document.querySelector('.tab[data-tab=${tab}]').classList.contains('on')`), `tapping ${tab} opens it and lights its tab`);
    await shot(`02-tab-${tab}`);
  }
  const homeWords = await ev(`document.querySelector('.home').innerText.trim().split(/\\s+/).length`);
  ok(homeWords <= 6, 'Home says only a few words', String(homeWords));

  console.log('Connecting');
  await f.tap('.tab[data-tab=profile]');
  await sleep(400);
  await f.tap('[data-go=connect]');
  await sleep(400);
  ok(await bare(), 'the connect screen hides the tab bar');
  const link = await ev(`document.querySelector('.connect a.btn').href`);
  ok(link.includes('target_name=test-owner') && link.includes('expires_in=none') && link.includes('contents=write') && link.includes('name=Primer'), "the key page's link is filled in, with the owner taken from the address", link);
  await shot('03-connect');
  const tryKey = async value => {
    await ev(`document.getElementById('key').value=${JSON.stringify(value)}`);
    await f.tap('#check');
    await sleep(600);
    return ev(`document.getElementById('result').textContent`);
  };
  ok((await tryKey('made-up-wrong')).includes("didn't accept"), 'a wrong key is refused');
  ok((await tryKey('test-wrong-repo')).includes("can't see primer-data"), 'a key without the repo says so');
  const broad = await tryKey('test-all-repos');
  ok(broad.includes('2 other private repos') && broad.includes("didn't keep"), 'a key that sees other private repos is refused, and says so', broad);
  const ro = await tryKey('test-read-only');
  ok(ro.includes("can't write") && ro.includes('403'), 'a read-only key says so, with the reason', ro);
  ok(!(await ev(`__primer.store.get('gh-key')`)), 'none of those were kept');
  await api('/__down?on=1');
  const noNet = await tryKey('test-good');
  ok(noNet.includes("couldn't reach GitHub"), 'no signal says so', noNet);
  ok((await ev(`document.getElementById('key').value`)) === 'test-good', "and keeps what's pasted, to try again");
  await api('/__down?on=0');
  const good = await tryKey('test-listed-only');
  ok(good.includes('Connected'), "a list that says too much doesn't turn away a good key", good);
  await sleep(2000);
  ok((await api('/__files')).some(n => n.startsWith('progress/connect-check-')), 'connecting writes a test file under progress/');
  ok(!(await bare()) && (await text()).includes('Test topic'), 'it goes back by itself, and the pulled lessons show on Learn', await text());

  console.log('The path: one node per whole thing');
  await f.tap('.tab[data-tab=learn]');
  await sleep(400);
  const path = await ev(`(()=>{const n=[...document.querySelectorAll('.unit-sec')].map(s=>[...s.querySelectorAll('.node')].map(x=>({state:x.className.split(' ')[1],kind:x.dataset.kind,label:x.getAttribute('aria-label')})));return {nodes:n,banners:[...document.querySelectorAll('.banner p')].map(p=>p.textContent),pips:[...document.querySelectorAll('.banner')].map(b=>b.querySelectorAll('.pips i').length)}})()`);
  const kinds = path.nodes.flat().map(x => x.kind);
  ok(JSON.stringify(kinds) === JSON.stringify(['lesson', 'chest', 'lesson', 'test', 'review', 'animation', 'exam']), 'each node on the path is a whole thing: a lesson, a chest, a test, a review, an animation, an exam', kinds);
  ok(await ev(`document.querySelectorAll('.node').length`) === 7, "a lesson's steps aren't on the path: 7 nodes for 7 things, not a button per step");
  ok(JSON.stringify(path.banners) === JSON.stringify(['The first unit', 'The second unit']) && JSON.stringify(path.pips) === '[4,3]', 'a unit is a banner, with a pip per node', path);
  ok(path.nodes.flat()[0].state === 'now' && path.nodes.flat().slice(1).every(x => x.state === 'todo'), 'the first node is the one to do; the rest are dim', path.nodes);
  ok(JSON.stringify(path.nodes.flat().map(x => x.label)) === JSON.stringify(['Lesson: Every kind of step', 'Chest: A chest', 'Lesson: A second lesson', 'Test: A quick test', 'Review: Review', 'Animation: A made-up scene', 'Exam: The final exam']), 'each node is named by its kind and title (a lesson\'s title from its file)', path.nodes.flat().map(x => x.label));
  ok(await ev(`!!document.querySelector('.node.now .ring')`), 'the current node has its ring');
  const marksOf = await ev(`Object.fromEntries([...document.querySelectorAll('.node.todo')].map(n=>[n.dataset.kind,n.querySelector('svg').innerHTML.replace(/a\\d+/g,'')]))`);
  ok(new Set(Object.values(marksOf)).size === Object.keys(marksOf).length && Object.keys(marksOf).length === 6, 'each kind has its own mark', Object.keys(marksOf));
  ok(await ev(`(()=>{const c=document.querySelector('.node[data-kind=chest] svg');return !!c.querySelector('.lid')&&!c.querySelector('circle.ring')})()`), 'a chest is drawn as a chest');
  ok(await ev(`(()=>{const c=document.querySelector('.node[data-kind=chest] svg');return !!c.querySelector('.chest-shut')&&!c.querySelector('.chest-open')&&!c.querySelector('.glints')&&c.innerHTML.includes('#3a4290')&&!c.querySelector('[opacity="0.5"]')})()`), 'a chest still ahead is closed, in the path\'s dim tones, and not see-through');
  ok(await ev(`['test','exam'].every(k=>/<path d="M/.test(document.querySelector('.node[data-kind='+k+'] svg').innerHTML))`), 'a test and an exam are hexagons, as the sketch shows');
  await shot('04-path');

  console.log('Buttons press in, with no shadow under them');
  ok(await ev(`[...document.querySelectorAll('.node svg')].every(s=>!/#060926|#0c1030/.test(s.innerHTML))`), 'nothing on the path has a shadow under it (no floor shadow, no dark rim)');
  // Every button's look, on the screens it's on: a side in its own tone is fine; a blurred, offset or see-through shadow isn't.
  const shadowless = () => ev(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent).flatMap(b=>{const s=getComputedStyle(b).boxShadow;if(s==='none')return [];
    return s.split(/,(?![^(]*\\))/).filter(one=>{const n=one.replace(/rgba?\\([^)]*\\)/,'').trim().split(/\\s+/).map(parseFloat);const a=/rgba\\([^)]*,\\s*([\\d.]+)\\)/.exec(one);return n[0]!==0||n[2]>0||n[3]>0||(a&&Number(a[1])<1)}).map(x=>(b.className||b.tagName)+': '+x)})`);
  ok((await shadowless()).length === 0, 'no button on the path has a shadow under it', await shadowless());
  const pressAt = async (sel, ms) => { const r = await f.rect(sel); await f.touch('touchStart', [[r.x, r.y]]); await sleep(ms); };
  await pressAt('.node.now', 160);
  const held = await ev(`(()=>{const n=document.querySelector('.node.now'),m=new DOMMatrix(getComputedStyle(n.querySelector('.cap')).transform);return {down:n.classList.contains('down'),y:m.f}})()`);
  await f.touch('touchEnd', []);
  await sleep(320);
  const backUp = await ev(`(()=>{const n=document.querySelector('.node.now'),m=new DOMMatrix(getComputedStyle(n.querySelector('.cap')).transform);return {down:n.classList.contains('down'),y:m.f}})()`);
  ok(held.down && held.y >= 5 && !backUp.down && backUp.y === 0, 'a node sinks onto its side while held, and comes back up when let go', { held, backUp });
  const wobbles = () => ev(`document.getAnimations().filter(a=>a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('button')&&a.effect.getKeyframes().some(k=>/scale/.test(k.transform||''))).length`);
  ok((await wobbles()) === 0, 'and nothing on it springs or wobbles');
  await f.tap('.head');
  await sleep(200);
  // a quick tap still shows the press: the button stays in a moment after the finger lifts
  const tb = await f.rect('.topicpick');
  await f.touch('touchStart', [[tb.x, tb.y]]); await sleep(30); await f.touch('touchEnd', []);
  const quick = await ev(`(()=>{const b=document.querySelector('.topicpick');return {down:b.classList.contains('down'),y:new DOMMatrix(getComputedStyle(b).transform).f,side:getComputedStyle(b).boxShadow}})()`);
  await sleep(400);
  ok(quick.down && (await ev(`!document.querySelector('.topicpick').classList.contains('down')`)), 'a quick tap still shows the button going in, and it comes back', quick);
  ok((await wobbles()) === 0, 'with no jiggle');
  if (await ev(`!!document.querySelector('.scrim')`)) await f.tapAt(W / 2, 90);
  await sleep(300);
  await f.tap('.node[data-kind=test]');
  await sleep(400);
  ok(await ev(`!!document.querySelector('.callout.dim') && !document.querySelector('.callout [data-go=start]') && document.querySelector('.callout').innerText.includes('A quick test')`), 'a node still ahead shows its kind and title, and nothing to start');
  await f.tap('.node.now');
  await sleep(400);
  const call = await ev(`(()=>{const c=document.querySelector('.callout');const r=c.getBoundingClientRect();return {text:c.innerText,left:r.left,right:r.right}})()`);
  ok(call.text.includes('Every kind of step') && call.text.toUpperCase().includes('LESSON') && call.text.toUpperCase().includes('START') && call.left >= 0 && call.right <= W, 'tapping the current node shows its kind, its title and Start, placed on the screen', call);
  await shot('05-callout');
  await f.tap('[data-go=topics]');
  await sleep(500);
  const sheet = await ev(`[...document.querySelectorAll('.toprow')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())`);
  ok(sheet.length === 3 && sheet[0].includes('Test topic') && sheet[0].toUpperCase().includes('TOUR') && sheet[1].toUpperCase().includes('DEEP'), 'the topic list shows each topic with one level word', sheet);
  await shot('06-topics');
  await f.tap('.toprow:nth-child(3)');
  await sleep(500);
  ok((await ev(`document.querySelector('.topicpick').innerText`)).includes('Second topic'), 'picking a topic shows its path');
  await f.tap('[data-go=topics]');
  await sleep(400);
  await f.tap('.toprow:nth-child(2)');
  await sleep(400);

  console.log('A lesson, every kind of step');
  await f.tap('.node.now');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  await waitFor(`__primer.run && document.querySelector('.lstage canvas')`);
  ok(await bare(), 'a lesson hides the tab bar');
  ok(await ev(`!!document.querySelector('.ltop [data-go=leave]') && !!document.querySelector('.lbar')`), 'with a cross and a thin progress bar on top');
  ok((await btn()).text === 'Continue' && !(await btn()).disabled, 'an Explain step has Continue straight away');
  ok(await ev(`document.querySelector('.ltext .key').textContent === 'These words'`), '*words* are stressed');
  await shot('07-explain-globe');
  await pressAt('.lfoot .btn', 160);
  const btnHeld = await ev(`(()=>{const b=document.querySelector('.lfoot .btn'),cs=getComputedStyle(b);return {down:b.classList.contains('down'),y:new DOMMatrix(cs.transform).f,side:cs.boxShadow}})()`);
  await f.touch('touchEnd', []);
  await sleep(450);
  ok(btnHeld.down && btnHeld.y === 4 && /0px 0px 0px/.test(btnHeld.side), "the big button sinks by its side's depth while held, its side gone, and Continue goes on when let go", btnHeld);
  ok((await stepId()) === 'read-picture' && await waitFor(`(document.querySelector('.lstage img')||{}).src?.startsWith('blob:')`), 'an Explain step with a picture shows it, from the pulled media');
  await press();
  // choice: wrong
  ok((await stepId()) === 'pick' && (await btn()).text === 'Check' && (await btn()).disabled, 'a Check step starts with Check, asleep until there is an answer');
  await f.tap('.pi-opt[data-id=b]');
  await sleep(200);
  ok(!(await btn()).disabled, 'picking an answer wakes it');
  await press();
  let v = await verdict();
  ok(v.cls.includes('wrong') && v.verdict === 'Not quite' && v.why === 'Wrong, for a made-up reason.', 'a wrong choice says so, with the line of why for the answer given', v);
  ok(await ev(`document.querySelector('.pi-opt[data-id=a]').classList.contains('right') && document.querySelector('.pi-opt[data-id=b]').classList.contains('wrong')`), 'and shows the right one beside it');
  ok((await btn()).text === 'Continue' && (await btn()).cls.includes('pink'), 'Check becomes Continue');
  ok((await shadowless()).length === 0, 'no button in a lesson has a shadow under it, the choices included', await shadowless());
  await shot('08-choice-wrong');
  await press();
  // slider: right, on a stretched scale
  ok((await stepId()) === 'slide', 'Continue goes on to the next step');
  const track = await f.rect('.pi-track');
  const xFor = val => track.left + (Math.log(val) / Math.log(1000)) * track.w;
  await f.drag(track.left + 20, track.y, xFor(100) - track.left - 20, 0, { steps: 12 });
  await sleep(200);
  const sv = await ev('__primer.run.input.state()');
  ok(sv.answered && Math.abs(sv.value - 100) <= 10, 'dragging the slider sets it, on its stretched scale', sv);
  await press();
  v = await verdict();
  ok(v.verdict === 'Right' && await ev(`!document.querySelector('.pi-chip.truth').hidden`), 'right, and the truth is drawn on the scale', v);
  await shot('09-slider-right');
  await press();
  // number: close isn't possible (within 0); wrong
  await f.tap('.pi-key[data-k="9"]');
  await sleep(100);
  ok((await ev('__primer.run.input.state()')).value === 9, 'the keypad types a number');
  await press();
  v = await verdict();
  const inField = await ev(`(()=>{const d=document.querySelector('.lbody .pi-display'),t=document.querySelector('.lbody .pi-was');return {shown:d.querySelector('.d').textContent,truth:d.classList.contains('truth'),wrong:d.classList.contains('wrong'),gold:getComputedStyle(d.querySelector('.d')).color,tag:t?t.textContent:null,tagWrong:!!t&&t.classList.contains('wrong'),struck:!!(t&&t.querySelector('s')),value:__primer.run.input.state().value}})()`);
  ok(v.verdict === 'Not quite' && v.why === 'It was 7.' && inField.shown === '7' && inField.truth && inField.gold === 'rgb(255, 200, 61)' && inField.wrong, 'a wrong number shows the truth in its own field, in gold', { v, inField });
  ok(inField.tag === '9' && inField.tagWrong && inField.struck && inField.value === 9, "and what was typed stays on a struck-through tag at the field's corner, the answer given unchanged", inField);
  await press();
  // order: drag into the right order, then check
  ok((await stepId()) === 'order', 'on to the order');
  const want = ['one', 'two', 'three'];
  for (let k = 0; k < 4; k++) {
    const now = (await ev('__primer.run.input.state()')).value;
    if (JSON.stringify(now) === JSON.stringify(want)) break;
    const i = now.findIndex((id, n) => id !== want[n]);
    const from = now.indexOf(want[i]);
    const a = await f.rect(`.pi-item[data-id="${want[i]}"]`);
    const rowH = (await f.rect('.pi-item:nth-child(2)')).y - (await f.rect('.pi-item:nth-child(1)')).y;
    await f.drag(a.x, a.y, 0, (i - from) * rowH, { steps: 14, ms: 360 });
    await sleep(300);
  }
  ok(JSON.stringify((await ev('__primer.run.input.state()')).value) === JSON.stringify(want), 'dragging puts things in order', await ev('__primer.run.input.state()'));
  await press();
  ok((await verdict()).verdict === 'Right', 'and the right order is right');
  await press();
  // match: one pair wrong
  await f.tap('.pi-cell[data-side=l][data-id=x]'); await f.tap('.pi-cell[data-side=r][data-id=q]');
  await f.tap('.pi-cell[data-side=l][data-id=y]'); await f.tap('.pi-cell[data-side=r][data-id=p]');
  await sleep(200);
  ok((await ev('__primer.run.input.state()')).answered, 'tapping one on each side makes pairs');
  await press();
  ok((await verdict()).verdict === 'Not quite' && await ev(`document.querySelector('.pi-cell[data-id=x] small').textContent === 'Pea'`), 'wrong pairs show their right partner');
  await shot('10-match-wrong');
  await press();
  // spot: right
  const box = await f.rect('.pi-spot');
  await sleep(300);
  await f.tapAt(box.left + box.w * 0.74, box.top + box.h * 0.31);
  await press();
  ok((await verdict()).verdict === 'Right' && await ev(`!!document.querySelector('.pi-ring')`), 'tapping the spot on a picture, and the right spot is ringed');
  await press();
  // play: the globe
  ok((await stepId()) === 'brazil' && (await btn()).disabled, 'a Play step waits until the part has been used');
  await waitFor('__primer.run.play');
  const peru = await ev(`__primer.run.play.where([-75,-10])`);
  await f.tapAt(peru.x, peru.y);
  await sleep(300);
  ok((await ev('__primer.run.play.state()')).selected === 'Peru' && !(await btn()).disabled, 'tapping the globe picks a country, and wakes Check', await ev('__primer.run.play.state()'));
  const brazil = await ev(`__primer.run.play.where([-50,-10])`);
  await f.tapAt(brazil.x, brazil.y);
  await sleep(300);
  await press();
  ok((await verdict()).verdict === 'Right', "a Play step is marked by reading the part's state");
  await shot('11-play-right');
  await press();
  ok(await ev(`!!document.querySelector('.lend')`) && (await text()).includes('Lesson done') && (await text()).includes('of 7 right'), 'the end says how many were right', await text());
  await shot('12-end');
  await press();
  ok(!(await bare()) && await ev(`document.querySelector('.node[data-node=every-kind]').classList.contains('done')`), 'back on the path, the lesson is gold');
  ok(await ev(`document.querySelector('.node[data-node=first-chest]').classList.contains('now')`), 'and the chest after it is the next thing to reach');
  ok(await ev(`(()=>{const c=document.querySelector('.node[data-node=first-chest] svg');return !!c.querySelector('.chest-shut')&&!!c.querySelector('.glints')&&!c.innerHTML.includes('#3a4290')&&c.innerHTML.includes('#c67c44')})()`), 'the chest that\'s next is closed, in its own colours, with glints');
  await shot('13-path-done');

  console.log('A chest');
  await f.tap('.node[data-node=first-chest]');
  await sleep(400);
  ok((await ev(`document.querySelector('.callout').innerText`)).toUpperCase().includes('OPEN'), 'tapping the chest offers to open it');
  await f.tap('.callout [data-go=start]');
  await sleep(900);
  ok(await bare() && (await text()).includes('A chest!') && await ev(`document.querySelector('.chestbig .open').getAttribute('opacity') === '1'`), 'it opens with a small celebration, the tab bar hidden');
  ok(await ev(`!!document.querySelector('.chestbig .shut .chest-shut') && !!document.querySelector('.chestbig .open .chest-open .light')`), 'closed, then open with a light from inside');
  await shot('13b-chest');
  ok((await everyEvent()).some(e => e.type === 'open' && e.node === 'first-chest' && e.kind === 'chest' && e.topic === 'test-topic'), 'opening it is recorded, and goes up with the answers');
  await press();
  ok(!(await bare()) && await ev(`(()=>{const n=document.querySelector('.node[data-node=first-chest]');return n.classList.contains('done')&&!!n.querySelector('.chest-open')&&!n.querySelector('.chest-open .light')&&!n.querySelector('.glints')})()`), 'back on the path the chest is open, emptied, and done');
  ok(await ev(`document.querySelector('.node[data-node=second]').classList.contains('now')`), 'and the second lesson is next');
  await f.tap('.node[data-node=first-chest]');
  await sleep(300);
  ok(await ev(`!document.querySelector('.callout [data-go=start]') && document.querySelector('.callout').innerText.includes('Opened')`), 'an opened chest says so, and opens only once');
  await f.tap('.head');

  console.log('Every attempt is saved and goes up as new files');
  let all = await everyEvent();
  const mine = all.filter(e => e.lesson === 'every-kind');
  const types = mine.map(e => e.type);
  ok(types[0] === 'start' && types.filter(t => t === 'seen').length === 2 && types.filter(t => t === 'attempt').length === 7 && types.at(-1) === 'finish', 'a start, two reads, seven attempts and a finish', types);
  const att = Object.fromEntries(mine.filter(e => e.type === 'attempt').map(e => [e.step, e]));
  ok(att.pick.value === 'b' && att.pick.right === false && att.pick.why.startsWith('Wrong'), 'an attempt holds what was given, the mark and the line shown', att.pick);
  ok(att.brazil.value.selected === 'Brazil' && att.brazil.right, "a play attempt holds the part's state");
  ok(mine.every(e => e.eid && e.at && e.topic === 'test-topic' && e.version === 1), 'every event has its id, time, topic and version');
  await ev('__primer.sync.flush()');
  await sleep(300);
  const before = (await sent()).length;
  ok(before >= 1 && (await queue()).length === 0, 'Send now sends what was queued', before);
  await f.tap('.tab[data-tab=learn]');
  await sleep(300);
  await f.tap('.node.now');
  await f.tap('.callout [data-go=start]');
  await sleep(800);
  await press();
  await f.tap('.pi-opt[data-id=a]');
  await press();
  await press();
  await press();
  await ev('__primer.sync.flush()');
  await sleep(300);
  const after = await sent();
  ok(after.length === before + 1 && new Set(after.map(x => x.name)).size === after.length, 'a second batch is a new file, beside the first', after.map(x => x.name));
  ok(after.at(-1).device && after.at(-1).sentAt && after.at(-1).events.some(e => e.lesson === 'second' && e.type === 'finish'), 'each file says which phone and when');

  console.log('A test, with sliders that start at a value and pictures that follow them');
  await press().catch(() => {});
  await f.tap('.tab[data-tab=learn]');
  await sleep(400);
  ok(await ev(`document.querySelector('.node[data-node=second]').classList.contains('done') && document.querySelector('.node[data-node=quick-test]').classList.contains('now')`), 'with both lessons done, the test is next');
  await f.tap('.node[data-node=quick-test]');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  await waitFor(`__primer.run && __primer.run.step.id === 'q-pick' && __primer.run.input`);
  await f.tap('.pi-opt[data-id=a]');
  await press();
  ok((await verdict()).verdict === 'Right', 'a test is played like a lesson');
  await press();
  await waitFor(`__primer.run.step.id === 'q-warm' && __primer.run.input`);
  await sleep(200);
  const sliderNow = () => ev(`(()=>{const r=document.querySelector('.lbody .pi.form-slider'),q=s=>r.querySelector(s),th=q('.pi-thumb'),d=__primer.run.input.debug(),at=(s,a)=>Number((q(s)||{getAttribute:()=>0}).getAttribute(a)),bb=s=>{const e=q(s);return e?e.getBBox():{x:0,y:0,width:0,height:0}},tb=q('.pi-track').getBoundingClientRect(),hb=th.getBoundingClientRect();
    return {chip:q('.pi-chip').textContent,look:d.look,dir:d.direction,pic:q('.pi-pic svg') ? q('.pi-pic svg').getAttribute('class') : null,body:(q('.pi-pic .body')||{getAttribute:()=>null}).getAttribute('fill'),
    snow:at('.pi-pic .snow','opacity'),flame:at('.pi-pic .flame','opacity'),liquid:bb('.pi-look .liq').width,liquidColour:(q('.pi-look .liq')||{getAttribute:()=>null}).getAttribute('fill'),
    warm:bb('.pi-look .w1').height,warmEnd:tb.top+bb('.pi-look .w1').y+bb('.pi-look .w1').height,thumbY:hb.top+hb.height/2,picLeft:q('.pi-pic svg') ? q('.pi-pic svg').getBoundingClientRect().left : null,trackRight:tb.left+d.run.x0,
    state:__primer.run.input.state(),awake:!document.querySelector('.lfoot .btn').disabled,left:th.style.left,transform:th.style.transform,willChange:getComputedStyle(th).willChange}})()`);
  let sl = await sliderNow();
  ok(sl.chip === '5°C' && sl.liquid > 10 && sl.state.value === 5 && sl.state.answered && sl.awake, 'a slider starts at a real value with its fill showing, and Check awake: never "?"', sl);
  ok(sl.look === 'thermometer' && sl.dir === 'up' && sl.pic === 'pic-warmth' && sl.picLeft > sl.trackRight, 'with the warmth picture and nothing else said, the slider is a thermometer standing up, the picture beside it', sl);
  ok(sl.snow > 0.95 && sl.flame < 0.05, 'its picture is there: at 5 °C, a snowflake in an icy ball', sl);
  await shot('14a-slider-start');
  const a5 = await runPoint(5 / 40), a31 = await runPoint(31 / 40);
  await f.drag(a5.x, a5.y, a31.x - a5.x, a31.y - a5.y, { steps: 16, ms: 420 });
  await sleep(200);
  const hot = await sliderNow();
  ok(hot.state.value >= 29 && hot.snow < 0.05 && hot.flame > 0.5 && hot.body !== sl.body, 'dragged up the tube to the hot end, the snowflake has gone and a fire has come', hot);
  ok(hot.liquid > sl.liquid + 100 && hot.liquidColour !== sl.liquidColour && hot.thumbY < sl.thumbY - 100, 'the liquid has risen with the handle and turned from blue to red', { sl, hot });
  ok(hot.left === '' && /translate3d/.test(hot.transform) && hot.willChange === 'transform', 'the thumb moves by transform on its own layer, so nothing under it is repainted', hot);
  await shot('14b-slider-hot');
  const a30 = await runPoint(30 / 40);
  await f.tapAt(a30.x, a30.y);
  await sleep(150);
  await press();
  ok((await verdict()).verdict === 'Right', 'and it marks the value it was set to');
  await press();
  await waitFor(`__primer.run.step.id === 'q-deep' && __primer.run.input`);
  await sleep(200);
  sl = await sliderNow();
  ok(sl.look === 'sea' && sl.dir === 'down' && sl.pic === null && sl.chip === '2 m' && sl.warm < 60, 'with the depth picture, the slider is the sea itself, running down: it starts with a thin warm layer', sl);
  const deepAt = await runPoint(2 / 3);
  await f.tapAt(deepAt.x, deepAt.y);
  await sleep(150);
  const deep = await sliderNow();
  ok(deep.state.value === 100 && deep.warm > sl.warm + 60 && deep.thumbY > sl.thumbY + 60, 'set deeper on its stretched scale, the handle goes down and the warm layer with it', deep);
  ok(Math.abs(deep.warmEnd - deep.thumbY) < 2, 'the warm layer ends where the handle hangs', deep);
  await shot('14c-slider-depth');
  await press();
  await press();
  ok((await text()).includes('Test done') && (await text()).includes('3 of 3 right'), "a test's end says Test done", await text());
  await press();
  ok(await ev(`document.querySelector('.node[data-node=quick-test]').classList.contains('done') && document.querySelector('.node[data-node=look-back]').classList.contains('now')`), 'the test is gold, and the review after it is next');

  console.log('A review with nothing to go over, and an animation without its scene');
  for (const [node, words, says] of [['look-back', 'Review', 'Nothing to go over'], ['a-scene', 'A made-up scene', 'Soon']]) {
    await f.tap(`.node[data-node=${node}]`);
    await sleep(300);
    await f.tap('.callout [data-go=start]');
    await sleep(500);
    ok(await bare() && (await text()).includes(words) && (await text()).includes(says), `${words}: a placeholder says ${node === 'look-back' ? 'so (the lessons before it teach no facts)' : 'it comes later'}`, await text());
    await shot(`15-${node}`);
    await press();
    ok(await ev(`document.querySelector('.node[data-node=${node}]').classList.contains('done')`), `${words}: visiting it lets the path go on`);
  }
  ok(await ev(`document.querySelector('.node[data-node=final]').classList.contains('now')`), 'and the exam is next');
  const opened = (await everyEvent()).filter(e => e.type === 'open').map(e => `${e.node}:${e.kind}`);
  ok(['first-chest:chest', 'look-back:review', 'a-scene:animation'].every(x => opened.includes(x)), 'each visit is recorded', opened);
  await shot('16-path-exam-next');

  console.log('Leaving part way');
  await f.tap('.tab[data-tab=learn]');
  await sleep(300);
  await f.tap('[data-go=topics]');
  await sleep(300);
  await f.tap('.toprow:nth-child(3)');
  await sleep(300);
  await f.tap('.node.now');
  await f.tap('.callout [data-go=start]');
  await sleep(600);
  await f.tap('[data-go=leave]');
  await sleep(500);
  ok(!(await bare()) && (await text()).includes('Second topic'), 'the cross leaves at once, back to the path');
  ok((await everyEvent()).some(e => e.type === 'leave' && e.step === 'read' && e.topic === 'second-topic'), 'and says where it was left');

  console.log('Every newer answer form, played wrong and then right by touch');
  {
    const L = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'data', 'topics', 'answer-forms', 'every-form.json'), 'utf8'));
    // what the truth looks like once checked, by form
    const REVEAL = {
      dial: { wrong: `!document.querySelector('.pi-dialbox .truth').hasAttribute('hidden') && !!document.querySelector('.pi-read.truth') && !!document.querySelector('.pi-knob.wrong')`, right: `document.querySelector('.pi-dialbox').classList.contains('right')` },
      pile: { wrong: `!document.querySelector('.pi-level.truth').hidden && document.querySelectorAll('.pi-thing.over').length === 8 && document.querySelector('.pi-count.truth').textContent === '7'`, right: `document.querySelector('.pi-handle').classList.contains('right') && document.querySelector('.pi-level.truth').hidden` },
      string: { wrong: `document.querySelectorAll('.rope.truth').length === 2 && document.querySelectorAll('.pi-end2.wrong').length === 2`, right: `document.querySelectorAll('.pi-end2.right').length === 3 && !document.querySelector('.rope.truth')` },
      sort: { wrong: `document.querySelectorAll('.pi-sorttile.truth').length === 1 && document.querySelectorAll('.pi-sorttile.right').length === 3`, right: `document.querySelectorAll('.pi-sorttile.right').length === 4` },
      snap: { wrong: `document.querySelectorAll('.pi-piece.truth').length === 2 && document.querySelectorAll('.pi-card.wrong').length === 2 && document.querySelectorAll('.pi-piece.docked').length === 3`, right: `document.querySelectorAll('.pi-card.right').length === 3` },
      slider: { wrong: `!document.querySelector('.pi-chip.truth').hidden`, right: `!document.querySelector('.pi-chip.truth').hidden` },
      number: { wrong: `!!document.querySelector('.form-number .pi-was.wrong s') && !!document.querySelector('.form-number :is(.pi-display, .pi-dwin, .pi-nread, .pi-adig).truth') && !!document.querySelector('.form-number .wrong:not(.pi-was)')`, right: `!!document.querySelector('.form-number .right') && !document.querySelector('.form-number .pi-was')` },
    };
    await f.tap('[data-go=topics]');
    await sleep(400);
    await f.tap('.toprow:nth-child(4)');
    await sleep(500);
    ok((await text()).includes('Answer forms') && await ev(`document.querySelectorAll('.node').length === 1`), 'the answer forms topic shows its path');
    const asked = L.steps.filter(s => s.kind === 'check').length;
    for (const pass of ['wrong', 'right']) {
      await f.tap('.node[data-node=every-form]');
      await sleep(300);
      await f.tap('.callout [data-go=start]');
      for (const s of L.steps) {
        await waitFor(`__primer.run && __primer.run.step.id === ${JSON.stringify(s.id)} && (!!__primer.run.input || ${s.kind === 'explain'})`);
        await sleep(300);
        if (s.kind === 'explain') { await press(); continue; }
        const value = pass === 'right' ? s.answer : s.tries.find(t => t.marked === 'wrong').state.value;
        await answerBy(s.input, value);
        const st = await ev('__primer.run.input.state()');
        ok(st.answered && JSON.stringify(st.value) === JSON.stringify(value), `${s.id} (${s.input.form}${s.input.look ? `, ${s.input.look}` : ''}${s.input.direction ? `, ${s.input.direction}` : ''}): answered ${pass} by touch`, st);
        if (s.id === 'dial-wind' && pass === 'wrong') {
          // the wind blows by itself: the picture changes while nothing is touched (it once stood still)
          const a = await ev(`document.querySelector('.lbody svg.pic-wind').innerHTML`);
          await sleep(500);
          const z = await ev(`document.querySelector('.lbody svg.pic-wind').innerHTML`);
          ok(a !== z && JSON.stringify((await ev('__primer.run.input.state()')).value) === JSON.stringify(value), 'the dial\'s wind moves on its own in a lesson, while the value stays put');
        }
        await shot(`30-${s.id}-${pass}-a`);
        await press();
        const vd = await verdict();
        ok(vd.verdict === (pass === 'right' ? 'Right' : 'Not quite') && (pass === 'right' || vd.why.length > 0), `${s.id}: marked ${pass}${pass === 'wrong' ? ', with its line of why' : ''}`, vd);
        await sleep(1100);
        ok(await ev(REVEAL[s.input.form][pass]), `${s.id}: the truth is shown beside the answer given`);
        await shot(`30-${s.id}-${pass}-b`);
        await press();
      }
      await waitFor(`!!document.querySelector('.lend')`);
      ok((await text()).includes(`${pass === 'right' ? asked : 0} of ${asked} right`), `played ${pass}, the end says so`, await text());
      await press();
    }
    const tried = (await everyEvent()).filter(e => e.type === 'attempt' && e.topic === 'answer-forms');
    ok(['dial', 'pile', 'string', 'sort', 'snap', 'number', 'slider'].every(form => tried.filter(e => e.form === form).length >= 2), 'every attempt with the newer forms and looks is recorded, with the form', tried.map(e => e.form));
    ok(tried.some(e => e.form === 'sort' && e.value && e.value.tropics === 'cold' && e.right === false), 'a sort attempt holds where each thing was put');
  }

  console.log('Nothing typed gets lost');
  await f.tap('[data-go=topics]');
  await sleep(300);
  await f.tap('.toprow:nth-child(2)');
  await sleep(300);
  await f.tap('.node[data-node=every-kind]');
  await sleep(200);
  ok((await ev(`document.querySelector('.callout [data-go=start]').textContent`)) === 'Again', 'a done lesson can be played again');
  await f.tap('.callout [data-go=start]');
  await sleep(900);
  await press();
  await press();
  await f.tap('.pi-opt[data-id=c]');
  await press();
  await b.crash();
  await go();
  await sleep(300);
  ok((await everyEvent()).some(e => e.type === 'attempt' && e.step === 'pick' && e.value === 'c'), 'an attempt made just before the app was killed is still there to send');
  ok((await ev(`Object.keys(localStorage).filter(k=>k.startsWith('primer-wal:')).length`)) === 0, 'and it moved from the backup into the database');

  console.log('When sending fails, it says why');
  await ev(`__primer.sync.enqueue({type:'start',topic:'test-topic',lesson:'second',version:1,step:'read'})`);
  const failThen = async (code, message, expect) => {
    await api(`/__fail?code=${code}&message=${encodeURIComponent(message)}`);
    const r = await ev('__primer.sync.flush()');
    const st = await ev('__primer.sync.status()');
    ok(st.problem && st.problem.includes(expect) && r.message.includes(expect), `a ${code} says so in plain words`, st.problem);
  };
  await failThen(401, 'Bad credentials', "isn't accepting your key");
  await failThen(403, 'Resource not accessible', "isn't allowed to write");
  await failThen(500, 'Oops', 'having trouble');
  await f.tap('.tab[data-tab=profile]');
  await sleep(400);
  ok((await text()).includes('having trouble') && await ev(`document.querySelector('.tab[data-tab=profile] span').style.boxShadow !== ''`), 'Profile shows it, and its tab has a ring');
  await api('/__fail?code=0');
  await f.tap('[data-go=send]');
  await sleep(700);
  ok(!(await ev('__primer.sync.status()')).problem && /Sent \d+ answer/.test(await text()), 'Send now works and clears it', await text());
  ok(/promised|say whether/.test(await text()) && (await text()).includes('Primer 0.'), 'Profile says whether the phone promised to keep the data, and the version');
  await api('/__down?on=1');
  await ev(`__primer.sync.enqueue({type:'start',topic:'test-topic',lesson:'second',version:1,step:'read'})`);
  await ev('__primer.sync.flush()');
  let st = await ev('__primer.sync.status()');
  ok(st.noSignal && !st.problem && st.waiting >= 1, 'one miss counts as no signal, and the answers wait', st);
  await api('/__down?on=0');
  await ev('__primer.sync.flush()');
  ok((await queue()).length === 0, 'they go when signal returns');

  console.log('Profile');
  await f.tap('.tab[data-tab=home]');
  await f.tap('.tab[data-tab=profile]');
  await sleep(400);
  const know = await ev(`[...document.querySelectorAll('.krow')].map(r=>({t:r.innerText.replace(/\\s+/g,' ').trim(),warn:!!r.querySelector('.wn svg'),col:r.querySelector('.kb b').style.background}))`);
  ok(know.length === 3 && /\d+%/.test(know[0].t), 'Knowledge lists each topic with its number', know);
  ok(!/fading/i.test(await text()) && !/streak/i.test(await text()), 'with no "fading" and no streak');
  await shot('14-profile');
  await f.tap('.krow');
  await sleep(500);
  ok((await text()).includes('last studied') && await ev(`document.querySelectorAll('.dots i').length === 16`), "tapping a topic opens its details, a dot for each question in its lessons, test and exam", await ev(`document.querySelectorAll('.dots i').length`));
  await f.tap('.scrim');
  await sleep(200);
  await f.tap('[data-size=l]');
  await sleep(200);
  ok((await ev('document.documentElement.dataset.text')) === 'l', 'the text size can be set');
  await f.tap('[data-size=m]');
  ok(await ev(`document.querySelector('[data-pref=effects]').getAttribute('aria-pressed') === 'false'`) && (await ev(`__primer.feel.getPrefs()`)).effects === false, 'Effects start off');
  ok((await ev(`__primer.feel.sound('right')`)) === false, 'and with it off, no sound plays');
  await f.tap('[data-pref=effects]');
  await sleep(100);
  ok((await ev(`__primer.store.get('prefs')`)).effects === true && (await ev(`__primer.feel.getPrefs()`)).effects === true, 'turning Effects on is kept');
  ok((await ev(`__primer.feel.sound('right')`)) === true, 'and then sounds play');
  await f.tap('[data-pref=effects]');
  await sleep(100);
  ok((await ev(`__primer.store.get('prefs')`)).effects === false, 'and off again is kept');
  // Animation sounds: their own switch, on by default; Effects is the press sounds only (ruled 2026-11-19)
  ok(await ev(`document.querySelector('[data-pref=animSounds]').getAttribute('aria-pressed') === 'true'`) && (await ev(`__primer.feel.getPrefs()`)).animSounds === true, 'Animation sounds have their own switch, on from the start');
  const rowsNow = await ev(`[...document.querySelectorAll('.settings .srow > p')].slice(0, 5).map(p => p.textContent)`);
  ok(JSON.stringify(rowsNow) === '["Voice","Captions","Animation sounds","Effects","Music"]', 'beside Voice and Captions, above Effects', rowsNow);
  await f.tap('[data-pref=animSounds]');
  await sleep(100);
  ok((await ev(`__primer.store.get('prefs')`)).animSounds === false && (await ev(`__primer.feel.getPrefs()`)).animSounds === false && (await ev(`__primer.feel.getPrefs()`)).effects === false, 'turning them off is kept, and leaves Effects alone');
  ok((await ev(`(async()=>new (await import('/primer/js/sfx.js')).Effects().on())()`)) === false, "an animation's sound effects follow it");
  await f.tap('[data-pref=animSounds]');
  await sleep(100);
  ok((await ev(`__primer.store.get('prefs')`)).animSounds === true && (await ev(`(async()=>new (await import('/primer/js/sfx.js')).Effects().on())()`)) === true && (await ev(`__primer.feel.sound('right')`)) === false, 'back on, they sound, while the press sounds stay off with Effects');
  // the hidden screen panel: the version tapped five times
  for (let i = 0; i < 5; i++) { await f.tap('#version'); await sleep(90); }
  await sleep(400);
  const panel = await ev(`[...document.querySelectorAll('#screenpanel .drow')].map(r => r.innerText.replace(/\\s+/g, ' ').trim())`);
  ok(panel.length >= 10 && ['innerHeight', 'outerHeight', 'screen.height', 'visualViewport height', 'document height', 'safe area top / bottom', 'standalone', 'devicePixelRatio'].every(k => panel.some(r => r.startsWith(k))) && panel.some(r => r.startsWith('innerHeight 896')),
    'tapping the version five times shows what the phone reports about its screen, to screenshot if a band shows', panel);
  await shot('14b-screen-panel');
  await f.tap('.scrim');
  await sleep(250);

  console.log('Sound: off by default, and the phone\'s sound left alone');
  // Prefs saved by 0.1 always held effects: true, chosen or not: there's no telling, so it goes off.
  await ev(`__primer.store.set('prefs', { voice: true, effects: true, music: false, text: 'm', topic: 'test-topic', tab: 'learn' })`);
  await go(APP);
  ok((await ev(`__primer.feel.getPrefs()`)).effects === false && (await ev(`__primer.store.get('prefs')`)).v === 2, "an older install's Effects are turned off, since it can't be told whether they were chosen");
  await ev(`__primer.store.set('prefs', { v: 2, voice: true, effects: true, music: false, text: 'm', topic: 'test-topic', tab: 'learn' })`);
  await go(APP);
  ok((await ev(`__primer.feel.getPrefs()`)).effects === true, 'Effects turned on since 0.2 stay on');
  const ticks0 = await ev('__primer.feel.tickCount()');
  await f.tap('.tab[data-tab=practice]');
  await sleep(200);
  ok((await ev('__primer.feel.tickCount()')) > ticks0 && (await ev('__primer.feel.soundLog().at(-1)')) === 'tap', 'a press gives a tick and a soft sound');
  // As on an iPhone: a page can say what its sound is, and can't vibrate. Set before the app starts.
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator,'audioSession',{value:{type:'auto'},configurable:true});Object.defineProperty(Navigator.prototype,'vibrate',{value:undefined,configurable:true});` });
  await go(APP);
  ok((await ev('navigator.audioSession.type')) === 'auto', 'opening Primer leaves the phone\'s sound alone, so music carries on');
  for (const tab of ['home', 'learn', 'practice']) { await f.tap(`.tab[data-tab=${tab}]`); await sleep(120); }
  await ev(`__primer.feel.sound('right')`);
  ok((await ev('navigator.audioSession.type')) === 'auto' && (await ev(`__primer.feel.getPrefs()`)).effects === true, 'and so do presses, even with Effects on and a sound played');
  ok(await ev(`!!document.querySelector('.hap input[switch]')`), "the tick is Riffle's hidden switch");
  await ev(`__primer.app.setPref('effects', false)`);
  const blur = await ev(`[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).filter(t=>/blur\\(/.test(t))`);
  ok(blur.length === 0, 'no live blur anywhere in the styles', blur);

  console.log('The Playground: tools only');
  await f.tap('.tab[data-tab=practice]');
  await sleep(500);
  const cards = await ev(`[...document.querySelectorAll('.pcard')].map(c=>c.innerText.replace(/\\s+/g,' ').trim())`);
  ok(cards.length === 1 && cards[0].startsWith('Map') && cards[0].includes('from Every kind of step'), 'the Playground lists the tools: one Map, saying which lesson first uses it (a lesson\'s globe counts)', cards);
  ok(!(await ev(`!!document.querySelector('.pcard[data-part=inputs]')`)) && (await ev('__primer.parts.listParts()')).includes('inputs'), "Inputs, an answer form, isn't in the list, but is still in the kit for lessons");
  const row = await ev(`(()=>{const r=document.querySelector('.formsrow'),c=document.querySelector('.pcard');if(!r||!c)return null;const a=r.getBoundingClientRect(),b=c.getBoundingClientRect();return {text:r.innerText.trim(),below:a.top>b.bottom,h:a.height,cardH:b.height,quiet:getComputedStyle(r).backgroundColor==='rgba(0, 0, 0, 0)'}})()`);
  ok(row && row.text === 'Answer forms' && row.below && row.h < row.cardH / 2 && row.quiet, 'a small, quiet "Answer forms" row sits after the tools', row);
  await shot('17a-practice-answer-forms');
  await f.tap('.formsrow');
  await waitFor(`!!document.querySelector('.partstage .pi')`);
  const formsOffered = await ev(`[...document.querySelectorAll('[data-set=form]')].map(b=>b.dataset.v)`);
  ok(await bare() && ['choice', 'slider', 'dial', 'number', 'pile', 'order', 'string', 'sort', 'snap', 'match'].every(x => formsOffered.includes(x)), 'it opens every answer form, with its settings', formsOffered);
  ok(!formsOffered.includes('spot') && (await ev('__primer.parts.describe("inputs")')).settings.form.options.includes('spot'), 'Spot is out of the row until it\'s redone, though its code stays in the kit', formsOffered);
  for (const form of ['dial', 'pile', 'string', 'sort', 'snap']) {
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(500);
    ok(await ev(`!!document.querySelector('.partstage .form-${form}')`), `${form} opens there, to try by hand`);
    await shot(`17c-forms-${form}`);
  }
  // the slider's looks and the number's, each a setting of the one form, offered for the form that has it
  await f.tap('[data-set=form][data-v=slider]'); await sleep(500);
  const lookRow = await ev(`[...document.querySelectorAll('[data-set=look]')].map(b=>b.dataset.v)`);
  ok(JSON.stringify(lookRow) === JSON.stringify(['auto', 'plain', 'thermometer', 'sea']) && await ev(`!!document.querySelector('[data-set=direction][data-v=down]')`), "a slider's panel offers its looks and its directions", lookRow);
  ok((await ev('__primer.app.partNow.debug()')).look === 'thermometer', 'and with the warmth picture it is a thermometer, by itself');
  for (const [look, dir] of [['sea', 'down'], ['plain', 'up'], ['thermometer', 'right']]) {
    await f.tap(`[data-set=look][data-v=${look}]`); await sleep(400);
    if (dir !== 'down') { await f.tap(`[data-set=direction][data-v=${dir}]`); await sleep(400); }
    const d = await ev('__primer.app.partNow.debug()');
    ok(d.look === look && d.direction === dir && await ev(`!!document.querySelector('.partstage .pi-track[data-look=${look}][data-dir=${dir}]')`), `the slider as ${look}, running ${dir}`, d);
    await shot(`17d-slider-${look}-${dir}`);
    await f.tap('[data-set=direction][data-v=auto]'); await sleep(300);
  }
  await f.tap('[data-set=look][data-v=auto]'); await sleep(300);
  await f.tap('[data-set=form][data-v=number]'); await sleep(500);
  const numberLooks = await ev(`[...document.querySelectorAll('[data-set=look]')].map(b=>b.dataset.v)`);
  ok(JSON.stringify(numberLooks) === JSON.stringify(['auto', 'keys', 'wheels', 'tape', 'abacus']), "a number's panel offers its four looks", numberLooks);
  for (const look of ['keys', 'wheels', 'tape', 'abacus']) {
    await f.tap(`[data-set=look][data-v=${look}]`); await sleep(500);
    const d = await ev('__primer.app.partNow.debug()');
    ok(d.look === look && await ev(`!!document.querySelector('.partstage .form-number.look-${look}')`), `the number as ${look}`, d);
    await shot(`17e-number-${look}`);
  }
  // the tape shows its unit; a wheel's side is darker than the shading at the foot of its drum, and the drum
  // is a cylinder: nothing laid over its digits, the ones either side squashed as they turn away
  await f.tap('[data-set=look][data-v=tape]'); await sleep(400);
  // the unit reads with the number in every state: as the lesson spells it, on the same line, just after it,
  // in the same weight and colour, plainly sized and inside the tape
  const unitNow = () => ev(`(()=>{const r=document.querySelector('.partstage .pi-tape'),b=r.querySelector('.pi-nread b'),u=r.querySelector('.pi-nread .u');if(!u)return null;
    const bs=getComputedStyle(b),us=getComputedStyle(u),br=b.getBoundingClientRect(),ur=u.getBoundingClientRect(),tr=r.getBoundingClientRect();
    return {text:u.textContent,weight:[bs.fontWeight,us.fontWeight],colour:[bs.color,us.color],size:parseFloat(us.fontSize),gap:Math.round(ur.left-br.right),line:Math.abs(ur.bottom-br.bottom)<8,inside:ur.left>=tr.left&&ur.right<=tr.right,shown:us.visibility!=='hidden'&&Number(us.opacity)>0.9}})()`);
  const unitOk = (u, state) => ok(u && u.text === 'km/h' && u.weight[0] === u.weight[1] && u.colour[0] === u.colour[1] && u.size >= 24 && u.gap >= 2 && u.gap <= 16 && u.line && u.inside && u.shown,
    `the tape's unit reads with its number while ${state}: km/h, just after it, same weight and colour`, u);
  await f.tap('[data-set=look][data-v=tape]'); await sleep(400);
  unitOk(await unitNow(), 'picking');
  await ev(`(h=>{h.run(['lock']);h.run(['reveal',h.state().value]);h.run(['mark','right'])})(__primer.app.partNow)`); await sleep(300);
  unitOk(await unitNow(), 'marked right');
  await ev(`__primer.app.partNow.run(['reset'])`); await sleep(200);
  await f.tap('[data-set=look][data-v=wheels]'); await sleep(400);
  const side = await ev(`(()=>{const m=getComputedStyle(document.querySelector('.partstage .pi-dwin')).boxShadow.match(/rgb\\((\\d+), (\\d+), (\\d+)\\)/);return m?[1,2,3].map(i=>Number(m[i])):null})()`);
  ok(side && side[0] + side[1] + side[2] < 0xc3 + 0xc9 + 0xef - 200, "each wheel's side under it is darker than its body, shading and all", side);
  const drumNow = await ev(`(()=>{const w=document.querySelector('.partstage .pi-dwin'),cs=p=>getComputedStyle(w,p).content,sy=g=>g.getBoundingClientRect().height/g.offsetHeight;
    const gs=[...w.querySelectorAll('.pi-dstrip b')].filter(g=>getComputedStyle(g).visibility!=='hidden').map(g=>({d:g.textContent,sy:Math.round(sy(g)*100)/100}));return {over:[cs('::before'),cs('::after')].filter(c=>c&&c!=='none'&&c!=='normal').length,gs}})()`);
  ok(drumNow.over === 0 && drumNow.gs.length === 3 && drumNow.gs.filter(g => g.sy === 1).length === 1 && drumNow.gs.filter(g => g.sy > 0.3 && g.sy < 0.8).length === 2,
    'a wheel is a drum: no shading laid over its digits, the one facing you full size, the ones either side squashed as they turn away', drumNow);
  // a wrong number on the tape: the tape glides until the truth is under the needle, the given one still marked
  await ev(`(h=>{h.run(['lock']);h.run(['reveal',119]);h.run(['mark','wrong'])})(__primer.app.partNow)`);
  await sleep(300);
  await f.tap('[data-set=look][data-v=tape]'); await sleep(400);
  await ev(`(h=>{h.run(['lock']);h.run(['reveal',119]);h.run(['mark','wrong'])})(__primer.app.partNow)`);
  await sleep(1300);
  const tapeTruth = await ev(`(()=>{const r=document.querySelector('.partstage .pi-tape');return {read:r.querySelector('.pi-nread b').textContent,gold:r.querySelector('.pi-nread').classList.contains('truth'),given:!!r.querySelector('.given').getAttribute('d'),tag:(document.querySelector('.partstage .pi-was')||{}).textContent,value:__primer.app.partNow.state().value}})()`);
  ok(tapeTruth.read === '119' && tapeTruth.gold && tapeTruth.given && tapeTruth.tag === '0 km/h' && tapeTruth.value === 0, 'a wrong tape glides to the truth under its needle, in gold, the given number still marked on the ruler and on its tag', tapeTruth);
  const unitTruth = await unitNow();
  unitOk(unitTruth, 'showing the truth');
  ok(unitTruth && unitTruth.colour[1] === 'rgb(255, 200, 61)', 'and there the unit is gold with the true number', unitTruth && unitTruth.colour);
  await ev(`__primer.app.partNow.run(['reset'])`); await sleep(200);
  ok(await ev(`!document.querySelector('.partstage .pi-was') && !document.querySelector('.partstage .pi-nread.truth')`), 'and Again clears it');
  // its glide to the truth is paced on the clock: off slowly, picking up speed, there within a second
  const tapeAt = async t => { await clock(`m.pin(${t})`); await sleep(150); return (await ev('__primer.app.partNow.debug()')).pos; };
  await tapeAt(100);
  await ev(`(h=>{h.run(['lock']);h.run(['reveal',119])})(__primer.app.partNow)`);
  const tp = [await tapeAt(100.15), await tapeAt(100.5), await tapeAt(100.85), await tapeAt(101)];
  await clock('m.pin(null)');
  ok(tp[0] < 119 * 0.1 && tp[1] > 119 * 0.4 && tp[1] < 119 * 0.6 && tp[2] > 119 * 0.9 && tp[3] === 119, 'the tape sets off slowly towards the truth, picks up speed and is there within a second', tp);
  await ev(`__primer.app.partNow.run(['reset'])`); await sleep(200);
  // the abacus shows the truth a bead at a time, each one sliding along its rod and snapping into place
  await f.tap('[data-set=look][data-v=abacus]'); await sleep(400);
  const beadsAt = async t => { await clock(`m.pin(${t})`); await sleep(150); const d = await ev('__primer.app.partNow.debug()'); return { digits: d.digits.join(''), ys: d.ys, travel: d.travel }; };
  await beadsAt(200);
  const beadTicks0 = await ev('__primer.feel.tickCount()');
  await ev(`(h=>{h.run(['lock']);h.run(['reveal',119])})(__primer.app.partNow)`);
  const bd =[await beadsAt(200), await beadsAt(200.05), await beadsAt(200.13), await beadsAt(200.5), await beadsAt(201)];
  const beadTicks1 = await ev('__primer.feel.tickCount()');
  await clock('m.pin(null)');
  ok(bd[0].digits === '000' && bd[2].digits === '100' && bd[3].digits > '110' && bd[3].digits < '119' && bd[4].digits === '119', 'a wrong abacus moves its beads to the truth one at a time, rod by rod, all within a second', bd.map(b => b.digits));
  // the first bead (rod one, bead one) is part way along its rod at 50 ms, between where it rests and the bar,
  // and up at the bar by 130 ms; halfway through, some bead on the last rod is mid-slide too
  const [top, rest] = bd[0].travel, mid = y => y > top + 3 && y < rest - 3;
  ok(bd[0].ys[0][0] === rest && mid(bd[1].ys[0][0]) && bd[2].ys[0][0] === top && bd[3].ys[2].some((y, b) => mid(y - b * 20)),
    'each bead slides along its rod through the points between, not a jump', { first: bd.map(b => b.ys[0][0]), last: bd[3].ys[2] });
  ok(beadTicks1 - beadTicks0 === 11, 'and each of the eleven beads ticks as it lands', beadTicks1 - beadTicks0);
  await ev(`__primer.app.partNow.run(['reset'])`); await sleep(200);
  await f.tap('[data-set=look][data-v=auto]'); await sleep(300);
  // Pile: the count is in the handle, and every thing added or taken away is a tick
  await f.tap('[data-set=form][data-v=pile]'); await sleep(500);
  const pileNow = () => ev(`(()=>{const d=__primer.app.partNow.debug();return {count:d.count,inHandle:document.querySelector('.partstage .pi-handle .n').textContent,ticks:__primer.feel.tickCount(),chip:!!document.querySelector('.partstage .pi-count:not(.truth)')}})()`);
  const pl0 = await pileNow();
  ok(pl0.inHandle === String(pl0.count) && !pl0.chip, 'the pile\'s count is written in its handle, between the arrows, with no chip of its own', pl0);
  const rowH = await ev(`(()=>{const r=[...document.querySelectorAll('.partstage .pi-row')].map(e=>e.getBoundingClientRect().top);return r[0]-r[1]})()`);
  const hp = await f.rect('.partstage .pi-handle');
  const per = 5, up = 7;
  await f.drag(hp.x, hp.y, 0, -rowH * (up + 0.4) / per, { steps: 40, ms: 1200 });
  const pl1 = await pileNow();
  ok(pl1.count >= pl0.count + up - 1 && pl1.inHandle === String(pl1.count) && pl1.ticks - pl0.ticks >= pl1.count - pl0.count, 'dragging it up, each thing added is a tick under the thumb, and the handle keeps count', { pl0, pl1 });
  const pbox = await f.rect('.partstage .pi-pilebox');
  await f.tapAt(pbox.x, pbox.bottom - 30);
  await sleep(200);
  const pl2 = await pileNow();
  ok(pl2.count < pl1.count && pl2.ticks > pl1.ticks && pl2.inHandle === String(pl2.count), 'and a tap that takes things away ticks too', { pl1, pl2 });
  await shot('17f-pile-count-in-handle');
  // Pictures move on their own, on one clock: the wind, the warmth ball, the sea (the wind once stood still)
  const moving = async (sel, what) => {
    const before = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});return e?e.innerHTML:null})()`), v0 = JSON.stringify(await ev('__primer.app.partNow.state()'));
    await sleep(450);
    const after = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});return e?e.innerHTML:null})()`);
    ok(before && after && before !== after && JSON.stringify(await ev('__primer.app.partNow.state()')) === v0, `${what} moves on its own, the value untouched`);
  };
  await f.tap('[data-set=form][data-v=dial]'); await sleep(500);
  const c0 = (await ev('__primer.app.partNow.debug()')).clock;
  await moving('.partstage svg.pic-wind', "the dial's wind");
  const c1 = (await ev('__primer.app.partNow.debug()')).clock;
  ok(c1.running && c1.moving === 1 && c1.frames - c0.frames >= 8, 'on the one clock, at a calm 30 frames a second or so', { c0, c1 });
  await clock('m.hold(true)');
  const held1 = await ev(`document.querySelector('.partstage svg.pic-wind').innerHTML`);
  await sleep(300);
  ok(held1 === (await ev(`document.querySelector('.partstage svg.pic-wind').innerHTML`)), 'held, the clock stops everything at once');
  await clock('m.hold(false)');
  await f.tap('[data-set=picture][data-v=warmth]'); await sleep(500);
  await moving('.partstage svg.pic-warmth', 'the warmth ball in the dial');
  await f.tap('[data-set=form][data-v=slider]'); await sleep(500);
  await moving('.partstage .pi-pic svg.pic-warmth', "the thermometer's warmth ball");
  await f.tap('[data-set=look][data-v=sea]'); await sleep(500);
  await moving('.partstage .pi-look', 'the sea');
  // The notes on 0.5's forms (round forms3): the sea fills its waves with the warm colour, under a sun
  const seaNow = await ev(`(()=>{const L=document.querySelector('.partstage .pi-look'),w1=L.querySelector('.w1').getBBox(),w2=L.querySelector('.w2').getAttribute('d'),roll=L.querySelector('.rolling path:last-child');
    return {warmTop:w1.y,crestTop:roll.getBBox().y,skyRect:[...L.querySelectorAll('rect')].some(r=>Number(r.getAttribute('height'))===34),split:/q/.test(w2),rays:(L.querySelector('.sun-g path').getAttribute('d').match(/M/g)||[]).length,wl:Math.round(roll.getBBox().width)}})()`);
  ok(seaNow.warmTop < seaNow.crestTop + 1 && !seaNow.skyRect, "the sea's warm colour reaches up into its waves: nothing of the sky's sits under a crest", seaNow);
  ok(seaNow.split && seaNow.rays === 8, 'the two warm tones meet along a wave, and the round thing in the sky is a sun with rays', seaNow);
  const tint = await ev(`(()=>{const o=s=>{const e=document.querySelector(s);return e?Number(e.getAttribute('opacity')):null};return {look:o('.partstage .pi-look .warm'),rays:!!document.querySelector('.partstage .pi-look .rays')}})()`);
  ok(tint.look > 0.4 && tint.look < 0.9 && tint.rays, "the sea's warm layer is a tint: the water's shading and rays show through it", tint);
  await f.tap('[data-set=look][data-v=thermometer]'); await sleep(400);
  const thermo = await ev(`(()=>{const L=document.querySelector('.partstage .pi-look'),th=document.querySelector('.partstage .pi-thumb');
    return {circles:L.querySelectorAll('circle').length,rects:L.querySelectorAll('rect').length,liquid:L.querySelectorAll('.liq').length,thumbBg:getComputedStyle(th).backgroundColor,ring:th.classList.contains('ring')}})()`);
  ok(thermo.circles === 0 && thermo.rects === 0 && thermo.liquid === 1, "the thermometer's glass is one shape, bulb and tube, and so is its liquid, its shaded edge running round both as one", thermo);
  ok(thermo.thumbBg === 'rgb(255, 255, 255)' && !thermo.ring, "the thermometer's handle is a solid disc", thermo);
  const hotEnd = await ev(`(()=>{const g=__primer.app.partNow.debug().run,r=document.querySelector('.partstage .pi-track').getBoundingClientRect();return {x:r.left+g.x0+(g.x1-g.x0)*0.95,y:r.top+g.y0+(g.y1-g.y0)*0.95}})()`);
  await f.tapAt(hotEnd.x, hotEnd.y); await sleep(300);
  const heat = on => ev(`import('/primer/parts/inputs/pictures.js').then(m=>{m.PICTURES.warmth.heatLines=${on};return new Promise(r=>setTimeout(()=>r(Number(document.querySelector('.partstage .pi-pic .shimmer').getAttribute('opacity'))),200))})`);
  const heatOff = await heat(false), heatOn = await heat(true);
  await heat(false);
  ok(heatOff === 0 && heatOn > 0.5, 'at the hot end the heat lines are off unless switched on (the designer picks)', { heatOff, heatOn });
  await f.tap('[data-set=look][data-v=auto]'); await sleep(300);
  await f.tap('[data-set=form][data-v=dial]'); await sleep(300);
  await f.tap('[data-set=picture][data-v=wind]'); await sleep(500);
  const windAt = async k => ev(`import('/primer/parts/inputs/pictures.js').then(m=>{const s=document.querySelector('.partstage svg.pic-wind');m.setPicture('wind',s,${k});const kids=[...s.querySelectorAll('[clip-path] > *')],i=c=>kids.findIndex(e=>e.matches(c)),xs=[...s.querySelectorAll('.rain path')].map(p=>Number(p.getAttribute('d').slice(1).split(' ')[0]));
    const bins=new Set(xs.map(x=>Math.floor((x+40)/40)));return {caps:!!s.querySelector('.caps'),front:i('.sea-b')>i('.palm')&&i('.palm')>i('.sea'),rays:(s.querySelector('.sun-g path').getAttribute('d').match(/M/g)||[]).length,bins:bins.size,mound:[...s.querySelectorAll('.palm > path')].filter(p=>p.getAttribute('stroke')==='#fff0cf').length}})`);
  const gale = await windAt(1);
  ok(!gale.caps && gale.front && gale.mound === 0, "the wind's sea has no white caps, its darker near water lies in front of the island, and nothing is drawn across the foot of the tree", gale);
  ok(gale.bins >= 5 && gale.rays === 8, 'its rain is scattered across the window rather than in rows, and its sun has rays', gale);
  ok(await ev(`!document.querySelector('.partstage svg.pic-wind [stroke="#fff0cf"]')`), 'no light line is drawn on the sand: the island is two flat tones');
  await windAt(0.3);
  await f.tap('[data-set=picture][data-v=warmth]'); await sleep(300);
  await f.tap('[data-set=form][data-v=slider]'); await sleep(300);
  await f.tap('[data-set=look][data-v=sea]'); await sleep(400);
  await f.tap('[data-set=look][data-v=auto]'); await sleep(300);
  await f.tap('[data-set=form][data-v=dial]'); await sleep(300);
  await f.tap('[data-set=picture][data-v=wind]'); await sleep(300);
  await ev(`__primer.app.partNow.remove()`);
  await sleep(200);
  ok((await ev('__primer.app.partNow.debug()')).clock.moving === 0, 'and a part taken off the page leaves nothing on the clock');
  await f.tap('[data-set=form][data-v=dial]'); await sleep(500);
  // Every carrying form also answers to taps: tap a thing, then where it goes.
  const pv = () => ev('__primer.app.partNow.state().value');
  await f.tap('[data-set=form][data-v=sort]'); await sleep(500);
  const tile = await ev(`document.querySelector('.partstage .pi-sorttile').dataset.id`);
  await f.tap(`.partstage .pi-sorttile[data-id="${tile}"]`); await sleep(200);
  const lastBin = await ev(`[...document.querySelectorAll('.partstage .pi-bin')].at(-1).dataset.bin`);
  await f.tap(`.partstage .pi-bin[data-bin="${lastBin}"] .head`); await sleep(600);
  ok((await pv())[tile] === lastBin, 'sort: tap a thing, then a bin, and it goes in', await pv());
  await f.tap('[data-set=form][data-v=snap]'); await sleep(500);
  const card = await ev(`document.querySelector('.partstage .pi-card').dataset.id`), piece = await ev(`document.querySelector('.partstage .pi-piece').dataset.id`);
  await f.tap(`.partstage .pi-piece[data-id="${piece}"]`); await sleep(200);
  await f.tap(`.partstage .pi-card[data-id="${card}"]`); await sleep(600);
  ok((await pv())[card] === piece, 'snap: tap a piece, then a card, and it clicks in', await pv());
  await f.tap('[data-set=form][data-v=string]'); await sleep(500);
  await f.tap('.partstage .pi-end2[data-side=l]'); await f.tap('.partstage .pi-end2[data-side=r]'); await sleep(300);
  ok(Object.keys(await pv()).length === 1, 'string: tap one, then the other, and a string joins them', await pv());
  await f.tap('[data-set=form][data-v=order]'); await sleep(500);
  const was = await pv();
  await f.tap('.partstage .pi-item:first-child'); await f.tap('.partstage .pi-item:last-child'); await sleep(300);
  const swapped = await pv();
  ok(swapped[0] === was.at(-1) && swapped.at(-1) === was[0], 'order: tap two and they swap', { was, swapped });
  await f.tap('[data-set=form][data-v=snap]'); await sleep(500);
  await f.tap('[data-try="0"]');
  await sleep(1100);
  ok(await ev(`document.querySelectorAll('.partstage .pi-piece.truth, .partstage .pi-piece.right').length === 3 && document.querySelector('.partstage .pi').classList.contains('locked')`), 'its Answer shows the truth, locked as a lesson does');
  await f.tap('[data-try="1"]');
  await sleep(500);
  ok(await ev(`!document.querySelector('.partstage .pi').classList.contains('locked') && !document.querySelector('.partstage .pi-piece.truth')`), 'and Again starts it afresh');
  await f.tap('[data-go=back]');
  await sleep(400);
  ok(await ev(`document.querySelector('.review .btn').disabled && document.querySelector('.review .side').innerText.includes('After a lesson')`), "with no facts met yet (these lessons declare none), Review's Start is off");
  await f.tap('.pcard[data-part=map]');
  await waitFor(`document.querySelector('.partstage canvas')`);
  ok(await bare(), 'an opened part hides the tab bar');
  const rows = await ev(`[...document.querySelectorAll('.setrow p')].map(p=>p.textContent)`);
  ok(['projection', 'style', 'spin', 'labels', 'tap', 'zoom', 'pinch', 'equator', 'borders'].every(k => rows.includes(k)), "its panel is built from the part's description: projection is a setting like any other", rows);
  const ownLine = await ev(`(()=>{const r=[...document.querySelectorAll('.setrow')].find(r=>r.querySelector('p').textContent==='style'),s=r.querySelector('.seg').getBoundingClientRect(),p=r.querySelector('p').getBoundingClientRect(),rr=r.getBoundingClientRect();
    return {wide:r.classList.contains('wide'),below:s.top>=p.bottom-1,across:s.width>=rr.width-2,oneLine:new Set([...r.querySelectorAll('.seg button')].map(b=>Math.round(b.getBoundingClientRect().top))).size===1}})()`);
  ok(ownLine.wide && ownLine.below && ownLine.across && ownLine.oneLine, 'the style choice has a line of its own, its choices across the panel', ownLine);
  await f.tap('[data-set=style][data-v=warmth]');
  await sleep(600);
  ok((await ev('__primer.app.partNow.settings.style')) === 'warmth', 'changing a setting redraws the part with it');
  await f.tap('[data-set=style][data-v=political]');
  await sleep(300);
  await f.tap('[data-set=labels][data-v=countries]');
  await sleep(700);
  ok((await ev('__primer.app.partNow.settings.style')) === 'political' && (await ev('__primer.app.partNow.debug().clashes')) === 0, 'the four-colour style is there, with no two neighbours the same colour');
  await shot('17-part-globe-political');
  await f.tap('[data-set=borders]');
  await sleep(600);
  ok((await ev('__primer.app.partNow.settings.borders')) === false, 'and borders can be switched off');
  await shot('17b-part-globe-no-borders');
  await f.tap('[data-set=projection][data-v=equal-earth]');
  await sleep(700);
  ok((await ev('__primer.app.partNow.settings.projection')) === 'equal-earth' && (await ev('__primer.app.partNow.debug().projection')) === 'equal-earth'
    && (await ev('__primer.app.partNow.settings.style')) === 'political', 'the same part turns into a flat map, keeping its style', await ev('__primer.app.partNow.settings'));
  for (const label of ['Track', 'Flight', 'Storm']) await f.tap(`[data-try="${await ev(`__primer.app.partNow.desc.try.findIndex(t=>t.label===${JSON.stringify(label)})`)}"]`);
  await sleep(4400);
  ok((await ev('__primer.app.partNow.debug().routes.length')) === 2, "the panel's tries work on the flat map: a track and a flight", await ev('__primer.app.partNow.debug().routes'));
  await ev(`document.querySelectorAll('*').forEach(e=>{if(e.scrollTop)e.scrollTop=0})`);
  await sleep(200);
  await shot('17c-part-map-flat');
  await f.tap('[data-try="2"]');
  await sleep(400);
  await f.tap('[data-go=back]');
  await sleep(400);
  ok(!(await bare()) && (await text()).includes('Playground'), 'the back arrow leaves, and the tab bar comes back');

  console.log('Dragging leaves nothing behind');
  // A screenshot after dragging, and another after making the browser repaint the whole page: any pixel
  // that differs was left behind by the drag. (The slivers were seen on the phone; this browser is
  // Chromium, so this guards the fix rather than proving the phone's bug.)
  await ev(`__primer.app.openPart('inputs')`);
  await sleep(600);
  for (const form of ['slider', 'order', 'match', 'number']) {
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(300);
    ok(await ev(`!!document.querySelector('.partstage .form-${form}')`), `Inputs still opens as ${form}`);
  }
  const looks = { 'slider/sea': { look: 'sea' }, 'slider/plain': { look: 'plain', direction: 'right' }, 'number/wheels': { look: 'wheels' }, 'number/tape': { look: 'tape' }, 'number/abacus': { look: 'abacus' } };
  for (const which of ['slider', 'slider/sea', 'slider/plain', 'number/wheels', 'number/tape', 'number/abacus', 'order', 'dial', 'pile', 'string', 'sort', 'snap']) {
    const form = which.split('/')[0];
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(400);
    // pictures move on their own: held still from here to the two shots, so only the drag paints
    for (const [k, v] of Object.entries(looks[which] || (form === 'slider' || form === 'number' ? { look: 'auto', direction: 'auto' } : {}))) {
      if (await ev(`!!document.querySelector('[data-set=${k}][data-v=${v}]')`)) { await f.tap(`[data-set=${k}][data-v=${v}]`); await sleep(400); }
    }
    await clock('m.hold(true)');
    if (form === 'slider') {
      // along the run, whichever way it goes, there and back
      const h = '__primer.app.partNow', a = await runPoint(0.05, '.partstage', h), z = await runPoint(0.85, '.partstage', h), m = await runPoint(0.3, '.partstage', h);
      await f.drag(a.x, a.y, z.x - a.x, z.y - a.y, { steps: 20, ms: 500 });
      await f.drag(z.x, z.y, m.x - z.x + 3, m.y - z.y + 3, { steps: 25, ms: 600 });
    } else if (which === 'number/wheels') {
      const w = await f.rect('.partstage .pi-drum[data-i="1"] .pi-dwin');
      await f.drag(w.x, w.y, 0, -150, { steps: 20, ms: 500 });
      await f.drag(w.x, w.y, 0, 90, { steps: 20, ms: 500 });
      ok((await ev('__primer.app.partNow.debug()')).digits[1] !== 0 && await ev(`[...document.querySelectorAll('.partstage .pi-dstrip b')].every(s=>getComputedStyle(s).willChange==='transform')`), 'a drum rolls by finger, its digits moving on their own layers');
    } else if (which === 'number/tape') {
      const t = await f.rect('.partstage .pi-tband');
      await f.drag(t.x + 100, t.y, -200, 0, { steps: 20, ms: 400 });
      await sleep(900);
      await f.drag(t.x - 100, t.y, 120, 3, { steps: 20, ms: 500, hold: 200 });
      ok((await ev('__primer.app.partNow.state()')).value > 0, 'the tape slides by finger');
    } else if (which === 'number/abacus') {
      const r = await f.rect('.partstage .pi-rod:last-of-type .pi-rodbox');
      await f.drag(r.x, r.top + 10, 0, r.h * 0.7, { steps: 20, ms: 500 });
      await f.drag(r.x, r.top + r.h * 0.7, 0, -r.h * 0.4, { steps: 20, ms: 500 });
      ok((await ev('__primer.app.partNow.debug()')).digits.at(-1) > 0 && await ev(`[...document.querySelectorAll('.partstage .pi-bead')].every(s=>getComputedStyle(s).willChange==='transform')`), 'beads are pulled up a rod by finger, moving on their own layers');
      // a finger's tap slides the beads there too, not a jump: the move is still running just after it
      const fb = await f.rect('.partstage .pi-rod:first-of-type .pi-bead[data-b="4"]');
      await f.tapAt(fb.x, fb.y);
      const sliding = await ev(`[...document.querySelectorAll('.partstage .pi-rod:first-of-type .pi-bead')].some(s=>s.getAnimations().some(a=>a.transitionProperty==='transform'&&a.playState==='running'))`);
      ok(sliding && await ev(`parseFloat(getComputedStyle(document.querySelector('.partstage .pi-bead')).transitionDuration)>=0.15`), "a finger's tap slides its beads along the rod", sliding);
    } else if (form === 'order') {
      const a = await f.rect('.pi-item');
      await f.drag(a.x, a.y, 0, 130, { steps: 20, ms: 500 });
      await sleep(500);
      ok(await ev(`[...document.querySelectorAll('.pi-item')].every(i=>getComputedStyle(i).willChange==='transform')`), 'order items move on their own layers');
      const c = await f.rect('.pi-item:last-child');
      await f.drag(c.x, c.y, 0, -150, { steps: 20, ms: 500, hold: 0 });
    } else if (form === 'dial') {
      // round the ring and back
      const d = await f.rect('.pi-dialbox'), r = Math.min(d.w, d.h) * 106 / 300, pts = [];
      for (let k = 0; k <= 24; k++) { const a = Math.PI * (0.8 + 1.3 * Math.sin((k / 24) * Math.PI)); pts.push([d.x + Math.cos(a) * r, d.y + Math.sin(a) * r]); }
      await f.touch('touchStart', [pts[0]]);
      for (const p of pts.slice(1)) { await sleep(25); await f.touch('touchMove', [p]); }
      await f.touch('touchEnd', []);
      ok(await ev(`getComputedStyle(document.querySelector('.pi-knob')).willChange==='transform'`), 'the dial\'s knob moves on its own layer');
    } else if (form === 'pile') {
      const h = await f.rect('.pi-handle'), box = await f.rect('.pi-pilebox');
      await f.drag(h.x, h.y, 0, box.top + 30 - h.y, { steps: 20, ms: 500 });
      const h2 = await f.rect('.pi-handle');
      await f.drag(h2.x, h2.y, 0, (box.bottom - 60) - h2.y, { steps: 20, ms: 500 });
      ok(await ev(`['.pi-handle','.pi-level'].every(s=>getComputedStyle(document.querySelector(s)).willChange==='transform')`), 'the pile\'s level and handle move on their own layers');
    } else if (form === 'string') {
      const a = await f.rect('.pi-end2[data-side=l]'), z = await f.rect('.pi-end2[data-side=r]:last-child');
      await f.drag(a.x, a.y, z.x - a.x, z.y - a.y, { steps: 20, ms: 500 });
      await f.drag(a.x, a.y, z.x - a.x - 40, z.y - a.y - 60, { steps: 20, ms: 500 });
    } else if (form === 'sort') {
      const a = await f.rect('.pi-sorttile'), z = await f.rect('.pi-bin');
      await f.drag(a.x, a.y, z.x - a.x, z.y - a.y, { steps: 20, ms: 500 });
      await sleep(400);
      const a2 = await f.rect('.pi-sorttile.in');
      await f.drag(a2.x, a2.y, 60, 160, { steps: 20, ms: 500 });
      ok(await ev(`[...document.querySelectorAll('.pi-sorttile')].every(i=>getComputedStyle(i).willChange==='transform')`), 'sort\'s things move on their own layers');
    } else if (form === 'snap') {
      const c = await f.rect('.pi-card'), p = await f.rect('.pi-piece:last-of-type');
      await f.drag(p.x, p.y, c.right - p.left, c.y - p.y, { steps: 20, ms: 500 });
      await sleep(400);
      const p2 = await f.rect('.pi-piece.docked');
      await f.drag(p2.x, p2.y, 30, 140, { steps: 20, ms: 500 });
      ok(await ev(`[...document.querySelectorAll('.pi-piece')].every(i=>getComputedStyle(i).willChange==='transform')`), 'snap\'s pieces move on their own layers');
    }
    await sleep(700);
    const before = await b.send('Page.captureScreenshot', { format: 'png' });
    await ev(`(async()=>{document.body.style.opacity='0.99';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));document.body.style.opacity='';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return 1})()`);
    const after = await b.send('Page.captureScreenshot', { format: 'png' });
    await clock('m.hold(false)');
    const diff = differing(before.data, after.data);
    ok(diff === 0, `${which}: after dragging back and forth, nothing is left behind (${diff} pixels differ from a full repaint)`);
  }
  for (const k of ['look', 'direction']) if (await ev(`!!document.querySelector('[data-set=${k}][data-v=auto]')`)) await f.tap(`[data-set=${k}][data-v=auto]`);
  ok(!(await ev(`[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).some(t=>/pi-item\\.lift/.test(t)&&/box-shadow:[^;]*\\d+px \\d+px [1-9]/.test(t))`)), 'a lifted item has no blurred shadow');
  await f.tap('[data-go=back]');
  await sleep(300);

  console.log('Every part, with every setting at its extremes');
  await ev(`(()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px;z-index:50;background:#141a3c';document.body.append(d)})()`);
  const extremes = (spec, example, form) => {
    if (spec.type === 'choice') return (form && spec.byForm && spec.byForm[form]) || spec.options;
    if (spec.type === 'bool') return [true, false];
    if (spec.type === 'number') return [spec.min, spec.max];
    if (spec.type === 'lonlat') return [[-180, -75], [180, 75]];
    if (spec.type === 'text') return ['', 'W'.repeat(spec.maxLength || 12)];
    if (spec.type === 'media') return ['', 'topics/test-topic/media/target.svg'];
    if (spec.type === 'list') {
      const base = example && example.length ? example : [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
      const make = n => Array.from({ length: n }, (_, i) => (typeof base[0] === 'string' ? `End ${i + 1}` : { id: `i${i}`, text: `${base[i % base.length].text} ${i + 1}` }));
      return [make(spec.minItems || 0), make(spec.maxItems || 5)];
    }
    return [];
  };
  const parts = await ev('__primer.parts.listParts()');
  ok(JSON.stringify(parts) === JSON.stringify(['map', 'inputs', 'section', 'molecules']), 'the kit is the map, the inputs, the sea and sky and the molecules up close: the globe is a preset of the map, not a part of its own', parts);
  for (const name of parts) {
    const desc = await ev(`__primer.parts.describe(${JSON.stringify(name)})`);
    const cases = [];
    const forms = name === 'inputs' ? desc.settings.form.options : [null];
    // the map: every setting at its extremes on every projection
    const projections = name === 'map' ? desc.settings.projection.options : [null];
    for (const form of forms) {
      for (const projection of projections) {
        const example = name === 'inputs' ? desc.example[form].settings : { ...desc.example.settings, ...(projection ? { projection } : {}) };
        for (const [k, spec] of Object.entries(desc.settings)) {
          if (k === 'form' || k === 'projection') continue;
          if (form && spec.forms && !spec.forms.includes(form)) continue;
          for (const val of extremes(spec, example[k], form)) cases.push({ form, projection, k, val, settings: { ...example, [k]: val } });
        }
      }
    }
    let drew = 0, touched = 0, cleaned = 0, problems = [];
    for (const c of cases) {
      const label = `${name}${c.form ? `/${c.form}` : ''}${c.projection ? `/${c.projection}` : ''} ${c.k}=${JSON.stringify(c.val).slice(0, 30)}`;
      await ev(`(async()=>{const el=document.getElementById('bench');el.innerHTML='';window.__h=await __primer.parts.mount(${JSON.stringify(name)},el,${JSON.stringify(c.settings)},{media:p=>'/primer/../__gh/__none/'+p});})()`);
      await sleep(name === 'map' ? 250 : 80);
      // it draws
      const drawn = await ev(name !== 'inputs'
        ? `(()=>{const c=document.querySelector('#bench canvas');const g=c.getContext('2d');const d=g.getImageData(c.width/2-20,c.height/2-20,40,40).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n>100})()`
        : `(()=>{const r=document.querySelector('#bench .pi');return !!r&&r.getBoundingClientRect().height>30&&r.children.length>0})()`);
      if (drawn) drew++; else problems.push(`${label}: drew nothing`);
      // it answers a finger
      let moved = false;
      if (desc.touch === false) moved = true;   // a part for scenes and figures: nothing in it takes a touch
      else if (name === 'map') {
        const c = await f.rect('#bench canvas');
        await f.tapAt(c.x, c.y);
        moved = !!(await ev('__h.state().tapped'));
      } else {
        const form = c.form;
        const before = JSON.stringify(await ev('__h.state()'));
        if (form === 'choice') await f.tap('#bench .pi-opt');
        if (form === 'slider') { const pt = await runPoint(0.8, '#bench', '__h'); await f.tapAt(pt.x, pt.y); }
        if (form === 'number') {
          const look = (await ev('__h.debug()')).look;
          if (look === 'keys') await f.tap('#bench .pi-key[data-k="7"]');
          if (look === 'wheels') await f.tap('#bench .pi-drum:last-of-type .pi-roll[data-d="1"]');
          if (look === 'tape') { const t = await f.rect('#bench .pi-tband'); await f.tapAt(t.x + 70, t.y); await sleep(500); }
          if (look === 'abacus') await f.tap('#bench .pi-rod:last-of-type .pi-bead[data-b="2"]');
        }
        if (form === 'order') { const r = await f.rect('#bench .pi-item'); const r2 = await f.rect('#bench .pi-item:last-child'); await f.drag(r.x, r.y, 0, r2.y - r.y, { steps: 12, ms: 300 }); }
        if (form === 'match') { await f.tap('#bench .pi-cell[data-side=l]'); await f.tap('#bench .pi-cell[data-side=r]'); }
        if (form === 'spot') { const r = await f.rect('#bench .pi-spot'); await f.tapAt(r.x, r.y); }
        if (form === 'dial') {
          const r = await f.rect('#bench .pi-dialbox');
          await f.tapAt(r.x - Math.min(r.w, r.h) * 0.35, r.y);
          if (JSON.stringify(await ev('__h.state()')) === before) await f.tapAt(r.x + Math.min(r.w, r.h) * 0.35, r.y);
        }
        if (form === 'pile') {
          const r = await f.rect('#bench .pi-pilebox');
          await f.tapAt(r.x, r.top + 30);
          if (JSON.stringify(await ev('__h.state()')) === before) await f.tapAt(r.x, r.bottom - 26);
        }
        if (form === 'string') { await f.tap('#bench .pi-end2[data-side=l]'); await f.tap('#bench .pi-end2[data-side=r]'); }
        if (form === 'sort') { const a = await f.rect('#bench .pi-sorttile'), z = await f.rect('#bench .pi-bin'); await f.drag(a.x, a.y, z.x - a.x, z.y - a.y, { steps: 10, ms: 260 }); }
        if (form === 'snap') { const c = await f.rect('#bench .pi-card'), p = await f.rect('#bench .pi-piece'); await f.drag(p.x, p.y, c.right - p.left, c.y - p.y, { steps: 10, ms: 260 }); }
        await sleep(120);
        moved = JSON.stringify(await ev('__h.state()')) !== before;
      }
      if (moved) touched++; else problems.push(`${label}: didn't answer a finger`);
      // it cleans up
      await ev('__h.remove()');
      await sleep(60);
      const left = await ev(`document.getElementById('bench').children.length === 0 && (!__h.busy || !__h.busy())`);
      if (left) cleaned++; else problems.push(`${label}: left something behind`);
    }
    ok(drew === cases.length, `${name}: draws with each of ${cases.length} settings at its extremes${name === 'map' ? ', on every projection' : ''}`, problems.filter(p => p.includes('drew')));
    ok(touched === cases.length, `${name}: answers a finger with each`, problems.filter(p => p.includes('finger')));
    ok(cleaned === cases.length, `${name}: cleans up after each`, problems.filter(p => p.includes('behind')));
  }
  await ev(`document.getElementById('bench').remove()`);
  // Every call in each description, with real arguments; the map's on every projection.
  const callArgs = {
    spinTo: [[10, 20], 0.2], zoomTo: [2, 0.2], highlight: [['Brazil', 'France'], 'pink'], colourBy: [{ Brazil: 3, France: 1, Chad: 2 }, 'green'], band: [5, 20],
    point: [[0, 0], 'Here'], marker: [[-40, 15], 'storm', 'Storm'], arc: [[-0.1, 51.5], [-118.2, 34]], track: [[[-25, 12], [-45, 15], [-62, 21]], 0.5, 'storm', 0.3],
    clear: [], reveal: [26.5], mark: ['right'], lock: [], reset: [],
    camera: [[-45, 18], 2.4, 0.6, 10, 0.2], follow: [true, 0.5], drift: [8, 0.2], grow: [1.4, 0.2], label: ['Atlantic Ocean'], parallel: [5, '5° N'],
    flow: [[[-20, 18], [-35, 14], [-50, 16]], 'cyan', 0.3, 'Trade winds'], spiral: [[-45, 20], 1, 0.3, 9], style: ['warmth', 0.2], key: [true],
    carry: [1, 0.2], drops: [1, 0.2], cooling: [1, 0.2], days: [1, 0.2], gauge: [27, '°C', 0.2],
    sun: [1, 0.2], warm: [0.8, 0.2], vapour: [1, 0.2], rise: [1.5, 0.2], cloud: [0.9, 0.2], release: [1, 0.2], inflow: [1, 0.2], rain: [0.5, 0.2], view: ['cloud', 0.2], tag: ['cloud', 'Cloud'],
    // round three: the air on the map, the sea and sky's loop and signs, the molecules
    winds: ['all', 0.5, 0.2, true], turning: [true, true, true], cells: ['all', 1, 0.2, true], frame: [-0.3, 0.1, 0.2], sign: [[-40, 20], 'High', 'cyan'],
    ground: [1, 0.2], heat: [1, 0.2], outflow: [1, 0.2], sink: [1, 0.2], beam: [1, 0.2], sunAngle: [30, 0.2], parcel: [0.6, 0.2, 18],
    air: [0.6, 0.2], pushes: [1, 0.2], split: [1, 0.2], open: [1, 0.2], lift: [1, 0.2], escape: [1, 0.2],
    // round four: a storm dying away, vapour condensing (the map's parcel shares its name with the sea and sky's)
    weaken: [0.5, 0.2], condense: [1, 0.2],
  };
  for (const name of parts) {
    const desc = await ev(`__primer.parts.describe(${JSON.stringify(name)})`);
    if (!desc.calls) continue;
    const missing = Object.keys(desc.calls).filter(c => !(c in callArgs));
    ok(missing.length === 0, `${name}: the test has arguments for every call`, missing);
    for (const projection of name === 'map' ? desc.settings.projection.options : [null]) {
      const settings = name === 'inputs' ? desc.example.slider.settings : { ...desc.example.settings, projection };
      await ev(`(async()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px';document.body.append(d);window.__h=await __primer.parts.mount(${JSON.stringify(name)},d,${JSON.stringify(settings)});})()`);
      const res = await ev(`(()=>{const out=[];const ex=${JSON.stringify(callArgs)};for(const c of Object.keys(__h.desc.calls)){try{__h.run([c,...(ex[c]||[])]);out.push(c)}catch(e){out.push(c+': '+e.message)}}return out})()`);
      await sleep(400);
      ok(res.every(x => !x.includes(':')), `${name}${projection ? ` (${projection})` : ''}: every call in its description works`, res);
      await ev(`__h.remove();document.getElementById('bench').remove()`);
    }
  }

  // Round four: in a scene every hurricane turns (its turn counted up frame by frame), and dies away slowly;
  // a parcel of air keeps its eastward speed, so heading for the equator it drifts west of its aim
  {
    await ev(`(async()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px';document.body.append(d);window.__h=await __primer.parts.mount('globe',d,{style:'day',spin:'locked',tap:'none',view:[-40,18]},{motion:'soft'});return true})()`);
    await ev(`__h.run(['marker',[-45,18],'storm']);true`);
    const s0 = (await ev('__h.debug()')).spun;
    await sleep(1000);
    const s1 = (await ev('__h.debug()')).spun;
    ok(s1 - s0 > 0.3 && s1 - s0 < 0.9, `a hurricane in a scene turns, calmly (${(s1 - s0).toFixed(2)} of a lesson storm's seconds of turning in one second)`, [s0, s1]);
    await ev(`__h.run(['weaken', 0.6, 0.3]);true`);
    await sleep(500);
    const s2 = (await ev('__h.debug()')).spun;
    await sleep(1000);
    const s3 = (await ev('__h.debug()')).spun, weak = (await ev('__h.debug()')).weak;
    ok(Math.abs(weak - 0.6) < 1e-6 && s3 - s2 < (s1 - s0) * 0.7, 'weakening, it turns slower', { weak, before: s1 - s0, after: s3 - s2 });
    await ev(`__h.run(['parcel',[-30,30],2,1,0,'both',0.3]);true`);
    const pc = (await ev('__h.debug()')).parcels;
    ok(pc.length === 1 && pc[0].progress === 1 && Math.abs(pc[0].drag - 0.3) < 1e-6, 'a parcel of air is set off toward a latitude, with friction slowly bringing its speed up', pc);
    const paths = await ev(`import('/primer/parts/map/air.js').then(A => ({ south: A.parcelPath([-30, 30], 2).at(-1), north: A.parcelPath([-30, 30], 55).at(-1), dragged: A.parcelPath([-30, 30], 2, 0.5).at(-1) }))`);
    ok(paths.south[0] < -40 && paths.north[0] > -30 && paths.dragged[0] > paths.south[0], 'heading for the equator it falls behind, to the west of its aim; heading for a pole it pulls ahead, east; dragged along by friction it drifts less', paths);
    await ev(`__h.remove();document.getElementById('bench').remove()`);
    // the molecules: vapour condensing into drops, then letting its heat go
    await ev(`(async()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px';document.body.append(d);window.__h=await __primer.parts.mount('molecules',d,{below:'none',carry:1},{motion:'soft'});return true})()`);
    await ev(`__h.run(['condense',1,0.2]);__h.run(['release',1,0.2]);__h.run(['tag','drop','Drops forming']);true`);
    await sleep(500);
    const mol = await ev('__h.debug()');
    ok(mol.levels.condense === 1 && mol.levels.release === 1 && mol.tags[0].thing === 'drop', 'up close, vapour sticks together into drops and lets its heat go', mol);
    await ev(`__h.remove();document.getElementById('bench').remove()`);
  }

  // The tools that explain a mechanism: air spiralling in, the way the Earth bends it; old winds cleared alone;
  // a change of style; a key; a dotted aim beside a bent path
  {
    await ev(`(async()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px';document.body.append(d);window.__h=await __primer.parts.mount('globe',d,{style:'day',spin:'locked',tap:'none',view:[-40,10],zoom:1.6},{motion:'soft'});return true})()`);
    await ev(`__h.run(['spiral',[-45,22],0,0,9]);__h.run(['spiral',[-30,0.5],1,0,9]);__h.run(['spiral',[60,-20],0,0,9]);__h.run(['flow',[[-20,18],[-35,14]],'cyan',0,'Wind']);__h.run(['arc',[-28,46],[-28,8],'white','Aimed','dotted']);true`);
    await ev(`__h.run(['spiral',[-45,22],1,0.6]);true`);
    await sleep(900);
    let dbg = await ev('__h.debug()');
    ok(dbg.spirals.length === 3 && Math.abs(dbg.spirals[0].bend - 1) < 1e-6, 'a spiral called again at its place glides to the new bend', dbg.spirals);
    const arms = await ev(`(async()=>{const L=await import('/primer/parts/map/layers.js');const turn=(at,b)=>{const a=L.spiralArms({at,size:9},b)[0];const ang=p=>Math.atan2(p[1]-at[1],(p[0]-at[0])*Math.cos(at[1]*Math.PI/180));let d=ang(a.at(-1))-ang(a[0]);return Math.round(d*100)/100};return {north:turn([-45,22],1),south:turn([60,-20],1),equator:turn([-30,0.5],1),aimed:turn([-45,22],0)}})()`);
    ok(arms.north > 1 && arms.south < -1 && Math.abs(arms.equator) < 0.1 && arms.aimed === 0, 'bent, air swirls counterclockwise in the north, clockwise in the south, and not at all on the equator; aimed, it goes straight in', arms);
    await ev(`__h.run(['clear',0,'flows']);true`);
    dbg = await ev('__h.debug()');
    ok(dbg.routes.length === 1 && dbg.routes[0].kind === 'arc' && dbg.spirals.length === 3, 'clearing the flows leaves the rest', dbg.routes);
    await ev(`__h.run(['style','warmth',0.3]);__h.run(['key',true]);true`);
    await sleep(500);
    dbg = await ev('__h.debug()');
    ok(dbg.style === 'warmth' && dbg.key, 'the style changes, fading, and a key to its colours shows', [dbg.style, dbg.key]);
    await ev(`__h.remove();document.getElementById('bench').remove()`);
  }

  // A bench for the map, as a lesson would put it on screen: by the part's name (map, or the globe preset).
  const mountOn = (part, settings) => ev(`(async()=>{document.getElementById('bench')?.remove();const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px;z-index:50;background:#141a3c';document.body.append(d);window.__h=await __primer.parts.mount(${JSON.stringify(part)},d,${JSON.stringify(settings)});window.__ev=[];for(const k of ['tapped','settled','zoomed','turned'])__h.on(k,v=>__ev.push([k,v]));return true})()`);
  const events = () => ev('__ev.map(e=>e[0])');
  const pixelAt = place => ev(`(()=>{const c=document.querySelector('#bench canvas'),b=c.getBoundingClientRect(),k=c.width/b.width,p=__h.where(${JSON.stringify(place)});const d=c.getContext('2d').getImageData(Math.round((p.x-b.left)*k),Math.round((p.y-b.top)*k),1,1).data;return [d[0],d[1],d[2]]})()`);
  const near = (rgb, hex, tol = 30) => [1, 3, 5].every((i, n) => Math.abs(parseInt(hex.slice(i, i + 2), 16) - rgb[n]) <= tol);

  console.log('The map: steady names, lines over the land, borders and four colours, on the globe and on a flat map');
  for (const [part, extra] of [['globe', {}], ['map', { projection: 'equal-earth' }]]) {
    const on = part === 'globe' ? 'globe' : 'flat map';
    const bench = settings => mountOn(part, { ...settings, ...extra });
    // Names, sampled every 60 ms while it turns by itself: none may go off and come back on.
    await bench({ style: 'day', spin: 'auto', labels: 'countries', view: [0, 25], zoom: part === 'globe' ? 1 : 2 });
    await sleep(900);
    const seen = new Map();
    for (let i = 0; i < 50; i++) {
      for (const l of await ev('__h.debug().labels')) { const s = seen.get(l.name) || []; s.push(l.on ? 1 : 0); seen.set(l.name, s); }
      await sleep(60);
    }
    // a blink: off for under about a third of a second between two spells on
    const blinks = [...seen].filter(([, s]) => /1(0{1,5})1/.test(s.join('')));
    ok(seen.size >= 8 && blinks.length === 0, `${on}: while it turns, names stay put: none blinks off and back on (${seen.size} names watched)`, blinks.map(([n, s]) => `${n}:${s.join('')}`));
    // A dotted line where it crosses Africa: the equator and a band's edge show over the land, not under it.
    await bench({ style: 'day', spin: 'locked', tap: 'none', equator: true, view: [20, 8], zoom: part === 'globe' ? 1 : 2 });
    await ev(`__h.run(['band', 5, 20])`);
    await sleep(500);
    const over = await ev(`(()=>{const c=document.querySelector('#bench canvas'),g=c.getContext('2d'),k=c.width/c.getBoundingClientRect().width,b=c.getBoundingClientRect();
      const count=(lat,test)=>{let n=0;for(let lon=12;lon<=30;lon+=0.25){const p=__h.where([lon,lat]);const x=Math.round((p.x-b.left)*k),y=Math.round((p.y-b.top)*k);const d=g.getImageData(x-2,y-2,5,5).data;for(let i=0;i<d.length;i+=4)if(test(d[i],d[i+1],d[i+2]))n++;}return n};
      return {equator:count(0,(r,g2,bl)=>r>215&&g2>215&&bl>215),band:count(20,(r,g2,bl)=>r>220&&g2>170&&bl<120)}})()`);
    ok(over.equator > 0 && over.band > 0, `${on}: dotted lines (the equator, a band's edge) are drawn over the land too`, over);
    // Borders off, and the four colours.
    const pixelsOf = () => ev(`(()=>{const c=document.querySelector('#bench canvas');return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data.filter((_,i)=>i%16===0)).join(',')})()`);
    await bench({ style: 'day', spin: 'locked', view: [15, 48], zoom: 2 });
    await sleep(500);
    const withBorders = await pixelsOf();
    await bench({ style: 'day', spin: 'locked', view: [15, 48], zoom: 2, borders: false });
    await sleep(500);
    ok((await pixelsOf()) !== withBorders, `${on}: with borders off, the borders are gone`);
    await bench({ style: 'political', spin: 'locked', view: [15, 30], zoom: 1.4 });
    await sleep(500);
    const four = await ev(`(()=>{const c=document.querySelector('#bench canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const want=['#3fcfae','#ffd062','#f27ba3','#a58cf2'].map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));const n=[0,0,0,0];for(let i=0;i<d.length;i+=16)want.forEach((w,k)=>{if(Math.abs(d[i]-w[0])+Math.abs(d[i+1]-w[1])+Math.abs(d[i+2]-w[2])<12)n[k]++});return {n,clashes:__h.debug().clashes}})()`);
    ok(four.n.every(x => x > 50) && four.clashes === 0, `${on}: the political style uses all four colours, and no two neighbours share one`, four);
    // Still, it costs nothing.
    await bench({ style: 'warmth', spin: 'locked', labels: 'countries', equator: true, view: [-40, 15] });
    await ev(`__h.run(['band', 5, 20])`);
    await ev(`__h.run(['arc', [-0.1, 51.5], [-74, 40.7]])`);
    await ev(`__h.run(['track', [[-25, 12], [-45, 15], [-62, 21]], 0.6])`);
    await sleep(1200);
    const r0 = await ev('__h.debug().redraws');
    await sleep(600);
    ok(!(await ev('__h.busy()')) && (await ev('__h.debug().redraws')) === r0, `${on}: still, it asks for no frames and redraws nothing, its names, band, arc and track included`);
  }

  console.log('The map: one part, every projection');
  const lessonGlobe = await ev(`__primer.parts.describe('globe')`);
  ok(lessonGlobe.of === 'map' && lessonGlobe.settings.projection.default === 'globe' && lessonGlobe.settings.pinch.default === false && JSON.stringify(Object.keys(lessonGlobe.calls)) === JSON.stringify(Object.keys((await ev(`__primer.parts.describe('map')`)).calls)),
    "a lesson's globe is the map under another name: projection globe, no finger zooming, every call the map has", { of: lessonGlobe.of, projection: lessonGlobe.settings.projection.default });
  await mountOn('globe', { style: 'day', tap: 'country' });
  ok((await ev('__h.debug().projection')) === 'globe' && (await ev('__h.name')) === 'globe', 'mounted as globe, it draws a globe');
  for (const projection of ['globe', 'equal-earth', 'natural-earth', 'mercator']) {
    const flat = projection !== 'globe';
    await mountOn('map', { projection, style: 'day', tap: 'country', labels: 'countries', view: [-30, 0] });
    await sleep(500);
    // taps land on the right country, and on the sea
    const hits = [];
    for (const [place, want] of [[[-50, -10], 'Brazil'], [[2.5, 46.5], 'France'], [[-100, 40], 'United States of America'], [[-30, 0], null]]) {
      const p = await ev(`__h.where(${JSON.stringify(place)})`);
      await f.tapAt(p.x, p.y);
      await sleep(380);
      const st = await ev('__h.state()');
      hits.push(`${want}:${st.tapped && st.tapped.country}`);
      if ((st.tapped && st.tapped.country) !== want || st.selected !== want || (want === null && st.tapped.land !== false)) hits.push('WRONG');
    }
    ok(!hits.includes('WRONG') && (await events()).filter(e => e === 'tapped').length === 4, `${projection}: a tap picks the country under the finger (Brazil, France, the USA), and the sea is sea`, hits);
    await shot(`19-map-${projection}-tapped`);
    // drag: sideways turns the globe, or rolls the flat world round; it settles once let go
    await mountOn('map', { projection, style: 'day', view: [0, 0] });
    await sleep(300);
    // a whole flat world sits in the middle of the box: its middle latitude is where it rests (0, or higher
    // on Mercator, which stops short of Antarctica)
    const level = (await ev('__h.state()')).centre[1];
    const c = await f.rect('#bench canvas');
    await f.drag(c.x, c.y, -120, 0, { ms: 400, steps: 12 });
    await sleep(1600);
    const after = await ev('__h.state()');
    ok(after.centre[0] > 10 && Math.abs(after.centre[1] - level) < 3 && (await events()).includes('settled'), `${projection}: dragging left brings the east into view, and it settles`, after);
    // up and down: the globe tips; a whole flat world can't move up or down, a zoomed one can
    await f.drag(c.x, c.y, 0, 120, { ms: 400, steps: 12 });
    await sleep(1600);
    const tipped = await ev('__h.state()');
    ok(flat ? Math.abs(tipped.centre[1] - level) < 0.5 : tipped.centre[1] > 10, `${projection}: dragging down ${flat ? "leaves a whole flat world where it is (there's nothing above it)" : 'tips the globe to show the north'}`, tipped);
    if (flat) {
      await ev(`__h.run(['zoomTo', 3, 0])`);
      await f.drag(c.x, c.y, 0, 120, { ms: 400, steps: 12 });
      await sleep(1600);
      const panned = await ev('__h.state()');
      ok(panned.centre[1] > 5 && panned.zoom === 3, `${projection}: zoomed in, dragging down pans to the north, like paper`, panned);
      await f.drag(c.x, c.y, 0, 3000, { ms: 400, steps: 12 });
      await sleep(1800);
      const top = await ev(`(()=>{const c=document.querySelector('#bench canvas'),g=c.getContext('2d');const d=g.getImageData(c.width/2,4,1,1).data;return {state:__h.state(),edge:d[3]}})()`);
      ok(top.edge === 255 && top.state.centre[1] < 89, `${projection}: and it stops at the map's top edge, with no empty space above it`, top);
    }
    // pinch to zoom, and tap twice
    await mountOn('map', { projection, style: 'day', view: [10, 20], tap: 'pin' });
    await sleep(300);
    await f.touch('touchStart', [[c.x - 30, c.y], [c.x + 30, c.y]]);
    for (let i = 1; i <= 10; i++) { await sleep(25); await f.touch('touchMove', [[c.x - 30 - i * 3, c.y], [c.x + 30 + i * 3, c.y]]); }
    await f.touch('touchEnd', []);
    await sleep(400);
    const pinched = await ev('__h.state()');
    ok(pinched.zoom > 1.6 && pinched.zoom < 2.4 && (await events()).includes('zoomed'), `${projection}: pinching apart zooms in, about the fingers, and says so`, { zoom: pinched.zoom, events: await events() });
    await f.tapAt(c.x, c.y);
    await f.tapAt(c.x, c.y);
    await sleep(700);
    const doubled = await ev('__h.state()');
    ok(Math.abs(doubled.zoom - pinched.zoom * 2) < 0.05, `${projection}: tapping twice zooms in twice as close`, doubled);
    await mountOn('globe', { projection, view: [10, 20], tap: 'pin' });
    await sleep(300);
    await f.tapAt(c.x, c.y);
    await f.tapAt(c.x, c.y);
    await sleep(700);
    ok((await ev('__h.state()')).zoom === 1 && (await events()).filter(e => e === 'tapped').length === 2, `${projection}, as the lesson's globe: two quick taps stay two taps (no finger zooming)`, await events());
    // the calls: turning or panning, zooming, and the events they give
    await mountOn('map', { projection, style: 'day', view: [0, 0] });
    await ev(`__h.run(['spinTo', [100, 30], 0])`);
    const turned = await ev('__h.state()');
    ok(turned.centre[0] === 100 && (flat ? Math.abs(turned.centre[1] - level) < 0.5 : turned.centre[1] === 30), `${projection}: spinTo ${flat ? 'pans' : 'turns'} to the place${flat ? ' (a whole flat world stays level)' : ''}`, turned);
    await ev(`__h.run(['zoomTo', 'France', 0])`);
    const fr = await ev('__h.state()');
    const frAt = await ev(`__h.where('France')`);
    const box = await f.rect('#bench canvas');
    ok(fr.zoom > 3 && Math.abs(frAt.x - box.x) < 30 && Math.abs(frAt.y - box.y) < 30, `${projection}: zoomTo a country fills the view with it`, { zoom: fr.zoom, at: [Math.round(frAt.x - box.x), Math.round(frAt.y - box.y)] });
    await ev(`__h.run(['zoomTo', 1, 0.3])`);
    await sleep(700);
    ok((await ev('__h.state()')).zoom === 1 && (await events()).filter(e => e === 'zoomed').length >= 2 && (await events()).includes('settled'), `${projection}: zoomTo a level glides there, and says zoomed and settled`, await events());
    await ev(`__h.run(['zoomTo', [-60, 15], 0])`);
    ok((await ev('__h.state()')).zoom === 3, `${projection}: zoomTo a place centres on it at level 3`, await ev('__h.state()'));
    // arcs and tracks: drawn along great circles, as far as they've got
    await mountOn('map', { projection, style: 'day', view: [-45, 35], zoom: 2, spin: 'locked', tap: 'none' });
    await ev(`__h.run(['arc', [-0.1, 51.5], [-74, 40.7]])`);
    await sleep(1300);
    const mid = await ev(`(async()=>{const {geoInterpolate}=await import('d3-geo');return geoInterpolate([-0.1,51.5],[-74,40.7])(0.5)})()`);
    const straight = [(-0.1 - 74) / 2, (51.5 + 40.7) / 2];
    const onArc = await pixelAt(mid), offArc = await pixelAt(straight);
    ok(near(onArc, '#ffc83d', 40) && !near(offArc, '#ffc83d', 40), `${projection}: an arc follows the great circle, north of the straight line between London and New York`, { onArc, offArc, mid });
    await ev(`__h.run(['track', [[-25, 12], [-45, 15], [-62, 21], [-73, 30]], 0.5, 'ring'])`);
    await ev(`__h.run(['track', [[-25, 12], [-45, 15], [-62, 21], [-73, 30]], 0.75, 'pin', 0.4])`);
    await sleep(900);
    const rt = await ev('__h.debug().routes');
    ok(rt.length === 2 && Math.abs(rt[1].progress - 0.75) < 1e-6 && rt[1].rider === 'pin', `${projection}: calling track again with the same path moves that track on, rather than adding one`, rt);
    // the curve rounds the places between its ends, so look for the line within a few pixels of each
    const whiteNear = place => ev(`(()=>{const c=document.querySelector('#bench canvas'),b=c.getBoundingClientRect(),k=c.width/b.width,p=__h.where(${JSON.stringify(place)});const d=c.getContext('2d').getImageData(Math.round((p.x-b.left)*k)-9,Math.round((p.y-b.top)*k)-9,19,19).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]>200&&d[i+2]>200)n++;return n})()`);
    const drawnTo = await whiteNear([-45, 15]), notYet = await whiteNear([-73, 30]);
    ok(drawnTo > 4 && notYet === 0, `${projection}: a track is drawn as far as its progress, and no further`, { drawnTo, notYet });
    // colouring from a table: countries, then bands of latitude
    await ev(`__h.run(['spinTo', [-30, -10], 0])`);
    await ev(`__h.run(['zoomTo', 1, 0])`);
    await ev(`__h.run(['colourBy', { Brazil: 10, Argentina: 0, Chad: 'pink' }, 'heat'])`);
    await sleep(200);
    const [brazil, argentina, chad] = [await pixelAt([-50, -10]), await pixelAt([-65, -35]), await pixelAt([18.5, 15.5])];
    ok(near(brazil, '#ffd062', 20) && near(argentina, '#1b2a80', 20) && near(chad, '#ee4b7a', 20), `${projection}: colourBy colours countries from a table: highest and lowest at the ramp's ends, a colour as given`, { brazil, argentina, chad });
    await ev(`__h.run(['colourBy', [[10, 30, 1], [-30, -10, 0]], 'blue'])`);
    await sleep(200);
    const [northSea, southSea] = [await pixelAt([-40, 20]), await pixelAt([-20, -20])];
    ok(near(northSea, '#b8ecff', 24) && near(southSea, '#2a2f66', 24) && (await ev('__h.debug().table')), `${projection}: and bands of latitude, over the sea`, { northSea, southSea });
    await ev(`__h.run(['clear'])`);
    await sleep(200);
    ok((await ev('__h.debug().routes.length')) === 0 && !(await ev('__h.debug().table')), `${projection}: clear takes it all away`);
    await shot(`19-map-${projection}-after`);
  }
  // Panning a flat map, at the phone's pixel ratio: how long the map itself takes to redraw for each frame.
  await b.size(W, H, 2);
  await mountOn('map', { projection: 'equal-earth', style: 'political', labels: 'countries', view: [10, 30] });
  await sleep(500);
  const pc = await f.rect('#bench canvas');
  await ev(`window.__bm=new Map();(function loop(){const d=__h.debug();window.__bm.set(d.redraws,d.baseMs);if(window.__bm.size<200&&!window.__bmStop)requestAnimationFrame(loop)})()`);
  await f.drag(pc.x + 100, pc.y, -200, 30, { ms: 1200, steps: 40 });
  await sleep(600);
  const costs = await ev(`(()=>{window.__bmStop=true;const s=[...window.__bm.values()].slice(1).sort((a,b)=>a-b);return {median:+s[s.length>>1].toFixed(1),p90:+s[Math.floor(s.length*0.9)].toFixed(1),redraws:s.length}})()`);
  console.log(`  (a flat political map with names, panned at 2x: the map redraws in ${costs.median} ms, 9 in 10 under ${costs.p90} ms, on this PC)`);
  ok(costs.median < 12 && costs.redraws > 10, 'a panned flat map redraws itself well inside a frame on this PC, even with four colours and names', costs);
  await b.size(W, H, 1);
  await ev(`__h.remove();document.getElementById('bench').remove()`);

  if (PILOT && existsSync(join(PILOT, 'topics'))) {
    console.log('The pilot: its path, each lesson and the test played wrong and then right, and its chest');
    await api(`/__reset?data=${encodeURIComponent(PILOT)}`);
    await go();
    await ev(`__primer.store.del('progress')`);
    await ev('__primer.data.loadProgress()');
    await ev('__primer.sync.pull()');
    await reloadLibrary();
    await ev(`__primer.app.setPref('topic','where-hurricanes-form')`);
    await f.tap('.tab[data-tab=practice]');
    await f.tap('.tab[data-tab=learn]');
    await sleep(400);
    const dir = join(PILOT, 'topics', 'where-hurricanes-form');
    const topicFile = JSON.parse(readFileSync(join(dir, 'topic.json'), 'utf8'));
    const shown = await ev(`[...document.querySelectorAll('.node')].map(n=>n.dataset.kind+':'+n.dataset.node)`);
    ok((await text()).includes('Where hurricanes form') && JSON.stringify(shown) === JSON.stringify(topicFile.path.map(n => `${n.kind}:${n.id}`)), 'the pilot shows its path, a node for each whole thing', shown);
    ok(topicFile.level === 'tour' && topicFile.path.filter(n => n.kind === 'lesson').length === 3, 'it is a Tour: three lessons, each after its animation, then a chest and a test');
    await shot('20-pilot-path');
    let asked = 0, played = 0;
    const tapPlace = async (lon, lat) => {
      // turn the globe to face the place first, so the tap lands where it's meant to, not on the rim
      await ev(`__primer.run.play.run(['spinTo', [${lon}, ${lat}], 0])`);
      await sleep(250);
      const p = await ev(`__primer.run.play.where([${lon},${lat}])`);
      await f.tapAt(p.x, p.y);
    };
    for (const node of topicFile.path) {
      if (node.kind === 'chest') {
        await f.tap(`.node[data-node=${node.id}]`);
        await sleep(300);
        await f.tap('.callout [data-go=start]');
        await sleep(900);
        ok((await text()).includes('A chest!'), "the pilot's chest opens");
        await shot('22-pilot-chest');
        await press();
        continue;
      }
      if (node.kind === 'animation') {
        // The pilot's animations, voiced for real and played like a video. The first plays through on its
        // own clips, every action checked against its word; the next is run to its end from the bar.
        const file = JSON.parse(readFileSync(join(dir, `${node.id}.json`), 'utf8'));
        const timing = JSON.parse(readFileSync(join(dir, 'voice', `${node.id}.json`), 'utf8'));
        const narrator = topicFile.narrator || 'heart';
        await ev(`__primer.app.setPref('voice', true); true`);
        await openNode(node.id);
        const first = await scene();
        ok(first.narrators.every(n => n === narrator), `${node.id}: every line has its clip, in the topic's narrator`, first.narrators);
        ok(first.total >= 55 && first.total <= 330, `${node.id}: it runs ${first.total.toFixed(0)} seconds in ${narrator}'s voice`, first.total);
        ok(await waitFor(`__primer.run.scene.state === 'playing'`, 4000), `${node.id}: it starts by itself, full screen`);
        await shot(`21-pilot-${node.id}-playing`);
        if (!played) {
          ok(await sceneState('ended', 360000), `${node.id}: played through on its voice, line by line`);
          const fired = (await scene()).fired;
          const want = file.lines.reduce((n, x) => n + (x.do || []).length, 0);
          const lags = fired.map(x => +(x.at - x.want).toFixed(3));
          ok(fired.length === want && fired.every(x => x.voiced) && lags.every(x => x >= -0.001 && x < 0.05), `${node.id}: all ${want} actions fired on their words, on the voice's clock (late by at most ${Math.max(...lags)} s)`, fired);
          const said = file.lines.filter(x => (x.do || []).length).every(x => (x.do || []).every((a, n) => {
            const f0 = fired.find(y => y.line === x.id && y.n === n);
            const ws = timing.lines[x.id][narrator].words;
            const words = (x.say || x.text).split(/\s+/).map(w => w.replace(/[*’]/g, m => (m === '’' ? "'" : '')).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
            const want = String(a.at || a.from).toLowerCase().split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}'-]/gu, ''));
            const k = words.findIndex((_, i) => want.every((w, j) => words[i + j] === w));
            return f0 && k >= 0 && Math.abs(f0.want - ws[k][1]) < 0.001;
          }));
          ok(said, `${node.id}: each at the time its word is said in the clip, by the timing file`);
        } else {
          await ev(`__primer.run.scene.seekTo(__primer.run.scene.total, false); true`);
          ok(await sceneState('ended', 8000), `${node.id}: dragged to its end`);
        }
        ok(JSON.stringify(await ev(`[...document.querySelectorAll('.send:not([hidden]) [data-sc]')].map(b=>b.textContent.trim())`)) === '["Watch again","Next"]', `${node.id}: it stops on its last picture, with Watch again and Next`);
        await shot(`21-pilot-${node.id}-end`);
        await f.tap('[data-sc=close]');
        await sleep(400);
        ok(await ev(`document.querySelector('.node[data-node=${node.id}]').classList.contains('done')`), `${node.id}: done, and the path goes on`);
        played++;
        continue;
      }
      if (node.kind === 'review') {
        // visited, as any review or animation node is for now
        await f.tap(`.node[data-node=${node.id}]`);
        await sleep(300);
        await f.tap('.callout [data-go=start]');
        await sleep(700);
        ok(await bare(), `the pilot's ${node.kind}, ${node.id}, opens`);
        await press();
        continue;
      }
      const file = JSON.parse(readFileSync(join(dir, `${node.id}.json`), 'utf8'));
      const questions = file.steps.filter(s => s.kind !== 'explain');
      ok(node.kind !== 'lesson' || (file.steps.length >= 8 && file.steps.length <= 10), `${node.id}: ${file.steps.length} steps`);
      for (const pass of ['wrong', 'right']) {
        await f.tap(`.node[data-node=${node.id}]`);
        await sleep(300);
        await f.tap('.callout [data-go=start]');
        await sleep(900);
        const marks = [];
        for (const s of file.steps) {
          await waitFor(`__primer.run && __primer.run.step.id === ${JSON.stringify(s.id)} && (__primer.run.input || __primer.run.play || ${s.kind === 'explain'})`);
          await sleep(150);
          if (s.kind === 'explain') { await press(); continue; }
          const right = pass === 'right';
          if (s.kind === 'play') {
            const t = s.tries.find(x => x.marked === pass);
            await tapPlace(t.state.tapped.lon, t.state.tapped.lat);
          } else {
            const inp = s.input;
            if (inp.form === 'choice') {
              const answer = s.answer ?? inp.options.find(o => o.right).id;
              await f.tap(`.pi-opt[data-id="${right ? answer : inp.options.find(o => o.id !== answer).id}"]`);
            } else if (inp.form === 'slider') {
              const sv = await ev('__primer.run.input.state()');
              ok(sv.answered && sv.value === inp.start, `${s.id}: the slider starts at ${inp.start}, a real value`, sv);
              const log = inp.scale === 'log';
              const pos = right ? (log ? Math.log(s.answer / inp.min) / Math.log(inp.max / inp.min) : (s.answer - inp.min) / (inp.max - inp.min)) : 0.95;
              const pt = await runPoint(pos);
              await f.tapAt(pt.x, pt.y);
            } else if (inp.form === 'order') {
              // wrong: it starts out of order, so check it as it is; right: drag it into order
              for (let k = 0; right && k < 6; k++) {
                const now = (await ev('__primer.run.input.state()')).value;
                if (JSON.stringify(now) === JSON.stringify(s.answer)) break;
                const i = now.findIndex((id, n) => id !== s.answer[n]);
                const from = now.indexOf(s.answer[i]);
                const a = await f.rect(`.pi-item[data-id="${s.answer[i]}"]`);
                const rowH = (await f.rect('.pi-item:nth-child(2)')).y - (await f.rect('.pi-item:nth-child(1)')).y;
                await f.drag(a.x, a.y, 0, (i - from) * rowH, { steps: 14, ms: 360 });
                await sleep(300);
              }
            }
          }
          await sleep(250);
          if (s.input && s.input.form === 'slider') await shot(`21-pilot-${node.id}-${s.id}-${pass}`);
          await press();
          const vd = await verdict();
          marks.push(`${s.id}:${vd.verdict}`);
          if (pass === 'wrong' && s.id === 'where') {
            ok(vd.why.includes('equator') && vd.why.includes('spin'), 'tapping the equator, the tempting answer, is wrong, and says why', vd);
            await shot('21-pilot-equator-wrong');
          }
          if (pass === 'wrong' && s.id === 'heading') ok(vd.why.includes('Canada') && vd.why.includes('west'), 'heading east, the way weather moves across Canada, is wrong, and says why', vd);
          if (s.kind === 'play' && pass === 'right') await shot(`21-pilot-${node.id}-${s.id}-right`);
          await press();
        }
        ok(marks.every(m => m.endsWith(pass === 'right' ? 'Right' : 'Not quite')), `${node.id}, played ${pass}: every question is marked ${pass}`, marks);
        await waitFor(`!!document.querySelector('.lend')`);
        await press();
        asked += questions.length;
        played++;
      }
    }
    ok(await ev(`[...document.querySelectorAll('.node')].every(n=>n.classList.contains('done'))`), 'the whole path is gold');
    await shot('23-pilot-done');
    const pilotEvents = (await everyEvent()).filter(e => e.topic === 'where-hurricanes-form');
    ok(pilotEvents.filter(e => e.type === 'attempt').length === asked && pilotEvents.filter(e => e.type === 'finish').length === played && pilotEvents.some(e => e.type === 'open' && e.kind === 'chest'), `every run went into the queue to go up (${asked} answers, ${played} finishes, the chest)`, pilotEvents.map(e => e.type));
    // The pilot's facts: every one met by the end of its lessons, the steps naming them their first answers.
    const pilotFacts = await ev(`[...__primer.app.topics.find(t=>t.id==='where-hurricanes-form').facts.facts.keys()]`);
    const pilotCards = await ev('__primer.data.memoryNow().toJSON().cards');
    ok(pilotFacts.length >= 12 && pilotFacts.every(id => pilotCards[`where-hurricanes-form/${id}`]) && pilotCards['where-hurricanes-form/warm-enough'].n >= 2,
      `the pilot declares ${pilotFacts.length} facts, all met by the end of its lessons, its steps' answers counted`, pilotFacts);
    // and a review of them a few days on, its questions with the pictures they were taught with
    await ev(`__primer.clock.shift(${4 * 86400000}); __primer.app.go('practice'); true`);
    await sleep(300);
    await f.tap('.review [data-go=review]');
    let pictured = null;
    const reviewAsked = [];
    for (let k = 0; k < 20 && !pictured; k++) {
      await waitFor(`__primer.run && __primer.run.step && (!!__primer.run.input || !!__primer.run.play)`);
      const s = await ev('__primer.run.step');
      reviewAsked.push(`${s.fact}.${s.askId}.ask`);
      await waitFor(`__primer.run.reader.heard.some(h => h.id === ${JSON.stringify(reviewAsked.at(-1))})`, 3000);
      await sleep(400);
      if (s.figure && s.figure.part && s.input && s.input.form === 'choice') { pictured = s; break; }
      await answerStep(true);
      await press();
      await press();
    }
    ok(!!pictured, 'a pilot review question brings its picture: the globe turned to its ocean', pictured && pictured.id);
    const reviewHeard = await ev('__primer.run.reader.heard');
    const pilotNarrator = topicFile.narrator || 'heart';
    ok(reviewAsked.length > 0 && reviewAsked.every(id => reviewHeard.some(h => h.id === id && h.narrator === pilotNarrator)),
      `each pilot review question is read aloud from its own clip, in ${pilotNarrator}'s voice (${reviewAsked.length} of them)`, { reviewAsked, reviewHeard });
    if (pictured) {
      await sleep(900);
      await b.size(W, H, 2); await sleep(600); await b.shot(join(SHOTS, '24-pilot-review-question.png')); await b.size(W, H, 1); await sleep(300);
      await answerStep(false);
      await press();
      await sleep(400);
      await b.size(W, H, 2); await sleep(600); await b.shot(join(SHOTS, '24b-pilot-review-wrong.png')); await b.size(W, H, 1); await sleep(300);
      ok((await verdict()).verdict === 'Not quite' && await ev(`!!document.querySelector('.lfoot .taught')`), 'missed, it says why and links back to its lesson step');
      await f.tap('[data-go=leave]');
      await waitFor(`!!document.querySelector('.rend')`);
      await press();
    }
    await ev(`__primer.clock.shift(0); true`);
    await api('/__reset?data=fixtures');
  } else {
    console.log('(no --pilot given: the pilot was not played)');
  }

  {
    console.log('Facts: the steps that teach them are their first reviews');
    const FACTS = join(ROOT, 'tests', 'fixtures', 'facts'), DAY = 86400000;
    // a picture at the phone's own pixel ratio, for comparing with the sketches
    const shot2 = async name => { await b.size(W, H, 2); await sleep(350); await b.shot(join(SHOTS, `${name}.png`)); await b.size(W, H, 1); await sleep(150); };
    const cards = () => ev('__primer.data.memoryNow().toJSON().cards');
    const dbg = () => ev('__primer.run && __primer.run.debug ? __primer.run.debug() : null');
    const live = () => waitFor(`__primer.run && __primer.run.step && (!!__primer.run.input || !!__primer.run.play)`);
    const playLesson = async (node, marks) => {
      await f.tap('.tab[data-tab=learn]');
      await sleep(300);
      await f.tap(`.node[data-node=${node}]`);
      await sleep(300);
      await f.tap('.callout [data-go=start]');
      for (let k = 0; k < 20; k++) {
        await waitFor(`!!document.querySelector('.lend') || (__primer.run && __primer.run.step && (__primer.run.step.kind === 'explain' || !!__primer.run.input || !!__primer.run.play))`);
        await sleep(200);
        if (await ev(`!!document.querySelector('.lend')`)) break;
        const s = await ev('__primer.run.step');
        if (s.kind === 'explain') { await press(); continue; }
        await answerStep(marks[s.id] !== 'wrong');
        await press();
        await press();
      }
      await press();
    };
    // a phone with nothing on it yet but its key: what earlier sections left to send goes, and the made-up facts' repo comes
    await ev('__primer.sync.flush()');
    await ev(`__primer.store.queueAll().then(rows => __primer.store.queueRemove(rows.map(r => r.key))).then(() => true)`);
    await api(`/__reset?data=${encodeURIComponent(FACTS)}`);
    await go();
    await ev(`Promise.all([__primer.store.del('progress'), __primer.store.del('memory')]).then(() => __primer.data.loadProgress()).then(() => __primer.data.loadMemory()).then(() => true)`);
    await ev('__primer.sync.pull()');
    await reloadLibrary();
    await ev(`__primer.app.setPref('topic','storms'); __primer.clock.shift(0); true`);
    await f.tap('.tab[data-tab=practice]');
    await sleep(400);
    ok(await ev(`document.querySelector('.review .btn').disabled && document.querySelector('.review .side').innerText.includes('After a lesson')`), "before any lesson, Review has nothing to start");
    await playLesson('fuel', { 'over-land': 'wrong' });
    let c = await cards();
    ok(c['storms/warm'] && c['storms/warm'].m === 'right' && c['storms/warm'].n === 1 && c['storms/land'].m === 'wrong', "a lesson's steps that name a fact count as answers to it: one right, one wrong", c);
    ok(c['storms/count'] && c['storms/count'].n === 0, "a fact the lesson declares but doesn't ask is met at its end, not yet asked", c['storms/count']);
    ok(c['storms/land'].due < c['storms/warm'].due && Math.round((c['storms/warm'].due - c['storms/warm'].lr) / DAY) === 3 && Math.round((c['storms/land'].due - c['storms/land'].lr) / DAY) === 1,
      'the memory model has the one missed back in a day, the one got right in three', { warm: c['storms/warm'], land: c['storms/land'] });
    const lessonTries = (await everyEvent()).filter(e => e.topic === 'storms' && e.type === 'attempt');
    ok(lessonTries.find(e => e.step === 'how-warm').fact === 'warm' && lessonTries.find(e => e.step === 'over-land').fact === 'land', 'each attempt says which fact it was about, and goes up with it', lessonTries.map(e => `${e.step}:${e.fact}`));
    await playLesson('spin', {});
    await ev(`__primer.app.setPref('topic','capitals'); true`);
    await playLesson('capitals', {});
    c = await cards();
    ok(Object.keys(c).length === 12 && c['capitals/capital-peru'].m === 'right' && c['storms/seas-north'].n === 0, 'three lessons met twelve facts, families\' among them, a family fact answered by the step that names it', Object.keys(c));

    console.log('Review: the card, a run of mixed topics, the combo, a miss');
    await f.tap('.tab[data-tab=practice]');
    await sleep(400);
    ok(await ev(`!document.querySelector('.review [data-go=review]').disabled && !document.querySelector('.review .crownchip') && document.querySelector('.review [data-go=review]').textContent === 'Start'`), "with facts due, Review's Start is on (no best combo yet, so no crown)");
    await shot2('40-review-card-first');
    // two days on: the fact missed in the lesson is due, the ones got right aren't yet
    await ev(`__primer.clock.shift(${2 * DAY}); true`);
    const dueNow = await ev(`__primer.data.metFacts().filter(x => x.due).map(x => x.key)`);
    ok(dueNow.includes('storms/land') && !dueNow.includes('storms/warm') && !dueNow.includes('capitals/capital-peru'), 'two days on, the fact missed is due and the ones got right are not', dueNow);
    await f.tap('.review [data-go=review]');
    await live();
    ok(await bare() && (await ev(`document.querySelector('.combo').innerText.trim()`)) === '×0' && (await ev(`document.querySelectorAll('.cpips i').length`)) === 5, 'a run hides the tab bar: a cross, the combo at ×0 and its five pips');
    const asked = [];
    // Each ask is read aloud, in its topic's narrator, by the fact and the ask whatever the run calls the step
    await live();
    const first = (await dbg()).step;
    ok(first.id !== `${first.fact}.${first.ask}` && await waitFor(`__primer.run.reader.heard.some(h => h.id === ${JSON.stringify(`${first.fact}.${first.ask}.ask`)} && h.narrator === 'heart')`, 5000)
      && await waitFor(`__primer.run.textRa.state().lit > 0`, 3000), `a review's question is read aloud as it opens, its words lit: ${first.fact}.${first.ask}.ask (the step is ${first.id})`, await ev('__primer.run.reader.heard'));
    for (let k = 0; k < 3; k++) {
      await live();
      asked.push((await dbg()).step);
      await answerStep(true);
      await press();
      const vd = await verdict();
      ok(vd.verdict === 'Right', `review question ${k + 1} (${asked.at(-1).fact}, asked by ${asked.at(-1).ask}), answered right`, vd);
      await press();
    }
    await live();
    let d = await dbg();
    ok(d.combo === 3 && d.chip.tier === 'wood' && (await ev(`document.querySelector('.combo').classList.contains('on') && document.querySelector('.combo').innerText.trim() === '×3' && document.querySelectorAll('.cpips i.on').length === 3`)),
      'three right in a row: the chip counts ×3 and has reached wood, the first tier, with three pips', d);
    await shot2('41-review-question-combo');
    const missed = d.step;
    asked.push(missed);
    await answerStep(false);
    await press();
    let vd = await verdict();
    d = await dbg();
    ok(vd.verdict === 'Not quite' && vd.why.length > 0 && d.combo === 0 && d.best === 3 && (await ev(`document.querySelector('.combo').innerText.trim()`)) === '×0', 'a miss: Not quite, its line of why, and the combo back to ×0 (the best stays 3)', { vd, d });
    const link = await ev(`(()=>{const l=document.querySelector('.lfoot .taught');return l?l.innerText.trim():null})()`);
    ok(!!link, 'with a link back to the lesson step that taught it', link);
    const missLine = `${missed.fact}.${missed.ask}.${await ev('__primer.run.whyLine')}`;
    ok(await waitFor(`__primer.run.reader.heard.at(-1).id === ${JSON.stringify(missLine)} && !!document.querySelector('.lwhy.ra')`, 3000), `and its line of why is read aloud: ${missLine}`, await ev('__primer.run.reader.heard.slice(-2)'));
    // the next ask is chosen as soon as this one is marked, so the tap on Continue can start its voice at once
    ok(await ev(`!!__primer.run.ahead && !!__primer.run.ahead.step`), 'the next question is ready before Continue is pressed');
    c = await cards();
    const now0 = await ev('__primer.clock.now()');
    const rightKey = asked.find(x => x.key !== missed.key).key;
    ok(Math.round((c[missed.key].due - now0) / DAY) === 1 && c[rightKey].due - now0 > 2 * DAY, 'in the memory the miss is due again in a day, sooner than one just got right', { missed: (c[missed.key].due - now0) / DAY, right: (c[rightKey].due - now0) / DAY });
    await shot2('42-review-wrong');
    await f.tap('.lfoot .taught');
    await waitFor(`!!document.querySelector('.peekhost .lesson')`);
    await sleep(500);
    const peek = await ev(`(()=>{const r=__primer.run.peeking;return r?{id:r.step.id,lesson:r.lesson.id,text:document.querySelector('.peekhost').innerText}:null})()`);
    const taught = await ev(`__primer.facts.taughtAt(__primer.app.topics.find(t=>t.id===${JSON.stringify(missed.topic)}).facts.facts.get(${JSON.stringify(missed.fact)}))`);
    ok(peek && peek.id === taught.step && peek.lesson === taught.lesson, 'the link opens that lesson step over the run', { peek, taught });
    ok(await waitFor(`__primer.run.peeking.reader.heard.some(h => h.id.startsWith(${JSON.stringify(`${taught.step}.`)}))`, 4000), 'and the step looked back at is read aloud too', await ev('__primer.run.peeking.reader.heard'));
    await shot('43-review-peek');
    await f.tap('.peekhost [data-go=leave]');
    await sleep(400);
    ok(!(await ev(`!!document.querySelector('.peekhost')`)) && await bare() && (await verdict()).verdict === 'Not quite', 'its cross comes back to the run, just as it was');
    await press();
    let back = null;
    for (let k = 0; k < 5 && !back; k++) {
      await live();
      d = await dbg();
      if (d.step.key === missed.key) { back = d.step; break; }
      asked.push(d.step);
      await answerStep(true);
      await press();
      await press();
    }
    ok(back && back.ask !== missed.ask, `the fact missed comes back a few questions later, asked another way (${missed.ask}, then ${back && back.ask})`, back);
    asked.push(back);
    await answerStep(true);
    await press();
    await press();
    const topicsAsked = [...new Set(asked.map(x => x.topic))];
    ok(topicsAsked.includes('storms') && topicsAsked.includes('capitals'), 'the run mixes topics', asked.map(x => `${x.topic}/${x.fact}`));
    const twice = asked.filter((x, i) => asked.findIndex(y => y.key === x.key) !== i);
    ok(twice.every(x => asked.filter(y => y.key === x.key).every((y, i, all) => i === 0 || y.ask !== all[i - 1].ask)), 'a fact asked again is asked a way it wasn\'t asked last time', asked.map(x => `${x.fact}.${x.ask}`));
    await f.tap('[data-go=leave]');
    await waitFor(`!!document.querySelector('.rend')`);
    await sleep(400);
    const sum = await ev(`document.querySelector('.rend').innerText`);
    d = await dbg();
    const runBest = d.best;
    ok(runBest >= 4 && sum.includes(`${d.right} of ${d.answered} right`) && sum.includes(`×${runBest}`) && (await ev(`document.querySelectorAll('.rend .missed li').length`)) === 1,
      'the cross ends it with a short summary: how many right, the best combo (the run after the miss went longer), what was missed', sum);
    await shot2('44-review-summary');
    await press();
    const comboTier = n => ev(`import('/primer/js/combo.js').then(m => m.tierOf(${n}).id)`);
    const firstTier = await comboTier(runBest);
    ok(!(await bare()) && (await ev(`document.querySelector('.review .crownchip') ? document.querySelector('.review .crownchip').innerText.trim() : ''`)) === `×${runBest}`
      && await ev(`document.querySelector('.review .crownchip').classList.contains('tier-${firstTier}')`), `back on Practice, the crown shows the best combo, ×${runBest}, in its tier's colour (${firstTier})`);
    await shot2('40b-review-card-crown');
    const reviewEvents = (await everyEvent()).filter(e => e.review || e.type === 'review');
    const runIds = new Set(reviewEvents.filter(e => e.type === 'attempt').map(e => e.review));
    ok(runIds.size === 1 && reviewEvents.filter(e => e.type === 'attempt').every(e => e.fact && e.ask && e.lesson && !e.step) && reviewEvents.some(e => e.type === 'review' && e.combo === runBest && e.of === d.answered),
      'every answer went into the queue with its run, fact and ask, and the run\'s end with its best combo', reviewEvents.map(e => `${e.type}:${e.fact || ''}`));

    console.log('Nothing due');
    await f.tap('.review [data-go=review]');
    for (let k = 0; k < 40 && (await ev(`__primer.data.metFacts().filter(x => x.due).length`)) > 0; k++) {
      await live();
      await answerStep(true);
      await press();
      await press();
    }
    ok((await ev(`__primer.data.metFacts().filter(x => x.due).length`)) === 0, 'answered right, everything due is done');
    await f.tap('[data-go=leave]');
    await waitFor(`!!document.querySelector('.rend')`);
    await press();
    await sleep(300);
    ok(await ev(`document.querySelector('.review .side').innerText.includes('Nothing due') && document.querySelector('.review [data-go=review]').textContent === 'Review anyway'`), 'with nothing due, the card says so plainly and offers to review anyway', await ev(`document.querySelector('.review .side').innerText`));
    await shot2('45-review-nothing-due');
    await f.tap('.review [data-go=review]');
    await live();
    d = await dbg();
    const closest = await ev(`__primer.data.metFacts().sort((a,b)=>a.recall-b.recall)[0].key`);
    ok(d.step && d.step.key === closest, 'reviewing anyway starts with the fact closest to slipping', { d: d.step, closest });
    await f.tap('[data-go=leave]');
    await sleep(400);
    ok(!(await bare()) && (await ev(`!!document.querySelector('.practice')`)), 'and the cross with nothing answered goes straight back');

    console.log('The combo comes alive: a tier at each threshold, a miss drops it, reduced motion stills it');
    {
      const TIERS = await ev(`import('/primer/js/combo.js').then(m => m.LADDER.map(t => ({ id: t.id, at: t.at, shields: t.shields })))`);
      // the 23 kept (2026-11-19), less eclipse (gone 2026-11-20), low to high above plain, their gaps growing
      // three tiers at a time; the others kept their starts, so supernova's run is the one gap longer than the next
      const KEPT = ['wood', 'tin', 'copper', 'silver', 'gold', 'platinum', 'emerald', 'sapphire', 'crystal', 'ruby', 'diamond', 'obsidian', 'opal', 'titanium',
        'aurora', 'nebula', 'celestial', 'eternal', 'supernova', 'singularity', 'multiverse', 'void'];
      const AT = [3, 6, 9, 13, 17, 21, 26, 31, 36, 42, 48, 54, 62, 70, 78, 88, 98, 108, 121, 147, 163, 179];
      const want = { 0: 'plain', 2: 'plain', 3: 'wood', 5: 'wood', 6: 'tin', 9: 'copper', 12: 'copper', 13: 'silver', 17: 'gold', 20: 'gold', 21: 'platinum', 35: 'sapphire', 36: 'crystal',
        48: 'diamond', 77: 'titanium', 78: 'aurora', 121: 'supernova', 134: 'supernova', 146: 'supernova', 147: 'singularity', 178: 'multiverse', 179: 'void', 999: 'void' };
      const got = {};
      for (const n of Object.keys(want)) got[n] = await comboTier(n);
      const gaps = AT.map((a, i) => a - (i ? AT[i - 1] : 0));
      ok(JSON.stringify(TIERS.map(t => t.id)) === JSON.stringify(['plain', ...KEPT]) && JSON.stringify(TIERS.map(t => t.at)) === JSON.stringify([0, ...AT])
        && gaps.every((g, i) => !i || g >= gaps[i - 1] || KEPT[i - 1] === 'singularity') && Object.entries(want).every(([n, id]) => got[n] === id),
        `the 22 tiers, in one table, in their order: plain, then wood at 3 up to void at 179, eclipse gone and supernova running on to 147, every other gap at least the one before (${gaps.join(', ')})`, { TIERS, got });
      ok(JSON.stringify(TIERS.map(t => t.shields)) === JSON.stringify([0, 0, 0, 1, 1, 1, ...Array(17).fill(2)]),
        'their shields, in the same table: none on plain, wood and tin, one from copper to gold, two from platinum up', TIERS.map(t => `${t.id}:${t.shields}`));
      // the ones not kept: drawn the same way, never reached by a count
      const spare = await ev(`import('/primer/js/combo.js').then(m => {
        const h = document.createElement('div'); h.className = 'rtop'; document.body.append(h);
        const out = m.SPARE.map(t => { const c = new m.Combo(h, { count: 20, look: t.id }); const d = c.debug();
          const pip = getComputedStyle(c.el).getPropertyValue('--c-pip').trim(), face = !!c.el.querySelector('.cbody > .cface, .cbody > .cflow');
          c.remove(); return { id: t.id, at: t.at, tier: d.tier, pip, face }; });
        const never = [0, 3, 5, 10, 15, 25, 40, 60, 90, 150, 300, 999].every(n => !m.SPARE.some(t => t.id === m.tierOf(n).id));
        h.remove(); return { out, never } })`);
      ok(spare.out.length === 8 && spare.out.every(t => t.at === null && t.tier === t.id && t.pip && t.face) && spare.never && spare.out.some(t => t.id === 'bronze') && spare.out.some(t => t.id === 'omnipotent'),
        `the ${spare.out.length} not kept (bronze, omnipotent and the rest) are set aside, still drawn with their own looks, and never reached by a count`, spare);
      // alike tiers differ by more than colour: with every colour taken out, no two in a group draw the same
      const shapes = await ev(`import('/primer/js/combo.js').then(m => {
        const h = document.createElement('div'); h.className = 'rtop'; document.body.append(h);
        const sig = id => { const c = new m.Combo(h, { count: 20, look: id, pips: false, still: false });
          const s = [...c.el.querySelectorAll('*')].filter(e => !e.closest('.cnum')).map(e => e.tagName + '.' + (e.getAttribute('class') || '') + (e.getAttribute('d') ? ':' + e.getAttribute('d').replace(/[^MLCQAZHV]/g, '').length : '')).join('|');
          c.remove(); return s; };
        const groups = { metals: ['tin', 'copper', 'silver', 'gold', 'platinum', 'titanium'], gems: ['emerald', 'sapphire', 'crystal', 'ruby', 'diamond'], stones: ['obsidian', 'opal'],
          sky: ['aurora', 'nebula', 'celestial', 'eternal'], far: ['supernova', 'singularity', 'multiverse', 'void'] };
        const out = {}; for (const [g, ids] of Object.entries(groups)) { const sigs = ids.map(sig); out[g] = new Set(sigs).size === ids.length; }
        h.remove(); return out })`);
      ok(Object.values(shapes).every(Boolean), 'alike tiers are drawn differently, not just coloured differently: metals, gems, dark stones, sky and the far end each have no two the same once colour is taken out', shapes);
      // the ideas drawn for the tiers redone (opal five, supernova five, eclipse and multiverse two each): each
      // draws, is never reached by a count, and the table uses the picked one; eclipse, gone from the ladder,
      // has no pick
      const trials = await ev(`import('/primer/js/combo.js').then(m => {
        const h = document.createElement('div'); h.className = 'rtop'; document.body.append(h);
        const drawn = m.TRIALS.map(t => { const c = new m.Combo(h, { count: 130, look: t.id, pips: false }); const d = c.debug(); const kids = c.el.querySelectorAll('.cbody > *').length; c.remove(); return { id: t.id, tier: d.tier, at: t.at, kids }; });
        const picked = Object.entries(m.PICK).every(([id, idea]) => m.lookOf(id) && m.lookOf(id).at !== null && m.lookOf(id).face === m.lookOf(id + '-' + idea).face && m.lookOf(id).cell === m.lookOf(id + '-' + idea).cell);
        const noEclipse = !m.LADDER.some(t => t.id === 'eclipse') && !('eclipse' in m.PICK) && !!m.lookOf('eclipse-annular');
        h.remove(); return { drawn, picked, noEclipse, pick: m.PICK } })`);
      ok(trials.drawn.length === 14 && trials.drawn.every(t => t.tier === t.id && t.at === null && t.kids >= 3) && trials.picked && trials.noEclipse,
        `the ${trials.drawn.length} ideas for opal, supernova, eclipse and multiverse each draw by name, none reached by a count, and the table uses the picks (eclipse has none: it's off the ladder)`, trials);
      // the rule on its own: data plus one mechanism
      const rule = await ev(`import('/primer/js/combo.js').then(m => { const a = m.afterAnswer; return [
        a({ n: 17, cracks: 0 }, 'wrong'), a({ n: 17, cracks: 1 }, 'wrong'), a({ n: 30, cracks: 1 }, 'wrong'), a({ n: 30, cracks: 2 }, 'wrong'),
        a({ n: 23, cracks: 1 }, 'right'), a({ n: 25, cracks: 1 }, 'right'), a({ n: 7, cracks: 0 }, 'wrong'), a({ n: 12, cracks: 1 }, 'close'), a({ n: 0, cracks: 0 }, 'wrong')] })`);
      ok(JSON.stringify(rule) === JSON.stringify([{ n: 17, cracks: 1, event: 'crack' }, { n: 0, cracks: 0, event: 'shatter' }, { n: 30, cracks: 2, event: 'crack' }, { n: 0, cracks: 0, event: 'shatter' },
        { n: 24, cracks: 1, event: null }, { n: 26, cracks: 0, event: 'rise' }, { n: 0, cracks: 0, event: 'shatter' }, { n: 12, cracks: 1, event: null }, { n: 0, cracks: 0, event: null }]),
        'the rule: a miss with a shield left cracks and holds the count, with none it shatters to 0; right answers keep the cracks, a new tier mends them; close holds', rule);
      // the chip is one part of its own: anything can show one
      const alone = await ev(`import('/primer/js/combo.js').then(m => { const h = document.createElement('div'); document.body.append(h); const c = new m.Combo(h, { count: 48, pips: false }); const d = c.debug(); c.remove(); h.remove(); return d })`);
      ok(alone.tier === 'diamond' && alone.text === '×48' && alone.idle && alone.pips === null, 'the chip stands alone: drawn at 48 on a bare element, it is diamond, ×48, already idling', alone);
      // the crack, the shatter and the press are recordings picked from the sound library (one table, kind ->
      // files), each file decoding and sounding at the level the deck had it, unclipped
      const samples = await ev(`Promise.all(Object.entries(__primer.feel.RECORDED).flatMap(([n, files]) => files.map(f => __primer.feel.renderSound(n, 1.5, f).then(s => s ? { n, f, peak: s.reduce((a, v) => Math.max(a, Math.abs(v)), 0), heard: s.filter(v => Math.abs(v) > 0.01).length / 48000 } : { n, f }))))`);
      ok(samples.length === 7 && samples.every(x => x.peak > 0.05 && x.peak < 0.98 && x.heard > 0.015 && x.heard < 1.4),
        'the crack (3 ice cracks), the shatter (a tile) and the press (3 clicks) decode from their files and sound, unclipped', samples);
      // a kind's file is picked at random, never the same one twice running
      const picks = await ev(`Array.from({ length: 40 }, () => __primer.feel.pickFile('crack'))`);
      ok(picks.every((f, i) => !i || f !== picks[i - 1]) && new Set(picks).size === 3,
        'a crack plays one of its three files at random, never the one it played last', picks.join(' '));
      await f.tap('.review [data-go=review]');
      await live();
      let c0 = (await dbg()).chip;
      ok(c0.tier === 'plain' && c0.text === '×0' && !c0.idle && c0.moving === 0, 'a run starts plain, at ×0, with nothing moving', c0);
      const chipNow = async () => (await dbg()).chip;
      const STILL = ['wood', 'tin'];   // matte on purpose: nothing idles on them
      for (const t of TIERS.slice(1)) {
        await live();
        await ev(`__primer.run.setCombo(${t.at - 1}); true`);
        const before = await chipNow();
        await answerStep(true);
        const ticks = await ev('__primer.feel.tickCount()');
        await press();
        const vd2 = await verdict();
        const mid = await chipNow();
        await sleep(700);
        const after = await chipNow();
        const ticked = (await ev('__primer.feel.tickCount()')) - ticks;
        ok(before.tier !== t.id && vd2.verdict === 'Right' && after.tier === t.id && after.text === `×${t.at}` && after.last && after.last.kind === 'rise' && after.last.tier === t.id && !after.last.still && ticked >= 2
          && after.pips === (t.at % 5 || 5) && after.pipTier.includes(`tier-${t.id}`) && after.idle && (STILL.includes(t.id) ? after.moving === 0 : after.moving > 0) && !after.ghost && after.bits === 0,
          `${t.at} in a row reaches ${t.id}: the chip swells into it with a burst and a tick (the Check press's and its own), its pips fill in its colour, and ${STILL.includes(t.id) ? 'it settles still (wood and tin have no idle motion)' : 'its idle motion starts'}`, { before: before.tier, mid, after, ticked });
        if (t.id === 'gold' || t.id === 'aurora') await shot2(`49-combo-${t.id}`);
        await press();
      }
      // shields: gold has one. A miss cracks the chip and the count holds; the fact still comes back
      await live();
      await ev(`__primer.run.setCombo(17); true`);
      const missedKey = (await dbg()).step.key;
      await answerStep(false);
      await press();
      const cracked = await chipNow();
      let rd = await dbg();
      ok((await verdict()).verdict === 'Not quite' && rd.combo === 17 && cracked.count === 17 && cracked.text === '×17' && cracked.tier === 'gold' && cracked.cracks === 1 && cracked.crackLines === 1
        && cracked.shields === 0 && cracked.pips === 2 && cracked.last.kind === 'crack' && !cracked.ghost && cracked.shards === 0 && rd.again.some(a => a.key === missedKey) && (await ev('__primer.feel.soundLog()')).includes('crack'),
        'a miss at gold ×17 uses its shield: Not quite, the chip cracks (one crack), the count holds at ×17 and its pips stay, and the missed fact still comes back', { cracked, again: rd.again });
      await press();
      // with no shield left, the next miss shatters it: the pieces fly and fade, plain ×0 comes up, and the width stays
      await live();
      await answerStep(false);
      const w0 = cracked.width;
      await f.tap('.lfoot .btn');
      await sleep(200);
      const breaking = await chipNow();
      const widths = [breaking.width];
      for (let k = 0; k < 6; k++) { await sleep(120); widths.push((await chipNow()).width); }
      await sleep(500);
      const broken = await chipNow();
      rd = await dbg();
      ok(breaking.shards >= 12 && breaking.tier === 'plain' && broken.tier === 'plain' && broken.text === '×0' && rd.combo === 0 && broken.shards === 0 && !broken.ghost && broken.moving === 0
        && broken.cracks === 0 && broken.crackLines === 0 && broken.last.kind === 'shatter' && broken.pips === 0 && widths.every(w => w === w0) && broken.width === w0 && (await ev('__primer.feel.soundLog()')).includes('shatter'),
        `the next miss, with no shield left, shatters it: ${breaking.shards} pieces fly and fade, plain ×0 comes up under them, and the chip stays ${w0}px wide throughout`, { breaking, widths, broken });
      await press();
      // right answers don't mend a crack; reaching a new tier does, and platinum has two shields
      await live();
      await ev(`__primer.run.setCombo(19); true`);
      await answerStep(false); await press();
      const at23 = await chipNow();
      await press(); await live();
      await answerStep(true); await press();
      const at24 = await chipNow();
      await press(); await live();
      await answerStep(true); await press();
      await sleep(400);
      const at25 = await chipNow();
      ok(at23.count === 19 && at23.cracks === 1 && at24.count === 20 && at24.cracks === 1 && at24.crackLines === 1 && at25.tier === 'platinum' && at25.count === 21 && at25.cracks === 0 && at25.crackLines === 0 && at25.shields === 2,
        'a right answer leaves the crack (gold ×20 still cracked); reaching platinum at 21 mends it, with two shields', { at23, at24, at25 });
      await press(); await live();
      await answerStep(false); await press();
      const c1 = await chipNow();
      await press(); await live();
      await answerStep(false); await press();
      const c2 = await chipNow();
      await press(); await live();
      await answerStep(false); await press();
      await sleep(900);
      const c3 = await chipNow();
      ok(c1.count === 21 && c1.cracks === 1 && c1.crackLines === 1 && c2.count === 21 && c2.cracks === 2 && c2.crackLines === 2 && c2.shields === 0 && c3.count === 0 && c3.tier === 'plain' && c3.last.kind === 'shatter',
        'platinum takes two misses, one crack each (×21 holds), and the third shatters it', { c1, c2, c3 });
      await press();
      // the width only ever grows, and smoothly: a chip on its own going from 9 to 10, then losing it
      const grow = await ev(`import('/primer/js/combo.js').then(async m => {
        const h = document.createElement('div'); h.style.cssText = 'position:fixed;left:20px;top:200px;display:flex;gap:8px'; document.body.append(h);
        const c = new m.Combo(h, { count: 9, still: false });
        const w = () => +parseFloat(getComputedStyle(c.el).width).toFixed(1), frame = () => new Promise(r => requestAnimationFrame(r));
        const before = w(); c.answer('right'); const up = [];
        for (let i = 0; i < 30; i++) { await frame(); up.push(w()); }
        await new Promise(r => setTimeout(r, 400));
        const crack = c.answer('wrong'); const mid = w();
        await new Promise(r => setTimeout(r, 500));
        const shatter = c.answer('wrong'); const down = [];
        for (let i = 0; i < 40; i++) { await frame(); down.push(w()); }
        const d = c.debug(); c.remove(); h.remove();
        return { before, up, crack: crack.event, mid, shatter: shatter.event, down, after: d.width, text: d.text } })`);
      const between = grow.up.filter(x => x > grow.before + 0.5 && x < 59.5);
      ok(grow.before === 52 && grow.up.at(-1) === 60 && grow.up.every((x, i) => !i || x >= grow.up[i - 1]) && between.length >= 4,
        `reaching 10 widens the chip smoothly, 52 to 60px over ${between.length} frames in between, never a jump`, grow.up);
      ok(grow.crack === 'crack' && grow.mid === 60 && grow.shatter === 'shatter' && grow.down.every(x => x === 60) && grow.after === 60 && grow.text === '×0',
        'and losing it never changes the width: cracked, then shattered to ×0, it stays 60px', { mid: grow.mid, down: [...new Set(grow.down)], after: grow.after });
      // reduced motion: the tiers change colour, cracks still show, and nothing idles, swells, knocks or flies
      await live();
      await ev(`__primer.run.setCombo(48); true`);
      await sleep(200);
      const moving = (await chipNow()).moving;
      await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await sleep(300);
      const stilled = await chipNow();
      ok(moving > 0 && stilled.tier === 'diamond' && stilled.moving === 0, `with the system's reduce motion on, the diamond chip keeps its look and its idle motion stops (${moving} moving before, ${stilled.moving} after)`, { moving, stilled });
      await ev(`__primer.run.setCombo(77); true`);
      await answerStep(true);
      await f.tap('.lfoot .btn');
      await sleep(80);
      const stillUp = await chipNow();
      ok(stillUp.tier === 'aurora' && stillUp.still && stillUp.moving === 0 && stillUp.bits === 0 && stillUp.last.kind === 'rise' && stillUp.last.still,
        'and reaching aurora just changes its colour: no swell, no burst, nothing idling', stillUp);
      await shot2('49-combo-aurora-still');
      await press();
      await live();
      await answerStep(false);
      await f.tap('.lfoot .btn');
      await sleep(80);
      const stillCrack = await chipNow();
      ok(stillCrack.count === 78 && stillCrack.cracks === 1 && stillCrack.crackLines === 1 && stillCrack.moving === 0, 'a miss still cracks it, drawn at once, with no knock', stillCrack);
      await press();
      await live(); await answerStep(false); await f.tap('.lfoot .btn'); await sleep(80); await press();
      await live(); await answerStep(false); await f.tap('.lfoot .btn'); await sleep(80);
      const stillDown = await chipNow();
      ok(stillDown.tier === 'plain' && stillDown.text === '×0' && !stillDown.ghost && stillDown.shards === 0 && stillDown.moving === 0, 'and with its shields gone, a miss drops it to plain at once, with no shatter', stillDown);
      await b.send('Emulation.setEmulatedMedia', { features: [] });
      await press();
      // the run's best (179, void: the loop above reached every tier) shows its tier in the summary, on Practice and in Profile
      await f.tap('[data-go=leave]');
      await waitFor(`!!document.querySelector('.rend')`);
      await sleep(400);
      const best = (await dbg()).best;
      ok(best === 179 && await ev(`document.querySelector('.rend .crownbig').classList.contains('tier-void') && document.querySelector('.rend .rays').classList.contains('tier-void') && document.querySelector('.rend .crownbig').innerText.includes('×179')`),
        "the summary's crown, its number and the light behind it are in the best run's tier: void, ×179", best);
      await shot2('49-combo-summary');
      await press();
      ok(await ev(`document.querySelector('.review .crownchip').classList.contains('tier-void') && document.querySelector('.review .crownchip').innerText.trim() === '×179'`), "Practice's crown chip is void, ×179");
      await f.tap('.tab[data-tab=profile]');
      await sleep(400);
      ok(await ev(`document.querySelector('#bestcombo').classList.contains('tier-void') && document.querySelector('#bestcombo').innerText.trim() === '×179'`), "and so is Profile's best-combo tile");
      await f.tap('.tab[data-tab=practice]');
      await sleep(400);
    }

    console.log('A review on the path');
    await ev(`__primer.app.setPref('topic','storms'); true`);
    await f.tap('.tab[data-tab=learn]');
    await sleep(400);
    ok(await ev(`document.querySelector('.node[data-node=look-back]').classList.contains('now')`), 'with both lessons done, the review is next');
    await f.tap('.node[data-node=look-back]');
    await sleep(300);
    await f.tap('.callout [data-go=start]');
    await live();
    d = await dbg();
    ok(d.planned === 8, 'it goes over the eight facts of the lessons before it', d);
    const nodeAsked = [];
    for (let k = 0; k < 12 && !(await ev(`!!document.querySelector('.rend')`)); k++) {
      await live();
      nodeAsked.push((await dbg()).step);
      await answerStep(true);
      await press();
      await press();
      await sleep(200);
    }
    ok(nodeAsked.length === 8 && nodeAsked.every(x => x.topic === 'storms') && new Set(nodeAsked.map(x => x.fact)).size === 8 && (await text()).includes('Review done'), 'each fact once, all of them its own topic\'s, then Review done', nodeAsked.map(x => x.fact));
    await press();
    ok(await ev(`document.querySelector('.node[data-node=look-back]').classList.contains('done') && document.querySelector('.node[data-node=drawn]').classList.contains('now')`), 'and the path goes on: the review is done, the test is next');

    console.log('A test drawn from facts');
    await f.tap('.node[data-node=drawn]');
    await sleep(300);
    await f.tap('.callout [data-go=start]');
    await live();
    const drawnSteps = await ev(`__primer.run.lesson.steps.map(s => ({ id: s.id, fact: s.fact, ask: s.askId, way: __primer.facts.wayOf(s) }))`);
    const ways = await ev(`Object.fromEntries([...__primer.app.topics.find(t=>t.id==='storms').facts.facts.values()].map(f => [f.id, f.taughtBy.map(t => t.way).filter(Boolean)]))`);
    ok(drawnSteps.length === 4 && drawnSteps.every(s => s.fact && s.ask && s.id === `${s.fact}.${s.ask}` && !ways[s.fact].includes(s.way)), 'it draws four facts of its unit, each asked a way its lesson didn\'t use', { drawnSteps, ways });
    ok(await waitFor(`__primer.run.reader.heard.some(h => h.id === ${JSON.stringify(`${drawnSteps[0].id}.ask`)})`, 5000), "each is read aloud from its own lesson's voice, though the test has none of its own", await ev('__primer.run.reader.heard'));
    for (let k = 0; k < 4; k++) {
      await live();
      await answerStep(true);
      await press();
      await press();
    }
    await waitFor(`!!document.querySelector('.lend')`);
    ok((await text()).includes('Test done') && (await text()).includes('4 of 4 right'), 'and is played as a test is', await text());
    await press();
    const testTries = (await everyEvent()).filter(e => e.lesson === 'drawn' && e.type === 'attempt');
    ok(testTries.length === 4 && testTries.every(e => e.fact && e.ask && e.step === `${e.fact}.${e.ask}`), "its answers name their fact and ask, so the memory hears them", testTries.map(e => e.step));

    console.log('Profile follows the memory');
    await f.tap('.tab[data-tab=profile]');
    await sleep(400);
    const knowRow = () => ev(`[...document.querySelectorAll('.krow')].map(r=>({id:r.dataset.topic,pct:parseInt(r.querySelector('.pc').textContent),warn:!!r.querySelector('.wn svg'),col:r.querySelector('.kb b').style.background}))`);
    const want = () => ev(`__primer.app.topics.map(t => ({ id: t.id, m: __primer.app.memoryOf(t) }))`);
    let rows = await knowRow(), mems = await want();
    ok(rows.every(r => { const m = mems.find(x => x.id === r.id).m; return m !== null && r.pct === Math.round(m * 100); }) && rows.every(r => !r.warn), "each topic's figure is how much of it the memory model says you'd recall now, and none is low", { rows, mems });
    ok((await ev(`document.querySelector('#bestcombo').innerText.trim()`)) === `×${await ev('__primer.data.memoryNow().best')}` && (await ev('__primer.data.memoryNow().best')) >= runBest, "the crown tile shows review's best combo");
    await shot2('46-profile');
    await ev(`__primer.clock.shift(${80 * DAY}); __primer.app.go('profile'); true`);
    await sleep(300);
    const later = await knowRow();
    mems = await want();
    ok(later.every(r => r.pct < rows.find(x => x.id === r.id).pct && r.pct === Math.round(mems.find(x => x.id === r.id).m * 100) && r.warn === r.pct < 70) && later.some(r => r.warn) && later[0].col !== rows[0].col,
      'eighty days on, the figures have fallen with it, greyer, with the warning mark on the ones under 70%', { before: rows, later });
    await shot2('47-profile-later');
    await f.tap('.krow[data-topic=storms]');
    await sleep(500);
    const detail = await ev(`({dots:document.querySelectorAll('.sheet .dots i').length,text:document.querySelector('.sheet').innerText})`);
    ok(detail.dots === 8 && /\d+ of 8 facts/.test(detail.text) && detail.text.includes('due again') && detail.text.toLowerCase().includes('review made-up storms'), 'its details: a dot per fact, how many are due again, and a review of just that topic', detail);
    await shot2('48-profile-detail');
    await f.tap('.sheet [data-go=review]');
    await live();
    const topicRun = [];
    for (let k = 0; k < 3; k++) { await live(); topicRun.push((await dbg()).step.topic); await answerStep(true); await press(); await press(); }
    ok(topicRun.every(t => t === 'storms'), 'which asks only that topic\'s facts', topicRun);
    await f.tap('[data-go=leave]');
    await waitFor(`!!document.querySelector('.rend')`);
    await press();
    ok(await ev(`!!document.querySelector('.profile')`), 'and comes back to Profile');

    console.log('Offline, a review still runs and is saved');
    await b.send('Network.enable');
    await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const waitingBefore = (await queue()).length;
    await ev(`__primer.app.go('practice'); true`);
    await sleep(300);
    await f.tap('.review [data-go=review]');
    await live();
    const offKey = (await dbg()).step.key, offN = (await cards())[offKey].n;
    await answerStep(true);
    await press();
    ok((await verdict()).verdict === 'Right' && (await cards())[offKey].n === offN + 1 && (await queue()).length > waitingBefore, 'with no signal, a review question is asked, marked, remembered and queued');
    await press();
    await f.tap('[data-go=leave]');
    await waitFor(`!!document.querySelector('.rend')`);
    await press();
    await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

    console.log('A new phone gets its memory back from the repo');
    await ev('__primer.sync.flush()');
    await sleep(300);
    ok((await queue()).length === 0, 'everything has gone up');
    const snap = await ev(`({ cards: __primer.data.memoryNow().toJSON().cards, best: __primer.data.memoryNow().best,
      done: Object.entries(__primer.data.progressNow().lessons).filter(([k, v]) => v.finished).map(([k]) => k).sort(), nodes: Object.keys(__primer.data.progressNow().nodes).sort() })`);
    // a cleared phone: no database, no backup list, nothing kept
    await ev(`(async () => { Object.keys(localStorage).filter(k => k.startsWith('primer')).forEach(k => localStorage.removeItem(k)); await __primer.store.testCloseConnection(); await new Promise(r => { const q = indexedDB.deleteDatabase('primer'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); return true })()`);
    await go();
    ok((await ev(`__primer.data.memoryNow().size`)) === 0 && (await ev(`__primer.sync.status().connected`)) === false && (await text()).includes('No lessons'), 'cleared, the phone knows nothing: no lessons, no memory, not connected');
    await ev(`__primer.sync.connect('test-good')`);
    ok(await waitFor(`__primer.store.get('rebuilt').then(r => !!r && r.events > 0)`, 15000), 'connecting, it reads the repo\'s progress files and replays them', await ev(`__primer.store.get('rebuilt')`));
    const rebuilt = await ev(`({ cards: __primer.data.memoryNow().toJSON().cards, best: __primer.data.memoryNow().best,
      done: Object.entries(__primer.data.progressNow().lessons).filter(([k, v]) => v.finished).map(([k]) => k).sort(), nodes: Object.keys(__primer.data.progressNow().nodes).sort() })`);
    const sameCards = Object.keys(snap.cards).length === Object.keys(rebuilt.cards).length && Object.entries(snap.cards).every(([k, x]) => {
      const y = rebuilt.cards[k];
      return y && ['due', 's', 'd', 'r', 'l', 'st', 'lr', 'ask', 'n', 'ok', 'm'].every(f2 => (typeof x[f2] === 'number' ? Math.abs(x[f2] - y[f2]) < 1e-6 : x[f2] === y[f2]));
    });
    ok(sameCards && rebuilt.best === snap.best, `its memory is back, card for card (${Object.keys(rebuilt.cards).length} facts, best combo ×${rebuilt.best})`, { snap: Object.keys(snap.cards), rebuilt: Object.keys(rebuilt.cards) });
    ok(JSON.stringify(rebuilt.done) === JSON.stringify(snap.done) && JSON.stringify(rebuilt.nodes) === JSON.stringify(snap.nodes), 'and so is the path: the same lessons done, the review node gone through', { snap: snap.done, rebuilt: rebuilt.done });
    await ev(`__primer.app.setPref('topic','storms'); __primer.app.go('learn'); true`);
    await sleep(400);
    ok(await ev(`document.querySelector('.node[data-node=look-back]').classList.contains('done')`), 'Learn shows it');
    ok((await ev(`__primer.store.get('rebuilt')`)).events > 0 && (await sent()).length > 0, 'once rebuilt, it isn\'t done again over what the phone now has');
    // facts written after their lessons were finished: the lessons done meet them as the library loads
    await ev(`__primer.store.del('memory').then(() => __primer.data.loadMemory()).then(() => true)`);
    await reloadLibrary();
    const met = await ev(`(() => { const c = __primer.data.memoryNow().toJSON().cards, p = __primer.data.progressNow().lessons;
      return { n: Object.keys(c).length, asked: Object.values(c).filter(x => x.n > 0).length, atFinish: Date.parse(p['storms/fuel'].finished) === c['storms/warm'].due } })()`);
    ok(met.n === 12 && met.asked === 0 && met.atFinish, 'facts that come down after their lessons were finished are met, as of when each was finished', met);

    await ev(`__primer.clock.shift(0); true`);
    await api('/__reset?data=fixtures');
    await ev('__primer.sync.pull()');
    await reloadLibrary();
    await ev(`__primer.app.setPref('topic','test-topic'); true`);
  }

  console.log('An animation plays like a video');
  // As on an iPhone: a page can say what kind its sound is. A spy notes every attempt to say so.
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{let t='auto';window.__sessionSets=[];Object.defineProperty(navigator,'audioSession',{configurable:true,value:{get type(){return t},set type(v){window.__sessionSets.push(v);t=v}}})})()` });
  const SCENES = join(ROOT, 'tests', 'fixtures', 'scenes');
  const engineVoice = JSON.parse(readFileSync(join(SCENES, 'topics', 'scene-topic', 'voice', 'engine.json'), 'utf8'));
  // In the page, so it's quick: waits for a line to be playing on its clip, and holds the clip's <audio> still.
  const holdClip = id => ev(`new Promise(r=>{const iv=setInterval(()=>{const s=__primer.run.scene;if(s.debug().id===${JSON.stringify(id)}&&s.clip&&s.clip.status==='playing'){s.clip.el.pause();clearInterval(iv);r(s.clip.time)}},4)})`);
  const picture = () => f.rect('.sstage');
  const tapPicture = async () => { const r = await picture(); await f.tapAt(r.x, r.top + r.h * 0.3); await sleep(250); };
  const control = async sc => { if (!(await scene()).ui) await tapPicture(); await f.tap(`[data-sc=${sc}]`); await sleep(250); };
  // The bar: dragged by touch from where its knob is to moment T of the timeline.
  const dragTo = async T => {
    if (!(await scene()).ui) await tapPicture();
    const tr = await f.rect('.strack'), k = await f.rect('.sknob'), total = (await scene()).total;
    // to the end: a finger runs past the bar's end, as a thumb does
    const to = T >= total ? tr.right + 8 : tr.left + (T / total) * tr.w;
    await f.drag(k.x, tr.y, to - k.x, 0, { steps: 12, ms: 360 });
    await waitFor(`!__primer.run.scene.busy && __primer.run.scene.state !== 'loading'`);
    await sleep(150);
  };
  await api(`/__reset?data=${encodeURIComponent(SCENES)}`);
  await go();
  await ev(`__primer.store.del('progress')`);
  await ev('__primer.data.loadProgress()');
  await ev('__primer.sync.pull()');
  await reloadLibrary();
  await ev(`__primer.app.setPref('topic','scene-topic'); __primer.app.setPref('voice', true); __primer.app.setPref('captions', true); __primer.app.setPref('narrators', {}); true`);
  await f.tap('.tab[data-tab=practice]');
  await f.tap('.tab[data-tab=learn]');
  await sleep(400);
  ok(JSON.stringify(await ev(`[...document.querySelectorAll('.node')].map(n=>n.dataset.kind+':'+n.className.split(' ')[1])`)) === '["animation:now","lesson:todo"]', 'an animation with its scene file is a node to play, like a lesson');
  ok((await ev(`__primer.store.files.all().then(a=>a.filter(f=>f.path.includes('/voice/')&&f.path.endsWith('.bella.'+f.path.split('.').at(-2)+'.m4a')&&f.data instanceof Blob).length)`)) === 10
    && (await ev(`__primer.store.files.paths().then(a=>a.filter(p=>p.endsWith('.m4a')&&!p.startsWith('narrators/')).length)`)) === 10, "its clips, and the lesson's, came down with the media, to play offline: the narrator's in use only (Bella's, 10 of 20)");
  await openNode('engine');
  let d = await scene();
  const frame = await ev(`(()=>{const s=document.querySelector('.sstage').getBoundingClientRect();return {top:s.top,bottom:s.bottom,w:s.width,video:!!document.querySelector('.video .scene[data-mode=video]'),bar:!!document.querySelector('.lfoot, .ltop, .lbar'),tabs:getComputedStyle(document.querySelector('.tabs')).display}})()`);
  ok(await bare() && frame.video && !frame.bar && frame.tabs === 'none', 'it plays full screen: no header, no tab bar, no Continue bar', frame);
  ok(frame.top >= SAT && frame.bottom <= H - SAB && frame.w === W && frame.bottom - frame.top >= H - SAT - SAB - 1, 'the picture fills the screen, within the safe areas', frame);
  ok(d.narrators.every(n => n === 'bella') && await ev(`__primer.run.scene.urls.every(u => u && u.url.startsWith('blob:'))`), "the topic's narrator, Bella, with every clip made ready before it starts", d.narrators);
  ok(await waitFor(`__primer.run.scene.state === 'playing' && __primer.run.scene.debug().sound`, 4000), 'it starts by itself, with the voice: the tap on Start was enough');
  await waitFor(`__primer.run.scene.debug().fired.length >= 2`, 10000);
  d = await scene();
  ok(d.sound && d.voiced && d.clip && ['playing', 'ended'].includes(d.clip.status), "the line follows its clip's clock", d.clip);
  const lags = d.fired.map(x => +(x.at - x.want).toFixed(3));
  ok(d.fired.every(x => x.voiced) && lags.every(x => x >= -0.001 && x < 0.05), `actions fire at their words, within a frame or two of the clip's clock (late by ${lags.join(', ')} s)`, d.fired);
  const wantTurn = engineVoice.lines.turn.bella.words;
  ok(Math.abs(d.fired[0].want - wantTurn[5][1]) < 0.001 && Math.abs(d.fired[1].want - wantTurn[9][1]) < 0.001, 'each at the time its word is said in the timing file ("Brazil", then "lights")');
  ok(d.ui, 'the controls are up as it opens');
  await shot('30-video-playing');
  ok(await waitFor(`!__primer.run.scene.debug().ui`, 4500), 'and fade after about three seconds without a touch, while it plays');
  await sleep(300);
  ok(await ev(`getComputedStyle(document.querySelector('.sui')).opacity === '0' && getComputedStyle(document.querySelector('.spart')).pointerEvents === 'none'`), 'gone, the picture is all there is, and it takes no touches');
  // The clip is the clock: held still, the picture waits for it.
  const heldAt = await holdClip('storm');
  await sleep(1000);
  const whileHeld = (await scene()).fired.filter(x => x.line === 'storm').length;
  ok(heldAt < 0.4 && whileHeld === 0, `with the clip held still for a second (at ${heldAt.toFixed(2)} s), nothing on the line happens: the sound is the clock, not the time since the tap`);
  await ev('__primer.run.scene.clip.el.play(); true');
  await waitFor(`__primer.run.scene.debug().fired.filter(x=>x.line==='storm').length >= 2`, 6000);
  const stormLags = (await scene()).fired.filter(x => x.line === 'storm').map(x => x.at - x.want);
  ok(stormLags.every(x => x >= -0.001 && x < 0.05), 'let go, its words come and the actions with them, still on time', stormLags);
  // The caption lights word by word, in order, as the clip says them.
  await waitFor(`__primer.run.scene.debug().id === 'track' && __primer.run.scene.debug().t > 0.3`, 8000);
  const litSeen = [];
  for (let k = 0; k < 8; k++) { litSeen.push((await scene()).lit.lit); await sleep(220); }
  const capWords = await ev(`[...document.querySelectorAll('.sline .w')].map((w,i)=>w.classList.contains('said'))`);
  ok(litSeen.every((x, k) => k === 0 || x >= litSeen[k - 1]) && litSeen.at(-1) > litSeen[0] && litSeen[0] > 0, `the caption's words light in order as they're said (${litSeen.join(', ')} of ${capWords.length})`, litSeen);
  ok(capWords.indexOf(false) === -1 || capWords.slice(capWords.indexOf(false)).every(x => !x), 'every word said so far is lit, none after it', capWords);
  // round four: no plate behind the caption, a halo round its letters, at most two lines at a time, in pages
  // that end where a phrase does
  const capLook = await ev(`(()=>{const el=document.querySelector('.sline'),cs=getComputedStyle(el),lh=parseFloat(cs.lineHeight);return {lines:Math.round(el.getBoundingClientRect().height/lh),bg:cs.backgroundColor,shadow:cs.textShadow,size:parseFloat(cs.fontSize),pages:__primer.run.scene.cap.pages.length}})()`);
  ok(capLook.lines <= 2 && /rgba\(0, 0, 0, 0\)|transparent/.test(capLook.bg) && capLook.shadow !== 'none' && capLook.size >= 20, 'the caption has no plate behind it, a dark halo round its letters, slightly bigger type, and never more than two lines', capLook);
  const paged = await ev(`import('/primer/js/readalong.js').then(m => { const w = "So, seen from the ground, the air keeps blowing in from the east. That's why the trade winds blow from east to west.".split(' '); return m.pagesOf(w, (i, j) => w.slice(i, j + 1).join(' ').length <= 58).map(([a, b]) => w.slice(a, b + 1).join(' ')); })`);
  ok(paged.length === 3 && paged[1].endsWith('east.') && paged[2].startsWith("That's"), 'a long caption is split into pages at its phrases, a sentence never running into the next page', paged);
  await shot('31-video-caption-lit');
  // A tap on the picture brings the controls up, over it; they go again by themselves.
  await tapPicture();
  d = await scene();
  ok(d.ui && d.state === 'playing' && await ev(`getComputedStyle(document.querySelector('.sui')).pointerEvents === 'auto'`), 'a tap on the picture brings the controls up, and it plays on', d.state);
  await sleep(300);
  await shot('32-video-overlay');
  ok(await waitFor(`!__primer.run.scene.debug().ui`, 4500), 'they fade again after a few seconds');
  // Pause and play.
  await control('play');
  await ev(`window.__before = __primer.run.scene.clip; window.__beforeEl = __primer.run.scene.clip && __primer.run.scene.clip.el; true`);
  const p0 = await scene(), t0 = await ev('__beforeEl ? __beforeEl.currentTime : -1');
  await sleep(700);
  const p1 = await scene(), t1 = await ev('__beforeEl ? __beforeEl.currentTime : -1');
  ok(p0.state === 'paused' && p1.state === 'paused' && t1 === t0 && Math.abs(p1.at - p0.at) < 0.001, 'pause stops the voice and the picture both', [p0.state, p1.state, t0, t1]);
  await sleep(3200);
  ok((await scene()).ui, 'paused, the controls stay');
  await shot('33-video-paused');
  await f.tap('[data-sc=play]');
  await sleep(400);
  const p2 = await scene();
  ok(['playing', 'gap'].includes(p2.state) && p2.at >= p0.at - 0.05 && await ev(`__primer.run.scene.clip !== __before && (!__primer.run.scene.clip || __primer.run.scene.clip.el !== __beforeEl)`), 'play carries on from where it was, on a new player: every play gets a fresh <audio>', [p2.state, p2.at, p0.at]);
  // The line before and the next.
  d = await scene();
  await dragTo(d.starts[2] + 0.4);
  await waitFor(`__primer.run.scene.state === 'playing'`, 4000);
  await control('back');
  await waitFor(`__primer.run.scene.state === 'playing'`, 4000);
  d = await scene();
  const centreBack = await ev('__primer.run.scene.handles.globe.state().centre');
  ok(d.id === 'storm' && Math.abs(d.at - d.starts[1]) < 0.6 && Math.abs(centreBack[0] + 53) < 9 && Math.abs(centreBack[1] + 10) < 9, 'the line before, early in a line, goes back to its start, the picture as it was then (the globe at Brazil)', { id: d.id, at: d.at, centreBack });
  await control('skip');
  d = await scene();
  ok(d.id === 'track' && d.state === 'playing' && Math.abs(d.at - d.starts[2]) < 0.4, 'the next line starts at once', { id: d.id, at: d.at });
  await control('skip');
  d = await scene();
  ok(d.id === 'end' && Math.abs(d.at - d.starts[3]) < 0.4 && (await ev('__primer.run.scene.handles.globe.debug().routes[0].progress')) === 1, 'and what was left of the line before lands at once (the storm at the end of its track)', { id: d.id, at: d.at });
  // The bar, dragged to a moment: the picture is rebuilt as it was then, and it plays on from there.
  const tw = engineVoice.lines.track.bella.words;
  const span0 = tw[2][1], span1 = tw[tw.length - 1][2];
  const T = d.starts[2] + span0 + (span1 - span0) * 0.5;
  await dragTo(T);
  await waitFor(`__primer.run.scene.state === 'playing'`, 4000);
  d = await scene();
  const rebuilt = await ev(`(()=>{const g=__primer.run.scene.handles.globe;return {routes:g.debug().routes,centre:g.state().centre}})()`);
  ok(d.id === 'track' && Math.abs(d.at - T) < 0.35 && d.clip && Math.abs(d.clip.time - (T - d.starts[2])) < 0.35, `dragging the bar to ${T.toFixed(2)} s plays on from there, in that line's clip`, { id: d.id, at: d.at, clip: d.clip });
  ok(rebuilt.routes.length === 1 && Math.abs(rebuilt.routes[0].progress - 0.5) < 0.12 && Math.abs(rebuilt.centre[0] + 53) < 9 && Math.abs(rebuilt.centre[1] + 10) < 9, 'and the picture is rebuilt as it was then: the globe at Brazil, the storm halfway along its track', rebuilt);
  ok(await ev(`[...document.querySelectorAll('.strack .sticks i')].length === 3`), 'the bar marks where each line starts');
  await shot('34-video-dragged');
  // Captions off, and remembered.
  await control('captions');
  ok(await ev(`document.querySelector('.scene').classList.contains('nocap') && getComputedStyle(document.querySelector('.scap')).opacity === '0'`) && (await ev(`__primer.store.get('prefs')`)).captions === false, 'captions can be turned off, and the choice is kept');
  await control('captions');
  ok(!(await ev(`document.querySelector('.scene').classList.contains('nocap')`)) && (await ev(`__primer.store.get('prefs')`)).captions === true, 'and on again');
  await control('captions');
  // The end: it stops on the last picture, with Watch again and Next.
  await dragTo((await scene()).total);
  d = await scene();
  const endButtons = await ev(`[...document.querySelectorAll('.send:not([hidden]) [data-sc]')].map(b=>b.textContent.trim())`);
  ok(d.state === 'ended' && JSON.stringify(endButtons) === '["Watch again","Next"]' && d.ui, 'at the end it stops on the last picture, with Watch again and Next', { state: d.state, endButtons });
  await shot('35-video-end');
  let vEvents = (await everyEvent()).filter(e => e.topic === 'scene-topic' && e.lesson === 'engine');
  ok(JSON.stringify(vEvents.map(e => e.type)) === '["start","seen","finish"]' && vEvents.every(e => e.step === 'engine' || e.type === 'finish'), 'it is saved and sent like a lesson of one step: a start, seen, finished', vEvents.map(e => e.type));
  await f.tap('[data-sc=again]');
  await sleep(600);
  d = await scene();
  ok(d.state === 'playing' && d.id === 'turn' && d.at < 1, 'Watch again plays it from the start', { state: d.state, id: d.id, at: d.at });
  await dragTo((await scene()).total);
  ok(await sceneState('ended', 3000), 'dragged to the very end of the bar, it is at its end');
  // what is under the finger, and every click and press, said if Next doesn't go on (it once didn't, only in a full run)
  const nextAt = await f.rect('[data-sc=next]');
  const under = await ev(`(()=>{window.__taps=[];for(const t of ['pointerdown','click'])document.addEventListener(t,e=>__taps.push(t+':'+e.target.tagName+'.'+String(e.target.className).slice(0,30)+(e.defaultPrevented?' prevented':'')),true);const e=document.elementFromPoint(${nextAt.x},${nextAt.y});return e?e.tagName+'.'+String(e.className).slice(0,40):null})()`);
  await f.tap('[data-sc=next]');
  // Under load (other test runs at once) the browser can see the press but make no click of it: a long press.
  // Then it's tapped once more, and said, so a real miss still fails.
  let retapped = false;
  if (!(await waitFor(`__primer.run && __primer.run.step && __primer.run.step.id === 'before'`, 2000))) {
    const t = await ev('window.__taps');
    if (t.some(x => x.startsWith('pointerdown')) && !t.some(x => x.startsWith('click'))) { retapped = true; console.log('  note: the press made no click; tapped Next again'); await f.tap('[data-sc=next]'); }
  }
  await waitFor(`__primer.run && __primer.run.step && __primer.run.step.id === 'before'`);
  ok(!(await ev('!!document.querySelector(".video")')) && (await stepId()) === 'before', 'Next goes on to the next node on the path: the lesson',
    { under, taps: await ev('window.__taps'), scene: await ev(`(()=>{const s=document.querySelector('.scene');return s?{cls:s.className,state:s.dataset.state}:null})()`), run: await ev('__primer.run ? (__primer.run.scene ? "scene" : "lesson") : null'), retapped });
  ok((await everyEvent()).filter(e => e.lesson === 'engine' && e.type === 'finish').length === 1, 'and the animation was finished once, for that viewing');
  await f.tap('[data-go=leave]');
  await sleep(400);
  ok(await ev(`document.querySelector('.node[data-node=engine]').classList.contains('done')`), 'on the path, the animation is done');
  // The choice is kept for the next time.
  await openNode('engine');
  ok(await ev(`document.querySelector('.scene').classList.contains('nocap')`), 'captions turned off stay off the next time');
  await control('close');
  await sleep(400);
  ok(!(await bare()) && (await ev(`__primer.run`)) === null, 'the close button leaves, and the voice stops with it');
  ok((await everyEvent()).some(e => e.type === 'leave' && e.lesson === 'engine'), 'leaving before the end is saved too');

  console.log('Voice off: it plays straight through, captions always on');
  await ev(`__primer.app.setPref('voice', false); true`);
  await openNode('engine');
  d = await scene();
  ok(d.state === 'playing' && !d.sound && (await ev('__primer.run.scene.clips.length')) === 0, 'with Voice off it starts by itself, on the reading clock, with no player made', d);
  ok(!(await ev(`document.querySelector('.scene').classList.contains('nocap')`)) && !(await ev(`document.querySelector('[data-sc=captions]').hidden`)), 'its captions are on, though turned off with the voice: with no voice they are the words; their button stays (round four)', await scene());
  await control('captions');
  ok(await ev(`document.querySelector('.scene').classList.contains('nocap')`) && (await ev(`__primer.store.get('prefs')`)).captions === false, 'and hides them, for this viewing only: the remembered choice is untouched (still off)');
  await control('captions');
  ok(!(await ev(`document.querySelector('.scene').classList.contains('nocap')`)), 'and brings them back');
  const readLit = [];
  for (let k = 0; k < 6; k++) { readLit.push((await scene()).lit.lit); await sleep(250); }
  ok(readLit.at(-1) > readLit[0], `the words light at reading pace (${readLit.join(', ')})`, readLit);
  await shot('36-video-voice-off');
  ok(await sceneState('ended', 30000), 'and it plays to the end with no taps at all');
  d = await scene();
  ok(d.fired.length === 6 && d.fired.every(x => !x.voiced), 'every action on its word, on the reading clock', d.fired);
  await control('close');
  await sleep(400);
  await ev(`__primer.app.setPref('captions', true); true`);

  console.log('A scene step in a lesson plays through too');
  await f.tap('.node[data-node=with-scene]');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  await waitFor(`__primer.run && __primer.run.step.id === 'before'`);
  ok(!(await ev(`!!document.querySelector('.ltext.reading')`)) && (await ev('__primer.run.reader.heard.length')) === 0, 'with Voice off, a step is read silently: its words are simply there');
  await press();
  await waitFor(`__primer.run.scene && __primer.run.scene.state !== 'loading'`);
  ok(await ev(`document.querySelectorAll('.spart').length === 2 && !!document.querySelector('.spart[data-part=globe] canvas') && !!document.querySelector('.spart[data-part=warmth] .pi') && document.querySelector('.scene').dataset.mode === 'step'`), 'the same player sits inside the step: two parts share the picture, each named in the calls ("warmth.reveal")');
  ok((await btn()).disabled && (await btn()).text === 'Continue', 'Continue waits for its end');
  ok(await sceneState('ended', 20000), 'it plays through, with nothing to answer');
  ok((await scene()).fired.length === 3 && !(await ev(`document.querySelector('.spart[data-part=warmth] .pi-chip.truth').hidden`)) && !(await btn()).disabled, "its calls reach both parts, and at its end Continue wakes");
  await shot('37-scene-step-end');
  await press();
  await waitFor(`__primer.run.step.id === 'after' && __primer.run.input`);
  await f.tap('.pi-opt[data-id=france]');
  await press();
  await press();
  ok((await text()).includes('Lesson done') && (await text()).includes('1 of 1 right'), "a scene step isn't counted as a question", await text());
  await press();
  ok((await everyEvent()).some(e => e.type === 'seen' && e.lesson === 'with-scene' && e.step === 'tour'), 'a scene step is saved as seen, like an explain step');

  console.log('Voice in lessons: each step read aloud, its words lit');
  await ev(`__primer.app.setPref('voice', true); true`);
  await f.tap('.node[data-node=with-scene]');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  await waitFor(`__primer.run && __primer.run.step.id === 'before'`);
  ok(await waitFor(`__primer.run.reader.heard.some(h => h.id === 'before.text') && __primer.run.reader.now() && __primer.run.reader.now().status === 'playing'`, 5000), 'as a step opens, its words are read aloud, in the narrator', await ev('__primer.run.reader.heard'));
  const lessonLit = [];
  for (let k = 0; k < 6; k++) { lessonLit.push(await ev(`__primer.run.textRa.state().lit`)); await sleep(200); }
  ok(lessonLit.every((x, k) => k === 0 || x >= lessonLit[k - 1]) && lessonLit.at(-1) > lessonLit[0] && await ev(`!!document.querySelector('.ltext.ra.reading .w.said')`), `its words light up in place as they're said, in order (${lessonLit.join(', ')})`, lessonLit);
  // "27 °C" is read as "twenty-seven degrees Celsius": the written words still light in time with it
  const said = await ev(`(()=>{const ra=__primer.run.textRa,w=ra.words;return {at:ra.times[w.indexOf('at')],deg:ra.times[w.indexOf('27')],c:ra.times[w.indexOf('°C')],and:ra.times[w.indexOf('and')]}})()`);
  ok(said.at[1] <= said.deg[0] && said.deg[1] <= said.c[1] && said.c[1] <= said.and[0] + 0.001, 'a word read differently ("27 °C", said as words) lights while those words are said', said);
  await shot('38-lesson-read-aloud');
  await ev(`window.__readClip = __primer.run.reader.clip; true`);
  await press();
  ok(await ev(`__readClip.status === 'idle' && __readClip.el === null && !document.querySelector('.ltext.reading')`), 'moving on stops it');
  await waitFor(`__primer.run.scene && __primer.run.scene.state !== 'loading'`);
  ok(await waitFor(`__primer.run.scene.state === 'playing' && __primer.run.scene.debug().sound`, 4000), 'the scene step starts by itself, voiced');
  await ev(`__primer.run.scene.seekTo(__primer.run.scene.total, false); true`);
  await sceneState('ended', 8000);
  await press();
  await waitFor(`__primer.run.step.id === 'after' && __primer.run.input`);
  ok(await waitFor(`__primer.run.reader.heard.some(h => h.id === 'after.ask')`, 4000), "a question is read as it opens");
  await f.tap('.pi-opt[data-id=peru]');
  await sleep(150);
  ok(!(await btn()).disabled && await ev(`!!__primer.run.reader.clip`), 'answering never waits for the voice: Check is awake while the question is read', await btn());
  await press();
  ok(await waitFor(`__primer.run.reader.heard.at(-1).id === 'after.option-peru' && __primer.run.reader.now() && __primer.run.reader.now().status === 'playing'`, 3000), 'after an answer, the line of why shown is read aloud', await ev('__primer.run.reader.heard'));
  await waitFor(`__primer.run.whyRa.state().lit > 2`, 3000);
  ok(await ev(`!!document.querySelector('.lwhy.ra.reading .w.said')`), 'its words lit as they are said');
  await shot('39-lesson-why-read');
  const heardBefore = await ev('__primer.run.reader.heard.length');
  await f.tap('.ltext');
  ok(await waitFor(`__primer.run.reader.heard.length === ${heardBefore + 1} && __primer.run.reader.heard.at(-1).id === 'after.ask'`, 3000), 'tapping the words reads them again');
  await press();
  await press();
  await waitFor(`!__primer.run`, 3000);

  console.log('When no sound plays');
  await ev(`window.__realPlay = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('Not allowed', 'NotAllowedError')); }; true`);
  await openNode('engine');
  await sleep(500);
  d = await scene();
  ok(d.state === 'ready' && !d.failed && d.ui && await ev(`getComputedStyle(document.querySelector('[data-sc=play]')).display !== 'none'`), 'a phone that wants a tap before any sound: it waits on its first picture, with play showing', d);
  await shot('40-video-wants-a-tap');
  await f.tap('[data-sc=play]');
  await sleep(500);
  d = await scene();
  ok(d.failed === 'refused' && !d.sound && d.state === 'playing' && (await ev(`document.querySelector('.snote').hidden`)) === false, 'refused even from a tap, it reads on from its captions at once, and says so', d);
  await ev(`HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; true`);
  await control('voice');
  await sleep(1200);
  ok((await scene()).sound && !(await scene()).failed, 'the speaker tries the voice again; a clip whose clock stands still is not called silent at once');
  await waitFor(`__primer.run.scene.debug().misses === 1`, 5000);
  d = await scene();
  ok(d.misses === 1 && d.quietLine === d.line && d.sound && !d.failed && (await ev(`document.querySelector('.snote').hidden`)), 'after about 2.5 seconds still, that one line reads on from its caption, quietly: the next line will try its own clip (round four)', d);
  await waitFor(`__primer.run.scene.debug().failed`, 20000);
  d = await scene();
  ok(d.failed === 'silent' && !d.sound && (await ev(`document.querySelector('.snote').textContent`)).includes('No sound played'), "when the next line's clip stands still too, it says so, and the rest reads on from its captions", d);
  await ev(`HTMLMediaElement.prototype.play = window.__realPlay; true`);
  await control('voice');
  await sleep(1200);
  d = await scene();
  ok(d.sound && !d.failed && d.clip && d.clip.status === 'playing', 'the speaker tries the voice again, from the same moment', d.clip);
  await control('close');
  await sleep(300);

  // Round four: "No sound played", then the voice started. A clip that is slow to load isn't silent, a phone
  // that wants a tap but says nothing isn't silent, and one quiet clip doesn't silence the rest.
  console.log('A slow voice is waited for, never called silent');
  await ev(`(() => {
    const P = HTMLMediaElement.prototype, rs = Object.getOwnPropertyDescriptor(P, 'readyState');
    window.__rs = rs; window.__realPause = P.pause;
    window.__slowUntil = 0;
    Object.defineProperty(P, 'readyState', { configurable: true, get() { return performance.now() < window.__slowUntil ? 1 : rs.get.call(this); } });
    P.pause = function () { this.__off = true; return window.__realPause.call(this); };
    // the clip has nothing to play for four seconds (still loading, as on a phone readying every clip in a
    // tap), then plays
    P.play = function () { const el = this; el.__off = false; const wait = Math.max(0, window.__slowUntil - performance.now()); return new Promise(res => setTimeout(() => { if (el.__off) return res(); window.__realPlay.call(el).then(res, res); }, wait)); };
    return true; })()`);
  await openNode('engine');
  await ev(`window.__slowUntil = performance.now() + 4000; __primer.run.scene.seekTo(0, true); true`);
  await sleep(3300);
  d = await scene();
  ok(!d.failed && d.sound && d.clip && d.clip.status === 'starting' && d.clip.waiting && (await ev(`document.querySelector('.snote').hidden`)), 'a clip still loading after 3.3 seconds is waiting, not silent: no "No sound played" (before round four it was called silent at 2.5 seconds)', d);
  ok(await waitFor(`__primer.run.scene.debug().clip && __primer.run.scene.debug().clip.status === 'playing'`, 4000), 'and once it has loaded, it plays: the voice starts, late but whole');
  d = await scene();
  ok(d.sound && !d.failed && d.misses === 0, 'nothing was lost: the scene is voiced from there on', d);
  await control('close');
  await sleep(300);
  await ev(`window.__slowUntil = 0; HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; true`);
  await openNode('engine');
  await sleep(3400);
  d = await scene();
  ok(d.state === 'ready' && !d.failed && !d.note && d.ui, 'a phone that wants a tap but says nothing (its first clip, started by itself, never moves): it waits on its picture for a tap on play, never saying "No sound played"', d);
  await ev(`HTMLMediaElement.prototype.play = window.__realPlay; true`);
  await f.tap('[data-sc=play]');
  ok(await waitFor(`__primer.run.scene.debug().clip && __primer.run.scene.debug().clip.status === 'playing'`, 4000) && (await scene()).sound, 'and the tap starts the voice');
  await control('close');
  await sleep(300);
  // one quiet clip: its line reads on, the next line is voiced
  await openNode('engine');
  await waitFor(`__primer.run.scene.state === 'playing'`, 4000);
  await ev(`(() => { const s = __primer.run.scene, real = window.__realPlay; window.__mute = s.urls[1].url; HTMLMediaElement.prototype.play = function () { return this.src === window.__mute ? Promise.resolve() : real.call(this); }; s.seekTo(s.starts[1], true); return true; })()`);
  await waitFor(`__primer.run.scene.debug().misses === 1`, 6000);
  d = await scene();
  ok(d.line === 1 && d.quietLine === 1 && d.sound && !d.failed && !d.note, 'one clip that plays no sound: its line reads on from its caption, with no note', d);
  ok(await waitFor(`__primer.run.scene.debug().line === 2 && __primer.run.scene.debug().clip && __primer.run.scene.debug().clip.status === 'playing'`, 15000), 'and the next line is voiced again by itself');
  d = await scene();
  ok(d.sound && !d.failed && d.misses === 0, 'the voice carries on', d);
  await ev(`HTMLMediaElement.prototype.play = window.__realPlay; HTMLMediaElement.prototype.pause = window.__realPause; Object.defineProperty(HTMLMediaElement.prototype, 'readyState', window.__rs); true`);
  await control('close');
  await sleep(300);

  console.log('Directed scenes: shots, names on the map, soft motion, smooth tracks and sounds');
  {
    // the kit's sounds: the same names in parts.json and js/sfx.js, every file there and playable
    const kitJson = JSON.parse(readFileSync(join(ROOT, 'parts', 'parts.json'), 'utf8'));
    const sfxNames = await ev(`import('/primer/js/sfx.js').then(m => m.SOUND_NAMES)`);
    ok(JSON.stringify(Object.keys(kitJson.scene.sounds)) === JSON.stringify(sfxNames), 'the sounds a scene can make are the same in the kit (parts.json) and the player (js/sfx.js)', sfxNames);
    const lengths = await ev(`Promise.all(${JSON.stringify(sfxNames)}.map(n => new Promise(r => { const a = new Audio('/primer/sounds/' + n + '.m4a'); a.preload = 'auto'; a.onloadedmetadata = () => r(a.duration); a.onerror = () => r(-1); setTimeout(() => r(-2), 5000); })))`);
    ok(lengths.every(d => d > 0.1 && d < 3.5), `every sound is a short file the browser plays (${lengths.map(d => d.toFixed(2)).join(', ')} s)`, lengths);
    // the stretch's ease and range
    const eases = await ev(`import('/primer/js/scene.js').then(m => { const s = m.stretch({}), r = m.stretch({ range: [0.2, 0.8], ease: 'linear' }); return [s(0), s(0.25), s(0.5), s(1), r(0), r(0.5), r(1)].map(x => +x.toFixed(4)); })`);
    ok(JSON.stringify(eases) === JSON.stringify([0, 0.1464, 0.5, 1, 0.2, 0.5, 0.8]), 'a stretch eases in and out unless told, and runs across its range', eases);

    // the map in a scene: soft, with its camera, names, smooth tracks and fades
    await ev(`(async()=>{document.getElementById('bench')?.remove();const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px;z-index:50;background:#141a3c';document.body.append(d);window.__h=await __primer.parts.mount('globe',d,{style:'day',spin:'locked',tap:'none',view:[-40,15]},{motion:'soft'});return true})()`);
    ok((await ev('__h.debug().soft')) === true && (await ev(`__primer.parts.mount('globe', document.createElement('div'), {}).then(h => { const s = h.debug().soft; h.remove(); return s; })`)) === false, 'a part mounted in a scene moves softly; the same part in a lesson keeps its spring');
    const P = [[-25, 12], [-45, 15], [-62, 21], [-73, 30], [-66, 39]];
    await ev(`__h.run(['track', ${JSON.stringify(P)}, 1, 'storm', 0])`);
    const route = (await ev('__h.debug()')).routes[0];
    ok(route.points > 60 && route.bend < 6, `a storm's track is one smooth curve along its places: ${route.points} close points, its sharpest turn ${route.bend}° (the old straight legs turned up to 40° at each place)`, route);
    await ev(`__h.run(['clear', 0])`);
    // a glide along the track: always forward, no stop, its fastest moment under twice its average
    const prog = await ev(`(async()=>{__h.run(['track', ${JSON.stringify(P)}, 1, 'storm', 1.2]);const out=[];const t0=performance.now();while(performance.now()-t0<1500){await new Promise(r=>requestAnimationFrame(r));out.push([performance.now()-t0, __h.debug().routes[0].progress]);}return out})()`);
    const steps = prog.slice(1).map((x, i) => (x[1] - prog[i][1]) / Math.max(1, x[0] - prog[i][0]));
    const moving = steps.filter((_, i) => prog[i + 1][0] < 1150);
    const mean = 1 / 1200;
    ok(prog.every((x, i) => !i || x[1] >= prog[i - 1][1] - 1e-9) && prog.at(-1)[1] === 1, 'the storm glides along it, never back', prog.slice(-3));
    ok(Math.max(...moving) < mean * 2, `softly: its fastest moment is ${(Math.max(...moving) / mean).toFixed(2)} times its average speed (a cubic ease's is 3)`);
    // sent on further mid-glide, it carries on at the speed it had
    const joined = await ev(`(async()=>{__h.run(['clear',0]);__h.run(['track', ${JSON.stringify(P)}, 0.5, 'storm', 1]);await new Promise(r=>setTimeout(r,500));const s=[];for(let i=0;i<4;i++){await new Promise(r=>requestAnimationFrame(r));s.push([performance.now(),__h.debug().routes[0].progress]);}__h.run(['track', ${JSON.stringify(P)}, 1, 'storm', 1.4]);for(let i=0;i<4;i++){await new Promise(r=>requestAnimationFrame(r));s.push([performance.now(),__h.debug().routes[0].progress]);}return s})()`);
    const v = i => (joined[i + 1][1] - joined[i][1]) / (joined[i + 1][0] - joined[i][0]);
    ok(Math.abs(v(5) - v(2)) < Math.max(v(2), 1e-6) * 0.6, `sent on mid-glide, it carries on from the speed it had (${(v(2) * 1000).toFixed(3)} then ${(v(5) * 1000).toFixed(3)} of the way a second)`, joined);
    // the camera: a place, a zoom, an angle and a heading on one soft glide; following the storm; the world turning
    await ev(`__h.run(['clear', 0]); __h.run(['camera', [-45, 18], 2.4, 0.7, 20, 0.4])`);
    await sleep(700);
    const cam = (await ev('__h.debug()')).camera;
    ok(Math.abs(cam.zoom - 2.4) < 0.01 && Math.abs(cam.tilt - 0.7) < 0.01 && Math.abs(cam.heading - 20) < 0.1 && Math.abs(cam.centre[0] + 45) < 0.2, 'the camera moves to a place, a zoom, an angle and a heading together', cam);
    const lowered = await ev(`(()=>{const p=__h.where([-45,18]),b=document.getElementById('bench').getBoundingClientRect();return {y:p.y-b.top,h:b.height}})()`);
    ok(lowered.y > lowered.h * 0.6, 'seen at an angle, the place sits low in the picture with the world curving away above it', lowered);
    await ev(`__h.run(['camera', [-40, 15], 1.5, 0, 0, 0]); __h.run(['track', ${JSON.stringify(P)}, 1, 'storm', 2]); __h.run(['follow', true, 0.6])`);
    await sleep(1400);
    const chase = await ev(`(()=>{const d=__h.debug(),p=__h.where(${JSON.stringify(P[3])});return {following:d.camera.following}})()`);
    const head = await ev(`(()=>{const b=document.getElementById('bench').getBoundingClientRect();const c=__h.debug().camera.centre;return c})()`);
    ok(chase.following && Math.abs(head[0] - -40) > 15, 'following, the camera goes with the storm', head);
    await ev(`__h.run(['follow', false]); __h.run(['drift', 20, 0.2])`);
    const c0 = (await ev('__h.debug()')).camera.centre[0];
    await sleep(800);
    const c1 = (await ev('__h.debug()')).camera.centre[0];
    ok(((c0 - c1 + 540) % 360) - 180 > 5, `drifting, the world turns by itself, west to east (${c0} to ${c1})`);
    await ev(`__h.run(['drift', 0, 0]); __h.run(['clear', 0]); __h.run(['camera', [-40, 20], 1.4, 0, 0, 0])`);
    // names of oceans and continents: written while they matter, and taken away
    await ev(`__h.run(['label', 'Atlantic Ocean']); __h.run(['label', 'Africa']); __h.run(['label', 'Nowhere Sea'])`);
    await sleep(900);
    let named = (await ev('__h.debug()')).named;
    ok(named.length === 2 && named.every(n => n.at) && named.find(n => n.name === 'Atlantic Ocean').kind === 'ocean' && named.find(n => n.name === 'Africa').kind === 'continent', 'an ocean and a continent are named on the map where they are; a name the map doesn\'t know is left out', named);
    await shot('50-map-names');
    await ev(`__h.run(['label', 'Africa', false])`);
    named = (await ev('__h.debug()')).named;
    ok(named.find(n => n.name === 'Africa').fading, 'taken away, a name fades', named);
    await sleep(700);
    ok((await ev('__h.debug()')).named.length === 1, 'and is gone');
    // a clear in a scene fades everything out
    await ev(`__h.run(['point', [-40, 15], 'Here']); __h.run(['flow', [[-20, 20], [-35, 18], [-50, 20]], 'cyan', 0.3]); __h.run(['parallel', 0, 'Equator'])`);
    await sleep(500);
    await ev(`__h.run(['clear'])`);
    const fading = (await ev('__h.debug()')).routes;
    ok(fading.length === 1 && fading[0].fading && fading[0].kind === 'flow', 'in a scene, a clear fades things out rather than snapping them away', fading);
    await sleep(700);
    const cleared = await ev('__h.debug()');
    ok(!cleared.routes.length && !cleared.named.length && !cleared.parallels.length, 'and then they are gone', cleared);
    await ev(`__h.remove(); document.getElementById('bench').remove()`);

    // the sea and sky
    await ev(`(async()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px;z-index:50';document.body.append(d);window.__h=await __primer.parts.mount('section',d,{view:'wide'},{motion:'soft'});return true})()`);
    await ev(`__h.run(['warm', 1, 0.3]); __h.run(['vapour', 1, 0.3]); __h.run(['cloud', 0.8, 0.3]); __h.run(['tag', 'cloud', 'Cloud'])`);
    await sleep(600);
    let sec = await ev('__h.debug()');
    ok(sec.levels.cloud === 0.8 && sec.levels.vapour === 1 && sec.levels.warm > 0.2 && sec.levels.warm < 1 && sec.tags.length === 1 && sec.frames > 10, 'the sea and sky: its levels glide where they are sent, a tag names a thing, and it keeps moving; a colour (the sea warming) takes its measured 2.1 seconds', sec);
    let peak = 0;
    for (let k = 0; k < 16; k++) { await sleep(100); peak = Math.max(peak, (await ev('__h.debug()')).levels.warm); }
    await sleep(800);
    sec = await ev('__h.debug()');
    ok(peak > 1.02 && sec.levels.warm === 1, 'and the colour goes a touch past its target and settles back (the measured overshoot)', [peak, sec.levels.warm]);
    await shot('51-sea-and-sky');
    await ev(`document.getElementById('bench').setAttribute('data-off', '')`);
    const f0 = (await ev('__h.debug()')).frames;
    await sleep(400);
    ok((await ev('__h.debug()')).frames === f0, 'put away by a shot, it draws nothing');
    await ev(`document.getElementById('bench').removeAttribute('data-off')`);
    await sleep(200);
    ok((await ev('__h.debug()')).frames > f0, 'and shown again, it draws at once');
    await ev(`__h.run(['clear', 0.2])`);
    await sleep(500);
    sec = await ev('__h.debug()');
    ok(Object.values(sec.levels).every(x => x === 0) && !sec.tags.length, 'a clear takes it back to nothing', sec);
    await ev(`__h.remove(); document.getElementById('bench').remove()`);

    // shots, in a scene played full screen
    const directed = {
      title: 'A directed scene',
      parts: {
        globe: { part: 'globe', settings: { style: 'warmth', spin: 'locked', tap: 'none', view: [-40, 15] } },
        section: { part: 'section', settings: { view: 'wide', warm: 0.2 } },
      },
      lines: [
        { id: 'one', text: 'This is the Atlantic Ocean, and a storm moves along its track.', do: [
          { at: 'Atlantic', call: ['globe.label', 'Atlantic Ocean'], sound: 'pop' },
          { from: 'moves', to: 'track', call: ['globe.track', P, '$p', 'storm'], ease: 'linear' }] },
        { id: 'two', text: 'Now we cut to the sea and the sky, and the sea warms.', do: [
          { at: 'cut', call: ['shot.cut', 'section', 'push'] },
          { at: 'warms', call: ['section.warm', 1, 0.5] }] },
        { id: 'three', text: 'Both at once, one above the other.', do: [{ at: 'Both', call: ['shot.split', 'globe', 'section'] }, { at: 'once', call: ['shot.title', 'Two views'] }] },
        { id: 'four', text: 'Then a small window over the sea.', do: [{ at: 'Then', call: ['shot.cut', 'section', 'fade'] }, { at: 'window', call: ['shot.inset', 'globe', 'top-right'] }] },
        { id: 'five', text: 'The window goes, and a quiet chime.', do: [{ at: 'window', call: ['shot.inset', 'none'] }, { at: 'chime', sound: 'chime' }] },
      ],
    };
    await ev(`__primer.app.setPref('effects', false); __primer.app.setPref('animSounds', true); true`);
    await ev(`(async()=>{const P=__primer;const file=P.data.sceneLesson(${JSON.stringify(directed)},'directed','scene-topic');const node={kind:'animation',id:'directed',title:'A directed scene',file};
      const {playVideo}=await import('/primer/js/screens/video.js');window.__dv=await playVideo(P.app,{id:'scene-topic',title:'T',narrator:'bella',path:[node]},node,{record:()=>{},media:p=>p,voice:{on:()=>false},captions:{on:()=>true},onLeave:()=>{},onNext:()=>{}});return true})()`);
    const dv = () => ev('__dv.scene.debug()');
    const slots = () => ev(`[...document.querySelectorAll('.video .spart')].map(e => e.dataset.part + ':' + (e.hasAttribute('data-off') ? 'off' : e.dataset.slot))`);
    ok(JSON.stringify(await slots()) === '["globe:full","section:off"]', 'a scene with shots opens on its first part, full; the other waits, hidden', await slots());
    ok(await ev(`document.documentElement.classList.contains('vid') && getComputedStyle(document.documentElement).backgroundColor === 'rgb(9, 12, 43)'`), "while a video is open, the page's own ground is the video's, right to the bottom of the screen");
    await waitFor(`__dv.scene.debug().line >= 1`, 12000);
    ok((await dv()).effects.some(e => e.name === 'pop' && e.played), 'an action makes its sound as it happens (Animation sounds on, Effects off)', (await dv()).effects);
    await waitFor(`__dv.scene.debug().shots.layout.section === 'full'`, 8000);
    await sleep(900);
    let d2 = await dv();
    ok(JSON.stringify(await slots()) === '["globe:off","section:full"]' && d2.effects.some(e => e.name === 'whoosh' && e.played), 'a cut pushes the sea and sky in, with a whoosh; the globe goes off', [await slots(), d2.effects]);
    await waitFor(`__dv.scene.debug().shots.layout.globe === 'top'`, 8000);
    await sleep(900);
    const halves = await ev(`[...document.querySelectorAll('.video .spart')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(r.width)]; })`);
    ok((await dv()).shots.title === 'Two views' && await ev(`(()=>{const e=document.querySelector('.video .stitlecard');const r=e&&e.getBoundingClientRect();return !!e&&e.textContent==='Two views'&&r.top>=${SAT}&&Number(getComputedStyle(e).opacity)>0.5})()`), 'a title card lays a few big words over the top of the picture, clear of the status bar', (await dv()).shots);
    ok(halves[0][0] === 0 && Math.abs(halves[0][1] - H / 2) < 4 && Math.abs(halves[1][0] - H / 2) < 4 && halves[1][1] === H && halves.every(x => x[2] === W), 'a split shows both, one above the other, each half the screen', halves);
    ok(await ev(`(()=>{const c=document.querySelector('.video .spart[data-part=globe] canvas');return Math.abs(c.width/c.height - c.clientWidth/c.clientHeight) < 0.02})()`), "the globe's picture is drawn for its new box, never stretched");
    await shot('52-shot-split');
    await waitFor(`String(__dv.scene.debug().shots.layout.globe).startsWith('inset')`, 8000);
    await sleep(700);
    const inset = await ev(`(()=>{const r=document.querySelector('.video .spart[data-part=globe]').getBoundingClientRect();return {w:r.width,h:r.height,right:${W}-r.right,top:r.top}})()`);
    ok(inset.w < W / 2 && Math.abs(inset.w - inset.h) < 2 && inset.right < 30 && inset.top > SAT, 'an inset is a small window in the top right corner', inset);
    await shot('53-shot-inset');
    await waitFor(`__dv.scene.state === 'ended'`, 15000);
    d2 = await dv();
    ok(JSON.stringify(await slots()) === '["globe:off","section:full"]' && d2.effects.some(e => e.name === 'chime'), 'it takes the inset away, and a sound can stand on its own', [await slots(), d2.effects.map(e => e.name)]);
    // seeking back rebuilds the shot of that moment, at once
    await ev(`__dv.scene.seekTo(__dv.scene.starts[2] + 2.5, false)`);
    await sleep(200);
    ok(JSON.stringify(await slots()) === '["globe:top","section:bottom"]' && !(await dv()).shots.moving.length, 'seeking, the picture is rebuilt as that moment shows it: split, nothing still moving', await slots());
    await ev(`__dv.scene.seekTo(0.2, false)`);
    await sleep(200);
    ok(JSON.stringify(await slots()) === '["globe:full","section:off"]', 'and back at the start, the opening shot', await slots());
    // with Animation sounds off, nothing sounds, whatever Effects is
    await ev(`__primer.app.setPref('animSounds', false); __primer.app.setPref('effects', true); __dv.scene.sfx.heard.length = 0; __dv.scene.seekTo(__dv.scene.starts[1], true)`);
    await waitFor(`__dv.scene.debug().shots.layout.section === 'full'`, 8000);
    await waitFor(`__dv.scene.debug().effects.length > 0`, 3000);
    ok((await dv()).effects.length && (await dv()).effects.every(e => !e.played), 'with Animation sounds off, no sound plays, even with Effects on', (await dv()).effects);
    await ev(`__primer.app.setPref('animSounds', true); __primer.app.setPref('effects', false); true`);
    // the full-bleed layout: the app's box is the window, and the video reaches the bottom of the screen
    const bottom = await ev(`(()=>{const r=e=>document.querySelector(e).getBoundingClientRect();return {app:[r('#app').top,r('#app').bottom],video:[r('.video').top,r('.video').bottom],inner:innerHeight,doc:document.documentElement.clientHeight,
      appStyle:getComputedStyle(document.querySelector('#app')).height, apph:getComputedStyle(document.documentElement).getPropertyValue('--apph').trim()}})()`);
    ok(bottom.app[0] === 0 && bottom.app[1] === H && bottom.video[1] === H && bottom.inner === H && bottom.apph === '', 'the app is fixed to the window\'s edges, with no height worked out from the screen, and the video reaches its bottom', bottom);
    const rows = await b.send('Page.captureScreenshot', { format: 'png' });
    const px = pixels(rows.data), at = (x, y) => { const i = (y * px.w + x) * px.bpp; return [px.out[i], px.out[i + 1], px.out[i + 2]]; };
    const foot = [2, 120, 207, 300, 411].map(x => at(x, px.h - 1)), lighter = foot.filter(c => c[0] > 40 || c[1] > 45 || c[2] > 110);
    ok(!lighter.length, `at the simulated insets (${SAT} top, ${SAB} bottom), no lighter band along the bottom under a video: the bottom row is the picture's own dark`, foot);
    await shot('53b-video-bottom');
    await ev(`__dv.remove()`);
    ok(await ev(`!document.documentElement.classList.contains('vid')`), 'closed, the page has its own ground back');

    // round three: a closer look through a lens, zooming through it and back out, and sounds placed by their pictures
    const closer = {
      title: 'A closer look',
      parts: {
        sea: { part: 'section', settings: { view: 'surface', warm: 0.8 } },
        close: { part: 'molecules', settings: { below: 'water', warm: 0.7, air: 0.5 } },
      },
      lines: [
        { id: 'one', text: 'Here is the warm sea, and a sign stands up in it.', do: [
          { at: 'warm', call: ['sea.rise', 1, 1], sound: 'swell' },
          { at: 'sign', call: ['sea.sign', 'left', '27 °C'], sound: 'pop' }] },
        { id: 'two', text: 'Let us take a closer look at the water.', do: [
          { at: 'closer', call: ['shot.lens', 'close', 0.5, 0.75] },
          { at: 'water', call: ['shot.cut', 'close', 'through'] }] },
        { id: 'three', text: 'The fastest molecules break free. Then we go back out.', do: [
          { at: 'break', call: ['close.escape', 1, 0.5] },
          { at: 'back', call: ['shot.cut', 'sea', 'out'] }] },
      ],
    };
    await ev(`(async()=>{const P=__primer;const file=P.data.sceneLesson(${JSON.stringify(closer)},'closer','scene-topic');const node={kind:'animation',id:'closer',title:'A closer look',file};
      const {playVideo}=await import('/primer/js/screens/video.js');window.__dv=await playVideo(P.app,{id:'scene-topic',title:'T',narrator:'bella',path:[node]},node,{record:()=>{},media:p=>p,voice:{on:()=>false},captions:{on:()=>true},onLeave:()=>{},onNext:()=>{}});return true})()`);
    const plan0 = await ev(`(()=>{const p=__dv.scene.plans[0];return {acts:p.actions.map(a=>a.t0),sounds:p.sounds.map(s=>({name:s.name,t:s.t}))}})()`);
    const swell = plan0.sounds.find(x => x.name === 'swell'), pop = plan0.sounds.find(x => x.name === 'pop');
    ok(swell && Math.abs((plan0.acts[0] - swell.t) - 0.35) < 0.01 && pop && Math.abs((pop.t - plan0.acts[1]) - 0.445) < 0.01,
      "sounds are placed by their pictures: a process's swell starts 350 ms before it, a sign's pop lands 40 ms before its board springs open (half a second after the call)", plan0);
    const plan1 = await ev(`__dv.scene.plans[1].sounds.map(s=>({name:s.name,t:s.t}))`);
    ok(plan1.map(x => x.name).join() === 'pop,whoosh', 'a lens makes a soft pop as its circle opens, and zooming through it a whoosh', plan1);
    await waitFor(`__dv.scene.debug().shots.lens === 'close'`, 15000);
    await sleep(1200);
    const lensOpen = await ev(`(()=>{const e=document.querySelector('.video .spart[data-part=close]');return {clip:e.style.clipPath,off:e.hasAttribute('data-off'),ring:!!document.querySelector('.video .slensring')}})()`);
    ok(lensOpen.clip.startsWith('circle(') && !lensOpen.off && lensOpen.ring, 'a lens opens a circle onto the closer view, with its dot, leader and rim drawn over the picture', lensOpen);
    await shot('53c-lens');
    await waitFor(`__dv.scene.debug().shots.layout.close === 'full' && !__dv.scene.debug().shots.moving.length`, 15000);
    const through = await ev(`(()=>{const e=document.querySelector('.video .spart[data-part=close]');return {clip:e.style.clipPath,sea:document.querySelector('.video .spart[data-part=sea]').hasAttribute('data-off')}})()`);
    ok(through.clip === '' && through.sea, 'zooming through, the circle grows until the closer view fills the picture, and the wider one goes', through);
    await waitFor(`__dv.scene.debug().shots.layout.sea === 'full' && !__dv.scene.debug().shots.moving.length`, 15000);
    ok(JSON.stringify(await slots()) === '["sea:full","close:off"]', 'and back out, the wider view again', await slots());
    await ev(`__dv.scene.seekTo(__dv.scene.starts[1] + 1.5, false)`);
    await sleep(300);
    ok((await dv()).shots.lens === 'close' && !(await dv()).shots.moving.length, 'seeking into a lens rebuilds it open, nothing still moving', (await dv()).shots);
    await ev(`__dv.remove()`);
    // what's under the app's box is the app's dark, so an edge it doesn't cover can't show a lighter band
    const grounds = await ev(`(()=>{const bg=()=>getComputedStyle(document.documentElement).backgroundColor+'|'+getComputedStyle(document.body).backgroundColor;const tabs=bg();document.documentElement.classList.add('bare');const bare=bg();document.documentElement.classList.remove('bare');return {tabs,bare}})()`);
    ok(grounds.tabs === 'rgb(15, 20, 52)|rgb(15, 20, 52)' && grounds.bare === 'rgb(20, 26, 60)|rgb(20, 26, 60)', "the page's own ground is the tab bar's dark under the tabs, and the screen's ground without them", grounds);
    const meta = await ev(`({ vp: document.querySelector('meta[name=viewport]').content, bar: document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]').content })`);
    const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
    ok(meta.vp.includes('viewport-fit=cover') && meta.bar === 'black-translucent' && manifest.display === 'standalone' && manifest.background_color === manifest.theme_color, 'laid out under the status bar and the home bar, installed standalone, the splash and bars the app\'s colour', [meta, manifest.display, manifest.background_color]);
  }

  console.log('A narrator per subject, and only its voice on the phone');
  // the clips on the phone, by narrator
  const voiceOnPhone = () => ev(`__primer.store.files.paths().then(a => { const n = {}; for (const p of a) { const c = __primer.sync.clipOf(p); if (c) n[c.narrator] = (n[c.narrator] || 0) + 1; } return JSON.stringify(n); })`);
  ok((await voiceOnPhone()) === '{"bella":10}', "only the narrator in use has its clips on the phone: Bella's, the topic's own, a quarter of its voice", await voiceOnPhone());
  // every narrator's "Hello, I'm ..." sample comes down and stays, whichever narrator is in use
  const samplesOnPhone = () => ev(`__primer.store.files.paths().then(a => a.filter(p => p.startsWith('narrators/') && p.endsWith('.m4a')).map(p => p.replace(/[0-9a-f]{8}\.m4a$/, '')).sort())`);
  ok(JSON.stringify(await samplesOnPhone()) === '["narrators/bella.","narrators/chatterbox-a.","narrators/george.","narrators/heart."]', "each narrator's sample is on the phone, all four, not only the one in use", await samplesOnPhone());
  await f.tap('.tab[data-tab=profile]');
  await sleep(400);
  const narratorRow = () => ev(`(()=>{const r=document.querySelector('#narrators .srow');return r?r.querySelector('p').textContent+' / '+r.querySelector('button').textContent:null})()`);
  const narratorNote = () => ev(`(document.querySelector('#narratornote')||{}).textContent || ''`);
  ok((await narratorRow()) === 'Test science / Bella', "Profile lists each subject with its narrator, the topic's own to start with", await narratorRow());
  await f.tap('[data-narrator="Test science"]');
  await sleep(400);
  const picks = await ev(`[...document.querySelectorAll('.sheet [data-pick]')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())`);
  ok(picks.length === 4 && picks[0].startsWith('Heart') && picks.some(p => p.startsWith('Bella') && p.includes("own")) && picks.some(p => p.startsWith('Chatterbox A')), 'the four narrators, the topic\'s own marked', picks);
  ok((await ev(`document.querySelectorAll('.sheet [data-hear]:not([disabled])').length`)) === 4, 'each with a small play button beside it, its sample on the phone');
  await shot('41-narrators');
  await f.tap('.sheet [data-hear=heart]');
  await sleep(200);
  ok(JSON.stringify((await ev('__primer.app.heardSamples || []')).at(-1)) === '{"id":"heart","played":true}' && (await ev(`__primer.store.get('prefs')`)).narrators['Test science'] === undefined, "the play button plays Heart's sample without choosing her", await ev('__primer.app.heardSamples || []'));
  await f.tap('.sheet [data-pick=george]');
  await sleep(150);
  ok((await ev(`__primer.store.get('prefs')`)).narrators['Test science'] === 'george' && (await narratorRow()) === 'Test science / George', 'choosing George is kept, for the whole subject');
  ok(await waitFor(`(document.querySelector('#narratornote')||{}).textContent === "George's voice is on this phone."`, 15000), "his voice comes down then, and it says so", await narratorNote());
  ok((await voiceOnPhone()) === '{"george":10}', "and Bella's clips go, as no subject uses her now", await voiceOnPhone());
  ok(JSON.stringify(await samplesOnPhone()) === '["narrators/bella.","narrators/chatterbox-a.","narrators/george.","narrators/heart."]', "while every narrator's sample stays, whichever is in use", await samplesOnPhone());
  ok(JSON.stringify((await ev('__primer.app.heardSamples || []')).at(-1)) === '{"id":"george","played":true}', 'choosing George played his sample', await ev('__primer.app.heardSamples || []'));
  await shot('41b-narrator-fetched');
  await f.tap('.tab[data-tab=learn]');
  await sleep(300);
  await openNode('engine');
  ok((await scene()).narrators.every(n => n === 'george') && await waitFor(`__primer.run.scene.debug().voiced`, 4000), 'its scenes speak with George\'s clips');
  await control('close');
  await sleep(300);
  await f.tap('.node[data-node=with-scene]');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  ok(await waitFor(`__primer.run.reader.heard.some(h => h.id === 'before.text' && h.narrator === 'george')`, 5000), 'and its lessons too', await ev('__primer.run.reader.heard'));
  await f.tap('[data-go=leave]');
  await sleep(300);
  // A change with no signal: it's kept, it says plainly the voice comes later, and meanwhile the words play on.
  await b.send('Network.enable');
  await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await f.tap('.tab[data-tab=profile]');
  await sleep(400);
  await f.tap('[data-narrator="Test science"]');
  await sleep(400);
  await f.tap('.sheet [data-pick=bella]');
  ok(await waitFor(`(document.querySelector('#narratornote')||{}).textContent.startsWith('No signal')`, 15000) && (await narratorRow()) === 'Test science / Bella',
    'with no signal, the change still takes, and it says plainly the voice comes when there is signal', await narratorNote());
  await shot('41c-narrator-offline');
  ok((await voiceOnPhone()) === '{"george":10}', 'nothing could come down, so the phone still holds what it had', await voiceOnPhone());
  ok((await narratorNote()).includes('Until then, George goes on narrating Test science.'), 'and the note says the old voice goes on meanwhile', await narratorNote());
  await f.tap('.tab[data-tab=learn]');
  await sleep(300);
  await openNode('engine');
  d = await scene();
  ok(d.narrators.every(n => n === 'george') && await waitFor(`__primer.run.scene.debug().voiced && __primer.run.scene.debug().clip`, 4000), "a new narrator with no signal: the old one's voice goes on (George's clips are all here), never silent captions", d.narrators);
  ok(await sceneState('ended', 30000) && (await scene()).fired.length === 6, 'and it plays to its end, every action on its word');
  await control('close');
  await sleep(300);
  await f.tap('.node[data-node=with-scene]');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  ok(await waitFor(`__primer.run.reader.heard.some(h => h.id === 'before.text' && h.narrator === 'george')`, 5000), "a lesson's words are read in the old voice too", await ev('__primer.run.reader.heard'));
  await f.tap('[data-go=leave]');
  await sleep(300);
  // signal back, but one of Bella's clips won't come down: half a new voice is never used
  await api('/__refuse?match=turn.bella');
  await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await ev('__primer.app.pullNow()');
  ok((await voiceOnPhone()) === '{"bella":9,"george":10}', "with one of Bella's clips still missing, George's are kept beside the nine of hers that came", await voiceOnPhone());
  await openNode('engine');
  d = await scene();
  ok(d.narrators.every(n => n === 'george'), 'and George still narrates it all: never two voices in one topic', d.narrators);
  await control('close');
  await sleep(300);
  await f.tap('.tab[data-tab=profile]');
  await sleep(300);
  await ev('__primer.app.fetchVoice("Test science", "Bella").then(r => { document.querySelector("#narratornote").hidden = false; document.querySelector("#narratornote").textContent = r.words; })');
  ok((await narratorNote()).startsWith("1 of Bella's clips aren't down yet") && (await narratorNote()).includes('George goes on narrating'), 'Profile says how many are still to come, and who narrates meanwhile', await narratorNote());
  await f.tap('.tab[data-tab=learn]');
  await sleep(300);
  await api('/__refuse');
  await ev('__primer.app.pullNow()');
  ok((await voiceOnPhone()) === '{"bella":10}', "once every one of Bella's clips is here, she takes over and George's go", await voiceOnPhone());
  await openNode('engine');
  ok(await waitFor(`__primer.run.scene.debug().voiced && __primer.run.scene.debug().narrators.every(n => n === 'bella')`, 4000), 'and it speaks in her voice');
  await control('close');
  await sleep(300);
  console.log('Offline, a line changed since voicing, and the phone\'s sound left alone');
  await b.send('Network.enable');
  await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await openNode('engine');
  await waitFor(`__primer.run.scene.debug().clip && __primer.run.scene.debug().clip.time > 0.6`, 6000);
  ok((await scene()).voiced, 'with no signal, the clips play from the phone');
  await control('close');
  await f.tap('.node[data-node=with-scene]');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  ok(await waitFor(`__primer.run.reader.now() && __primer.run.reader.now().time > 0.3`, 5000), "and a lesson's words are read with no signal too");
  await f.tap('[data-go=leave]');
  await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const changed = JSON.parse(readFileSync(join(SCENES, 'topics', 'scene-topic', 'engine.json'), 'utf8'));
  changed.lines[1].text = 'A storm appears over the warm sea.';
  await fetch(`${API}/__put?path=${encodeURIComponent('topics/scene-topic/engine.json')}`, { method: 'POST', body: JSON.stringify(changed) });
  await ev('__primer.sync.pull()');
  await reloadLibrary();
  await sleep(300);
  await openNode('engine');
  ok(JSON.stringify((await scene()).narrators) === '["bella",null,"bella","bella"]', 'a line changed after it was voiced plays from its caption, never with a clip that says something else', (await scene()).narrators);
  await control('close');
  ok((await ev('window.__sessionSets.length')) === 0 && (await ev('navigator.audioSession.type')) === 'auto', "through all of it, the phone's sound was never claimed (audioSession left alone)", await ev('window.__sessionSets'));
  await api('/__reset?data=fixtures');
  await ev('__primer.sync.pull()');
  await reloadLibrary();
  await ev(`__primer.app.setPref('topic','test-topic'); __primer.app.setPref('voice', true); __primer.app.setPref('narrators', {}); true`);

  console.log('Offline, and the service worker');
  const ownFiles = [];
  const walk = d => { for (const n of readdirSync(join(ROOT, d))) { const p = join(d, n); if (statSync(join(ROOT, p)).isDirectory()) walk(p); else ownFiles.push(p.split(sep).join('/')); } };
  for (const d of ['css', 'js', 'parts', 'vendor', 'icons', 'sounds']) walk(d);
  const swText = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  // (the sound library's candidates are for picking by ear, not the app's: what it plays is copied to sounds/)
  const missing = ownFiles.filter(p => !p.endsWith('.md') && !p.startsWith('sounds/library/') && !swText.includes(`'${p}'`));
  ok(missing.length === 0, "every one of the app's files is kept for offline", missing);
  const appVersion = readFileSync(join(ROOT, 'js', 'app.js'), 'utf8').match(/const VERSION = '([^']+)'/)[1];
  const swVersion = swText.match(/const VERSION = '([^']+)'/)[1];
  ok(appVersion === swVersion, 'the version is the same in sw.js and js/app.js', `${appVersion} ${swVersion}`);
  // Caches another page and an older release left behind, made before the worker arrives.
  await go(APP);
  await ev(`caches.open('primer-stage0-phone-0.1.0').then(c=>c.put('/primer/stage0/phone/x.txt', new Response('the test page')))`);
  await ev(`caches.open('primer-app-0.0.1').then(c=>c.put('/primer/old.txt', new Response('an old release')))`);
  await ev(`caches.open('riffle-9.9.9').then(c=>c.put('/riffle/x.txt', new Response('another app')))`);
  await go(`${APP}&sw=1`);
  ok(await waitFor('!!navigator.serviceWorker.controller', 15000), 'the app installs for offline use');
  const keys = await ev('caches.keys()');
  ok(keys.includes(`primer-app-${swVersion}`) && !keys.includes('primer-app-0.0.1'), 'its cache is primer-app-<version>, and older releases of it are cleared', keys);
  ok(keys.includes('primer-stage0-phone-0.1.0') && keys.includes('riffle-9.9.9'), "the stage 0 test page's caches, and other apps', survive", keys);
  await fetch(`${BASE}/__served?clear=1`);
  await ev(`Promise.all(['/primer/js/ui.js','/primer/stage0/screens/index.html','/primer/docs/spec.md'].map(u=>fetch(u).then(r=>r.status)))`);
  const served = await (await fetch(`${BASE}/__served`)).json();
  ok(!served.includes('/primer/js/ui.js'), "the app's own files come from its cache", served);
  ok(served.includes('/primer/stage0/screens/index.html') && served.includes('/primer/docs/spec.md'), 'stage 0 and the docs go straight to the network', served);
  await b.send('Network.enable');
  await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await go(`${APP}&sw=1`);
  ok((await text()).includes('Test topic') || (await text()).includes('Learn'), 'with no signal at all, the app opens', await text());
  await f.tap('.tab[data-tab=learn]');
  await sleep(400);
  await f.tap('.node');
  await f.tap('.callout [data-go=start]');
  ok(await waitFor(`!!document.querySelector('.lstage canvas')`), 'and a lesson plays, its globe and all');
  await shot('18-offline-lesson');
  await f.tap('[data-go=leave]');
  await b.send('Page.navigate', { url: `${BASE}/primer/stage0/screens/index.html` });
  await sleep(1200);
  ok(!(await ev(`!!document.getElementById('app')`).catch(() => false)), "offline, a stage 0 page isn't answered with the app");
  await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await fetch(`${BASE}/__swbump`);
  await go(`${APP}&sw=1`);
  await waitFor(`navigator.serviceWorker.getRegistration().then(r=>!!r&&!r.installing&&!r.waiting)`);
  await sleep(800);
  const keys2 = await ev('caches.keys()');
  ok(keys2.includes('primer-stage0-phone-0.1.0'), 'a new release of the app leaves the stage 0 caches alone too', keys2);

  ok(b.errors.filter(e => !/Failed to fetch|ERR_INTERNET_DISCONNECTED|net::/.test(e)).length === 0, 'no errors in the console', b.errors.slice(0, 5));
} catch (e) {
  failed++;
  console.log('STOPPED:', e.message, b.errors.slice(0, 5));
  await shot('stopped').catch(() => {});
}
console.log(`\n${passed} passed, ${failed} failed. Pictures in ${SHOTS}`);
await b.close();
if (server) server.kill();
process.exit(failed ? 1 : 0);
