// Number, as an abacus: a rod of nine beads for each digit, the biggest place on the left, so the rods read
// like the number they make. Tap a bead and it goes up to the bar with every bead above it; tap a bead
// that's up and it drops with every bead below it; or run a finger down a rod to pull beads up to it. The
// first five beads on a rod are one shade and the last four another, so a digit reads at a glance, and it
// is written under its rod too. Each change gives a tick. It always holds a real number (`start`, else 0),
// as the slider does; past the range, it goes back to the range's end. Beads move by transform, on their
// own layers, at whole device pixels. Once checked and wrong, the beads move to the true number and the
// digits that changed turn gold; what was given goes on a tag at the corner.
import { esc, devicePx, mixHex } from '../kit.js';
import { placesOf, tidy, startOf, show, differs, givenTag, markGiven, clearGiven } from './common.js';

const PITCH = 20, BEAD = 18, TOP = 18, TRAVEL = 46;   // a bead's step, its height, the bar's depth, the gap the beads cross
const ROD = TOP + 9 * PITCH + TRAVEL + 6;             // a rod's height
const COLOURS = ['#49c6ff', '#2bc4a4', '#ffc83d', '#ee4b7a', '#8b8bff'], DECIMAL = '#b39cff';   // by place: ones, tens, hundreds…; decimals lilac

