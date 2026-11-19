// Primer's shell: start-up, the five tabs, opening a lesson, a review or a part, connecting, getting a
// new phone's memory back, and what runs when the app is hidden. The tabs are Learn, Practice, Home
// (raised, in the centre), Shop and Profile. The tab bar hides inside a lesson, a review, an opened part
// and the connect screen; a cross or a back arrow leaves.
import * as store from './store.js';
import * as sync from './sync.js';
import * as feel from './feel.js';
import * as data from './data.js';
import * as parts from './parts.js';
import * as lessonPlayer from './lesson.js';
import * as rules from './rules.js';
import * as clock from './clock.js';
import * as facts from './facts.js';
import * as memory from './memory.js';
import * as review from './review.js';
import { icon } from './art.js';
import { esc } from './ui.js';
import { learnScreen } from './screens/learn.js';
import { practiceScreen, partScreen } from './screens/practice.js';
import { homeScreen, shopScreen } from './screens/home.js';
import { profileScreen, connectScreen } from './screens/profile.js';
import { visitNode } from './screens/node.js';
import { playVideo } from './screens/video.js';
import { DEFAULT_NARRATOR, NARRATORS } from './scene.js';

const VERSION = '0.5.6'; // keep in step with sw.js
const root = document.getElementById('app');
const view = document.getElementById('view');
const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const params = new URLSearchParams(location.search);

// ---------- the phone itself

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalled = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

// The app's box reaches the bottom of the screen. Installed on an iPhone, with the status bar see-through,
// the page can be laid out a status bar's height short of the screen, which showed as a band of a lighter
// ground in the home bar's strip under a video (2026-11-18). An installed app always has the whole screen,
// so there the box takes the screen's own height whenever the page reports less (css/app.css, --apph).
export function fitScreen(win = window, root = document.documentElement, ios = isIOS) {
  const installed = win.navigator.standalone === true || (win.matchMedia && win.matchMedia('(display-mode: standalone)').matches);
  const portrait = win.innerHeight >= win.innerWidth;
  const full = portrait ? Math.max(win.screen.height, win.screen.width) : Math.min(win.screen.height, win.screen.width);
  const short = installed && ios && full - win.innerHeight > 1 && full - win.innerHeight < 120;
  if (short) root.style.setProperty('--apph', `${full}px`); else root.style.removeProperty('--apph');
  return short;
}

function trackViewport() {
  document.addEventListener('gesturestart', e => e.preventDefault());
  fitScreen();
  addEventListener('resize', () => fitScreen());
  addEventListener('orientationchange', () => setTimeout(() => fitScreen(), 300));
  // On a local test server only: pretend to have an iPhone's safe areas, to check the true spacing.
  const fake = isLocalHost && params.get('insets');
  if (fake) {
    const [top, bottom] = fake.split(',');
    document.documentElement.style.setProperty('--sat', `${top}px`);
    document.documentElement.style.setProperty('--sab', `${bottom}px`);
  }
}

// ---------- the app object every screen is handed

const TABS = [['learn', 'Learn', icon.learn], ['practice', 'Practice', icon.practice], ['home', 'Home', icon.home], ['shop', 'Shop', icon.shop], ['profile', 'Profile', icon.profile]];
const SCREENS = { learn: learnScreen, practice: practiceScreen, home: homeScreen, shop: shopScreen, profile: profileScreen };

