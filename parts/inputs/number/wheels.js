// Number, as wheels: one drum for each digit, like a combination lock or a counter. Roll a drum up or down
// with a finger, or tap the arrow above or below it; each digit that passes gives a tick. A sign switch sits
// in front when the number can go below 0, and a point before the decimals. It always holds a real number
// (`start`, else 0), as the slider does; a number past the range rolls back to its end. Once checked and
// wrong, the drums roll to the true number and the ones that moved turn gold; what was given goes on a tag
// at the corner.
//
// A drum is drawn as a cylinder seen side on, flat, lit from above: the digits are printed round it, so the
// one facing you is full size and the ones either side, turning away over its top and bottom, are squashed
// flat as they go (each digit's height is the cosine of how far round it is). The drum's face is three flat
// bands that stay put while it turns: a pale band at the top where it turns up to the light, white where it
// faces you, a shaded band at the foot where it turns away, and a darker side under it. Nothing is laid over
// the digits: they sit on the drum, toned a little with the band they pass through. Each digit is moved and
// squashed by transform alone, on its own layer, at whole device pixels.
import { esc, devicePx, mixHex, easeBack } from '../kit.js';
import { placesOf, tidy, startOf, show, differs, givenTag, markGiven, clearGiven, tween } from './common.js';

const DH = 52;            // one digit's step round the drum (its height, facing you)
const R = 56;             // the drum's radius: a little over half the window, so the next digits show squashed
const HALF = DH;          // half the window's height
const BAND = Math.round(HALF - R * Math.sin((40 * Math.PI) / 180));   // the top and bottom bands, where it turns past 40 degrees
// the drum's tones: face, the band turned up to the light, the band turned away, the side under it, and the ink
const TONES = {
  plain: { face: '#ffffff', top: '#e3e7fc', foot: '#c3c9ef', side: '#3b4488', ink: '#1b1f5e' },
  truth: { face: '#ffc83d', top: '#ffd978', foot: '#e3a21e', side: '#8a5c00', ink: '#2a1650' },
};

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
/* the drum: three flat bands that stay put while it turns, under the digits, and its side below */
.pi-dwin { position: relative; width: 100%; height: ${HALF * 2}px; border-radius: 8px; overflow: hidden; touch-action: none;
  background: linear-gradient(${TONES.plain.top} ${BAND}px, ${TONES.plain.face} ${BAND}px, ${TONES.plain.face} ${HALF * 2 - BAND}px, ${TONES.plain.foot} ${HALF * 2 - BAND}px);
  box-shadow: 0 4px 0 ${TONES.plain.side}; }
.pi-dwin.truth { background: linear-gradient(${TONES.truth.top} ${BAND}px, ${TONES.truth.face} ${BAND}px, ${TONES.truth.face} ${HALF * 2 - BAND}px, ${TONES.truth.foot} ${HALF * 2 - BAND}px);
  box-shadow: 0 4px 0 ${TONES.truth.side}; }
.pi-dstrip { position: absolute; inset: 0; }
.pi-dstrip b { position: absolute; left: 0; right: 0; top: ${HALF - DH / 2}px; height: ${DH}px; display: flex; align-items: center; justify-content: center;
  font-size: calc(var(--dw, 58px) * 0.72); font-weight: 900; color: ${TONES.plain.ink}; line-height: 1; will-change: transform; backface-visibility: hidden; transform-origin: 50% 50%; }
