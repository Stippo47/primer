// Voice clips, for narrated scenes and for words read aloud (a lesson's steps, and the asks of its facts in a
// test or a review). One clip per line, each a plain <audio> made fresh, and the clip's own clock is the
// clock: a scene's picture, and the words lit in a read-along part, follow wherever the sound has got to, so
// they can't drift, and an action hung on a word stays on the word however late the sound starts.
//
// Rules from the phone test (docs/DECISIONS.md, 2026-11-17 and 11-18):
// - Every play gets a new player. An <audio> that has played before can end at once with no length after
//   the app comes back; a fresh one doesn't. A clip that ends at once with no length is tried once more.
// - A clip isn't called silent until its clock has stood still for about 2.5 seconds after being asked to
//   play: sound can be slow to start, the first time after installing above all.
// - The phone's sound is left alone: nothing here touches navigator.audioSession. A plain <audio> plays
//   with the silent switch on without claiming anything, and claiming it stopped the person's music.
// - An iPhone starts sound only from a tap. A scene's later lines start by themselves, so every clip still
//   to come is made, and started and stopped at once, during the tap that starts or resumes the scene
//   (prime). A clip the phone still refuses fails like a silent one, and the scene reads on from its captions.
// - Only the clips of the narrator in use come down (js/sync.js). After a change of narrator, the topic plays
//   in the old one until every clip of the new one is here (sync.voiceFor, which picks the narrator a scene or
//   a lesson is handed). A clip not here is never an error: the line plays from its words, on the reading
//   clock, as with Voice off.
import { saidOf } from './readalong.js';
import { factsOfLesson, askKey } from './facts.js';

export const STILL_MS = 2500;
const QUICK_END = 0.05; // an "ended" this early, with no length, is the phone's stale-player fault
export const DEFAULT_NARRATOR = 'heart';
const plain = s => String(s || '').replace(/\*/g, '').split(/\s+/).filter(Boolean).join(' ');

// A line's clip, from a voice file (a scene's or a lesson's), as { narrator, url, path, words, seconds }: in
// the first narrator of `order` (the one chosen for the subject, then the topic's own, then Heart) that voiced
// what the line says now. url is null when that clip hasn't come down yet: the line is read from its words
// until it has, never in another narrator's voice. Null altogether when it was never voiced, or its words
// have changed since (a clip never says something its text doesn't).
export async function clipFor(timing, line, order, media) {
  const byVoice = (timing && timing.lines && timing.lines[line.id]) || {};
  for (const n of [...new Set([...order, DEFAULT_NARRATOR].filter(Boolean))]) {
    const c = byVoice[n];
    if (!c || !c.clip || plain(c.said) !== plain(saidOf(line))) continue;
    const url = await Promise.resolve(media ? media(c.clip) : c.clip).catch(() => null);
    return { narrator: n, url: url || null, path: c.clip, words: c.words || [], seconds: c.seconds || 0 };
  }
  return null;
}

// What a step reads aloud, as lines ({ id, text, say }): its text or question as it opens, and each line of
// feedback once it's shown. Ids are <base>.<what>: text, ask, right, why, miss-<n> (from 1) and option-<id>.
// A lesson's step is its own base; an ask of a fact (in a drawn test, or a review, whatever the run calls the
// step) is <fact>.<ask>, so its clips are the same wherever it's asked. skill/primer.py (spoken_lines) makes
// the clips by the same ids.
const SPOKEN = { explain: ['text'], check: ['ask', 'right', 'why'], play: ['ask', 'right', 'why'] };
export const baseOf = s => (s && typeof s.fact === 'string' && typeof s.askId === 'string' ? askKey(s.fact, s.askId) : s && s.id);
export function stepLines(s, base = baseOf(s)) {
  const out = [];
  if (!s || typeof base !== 'string' || !SPOKEN[s.kind]) return out;
  const sayOf = field => (typeof s.say === 'string' ? (field === SPOKEN[s.kind][0] ? s.say : undefined) : s.say && typeof s.say === 'object' ? s.say[field] : undefined);
  for (const field of SPOKEN[s.kind]) {
    if (typeof s[field] === 'string' && s[field].trim()) out.push({ id: `${base}.${field}`, text: s[field], say: sayOf(field) });
  }
  (s.misses || []).forEach((m, n) => { if (m && typeof m.why === 'string' && m.why.trim()) out.push({ id: `${base}.miss-${n + 1}`, text: m.why, say: m.say }); });
  if (s.kind === 'check' && s.input && s.input.form === 'choice' && Array.isArray(s.input.options)) {
    for (const o of s.input.options) if (o && o.id && typeof o.why === 'string' && o.why.trim()) out.push({ id: `${base}.option-${o.id}`, text: o.why, say: o.say });
  }
  return out;
}