let run = null;          // the lesson open now, if any
const OPENING = { remove() {}, opening: true };   // while one is being opened: a second tap opens nothing
let updateReady = false;
const app = {
  VERSION, root, view, store, sync,
  topics: [],
  // Effects start off (ruled 2026-11-18: the press sounds are disliked until better ones are chosen).
  // narrators: the narrator chosen for a subject, overriding its topics' own: { "Earth science": "george" }.
  // captions: an animation's captions, on or off (with no voice they're always on).
  prefs: { v: 2, voice: true, captions: true, effects: false, music: false, text: 'm', topic: null, tab: 'learn', narrators: {} },
  tab: 'learn',
  partNow: null,
  mustInstall: isIOS && !isInstalled,
  pullNow: () => Promise.resolve(),
  mediaUrl: path => sync.mediaUrl(path),

  go(tab) {
    if (run) return;
    app.tab = tab;
    app.setPref('tab', tab);
    document.documentElement.classList.remove('bare', 'vid');
    paintTabs();
    view.onclick = null;
    SCREENS[tab](app);
  },
  render() { if (!run && !document.documentElement.classList.contains('bare')) app.go(app.tab); },

  setPref(k, v) {
    app.prefs[k] = v;
    store.set('prefs', app.prefs);
    feel.setPrefs({ voice: app.prefs.voice, effects: app.prefs.effects, music: app.prefs.music });
    document.documentElement.dataset.text = app.prefs.text || 'm';
    try { localStorage.setItem('primer-prefs', JSON.stringify({ text: app.prefs.text })); } catch { /* it just flashes */ }
  },

  // How much of a topic you'd recall now, 0 to 1 (null if none of its facts has been asked yet): the value
  // the room's things will fade with (data.memoryOf, from the memory model).
  memoryOf: topic => data.memoryOf(topic),

  // The narrator for a topic: the one chosen in Profile for its subject, else the topic's own.
  narratorFor(topic) {
    return (topic.subject && (app.prefs.narrators || {})[topic.subject]) || topic.narrator || DEFAULT_NARRATOR;
  },

  // The narrator a topic plays in now (js/sync.js, voiceFor): the one chosen, once all its clips are on the
  // phone; until then the old one, whose clips are. Worked out when the voice on the phone can change (a
  // pull, a new choice) and as a topic opens.
  speaking: {},
  speakerFor(topic) { return app.speaking[topic.id] || app.narratorFor(topic); },
  async refreshVoice(topics = app.topics) {
    for (const t of topics) {
      try { app.speaking[t.id] = (await sync.voiceFor(t.id)).narrator; } catch { /* the chosen one, then */ }
    }
  },

  // After a narrator is chosen for a subject: its clips come down now, and the old one's go once they're all
  // here; until then the old voice goes on. Says how it went, in words for Profile: { words, here } (here:
  // every clip of it is on this phone).
  async fetchVoice(subject, name) {
    await app.pullNow();
    const topics = app.topics.filter(t => t.subject === subject);
    await app.refreshVoice(topics);
    const v = await sync.voiceHere(topics.map(t => t.id));
    const problem = sync.status().pullProblem;
    const old = topics.map(t => app.speaking[t.id]).find(n => n && NARRATORS[n] !== name);
    const meanwhile = old ? `Until then, ${NARRATORS[old] || old} goes on narrating ${subject}.` : `Until then, ${subject} plays from its words.`;
    if (v.of !== null && v.have === v.of) return { here: true, words: `${name}'s voice is on this phone.` };
    if (v.of === null || (problem && v.have === 0)) {
      return { here: false, words: `No signal: ${name}'s voice comes down when there is. ${meanwhile}` };
    }
    return { here: false, words: `${v.of - v.have} of ${name}'s clips aren't down yet. They come at the next check. ${meanwhile}` };
  },

  async openLesson(topic, lesson, start = 0) {
    if (run) return;
    run = OPENING;
    paintTabs();
    await app.refreshVoice([topic]);
    if (lesson.draw) lesson = drawn(topic, lesson);
    run = new lessonPlayer.Run(view, {
      topic, lesson, start,
      record,
      media: path => sync.mediaUrl(data.mediaPath(topic.id, path)),
      onLeave: () => { run = null; app.go('learn'); },
      voice: { on: () => app.prefs.voice !== false, set: on => app.setPref('voice', on), narrator: app.speakerFor(topic),
        captions: () => app.prefs.captions !== false, setCaptions: on => app.setPref('captions', on) },
    });
    await run.open();
    return run;
  },

  // An animation, played like a video, full screen. Next goes on to the node after it on the path.
  async openVideo(topic, node) {
    if (run) return null;
    run = OPENING;
    paintTabs();
    await app.refreshVoice([topic]);
    const at = topic.path.findIndex(n => n.id === node.id);
    const next = at >= 0 ? topic.path[at + 1] || null : null;
    const opening = playVideo(app, topic, node, {
      next, record,
      media: path => sync.mediaUrl(data.mediaPath(topic.id, path)),
      voice: { on: () => app.prefs.voice !== false, set: on => app.setPref('voice', on), narrator: app.speakerFor(topic) },
      captions: { on: () => app.prefs.captions !== false, set: on => app.setPref('captions', on) },
      onLeave: () => { run = null; app.go('learn'); },
      onNext: () => { run = null; app.openAfter(topic, node); },
    });
    run = { scene: null, opening, remove() {} };
    const v = await opening;
    if (run && run.opening === opening) run = v;
    return v;
  },

  // The node after this one on the path, opened as the path would open it; back to the path if there's none
  // or it can't be started.
  openAfter(topic, node) {
    const path = data.pathOf(topic);
    const at = path.nodes.findIndex(x => x.node.id === node.id);
    const x = at >= 0 ? path.nodes[at + 1] : null;
    if (!x || x.broken) { app.go('learn'); return null; }
    return app.openNode(topic, x.node, x.done ? 0 : x.resume);
  },

  // A node on the path: a lesson, test or exam plays from `start`; an animation plays as a video; a chest
  // opens; a review goes over the facts of the lessons before it (a placeholder if they teach none); an
  // animation without its scene file is a placeholder.
  openNode(topic, node, start = 0) {
    if (run) return null;
    if (node.kind === 'animation' && node.file) return app.openVideo(topic, node);
    if (data.isPlayed(node)) return node.file ? app.openLesson(topic, node.file, start) : null;
    if (node.kind === 'review' && review.poolFor({ node: { topic, node } }).length) return app.openReview({ node: { topic, node } });
    return visitNode(app, topic, node, { record, onLeave: () => app.go('learn') });
  },

  // Review (js/review.js): everything met, every topic mixed (Practice); one topic (Profile, scope); or the
  // facts before a review on a path (node). anyway: nothing was due, so it starts with the closest to slipping.
  async openReview({ scope = null, node = null, anyway = false } = {}) {
    if (run) return null;
    const pool = review.poolFor({ topics: app.topics, scope, node });
    if (!pool.length) return null;
    run = OPENING;
    await app.refreshVoice();
    const back = node ? 'learn' : scope ? 'profile' : 'practice';
    run = new review.Review(view, {
      app, pool, node, scope, anyway, record,
      onLeave: () => { run = null; app.go(back); },
      // each ask read aloud in its own topic's narrator (review.js, voiceFor)
      voice: { on: () => app.prefs.voice !== false },
    });
    await run.open();
    return run;
  },

  async openPart(name) {
    await partScreen(app, name, () => app.go('practice'));
  },

  showConnect() { connectScreen(app, () => app.go('profile')); },

  troubleWords(t) {
    if (t.kind === 'memory') return "Not saving on this phone. This looks like a private window, or storage is blocked, so nothing here survives closing.";
    const kept = t.backupBroken ? 'and the backup is failing too' : 'so your answers are in a backup, and they move back as soon as it can';
    return `Not saving on this phone. It refused the last save (${t.detail}), ${kept}. Closing and reopening Primer usually fixes it.`;
  },
};

