// Snap: jigsaw pieces into sockets. Each thing on the left is a card with a round socket in its right edge;
// each partner is a piece with a plug of exactly that size. The pieces start loose beside the cards, out
// of order; drag one onto a card (or tap it, then the card) and it clicks in, flush, the plug filling the
// socket and the two edges lining up as one block. A piece already there swaps to where the other came from.
// On reveal the right pairs turn green; the wrong pieces lift out and fly to where they belong, in gold.
// Cards and pieces are drawn from one outline each, for their measured size, so the fit is exact at any
// width; pieces are tiles placed by transform alone (kit.js, carry).
import { esc, label, loadImages, shuffled, judge, placeAt, carry } from '../kit.js';

const R = 11, CORNER = 14, DEPTH = 4, LOOSE = 18, GAP = 12;

// A card: rounded on the left, square on the right, with a socket cut into the middle of its right edge.
const cardPath = (w, h) => `M${CORNER} 0H${w}V${h / 2 - R}A${R} ${R} 0 0 0 ${w} ${h / 2 + R}V${h}H${CORNER}A${CORNER} ${CORNER} 0 0 1 0 ${h - CORNER}V${CORNER}A${CORNER} ${CORNER} 0 0 1 ${CORNER} 0Z`;
// A piece: square on the left with a plug of the socket's own radius, rounded on the right.
const piecePath = (w, h) => `M0 0H${w - CORNER}A${CORNER} ${CORNER} 0 0 1 ${w} ${CORNER}V${h - CORNER}A${CORNER} ${CORNER} 0 0 1 ${w - CORNER} ${h}H0V${h / 2 + R}A${R} ${R} 0 0 1 0 ${h / 2 - R}Z`;
const plugPath = h => `M0 ${h / 2 + R}A${R} ${R} 0 0 1 0 ${h / 2 - R}Z`;
// A piece's body without its plug: its side (its thickness, below it) is drawn from this, and the plug's
// own side only while it's loose. Clicked in, the plug sits in the socket and its side is hidden inside.
const bodyPath = (w, h) => `M0 0H${w - CORNER}A${CORNER} ${CORNER} 0 0 1 ${w} ${CORNER}V${h - CORNER}A${CORNER} ${CORNER} 0 0 1 ${w - CORNER} ${h}H0Z`;

