// The combo, drawn: right answers in a row as a chip with five pips beside it, which comes alive as the run
// grows (ruled 2026-11-18: tiers, not flames; each tier livelier than the last, calmly).
//
//   plain     below 5    the flat plate, no motion
//   bronze    5          warm metal with a highlight band; a glint now and then
//   silver    10         cool metal; a slow shine sweeps across it
//   gold      15         the shine, and a soft glow behind it that breathes
//   crystal   25         purple, cut into facets that shimmer in a slow wave; a few small sparkles
//   diamond   40         pale and finely cut; prismatic glints, a faint rainbow sweep, the glow
//   aurora    60         a night-sky chip with northern lights drifting through it, its stars twinkling and
//                        a spark circling its rim
//
// The thresholds are in TIERS, and nowhere else. Every material is drawn the app's way: flat tones lit from
// the upper left (art.js), a highlight band or facets, never photographic metal.
//
// Reaching a tier is a short moment, under a second: the chip swells and settles, a few bits of the tier's
// colour burst from it with a ring, and the phone ticks; then the tier's idle motion starts. A wrong answer
// lets the old chip sink a little and fade away, with plain ×0 coming up under it. Close holds the combo.
//
// Reduced motion (the system's setting, or `still: true` from a caller): the tiers keep their colours and
// materials, and nothing idles, swells, bursts or falls. The tick stays; it isn't motion.
//
// Cheap on the phone: idle motion is CSS animations of transform and opacity, each on a small layer of its
// own; glows are soft gradients, never blur; the static material is one small SVG, redrawn only when the
// tier or the chip's width changes; a moment is a few Web Animations that tidy up after themselves.
//
// One part for everything that shows a combo: the review run (new Combo), its summary, Practice's best-combo
// chip and Profile's tile (tierClass, tierCrown). Its styles are css/combo.css; tier colours are custom
// properties on a tier-<id> class, so anything inside one picks them up.
import * as feel from './feel.js';
import { spring, out as easeOut, rgba } from './ease.js';
import { crown, glint, uid } from './art.js';

// The tiers, by how many right in a row reach each.
export const TIERS = [
  { id: 'plain', at: 0 },
  { id: 'bronze', at: 5 },
  { id: 'silver', at: 10 },
  { id: 'gold', at: 15 },
  { id: 'crystal', at: 25 },
  { id: 'diamond', at: 40 },
  { id: 'aurora', at: 60 },
];

export function tierOf(n = 0) {
  let t = TIERS[0];
  for (const x of TIERS) if (n >= x.at) t = x;
  return t;
}
const rank = n => TIERS.indexOf(tierOf(n));
export const tierClass = n => `tier-${tierOf(n).id}`;

export const PIPS = 5;        // every five in a row fills the pips
const H = 40;                 // the chip's height; its width follows the digits (widthFor)
export const widthFor = n => [52, 60, 72, 84][Math.min(String(Math.max(0, n)).length, 4) - 1];

// ---------------------------------------------------------------- how each tier looks