// Every attempt and answer: queued to go up as part of a new file, and applied on the phone: the path
// moves on and the memory hears it (data.apply). A phone rebuilt from the repo replays the same events.
function record(event) {
  const e = sync.stampEvent(event);
  sync.enqueue(e);
  data.apply(e);
}

// A test or exam that draws its questions from facts: its listed steps, then `count` facts of its unit or
// topic, the least well remembered first, each asked in a way its lesson didn't use. Drawn afresh each time.
function drawn(topic, file) {
  const d = file.draw || {};
  const from = facts.factsBefore(topic.facts, topic, file.id, d.from === 'unit' ? 'unit' : 'topic');
  const mem = data.memoryNow(), now = clock.now();
  const steps = facts.drawSteps(from, Math.max(1, Number(d.count) || 8), { recall: k => mem.recall(k, now), last: k => (mem.card(k) || {}).ask || null });
  const used = new Set(steps.map(s => s.fact));
  const sources = [...(file.sources || [])];
  for (const f of from) if (used.has(f.id)) for (const s of f.sources) if (!sources.some(x => x.id === s.id)) sources.push(s);
  return { ...file, steps: [...(file.steps || []), ...steps], sources };
}

// A phone that connects with nothing kept (new, or cleared) gets everything back from the repo's progress
// files: the path and the memory, replayed from every event. Done once; never over what the phone has.
let rebuilding = false;
async function maybeRebuild() {
  if (rebuilding || !(await sync.connected()) || (await store.get('rebuilt').catch(() => null)) || !data.isBlank()) return null;
  rebuilding = true;
  try {
    const events = await sync.progressEvents();
    if (!events) return null;   // not every file came down: try again at the next pull
    const waiting = (await store.queueAll()).map(r => r.event);
    const out = await data.rebuild([...events, ...waiting]);
    await store.set('rebuilt', { at: clock.iso(), ...out });
    app.render();
    return out;
  } finally {
    rebuilding = false;
  }
}

