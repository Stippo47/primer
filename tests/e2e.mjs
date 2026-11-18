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
const openNode = async id => {
  await f.tap(`.node[data-node=${id}]`);
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  await sceneState('ready');
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
// Gives an answer the way a finger would: turns the dial round its ring, drags the pile's level, draws
// the strings, carries things into bins and pieces into sockets, taps the slider's track.
const answerBy = async (inp, value) => {
  if (inp.form === 'dial') {
    const from = (await ev('__primer.run.input.state()')).value, pts = [];
    for (let k = 0; k <= 16; k++) pts.push(await dialAt(from + ((value - from) * k) / 16, inp));
    await along(pts);
  } else if (inp.form === 'pile') {
    const h = await f.rect('.pi-handle');
    const y = await ev(`(()=>{const r=[...document.querySelectorAll('.pi-row')].map(e=>e.getBoundingClientRect().top),rowH=r[0]-r[1];return r[0]+rowH-rowH*${value}/${inp.per || 5}})()`);
    await f.drag(h.x, h.y, 0, y - h.y, { steps: 14, ms: 380 });
  } else if (inp.form === 'slider') {
    const t = await f.rect('.pi-track');
    const pos = inp.scale === 'log' ? Math.log(value / inp.min) / Math.log(inp.max / inp.min) : (value - inp.min) / (inp.max - inp.min);
    await f.tapAt(t.left + pos * t.w, t.y);
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
  ok(v.verdict === 'Not quite' && v.why === 'It was 7.' && (await ev(`document.querySelector('.pi-truthline').textContent`)) === '7', 'a wrong number shows the truth', v);
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
  const sliderNow = () => ev(`(()=>{const r=document.querySelector('.pi.form-slider'),q=s=>r.querySelector(s),th=q('.pi-thumb');return {chip:q('.pi-chip').textContent,fill:q('.pi-fill').getBoundingClientRect().width,
    pic:q('.pi-pic svg') ? q('.pi-pic svg').getAttribute('class') : null,body:(q('.pi-pic .body')||{getAttribute:()=>null}).getAttribute('fill'),snow:Number((q('.pi-pic .snow')||{getAttribute:()=>0}).getAttribute('opacity')),
    flame:Number((q('.pi-pic .flame')||{getAttribute:()=>0}).getAttribute('opacity')),warm:Number((q('.pi-pic .w1')||{getAttribute:()=>0}).getAttribute('height')),
    state:__primer.run.input.state(),awake:!document.querySelector('.lfoot .btn').disabled,left:th.style.left,transform:th.style.transform,willChange:getComputedStyle(th).willChange}})()`);
  let sl = await sliderNow();
  ok(sl.chip === '5°C' && sl.fill > 10 && sl.state.value === 5 && sl.state.answered && sl.awake, 'a slider starts at a real value with its fill showing, and Check awake: never "?"', sl);
  ok(sl.pic === 'pic-warmth' && sl.snow > 0.95 && sl.flame < 0.05, 'its picture is there: at 5 °C, a snowflake in an icy ball', sl);
  await shot('14a-slider-start');
  const tr = await f.rect('.pi-track');
  await f.drag(tr.left + tr.w * (5 / 40), tr.y, tr.w * (28 / 40), 0, { steps: 16, ms: 420 });
  await sleep(200);
  const hot = await sliderNow();
  ok(hot.state.value >= 31 && hot.snow < 0.05 && hot.flame > 0.5 && hot.body !== sl.body, 'dragged up to the hot end, the snowflake has gone and a fire has come', hot);
  ok(hot.left === '' && /translate3d/.test(hot.transform) && hot.willChange === 'transform', 'the thumb moves by transform on its own layer, so nothing under it is repainted', hot);
  await shot('14b-slider-hot');
  await f.tapAt(tr.left + tr.w * (30 / 40), tr.y);
  await sleep(150);
  await press();
  ok((await verdict()).verdict === 'Right', 'and it marks the value it was set to');
  await press();
  await waitFor(`__primer.run.step.id === 'q-deep' && __primer.run.input`);
  await sleep(200);
  sl = await sliderNow();
  ok(sl.pic === 'pic-depth' && sl.chip === '2 m' && sl.warm < 20, 'another picture, the same setting: the depth one starts with a thin warm layer', sl);
  const tr2 = await f.rect('.pi-track');
  await f.tapAt(tr2.left + tr2.w * (2 / 3), tr2.y);
  await sleep(150);
  const deep = await sliderNow();
  ok(deep.state.value === 100 && deep.warm > sl.warm + 30, 'set deeper on its stretched scale, the warm layer goes deeper', deep);
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
        ok(st.answered && JSON.stringify(st.value) === JSON.stringify(value), `${s.id} (${s.input.form}): answered ${pass} by touch`, st);
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
    ok(['dial', 'pile', 'string', 'sort', 'snap'].every(form => tried.filter(e => e.form === form).length >= 2), 'every attempt with the newer forms is recorded, with the form', tried.map(e => e.form));
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
  ok(await bare() && ['choice', 'slider', 'dial', 'number', 'pile', 'order', 'string', 'sort', 'snap', 'match', 'spot'].every(x => formsOffered.includes(x)), 'it opens every answer form, with its settings', formsOffered);
  for (const form of ['dial', 'pile', 'string', 'sort', 'snap']) {
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(500);
    ok(await ev(`!!document.querySelector('.partstage .form-${form}')`), `${form} opens there, to try by hand`);
    await shot(`17c-forms-${form}`);
  }
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
  for (const form of ['slider', 'order', 'match', 'number', 'spot']) {
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(300);
    ok(await ev(`!!document.querySelector('.partstage .form-${form}')`), `Inputs still opens as ${form} (number, match and spot unchanged)`);
  }
  for (const form of ['slider', 'order', 'dial', 'pile', 'string', 'sort', 'snap']) {
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(400);
    if (form === 'slider') {
      const t = await f.rect('.pi-track');
      await f.drag(t.left + 10, t.y, t.w * 0.8, 0, { steps: 20, ms: 500 });
      await f.drag(t.left + t.w * 0.8, t.y, -t.w * 0.6, 6, { steps: 25, ms: 600 });
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
    const diff = differing(before.data, after.data);
    ok(diff === 0, `${form}: after dragging back and forth, nothing is left behind (${diff} pixels differ from a full repaint)`);
  }
  ok(!(await ev(`[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).some(t=>/pi-item\\.lift/.test(t)&&/box-shadow:[^;]*\\d+px \\d+px [1-9]/.test(t))`)), 'a lifted item has no blurred shadow');
  await f.tap('[data-go=back]');
  await sleep(300);

  console.log('Every part, with every setting at its extremes');
  await ev(`(()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px;z-index:50;background:#141a3c';document.body.append(d)})()`);
  const extremes = (spec, example) => {
    if (spec.type === 'choice') return spec.options;
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
  ok(JSON.stringify(parts) === JSON.stringify(['map', 'inputs']), 'the kit is the map and the inputs: the globe is a preset of the map, not a part of its own', parts);
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
          for (const val of extremes(spec, example[k])) cases.push({ form, projection, k, val, settings: { ...example, [k]: val } });
        }
      }
    }
    let drew = 0, touched = 0, cleaned = 0, problems = [];
    for (const c of cases) {
      const label = `${name}${c.form ? `/${c.form}` : ''}${c.projection ? `/${c.projection}` : ''} ${c.k}=${JSON.stringify(c.val).slice(0, 30)}`;
      await ev(`(async()=>{const el=document.getElementById('bench');el.innerHTML='';window.__h=await __primer.parts.mount(${JSON.stringify(name)},el,${JSON.stringify(c.settings)},{media:p=>'/primer/../__gh/__none/'+p});})()`);
      await sleep(name === 'map' ? 250 : 80);
      // it draws
      const drawn = await ev(name === 'map'
        ? `(()=>{const c=document.querySelector('#bench canvas');const g=c.getContext('2d');const d=g.getImageData(c.width/2-20,c.height/2-20,40,40).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n>100})()`
        : `(()=>{const r=document.querySelector('#bench .pi');return !!r&&r.getBoundingClientRect().height>30&&r.children.length>0})()`);
      if (drawn) drew++; else problems.push(`${label}: drew nothing`);
      // it answers a finger
      let moved = false;
      if (name === 'map') {
        const c = await f.rect('#bench canvas');
        await f.tapAt(c.x, c.y);
        moved = !!(await ev('__h.state().tapped'));
      } else {
        const form = c.form;
        const before = JSON.stringify(await ev('__h.state()'));
        if (form === 'choice') await f.tap('#bench .pi-opt');
        if (form === 'slider') { const t = await f.rect('#bench .pi-track'); await f.tapAt(t.left + t.w * 0.7, t.y); }
        if (form === 'number') await f.tap('#bench .pi-key[data-k="7"]');
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
    const drawnTo = await pixelAt([-45, 15]), notYet = await pixelAt([-73, 30]);
    ok(drawnTo.every(x => x > 200) && !notYet.every(x => x > 200), `${projection}: a track is drawn as far as its progress, and no further`, { drawnTo, notYet });
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
    ok(topicFile.level === 'tour' && topicFile.path.filter(n => n.kind === 'lesson').length === 2, 'it is a Tour: two lessons, then a chest and a test');
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
        // The pilot's scene, voiced for real: played through with its own clips, its wait answered.
        const file = JSON.parse(readFileSync(join(dir, `${node.id}.json`), 'utf8'));
        const timing = JSON.parse(readFileSync(join(dir, 'voice', `${node.id}.json`), 'utf8'));
        await ev(`__primer.app.setPref('voice', true); true`);
        await openNode(node.id);
        const first = await scene();
        ok(first.narrators.every(n => n === (topicFile.narrator || 'heart')), `${node.id}: every line has its clip, in the topic's narrator`, first.narrators);
        await f.tap('.sbig');
        const waitLine = file.lines.find(x => x.wait);
        ok(await sceneState('wait', 90000), `${node.id}: played on its voice, line by line, to its wait`);
        await shot(`21-pilot-${node.id}-wait`);
        const tr = waitLine.wait.tries.find(x => x.marked === 'right').state.tapped;
        const p = await ev(`__primer.run.scene.handles.globe.where([${tr.lon},${tr.lat}])`);
        await f.tapAt(p.x, p.y);
        await sleep(300);
        await press();
        const vd = await verdict();
        ok(vd.verdict === 'Right', `${node.id}: its wait, answered right`, vd);
        await press();
        await sceneState('ended', 90000);
        const fired = (await scene()).fired;
        const want = file.lines.reduce((n, x) => n + (x.do || []).length, 0);
        const lags = fired.map(x => +(x.at - x.want).toFixed(3));
        ok(fired.length === want && fired.every(x => x.voiced) && lags.every(x => x >= -0.001 && x < 0.05), `${node.id}: all ${want} actions fired on their words, on the voice's clock (late by ${lags.join(', ')} s)`, fired);
        const said = file.lines.filter(x => (x.do || []).length).every(x => (x.do || []).every((a, n) => {
          const f0 = fired.find(y => y.line === x.id && y.n === n);
          const ws = timing.lines[x.id][topicFile.narrator || 'heart'].words;
          const words = (x.say || x.text).split(/\s+/).map(w => w.replace(/[*’]/g, m => (m === '’' ? "'" : '')).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
          // an action hangs on a word (at), or runs across a stretch (from .. to) and starts on its first word
          const k = words.indexOf(String(a.at ?? a.from).toLowerCase().split(/\s+/)[0]);
          return f0 && k >= 0 && Math.abs(f0.want - ws[k][1]) < 0.001;
        }));
        ok(said, `${node.id}: each at the time its word is said in the clip, by the timing file (a stretch from its first word)`);
        // a stretch carries its call across to its last word: the storm that formed on "cloud" has moved along its track by the end
        const stretches = file.lines.flatMap(x => (x.do || []).filter(a => a.from !== undefined).map(a => a.call));
        if (stretches.length) {
          const routes = await ev(`__primer.run && __primer.run.scene ? __primer.run.scene.handles.globe.debug().routes : []`);
          ok(routes.some(r => r.rider === 'storm' && r.progress > 0.99), `${node.id}: the storm rode its track to the end of its stretch`, routes);
        }
        await shot(`21-pilot-${node.id}-end`);
        await press();
        await sleep(400);
        ok(await ev(`document.querySelector('.node[data-node=${node.id}]').classList.contains('done')`), `${node.id}: done, and the path goes on`);
        played++;
        asked += file.lines.filter(x => x.wait).length;
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
              const r = await f.rect('.pi-track');
              const log = inp.scale === 'log';
              const pos = right ? (log ? Math.log(s.answer / inp.min) / Math.log(inp.max / inp.min) : (s.answer - inp.min) / (inp.max - inp.min)) : 0.95;
              await f.tapAt(r.left + pos * r.w, r.y);
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
    for (let k = 0; k < 20 && !pictured; k++) {
      await waitFor(`__primer.run && __primer.run.step && (!!__primer.run.input || !!__primer.run.play)`);
      await sleep(400);
      const s = await ev('__primer.run.step');
      if (s.figure && s.figure.part && s.input && s.input.form === 'choice') { pictured = s; break; }
      await answerStep(true);
      await press();
      await press();
    }
    ok(!!pictured, 'a pilot review question brings its picture: the globe turned to its ocean', pictured && pictured.id);
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
    ok(d.combo === 3 && d.chip.tier === 'plain' && (await ev(`document.querySelector('.combo').classList.contains('on') && document.querySelector('.combo').innerText.trim() === '×3' && document.querySelectorAll('.cpips i.on').length === 3`)),
      'three right in a row: the chip counts ×3, still plain (a tier starts at five), with three pips', d);
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
      const TIERS = await ev(`import('/primer/js/combo.js').then(m => m.TIERS)`);
      const want = { 0: 'plain', 4: 'plain', 5: 'bronze', 9: 'bronze', 10: 'silver', 14: 'silver', 15: 'gold', 24: 'gold', 25: 'crystal', 39: 'crystal', 40: 'diamond', 59: 'diamond', 60: 'aurora', 999: 'aurora' };
      const got = {};
      for (const n of Object.keys(want)) got[n] = await comboTier(n);
      ok(JSON.stringify(TIERS.map(t => `${t.id}@${t.at}`)) === '["plain@0","bronze@5","silver@10","gold@15","crystal@25","diamond@40","aurora@60"]' && Object.entries(want).every(([n, id]) => got[n] === id),
        'the tiers, in one table: plain, then bronze at 5, silver at 10, gold at 15, crystal at 25, diamond at 40 and aurora at 60', { TIERS, got });
      // the chip is one part of its own: anything can show one
      const alone = await ev(`import('/primer/js/combo.js').then(m => { const h = document.createElement('div'); document.body.append(h); const c = new m.Combo(h, { count: 40, pips: false }); const d = c.debug(); c.remove(); h.remove(); return d })`);
      ok(alone.tier === 'diamond' && alone.text === '×40' && alone.idle && alone.pips === null, 'the chip stands alone: drawn at 40 on a bare element, it is diamond, ×40, already idling', alone);
      await f.tap('.review [data-go=review]');
      await live();
      let c0 = (await dbg()).chip;
      ok(c0.tier === 'plain' && c0.text === '×0' && !c0.idle && c0.moving === 0, 'a run starts plain, at ×0, with nothing moving', c0);
      const chipNow = async () => (await dbg()).chip;
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
          && after.pips === 5 && after.pipTier.includes(`tier-${t.id}`) && after.idle && after.moving > 0 && !after.ghost && after.bits === 0,
          `${t.at} in a row reaches ${t.id}: the chip swells into it with a burst and a tick (the Check press's and its own), its pips fill in its colour, and its idle motion starts`, { before: before.tier, mid, after, ticked });
        if (t.id === 'gold' || t.id === 'aurora') await shot2(`49-combo-${t.id}`);
        await press();
      }
      // a miss: the chip falls back to plain, softly
      await live();
      await ev(`__primer.run.setCombo(17); true`);
      await answerStep(false);
      await f.tap('.lfoot .btn');
      await sleep(120);
      const falling = await chipNow();
      await sleep(900);
      const fallen = await chipNow();
      ok((await verdict()).verdict === 'Not quite' && falling.ghost && falling.tier === 'plain' && fallen.tier === 'plain' && fallen.text === '×0' && fallen.pips === 0 && !fallen.ghost && fallen.moving === 0 && fallen.last.kind === 'fall',
        'a miss drops it to plain ×0: the gold chip sinks away and fades, then nothing moves', { falling, fallen });
      await press();
      // reduced motion: the tiers change colour, and nothing idles, swells or falls
      await live();
      await ev(`__primer.run.setCombo(42); true`);
      await sleep(200);
      const moving = (await chipNow()).moving;
      await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await sleep(300);
      const stilled = await chipNow();
      ok(moving > 0 && stilled.tier === 'diamond' && stilled.moving === 0, `with the system's reduce motion on, the diamond chip keeps its look and its idle motion stops (${moving} moving before, ${stilled.moving} after)`, { moving, stilled });
      await ev(`__primer.run.setCombo(59); true`);
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
      const stillDown = await chipNow();
      ok(stillDown.tier === 'plain' && stillDown.text === '×0' && !stillDown.ghost && stillDown.moving === 0, 'and a miss drops it to plain at once, with no fall', stillDown);
      await b.send('Emulation.setEmulatedMedia', { features: [] });
      await press();
      // the run's best (60) shows its tier in the summary, on Practice and in Profile
      await f.tap('[data-go=leave]');
      await waitFor(`!!document.querySelector('.rend')`);
      await sleep(400);
      const best = (await dbg()).best;
      ok(best === 60 && await ev(`document.querySelector('.rend .crownbig').classList.contains('tier-aurora') && document.querySelector('.rend .rays').classList.contains('tier-aurora') && document.querySelector('.rend .crownbig').innerText.includes('×60')`),
        "the summary's crown, its number and the light behind it are in the best run's tier: aurora, ×60", best);
      await shot2('49-combo-summary');
      await press();
      ok(await ev(`document.querySelector('.review .crownchip').classList.contains('tier-aurora') && document.querySelector('.review .crownchip').innerText.trim() === '×60'`), "Practice's crown chip is aurora, ×60");
      await f.tap('.tab[data-tab=profile]');
      await sleep(400);
      ok(await ev(`document.querySelector('#bestcombo').classList.contains('tier-aurora') && document.querySelector('#bestcombo').innerText.trim() === '×60'`), "and so is Profile's best-combo tile");
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

  console.log('Narrated scenes: the voice is the clock');
  // As on an iPhone: a page can say what kind its sound is. A spy notes every attempt to say so.
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{let t='auto';window.__sessionSets=[];Object.defineProperty(navigator,'audioSession',{configurable:true,value:{get type(){return t},set type(v){window.__sessionSets.push(v);t=v}}})})()` });
  const SCENES = join(ROOT, 'tests', 'fixtures', 'scenes');
  const engineVoice = JSON.parse(readFileSync(join(SCENES, 'topics', 'scene-topic', 'voice', 'engine.json'), 'utf8'));
  // In the page, so it's quick: waits for a line to be playing on its clip, and holds the clip's <audio> still.
  const holdClip = id => ev(`new Promise(r=>{const iv=setInterval(()=>{const s=__primer.run.scene;if(s.debug().id===${JSON.stringify(id)}&&s.clip&&s.clip.status==='playing'){s.clip.el.pause();clearInterval(iv);r(s.clip.time)}},4)})`);
  await api(`/__reset?data=${encodeURIComponent(SCENES)}`);
  await go();
  await ev(`__primer.store.del('progress')`);
  await ev('__primer.data.loadProgress()');
  await ev('__primer.sync.pull()');
  await reloadLibrary();
  await ev(`__primer.app.setPref('topic','scene-topic'); __primer.app.setPref('voice', true); __primer.app.setPref('narrators', {}); true`);
  await f.tap('.tab[data-tab=practice]');
  await f.tap('.tab[data-tab=learn]');
  await sleep(400);
  ok(JSON.stringify(await ev(`[...document.querySelectorAll('.node')].map(n=>n.dataset.kind+':'+n.className.split(' ')[1])`)) === '["animation:now","lesson:todo"]', 'an animation with its scene file is a node to play, like a lesson');
  ok((await ev(`__primer.store.files.all().then(a=>a.filter(f=>f.path.includes('/voice/')&&f.path.endsWith('.m4a')&&f.data instanceof Blob).length)`)) === 12, 'its clips came down with the lesson\'s media, to play offline');
  await openNode('engine');
  let d = await scene();
  ok(await bare() && (await text()).includes('First the globe turns to Brazil') && await ev(`!!document.querySelector('.scene[data-state=ready] .sbig') && document.querySelectorAll('.spips i').length === 4`), 'it opens on its first line, captioned, with a play button and a pip per line');
  ok((await btn()).disabled && (await btn()).text === 'Continue', 'Continue waits for the end');
  ok(d.narrators.every(n => n === 'bella') && await ev(`__primer.run.scene.urls.every(u => u && u.url.startsWith('blob:'))`), "the topic's narrator, Bella, with every clip made ready before the tap", d.narrators);
  ok((await ev('__primer.run.scene.clips.length')) === 0, 'no player is made before the tap');
  await shot('30-scene-ready');
  await f.tap('.sbig');
  await waitFor(`__primer.run.scene.debug().fired.length >= 2`, 10000);
  d = await scene();
  ok(d.sound && d.voiced && d.clip && ['playing', 'ended'].includes(d.clip.status), "the tap starts the voice, and the line follows its clip's clock", d.clip);
  const lags = d.fired.map(x => +(x.at - x.want).toFixed(3));
  ok(d.fired.every(x => x.voiced) && lags.every(x => x >= -0.001 && x < 0.05), `actions fire at their words, within a frame or two of the clip's clock (late by ${lags.join(', ')} s)`, d.fired);
  const wantTurn = engineVoice.lines.turn.bella.words;
  ok(Math.abs(d.fired[0].want - wantTurn[5][1]) < 0.001 && Math.abs(d.fired[1].want - wantTurn[9][1]) < 0.001, 'each at the time its word is said in the timing file ("Brazil", then "lights")');
  await shot('31-scene-turn');
  // The clip is the clock: held still, the picture waits for it.
  const heldAt = await holdClip('storm');
  await sleep(1000);
  const whileHeld = (await scene()).fired.filter(x => x.line === 'storm').length;
  ok(heldAt < 0.4 && whileHeld === 0, `with the clip held still for a second (at ${heldAt.toFixed(2)} s), nothing on the line happens: the sound is the clock, not the time since the tap`);
  await ev('__primer.run.scene.clip.el.play(); true');
  await waitFor(`__primer.run.scene.debug().fired.filter(x=>x.line==='storm').length >= 2`, 6000);
  const stormLags = (await scene()).fired.filter(x => x.line === 'storm').map(x => x.at - x.want);
  ok(stormLags.every(x => x >= -0.001 && x < 0.05), 'let go, its words come and the actions with them, still on time', stormLags);
  // Pause with a tap on the picture, and carry on, on a fresh player.
  await waitFor(`(d=>d.id==='tap'&&d.state==='playing'&&d.t>0.25)(__primer.run.scene.debug())`, 6000);
  await ev(`window.__before = __primer.run.scene.clip; window.__beforeEl = __primer.run.scene.clip.el; true`);
  await f.tap('.sstage');
  await sleep(100);
  const p0 = await scene(), t0 = await ev('__beforeEl.currentTime');
  await sleep(700);
  const p1 = await scene(), t1 = await ev('__beforeEl ? __beforeEl.currentTime : -1');
  ok(p0.state === 'paused' && p1.state === 'paused' && t1 === t0, 'a tap on the picture pauses the voice and the picture both', [p0.state, p1.state, t0, t1]);
  await shot('32-scene-paused');
  await f.tap('.sstage');
  await sleep(400);
  const p2 = await scene();
  ok(p2.state === 'playing' && p2.clip.time >= t0 - 0.01 && await ev(`__primer.run.scene.clip !== __before && __primer.run.scene.clip.el !== __beforeEl`), 'another tap carries on from where it was, on a new player: every play gets a fresh <audio>', [p2.state, p2.clip, t0]);
  // The wait: the scene stops for the person to do something with the globe.
  await sceneState('wait');
  ok((await btn()).text === 'Check' && (await btn()).disabled && (await text()).includes('Now tap anywhere on the sea'), 'a line can wait for the person: Check, asleep until the globe is used');
  ok(await ev(`getComputedStyle(document.querySelector('.spart')).pointerEvents === 'auto'`) && !(await ev(`getComputedStyle(document.querySelector('.scene')).pointerEvents === 'none'`)), 'and only then does the globe take touches');
  const land = await ev(`__primer.run.scene.handles.globe.where([-50,-10])`);
  await f.tapAt(land.x, land.y);
  await sleep(300);
  ok(!(await btn()).disabled, 'a tap on it wakes Check');
  await press();
  let vd = await verdict();
  ok(vd.verdict === 'Not quite' && vd.why === "That's land: tap the sea.", 'and it is marked like a play step, with the line of why', vd);
  await shot('33-scene-wait-marked');
  await press();
  await sceneState('ended');
  d = await scene();
  ok(d.fired.some(x => x.line === 'end' && x.at - x.want < 0.05 && x.at >= x.want - 0.001), 'Continue carries the scene on to its last line ("end" there is a word like any other)');
  ok(!(await btn()).disabled, 'at its end, Continue wakes');
  await shot('34-scene-end');
  await press();
  await sleep(400);
  ok(!(await bare()) && await ev(`document.querySelector('.node[data-node=engine]').classList.contains('done') && document.querySelector('.node[data-node=with-scene]').classList.contains('now')`), 'and goes straight back to the path, the animation done');
  const sceneEvents = (await everyEvent()).filter(e => e.topic === 'scene-topic' && e.lesson === 'engine');
  ok(JSON.stringify(sceneEvents.map(e => e.type)) === '["start","attempt","seen","finish"]' && sceneEvents[1].kind === 'scene' && sceneEvents[1].line === 'tap' && sceneEvents[1].right === false && sceneEvents[1].value.tapped.land === true,
    'it is saved and sent like a lesson: a start, the wait\'s attempt, seen, finished', sceneEvents.map(e => `${e.type}${e.line ? ':' + e.line : ''}`));

  console.log('Back, skip and leaving');
  await openNode('engine');
  await f.tap('.sbig');
  await waitFor(`__primer.run.scene.debug().id === 'storm' && __primer.run.scene.debug().t > 0.5`, 10000);
  await f.tap('[data-sc=back]');
  await waitFor(`__primer.run.scene.state === 'playing'`, 4000);
  d = await scene();
  const centreBack = await ev('__primer.run.scene.handles.globe.state().centre');
  ok(d.id === 'turn' && Math.abs(centreBack[0] + 40) < 3 && Math.abs(centreBack[1] - 10) < 3, 'back, early in a line, goes to the line before, with the picture rebuilt as it was then (the globe back where it started)', { id: d.id, centreBack });
  await waitFor(`__primer.run.scene.debug().t > 1.8`, 6000);
  await f.tap('[data-sc=back]');
  await waitFor(`__primer.run.scene.state === 'playing'`, 4000);
  ok((await scene()).id === 'turn', 'back, later in a line, starts that line again');
  await f.tap('[data-sc=skip]');
  await sleep(150);
  d = await scene();
  const centreSkip = await ev('__primer.run.scene.handles.globe.state().centre');
  ok(d.id === 'storm' && Math.abs(centreSkip[0] + 53) < 9 && Math.abs(centreSkip[1] + 10) < 9 && await ev(`__primer.run.scene.debug().fired.length >= 0`), 'skip goes to the next line, everything left on this one landing at once (the globe already at Brazil)', { id: d.id, centreSkip });
  await f.tap('[data-sc=skip]');
  await sleep(150);
  ok((await scene()).state === 'wait' || (await scene()).id === 'tap', 'skip again, and the wait comes up');
  await f.tap('[data-go=leave]');
  await sleep(400);
  ok(!(await bare()) && (await ev(`__primer.run`)) === null, 'the cross leaves mid-scene, and the voice stops with it');
  ok((await everyEvent()).some(e => e.type === 'leave' && e.lesson === 'engine'), 'leaving early is saved, and the scene stays done from before');

  console.log('Silent: Voice off, captions at reading speed, taps to go on');
  await ev(`__primer.app.setPref('voice', false); true`);
  await f.tap('.node[data-node=with-scene]');
  await sleep(300);
  await f.tap('.callout [data-go=start]');
  await waitFor(`__primer.run && __primer.run.step.id === 'before'`);
  await press();
  await sceneState('ready');
  ok((await ev(`document.querySelector('.svoice').getAttribute('aria-pressed')`)) === 'false', 'a scene step inside a lesson, with Voice off: its speaker shows off');
  ok(await ev(`document.querySelectorAll('.spart').length === 2 && !!document.querySelector('.spart[data-part=globe] canvas') && !!document.querySelector('.spart[data-part=warmth] .pi')`), 'two parts share the picture, one above the other, each named in the calls ("warmth.reveal")');
  await f.tap('.sbig');
  await sceneState('hold');
  d = await scene();
  ok(!d.sound && !d.voiced && (await ev('__primer.run.scene.clips.length')) === 0 && d.fired.length === 1 && !d.fired[0].voiced, 'it runs from the caption at reading speed, the action on its word, no player made', d);
  ok((await ev(`document.querySelector('.snote').textContent`)).includes('Tap to go on') && (await btn()).disabled, 'and at the end of the line it waits for a tap to go on');
  await shot('35-scene-silent-hold');
  await sleep(800);
  ok((await scene()).state === 'hold', 'it waits as long as it takes');
  await f.tap('.scap');
  await sceneState('ended');
  ok((await scene()).fired.length === 3 && !(await ev(`document.querySelector('.spart[data-part=warmth] .pi-chip.truth').hidden`)), 'a tap goes on to the next line, its calls reach both parts, and at the last line\'s end the scene is done');
  await press();
  await waitFor(`__primer.run.step.id === 'after' && __primer.run.input`);
  await f.tap('.pi-opt[data-id=france]');
  await press();
  await press();
  ok((await text()).includes('Lesson done') && (await text()).includes('1 of 1 right'), "a scene step isn't counted as a question", await text());
  await press();
  ok((await everyEvent()).some(e => e.type === 'seen' && e.lesson === 'with-scene' && e.step === 'tour'), 'a scene step is saved as seen, like an explain step');

  console.log('When no sound plays, it reads on by itself');
  await ev(`__primer.app.setPref('voice', true); window.__realPlay = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; true`);
  await openNode('engine');
  await f.tap('.sbig');
  await sleep(1200);
  ok((await scene()).sound && !(await scene()).failed, 'a clip whose clock stands still is not called silent at once');
  await waitFor(`__primer.run.scene.debug().failed`, 5000);
  d = await scene();
  ok(d.failed === 'silent' && !d.sound && (await ev(`document.querySelector('.snote').textContent`)).includes('No sound played'), 'after about 2.5 seconds it is, and says so, and the line reads on from its caption', d);
  await sceneState('hold');
  ok((await scene()).fired.filter(x => x.line === 'turn').length === 2, 'what hangs on the line still happens, on the reading clock');
  await shot('36-scene-no-sound');
  await ev(`HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('Not allowed', 'NotAllowedError')); }; true`);
  await f.tap('[data-sc=voice]');
  await sleep(300);
  await f.tap('[data-sc=back]');
  await sleep(600);
  d = await scene();
  ok(d.failed === 'refused' && !d.sound && (await ev(`document.querySelector('.snote').hidden`)) === false, 'a clip the phone refuses to start falls back to the caption at once', d);
  await ev(`HTMLMediaElement.prototype.play = window.__realPlay; true`);
  await f.tap('[data-sc=voice]');
  await sleep(1200);
  d = await scene();
  ok(d.sound && !d.failed && d.clip && d.clip.status === 'playing', 'the speaker tries the voice again, from the same moment', d.clip);
  await f.tap('[data-go=leave]');
  await sleep(300);

  console.log('A narrator per subject');
  await f.tap('.tab[data-tab=profile]');
  await sleep(400);
  const narratorRow = () => ev(`(()=>{const r=document.querySelector('#narrators .srow');return r?r.querySelector('p').textContent+' / '+r.querySelector('button').textContent:null})()`);
  ok((await narratorRow()) === 'Test science / Bella', "Profile lists each subject with its narrator, the topic's own to start with", await narratorRow());
  await f.tap('[data-narrator="Test science"]');
  await sleep(400);
  const picks = await ev(`[...document.querySelectorAll('.sheet [data-pick]')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())`);
  ok(picks.length === 4 && picks[0].startsWith('Heart') && picks.some(p => p.startsWith('Bella') && p.includes("own")) && picks.some(p => p.startsWith('Chatterbox A')), 'the four narrators, the topic\'s own marked', picks);
  await shot('37-narrators');
  await f.tap('.sheet [data-pick=george]');
  await sleep(400);
  ok((await ev(`__primer.store.get('prefs')`)).narrators['Test science'] === 'george' && (await narratorRow()) === 'Test science / George', 'choosing George is kept, for the whole subject');
  await f.tap('.tab[data-tab=learn]');
  await sleep(300);
  await openNode('engine');
  ok((await scene()).narrators.every(n => n === 'george'), 'and its scenes speak with George\'s clips');
  await f.tap('[data-go=leave]');
  await sleep(300);

  console.log('Offline, a line changed since voicing, and the phone\'s sound left alone');
  await b.send('Network.enable');
  await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await openNode('engine');
  await f.tap('.sbig');
  await waitFor(`__primer.run.scene.debug().clip && __primer.run.scene.debug().clip.time > 0.6`, 6000);
  ok((await scene()).voiced, 'with no signal, the clips play from the phone');
  await f.tap('[data-go=leave]');
  await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const changed = JSON.parse(readFileSync(join(SCENES, 'topics', 'scene-topic', 'engine.json'), 'utf8'));
  changed.lines[1].text = 'A storm appears over the warm sea.';
  await fetch(`${API}/__put?path=${encodeURIComponent('topics/scene-topic/engine.json')}`, { method: 'POST', body: JSON.stringify(changed) });
  await ev('__primer.sync.pull()');
  await reloadLibrary();
  await sleep(300);
  await openNode('engine');
  ok(JSON.stringify((await scene()).narrators) === '["george",null,"george","george"]', 'a line changed after it was voiced plays from its caption, never with a clip that says something else', (await scene()).narrators);
  await f.tap('[data-go=leave]');
  ok((await ev('window.__sessionSets.length')) === 0 && (await ev('navigator.audioSession.type')) === 'auto', "through all of it, the phone's sound was never claimed (audioSession left alone)", await ev('window.__sessionSets'));
  await api('/__reset?data=fixtures');
  await ev('__primer.sync.pull()');
  await reloadLibrary();
  await ev(`__primer.app.setPref('topic','test-topic'); __primer.app.setPref('voice', true); __primer.app.setPref('narrators', {}); true`);

  console.log('Offline, and the service worker');
  const ownFiles = [];
  const walk = d => { for (const n of readdirSync(join(ROOT, d))) { const p = join(d, n); if (statSync(join(ROOT, p)).isDirectory()) walk(p); else ownFiles.push(p.split(sep).join('/')); } };
  for (const d of ['css', 'js', 'parts', 'vendor', 'icons']) walk(d);
  const swText = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const missing = ownFiles.filter(p => !p.endsWith('.md') && !swText.includes(`'${p}'`));
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
