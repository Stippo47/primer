// Drives the app in headless Edge with real touch, against tests/serve.mjs and its stand-in for GitHub.
//   node tests/e2e.mjs [--shots <folder>] [--pilot <primer-data folder>]
// Starts the test server itself if nothing answers on its port. Uses debugging port 9341 and server port 8821.
// --pilot (or PRIMER_DATA) also plays the pilot topic from the data repo's working tree: each lesson and the
// test wrong and then right, and its chest.
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
const PORT = 8821, DEBUG = 9341, W = 414, H = 896, SAT = 48, SAB = 34;
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
  ok(await ev(`['test','exam'].every(k=>/<path d="M/.test(document.querySelector('.node[data-kind='+k+'] svg').innerHTML))`), 'a test and an exam are hexagons, as the sketch shows');
  await shot('04-path');
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
  ok(sheet.length === 2 && sheet[0].includes('Test topic') && sheet[0].toUpperCase().includes('TOUR') && sheet[1].toUpperCase().includes('DEEP'), 'the topic list shows each topic with one level word', sheet);
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
  await press();
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
  await shot('13-path-done');

  console.log('A chest');
  await f.tap('.node[data-node=first-chest]');
  await sleep(400);
  ok((await ev(`document.querySelector('.callout').innerText`)).toUpperCase().includes('OPEN'), 'tapping the chest offers to open it');
  await f.tap('.callout [data-go=start]');
  await sleep(900);
  ok(await bare() && (await text()).includes('A chest!') && await ev(`document.querySelector('.chestbig .open').getAttribute('opacity') === '1'`), 'it opens with a small celebration, the tab bar hidden');
  await shot('13b-chest');
  ok((await everyEvent()).some(e => e.type === 'open' && e.node === 'first-chest' && e.kind === 'chest' && e.topic === 'test-topic'), 'opening it is recorded, and goes up with the answers');
  await press();
  ok(!(await bare()) && await ev(`document.querySelector('.node[data-node=first-chest]').classList.contains('done') && /rotate\\(-24/.test(document.querySelector('.node[data-node=first-chest] svg').innerHTML)`), 'back on the path the chest is open, and done');
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

  console.log('A review and an animation, for now');
  for (const [node, words] of [['look-back', 'Review'], ['a-scene', 'A made-up scene']]) {
    await f.tap(`.node[data-node=${node}]`);
    await sleep(300);
    await f.tap('.callout [data-go=start]');
    await sleep(500);
    ok(await bare() && (await text()).includes(words) && (await text()).includes('Soon'), `${words}: a placeholder says it comes later`, await text());
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
  ok(know.length === 2 && /\d+%/.test(know[0].t), 'Knowledge lists each topic with its number', know);
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
  ok(cards.length === 1 && cards[0].startsWith('Globe') && cards[0].includes('from Every kind of step'), 'the Playground lists the tools (the globe), saying which lesson first uses each', cards);
  ok(!(await ev(`!!document.querySelector('.pcard[data-part=inputs]')`)) && (await ev('__primer.parts.listParts()')).includes('inputs'), "Inputs, an answer form, isn't in the list, but is still in the kit for lessons");
  ok(await ev(`document.querySelector('.review .btn').disabled`), "Review's Start is off until stage 2");
  await f.tap('.pcard[data-part=globe]');
  await waitFor(`document.querySelector('.partstage canvas')`);
  ok(await bare(), 'an opened part hides the tab bar');
  const rows = await ev(`[...document.querySelectorAll('.setrow p')].map(p=>p.textContent)`);
  ok(['spin', 'labels', 'style', 'tap', 'zoom', 'equator', 'borders'].every(k => rows.includes(k)), "its panel is built from the part's description, the new borders switch with it", rows);
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
  for (const form of ['slider', 'order']) {
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(400);
    if (form === 'slider') {
      const t = await f.rect('.pi-track');
      await f.drag(t.left + 10, t.y, t.w * 0.8, 0, { steps: 20, ms: 500 });
      await f.drag(t.left + t.w * 0.8, t.y, -t.w * 0.6, 6, { steps: 25, ms: 600 });
    } else {
      const a = await f.rect('.pi-item');
      await f.drag(a.x, a.y, 0, 130, { steps: 20, ms: 500 });
      await sleep(500);
      ok(await ev(`[...document.querySelectorAll('.pi-item')].every(i=>getComputedStyle(i).willChange==='transform')`), 'order items move on their own layers');
      const c = await f.rect('.pi-item:last-child');
      await f.drag(c.x, c.y, 0, -150, { steps: 20, ms: 500, hold: 0 });
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
  for (const name of parts) {
    const desc = await ev(`__primer.parts.describe(${JSON.stringify(name)})`);
    const cases = [];
    const forms = name === 'inputs' ? desc.settings.form.options : [null];
    for (const form of forms) {
      const example = name === 'inputs' ? desc.example[form].settings : desc.example.settings;
      for (const [k, spec] of Object.entries(desc.settings)) {
        if (k === 'form') continue;
        if (form && spec.forms && !spec.forms.includes(form)) continue;
        for (const val of extremes(spec, example[k])) cases.push({ form, k, val, settings: { ...example, [k]: val } });
      }
    }
    let drew = 0, touched = 0, cleaned = 0, problems = [];
    for (const c of cases) {
      const label = `${name}${c.form ? `/${c.form}` : ''} ${c.k}=${JSON.stringify(c.val).slice(0, 30)}`;
      await ev(`(async()=>{const el=document.getElementById('bench');el.innerHTML='';window.__h=await __primer.parts.mount(${JSON.stringify(name)},el,${JSON.stringify(c.settings)},{media:p=>'/primer/../__gh/__none/'+p});})()`);
      await sleep(name === 'globe' ? 250 : 80);
      // it draws
      const drawn = await ev(name === 'globe'
        ? `(()=>{const c=document.querySelector('#bench canvas');const g=c.getContext('2d');const d=g.getImageData(c.width/2-20,c.height/2-20,40,40).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n>100})()`
        : `(()=>{const r=document.querySelector('#bench .pi');return !!r&&r.getBoundingClientRect().height>30&&r.children.length>0})()`);
      if (drawn) drew++; else problems.push(`${label}: drew nothing`);
      // it answers a finger
      let moved = false;
      if (name === 'globe') {
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
    ok(drew === cases.length, `${name}: draws with each of ${cases.length} settings at its extremes`, problems.filter(p => p.includes('drew')));
    ok(touched === cases.length, `${name}: answers a finger with each`, problems.filter(p => p.includes('finger')));
    ok(cleaned === cases.length, `${name}: cleans up after each`, problems.filter(p => p.includes('behind')));
  }
  await ev(`document.getElementById('bench').remove()`);
  for (const name of parts) {
    const desc = await ev(`__primer.parts.describe(${JSON.stringify(name)})`);
    if (!desc.calls) continue;
    await ev(`(async()=>{const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px';document.body.append(d);window.__h=await __primer.parts.mount(${JSON.stringify(name)},d,${JSON.stringify(name === 'inputs' ? desc.example.slider.settings : desc.example.settings)});})()`);
    const res = await ev(`(()=>{const out=[];const ex={spinTo:[[10,20],0.2],highlight:[['Brazil','France'],'pink'],band:[5,20],point:[[0,0],'Here'],marker:[[-40,15],'storm','Storm'],clear:[],reveal:[26.5],mark:['right'],lock:[],reset:[]};for(const c of Object.keys(__h.desc.calls)){try{__h.run([c,...(ex[c]||[])]);out.push(c)}catch(e){out.push(c+': '+e.message)}}return out})()`);
    ok(res.every(x => !x.includes(':')), `${name}: every call in its description works`, res);
    await sleep(200);
    await ev(`__h.remove();document.getElementById('bench').remove()`);
  }

  console.log('The globe: steady names, lines over the land, borders and four colours');
  const bench = settings => ev(`(async()=>{document.getElementById('bench')?.remove();const d=document.createElement('div');d.id='bench';d.style.cssText='position:fixed;left:16px;top:120px;width:382px;height:420px;z-index:50;background:#141a3c';document.body.append(d);window.__h=await __primer.parts.mount('globe',d,${JSON.stringify(settings)});return true})()`);
  // Names, sampled every 60 ms while the globe turns by itself: none may go off and come back on.
  await bench({ style: 'day', spin: 'auto', labels: 'countries', view: [0, 25] });
  await sleep(900);
  const seen = new Map();
  for (let i = 0; i < 50; i++) {
    for (const l of await ev('__h.debug().labels')) { const s = seen.get(l.name) || []; s.push(l.on ? 1 : 0); seen.set(l.name, s); }
    await sleep(60);
  }
  // a blink: off for under about a third of a second between two spells on
  const blinks = [...seen].filter(([, s]) => /1(0{1,5})1/.test(s.join('')));
  ok(seen.size >= 8 && blinks.length === 0, `while it turns, names stay put: none blinks off and back on (${seen.size} names watched)`, blinks.map(([n, s]) => `${n}:${s.join('')}`));
  // A dotted line where it crosses Africa: the equator and a band's edge show over the land, not under it.
  await bench({ style: 'day', spin: 'locked', tap: 'none', equator: true, view: [20, 8] });
  await ev(`__h.run(['band', 5, 20])`);
  await sleep(500);
  const over = await ev(`(()=>{const c=document.querySelector('#bench canvas'),g=c.getContext('2d'),k=c.width/c.getBoundingClientRect().width,b=c.getBoundingClientRect();
    const count=(lat,test)=>{let n=0;for(let lon=12;lon<=30;lon+=0.25){const p=__h.where([lon,lat]);const x=Math.round((p.x-b.left)*k),y=Math.round((p.y-b.top)*k);const d=g.getImageData(x-2,y-2,5,5).data;for(let i=0;i<d.length;i+=4)if(test(d[i],d[i+1],d[i+2]))n++;}return n};
    return {equator:count(0,(r,g2,bl)=>r>215&&g2>215&&bl>215),band:count(20,(r,g2,bl)=>r>220&&g2>170&&bl<120)}})()`);
  ok(over.equator > 0 && over.band > 0, 'dotted lines (the equator, a band\'s edge) are drawn over the land too', over);
  // Borders off, and the four colours.
  const pixelsOf = () => ev(`(()=>{const c=document.querySelector('#bench canvas');return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data.filter((_,i)=>i%16===0)).join(',')})()`);
  await bench({ style: 'day', spin: 'locked', view: [15, 48], zoom: 2 });
  await sleep(500);
  const withBorders = await pixelsOf();
  await bench({ style: 'day', spin: 'locked', view: [15, 48], zoom: 2, borders: false });
  await sleep(500);
  ok((await pixelsOf()) !== withBorders, 'with borders off, the borders are gone');
  await bench({ style: 'political', spin: 'locked', view: [15, 30], zoom: 1.4 });
  await sleep(500);
  const four = await ev(`(()=>{const c=document.querySelector('#bench canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const want=['#3fcfae','#ffd062','#f27ba3','#a58cf2'].map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));const n=[0,0,0,0];for(let i=0;i<d.length;i+=16)want.forEach((w,k)=>{if(Math.abs(d[i]-w[0])+Math.abs(d[i+1]-w[1])+Math.abs(d[i+2]-w[2])<12)n[k]++});return {n,clashes:__h.debug().clashes}})()`);
  ok(four.n.every(x => x > 50) && four.clashes === 0, 'the political style uses all four colours, and no two neighbours share one', four);
  // Still, it costs nothing; turned, it redraws the ball and nothing else.
  await bench({ style: 'warmth', spin: 'locked', labels: 'countries', equator: true, view: [-40, 15] });
  await ev(`__h.run(['band', 5, 20])`);
  await sleep(900);
  const r0 = await ev('__h.debug().redraws');
  await sleep(600);
  ok(!(await ev('__h.busy()')) && (await ev('__h.debug().redraws')) === r0, 'a still globe asks for no frames and redraws nothing, its names and band included');
  await ev(`document.getElementById('bench').remove()`);

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
    await api('/__reset?data=fixtures');
  } else {
    console.log('(no --pilot given: the pilot was not played)');
  }

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
