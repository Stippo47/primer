// The phone talks straight to GitHub. Lessons come down from the private data repo, and attempts go up
// as batches, each a new file, so the phone and whoever writes lessons can never collide.
// Anything that stops a send ends up in status(), in plain words, for the screens to show.
// Copied from Riffle's sync, without photos and their own decks.
import * as store from './store.js';
import * as clock from './clock.js';

// The data repo's owner is the one whose GitHub Pages serve this app (<owner>.github.io), so no name
// is written into this public code. A local test server uses a stand-in owner.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const OWNER = location.hostname.endsWith('.github.io') ? location.hostname.split('.')[0] : 'test-owner';
export const REPO = 'primer-data', BRANCH = 'main';
const FULL = `${OWNER}/${REPO}`;
const SEND_EVERY = 15000, MAX_BATCH = 200, KEEPALIVE_LIMIT = 40000, PULL_EVERY = 30000;
const MEDIA_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', m4a: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac' };
const CALL_TIMEOUT = 25000, STUCK_AFTER = 40000, STREAK_LIMIT = 3, MEDIA_TIMEOUT = 60000;

// A local test server can stand in for GitHub, but only on this computer.
const API = (isLocal && new URLSearchParams(location.search).get('api')) || 'https://api.github.com';

export const tokenPage = () => {
  const q = new URLSearchParams({
    name: 'Primer',
    description: `Primer on my phone: reads and writes ${REPO}, nothing else.`,
    target_name: OWNER,
    expires_in: 'none',
    contents: 'write',
  });
  return `https://github.com/settings/personal-access-tokens/new?${q}`;
};

const state = {
  readAt: 0,
  connected: false, waiting: 0, sending: false, sendingSince: 0,
  problem: null,      // why sending has stopped, in plain words
  noSignal: false,    // the last try couldn't reach GitHub, and that looks like just no signal
  lastTry: '',        // what the last try came to, for the settings
  sentAt: 0, sentCount: 0, failStreak: 0,
  pulledAt: 0, pullProblem: null,
};
const listeners = new Set();
let libraryChanged = () => {}; // set by start(): what to do when new lessons come down
export const status = () => ({ ...state });
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => fn(status()));

const getKey = () => store.get('gh-key');
const remember = () => store.set('send-status', { sentAt: state.sentAt, sentCount: state.sentCount, problem: state.problem, lastTry: state.lastTry });

