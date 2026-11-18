// Inputs: every way of answering a question. One part, six forms: choice, slider, number, order,
// match and spot. It knows nothing about any lesson: it shows what its settings say, reports its state,
// and on `reveal` shows the truth it is handed beside the answer given. It's an answer form, not a tool,
// so the Playground doesn't list it ("playground": false in part.json).
//
// mount(el, settings, ctx) -> { calls, state, on, remove }. ctx brings the app's feel (sound and tick),
// finger tracking and a way to find a picture's address; a part never reaches into the app itself.

const STYLE = `
.pi { position: relative; color: #fff; font-weight: 800; }
:where(.pi) button { font: inherit; color: inherit; border: 0; background: none; padding: 0; margin: 0; cursor: pointer; touch-action: manipulation; }
.pi.locked { pointer-events: none; }
.pi-rows { display: flex; flex-direction: column; gap: 10px; }
.pi-opt { display: flex; align-items: center; width: 100%; min-height: 52px; padding: 10px 16px; border-radius: 16px; text-align: left;
  background: #1b2250; border: 2px solid #364090; box-shadow: 0 4px 0 #2f3678; font-size: calc(16px * var(--ts, 1)); line-height: 1.2;
  transition: transform 60ms ease-out, box-shadow 60ms, background 120ms, border-color 120ms; }
.pi-opt.down { transform: translateY(4px); box-shadow: 0 0 0 #2f3678; }
.pi-opt.on { background: #222a60; border-color: #6fd6ff; box-shadow: 0 4px 0 #1b8fd1; color: #e8f8ff; }
.pi-opt.right { background: #1d5f63; border-color: #2bc4a4; box-shadow: 0 4px 0 #127a85; }
.pi-opt.wrong { background: #5a2050; border-color: #ee4b7a; box-shadow: 0 4px 0 #8f1f44; }
.pi-opt .k { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; margin-right: 12px; flex: none;
  border-radius: 9px; border: 2px solid #364090; color: #7f88c8; font-size: 13px; }
.pi-opt.on .k { border-color: #6fd6ff; color: #6fd6ff; }

.pi.form-slider { padding: 46px 6px 4px; }
.pi.form-slider.with-pic { padding-top: 0; }
/* the picture is a size up on a tall phone and steps down on a short one, so the step still fits */
.pi-pic { display: flex; justify-content: center; align-items: flex-end; height: clamp(120px, 18.5vh, 166px); margin-bottom: 44px; pointer-events: none; }
.pi-pic svg { overflow: visible; height: calc(100% - 4px); width: auto; }
.pi-track { position: relative; height: 56px; margin: 0 14px; touch-action: none; }
.pi-rail { position: absolute; left: 0; right: 0; top: 22px; height: 12px; border-radius: 6px; background: #2a3168; }
.pi-fill { position: absolute; left: 0; top: 22px; height: 12px; border-radius: 6px; background: #49c6ff; box-shadow: inset 0 -3px 0 #1b8fd1; width: 0; max-width: 100%; }
/* the thumb and its chip ride on their own layers and move by transform (no repaint under them) */
.pi-thumb { position: absolute; left: 0; top: 12px; width: 32px; height: 32px; margin-left: -16px; border-radius: 50%; background: #fff; box-shadow: 0 4px 0 #b9c2ee;
  will-change: transform; backface-visibility: hidden; }
.pi.held .pi-thumb { background: #e8f8ff; }
.pi-chip { position: absolute; left: 0; bottom: 52px; padding: 5px 10px; border-radius: 12px; background: #fff; color: #1b1f5e;
  box-shadow: 0 3px 0 #b9c2ee; font-size: 15px; white-space: nowrap; will-change: transform; backface-visibility: hidden; }
.pi-chip.truth { bottom: auto; top: 50px; transform: translateX(-50%); will-change: auto; background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; }
.pi-chip.right { background: #2bc4a4; color: #fff; box-shadow: 0 3px 0 #127a85; }
.pi-chip.wrong { background: #ee4b7a; color: #fff; box-shadow: 0 3px 0 #8f1f44; }
.pi-mark { position: absolute; top: 14px; width: 6px; height: 28px; margin-left: -3px; border-radius: 3px; background: #ffc83d; box-shadow: 0 2px 0 #c98a00; }
.pi-gap { position: absolute; top: 25px; height: 6px; border-radius: 3px; background: rgba(255, 200, 61, 0.45); }
.pi-ticks { position: relative; height: 18px; margin: 4px 14px 0; color: #7f88c8; font-size: 12px; }
.pi-ticks span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.pi.form-slider.revealed .pi-ticks { visibility: hidden; }

.pi-display { display: flex; align-items: baseline; justify-content: center; gap: 8px; height: 64px; border-radius: 16px; margin-bottom: 12px;
  background: #0f1434; border: 2px solid #364090; padding-top: 10px; }
.pi-display .d { font-size: 34px; letter-spacing: 0.02em; }
.pi-display .d.unset { color: #5d66ad; }
.pi-display .u { font-size: 18px; color: #7f88c8; }
.pi-display.right { border-color: #2bc4a4; }
.pi-display.wrong { border-color: #ee4b7a; }
.pi-truthline { text-align: center; color: #ffc83d; font-size: 15px; margin: -4px 0 10px; }
.pi-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pi-key { height: 48px; border-radius: 14px; background: #222a60; border: 2px solid #364090; box-shadow: 0 3px 0 #1c2250; font-size: 20px;
  transition: transform 60ms ease-out, box-shadow 60ms; }
.pi-key.down { transform: translateY(3px); box-shadow: none; }
.pi-key.off { visibility: hidden; }

.pi.form-order { position: relative; }
.pi-end { color: #7f88c8; font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 4px 6px; }
.pi-end.last { margin: 6px 4px 0; }
.pi-item { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; height: 52px; padding: 0 14px; border-radius: 16px; text-align: left;
  background: #1b2250; border: 2px solid #364090; box-shadow: 0 4px 0 #2f3678; font-size: calc(15.5px * var(--ts, 1)); touch-action: none;
  transition: transform 180ms cubic-bezier(.3, 1.3, .5, 1), border-color 120ms, background 120ms; will-change: transform; backface-visibility: hidden; }
.pi-item .pi-grip { flex: none; display: flex; flex-direction: column; gap: 3px; }
.pi-item .pi-grip i { width: 16px; height: 3px; border-radius: 2px; background: #5d66ad; }
.pi-item .t { flex: 1; min-width: 0; line-height: 1.15; }
.pi-item.lift { transition: none; z-index: 2; background: #222a60; border-color: #6fd6ff; box-shadow: 0 8px 0 rgba(4, 6, 24, 0.45); }
.pi-item.picked { border-color: #6fd6ff; background: #222a60; }
.pi-item.right { border-color: #2bc4a4; background: #1d5f63; }
.pi-item.wrong { border-color: #ee4b7a; background: #5a2050; }
.pi-item .n { flex: none; min-width: 24px; height: 24px; border-radius: 8px; background: #ffc83d; color: #2a1650; font-size: 13px; display: none; align-items: center; justify-content: center; }
.pi.form-order.revealed .pi-item.wrong .n { display: flex; }

.pi-match { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pi-match .col { display: flex; flex-direction: column; gap: 10px; }
.pi-cell { position: relative; min-height: 52px; padding: 8px 12px 8px 26px; border-radius: 15px; text-align: left; background: #1b2250; border: 2px solid #364090;
  box-shadow: 0 4px 0 #2f3678; font-size: calc(14.5px * var(--ts, 1)); line-height: 1.15; transition: transform 60ms ease-out, box-shadow 60ms, border-color 120ms; }
.pi-cell.down { transform: translateY(4px); box-shadow: 0 0 0 #2f3678; }
.pi-cell .dot { position: absolute; left: 9px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: #2f3678; }
.pi-cell.on { border-color: #fff; background: #222a60; }
.pi-cell.right { background: #1d5f63; }
.pi-cell.wrong { background: #5a2050; }
.pi-cell small { display: block; color: #ffc83d; font-size: 12px; margin-top: 3px; }

.pi-spot { position: relative; border-radius: 18px; overflow: hidden; background: #0d1232; border: 2px solid #2f3678; touch-action: manipulation; }
.pi-spot img, .pi-spot svg.fig { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.pi-pin, .pi-ring { position: absolute; pointer-events: none; transform: translate(-50%, -50%); border-radius: 50%; }
.pi-pin { width: 22px; height: 22px; background: #fff; border: 4px solid #ee4b7a; box-shadow: 0 3px 0 rgba(6, 9, 38, 0.5); }
.pi-ring { border: 4px dashed #ffc83d; }
.pi-spot.revealed .pi-pin.right { border-color: #2bc4a4; }
`;

