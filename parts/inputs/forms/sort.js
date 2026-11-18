// Sort: drop each thing into the bin it belongs in. Two to four bins, each with its words and, if it has
// one, a small picture; many things can go in one bin, so it suits "which kind is it?". Pick a thing up
// and drop it in a bin, or tap it and then the bin; drop it back in the tray to take it out again. On reveal
// the right ones turn green; the wrong ones show pink a moment, then hop across to where they belong, in gold.
// Every thing is a tile placed by transform alone (kit.js, carry): carried on its own layer, dropped with
// the spring.
import { esc, label, loadImages, shuffled, judge, placeAt, carry } from '../kit.js';

export const css = `
.pi-sortbox { position: relative; }
.pi-bin { position: absolute; left: 0; top: 0; border-radius: 20px; background: #1b2250; border: 2px solid #364090; box-shadow: 0 4px 0 #2f3678; transition: border-color 120ms, background 120ms; }
.pi-bin.hover { border-color: #6fd6ff; background: #1f2862; }
.pi-bin .head { position: absolute; left: 0; right: 0; top: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0 6px;
  text-align: center; font-size: calc(15px * var(--ts, 1)); line-height: 1.1; }
.pi-bin .head .pi-img { height: 32px; max-width: 60px; }
.pi-bin .slot { position: absolute; left: 6px; right: 6px; border-radius: 13px; background: rgba(15, 20, 52, 0.55); }
.pi-tray { position: absolute; left: 0; right: 0; border-radius: 18px; background: rgba(15, 20, 52, 0.4); }
.pi-sorttile { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 13px; text-align: center;
  background: #222a60; border: 2px solid #364090; box-shadow: 0 3px 0 #2f3678; font-size: calc(13.5px * var(--ts, 1)); line-height: 1.12; z-index: 2;
  transition: border-color 120ms, background 120ms; }
.pi-sorttile .pi-img { height: 24px; max-width: 34px; }
.pi-sorttile.in { border-color: #6fd6ff; box-shadow: 0 3px 0 #1b8fd1; }
.pi-sorttile.picked { border-color: #ffffff; background: #2a3372; }
.pi-sorttile.lift { border-color: #6fd6ff; background: #2a3372; box-shadow: 0 3px 0 #1b8fd1; }
.pi-sorttile.right { background: #1d5f63; border-color: #2bc4a4; box-shadow: 0 3px 0 #127a85; }
.pi-sorttile.wrong { background: #5a2050; border-color: #ee4b7a; box-shadow: 0 3px 0 #8f1f44; }
.pi-sorttile.truth { background: #3a3150; border-color: #ffc83d; box-shadow: 0 3px 0 #c98a00; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  const bins = S.bins, items = S.shuffle === false ? S.items.slice() : shuffled(S.items);
  root.innerHTML = `<div class="pi-sortbox">
      ${bins.map(b => `<div class="pi-bin" data-bin="${esc(b.id)}"><div class="head">${label(b)}</div></div>`).join('')}
      <div class="pi-tray"></div>
      ${items.map(x => `<button class="pi-tile pi-sorttile" data-id="${esc(x.id)}" data-sound="none">${label(x)}</button>`).join('')}</div>`;
  loadImages(root, f.media);
  const box = root.querySelector('.pi-sortbox'), tray = box.querySelector('.pi-tray');
  const binEl = id => box.querySelector(`.pi-bin[data-bin="${CSS.escape(id)}"]`);
  const tiles = [...box.querySelectorAll('.pi-sorttile')];
  const tileOf = id => tiles.find(t => t.dataset.id === id);
  let where = {}, seq = Object.fromEntries(bins.map(b => [b.id, []]));
  let G = null;
  const GAP = 8, PAD = 6, STEP = 6;
  // Lays the bins, the tray and every tile out for the form's width. Tiles all have one size, so a tile is
  // the same in the tray and in a bin; bins have room for a fair share and grow if more go in.
  const layout = (animate = false) => {
    const W = box.clientWidth, n = bins.length, binW = (W - GAP * (n - 1)) / n, tileW = binW - PAD * 2;
    let tileH = 42;
    for (const t of tiles) { t.style.width = `${tileW}px`; t.style.height = 'auto'; tileH = Math.max(tileH, t.offsetHeight); }
    let headH = 46;
    for (const b of bins) { const h = binEl(b.id).querySelector('.head'); h.style.height = 'auto'; headH = Math.max(headH, h.scrollHeight + 12); }
    const slots = Math.max(Math.ceil(items.length / n) + 1, ...bins.map(b => seq[b.id].length));
    const binH = headH + slots * (tileH + STEP) + PAD - STEP + 4;
    const trayTop = binH + 18, trayRows = Math.ceil(items.length / n);
    const trayH = trayRows * (tileH + 10) + 10;
    box.style.height = `${trayTop + trayH + 4}px`;
    tray.style.top = `${trayTop}px`; tray.style.height = `${trayH}px`;
    G = { W, binW, tileW, tileH, headH, binH, trayTop, trayH, bins: {} };
    bins.forEach((b, i) => {
      const el = binEl(b.id), x = i * (binW + GAP);
      el.style.cssText = `width:${binW}px;height:${binH}px;transform:translate3d(${x}px,0,0)`;
      el.querySelector('.head').style.height = `${headH}px`;
      el.querySelectorAll('.slot').forEach(s => s.remove());
      for (let k = 0; k < slots; k++) el.insertAdjacentHTML('beforeend', `<i class="slot" style="top:${headH + k * (tileH + STEP) - 2}px;height:${tileH}px"></i>`);
      G.bins[b.id] = { x, y: 0, w: binW, h: binH };
    });
    for (const t of tiles) t.style.height = `${tileH}px`;
    items.forEach((it, j) => {
      const t = tileOf(it.id), b = where[it.id];
      let x, y;
      if (b) { const k = seq[b].indexOf(it.id); x = G.bins[b].x + PAD; y = headH + k * (tileH + STEP) - 2; }
      else { x = (j % n) * (binW + GAP) + PAD; y = trayTop + 10 + Math.floor(j / n) * (tileH + 10); }
      const from = animate && t._at ? t._at : null;
      placeAt(t, x, y, feel, from);
      t.classList.toggle('in', !!b);
    });
  };
  const report = () => f.set({ ...where }, items.every(x => where[x.id]));
  const inRect = (r, x, y, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
  const placeAtPoint = (x, y) => {
    for (const b of bins) if (inRect(G.bins[b.id], x, y, 4)) return b.id;
    if (y >= G.trayTop - 8) return 'tray';
    return null;
  };
  const move = (id, place) => {
    const from = where[id];
    if (from) seq[from] = seq[from].filter(x => x !== id);
    if (place && place !== 'tray') { seq[place].push(id); where[id] = place; } else delete where[id];
  };
  carry(f, {
    placeFor: (tile, x, y) => placeAtPoint(x, y),
    hover: place => { for (const b of bins) binEl(b.id).classList.toggle('hover', place === b.id); },
    drop: (tile, place) => {
      if (place !== null && place !== where[tile.dataset.id]) move(tile.dataset.id, place);
      layout(true);
      report();
      if (place && place !== 'tray') feel.tick();
    },
    tapPlace: (x, y) => placeAtPoint(x, y),
  });
  const ro = new ResizeObserver(() => { if (box.clientWidth !== (G && G.W)) layout(false); });
  ro.observe(box);
  f.cleanup(() => ro.disconnect());
  layout(false);
  report();
  return {
    reveal(answer) {
      const marks = judge(where, answer);
      for (const t of tiles) t.classList.add(marks[t.dataset.id] || 'wrong');
      // a moment later the wrong ones hop to the bin they belong in, in gold
      const wrong = tiles.filter(t => marks[t.dataset.id] !== 'right');
      if (!wrong.length) return;
      setTimeout(() => {
        if (!root.isConnected) return;
        // only the drawing moves: the answer given was reported when it was given, and stays the answer
        for (const t of wrong) { const id = t.dataset.id; move(id, (answer || {})[id] || null); t.classList.remove('wrong'); t.classList.add('truth'); }
        layout(true);
      }, 650);
    },
    reset() {
      where = {}; seq = Object.fromEntries(bins.map(b => [b.id, []]));
      for (const t of tiles) t.classList.remove('right', 'wrong', 'truth', 'in', 'picked');
      layout(true);
      report();
    },
  };
}
