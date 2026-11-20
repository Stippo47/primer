// The feel of every press, in one place: a soft sound, a tick under the thumb and a little spring.
//
// Sound. A press, the combo's crack and its shatter are recordings the designer picked by ear from the sound
// library (2026-11-19, sounds/library/SOURCES.md): RECORDED below, each kind a list of files, one played at
// random each time and never the same one twice running. The answers' and the end's notes are made on the
// spot with Web Audio: rounded sine notes, like a soft mallet on wood, through a gentle low-pass. Nothing
// square or buzzy, nothing 8-bit, nothing loud. All of them follow Effects, which starts off.
// The app never claims the phone's sound for itself: it leaves navigator.audioSession alone. Saying its
// sound was media ('playback') stopped the person's own music the moment Primer opened. The cost: a
// generated tone follows the silent switch. Voice clips (stage 2) are plain <audio>, which the phone test
// heard on silent without any claim.
//
// Tick. iPhones let a web page tick only through a switch control flipping, so a hidden one is flipped
// (Riffle's trick, felt on the phone test). Android vibrates. Nothing may depend on it being felt.
//
// Spring. The approved bounce (stage 0, "halfway between gentle and medium"): MOTION below, from
// stage0/scene/looks/mix.json. Springs run as Web Animations on transforms only, so they stay smooth.
import { spring as springAt, back } from './ease.js';

export const MOTION = { bounce: 0.425, overshoot: 0.675, pop: 1.175, squash: 0.13 };

// animSounds: an animation's own sound effects (js/sfx.js), on unless turned off; effects: the press sounds only.
const prefs = { voice: true, effects: false, music: false, animSounds: true };
export const setPrefs = p => Object.assign(prefs, p);
export const getPrefs = () => ({ ...prefs });

// ---------- sound

let ctx = null, out = null;
const played = [];  // for the tests: what was asked to sound, newest last
export const soundLog = () => played.slice();

function engine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    if (!ctx || ctx.state === 'closed') {
      ctx = new AC();
      out = chain(ctx);
    }
    // Suspended at first, and "interrupted" after a call or coming back to the app: a press wakes it.
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {
    return null;
  }
  return ctx;
}

// Every sound goes out through the same gentle low-pass, at half level.
function chain(c) {
  const soft = c.createBiquadFilter();
  soft.type = 'lowpass';
  soft.frequency.value = 2400;
  soft.Q.value = 0.4;
  const g = c.createGain();
  g.gain.value = 0.5;
  g.connect(soft).connect(c.destination);
  return g;
}

// One soft mallet note: a sine with a quick swell and a slow fade, and a faint high partial that fades
// faster, which is what makes it sound struck rather than beeped.
function note(c, at, freq, { level = 0.2, decay = 0.35, partial = 0.06 } = {}, dest = out) {
  for (const [ratio, amount, fade] of [[1, level, decay], [3.9, level * partial, decay * 0.35]]) {
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(amount, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + fade);
    osc.connect(env).connect(dest);
    osc.start(at);
    osc.stop(at + fade + 0.05);
  }
}

