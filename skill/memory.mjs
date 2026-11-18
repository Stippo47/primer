// `primer progress` asks this for the memory: every answer in the data repo's progress files, replayed through
// the app's own memory model (js/facts.js and js/memory.js, read from the app's folder), so the writer sees
// exactly what the phone works out: how likely each fact is to be remembered now, and when it's due.
//
//   node memory.mjs --app <primer repo> --data <primer-data clone> [--now <ISO time>]
// Prints one line of JSON: { now, best, facts: [ { topic, fact, text, lesson, recall, due, answers, right,
// lapses, marks, last } ], review: { runs, answers, right } }.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = {};
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) args[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
}
const APP = args.app, DATA = args.data;
const { topicFacts, factKey } = await import(pathToFileURL(join(APP, 'js', 'facts.js')).href);
const { Memory, applyEvent, factsOfEvent, markOf } = await import(pathToFileURL(join(APP, 'js', 'memory.js')).href);
const json = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
const PLAYED = new Set(['lesson', 'test', 'exam']);

// The topics, in the library's shape: each path node carrying its file (js/data.js, library).
const dir = join(DATA, 'topics');
const topics = (existsSync(dir) ? readdirSync(dir) : []).filter(id => existsSync(join(dir, id, 'topic.json'))).map(id => {
  const t = json(join(dir, id, 'topic.json')) || {};
  const given = Array.isArray(t.path) ? t.path : (t.lessons || []).map(l => ({ kind: 'lesson', id: l }));
  const path = given.filter(n => n && typeof n.id === 'string').map(n => {
    const f = PLAYED.has(n.kind) ? json(join(dir, id, `${n.id}.json`)) : null;
    const file = f && (Array.isArray(f.steps) || (n.kind !== 'lesson' && f.draw)) ? { ...f, steps: f.steps || [] } : null;
    return { kind: n.kind, id: n.id, unit: n.unit || null, file };
  });
  const topic = { id, title: t.title || id, path };
  topic.facts = topicFacts(topic);
  return topic;
});
const index = Object.fromEntries(topics.map(t => [t.id, t.facts]));

// Every event, repeats dropped, in time order.
const pdir = join(DATA, 'progress'), seen = new Set(), events = [];
for (const name of existsSync(pdir) ? readdirSync(pdir).sort() : []) {
  if (!name.endsWith('.json') || name.startsWith('connect-check')) continue;
  const batch = json(join(pdir, name));
  for (const e of (batch && batch.events) || []) if (e && e.eid && !seen.has(e.eid)) { seen.add(e.eid); events.push(e); }
}
events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

const mem = new Memory();
const history = new Map();   // fact key -> its answers
const runs = new Set();
let reviewAnswers = 0, reviewRight = 0;
for (const e of events) {
  applyEvent(mem, e, index);
  for (const f of factsOfEvent(e, index)) {
    const k = factKey(e.topic, f);
    if (!history.has(k)) history.set(k, []);
    history.get(k).push({ at: e.at, mark: markOf(e), value: e.value, why: e.why || '', via: e.review ? 'review' : e.lesson || '', ask: e.ask || (e.step ? `step:${e.step}` : null) });
  }
  if (e.type === 'attempt' && e.review) { runs.add(e.review); reviewAnswers++; if (e.right) reviewRight++; }
}

const now = args.now ? Date.parse(args.now) : Date.now();
const facts = [];
for (const t of topics) {
  for (const f of t.facts.facts.values()) {
    const key = factKey(t.id, f.id), c = mem.card(key), h = history.get(key) || [];
    facts.push({ topic: t.id, topicTitle: t.title, fact: f.id, text: f.text, lesson: f.lesson, met: !!c, asked: !!c && c.n > 0,
      recall: c ? +mem.recall(key, now).toFixed(4) : 0, due: c ? new Date(c.due).toISOString() : null, answers: c ? c.n : 0, right: c ? c.ok : 0,
      lapses: c ? c.l : 0, marks: h.map(x => x.mark), last: h.length ? h[h.length - 1] : null });
  }
}
console.log(JSON.stringify({ now: new Date(now).toISOString(), best: mem.best, facts, review: { runs: runs.size, answers: reviewAnswers, right: reviewRight } }));
