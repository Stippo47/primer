// What every answer form shares, so a form is only the part that's its own: small helpers, the number
// scale (the slider, the dial and the pile all read the same min, max, step, scale and start), labels with
// an optional picture, the verdict colours, and the way a tile is picked up, carried and dropped (sort
// and snap). A part never reaches into the app: what it may use of the app comes in `ctx`.

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// A length rounded to whole pixels of the screen, so a thing moved by it lands on the pixel grid.
export const devicePx = x => { const d = window.devicePixelRatio || 1; return Math.round(x * d) / d; };
export const clone = v => (v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)));
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// Easing, k from 0 to 1, for what a form moves itself: slow away and slow in; quick away, overshooting a
// little and settling back (by `s`, 0 none).
export const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeBack = (k, s = 1.2) => { const c = k - 1; return 1 + c * c * ((s + 1) * c + s); };
const decimals = step => { const s = String(step); return s.includes('.') ? Math.min(4, s.split('.')[1].length) : 0; };
export const fmt = (v, step, unit) => `${Number(v).toLocaleString('en', { minimumFractionDigits: decimals(step), maximumFractionDigits: decimals(step) })}${unit ? (/^[°%]/.test(unit) ? '' : ' ') + unit : ''}`;

export function shuffled(list, avoidSame = false) {
  const out = list.slice();
  for (let tries = 0; tries < 8; tries++) {
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    if (!avoidSame || out.length < 2 || out.some((x, i) => x !== list[i])) return out;
  }
  return out.reverse();
}

// Colours mixed by number, for pictures that change with a value.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mixHex = (a, b, k) => `#${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
export const ramp = (stops, k) => {
  for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) return mixHex(stops[i - 1][1], stops[i][1], (k - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
};
export const attr = (el, sel, a) => { const x = sel ? el.querySelector(sel) : el; if (x) for (const [k, v] of Object.entries(a)) x.setAttribute(k, v); };

// ---------------------------------------------------------------- drawn pieces the pictures share
// The pictures and the slider's looks draw the same sky, sun and waves, so the sea in a dial's window, the
// sea a slider runs down and the wind's island all look like one place.
const r2 = x => Math.round(x * 100) / 100;
// The sky by day: the colour at the top of the wind's sky, flat where a band of sky is thin (the sea's).
export const SKY = '#5a6fd8';
// The sun: a disc ringed with short rays, a highlight on its upper left, so it reads as the sun on any sky.
export const sun = (x, y, r) => {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
    return `M${r2(x + c * r * 1.35)} ${r2(y + s * r * 1.35)}L${r2(x + c * r * 1.7)} ${r2(y + s * r * 1.7)}`;
  }).join('');
  return `<g class="sun-g"><path d="${rays}" stroke="#ffd75a" stroke-width="${r2(Math.max(2, r * 0.26))}" stroke-linecap="round"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#ffd75a"/><path d="M${r2(x - r * 0.62)} ${r2(y - r * 0.12)}a${r2(r * 0.66)} ${r2(r * 0.66)} 0 0 1 ${r2(r * 0.5)} ${r2(-r * 0.5)}" fill="none" stroke="#fff3c4" stroke-width="${r2(Math.max(1.8, r * 0.24))}" stroke-linecap="round"/></g>`;
};
// A line of waves from x0 along height y: `n` whole waves `wl` long, crests `amp` above y and troughs as far
// below. Path data to go on with (V, H, Z) or to stroke as it is.
export const waves = (x0, y, wl, amp, n) => `M${r2(x0)} ${r2(y)}q${r2(wl / 4)} ${r2(-2 * amp)} ${r2(wl / 2)} 0${` t${r2(wl / 2)} 0`.repeat(Math.max(1, 2 * n - 1))}`;
// A warm top layer on the sea in two tones, from y0 (above the waves, so its colour fills them) down to y1:
// yellow-orange over deep orange, the two meeting along a slow wave `wl` long, rolled by `shift` (0 to 1).
// It's a tint, laid over the water at WARM_TINT as one group, so the water's own shading, its rays and all
// that's in it still show through, only warmer.
export const WARM = ['#ffa000', '#ff4a1a'];
export const WARM_TINT = 0.72;
export function warmLayer(x0, x1, y0, y1, wl, shift = 0) {
  const split = y0 + (y1 - y0) * 0.55, amp = Math.min(3, (y1 - split) * 0.25), from = x0 - wl * (1 + shift), n = Math.ceil((x1 - from) / wl) + 1;
  return { top: `M${r2(x0)} ${r2(y0)}H${r2(x1)}V${r2(y1)}H${r2(x0)}Z`, deep: `${waves(from, split, wl, amp, n)}V${r2(y1)}H${r2(from)}Z` };
}