// face: how the material is cut. burst: the colours of the bits that fly when it's reached. sparks: glints
// round the chip, each { x (a share of the width), y (px from the top), r, d (delay, s), p (period, s), c }.
// crown: the best-combo crown in this tier's metal (art.js crown). All periods divide six seconds, so a
// six-second film of any tier loops without a seam.
const LOOK = {
  plain: { face: 'plain', burst: ['#aab3ee'], sparks: [],
    crown: { base: '#8e96d0', shade: '#5f67a8', lit: '#bcc3f0', jewel: '#4b5398', shine: '#8d95d6' } },
  bronze: { face: 'metal', base: '#c97a42', lit: '#e69c62', shade: '#a55c2c', hi: '#ffd6ad', burst: ['#f2b27a', '#ffd6ad', '#d9874c'],
    sparks: [{ x: -0.02, y: 5, r: 5.5, d: 1, p: 6, c: '#ffe3c6' }, { x: 1.01, y: 31, r: 4.5, d: 4, p: 6, c: '#fff' }],
    crown: { base: '#d4844a', shade: '#9c5228', lit: '#f2b88a', jewel: '#ee4b7a', shine: '#ffc2d4' } },
  silver: { face: 'metal', base: '#c4cde4', lit: '#e7edfa', shade: '#99a4c5', hi: '#ffffff', shine: true, burst: ['#e7edfa', '#ffffff', '#b4bfdc'],
    sparks: [{ x: 0.98, y: 4, r: 5.5, d: 2.2, p: 6, c: '#fff' }],
    crown: { base: '#c9d2e8', shade: '#8791b6', lit: '#f4f7ff', jewel: '#49c6ff', shine: '#c9f0ff' } },
  gold: { face: 'metal', base: '#ffc83d', lit: '#ffde7c', shade: '#e8a51a', hi: '#fff4c8', shine: true, glow: true, burst: ['#ffd75a', '#fff1b8', '#ffb31a'],
    sparks: [{ x: -0.03, y: 5, r: 6, d: 1.2, p: 6, c: '#fff6d6' }, { x: 1.01, y: 31, r: 5, d: 4.2, p: 6, c: '#fff' }],
    crown: {} },
  crystal: { face: 'crystal', glow: true, burst: ['#c9a8ff', '#efe3ff', '#9b6cf0'],
    sparks: [{ x: -0.07, y: 8, r: 5, d: 0, p: 3, c: '#efe3ff' }, { x: 0.86, y: -5, r: 5.5, d: 0.75, p: 3, c: '#fff' },
      { x: 1.07, y: 27, r: 4.5, d: 1.5, p: 3, c: '#dccbff' }, { x: 0.2, y: 41, r: 4, d: 2.25, p: 3, c: '#fff' }],
    crown: { base: '#a67cf5', shade: '#6f43c9', lit: '#d9c6ff', jewel: '#ff9ab8', shine: '#ffe3ec' } },
  diamond: { face: 'diamond', glow: true, shine: 'prism', burst: ['#ff6fa3', '#ffcf3d', '#2fd0ff', '#2fe0a0', '#a67cf5'],
    sparks: [{ x: 0.2, y: 6, r: 5.5, d: 0, p: 3, c: '#ff6fa3', core: true }, { x: 0.84, y: 8, r: 5, d: 0.6, p: 3, c: '#ffcf3d', core: true },
      { x: 0.62, y: 31, r: 5, d: 1.2, p: 3, c: '#2fd0ff', core: true }, { x: 1.05, y: 17, r: 5.5, d: 1.8, p: 3, c: '#2fe0a0', core: true },
      { x: -0.05, y: 24, r: 5, d: 2.4, p: 3, c: '#a67cf5', core: true }],
    crown: { base: '#d7f1ff', shade: '#8fc6ea', lit: '#ffffff', jewel: '#49c6ff', shine: '#e6fbff' } },
  aurora: { face: 'aurora', glow: true, orbit: true, burst: ['#7df0cf', '#2bc4a4', '#a67cf5', '#ff9ab8', '#6fd6ff'],
    sparks: [{ x: 0.96, y: -3, r: 5, d: 3, p: 6, c: '#c8fff0' }],
    crown: { base: '#2bc4a4', shade: '#6a4cd6', lit: '#9ff7df', jewel: '#a67cf5', shine: '#e3d6ff' } },
};

// The best run's crown, drawn in its tier's metal: 30 x 24, like art.js's crown.
export const tierCrown = n => crown(LOOK[tierOf(n).id].crown);

// ---------------------------------------------------------------- drawing the material

const f1 = v => +v.toFixed(1);
const pathOf = pts => `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`;
const poly = (pts, fill, o = 1) => `<path d="${pathOf(pts)}" fill="${fill}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
const clipOf = pts => `clip-path:polygon(${pts.map(([x, y]) => `${f1(x)}px ${f1(y)}px`).join(',')})`;
// the bright stroke at the upper left that every lit thing in the app has
const shineArc = o => `<path d="M4.6 ${H * 0.36}Q4.6 4.8 12.5 4.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="${o}"/>`;
// A facet that catches the light: a white (or tinted) copy of it, shown in turn by the idle motion. o is how
// bright it gets, as the colour's own opacity (the animation takes the layer from nothing to full).
const flash = (pts, d, o = 0.5, c = '#ffffff') => `<i class="fx" style="${clipOf(pts)};--d:${d}s;background:${rgba(c, o)}"></i>`;

