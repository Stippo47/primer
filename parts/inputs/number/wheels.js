// Number, as wheels: one drum for each digit, like a combination lock or a counter. Roll a drum up or down
// with a finger, or tap the arrow above or below it; each digit that passes gives a tick. The digits
// either side of the one showing peep over the drum's edges, so it reads as a wheel. A sign switch sits in
// front when the number can go below 0, and a point before the decimals. It always holds a real number
// (`start`, else 0), as the slider does; a number past the range rolls back to its end. The drums' strips
// move by transform, on their own layers, at whole device pixels. Once checked and wrong, the drums roll
// to the true number and the ones that moved turn gold; what was given goes on a tag at the corner.
import { esc, devicePx } from '../kit.js';
import { placesOf, tidy, startOf, show, differs, givenTag, markGiven, clearGiven } from './common.js';

const DH = 52;   // one digit's height on a drum

export const css = `
.pi-wheels { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 12px 14px; border-radius: 22px; background: #1b2250;
  border: 3px solid #364090; box-shadow: 0 5px 0 #2f3678; }
.pi-wheels.right { border-color: #2bc4a4; box-shadow: 0 5px 0 #127a85; }
.pi-wheels.close { border-color: #ffc83d; box-shadow: 0 5px 0 #c98a00; }
.pi-wheels.wrong { border-color: #ee4b7a; box-shadow: 0 5px 0 #8f1f44; }
.pi-drum { display: flex; flex-direction: column; align-items: center; gap: 9px; width: var(--dw, 58px); }
.pi-roll { width: 100%; height: 30px; border-radius: 12px; background: #2a3274; box-shadow: 0 4px 0 #161c4a; color: #9aa3d6; display: flex; align-items: center; justify-content: center;
  transition: transform 120ms ease-out, box-shadow 120ms ease-out; }
.pi-roll.down { transform: translateY(4px); box-shadow: 0 0 0 #161c4a; transition-duration: 50ms; }
.pi-dwin { position: relative; width: 100%; height: ${DH * 2}px; border-radius: 14px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 0 #464f96; touch-action: none; }
.pi-dstrip { position: absolute; left: 0; right: 0; top: 0; will-change: transform; backface-visibility: hidden; }
.pi-dstrip.settle { transition: transform 220ms cubic-bezier(.3, 1.35, .5, 1); }
.pi-dstrip b { display: flex; align-items: center; justify-content: center; height: ${DH}px; font-size: calc(var(--dw, 58px) * 0.72); font-weight: 900; color: #1b1f5e; line-height: 1; }
.pi-dwin::before, .pi-dwin::after { content: ""; position: absolute; left: 0; right: 0; height: 36px; z-index: 1; pointer-events: none; }
.pi-dwin::before { top: 0; background: linear-gradient(#7d88cc, rgba(255, 255, 255, 0)); }
.pi-dwin::after { bottom: 0; background: linear-gradient(rgba(255, 255, 255, 0), #7d88cc); }
/* a drum the truth rolled: gold, its shading and its side gold too */
.pi-dwin.truth { background: #ffc83d; box-shadow: 0 4px 0 #8a5c00; transition: background 200ms; }
.pi-dwin.truth b { color: #2a1650; }
.pi-dwin.truth::before { background: linear-gradient(#d2930a, rgba(255, 200, 61, 0)); }
.pi-dwin.truth::after { background: linear-gradient(rgba(255, 200, 61, 0), #d2930a); }
.pi-wsign { width: 44px; height: 54px; border-radius: 14px; background: #2a3274; box-shadow: 0 4px 0 #161c4a; font-size: 30px; font-weight: 900; transition: transform 120ms ease-out, box-shadow 120ms; }
.pi-wsign.down { transform: translateY(4px); box-shadow: 0 0 0 #161c4a; transition-duration: 50ms; }
.pi-wdot { width: 10px; height: 10px; border-radius: 50%; background: #fff; align-self: center; margin-top: 34px; flex: none; }
.pi-wunit { align-self: center; font-size: 20px; color: #9aa3d6; margin-left: 2px; }
`;

