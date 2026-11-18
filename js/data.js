// What the app knows: the topics and lessons that came down from the data repo, what has been done with
// them on this phone, and the memory of every fact met (js/memory.js). The layout of the data repo is in
// docs/format.md. Everything done is an event (format.md, "A progress file"); `apply` turns one into the
// path's progress and the memory, live and when a new phone rebuilds itself from the repo's progress.
import * as store from './store.js';
import * as clock from './clock.js';
import { topicFacts, factKey } from './facts.js';
import { Memory, applyEvent, topicMemory } from './memory.js';

const LEVELS = ['glance', 'tour', 'solid', 'deep'];
export const LEVEL_WORDS = { glance: 'Glance', tour: 'Tour', solid: 'Solid', deep: 'Deep' };
export const levelRank = level => Math.max(0, LEVELS.indexOf(level)) + 1;

const json = f => { try { return JSON.parse(f.data); } catch { return null; } };

// The kinds of node on a topic's path. Lessons, tests and exams are played step by step and have a file
// each. An animation has a file too, a scene, and is played as a lesson of one scene step (sceneLesson);
// without its file it's a placeholder. A chest and a review are the node alone: a review goes over the
// facts of the lessons before it (js/review.js).
export const NODE_KINDS = ['lesson', 'test', 'exam', 'chest', 'review', 'animation'];
export const PLAYED = new Set(['lesson', 'test', 'exam']);
export const isPlayed = n => PLAYED.has(n.kind) || !!n.file;
export const KIND_WORDS = { lesson: 'Lesson', test: 'Test', exam: 'Exam', chest: 'Chest', review: 'Review', animation: 'Animation' };
const DEFAULT_TITLES = { chest: 'A chest', review: 'Review', animation: 'Animation' };

// A scene file (an animation on the path) as a lesson of one step, so it plays, saves and is marked done
// exactly as a lesson is. Its voice file is voice/<node>.json.
export function sceneLesson(file, id, topic) {
  const { parts, lines, title } = file;
  return { ...file, id, topic, kind: 'animation', steps: [{ id, kind: 'scene', title, parts, lines, voiceKey: id }] };
}

// Where a scene's voice is: voice/<node>.json for an animation, voice/<lesson>.<step>.json for a scene
// step in a lesson. It lists each line's clip for each narrator, and when each word is said.
export const voicePath = (topicId, key) => `topics/${topicId}/voice/${key}.json`;

// The facts of every topic in the library, by topic id: what the memory replays events against.
let factsByTopic = {};
export const factIndex = () => factsByTopic;

// The library: every topic in the index, in its order. Each has its path (the nodes in order, a played
// one carrying its file as `file`), its lessons (every played file, in path order) and its facts (from
// its lessons, families expanded: facts.js, topicFacts). A topic written before the path existed lists
// "lessons" only, and each becomes a lesson node. Files that can't be read leave their node with nothing
// to start, and the path goes on past it. A test or exam may draw its questions from facts (`draw`) as
// well as, or instead of, listing them. Scene steps carry their voice file as `timing`.
export async function library() {
  const files = new Map((await store.files.words()).map(f => [f.path, f]));
  const index = files.has('index.json') ? json(files.get('index.json')) : null;
  const ids = index && Array.isArray(index.topics)
    ? index.topics.map(t => t.id)
    : [...files.keys()].map(p => p.match(/^topics\/([^/]+)\/topic\.json$/)).filter(Boolean).map(m => m[1]).sort();
  const topics = [];
  for (const id of ids) {
    const t = files.has(`topics/${id}/topic.json`) ? json(files.get(`topics/${id}/topic.json`)) : null;
    if (!t) continue;
    const given = Array.isArray(t.path) ? t.path : (t.lessons || []).map(lid => ({ kind: 'lesson', id: lid }));
    const path = given.filter(n => n && typeof n.id === 'string' && NODE_KINDS.includes(n.kind)).map(n => {
      let file = null;
      const own = PLAYED.has(n.kind) || n.kind === 'animation';
      const l = own && files.has(`topics/${id}/${n.id}.json`) ? json(files.get(`topics/${id}/${n.id}.json`)) : null;
      const draws = !!(l && n.kind !== 'lesson' && l.draw && typeof l.draw === 'object');
      const steps = l && Array.isArray(l.steps) ? l.steps : draws ? [] : null;
      if (PLAYED.has(n.kind)) file = steps && (steps.length || draws) ? { ...l, steps, id: n.id, topic: id, kind: n.kind } : null;
      if (n.kind === 'animation') file = l && Array.isArray(l.lines) && l.lines.length ? sceneLesson(l, n.id, id) : null;
      if (file) {
        file.steps = file.steps.map(s => {
          if (!s || s.kind !== 'scene') return s;
          const v = voicePath(id, s.voiceKey || `${n.id}.${s.id}`);
          return { ...s, timing: files.has(v) ? json(files.get(v)) : null };
        });
      }
      return { kind: n.kind, id: n.id, unit: typeof n.unit === 'string' ? n.unit : null, title: (file && file.title) || n.title || DEFAULT_TITLES[n.kind] || n.id, file };
    });
    const { lessons: _old, path: _given, ...rest } = t;
    const topic = { ...rest, id, path, lessons: path.filter(n => n.file).map(n => n.file) };
    topic.facts = topicFacts(topic);
    topics.push(topic);
  }
  factsByTopic = Object.fromEntries(topics.map(t => [t.id, t.facts]));
  libraryNow = topics;
  return topics;
}
let libraryNow = [];
export const topicsNow = () => libraryNow;