// A breath of noise through a band: the grit of something cracking. Seeded, so it sounds the same each time.
function grit(c, at, freq, { level = 0.12, decay = 0.08, q = 1.2 } = {}, dest = out) {
  const len = Math.ceil(c.sampleRate * (decay + 0.05)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let x = 12345;
  for (let i = 0; i < len; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = x / 0x3fffffff - 1; }
  const src = c.createBufferSource(), band = c.createBiquadFilter(), env = c.createGain();
  src.buffer = buf;
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = q;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(level, at + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(band).connect(env).connect(dest);
  src.start(at);
  src.stop(at + decay + 0.05);
}

// Each sound is a few notes: [delay in seconds, frequency, options], or [delay, 'grit', centre, options].
const SOUNDS = {
  right: [[0, 587.33, { level: 0.2, decay: 0.7 }], [0.11, 880, { level: 0.17, decay: 0.95 }]],
  close: [[0, 587.33, { level: 0.16, decay: 0.55 }], [0.11, 739.99, { level: 0.13, decay: 0.7 }]],
  wrong: [[0, 349.23, { level: 0.16, decay: 0.42, partial: 0.03 }], [0.13, 293.66, { level: 0.14, decay: 0.6, partial: 0.03 }]],
  done: [[0, 523.25, { level: 0.15, decay: 0.8 }], [0.1, 659.25, { level: 0.14, decay: 0.85 }], [0.2, 783.99, { level: 0.14, decay: 0.95 }], [0.32, 1046.5, { level: 0.12, decay: 1.3 }]],
  pop: [[0, 659.25, { level: 0.1, decay: 0.18 }]],
};
// The recorded sounds, by kind: the files in sounds/ (CC0 recordings from the library, picked 2026-11-19).
// crack: a shield taking a miss, ice cracking (3, 4 and 5). shatter: losing the combo, a tile breaking (5).
// tap: every button press (tap, select, on and off all play it): a click (2), a switch (9), a softer switch
// (10). They're levelled in the file as the deck had them (the taps at -28 LUFS, the crack and the shatter
// at -25), so they skip the low-pass and the half level the made notes go through.
export const RECORDED = {
  crack: ['crack-3-ice', 'crack-4-ice-short', 'crack-5-ice-break'],
  shatter: ['shatter-5-tile'],
  tap: ['tap-2-click', 'tap-9-switch', 'tap-10-switch-soft'],
};
// The names a press can ask for that play a recorded kind instead of their own.
const PLAYS = { tap: 'tap', select: 'tap', on: 'tap', off: 'tap', crack: 'crack', shatter: 'shatter' };
const kindOf = name => PLAYS[name] || null;
export const SOUND_NAMES = [...Object.keys(SOUNDS), ...Object.keys(PLAYS)];
const decoded = new Map();   // file -> AudioBuffer, or the promise of one
const fileUrl = file => new URL(`../sounds/${file}.m4a`, import.meta.url).href;

// One of a kind's files at random, never the one it played last (unless it has only one).
const lastOf = {};
export function pickFile(kind, random = Math.random) {
  const files = RECORDED[kind];
  if (!files) return null;
  let k = Math.floor(random() * files.length);
  if (files.length > 1 && k === lastOf[kind]) k = (k + 1 + Math.floor(random() * (files.length - 1))) % files.length;
  lastOf[kind] = k;
  return files[k];
}

function decode(c, file) {
  if (!decoded.has(file)) {
    const p = fetch(fileUrl(file)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then(b => new Promise((ok, no) => c.decodeAudioData(b, ok, no)))   // the callback form, for older Safari
      .then(buf => { decoded.set(file, buf); return buf; }, () => { decoded.delete(file); return null; });
    decoded.set(file, p);
  }
  return decoded.get(file);
}
// Ready the recordings ahead (a review starting, a finger coming down), so the first sounds on time. Only
// with Effects on.
export function preload(names = Object.keys(RECORDED)) {
  if (!prefs.effects) return;
  const c = engine();
  if (c) for (const n of names) for (const file of RECORDED[kindOf(n) || n] || []) decode(c, file);
}
function playSample(c, buf, at, dest) {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  src.start(at);
}

export function sound(name) {
  played.push(name);
  if (played.length > 50) played.shift();
  const kind = kindOf(name);
  if (!prefs.effects || !(SOUNDS[name] || kind)) return false;
  const c = engine();
  if (!c) return false;
  if (kind) {
    // ready: at once. Not yet: when it is, unless that's too late to go with what it's for.
    const got = decode(c, pickFile(kind)), asked = performance.now();
    if (got instanceof AudioBuffer) playSample(c, got, c.currentTime + 0.005, c.destination);
    else got.then(buf => { if (buf && performance.now() - asked < 250) playSample(c, buf, c.currentTime + 0.005, c.destination); });
    return true;
  }
  play(c, out, c.currentTime + 0.01, name);
  return true;
}

function play(c, dest, t0, name) {
  for (const [delay, freq, a, b] of SOUNDS[name]) {
    if (freq === 'grit') grit(c, t0 + delay, a, b, dest);
    else note(c, t0 + delay, freq, a, dest);
  }
}

// For films: a sound rendered to samples (mono, 48 kHz), the same as it plays, Effects on or not. A recorded
// kind renders its first file, or the one named (`file`).
export async function renderSound(name, seconds = 1.5, file = null) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const kind = kindOf(name);
  if (!OAC || !(SOUNDS[name] || kind)) return null;
  const c = new OAC(1, Math.ceil(48000 * seconds), 48000);
  if (kind) {
    const b = await fetch(fileUrl(file || RECORDED[kind][0])).then(r => r.arrayBuffer());
    playSample(c, await new Promise((ok, no) => c.decodeAudioData(b, ok, no)), 0.01, c.destination);
  } else play(c, chain(c), 0.01, name);
  const buf = await c.startRendering();
  return Array.from(buf.getChannelData(0));
}

// ---------- the tick

let hap = null;
let ticks = 0;
export const tickCount = () => ticks;
export function tick() {
  ticks++;
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* not allowed just now */ } return; }
  if (!hap) {
    hap = document.createElement('label');
    hap.className = 'hap';
    hap.setAttribute('aria-hidden', 'true');
    hap.innerHTML = '<input type="checkbox" switch tabindex="-1">';
    document.body.append(hap);
  }
  hap.click();
}

