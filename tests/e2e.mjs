// Drives the app in headless Edge with real touch, against tests/serve.mjs and its stand-in for GitHub.
//   node tests/e2e.mjs [--shots <folder>] [--pilot <primer-data folder>]
// Starts the test server itself if nothing answers on its port. Uses debugging port 9341 and server port 8821.
// --pilot (or PRIMER_DATA) also plays the pilot lesson from the data repo's working tree, right and wrong.
// Runs at device scale 1: at scale 2 a screenshot can re-send a held touch at half its coordinates.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const everyEvent = async () => [...(await sent()).flatMap(x => x.events), ...await queue()];
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

  console.log('The path');
  await f.tap('.tab[data-tab=learn]');
  await sleep(400);
  const path = await ev(`(()=>{const n=[...document.querySelectorAll('.lesson-sec')].map(s=>[...s.querySelectorAll('.node')].map(x=>x.className.replace('node ','')));return {nodes:n,banners:[...document.querySelectorAll('.banner p')].map(p=>p.textContent),pips:[...document.querySelectorAll('.banner')].map(b=>b.querySelectorAll('.pips i').length)}})()`);
  ok(path.nodes.length === 2 && path.nodes[0].length === 9 && path.nodes[1].length === 2, 'each lesson is a banner with a button per step', path);
  ok(path.nodes[0][0] === 'now' && path.nodes[0].slice(1).every(x => x === 'todo') && path.nodes[1].every(x => x === 'todo'), 'the first step is the one to do; the rest are dim', path.nodes);
  ok(JSON.stringify(path.pips) === '[9,2]', 'each banner has a pip per step', path.pips);
  ok(await ev(`!!document.querySelector('.node.now .ring')`), 'the current step has its ring');
  const marks = await ev(`[...document.querySelectorAll('.lesson-sec')[0].querySelectorAll('.node')].map(n=>n.getAttribute('aria-label').split(':')[0])`);
  ok(JSON.stringify(marks) === JSON.stringify(['Read', 'Read', 'Question', 'Question', 'Question', 'Question', 'Question', 'Question', 'Play']), 'each button is marked with its kind of step', marks);
  await shot('04-path');
  await f.tap('.lesson-sec:nth-child(2) .node');
  await sleep(400);
  ok(await ev(`!!document.querySelector('.callout.dim') && !document.querySelector('.callout [data-go=start]')`), 'a step still ahead shows its title, and nothing to start');
  await f.tap('.node.now');
  await sleep(400);
  const call = await ev(`(()=>{const c=document.querySelector('.callout');const r=c.getBoundingClientRect();return {text:c.innerText,left:r.left,right:r.right}})()`);
  ok(call.text.includes('A globe to read by') && call.text.toUpperCase().includes('START') && call.left >= 0 && call.right <= W, 'tapping the current step shows its title and Start, placed on the screen', call);
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
  ok(!(await bare()) && await ev(`document.querySelectorAll('.lesson-sec')[0].querySelectorAll('.node.done').length === 9`), 'back on the path, the lesson is gold');
  ok(await ev(`document.querySelectorAll('.lesson-sec')[1].querySelector('.node').classList.contains('now')`), 'and the next lesson is the one to do');
  await shot('13-path-done');

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

  console.log('Leaving part way');
  await press().catch(() => {});
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
  ok((await queue()).some(e => e.type === 'leave' && e.step === 'read'), 'and says where it was left');

  console.log('Nothing typed gets lost');
  await f.tap('[data-go=topics]');
  await sleep(300);
  await f.tap('.toprow:nth-child(2)');
  await sleep(300);
  await f.tap('.lesson-sec:nth-child(1) .node');
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
  ok((await text()).includes('last studied') && await ev(`document.querySelectorAll('.dots i').length === 8`), "tapping a topic opens its details, a dot for each question");
  await f.tap('.scrim');
  await sleep(200);
  await f.tap('[data-size=l]');
  await sleep(200);
  ok((await ev('document.documentElement.dataset.text')) === 'l', 'the text size can be set');
  await f.tap('[data-size=m]');
  await f.tap('[data-pref=effects]');
  await sleep(100);
  ok((await ev(`__primer.store.get('prefs')`)).effects === false && (await ev(`__primer.feel.getPrefs()`)).effects === false, 'the Effects switch is kept');
  ok((await ev(`__primer.feel.sound('right')`)) === false, 'and with it off, no sound plays');
  await f.tap('[data-pref=effects]');

  console.log('The feel');
  const ticks0 = await ev('__primer.feel.tickCount()');
  await f.tap('.tab[data-tab=practice]');
  await sleep(200);
  ok((await ev('__primer.feel.tickCount()')) > ticks0 && (await ev('__primer.feel.soundLog().at(-1)')) === 'tap', 'a press gives a tick and a soft sound');
  await go(APP);
  // As on an iPhone: a page can say what its sound is, and can't vibrate.
  await ev(`Object.defineProperty(navigator,'audioSession',{value:{type:'auto'},configurable:true});Object.defineProperty(Navigator.prototype,'vibrate',{value:undefined,configurable:true});true`);
  await f.tap('.tab[data-tab=home]');
  await sleep(100);
  ok((await ev('navigator.audioSession.type')) === 'playback', "the first sounding press tells the phone the app's sound is media, so it plays on silent");
  ok(await ev(`!!document.querySelector('.hap input[switch]')`), "the tick is Riffle's hidden switch");
  const blur = await ev(`[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).filter(t=>/blur\\(/.test(t))`);
  ok(blur.length === 0, 'no live blur anywhere in the styles', blur);

  console.log('The Playground');
  await f.tap('.tab[data-tab=practice]');
  await sleep(500);
  const cards = await ev(`[...document.querySelectorAll('.pcard')].map(c=>c.innerText.replace(/\\s+/g,' ').trim())`);
  ok(cards.length === 2 && cards[0].startsWith('Globe') && cards.some(c => c.includes('from Every kind of step')), 'each part has a card, saying which lesson first uses it', cards);
  ok(await ev(`document.querySelector('.review .btn').disabled`), "Review's Start is off until stage 2");
  await f.tap('.pcard[data-part=globe]');
  await waitFor(`document.querySelector('.partstage canvas')`);
  ok(await bare(), 'an opened part hides the tab bar');
  const rows = await ev(`[...document.querySelectorAll('.setrow p')].map(p=>p.textContent)`);
  ok(['spin', 'labels', 'style', 'tap', 'zoom', 'equator'].every(k => rows.includes(k)), "its panel is built from the part's description", rows);
  await f.tap('[data-set=style][data-v=warmth]');
  await sleep(600);
  ok((await ev('__primer.app.partNow.settings.style')) === 'warmth', 'changing a setting redraws the part with it');
  await f.tap('[data-try="2"]');
  await sleep(400);
  await shot('15-part-globe');
  await f.tap('[data-go=back]');
  await sleep(400);
  ok(!(await bare()) && (await text()).includes('Playground'), 'the back arrow leaves, and the tab bar comes back');
  await f.tap('.pcard[data-part=inputs]');
  await sleep(600);
  for (const form of ['slider', 'order', 'match', 'number', 'spot']) {
    await f.tap(`[data-set=form][data-v=${form}]`);
    await sleep(300);
    ok(await ev(`!!document.querySelector('.partstage .form-${form}')`), `Inputs opens as ${form}`);
  }
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

  if (PILOT && existsSync(join(PILOT, 'topics'))) {
    console.log('The pilot lesson, played wrong and then right');
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
    const lessonFile = JSON.parse(readFileSync(join(PILOT, 'topics', 'where-hurricanes-form', 'warm-water-and-a-spin.json'), 'utf8'));
    ok((await text()).includes('Where hurricanes form') && (await ev(`document.querySelectorAll('.node').length`)) === lessonFile.steps.length, 'the pilot topic shows its path');
    const kinds = new Set(lessonFile.steps.map(s => s.kind));
    ok(kinds.has('explain') && kinds.has('check') && kinds.has('play'), 'it has all three kinds of step');
    for (const pass of ['wrong', 'right']) {
      await f.tap(pass === 'wrong' ? '.node.now' : '.node');
      await sleep(300);
      await f.tap('.callout [data-go=start]');
      await sleep(900);
      const marks = [];
      for (const s of lessonFile.steps) {
        await waitFor(`__primer.run && __primer.run.step.id === ${JSON.stringify(s.id)} && (__primer.run.input || __primer.run.play || ${s.kind === 'explain'})`);
        if (s.kind === 'explain') { await press(); continue; }
        if (s.kind === 'play') {
          const t = s.tries.find(x => x.marked === pass);
          const p = await ev(`__primer.run.play.where([${t.state.tapped.lon},${t.state.tapped.lat}])`);
          await f.tapAt(p.x, p.y);
        } else {
          const inp = s.input;
          const right = pass === 'right';
          if (inp.form === 'choice') {
            const answer = s.answer ?? inp.options.find(o => o.right).id;
            await f.tap(`.pi-opt[data-id="${right ? answer : inp.options.find(o => o.id !== answer).id}"]`);
          } else if (inp.form === 'slider') {
            const r = await f.rect('.pi-track');
            const val = right ? s.answer : inp.max - (inp.max - inp.min) * 0.1;
            await f.tapAt(r.left + ((val - inp.min) / (inp.max - inp.min)) * r.w, r.y);
          } else if (inp.form === 'match') {
            const ids = Object.keys(s.answer);
            for (const [k, l] of ids.entries()) {
              await f.tap(`.pi-cell[data-side=l][data-id="${l}"]`);
              await f.tap(`.pi-cell[data-side=r][data-id="${right ? s.answer[l] : s.answer[ids[(k + 1) % ids.length]]}"]`);
            }
          }
        }
        await sleep(250);
        await press();
        const vd = await verdict();
        marks.push(`${s.id}:${vd.verdict}`);
        if (pass === 'wrong' && s.id === 'where') {
          ok(vd.why.includes('equator') && vd.why.includes('spin'), 'tapping the equator, the tempting answer, is wrong, and says why', vd);
          await shot('16-pilot-equator-wrong');
        }
        if (pass === 'right' && s.id === 'where') await shot('17-pilot-where-right');
        await press();
      }
      ok(marks.every(m => m.endsWith(pass === 'right' ? 'Right' : 'Not quite')), `played ${pass}, every question is marked ${pass}`, marks);
      await waitFor(`!!document.querySelector('.lend')`);
      await press();
    }
    const pilotEvents = (await everyEvent()).filter(e => e.topic === 'where-hurricanes-form');
    ok(pilotEvents.filter(e => e.type === 'attempt').length === 8 && pilotEvents.filter(e => e.type === 'finish').length === 2, 'both runs went into the queue to go up', pilotEvents.map(e => e.type));
    await api('/__reset?data=fixtures');
  } else {
    console.log('(no --pilot given: the pilot lesson was not played)');
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