// Everything a lesson, test or exam reads aloud, into its voice file (voice/<lesson>.json): its steps' lines,
// then every ask of the facts it declares (families filled in), keyed <fact>.<ask>.<what>.
export function spokenLines(lesson) {
  const out = [];
  for (const s of (lesson && lesson.steps) || []) if (s && typeof s.id === 'string') out.push(...stepLines(s, s.id));
  for (const f of lesson ? factsOfLesson(lesson) : []) for (const a of f.asks) out.push(...stepLines(a, askKey(f.id, a.id)));
  return out;
}

// Reads words aloud into read-along parts (js/readalong.js), one line at a time, each on a fresh player, its
// words lit by the clip's clock. Starting another line, or stop(), ends the one before. A lesson never waits
// for it: if no sound plays, the words are simply there to read. Each line can come from its own voice file
// and narrator (`from`: { key, timing, order, media }): a review mixes asks from every lesson and topic.
export class Reader {
  // timing: the voice file, and order: the narrators to try, chosen first, for a line given no `from` of its
  // own. media(path) -> address. on(): whether Voice is on.
  constructor({ timing = null, order = [], media = null, on = () => true } = {}) {
    Object.assign(this, { timing, order, media, on });
    this.found = new Map();   // "<from key>|<line id>" -> promise of its clip entry
    this.ready = new Map();   // the same, once known
    this.primed = null;
    this.clip = null;
    this.ra = null;
    this.raf = 0;
    this.heard = [];          // every line read, for the tests: { id, at, narrator }
  }

  src(from) { return from || { key: '', timing: this.timing, order: this.order }; }
  keyOf(line, from) { return `${this.src(from).key}|${line.id}`; }

  // Starts finding each line's clip now, so a tap later can start one at once.
  warm(lines, from) {
    if (!this.src(from).timing) return;
    for (const line of lines) this.entry(line, from);
  }

  entry(line, from) {
    const k = this.keyOf(line, from), src = this.src(from);
    if (!this.found.has(k)) {
      const p = clipFor(src.timing, line, src.order, src.media || this.media).then(e => { this.ready.set(k, e); return e; }, () => null);
      this.found.set(k, p);
    }
    return this.found.get(k);
  }

  // Inside a tap: the line about to be read gets its player now, started and stopped, so an iPhone lets it
  // start a moment later without a tap of its own.
  prime(line, from) {
    const e = line && this.ready.get(this.keyOf(line, from));
    if (!e || !e.url || !this.on()) return;
    if (this.primed) this.primed.clip.stop();
    this.primed = { key: this.keyOf(line, from), clip: new Clip(e.url) };
    this.primed.clip.prime();
  }

  // Reads one line into a read-along part. True once its clip is asked to play.
  async read(line, ra, from) {
    this.stop();
    if (!line || !ra || !this.on() || !this.src(from).timing) return false;
    const token = (this.token = (this.token || 0) + 1), k = this.keyOf(line, from);
    const e = this.ready.has(k) ? this.ready.get(k) : await this.entry(line, from);
    if (token !== this.token || !e || !e.url || !this.on()) return false;
    const clip = this.primed && this.primed.key === k && this.primed.clip.status === 'primed' ? this.primed.clip : new Clip(e.url);
    this.primed = null;
    this.clip = clip;
    this.ra = ra;
    ra.follow(e.words);
    ra.paint(0);
    clip.on(what => {
      if (this.clip !== clip) return;
      if (what === 'ended' || what === 'failed') this.done();
    });
    this.heard.push({ id: line.id, at: performance.now(), narrator: e.narrator });
    clip.play();
    const step = now => {
      this.raf = 0;
      if (this.clip !== clip) return;
      clip.watch(now);
      if (clip.status === 'playing' || clip.status === 'starting') ra.paint(clip.time);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
    return true;
  }

  done() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.clip) { this.clip.listeners.clear(); this.clip.stop(); }
    this.clip = null;
    if (this.ra) this.ra.finish();
    this.ra = null;
  }

  stop() {
    this.token = (this.token || 0) + 1;
    this.done();
  }

  // For the tests: what's being read now.
  now() {
    return this.clip ? { status: this.clip.status, time: this.clip.time, lit: this.ra ? this.ra.state().lit : 0 } : null;
  }

  remove() {
    this.stop();
    if (this.primed) this.primed.clip.stop();
    this.primed = null;
  }
}