// Every call gives up in the end. A phone can freeze a page mid-call, and a call that never
// finishes must not hold up everything after it.
async function call(path, key, { method = 'GET', body, accept = 'application/vnd.github+json', keepalive = false, timeout = CALL_TIMEOUT } = {}) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), timeout);
  try {
    return await fetch(API + path, {
      method,
      keepalive,
      signal: stop.signal,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${key}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } finally {
    clearTimeout(timer);
  }
}

const toBase64 = data => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

// Every write this phone makes waits its turn, one at a time. Two writes at once each make a commit on
// the same branch, and the second is refused (409) because the first moved it on.
const line = { busy: false, jobs: [] };
function inLine(job) {
  return new Promise((resolve, reject) => {
    line.jobs.push({ job, resolve, reject });
    nextWrite();
  });
}
async function nextWrite() {
  if (line.busy) return;
  const next = line.jobs.shift();
  if (!next) return;
  line.busy = true;
  try { next.resolve(await next.job()); } catch (e) { next.reject(e); } finally { line.busy = false; nextWrite(); }
}

// A 409 left over, from another phone or a write GitHub hadn't finished, is tried again a few times
// before anything is said about it.
const RETRY_409 = [400, 1200, 3000];
async function put(path, body, key, opts = {}) {
  for (let i = 0; ; i++) {
    const r = await call(`/repos/${FULL}/contents/${path}`, key, { method: 'PUT', body, ...opts });
    if (r.status !== 409 || i >= RETRY_409.length) return r;
    await new Promise(res => setTimeout(res, RETRY_409[i]));
  }
}

const putFile = (path, content, message, key, opts = {}) =>
  inLine(() => put(path, { message, content: toBase64(content), branch: BRANCH }, key, opts));

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const rand = () => Math.random().toString(36).slice(2, 8);

const networkWords = e => (e && e.name === 'AbortError' ? "GitHub didn't answer in time" : `couldn't reach GitHub${e && e.message ? ` (${e.message})` : ''}`);

// Turns a refusal from GitHub into what happened and what to do. Never holds the key.
async function refusal(r) {
  let said = '';
  try { said = (await r.clone().json()).message || ''; } catch { /* no message to pass on */ }
  const quote = said ? ` GitHub said: "${said}".` : '';
  const slowed = r.status === 429 || (r.status === 403 && (/rate limit/i.test(said) || r.headers.get('retry-after') || r.headers.get('x-ratelimit-remaining') === '0'));
  if (slowed) return { text: `GitHub asked the app to slow down (${r.status}). It will try again by itself.`, retry: true };
  if (r.status === 401) return { text: "GitHub isn't accepting your key any more (401). It may have been deleted. Connect again from Profile.", retry: false };
  if (r.status === 409) return { text: 'GitHub was busy saving something else from this phone, and said to wait (409). Nothing is lost, and it will try again by itself.', retry: true };
  if (r.status === 403) return { text: `Your key isn't allowed to write to ${REPO} (403).${quote} On GitHub's key page, Contents has to be Read and write.`, retry: false };
  if (r.status === 404) return { text: `GitHub can't find ${REPO} with this key (404). Connect again from Profile, with ${REPO} picked.`, retry: false };
  if (r.status >= 500) return { text: `GitHub is having trouble (${r.status}). It will try again by itself.`, retry: true };
  return { text: `GitHub said no to a save from this phone (${r.status}).${quote.replace(/\b[0-9a-f]{12,40}\b/g, '…')} It will try again by itself.`, retry: true };
}

// Checks a pasted key before keeping it. Only a key that reaches the data repo, can write to it and
// sees no other private repo gets saved. Every way this can fail says why.
export async function connect(raw) {
  const key = raw.trim();
  if (!key) return { ok: false, keepText: true, message: 'Paste the key first.' };
  try {
    const repo = await call(`/repos/${FULL}`, key);
    if (repo.status === 401) return { ok: false, message: "GitHub didn't accept that key. Copy it again, the whole thing." };
    if (repo.status === 404) return { ok: false, message: `That key can't see ${REPO}. On GitHub's page, under Repository access, choose Only select repositories and pick ${REPO}.` };
    if (!repo.ok) return { ok: false, keepText: true, message: `GitHub wouldn't check that key (${repo.status}). ${(await refusal(repo)).text}` };

    const others = await visibleOthers(key);
    if (others === null) return { ok: false, keepText: true, message: "GitHub wouldn't say what that key can see, so I didn't keep it. Try again in a minute." };
    if (others.length) {
      const names = others.slice(0, 3).join(', ');
      const n = others.length;
      return { ok: false, message: `That key works, but it can also see ${n} other private repo${n === 1 ? '' : 's'} (${names}), so I didn't keep it. Delete it on GitHub, then make a new one with only ${REPO} picked.` };
    }

    const check = JSON.stringify({ v: 1, type: 'connect-check', at: new Date().toISOString() }, null, 1);
    const wrote = await putFile(`progress/connect-check-${stamp()}-${rand()}.json`, check, 'Phone connected', key);
    if (!wrote.ok) {
      return { ok: false, message: wrote.status === 403 || wrote.status === 404
        ? `That key can read ${REPO} but can't write to it (${wrote.status}). On GitHub's page, set Contents to Read and write.`
        : `GitHub said no to a test write (${wrote.status}). ${(await refusal(wrote)).text}` };
    }
    await store.setSecret('gh-key', key);
    state.connected = true;
    state.problem = null;
    state.noSignal = false;
    state.failStreak = 0;
    state.lastTry = 'Connected, and a test write worked.';
    remember();
    emit();
    pull(libraryChanged).catch(() => {});
    flush();
    return { ok: true, message: `Connected. A test write worked, and this key reaches ${REPO} and nothing else.` };
  } catch (e) {
    if (e instanceof TypeError || (e && e.name === 'AbortError')) {
      return { ok: false, keepText: true, message: `Couldn't check it: ${networkWords(e)}. Check for signal and try again.` };
    }
    return { ok: false, keepText: true, message: `Something went wrong keeping the key (${e && e.message ? e.message : 'unknown error'}). Try again.` };
  }
}

// Private repos the key can really open, other than the data repo. Null if GitHub didn't answer.
// A listed repo gets tried too, so a list that says too much can't turn away a good key.
async function visibleOthers(key) {
  const r = await call('/user/repos?per_page=100&affiliation=owner,collaborator,organization_member', key);
  if (!r.ok) return null;
  const list = (await r.json()).filter(x => x.private && x.full_name.toLowerCase() !== FULL.toLowerCase());
  const reachable = [];
  for (const x of list.slice(0, 5)) {
    if ((await call(`/repos/${x.full_name}`, key)).ok) reachable.push(x.name);
  }
  return reachable;
}

export async function disconnect() {
  await store.del('gh-key');
  state.connected = false;
  state.problem = null;
  state.noSignal = false;
  state.pullProblem = null;
  state.lastTry = '';
  remember();
  emit();
}

let eidCount = 0;
export const newId = () => `${Date.now().toString(36)}-${(eidCount++).toString(36)}-${rand()}`;

// An event as it's kept and sent: its id and time added (the app's clock, js/clock.js).
export const stampEvent = event => (event.eid ? event : { v: 1, eid: newId(), at: clock.iso(), ...event });

// The write into the backup list happens before this returns its promise, so an answer queued a
// moment before the app dies is still kept.
export async function enqueue(event) {
  const queued = store.queueAdd(stampEvent(event));
  await queued;
  state.waiting = await store.queueCount();
  emit();
}

export const connected = async () => !!(await getKey().catch(() => null));

let lastAttempt = 0;
// Sends one batch. The answer says how it went, for the Send now button.
export async function flush({ hide = false } = {}) {
  if (state.sending && Date.now() - state.sendingSince < STUCK_AFTER) return { ok: false, message: 'Already sending.' };
  let key;
  try { key = await getKey(); } catch { return { ok: false, message: "Couldn't read your key on this phone just now. It tries again by itself." }; }
  if (!key) return { ok: false, message: 'Not connected yet.' };
  const items = await store.queueAll();
  state.waiting = items.length;
  if (!items.length) { emit(); return { ok: true, message: 'Nothing waiting to send.' }; }
  const batch = items.slice(0, MAX_BATCH);
  state.sending = true;
  state.sendingSince = Date.now();
  lastAttempt = Date.now();
  let out;
  try {
    const device = await deviceId();
    const text = JSON.stringify({ v: 1, device, sentAt: new Date().toISOString(), events: batch.map(i => i.event) }, null, 1);
    const n = batch.length;
    const r = await putFile(`progress/${stamp()}-${rand()}.json`, text, `${n} answer${n === 1 ? '' : 's'} from the phone`, key,
      { keepalive: hide && text.length < KEEPALIVE_LIMIT });
    if (r.ok) {
      await store.queueRemove(batch.map(i => i.key));
      state.waiting = items.length - batch.length;
      state.problem = null;
      state.noSignal = false;
      state.failStreak = 0;
      state.sentAt = Date.now();
      state.sentCount += n;
      state.lastTry = `Sent ${n} answer${n === 1 ? '' : 's'}.`;
      out = { ok: true, message: state.lastTry };
    } else {
      const why = await refusal(r);
      state.problem = why.text;
      state.noSignal = false;
      state.lastTry = why.text;
      out = { ok: false, message: why.text };
    }
  } catch (e) {
    const words = networkWords(e);
    state.failStreak++;
    state.lastTry = `Last try ${words}.`;
    // One miss is just no signal. Several while the phone says it's online is a real problem.
    if (state.failStreak >= STREAK_LIMIT && navigator.onLine !== false) {
      state.problem = `The phone seems online, but answers aren't getting through: ${words}. They're safe here and it keeps trying.`;
      state.noSignal = false;
    } else {
      state.noSignal = true;
    }
    out = { ok: false, message: `Couldn't send: ${words}. They're safe here and it keeps trying.` };
  } finally {
    state.sending = false;
    remember();
    emit();
  }
  return out;
}

async function deviceId() {
  let id = await store.get('device');
  if (!id) { id = `phone-${rand()}`; await store.set('device', id); }
  return id;
}

export async function eachAtOnce(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) await fn(list[i++]);
  }));
}