const ARROW = d => `<svg width="18" height="11" viewBox="0 0 18 11" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const mod10 = x => ((x % 10) + 10) % 10;

export function mount(f) {
  const { root, S, feel } = f;
  const { whole, dec, neg } = placesOf(S);
  const n = whole + dec;
  const dw = Math.max(34, Math.min(58, Math.floor((340 - (neg ? 52 : 0) - (dec ? 18 : 0) - (S.unit ? 50 : 0)) / n) - 8));
  // a strip holds the digits three times over, so a drum can roll either way past 0 and 9
  const strip = Array.from({ length: 30 }, (_, i) => `<b>${i % 10}</b>`).join('');
  const drum = i => `<div class="pi-drum" data-i="${i}"><button class="pi-roll" data-d="1" data-sound="select" aria-label="Up one">${ARROW('M2 9l7-7 7 7')}</button>
      <div class="pi-dwin"><div class="pi-dstrip">${strip}</div></div>
      <button class="pi-roll" data-d="-1" data-sound="select" aria-label="Down one">${ARROW('M2 2l7 7 7-7')}</button></div>`;
  root.innerHTML = `<div class="pi-wheels" style="--dw:${dw}px">${neg ? '<button class="pi-wsign" data-sound="select" aria-label="Sign">+</button>' : ''}
      ${Array.from({ length: n }, (_, i) => (i === whole && dec ? '<span class="pi-wdot"></span>' : '') + drum(i)).join('')}
      ${S.unit ? `<span class="pi-wunit">${esc(S.unit)}</span>` : ''}</div>`;
  const wheels = root.querySelector('.pi-wheels'), signEl = root.querySelector('.pi-wsign');
  const strips = [...root.querySelectorAll('.pi-dstrip')], wins = [...root.querySelectorAll('.pi-dwin')];
  let digits = Array(n).fill(0), sign = 1;
  const at = Array(n).fill(10);   // where each strip is: the index of the digit in the window's middle
  const put = (i, j, settle = false) => {
    strips[i].classList.toggle('settle', settle);
    strips[i].style.transform = `translate3d(0,${devicePx(DH - (j + 0.5) * DH)}px,0)`;
    at[i] = j;
  };
  // once settled, a strip goes back to its middle set of digits: the same digit, so nothing seen moves
  strips.forEach((s, i) => s.addEventListener('transitionend', () => { if (at[i] !== 10 + digits[i]) put(i, 10 + digits[i]); }));
  const valueOf = () => sign * digits.reduce((s, d, i) => s + d * 10 ** (whole - 1 - i), 0);
  const toDigits = v => {
    sign = v < 0 ? -1 : 1;
    const a = Math.round(Math.abs(v) * 10 ** dec);
    digits = Array.from({ length: n }, (_, i) => Math.floor(a / 10 ** (n - 1 - i)) % 10);
    if (signEl) signEl.textContent = sign < 0 ? '−' : '+';
  };
  // the number given, held to its range: if it went past, the drums roll back to the end of the range
  const commit = (rollBack = true) => {
    const v = tidy(S, valueOf());
    if (rollBack && Math.abs(v - valueOf()) > 1e-9) { toDigits(v); digits.forEach((d, i) => put(i, 10 + d, true)); }
    if (v !== f.value()) f.set(v, true);
  };
  const begin = () => { toDigits(startOf(S)); digits.forEach((d, i) => put(i, 10 + d)); f.set(tidy(S, valueOf()), true); };
  begin();
  const roll = (i, by) => {
    if (f.locked()) return;
    digits[i] = mod10(digits[i] + by);
    put(i, at[i] + by, true);
    feel.tick();
    commit();
  };
  // rolling a drum by finger: the strip follows it, and the digit in the window's middle is the one
  root.querySelectorAll('.pi-dwin').forEach((win, i) => {
    let base = 10, shownD = 0;
    f.cleanup(f.ctx.track(win, {
      blocked: () => f.locked(),
      start: () => { put(i, 10 + digits[i]); base = at[i]; shownD = digits[i]; },
      move: ({ dy }) => {
        const j = 10 + mod10(base - dy / DH - 10);
        put(i, j);
        const d = Math.round(j) % 10;
        if (d !== shownD) { shownD = d; digits[i] = d; feel.tick(); commit(false); }
      },
      release: () => { put(i, Math.round(at[i]), true); digits[i] = mod10(Math.round(at[i])); commit(); feel.sound('select'); },
      cancel: () => put(i, 10 + digits[i], true),
      tap: e => { const r = win.getBoundingClientRect(); roll(i, e.clientY < r.top + r.height / 2 ? -1 : 1); },
    }));
  });
  const onTap = e => {
    if (f.locked()) return;
    const b = e.target.closest('.pi-roll');
    if (b) { roll(Number(b.closest('.pi-drum').dataset.i), Number(b.dataset.d)); return; }
    if (e.target.closest('.pi-wsign')) { sign = -sign; signEl.textContent = sign < 0 ? '−' : '+'; feel.tick(); commit(); }
  };
  root.addEventListener('click', onTap);
  f.cleanup(() => root.removeEventListener('click', onTap));
  return {
    reveal(answer) {
      if (!differs(S, f.value(), answer)) return;
      givenTag(root, wheels, S, f.value(), feel);
      // each drum rolls the short way round to its true digit; the ones that moved turn gold
      const was = digits.slice();
      toDigits(tidy(S, answer));
      digits.forEach((d, i) => {
        if (d === was[i]) return;
        const by = ((d - was[i] + 15) % 10) - 5;
        put(i, 10 + was[i], false);
        strips[i].getBoundingClientRect();
        put(i, 10 + was[i] + by, true);
        wins[i].classList.add('truth');
      });
    },
    mark(kind) { wheels.classList.add(kind); markGiven(root, kind); },
    reset() { wheels.className = 'pi-wheels'; for (const w of wins) w.classList.remove('truth'); clearGiven(root); begin(); },
    debug: () => ({ digits: digits.slice(), sign, shown: show(S, valueOf()) }),
  };
}
