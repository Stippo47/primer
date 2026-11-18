// What the Number form's looks share: how many digits a number needs, where a look that always holds a
// value starts, and the truth shown under it once it's checked. Each look is one file beside this one, a
// mount(f) -> { reveal, mark, reset } like any form; forms/number.js picks one by the `look` setting.
import { esc, fmt } from '../kit.js';

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

// The truth, as a gold chip on a line of its own under the answer.
export function truthLine(root, S, answer, feel) {
  let line = root.querySelector('.pi-truthline');
  if (!line) { line = document.createElement('div'); line.className = 'pi-truthline'; root.append(line); }
  line.hidden = false;
  line.innerHTML = `<span class="pi-read truth">${esc(show(S, answer))}</span>`;
  if (feel && feel.pop) feel.pop(line.firstElementChild);
}
export const clearTruth = root => { const l = root.querySelector('.pi-truthline'); if (l) { l.hidden = true; l.innerHTML = ''; } };

export const css = `
.pi.form-number { padding-top: 4px; }
.pi-truthline { display: flex; justify-content: center; margin-top: 12px; min-height: 38px; }
.pi-nread { display: flex; align-items: baseline; justify-content: center; gap: 6px; height: 50px; margin-bottom: 10px; }
.pi-nread b { font-size: 40px; font-weight: 900; line-height: 1; }
.pi-nread .u { font-size: 19px; color: #7f88c8; }
.pi-nread.right b { color: #7df0cf; }
.pi-nread.close b { color: #ffc83d; }
.pi-nread.wrong b { color: #ff8fb0; }
`;
