// One clock for everything in the answer forms that moves on its own: the pictures (clouds racing, a flame
// flickering, frost glinting) and the slider's looks (the sea's waves). One frame loop however many are on
// screen, at a calm 30 frames a second; it stops when nothing is left to move, and the browser pauses it
// while the app is hidden. A thing on the clock is drawn as a function of time (seconds), so it never
// drifts or piles up work: `onFrame(el, draw)` calls draw(t) each frame while `el` is on the page.
//
// With reduced motion asked for in the phone's settings, time stands still. Tests and films can hold it
// (`hold`) or set it (`pin`), and read how many frames it has drawn (`clockInfo`).

const live = new Set();
const T0 = performance.now();
const STEP = 1000 / 30 - 2;          // a frame at most every ~31 ms: 30 a second on a 60 Hz screen
let raf = 0, last = -1e9, frames = 0, held = null, pinned = null;

const askedStill = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = () => !!askedStill && askedStill.matches;
// The time now, in seconds, for what moves on its own (still, with reduced motion asked for).
export const now = () => (pinned !== null ? pinned : held !== null ? held : reduced() ? 0 : (performance.now() - T0) / 1000);
// The time now, in seconds, for motion a finger set going (a tape gliding to rest): the same clock, held
// and pinned with everything else, but it runs whatever the setting, or a flick would never come to rest.
export const time = () => (pinned !== null ? pinned : held !== null ? held : (performance.now() - T0) / 1000);

function loop(ts) {
  raf = 0;
  if (!live.size) return;
  if (held === null && pinned === null && !reduced() && ts - last >= STEP) {
    last = ts;
    drawAll();
  }
  raf = requestAnimationFrame(loop);
}

function drawAll() {
  const t = now();
  for (const e of live) {
    // a thing that was on the page and has left it is dropped; one not yet placed is given a few seconds
    if (!e.el.isConnected) {
      if (e.seen || performance.now() - e.born > 10000) live.delete(e);
      continue;
    }
    e.seen = true;
    try { e.draw(t); } catch (err) { live.delete(e); console.warn('inputs clock:', err); }
  }
  frames++;
}

// Draws `draw(t)` now and on every frame while `el` is on the page. Returns a function that stops it.
export function onFrame(el, draw) {
  const e = { el, draw, seen: false, born: performance.now() };
  live.add(e);
  try { draw(now()); } catch { /* drawn on the next frame */ }
  if (!raf) raf = requestAnimationFrame(loop);
  return () => live.delete(e);
}

// For tests and films: hold time still (true) or let it run again (false).
export function hold(yes = true) { held = yes ? now() : null; }
// For films: set the time to t seconds and draw everything at it at once; null lets it run again.
export function pin(t) { pinned = typeof t === 'number' ? t : null; if (pinned !== null) drawAll(); }
export const clockInfo = () => ({ running: !!raf, moving: live.size, frames, held: held !== null, pinned, reduced: reduced() });
