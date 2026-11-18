// The lesson player. A lesson is a run of steps, one screen each:
//   explain  a short paragraph and a figure
//   check    a quick question, answered with the Inputs part
//   play     a part with a goal, marked by reading the part's state
// A thin bar and a cross on top; a Check button that becomes Continue; plain feedback: right, close, or
// wrong with the one line of why for the answer given. Being wrong costs nothing. Every attempt is handed
// to `record`, which saves it and queues it to go up.
import * as parts from './parts.js';
import * as feel from './feel.js';
import { holds, read, subst } from './rules.js';
import { icon, medallion } from './art.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// *words* are stressed, as in the scene scripts; a line break stays a line break.
export const rich = s => esc(s).replace(/\*([^*\n]+)\*/g, '<span class="key">$1</span>').replace(/\n/g, '<br>');

// ---------------------------------------------------------------- marking, shared with the fit tool

// The id of the right option on a choice: `answer`, or the one option marked right.
export function answerOf(step) {
  if (step.answer !== undefined) return step.answer;
  if (step.input && step.input.form === 'choice') {
    const right = (step.input.options || []).filter(o => o.right);
    if (right.length === 1) return right[0].id;
  }
  return undefined;
}

// The rule a step is marked by, and the wider one for "close" where there is one.
export function rulesOf(step, inputsDesc) {
  if (step.kind === 'play') return { goal: step.goal, close: step.closeGoal || null };
  if (step.kind !== 'check' || !step.input) return { goal: null, close: null };
  const m = (inputsDesc.marking || {})[step.input.form];
  if (!m) return { goal: step.goal || null, close: null };
  const within = step.within ?? 0;
  const vars = { answer: answerOf(step), within, close: step.close ?? within * 2.5 };
  return {
    goal: step.goal || subst(m.rule, vars),
    close: m.close && (step.close !== undefined || within > 0) ? subst(m.close, vars) : null,
  };
}

// Marks a step on a part's state: { right, close, why }.
export function mark(step, state, inputsDesc) {
  const { goal, close } = rulesOf(step, inputsDesc);
  const right = !!goal && holds(goal, state);
  const near = !right && !!close && holds(close, state);
  let why = '';
  if (right) why = step.right || '';
  else if (step.kind === 'check' && step.input.form === 'choice') {
    const o = (step.input.options || []).find(x => x.id === state.value);
    why = (o && o.why) || step.why || '';
  } else {
    const miss = (step.misses || []).find(m => holds(m.when, state));
    why = miss ? miss.why : step.why || '';
  }
  return { right, close: near, why };
}

// Whether there's enough of an answer to check. Check steps ask the part; play steps look for the value
// their goal reads (or their own `ready` rule).
export function readyOf(step, state) {
  if (step.kind === 'check') return !!state.answered;
  if (step.ready) return holds(step.ready, state);
  const firstRead = r => (!r || typeof r !== 'object' ? null : r.read || [].concat(r.all || [], r.any || [], r.not ? [r.not] : []).map(firstRead).find(Boolean) || null);
  const path = firstRead(step.goal);
  return path ? read(state, path) !== undefined && read(state, path) !== null : true;
}

// ---------------------------------------------------------------- the player

export class Run {
  // view: the element to draw in. topic, lesson: from the library. start: the step to begin at.
  // record(event): saves and queues an attempt. media(path): a media path's address. onLeave(how).
  constructor(view, { topic, lesson, start = 0, record = () => {}, media = p => p, onLeave = () => {} }) {
    Object.assign(this, { view, topic, lesson, record, media, onLeave });
    this.i = Math.max(0, Math.min(start, lesson.steps.length - 1));
    this.mounted = [];
    this.results = {};
    this.state = 'idle'; // idle | ready | marked | ended
  }

  async open() {
    document.documentElement.classList.add('bare');
    this.inputsDesc = await parts.describe('inputs');
    this.view.innerHTML = `<section class="lesson" aria-label="${esc(this.lesson.title)}">
      <header class="ltop"><button class="round mute" data-go="leave" aria-label="Close" data-sound="off">${icon.close(20)}</button><div class="lbar"><b></b></div></header>
      <div class="lbody"></div>
      <footer class="lfoot"><div class="lfeed" hidden></div><button class="btn" data-go="go" data-sound="none"></button></footer>
    </section>`;
    this.root = this.view.querySelector('.lesson');
    this.body = this.root.querySelector('.lbody');
    this.foot = this.root.querySelector('.lfoot');
    this.btn = this.root.querySelector('[data-go=go]');
    this.bar = this.root.querySelector('.lbar b');
    this.onClick = e => {
      const b = e.target.closest('[data-go]');
      if (!b || b.disabled) return;
      const what = b.dataset.go;
      if (what === 'leave') this.leave('closed');
      else if (what === 'go') this.go();
      else if (what === 'finish') this.leave('finished');
    };
    this.root.addEventListener('click', this.onClick);
    this.record({ type: 'start', topic: this.topic.id, lesson: this.lesson.id, version: this.lesson.version || 1, step: this.step.id });
    await this.show(this.i);
    return this;
  }

