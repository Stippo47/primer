// Narrated scenes, played like a video. A scene is a script: a list of lines, each said by the narrator and
// shown as a caption that lights up word by word, with actions on the parts on screen hung on its words ("at
// the word *Atlantic*, turn the globe"). The same parts a lesson uses, mounted the same way: a scene never
// draws anything itself, and nothing in it waits for an answer.
//
// Two places, one player: an animation on the path fills the screen (mode "video", js/screens/video.js), and
// a scene step sits inside a lesson's step (mode "step"). Either way the picture takes no touches; a tap
// brings up the controls laid over it: pause and play in the middle, the line before and the next on either
// side, a bar along the bottom that can be dragged to any moment (each line's start marked on it), the time,
// captions on or off and, full screen, a close button. They fade after a few seconds of no touch while it
// plays, and stay while it's paused. At the end it stops on the last picture with Watch again (and Next,
// full screen).
//
// The clock. With the voice on, each line is one clip, and the clip's own clock is the scene's clock: every
// frame reads where the sound has got to and fires whatever is hung on the words before it, so an action
// stays on its word however late the sound starts, and pausing the sound pauses the picture. With the voice
// off, or once no sound has played, each line runs on a reading clock instead (its words spread over the
// time they take to read), and it plays straight through. Lines follow each other with a short gap, so the
// whole is one timeline: each line's start is known, and the bar is that timeline.
//
// Seeking rebuilds the picture: the parts are mounted again, every action before that moment is run at once
// (an argument named `seconds` set to 0, a stretch's `$p` to how far it had got), whatever was still moving
// lands (a part's finish()), and it plays on from there in the line's clip. So any part works in a scene, with
// no rewind of its own.
//
// Directing (docs/format.md, "A scene"). Parts in a scene move softly (ctx.motion 'soft': things fade and grow
// in, nothing rings on a spring), a stretch eases in and out unless told otherwise, and the clip's clock is
// smoothed between the sound's own ticks, so nothing a stretch drives steps or jitters. With two or more
// parts, shot actions (js/shots.js) cut between them, split the picture or lay one over a corner. Any action
// can make a sound effect (js/sfx.js) as it happens: `"sound": "whoosh"`, and a cut makes its own.
import * as parts from './parts.js';
import { Clip, clipFor, DEFAULT_NARRATOR } from './narration.js';
import { ReadAlong, saidOf, splitWords, findWords, readingTimes } from './readalong.js';
import { Shots, SHOT_SOUND, SHOT_BEAT } from './shots.js';
import { Effects, soundStart } from './sfx.js';
import { EASES } from './ease.js';

export { saidOf, splitWords, normWord, findWords, readingTimes, READING } from './readalong.js';
export { DEFAULT_NARRATOR };

