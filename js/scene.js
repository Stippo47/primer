// Narrated scenes. A scene is a script: a list of lines, each said by the narrator and always shown as a
// caption, with actions on the parts on screen hung on its words ("at the word *rise*, turn the globe").
// The same parts a lesson uses, mounted the same way: a scene never draws anything itself.
//
// The clock. With the voice on, each line is one clip, and the clip's own clock is the scene's clock: every
// frame reads where the sound has got to and fires whatever is hung on the words before it, so an action
// stays on its word however late the sound starts, and pausing the sound pauses the picture. Lines follow
// each other with a short gap. With the voice off, or once no sound has played, each line runs on a
// reading clock instead (its words spread over the time it takes to read them) and waits for a tap at its
// end: silent is a normal way to watch.
//
// Taps. The picture: pause, play, and at the end of a line read silently, go on. Back starts the line again,
// or goes to the one before when near its start; skip goes to the next. A line can wait for the person to
// do something with a part (a goal, marked like a play step) before the scene carries on.
//
// Going back rebuilds the picture: the parts are mounted again and every action before that line is run at
// once (an argument named `seconds` set to 0, and `$p` to 1). So any part works in a scene, with no rewind
// of its own.
import * as parts from './parts.js';
import * as feel from './feel.js';
import { mark, readyOf } from './lesson.js';
import { Clip } from './narration.js';

export const NARRATORS = { heart: 'Heart', george: 'George', bella: 'Bella', 'chatterbox-a': 'Chatterbox A' };
export const DEFAULT_NARRATOR = 'heart';
export const GAP = 0.45;                                          // seconds between lines, voiced
export const READING = { lead: 0.35, perWord: 0.34, least: 1.8 }; // the reading clock, in seconds
const BACK_TO_PREVIOUS = 1.5;                                     // back this early in a line goes to the line before

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- words, shared with the skill

// The words of a line as it's said, split on spaces, the way the PC's aligner splits them: the timing
// file has one entry per word, in this order. A word is compared without case, stress marks or the
// punctuation around it. skill/primer.py (said_of, split_words, norm_word, find_words) does the same.
export const saidOf = line => (typeof line.say === 'string' && line.say.trim() ? line.say : line.text) || '';
export const splitWords = s => String(s || '').split(/\s+/).filter(Boolean);
export const normWord = w => String(w).replace(/[’‘]/g, "'").replace(/\*/g, '').toLowerCase()
  .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

