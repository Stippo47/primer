// What the app knows: the topics and lessons that came down from the data repo, and what has been done
// with them on this phone. The layout of the data repo is in docs/format.md.
import * as store from './store.js';

const LEVELS = ['glance', 'tour', 'solid', 'deep'];
export const LEVEL_WORDS = { glance: 'Glance', tour: 'Tour', solid: 'Solid', deep: 'Deep' };
export const levelRank = level => Math.max(0, LEVELS.indexOf(level)) + 1;

const json = f => { try { return JSON.parse(f.data); } catch { return null; } };

// The library: every topic in the index, in its order, each with its lessons in order. Files that can't
// be read are left out, and a topic with no readable lesson still shows, with nothing to start.
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
    const lessons = (t.lessons || []).map(lid => {
      const l = files.has(`topics/${id}/${lid}.json`) ? json(files.get(`topics/${id}/${lid}.json`)) : null;
      return l && Array.isArray(l.steps) ? { ...l, id: lid, topic: id } : null;
    }).filter(Boolean);
    topics.push({ ...t, id, lessons });
  }
  return topics;
}

// A media path in a lesson, as a path in the repo: relative to its topic's folder, unless it starts with
// topics/, which lets any topic use another's pictures.
export const mediaPath = (topicId, rel) => (!rel || rel.startsWith('data:') || rel.startsWith('topics/') ? rel : `topics/${topicId}/${rel}`);

// ---------------------------------------------------------------- progress on this phone

// { lessons: { "topic/lesson": { steps: { stepId: { at, right, close, seen, tries } }, finished, runs } } }
let progress = null;
export async function loadProgress() {
  progress = (await store.get('progress').catch(() => null)) || { v: 1, lessons: {} };
  return progress;
}
export const progressNow = () => progress || { v: 1, lessons: {} };
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

// Where a topic is: each lesson's steps as done, now or todo, and which step is the one to do next.
export function pathOf(topic) {
  let current = null;
  const lessons = topic.lessons.map(l => {
    const st = lessonState(topic.id, l.id);
    const steps = l.steps.map(s => ({ step: s, done: !!st.steps[s.id] }));
    const firstOpen = steps.findIndex(s => !s.done);
    const out = { lesson: l, steps, done: firstOpen < 0, started: steps.some(s => s.done) };
    if (!current && firstOpen >= 0) { current = { lesson: l.id, index: firstOpen }; steps[firstOpen].now = true; }
    out.share = steps.filter(s => s.done).length / Math.max(1, steps.length);
    return out;
  });
  return { lessons, current };
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

export function lessonsDone(topics) {
  let n = 0;
  for (const t of topics) for (const l of t.lessons) if (lessonState(t.id, l.id).finished) n++;
  return n;
}
