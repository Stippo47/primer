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
// those later. They have their own switch in Profile, Animation sounds, on unless turned off (ruled
// 2026-11-19; Effects is the press sounds only, and stays off), and a sound that won't play is simply not
// heard: nothing waits for one.
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

// Each kind of sound: the file that plays it, where in that file its loudest moment is (seconds, measured),
// and how it lines up with the picture (the second study's measures, docs/research/kurzgesagt-study-2.md, 2.5):
//   align 'peak'   its loudest moment lands `lead` seconds before the picture's keyframe: a tick 40 ms ahead,
//                  a whoosh (lead 0) peaking with the move's fastest moment
//   align 'start'  it starts `lead` seconds before the keyframe and swells in: a process starting (rising
//                  air, wind, a storm growing) begins about 350 ms before the picture
// A scene asks for a kind by name on an action; the picture's keyframe is the action's moment plus its call's
// `beat` (in its part's description: a sign's board pops half a second after the call, a lens's circle
// arrives at 0.97 s). To use another recording for a kind, change its file here (and its peak), nothing else.
export const KINDS = {
  whoosh: { file: 'whoosh', peak: 0.415, align: 'peak', lead: 0 },
  cut: { file: 'cut', peak: 0.015, align: 'peak', lead: 0.04 },
  swell: { file: 'swell', peak: 1.89, align: 'start', lead: 0.35 },
  pop: { file: 'pop', peak: 0.015, align: 'peak', lead: 0.04 },
  chime: { file: 'chime', peak: 0.13, align: 'peak', lead: 0.04 },
  wind: { file: 'wind', peak: 1.27, align: 'start', lead: 0.35 },
  fizz: { file: 'fizz', peak: 0.775, align: 'start', lead: 0.2 },
  rumble: { file: 'rumble', peak: 1.325, align: 'start', lead: 0.3 },
};
// When a sound of this kind should start, for a keyframe at `key` seconds.
export const soundStart = (name, key) => { const K = KINDS[name]; return K ? key - (K.align === 'peak' ? K.peak : 0) - K.lead : key; };
const BASE = new URL('../sounds/', import.meta.url);
export const soundUrl = name => new URL(`${(KINDS[name] && KINDS[name].file) || name}.m4a`, BASE).href;

export class Effects {
  // on(): whether they may sound (Animation sounds in Profile, unless told otherwise).
  constructor({ on = () => getPrefs().animSounds !== false } = {}) {
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