// Where an action's words are in the line: the index of the first of them (or the last, for the end of a
// stretch). "$start" and "$end" are the line's ends; "rise#2" is the second "rise". -1 if they aren't there.
export function findWords(said, at, { last = false } = {}) {
  if (at === '$start') return 'start';
  if (at === '$end') return 'end';
  const m = String(at).match(/^(.*?)(?:#(\d+))?$/);
  const want = splitWords(m[1]).map(normWord).filter(Boolean);
  const nth = Number(m[2] || 1);
  const ws = splitWords(said).map(normWord);
  if (!want.length) return -1;
  let seen = 0;
  for (let i = 0; i + want.length <= ws.length; i++) {
    if (want.every((w, k) => ws[i + k] === w) && ++seen === nth) return last ? i + want.length - 1 : i;
  }
  return -1;
}

// A call on a line: "globe.spinTo" names the part when a scene has more than one; with one part, the
// call's name alone does.
export function splitCall(call, partNames) {
  const [head, ...args] = call;
  const dot = String(head).indexOf('.');
  if (dot > 0) return { part: head.slice(0, dot), name: head.slice(dot + 1), args };
  return { part: partNames.length === 1 ? partNames[0] : null, name: head, args };
}

// A reading clock for a line with no clip: its words spread over the time they take to read.
export function readingTimes(said) {
  const ws = splitWords(said);
  const dur = Math.max(READING.least, READING.lead + ws.length * READING.perWord);
  const total = ws.reduce((n, w) => n + w.length + 1, 0) || 1;
  let before = 0;
  const words = ws.map(w => {
    const s = READING.lead * 0.5 + (dur - READING.lead) * (before / total);
    before += w.length + 1;
    return [w, s, READING.lead * 0.5 + (dur - READING.lead) * (before / total)];
  });
  return { dur, words };
}

// ---------------------------------------------------------------- icons

const I = (body, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 28 28" aria-hidden="true">${body}</svg>`;
export const sceneIcon = {
  play: s => I('<path d="M9.5 6.2v15.6a1 1 0 0 0 1.5.9l12.4-7.8a1 1 0 0 0 0-1.8L11 5.3a1 1 0 0 0-1.5.9z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>', s),
  pause: s => I('<rect x="7" y="5.5" width="5" height="17" rx="1.6" fill="currentColor"/><rect x="16" y="5.5" width="5" height="17" rx="1.6" fill="currentColor"/>', s),
  back: s => I('<path d="M7 6v16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M21.5 7.3v13.4a1 1 0 0 1-1.6.8L11.2 15a1.2 1.2 0 0 1 0-2l8.7-6.5a1 1 0 0 1 1.6.8z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>', s),
  skip: s => I('<path d="M21 6v16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M6.5 7.3v13.4a1 1 0 0 0 1.6.8L16.8 15a1.2 1.2 0 0 0 0-2L8.1 6.5a1 1 0 0 0-1.6.8z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>', s),
  voice: s => I('<path d="M4.5 11h4l6-5v16l-6-5h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M18.5 10.3a5 5 0 0 1 0 7.4M21.5 7.4a9 9 0 0 1 0 13.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>', s),
  quiet: s => I('<path d="M4.5 11h4l6-5v16l-6-5h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M18.5 10.5l6 7M24.5 10.5l-6 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>', s),
};

const NOTES = {
  silent: 'No sound played, so it reads on by itself. Tap the speaker to try the voice again.',
  missing: 'This voice comes down when there is signal. Reading it for now.',
  go: 'Tap to go on.',
};

// ---------------------------------------------------------------- the player

export class Scene {
  // el: where to draw. scene: { parts, lines }. host: what the scene drives in whatever holds it (a lesson
  // step; an animation on the path is a lesson of one scene step):
  //   button(kind, enabled, colour)  the big button: 'check' (a wait), 'continue', or null while it plays
  //   feedback(kind, why), clearFeedback()
  //   attempt({ line, form, value, right, close, why })   a wait was answered
  //   progress(share)  how far through, 0 to 1 (optional)
  //   ended()          the end was reached
  // opts: timing (the scene's voice file), narrator and fallback (narrator ids, chosen and the topic's),
  // voice() (whether Voice is on), setVoice(on), media(path) -> address.
  constructor(el, scene, host, opts = {}) {
    Object.assign(this, { el, scene, host, opts });
    this.lines = scene.lines || [];
    this.partSpecs = scene.parts || {};
    this.partNames = Object.keys(this.partSpecs);
    this.handles = {};
    this.holders = {};
    this.i = 0;
    this.state = 'loading';   // loading | ready | playing | paused | gap | hold | wait | marked | ended
    this.sound = false;       // whether lines are being voiced
    this.failed = null;       // set once no sound played: the rest is read
    this.fired = [];          // every action run in time, with the clock then: for the tests
    this.clips = [];
    this.clip = null;
    this.raf = 0;
    this.busy = false;
  }

  // ---- building

  async open() {
    this.el.innerHTML = `<div class="scene" data-state="loading">
      <div class="sstage lstage stage">${this.partNames.map(n => `<div class="spart" data-part="${esc(n)}"></div>`).join('')}
        <button class="sbig" data-sc="play" aria-label="Play">${sceneIcon.play(38)}</button>
        <button class="round svoice" data-sc="voice" aria-label="Voice"></button></div>
      <div class="scap"><div class="spips">${this.lines.map(() => '<i><b></b></i>').join('')}</div><p class="ltext sline"></p><p class="snote" hidden></p></div>
      <div class="sctl"><button class="round" data-sc="back" aria-label="Back a line">${sceneIcon.back(22)}</button>
        <button class="round sbtn" data-sc="play" aria-label="Play">${sceneIcon.play(24)}</button>
        <button class="round" data-sc="skip" aria-label="Next line">${sceneIcon.skip(22)}</button></div>
    </div>`;
    this.root = this.el.querySelector('.scene');
    this.stage = this.root.querySelector('.sstage');
    this.cap = this.root.querySelector('.sline');
    this.note = this.root.querySelector('.snote');
    this.pips = [...this.root.querySelectorAll('.spips i b')];
    this.onTap = e => this.tap(e);
    this.root.addEventListener('click', this.onTap);
    this.onHide = () => { if (document.visibilityState === 'hidden') this.pause(); };
    document.addEventListener('visibilitychange', this.onHide);
    // The voice is fetched and made ready before the scene can start: a tap must start it at once.
    this.urls = await this.clipUrls();
    await this.build(0);
    if (this.gone) return this;
    this.showLine(0, 0);
    this.setVoiceButton();
    this.set('ready');
    this.host.button(null);
    return this;
  }

  // For each line: its clip, in the chosen narrator's voice, else the topic's, as
  // { narrator, url, words, seconds }; url is null when the clip hasn't come down yet. Null for a line that
  // was never voiced, or whose words have changed since (its clip would say something else).
  async clipUrls() {
    const t = this.opts.timing && this.opts.timing.lines ? this.opts.timing.lines : {};
    const order = [...new Set([this.opts.narrator, this.opts.fallback, DEFAULT_NARRATOR].filter(Boolean))];
    return Promise.all(this.lines.map(async line => {
      const byVoice = t[line.id] || {};
      let found = null;
      for (const n of order) {
        const c = byVoice[n];
        if (!c || !c.clip || String(c.said).replace(/\*/g, '') !== saidOf(line).replace(/\*/g, '')) continue;
        const url = await Promise.resolve(this.opts.media ? this.opts.media(c.clip) : c.clip).catch(() => null);
        const entry = { narrator: n, url: url || null, words: c.words || [], seconds: c.seconds || 0, path: c.clip };
        if (url) return entry;
        found = found || entry;
      }
      return found;
    }));
  }

  // Mounts every part fresh and runs every action before line k at once: the picture as it is when line k
  // begins. Used to start, and to go back.
  async build(k) {
    const fresh = {}, holders = {};
    for (const name of this.partNames) {
      const spec = this.partSpecs[name];
      const holder = document.createElement('div');
      holder.className = 'spart-in';
      this.stage.querySelector(`.spart[data-part="${CSS.escape(name)}"]`).append(holder);
      holders[name] = holder;
      fresh[name] = await parts.mount(spec.part, holder, spec.settings || {}, { media: this.opts.media });
      for (const c of spec.calls || []) fresh[name].run(c);
    }
    // the new parts go in over the old ones, which leave only once all are there: going back never
    // shows an empty stage
    for (const name of this.partNames) {
      if (this.handles[name]) { try { this.handles[name].remove(); } catch { /* gone */ } }
      if (this.holders[name]) this.holders[name].remove();
    }
    this.handles = fresh;
    this.holders = holders;
    if (this.gone) { this.dropParts(); return; }
    for (let j = 0; j < k; j++) this.settleLine(j);
  }

  handle(name) { return this.handles[name] || null; }

  // Runs one action. now: at once (a jump), with `seconds` 0 and `$p` 1.
  run(action, p = 1, now = false) {
    const { part, name, args } = splitCall(action.call, this.partNames);
    const h = this.handle(part);
    if (!h) return;
    const spec = (h.desc.calls || {})[name];
    const filled = args.map((a, k) => {
      if (a === '$p') return p;
      if (now && spec && spec.args[k] && spec.args[k].name === 'seconds') return 0;
      return a;
    });
    try { h.run([name, ...filled]); } catch (e) { console.warn(`scene: ${name}: ${e.message}`); }
  }

  // Every action of a line at once, and a wait's `then`: the picture as the line leaves it.
  settleLine(j) {
    const line = this.lines[j];
    for (const a of line.do || []) this.run(a, 1, true);
    if (line.wait) for (const c of line.wait.then || []) this.run({ call: c }, 1, true);
  }

  // ---- one line

  // When everything on line j happens: by its clip's word times, or by the reading clock.
  plan(j) {
    const line = this.lines[j], said = saidOf(line), clip = this.sound ? this.urls[j] : null;
    const words = clip && clip.url && clip.words.length === splitWords(said).length ? clip.words : null;
    const read = readingTimes(said);
    const ws = words || read.words;
    const dur = words ? Math.max(clip.seconds, ws.length ? ws[ws.length - 1][2] : 0) : read.dur;
    const timeOf = (at, last) => {
      const k = findWords(said, at, { last });
      if (k === 'start') return 0;
      if (k === 'end') return dur;
      if (k < 0) return 0;
      return last ? ws[k][2] : ws[k][1];
    };
    const actions = (line.do || []).map((a, n) => {
      if (a.from === undefined && a.to === undefined) return { a, n, t0: a.at === undefined ? 0 : timeOf(a.at, false), span: false, done: false };
      const t0 = timeOf(a.from ?? '$start', false);
      return { a, n, t0, t1: Math.max(t0 + 0.01, timeOf(a.to ?? '$end', true)), span: true, done: false };
    });
    return { j, dur, ws, voiced: !!words, actions, lit: -1 };
  }

  showLine(j, t) {
    const line = this.lines[j];
    this.i = j;
    // the caption, a span per word, so the words said so far can be lit as the voice reaches them
    let key = false;
    this.cap.innerHTML = splitWords(line.text).map(w => {
      if (w.startsWith('*')) key = true;
      const html = `<span class="w${key ? ' key' : ''}">${esc(w.replace(/\*/g, ''))}</span>`;
      if (/\*[^\p{L}\p{N}*]*$/u.test(w)) key = false;
      return html;
    }).join(' ');
    this.words = [...this.cap.querySelectorAll('.w')];
    this.pips.forEach((b, k) => { b.style.transform = `scaleX(${k < j ? 1 : 0})`; });
    this.cur = this.plan(j);
    this.root.classList.toggle('lit', this.cur.voiced && !line.say);
    this.paint(t);
  }

  // Lights the words said so far and fills the line's pip.
  paint(t) {
    const p = this.cur;
    if (p.voiced && !this.lines[p.j].say) {
      let k = -1;
      while (k + 1 < p.ws.length && p.ws[k + 1][1] <= t + 0.04) k++;
      if (k !== p.lit) {
        this.words.forEach((w, n) => w.classList.toggle('said', n <= k));
        p.lit = k;
      }
    }
    const share = Math.min(1, Math.max(0, t / (p.dur || 1)));
    const b = this.pips[p.j];
    if (b) b.style.transform = `scaleX(${share.toFixed(3)})`;
    if (this.host.progress) this.host.progress((p.j + share) / Math.max(1, this.lines.length));
  }

  // Fires everything due by time t on the current line, and drives anything running across a stretch.
  advance(t) {
    const id = this.lines[this.cur.j].id;
    for (const x of this.cur.actions) {
      if (x.done || t < x.t0) continue;
      if (!x.began) { x.began = true; this.fired.push({ line: id, n: x.n, want: x.t0, at: t, voiced: this.cur.voiced }); }
      if (x.span) {
        const p = Math.min(1, (t - x.t0) / (x.t1 - x.t0));
        this.run(x.a, p);
        if (p >= 1) x.done = true;
      } else {
        x.done = true;
        this.run(x.a);
      }
    }
    this.paint(t);
  }

  // Starts line j from its beginning: what hangs on its start happens at once.
  startLine(j) {
    this.stopClip();
    this.hideNote('go');
    this.host.clearFeedback();
    this.showLine(j, 0);
    const c = this.urls[j];
    if (this.sound && c && c.url) {
      const primed = this.clips[j];
      this.clip = primed && primed.status === 'primed' ? primed : new Clip(c.url);
      this.clips[j] = this.clip;
      this.clip.on(what => this.clipSaid(what));
      this.clip.play();
    } else if (this.sound && c && !c.url) {
      this.showNote('missing');
    }
    this.readFrom(0);
    this.set('playing');
    this.advance(0);
    this.loop();
  }

  clipSaid(what) {
    if (!this.clip || this.state === 'ended') return;
    if (what === 'ended') this.lineSaid();
    if (what === 'failed') {
      // No sound: the rest is read. This line carries on from where the clip had got to.
      const t = this.clip.time;
      this.sound = false;
      this.failed = this.clip.why || 'silent';
      this.stopClip();
      this.showNote('silent');
      this.setVoiceButton();
      this.replan(t);
    }
  }

  // The current line worked out again (the voice came or went), keeping what has happened.
  replan(t) {
    const done = this.cur.actions.filter(x => x.done || x.began).map(x => x.n);
    this.cur = this.plan(this.i);
    for (const x of this.cur.actions) if (done.includes(x.n)) { x.began = true; x.done = !x.span; }
    this.root.classList.toggle('lit', this.cur.voiced && !this.lines[this.i].say);
    this.readFrom(Math.min(t, this.cur.dur));
    this.pausedAt = Math.min(t, this.cur.dur);
  }

  // The reading clock: seconds into the line, counted from now.
  readFrom(t) { this.readT0 = performance.now() - t * 1000; }

  clock(now) {
    const c = this.clip;
    if (c && (c.status === 'playing' || c.status === 'starting' || c.status === 'ended')) {
      c.watch(now);
      return c.time;
    }
    return (now - this.readT0) / 1000;
  }

  loop() {
    if (this.raf) return;
    const step = now => {
      this.raf = 0;
      if (this.gone) return;
      if (this.state === 'playing') {
        const t = this.clock(now);
        this.advance(Math.min(t, this.cur.dur + 5));
        // read, a line is done when its time is up; voiced, when its clip ends (clipSaid)
        if (!this.clip && t >= this.cur.dur) this.lineSaid();
      } else if (this.state === 'gap' && now >= this.gapUntil) {
        this.startLine(this.i + 1);
      }
      if (this.state === 'playing' || this.state === 'gap') this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  // The line has been said: everything on it lands, then a wait, the next line, or the end.
  lineSaid() {
    if (this.state !== 'playing') return;
    this.advance(this.cur.dur + 0.001);
    const line = this.lines[this.i];
    this.stopClip();
    if (line.wait) { this.startWait(); return; }
    if (this.i + 1 >= this.lines.length) { this.end(); return; }
    const next = this.urls[this.i + 1];
    if (!this.sound || !(this.cur.voiced || (next && next.url))) { this.set('hold'); this.showNote('go'); return; }
    this.gapUntil = performance.now() + (GAP + (Number(line.hold) || 0)) * 1000;
    this.set('gap');
    this.loop();
  }

  // ---- waits: the person does something with a part, marked like a play step

  waitStep() {
    const w = this.lines[this.i].wait;
    return { kind: 'play', goal: w.goal, closeGoal: w.closeGoal, ready: w.ready, right: w.right, why: w.why, misses: w.misses };
  }

  waitPart() {
    const w = this.lines[this.i].wait;
    return this.handle(w.on || (this.partNames.length === 1 ? this.partNames[0] : null));
  }

  startWait() {
    this.set('wait');
    this.host.button('check', false);
    const h = this.waitPart();
    if (!h) return;
    const step = this.waitStep();
    const recheck = () => { if (this.state === 'wait') this.host.button('check', readyOf(step, h.state())); };
    this.unwait = ['change', 'tapped', 'turned'].map(ev => h.on(ev, recheck));
    recheck();
  }

  // The host's Check, during a wait: marked, the wait's `then` shown, and the feedback.
  check() {
    if (this.state !== 'wait') return null;
    const h = this.waitPart();
    const state = h ? h.state() : {};
    const step = this.waitStep();
    if (!readyOf(step, state)) return null;
    const res = mark(step, state, {});
    const kind = res.right ? 'right' : res.close ? 'close' : 'wrong';
    for (const c of this.lines[this.i].wait.then || []) this.run({ call: c }, 1);
    feel.sound(kind);
    feel.tick();
    this.set('marked');
    this.host.feedback(kind, res.why);
    this.host.button('continue', true, kind === 'right' ? 'teal' : kind === 'close' ? 'gold' : 'pink');
    this.host.attempt({ line: this.lines[this.i].id, form: h ? h.name : '', value: state, right: res.right, close: res.close, why: res.why });
    return res;
  }

  stopWait() {
    for (const off of this.unwait || []) if (typeof off === 'function') off();
    this.unwait = null;
  }

  // ---- what the person can do

  // The host's big button while the scene is on: Check during a wait, then Continue to carry on.
  button() {
    if (this.state === 'wait') return this.check();
    if (this.state === 'marked') {
      this.stopWait();
      this.host.clearFeedback();
      this.host.button(null);
      if (this.i + 1 >= this.lines.length) return this.end();
      this.prime(this.i + 1);
      return this.startLine(this.i + 1);
    }
    return null;
  }

  tap(e) {
    if (this.busy || this.state === 'loading') return;
    const b = e.target.closest('[data-sc]');
    if (b) {
      const what = b.dataset.sc;
      if (what === 'play') return this.toggle();
      if (what === 'back') return this.back();
      if (what === 'skip') return this.skip();
      if (what === 'voice') return this.toggleVoice();
      return null;
    }
    // a tap on the picture or the words: pause and play, or go on after a line read silently
    if (e.target.closest('.sstage, .scap') && this.state !== 'wait' && this.state !== 'marked') return this.toggle();
    return null;
  }

  // Inside a tap: every clip from line j on gets a fresh player now, started and stopped at once, so it
  // can start by itself when the scene reaches it.
  prime(j) {
    if (!this.sound) return;
    for (let k = j; k < this.lines.length; k++) {
      const c = this.urls[k];
      if (!c || !c.url || (this.clip && this.clips[k] === this.clip)) continue;
      if (this.clips[k]) this.clips[k].stop();
      this.clips[k] = new Clip(c.url);
      this.clips[k].prime();
    }
  }

  wantSound() { return !!(this.opts.voice && this.opts.voice()) && !this.failed; }

  // The picture, or the play button. At the end it does nothing: back plays the last line again.
  toggle() {
    if (this.state === 'ready') return this.play();
    if (this.state === 'playing' || this.state === 'gap') return this.pause();
    if (this.state === 'paused') return this.resume();
    if (this.state === 'hold') return this.goOn();
    return null;
  }

  play() {
    this.sound = this.wantSound();
    this.prime(0);
    this.startLine(0);
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'gap') return;
    this.pausedFrom = this.state;
    this.pausedAt = this.state === 'playing' ? Math.min(this.clock(performance.now()), this.cur.dur) : 0;
    this.gapLeft = this.state === 'gap' ? Math.max(0, this.gapUntil - performance.now()) : 0;
    if (this.clip) this.clip.pause();
    this.set('paused');
  }

  // Every play gets a new player: a paused clip carries on from where it was on a fresh <audio>.
  resume() {
    if (this.state !== 'paused') return;
    if (this.pausedFrom === 'gap') {
      this.prime(this.i + 1);
      this.gapUntil = performance.now() + this.gapLeft;
      this.set('gap');
    } else {
      if (this.clip) {
        const url = this.clip.url;
        this.stopClip();
        this.clip = new Clip(url);
        this.clips[this.i] = this.clip;
        this.clip.on(what => this.clipSaid(what));
        this.clip.seek(this.pausedAt);
        this.clip.play();
      }
      this.prime(this.i + 1);
      this.readFrom(this.pausedAt);
      this.set('playing');
    }
    this.loop();
  }

  goOn() {
    if (this.state !== 'hold') return;
    this.hideNote('go');
    this.prime(this.i + 1);
    this.startLine(this.i + 1);
  }

  // Back: the line again from its start, or the one before when this one has only just begun. Between
  // lines, or at the end of one read silently, the line on screen is the one just said: it starts again.
  back() {
    if (this.state === 'ready') return null;
    const t = this.state === 'playing' ? this.clock(performance.now()) : this.state === 'paused' && this.pausedFrom === 'playing' ? this.pausedAt : null;
    const early = t !== null && t < BACK_TO_PREVIOUS;
    return this.jump(early && this.i > 0 ? this.i - 1 : this.i);
  }

  // Skip: whatever is left of this line lands at once, and the next begins.
  skip() {
    if (this.state === 'ended' || this.busy) return;
    this.stopWait();
    this.host.clearFeedback();
    this.host.button(null);
    if (this.state === 'ready') {
      this.sound = this.wantSound();
      this.settleLine(0);
    } else {
      this.stopClip();
      for (const x of this.cur.actions) if (!x.done) { x.done = true; this.run(x.a, 1, true); }
      const w = this.lines[this.i].wait;
      if (w && this.state !== 'marked') for (const c of w.then || []) this.run({ call: c }, 1, true);
    }
    if (this.i + 1 >= this.lines.length) { this.end(); return; }
    this.prime(this.i + 1);
    this.startLine(this.i + 1);
  }

  // To the start of line k, the picture rebuilt. The clips are primed first, while the tap still counts.
  async jump(k) {
    if (this.state === 'ready') this.sound = this.wantSound();
    this.busy = true;
    this.stopClip();
    this.stopWait();
    this.host.clearFeedback();
    this.host.button(null);
    this.prime(k);
    this.set('loading');
    try {
      await this.build(k);
    } finally {
      this.busy = false;
    }
    if (this.gone) return;
    this.startLine(k);
  }

  // The speaker on the picture: Voice on or off from here, carrying on from the same moment. After no
  // sound played, it tries the voice again.
  toggleVoice() {
    const on = !(this.opts.voice && this.opts.voice()) || !!this.failed;
    if (this.opts.setVoice) this.opts.setVoice(on);
    this.failed = null;
    this.hideNote('silent');
    this.hideNote('missing');
    this.sound = on;
    this.setVoiceButton();
    if (this.state !== 'playing' && this.state !== 'paused') return;
    const t = this.state === 'playing' ? this.clock(performance.now()) : this.pausedAt;
    this.stopClip();
    this.replan(t);
    this.prime(this.i + 1);
    const c = this.urls[this.i];
    if (on && c && c.url) {
      this.clip = new Clip(c.url);
      this.clips[this.i] = this.clip;
      this.clip.on(what => this.clipSaid(what));
      this.clip.seek(this.pausedAt);
      if (this.state === 'playing') this.clip.play();
    }
  }

  end() {
    this.stopClip();
    this.pips.forEach(b => { b.style.transform = 'scaleX(1)'; });
    if (this.host.progress) this.host.progress(1);
    this.hideNote('go');
    this.seenEnd = true;   // from now on the host may go on whenever it likes, even while a line is replayed
    this.set('ended');
    this.host.button('continue', true);
    this.host.ended();
  }

  // ---- bits

  set(state) {
    this.state = state;
    this.root.dataset.state = state;
    this.root.classList.toggle('waiting', state === 'wait');
    const going = state === 'playing' || state === 'gap';
    const b = this.root.querySelector('.sbtn');
    b.innerHTML = going ? sceneIcon.pause(24) : sceneIcon.play(24);
    b.setAttribute('aria-label', going ? 'Pause' : 'Play');
  }

  setVoiceButton() {
    const on = this.wantSound();
    const b = this.root.querySelector('.svoice');
    b.innerHTML = on ? sceneIcon.voice(20) : sceneIcon.quiet(20);
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('off', !on);
  }

  showNote(which) {
    this.note.textContent = which === 'go' && this.failed ? `${NOTES.silent} ${NOTES.go}` : NOTES[which];
    this.note.dataset.note = which;
    this.note.hidden = false;
  }
  hideNote(which) { if (this.note.dataset.note === which) { this.note.hidden = true; this.note.dataset.note = ''; } }

  stopClip() {
    if (this.clip) { this.clip.listeners.clear(); this.clip.stop(); }
    this.clip = null;
  }

  // For the tests and the film: where it is.
  debug() {
    return { state: this.state, line: this.i, id: this.lines[this.i] && this.lines[this.i].id, sound: this.sound, failed: this.failed,
      t: this.state === 'playing' ? this.clock(performance.now()) : null, voiced: this.cur ? this.cur.voiced : false,
      clip: this.clip ? { status: this.clip.status, time: this.clip.time, started: this.clip.started, why: this.clip.why } : null,
      fired: this.fired.slice(), narrators: (this.urls || []).map(c => (c ? c.narrator : null)) };
  }

  // For `primer fit`: line j's caption on screen, still.
  still(j) {
    this.stopClip();
    this.showLine(j, 0);
    this.set('paused');
  }

  dropParts() {
    for (const h of Object.values(this.handles)) { try { h.remove(); } catch { /* gone */ } }
    for (const el of Object.values(this.holders)) el.remove();
    this.handles = {};
    this.holders = {};
  }

  remove() {
    this.gone = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stopClip();
    this.stopWait();
    for (const c of this.clips) if (c) c.stop();
    this.clips = [];
    this.dropParts();
    document.removeEventListener('visibilitychange', this.onHide);
    if (this.root) this.root.removeEventListener('click', this.onTap);
  }
}
