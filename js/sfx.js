// Sound effects for scenes: a few short, soft sounds that go with what the picture does (a whoosh on a cut,
// a swell as a storm grows, a breath of wind as air rushes in). They're quiet beside the voice (made about
// 14 dB under it) and rounded: nothing sharp, nothing 8-bit (ruled 2026-11-16).
//
// They were made here, by tools/make-sounds.py, from nothing but noise and sine waves (no recordings, no
// one else's sounds), so they're the app's own to use. Each is a small AAC file in sounds/, kept on the
// phone with the app.
//
// They follow the rules the voice does (docs/DECISIONS.md, the phone test), because they play the same way:
// as plain <audio>, which sounds with the silent switch on and never claims the phone's sound, so it can't
// stop the person's music. Every play gets a new player. An iPhone starts sound only from a tap, so a scene
// primes a player for every effect still to come in the tap that starts or resumes it (prime), and plays
// those later. They sound only with Effects on (Profile), and a sound that won't play is simply not heard:
// nothing waits for one.
import { getPrefs } from './feel.js';

export const SOUNDS = {
  whoosh: 'A soft rush of air, rising and falling: a push or a zoom to another picture.',
  cut: 'A short soft puff: a cut.',
  swell: 'A warm rising swell: something growing, a storm strengthening.',
  pop: 'A small round bubble: a point or a name arriving.',
  chime: 'Two soft mallet notes: a term worth remembering.',
  wind: 'A breath of wind that builds and dies away: air rushing in, winds blowing.',
  fizz: 'Tiny rising bubbles: water evaporating.',
  rumble: 'A soft, far-off rumble: a storm cloud.',
};
export const SOUND_NAMES = Object.keys(SOUNDS);
const BASE = new URL('../sounds/', import.meta.url);
export const soundUrl = name => new URL(`${name}.m4a`, BASE).href;

export class Effects {
  // on(): whether effects may sound (Effects in Profile, unless told otherwise).
  constructor({ on = () => !!getPrefs().effects } = {}) {
    this.on = on;
    this.primed = new Map();   // name -> players made ready in a tap, oldest first
    this.playing = new Set();
    this.heard = [];           // every effect asked for, for the tests: { name, at, played }
  }

  // Inside a tap: a player for each sound named (names may repeat), started and stopped at once, so each can
  // start later without a tap of its own.
  prime(names) {
    if (!this.on()) return;
    for (const list of this.primed.values()) for (const el of list) drop(el);
    this.primed.clear();
    for (const name of names) {
      if (!SOUNDS[name]) continue;
      const el = make(name);
      try { const p = el.play(); if (p && p.catch) p.catch(() => {}); el.pause(); el.currentTime = 0; } catch { /* it will try again when played */ }
      if (!this.primed.has(name)) this.primed.set(name, []);
      this.primed.get(name).push(el);
    }
  }

  // Plays one, on a primed player if there is one, else a new one (which a phone may refuse: then it's not heard).
  play(name) {
    const want = !!SOUNDS[name] && this.on();
    this.heard.push({ name, at: performance.now(), played: want });
    if (!want) return false;
    const list = this.primed.get(name);
    const el = (list && list.shift()) || make(name);
    this.playing.add(el);
    const done = () => { this.playing.delete(el); drop(el); };
    el.addEventListener('ended', done, { once: true });
    el.addEventListener('error', done, { once: true });
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && p.catch) p.catch(done);
    } catch { done(); return false; }
    return true;
  }

  // Pausing a scene silences what's sounding; nothing picks up again on resume (they're short).
  stop() {
    for (const el of this.playing) drop(el);
    this.playing.clear();
  }

  remove() {
    this.stop();
    for (const list of this.primed.values()) for (const el of list) drop(el);
    this.primed.clear();
  }
}

function make(name) {
  const el = document.createElement('audio');
  el.preload = 'auto';
  el.src = soundUrl(name);
  return el;
}
function drop(el) {
  try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* never started */ }
}
