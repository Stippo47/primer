// Match (the old way of pairing): tap one on each side. Kept so lessons that use it still play; String
// is the newer way to pair things and `primer check` suggests it.
import { esc, shuffled } from '../kit.js';

export const css = `
.pi-match { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pi-match .col { display: flex; flex-direction: column; gap: 10px; }
.pi-cell { position: relative; min-height: 52px; padding: 8px 12px 8px 26px; border-radius: 15px; text-align: left; background: #1b2250; border: 2px solid #364090;
  box-shadow: 0 4px 0 #2f3678; font-size: calc(14.5px * var(--ts, 1)); line-height: 1.15; transition: transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms; }
.pi-cell.down { transform: translateY(4px); box-shadow: 0 0 0 #2f3678; transition-duration: 50ms; }
.pi-cell .dot { position: absolute; left: 9px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: #2f3678; }
.pi-cell.on { border-color: #fff; background: #222a60; }
.pi-cell.right { background: #1d5f63; }
.pi-cell.wrong { background: #5a2050; }
.pi-cell small { display: block; color: #ffc83d; font-size: 12px; margin-top: 3px; }
`;

export function mount(f) {
  const { root, S } = f;
  const COLOURS = ['#49c6ff', '#ffc83d', '#2bc4a4', '#ee4b7a', '#a67cf5'];
  const left = S.left, right = S.shuffle ? shuffled(S.right) : S.right.slice();
  let pairs = {}, holding = null; // holding: { side, id }
  root.innerHTML = `<div class="pi-match"><div class="col">${left.map(x => `<button class="pi-cell" data-side="l" data-id="${esc(x.id)}" data-sound="select"><span class="dot"></span>${esc(x.text)}</button>`).join('')}</div>
    <div class="col">${right.map(x => `<button class="pi-cell" data-side="r" data-id="${esc(x.id)}" data-sound="select"><span class="dot"></span>${esc(x.text)}</button>`).join('')}</div></div>`;
  const paint = () => {
    const colourOf = {};
    left.forEach((x, i) => { if (pairs[x.id]) { colourOf[`l:${x.id}`] = COLOURS[i % COLOURS.length]; colourOf[`r:${pairs[x.id]}`] = COLOURS[i % COLOURS.length]; } });
    for (const c of root.querySelectorAll('.pi-cell')) {
      const k = `${c.dataset.side}:${c.dataset.id}`;
      const col = colourOf[k];
      c.style.borderColor = col || '';
      c.querySelector('.dot').style.background = col || '';
      c.classList.toggle('on', !!holding && holding.side === c.dataset.side && holding.id === c.dataset.id);
    }
    f.set({ ...pairs }, Object.keys(pairs).length === left.length);
  };
  const onTap = e => {
    const c = e.target.closest('.pi-cell');
    if (!c || f.locked()) return;
    const side = c.dataset.side, id = c.dataset.id;
    const pairedLeft = side === 'l' ? (pairs[id] ? id : null) : Object.keys(pairs).find(k => pairs[k] === id);
    if (pairedLeft && !holding) { delete pairs[pairedLeft]; paint(); return; }
    if (!holding || holding.side === side) { holding = holding && holding.id === id ? null : { side, id }; paint(); return; }
    const l = side === 'l' ? id : holding.id, r = side === 'r' ? id : holding.id;
    for (const k of Object.keys(pairs)) if (k === l || pairs[k] === r) delete pairs[k];
    pairs[l] = r;
    holding = null;
    paint();
  };
  root.addEventListener('click', onTap);
  f.cleanup(() => root.removeEventListener('click', onTap));
  paint();
  return {
    reveal(answer) {
      for (const c of root.querySelectorAll('.pi-cell[data-side="l"]')) {
        const want = (answer || {})[c.dataset.id];
        const ok = pairs[c.dataset.id] === want;
        c.classList.add(ok ? 'right' : 'wrong');
        if (!ok) {
          const r = S.right.find(x => x.id === want);
          if (r) c.insertAdjacentHTML('beforeend', `<small>${esc(r.text)}</small>`);
        }
      }
    },
    reset() { pairs = {}; holding = null; paint(); },
  };
}