function injectCss() {
  if (document.getElementById('part-inputs-css')) return;
  const s = document.createElement('style');
  s.id = 'part-inputs-css';
  s.textContent = STYLE;
  document.head.append(s);
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// A length rounded to whole pixels of the screen, so a thing moved by it lands on the pixel grid.
const devicePx = x => { const d = window.devicePixelRatio || 1; return Math.round(x * d) / d; };
const clone = v => (v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)));
const decimals = step => { const s = String(step); return s.includes('.') ? Math.min(4, s.split('.')[1].length) : 0; };
const fmt = (v, step, unit) => `${Number(v).toLocaleString('en', { minimumFractionDigits: decimals(step), maximumFractionDigits: decimals(step) })}${unit ? (/^[°%]/.test(unit) ? '' : ' ') + unit : ''}`;
function shuffled(list, avoidSame = false) {
  const out = list.slice();
  for (let tries = 0; tries < 8; tries++) {
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    if (!avoidSame || out.length < 2 || out.some((x, i) => x !== list[i])) return out;
  }
  return out.reverse();
}

// A sample picture for the spot form: a hurricane from above, to tap its eye.
const SAMPLE = `<svg class="fig" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid meet">
  <rect width="320" height="200" fill="#1b2a80"/><path d="M0 150q80-20 160 0t160 0v50H0z" fill="#2bc4a4" opacity="0.9"/>
  <g transform="translate(160 104)"><circle r="70" fill="#aebfff" transform="translate(4 6)" opacity="0.6"/><circle r="66" fill="#ffffff"/>
  <path d="M-58 -10a60 60 0 0 1 90 -44M54 14a60 60 0 0 1 -86 42" fill="none" stroke="#aebfff" stroke-width="9" stroke-linecap="round"/>
  <path d="M-34 -6a36 36 0 0 1 50 -26M30 8a36 36 0 0 1 -48 24" fill="none" stroke="#c9d4ff" stroke-width="7" stroke-linecap="round"/>
  <circle r="15" fill="#1b2a80"/></g></svg>`;

