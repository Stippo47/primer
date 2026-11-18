// Slider: set a value on a scale, linear or stretched. It starts at a real value with its fill showing
// (`start`, or the middle of the scale), so there's always something to see and something to check. A
// picture above it (`picture`) follows the value. The thumb and its chip move by transform, on their own
// layer, at whole device pixels: nothing under them is repainted as they move, so nothing is left behind.
import { esc, devicePx, numberScale } from '../kit.js';
import { PICTURES, pictureSvg, pictureK, setPicture } from '../pictures.js';

export const css = `
.pi.form-slider { padding: 46px 6px 4px; }
.pi.form-slider.with-pic { padding-top: 0; }
/* the picture takes the room a step leaves (data-grow: up to that many pixels more, given as --grow) */
.pi-pic { display: flex; justify-content: center; align-items: flex-end; height: calc(124px + var(--grow, 0px)); margin-bottom: 44px; pointer-events: none; }
.pi-pic svg { overflow: visible; height: calc(100% - 4px); width: auto; max-width: 100%; }
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
.pi-chip.close { background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; }
.pi-chip.wrong { background: #ee4b7a; color: #fff; box-shadow: 0 3px 0 #8f1f44; }
.pi-mark { position: absolute; top: 14px; width: 6px; height: 28px; margin-left: -3px; border-radius: 3px; background: #ffc83d; box-shadow: 0 2px 0 #c98a00; }
.pi-gap { position: absolute; top: 25px; height: 6px; border-radius: 3px; background: rgba(255, 200, 61, 0.45); }
.pi-ticks { position: relative; height: 18px; margin: 4px 14px 0; color: #7f88c8; font-size: 12px; }
.pi-ticks span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.pi.form-slider.revealed .pi-ticks { visibility: hidden; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  const sc = numberScale(S);
  const ticks = sc.ticks(Math.max(0, S.ticks));
  const pic = PICTURES[S.picture] ? S.picture : null;
  const picK = pictureK(S, sc);
  root.innerHTML = `${pic ? `<div class="pi-pic" data-grow="116" aria-hidden="true">${pictureSvg(pic)}</div>` : ''}
    <div class="pi-track"><div class="pi-rail"></div><div class="pi-fill"></div><div class="pi-gap" hidden></div><div class="pi-mark" hidden></div>
      <div class="pi-thumb"></div><div class="pi-chip"></div><div class="pi-chip truth" hidden></div></div>
    <div class="pi-ticks">${ticks.map(t => `<span style="left:${(sc.toPos(t) * 100).toFixed(2)}%">${esc(sc.tickText(t))}</span>`).join('')}</div>`;
  root.classList.toggle('with-pic', !!pic);
  const trackEl = root.querySelector('.pi-track'), thumb = root.querySelector('.pi-thumb'), chip = root.querySelector('.pi-chip');
  const fill = root.querySelector('.pi-fill'), picEl = root.querySelector('.pi-pic svg');
  let shown = null, width = 0;
  const show = v => {
    shown = v;
    width = trackEl.clientWidth || width;
    const x = devicePx(sc.toPos(v) * width);
    thumb.style.transform = `translate3d(${x}px,0,0)`;
    chip.style.transform = `translate3d(${x}px,0,0) translateX(-50%)`;
    fill.style.width = `${Math.max(12, x + 6)}px`;
    chip.textContent = sc.show(v);
    if (pic) setPicture(pic, picEl, picK(v));
  };
  // Laid out late (a lesson fades in, a sheet slides): place it again once its width is known.
  const ro = new ResizeObserver(() => { if (shown !== null && trackEl.clientWidth !== width) show(shown); });
  ro.observe(trackEl);
  f.cleanup(() => ro.disconnect());
  const from = x => {
    if (f.locked()) return;
    const r = trackEl.getBoundingClientRect();
    const v = sc.toVal((x - r.left) / r.width);
    if (v === f.value()) return;
    show(v);
    f.set(v, true);
  };
  const begin = () => { show(sc.start); f.set(shown, true); };
  begin();
  f.cleanup(f.ctx.track(trackEl, {
    start: e => { root.classList.add('held'); from(e.clientX); },
    move: ({ x }) => from(x),
    release: () => { root.classList.remove('held'); if (!f.locked()) feel.sound('select'); },
    cancel: () => root.classList.remove('held'),
    tap: e => { root.classList.remove('held'); from(e.clientX); feel.sound('select'); },
  }));
  return {
    reveal(answer) {
      root.classList.add('revealed');
      const truth = root.querySelector('.pi-chip.truth'), mark = root.querySelector('.pi-mark'), gap = root.querySelector('.pi-gap');
      const p = sc.toPos(answer);
      mark.hidden = false; mark.style.left = `${(p * 100).toFixed(2)}%`;
      truth.hidden = false; truth.style.left = `${(p * 100).toFixed(2)}%`; truth.textContent = sc.show(answer);
      if (f.value() !== null) {
        const a = Math.min(p, sc.toPos(f.value())), b = Math.max(p, sc.toPos(f.value()));
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
