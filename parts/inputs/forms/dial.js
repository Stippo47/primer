// Dial: the slider bent round a window. It reads the same settings as the slider (min, max, step, scale,
// unit, start, ticks, picture), so a lesson can swap one for the other, and its picture sits in the window,
// following the value. Turn the knob round the ring, or touch anywhere on the dial. The knob rides on a
// layer of its own and moves by transform at whole device pixels; the ring's fill is one stroke whose
// length changes. It starts at a real value (`start`, or the middle of its scale), as the slider does.
import { esc, devicePx, numberScale } from '../kit.js';
import { PICTURES, pictureSvg, pictureK, setPicture, windowBox } from '../pictures.js';

// The drawing's own units: a 300 x 300 box.
const CX = 150, CY = 150, PLATE = 146, TR = 106, TW = 22, WR = 84, LR = 129;
const A0 = Math.PI * 0.75, SWEEP = Math.PI * 1.5, LEN = TR * SWEEP;
const at = (a, r) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
const arc = (a1, a2, r) => {
  const [x1, y1] = at(a1, r), [x2, y2] = at(a2, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

export const css = `
.pi.form-dial { display: flex; flex-direction: column; align-items: stretch; }
.pi-dialbox { position: relative; width: 100%; height: calc(244px + var(--grow, 0px)); touch-action: none; }
.pi-dialbox > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pi-dialbox .fill { stroke: #49c6ff; transition: stroke 150ms; }
.pi-dialbox.right .fill { stroke: #2bc4a4; }
.pi-dialbox.close .fill { stroke: #ffc83d; }
.pi-dialbox.wrong .fill { stroke: #ee4b7a; }
.pi-dialbox.revealed .rim { stroke: #ffc83d; }
.pi-knob { position: absolute; left: 0; top: 0; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; background: #fff; box-shadow: 0 4px 0 #b9c2ee;
  will-change: transform; backface-visibility: hidden; pointer-events: none; }
.pi.held .pi-knob { background: #e8f8ff; }
.pi-knob.right { background: #2bc4a4; box-shadow: 0 4px 0 #127a85; }
.pi-knob.close { background: #ffc83d; box-shadow: 0 4px 0 #c98a00; }
.pi-knob.wrong { background: #ee4b7a; box-shadow: 0 4px 0 #8f1f44; }
.pi-dialread { font-size: 30px; fill: #fff; font-weight: 800; }
.pi-dialread .u { font-size: 16px; fill: #7f88c8; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  const sc = numberScale(S);
  const pic = PICTURES[S.picture] ? S.picture : null;
  const picK = pictureK(S, sc);
  const ang = v => A0 + sc.toPos(v) * SWEEP;
  const clip = `pi-dialwin-${Math.random().toString(36).slice(2, 8)}`;
  const ticks = sc.ticks(Math.max(0, S.ticks));
  const notches = ticks.map(t => { const a = ang(t), [x1, y1] = at(a, TR - 8), [x2, y2] = at(a, TR + 8); return `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}"/>`; }).join('');
  const labels = ticks.map(t => { const [x, y] = at(ang(t), LR); return `<text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}">${esc(sc.tickText(t))}</text>`; }).join('');
  const box = pic ? windowBox(pic, CX, CY, WR) : null;
  root.innerHTML = `<div class="pi-dialbox" data-grow="110">
      <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs><clipPath id="${clip}"><circle cx="${CX}" cy="${CY}" r="${WR}"/></clipPath></defs>
        <circle cx="${CX}" cy="${CY + 5}" r="${PLATE}" fill="#2f3678"/>
        <circle cx="${CX}" cy="${CY}" r="${PLATE}" fill="#1b2250" stroke="#364090" stroke-width="2"/>
        <path d="${arc(A0, A0 + SWEEP, TR)}" fill="none" stroke="#2a3168" stroke-width="${TW}" stroke-linecap="round"/>
        <path class="gap" d="" fill="none" stroke="#ffc83d" stroke-opacity="0.45" stroke-width="10" stroke-linecap="round"/>
        <path class="fill" d="${arc(A0, A0 + SWEEP, TR)}" fill="none" stroke-width="${TW}" stroke-linecap="round" stroke-dasharray="0 ${LEN * 2}"/>
        <path class="shine" d="${arc(A0, A0 + SWEEP, TR + 6)}" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="0 ${LEN * 2}"/>
        <g stroke="#0e1436" stroke-opacity="0.38" stroke-width="2.4" stroke-linecap="round">${notches}</g>
        <g fill="#7f88c8" font-size="13" font-weight="800" text-anchor="middle">${labels}</g>
        <circle cx="${CX}" cy="${CY}" r="${WR}" fill="#0f1434"/>
        ${pic ? `<g clip-path="url(#${clip})">${pictureSvg(pic, box)}</g>` : `<text class="pi-dialread" x="${CX}" y="${CY + 10}" text-anchor="middle"></text>`}
        <circle class="rim" cx="${CX}" cy="${CY}" r="${WR + 1}" fill="none" stroke="#364090" stroke-width="4"/>
        <g class="truth" hidden><rect x="-18" y="-5" width="36" height="10" rx="5" fill="#c98a00" transform="translate(0 2)"/><rect x="-18" y="-5" width="36" height="10" rx="5" fill="#ffc83d"/></g>
      </svg>
      <div class="pi-knob"></div>
    </div>
    <div class="pi-chips">${pic ? '<span class="pi-read given"></span>' : ''}</div>`;
  const dialbox = root.querySelector('.pi-dialbox'), svg = dialbox.querySelector('svg'), knob = root.querySelector('.pi-knob');
  const fill = svg.querySelector('.fill'), shine = svg.querySelector('.shine'), picEl = pic ? svg.querySelector(`svg.pic-${pic}`) : null;
  const reading = svg.querySelector('.pi-dialread'), chips = root.querySelector('.pi-chips');
  // where the drawing sits in its box: meet, centred
  const frame = () => { const r = dialbox.getBoundingClientRect(), s = Math.min(r.width, r.height) / 300; return { r, s, ox: (r.width - 300 * s) / 2, oy: (r.height - 300 * s) / 2 }; };
  let shown = null;
  const show = v => {
    shown = v;
    const fr = frame(), [x, y] = at(ang(v), TR);
    knob.style.transform = `translate3d(${devicePx(fr.ox + x * fr.s)}px,${devicePx(fr.oy + y * fr.s)}px,0)`;
    const len = (LEN * sc.toPos(v)).toFixed(2);
    fill.setAttribute('stroke-dasharray', `${len} ${LEN * 2}`);
    shine.setAttribute('stroke-dasharray', `${Math.max(0, (TR + 6) * SWEEP * sc.toPos(v) - 8).toFixed(2)} ${LEN * 3}`);
    if (pic) { setPicture(pic, picEl, picK(v)); chips.querySelector('.given').textContent = sc.show(v); }
    else reading.innerHTML = `${esc(sc.show(v).replace(S.unit, '').trim())}${S.unit ? `<tspan class="u" dx="4">${esc(S.unit)}</tspan>` : ''}`;
  };
  const ro = new ResizeObserver(() => { if (shown !== null) show(shown); });
  ro.observe(dialbox);
  f.cleanup(() => ro.disconnect());
  // A touch's place round the dial, as a value. Across the gap at the bottom it holds to the nearer end,
  // and while turning it never jumps from one end to the other.
  const valueAt = (cx, cy, turning) => {
    const fr = frame(), x = (cx - fr.r.left - fr.ox) / fr.s - CX, y = (cy - fr.r.top - fr.oy) / fr.s - CY;
    let rel = (Math.atan2(y, x) - A0) % (Math.PI * 2);
    if (rel < 0) rel += Math.PI * 2;
    let p = rel <= SWEEP ? rel / SWEEP : rel - SWEEP < (Math.PI * 2 - SWEEP) / 2 ? 1 : 0;
    const now = sc.toPos(f.value());
    if (turning && Math.abs(p - now) > 0.6) p = now > 0.5 ? 1 : 0;
    return sc.toVal(p);
  };
  const onPlate = e => { const fr = frame(), x = (e.clientX - fr.r.left - fr.ox) / fr.s - CX, y = (e.clientY - fr.r.top - fr.oy) / fr.s - CY; return Math.hypot(x, y) <= PLATE + 8; };
  let lastTick = null;
  const to = v => {
    if (f.locked() || v === f.value()) return;
    show(v);
    f.set(v, true);
    const k = Math.round(sc.toPos(v) * 20);
    if (k !== lastTick) { lastTick = k; feel.tick(); }
  };
  const begin = () => { show(sc.start); f.set(shown, true); };
  begin();
  f.cleanup(f.ctx.track(dialbox, {
    blocked: e => f.locked() || !onPlate(e),
    start: e => { root.classList.add('held'); to(valueAt(e.clientX, e.clientY, false)); },
    move: ({ x, y }) => to(valueAt(x, y, true)),
    release: () => { root.classList.remove('held'); feel.sound('select'); },
    cancel: () => root.classList.remove('held'),
    tap: e => { root.classList.remove('held'); to(valueAt(e.clientX, e.clientY, false)); feel.sound('select'); },
  }));
  return {
    reveal(answer) {
      dialbox.classList.add('revealed');
      const t = svg.querySelector('.truth'), a = ang(answer), [x, y] = at(a, TR);
      t.removeAttribute('hidden');
      t.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${((a * 180) / Math.PI).toFixed(2)})`);
      const v = f.value();
      if (v !== null && Math.abs(sc.toPos(v) - sc.toPos(answer)) > 0.004) svg.querySelector('.gap').setAttribute('d', arc(Math.min(a, ang(v)), Math.max(a, ang(v)), TR));
      if (v !== answer) {
        if (!pic) chips.insertAdjacentHTML('beforeend', `<span class="pi-read given">${esc(sc.show(v))}</span>`);
        chips.insertAdjacentHTML('beforeend', `<span class="pi-read truth">${esc(sc.show(answer))}</span>`);
        if (feel.pop) feel.pop(chips.querySelector('.truth'));
      }
    },
    mark(kind) {
      dialbox.classList.add(kind);
      knob.classList.add(kind);
      for (const c of chips.querySelectorAll('.given')) c.classList.add(kind);
    },
    reset() {
      dialbox.className = 'pi-dialbox';
      knob.className = 'pi-knob';
      svg.querySelector('.truth').setAttribute('hidden', '');
      svg.querySelector('.gap').setAttribute('d', '');
      chips.innerHTML = pic ? '<span class="pi-read given"></span>' : '';
      begin();
    },
  };
}
