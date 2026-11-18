// Voice clips for narrated scenes. One clip per line, each a plain <audio> made fresh, and the clip's own
// clock is the scene's clock: the picture follows wherever the sound has got to, so it can't drift, and an
// action hung on a word stays on the word however late the sound starts.
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
export const STILL_MS = 2500;
const QUICK_END = 0.05; // an "ended" this early, with no length, is the phone's stale-player fault

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