// The crystal's cut on a W x H chip, a step cut: a table in the middle split along a slant, and bevels round
// it, the top and bottom ones split in two.
function stepCut(W) {
  const a = 9, b = 7, c = 10, m = W / 2;
  const TL = [0, 0], TR = [W, 0], BR = [W, H], BL = [0, H], tl = [a, b], tr = [W - a, b], br = [W - a, H - c], bl = [a, H - c];
  const Mt = [m, 0], mt = [m, b], Mb = [m, H], mb = [m, H - c];
  const s0 = [W * 0.4, b], s1 = [W * 0.6, H - c];
  return {
    bevel: { topL: [TL, Mt, mt, tl], topR: [Mt, TR, tr, mt], left: [TL, tl, bl, BL], right: [TR, BR, br, tr], botL: [BL, bl, mb, Mb], botR: [Mb, mb, br, BR] },
    table: { a: [tl, s0, s1, bl], b: [s0, tr, br, s1] },
  };
}

// The diamond's, a brilliant seen from above: an eight-sided table, a star facet on each of its long sides
// reaching to the edge, and three facets fanning from each corner.
function brilliant(W) {
  const a = 9, b = 7, c = 10, k = 4, cy = (b + H - c) / 2;
  const t1 = [a + k, b], t2 = [W - a - k, b], t3 = [W - a, b + k], t4 = [W - a, H - c - k], t5 = [W - a - k, H - c], t6 = [a + k, H - c], t7 = [a, H - c - k], t8 = [a, b + k];
  const TL = [0, 0], TR = [W, 0], BR = [W, H], BL = [0, H], Mt = [W / 2, 0], Mb = [W / 2, H], Ml = [0, cy], Mr = [W, cy];
  return {
    table: [t1, t2, t3, t4, t5, t6, t7, t8],
    star: { top: [t1, t2, Mt], bottom: [t6, t5, Mb], left: [t8, t7, Ml], right: [t3, t4, Mr] },
    corner: {
      tl: [[TL, Mt, t1], [TL, t1, t8], [TL, t8, Ml]], tr: [[TR, t2, Mt], [TR, t3, t2], [TR, Mr, t3]],
      br: [[BR, t4, Mr], [BR, t5, t4], [BR, Mb, t5]], bl: [[BL, t6, Mb], [BL, t7, t6], [BL, Ml, t7]],
    },
  };
}

// The waves of light in the aurora chip: bands that repeat every W, drawn 2W wide so the strip can slide by W
// and land where it started.
function ribbons(W) {
  const band = (y0, amp, ph, t0, tAmp, fill, o) => {
    const top = [], bot = [];
    for (let i = 0; i <= 32; i++) {
      const x = (i / 32) * 2 * W, k = (x / W) * Math.PI * 2;
      const y = y0 + amp * Math.sin(k + ph), t = (t0 + tAmp * Math.sin(k + ph + 1.3)) / 2;
      top.push([x, y - t]);
      bot.unshift([x, y + t]);
    }
    return poly([...top, ...bot], fill, o);
  };
  return band(H * 0.44, 5, 0, 9, 3, '#2bc4a4', 0.72) + band(H * 0.64, 4, 2.2, 7, 2.5, '#a67cf5', 0.62)
    + band(H * 0.34, 5, 0.5, 2.6, 0.8, '#7df0cf', 0.85) + band(H * 0.74, 3, 3.1, 2.2, 0.6, '#ff9ab8', 0.5);
}

