// Pile: a count you can see at a glance. Drag the level up and things pile into the box, a row at a time
// (`per`, five unless the lesson says), so a number reads as rows of fives. The count is written in the
// handle, between its arrows, and every thing added or taken away gives a tick under the thumb. What's
// piled is a setting (`thing`), or any picture from the topic (`thingImage`). On reveal a gold line comes
// in at the true count, its number at the line's far end: things above it fade, and the ones left out show
// as gold rings. It starts at a real count (`start`, or the bottom of its range), as the slider does. The
// level and its handle ride on their own layers and move by transform; things only pop in and out where
// they stand.
import { esc, devicePx, numberScale } from '../kit.js';

// The things to pile, each drawn about 0,0 in a 40 x 40 box: one form, three tones, one highlight, lit
// from the upper left.
export const THINGS = {
  dot: `<circle cy="2" r="15" fill="#1b8fd1"/><circle r="15" fill="#49c6ff"/><path d="M15 0a15 15 0 0 1-26 10a17 17 0 0 0 26-10z" fill="#2fa8e6"/>
    <ellipse cx="-5" cy="-6" rx="6" ry="3.6" fill="#fff" opacity="0.55" transform="rotate(-32 -5 -6)"/>`,
  storm: `<g transform="translate(0 2)" fill="#aebfff"><circle r="9"/>${[0, 120, 240].map(a => `<path transform="rotate(${a})" d="M0 -6C10 -11 18 -2 12 12C13 2 7 -2 0 1Z"/>`).join('')}</g>
    <g fill="#ffffff"><circle r="9"/>${[0, 120, 240].map(a => `<path transform="rotate(${a})" d="M0 -6C10 -11 18 -2 12 12C13 2 7 -2 0 1Z"/>`).join('')}</g>
    <circle r="5.2" fill="none" stroke="#c9d4ff" stroke-width="2"/><circle r="2.6" fill="#1b2a80"/>`,
  drop: `<path d="M0 -17C-6 -8 -12 -2 -12 6a12 12 0 0 0 24 0c0-8-6-14-12-23z" fill="#1b8fd1" transform="translate(0 2)"/>
    <path d="M0 -17C-6 -8 -12 -2 -12 6a12 12 0 0 0 24 0c0-8-6-14-12-23z" fill="#49c6ff"/>
    <path d="M12 6a12 12 0 0 1-20 9a14 14 0 0 0 20-9z" fill="#2fa8e6"/><path d="M-7 5a7 7 0 0 1 3-7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`,
  leaf: `<path d="M-13 14C-15 -2 -4 -14 15 -15C15 2 5 15 -13 14z" fill="#127a85" transform="translate(0 2)"/>
    <path d="M-13 14C-15 -2 -4 -14 15 -15C15 2 5 15 -13 14z" fill="#2bc4a4"/><path d="M-13 14C2 9 12 -2 15 -15C15 2 5 15 -13 14z" fill="#1fa78c"/>
    <path d="M-11 12L11 -10" stroke="#127a85" stroke-width="2" stroke-linecap="round"/><path d="M-8 2C-7 -5 -2 -10 5 -12" fill="none" stroke="#7df0cf" stroke-width="2.6" stroke-linecap="round"/>`,
  star: `<path d="M0 -15l4.4 9.2 10 1.4-7.3 7 1.8 10L0 7.8l-8.9 4.8 1.8-10-7.3-7 10-1.4z" fill="#c98a00" stroke="#c98a00" stroke-width="3" stroke-linejoin="round" transform="translate(0 2)"/>
    <path d="M0 -15l4.4 9.2 10 1.4-7.3 7 1.8 10L0 7.8l-8.9 4.8 1.8-10-7.3-7 10-1.4z" fill="#ffc83d" stroke="#ffc83d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M0 7.8l8.9 4.8-1.8-10 7.3-7-6 -1z" fill="#e8a91c"/><path d="M-3 -6l2.4-5" stroke="#fff3c4" stroke-width="2.6" stroke-linecap="round"/>`,
  coin: `<circle cy="3" r="14" fill="#c98a00"/><circle r="14" fill="#ffc83d"/><path d="M14 0a14 14 0 0 1-24 9a16 16 0 0 0 24-9z" fill="#e8a91c"/>
    <circle r="9" fill="none" stroke="#fff3c4" stroke-width="2" opacity="0.8"/><path d="M-6 -5a8 8 0 0 1 6-4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
};
export const THING_NAMES = Object.keys(THINGS);
const MAX_COUNT = 60;

export const css = `
.pi-pilebox { position: relative; height: calc(var(--pile-h, 220px) + var(--grow, 0px)); border-radius: 22px; background: linear-gradient(180deg, #0a0e2e, #1d1552);
  border: 2px solid #2f3678; box-shadow: 0 4px 0 #2f3678; touch-action: none; }
.pi-pilebox > * { position: absolute; left: 0; top: 0; pointer-events: none; font-style: normal; }
.pi-row { height: 0; border-top: 1px solid rgba(127, 136, 200, 0.12); }
.pi-row b { position: absolute; right: calc(100% + 6px); top: -8px; font-size: 12px; color: #5d66ad; }
.pi-thing { width: 40px; height: 40px; margin: -20px 0 0 -20px; }
.pi-thing > b { display: block; width: 100%; height: 100%; transform: scale(0); opacity: 0; transition: transform 160ms ease-in, opacity 160ms; }
.pi-thing.on > b { transform: scale(1); opacity: 1; transition: transform 300ms cubic-bezier(.3, 1.55, .5, 1), opacity 90ms; }
.pi-thing svg, .pi-thing img { display: block; width: 100%; height: 100%; object-fit: contain; }
.pi-thing.over > b { opacity: 0.22; transform: scale(0.82); transition: opacity 400ms 300ms, transform 400ms 300ms; }
.pi-thing.miss > b { transform: scale(1); opacity: 1; transition: transform 380ms cubic-bezier(.3, 1.55, .5, 1) 450ms, opacity 200ms 450ms; }
.pi-thing.miss > b > * { display: none; }
.pi-thing.miss > b::after { content: ""; position: absolute; inset: 8%; border-radius: 50%; border: 3px solid #ffc83d; background: rgba(255, 200, 61, 0.22); }
.pi-level { height: 3px; margin-top: -1.5px; border-radius: 2px; background: rgba(255, 255, 255, 0.75); will-change: transform; backface-visibility: hidden; }
.pi-level.truth { background: #ffc83d; height: 4px; margin-top: -2px; will-change: auto; }
.pi-handle { width: 46px; height: 76px; margin: -38px 0 0 -23px; border-radius: 18px; background: #fff; box-shadow: 0 4px 0 #b9c2ee; color: #1b1f5e;
  will-change: transform; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 8px 0 7px; }
.pi-handle svg { width: 16px; height: 9px; flex: none; opacity: 0.55; }
.pi-handle b { font-size: 22px; line-height: 1; font-weight: 900; letter-spacing: -0.02em; }
.pi.held .pi-handle { background: #e8f8ff; }
.pi-handle.right { background: #2bc4a4; box-shadow: 0 4px 0 #127a85; color: #fff; }
.pi-handle.right svg, .pi-handle.wrong svg { opacity: 0.8; }
.pi-handle.close { background: #ffc83d; box-shadow: 0 4px 0 #c98a00; }
.pi-handle.wrong { background: #ee4b7a; box-shadow: 0 4px 0 #8f1f44; color: #fff; }
.pi-count.truth { padding: 4px 8px; border-radius: 11px; background: #ffc83d; color: #2a1650; box-shadow: 0 3px 0 #c98a00; font-size: 17px; white-space: nowrap; z-index: 2; }
.pi-pilebox.revealed .pi-row b { visibility: hidden; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  const lo = Math.max(0, Math.round(Math.min(S.min, S.max))), hi = Math.min(MAX_COUNT, Math.max(lo + 1, Math.round(Math.max(S.min, S.max))));
  const sc = numberScale({ min: lo, max: hi, step: 1, start: S.start }, { middle: false });
  const per = Math.max(2, Math.min(10, Math.round(S.per) || 5)), rows = Math.ceil(hi / per);
  const art = S.thingImage ? `<img alt="" draggable="false" data-src="${esc(S.thingImage)}">` : `<svg viewBox="-20 -20 40 40">${THINGS[S.thing] || THINGS.dot}</svg>`;
  const arrow = d => `<svg viewBox="0 0 16 9"><path d="${d}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  root.innerHTML = `<div class="pi-pilebox" data-grow="120" style="--pile-h:${Math.round(Math.max(130, Math.min(250, rows * 34)) + 50)}px">
    ${Array.from({ length: rows }, (_, r) => `<i class="pi-row"><b>${(r + 1) * per}</b></i>`).join('')}
    ${Array.from({ length: hi }, () => `<i class="pi-thing"><b>${art}</b></i>`).join('')}
    <i class="pi-level"></i><i class="pi-level truth" hidden></i>
    <i class="pi-handle">${arrow('M2 7.5l6-6 6 6')}<b class="n"></b>${arrow('M2 1.5l6 6 6-6')}</i><span class="pi-count truth" hidden></span></div>`;
  const box = root.querySelector('.pi-pilebox');
  for (const img of box.querySelectorAll('img[data-src]')) Promise.resolve(f.media(img.dataset.src)).then(u => { if (u) img.src = u; }).catch(() => {});
  const things = [...box.querySelectorAll('.pi-thing')], rowEls = [...box.querySelectorAll('.pi-row')];
  const level = box.querySelector('.pi-level'), truthLine = box.querySelector('.pi-level.truth'), handle = box.querySelector('.pi-handle');
  const num = handle.querySelector('.n'), truthChip = box.querySelector('.pi-count.truth');
  const PAD_L = 34, PAD_R = 62, PAD_T = 26, PAD_B = 24;
  let G = null, count = null;
  const geo = () => {
    const W = box.clientWidth, H = box.clientHeight, areaW = W - PAD_L - PAD_R, rowH = (H - PAD_T - PAD_B) / rows, colW = areaW / per;
    return { W, H, rowH, colW, bottom: H - PAD_B, size: Math.min(46, Math.min(colW, rowH) * 0.86) };
  };
  const levelY = n => G.bottom - G.rowH * (n / per);
  const layout = () => {
    G = geo();
    rowEls.forEach((el, r) => { el.style.width = `${G.W - PAD_L - PAD_R + 8}px`; el.style.transform = `translate3d(${PAD_L - 4}px,${devicePx(G.bottom - G.rowH * (r + 1))}px,0)`; });
    things.forEach((el, i) => {
      const x = PAD_L + G.colW * ((i % per) + 0.5), y = G.bottom - G.rowH * (Math.floor(i / per) + 0.5);
      el.style.transform = `translate3d(${devicePx(x)}px,${devicePx(y)}px,0) scale(${(G.size / 40).toFixed(3)})`;
    });
    level.style.width = truthLine.style.width = `${G.W - PAD_L - PAD_R + 8}px`;
    if (count !== null) show(count);
  };
  const show = n => {
    count = n;
    const y = devicePx(levelY(n)), hx = G.W - PAD_R / 2 - 2;
    level.style.transform = `translate3d(${PAD_L - 4}px,${y}px,0)`;
    // the handle rides the level, held inside the box at the ends so its count is never cut off
    const hy = Math.min(G.H - 40, Math.max(40, y));
    handle.style.transform = `translate3d(${devicePx(hx)}px,${devicePx(hy)}px,0)`;
    num.textContent = String(n);
    things.forEach((el, i) => el.classList.toggle('on', i < n));
  };
  const ro = new ResizeObserver(() => layout());
  ro.observe(box);
  f.cleanup(() => ro.disconnect());
  const fromY = clientY => {
    const r = box.getBoundingClientRect();
    return sc.snap((G.bottom - (clientY - r.top)) / G.rowH * per);
  };
  // every thing added or taken away is a tick under the thumb, by tap or by drag (a jump of several, a few)
  const to = n => {
    if (f.locked() || n === count) return;
    const by = Math.abs(n - (count ?? n));
    show(n);
    f.set(n, true);
    for (let i = 0; i < Math.min(3, Math.max(1, by)); i++) feel.tick();
  };
  const begin = () => { layout(); show(sc.start); f.set(sc.start, true); };
  begin();
  // Held by the handle, the count follows the finger from where it was, so taking hold never jumps it (the
  // handle can sit a little off the level at the ends); anywhere else in the box, it goes where the finger is.
  let grab = null;
  f.cleanup(f.ctx.track(box, {
    blocked: () => f.locked(),
    start: e => {
      root.classList.add('held');
      const h = handle.getBoundingClientRect();
      grab = e.clientX >= h.left - 8 && e.clientX <= h.right + 8 && e.clientY >= h.top - 8 && e.clientY <= h.bottom + 8 ? { y: e.clientY, n: count } : null;
      if (!grab) to(fromY(e.clientY));
    },
    move: ({ y }) => to(grab ? sc.snap(grab.n + ((grab.y - y) / G.rowH) * per) : fromY(y)),
    release: () => { root.classList.remove('held'); feel.sound('select'); },
    cancel: () => root.classList.remove('held'),
    tap: e => { root.classList.remove('held'); to(fromY(e.clientY)); feel.sound('select'); },
  }));
  return {
    reveal(answer) {
      const n = count, t = Math.max(lo, Math.min(hi, Math.round(answer)));
      things.forEach((el, i) => { el.classList.toggle('over', i >= t && i < n); el.classList.toggle('miss', i < t && i >= n); });
      if (t !== n) {
        const y = devicePx(levelY(t));
        box.classList.add('revealed');
        truthLine.hidden = false;
        truthLine.style.transform = `translate3d(${PAD_L - 4}px,${y}px,0)`;
        if (feel.spring) feel.spring(truthLine, v => `translate3d(${PAD_L - 4}px,${y}px,0) scaleX(${v})`, 0, 1, { ms: 420 });
        // the true count at the far end of its line from the handle, where the row numbers were
        truthChip.hidden = false;
        truthChip.textContent = String(t);
        const place = `translate3d(4px,${devicePx(y - truthChip.offsetHeight / 2)}px,0)`;
        truthChip.style.transform = place;
        if (feel.spring) feel.spring(truthChip, v => `${place} scale(${v})`, 0.6, 1, { ms: 480 });
      }
    },
    mark(kind) { handle.classList.add(kind); },
    debug: () => ({ count, inHandle: num.textContent }),
    reset() {
      handle.className = 'pi-handle';
      box.classList.remove('revealed');
      truthLine.hidden = true; truthChip.hidden = true;
      things.forEach(el => el.classList.remove('over', 'miss'));
      count = null;
      begin();
    },
  };
}
