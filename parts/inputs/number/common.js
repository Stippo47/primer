// What the Number form's looks share: how many digits a number needs, where a look that always holds a
// value starts, and how the truth is shown in its field once it's checked. Each look is one file beside
// this one, a mount(f) -> { reveal, mark, reset } like any form; forms/number.js picks one by `look`.
import { esc, fmt } from '../kit.js';
import { time } from '../clock.js';

export const decimals = step => { const s = String(step); return s.includes('.') ? Math.min(4, s.split('.')[1].length) : 0; };
export const range = S => [Math.min(S.min, S.max), Math.max(S.min, S.max)];

// The places a number needs: whole digits for the biggest it can be, decimals from its step, and a sign
// when it can go below 0.
export function placesOf(S) {
  const [lo, hi] = range(S);
  const whole = Math.max(1, String(Math.floor(Math.max(Math.abs(lo), Math.abs(hi)))).length);
  return { whole, dec: decimals(S.step), neg: lo < 0 };
}

// A value held to the range, and rounded to the step's decimals.
export const tidy = (S, v) => { const [lo, hi] = range(S); return Number(Math.min(hi, Math.max(lo, v)).toFixed(decimals(S.step))); };

// Where a look that always holds a value starts: `start`, else 0 if the range holds it, else its low end.
export function startOf(S) {
  const [lo, hi] = range(S);
  if (typeof S.start === 'number' && Number.isFinite(S.start)) return tidy(S, S.start);
  return tidy(S, lo <= 0 && hi >= 0 ? 0 : lo);
}

export const show = (S, v) => fmt(v, S.step, S.unit);

// The truth, shown in the answer's own field, the way the other forms show it on their own scale: each look
// puts the true number where the given one was, in gold (keys type it, wheels roll to it, the tape glides
// to it, the beads move), and what was given stays on a small tag at the field's top corner, struck
// through and coloured by its mark. Only when they differ: a number given exactly right is left as it is.
export const differs = (S, given, answer) => given === null || given === undefined || Math.abs(tidy(S, given) - tidy(S, answer)) > 1e-9;
// The tag with what was given (nothing given: none), over the top right of `field`.
export function givenTag(root, field, S, given, feel) {
  clearGiven(root);
  if (given === null || given === undefined) return null;
  const tag = document.createElement('span');
  tag.className = 'pi-was';
  tag.innerHTML = `<s>${esc(show(S, given))}</s>`;
  tag.style.top = `${field.offsetTop - 15}px`;
  tag.style.right = `${Math.max(6, root.clientWidth - field.offsetLeft - field.offsetWidth + 14)}px`;
  root.append(tag);
  if (feel && feel.pop) feel.pop(tag);
  return tag;
}
export const markGiven = (root, kind) => { const t = root.querySelector('.pi-was'); if (t) t.classList.add(kind); };
export const clearGiven = root => { for (const t of root.querySelectorAll('.pi-was')) t.remove(); };
// A number as its digits, held to the range and the step's decimals, for writing in a field.
export const digitsText = (S, v) => tidy(S, v).toFixed(decimals(S.step));

// Motion a look sets going itself (a drum settling, the tape gliding to the truth, beads moving one by
// one), on the inputs' one clock, so a film or a test that holds the clock holds it too. With reduced
// motion asked for, it's there at once.
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// draw(v) for v running from `from` to `to` over `ms` milliseconds, eased by ease(k); then done(). Returns
// a function that stops it where it is.
export function tween(from, to, ms, ease, draw, done) {
  let raf = 0;
  const t0 = time();
  const frame = () => {
    const k = still() || ms <= 0 ? 1 : Math.min(1, Math.max(0, ((time() - t0) * 1000) / ms));
    draw(from + (to - from) * ease(k));
    if (k < 1) raf = requestAnimationFrame(frame); else { raf = 0; if (done) done(); }
  };
  frame();
  return () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
}
// each(i) for i from 0 to n - 1, the first at once and then one every `gap` milliseconds; then done().
// Returns a function that stops it.
export function oneByOne(n, gap, each, done) {
  let raf = 0, i = 0;
  const t0 = time();
  const frame = () => {
    const due = still() ? n : Math.min(n, 1 + Math.floor(((time() - t0) * 1000) / gap));
    while (i < due) each(i++);
    if (i < n) raf = requestAnimationFrame(frame); else { raf = 0; if (done) done(); }
  };
  frame();
  return () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
}

export const css = `
.pi.form-number { padding-top: 4px; }
.pi.form-number { position: relative; }
/* what was given, once the truth is in the field: a small tag on the field's top corner, struck through */
.pi-was { position: absolute; z-index: 3; padding: 3px 10px; border-radius: 11px; background: #fff; color: #1b1f5e; box-shadow: 0 3px 0 #b9c2ee;
  font-size: 15px; white-space: nowrap; pointer-events: none; }
.pi-was s { text-decoration-thickness: 2px; }
.pi-was.wrong { background: #ee4b7a; color: #fff; box-shadow: 0 3px 0 #8f1f44; }
.pi-was.close { background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; }
.pi-was.right { background: #2bc4a4; color: #fff; box-shadow: 0 3px 0 #127a85; }
/* the number as it's read out, its unit beside it in the same weight and colour, one phrase: "119 km/h" */
.pi-nread { display: flex; align-items: baseline; justify-content: center; gap: 8px; height: 50px; margin-bottom: 10px; color: #fff; }
.pi-nread b { font-size: 40px; font-weight: 900; line-height: 1; }
.pi-nread .u { font-size: 30px; font-weight: 900; line-height: 1; white-space: nowrap; }
.pi-nread.right { color: #7df0cf; }
.pi-nread.close { color: #ffc83d; }
.pi-nread.wrong { color: #ff8fb0; }
.pi-nread.truth, .pi-nread.truth.wrong, .pi-nread.truth.close { color: #ffc83d; }
`;