// A media path in a lesson, as a path in the repo: relative to its topic's folder, unless it starts with
// topics/, which lets any topic use another's pictures.
export const mediaPath = (topicId, rel) => (!rel || rel.startsWith('data:') || rel.startsWith('topics/') ? rel : `topics/${topicId}/${rel}`);

// ---------------------------------------------------------------- progress on this phone

// { lessons: { "topic/lesson": { steps: { stepId: { at, right, close, seen, tries } }, finished, runs } },
//   nodes: { "topic/node": { kind, opened } } }   (lessons holds tests and exams too: anything played)
let progress = null;
export async function loadProgress() {
  progress = (await store.get('progress').catch(() => null)) || { v: 1, lessons: {} };
  if (!progress.nodes) progress.nodes = {};
  return progress;
}
export const progressNow = () => progress || { v: 1, lessons: {}, nodes: {} };
const save = () => store.set('progress', progress);
const keyOf = (topic, lesson) => `${topic}/${lesson}`;
const stampOf = at => (at ? new Date(at).toISOString() : clock.iso());

export function lessonState(topic, lesson) {
  return (progressNow().lessons[keyOf(topic, lesson)]) || { steps: {}, finished: null, runs: 0 };
}

export function noteStep(topic, lesson, stepId, result, at = null, keep = true) {
  if (!progress) progress = { v: 1, lessons: {}, nodes: {} };
  const k = keyOf(topic, lesson);
  const L = progress.lessons[k] || (progress.lessons[k] = { steps: {}, finished: null, runs: 0 });
  const was = L.steps[stepId] || { tries: 0 };
  L.steps[stepId] = { ...was, ...result, at: stampOf(at), tries: (was.tries || 0) + (result.seen ? 0 : 1) };
  return keep ? save() : null;
}

export function noteLesson(topic, lesson, what, at = null, keep = true) {
  if (!progress) progress = { v: 1, lessons: {}, nodes: {} };
  const k = keyOf(topic, lesson);
  const L = progress.lessons[k] || (progress.lessons[k] = { steps: {}, finished: null, runs: 0 });
  if (what === 'start') L.runs = (L.runs || 0) + 1;
  if (what === 'finish') L.finished = stampOf(at);
  return keep ? save() : null;
}

export function nodeState(topic, node) {
  return (progressNow().nodes || {})[keyOf(topic, node)] || null;
}

// A chest opened, a review on the path gone through, or a placeholder (animation) visited: the path goes on.
export function noteNode(topic, node, kind, at = null, keep = true) {
  if (!progress) progress = { v: 1, lessons: {}, nodes: {} };
  if (!progress.nodes) progress.nodes = {};
  const k = keyOf(topic, node);
  progress.nodes[k] = { ...(progress.nodes[k] || {}), kind, opened: (progress.nodes[k] || {}).opened || stampOf(at) };
  return keep ? save() : null;
}