// The chip's insides for a tier at width W: the static material (one SVG), and the layers that move over it.
function face(id, W) {
  const L = LOOK[id];
  const svgOf = body => `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body}</svg>`;
  if (L.face === 'plain') return svgOf(`<rect width="${W}" height="${H}" fill="#222a60"/>`);
  if (L.face === 'metal') {
    // a lit band across the top, a shade along the bottom, a fine bright line on the band's edge
    const band = `M0 0H${W}V${f1(H * 0.3)}C${f1(W * 0.62)} ${f1(H * 0.36)} ${f1(W * 0.32)} ${f1(H * 0.4)} 0 ${f1(H * 0.47)}Z`;
    const edge = `M0 ${f1(H * 0.47 + 1.4)}C${f1(W * 0.32)} ${f1(H * 0.4 + 1.4)} ${f1(W * 0.62)} ${f1(H * 0.36 + 1.4)} ${W} ${f1(H * 0.3 + 1.4)}`;
    const low = `M0 ${f1(H * 0.8)}C${f1(W * 0.4)} ${f1(H * 0.74)} ${f1(W * 0.7)} ${f1(H * 0.68)} ${W} ${f1(H * 0.6)}V${H}H0Z`;
    const svg = svgOf(`<rect width="${W}" height="${H}" fill="${L.base}"/><path d="${band}" fill="${L.lit}"/><path d="${low}" fill="${L.shade}"/>
      <path d="${edge}" fill="none" stroke="${L.hi}" stroke-width="1.6" opacity="0.6"/>${shineArc(0.85)}`);
    return svg + (L.shine ? '<i class="cshine"></i>' : '');
  }
  if (L.face === 'crystal') {
    const { bevel: B, table: T } = stepCut(W);
    const svg = svgOf(poly(B.topL, '#cdb2ff') + poly(B.topR, '#bf9cff') + poly(B.left, '#b28df8') + poly(B.right, '#7b4bd6')
      + poly(B.botL, '#7442cc') + poly(B.botR, '#6233b8') + poly(T.a, '#a476f3') + poly(T.b, '#9161e8') + shineArc(0.7));
    // the light runs across the facets left to right, one after another
    const fx = flash(B.left, 0, 0.45) + flash(B.topL, 0.25, 0.55) + flash(T.a, 0.5, 0.35) + flash(T.b, 0.8, 0.35) + flash(B.topR, 1.05, 0.5) + flash(B.right, 1.3, 0.4);
    return svg + fx;
  }
  if (L.face === 'diamond') {
    const { table: T, star: S, corner: C } = brilliant(W);
    // lit from the upper left: each corner's three facets in its own tones, the light ones toward the light
    const tones = { tl: ['#ffffff', '#f2fbff', '#e6f6ff'], tr: ['#eaf8ff', '#d9f1fe', '#c3e7fb'], br: ['#a6d6f3', '#94cbee', '#b0dcf6'], bl: ['#c9e9fb', '#d6effd', '#bde3f9'] };
    let body = '';
    for (const [corner, tris] of Object.entries(C)) tris.forEach((t, i) => { body += poly(t, tones[corner][i]); });
    body += poly(S.top, '#f7fdff') + poly(S.left, '#e2f5ff') + poly(S.right, '#b8e2f9') + poly(S.bottom, '#a9d8f4') + poly(T, '#e9f7ff');
    // its fire: a little colour caught in a few facets
    body += poly(C.tr[2], '#ff9ac4', 0.32) + poly(C.bl[1], '#ffe066', 0.3) + poly(C.br[0], '#7fe6ff', 0.3) + poly(S.right, '#c9a8ff', 0.22);
    const svg = svgOf(body + shineArc(0.9));
    const fx = flash(C.tl[1], 0, 0.75) + flash(S.left, 0.3, 0.6, '#ffd1e4') + flash(S.top, 0.6, 0.75) + flash(T, 0.9, 0.45, '#fff4bf')
      + flash(C.tr[1], 1.2, 0.6, '#c8f6ff') + flash(S.right, 1.5, 0.6) + flash(C.br[1], 1.8, 0.55, '#d8ffe9') + flash(S.bottom, 2.1, 0.55, '#ffd1e4');
    return svg + fx + '<i class="cshine prism"></i>';
  }
  // aurora: a night sky, lighter at the top, its waves of light sliding through, stars, and a rim of light
  const id2 = uid('crim');
  const sky = svgOf(`<rect width="${W}" height="${H}" fill="#221e68"/><path d="M0 ${f1(H * 0.62)}C${f1(W * 0.4)} ${f1(H * 0.56)} ${f1(W * 0.7)} ${f1(H * 0.6)} ${W} ${f1(H * 0.54)}V${H}H0Z" fill="#191558"/>`);
  const strip = `<i class="crib" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${ribbons(W)}</svg></i>`;
  const stars = [[0.14, 8, 1.7, 0], [0.4, 5, 1.3, 1], [0.7, 9, 1.6, 2], [0.88, 24, 1.3, 0.5], [0.28, 30, 1.2, 1.5], [0.56, 33, 1.4, 2.5]]
    .map(([x, y, s, d]) => `<i class="cst" style="left:${f1(x * W - s)}px;top:${f1(y - s)}px;width:${f1(s * 2)}px;height:${f1(s * 2)}px;--d:${d}s"></i>`).join('');
  const rim = `<svg class="crim" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><linearGradient id="${id2}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7df0cf"/><stop offset="0.55" stop-color="#a67cf5"/><stop offset="1" stop-color="#ff9ab8"/></linearGradient>
    <rect x="1.2" y="1.2" width="${W - 2.4}" height="${H - 2.4}" rx="12" fill="none" stroke="url(#${id2})" stroke-width="2.4"/>${shineArc(0.55)}</svg>`;
  return sky + strip + stars + rim;
}

