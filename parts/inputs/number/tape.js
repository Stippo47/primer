// Number, as a tape: a ruler that slides under a fixed gold needle. Drag it, or flick it and let it run
// on and settle; tap a mark to go to it. Each step that passes the needle gives a tick, and the number at
// the needle is written large above it. It always holds a real number (`start`, else 0), as the slider
// does, and stops at the ends of its range with a little give. Only the ruler's marks are redrawn as it
// moves; nothing slides over anything else. The unit is written beside the number. Once checked and
// wrong, the tape glides until the true number is under the needle, written in gold, with what was given
// still marked on the ruler and on a tag at the corner.
import { esc } from '../kit.js';
import { range, tidy, startOf, show, differs, givenTag, markGiven, clearGiven } from './common.js';
import { time } from '../clock.js';

export const css = `
.pi-tape { position: relative; padding: 10px 0 14px; border-radius: 22px; background: #1b2250; border: 3px solid #364090; box-shadow: 0 5px 0 #2f3678; overflow: hidden; }
.pi-tape.right { border-color: #2bc4a4; box-shadow: 0 5px 0 #127a85; }
.pi-tape.close { border-color: #ffc83d; box-shadow: 0 5px 0 #c98a00; }
.pi-tape.wrong { border-color: #ee4b7a; box-shadow: 0 5px 0 #8f1f44; }
.pi-tape .pi-nread { margin-bottom: 12px; }
.pi-tape .pi-nread .u { font-size: 22px; color: #9aa3d6; }
.pi-tband { position: relative; height: 78px; touch-action: none; }
.pi-tband svg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; }
.pi-tband::before, .pi-tband::after { content: ""; position: absolute; top: 0; bottom: 0; width: 56px; z-index: 1; pointer-events: none; }
.pi-tband::before { left: 0; background: linear-gradient(90deg, #1b2250, rgba(27, 34, 80, 0)); }
.pi-tband::after { right: 0; background: linear-gradient(270deg, #1b2250, rgba(27, 34, 80, 0)); }
.pi-tape .needle { position: absolute; left: 50%; top: -14px; width: 0; height: 0; margin-left: -10px; border: 10px solid transparent; border-top: 13px solid #ffc83d; z-index: 2; pointer-events: none; }
.pi-tape .needle::after { content: ""; position: absolute; left: -2px; top: 0; width: 4px; height: 78px; border-radius: 2px; background: #ffc83d; }
`;

const LABEL_EVERY = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