// ---------- the tab bar

const tabsEl = document.createElement('nav');
tabsEl.className = 'tabs';
tabsEl.setAttribute('aria-label', 'Tabs');
tabsEl.innerHTML = TABS.map(([id, name, draw]) => id === 'home'
  ? `<button class="tab home" data-tab="${id}"><span class="knob">${draw(34)}</span><span>${name}</span></button>`
  : `<button class="tab" data-tab="${id}"><span class="ic">${draw(26)}</span><span>${name}</span></button>`).join('');
root.append(tabsEl);
// A tab presses in like any button (css/app.css), and opens its screen.
tabsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) app.go(b.dataset.tab);
});
function paintTabs() {
  for (const b of tabsEl.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === app.tab);
  // a quiet dot on Profile when something there needs a look
  const st = sync.status();
  const p = tabsEl.querySelector('[data-tab=profile] span');
  p.style.boxShadow = store.troubleNow() || st.problem || updateReady ? 'inset 0 0 0 2px #ee4b7a' : '';
}

// ---------- offline

function registerWorker() {
  // On a local test server only with ?sw, so a working copy doesn't get stuck behind its own cache.
  if (!('serviceWorker' in navigator) || (isLocalHost && !params.has('sw'))) return;
  const hadOne = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => {
        if (w.state === 'activated' && hadOne) { updateReady = true; paintTabs(); }
      });
    });
    const check = () => reg.update().catch(() => {});
    check();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  }).catch(() => {});
}

// ---------- start

function onHide() { sync.flush({ hide: true }); }

async function reloadLibrary() {
  app.topics = await data.library();
}

async function start() {
  trackViewport();
  feel.wire(document);
  store.onTrouble(paintTabs);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onHide(); });
  addEventListener('pagehide', onHide);
  await store.recover();
  const saved = await store.get('prefs').catch(() => null);
  if (saved) {
    // Prefs saved before 0.2 always held `effects`, chosen or not, so there's no telling whether it was
    // chosen: it starts off again. From 0.2 on, Effects is only on if the switch was turned on.
    Object.assign(app.prefs, saved.v === 2 ? saved : { ...saved, v: 2, effects: false });
  }
  app.setPref('text', app.prefs.text || 'm');
  await data.loadProgress();
  await data.loadMemory();
  await reloadLibrary();
  navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {});
  sync.onChange(paintTabs);
  // only the clips of the narrator each topic uses come down (js/sync.js): the one chosen for its subject
  sync.setNarratorChoice(subject => (subject && (app.prefs.narrators || {})[subject]) || null);
  sync.onPulled(maybeRebuild);
  sync.onPulled(() => app.refreshVoice());
  app.refreshVoice();
  app.tab = SCREENS[app.prefs.tab] ? app.prefs.tab : 'learn';
  app.go(app.tab);
  app.pullNow = await sync.start(async () => { await reloadLibrary(); app.render(); });
  registerWorker();
  window.__primerReady = true;
}

start();

// For the tests and the fit tool, on a local test server only.
if (isLocalHost) {
  window.__primer = {
    app, store, sync, feel, data, parts, rules, lesson: lessonPlayer, clock, facts, memory, review, rebuild: maybeRebuild,
    get run() { return run; },
    // Draws one lesson, without a data repo and without saving anything: for `primer fit`.
    async fit(topic, lesson, i, media = p => p) {
      if (run) { run.remove(); run = null; }
      if (!lesson.steps && Array.isArray(lesson.lines)) lesson = data.sceneLesson(lesson, lesson.id, topic.id);
      run = new lessonPlayer.Run(view, { topic, lesson, start: i, record: () => {}, media, onLeave: () => { run = null; }, voice: { on: () => false } });
      await run.open();
      await new Promise(r => setTimeout(r, 120));
      return run.measure();
    },
    // Draws an animation full screen, still, without saving anything: for `primer fit`.
    async fitVideo(topic, file, media = p => p) {
      if (run) { run.remove(); run = null; }
      const node = { kind: 'animation', id: file.id, title: file.title, file: data.sceneLesson(file, file.id, topic.id) };
      run = await playVideo(app, { ...topic, path: [node] }, node, { record: () => {}, media, voice: { on: () => false }, onLeave: () => { run = null; }, onNext: () => { run = null; } });
      run.scene.still(0);
      await new Promise(r => setTimeout(r, 120));
      return run.scene.measure();
    },
    esc, fitScreen,
  };
}