// A glint for round the chip: a four-point star, with a white middle for the prismatic ones.
function spark(s, W) {
  const size = s.r * 2 + 2;
  const g = glint(size / 2, size / 2, s.r, 'currentColor', 1) + (s.core ? glint(size / 2, size / 2, s.r * 0.45, '#fff', 1) : '');
  return `<i class="cs${s.p === 6 ? ' p6' : ''}" style="left:${f1(s.x * W - size / 2)}px;top:${f1(s.y - size / 2)}px;width:${size}px;height:${size}px;--d:${s.d}s;color:${s.c}">
    <svg width="${size}" height="${size}" aria-hidden="true">${g}</svg></i>`;
}

// ---------------------------------------------------------------- the chip and its pips

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Timers go through here, so a film of the chip can run them on its own clock.
const later = (fn, ms) => setTimeout(fn, ms);

// The chip swelling and settling: up quickly, then back down with the app's spring (MOTION.bounce).
function swellFrames(top = 1.26, n = 30) {
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const s = k < 0.2 ? 1 + (top - 1) * easeOut(k / 0.2) : 1 + (top - 1) * (1 - spring((k - 0.2) / 0.8, feel.MOTION.bounce));
    frames.push({ transform: `scale(${s.toFixed(4)})`, offset: k });
  }
  return frames;
}

// Where the burst's bits fly: evenly round, a little uneven, further sideways since the chip is wide.
const BITS = [[0, 40], [41, 31], [76, 44], [117, 35], [156, 42], [198, 30], [236, 45], [279, 34], [318, 39]];

export class Combo {
  // host: where the chip (and its pips) go. count: where it starts. pips: false for a chip alone.
  // still: true or false to decide reduced motion; left out, the system's setting decides.
  constructor(host, { count = 0, pips = true, still = null } = {}) {
    this.host = host;
    this.opts = { pips, still };
    this.n = Math.max(0, count | 0);
    host.insertAdjacentHTML('beforeend', `<div class="combo" aria-label="Right in a row"></div>${pips ? `<div class="cpips">${'<i></i>'.repeat(PIPS)}</div>` : ''}`);
    this.el = host.querySelector('.combo');
    this.pipsEl = host.querySelector('.cpips');
    this.drawn = null;
    this.timers = [];
    this.moments = [];   // for the tests: each tier reached or lost, newest last
    this.paint();
    if (!this.still()) this.idle(true);
  }