export const NARRATORS = { heart: 'Heart', george: 'George', bella: 'Bella', 'chatterbox-a': 'Chatterbox A' };
export const GAP = 0.45;            // seconds between lines
export const END_HOLD = 0.6;        // seconds on the last line's picture before the end
export const UI_FADE_MS = 3000;     // the controls fade after this long without a touch, while it plays
export const CAPTION_LINES = 4;     // a caption over the picture takes at most this many lines (primer fit)
const BACK_TO_PREVIOUS = 1.5;       // back this early in a line goes to the line before

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = s => { const v = Math.max(0, Math.floor(s + 0.0001)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`; };

// A call on a line: "globe.spinTo" names the part when a scene has more than one; with one part, the
// call's name alone does.
export function splitCall(call, partNames) {
  const [head, ...args] = call;
  const dot = String(head).indexOf('.');
  if (dot > 0) return { part: head.slice(0, dot), name: head.slice(dot + 1), args };
  return { part: partNames.length === 1 ? partNames[0] : null, name: head, args };
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
  captions: s => I('<rect x="3.5" y="6.5" width="21" height="15" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 13h6M17 13h3M8 17h3M14 17h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>', s),
  nocaptions: s => I('<rect x="3.5" y="6.5" width="21" height="15" rx="4" fill="none" stroke="currentColor" stroke-width="2.4" opacity="0.55"/><path d="M8 13h6M8 17h3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.55"/><path d="M5 4.5l18 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>', s),
  close: s => I('<path d="M8 8l12 12M20 8L8 20" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>', s),
  again: s => I('<path d="M7.5 9.5A8 8 0 1 1 6 15" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M5 4.8v6h6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>', s),
};

const NOTES = {
  silent: 'No sound played, so it reads on by itself. Tap the speaker to try the voice again.',
  missing: 'This voice comes down when there is signal. Reading it for now.',
};

// ---------------------------------------------------------------- the player

export class Scene {
  // el: where to draw. scene: { title, parts, lines }. host: what the scene tells whatever holds it:
  //   ended()   the end was reached (each time)
  //   close()   the close button (full screen only)
  //   next()    Next, on the end screen (full screen only)
  // opts: mode ('video' | 'step'), timing (the scene's voice file), narrator and fallback (narrator ids,
  // chosen and the topic's), voice() and setVoice(on), captions() and setCaptions(on) (the remembered
  // choices), media(path) -> address, nextLabel (the end screen's Next), autoplay (false to wait for a tap).
  constructor(el, scene, host = {}, opts = {}) {
    Object.assign(this, { el, scene, host, opts });
    this.mode = opts.mode === 'video' ? 'video' : 'step';
    this.lines = scene.lines || [];
    this.partSpecs = scene.parts || {};
    this.partNames = Object.keys(this.partSpecs);
    this.handles = {};
    this.holders = {};
    this.i = 0;
    this.state = 'loading';   // loading | ready | playing | paused | gap | ended
    this.sound = false;       // whether lines are being voiced
    this.failed = null;       // set once no sound played: the rest is read
    this.tapped = false;      // whether a tap has started it: until then, a phone that wants a tap gets one
    this.fired = [];          // every action run in time, with the clock then: for the tests
    this.clips = [];
    this.clip = null;
    this.raf = 0;
    this.busy = false;
    this.pausedAt = 0;
    this.pausedFrom = 'playing';
    this.gapLeft = 0;
    this.pos = 0;
    // shots, when any action takes one or the scene opens on one
    this.usesShots = (this.partNames.length > 1 && Array.isArray(scene.shot)) || this.lines.some(l => (l.do || []).some(a => Array.isArray(a.call) && String(a.call[0]).startsWith('shot.')));
    this.sfx = new Effects(opts.effects ? { on: opts.effects } : {});
  }

  // ---- building

  async open() {
    const video = this.mode === 'video';
    const btn = (sc, label, body, cls = '') => `<button class="sbtn${cls}" data-sc="${sc}" aria-label="${label}" data-sound="none">${body}</button>`;
    this.el.innerHTML = `<div class="scene${video ? '' : ' stage'}" data-mode="${this.mode}" data-state="loading">
      <div class="sstage">${this.partNames.map(n => `<div class="spart" data-part="${esc(n)}"></div>`).join('')}</div>
      <div class="scap"><p class="sline"></p></div>
      <div class="sui">
        <div class="sscrim"></div>
        <div class="stop">${video ? btn('close', 'Close', sceneIcon.close(22)) : ''}<span class="sgrow"></span>${btn('voice', 'Voice', '')}${btn('captions', 'Captions', '')}</div>
        <div class="smid">${btn('back', 'The line before', sceneIcon.back(24), ' side')}${btn('play', 'Play', sceneIcon.play(34), ' big')}${btn('skip', 'The next line', sceneIcon.skip(24), ' side')}</div>
        <div class="sbot"><div class="stimes"><span class="snow">0:00</span><span class="stotal">0:00</span></div>
          <div class="sbar" role="slider" aria-label="Where it is" aria-valuemin="0"><div class="strack"><b class="sfill"></b><span class="sticks"></span></div><i class="sknob"></i></div></div>
      </div>
      <p class="snote" hidden></p>
      <div class="send" hidden>${video ? `<p class="stitle">${esc(this.scene.title || '')}</p>` : ''}
        <button class="btn ghost" data-sc="again">${sceneIcon.again(20)}Watch again</button>
        ${video ? `<button class="btn" data-sc="next">${esc(this.opts.nextLabel || 'Next')}</button>` : ''}</div>
    </div>`;
    const q = s => this.root.querySelector(s);
    this.root = this.el.querySelector('.scene');
    this.stage = q('.sstage');
    this.cap = new ReadAlong(q('.sline'));
    this.note = q('.snote');
    this.endEl = q('.send');
    this.bar = q('.sbar');
    this.fill = q('.sfill');
    this.knob = q('.sknob');
    this.nowEl = q('.snow');
    this.totalEl = q('.stotal');
    this.onTap = e => this.tap(e);
    this.root.addEventListener('click', this.onTap);
    this.onBar = e => this.barDown(e);
    this.bar.addEventListener('pointerdown', this.onBar);
    // put away, it pauses, and comes back paused with its controls up
    this.onHide = () => { if (document.visibilityState === 'hidden' && (this.state === 'playing' || this.state === 'gap')) { this.pause(); this.showUi(); } };
    document.addEventListener('visibilitychange', this.onHide);
    // The voice is fetched and made ready before the scene can start: a tap must start it at once.
    this.urls = await this.clipUrls();
    this.sound = this.wantSound();
    // the parts' descriptions, for when each call's picture lands (its `beat`), which places its sound
    this.descs = {};
    for (const name of this.partNames) { try { this.descs[name] = await parts.describe(this.partSpecs[name].part); } catch { this.descs[name] = null; } }
    this.layout();
    if (this.usesShots) this.shots = new Shots(this.stage, this.partNames, this.scene.shot);
    await this.build(0);
    if (this.gone) return this;
    this.place(0, 0);
    this.setVoiceButton();
    this.setCaptions();
    this.set('ready');
    this.showUi();
    // It starts by itself where it can: on the reading clock always, with the voice if the phone lets it
    // (if not, it waits on its first picture for a tap on play).
    if (this.opts.autoplay !== false) this.start(false);
    return this;
  }

  // For each line: its clip in the chosen narrator's voice, else the topic's (narration.js, clipFor).
  clipUrls() {
    const order = [this.opts.narrator, this.opts.fallback, DEFAULT_NARRATOR];
    return Promise.all(this.lines.map(line => clipFor(this.opts.timing, line, order, this.opts.media)));
  }

  // Mounts every part fresh and runs every action before line k at once: the picture as it is when line k
  // begins. Used to start, and to seek.
  async build(k) {
    const fresh = {}, holders = {};
    for (const name of this.partNames) {
      const spec = this.partSpecs[name];
      const holder = document.createElement('div');
      holder.className = 'spart-in';
      this.stage.querySelector(`.spart[data-part="${CSS.escape(name)}"]`).append(holder);
      holders[name] = holder;
      fresh[name] = await parts.mount(spec.part, holder, spec.settings || {}, { media: this.opts.media, motion: 'soft' });
      for (const c of spec.calls || []) fresh[name].run(c);
    }
    // the new parts go in over the old ones, which leave only once all are there: seeking never shows an
    // empty picture
    for (const name of this.partNames) {
      if (this.handles[name]) { try { this.handles[name].remove(); } catch { /* gone */ } }
      if (this.holders[name]) this.holders[name].remove();
    }
    this.handles = fresh;
    this.holders = holders;
    if (this.gone) { this.dropParts(); return; }
    if (this.shots) this.shots.reset();
    for (let j = 0; j < k; j++) for (const a of this.lines[j].do || []) this.run(a, stretchEnd(a), true);
    this.land();
  }

  handle(name) { return this.handles[name] || null; }

  // Runs one action. now: at once (seeking), with `seconds` 0 (given or not); p: how far through a stretch,
  // eased and ranged already. Returns the sound a shot makes, if any.
  run(action, p = 1, now = false) {
    if (!Array.isArray(action.call)) return null;   // a sound on its own
    const { part, name, args } = splitCall(action.call, this.partNames);
    if (part === 'shot') return this.shots ? this.shots.run(name, args, now) : null;
    const h = this.handle(part);
    if (!h) return null;
    const spec = (h.desc.calls || {})[name];
    const filled = args.map((a, k) => {
      if (a === '$p') return p;
      if (now && spec && spec.args[k] && spec.args[k].name === 'seconds') return 0;
      return a;
    });
    if (now && spec) spec.args.forEach((a, k) => { if (a.name === 'seconds' && k >= filled.length) { while (filled.length < k) filled.push(undefined); filled.push(0); } });
    try { h.run([name, ...filled]); } catch (e) { console.warn(`scene: ${name}: ${e.message}`); }
    return null;
  }

  // Runs an action as it happens. Its sound is played on its own time (plan: soundOf, sounds).
  fire(action, p) {
    this.run(action, p);
  }

  // The sound an action makes: its own (`sound`, "none" for none), or the one its shot makes; and when, from
  // its moment t0: the picture's keyframe (its call's beat) less the kind's lead (js/sfx.js, KINDS).
  soundOf(action) {
    let s = action.sound;
    let beat = 0;
    if (Array.isArray(action.call)) {
      const head = String(action.call[0]);
      if (head.startsWith('shot.')) {
        const kind = head.slice(5), how = kind === 'cut' ? (action.call[2] || 'cut') : kind;
        if (s === undefined && this.usesShots) s = kind === 'cut' ? SHOT_SOUND[how] : SHOT_SOUND[kind];
        beat = SHOT_BEAT[how] || 0;
      } else {
        const { part, name } = splitCall(action.call, this.partNames);
        const d = part && this.descs ? this.descs[part] : null;
        beat = (d && d.calls && d.calls[name] && Number(d.calls[name].beat)) || 0;
      }
    }
    return s && s !== 'none' ? { name: s, beat } : null;
  }

  // Whatever is still moving in every part lands now: after the picture is built at a moment.
  land() {
    for (const h of Object.values(this.handles)) if (h.finish) { try { h.finish(); } catch (e) { console.warn(`scene: finish: ${e.message}`); } }
    if (this.shots) this.shots.finish();
  }

  // ---- the timeline

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
      if (a.from === undefined && a.to === undefined) return { a, n, t0: a.at === undefined ? 0 : timeOf(a.at, false), span: false };
      const t0 = timeOf(a.from ?? '$start', false);
      return { a, n, t0, t1: Math.max(t0 + 0.01, timeOf(a.to ?? '$end', true)), span: true, p: stretch(a) };
    });
    // each sound on its own time: ahead of its picture as its kind wants, never before the line starts
    const sounds = [];
    for (const x of actions) { const so = this.soundOf(x.a); if (so) sounds.push({ n: x.n, name: so.name, t: Math.max(0, soundStart(so.name, x.t0 + so.beat)) }); }
    return { j, dur, ws, voiced: !!words, actions, sounds };
  }

  gapLen(j) { return j + 1 < this.lines.length ? GAP + (Number(this.lines[j].hold) || 0) : END_HOLD; }

  // Every line's plan and where it starts on the timeline; the bar's marks and the total.
  layout() {
    this.plans = this.lines.map((_, j) => this.plan(j));
    this.starts = [];
    let t = 0;
    this.plans.forEach((p, j) => { this.starts.push(t); t += p.dur + this.gapLen(j); });
    this.total = t;
    this.root.querySelector('.sticks').innerHTML = this.starts.slice(1).map(s => `<i style="left:${((100 * s) / this.total).toFixed(2)}%"></i>`).join('');
    this.totalEl.textContent = clock(this.total);
    this.bar.setAttribute('aria-valuemax', String(Math.round(this.total)));
  }

  // Line j, t seconds into it, without playing: its caption, its actions up to t landed, the bar.
  place(j, t) {
    this.i = j;
    const p = this.plans[j];
    this.cur = { ...p, actions: p.actions.map(x => ({ ...x, done: false, began: false })), sounds: p.sounds.map(x => ({ ...x, done: t > 0 && x.t <= t })) };
    for (const x of this.cur.actions) {
      if (t <= 0 || x.t0 > t) continue;   // at a line's very start, nothing has happened yet
      x.began = true;
      if (x.span) {
        const q = Math.min(1, Math.max(0, (t - x.t0) / (x.t1 - x.t0)));
        this.run(x.a, x.p(q), true);
        x.done = q >= 1;
      } else {
        x.done = true;
        this.run(x.a, 1, true);
      }
    }
    if (t > 0) this.land();
    this.cap.set(this.lines[j].text);
    this.cap.follow(p.ws);
    if (t > 0) this.cap.paint(t);
    this.pausedAt = t;
    this.pausedFrom = 'playing';
    this.paintBar(this.starts[j] + t);
  }

  // Where it is on the timeline, in seconds.
  where(now = performance.now()) {
    const s = this.starts[this.i], d = this.cur ? this.cur.dur : 0;
    if (this.state === 'playing') return s + Math.min(Math.max(0, this.clock(now)), d);
    if (this.state === 'gap') return s + d + Math.max(0, this.gapLen(this.i) - (this.gapUntil - now) / 1000);
    if (this.state === 'ended') return this.total;
    if (this.pausedFrom === 'gap') return s + d + Math.max(0, this.gapLen(this.i) - this.gapLeft);
    return s + this.pausedAt;
  }

  paintBar(T) {
    const k = this.total ? Math.max(0, Math.min(1, T / this.total)) : 0;
    this.fill.style.transform = `scaleX(${k.toFixed(4)})`;
    this.knob.style.left = `${(k * 100).toFixed(3)}%`;
    const words = clock(T);
    if (this.nowEl.textContent !== words) this.nowEl.textContent = words;
    this.bar.setAttribute('aria-valuenow', String(Math.round(T)));
    this.pos = T;
  }

  // ---- playing

  // Fires everything due by time t on the current line, drives anything running across a stretch, and
  // lights the caption's words said so far.
  advance(t) {
    const id = this.lines[this.cur.j].id;
    for (const x of this.cur.sounds || []) { if (!x.done && t >= x.t) { x.done = true; this.sfx.play(x.name); } }
    for (const x of this.cur.actions) {
      if (x.done || t < x.t0) continue;
      const first = !x.began;
      if (first) { x.began = true; this.fired.push({ line: id, n: x.n, want: x.t0, at: t, voiced: this.cur.voiced }); }
      if (x.span) {
        const q = Math.min(1, (t - x.t0) / (x.t1 - x.t0));
        if (first) this.fire(x.a, x.p(q)); else this.run(x.a, x.p(q));
        if (q >= 1) x.done = true;
      } else {
        x.done = true;
        this.fire(x.a);
      }
    }
    this.cap.paint(t);
    this.paintBar(this.starts[this.i] + Math.min(Math.max(0, t), this.cur.dur));
  }

  // Plays on from where it's placed: line i at pausedAt, or the gap after it.
  go() {
    this.endEl.hidden = true;
    if (this.pausedFrom === 'gap') {
      this.gapUntil = performance.now() + this.gapLeft * 1000;
      this.cap.finish();
      this.set('gap');
      this.loop();
      return;
    }
    const t = this.pausedAt, c = this.urls[this.i];
    this.stopClip();
    if (this.sound && c && c.url && this.cur.voiced) {
      const primed = this.clips[this.i];
      const clip = (this.clip = primed && primed.status === 'primed' ? primed : new Clip(c.url));
      this.clips[this.i] = clip;
      clip.on(what => this.clipSaid(what, clip));
      if (t > 0) clip.seek(t);
      clip.play();
    } else if (this.sound && c && !c.url) {
      this.showNote('missing');
    }
    this.readFrom(t);
    this.set('playing');
    this.advance(t);
    this.loop();
  }

  clipSaid(what, clip) {
    if (clip !== this.clip || this.state === 'ended') return;
    if (what === 'ended') this.lineSaid();
    if (what === 'failed') {
      const t = Math.min(clip.time, this.cur.dur);
      this.stopClip();
      if (clip.why === 'refused' && !this.tapped) {
        // It tried to start by itself and the phone wants a tap first: it waits for one, on play.
        this.pausedAt = t;
        this.pausedFrom = 'playing';
        this.set('ready');
        this.showUi();
        return;
      }
      // No sound: the rest is read. This line carries on from where the clip had got to.
      this.sound = false;
      this.failed = clip.why || 'silent';
      this.showNote('silent');
      this.setVoiceButton();
      this.setCaptions();
      this.replan(t);
    }
  }

  // The plans worked out again (the voice came or went), keeping what has happened on this line.
  replan(t) {
    const old = new Map((this.cur ? this.cur.actions : []).map(x => [x.n, x]));
    this.layout();
    const p = this.plans[this.i];
    const heardBefore = new Map((this.cur && this.cur.sounds ? this.cur.sounds : []).map(x => [x.n, x.done]));
    this.cur = { ...p, actions: p.actions.map(x => ({ ...x, done: !!(old.get(x.n) || {}).done, began: !!(old.get(x.n) || {}).began })), sounds: p.sounds.map(x => ({ ...x, done: !!heardBefore.get(x.n) || (!!(old.get(x.n) || {}).began && x.t <= t) })) };
    this.cap.follow(p.ws);
    this.pausedAt = Math.min(t, p.dur);
    this.readFrom(this.pausedAt);
  }

  // The reading clock: seconds into the line, counted from now.
  readFrom(t) { this.readT0 = performance.now() - t * 1000; }

  // The clip's clock, smoothed: a phone reports where the sound has got to in small steps, so between them
  // the clock runs on by the frame's own time and is eased back onto the sound's, never backward. Anything a
  // stretch drives (a storm along its track) then moves evenly instead of in little jumps.
  clock(now) {
    const c = this.clip;
    if (c && (c.status === 'playing' || c.status === 'starting' || c.status === 'ended')) {
      c.watch(now);
      const raw = c.time, s = this.smooth;
      if (c.status !== 'playing' || !s || s.clip !== c) { this.smooth = { clip: c, t: raw, at: now }; return raw; }
      let t = s.t + Math.max(0, now - s.at) / 1000;
      t = Math.abs(raw - t) > 0.25 ? raw : t + (raw - t) * 0.15;
      t = Math.max(s.t, t);
      this.smooth = { clip: c, t, at: now };
      return t;
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
      } else if (this.state === 'gap') {
        this.paintBar(this.where(now));
        if (now >= this.gapUntil) this.skip(true);
      }
      if (this.state === 'playing' || this.state === 'gap') this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  // The line has been said: everything on it lands, its caption stays lit, and a short gap follows.
  lineSaid() {
    if (this.state !== 'playing') return;
    this.advance(this.cur.dur + 0.001);
    this.stopClip();
    this.cap.finish();
    this.gapUntil = performance.now() + this.gapLen(this.i) * 1000;
    this.set('gap');
    this.loop();
  }

  // Inside a tap: every clip from line j on gets a fresh player now, started and stopped at once, so it
  // can start by itself when the scene reaches it.
  prime(j) {
    this.sfx.prime(this.soundsFrom(j));
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

  // Every sound effect still to come from line j on, in order: what a tap primes players for.
  soundsFrom(j) {
    const out = [];
    for (let k = j; k < this.lines.length; k++) {
      for (const a of this.lines[k].do || []) {
        const so = this.soundOf(a);
        if (so) out.push(so.name);
      }
    }
    return out;
  }

  // From the first picture: by itself when it opens (tap false), or from a tap on play.
  start(tap) {
    if (this.state !== 'ready' || this.busy) return;
    if (tap) this.tapped = true;
    const want = this.wantSound();
    if (want !== this.sound) { this.sound = want; this.replan(this.pausedAt); this.setVoiceButton(); this.setCaptions(); }
    this.prime(this.i);
    this.go();
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'gap') return;
    const now = performance.now();
    this.pausedFrom = this.state;
    this.pausedAt = this.state === 'playing' ? Math.min(Math.max(0, this.clock(now)), this.cur.dur) : this.cur.dur;
    this.gapLeft = this.state === 'gap' ? Math.max(0, (this.gapUntil - now) / 1000) : 0;
    if (this.clip) this.clip.pause();
    this.sfx.stop();
    this.set('paused');
  }

  // Every play gets a new player: a paused clip carries on from where it was on a fresh <audio>.
  resume() {
    if (this.state !== 'paused') return;
    this.tapped = true;
    this.stopClip();
    this.prime(this.pausedFrom === 'gap' ? this.i + 1 : this.i);
    this.go();
  }

  toggle() {
    if (this.state === 'ready') return this.start(true);
    if (this.state === 'playing' || this.state === 'gap') return this.pause();
    if (this.state === 'paused') return this.resume();
    return null;
  }

  // Back: the line again from its start, or the one before when this one has only just begun.
  back() {
    if (this.busy || this.state === 'loading') return null;
    const playing = this.state !== 'paused';
    const t = this.state === 'playing' ? this.clock(performance.now()) : this.state === 'gap' || this.state === 'ended' ? Infinity : this.pausedAt;
    let k = this.state === 'ended' ? this.lines.length - 1 : this.i;
    if (this.state !== 'ended' && t < BACK_TO_PREVIOUS && this.i > 0) k = this.i - 1;
    return this.seekTo(this.starts[k], playing);
  }

  // Skip: whatever is left of this line lands at once, and the next begins (or the end). From the gap
  // between lines (auto), the next line simply starts.
  skip(auto = false) {
    if (this.busy || this.state === 'ended' || this.state === 'loading') return;
    const play = auto || this.state !== 'paused';
    if (!auto && play) this.tapped = true;
    this.stopClip();
    for (const x of this.cur.actions) if (!x.done) { x.done = true; x.began = true; this.run(x.a, x.span ? x.p(1) : 1, true); }
    this.land();
    if (this.i + 1 >= this.lines.length) { this.end(); return; }
    if (!auto && play) this.prime(this.i + 1);
    this.place(this.i + 1, 0);
    if (play) this.go(); else this.set('paused');
  }

  // To moment T of the timeline: the picture rebuilt as it was then, and on from there, playing or not.
  // The clips are primed first, while the tap still counts.
  async seekTo(T, play) {
    if (this.busy || this.state === 'loading') return;
    T = Math.max(0, Math.min(this.total, T));
    let j = 0;
    while (j + 1 < this.lines.length && this.starts[j + 1] <= T + 1e-6) j++;
    if (play) { this.tapped = true; this.prime(j); }
    this.busy = true;
    this.stopClip();
    if (this.state === 'playing' || this.state === 'gap') this.pause();
    try {
      await this.build(j);
    } finally {
      this.busy = false;
    }
    if (this.gone) return;
    const dur = this.plans[j].dur;
    if (T >= this.total - 0.02) {
      this.place(j, dur);
      this.end();
      return;
    }
    const t = T - this.starts[j];
    this.place(j, Math.min(t, dur));
    if (t > dur) {
      this.cap.finish();
      this.pausedFrom = 'gap';
      this.gapLeft = Math.max(0, this.gapLen(j) - (t - dur));
    }
    this.endEl.hidden = true;
    if (play) this.go(); else this.set('paused');
    this.paintBar(T);
  }

  // The speaker: Voice on or off from here, carrying on from the same moment. After no sound played, it
  // tries the voice again.
  toggleVoice() {
    const on = !(this.opts.voice && this.opts.voice()) || !!this.failed;
    if (this.opts.setVoice) this.opts.setVoice(on);
    this.failed = null;
    this.hideNote();
    const playing = this.state === 'playing';
    const t = playing ? this.clock(performance.now()) : this.pausedAt;
    if (playing) this.pause();
    this.stopClip();
    this.sound = on;
    this.replan(t);
    this.setVoiceButton();
    this.setCaptions();
    if (playing) { this.tapped = true; this.prime(this.i); this.go(); }
    else this.paintBar(this.where());
  }

  // Captions on or off: remembered. With no sound, they are always on.
  capsOn() { return !this.sound || !this.opts.captions || this.opts.captions() !== false; }
  toggleCaptions() {
    if (!this.sound) return;
    if (this.opts.setCaptions) this.opts.setCaptions(!this.capsOn());
    this.setCaptions();
  }

  end() {
    this.stopClip();
    if (this.cur) for (const x of this.cur.actions) if (!x.done) { x.done = true; x.began = true; this.run(x.a, x.span ? x.p(1) : 1, true); }
    this.land();
    this.cap.finish();
    this.pausedFrom = 'playing';
    this.pausedAt = this.cur ? this.cur.dur : 0;
    this.seenEnd = true;
    this.set('ended');
    this.paintBar(this.total);
    this.endEl.hidden = false;
    this.showUi();
    if (this.host.ended) this.host.ended();
  }

  // ---- touches

  tap(e) {
    if (this.state === 'loading') return null;
    const b = e.target.closest('[data-sc]');
    if (b) {
      this.fadeLater();
      const what = b.dataset.sc;
      if (what === 'play') return this.toggle();
      if (what === 'back') return this.back();
      if (what === 'skip') return this.skip();
      if (what === 'voice') return this.toggleVoice();
      if (what === 'captions') return this.toggleCaptions();
      if (what === 'again') return this.seekTo(0, true);
      if (what === 'next') return this.host.next && this.host.next();
      if (what === 'close') return this.host.close && this.host.close();
      return null;
    }
    if (e.target.closest('.sbar, .send')) return null;
    // the picture: the controls come up, or go
    if (this.state === 'ready') return this.start(true);
    if (this.ui) this.hideUi(); else this.showUi();
    return null;
  }

  // The bar: pressed, it pauses and follows the finger; let go, the picture is rebuilt at that moment and it
  // plays on if it was playing (or from the end, or before it had started).
  barDown(e) {
    if (this.busy || this.state === 'loading' || this.drag) return;
    e.preventDefault();
    e.stopPropagation();
    const play = this.state !== 'paused';
    this.pause();
    this.showUi();
    const track = this.root.querySelector('.strack');
    const at = ev => {
      const r = track.getBoundingClientRect();
      let k = Math.max(0, Math.min(1, (ev.clientX - r.left) / Math.max(1, r.width)));
      // within a few pixels of either end is that end: a finger can't hit its last pixel
      if (k * r.width >= r.width - 4) k = 1; else if (k * r.width <= 4) k = 0;
      this.drag.T = k * this.total;
      this.paintBar(this.drag.T);
    };
    this.drag = { play, T: this.where(), id: e.pointerId };
    this.root.classList.add('dragging');
    at(e);
    const move = ev => { if (ev.pointerId === this.drag.id) at(ev); };
    const up = ev => {
      if (!this.drag || ev.pointerId !== this.drag.id) return;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      const { T } = this.drag;
      this.drag = null;
      this.root.classList.remove('dragging');
      this.seekTo(T, play).then(() => this.fadeLater());
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  showUi() {
    this.ui = true;
    this.root.classList.add('ui');
    this.fadeLater();
  }

  hideUi() {
    if (this.state === 'ready' || this.state === 'ended' || this.drag) return;
    this.ui = false;
    this.root.classList.remove('ui');
    clearTimeout(this.fadeT);
    this.fadeT = 0;
  }

  // While it plays, the controls fade after a few seconds without a touch; paused, they stay.
  fadeLater() {
    clearTimeout(this.fadeT);
    this.fadeT = 0;
    if (this.ui && (this.state === 'playing' || this.state === 'gap') && !this.drag) this.fadeT = setTimeout(() => { this.fadeT = 0; this.hideUi(); }, UI_FADE_MS);
  }

  // ---- bits

  set(state) {
    this.state = state;
    this.root.dataset.state = state;
    const going = state === 'playing' || state === 'gap';
    const b = this.root.querySelector('[data-sc=play]');
    b.innerHTML = going ? sceneIcon.pause(34) : sceneIcon.play(34);
    b.setAttribute('aria-label', going ? 'Pause' : 'Play');
    // playing on from one line to the next isn't a touch: the controls' fade is only restarted by one
    if (!going) { clearTimeout(this.fadeT); this.fadeT = 0; } else if (!this.fadeT) this.fadeLater();
  }

  setVoiceButton() {
    const on = this.wantSound();
    const b = this.root.querySelector('[data-sc=voice]');
    b.innerHTML = on ? sceneIcon.voice(22) : sceneIcon.quiet(22);
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('off', !on);
  }

  setCaptions() {
    const on = this.capsOn();
    this.root.classList.toggle('nocap', !on);
    const b = this.root.querySelector('[data-sc=captions]');
    b.innerHTML = on ? sceneIcon.captions(22) : sceneIcon.nocaptions(22);
    b.setAttribute('aria-pressed', String(on));
    b.hidden = !this.sound;   // with no voice, captions are all there is: always on
  }

  showNote(which) {
    this.note.textContent = NOTES[which];
    this.note.dataset.note = which;
    this.note.hidden = false;
    clearTimeout(this.noteT);
    this.noteT = setTimeout(() => this.hideNote(), 6000);
  }
  hideNote() { this.note.hidden = true; this.note.dataset.note = ''; }

  stopClip() {
    if (this.clip) { this.clip.listeners.clear(); this.clip.stop(); }
    this.clip = null;
  }

  // For the tests and the film: where it is.
  debug() {
    return { state: this.state, line: this.i, id: this.lines[this.i] && this.lines[this.i].id, sound: this.sound, failed: this.failed,
      t: this.state === 'playing' ? this.clock(performance.now()) : null, at: this.where(), total: this.total, starts: this.starts,
      voiced: this.cur ? this.cur.voiced : false, ui: !!this.ui, captions: this.capsOn(), lit: this.cap.state(), tapped: this.tapped,
      clip: this.clip ? { status: this.clip.status, time: this.clip.time, started: this.clip.started, why: this.clip.why } : null,
      fired: this.fired.slice(), narrators: (this.urls || []).map(c => (c ? c.narrator : null)),
      shots: this.shots ? this.shots.state() : null, effects: this.sfx.heard.slice() };
  }

  // For `primer fit`: line j's caption on screen, still.
  still(j) {
    this.stopClip();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.place(j, 0);
    this.set('paused');
    this.hideUi();
  }

  // For `primer fit`: how many lines the caption on screen takes, and how far past CAPTION_LINES it goes.
  measure() {
    const el = this.root.querySelector('.sline');
    const cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight) || 24;
    const inner = el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const lines = Math.max(1, Math.round(inner / lh));
    return { line: this.lines[this.i] && this.lines[this.i].id, lines, over: Math.max(0, Math.round(inner - lh * CAPTION_LINES)), stage: Math.round(this.stage.getBoundingClientRect().height) };
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
    clearTimeout(this.fadeT);
    clearTimeout(this.noteT);
    this.stopClip();
    for (const c of this.clips) if (c) c.stop();
    this.clips = [];
    this.sfx.remove();
    if (this.shots) this.shots.remove();
    this.dropParts();
    document.removeEventListener('visibilitychange', this.onHide);
    if (this.root) {
      this.root.removeEventListener('click', this.onTap);
      this.bar.removeEventListener('pointerdown', this.onBar);
    }
  }
}

// A stretch's share of the way, from how far through its words it is (q, 0 to 1): eased (`ease`: soft, the
// default, easing in and out; linear; in; out) and mapped onto `range` ([from, to], 0 to 1 unless given), so
// a storm can be carried from 0.45 to 0.72 of its track across one line and on from there across the next.
export function stretch(a) {
  const ease = EASES[a.ease] || EASES.soft;
  const [p0, p1] = Array.isArray(a.range) && a.range.length === 2 ? a.range.map(Number) : [0, 1];
  return q => p0 + (p1 - p0) * ease(Math.max(0, Math.min(1, q)));
}
const stretchEnd = a => (a.from !== undefined || a.to !== undefined ? stretch(a)(1) : 1);
