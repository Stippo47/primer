// Primer's shell: start-up, the five tabs, opening a lesson or a part, connecting, and what runs when the
// app is hidden. The tabs are Learn, Practice, Home (raised, in the centre), Shop and Profile. The tab bar
// hides inside a lesson, an opened part and the connect screen; a cross or a back arrow leaves.
import * as store from './store.js';
import * as sync from './sync.js';
import * as feel from './feel.js';
import * as data from './data.js';
import * as parts from './parts.js';
import * as lessonPlayer from './lesson.js';
import * as rules from './rules.js';
import { icon } from './art.js';
import { esc } from './ui.js';
import { learnScreen } from './screens/learn.js';
import { practiceScreen, partScreen } from './screens/practice.js';
import { homeScreen, shopScreen } from './screens/home.js';
import { profileScreen, connectScreen } from './screens/profile.js';
import { visitNode } from './screens/node.js';
import { DEFAULT_NARRATOR } from './scene.js';

const VERSION = '0.2.0'; // keep in step with sw.js
const root = document.getElementById('app');
const view = document.getElementById('view');
const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const params = new URLSearchParams(location.search);

// ---------- the phone itself

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalled = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

function trackViewport() {
  document.addEventListener('gesturestart', e => e.preventDefault());
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
let updateReady = false;
const app = {
  VERSION, root, view, store, sync,
  topics: [],
  // Effects start off (ruled 2026-11-18: the press sounds are disliked until better ones are chosen).
  // narrators: the narrator chosen for a subject, overriding its topics' own: { "Earth science": "george" }.
  prefs: { v: 2, voice: true, effects: false, music: false, text: 'm', topic: null, tab: 'learn', narrators: {} },
  tab: 'learn',
  partNow: null,
  mustInstall: isIOS && !isInstalled,
  pullNow: () => Promise.resolve(),
  mediaUrl: path => sync.mediaUrl(path),

  go(tab) {
    if (run) return;
    app.tab = tab;
    app.setPref('tab', tab);
    document.documentElement.classList.remove('bare');
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

  // The narrator for a topic: the one chosen in Profile for its subject, else the topic's own.
  narratorFor(topic) {
    return (topic.subject && (app.prefs.narrators || {})[topic.subject]) || topic.narrator || DEFAULT_NARRATOR;
  },

  async openLesson(topic, lesson, start = 0) {
    if (run) return;
    paintTabs();
    run = new lessonPlayer.Run(view, {
      topic, lesson, start,
      record,
      media: path => sync.mediaUrl(data.mediaPath(topic.id, path)),
      onLeave: () => { run = null; app.go('learn'); },
      voice: { on: () => app.prefs.voice !== false, set: on => app.setPref('voice', on), narrator: app.narratorFor(topic) },
    });
    await run.open();
    return run;
  },

  // A node on the path: a lesson, test, exam or animation plays from `start`; a chest or review opens (and
  // an animation without its scene file, as a placeholder).
  openNode(topic, node, start = 0) {
    if (run) return null;
    if (data.isPlayed(node)) return node.file ? app.openLesson(topic, node.file, start) : null;
    return visitNode(app, topic, node, { record, onLeave: () => app.go('learn') });
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

// Every attempt and answer: saved on the phone, then queued to go up as part of a new file.
function record(event) {
  sync.enqueue(event);
  if (event.type === 'start') data.noteLesson(event.topic, event.lesson, 'start');
  if (event.type === 'seen') data.noteStep(event.topic, event.lesson, event.step, { seen: true });
  if (event.type === 'attempt') data.noteStep(event.topic, event.lesson, event.step, { right: event.right, close: event.close, seen: false });
  if (event.type === 'finish') data.noteLesson(event.topic, event.lesson, 'finish');
  if (event.type === 'open') data.noteNode(event.topic, event.node, event.kind);
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
  await reloadLibrary();
  navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {});
  sync.onChange(paintTabs);
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
    app, store, sync, feel, data, parts, rules, lesson: lessonPlayer,
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
    esc,
  };
}