// Brings one file down and keeps it. Two asking for the same file share one download.
const fetching = new Map();
const mediaUrls = new Map();
function fetchFile(path, sha, key) {
  if (fetching.has(path)) return fetching.get(path);
  const job = (async () => {
    const blob = await call(`/repos/${FULL}/git/blobs/${sha}`, key, { accept: 'application/vnd.github.raw+json', timeout: MEDIA_TIMEOUT });
    if (!blob.ok) throw new Error(String(blob.status));
    // GitHub labels raw files as its own type, so media gets its real one back.
    const data = path.endsWith('.json') ? await blob.text() : new Blob([await blob.arrayBuffer()], { type: MEDIA_TYPES[path.split('.').pop().toLowerCase()] || 'application/octet-stream' });
    const rec = { path, sha, data, changed: Date.now() };
    await store.files.set(path, rec);
    mediaUrls.delete(path);
    return rec;
  })().finally(() => fetching.delete(path));
  fetching.set(path, job);
  return job;
}

// A media file's address on this phone, from its path in the repo. Null if it isn't here.
export async function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('data:')) return path;
  if (mediaUrls.has(path)) return mediaUrls.get(path);
  const rec = await store.files.get(path).catch(() => null);
  if (!rec || !(rec.data instanceof Blob)) return null;
  const type = MEDIA_TYPES[path.split('.').pop().toLowerCase()];
  const url = URL.createObjectURL(type && rec.data.type !== type ? rec.data.slice(0, rec.data.size, type) : rec.data);
  mediaUrls.set(path, url);
  return url;
}

