// String: draw a line from each thing on the left to its partner on the right. Pull a string from either
// side and let go on its partner, or tap one and then the other; touching a joined one takes its string off.
// Strings hang with a little sag, so crossed ones show a tangle at a glance. On reveal the right strings
// turn green, the wrong ones pink and fade, and a gold string draws itself to each right partner.
// Labels are short words, a small picture, or both. The strings are one drawing laid over the two columns;
// only it is redrawn as a string follows the finger.
import { esc, label, loadImages, shuffled, judge, devicePx } from '../kit.js';

export const css = `
.pi-strings { position: relative; display: grid; grid-template-columns: 1fr 1fr; column-gap: 56px; }
.pi-strings .col { display: flex; flex-direction: column; gap: 12px; }
.pi-strings .col.r { justify-content: space-around; }
.pi-end2 { position: relative; display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 8px 12px; border-radius: 16px; text-align: left; touch-action: none;
  background: #1b2250; border: 2px solid #364090; box-shadow: 0 4px 0 #2f3678; font-size: calc(15px * var(--ts, 1)); line-height: 1.15;
  transition: transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms, background 120ms; }
.pi-end2.down { transform: translateY(4px); box-shadow: 0 0 0 #2f3678; transition-duration: 50ms; }
.pi-end2 .t { flex: 1; min-width: 0; }
.col.r .pi-end2 { padding-left: 16px; }
.pi-end2.on, .pi-end2.joined { background: #222a60; border-color: #6fd6ff; box-shadow: 0 4px 0 #1b8fd1; }
.pi-end2.on.down, .pi-end2.joined.down { box-shadow: 0 0 0 #1b8fd1; }
.pi-end2.right { background: #1d5f63; border-color: #2bc4a4; box-shadow: 0 4px 0 #127a85; }
.pi-end2.wrong { background: #5a2050; border-color: #ee4b7a; box-shadow: 0 4px 0 #8f1f44; }
.pi-lines { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.pi-lines .rope.wrong { opacity: 0.3; transition: opacity 400ms 500ms; }
.pi-lines .rope.truth path { transition: stroke-dashoffset 520ms ease-in-out 650ms; }
`;

const ROPE = { idle: ['#1b8fd1', '#49c6ff'], right: ['#127a85', '#2bc4a4'], wrong: ['#8f1f44', '#ee4b7a'], truth: ['#c98a00', '#ffc83d'] };

