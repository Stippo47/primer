// The slider's looks: what its track is drawn as. The slider (forms/slider.js) does the rest the same way
// for every look and every direction: where the handle runs, the finger, the value's chip, the numbers
// along the scale, the truth on reveal. A look only draws.
//
// A look draws into an <svg> as big as the track's box, in CSS pixels, around the line the handle runs
// along, g = { x0, y0 } (the low end) to { x1, y1 } (the high end), across, right, up or down (g.W and g.H
// are the box's size). Its drawing is one svg's markup, or { back, value, front } for a look with parts
// that move on the clock: three svgs, each a layer of its own, so the value repaints only its own. It says:
//   across      how thick the track is across its run, in pixels
//   pad         [low, high]: how far in from the box's ends the run starts and stops
//   direction   the way it runs when the lesson doesn't say; `directions`, the ways it can run
//   line(W, H)  its own run, when it fills the whole box (the sea)
//   labels      where the numbers go: 'side' (below an across track, left of an up or down one), 'inside'
//   thumb       the handle's look: '' (a white disc) or 'ring' (a white ring the fill shows through)
//   picture     the picture it already is, so it isn't drawn again beside it (the sea is the depth picture)
//   draw(W, H, g, dir) its drawing; set(el, p, k, g) for the handle at p (0 to 1 along the run) and the
//   picture's k (0 to 1, where the lesson's picture would be; the run's p when there's none), el holding
//   the drawing's svgs
//   move(el, t, p, g)  optional: what moves on the clock (clock.js), t in seconds
// A new look is one more entry here and one more option in part.json's `look`.
import { ramp, mixHex, lerp } from './kit.js';

const f2 = x => x.toFixed(2);
const cycle = (t, period, phase = 0) => (((t / period + phase) % 1) + 1) % 1;
const wave = (t, rate, phase = 0) => Math.sin(t * rate + phase);

// Drawing along the run: in run space u runs from the low end along the track and v across it, negative
// towards the light (up on an across track, left on an up or down one). This turns run space into the box.
const runFrame = (g, dir) => {
  if (dir === 'right') return `translate(${f2(g.x0)} ${f2(g.y0)})`;
  if (dir === 'up') return `translate(${f2(g.x0)} ${f2(g.y0)}) rotate(-90)`;
  return `translate(${f2(g.x0)} ${f2(g.y0)}) rotate(90) scale(1 -1)`;
};
const runLength = g => Math.hypot(g.x1 - g.x0, g.y1 - g.y0);
export const along = (g, p) => [g.x0 + (g.x1 - g.x0) * p, g.y0 + (g.y1 - g.y0) * p];

// The liquid's colour, from cold to hot.
const LIQUID = [[0, '#a6e1ff'], [0.25, '#49c6ff'], [0.45, '#4fd6c4'], [0.56, '#a8e67e'], [0.66, '#ffd75a'], [0.82, '#ffa23a'], [1, '#ff5a4a']];

