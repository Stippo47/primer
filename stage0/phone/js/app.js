// Primer phone test. Three things that can't be settled from a desk:
//   1. does sound keep working in a home-screen app after it is closed and reopened
//   2. can a web page make the phone tick under the thumb
//   3. what glowing shapes cost to draw
// Everything stays on the phone (localStorage). Nothing is sent anywhere.
import { playClip, playTone, hasAudioSession } from './sound.js';
import { runBench, METHODS, COUNTS, SECONDS } from './glow.js';

const VERSION = '0.1.0'; // keep in step with sw.js
const KEY = 'primer-stage0-phone'; // every site under the same address shares one store, so the name is specific
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- what the phone says about itself

const ua = navigator.userAgent;
const STANDALONE = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const isApple = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Things that arrived in known iPhone releases. From iOS 26 the browser stops giving its real
// number, so these narrow it down.
const hints = {
  audioSession: hasAudioSession(),                                     // 16.4
  switchControl: 'switch' in HTMLInputElement.prototype,               // 17.4
  viewTransitions: 'startViewTransition' in document,                  // 18.0
  anchorPositioning: !!(window.CSS && CSS.supports && CSS.supports('anchor-name: --a')), // 26.0
  urlPattern: 'URLPattern' in window,                                  // 26.0
};
function software() {
  if (!isApple) return { says: 'Not an iPhone, as far as the browser says', looks: '' };
  const os = /OS (\d+)_(\d+)(?:_(\d+))?/.exec(ua);
  const safari = /Version\/([\d.]+)/.exec(ua);
  let says = os ? `The browser says iOS ${os[1]}.${os[2]}${os[3] ? '.' + os[3] : ''}` : 'The browser hides the iOS number';
  if (safari) says += ` (Safari ${safari[1]})`;
  const looks = hints.anchorPositioning && hints.urlPattern ? 'iOS 26 or newer'
    : hints.viewTransitions ? 'iOS 18'
    : hints.switchControl ? 'iOS 17.4 to 17.7'
    : hints.audioSession ? 'iOS 16.4 to 17.3'
    : 'older than iOS 16.4';
  return { says, looks };
}

// ---------- what is kept between launches

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) return s;
  } catch { /* starts empty */ }
  return { v: 1, launches: 0, homeLaunches: 0, sound: [], haptic: [], glow: null, iosTyped: '' };
}
let kept = true;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { kept = false; }
}
const state = load();
state.launches += 1;
if (STANDALONE) state.homeLaunches += 1;
save();
// The launch number that matters: from the home screen, only home-screen launches count.
const LAUNCH = STANDALONE ? state.homeLaunches : state.launches;

// How many times this launch has been left and come back to without being closed.
let returns = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') returns += 1;
  else stopBench('The test was interrupted. Run it again and leave the phone alone until it finishes.');
});

let offline = false; // the page's files are stored on the phone
function registerWorker() {
  // On a local test server only with ?sw, so a working copy doesn't get stuck behind its own cache.
  if (!('serviceWorker' in navigator) || (isLocalHost && !new URLSearchParams(location.search).has('sw'))) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.update().catch(() => {});
    return navigator.serviceWorker.ready;
  }).then(() => {
    offline = true;
    if (screen() === 'home') render();
  }).catch(() => {});
}

const stamp = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ---------- moving between screens

