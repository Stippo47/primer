// Pictures a number can drive: one slot that the slider shows above or beside its track and the dial shows
// in its window, so any picture goes on either. A picture is drawn once and then set to k, from 0 (its low
// end) to 1 (its high end), as the value moves, and to the time t, in seconds, on the inputs' one clock
// (clock.js): frost glints, a flame flickers, clouds race. Only attributes change, so each frame costs a
// small repaint of the picture itself. Flat, lit from the upper left, three tones and one highlight, no
// blur; a glow is rings of low opacity. Everything that moves keeps a calm pace.
//
// A new picture is one more entry here and one more option in part.json's `picture`, and any lesson can
// use it. Each says its size (w, h), whether it's `round` (drawn as a disc filling its box, so the dial's
// round window can show all of it; any other picture sits whole inside the window), and may say the look
// a slider takes with it when the lesson doesn't say (`look`: the warmth picture goes with a thermometer).
import { mixHex, ramp, smooth, attr, lerp, clamp01 } from './kit.js';
import { onFrame, now } from './clock.js';

let count = 0;
const uid = p => `pi-${p}-${count++}`;
const f2 = x => x.toFixed(2);
const wave = (t, rate, phase = 0) => Math.sin(t * rate + phase);
// a value that runs 0 to 1 over and over, every `period` seconds, offset by `phase` (0 to 1)
const cycle = (t, period, phase = 0) => (((t / period + phase) % 1) + 1) % 1;
const star = (x, y, r) => `M${x} ${y - r}l${r * 0.25} ${r * 0.75} ${r * 0.75} ${r * 0.25}-${r * 0.75} ${r * 0.25}-${r * 0.25} ${r * 0.75}-${r * 0.25}-${r * 0.75}-${r * 0.75}-${r * 0.25} ${r * 0.75}-${r * 0.25}z`;

// A crust of frost on the ball's rim (centre 70, 66, radius 40): centred on angle `mid`, spanning `span`
// degrees, its inner edge ragged, deepest in the middle.
const RAG = [0.55, 1, 0.7, 0.95, 0.5, 0.85, 1, 0.6, 0.9, 0.75, 1, 0.55, 0.8];
function frostCrust(mid, span, depth = 1) {
  const n = RAG.length - 1, a0 = mid - span / 2, at = (a, r) => { const q = (a * Math.PI) / 180; return `${f2(70 + Math.cos(q) * r)} ${f2(66 + Math.sin(q) * r)}`; };
  let d = `M${at(a0, 40.6)}A40.6 40.6 0 0 1 ${at(a0 + span, 40.6)}`;
  for (let i = n; i >= 0; i--) {
    const u = i / n, taper = Math.sin(Math.PI * u);
    d += `L${at(a0 + span * u, 40.6 - (2 + 9 * RAG[i] * depth) * taper)}`;
  }
  return `${d}Z`;
}