export function mount(f) {
  const { root, S, feel } = f;
  const [lo, hi] = range(S);
  const step = S.step > 0 ? S.step : 1;
  const N = Math.max(1, Math.round((hi - lo) / step));
  const px = N <= 30 ? 30 : N <= 120 ? 18 : 13;                  // pixels from one step to the next
  const every = LABEL_EVERY.find(k => k * px >= 64) || 100000;    // a number under every this many steps
  root.innerHTML = `<div class="pi-tape"><div class="pi-nread"><b></b>${S.unit ? `<span class="u">${esc(S.unit)}</span>` : ''}</div>
      <div class="pi-tband"><svg aria-hidden="true"><rect class="paper" x="0" y="8" height="62" fill="#ffffff"/><rect class="paper-edge" x="0" y="66" height="4" fill="#b9c2ee"/>
        <path class="gap" fill="#ffc83d" opacity="0.4"/><path class="marks" stroke="#1b1f5e" stroke-width="2.4" stroke-linecap="round"/>
        <path class="given" stroke="#ee4b7a" stroke-width="5" stroke-linecap="round"/><path class="truth" stroke="#e8a91c" stroke-width="5" stroke-linecap="round"/><g class="nums" fill="#1b1f5e" font-size="14" font-weight="900" text-anchor="middle">${'<text/>'.repeat(14)}</g></svg>
        <i class="needle"></i></div></div>`;
  const tape = root.querySelector('.pi-tape'), band = root.querySelector('.pi-tband'), svg = band.querySelector('svg');
  const read = root.querySelector('.pi-nread b'), marks = svg.querySelector('.marks'), nums = [...svg.querySelectorAll('.nums text')];
  const valueAt = s => tidy(S, lo + Math.round(s) * step);
  let pos = 0, truthS = null, givenS = null, anim = 0;
  const label = v => (Number.isInteger(v) ? v.toLocaleString('en') : show({ ...S, unit: '' }, v));
  const draw = () => {
    const W = band.clientWidth || 340, cx = W / 2;
    svg.querySelector('.paper').setAttribute('width', W); svg.querySelector('.paper-edge').setAttribute('width', W);
    const from = Math.max(0, Math.floor(pos - cx / px) - 1), to = Math.min(N, Math.ceil(pos + cx / px) + 1);
    let d = '', k = 0;
    for (let s = from; s <= to; s++) {
      const x = (cx + (s - pos) * px).toFixed(1), big = s % every === 0, mid = !big && every % 2 === 0 && s % (every / 2) === 0 && (every / 2) * px >= 24;
      d += `M${x} 8v${big ? 26 : mid ? 18 : 11}`;
      if (big && k < nums.length) { const t = nums[k++]; t.setAttribute('x', x); t.setAttribute('y', '56'); t.textContent = label(lo + s * step); }
    }
    for (; k < nums.length; k++) nums[k].textContent = '';
    marks.setAttribute('d', d);
    const xs = s => cx + (s - pos) * px;
    svg.querySelector('.truth').setAttribute('d', truthS === null ? '' : `M${xs(truthS).toFixed(1)} 9v58`);
    svg.querySelector('.given').setAttribute('d', truthS === null || givenS === null ? '' : `M${xs(givenS).toFixed(1)} 9v58`);
    svg.querySelector('.gap').setAttribute('d', truthS === null || givenS === null ? '' : `M${Math.min(xs(truthS), xs(givenS)).toFixed(1)} 8h${Math.abs(xs(truthS) - xs(givenS)).toFixed(1)}v62h-${Math.abs(xs(truthS) - xs(givenS)).toFixed(1)}z`);
  };
  // the tape at a place (in steps, maybe between two); the number at the needle is the nearest step's.
  // `place` only shows it (the truth gliding in); `go` gives it as the answer too.
  const place = s => {
    pos = s;
    draw();
    const v = valueAt(Math.min(N, Math.max(0, s)));
    read.textContent = label(v);
    return v;
  };
  const go = s => {
    if (f.locked()) { stop(); return; }
    const v = place(s);
    if (v !== f.value()) { f.set(v, true); feel.tick(); }
  };
  const stop = () => { if (anim) cancelAnimationFrame(anim); anim = 0; };
  // glides to a step, slowing as it comes in. Its time is the inputs' one clock (in ms), so a film or a
  // test that holds the clock holds the tape too; with reduced motion asked for, it's there at once.
  const ms = () => time() * 1000;
  const glide = (target, to = go) => {
    stop();
    const s0 = pos, t0 = ms(), span = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min(420, 160 + Math.abs(target - s0) * 18);
    const frame = () => { const k = Math.min(1, Math.max(0, (ms() - t0) / span)), e = 1 - (1 - k) ** 3; to(s0 + (target - s0) * e); anim = k < 1 ? requestAnimationFrame(frame) : 0; };
    anim = requestAnimationFrame(frame);
  };
  // a flick runs on and slows down, then settles on the nearest step
  const coast = v => {
    stop();
    let vel = v, last = ms();
    const frame = () => {
      const now = ms(), dt = Math.max(0, Math.min(40, now - last)); last = now;
      vel *= Math.pow(0.994, dt);
      let s = pos + vel * dt;
      if (s < 0 || s > N) { s = Math.min(N, Math.max(0, s)); vel = 0; }
      go(s);
      if (Math.abs(vel) > 0.004) anim = requestAnimationFrame(frame); else glide(Math.round(pos));
    };
    anim = requestAnimationFrame(frame);
  };
  const give = s => (s < 0 ? -Math.sqrt(-s) * 0.6 : s > N ? N + Math.sqrt(s - N) * 0.6 : s);
  const begin = () => { stop(); pos = (startOf(S) - lo) / step; draw(); read.textContent = label(startOf(S)); f.set(startOf(S), true); };
  begin();
  const ro = new ResizeObserver(() => draw());
  ro.observe(band);
  f.cleanup(() => { ro.disconnect(); stop(); });
  let pos0 = 0;
  f.cleanup(f.ctx.track(band, {
    blocked: () => f.locked(),
    start: () => { stop(); pos0 = pos; },
    move: ({ dx }) => go(give(pos0 - dx / px)),
    release: ({ vx }) => { const v = -vx / px; if (Math.abs(v) > 0.01 && pos >= 0 && pos <= N) coast(v); else glide(Math.min(N, Math.max(0, Math.round(pos)))); feel.sound('select'); },
    cancel: () => glide(Math.min(N, Math.max(0, Math.round(pos)))),
    tap: e => { const r = band.getBoundingClientRect(); glide(Math.min(N, Math.max(0, Math.round(pos + (e.clientX - r.left - r.width / 2) / px)))); feel.sound('select'); },
  }));
  return {
    reveal(answer) {
      if (!differs(S, f.value(), answer)) return;
      truthS = (tidy(S, answer) - lo) / step;
      givenS = f.value() === null ? null : (f.value() - lo) / step;
      givenTag(root, tape, S, f.value(), feel);
      root.querySelector('.pi-nread').classList.add('truth');
      glide(truthS, place);
    },
    mark(kind) {
      tape.classList.add(kind);
      root.querySelector('.pi-nread').classList.add(kind);
      markGiven(root, kind);
      svg.querySelector('.given').setAttribute('stroke', { right: '#2bc4a4', close: '#ffc83d', wrong: '#ee4b7a' }[kind] || '#ee4b7a');
    },
    reset() { tape.className = 'pi-tape'; root.querySelector('.pi-nread').className = 'pi-nread'; truthS = givenS = null; clearGiven(root); begin(); },
    debug: () => ({ pos, px, every }),
  };
}