// What the app reads from the data repo: the index, topics and their lessons and media, the narrators'
// samples, and the writer's note of what's been read. Nothing else (the writer's notes, the phone's own
// progress) comes down.
const wanted = path => path === 'index.json' || path === 'read.json' || path.startsWith('topics/') || path.startsWith('narrators/');

// ---------- the narrators' samples
// Each narrator saying who it is ("Hello, I'm Heart…"): narrators/samples.json and the clips it names. They
// are kept on the phone always, whichever narrator is in use (the rule below only ever drops a topic's own
// clips), so a narrator can be heard in Profile before it's chosen and before its clips come down.
export const SAMPLES = 'narrators/samples.json';
// { narrator: { clip, said, seconds, url } } for every sample on this phone; url is its address here.
export async function samples() {
  const rec = await store.files.get(SAMPLES).catch(() => null);
  let list = {};
  try { list = (JSON.parse(rec.data) || {}).samples || {}; } catch { return {}; }
  const out = {};
  for (const [id, s] of Object.entries(list)) {
    if (!s || !s.clip) continue;
    const url = await mediaUrl(s.clip);
    if (url) out[id] = { clip: s.clip, said: s.said, seconds: s.seconds, url };
  }
  return out;
}

// ---------- voice: only the narrator in use
// Every line is voiced in all four narrators, so any can be chosen, but a topic plays in one: the one chosen
// for its subject in Profile, else the topic's own (else Heart). Only that one's clips come down, about a
// quarter of a topic's voice; the others stay out of storage, and a narrator's clips go once no topic uses
// it. A clip not here is never an error: its line plays from its words, as with Voice off (js/narration.js).
//
// A new narrator keeps the old voice going (ruled 2026-11-18, "new narrator, no signal"): after a change, the
// topic goes on playing in the narrator whose clips are all on the phone until every clip of the new one is
// down; then it switches, all at once, and the old one's clips go. So a change with no signal, or one half
// fetched, never leaves a topic silent or speaking in two voices (voiceFor).

