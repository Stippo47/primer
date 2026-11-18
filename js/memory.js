// The memory model: for every fact you've met, how likely you are to remember it now, and when it's
// about to slip. It is FSRS, the open spaced-repetition scheduler (vendor/ts-fsrs.mjs), with its default
// weights. Every answer to a fact, in a lesson, a test or review, is one review of its card: right is
// Good, close is Hard, wrong is Again. Intervals are whole days (no same-day learning steps): a review run
// brings a miss back itself, a few questions later.
//
// The model is rebuilt from events alone (applyEvent), the same on the phone, when a new phone gets its
// memory back from the repo's progress files, and in the writer's `primer progress`. Nothing here touches
// the page or storage.
import { fsrs, Rating, State } from '../vendor/ts-fsrs.mjs';

export const RETENTION = 0.9;
const scheduler = fsrs({ request_retention: RETENTION, enable_short_term: false, enable_fuzz: false });
const GRADE = { right: Rating.Good, close: Rating.Hard, wrong: Rating.Again };
const ms = v => (v === null || v === undefined || v === '' ? null : typeof v === 'number' ? v : Date.parse(v));

// A card as kept: small keys, times in milliseconds. `ask` is the way it was asked last ("step:<id>" for a
// lesson's own step), n how many answers, ok how many right, m the last mark, at when.
function toCard(c) {
  return {
    due: new Date(c.due), stability: c.s || 0, difficulty: c.d || 0, elapsed_days: 0, scheduled_days: c.sd || 0,
    learning_steps: 0, reps: c.r || 0, lapses: c.l || 0, state: c.st || State.New, last_review: c.lr ? new Date(c.lr) : undefined,
  };
}
function fromCard(card, was = {}) {
  return { ...was, due: +card.due, s: card.stability, d: card.difficulty, sd: card.scheduled_days, r: card.reps, l: card.lapses, st: card.state, lr: card.last_review ? +card.last_review : null };
}

export class Memory {
  constructor(saved = null) {
    this.cards = (saved && saved.cards) || {};
    this.best = (saved && saved.best) || 0;
    this.streak = (saved && saved.streak) || null;   // the latest review run's streak, while replaying: { run, n }
  }

  toJSON() { return { v: 1, cards: this.cards, best: this.best, streak: this.streak }; }
  get size() { return Object.keys(this.cards).length; }
  has(key) { return !!this.cards[key]; }
  card(key) { return this.cards[key] || null; }
  keys() { return Object.keys(this.cards); }

  // Met, but not yet asked: a lesson that declares a fact it never asks still teaches it. Due at once.
  introduce(key, at) {
    if (this.cards[key]) return this.cards[key];
    const t = ms(at) ?? Date.now();
    this.cards[key] = { due: t, s: 0, d: 0, sd: 0, r: 0, l: 0, st: State.New, lr: null, ask: null, n: 0, ok: 0, m: null, at: t };
    return this.cards[key];
  }

  // One answer: mark is right, close or wrong.
  answer(key, mark, at, ask = null) {
    const t = ms(at) ?? Date.now();
    const was = this.cards[key] || this.introduce(key, t);
    const card = scheduler.next(toCard(was), new Date(Math.max(t, was.lr || 0)), GRADE[mark] || Rating.Again).card;
    this.cards[key] = fromCard(card, { ...was, ask: ask || was.ask, n: (was.n || 0) + 1, ok: (was.ok || 0) + (mark === 'right' ? 1 : 0), m: mark, at: t });
    return this.cards[key];
  }

  // How likely it is to be remembered at `now`: 0 to 1. A card met but never asked is 0.
  recall(key, now = Date.now()) {
    const c = this.cards[key];
    if (!c || c.st === State.New || !c.lr) return 0;
    return scheduler.get_retrievability(toCard(c), new Date(Math.max(now, c.lr)), false);
  }

  due(key) { const c = this.cards[key]; return c ? c.due : Infinity; }
  isDue(key, now = Date.now()) { return this.has(key) && this.due(key) <= now; }
  asked(key) { const c = this.cards[key]; return !!c && c.n > 0; }
}

// The facts an answer is about: the ones it names (`fact`), or, for an answer recorded before its step named
// a fact, the ones its step names now, if the lesson's version is the one it was answered in.
export function factsOfEvent(e, index = {}) {
  if (!e || e.type !== 'attempt') return [];
  if (e.fact !== undefined) return [].concat(e.fact).filter(x => typeof x === 'string');
  const t = index[e.topic];
  const sf = t && e.lesson && e.step ? t.steps[`${e.lesson}/${e.step}`] : null;
  return sf && sf.version === (e.version || 1) ? sf.facts : [];
}
export const markOf = e => (e.right ? 'right' : e.close ? 'close' : 'wrong');

// Applies one event to the memory. index: the topics' facts (facts.js, topicFacts), by topic id, so a lesson's
// finish can introduce what it declares, and an older answer without `fact` can be tied to its step's.
export function applyEvent(mem, e, index = {}) {
  if (!e || !e.topic && e.type !== 'review') return;
  const t = index[e.topic] || null;
  if (e.type === 'attempt') {
    const mark = markOf(e);
    for (const f of factsOfEvent(e, index)) mem.answer(`${e.topic}/${f}`, mark, e.at, e.ask || (e.step ? `step:${e.step}` : null));
    if (e.review) {
      // the combo, kept as the run goes, so the best survives a run that never got to its end
      if (!mem.streak || mem.streak.run !== e.review) mem.streak = { run: e.review, n: 0 };
      mem.streak.n = mark === 'right' ? mem.streak.n + 1 : mark === 'close' ? mem.streak.n : 0;
      mem.best = Math.max(mem.best, mem.streak.n);
    }
  } else if (e.type === 'finish' && t && e.lesson && !e.review) {
    for (const f of t.lessons[e.lesson] || []) mem.introduce(`${e.topic}/${f}`, e.at);
  } else if (e.type === 'review') {
    mem.best = Math.max(mem.best, Number(e.combo) || 0);
  }
}

// A topic's memory, as the room and Profile read it: how much of what's been asked you'd recall now (the
// mean of its asked facts' recall, 0 to 1), and the counts behind it. keys: the topic's fact keys.
export function topicMemory(mem, keys, now = Date.now()) {
  let sum = 0, asked = 0, due = 0, learned = 0, lastAt = 0;
  const each = keys.map(k => {
    const c = mem.card(k);
    if (!c) return { key: k, met: false, recall: 0 };
    learned++;
    if (c.due <= now) due++;
    if (c.at) lastAt = Math.max(lastAt, c.at);
    if (!mem.asked(k)) return { key: k, met: true, recall: 0, asked: false };
    asked++;
    const r = mem.recall(k, now);
    sum += r;
    return { key: k, met: true, asked: true, recall: r };
  });
  return { value: asked ? sum / asked : null, asked, learned, due, total: keys.length, lastAt, each };
}