export const css = `
.pi-snapbox { position: relative; }
.pi-card, .pi-piece { --face: #1b2250; --line: #364090; --edge: #2f3678; }
.pi-card { position: absolute; left: 0; top: 0; z-index: 1; }
.pi-piece { --face: #222a60; z-index: 2; }
.pi-card > svg, .pi-piece > svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.pi-card .side, .pi-piece .side, .pi-piece .plugside { fill: var(--edge); transition: fill 120ms; }
.pi-card .face, .pi-piece .face { fill: var(--face); stroke: var(--line); stroke-width: 2; stroke-linejoin: round; transition: fill 120ms, stroke 120ms; }
.pi-piece.docked .plugside { display: none; }
.pi-card .lab, .pi-piece .lab { position: absolute; inset: 0; display: flex; align-items: center; gap: 10px; font-size: calc(15px * var(--ts, 1)); line-height: 1.12; }
.pi-card .lab { padding: 0 ${R + 10}px 0 14px; }
.pi-piece .lab { padding: 0 12px 0 ${R + 6}px; justify-content: center; text-align: center; }
.pi-card .lab .t, .pi-piece .lab .t { min-width: 0; }
.pi-card.hover, .pi-piece.docked, .pi-piece.lift, .pi-piece.picked { --face: #222a60; --line: #6fd6ff; --edge: #1b8fd1; }
.pi-card.filled { --face: #222a60; }
.pi-piece.picked { --line: #ffffff; }
.pi-card.right, .pi-piece.right { --face: #1d5f63; --line: #2bc4a4; --edge: #127a85; }
.pi-card.wrong, .pi-piece.wrong { --face: #5a2050; --line: #ee4b7a; --edge: #8f1f44; }
.pi-piece.truth { --face: #3a3150; --line: #ffc83d; --edge: #c98a00; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  const n = Math.min(S.left.length, S.right.length);
  const cards = S.left.slice(0, n), pieceItems = S.right.slice(0, n);
  root.innerHTML = `<div class="pi-snapbox">
      ${cards.map(c => `<div class="pi-card" data-id="${esc(c.id)}"><svg><path class="side"/><path class="face"/></svg><div class="lab">${label(c)}</div></div>`).join('')}
      ${pieceItems.map(p => `<button class="pi-tile pi-piece" data-id="${esc(p.id)}" data-sound="none"><svg><path class="side"/><path class="plugside"/><path class="face"/></svg><div class="lab">${label(p)}</div></button>`).join('')}</div>`;
  loadImages(root, f.media);
  const box = root.querySelector('.pi-snapbox');
  const cardEls = [...box.querySelectorAll('.pi-card')], pieceEls = [...box.querySelectorAll('.pi-piece')];
  const pieceOf = id => pieceEls.find(p => p.dataset.id === id);
  // Which row each piece is in, and whether it's clicked in there. They start loose, out of order.
  const start = () => {
    const order = S.shuffle === false ? pieceItems.map(p => p.id) : shuffled(pieceItems.map(p => p.id), true);
    return { row: Object.fromEntries(order.map((id, i) => [id, i])), docked: {} };
  };
  let st = start(), G = null;
  const shape = (el, d, w, h, extra = '', side = d) => {
    const svg = el.querySelector('svg');
    svg.setAttribute('width', w); svg.setAttribute('height', h + DEPTH);
    svg.querySelector('.side').setAttribute('d', side);
    svg.querySelector('.side').setAttribute('transform', `translate(0 ${DEPTH})`);
    svg.querySelector('.face').setAttribute('d', d);
    if (extra) { svg.querySelector('.plugside').setAttribute('d', extra); svg.querySelector('.plugside').setAttribute('transform', `translate(0 ${DEPTH})`); }
  };
  const layout = (animate = false) => {
    const W = box.clientWidth, CW = Math.round(W * 0.52), PW = W - CW - LOOSE;
    let H = 58;
    for (const el of cardEls) { el.style.width = `${CW}px`; el.style.height = 'auto'; }
    for (const el of [...cardEls, ...pieceEls]) {
      const lab = el.querySelector('.lab');
      lab.style.position = 'static'; lab.style.width = `${el.classList.contains('pi-card') ? CW : PW}px`;
      H = Math.max(H, lab.scrollHeight + 18);
      lab.style.position = ''; lab.style.width = '';
    }
    H = Math.round(H);
    G = { W, CW, PW, H, rowY: i => i * (H + DEPTH + GAP) };
    box.style.height = `${n * (H + DEPTH + GAP) - GAP}px`;
    cardEls.forEach((el, i) => {
      el.style.cssText = `width:${CW}px;height:${H}px;transform:translate3d(0,${G.rowY(i)}px,0)`;
      shape(el, cardPath(CW, H), CW, H);
    });
    for (const el of pieceEls) {
      const id = el.dataset.id, docked = !!st.docked[id];
      el.style.width = `${PW}px`; el.style.height = `${H}px`;
      shape(el, piecePath(PW, H), PW, H, plugPath(H), bodyPath(PW, H));
      el.classList.toggle('docked', docked);
      placeAt(el, docked ? CW : CW + LOOSE, G.rowY(st.row[id]), feel, animate && el._at ? el._at : null);
    }
    cardEls.forEach((el, i) => el.classList.toggle('filled', pieceEls.some(p => st.row[p.dataset.id] === i && st.docked[p.dataset.id])));
  };
  const report = () => {
    const v = {};
    cards.forEach((c, i) => { const p = pieceItems.find(q => st.row[q.id] === i && st.docked[q.id]); if (p) v[c.id] = p.id; });
    f.set(v, pieceItems.every(p => st.docked[p.id]));
  };
  // The row a piece would click into: the socket nearest its plug, if near enough.
  const rowFor = (x, y, plugX) => {
    if (plugX !== null && Math.abs(plugX - G.CW) > G.PW * 0.75) return null;
    let best = null, bd = Infinity;
    cardEls.forEach((_, i) => { const d = Math.abs(y - (G.rowY(i) + G.H / 2)); if (d < bd) { bd = d; best = i; } });
    return bd <= G.H * 0.75 + GAP ? best : null;
  };
  carry(f, {
    placeFor: (tile, x, y, tx, ty) => rowFor(tx, ty + G.H / 2, tx),
    hover: row => cardEls.forEach((el, i) => el.classList.toggle('hover', row === i)),
    drop: (tile, row) => {
      const id = tile.dataset.id;
      if (row !== null) {
        const was = st.row[id], other = pieceEls.find(p => p !== tile && st.row[p.dataset.id] === row);
        if (other) { st.row[other.dataset.id] = was; st.docked[other.dataset.id] = false; }
        st.row[id] = row; st.docked[id] = true;
        feel.tick();
      }
      layout(true);
      report();
    },
    tapPlace: (x, y) => (x < G.CW + LOOSE ? rowFor(x, y, null) : null),
  });
  const ro = new ResizeObserver(() => { if (box.clientWidth !== (G && G.W)) layout(false); });
  ro.observe(box);
  f.cleanup(() => ro.disconnect());
  layout(false);
  report();
  return {
    reveal(answer) {
      const marks = judge(f.value(), answer);
      cardEls.forEach(el => el.classList.add(marks[el.dataset.id] || 'wrong'));
      const rowOfPiece = Object.fromEntries(cards.map((c, i) => [(answer || {})[c.id], i]));
      const wrong = pieceEls.filter(p => rowOfPiece[p.dataset.id] !== st.row[p.dataset.id] || !st.docked[p.dataset.id]);
      for (const p of pieceEls) p.classList.add(wrong.includes(p) ? 'wrong' : 'right');
      if (!wrong.length) return;
      // a moment later the wrong pieces lift out and fly to the cards they belong to
      setTimeout(() => {
        if (!root.isConnected) return;
        for (const p of wrong) {
          if (rowOfPiece[p.dataset.id] === undefined) continue;
          st.row[p.dataset.id] = rowOfPiece[p.dataset.id]; st.docked[p.dataset.id] = true;
          p.classList.remove('wrong'); p.classList.add('truth');
        }
        layout(true);
      }, 650);
    },
    reset() {
      st = start();
      for (const el of [...cardEls, ...pieceEls]) el.classList.remove('right', 'wrong', 'truth', 'picked', 'hover');
      layout(true);
      report();
    },
  };
}