const NAMES = ['home', 'sound', 'haptic', 'glow', 'results'];
const screen = () => (NAMES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home');
function go(name) {
  if (name === screen()) { render(); return; }
  location.hash = name === 'home' ? '' : name;
}
window.addEventListener('hashchange', () => {
  stopBench('');
  copyNote = '';
  clearArmed = false;
  render();
  window.scrollTo(0, 0);
});
const top = title => `<header class="top"><button class="back" data-go="open" data-to="home">&#8249; Back</button><h1>${title}</h1></header>`;

// ---------- 1. sound

const ROUNDS = [null,
  { name: 'First open', ask: 'Turn the volume up and check the silent switch is off (no orange showing). Tap each button, then say what you heard.' },
  { name: 'Closed and reopened', ask: 'The same again, now that the app has been closed and opened again.' },
  { name: 'Silent switch on', ask: 'The same again, with the phone switched to silent.' },
];
let silentOn = false;  // what the person has told the page about the switch; forgotten on every launch
const pending = {};    // card id -> { phase: 'playing' | 'ask', way, rep }

// Rounds are worked out among the tries made the same way as now (home screen, or browser).
const mine = () => state.sound.filter(t => t.standalone === STANDALONE);
function firstLaunch() {
  const l = mine().filter(t => !t.silent).map(t => t.launch);
  return l.length ? Math.min(...l) : null;
}
const roundOf = t => (t.silent ? 3 : t.launch === firstLaunch() ? 1 : 2);
const roundNow = () => (silentOn ? 3 : firstLaunch() === null || firstLaunch() === LAUNCH ? 1 : 2);
const roundTries = n => mine().filter(t => roundOf(t) === n);
const roundDone = n => ['clip', 'tone'].every(k => roundTries(n).some(t => t.kind === k && t.way !== 'media'));
const lastTry = (n, kind, way) => roundTries(n).filter(t => t.kind === kind && (way ? t.way === way : t.way !== 'media')).pop();

function says(card, rep) {
  if (!rep) return '';
  if (rep.error && typeof rep.error === 'string') return `The phone says: ${rep.error}.`;
  if (card === 'clip') {
    if (rep.play !== 'ok') return `The phone says it would not play the clip: ${rep.play}.`;
    return rep.moved ? 'The phone says the clip played.' : 'The phone says it started, but the clip did not move forward.';
  }
  if (rep.stateEnd === 'running' && rep.moved) return 'The phone says the tone played.';
  return `The phone says its sound engine is "${rep.stateEnd}" and did not get going.`;
}

function soundCard(id, n, title, what, button) {
  const p = pending[id];
  const kind = id === 'clip' ? 'clip' : 'tone';
  const done = lastTry(roundNow(), kind, id === 'media' ? 'media' : undefined);
  const first = id === 'media' ? null : lastTry(roundNow(), kind, 'usual');
  let body;
  if (p && p.phase === 'playing') {
    body = '<p class="status">Playing now&#8230;</p>';
  } else if (p && p.phase === 'ask') {
    body = `<p class="ask">Did you hear it?</p>
      <div class="pair"><button class="yes" data-go="heard" data-card="${id}" data-v="yes">Yes</button><button class="no" data-go="heard" data-card="${id}" data-v="no">No</button></div>
      <button class="quiet" data-go="play" data-card="${id}" data-way="${p.way}">Play it again</button>
      <p class="fine">${esc(says(id, p.rep))}</p>`;
  } else {
    body = `<button class="big" data-go="play" data-card="${id}" data-way="${id === 'media' ? 'media' : 'usual'}">${button}</button>`;
    if (done) {
      const word = t => (t.heard === 'yes' ? 'heard it' : 'heard nothing');
      const line = done.way === 'fresh' && first ? `${word(first)} the usual way, ${word(done)} the other way` : word(done);
      body += `<p class="saved ${done.heard === 'yes' ? 'good' : 'bad'}">Saved for this round: ${line}.</p>`;
      if (done.heard === 'no' && id !== 'media') body += `<button class="quiet" data-go="play" data-card="${id}" data-way="fresh">Try once more, a different way</button>`;
    }
  }
  return `<section class="card"><h2><span class="num">${n}</span>${title}</h2><p class="what">${what}</p>${body}</section>`;
}

function soundScreen() {
  const now = roundNow();
  let html = top('Sound');
  if (!STANDALONE) html += '<p class="warn">You are in the browser, not the home-screen app. This test only counts when the page is opened from the home screen.</p>';
  else if (now === 1 && LAUNCH > 1 && firstLaunch() === null) html += `<p class="warn">This is launch number ${LAUNCH}, not the first. For a true first-open test, remove Primer test from the home screen, add it again, and come straight here.</p>`;

  html += '<ol class="rounds">' + [1, 2, 3].map(n =>
    `<li class="${n === now ? 'now' : ''} ${roundDone(n) ? 'done' : ''}"><b>Round ${n}</b> ${ROUNDS[n].name}<i>${roundDone(n) ? 'saved' : n === now ? 'now' : ''}</i></li>`).join('') + '</ol>';
  html += `<p class="lead">${ROUNDS[now].ask}</p>`;

  html += soundCard('clip', 1, 'A sound clip', 'A short chime, played the ordinary way.', 'Play the chime');
  html += soundCard('tone', 2, 'A made-up tone', 'Two soft notes the page makes itself.', 'Play the tone');
  if (now === 3 && hasAudioSession()) html += soundCard('media', 3, 'The tone, sent as media', 'The same two notes, after telling the phone to treat them like music.', 'Play the tone as media');

  // What to do next, once this round is in.
  let next = '';
  if (roundDone(1) && roundDone(2) && roundDone(3)) {
    next = silentOn ? 'All three rounds are saved. Flip the silent switch back and tap the button below.' : 'All three rounds are saved. Sound is done.';
  } else if (now === 1 && roundDone(1)) {
    next = 'Round 1 is saved. Now close the app completely: swipe up from the bottom edge and pause, then flick this app up and away. Open it again from the home screen and come back to Sound.';
  } else if (now === 2 && roundDone(2)) {
    next = 'Round 2 is saved. Now flip the small switch on the left side of the phone so orange shows, then tap the button below.';
  } else if (now === 3 && roundDone(3)) {
    next = roundDone(2) ? 'Round 3 is saved.' : 'Round 3 is saved. Flip the switch back, tap the button below, then close the app completely and open it again for the round that is left.';
  }
  if (next) html += `<p class="next">${next}</p>`;

  html += `<section class="card plain"><p class="what">The page thinks the silent switch is <b>${silentOn ? 'ON' : 'off'}</b>.</p>
    <button class="quiet wide" data-go="silent">${silentOn ? 'I have switched silent off again' : 'I have switched the phone to silent'}</button></section>`;
  html += '<p class="fine">Extra, if you like: go to the home screen without closing the app, come back, and play both again. Every try is kept.</p>';
  return html;
}

const soundActions = {
  async play(b) {
    const id = b.dataset.card, way = b.dataset.way;
    const mark = pending[id] = { phase: 'playing', way };
    const job = id === 'clip' ? playClip(way) : playTone(way); // starts the sound inside the tap itself
    render();
    const rep = await job;
    if (pending[id] !== mark) return;
    mark.phase = 'ask';
    mark.rep = rep;
    if (screen() === 'sound') render();
  },
  heard(b) {
    const id = b.dataset.card, p = pending[id];
    if (!p || !p.rep) return;
    state.sound.push({
      at: stamp(), launch: LAUNCH, standalone: STANDALONE, returns, silent: silentOn,
      kind: id === 'clip' ? 'clip' : 'tone', way: p.way, heard: b.dataset.v,
      stored: !!(navigator.serviceWorker && navigator.serviceWorker.controller), rep: p.rep,
    });
    delete pending[id];
    save();
    render();
  },
  silent() {
    silentOn = !silentOn;
    for (const k in pending) delete pending[k];
    render();
  },
};

// ---------- 2. a tick for the thumb

// The trick from Riffle: iPhones tick when a switch control flips, and a hidden one can be flipped
// through its label.
let hap = null;
function switchTrick() {
  if (!hap) {
    hap = document.createElement('label');
    hap.className = 'hap';
    hap.innerHTML = '<input type="checkbox" switch tabindex="-1">';
    document.body.append(hap);
  }
  const box = hap.firstChild, was = box.checked;
  hap.click();
  return { flipped: box.checked !== was };
}

const TICKS = [
  { id: 'trick', title: 'The hidden switch', what: 'Tap the button a few times. Does the phone give a tiny tick each time?', button: 'Tick' },
  { id: 'switch', title: 'A switch you flip yourself', what: 'Flip this switch back and forth with your thumb. Any tick?' },
  { id: 'vibrate', title: 'A buzz', what: 'Tap the button. Does the phone buzz?', button: 'Buzz' },
];
const tried = {};  // tick id -> { taps, rep } this visit
const lastTick = id => state.haptic.filter(t => t.kind === id).pop();

function hapticScreen() {
  let html = top('A tick you can feel');
  html += '<p class="lead">Hold the phone in your hand. Ticks need System Haptics switched on (Settings, Sounds &amp; Haptics).</p>';
  TICKS.forEach((t, i) => {
    const done = lastTick(t.id);
    let body;
    if (t.id === 'vibrate' && !navigator.vibrate) {
      body = '<p class="saved">This phone\'s browser does not offer this one. Nothing to do here.</p>';
    } else {
      body = t.id === 'switch'
        ? '<label class="flip"><input type="checkbox" switch data-try="switch"><span>Flip me</span></label>'
        : `<button class="big" data-go="tick" data-kind="${t.id}">${t.button}</button>`;
      const off = tried[t.id] ? '' : ' disabled';
      body += `<div class="pair" data-answers="${t.id}"><button class="yes" data-go="felt" data-kind="${t.id}" data-v="yes"${off}>Felt it</button><button class="no" data-go="felt" data-kind="${t.id}" data-v="no"${off}>Nothing</button></div>`;
      if (done) body += `<p class="saved ${done.felt === 'yes' ? 'good' : 'bad'}">Saved: ${done.felt === 'yes' ? 'felt it' : 'nothing'}.</p>`;
    }
    html += `<section class="card"><h2><span class="num">${i + 1}</span>${t.title}</h2><p class="what">${t.what}</p>${body}</section>`;
  });
  return html;
}

function noteTry(id, rep) {
  const first = !tried[id];
  tried[id] = { taps: (tried[id] ? tried[id].taps : 0) + 1, rep };
  if (first) app.querySelectorAll(`[data-answers="${id}"] button`).forEach(b => { b.disabled = false; });
}
const hapticActions = {
  tick(b) {
    const id = b.dataset.kind;
    if (id === 'trick') noteTry(id, switchTrick());
    else noteTry(id, { returned: navigator.vibrate(10) });
  },
  felt(b) {
    const id = b.dataset.kind;
    if (!tried[id]) return;
    state.haptic.push({ at: stamp(), launch: LAUNCH, standalone: STANDALONE, kind: id, felt: b.dataset.v, taps: tried[id].taps, rep: tried[id].rep });
    delete tried[id];
    save();
    render();
  },
};
app.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.try === 'switch') noteTry('switch', {});
});

