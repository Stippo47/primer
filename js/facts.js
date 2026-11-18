// Facts: what a lesson says is worth knowing afterward, each with two or more ways of asking it ("asks").
// An ask is a check or a play step, written and marked exactly as a step is, so everything that plays a
// step plays an ask: a lesson, a test drawn from facts, and review. A lesson's own steps can name the fact
// they teach (`fact`); a check or play step that does counts as a review of it.
//
// A fact family is a table and a few question shapes: each row of the table becomes a fact, and each shape
// an ask of it, so a hundred capitals need no hand-writing. `primer check` expands families the same way in
// Python (skill/primer.py, expand_family); a test runs both on the same family and compares.
//
// Nothing here touches the page or storage, so the writer's tools can use it in Node too.

export const factKey = (topic, fact) => `${topic}/${fact}`;
export const askKey = (fact, ask) => `${fact}.${ask}`;

// FNV-1a, 32 bits, over the string's UTF-8 bytes: the same number in Python, so a family's wrong options
// are chosen the same on the phone and in the checker.
export function hash(s) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(String(s))) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// "{field}" in a string is the row's value; a string that is only "{field}" takes the value as it is (a
// number stays a number, a list a list). "{other.field}" is the other row, in a wrong option's lines.
const ONLY = /^\{([A-Za-z0-9_.-]+)\}$/, ANY = /\{([A-Za-z0-9_.-]+)\}/g;
export function fill(tpl, vars) {
  if (typeof tpl === 'string') {
    const m = ONLY.exec(tpl);
    if (m && m[1] in vars) return vars[m[1]];
    return tpl.replace(ANY, (all, k) => (k in vars ? String(vars[k]) : all));
  }
  if (Array.isArray(tpl)) return tpl.map(x => fill(x, vars));
  if (tpl && typeof tpl === 'object') return Object.fromEntries(Object.entries(tpl).map(([k, v]) => [k, fill(v, vars)]));
  return tpl;
}

const varsOf = (row, other) => {
  const v = { ...row };
  if (other) for (const [k, x] of Object.entries(other)) v[`other.${k}`] = x;
  return v;
};

// A choice's options made from a column of the table: the row's own value is right, and `count` - 1 other
// values are wrong, taken from rows with a different value (and, with `unlike`, a different value in that
// column too, so no wrong option is secretly right), in an order fixed by the fact's id: the same options
// every time. With `near`, rows sharing that column's value come first (neighbours make better mistakes).
export function familyOptions(spec, row, rows, factId) {
  const { from, count = 3, near, unlike } = spec;
  let others = rows.filter(r => r.id !== row.id && r[from] !== undefined && r[from] !== row[from] && (!unlike || r[unlike] !== row[unlike]));
  others.sort((a, b) => hash(`${factId}|${a.id}`) - hash(`${factId}|${b.id}`) || (a.id < b.id ? -1 : 1));
  const seen = new Set();
  others = others.filter(r => (seen.has(r[from]) ? false : seen.add(r[from])));
  if (near && row[near] !== undefined) others = [...others.filter(r => r[near] === row[near]), ...others.filter(r => r[near] !== row[near])];
  const wrong = others.slice(0, Math.max(1, count - 1)).map(r => ({
    id: r.id, text: String(r[from]),
    why: fill(spec.why || '', varsOf(row, r)), tempting: fill(spec.tempting || '', varsOf(row, r)),
  }));
  return [{ id: row.id, text: String(row[from]), right: true }, ...wrong];
}

// One row of a family as a fact: its id is the family's and the row's, joined.
export function familyFact(fam, row) {
  const id = `${fam.id}-${row.id}`;
  const vars = varsOf(row);
  const asks = (fam.asks || []).map(shape => {
    const input = shape.input && shape.input.options && !Array.isArray(shape.input.options)
      ? { ...shape.input, options: familyOptions(shape.input.options, row, fam.rows || [], id) } : shape.input;
    const ask = fill({ ...shape, input: undefined }, vars);
    if (input) ask.input = fill(input, vars);
    else delete ask.input;
    return ask;
  });
  return { ...fill(fam.fact || {}, vars), id, asks, family: fam.id, row: row.id };
}

export function expandFamily(fam) {
  return (fam && Array.isArray(fam.rows) ? fam.rows : []).filter(r => r && typeof r.id === 'string').map(r => familyFact(fam, r));
}

// Every fact a lesson declares: its own, then each family's, in order.
export function factsOfLesson(lesson) {
  const own = Array.isArray(lesson.facts) ? lesson.facts.filter(f => f && typeof f.id === 'string') : [];
  const made = Array.isArray(lesson.families) ? lesson.families.flatMap(expandFamily) : [];
  return [...own, ...made].map(f => ({ ...f, asks: (Array.isArray(f.asks) ? f.asks : []).filter(a => a && typeof a.id === 'string' && (a.kind === 'check' || a.kind === 'play')) }));
}

// The facts a step names: `fact` is one id or a list.
export const factsOfStep = s => (!s || s.fact === undefined ? [] : [].concat(s.fact).filter(x => typeof x === 'string'));

