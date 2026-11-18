// Keeps the app on the phone, so it opens with no signal. Each release gets its own cache: change VERSION
// (here and in js/app.js) when anything here changes, and the phone moves to the new set in one step.
//
// This worker's scope is the whole of /primer/, which also holds stage 0's pages and the docs. So it
// answers only for the app's own files, listed below, and lets every other request go to the network
// untouched. Lessons and their media are kept by the app itself, in IndexedDB, never here.
// Caches it makes are named primer-app-<VERSION>, and it only ever clears caches with that prefix: a test
// page under the same address keeps its own (primer-stage0-phone-…), and those must survive.
const VERSION = '0.1.0';
const PREFIX = 'primer-app-';
const CACHE = PREFIX + VERSION;
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/lesson.css',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/art.js',
  'js/data.js',
  'js/ease.js',
  'js/feel.js',
  'js/gesture.js',
  'js/lesson.js',
  'js/parts.js',
  'js/rules.js',
  'js/store.js',
  'js/sync.js',
  'js/ui.js',
  'js/screens/home.js',
  'js/screens/learn.js',
  'js/screens/practice.js',
  'js/screens/profile.js',
  'parts/parts.json',
  'parts/globe/part.json',
  'parts/globe/globe.js',
  'parts/globe/thumb.svg',
  'parts/inputs/part.json',
  'parts/inputs/inputs.js',
  'parts/inputs/thumb.svg',
  'vendor/d3-array.min.mjs',
  'vendor/d3-geo.min.mjs',
  'vendor/topojson-client.min.js',
  'vendor/countries-110m.json',
  'vendor/fonts/nunito-latin.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The app's own files, by their path inside the scope: '' is the app itself.
const OWN = new Set(FILES.map(f => (f === './' ? '' : f)));
const inScope = url => {
  const base = new URL(self.registration.scope).pathname;
  return url.pathname.startsWith(base) ? url.pathname.slice(base.length) : null;
};

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const path = inScope(url);
  if (path === null || !OWN.has(path)) return; // stage 0, the docs, anything else: straight to the network
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    if (e.request.mode === 'navigate') return (await c.match('index.html')) || fetch(e.request);
    return fetch(e.request);
  }));
});