export const css = `
.pi-abacus { display: flex; align-items: flex-start; justify-content: center; gap: 6px; padding: 0 12px 12px; border-radius: 22px; background: #1b2250;
  border: 3px solid #364090; box-shadow: 0 5px 0 #2f3678; }
.pi-abacus.right { border-color: #2bc4a4; box-shadow: 0 5px 0 #127a85; }
.pi-abacus.close { border-color: #ffc83d; box-shadow: 0 5px 0 #c98a00; }
.pi-abacus.wrong { border-color: #ee4b7a; box-shadow: 0 5px 0 #8f1f44; }
.pi-rod { position: relative; width: var(--rw, 52px); display: flex; flex-direction: column; align-items: center; }
.pi-rodbox { position: relative; width: 100%; height: ${ROD}px; touch-action: none; }
.pi-rodbox::before { content: ""; position: absolute; left: 50%; top: 0; bottom: 4px; width: 4px; margin-left: -2px; border-radius: 2px; background: #2a3168; }
.pi-rodbox::after { content: ""; position: absolute; left: -6px; right: -6px; top: 0; height: ${TOP - 6}px; background: #364090; border-radius: 0 0 6px 6px; }
.pi-bead { position: absolute; left: 50%; top: 0; width: calc(var(--rw, 52px) - 8px); height: ${BEAD}px; margin-left: calc(var(--rw, 52px) / -2 + 4px); border-radius: 9px;
  will-change: transform; backface-visibility: hidden; transition: transform 230ms cubic-bezier(.3, 1.3, .5, 1); }
.pi-bead::after { content: ""; position: absolute; left: 7px; top: 3px; width: 34%; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.55); }
.pi-adig { margin-top: 8px; min-width: 34px; height: 34px; padding: 0 6px; border-radius: 11px; background: #fff; color: #1b1f5e; box-shadow: 0 3px 0 #b9c2ee;
  display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; }
.pi-adig.truth { background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; }
.pi-adot { width: 9px; height: 9px; border-radius: 50%; background: #fff; align-self: flex-end; margin: 0 -1px 20px; flex: none; }
.pi-asign { align-self: flex-end; margin-bottom: 4px; width: 40px; height: 42px; border-radius: 13px; background: #2a3274; box-shadow: 0 4px 0 #161c4a; font-size: 26px; font-weight: 900;
  transition: transform 120ms ease-out, box-shadow 120ms; }
.pi-asign.down { transform: translateY(4px); box-shadow: 0 0 0 #161c4a; transition-duration: 50ms; }
.pi-aunit { align-self: flex-end; margin: 0 0 12px 2px; font-size: 18px; color: #9aa3d6; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  const { whole, dec, neg } = placesOf(S);
  const n = whole + dec;
  const rw = Math.max(30, Math.min(56, Math.floor((330 - (neg ? 46 : 0) - (dec ? 12 : 0) - (S.unit ? 44 : 0)) / n) - 6));
  const colour = i => { const place = whole - 1 - i; return place < 0 ? DECIMAL : COLOURS[place % COLOURS.length]; };
  const bead = (i, b) => {
    const c = b < 5 ? colour(i) : mixHex(colour(i), '#ffffff', 0.35);
    return `<i class="pi-bead" data-b="${b}" style="background:${c};box-shadow:0 3px 0 ${mixHex(c, '#0e1436', 0.45)}"></i>`;
  };
  const rod = i => `<div class="pi-rod" data-i="${i}"><div class="pi-rodbox">${Array.from({ length: 9 }, (_, b) => bead(i, b)).join('')}</div><span class="pi-adig">0</span></div>`;
  root.innerHTML = `<div class="pi-abacus" style="--rw:${rw}px">${neg ? '<button class="pi-asign" data-sound="select" aria-label="Sign">+</button>' : ''}
      ${Array.from({ length: n }, (_, i) => (i === whole && dec ? '<span class="pi-adot"></span>' : '') + rod(i)).join('')}
      ${S.unit ? `<span class="pi-aunit">${esc(S.unit)}</span>` : ''}</div>`;
  const abacus = root.querySelector('.pi-abacus'), signEl = root.querySelector('.pi-asign');
  const rods = [...root.querySelectorAll('.pi-rod')];
  const beads = rods.map(r => [...r.querySelectorAll('.pi-bead')]), digs = rods.map(r => r.querySelector('.pi-adig'));
  let digits = Array(n).fill(0), sign = 1;
  // bead b on a rod showing d: up against the bar if it's counted, else resting at the bottom
  const yOf = (b, d) => (b < d ? TOP + b * PITCH : TOP + TRAVEL + b * PITCH);
  const draw = i => {
    beads[i].forEach((el, b) => { el.style.transform = `translate3d(0,${devicePx(yOf(b, digits[i]))}px,0)`; });
    digs[i].textContent = String(digits[i]);
  };
  const valueOf = () => sign * digits.reduce((s, d, i) => s + d * 10 ** (whole - 1 - i), 0);
  const toDigits = v => {
    sign = v < 0 ? -1 : 1;
    const a = Math.round(Math.abs(v) * 10 ** dec);
    digits = Array.from({ length: n }, (_, i) => Math.floor(a / 10 ** (n - 1 - i)) % 10);
    if (signEl) signEl.textContent = sign < 0 ? '−' : '+';
  };
  const commit = () => {
    const v = tidy(S, valueOf());
    if (Math.abs(v - valueOf()) > 1e-9) { toDigits(v); digits.forEach((_, i) => draw(i)); }
    if (v !== f.value()) f.set(v, true);
  };
  const setDigit = (i, d) => {
    if (f.locked() || d === digits[i]) return;
    digits[i] = d;
    draw(i);
    feel.tick();
    commit();
  };
  const begin = () => { toDigits(startOf(S)); digits.forEach((_, i) => draw(i)); f.set(tidy(S, valueOf()), true); };
  begin();
  rods.forEach((r, i) => {
    const box = r.querySelector('.pi-rodbox');
    // where a finger is on a rod, as the count it pulls up: the gap follows the finger
    const countAt = y => Math.max(0, Math.min(9, Math.round((y - box.getBoundingClientRect().top - TOP - TRAVEL / 2) / PITCH)));
    f.cleanup(f.ctx.track(box, {
      blocked: () => f.locked(),
      move: ({ y }) => setDigit(i, countAt(y)),
      release: () => feel.sound('select'),
      tap: (e, target) => {
        const el = (target || e.target).closest('.pi-bead');
        let b = el ? Number(el.dataset.b) : null;
        if (b === null) {
          // between beads: the nearest one
          const y = e.clientY - box.getBoundingClientRect().top;
          b = beads[i].map((_, k) => k).sort((p, q) => Math.abs(yOf(p, digits[i]) + BEAD / 2 - y) - Math.abs(yOf(q, digits[i]) + BEAD / 2 - y))[0];
        }
        setDigit(i, b < digits[i] ? b : b + 1);
        feel.sound('select');
      },
    }));
  });
  const onTap = e => {
    if (f.locked() || !e.target.closest('.pi-asign')) return;
    sign = -sign; signEl.textContent = sign < 0 ? '−' : '+'; feel.tick(); commit();
  };
  root.addEventListener('click', onTap);
  f.cleanup(() => root.removeEventListener('click', onTap));
  return {
    reveal(answer) {
      if (!differs(S, f.value(), answer)) return;
      givenTag(root, abacus, S, f.value(), feel);
      const was = digits.slice();
      toDigits(tidy(S, answer));
      digits.forEach((d, i) => { if (d !== was[i]) { draw(i); digs[i].classList.add('truth'); if (feel.pop) feel.pop(digs[i], 0.4); } });
    },
    mark(kind) { abacus.classList.add(kind); markGiven(root, kind); },
    reset() { abacus.className = 'pi-abacus'; for (const d of digs) d.classList.remove('truth'); clearGiven(root); begin(); },
    debug: () => ({ digits: digits.slice(), sign, shown: show(S, valueOf()) }),
  };
}