  get step() { return this.lesson.steps[this.i]; }

  progressTo(share, animate = true) {
    const from = this.share ?? share;
    this.share = share;
    if (animate && from !== share) feel.spring(this.bar, v => `scaleX(${v})`, from, share, { ms: 600 });
    this.bar.style.transform = `scaleX(${share})`;
  }

  clearParts() {
    for (const p of this.mounted) try { p.remove(); } catch { /* already gone */ }
    this.mounted = [];
    this.figure = this.input = this.play = null;
  }

  // Mounts a part described by a step ({ part, settings, calls }) into el.
  async mountPart(spec, el) {
    const h = await parts.mount(spec.part, el, spec.settings || {}, { media: this.media });
    this.mounted.push(h);
    for (const c of spec.calls || []) h.run(c);
    return h;
  }

  async show(i) {
    this.i = i;
    this.state = 'idle';
    this.clearParts();
    const s = this.step;
    this.progressTo(i / this.lesson.steps.length, i > 0);
    this.foot.className = 'lfoot';
    this.foot.querySelector('.lfeed').hidden = true;
    const text = s.kind === 'explain' ? s.text : s.ask;
    const fig = s.kind === 'play' ? s.play : s.figure;
    const small = s.kind === 'check' && s.input && s.input.form !== 'slider';
    this.body.innerHTML = `${fig ? `<div class="lstage stage${fig.image ? ' image' : ''}${small ? ' small' : ''}"></div>` : ''}
      <p class="ltext${s.kind === 'explain' && String(text || '').length > 150 ? ' long' : ''}">${rich(text)}</p>
      ${s.kind === 'check' ? '<div class="linput"></div>' : ''}`;
    this.body.scrollTop = 0;
    const stage = this.body.querySelector('.lstage');
    const jobs = [];
    if (fig && fig.image) {
      jobs.push(Promise.resolve(this.media(fig.image)).then(url => { if (url) stage.innerHTML = `<img src="${esc(url)}" alt="${esc(fig.alt || '')}">`; }));
    } else if (fig) {
      jobs.push(this.mountPart(fig, stage).then(h => { if (s.kind === 'play') this.play = h; else this.figure = h; }));
    }
    if (s.kind === 'check') {
      const el = this.body.querySelector('.linput');
      jobs.push(this.mountPart({ part: 'inputs', settings: s.input }, el).then(h => { this.input = h; }));
    }
    this.setButton(s.kind === 'explain' ? 'continue' : 'check', s.kind === 'explain');
    await Promise.all(jobs);
    if (this.i !== i) return;
    const live = this.input || this.play;
    if (live) {
      const recheck = () => { if (this.state === 'idle' || this.state === 'ready') this.setReady(readyOf(s, live.state())); };
      for (const ev of ['change', 'tapped', 'turned']) live.on(ev, recheck);
      recheck();
    }
    this.state = s.kind === 'explain' ? 'ready' : this.state;
    this.view.dispatchEvent(new CustomEvent('stepshown', { detail: { i, id: s.id } }));
  }

  setButton(kind, enabled) {
    const words = { check: 'Check', continue: 'Continue', finish: 'Continue' };
    this.btn.textContent = words[kind];
    this.btn.dataset.kind = kind;
    this.btn.disabled = !enabled;
    this.btn.className = 'btn';
  }

  setReady(yes) {
    if (this.state === 'marked') return;
    this.state = yes ? 'ready' : 'idle';
    this.btn.disabled = !yes;
  }

  go() {
    if (this.btn.dataset.kind === 'check') return this.check();
    feel.press(this.btn, 'tap');
    const s = this.step;
    if (s.kind === 'explain') {
      this.results[s.id] = { seen: true };
      this.record({ type: 'seen', topic: this.topic.id, lesson: this.lesson.id, version: this.lesson.version || 1, step: s.id }, { seen: true });
    }
    if (this.i + 1 < this.lesson.steps.length) return this.show(this.i + 1);
    return this.end();
  }