// ---------------------------------------------------------------- pictures a slider can drive
// A picture is drawn once and then set to k, from 0 (its low end) to 1 (its high end), as the slider
// moves: only attributes change, so it costs a small repaint of itself. Flat, lit from the upper left, no
// blur; glows are rings of low opacity. A new picture is one more entry here and one more option in
// part.json's `picture`, and any lesson can use it.
let picCount = 0;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, k) => `#${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
const ramp = (stops, k) => {
  for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) return mixHex(stops[i - 1][1], stops[i][1], (k - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
};
const attr = (el, sel, a) => { const x = el.querySelector(sel); if (x) for (const [k, v] of Object.entries(a)) x.setAttribute(k, v); };

const PICTURES = {
  // A ball that goes from ice to fire: a snowflake in a pale blue ball at the low end, plain and mild in
  // the middle, a flame inside and fire on top at the high end. For temperature.
  warmth: {
    STOPS: [[0, '#e8f8ff'], [0.22, '#a6e1ff'], [0.42, '#49c6ff'], [0.56, '#7fdcc4'], [0.68, '#ffd75a'], [0.84, '#ffa23a'], [1, '#ff6a3d']],
    draw() {
      const arm = a => {
        const c = Math.cos(a), s = Math.sin(a), p = (r, w) => `${(70 + c * r - s * w).toFixed(2)} ${(66 + s * r + c * w).toFixed(2)}`;
        return `M70 66L${p(23, 0)}M${p(12, 0)}L${p(18, 6)}M${p(12, 0)}L${p(18, -6)}`;
      };
      const flake = Array.from({ length: 6 }, (_, i) => arm((i * Math.PI) / 3 - Math.PI / 2)).join('');
      const tongue = (x, h, w) => `<path d="M${x} ${32 - h}C${x + w * 0.7} ${32 - h * 0.45} ${x + w} ${30} ${x + w * 0.6} 40C${x + w * 0.2} 46 ${x - w * 0.2} 46 ${x - w * 0.6} 40C${x - w} 30 ${x - w * 0.7} ${32 - h * 0.45} ${x} ${32 - h}Z"/>`;
      const flame = (s, y) => `M70 ${y - 30 * s}C${70 + 12 * s} ${y - 14 * s} ${70 + 20 * s} ${y - 4 * s} ${70 + 15 * s} ${y + 10 * s}C${70 + 10 * s} ${y + 22 * s} ${70 - 10 * s} ${y + 22 * s} ${70 - 15 * s} ${y + 10 * s}C${70 - 20 * s} ${y - 4 * s} ${70 - 12 * s} ${y - 14 * s} 70 ${y - 30 * s}Z`;
      return `<svg class="pic-warmth" width="140" height="128" viewBox="0 0 140 128">
        <g class="glow" opacity="0"><circle cx="70" cy="64" r="60" fill="#ffa23a" opacity="0.08"/><circle cx="70" cy="64" r="52" fill="#ffa23a" opacity="0.1"/><circle cx="70" cy="64" r="46" fill="#ffd75a" opacity="0.12"/></g>
        <g class="fire" opacity="0" transform="translate(0 0)"><g fill="#ff6a3d">${tongue(48, 22, 11)}${tongue(70, 34, 14)}${tongue(92, 20, 11)}</g><g fill="#ffd75a">${tongue(50, 12, 6)}${tongue(70, 22, 8)}${tongue(90, 10, 6)}</g></g>
        <ellipse cx="72" cy="116" rx="34" ry="5.5" fill="#060926" opacity="0.38"/>
        <circle class="side" cx="70" cy="70" r="40"/>
        <circle class="body" cx="70" cy="66" r="40"/>
        <path class="shade" d="M104.6 46A40 40 0 0 1 46 98.6A44 44 0 0 0 104.6 46Z"/>
        <ellipse cx="55" cy="47" rx="15" ry="8.5" fill="#ffffff" opacity="0.38" transform="rotate(-32 55 47)"/>
        <path d="M37 60A34 34 0 0 1 56 34" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" opacity="0.7"/>
        <g class="snow"><path d="${flake}" fill="none" stroke="#7fb7e6" stroke-width="5" stroke-linecap="round" transform="translate(0 1.6)"/><path d="${flake}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/></g>
        <g class="flame" opacity="0"><path class="outer" d="${flame(1, 70)}" fill="#fff0b8"/><path d="${flame(0.55, 76)}" fill="#ffffff" opacity="0.9"/></g>
        <g class="frost" fill="#ffffff"><path d="M18 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M118 22l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z"/><path d="M122 92l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z"/></g>
      </svg>`;
    },
    set(svg, k) {
      const body = ramp(this.STOPS, k);
      attr(svg, '.body', { fill: body });
      attr(svg, '.side', { fill: mixHex(body, '#0e1436', 0.45) });
      attr(svg, '.shade', { fill: mixHex(body, '#1b2a80', 0.3) });
      const melt = smooth(0.16, 0.42, k), burn = smooth(0.56, 0.8, k), blaze = smooth(0.78, 0.97, k);
      attr(svg, '.snow', { opacity: (1 - melt).toFixed(3), transform: `rotate(${(k * 40).toFixed(1)} 70 66) translate(70 66) scale(${(1 - melt * 0.35).toFixed(3)}) translate(-70 -66)` });
      attr(svg, '.flame', { opacity: burn.toFixed(3), transform: `translate(70 92) scale(${(0.55 + 0.45 * smooth(0.56, 0.95, k)).toFixed(3)}) translate(-70 -92)` });
      attr(svg, '.flame .outer', { fill: mixHex('#fff0b8', '#ffe066', blaze) });
      attr(svg, '.fire', { opacity: blaze.toFixed(3), transform: `translate(70 40) scale(1 ${(0.35 + 0.65 * blaze).toFixed(3)}) translate(-70 -40)` });
      attr(svg, '.glow', { opacity: smooth(0.7, 1, k).toFixed(3) });
      attr(svg, '.frost', { opacity: (1 - smooth(0.04, 0.24, k)).toFixed(3) });
    },
  },
  // The sea cut away: a warm layer on top of cold water, as deep as the value. For how deep something goes.
  depth: {
    draw() {
      const id = `pi-depth-${picCount++}`;
      return `<svg class="pic-depth" width="220" height="128" viewBox="0 0 220 128">
        <clipPath id="${id}"><rect x="12" y="10" width="196" height="108" rx="16"/></clipPath>
        <rect x="12" y="14" width="196" height="108" rx="16" fill="#0a0e2e"/>
        <g clip-path="url(#${id})">
          <rect x="12" y="10" width="196" height="108" fill="#1b2a80"/>
          <rect x="12" y="10" width="196" height="16" fill="#141a3c"/>
          <circle cx="186" cy="12" r="10" fill="#ffd75a"/>
          <g class="warm"><rect class="w1" x="12" y="26" width="196" height="10" fill="#ffa23a"/><rect class="w2" x="12" y="30" width="196" height="6" fill="#ee6b5a"/></g>
          <path class="edge" d="M12 36H208" stroke="#ffe9a6" stroke-width="2.4" stroke-dasharray="0.1 7" stroke-linecap="round"/>
          <path d="M12 26q8 -4 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0v-4H12z" fill="#141a3c"/>
          <path d="M12 26q8 -4 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0" fill="none" stroke="#b3ebff" stroke-width="2.2" opacity="0.8"/>
          <path d="M150 118l8 -14 8 14z" fill="#141f66"/><path d="M30 118l12 -20 14 20z" fill="#141f66"/>
        </g>
        <rect x="12" y="10" width="196" height="108" rx="16" fill="none" stroke="#364090" stroke-width="3"/>
      </svg>`;
    },
    set(svg, k) {
      const d = 2 + k * 90;   // from the surface (y 26) down to the floor (y 118)
      attr(svg, '.w1', { height: d.toFixed(2) });
      attr(svg, '.w2', { y: (26 + d * 0.55).toFixed(2), height: (d * 0.45).toFixed(2) });
      attr(svg, '.edge', { d: `M12 ${(26 + d).toFixed(2)}H208`, opacity: k > 0.02 ? 1 : 0 });
    },
  },
};

export function mount(el, settings, ctx = {}) {
  injectCss();
  const feel = ctx.feel || { sound() {}, tick() {}, pop() {} };
  const S = settings;
  const root = document.createElement('div');
  root.className = `pi form-${S.form}`;
  el.append(root);
  const fns = new Set();
  const cleanups = [];
  let value = null, answered = false, locked = false;
  const set = (v, done) => {
    value = v;
    answered = done;
    for (const fn of fns) fn({ value: clone(value), answered });
  };

  // ---------------------------------------------------------------- choice
  function choice() {
    const opts = S.shuffle ? shuffled(S.options) : S.options.slice();
    root.innerHTML = `<div class="pi-rows">${opts.map((o, i) => `<button class="pi-opt" data-id="${esc(o.id)}" data-sound="select"><span class="k">${i + 1}</span><span>${esc(o.text)}</span></button>`).join('')}</div>`;
    const onTap = e => {
      const b = e.target.closest('.pi-opt');
      if (!b || locked) return;
      for (const x of root.querySelectorAll('.pi-opt')) x.classList.toggle('on', x === b);
      set(b.dataset.id, true);
    };
    root.addEventListener('click', onTap);
    cleanups.push(() => root.removeEventListener('click', onTap));
    return {
      reveal(answer) {
        for (const x of root.querySelectorAll('.pi-opt')) {
          x.classList.toggle('right', x.dataset.id === answer);
          x.classList.toggle('wrong', x.dataset.id === value && value !== answer);
        }
      },
      reset() { for (const x of root.querySelectorAll('.pi-opt')) x.className = 'pi-opt'; set(null, false); },
    };
  }

  // ---------------------------------------------------------------- slider
  // It starts at a real value with its fill showing (`start`, or the middle of the scale), so there's
  // always something to see and something to check. A picture above it (`picture`) follows the value:
  // its low end at `pictureFrom`, its high end at `pictureTo` (the ends of the scale unless the lesson
  // says). The thumb and its chip move by transform, on their own layer, at whole device pixels: nothing
  // under them is repainted as they move, so nothing is left behind.
  function slider() {
    const log = S.scale === 'log' && S.min > 0 && S.max > S.min;
    const lo = Math.min(S.min, S.max), hi = Math.max(S.min, S.max);
    const clampV = v => Math.min(hi, Math.max(lo, v));
    const toPos = v => (hi === lo ? 0.5 : log ? Math.log(clampV(v) / lo) / Math.log(hi / lo) : (clampV(v) - lo) / (hi - lo));
    // a step wider than the whole scale leaves just its two ends
    const stepBy = S.step > 0 ? (hi > lo ? Math.min(S.step, hi - lo) : S.step) : 1;
    const snap = v => {
      const out = Math.round((v - (log ? 0 : lo)) / stepBy) * stepBy + (log ? 0 : lo);
      return Math.min(hi, Math.max(lo, Number(out.toFixed(6))));
    };
    const toVal = p => snap(log ? lo * Math.pow(hi / lo, p) : lo + (hi - lo) * p);
    const n = Math.max(0, Math.round(S.ticks));
    const ticks = n < 2 ? [] : Array.from({ length: n }, (_, i) => toVal(i / (n - 1)));
    const startAt = () => (typeof S.start === 'number' && Number.isFinite(S.start) ? snap(clampV(S.start)) : toVal(0.5));
    const pic = PICTURES[S.picture] || null;
    // where the picture is, 0 to 1, on the slider's own scale (stretched too, on a log slider)
    const pFrom = toPos(typeof S.pictureFrom === 'number' ? S.pictureFrom : lo), pTo = toPos(typeof S.pictureTo === 'number' ? S.pictureTo : hi);
    const picK = v => (pTo === pFrom ? (toPos(v) >= pTo ? 1 : 0) : Math.min(1, Math.max(0, (toPos(v) - pFrom) / (pTo - pFrom))));
    root.innerHTML = `${pic ? `<div class="pi-pic" aria-hidden="true">${pic.draw()}</div>` : ''}
      <div class="pi-track"><div class="pi-rail"></div><div class="pi-fill"></div><div class="pi-gap" hidden></div><div class="pi-mark" hidden></div>
        <div class="pi-thumb"></div><div class="pi-chip"></div><div class="pi-chip truth" hidden></div></div>
      <div class="pi-ticks">${ticks.map(t => `<span style="left:${(toPos(t) * 100).toFixed(2)}%">${esc(Number.isInteger(t) ? t.toLocaleString('en') : fmt(t, S.step, ''))}</span>`).join('')}</div>`;
    root.classList.toggle('with-pic', !!pic);
    const trackEl = root.querySelector('.pi-track'), thumb = root.querySelector('.pi-thumb'), chip = root.querySelector('.pi-chip');
    const fill = root.querySelector('.pi-fill'), picEl = root.querySelector('.pi-pic svg');
    let shown = null, width = 0;
    const show = v => {
      shown = v;
      width = trackEl.clientWidth || width;
      const x = devicePx(toPos(v) * width);
      thumb.style.transform = `translate3d(${x}px,0,0)`;
      chip.style.transform = `translate3d(${x}px,0,0) translateX(-50%)`;
      fill.style.width = `${Math.max(12, x + 6)}px`;
      chip.textContent = fmt(v, S.step, S.unit);
      if (pic) pic.set(picEl, picK(v));
    };
    // Laid out late (a lesson fades in, a sheet slides): place it again once its width is known.
    const ro = new ResizeObserver(() => { if (shown !== null && trackEl.clientWidth !== width) show(shown); });
    ro.observe(trackEl);
    cleanups.push(() => ro.disconnect());
    const from = x => {
      if (locked) return;
      const r = trackEl.getBoundingClientRect();
      const v = toVal(Math.min(1, Math.max(0, (x - r.left) / r.width)));
      if (v === value) return;
      show(v);
      set(v, true);
    };
    const begin = () => { show(startAt()); set(shown, true); };
    begin();
    cleanups.push(ctx.track(trackEl, {
      start: e => { root.classList.add('held'); from(e.clientX); },
      move: ({ x }) => from(x),
      release: () => { root.classList.remove('held'); if (!locked) feel.sound('select'); },
      cancel: () => root.classList.remove('held'),
      tap: e => { root.classList.remove('held'); from(e.clientX); feel.sound('select'); },
    }));
    return {
      reveal(answer) {
        root.classList.add('revealed');
        const truth = root.querySelector('.pi-chip.truth'), mark = root.querySelector('.pi-mark'), gap = root.querySelector('.pi-gap');
        const p = toPos(answer);
        mark.hidden = false; mark.style.left = `${(p * 100).toFixed(2)}%`;
        truth.hidden = false; truth.style.left = `${(p * 100).toFixed(2)}%`; truth.textContent = fmt(answer, S.step, S.unit);
        if (value !== null) {
          const a = Math.min(p, toPos(value)), b = Math.max(p, toPos(value));
          gap.hidden = false; gap.style.left = `${(a * 100).toFixed(2)}%`; gap.style.width = `${((b - a) * 100).toFixed(2)}%`;
        }
        if (feel.spring) feel.spring(truth, v => `translateX(-50%) scale(${v})`, 0.6, 1, { ms: 480 });
      },
      mark(kind) { chip.classList.add(kind); },
      reset() {
        root.classList.remove('revealed');
        for (const x of root.querySelectorAll('.pi-chip.truth, .pi-mark, .pi-gap')) x.hidden = true;
        chip.className = 'pi-chip';
        begin();
      },
    };
  }

  // ---------------------------------------------------------------- number
  function number() {
    const dot = S.step < 1, minus = S.min < 0;
    let typed = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', minus ? '±' : dot ? '.' : '', '0', '⌫'];
    if (minus && dot) keys[9] = '.';
    root.innerHTML = `<div class="pi-display"><span class="d unset">?</span><span class="u">${esc(S.unit)}</span></div><div class="pi-truthline" hidden></div>
      <div class="pi-keys">${keys.map(k => `<button class="pi-key${k ? '' : ' off'}" data-k="${esc(k)}" data-sound="select" aria-label="${k === '⌫' ? 'Delete' : esc(k)}">${esc(k)}</button>`).join('')}</div>
      ${minus && dot ? '<div class="pi-keys" style="margin-top:8px"><span></span><button class="pi-key" data-k="±" data-sound="select">±</button><span></span></div>' : ''}`;
    const d = root.querySelector('.d');
    const draw = () => {
      d.textContent = typed || '?';
      d.classList.toggle('unset', !typed);
      const v = Number(typed);
      set(typed && typed !== '-' && typed !== '.' && Number.isFinite(v) ? v : null, !!typed && Number.isFinite(v) && typed !== '-');
    };
    const onTap = e => {
      const b = e.target.closest('.pi-key');
      if (!b || locked) return;
      const k = b.dataset.k;
      if (k === '⌫') typed = typed.slice(0, -1);
      else if (k === '±') typed = typed.startsWith('-') ? typed.slice(1) : `-${typed}`;
      else if (k === '.') { if (!typed.includes('.')) typed = (typed || '0') + '.'; }
      else if (typed.replace(/[-.]/g, '').length < 9) typed = typed === '0' ? k : typed + k;
      draw();
    };
    root.addEventListener('click', onTap);
    cleanups.push(() => root.removeEventListener('click', onTap));
    return {
      reveal(answer) {
        const line = root.querySelector('.pi-truthline');
        line.hidden = false;
        line.textContent = fmt(answer, S.step, S.unit);
        feel.pop(line);
      },
      mark(kind) { root.querySelector('.pi-display').classList.add(kind); },
      reset() { typed = ''; draw(); },
    };
  }

  // ---------------------------------------------------------------- order
  function order() {
    let ids = (S.shuffle === false ? S.items : shuffled(S.items, true)).map(i => i.id);
    const byId = Object.fromEntries(S.items.map(i => [i.id, i]));
    const ends = S.ends || [];
    let picked = null;
    const draw = () => {
      root.innerHTML = `${ends[0] ? `<p class="pi-end">${esc(ends[0])}</p>` : ''}<div class="pi-rows">${ids.map(id => `<button class="pi-item" data-id="${esc(id)}" data-sound="select" data-nospring><span class="pi-grip"><i></i><i></i><i></i></span><span class="t">${esc(byId[id].text)}</span><span class="n"></span></button>`).join('')}</div>${ends[1] ? `<p class="pi-end last">${esc(ends[1])}</p>` : ''}`;
    };
    draw();
    set(ids.slice(), true);
    const rowH = () => { const a = root.querySelectorAll('.pi-item'); return a.length > 1 ? a[1].getBoundingClientRect().top - a[0].getBoundingClientRect().top : 62; };
    let drag = null;
    const stopTrack = ctx.track(root, {
      blocked: e => locked || !e.target.closest('.pi-item'),
      start: e => {
        const item = e.target.closest('.pi-item');
        drag = { item, from: ids.indexOf(item.dataset.id), h: rowH(), to: null };
      },
      move: ({ dy }) => {
        if (!drag) return;
        drag.item.classList.add('lift');
        drag.item.style.transform = `translate3d(0,${devicePx(dy)}px,0) scale(1.02)`;
        const to = Math.max(0, Math.min(ids.length - 1, drag.from + Math.round(dy / drag.h)));
        if (to !== drag.to) {
          if (drag.to !== null) feel.tick();
          drag.to = to;
          root.querySelectorAll('.pi-item').forEach((x, i) => {
            if (x === drag.item) return;
            const shift = drag.from < to && i > drag.from && i <= to ? -drag.h : drag.from > to && i >= to && i < drag.from ? drag.h : 0;
            x.style.transform = shift ? `translateY(${shift}px)` : '';
          });
        }
      },
      release: () => {
        if (!drag) return;
        const { from: a, to: b, item } = drag;
        drag = null;
        const was = item.getBoundingClientRect().top;
        if (b !== null && b !== a) {
          const [id] = ids.splice(a, 1);
          ids.splice(b, 0, id);
        }
        draw();
        // It drops into its place from where the finger left it, with the spring.
        const now = root.querySelector(`.pi-item[data-id="${CSS.escape(item.dataset.id)}"]`);
        if (now && feel.spring) feel.spring(now, v => `translateY(${v}px)`, was - now.getBoundingClientRect().top, 0);
        feel.sound('select');
        set(ids.slice(), true);
      },
      cancel: () => { drag = null; draw(); },
      tap: e => {
        const item = e.target.closest('.pi-item');
        drag = null;
        if (!item) return;
        if (picked === null) { picked = item.dataset.id; item.classList.add('picked'); return; }
        if (picked !== item.dataset.id) {
          const i = ids.indexOf(picked), j = ids.indexOf(item.dataset.id);
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        picked = null;
        draw();
        set(ids.slice(), true);
      },
    });
    cleanups.push(stopTrack);
    return {
      reveal(answer) {
        root.classList.add('revealed');
        root.querySelectorAll('.pi-item').forEach((x, i) => {
          const at = (answer || []).indexOf(x.dataset.id);
          x.classList.add(at === i ? 'right' : 'wrong');
          x.querySelector('.n').textContent = String(at + 1);
        });
      },
      reset() { root.classList.remove('revealed'); ids = shuffled(S.items, true).map(i => i.id); draw(); set(ids.slice(), true); },
    };
  }

  // ---------------------------------------------------------------- match
  function match() {
    const COLOURS = ['#49c6ff', '#ffc83d', '#2bc4a4', '#ee4b7a', '#a67cf5'];
    const left = S.left, right = S.shuffle ? shuffled(S.right) : S.right.slice();
    let pairs = {}, holding = null; // holding: { side, id }
    root.innerHTML = `<div class="pi-match"><div class="col">${left.map(x => `<button class="pi-cell" data-side="l" data-id="${esc(x.id)}" data-sound="select"><span class="dot"></span>${esc(x.text)}</button>`).join('')}</div>
      <div class="col">${right.map(x => `<button class="pi-cell" data-side="r" data-id="${esc(x.id)}" data-sound="select"><span class="dot"></span>${esc(x.text)}</button>`).join('')}</div></div>`;
    const paint = () => {
      const colourOf = {};
      left.forEach((x, i) => { if (pairs[x.id]) { colourOf[`l:${x.id}`] = COLOURS[i % COLOURS.length]; colourOf[`r:${pairs[x.id]}`] = COLOURS[i % COLOURS.length]; } });
      for (const c of root.querySelectorAll('.pi-cell')) {
        const k = `${c.dataset.side}:${c.dataset.id}`;
        const col = colourOf[k];
        c.style.borderColor = col || '';
        c.querySelector('.dot').style.background = col || '';
        c.classList.toggle('on', !!holding && holding.side === c.dataset.side && holding.id === c.dataset.id);
      }
      set({ ...pairs }, Object.keys(pairs).length === left.length);
    };
    const onTap = e => {
      const c = e.target.closest('.pi-cell');
      if (!c || locked) return;
      const side = c.dataset.side, id = c.dataset.id;
      const pairedLeft = side === 'l' ? (pairs[id] ? id : null) : Object.keys(pairs).find(k => pairs[k] === id);
      if (pairedLeft && !holding) { delete pairs[pairedLeft]; paint(); return; }
      if (!holding || holding.side === side) { holding = holding && holding.id === id ? null : { side, id }; paint(); return; }
      const l = side === 'l' ? id : holding.id, r = side === 'r' ? id : holding.id;
      for (const k of Object.keys(pairs)) if (k === l || pairs[k] === r) delete pairs[k];
      pairs[l] = r;
      holding = null;
      paint();
    };
    root.addEventListener('click', onTap);
    cleanups.push(() => root.removeEventListener('click', onTap));
    paint();
    return {
      reveal(answer) {
        for (const c of root.querySelectorAll('.pi-cell[data-side="l"]')) {
          const want = (answer || {})[c.dataset.id];
          const ok = pairs[c.dataset.id] === want;
          c.classList.add(ok ? 'right' : 'wrong');
          if (!ok) {
            const r = S.right.find(x => x.id === want);
            if (r) c.insertAdjacentHTML('beforeend', `<small>${esc(r.text)}</small>`);
          }
        }
      },
      reset() { pairs = {}; holding = null; paint(); },
    };
  }

  // ---------------------------------------------------------------- spot
  function spot() {
    root.innerHTML = `<div class="pi-spot" style="aspect-ratio:${(1 / (S.aspect || 0.62)).toFixed(3)}">${S.figure ? '<img alt="">' : SAMPLE}</div>`;
    const box = root.querySelector('.pi-spot');
    if (S.figure) Promise.resolve(ctx.media ? ctx.media(S.figure) : S.figure).then(url => { const img = box.querySelector('img'); if (img && url) img.src = url; });
    let pin = null;
    const put = (x, y) => {
      if (!pin) { pin = document.createElement('i'); pin.className = 'pi-pin'; box.append(pin); }
      pin.style.left = `${x * 100}%`; pin.style.top = `${y * 100}%`;
      feel.pop(pin);
      set({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) }, true);
    };
    cleanups.push(ctx.track(box, {
      blocked: () => locked,
      tap: e => {
        const r = box.getBoundingClientRect();
        put(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
        feel.sound('select');
        feel.tick();
      },
    }));
    return {
      reveal(answer) {
        box.classList.add('revealed');
        const ring = document.createElement('i');
        ring.className = 'pi-ring';
        const w = box.clientWidth;
        ring.style.left = `${answer.x * 100}%`; ring.style.top = `${answer.y * 100}%`;
        ring.style.width = ring.style.height = `${answer.r * 2 * w}px`;
        box.append(ring);
        if (pin && value && Math.hypot(value.x - answer.x, value.y - answer.y) <= answer.r) pin.classList.add('right');
        feel.pop(ring);
      },
      reset() { if (pin) pin.remove(); pin = null; box.querySelectorAll('.pi-ring').forEach(r => r.remove()); set(null, false); },
    };
  }

  const FORMS = { choice, slider, number, order, match, spot };
  const api = (FORMS[S.form] || choice)();
  return {
    calls: {
      reveal: answer => api.reveal(answer),
      lock: () => { locked = true; root.classList.add('locked'); },
      reset: () => { locked = false; root.classList.remove('locked'); api.reset(); },
      // How the lesson marked it, for the forms that colour the answer given (slider, number).
      mark: kind => api.mark && api.mark(kind),
    },
    state: () => ({ value: clone(value), answered }),
    on: (name, fn) => { if (name === 'change') { fns.add(fn); return () => fns.delete(fn); } return () => {}; },
    remove: () => { for (const f of cleanups) try { f(); } catch { /* already gone */ } fns.clear(); root.remove(); },
  };
}