// The narrator chosen in Profile for a subject, if any: set by the app.
let chosenFor = () => null;
export const setNarratorChoice = fn => { chosenFor = fn; };

// A voice clip's topic and narrator, from its path: topics/<topic>/voice/<key>/<line>.<narrator>.<hash>.m4a
export function clipOf(path) {
  const m = /^topics\/([^/]+)\/voice\/.+\/[^/]+\.([a-z0-9-]+)\.[0-9a-f]{8}\.m4a$/.exec(path);
  return m ? { topic: m[1], narrator: m[2] } : null;
}

// For each topic with clips in `paths`: the narrator whose clips it keeps. Of the one chosen for its subject,
// its own, then Heart, the first it has clips in; if it has clips in none of those, any it has.
export async function voiceInUse(paths) {
  const has = new Map();
  for (const p of paths) {
    const c = clipOf(p);
    if (!c) continue;
    if (!has.has(c.topic)) has.set(c.topic, new Set());
    has.get(c.topic).add(c.narrator);
  }
  const out = new Map();
  for (const [topic, voiced] of has) {
    const f = await store.files.get(`topics/${topic}/topic.json`).catch(() => null);
    let t = null;
    try { t = f ? JSON.parse(f.data) : null; } catch { t = null; }
    const order = [t && chosenFor(t.subject), t && t.narrator, 'heart'].filter(Boolean);
    out.set(topic, order.find(n => voiced.has(n)) || [...voiced].sort()[0]);
  }
  return out;
}
const keepClip = (path, inUse, kept = new Map()) => { const c = clipOf(path); return !c || !inUse.has(c.topic) || inUse.get(c.topic) === c.narrator || kept.get(c.topic) === c.narrator; };

// Every clip of each narrator a topic has, from its voice files on this phone: Map narrator -> Set of paths.
// A voice file is read once for each version of it (its sha).
const voiceMemo = new Map();   // path -> { sha, by: Map narrator -> [clip paths] }
async function clipsByNarrator(topic, paths) {
  const by = new Map();
  for (const p of paths) {
    if (!p.startsWith(`topics/${topic}/voice/`) || !p.endsWith('.json')) continue;
    const f = await store.files.get(p).catch(() => null);
    if (!f) continue;
    let memo = voiceMemo.get(p);
    if (!memo || memo.sha !== f.sha) {
      const mine = new Map();
      try {
        const v = JSON.parse(f.data);
        for (const byVoice of Object.values(v.lines || {})) {
          for (const [n, c] of Object.entries(byVoice || {})) {
            if (!c || typeof c.clip !== 'string') continue;
            if (!mine.has(n)) mine.set(n, []);
            mine.get(n).push(`topics/${topic}/${c.clip}`);
          }
        }
      } catch { /* not a voice file */ }
      memo = { sha: f.sha, by: mine };
      voiceMemo.set(p, memo);
    }
    for (const [n, list] of memo.by) { if (!by.has(n)) by.set(n, new Set()); for (const c of list) by.get(n).add(c); }
  }
  return by;
}