export class Clip {
  constructor(url) {
    this.url = url;
    this.el = null;
    this.status = 'idle';   // idle | primed | starting | playing | paused | ended | failed
    this.why = '';          // when failed: refused | silent | error
    this.retried = false;
    this.raw = 0;           // the last clock reading
    this.movedAt = 0;       // when the clock last moved, or when it was asked to play
    this.started = 0;       // performance.now() when its clock first moved: for the film and the tests
    this.listeners = new Set();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(what) { for (const fn of this.listeners) fn(what, this); }

  // A new <audio> for this clip. Its events only count while it is still this clip's player.
  make() {
    this.drop();
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.addEventListener('ended', () => { if (this.el === el) this.ended(); });
    el.addEventListener('error', () => { if (this.el === el && this.status !== 'idle' && this.status !== 'primed') this.fail('error'); });
    el.src = this.url;
    this.el = el;
    return el;
  }

  // Inside a tap: makes the player and starts and stops it at once, which lets an iPhone start it later
  // without a tap. Nothing is heard: it's stopped before any sound is out.
  prime() {
    if (this.status === 'playing' || this.status === 'starting') return;
    const el = this.make();
    try {
      const p = el.play();
      if (p && p.catch) p.catch(() => { /* stopped before it began, as meant */ });
      el.pause();
    } catch { /* the play() below will say */ }
    this.status = 'primed';
  }

  play() {
    if (!this.el || this.status === 'ended' || this.status === 'failed') this.make();
    const el = this.el;
    this.status = 'starting';
    this.movedAt = performance.now();
    this.raw = el.currentTime;
    let asked;
    try { asked = el.play(); } catch { this.fail('refused'); return; }
    if (asked && asked.catch) {
      asked.catch(e => {
        if (this.el !== el || (e && e.name === 'AbortError') || this.status === 'paused') return;
        this.fail(e && e.name === 'NotAllowedError' ? 'refused' : 'error');
      });
    }
  }

  pause() {
    if (this.status !== 'playing' && this.status !== 'starting') return;
    this.status = 'paused';
    try { this.el.pause(); } catch { /* already stopped */ }
  }

  // Back to a moment in the clip, playing or not.
  seek(t) {
    if (!this.el) this.make();
    try { this.el.currentTime = Math.max(0, t); } catch { /* not loaded yet: it starts at 0 */ }
    this.raw = this.el.currentTime;
    this.movedAt = performance.now();
  }

  // The clip's clock, in seconds. Read every frame by the scene.
  get time() {
    if (!this.el) return 0;
    if (this.status === 'ended') return this.length || this.raw;
    return this.el.currentTime;
  }

  get length() {
    const d = this.el && this.el.duration;
    return Number.isFinite(d) && d > 0 ? d : 0;
  }

  // Called every frame while it's wanted: notices the clock moving, or standing still too long.
  watch(now = performance.now()) {
    if (!this.el || (this.status !== 'starting' && this.status !== 'playing')) return;
    const t = this.el.currentTime;
    if (t !== this.raw) {
      this.raw = t;
      this.movedAt = now;
      if (this.status === 'starting') {
        this.status = 'playing';
        this.started = now - t * 1000;
        this.emit('playing');
      }
      return;
    }
    if (now - this.movedAt > STILL_MS) this.fail('silent');
  }

  ended() {
    // Ended at once with no length: the stale-player fault seen on the phone. Once more, on a new player.
    if ((!this.length || this.raw < QUICK_END) && this.status === 'starting' && !this.retried) {
      this.retried = true;
      this.make();
      this.play();
      return;
    }
    this.status = 'ended';
    this.emit('ended');
  }

  fail(why) {
    if (this.status === 'failed' || this.status === 'ended') return;
    this.status = 'failed';
    this.why = why;
    try { this.el && this.el.pause(); } catch { /* gone */ }
    this.emit('failed');
  }

  // Lets go of the player and its file.
  drop() {
    const el = this.el;
    this.el = null;
    if (!el) return;
    try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* never started */ }
  }

  stop() {
    this.drop();
    if (this.status !== 'ended' && this.status !== 'failed') this.status = 'idle';
  }
}