// A way of asking, for "asked in a way the lesson didn't use": a check's answer form, or a play's part.
export const wayOf = s => (s.kind === 'check' ? (s.input && s.input.form) || 'check' : s.kind === 'play' ? `play:${(s.play && s.play.part) || ''}` : s.kind);

// A topic's facts, from the lessons on its path (the library's shape: path nodes carrying their file). Each
// fact knows its lesson, that lesson's version and sources, which unit it's in, and the steps that teach it.
// Also the index the memory model replays events with: which facts each lesson declares, and which facts
// each step names.
export function topicFacts(topic) {
  const facts = new Map(), lessons = {}, steps = {};
  let unit = 0;
  (topic.path || []).forEach((n, i) => {
    if (i > 0 && n.unit) unit++;
    const file = n.file;
    if (!file || !Array.isArray(file.steps)) return;
    const version = file.version || 1;
    if (n.kind === 'lesson') {
      const own = factsOfLesson(file);
      lessons[n.id] = own.map(f => f.id);
      for (const f of own) {
        if (facts.has(f.id)) continue;
        const sources = (file.sources || []).filter(s => (f.src || []).includes(s.id));
        facts.set(f.id, { ...f, topic: topic.id, lesson: n.id, lessonTitle: file.title || n.id, version, unit, node: i, sources, taughtBy: [] });
      }
    }
    file.steps.forEach((s, k) => {
      const named = factsOfStep(s);
      if (!named.length) return;
      steps[`${n.id}/${s.id}`] = { facts: named, version };
      for (const id of named) {
        const f = facts.get(id);
        if (f && n.kind === 'lesson') f.taughtBy.push({ lesson: n.id, step: s.id, index: k, kind: s.kind, way: s.kind === 'explain' ? null : wayOf(s) });
      }
    });
  });
  // a step in a lesson can name a fact declared by a later lesson; tie those up now everything is known
  for (const [key, sf] of Object.entries(steps)) {
    const [lid, sid] = key.split('/');
    const n = (topic.path || []).find(x => x.id === lid);
    if (!n || n.kind !== 'lesson') continue;
    const k = n.file.steps.findIndex(s => s.id === sid);
    for (const id of sf.facts) {
      const f = facts.get(id);
      if (f && f.lesson !== lid && !f.taughtBy.some(t => t.lesson === lid && t.step === sid)) f.taughtBy.push({ lesson: lid, step: sid, index: k, kind: n.file.steps[k].kind, way: wayOf(n.file.steps[k]) });
    }
  }
  return { facts, lessons, steps };
}

// The step where a fact is taught, to link back to after a miss: the first step that names it, else its
// lesson's first step.
export function taughtAt(fact) {
  const by = fact.taughtBy || [];
  const t = by.filter(x => x.lesson === fact.lesson).sort((a, b) => a.index - b.index)[0] || by[0];
  return t ? { lesson: t.lesson, step: t.step, index: t.index } : { lesson: fact.lesson, step: null, index: 0 };
}

// An ask, ready to play as a step: its id is the fact's and the ask's, and it says both (`askId`, since a
// step's `ask` is its question).
export function askStep(fact, ask) {
  return { ...ask, id: askKey(fact.id, ask.id), fact: fact.id, askId: ask.id, topic: fact.topic, title: ask.title || fact.text, src: ask.src || fact.src || [] };
}

// Which way to ask a fact this time. Given `avoid` (ways its lesson used, for a test), never one of those
// when it has another; then, of what's left, not the way it was asked last (`last`, an ask id) when there's
// another.
export function chooseAsk(fact, { last = null, avoid = [], rand = Math.random } = {}) {
  let pool = fact.asks.slice();
  if (avoid.length) {
    const fresh = pool.filter(a => !avoid.includes(wayOf(a)));
    if (fresh.length) pool = fresh;
  }
  const other = pool.filter(a => a.id !== last);
  if (other.length) pool = other;
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}

// The facts a test or exam draws from: those of the lessons before it on the path, in its unit only when it
// says "unit".
export function factsBefore(topicIndex, topic, nodeId, from = 'topic') {
  const at = (topic.path || []).findIndex(n => n.id === nodeId);
  if (at < 0) return [];
  let unit = 0;
  (topic.path || []).forEach((n, i) => { if (i > 0 && i <= at && n.unit) unit++; });
  return [...topicIndex.facts.values()].filter(f => f.node < at && (from !== 'unit' || f.unit === unit) && f.asks.length);
}

// A test drawn from facts: `count` of them, the least well remembered first (recall: key -> 0..1), each
// asked in a way its lesson didn't use where it has one.
export function drawSteps(facts, count, { recall = () => 0, last = () => null, rand = Math.random } = {}) {
  const order = facts.map(f => ({ f, r: recall(factKey(f.topic, f.id)), h: rand() })).sort((a, b) => a.r - b.r || a.h - b.h);
  return order.slice(0, Math.max(0, count)).map(({ f }) => {
    const ask = chooseAsk(f, { last: last(factKey(f.topic, f.id)), avoid: f.taughtBy.map(t => t.way).filter(Boolean), rand });
    return ask ? askStep(f, ask) : null;
  }).filter(Boolean);
}