// ---------- 3. what glows cost

let bench = null;      // { stop } while a test runs
let benchNote = '';

function stopBench(note) {
  if (!bench) return;
  bench.stop.stopped = true;
  bench = null;
  benchNote = note;
  if (screen() === 'glow') render();
}

function glowTable(g) {
  const cell = r => {
    const tone = r.fps >= 55 ? 'good' : r.fps >= 40 ? 'mid' : 'bad';
    return `<td class="${tone}"><b>${Math.round(r.fps)}</b><i>${Math.round(r.p95)} ms</i></td>`;
  };
  let html = `<table class="scores"><thead><tr><th></th>${COUNTS.map(c => `<th>${c} dots</th>`).join('')}</tr></thead><tbody>`;
  for (const m of METHODS) {
    html += `<tr><th>${m.name}<i>${m.note}</i></th>${COUNTS.map(c => cell(g.runs.find(r => r.method === m.id && r.count === c))).join('')}</tr>`;
  }
  html += '</tbody></table>';
  html += '<p class="fine">Big number: pictures drawn each second. 60 is as smooth as this phone gets. Small number: how long the slow frames took, in thousandths of a second (95 in every 100 were quicker). About 17 is perfect.</p>';
  if (Math.max(...g.runs.map(r => r.fps)) < 34) html += '<p class="warn">Nothing got past 30. That usually means Low Power Mode is on (a yellow battery). Turn it off and run this again.</p>';
  return html;
}

