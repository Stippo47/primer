// Review: the facts you've learned, asked again just as they're about to slip. It is the lesson player
// (js/lesson.js) with its own top row (a cross, the combo and its pips) and its steps chosen as it goes:
// each one an ask of a fact (js/facts.js), marked, saved and sent exactly as a step is, and heard by the
// memory model (js/memory.js) like every other answer.
//
//   Endless (Practice's Review card, or one topic from Profile): the facts due first, the most slipped
//   first, every topic mixed; then the ones closest to slipping. Each fact is asked a way it wasn't asked
//   last time. A miss shows the answer and its line of why, with a link back to the lesson step that
//   taught it, and the fact comes back a few questions later (and, in the memory, sooner).
//   A review on a path: the facts of the lessons before it, each once and a miss once more, then it's done.
//
// A combo counts right answers in a row: close holds it, and wrong ends it unless the tier has a shield left,
// which cracks the chip instead (js/combo.js has the rule). Its chip comes alive tier by tier as it grows.
// A missed fact comes back the same way whether a shield took the miss or not. No lives and, until the shop, no coins. The cross leaves, after a short summary of
// the run, its best combo under a crown in that run's tier.
import { Run, rich } from './lesson.js';
import * as feel from './feel.js';
import * as data from './data.js';
import * as clock from './clock.js';
import { icon, svg } from './art.js';
import { Combo, tierClass, tierCrown } from './combo.js';
import { askStep, chooseAsk, factKey, taughtAt } from './facts.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COMEBACK = 3;        // a miss comes back after this many other questions
const NODE_MOST = 12;      // a review on a path asks at most this many facts