export function mount(f) {
  const { root, S, feel } = f;
  const left = S.left, right = S.shuffle ? shuffled(S.right, true) : S.right.slice();
  root.innerHTML = `<div class="pi-strings">
      <div class="col l">${left.map(x => `<button class="pi-end2" data-side="l" data-id="${esc(x.id)}" data-sound="select">${label(x)}</button>`).join('')}</div>
      <div class="col r">${right.map(x => `<button class="pi-end2" data-side="r" data-id="${esc(x.id)}" data-sound="select">${label(x)}</button>`).join('')}</div>
      <svg class="pi-lines" aria-hidden="true"><g class="ropes"></g><g class="live"></g><g class="knobs"></g></svg></div>`;
  loadImages(root, f.media);
  const wrap = root.querySelector('.pi-strings'), svg = wrap.querySelector('.pi-lines');
  const cell = (side, id) => wrap.querySelector(`.pi-end2[data-side="${side}"][data-id="${CSS.escape(id)}"]`);
  // where a cell's string is tied: the inner edge, half way down
  const knob = el => {
    const w = wrap.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [el.dataset.side === 'l' ? r.right - w.left : r.left - w.left, r.top - w.top + r.height / 2 - 2];
  };
  const rope = (a, b, tone, { cls = '', dash = false } = {}) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = Math.min(30, len * 0.14);
    const d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2 + sag).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    const [edge, col] = ROPE[tone];
    const da = dash ? ` stroke-dasharray="${(len * 1.3).toFixed(0)}" stroke-dashoffset="${(len * 1.3).toFixed(0)}"` : '';
    return `<g class="rope ${cls}"><path d="${d}" transform="translate(0 2.5)" fill="none" stroke="${edge}" stroke-width="7" stroke-linecap="round"${da}/><path d="${d}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round"${da}/></g>`;
  };
  let pairs = {}, holding = null, drag = null, marks = null, answerShown = null, drawn = false;
  const ropeTone = l => (marks ? marks[l] : 'idle');
  const paint = () => {
    const lines = Object.entries(pairs).map(([l, r]) => { const a = cell('l', l), b = cell('r', r); return a && b ? rope(knob(a), knob(b), ropeTone(l), { cls: marks ? marks[l] : '' }) : ''; });
    if (answerShown) for (const [l, r] of Object.entries(answerShown)) {
      if (marks[l] === 'right') continue;
      const a = cell('l', l), b = cell('r', r);
      if (a && b) lines.push(rope(knob(a), knob(b), 'truth', { cls: 'truth', dash: !drawn }));
    }
    svg.querySelector('.ropes').innerHTML = lines.join('');
    const joinedR = new Set(Object.values(pairs));
    svg.querySelector('.knobs').innerHTML = [...wrap.querySelectorAll('.pi-end2')].map(el => {
      const [x, y] = knob(el), on = el.dataset.side === 'l' ? !!pairs[el.dataset.id] : joinedR.has(el.dataset.id);
      const ring = marks && el.dataset.side === 'l' ? (marks[el.dataset.id] === 'right' ? '#2bc4a4' : '#ffc83d') : on ? '#49c6ff' : '#5d66ad';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#0f1434" stroke="${ring}" stroke-width="3"/>${on ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${ring}"/>` : ''}`;
    }).join('');
    for (const el of wrap.querySelectorAll('.pi-end2')) {
      const id = el.dataset.id, side = el.dataset.side;
      el.classList.toggle('on', !!holding && holding.side === side && holding.id === id);
      el.classList.toggle('joined', side === 'l' ? !!pairs[id] : joinedR.has(id));
    }
  };
  const report = () => f.set({ ...pairs }, left.every(x => pairs[x.id]));
  const unjoin = (side, id) => {
    if (side === 'l') delete pairs[id];
    else for (const k of Object.keys(pairs)) if (pairs[k] === id) delete pairs[k];
  };
  const join = (a, b) => {
    const l = a.side === 'l' ? a.id : b.id, r = a.side === 'r' ? a.id : b.id;
    unjoin('l', l); unjoin('r', r);
    pairs[l] = r;
    feel.tick();
  };
  const ro = new ResizeObserver(() => paint());
  ro.observe(wrap);
  f.cleanup(() => ro.disconnect());
  const at = (x, y, side, pad = 14) => [...wrap.querySelectorAll(`.pi-end2[data-side="${side}"]`)].find(el => {
    const r = el.getBoundingClientRect();
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  });
  let hover = null;
  const setHover = el => { if (hover === el) return; if (hover) hover.classList.remove('on'); hover = el; if (el) { el.classList.add('on'); feel.tick(); } };
  f.cleanup(f.ctx.track(wrap, {
    blocked: e => f.locked() || !e.target.closest('.pi-end2'),
    start: e => { const el = e.target.closest('.pi-end2'); drag = { side: el.dataset.side, id: el.dataset.id, el, moved: false }; },
    move: ({ x, y }) => {
      if (!drag) return;
      if (!drag.moved) { drag.moved = true; holding = null; unjoin(drag.side, drag.id); report(); paint(); drag.el.classList.add('on'); }
      const w = wrap.getBoundingClientRect();
      const other = at(x, y, drag.side === 'l' ? 'r' : 'l');
      setHover(other || null);
      svg.querySelector('.live').innerHTML = rope(knob(drag.el), [devicePx(x - w.left), devicePx(y - w.top)], 'idle');
    },
    release: ({ x, y }) => {
      if (!drag) return;
      const other = at(x, y, drag.side === 'l' ? 'r' : 'l');
      if (other) join(drag, { side: other.dataset.side, id: other.dataset.id });
      setHover(null);
      drag.el.classList.remove('on');
      drag = null;
      svg.querySelector('.live').innerHTML = '';
      feel.sound('select');
      report(); paint();
    },
    cancel: () => { if (drag) drag.el.classList.remove('on'); drag = null; setHover(null); svg.querySelector('.live').innerHTML = ''; paint(); },
    tap: (e, target) => {
      drag = null;
      const el = (target || e.target).closest('.pi-end2');
      if (!el) return;
      const me = { side: el.dataset.side, id: el.dataset.id };
      if (holding && holding.side !== me.side) { join(holding, me); holding = null; }
      else if (holding && holding.id === me.id) holding = null;
      else {
        const joined = me.side === 'l' ? !!pairs[me.id] : Object.values(pairs).includes(me.id);
        if (joined && !holding) unjoin(me.side, me.id);
        holding = me;
      }
      report(); paint();
    },
  }));
  report();
  requestAnimationFrame(paint);
  return {
    reveal(answer) {
      marks = judge(pairs, answer);
      answerShown = answer || {};
      for (const el of wrap.querySelectorAll('.pi-end2[data-side="l"]')) el.classList.add(marks[el.dataset.id]);
      for (const el of wrap.querySelectorAll('.pi-end2')) el.classList.remove('on', 'joined');
      holding = null;
      paint();
      // the gold strings draw themselves in, after the wrong ones have shown a moment
      requestAnimationFrame(() => requestAnimationFrame(() => { drawn = true; for (const p of svg.querySelectorAll('.rope.truth path')) p.style.strokeDashoffset = '0'; }));
    },
    reset() {
      pairs = {}; holding = null; marks = null; answerShown = null; drawn = false;
      for (const el of wrap.querySelectorAll('.pi-end2')) el.classList.remove('right', 'wrong');
      report(); paint();
    },
  };
}