function glowScreen() {
  let html = top('What glows cost');
  html += `<p class="lead">This draws glowing dots three different ways and counts how smoothly the phone keeps up. It takes about ${SECONDS} seconds. Turn Low Power Mode off first. Don't touch the phone while it runs, but do watch: you'll be asked how it looked.</p>`;
  html += '<div id="stage" class="stage"></div>';
  html += '<p id="step" class="status"></p>';
  html += bench
    ? '<button class="quiet wide" data-go="stop">Stop</button>'
    : `<button class="big" data-go="bench">${state.glow ? 'Run it again' : 'Start'}</button>`;
  if (benchNote) html += `<p class="warn">${esc(benchNote)}</p>`;
  if (state.glow && !bench) {
    // The counting can miss stutter that happens after the page has handed a frame over, so the eye gets a say.
    const l = state.glow.looked;
    html += `<section class="card"><p class="ask">How did it look to you?</p>
      <div class="pair"><button class="yes" data-go="looked" data-v="smooth">Smooth</button><button class="no" data-go="looked" data-v="jerky">Jerky at times</button></div>
      ${l ? `<p class="saved">Saved: ${l === 'smooth' ? 'smooth all the way' : 'jerky at times'}.</p>` : ''}</section>`;
    html += `<h2 class="sub">Last run</h2>${glowTable(state.glow)}`;
  }
  return html;
}

