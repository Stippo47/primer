// Slider: set a value on a scale, linear or stretched. It starts at a real value with its fill showing
// (`start`, or the middle of the scale), so there's always something to see and something to check.
//
// One slider, many ways of looking: `direction` runs it across (right), up or down, and `look` draws its
// track (tracks.js): a plain rail, a thermometer, or the sea cut away. A picture (`picture`) follows the
// value, above an across slider or beside an up or down one. Left to itself, a slider takes the look that
// goes with its picture (warmth: a thermometer, running up; depth: the sea, running down) and a look runs
// its own way, so a lesson only names the picture. Everything here is the same for every look: the finger,
// the value's chip, the numbers along the scale, the truth on reveal.
//
// The handle and its chip move by transform, on their own layers, at whole device pixels: nothing under
// them is repainted as they move, so nothing is left behind. The track's drawing only changes attributes.
import { esc, devicePx, numberScale } from '../kit.js';
import { PICTURES, pictureSvg, pictureK, setPicture, livePicture } from '../pictures.js';
import { TRACKS, along } from '../tracks.js';
import { onFrame } from '../clock.js';

const V_HEIGHT = 236;   // an up or down slider's height before a step gives it more room
const LABELS = 46, CHIP = 92;   // room beside an up or down track for the numbers and for the value's chip

export const css = `
.pi.form-slider { padding: 46px 6px 4px; }
.pi.form-slider.with-pic { padding-top: 0; }
.pi.form-slider.vert { padding: 4px 0 6px; }
/* the picture takes the room a step leaves (data-grow: up to that many pixels more, given as --grow) */
.pi-pic { display: flex; justify-content: center; align-items: flex-end; height: calc(124px + var(--grow, 0px)); margin-bottom: 44px; pointer-events: none; }
.pi-pic svg { overflow: visible; height: calc(100% - 4px); width: auto; max-width: 100%; }
.pi-track { position: relative; height: 56px; margin: 0 14px; touch-action: none; }
.pi-track > .pi-look { position: absolute; left: 0; top: 0; pointer-events: none; }
.pi-look > svg { position: absolute; left: 0; top: 0; overflow: visible; }
.pi-look > svg.own { will-change: transform; backface-visibility: hidden; }
.pi-vert { display: flex; align-items: stretch; gap: 4px; height: calc(${V_HEIGHT}px + var(--grow, 0px)); }
.pi-vert.alone { justify-content: center; padding-right: 40px; }
.pi-vert > .pi-track { height: auto; margin: 0; flex: none; z-index: 1; }
.pi-vert > .pi-track.fills { flex: 1 1 auto; }
.pi-vert > .pi-pic { flex: 1 1 0; min-width: 0; height: auto; margin: 0; align-items: center; justify-content: center; }
.pi-vert > .pi-pic svg { flex: none; max-width: none; }
/* the thumb and its chip ride on their own layers and move by transform (no repaint under them) */
.pi-thumb { position: absolute; left: 0; top: 0; width: 32px; height: 32px; margin: -16px 0 0 -16px; border-radius: 50%; background: #fff; box-shadow: 0 4px 0 #b9c2ee;
  will-change: transform; backface-visibility: hidden; }
.pi.held .pi-thumb { background: #e8f8ff; }
.pi-chip { position: absolute; left: 0; top: 0; padding: 5px 10px; border-radius: 12px; background: #fff; color: #1b1f5e;
  box-shadow: 0 3px 0 #b9c2ee; font-size: 15px; white-space: nowrap; will-change: transform; backface-visibility: hidden; }
.pi-chip.truth { will-change: auto; background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; z-index: 2; }
.pi-chip.right { background: #2bc4a4; color: #fff; box-shadow: 0 3px 0 #127a85; }
.pi-chip.close { background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; }
.pi-chip.wrong { background: #ee4b7a; color: #fff; box-shadow: 0 3px 0 #8f1f44; }
.pi-mark { position: absolute; border-radius: 3px; background: #ffc83d; box-shadow: 0 2px 0 #c98a00; }
.pi-gap { position: absolute; border-radius: 3px; background: rgba(255, 200, 61, 0.45); }
.pi-ticks { position: relative; height: 18px; margin: 4px 14px 0; color: #7f88c8; font-size: 12px; }
.pi-ticks span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.pi-track .pi-ticks { position: absolute; inset: 0; height: auto; margin: 0; pointer-events: none; }
.pi-track .pi-ticks span { transform: translate(-100%, -50%); }
.pi-track .pi-ticks.inside span { padding: 1px 7px; border-radius: 9px; background: rgba(14, 20, 54, 0.55); color: #dde4ff; }
.pi.form-slider.revealed .pi-ticks { visibility: hidden; }
`;