  get count() { return this.n; }
  get tier() { return tierOf(this.n).id; }
  still() { return this.opts.still ?? reducedMotion(); }

  // Shows a new count. how: 'right', 'wrong' or 'close' for the moment that goes with an answer, or nothing
  // to just show it (a chip drawn at a count, a test).
  set(n, { how = null } = {}) {
    n = Math.max(0, n | 0);
    const was = this.n, up = rank(n) > rank(was), still = this.still();
    const change = (how === 'right' && up) || (how === 'wrong' && was > 0), moment = change && !still;
    // the chip as it was, before it changes, to fade or fall away
    const ghost = moment ? this.snapshot() : null;
    this.n = n;
    if (change) {
      this.moments.push({ kind: how === 'right' ? 'rise' : 'fall', tier: this.tier, n, still });
      if (this.moments.length > 20) this.moments.shift();
    }
    if (moment) { this.idle(false); clearTimeout(this.idleTimer); }
    this.paint();
    if (still) {
      this.idle(false);
      if (how === 'right' && up) feel.tick();   // the tick isn't motion: it stays
      return;
    }
    if (how === 'right') {
      if (up) this.rise(ghost);
      else feel.pop(this.el, n % PIPS === 0 ? 0.75 : 0.45);
      if (n % PIPS === 0) this.wave();
    } else if (how === 'wrong' && ghost) {
      this.fall(ghost);
    } else if (!how) {
      this.idle(true);
    }
  }

  // Draws the chip for the count: its material (only when the tier or width changes), number, pips.
  paint() {
    const id = this.tier, W = widthFor(this.n), key = `${id}:${W}`;
    const el = this.el;
    if (this.drawn !== key) {
      const L = LOOK[id], idle = el.classList.contains('idle');
      el.className = `combo tier-${id}${idle ? ' idle' : ''}`;
      el.style.setProperty('--w', `${W}px`);
      el.innerHTML = `${L.glow ? '<i class="cglow"><i></i></i>' : ''}<span class="cbody">${face(id, W)}<span class="cnum"><span>×<b></b></span></span></span>`
        + L.sparks.map(s => spark(s, W)).join('')
        + (L.orbit ? `<i class="corbit"><i><i class="cos">${spark({ x: 0, y: 0, r: 4.5, d: 0, p: 3, c: '#d9fff4', core: true }, 0)}</i></i></i>` : '');
      this.drawn = key;
    }
    el.classList.toggle('on', this.n > 0);
    el.classList.toggle('still', this.still());
    el.querySelector('.cnum b').textContent = this.n;
    if (this.pipsEl) {
      this.pipsEl.className = `cpips tier-${id}`;
      const filled = this.n === 0 ? 0 : this.n % PIPS || PIPS;
      this.pipsEl.querySelectorAll('i').forEach((p, k) => p.classList.toggle('on', k < filled));
    }
  }

  // The idle motion on or off. Plain has none.
  idle(on) {
    this.el.classList.toggle('idle', !!on && this.tier !== 'plain' && !this.still());
  }

  // A copy of the chip as it looks now (its glow and body, in its tier's colours), to fade or drop away.
  // Its number is drawn, not text, so the chip still reads as just the new count.
  snapshot() {
    const g = document.createElement('div');
    g.className = `cghost tier-${this.tier}`;
    g.setAttribute('aria-hidden', 'true');
    for (const part of this.el.querySelectorAll(':scope > .cglow, :scope > .cbody')) g.append(part.cloneNode(true));
    g.querySelectorAll('.cnum').forEach(x => { x.dataset.text = x.textContent; x.textContent = ''; });
    return g;
  }