const glowActions = {
  async bench() {
    if (bench) return;
    const run = bench = { stop: { stopped: false } };
    benchNote = '';
    render();
    const stage = document.getElementById('stage');
    stage.scrollIntoView({ block: 'nearest' });
    let lock = null;
    try { // keep the screen from dimming; if the phone won't say yes quickly, carry on without
      lock = navigator.wakeLock ? await Promise.race([navigator.wakeLock.request('screen'), new Promise(r => setTimeout(r, 500, null))]) : null;
    } catch { /* the test still runs */ }
    const runs = await runBench(stage, run.stop, s => {
      const line = document.getElementById('step');
      if (line) line.textContent = `Run ${s.n} of ${s.total}: ${s.method.name.toLowerCase()}, ${s.count} dots`;
    });
    if (lock) lock.release().catch(() => {});
    if (!runs || bench !== run) return;
    bench = null;
    state.glow = {
      at: stamp(), launch: LAUNCH, standalone: STANDALONE, runs,
      stage: `${stage.clientWidth}x${stage.clientHeight}`, ratio: window.devicePixelRatio || 1, looked: '',
    };
    save();
    if (screen() === 'glow') render();
  },
  looked(b) {
    if (!state.glow) return;
    state.glow.looked = b.dataset.v;
    save();
    render();
  },
  stop() { stopBench('Stopped. Nothing was saved from that run.'); },
};

// ---------- results

const yn = v => (v === 'yes' ? 'YES' : 'no');
function tryLine(t) {
  const r = t.rep || {};
  const where = `${t.at} | ${t.standalone ? 'home screen' : 'browser'} launch ${t.launch} | silent ${t.silent ? 'ON' : 'off'} | came back ${t.returns}x`;
  if (t.kind === 'clip') {
    return `  ${where} | CLIP (${t.way}) | heard ${yn(t.heard)} | play(): ${r.play} | position after 1.3 s: ${r.position} s (${r.moved ? 'moved' : 'stuck'}) | paused ${r.paused ? 'yes' : 'no'} | ended ${r.ended ? 'yes' : 'no'} | ready ${r.readyBefore}>${r.ready} | error ${r.error} | length ${r.length} s | from stored copy ${t.stored ? 'yes' : 'no'}`;
  }
  if (r.error) return `  ${where} | TONE (${t.way}) | heard ${yn(t.heard)} | ${r.error}`;
  return `  ${where} | TONE (${t.way}) | heard ${yn(t.heard)} | engine ${r.made ? 'new' : 'kept'}: ${r.stateBefore} > resume ${r.resume} > ${r.stateAfter} > ${r.stateEnd} | clock moved ${r.clock} s (${r.moved ? 'moved' : 'stuck'}) | ${r.rate} Hz${r.session ? ` | session ${r.sessionBefore}>${r.session}` : ''}`;
}

