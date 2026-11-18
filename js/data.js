// What the app knows: the topics and lessons that came down from the data repo, and what has been done
// with them on this phone. The layout of the data repo is in docs/format.md.
import * as store from './store.js';

const LEVELS = ['glance', 'tour', 'solid', 'deep'];
export const LEVEL_WORDS = { glance: 'Glance', tour: 'Tour', solid: 'Solid', deep: 'Deep' };
export const levelRank = level => Math.max(0, LEVELS.indexOf(level)) + 1;

const json = f => { try { return JSON.parse(f.data); } catch { return null; } };

// The kinds of node on a topic's path. Lessons, tests and exams are played step by step and have a file
// each. An animation has a file too, a scene, and is played as a lesson of one scene step (sceneLesson);
// without its file it's a placeholder. A chest and a review are the node alone (review is a placeholder
// until it's built).
export const NODE_KINDS = ['lesson', 'test', 'exam', 'chest', 'review', 'animation'];
export const PLAYED = new Set(['lesson', 'test', 'exam']);
export const isPlayed = n => PLAYED.has(n.kind) || !!n.file;
export const KIND_WORDS = { lesson: 'Lesson', test: 'Test', exam: 'Exam', chest: 'Chest', review: 'Review', animation: 'Animation' };
const DEFAULT_TITLES = { chest: 'A chest', review: 'Review', animation: 'Animation' };

// A scene file (an animation on the path) as a lesson of one step, so it plays, saves and is marked done
// exactly as a lesson is. Its voice file is voice/<node>.json.
export function sceneLesson(file, id, topic) {
  const { parts, lines, title } = file;
  return { ...file, id, topic, kind: 'animation', steps: [{ id, kind: 'scene', title, parts, lines, voice: id }] };
}

// Where a scene's voice is: voice/<node>.json for an animation, voice/<lesson>.<step>.json for a scene
// step in a lesson. It lists each line's clip for each narrator, and when each word is said.
export const voicePath = (topicId, key) => `topics/${topicId}/voice/${key}.json`;

// The library: every topic in the index, in its order. Each has its path (the nodes in order, a played
// one carrying its file as `file`) and its lessons (every played file, in path order). A topic written
// before the path existed lists "lessons" only, and each becomes a lesson node. Files that can't be read
// leave their node with nothing to start, and the path goes on past it. Scene steps carry their voice
// file as `timing`.
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
      if (PLAYED.has(n.kind)) file = l && Array.isArray(l.steps) && l.steps.length ? { ...l, id: n.id, topic: id, kind: n.kind } : null;
      if (n.kind === 'animation') file = l && Array.isArray(l.lines) && l.lines.length ? sceneLesson(l, n.id, id) : null;
      if (file) {
        file.steps = file.steps.map(s => {
          if (!s || s.kind !== 'scene') return s;
          const v = voicePath(id, s.voice || `${n.id}.${s.id}`);
          return { ...s, timing: files.has(v) ? json(files.get(v)) : null };
        });
      }
      return { kind: n.kind, id: n.id, unit: typeof n.unit === 'string' ? n.unit : null, title: (file && file.title) || n.title || DEFAULT_TITLES[n.kind] || n.id, file };
    });
    const { lessons: _old, path: _given, ...rest } = t;
    topics.push({ ...rest, id, path, lessons: path.filter(n => n.file).map(n => n.file) });
  }
  return topics;
}

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

export function lessonState(topic, lesson) {
  return (progressNow().lessons[keyOf(topic, lesson)]) || { steps: {}, finished: null, runs: 0 };
}

export function noteStep(topic, lesson, stepId, result) {
  if (!progress) progress = { v: 1, lessons: {} };
  const k = keyOf(topic, lesson);
  const L = progress.lessons[k] || (progress.lessons[k] = { steps: {}, finished: null, runs: 0 });
  const was = L.steps[stepId] || { tries: 0 };
  L.steps[stepId] = { ...was, ...result, at: new Date().toISOString(), tries: (was.tries || 0) + (result.seen ? 0 : 1) };
  return save();
}

export function noteLesson(topic, lesson, what) {
  if (!progress) progress = { v: 1, lessons: {} };
  const k = keyOf(topic, lesson);
  const L = progress.lessons[k] || (progress.lessons[k] = { steps: {}, finished: null, runs: 0 });
  if (what === 'start') L.runs = (L.runs || 0) + 1;
  if (what === 'finish') L.finished = new Date().toISOString();
  return save();
}

export function nodeState(topic, node) {
  return (progressNow().nodes || {})[keyOf(topic, node)] || null;
}

// A chest opened, or a placeholder (review, animation) visited: the path goes on past it.
export function noteNode(topic, node, kind) {
  if (!progress) progress = { v: 1, lessons: {}, nodes: {} };
  if (!progress.nodes) progress.nodes = {};
  const k = keyOf(topic, node);
  progress.nodes[k] = { ...(progress.nodes[k] || {}), kind, opened: (progress.nodes[k] || {}).opened || new Date().toISOString() };
  return save();
}

// Where a topic is: each node done, now (the next to do) or todo, grouped into units (a node with a
// "unit" starts a new one; the first is named after the topic unless its first node names it). A played
// node is done once it has been finished, and carries how much of it is done (`share`) and the step to
// carry on from (`resume`). The other kinds are done once opened. A node whose file is missing can't be
// started, and the next node after it can be.
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
      out.share = doneSteps / Math.max(1, steps.length);
      out.started = !out.done && doneSteps > 0;
      out.resume = out.started ? Math.max(0, steps.findIndex(s => !st.steps[s.id])) : 0;
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

const HALF_LIFE_DAYS = 14;
const questionsOf = topic => topic.lessons.flatMap(l => l.steps.filter(s => s.kind === 'check' || s.kind === 'play').map(s => ({ lesson: l.id, step: s })));

// Until review arrives (stage 2), a topic's number is its questions' last answers: right counts 1, close a
// half, wrong or never tried nothing, and each fades by half every two weeks since it was answered.
export function knowledge(topic, now = Date.now()) {
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
  return { pct: qs.length ? Math.round((sum / qs.length) * 100) : 0, right, tried, total: qs.length, lastAt, dots: dots.sort((a, b) => b - a) };
}

// How many lessons have been finished, everywhere (tests and exams aren't lessons).
export function lessonsDone(topics) {
  let n = 0;
  for (const t of topics) for (const l of t.lessons) if (l.kind === 'lesson' && lessonState(t.id, l.id).finished) n++;
  return n;
}