export const TRACKS = {
  // A rail with a fill: the slider as it always was, across or up and down.
  plain: {
    across: 56, pad: [0, 0], vpad: [18, 18], direction: 'right', directions: ['right', 'up', 'down'], labels: 'side', thumb: '',
    draw(W, H, g, dir) {
      const L = runLength(g);
      return `<g transform="${runFrame(g, dir)}"><rect x="-6" y="-6" width="${f2(L + 12)}" height="12" rx="6" fill="#2a3168"/>
        <rect class="fill" x="-6" y="-6" width="12" height="12" rx="6" fill="#49c6ff"/><rect class="fill-edge" x="-6" y="3" width="12" height="3" fill="#1b8fd1" opacity="0.9"/></g>`;
    },
    set(svg, p, k, g) {
      const w = Math.max(12, runLength(g) * p + 12);
      svg.querySelector('.fill').setAttribute('width', f2(w));
      const e = svg.querySelector('.fill-edge');
      e.setAttribute('x', '0'); e.setAttribute('width', f2(Math.max(0, w - 12)));
    },
  },

  // A thermometer: a glass tube on a bulb, the liquid rising in it and turning from icy blue through teal
  // and gold to red as it warms. The handle is a ring round the tube at the top of the liquid.
  thermometer: {
    across: 68, pad: [56, 18], vpad: [56, 18], direction: 'up', directions: ['right', 'up', 'down'], labels: 'side', thumb: 'ring',
    RB: 21, TW: 11,
    draw(W, H, g, dir) {
      const { RB, TW } = this, L = runLength(g), bu = -30, end = L + 12;   // the bulb's centre and the tube's end, along the run
      const tube = (grow, fill, extra = '') => `<g fill="${fill}" ${extra}><circle cx="${bu}" cy="0" r="${RB + grow}"/><rect x="${bu}" y="${-TW - grow}" width="${f2(end - bu + grow)}" height="${2 * (TW + grow)}" rx="${TW + grow}"/></g>`;
      // the scale's marks on the glass: one at every tenth of the run, a longer one at every half
      const marks = Array.from({ length: 11 }, (_, i) => { const u = (L * i) / 10, l = i % 5 ? 3 : 5; return `<path d="M${f2(u)} ${TW - 2}v-${l}"/>`; }).join('');
      return `<g transform="translate(0 4)"><g transform="${runFrame(g, dir)}">${tube(3, '#2f3678')}</g></g>
        <g transform="${runFrame(g, dir)}">${tube(3, '#364090')}${tube(0, '#0f1434')}
          <g stroke="#2a3168" stroke-width="1.6" stroke-linecap="round">${marks}</g>
          <circle class="bulb-side" cx="${bu}" cy="1.4" r="${RB - 5}"/><circle class="bulb" cx="${bu}" cy="0" r="${RB - 5.5}"/>
          <rect class="col-side" x="${bu}" y="-6" width="12" height="12" rx="6"/><rect class="col" x="${bu}" y="-6" width="12" height="9.5" rx="4.75"/>
          <path d="M${bu - 10} -6a11 11 0 0 1 8 -7" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
          <path d="M${bu + RB + 4} ${-TW + 4}H${f2(end - 6)}" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.22"/></g>`;
    },
    set(svg, p, k, g) {
      const L = runLength(g), bu = -30, top = L * p;
      const c = ramp(LIQUID, k), side = mixHex(c, '#0e1436', 0.35);
      for (const [sel, col] of [['.bulb', c], ['.col', c], ['.bulb-side', side], ['.col-side', side]]) svg.querySelector(sel).setAttribute('fill', col);
      for (const sel of ['.col', '.col-side']) svg.querySelector(sel).setAttribute('width', f2(Math.max(12, top - bu + 6)));
    },
  },

  // The sea cut away, the track running down into it: sky, the surface with its waves, water darkening
  // with depth, the floor. The warm top layer runs from the surface down to the handle, its lower edge
  // glinting, and the handle hangs on a line from a float on the surface. The depth picture, drawn tall.
  sea: {
    across: 0, direction: 'down', directions: ['down'], labels: 'inside', thumb: '', picture: 'depth',
    SKY: 34, FLOOR: 30,
    line(W, H) { return { x0: Math.round(W * 0.34), y0: this.SKY + 8, x1: Math.round(W * 0.34), y1: H - 4 - this.FLOOR + 4 }; },
    // Three layers: the water behind, what the value moves (the warm layer, its edge, the line) in the
    // middle, and in front what moves on the clock (waves, float, bubbles, fish, weed). Each is a layer of
    // its own, so moving the handle repaints only the middle one, and the clock only the others.
    draw(W, H) {
      const id = `pi-sea-${Math.random().toString(36).slice(2, 8)}`, S = this.SKY, B = H - 4, F = B - this.FLOOR;
      const clip = n => `<clipPath id="${id}-${n}"><rect width="${W}" height="${B}" rx="18"/></clipPath>`;
      const crest = `q9 -4.5 18 0${'t18 0'.repeat(Math.ceil(W / 18) + 3)}`;
      const rays = [0.18, 0.5, 0.8].map(x => `<path d="M${f2(W * x - 14)} ${S}h28l${f2(W * 0.06)} ${f2((F - S) * 0.75)}h-10z"/>`).join('');
      const weed = (x, h) => `<path class="weed" data-x="${f2(x)}" data-h="${h}" fill="none" stroke="#1fa78c" stroke-width="4" stroke-linecap="round"/>`;
      return {
        back: `<defs>${clip('b')}<linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d49c0"/><stop offset="0.55" stop-color="#1b2a80"/><stop offset="1" stop-color="#0d1446"/></linearGradient></defs>
          <rect y="4" width="${W}" height="${B}" rx="18" fill="#0a0e2e"/>
          <g clip-path="url(#${id}-b)"><rect width="${W}" height="${B}" fill="url(#${id}-w)"/><g class="rays" fill="#ffffff" opacity="0.06">${rays}</g></g>`,
        value: `<defs>${clip('v')}</defs><g clip-path="url(#${id}-v)">
          <g class="warm"><rect class="w1" x="0" y="${S - 4}" width="${W}" height="10" fill="#ffa23a"/><rect class="w2" x="0" y="${S}" width="${W}" height="6" fill="#ee6b5a"/></g>
          <path class="edge" stroke="#ffe9a6" stroke-width="3" stroke-dasharray="0.1 9" stroke-linecap="round"/>
          <path class="cable" stroke="#dde4ff" stroke-width="2" opacity="0.7"/></g>`,
        front: `<defs>${clip('f')}</defs><g clip-path="url(#${id}-f)">
          <g class="bubbles" fill="none" stroke="#b3ebff" stroke-width="1.8">${'<circle r="3"/>'.repeat(4)}</g>
          <g class="fish"><path d="M0 0c6-7 18-7 24 0c-6 7-18 7-24 0zM24 0l9-6v12z" fill="#3651c8"/><path d="M4 -1c5-4 12-4 17-1" fill="none" stroke="#7fa0ff" stroke-width="2" stroke-linecap="round"/><circle cx="6.5" cy="-1" r="1.6" fill="#0e1436"/></g>
          <path d="M0 ${F + 6}Q${f2(W * 0.2)} ${F - 6} ${f2(W * 0.42)} ${F + 2}T${f2(W * 0.8)} ${F - 2}T${W} ${F + 4}V${B}H0Z" fill="#141f66"/>
          <path d="M0 ${F + 14}Q${f2(W * 0.3)} ${F + 2} ${f2(W * 0.58)} ${F + 10}T${W} ${F + 8}V${B}H0Z" fill="#0f1650"/>
          <path d="M${f2(W * 0.74)} ${F + 4}l12 -14 14 16z" fill="#1b2a80"/><path d="M${f2(W * 0.74 + 12)} ${F - 10}l4 5" stroke="#364090" stroke-width="2.4" stroke-linecap="round"/>
          ${weed(W * 0.1, 30)}${weed(W * 0.14, 22)}${weed(W * 0.56, 34)}${weed(W * 0.6, 24)}
          <rect width="${W}" height="${S}" fill="#141a3c"/>
          <g class="rolling"><path d="M-36 ${S}${crest}V0H-36z" fill="#141a3c"/><path d="M-36 ${S}${crest}" fill="none" stroke="#b3ebff" stroke-width="2.6" opacity="0.85"/></g>
          <circle cx="${f2(W - 36)}" cy="${S / 2 - 1}" r="9" fill="#ffd75a"/><path d="M${f2(W - 43)} ${S / 2 - 3}a8 8 0 0 1 5 -6" fill="none" stroke="#fff3c4" stroke-width="2.6" stroke-linecap="round"/>
          <g class="float"><ellipse cx="0" cy="2" rx="9" ry="6" fill="#8f1f44"/><ellipse cx="0" cy="0" rx="9" ry="6" fill="#ee4b7a"/><rect x="-9" y="-1.5" width="18" height="3" fill="#ffffff"/><path d="M0 -6v-7" stroke="#dde4ff" stroke-width="2" stroke-linecap="round"/></g></g>
          <rect x="1.5" y="1.5" width="${W - 3}" height="${B - 3}" rx="17" fill="none" stroke="#364090" stroke-width="3"/>`,
      };
    },
    set(svg, p, k, g) {
      const S = this.SKY, y = g.y0 + (g.y1 - g.y0) * p, d = Math.max(2, y - S), W = g.W;
      svg.querySelector('.w1').setAttribute('height', f2(d + 4));
      const w2 = svg.querySelector('.w2');
      w2.setAttribute('y', f2(S + d * 0.55)); w2.setAttribute('height', f2(d * 0.45));
      svg.querySelector('.edge').setAttribute('d', `M0 ${f2(y)}H${W}`);
      svg.querySelector('.cable').setAttribute('d', `M${g.x0} ${S - 2}V${f2(y)}`);
    },
    move(svg, t, p, g) {
      const S = this.SKY, W = g.W, F = g.H - 4 - this.FLOOR;
      svg.querySelector('.rolling').setAttribute('transform', `translate(${f2(-cycle(t, 4.5) * 36)} ${f2(1.2 * wave(t, 1.1))})`);
      svg.querySelector('.edge').setAttribute('stroke-dashoffset', f2(-t * 6));
      svg.querySelector('.rays').setAttribute('transform', `translate(${f2(6 * wave(t, 0.35))} 0)`);
      svg.querySelector('.float').setAttribute('transform', `translate(${g.x0} ${f2(S - 3 + 1.6 * wave(t, 1.6))}) rotate(${f2(6 * wave(t, 1.6, 0.8))})`);
      svg.querySelectorAll('.bubbles circle').forEach((c, i) => {
        const q = cycle(t, 5 + i * 1.3, i * 0.27), x = W * [0.58, 0.72, 0.84, 0.5][i] + 4 * wave(t, 1.6 + i * 0.4, i);
        c.setAttribute('cx', f2(x)); c.setAttribute('cy', f2(lerp(F, S + 6, q)));
        c.setAttribute('r', f2(2 + (i % 3) * 0.8 + q * 1.2));
        c.setAttribute('opacity', f2(0.75 * Math.sin(Math.PI * q)));
      });
      svg.querySelectorAll('.weed').forEach((w, i) => {
        const x = Number(w.dataset.x), h = Number(w.dataset.h), s = 5 * wave(t, 0.9 + i * 0.15, i * 1.3);
        w.setAttribute('d', `M${f2(x)} ${f2(F + 10)}q${f2(-6 + s * 0.4)} ${f2(-h * 0.5)} ${f2(s)} ${f2(-h)}`);
      });
      // a fish crosses now and then, upstream, at a gentle pace
      const q = cycle(t, 16), fy = lerp(S + 30, F - 24, 0.62) + 6 * wave(t, 0.8);
      svg.querySelector('.fish').setAttribute('transform', `translate(${f2(lerp(W + 40, -60, q))} ${f2(fy)})`);
    },
  },
};
export const TRACK_NAMES = Object.keys(TRACKS);