function resultsText() {
  const sw = software();
  const L = [];
  L.push('PRIMER PHONE TEST', `Written ${stamp()} | page version ${VERSION}`, '');
  L.push('PHONE');
  L.push(`  Opened from the home screen: ${STANDALONE ? 'YES' : 'no (browser)'}`);
  L.push(`  Software: ${sw.says}${sw.looks ? `; features look like ${sw.looks}` : ''}`);
  L.push(`  iOS number typed in by hand: ${state.iosTyped || '(not given)'}`);
  L.push(`  Launches so far: ${state.launches} in all, ${state.homeLaunches} from the home screen (this one is number ${LAUNCH})`);
  L.push(`  Screen: ${window.screen.width}x${window.screen.height} at ${window.devicePixelRatio || 1}x | page stored on the phone: ${offline ? 'yes' : 'no'} | results kept: ${kept ? 'yes' : 'NO'}`);
  L.push(`  Feature hints: ${Object.entries(hints).map(([k, v]) => `${k} ${v ? 'yes' : 'no'}`).join(', ')}`);
  L.push(`  Browser line: ${ua}`, '');

  L.push('1. SOUND IN A HOME-SCREEN APP');
  if (!state.sound.length) L.push('  Not done yet.');
  for (const mode of [true, false]) {
    const tries = state.sound.filter(t => t.standalone === mode);
    if (!tries.length) continue;
    const first = Math.min(...tries.filter(t => !t.silent).map(t => t.launch));
    const inRound = n => tries.filter(t => (t.silent ? 3 : t.launch === first ? 1 : 2) === n);
    L.push(`  ${mode ? 'From the home screen' : 'In the browser (does not count for the home-screen question)'}:`);
    for (const n of [1, 2, 3]) {
      const ts = inRound(n);
      const said = (kind, way) => {
        const t = ts.filter(x => x.kind === kind && x.way === way).pop();
        return t ? yn(t.heard) : '-';
      };
      if (!ts.length) { L.push(`    Round ${n} (${ROUNDS[n].name.toLowerCase()}): not done`); continue; }
      const launches = [...new Set(ts.map(t => t.launch))].join(', ');
      let line = `    Round ${n} (${ROUNDS[n].name.toLowerCase()}, launch ${launches}): clip heard ${said('clip', 'usual')}, tone heard ${said('tone', 'usual')}`;
      const extra = [['clip', 'fresh', 'clip with a new player'], ['tone', 'fresh', 'tone with a new engine'], ['tone', 'media', 'tone as media']]
        .filter(([k, w]) => ts.some(x => x.kind === k && x.way === w)).map(([k, w, label]) => `${label} ${said(k, w)}`);
      if (extra.length) line += ` | second tries: ${extra.join(', ')}`;
      L.push(line);
    }
  }
  if (state.sound.length) {
    L.push('  Every try, oldest first:');
    state.sound.forEach(t => L.push(tryLine(t)));
  }
  L.push('');

  L.push('2. A TICK YOU CAN FEEL');
  for (const t of TICKS) {
    const all = state.haptic.filter(x => x.kind === t.id);
    const last = all[all.length - 1];
    let line = `  ${t.title}: `;
    if (t.id === 'vibrate' && !navigator.vibrate) line += 'not offered by this browser';
    else if (!last) line += 'not done yet';
    else {
      line += `${last.felt === 'yes' ? 'FELT IT' : 'nothing'} (${last.taps} ${last.taps === 1 ? 'try' : 'tries'}, ${last.standalone ? 'home screen' : 'browser'} launch ${last.launch}`;
      if (t.id === 'trick') line += `, hidden switch ${last.rep && last.rep.flipped ? 'flipped' : 'did not flip'}`;
      if (t.id === 'vibrate') line += `, browser answered ${last.rep && last.rep.returned}`;
      line += ')';
      if (all.length > 1) line += ` | earlier answers: ${all.slice(0, -1).map(x => x.felt === 'yes' ? 'felt it' : 'nothing').join(', ')}`;
    }
    L.push(line);
  }
  L.push('');

  L.push('3. WHAT GLOWS COST');
  const g = state.glow;
  if (!g) L.push('  Not done yet.');
  else {
    L.push(`  Run ${g.at}, ${g.standalone ? 'home screen' : 'browser'} launch ${g.launch}, drawing area ${g.stage} at ${g.ratio}x, 4 seconds each`);
    L.push('  frames per second / slow-frame time in ms (95 in 100 quicker) / worst frame in ms');
    L.push(`  By eye: ${g.looked === 'smooth' ? 'smooth all the way' : g.looked === 'jerky' ? 'JERKY AT TIMES' : '(not answered)'}`);
    L.push(`  ${''.padEnd(36)}${COUNTS.map(c => `${c} dots`.padEnd(20)).join('')}`);
    for (const m of METHODS) {
      const cells = COUNTS.map(c => {
        const r = g.runs.find(x => x.method === m.id && x.count === c);
        return `${r.fps} / ${r.p95} / ${r.worst}`.padEnd(20);
      });
      L.push(`  ${`${m.name} (${m.note})`.padEnd(36)}${cells.join('')}`);
    }
  }
  return L.join('\n');
}

let copyNote = '';
let clearArmed = false;

function resultsScreen() {
  const text = resultsText();
  let html = top('Results');
  html += '<p class="lead">Everything so far, as plain text. Copy it and paste it into a comment.</p>';
  html += '<button class="big" data-go="copy">Copy results</button>';
  if (copyNote) html += `<p class="next">${esc(copyNote)}</p>`;
  html += `<textarea id="resultsText" class="results" readonly rows="${Math.min(40, text.split('\n').length + 6)}" spellcheck="false">${esc(text)}</textarea>`;
  html += `<label class="field"><span>If you know the exact iOS number (Settings, General, About), type it here:</span><input id="iosTyped" type="text" inputmode="decimal" autocomplete="off" placeholder="for example 26.1" value="${esc(state.iosTyped)}"></label>`;
  html += `<button class="quiet wide" data-go="clear">${clearArmed ? 'Tap again to wipe every result' : 'Start over'}</button>`;
  return html;
}