// ---------------------------------------------------------------- the memory

let memory = new Memory();
export async function loadMemory() {
  memory = new Memory(await store.get('memory').catch(() => null));
  return memory;
}
export const memoryNow = () => memory;
const saveMemory = () => store.set('memory', memory.toJSON());

// One event, as everything done is recorded (format.md, "A progress file"): it moves the path on and
// updates the memory. keep: save at once (off while replaying a whole history).
export function apply(e, { keep = true } = {}) {
  if (!e || !e.type) return;
  const at = e.at || null;
  if (e.lesson && !e.review) {
    if (e.type === 'start') noteLesson(e.topic, e.lesson, 'start', at, keep);
    if (e.type === 'seen') noteStep(e.topic, e.lesson, e.step, { seen: true }, at, keep);
    if (e.type === 'attempt' && e.step) noteStep(e.topic, e.lesson, e.step, { right: e.right, close: e.close, seen: false }, at, keep);
    if (e.type === 'finish') noteLesson(e.topic, e.lesson, 'finish', at, keep);
  }
  if (e.type === 'open') noteNode(e.topic, e.node, e.kind, at, keep);
  if (e.type === 'review' && e.node && e.done) noteNode(e.topic, e.node, 'review', at, keep);
  applyEvent(memory, e, factsByTopic);
  if (keep && (e.type === 'attempt' || e.type === 'finish' || e.type === 'review')) saveMemory();
}

// Everything done, again from nothing: for a phone that connects with nothing kept (a new phone, or one
// that was cleared). events: every progress file's events in the repo, and any still waiting to send.
// Repeats (by eid) are dropped and the rest replayed in time order.
export async function rebuild(events) {
  const seen = new Set();
  const list = events.filter(e => e && e.eid && e.type && !seen.has(e.eid) && seen.add(e.eid))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  progress = { v: 1, lessons: {}, nodes: {} };
  memory = new Memory();
  for (const e of list) apply(e, { keep: false });
  await Promise.all([save(), saveMemory()]);
  return { events: list.length, facts: memory.size };
}

// Nothing has been done on this phone: no lesson, no node, no memory.
export const isBlank = () => !memory.size && !Object.keys(progressNow().lessons).length && !Object.keys(progressNow().nodes || {}).length;

// ---------------------------------------------------------------- the path

// Where a topic is: each node done, now (the next to do) or todo, grouped into units (a node with a
// "unit" starts a new one; the first is named after the topic unless its first node names it). A played
// node is done once it has been finished, and carries how much of it is done (`share`) and the step to
// carry on from (`resume`). A test or exam that draws its questions afresh each time starts from the top.
// The other kinds are done once opened. A node whose file is missing can't be started, and the next node
// after it can be.
export function pathOf(topic) {
  let current = null;
  const nodes = topic.path.map((n, i) => {
    const out = { node: n, i, done: false, started: false, share: 0, resume: 0, broken: false };
    if (isPlayed(n)) {
      if (!n.file) { out.broken = true; return out; }
      const st = lessonState(topic.id, n.id);
      const steps = n.file.steps;
      const doneSteps = steps.filter(s => st.steps[s.id]).length;
      out.done = !!st.finished;
      if (n.file.draw) { out.share = out.done ? 1 : 0; }
      else {
        out.share = doneSteps / Math.max(1, steps.length);
        out.started = !out.done && doneSteps > 0;
        out.resume = out.started ? Math.max(0, steps.findIndex(s => !st.steps[s.id])) : 0;
      }
    } else {
      out.done = !!(nodeState(topic.id, n.id) || {}).opened;
    }
    if (!current && !out.done && !out.broken) { current = n.id; out.now = true; }
    return out;
  });
  const units = [];
  for (const x of nodes) {
    if (!units.length || x.node.unit) units.push({ title: x.node.unit || topic.title, nodes: [] });
    units[units.length - 1].nodes.push(x);
  }
  for (const u of units) u.done = u.nodes.every(x => x.done || x.broken);
  return { nodes, units, current, done: nodes.length > 0 && nodes.every(x => x.done || x.broken) };
}