// ---------- springs

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keyframes for a spring from a to b, as transforms made by `make(v)`.
function frames(make, a, b, curve, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    out.push({ transform: make(a + (b - a) * curve(k)), offset: k });
  }
  return out;
}

// Springs an element's transform from `from` to `to` (numbers fed to make), with the approved bounce.
export function spring(el, make, from, to, { ms = 520, bounce = MOTION.bounce } = {}) {
  if (!el || !el.animate) return null;
  if (reduced()) { el.style.transform = make(to); return null; }
  return el.animate(frames(make, from, to, k => springAt(k, bounce)), { duration: ms * MOTION.pop, easing: 'linear' });
}

// A thing arriving: grows from small to full size, ringing a little.
export const pop = (el, from = 0.6) => spring(el, v => `scale(${v})`, from, 1, { ms: 480 });

// A gentle overshoot without ringing, for slides.
export function glide(el, make, from, to, ms = 420) {
  if (!el || !el.animate) return null;
  if (reduced()) return null;
  return el.animate(frames(make, from, to, k => back(k, MOTION.overshoot)), { duration: ms, easing: 'linear' });
}

// A small shake for "not yet": a tap on something that can't be done.
export function nudge(el) {
  if (!el || !el.animate || reduced()) return null;
  return el.animate([0, -6, 5, -3, 2, 0].map((x, i, a) => ({ transform: `translateX(${x}px)`, offset: i / (a.length - 1) })), { duration: 320 });
}

// ---------- every press

// The press itself: the sound named on the element (data-sound) or a soft tap, and the tick. A button shows
// the press by sinking in while it's held, as a real one would (the .down class: it moves down onto its
// side, and its side shrinks to nothing), then coming back up when let go. No bounce, no wobble, and no
// shadow under it (ruled 2026-11-18).
export function press(el, name) {
  sound(name || (el && el.dataset && el.dataset.sound) || 'tap');
  tick();
}

const PRESSABLE = 'button, [data-press]';
// A quick tap still shows the button going in and coming back: it stays in at least this long.
export const MIN_DOWN = 110;
let held = null, heldAt = 0;
function letGo() {
  const el = held;
  held = null;
  if (!el) return;
  const wait = MIN_DOWN - (performance.now() - heldAt);
  if (wait <= 0) { el.classList.remove('down'); return; }
  setTimeout(() => { if (held !== el) el.classList.remove('down'); }, wait);
}

// Wires every press in the app: one listener for all of them.
export function wire(root = document) {
  root.addEventListener('pointerdown', e => {
    const el = e.target.closest(PRESSABLE);
    if (!el || el.disabled || el.closest('.hap')) return;
    preload(['tap']);   // the press sounds, ready by the time the finger lifts
    letGo();
    held = el;
    heldAt = performance.now();
    el.classList.add('down');
  }, true);
  root.addEventListener('pointerup', letGo, true);
  root.addEventListener('pointercancel', letGo, true);
  root.addEventListener('click', e => {
    const el = e.target.closest(PRESSABLE);
    if (!el || el.closest('.hap') || el.dataset.sound === 'none') return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    press(el);
  }, true);
}