.pi-wsign { width: 44px; height: 54px; border-radius: 14px; background: #2a3274; box-shadow: 0 4px 0 #161c4a; font-size: 30px; font-weight: 900; transition: transform 120ms ease-out, box-shadow 120ms; }
.pi-wsign.down { transform: translateY(4px); box-shadow: 0 0 0 #161c4a; transition-duration: 50ms; }
.pi-wdot { width: 10px; height: 10px; border-radius: 50%; background: #fff; align-self: center; margin-top: 34px; flex: none; }
.pi-wunit { align-self: center; font-size: 20px; color: #9aa3d6; margin-left: 2px; }
`;

const ARROW = d => `<svg width="18" height="11" viewBox="0 0 18 11" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const mod10 = x => ((x % 10) + 10) % 10;
const SHOWN = 5;          // digits drawn on a drum at once: the one facing you and two each way

export function mount(f) {
  const { root, S, feel } = f;
  const { whole, dec, neg } = placesOf(S);
  const n = whole + dec;
  const dw = Math.max(34, Math.min(58, Math.floor((340 - (neg ? 52 : 0) - (dec ? 18 : 0) - (S.unit ? 50 : 0)) / n) - 8));
  const drum = i => `<div class="pi-drum" data-i="${i}"><button class="pi-roll" data-d="1" data-sound="select" aria-label="Up one">${ARROW('M2 9l7-7 7 7')}</button>
      <div class="pi-dwin"><div class="pi-dstrip">${'<b></b>'.repeat(SHOWN)}</div></div>
      <button class="pi-roll" data-d="-1" data-sound="select" aria-label="Down one">${ARROW('M2 2l7 7 7-7')}</button></div>`;
  root.innerHTML = `<div class="pi-wheels" style="--dw:${dw}px">${neg ? '<button class="pi-wsign" data-sound="select" aria-label="Sign">+</button>' : ''}
      ${Array.from({ length: n }, (_, i) => (i === whole && dec ? '<span class="pi-wdot"></span>' : '') + drum(i)).join('')}
      ${S.unit ? `<span class="pi-wunit">${esc(S.unit)}</span>` : ''}</div>`;
  const wheels = root.querySelector('.pi-wheels'), signEl = root.querySelector('.pi-wsign');
  const wins = [...root.querySelectorAll('.pi-dwin')], glyphs = wins.map(w => [...w.querySelectorAll('b')]);
  let digits = Array(n).fill(0), sign = 1;
  // where each drum is turned to, in digits: the digit facing you is at[i] when it's a whole number; it
  // runs on past 9 and below 0, so a drum can keep rolling either way
  const at = Array(n).fill(0), goal = Array(n).fill(0), stops = Array(n).fill(null);
  // the drum at a turn: each digit round it placed by its angle, squashed, and toned by the band it's in
  const draw = (i, j) => {
    at[i] = j;
    const base = Math.round(j), tones = wins[i].classList.contains('truth') ? TONES.truth : TONES.plain;
    glyphs[i].forEach((g, s) => {
      const d = base + s - (SHOWN >> 1), a = ((d - j) * DH) / R;
      if (Math.abs(a) >= Math.PI / 2) { g.style.visibility = 'hidden'; return; }
      const y = R * Math.sin(a), squash = Math.cos(a);
      g.style.visibility = '';
      if (g._d !== mod10(d)) { g._d = mod10(d); g.textContent = String(g._d); }
      g.style.transform = `translate3d(0,${devicePx(y)}px,0) scale(1,${squash.toFixed(3)})`;
      // the ink takes on a little of the band it's in, more the further round it is
      const band = y < 0 ? tones.top : tones.foot;
      g.style.color = mixHex(tones.ink, band, Math.min(0.45, (1 - squash) * 0.9));
    });
  };
  const stop = i => { if (stops[i]) stops[i](); stops[i] = null; };
  // rolls a drum to a turn, quick away and settling with a little overshoot
  const settle = (i, to, ms = 230) => { stop(i); goal[i] = to; const from = at[i]; stops[i] = tween(from, to, ms, k => easeBack(k, 1.3), v => draw(i, v), () => { stops[i] = null; }); };
  const valueOf = () => sign * digits.reduce((s, d, i) => s + d * 10 ** (whole - 1 - i), 0);
  const toDigits = v => {
    sign = v < 0 ? -1 : 1;
    const a = Math.round(Math.abs(v) * 10 ** dec);
    digits = Array.from({ length: n }, (_, i) => Math.floor(a / 10 ** (n - 1 - i)) % 10);
    if (signEl) signEl.textContent = sign < 0 ? '−' : '+';
  };
  // the turn nearest to a drum's present one that shows digit d
  const nearest = (i, d) => { const j = goal[i]; return j + ((d - mod10(j) + 15) % 10) - 5; };
  // the number given, held to its range: if it went past, the drums roll back to the end of the range
  const commit = (rollBack = true) => {
    const v = tidy(S, valueOf());
    if (rollBack && Math.abs(v - valueOf()) > 1e-9) { toDigits(v); digits.forEach((d, i) => settle(i, nearest(i, d))); }
    if (v !== f.value()) f.set(v, true);
  };
  const begin = () => { toDigits(startOf(S)); digits.forEach((d, i) => { stop(i); goal[i] = d; draw(i, d); }); f.set(tidy(S, valueOf()), true); };
  begin();
  const roll = (i, by) => {
    if (f.locked()) return;
    digits[i] = mod10(digits[i] + by);
    settle(i, goal[i] + by);
    feel.tick();
    commit();
  };
  // rolling a drum by finger: it turns with the finger, and the digit facing you is the one
  wins.forEach((win, i) => {
    let base = 0, shownD = 0;
    f.cleanup(f.ctx.track(win, {
      blocked: () => f.locked(),
      start: () => { stop(i); base = goal[i] = at[i]; shownD = digits[i]; },
      move: ({ dy }) => {
        const j = base - dy / DH;
        draw(i, j);
        goal[i] = Math.round(j);
        const d = mod10(Math.round(j));
        if (d !== shownD) { shownD = d; digits[i] = d; feel.tick(); commit(false); }
      },
      release: () => { const j = Math.round(at[i]); digits[i] = mod10(j); settle(i, j); commit(); feel.sound('select'); },
      cancel: () => settle(i, nearest(i, digits[i])),
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
  f.cleanup(() => { root.removeEventListener('click', onTap); for (let i = 0; i < n; i++) stop(i); });
  return {
    reveal(answer) {
      if (!differs(S, f.value(), answer)) return;
      givenTag(root, wheels, S, f.value(), feel);
      // each drum rolls the short way round to its true digit, the further the longer; the ones that move turn gold
      const was = digits.slice();
      toDigits(tidy(S, answer));
      digits.forEach((d, i) => {
        if (d === was[i]) return;
        wins[i].classList.add('truth');
        const to = nearest(i, d);
        settle(i, to, 260 + 60 * Math.abs(to - at[i]));
      });
    },
    mark(kind) { wheels.classList.add(kind); markGiven(root, kind); },
    reset() { wheels.className = 'pi-wheels'; for (const w of wins) w.classList.remove('truth'); clearGiven(root); begin(); },
    debug: () => ({ digits: digits.slice(), sign, shown: show(S, valueOf()), turned: at.slice() }),
  };
}