// ---------------------------------------------------------------- what you know

const factKeys = topic => [...((topic.facts && topic.facts.facts) || new Map()).keys()].map(f => factKey(topic.id, f));
export const hasFacts = topic => !!(topic.facts && topic.facts.facts.size);

// A topic's memory, for the room to use (its things fade with it): how much of what has been asked in it
// you'd recall now, from 0 to 1, or null if nothing of it has been asked yet. From the memory model.
export function memoryOf(topic, now = clock.now()) {
  return hasFacts(topic) ? topicMemory(memory, factKeys(topic), now).value : null;
}

const HALF_LIFE_DAYS = 14;
const questionsOf = topic => topic.lessons.flatMap(l => l.steps.filter(s => s.kind === 'check' || s.kind === 'play').map(s => ({ lesson: l.id, step: s })));

// A topic's figure on Profile. A topic with facts: how much of what's been asked you'd recall now, by the
// memory model; a dot for each fact, its colour its recall (one never asked is dim); how many are due.
// A topic without facts (written before facts existed) keeps the old reckoning: its questions' last
// answers, right counting 1 and close a half, each fading by half every two weeks.
export function knowledge(topic, now = clock.now()) {
  if (hasFacts(topic)) {
    const m = topicMemory(memory, factKeys(topic), now);
    const right = [...topic.facts.facts.keys()].filter(f => (memory.card(factKey(topic.id, f)) || {}).m === 'right').length;
    let lastAt = m.lastAt;
    for (const l of topic.lessons) for (const s of Object.values(lessonState(topic.id, l.id).steps)) lastAt = Math.max(lastAt, Date.parse(s.at) || 0);
    return { facts: true, pct: m.value === null ? 0 : Math.round(m.value * 100), tried: m.asked, right, total: m.total, learned: m.learned, due: m.due, lastAt,
      dots: m.each.map(x => (x.asked ? x.recall : null)).sort((a, b) => (b ?? -1) - (a ?? -1)) };
  }
  const qs = questionsOf(topic);
  let sum = 0, right = 0, tried = 0, lastAt = 0;
  const dots = [];
  for (const q of qs) {
    const s = lessonState(topic.id, q.lesson).steps[q.step.id];
    if (!s || s.seen) { dots.push(0); continue; }
    tried++;
    const at = Date.parse(s.at) || now;
    lastAt = Math.max(lastAt, at);
    const fade = Math.pow(0.5, (now - at) / 86400000 / HALF_LIFE_DAYS);
    const v = (s.right ? 1 : s.close ? 0.5 : 0) * fade;
    if (s.right) right++;
    sum += v;
    dots.push(v);
  }
  for (const l of topic.lessons) {
    const st = lessonState(topic.id, l.id);
    for (const s of Object.values(st.steps)) lastAt = Math.max(lastAt, Date.parse(s.at) || 0);
  }
  return { facts: false, pct: qs.length ? Math.round((sum / qs.length) * 100) : 0, right, tried, total: qs.length, lastAt, dots: dots.sort((a, b) => b - a) };
}

// Every fact met, everywhere (or in the topics given), with its recall now and whether it's due: what a
// review chooses from. Facts with no way of asking them are left out.
export function metFacts(topics = libraryNow, now = clock.now()) {
  const out = [];
  for (const t of topics) {
    for (const f of ((t.facts && t.facts.facts) || new Map()).values()) {
      const key = factKey(t.id, f.id);
      if (!memory.has(key) || !f.asks.length) continue;
      out.push({ fact: f, key, topic: t, recall: memory.recall(key, now), due: memory.isDue(key, now), dueAt: memory.due(key), last: memory.card(key).ask });
    }
  }
  return out;
}

// How many lessons have been finished, everywhere (tests and exams aren't lessons).
export function lessonsDone(topics) {
  let n = 0;
  for (const t of topics) for (const l of t.lessons) if (l.kind === 'lesson' && lessonState(t.id, l.id).finished) n++;
  return n;
}

