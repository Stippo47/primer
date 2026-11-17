// Keeps the test page on the phone, so it opens from the home screen with no signal. Each release
// gets its own cache: change VERSION (here and in js/app.js) when any file changes.
// The cache name is long on purpose: every site under the same address shares one set of caches,
// so this worker only ever clears caches that start with its own full name.
const VERSION = '0.1.0';
const PREFIX = 'primer-stage0-phone-';
const CACHE = PREFIX + VERSION;
const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'audio/chime.m4a',
  'js/app.js',
  'js/sound.js',
  'js/glow.js',
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

// iPhones ask for sound files a slice at a time. A stored file answered whole can leave the player
// silent or stuck, so a request for a slice gets exactly that slice.
async function slice(request, hit) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!m || (m[1] === '' && m[2] === '')) return hit;
  const data = await hit.arrayBuffer();
  const size = data.byteLength;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': hit.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

// Only the page's own files, stored copy first.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return e.request.headers.has('range') ? slice(e.request, hit) : hit;
    if (e.request.mode === 'navigate') return (await c.match('index.html')) || fetch(e.request);
    return fetch(e.request);
  }));
});