export const PICTURES = {
  // A ball that goes from ice to fire: a snowflake in a pale blue ball at the low end, with frost creeping
  // round its rim and glinting; melting drips as it warms; plain and mild in the middle; a flame inside,
  // fire on top and heat shimmering up from it at the high end. For temperature.
  warmth: {
    w: 140, h: 128, inWindow: 1.3, look: 'thermometer',
    STOPS: [[0, '#e8f8ff'], [0.22, '#a6e1ff'], [0.42, '#49c6ff'], [0.54, '#5fd9c0'], [0.62, '#a8e67e'], [0.7, '#ffd75a'], [0.84, '#ffa23a'], [1, '#ff6a3d']],
    body() {
      const arm = a => {
        const c = Math.cos(a), s = Math.sin(a), p = (r, w) => `${(70 + c * r - s * w).toFixed(2)} ${(66 + s * r + c * w).toFixed(2)}`;
        return `M70 66L${p(23, 0)}M${p(12, 0)}L${p(18, 6)}M${p(12, 0)}L${p(18, -6)}`;
      };
      const flake = Array.from({ length: 6 }, (_, i) => arm((i * Math.PI) / 3 - Math.PI / 2)).join('');
      const tongue = (x, h, w) => `<path d="M${x} ${32 - h}C${x + w * 0.7} ${32 - h * 0.45} ${x + w} ${30} ${x + w * 0.6} 40C${x + w * 0.2} 46 ${x - w * 0.2} 46 ${x - w * 0.6} 40C${x - w} 30 ${x - w * 0.7} ${32 - h * 0.45} ${x} ${32 - h}Z"/>`;
      const flame = (s, y) => `M70 ${y - 30 * s}C${70 + 12 * s} ${y - 14 * s} ${70 + 20 * s} ${y - 4 * s} ${70 + 15 * s} ${y + 10 * s}C${70 + 10 * s} ${y + 22 * s} ${70 - 10 * s} ${y + 22 * s} ${70 - 15 * s} ${y + 10 * s}C${70 - 20 * s} ${y - 4 * s} ${70 - 12 * s} ${y - 14 * s} 70 ${y - 30 * s}Z`;
      const drip = 'M0 -6C2.4 -2.6 4 0 4 2.4a4 4 0 0 1-8 0C-4 0-2.4-2.6 0-6z';
      return `<g class="glow" opacity="0"><circle cx="70" cy="64" r="60" fill="#ffa23a" opacity="0.08"/><circle cx="70" cy="64" r="52" fill="#ffa23a" opacity="0.1"/><circle cx="70" cy="64" r="46" fill="#ffd75a" opacity="0.12"/></g>
        <g class="shimmer" fill="none" stroke="#ffd75a" stroke-width="3" stroke-linecap="round" opacity="0">${[46, 70, 94].map(() => '<path/>').join('')}</g>
        <ellipse class="floor" cx="72" cy="116" rx="34" ry="5.5" fill="#060926" opacity="0.38"/>
        <g class="drips" fill="#a6e1ff" opacity="0"><path class="dr1" d="${drip}"/><path class="dr2" d="${drip}"/></g>
        <g class="ball"><g class="fire" opacity="0"><g class="fire-in"><g fill="#ff6a3d">${tongue(48, 22, 11)}${tongue(70, 34, 14)}${tongue(92, 20, 11)}</g><g fill="#ffd75a">${tongue(50, 12, 6)}${tongue(70, 22, 8)}${tongue(90, 10, 6)}</g></g></g>
        <circle class="side" cx="70" cy="70" r="40"/>
        <circle class="body" cx="70" cy="66" r="40"/>
        <path class="shade" d="M104.6 46A40 40 0 0 1 46 98.6A44 44 0 0 0 104.6 46Z"/>
        <ellipse cx="55" cy="47" rx="15" ry="8.5" fill="#ffffff" opacity="0.38" transform="rotate(-32 55 47)"/>
        <path d="M37 60A34 34 0 0 1 56 34" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" opacity="0.7"/>
        <g class="rime" fill="#f2fbff"><path/><path/></g>
        <g class="snow"><path d="${flake}" fill="none" stroke="#7fb7e6" stroke-width="5" stroke-linecap="round" transform="translate(0 1.6)"/><path d="${flake}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/></g>
        <g class="flame" opacity="0"><g class="flame-in"><path class="outer" d="${flame(1, 70)}" fill="#fff0b8"/><path d="${flame(0.55, 76)}" fill="#ffffff" opacity="0.9"/></g></g></g>
        <g class="frost" fill="#ffffff"><path class="fs" d="${star(18, 38, 8)}"/><path class="fs" d="${star(119, 28, 6)}"/><path class="fs" d="${star(123, 98, 6)}"/><path class="fs" d="${star(14, 84, 5)}"/></g>`;
    },
    set(svg, k, t) {
      const body = ramp(this.STOPS, k);
      // the ball floats, just: up and down a pixel or two, its shadow on the floor growing as it comes down
      const bob = wave(t, 1.7);
      attr(svg, '.ball', { transform: `translate(0 ${f2(1.6 * bob)})` });
      attr(svg, '.floor', { rx: f2(34 + 1.6 * bob), opacity: f2(0.38 + 0.04 * bob) });
      attr(svg, '.body', { fill: body });
      attr(svg, '.side', { fill: mixHex(body, '#0e1436', 0.45) });
      attr(svg, '.shade', { fill: mixHex(body, '#1b2a80', 0.3) });
      const melt = smooth(0.16, 0.42, k), burn = smooth(0.56, 0.8, k), blaze = smooth(0.78, 0.97, k);
      const cold = 1 - smooth(0.04, 0.3, k);
      // the snowflake turns slowly, and shrinks as it melts
      attr(svg, '.snow', { opacity: f2(1 - melt), transform: `rotate(${f2(k * 40 + t * 7)} 70 66) translate(70 66) scale(${f2(1 - melt * 0.35)}) translate(-70 -66)` });
      // frost: glinting stars round the ball, and spikes creeping round its rim and back
      attr(svg, '.frost', { opacity: f2(cold) });
      svg.querySelectorAll('.fs').forEach((s, i) => {
        const g = 0.55 + 0.45 * Math.max(0, wave(t, 1.6 + i * 0.37, i * 2.1));
        const [x, y] = [[18, 38], [119, 28], [123, 98], [14, 84]][i];
        s.setAttribute('transform', `translate(${x} ${y}) scale(${f2(g)}) rotate(${f2(t * 12 + i * 20)}) translate(${-x} ${-y})`);
      });
      // frost creeping over the ball from its rim, a crust with a ragged inner edge; it breathes in and
      // out a little, slowly
      const creep = cold * (0.9 + 0.1 * wave(t, 0.45));
      svg.querySelectorAll('.rime path').forEach((p, i) => p.setAttribute('d', creep < 0.02 ? '' : i ? frostCrust(118, 70 * creep, 0.55) : frostCrust(140, 120 * creep, 1)));
      attr(svg, '.rime', { opacity: f2(0.85 * smooth(0, 0.3, cold)) });
      // melting: drops gather under the ball and fall, while it's between ice and mild
      const drip = smooth(0.12, 0.26, k) * (1 - smooth(0.46, 0.58, k));
      attr(svg, '.drips', { opacity: f2(drip) });
      [[60, 0], [80, 0.5]].forEach(([x, ph], i) => {
        const c = cycle(t, 1.9, ph), fall = c < 0.45 ? 0 : (c - 0.45) / 0.55;
        const grow = Math.min(1, c / 0.45);
        attr(svg, `.dr${i + 1}`, { transform: `translate(${x} ${f2(104 + fall * fall * 22)}) scale(${f2(0.4 + 0.6 * grow)})`, opacity: f2(1 - fall) });
      });
      // the flame and the fire flicker
      const flick = 1 + 0.05 * wave(t, 7.1) + 0.03 * wave(t, 11.7, 1);
      attr(svg, '.flame', { opacity: f2(burn), transform: `translate(70 92) scale(${f2(0.55 + 0.45 * smooth(0.56, 0.95, k))}) translate(-70 -92)` });
      attr(svg, '.flame-in', { transform: `translate(70 92) scale(${f2(1 + 0.025 * wave(t, 6.3))} ${f2(flick)}) translate(-70 -92)` });
      attr(svg, '.flame .outer', { fill: mixHex('#fff0b8', '#ffe066', blaze) });
      // the fire grows up from behind the ball rather than fading in, so it never looks smoky
      attr(svg, '.fire', { opacity: f2(smooth(0.78, 0.83, k)), transform: `translate(70 40) scale(${f2(0.7 + 0.3 * blaze)} ${f2(0.2 + 0.8 * blaze)}) translate(-70 -40)` });
      attr(svg, '.fire-in', { transform: `translate(70 42) scale(${f2(1 + 0.03 * wave(t, 5.3, 2))} ${f2(1 + 0.09 * wave(t, 8.9) + 0.04 * wave(t, 13.1))}) translate(-70 -42)` });
      attr(svg, '.glow', { opacity: f2(smooth(0.7, 1, k) * (0.85 + 0.15 * wave(t, 1.3))) });
      // heat shimmering up from it when it's hot
      const hot = smooth(0.6, 0.85, k);
      attr(svg, '.shimmer', { opacity: f2(hot) });
      svg.querySelectorAll('.shimmer path').forEach((p, i) => {
        const c = cycle(t, 2.6, i * 0.37), x = [46, 70, 94][i], y = lerp(lerp(26, 8, blaze), -10, c), a = 3.2;
        p.setAttribute('d', `M${x} ${f2(y)}q${a} -3.5 0 -7t0 -7t0 -7`);
        p.setAttribute('opacity', f2(Math.min(1, 2.5 * Math.sin(Math.PI * c))));
      });
    },
  },

  // The sea cut away: a warm layer on top of cold water, as deep as the value. Its waves roll, bubbles
  // rise, and the warm layer's edge glints. For how deep something goes. A slider takes the sea look with
  // it, where the sea itself is the track (tracks.js); this drawing is for a dial's window or a slider set
  // to another look.
  depth: {
    w: 220, h: 128, look: 'sea',
    body() {
      const id = uid('depth');
      const crest = `q8 -4 16 0${'t16 0'.repeat(17)}`;   // waves 16 apart, long enough to roll by two of them
      return `<clipPath id="${id}"><rect x="12" y="10" width="196" height="108" rx="16"/></clipPath>
        <rect x="12" y="14" width="196" height="108" rx="16" fill="#0a0e2e"/>
        <g clip-path="url(#${id})">
          <rect x="12" y="10" width="196" height="108" fill="#1b2a80"/>
          <rect x="12" y="80" width="196" height="38" fill="#16216a"/>
          <rect x="12" y="10" width="196" height="16" fill="#141a3c"/>
          <circle cx="186" cy="12" r="10" fill="#ffd75a"/>
          <g class="warm"><rect class="w1" x="12" y="26" width="196" height="10" fill="#ffa23a"/><rect class="w2" x="12" y="30" width="196" height="6" fill="#ee6b5a"/></g>
          <path class="edge" d="M12 36H208" stroke="#ffe9a6" stroke-width="2.4" stroke-dasharray="0.1 7" stroke-linecap="round"/>
          <g class="bubbles" fill="none" stroke="#b3ebff" stroke-width="1.6" opacity="0.7"><circle r="2.4"/><circle r="1.8"/><circle r="2.8"/></g>
          <g class="rolling"><path d="M-20 26${crest}v-6H-20z" fill="#141a3c"/>
            <path d="M-20 26${crest}" fill="none" stroke="#b3ebff" stroke-width="2.2" opacity="0.8"/></g>
          <path d="M150 118l8 -14 8 14z" fill="#141f66"/><path d="M30 118l12 -20 14 20z" fill="#141f66"/>
        </g>
        <rect x="12" y="10" width="196" height="108" rx="16" fill="none" stroke="#364090" stroke-width="3"/>`;
    },
    set(svg, k, t) {
      const d = 2 + k * 90;   // from the surface (y 26) down to the floor (y 118)
      attr(svg, '.w1', { height: f2(d) });
      attr(svg, '.w2', { y: f2(26 + d * 0.55), height: f2(d * 0.45) });
      attr(svg, '.edge', { d: `M12 ${f2(26 + d)}H208`, opacity: k > 0.02 ? 1 : 0, 'stroke-dashoffset': f2(-t * 5) });
      attr(svg, '.rolling', { transform: `translate(${f2(-cycle(t, 4) * 32)} 0)` });
      svg.querySelectorAll('.bubbles circle').forEach((c, i) => {
        const p = cycle(t, 4.2 + i * 0.9, i * 0.31), x = [48, 112, 170][i] + 3 * wave(t, 2 + i, i);
        c.setAttribute('cx', f2(x)); c.setAttribute('cy', f2(lerp(112, 32, p)));
        c.setAttribute('opacity', f2(Math.sin(Math.PI * p)));
      });
    },
  },

  // A palm on an island in a round window, for wind: still and drooping at the low end, its trunk bowed
  // and every frond streaming downwind at the high end, with the sea getting up, the clouds racing in and,
  // near the top, driving rain. It moves all the time, faster the harder it blows: clouds drift past,
  // waves roll, white caps and streaks of wind run downwind, the fronds flutter and the trunk sways.
  wind: {
    w: 200, h: 200, round: true,
    CAPS: 7, STREAKS: 9, RAIN: 26,
    body() {
      const clip = uid('wind'), sky = uid('sky');
      const cloud = cls => `<g class="${cls}"><path class="cs" d="M-26 6a12 12 0 0 1 4-21a16 16 0 0 1 29-6a13 13 0 0 1 21 9a10 10 0 0 1-1 18z" transform="translate(0 3)"/>
        <path class="cb" d="M-26 6a12 12 0 0 1 4-21a16 16 0 0 1 29-6a13 13 0 0 1 21 9a10 10 0 0 1-1 18z"/>
        <path class="cl" d="M-21 -11a12 12 0 0 1 9-6a16 16 0 0 1 17-7" fill="none" stroke-width="3" stroke-linecap="round"/></g>`;
      const n = (k, tag = '<path/>') => tag.repeat(k);
      return `<defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop class="s0" offset="0"/><stop class="s1" offset="0.7"/></linearGradient>
          <clipPath id="${clip}"><circle cx="100" cy="100" r="99"/></clipPath></defs>
        <g clip-path="url(#${clip})">
          <rect width="200" height="200" fill="url(#${sky})"/>
          <g class="sun"><circle cx="146" cy="50" r="17" fill="#ffd75a"/><path d="M131 46a15 15 0 0 1 12-12" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round"/></g>
          ${cloud('c1')}${cloud('c2')}${cloud('c3')}${cloud('c4')}
          <g class="sea"><path class="sea-t" fill="#3651c8"/><path class="sea-b" fill="#2338a8"/><path class="sea-lit" fill="none" stroke="#7fa0ff" stroke-width="2.4" stroke-linecap="round"/></g>
          <g class="caps" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round">${n(this.CAPS)}</g>
          <path d="M38 151Q60 125 104 128Q132 131 140 151Z" fill="#d9a865"/>
          <path d="M38 151Q60 122 102 125Q128 128 137 147L129 151Z" fill="#f5d59a"/>
          <path d="M48 142Q64 129 92 128" fill="none" stroke="#fff0cf" stroke-width="3" stroke-linecap="round"/>
          <g class="palm"><path class="trunk-s" fill="#7c4a26"/><path class="trunk" fill="#b27744"/><path class="trunk-l" fill="none" stroke="#d29a62" stroke-width="2.4" stroke-linecap="round"/>
            <g class="rings" fill="none" stroke="#7c4a26" stroke-width="2" stroke-linecap="round">${n(5)}</g>
            <path d="M66 142Q80 132 95 142Z" fill="#f5d59a"/><path d="M70 137Q78 134 84 134" fill="none" stroke="#fff0cf" stroke-width="2" stroke-linecap="round"/>
            <g class="back" fill="#1b9a82">${n(3)}</g><g class="nuts"><circle r="5.6" fill="#6b3d1f"/><circle r="5.6" fill="#8a5530"/><circle r="1.8" fill="#d6a070"/></g>
            <g class="front">${n(7, '<g><path fill="#22b393"/><path fill="#5fe0c2"/><path fill="none" stroke="#127a85" stroke-width="1.3" stroke-linecap="round"/></g>')}</g></g>
          <g class="streaks" stroke="#ffffff" stroke-linecap="round">${n(this.STREAKS)}</g>
          <g class="rain" stroke="#c9d4ff" stroke-width="1.8" stroke-linecap="round" opacity="0.7">${n(this.RAIN)}</g>
        </g>
        <circle cx="100" cy="100" r="98" fill="none" stroke="#364090" stroke-width="4"/>`;
    },
    set(svg, k, t) {
      const e = smooth(0, 1, k), gust = smooth(0.15, 1, k), storm = smooth(0.62, 0.95, k);
      attr(svg, '.s0', { 'stop-color': mixHex('#5a6fd8', '#1a1d4e', e) });
      attr(svg, '.s1', { 'stop-color': mixHex('#9a8ee6', '#3a2f74', e) });
      attr(svg, '.sun', { opacity: f2(1 - smooth(0.06, 0.26, k)) });
      // clouds: more of them, greyer, racing past faster as it blows; each comes round again from upwind
      const drift = t * (4 + 70 * e);
      [[58, 58, 0.85, 0], [150, 38, 0.7, 0.22], [24, 84, 0.72, 0.45], [230, 70, 0.62, 0.3]].forEach(([x, y, s, from], i) => {
        const c = svg.querySelector(`.c${i + 1}`);
        const show = i === 0 ? 1 : smooth(from, from + 0.25, k);
        const cx = ((((x + gust * (30 + i * 16) + drift * (1 + i * 0.12)) % 320) + 320) % 320) - 60;
        c.setAttribute('transform', `translate(${f2(cx)} ${f2(y + 1.5 * wave(t, 0.7 + i * 0.2, i))}) scale(${s})`);
        c.setAttribute('opacity', f2(show));
        attr(c, '.cb', { fill: mixHex('#ffffff', '#9aa3d6', e * 0.85) });
        attr(c, '.cs', { fill: mixHex('#c3ccf5', '#5d66ad', e * 0.85) });
        attr(c, '.cl', { stroke: mixHex('#ffffff', '#c9d0ee', e) });
      });
      // the sea: its waves grow and roll, and white caps run downwind once it's breezy
      const amp = 1.2 + gust * 6.5, top = 142, roll = t * (1.1 + 3.2 * e);
      const ys = [];
      for (let x = 0; x <= 200; x += 8) ys.push([x, top + Math.sin(x * 0.075 + 0.6 - roll) * amp + Math.sin(x * 0.19 - roll * 1.7) * amp * 0.35]);
      const line = dy => ys.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${f2(y + dy)}`).join('');
      const crest = line(0);
      attr(svg, '.sea-t', { d: `${crest}L200 200L0 200Z` });
      attr(svg, '.sea-b', { d: `${line(9)}L200 200L0 200Z` });
      attr(svg, '.sea-lit', { d: crest, opacity: f2(0.75 - gust * 0.4) });
      const nCaps = smooth(0.25, 0.85, k) * this.CAPS;
      svg.querySelectorAll('.caps path').forEach((p, i) => {
        const x = ((((22 + i * 47 + t * (8 + 46 * e)) % 200) + 200) % 200), y = 156 + (i % 3) * 13;
        p.setAttribute('d', `M${f2(x - 7)} ${y}q7 -5 14 0`);
        p.setAttribute('opacity', f2(clamp01(nCaps - i) * Math.min(1, Math.sin((Math.PI * x) / 200) * 3)));
      });
      // the palm: the trunk bows downwind (to the right) and sways; its fronds swing round to stream
      // after it, and flutter
      const sway = wave(t, 1.3 + 2.6 * e) * (0.5 + 3 * e), bob = wave(t, 1.3 + 2.6 * e, 1.2) * (0.3 + 1.2 * e);
      const B = [80, 139], C = [lerp(65, 94, e) + sway * 0.4, lerp(100, 102, e)], T = [lerp(73, 124, e) + sway, lerp(57, 80, e) + bob];
      const q = (u, a, b, c) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
      const pts = [], left = [], right = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12, x = q(u, B[0], C[0], T[0]), y = q(u, B[1], C[1], T[1]);
        const dx = 2 * (1 - u) * (C[0] - B[0]) + 2 * u * (T[0] - C[0]), dy = 2 * (1 - u) * (C[1] - B[1]) + 2 * u * (T[1] - C[1]);
        const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = lerp(7.4, 4.2, u);
        pts.push([x, y, nx, ny, w]);
        left.push([x + nx * w, y + ny * w]); right.push([x - nx * w, y - ny * w]);
      }
      const poly = a => a.map(([x, y], i) => `${i ? 'L' : 'M'}${f2(x)} ${f2(y)}`).join('');
      const trunk = `${poly(left)}${poly(right.reverse()).replace('M', 'L')}Z`;
      attr(svg, '.trunk', { d: trunk });
      attr(svg, '.trunk-s', { d: trunk, transform: 'translate(1.8 0.6)' });
      // the lit edge runs up the side that faces the light (upper left)
      const litSide = pts.map(([x, y, nx, ny, w]) => { const s = nx + ny < 0 ? 1 : -1; return [x + s * nx * w * 0.55, y + s * ny * w * 0.55]; });
      attr(svg, '.trunk-l', { d: poly(litSide.slice(1, 11)) });
      svg.querySelectorAll('.rings path').forEach((p, n) => {
        const [x, y, nx, ny, w] = pts[2 + n * 2];
        p.setAttribute('d', `M${f2(x + nx * w * 0.9)} ${f2(y + ny * w * 0.9)}Q${f2(x + ny * 2)} ${f2(y - nx * 2 + 1.5)} ${f2(x - nx * w * 0.9)} ${f2(y - ny * w * 0.9)}`);
      });
      // the coconuts, hanging under the crown
      const nuts = svg.querySelectorAll('.nuts circle');
      nuts[0].setAttribute('cx', f2(T[0] - 4.5)); nuts[0].setAttribute('cy', f2(T[1] + 7));
      nuts[1].setAttribute('cx', f2(T[0] + 4.5)); nuts[1].setAttribute('cy', f2(T[1] + 6));
      nuts[2].setAttribute('cx', f2(T[0] + 2.6)); nuts[2].setAttribute('cy', f2(T[1] + 4));
      // fronds: [angle when still, angle in a gale, length], angles in degrees, 0 is downwind (right), 90 down
      const FRONDS = [[164, 372, 0.95], [205, 360, 1], [248, 352, 0.9], [292, 346, 0.95], [326, 356, 1], [372, 366, 0.95], [346, 384, 0.85]];
      const flutter = i => wave(t, 2.2 + 7 * e, i * 1.7) * (1.5 + 8 * e) + wave(t, 3.7 + 9 * e, i * 0.9) * 2 * e;
      const frond = ([a0, a1, s], back, i) => {
        const a = ((lerp(a0, a1, e) + flutter(i)) * Math.PI) / 180;
        const L = lerp(44, 52, e) * s * (back ? 0.86 : 1), W = lerp(8.5, 6.5, e) * (back ? 0.9 : 1);
        const droop = lerp(16, 3, e), arch = lerp(10, 2, e);
        const P0 = T, P2 = [T[0] + Math.cos(a) * L, T[1] + Math.sin(a) * L + droop];
        const P1 = [T[0] + Math.cos(a) * L * 0.5, T[1] + Math.sin(a) * L * 0.5 - arch];
        const side1 = [], side2 = [], mid = [];
        for (let j = 0; j <= 10; j++) {
          const u = j / 10, x = q(u, P0[0], P1[0], P2[0]), y = q(u, P0[1], P1[1], P2[1]);
          const dx = 2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]), dy = 2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]);
          const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = W * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.75) * (1 - u * 0.25);
          side1.push([x + nx * w, y + ny * w]); side2.push([x - nx * w, y - ny * w]); mid.push([x, y]);
        }
        // the upper half of a leaf takes the light; the lower half is its base tone
        const upperIsSide1 = side1[5][1] < side2[5][1];
        const upper = upperIsSide1 ? side1 : side2, lower = upperIsSide1 ? side2 : side1;
        const half = h => `${poly(h)}${poly(mid.slice().reverse()).replace('M', 'L')}Z`;
        if (back) return [`${poly(side1)}${poly(side2.slice().reverse()).replace('M', 'L')}Z`];
        return [half(lower), half(upper), poly(mid.slice(1, 9))];
      };
      svg.querySelectorAll('.back path').forEach((p, n) => {
        const fr = FRONDS[n * 2 + 1];
        p.setAttribute('d', frond([fr[0] + 14, fr[1] - 6, fr[2]], true, n * 2 + 1.5)[0]);
      });
      svg.querySelectorAll('.front > g').forEach((g, n) => {
        const ds = frond(FRONDS[n], false, n);
        g.querySelectorAll('path').forEach((p, j) => p.setAttribute('d', ds[j]));
      });
      // streaks of wind run downwind, longer and more of them as it blows; rain drives through in a storm
      const nS = gust * this.STREAKS, len = 10 + gust * 26;
      svg.querySelectorAll('.streaks path').forEach((p, i) => {
        const span = 200 + len + 40, x = ((((6 + i * 61 + t * (30 + 190 * gust)) % span) + span) % span) - len - 20, y = 30 + ((i * 37) % 96);
        p.setAttribute('d', `M${f2(x)} ${y}h${f2(len)}`);
        p.setAttribute('stroke-width', i % 2 ? 2 : 2.6);
        p.setAttribute('opacity', f2(clamp01(nS - i) * (0.45 + 0.3 * (i % 2))));
      });
      const nR = storm * this.RAIN;
      svg.querySelectorAll('.rain path').forEach((p, i) => {
        const y = ((((i * 67.1 + t * 210) % 180) + 180) % 180) - 15, x = ((((-10 + i * 41.7 + y * 0.7 + t * 40) % 220) + 220) % 220) - 10;
        p.setAttribute('d', `M${f2(x)} ${f2(y)}l9 13`);
        p.setAttribute('opacity', f2(clamp01(nR - i)));
      });
    },
  },
};
export const PICTURE_NAMES = Object.keys(PICTURES);

// Where a picture is, 0 to 1, for a value: its low end at pictureFrom, its high end at pictureTo (the ends
// of the scale unless the lesson says), measured along the form's own scale (stretched too, on a log one).
export function pictureK(S, scale) {
  const pFrom = scale.toPos(typeof S.pictureFrom === 'number' ? S.pictureFrom : scale.lo);
  const pTo = scale.toPos(typeof S.pictureTo === 'number' ? S.pictureTo : scale.hi);
  return v => (pTo === pFrom ? (scale.toPos(v) >= pTo ? 1 : 0) : clamp01((scale.toPos(v) - pFrom) / (pTo - pFrom)));
}

// The picture as an <svg> of its own. `box`: x, y, w, h to place it inside another drawing (the dial's
// window); left out, it's a free-standing svg that CSS sizes.
export function pictureSvg(name, box = null) {
  const P = PICTURES[name];
  if (!P) return '';
  const place = box ? `x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"` : `width="${P.w}" height="${P.h}"`;
  return `<svg class="pic-${name}" ${place} viewBox="0 0 ${P.w} ${P.h}" preserveAspectRatio="xMidYMid meet">${P.body()}</svg>`;
}

// Sets a drawn picture to a value's k, at the clock's time.
export const setPicture = (name, svg, k) => {
  if (!PICTURES[name] || !svg) return;
  svg._k = clamp01(k);
  PICTURES[name].set(svg, svg._k, now());
};

// Puts a drawn picture on the clock, so it moves while it's on the page. Returns a function that stops it.
export const livePicture = (name, svg) => (PICTURES[name] && svg ? onFrame(svg, t => PICTURES[name].set(svg, svg._k || 0, t)) : () => {});

// The box a picture takes inside a round window of radius r around cx, cy: all of the window for a round
// picture; for any other, the largest box of its own shape that fits inside the circle, a little in.
export function windowBox(name, cx, cy, r) {
  const P = PICTURES[name];
  if (!P) return null;
  if (P.round) return { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r };
  // inWindow: how much bigger a picture with room round its subject (the warmth ball) may sit, its edges cut by the window
  const k = 0.94 * (P.inWindow || 1), a = Math.atan2(P.h, P.w), w = 2 * r * Math.cos(a) * k, h = 2 * r * Math.sin(a) * k;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