export class Review extends Run {
  // app: for media, lesson look-backs and the topics. pool: the facts to ask, as { fact, key, topic }.
  // node: { topic, node } for a review on a path (a set run, then done); scope: a topic, from Profile.
  // anyway: nothing was due when it was started.
  // voice: { on() } (the Voice setting): each ask is read in its own topic's narrator, from the voice file of
  // the lesson that declares its fact.
  constructor(view, { app, pool, node = null, scope = null, anyway = false, record = () => {}, onLeave = () => {}, voice = {} }) {
    super(view, { topic: node ? node.topic : scope || { id: null }, lesson: { id: 'review', title: 'Review', steps: [] }, record, onLeave, voice });
    Object.assign(this, { app, pool, node, scope, anyway });
    this.runId = `r${clock.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    this.combo = 0; this.best = 0; this.answered = 0; this.right = 0;
    this.askedNow = new Set();   // facts asked in this round of the run
    this.again = [];             // misses waiting to come back: { item, at }
    this.missed = [];            // facts missed in this run, for the summary
    this.retried = new Set();    // on a path, facts already given their second go
    this.last = null;            // the fact asked last
    this.byKey = new Map(pool.map(x => [x.key, x]));
    if (node) {
      // a set run: the least well remembered first, at most NODE_MOST
      const mem = data.memoryNow(), now = clock.now();
      this.queue = pool.map(x => ({ x, r: mem.recall(x.key, now) })).sort((a, b) => a.r - b.r).slice(0, NODE_MOST).map(y => y.x);
      this.planned = this.queue.length;
    }
  }

  topRow() {
    return `<header class="ltop rtop"><button class="round mute" data-go="leave" aria-label="Close" data-sound="off">${icon.close(20)}</button>
      <div class="combohost"></div></header>`;
  }

  begin() {
    this.meter = new Combo(this.root.querySelector('.combohost'), { count: this.combo });
    feel.preload(['crack', 'shatter']);   // the combo's samples, ready for the first miss (Effects on)
    const first = this.nextStep();
    if (first) { this.lesson.steps.push(first); this.warmStep(first); }
  }

  // An ask's voice: the voice file of the lesson that declares its fact, in its own topic's narrator.
  voiceFor(s) {
    const item = s && this.byKey.get(s.key);
    if (!item) return super.voiceFor(s);
    const t = item.topic, home = (t.lessons || []).find(l => l.id === item.fact.lesson);
    return { key: `${t.id}/${home ? home.id : ''}`, timing: home ? home.timing || null : null, order: [this.app.speakerFor(t), t.narrator],
      media: p => this.app.mediaUrl(data.mediaPath(t.id, p)) };
  }

  // ---- choosing

  // The next fact to ask: a miss whose turn has come; else, on a path, the next in line; else the facts due
  // (the most slipped first), then the ones closest to slipping; never the one just asked, and another topic
  // than the last where there's one near the front.
  nextItem() {
    const back = this.again.findIndex(a => a.at <= this.answered && (!this.last || a.item.key !== this.last.key || this.pool.length === 1));
    if (back >= 0) return this.again.splice(back, 1)[0].item;
    if (this.node) {
      if (this.queue.length) return this.queue.shift();
      return this.again.length ? this.again.shift().item : null;
    }
    const mem = data.memoryNow(), now = clock.now(), waiting = new Set(this.again.map(a => a.item.key));
    const fresh = () => this.pool.filter(x => !this.askedNow.has(x.key) && !waiting.has(x.key) && (!this.last || x.key !== this.last.key));
    let cands = fresh();
    if (!cands.length) { this.askedNow.clear(); cands = fresh(); }
    if (!cands.length) cands = this.pool.slice();
    const scored = cands.map(x => ({ x, due: mem.isDue(x.key, now), r: mem.recall(x.key, now) }));
    const due = scored.filter(y => y.due).sort((a, b) => a.r - b.r);
    const rest = scored.filter(y => !y.due).sort((a, b) => a.r - b.r || mem.due(a.x.key) - mem.due(b.x.key));
    if (!due.length && this.hadDue && !this.saidRest) { this.saidRest = true; this.note = "That's everything due. These are the next closest to slipping."; }
    if (due.length) this.hadDue = true;
    const list = due.length ? due : rest;
    const lastTopic = this.last ? this.last.topic.id : null;
    const other = list.slice(0, 3).find(y => y.x.topic.id !== lastTopic);
    return (other || list[0]).x;
  }

  nextStep() {
    const item = this.nextItem();
    if (!item) return null;
    const card = data.memoryNow().card(item.key);
    const ask = chooseAsk(item.fact, { last: card ? card.ask : null });
    if (!ask) return null;
    this.askedNow.add(item.key);
    this.last = item;
    const step = askStep(item.fact, ask);
    return { ...step, id: `${step.id}~${this.answered + this.lesson.steps.length}`, key: item.key };
  }

  // ---- showing

  async show(i) {
    const s = this.lesson.steps[i];
    if (s) this.media = p => this.app.mediaUrl(data.mediaPath(s.topic, p));
    const note = this.note;
    this.note = null;
    await super.show(i);
    if (note && this.i === i) this.body.insertAdjacentHTML('afterbegin', `<p class="rnote">${esc(note)}</p>`);
  }

  // For the tests and the films: the combo jumped to n, as if that many had been right in a row.
  setCombo(n) {
    this.combo = n;
    this.best = Math.max(this.best, n);
    this.meter.set(n);
  }

  // ---- answering

  factOf(s) { return (this.byKey.get(s.key) || {}).fact; }

  attemptEvent(s, state, res) {
    const f = this.factOf(s);
    return {
      type: 'attempt', review: this.runId, topic: f.topic, fact: f.id, ask: s.askId, lesson: f.lesson, version: f.version, kind: s.kind,
      form: s.kind === 'check' ? s.input.form : s.play.part, value: s.kind === 'check' ? state.value : state, right: res.right, close: res.close, why: res.why,
    };
  }

  marked(res, kind, s) {
    this.answered++;
    // the combo's rule (shields, cracks, the shatter) is the chip's: it says where the count is now
    this.combo = this.meter.answer(kind).n;
    if (kind === 'right') { this.right++; this.best = Math.max(this.best, this.combo); }
    if (kind !== 'wrong') { this.pickAhead(); return; }
    const item = this.byKey.get(s.key);
    if (!this.missed.includes(item)) this.missed.push(item);
    // it comes back: a few questions on, or, on a path, once more at the end
    if (!this.node) this.again.push({ item, at: this.answered + COMEBACK });
    else if (!this.retried.has(item.key)) { this.retried.add(item.key); this.again.push({ item, at: Infinity }); }
    this.pickAhead();
    // the way back to where it was taught
    const fact = item.fact, at = taughtAt(fact);
    const lesson = item.topic.lessons.find(l => l.id === at.lesson);
    if (lesson) {
      this.foot.querySelector('.lfeed > div:last-child').insertAdjacentHTML('beforeend',
        `<button class="taught" data-go="peek" data-sound="tap">${icon.book(16)}<span>${esc(lesson.title)}</span>${icon.right(13)}</button>`);
    }
  }

  clicked(what, b) {
    if (what === 'peek') { this.peekBack(); return; }
    super.clicked(what, b);
  }

  // The lesson step that taught the fact just missed, opened over the run: a look back, nothing recorded.
  async peekBack() {
    if (this.peeking) return;
    const item = this.byKey.get(this.step.key);
    const at = taughtAt(item.fact);
    const lesson = item.topic.lessons.find(l => l.id === at.lesson);
    if (!lesson) return;
    const host = document.createElement('div');
    host.className = 'peekhost';
    this.app.root.append(host);
    this.peeking = new Run(host, {
      topic: item.topic, lesson, start: Math.max(0, at.index), peek: true,
      media: p => this.app.mediaUrl(data.mediaPath(item.topic.id, p)),
      voice: { on: () => this.app.prefs.voice !== false, set: on => this.app.setPref('voice', on), narrator: this.app.speakerFor(item.topic) },
      onLeave: () => { host.remove(); this.peeking = null; },
    });
    await this.peeking.open();
  }

  // The next ask, chosen as soon as this one is marked (nothing changes between then and Continue), so its
  // clips are found while the feedback shows and the tap on Continue can start its question at once.
  pickAhead() {
    this.ahead = { step: this.nextStep() };
    this.warmStep(this.ahead.step);
  }

  go() {
    if (this.btn.dataset.kind === 'check') return this.check();
    feel.press(this.btn, 'tap');
    const next = this.ahead ? this.ahead.step : this.nextStep();
    this.ahead = null;
    this.reader.stop();
    if (!next) return this.end();
    this.reader.prime(this.lineOf(next, 'main'), this.voiceFor(next));
    this.lesson.steps.push(next);
    return this.show(this.lesson.steps.length - 1);
  }

  // ---- the end

  // The summary: how many were right, the best run of the combo, and what was missed. On a path, a run
  // that got through every fact is done, and the path goes on.
  end() {
    if (this.state === 'ended') return;
    const done = !!this.node && !this.queue.length && !this.again.length;
    this.state = 'ended';
    if (this.peeking) this.peeking.leave('closed');
    this.clearParts();
    this.record({ type: 'review', run: this.runId, topic: this.node ? this.node.topic.id : this.scope ? this.scope.id : null, ...(this.node ? { node: this.node.node.id, done } : {}),
      right: this.right, of: this.answered, combo: this.best });
    feel.sound('done');
    feel.tick();
    this.foot.className = 'lfoot';
    this.foot.querySelector('.lfeed').hidden = true;
    const end = document.createElement('div');
    end.className = 'lend rend';
    const missed = this.missed.slice(0, 3).map(x => `<li>${rich(x.fact.text)}</li>`).join('');
    const tier = tierClass(this.best);
    end.innerHTML = `<div class="rays tiered ${tier}"></div>
      <div class="crownbig ${tier}" data-tier="${tier.slice(5)}">${svg(96, 78, `<g transform="translate(3 2) scale(3)">${tierCrown(this.best)}</g>`)}<p class="tierink">×${this.best}</p></div>
      <p class="big">${done ? 'Review done' : 'Review'}</p>
      <p class="tally">${this.right} of ${this.answered} right</p>
      ${missed ? `<ul class="missed">${missed}</ul>` : ''}`;
    this.body.replaceWith(end);
    this.body = end;
    this.root.querySelector('.rtop').classList.add('ended');
    feel.pop(end.querySelector('.crownbig'), 0.5);
    this.setButton('finish', true);
    this.btn.dataset.go = 'finish';
    this.summary = { done, right: this.right, of: this.answered, combo: this.best };
    this.view.dispatchEvent(new CustomEvent('reviewend', { detail: this.summary }));
  }

  // The cross: a short summary first, if anything was answered; else straight out.
  leave(how) {
    if (this.gone) return;
    if (how === 'closed' && this.answered && this.state !== 'ended') { this.end(); return; }
    this.gone = true;
    if (this.peeking) this.peeking.leave('closed');
    if (this.meter) this.meter.remove();
    this.remove();
    this.onLeave(how, this.summary || null);
  }

  // For the tests: where the run is.
  debug() {
    return { combo: this.combo, best: this.best, answered: this.answered, right: this.right, chip: this.meter ? this.meter.debug() : null, step:this.step ? { id: this.step.id, fact: this.step.fact, ask: this.step.askId, topic: this.step.topic, key: this.step.key } : null,
      again: this.again.map(a => ({ key: a.item.key, at: a.at })), planned: this.planned || null, ended: this.state === 'ended' };
  }
}

// What Review would ask from: every fact met, or a topic's, or the facts before a review on a path (met or
// not: getting there means the lessons before it were done).
export function poolFor({ topics, scope = null, node = null }) {
  if (node) {
    const t = node.topic, at = t.path.findIndex(n => n.id === node.node.id);
    return [...t.facts.facts.values()].filter(f => f.node < at && f.asks.length).map(f => ({ fact: f, key: factKey(t.id, f.id), topic: t }));
  }
  return data.metFacts(scope ? [scope] : topics).map(x => ({ fact: x.fact, key: x.key, topic: x.topic }));
}
