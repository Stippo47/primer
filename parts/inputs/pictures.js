// Pictures a number can drive: one slot that the slider shows above its track and the dial shows in its
// window, so any picture goes on either. A picture is drawn once and then set to k, from 0 (its low end) to
// 1 (its high end), as the value moves: only attributes change, so it costs a small repaint of itself.
// Flat, lit from the upper left, three tones and one highlight, no blur; a glow is rings of low opacity.
//
// A new picture is one more entry here and one more option in part.json's `picture`, and any lesson can
// use it. Each says its size (w, h) and whether it's `round`: drawn as a disc filling its box, so the dial's
// round window can show all of it; any other picture sits whole inside the window.
import { mixHex, ramp, smooth, attr, lerp, clamp01 } from './kit.js';

let count = 0;
const uid = p => `pi-${p}-${count++}`;

export const PICTURES = {
  // A ball that goes from ice to fire: a snowflake in a pale blue ball at the low end, plain and mild in
  // the middle, a flame inside and fire on top at the high end. For temperature.
  warmth: {
    w: 140, h: 128, inWindow: 1.3,
    STOPS: [[0, '#e8f8ff'], [0.22, '#a6e1ff'], [0.42, '#49c6ff'], [0.56, '#7fdcc4'], [0.68, '#ffd75a'], [0.84, '#ffa23a'], [1, '#ff6a3d']],
    body() {
      const arm = a => {
        const c = Math.cos(a), s = Math.sin(a), p = (r, w) => `${(70 + c * r - s * w).toFixed(2)} ${(66 + s * r + c * w).toFixed(2)}`;
        return `M70 66L${p(23, 0)}M${p(12, 0)}L${p(18, 6)}M${p(12, 0)}L${p(18, -6)}`;
      };
      const flake = Array.from({ length: 6 }, (_, i) => arm((i * Math.PI) / 3 - Math.PI / 2)).join('');
      const tongue = (x, h, w) => `<path d="M${x} ${32 - h}C${x + w * 0.7} ${32 - h * 0.45} ${x + w} ${30} ${x + w * 0.6} 40C${x + w * 0.2} 46 ${x - w * 0.2} 46 ${x - w * 0.6} 40C${x - w} 30 ${x - w * 0.7} ${32 - h * 0.45} ${x} ${32 - h}Z"/>`;
      const flame = (s, y) => `M70 ${y - 30 * s}C${70 + 12 * s} ${y - 14 * s} ${70 + 20 * s} ${y - 4 * s} ${70 + 15 * s} ${y + 10 * s}C${70 + 10 * s} ${y + 22 * s} ${70 - 10 * s} ${y + 22 * s} ${70 - 15 * s} ${y + 10 * s}C${70 - 20 * s} ${y - 4 * s} ${70 - 12 * s} ${y - 14 * s} 70 ${y - 30 * s}Z`;
      return `<g class="glow" opacity="0"><circle cx="70" cy="64" r="60" fill="#ffa23a" opacity="0.08"/><circle cx="70" cy="64" r="52" fill="#ffa23a" opacity="0.1"/><circle cx="70" cy="64" r="46" fill="#ffd75a" opacity="0.12"/></g>
        <g class="fire" opacity="0" transform="translate(0 0)"><g fill="#ff6a3d">${tongue(48, 22, 11)}${tongue(70, 34, 14)}${tongue(92, 20, 11)}</g><g fill="#ffd75a">${tongue(50, 12, 6)}${tongue(70, 22, 8)}${tongue(90, 10, 6)}</g></g>
        <ellipse cx="72" cy="116" rx="34" ry="5.5" fill="#060926" opacity="0.38"/>
        <circle class="side" cx="70" cy="70" r="40"/>
        <circle class="body" cx="70" cy="66" r="40"/>
        <path class="shade" d="M104.6 46A40 40 0 0 1 46 98.6A44 44 0 0 0 104.6 46Z"/>
        <ellipse cx="55" cy="47" rx="15" ry="8.5" fill="#ffffff" opacity="0.38" transform="rotate(-32 55 47)"/>
        <path d="M37 60A34 34 0 0 1 56 34" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" opacity="0.7"/>
        <g class="snow"><path d="${flake}" fill="none" stroke="#7fb7e6" stroke-width="5" stroke-linecap="round" transform="translate(0 1.6)"/><path d="${flake}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/></g>
        <g class="flame" opacity="0"><path class="outer" d="${flame(1, 70)}" fill="#fff0b8"/><path d="${flame(0.55, 76)}" fill="#ffffff" opacity="0.9"/></g>
        <g class="frost" fill="#ffffff"><path d="M18 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M118 22l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z"/><path d="M122 92l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z"/></g>`;
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
    w: 220, h: 128,
    body() {
      const id = uid('depth');
      return `<clipPath id="${id}"><rect x="12" y="10" width="196" height="108" rx="16"/></clipPath>
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
        <rect x="12" y="10" width="196" height="108" rx="16" fill="none" stroke="#364090" stroke-width="3"/>`;
    },
    set(svg, k) {
      const d = 2 + k * 90;   // from the surface (y 26) down to the floor (y 118)
      attr(svg, '.w1', { height: d.toFixed(2) });
      attr(svg, '.w2', { y: (26 + d * 0.55).toFixed(2), height: (d * 0.45).toFixed(2) });
      attr(svg, '.edge', { d: `M12 ${(26 + d).toFixed(2)}H208`, opacity: k > 0.02 ? 1 : 0 });
    },
  },

  // A palm on an island in a round window, for wind: still and drooping at the low end, its trunk bowed
  // and every frond streaming downwind at the high end, with the sea getting up, the clouds racing in and,
  // near the top, driving rain.
  wind: {
    w: 200, h: 200, round: true,
    body() {
      const clip = uid('wind'), sky = uid('sky');
      const cloud = cls => `<g class="${cls}"><path class="cs" d="M-26 6a12 12 0 0 1 4-21a16 16 0 0 1 29-6a13 13 0 0 1 21 9a10 10 0 0 1-1 18z" transform="translate(0 3)"/>
        <path class="cb" d="M-26 6a12 12 0 0 1 4-21a16 16 0 0 1 29-6a13 13 0 0 1 21 9a10 10 0 0 1-1 18z"/>
        <path class="cl" d="M-21 -11a12 12 0 0 1 9-6a16 16 0 0 1 17-7" fill="none" stroke-width="3" stroke-linecap="round"/></g>`;
      return `<defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop class="s0" offset="0"/><stop class="s1" offset="0.7"/></linearGradient>
          <clipPath id="${clip}"><circle cx="100" cy="100" r="99"/></clipPath></defs>
        <g clip-path="url(#${clip})">
          <rect width="200" height="200" fill="url(#${sky})"/>
          <g class="sun"><circle cx="146" cy="50" r="17" fill="#ffd75a"/><path d="M131 46a15 15 0 0 1 12-12" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round"/></g>
          ${cloud('c1')}${cloud('c2')}${cloud('c3')}
          <g class="sea"><path class="sea-t" fill="#3651c8"/><path class="sea-b" fill="#2338a8"/><path class="sea-lit" fill="none" stroke="#7fa0ff" stroke-width="2.4" stroke-linecap="round"/></g>
          <g class="caps" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"></g>
          <path d="M38 151Q60 125 104 128Q132 131 140 151Z" fill="#d9a865"/>
          <path d="M38 151Q60 122 102 125Q128 128 137 147L129 151Z" fill="#f5d59a"/>
          <path d="M48 142Q64 129 92 128" fill="none" stroke="#fff0cf" stroke-width="3" stroke-linecap="round"/>
          <g class="palm"><path class="trunk-s" fill="#7c4a26"/><path class="trunk" fill="#b27744"/><path class="trunk-l" fill="none" stroke="#d29a62" stroke-width="2.4" stroke-linecap="round"/>
            <g class="rings" fill="none" stroke="#7c4a26" stroke-width="2" stroke-linecap="round"></g>
            <path d="M66 142Q80 132 95 142Z" fill="#f5d59a"/><path d="M70 137Q78 134 84 134" fill="none" stroke="#fff0cf" stroke-width="2" stroke-linecap="round"/>
            <g class="back" fill="#1b9a82"></g><g class="nuts"><circle r="5.6" fill="#6b3d1f"/><circle r="5.6" fill="#8a5530"/><circle r="1.8" fill="#d6a070"/></g><g class="front"></g></g>
          <g class="streaks" stroke="#ffffff" stroke-linecap="round"></g>
          <g class="rain" stroke="#c9d4ff" stroke-width="1.8" stroke-linecap="round" opacity="0.7"></g>
        </g>
        <circle cx="100" cy="100" r="98" fill="none" stroke="#364090" stroke-width="4"/>`;
    },
    set(svg, k) {
      const e = smooth(0, 1, k), gust = smooth(0.15, 1, k), storm = smooth(0.62, 0.95, k);
      attr(svg, '.s0', { 'stop-color': mixHex('#5a6fd8', '#1a1d4e', e) });
      attr(svg, '.s1', { 'stop-color': mixHex('#9a8ee6', '#3a2f74', e) });
      attr(svg, '.sun', { opacity: (1 - smooth(0.06, 0.26, k)).toFixed(3) });
      // clouds: more of them, greyer and further downwind as it blows
      [[58, 58, 0.85, 0], [112, 38, 0.7, 0.22], [24, 84, 0.72, 0.45]].forEach(([x, y, s, from], i) => {
        const c = svg.querySelector(`.c${i + 1}`);
        const show = i === 0 ? 1 : smooth(from, from + 0.25, k);
        c.setAttribute('transform', `translate(${(x + gust * (30 + i * 16)).toFixed(1)} ${y}) scale(${s})`);
        c.setAttribute('opacity', show.toFixed(3));
        attr(c, '.cb', { fill: mixHex('#ffffff', '#9aa3d6', e * 0.85) });
        attr(c, '.cs', { fill: mixHex('#c3ccf5', '#5d66ad', e * 0.85) });
        attr(c, '.cl', { stroke: mixHex('#ffffff', '#c9d0ee', e) });
      });
      // the sea: its waves grow, and white caps come once it's breezy
      const amp = 1.2 + gust * 6.5, top = 142;
      const ys = [];
      for (let x = 0; x <= 200; x += 8) ys.push([x, top + Math.sin(x * 0.075 + 0.6) * amp + Math.sin(x * 0.19) * amp * 0.35]);
      const line = dy => ys.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${(y + dy).toFixed(2)}`).join('');
      const wave = line(0);
      attr(svg, '.sea-t', { d: `${wave}L200 200L0 200Z` });
      attr(svg, '.sea-b', { d: `${line(9)}L200 200L0 200Z` });
      attr(svg, '.sea-lit', { d: wave, opacity: (0.75 - gust * 0.4).toFixed(3) });
      const caps = svg.querySelector('.caps');
      const nCaps = Math.round(smooth(0.25, 0.85, k) * 7);
      caps.innerHTML = Array.from({ length: nCaps }, (_, i) => {
        const x = 22 + ((i * 47) % 160), y = 156 + (i % 3) * 13;
        return `<path d="M${x - 7} ${y}q7 -5 14 0"/>`;
      }).join('');
      // the palm: the trunk bows downwind (to the right) and its fronds swing round to stream after it
      const B = [80, 139], C = [lerp(65, 94, e), lerp(100, 102, e)], T = [lerp(73, 124, e), lerp(57, 80, e)];
      const q = (t, a, b, c) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
      const pts = [], left = [], right = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = q(t, B[0], C[0], T[0]), y = q(t, B[1], C[1], T[1]);
        const dx = 2 * (1 - t) * (C[0] - B[0]) + 2 * t * (T[0] - C[0]), dy = 2 * (1 - t) * (C[1] - B[1]) + 2 * t * (T[1] - C[1]);
        const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = lerp(7.4, 4.2, t);
        pts.push([x, y, nx, ny, w]);
        left.push([x + nx * w, y + ny * w]); right.push([x - nx * w, y - ny * w]);
      }
      const poly = a => a.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');
      const trunk = `${poly(left)}${poly(right.reverse()).replace('M', 'L')}Z`;
      attr(svg, '.trunk', { d: trunk });
      attr(svg, '.trunk-s', { d: trunk, transform: 'translate(1.8 0.6)' });
      // the lit edge runs up the side that faces the light (upper left)
      const litSide = pts.map(([x, y, nx, ny, w]) => { const s = nx + ny < 0 ? 1 : -1; return [x + s * nx * w * 0.55, y + s * ny * w * 0.55]; });
      attr(svg, '.trunk-l', { d: poly(litSide.slice(1, 11)) });
      svg.querySelector('.rings').innerHTML = [2, 4, 6, 8, 10].map(i => {
        const [x, y, nx, ny, w] = pts[i];
        return `<path d="M${(x + nx * w * 0.9).toFixed(2)} ${(y + ny * w * 0.9).toFixed(2)}Q${(x + (ny) * 2).toFixed(2)} ${(y - nx * 2 + 1.5).toFixed(2)} ${(x - nx * w * 0.9).toFixed(2)} ${(y - ny * w * 0.9).toFixed(2)}"/>`;
      }).join('');
      // the coconuts, hanging under the crown
      const nuts = svg.querySelectorAll('.nuts circle');
      nuts[0].setAttribute('cx', (T[0] - 4.5).toFixed(2)); nuts[0].setAttribute('cy', (T[1] + 7).toFixed(2));
      nuts[1].setAttribute('cx', (T[0] + 4.5).toFixed(2)); nuts[1].setAttribute('cy', (T[1] + 6).toFixed(2));
      nuts[2].setAttribute('cx', (T[0] + 2.6).toFixed(2)); nuts[2].setAttribute('cy', (T[1] + 4).toFixed(2));
      // fronds: [angle when still, angle in a gale, length], angles in degrees, 0 is downwind (right), 90 down
      const FRONDS = [[164, 372, 0.95], [205, 360, 1], [248, 352, 0.9], [292, 346, 0.95], [326, 356, 1], [372, 366, 0.95], [346, 384, 0.85]];
      const frond = ([a0, a1, s], back) => {
        const a = (lerp(a0, a1, e) * Math.PI) / 180;
        const L = lerp(44, 52, e) * s * (back ? 0.86 : 1), W = lerp(8.5, 6.5, e) * (back ? 0.9 : 1);
        const droop = lerp(16, 3, e), arch = lerp(10, 2, e);
        const P0 = T, P2 = [T[0] + Math.cos(a) * L, T[1] + Math.sin(a) * L + droop];
        const P1 = [T[0] + Math.cos(a) * L * 0.5, T[1] + Math.sin(a) * L * 0.5 - arch];
        const side1 = [], side2 = [], mid = [];
        for (let i = 0; i <= 10; i++) {
          const t = i / 10, x = q(t, P0[0], P1[0], P2[0]), y = q(t, P0[1], P1[1], P2[1]);
          const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]), dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
          const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = W * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75) * (1 - t * 0.25);
          side1.push([x + nx * w, y + ny * w]); side2.push([x - nx * w, y - ny * w]); mid.push([x, y]);
        }
        // the upper half of a leaf takes the light; the lower half is its base tone
        const upperIsSide1 = (side1[5][1] < side2[5][1]);
        const upper = upperIsSide1 ? side1 : side2, lower = upperIsSide1 ? side2 : side1;
        const half = (a1) => `${poly(a1)}${poly(mid.slice().reverse()).replace('M', 'L')}Z`;
        if (back) return `<path d="${poly(side1)}${poly(side2.slice().reverse()).replace('M', 'L')}Z"/>`;
        return `<path d="${half(lower)}" fill="#22b393"/><path d="${half(upper)}" fill="#5fe0c2"/><path d="${poly(mid.slice(1, 9))}" fill="none" stroke="#127a85" stroke-width="1.3" stroke-linecap="round"/>`;
      };
      svg.querySelector('.back').innerHTML = FRONDS.filter((_, i) => i % 2).map(f => frond([f[0] + 14, f[1] - 6, f[2]], true)).join('');
      svg.querySelector('.front').innerHTML = FRONDS.map(f => frond(f, false)).join('');
      // streaks of wind, longer and more of them as it blows; rain in a storm
      const nS = Math.round(gust * 9);
      svg.querySelector('.streaks').innerHTML = Array.from({ length: nS }, (_, i) => {
        const len = 10 + gust * 26, x = 6 + ((i * 61) % 170), y = 30 + ((i * 37) % 96);
        return `<path d="M${x} ${y}h${len.toFixed(1)}" stroke-width="${i % 2 ? 2 : 2.6}" opacity="${(0.45 + 0.3 * (i % 2)).toFixed(2)}"/>`;
      }).join('');
      const nR = Math.round(storm * 26);
      svg.querySelector('.rain').innerHTML = Array.from({ length: nR }, (_, i) => {
        const x = -10 + ((i * 41.7) % 200), y = ((i * 67.1) % 150);
        return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l9 13"/>`;
      }).join('');
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

// Sets a drawn picture to a value's k.
export const setPicture = (name, svg, k) => { if (PICTURES[name] && svg) PICTURES[name].set(svg, clamp01(k)); };

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