  check() {
    const s = this.step, live = this.input || this.play;
    if (!live || this.state !== 'ready') return;
    const state = live.state();
    const res = mark(s, state, this.inputsDesc);
    this.state = 'marked';
    this.results[s.id] = res;
    const kind = res.right ? 'right' : res.close ? 'close' : 'wrong';
    if (this.input) {
      this.input.calls.lock();
      const answer = answerOf(s);
      if (answer !== undefined) this.input.calls.reveal(answer);
      this.input.calls.mark(kind);
    }
    const target = this.play || this.figure;
    if (target) for (const c of s.then || []) target.run(c);
    feel.sound(kind);
    feel.tick();
    const feed = this.foot.querySelector('.lfeed');
    feed.innerHTML = `<div class="badge">${kind === 'right' ? icon.check(22) : kind === 'close' ? icon.star(20) : icon.close(18)}</div>
      <div><p class="lverdict">${{ right: 'Right', close: 'Close', wrong: 'Not quite' }[kind]}</p>${res.why ? `<p class="lwhy">${rich(res.why)}</p>` : ''}</div>`;
    feed.hidden = false;
    this.foot.className = `lfoot ${kind}`;
    feel.glide(this.foot, v => `translateY(${v}px)`, 60, 0);
    // The feedback takes room from the step: keep the answer and the truth beside it in view.
    if (this.input) requestAnimationFrame(() => this.body.scrollTo({ top: this.body.scrollHeight, behavior: 'smooth' }));
    this.setButton(this.i + 1 < this.lesson.steps.length ? 'continue' : 'finish', true);
    this.btn.className = `btn ${kind === 'right' ? 'teal' : kind === 'close' ? 'gold' : 'pink'}`;
    this.record({
      type: 'attempt', topic: this.topic.id, lesson: this.lesson.id, version: this.lesson.version || 1, step: s.id, kind: s.kind,
      form: s.kind === 'check' ? s.input.form : s.play.part, value: s.kind === 'check' ? state.value : state, right: res.right, close: res.close, why: res.why,
    }, { right: res.right, close: res.close });
  }

  end() {
    this.state = 'ended';
    this.clearParts();
    this.progressTo(1);
    const asked = this.lesson.steps.filter(s => s.kind !== 'explain');
    const right = asked.filter(s => this.results[s.id] && this.results[s.id].right).length;
    this.record({ type: 'finish', topic: this.topic.id, lesson: this.lesson.id, version: this.lesson.version || 1, right, of: asked.length }, null, 'finish');
    feel.sound('done');
    feel.tick();
    const sources = (this.lesson.sources || []).map(x => x.by || x.title).filter(Boolean);
    this.body.innerHTML = '';
    this.foot.className = 'lfoot';
    this.foot.querySelector('.lfeed').hidden = true;
    const end = document.createElement('div');
    end.className = 'lend';
    end.innerHTML = `<div class="rays"></div>${medallion(this.topic, 104)}<p class="big">Lesson done</p>
      ${asked.length ? `<p class="tally">${right} of ${asked.length} right</p>` : ''}
      ${sources.length ? `<p class="lsrc">From ${esc([...new Set(sources)].join(', '))}</p>` : ''}`;
    this.body.replaceWith(end);
    this.body = end;
    feel.pop(end.querySelector('.medal'), 0.4);
    this.setButton('finish', true);
    this.btn.dataset.go = 'finish';
  }

  leave(how) {
    if (this.gone) return;
    this.gone = true;
    if (how === 'closed' && this.state !== 'ended') {
      this.record({ type: 'leave', topic: this.topic.id, lesson: this.lesson.id, version: this.lesson.version || 1, step: this.step.id });
    }
    this.remove();
    this.onLeave(how);
  }

  remove() {
    this.clearParts();
    if (this.root) this.root.removeEventListener('click', this.onClick);
    this.view.innerHTML = '';
    document.documentElement.classList.remove('bare');
  }

  // For `primer fit`: shows the feedback as it would look after an answer, without marking anything.
  preview(kind, why) {
    const feed = this.foot.querySelector('.lfeed');
    feed.innerHTML = `<div class="badge"></div><div><p class="lverdict">${{ right: 'Right', close: 'Close', wrong: 'Not quite' }[kind]}</p>${why ? `<p class="lwhy">${rich(why)}</p>` : ''}</div>`;
    feed.hidden = false;
    this.foot.className = `lfoot ${kind}`;
    this.setButton('continue', true);
  }

  // For `primer fit`: how this step sits on the screen it's drawn on.
  measure() {
    const b = this.body.getBoundingClientRect(), stage = this.body.querySelector('.lstage');
    return {
      step: this.step.id,
      over: Math.max(0, Math.round(this.body.scrollHeight - this.body.clientHeight)),
      stage: stage ? Math.round(stage.getBoundingClientRect().height) : null,
      foot: Math.round(this.foot.getBoundingClientRect().height),
      body: Math.round(b.height),
      screen: innerHeight,
    };
  }
}