// ---------------------------------------------------------------- the number scale
// min, max, step, scale (linear, or log for powers of ten) and start, read the same way by every form that
// answers with a number on a scale. A start left out is the middle of the scale (`middle: false`: its low end).
export function numberScale(S, { middle = true } = {}) {
  const log = S.scale === 'log' && S.min > 0 && S.max > S.min;
  const lo = Math.min(S.min, S.max), hi = Math.max(S.min, S.max);
  const clampV = v => Math.min(hi, Math.max(lo, v));
  // a step wider than the whole scale leaves just its two ends
  const step = S.step > 0 ? (hi > lo ? Math.min(S.step, hi - lo) : S.step) : 1;
  const toPos = v => (hi === lo ? 0.5 : log ? Math.log(clampV(v) / lo) / Math.log(hi / lo) : (clampV(v) - lo) / (hi - lo));
  const snap = v => clampV(Number((Math.round((v - (log ? 0 : lo)) / step) * step + (log ? 0 : lo)).toFixed(6)));
  const toVal = p => snap(log ? lo * Math.pow(hi / lo, clamp01(p)) : lo + (hi - lo) * clamp01(p));
  const start = typeof S.start === 'number' && Number.isFinite(S.start) ? snap(clampV(S.start)) : middle ? toVal(0.5) : lo;
  const ticks = n => (Math.round(n) < 2 ? [] : Array.from({ length: Math.round(n) }, (_, i) => toVal(i / (Math.round(n) - 1))));
  const show = v => fmt(v, S.step, S.unit);
  const tickText = t => (Number.isInteger(t) ? t.toLocaleString('en') : fmt(t, S.step, ''));
  return { lo, hi, log, step, clampV, toPos, toVal, snap, start, ticks, show, tickText };
}

// ---------------------------------------------------------------- labels
// An item's label: its words, and its picture when it has one ({ id, text, image }). Pictures load through
// the app's media (a path in the topic), after the label is drawn.
export const label = item => `${item.image ? `<img class="pi-img" alt="" draggable="false" data-src="${esc(item.image)}">` : ''}<span class="t">${esc(item.text)}</span>`;
export function loadImages(root, media) {
  for (const img of root.querySelectorAll('img[data-src]')) {
    Promise.resolve(media ? media(img.dataset.src) : img.dataset.src).then(url => { if (url) img.src = url; }).catch(() => {});
  }
}

// For the pairing forms (string, snap, sort): which of the answer's pairs were given, one by one.
export const judge = (value, answer) => Object.fromEntries(Object.keys(answer || {}).map(k => [k, !!value && value[k] === answer[k] ? 'right' : 'wrong']));

// ---------------------------------------------------------------- moving tiles
// Puts a tile at x, y in its form by transform only (it rests on a layer of its own), at whole device
// pixels. With `from`, it springs there from where it was, with the app's bounce.
export function placeAt(el, x, y, feel, from = null, ms = 440) {
  const go = (px, py) => `translate3d(${devicePx(px)}px,${devicePx(py)}px,0)`;
  el.style.transform = go(x, y);
  if (from && feel && feel.spring && (Math.abs(from.x - x) > 0.5 || Math.abs(from.y - y) > 0.5)) {
    feel.spring(el, v => go(lerp(from.x, x, v), lerp(from.y, y, v)), 0, 1, { ms });
  }
  el._at = { x, y };
}