  // Reaching a tier: the old chip fades as the new one swells and settles, bits of the new colour fly out
  // with a ring, the phone ticks at the swell's height, and the idle motion starts once it has settled.
  rise(ghost) {
    const el = this.el;
    if (ghost) {
      // only the old material fades: the new number is already on top of it
      ghost.querySelectorAll('.cnum').forEach(x => x.remove());
      el.append(ghost);
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      this.after(() => ghost.remove(), 200);
    }
    el.animate(swellFrames(), { duration: 760, easing: 'linear' });
    const W = widthFor(this.n), colours = LOOK[this.tier].burst;
    const ring = document.createElement('i');
    ring.className = 'cring';
    el.append(ring);
    ring.animate([{ transform: 'scale(1)', opacity: 0.85 }, { transform: 'scale(1.42, 1.6)', opacity: 0 }], { duration: 560, delay: 60, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
    const bits = BITS.map(([deg, dist], i) => {
      const b = document.createElement('i');
      b.className = `cp${i % 2 ? ' g' : ''}`;
      b.style.color = colours[i % colours.length];
      if (i % 2) b.innerHTML = `<svg width="12" height="12" aria-hidden="true">${glint(6, 6, 5.5, 'currentColor', 1)}</svg>`;
      el.append(b);
      const a = (deg * Math.PI) / 180, sx = Math.cos(a) * (W / H) * 0.85, sy = Math.sin(a);
      const from = `translate(${f1(sx * 16)}px, ${f1(sy * 16)}px) scale(0.7)`;
      const to = `translate(${f1(sx * (16 + dist))}px, ${f1(sy * (16 + dist))}px) scale(0.25)`;
      b.animate([{ transform: from, opacity: 1 }, { opacity: 1, offset: 0.35 }, { transform: to, opacity: 0 }],
        { duration: 640, delay: 70, easing: 'cubic-bezier(.15,.75,.35,1)', fill: 'backwards' });
      return b;
    });
    this.after(() => { ring.remove(); bits.forEach(b => b.remove()); }, 800);
    this.after(() => feel.tick(), 150);
    this.idleTimer = later(() => this.idle(true), 820);
  }

  // Losing it: the old chip sinks a little and fades, and plain ×0 comes up under it; the pips empty from
  // the right.
  fall(ghost) {
    ghost.classList.add('falling');
    this.el.append(ghost);
    ghost.animate([{ transform: 'translateY(0) scale(1)', opacity: 1 }, { opacity: 0.9, offset: 0.3 }, { transform: 'translateY(15px) scale(0.9)', opacity: 0 }],
      { duration: 640, easing: 'cubic-bezier(.45,0,.7,.55)', fill: 'forwards' });
    const body = this.el.querySelector(':scope > .cbody');
    body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 220, easing: 'ease-out', fill: 'backwards' });
    if (this.pipsEl) {
      this.pipsEl.classList.add('drop');
      this.after(() => this.pipsEl && this.pipsEl.classList.remove('drop'), 700);
    }
    this.after(() => ghost.remove(), 700);
  }

  // Every fifth: the pips ripple, left to right.
  wave() {
    if (!this.pipsEl) return;
    this.pipsEl.querySelectorAll('i').forEach((p, k) => p.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.15, 1.6)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 380, delay: k * 55, easing: 'ease-out' }));
  }

  // Tidying after a moment: these only take away what the moment added, so they're never cancelled early.
  after(fn, ms) {
    const id = later(() => { this.timers = this.timers.filter(t => t !== id); fn(); }, ms);
    this.timers.push(id);
  }

  remove() {
    this.timers.forEach(t => clearTimeout(t));
    clearTimeout(this.idleTimer);
    this.timers = [];
    this.el.remove();
    if (this.pipsEl) this.pipsEl.remove();
    this.pipsEl = null;
  }

  // For the tests: what it shows and whether anything is moving.
  debug() {
    return {
      count: this.n, tier: this.tier, idle: this.el.classList.contains('idle'), still: this.el.classList.contains('still'),
      text: this.el.innerText.trim(), moving: this.el.getAnimations({ subtree: true }).length,
      pips: this.pipsEl ? this.pipsEl.querySelectorAll('i.on').length : null, pipTier: this.pipsEl ? this.pipsEl.className : null,
      bits: this.el.querySelectorAll('.cp').length, ghost: !!this.el.querySelector('.cghost'), last: this.moments.at(-1) || null,
    };
  }
}