// The narrator a topic plays in now, and why: { narrator, chosen, waiting, have, of }. chosen is the one in use
// for it (Profile's choice for its subject, else its own, else Heart, the first it has clips in); narrator is
// chosen once every clip of it is on this phone, and until then the narrator whose clips all are (the old
// one), if there is one. waiting: a change is still coming down. have, of: how many of chosen's clips are here.
export async function voiceFor(topicId) {
  const paths = await store.files.paths();
  const here = new Set(paths);
  const by = await clipsByNarrator(topicId, paths);
  const f = await store.files.get(`topics/${topicId}/topic.json`).catch(() => null);
  let t = null;
  try { t = f ? JSON.parse(f.data) : null; } catch { t = null; }
  const order = [t && chosenFor(t.subject), t && t.narrator, 'heart'].filter(Boolean);
  const chosen = order.find(n => by.has(n)) || order[0] || 'heart';
  // a clip the repo no longer has (looked at since the app opened) doesn't hold a narrator back
  const gone = p => lastTree && !lastTreeSet.has(p);
  const count = n => { const all = [...(by.get(n) || [])].filter(p => !gone(p)); return { have: all.filter(p => here.has(p)).length, of: all.length }; };
  const full = n => { const c = count(n); return c.of > 0 && c.have === c.of; };
  const mine = count(chosen);
  if (!by.has(chosen) || full(chosen)) {
    await keptNow(topicId, chosen);
    return { narrator: chosen, chosen, waiting: false, ...mine };
  }
  const kept = (await store.get('voice-kept').catch(() => null)) || {};
  const old = [kept[topicId], ...order, ...[...by.keys()].sort()].find(n => n && n !== chosen && full(n));
  return { narrator: old || chosen, chosen, waiting: true, ...mine };
}
// Remembers which narrator each topic last played in whole, to keep while a new one comes down.
async function keptNow(topicId, narrator) {
  const kept = (await store.get('voice-kept').catch(() => null)) || {};
  if (kept[topicId] !== narrator) await store.set('voice-kept', { ...kept, [topicId]: narrator });
}

// The repo's files at the last pull that could see them: what the voice in use is counted against.
let lastTree = null, lastTreeSet = new Set();

// How much of the voice in use for these topics is on this phone: { have, of, narrators }. Worked out from
// the last look at the repo; `of` is null if there hasn't been one since the app opened.
export async function voiceHere(topicIds) {
  if (!lastTree) return { have: 0, of: null, narrators: [], playing: [] };
  const inUse = await voiceInUse(lastTree);
  const want = lastTree.filter(p => { const c = clipOf(p); return c && topicIds.includes(c.topic) && inUse.get(c.topic) === c.narrator; });
  const here = new Set(await store.files.paths());
  const playing = [];
  for (const id of topicIds) playing.push((await voiceFor(id)).narrator);
  return { have: want.filter(p => here.has(p)).length, of: want.length, narrators: topicIds.map(id => inUse.get(id)).filter(Boolean), playing };
}

// Brings down whatever changed: words first, so new lessons show straight away, then media, so lessons
// work offline. Says whether any words changed, and tells `onWords` as soon as they have.
export async function pull(onWords = () => {}) {
  let key;
  try { key = await getKey(); } catch { return false; }
  if (!key) return false;
  const fail = text => { state.pullProblem = text; emit(); return false; };
  let r;
  try {
    r = await call(`/repos/${FULL}/git/trees/${BRANCH}?recursive=1`, key);
  } catch (e) {
    return fail(`Couldn't check for new lessons: ${networkWords(e)}.`);
  }
  if (!r.ok) return fail(`Couldn't check for new lessons. ${(await refusal(r)).text}`);
  const tree = (await r.json()).tree.filter(t => t.type === 'blob' && wanted(t.path));
  const have = new Map((await store.files.all()).map(f => [f.path, f.sha]));
  const todo = tree.filter(t => have.get(t.path) !== t.sha);
  let changed = false, missed = 0;
  const bring = async t => {
    try { await fetchFile(t.path, t.sha, key); changed = true; } catch { missed++; }
  };
  await eachAtOnce(todo.filter(t => t.path.endsWith('.json')), 6, bring);
  const live = new Set(tree.map(t => t.path));
  for (const path of have.keys()) {
    if (!live.has(path)) { await store.files.del(path); mediaUrls.delete(path); changed = true; }
  }
  if (changed) await onWords();
  // the words are down, so each topic's narrator is known: only its clips are kept, and while a new one is
  // still coming down, the old one's too, so the topic keeps a voice (voiceFor)
  lastTree = tree.map(t => t.path);
  lastTreeSet = live;
  const inUse = await voiceInUse(lastTree);
  const kept = new Map();
  for (const topic of inUse.keys()) {
    const v = await voiceFor(topic);
    if (v.narrator !== inUse.get(topic)) kept.set(topic, v.narrator);
  }
  for (const path of have.keys()) {
    if (live.has(path) && !keepClip(path, inUse, kept)) { await store.files.del(path); mediaUrls.delete(path); }
  }
  await eachAtOnce(todo.filter(t => !t.path.endsWith('.json') && keepClip(t.path, inUse)), 3, bring);
  // every clip of the new narrator is here: it takes over, and the old one's clips go
  for (const [topic, old] of kept) {
    const v = await voiceFor(topic);
    if (v.narrator === old) continue;
    for (const path of await store.files.paths()) {
      const c = clipOf(path);
      if (c && c.topic === topic && c.narrator === old) { await store.files.del(path); mediaUrls.delete(path); }
    }
  }
  await readWhen();
  state.pulledAt = Date.now();
  state.pullProblem = missed ? `${missed} file${missed === 1 ? '' : 's'} didn't come down. It will try again.` : null;
  emit();
  for (const fn of pulled) await Promise.resolve(fn()).catch(() => {});
  return changed;
}