// Picking a tile up, carrying it under the finger and dropping it in a place: what Sort and Snap share.
// A tile is any `.pi-tile` in the form, placed by placeAt. While carried it's lifted (a little bigger,
// no shadow) and follows the finger by transform on its own layer. The form says the rest:
//   placeFor(tile, x, y, tx, ty)  where a tile held with the finger at x, y (in the form), its own top
//                         left at tx, ty, would go; or null
//   hover(place)          lights the place it would go to (null: none)
//   drop(tile, place)     the form puts it there (place null: back where it was) and lays itself out
//   tapPlace(x, y)        the place a tap landed on, for tapping a tile and then where it goes
// Returns { picked() }.
export function carry(f, o) {
  let held = null, picked = null, last = undefined;
  const local = (x, y) => { const r = f.root.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  const unpick = () => { if (picked) picked.classList.remove('picked'); picked = null; };
  const stop = f.ctx.track(f.root, {
    blocked: e => f.locked() || !e.target.closest('.pi-tile'),
    start: e => {
      const tile = e.target.closest('.pi-tile');
      const p = local(e.clientX, e.clientY);
      held = { tile, ox: p.x - tile._at.x, oy: p.y - tile._at.y, moved: false };
    },
    move: ({ x, y }) => {
      if (!held) return;
      const p = local(x, y), t = held.tile;
      if (!held.moved) { held.moved = true; unpick(); t.classList.add('lift'); f.feel.tick(); }
      const tx = p.x - held.ox, ty = p.y - held.oy;
      t.style.transform = `translate3d(${devicePx(tx)}px,${devicePx(ty)}px,0) scale(1.04)`;
      const place = o.placeFor(t, p.x, p.y, tx, ty);
      if (place !== last) { last = place; o.hover(place); if (place !== null) f.feel.tick(); }
    },
    release: ({ x, y }) => {
      if (!held) return;
      const t = held.tile, p = local(x, y);
      const from = { x: p.x - held.ox, y: p.y - held.oy };
      held = null; last = undefined;
      t.classList.remove('lift');
      o.hover(null);
      t._at = from;
      o.drop(t, o.placeFor(t, p.x, p.y, from.x, from.y));
      f.feel.sound('select');
    },
    cancel: () => {
      if (!held) return;
      const t = held.tile;
      held = null; last = undefined;
      t.classList.remove('lift');
      o.hover(null);
      o.drop(t, null);
    },
    tap: (e, target) => {
      held = null;
      const tile = (target || e.target).closest('.pi-tile');
      if (tile && tile !== picked) { unpick(); picked = tile; tile.classList.add('picked'); f.feel.sound('select'); return; }
      if (tile === picked) { unpick(); return; }
    },
  });
  // A tap on a place, with a tile picked, takes it there. Places aren't tiles, so they're heard apart (the
  // click after a tap on a tile lands on the form, so what's under the finger is asked).
  const onTap = e => {
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!picked || f.locked() || (under && under.closest('.pi-tile'))) return;
    const p = local(e.clientX, e.clientY);
    const place = o.tapPlace(p.x, p.y);
    if (place === null) return;
    const t = picked;
    unpick();
    o.drop(t, place);
    f.feel.sound('select');
  };
  f.root.addEventListener('click', onTap);
  f.cleanup(() => { stop(); f.root.removeEventListener('click', onTap); });
  return { picked: () => picked, unpick };
}

// The verdict colours and the raised look every form uses, so a new form looks like the others.
export const BASE_CSS = `
.pi { position: relative; color: #fff; font-weight: 800; }
:where(.pi) button { font: inherit; color: inherit; border: 0; background: none; padding: 0; margin: 0; cursor: pointer; touch-action: manipulation; }
.pi.locked { pointer-events: none; }
.pi-img { display: block; width: auto; height: 30px; max-width: 46px; object-fit: contain; flex: none; pointer-events: none; }
/* a tile that's picked up, carried and dropped (sort, snap): placed by transform only, on its own layer */
.pi-tile { position: absolute; left: 0; top: 0; will-change: transform; backface-visibility: hidden; touch-action: none; }
.pi-tile.lift { z-index: 5; transition: none; }
.pi-chips { display: flex; justify-content: center; gap: 10px; margin-top: 10px; min-height: 38px; }
.pi-read { display: inline-flex; align-items: center; height: 38px; padding: 0 14px; border-radius: 13px; background: #fff; color: #1b1f5e; box-shadow: 0 3px 0 #b9c2ee;
  font-size: 19px; white-space: nowrap; }
.pi-read.right { background: #2bc4a4; color: #fff; box-shadow: 0 3px 0 #127a85; }
.pi-read.close { background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; }
.pi-read.wrong { background: #ee4b7a; color: #fff; box-shadow: 0 3px 0 #8f1f44; }
.pi-read.truth { background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; }
`;