// Which look a slider has and which way it runs: what the lesson says, else what goes with its picture,
// and a look's own way. Whether the picture is drawn beside it: not when the look already is that picture.
export function lookOf(S) {
  const pic = PICTURES[S.picture] ? S.picture : null;
  const name = TRACKS[S.look] ? S.look : (pic && PICTURES[pic].look) || 'plain';
  const look = TRACKS[name];
  const dir = look.directions.includes(S.direction) ? S.direction : look.direction;
  return { name, look, dir, pic, showPic: !!pic && !look.line };
}

export function mount(f) {
  const { root, S, feel } = f;
  const sc = numberScale(S);
  const ticks = sc.ticks(Math.max(0, S.ticks));
  const { name, look, dir, pic, showPic } = lookOf(S);
  const vert = dir !== 'right';
  const picK = pictureK(S, sc);
  const picHtml = showPic ? `<div class="pi-pic" ${vert ? '' : 'data-grow="116"'} aria-hidden="true">${pictureSvg(pic)}</div>` : '';
  const trackHtml = `<div class="pi-track${look.line ? ' fills' : ''}" data-look="${name}" data-dir="${dir}"><div class="pi-look" aria-hidden="true"></div>
      <div class="pi-gap" hidden></div><div class="pi-mark" hidden></div>
      <div class="pi-thumb"></div><div class="pi-chip"></div><div class="pi-chip truth" hidden></div>
      ${vert ? `<div class="pi-ticks${look.labels === 'inside' ? ' inside' : ''}"></div>` : ''}</div>`;
  root.innerHTML = vert
    ? `<div class="pi-vert${showPic || look.line ? '' : ' alone'}" data-grow="140">${trackHtml}${picHtml}</div>`
    : `${picHtml}${trackHtml}<div class="pi-ticks"></div>`;
  root.classList.toggle('with-pic', showPic && !vert);
  root.classList.toggle('vert', vert);
  const trackEl = root.querySelector('.pi-track'), lookEl = trackEl.querySelector('.pi-look');
  const thumb = root.querySelector('.pi-thumb'), chip = root.querySelector('.pi-chip');
  const tickEl = root.querySelector('.pi-ticks'), picEl = root.querySelector('.pi-pic svg');
  if (vert && !look.line) trackEl.style.width = `${LABELS + look.across + CHIP}px`;
  if (!vert) trackEl.style.height = `${look.across}px`;
  if (picEl) f.cleanup(livePicture(pic, picEl));

  // The run, in the track's box: where the handle is at the low end and at the high end.
  let W = 0, H = 0, g = null, shown = null, truth = null;
  const runOf = () => {
    if (look.line) return look.line(W, H);
    const [a, b] = vert ? look.vpad : look.pad;
    if (dir === 'right') return { x0: a, y0: H / 2, x1: W - b, y1: H / 2 };
    const x = LABELS + look.across / 2;
    return dir === 'up' ? { x0: x, y0: H - a, x1: x, y1: b } : { x0: x, y0: a, x1: x, y1: H - b };
  };
  const kOf = v => (pic ? picK(v) : sc.toPos(v));
  const layout = () => {
    W = trackEl.clientWidth; H = trackEl.clientHeight;
    if (!W || !H) return false;
    g = { ...runOf(), W, H };
    // one svg, or three on layers of their own (behind, the value's, in front)
    const drawn = look.draw(W, H, g, dir), layers = typeof drawn === 'string' ? [drawn] : [drawn.back, drawn.value, drawn.front];
    lookEl.innerHTML = layers.map(m => `<svg class="${layers.length > 1 ? 'own' : ''}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${m}</svg>`).join('');
    // the numbers along the scale: under an across track, beside an up or down one
    tickEl.innerHTML = ticks.map(t => {
      const p = sc.toPos(t);
      if (!vert) return `<span style="left:${(((g.x0 + (g.x1 - g.x0) * p) / W) * 100).toFixed(2)}%">${esc(sc.tickText(t))}</span>`;
      const [x, y] = along(g, p);
      const lx = look.labels === 'inside' ? W - 12 : x - look.across / 2 - 8;
      return `<span style="left:${lx.toFixed(1)}px;top:${y.toFixed(1)}px">${esc(sc.tickText(t))}</span>`;
    }).join('');
    // beside an up or down track, the picture is as big as its room lets it be: it may reach a little
    // past its column, over the empty side of the track's
    if (vert && picEl) {
      const col = picEl.parentElement, P = PICTURES[pic];
      const w = Math.max(40, Math.min(col.clientWidth * 1.45, (col.clientHeight * 0.86 * P.w) / P.h));
      picEl.style.width = `${Math.round(w)}px`; picEl.style.height = `${Math.round((w * P.h) / P.w)}px`;
    }
    return true;
  };
  const show = v => {
    shown = v;
    if (!g && !layout()) return;
    const p = sc.toPos(v), [x, y] = along(g, p);
    thumb.style.transform = `translate3d(${devicePx(x)}px,${devicePx(y)}px,0)`;
    chip.textContent = sc.show(v);
    const cw = chip.offsetWidth, ch = chip.offsetHeight;
    const cx = vert ? x + 26 : x - cw / 2, cy = vert ? y - ch / 2 : y - 24 - ch - 4;
    chip.style.transform = `translate3d(${devicePx(cx)}px,${devicePx(cy)}px,0)`;
    look.set(lookEl, p, kOf(v), g);
    if (pic && picEl) setPicture(pic, picEl, picK(v));
  };
  if (look.move) f.cleanup(onFrame(lookEl, t => { if (g && shown !== null) look.move(lookEl, t, sc.toPos(shown), g); }));
  // Laid out late (a lesson fades in, a sheet slides, a step gives it room): drawn again at its size.
  const ro = new ResizeObserver(() => {
    if (trackEl.clientWidth === W && trackEl.clientHeight === H) return;
    if (layout() && shown !== null) { show(shown); if (truth !== null) placeTruth(truth); }
  });
  ro.observe(trackEl);
  f.cleanup(() => ro.disconnect());
  const from = (cx, cy) => {
    if (f.locked() || !g) return;
    const r = trackEl.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
    const dx = g.x1 - g.x0, dy = g.y1 - g.y0;
    const v = sc.toVal(((px - g.x0) * dx + (py - g.y0) * dy) / (dx * dx + dy * dy || 1));
    if (v === f.value()) return;
    show(v);
    f.set(v, true);
  };
  const begin = () => { show(sc.start); f.set(sc.start, true); };
  begin();
  f.cleanup(f.ctx.track(trackEl, {
    start: e => { root.classList.add('held'); from(e.clientX, e.clientY); },
    move: ({ x, y }) => from(x, y),
    release: () => { root.classList.remove('held'); if (!f.locked()) feel.sound('select'); },
    cancel: () => root.classList.remove('held'),
    tap: e => { root.classList.remove('held'); from(e.clientX, e.clientY); feel.sound('select'); },
  }));

  // The truth: a gold mark across the run at the true value, its chip on the far side from the value's,
  // and a gold band along the run between the two.
  const placeTruth = answer => {
    const t = root.querySelector('.pi-chip.truth'), mark = root.querySelector('.pi-mark'), gap = root.querySelector('.pi-gap');
    const p = sc.toPos(answer), [x, y] = along(g, p);
    const long = look.line ? W - 16 : 28, thick = look.line ? 4 : 6;
    const box = (el, cx, cy, w, h) => Object.assign(el.style, { left: `${devicePx(cx - w / 2)}px`, top: `${devicePx(cy - h / 2)}px`, width: `${w}px`, height: `${h}px` });
    mark.hidden = false;
    if (vert) box(mark, look.line ? W / 2 : x, y, long, thick); else box(mark, x, y, thick, long);
    t.hidden = false;
    t.textContent = sc.show(answer);
    const tw = t.offsetWidth, th = t.offsetHeight;
    const tx = vert ? (look.line ? x - 26 - tw : x - look.across / 2 - 8 - tw) : x - tw / 2;
    const ty = vert ? y - th / 2 : y + look.across / 2 - 4;
    Object.assign(t.style, { left: `${devicePx(Math.max(look.line ? 6 : 0, tx))}px`, top: `${devicePx(ty)}px` });
    if (f.value() !== null) {
      const [ax, ay] = along(g, sc.toPos(f.value()));
      gap.hidden = Math.abs(ax - x) + Math.abs(ay - y) < 1;
      if (vert) box(gap, x, (y + ay) / 2, 6, Math.abs(ay - y)); else box(gap, (x + ax) / 2, y, Math.abs(ax - x), 6);
    }
    return t;
  };
  return {
    reveal(answer) {
      root.classList.add('revealed');
      truth = answer;
      const t = placeTruth(answer);
      if (feel.spring) feel.spring(t, v => `scale(${v})`, 0.6, 1, { ms: 480 });
    },
    mark(kind) { chip.classList.add(kind); },
    reset() {
      root.classList.remove('revealed');
      truth = null;
      for (const x of root.querySelectorAll('.pi-chip.truth, .pi-mark, .pi-gap')) x.hidden = true;
      chip.className = 'pi-chip';
      begin();
    },
    debug: () => ({ look: name, direction: dir, picture: showPic ? pic : null, run: g, k: shown === null ? null : kOf(shown) }),
  };
}