// Told after every pull: the app checks then whether this phone needs its memory back.
const pulled = new Set();
export const onPulled = fn => { pulled.add(fn); return () => pulled.delete(fn); };

// Every event in the repo's progress files, repeats dropped: what a new or cleared phone rebuilds its
// memory and path from. These files never come down to be kept; they're read once, here. Null if any
// couldn't be read (no signal, a refusal), so nothing is rebuilt from half the story.
export async function progressEvents() {
  let key;
  try { key = await getKey(); } catch { return null; }
  if (!key) return null;
  try {
    const r = await call(`/repos/${FULL}/git/trees/${BRANCH}?recursive=1`, key);
    if (!r.ok) return null;
    const list = (await r.json()).tree.filter(t => t.type === 'blob' && /^progress\/[^/]+\.json$/.test(t.path) && !t.path.startsWith('progress/connect-check'));
    const events = [], seen = new Set();
    let missed = 0;
    await eachAtOnce(list, 4, async t => {
      try {
        const b = await call(`/repos/${FULL}/git/blobs/${t.sha}`, key, { accept: 'application/vnd.github.raw+json', timeout: MEDIA_TIMEOUT });
        if (!b.ok) throw new Error(String(b.status));
        const batch = JSON.parse(await b.text());
        for (const e of (batch && batch.events) || []) if (e && e.eid && !seen.has(e.eid)) { seen.add(e.eid); events.push(e); }
      } catch { missed++; }
    });
    return missed ? null : events;
  } catch {
    return null;
  }
}

// When the writer last read the attempts, from the note they leave in the repo.
async function readWhen() {
  const f = await store.files.get('read.json').catch(() => null);
  if (!f) { state.readAt = 0; return; }
  try { state.readAt = Date.parse(JSON.parse(f.data).at) || 0; } catch { state.readAt = 0; }
}

// Starts the regular sending. The app sends when it's hidden through the hide handler in app.js.
export async function start(onLibraryChange) {
  const saved = await store.get('send-status').catch(() => null);
  if (saved) Object.assign(state, { sentAt: saved.sentAt || 0, sentCount: saved.sentCount || 0, problem: saved.problem || null, lastTry: saved.lastTry || '' });
  state.connected = !!(await getKey().catch(() => null));
  state.waiting = await store.queueCount();
  await readWhen();
  emit();
  libraryChanged = onLibraryChange;
  const tryPull = () => pull(onLibraryChange).catch(() => {});
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !state.connected) return;
    if (state.waiting && Date.now() - lastAttempt >= SEND_EVERY) flush();
  }, 3000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') return;
    if (state.waiting && Date.now() - lastAttempt >= SEND_EVERY) flush();
    if (Date.now() - state.pulledAt > PULL_EVERY) tryPull();
  });
  addEventListener('online', () => { flush(); tryPull(); });
  if (state.connected) { flush(); tryPull(); }
  return tryPull;
}