const resultsActions = {
  async copy() {
    const text = resultsText();
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { /* the older way next */ }
    if (!ok) {
      const box = document.getElementById('resultsText');
      box.focus();
      box.select();
      box.setSelectionRange(0, text.length);
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      box.blur();
    }
    copyNote = ok ? 'Copied. Paste it into a comment.' : 'The phone would not copy by itself. Press and hold on the text below, choose Select All, then Copy.';
    render();
  },
  clear() {
    if (!clearArmed) { clearArmed = true; render(); return; }
    clearArmed = false;
    state.sound = [];
    state.haptic = [];
    state.glow = null;
    save();
    copyNote = 'Wiped. The launch count is kept.';
    render();
  },
};
app.addEventListener('input', e => {
  if (e.target.id !== 'iosTyped') return;
  state.iosTyped = e.target.value.trim().slice(0, 20);
  save();
  const box = document.getElementById('resultsText');
  if (box) box.value = resultsText();
});

// ---------- home

function homeScreen() {
  const sw = software();
  const rounds = [1, 2, 3].filter(roundDone).length;
  const ticks = TICKS.filter(t => lastTick(t.id) || (t.id === 'vibrate' && !navigator.vibrate)).length;
  const chip = (text, done) => `<i class="${done ? 'done' : ''}">${text}</i>`;
  let html = '<h1 class="title">Primer phone test</h1><p class="lead">Three quick checks that only a real phone can answer. About two minutes.</p>';
  html += `<section class="card facts">
    <p><span>Opened from the home screen</span><b class="${STANDALONE ? 'good' : 'bad'}">${STANDALONE ? 'Yes' : 'No, this is the browser'}</b></p>
    <p><span>Phone software</span><b>${esc(sw.says)}${sw.looks ? `. Looks like ${sw.looks}` : ''}</b></p>
    <p><span>This is launch number</span><b class="count">${LAUNCH}</b></p>
    <p class="fine">Page version ${VERSION}. ${offline ? 'Stored on the phone, works with no signal.' : 'Not stored on the phone yet.'}${kept ? '' : ' This browser is not keeping results (private browsing?).'}</p>
  </section>`;
  if (!STANDALONE) {
    html += `<section class="card plain"><h2>First, put this on the home screen</h2>
      <ol class="steps"><li>Tap <b>Share</b> (the square with an arrow; it may be under the three dots).</li><li>Choose <b>Add to Home Screen</b>, leave "Open as Web App" on, tap Add.</li><li>Open <b>Primer test</b> from the home screen and go straight to Sound.</li></ol></section>`;
  }
  html += `<nav class="menu">
    <button data-go="open" data-to="sound"><span class="num">1</span><span>Sound in a home-screen app</span>${chip(rounds === 3 ? 'done' : `${rounds} of 3 rounds`, rounds === 3)}</button>
    <button data-go="open" data-to="haptic"><span class="num">2</span><span>A tick you can feel</span>${chip(ticks === TICKS.length ? 'done' : `${ticks} of ${TICKS.length}`, ticks === TICKS.length)}</button>
    <button data-go="open" data-to="glow"><span class="num">3</span><span>What glows cost</span>${chip(state.glow ? 'done' : 'not run', !!state.glow)}</button>
    <button class="last" data-go="open" data-to="results"><span>Results</span>${chip('copy', false)}</button>
  </nav>`;
  return html;
}

// ---------- drawing and taps

const SCREENS = { home: homeScreen, sound: soundScreen, haptic: hapticScreen, glow: glowScreen, results: resultsScreen };
function render() {
  app.dataset.screen = screen();
  app.innerHTML = SCREENS[screen()]();
}

const actions = { open: b => go(b.dataset.to), ...soundActions, ...hapticActions, ...glowActions, ...resultsActions };
app.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b && !b.disabled && actions[b.dataset.go]) actions[b.dataset.go](b);
});

render();
registerWorker();
