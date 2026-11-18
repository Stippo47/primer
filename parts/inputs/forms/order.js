// Order: drag the things into order (or tap two to swap them). It starts out of order and is always an
// answer. A lifted item moves by transform on its own layer, at whole device pixels.
import { esc, devicePx, shuffled } from '../kit.js';

export const css = `
.pi.form-order { position: relative; }
.pi-end { color: #7f88c8; font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 4px 6px; }
.pi-end.last { margin: 6px 4px 0; }
.pi-item { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; height: 52px; padding: 0 14px; border-radius: 16px; text-align: left;
  background: #1b2250; border: 2px solid #364090; box-shadow: 0 4px 0 #2f3678; font-size: calc(15.5px * var(--ts, 1)); touch-action: none;
  transition: transform 180ms cubic-bezier(.3, 1.3, .5, 1), border-color 120ms, background 120ms; will-change: transform; backface-visibility: hidden; }
.pi-item .pi-grip { flex: none; display: flex; flex-direction: column; gap: 3px; }
.pi-item .pi-grip i { width: 16px; height: 3px; border-radius: 2px; background: #5d66ad; }
.pi-item .t { flex: 1; min-width: 0; line-height: 1.15; }
.pi-item.lift { transition: none; z-index: 2; background: #222a60; border-color: #6fd6ff; box-shadow: 0 4px 0 #1b8fd1; }
.pi-item.picked { border-color: #6fd6ff; background: #222a60; }
.pi-item.right { border-color: #2bc4a4; background: #1d5f63; box-shadow: 0 4px 0 #127a85; }
.pi-item.wrong { border-color: #ee4b7a; background: #5a2050; box-shadow: 0 4px 0 #8f1f44; }
.pi-item .n { flex: none; min-width: 24px; height: 24px; border-radius: 8px; background: #ffc83d; color: #2a1650; font-size: 13px; display: none; align-items: center; justify-content: center; }
.pi.form-order.revealed .pi-item.wrong .n { display: flex; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  let ids = (S.shuffle === false ? S.items : shuffled(S.items, true)).map(i => i.id);
  const byId = Object.fromEntries(S.items.map(i => [i.id, i]));
  const ends = S.ends || [];
  let picked = null;
  const draw = () => {
    root.innerHTML = `${ends[0] ? `<p class="pi-end">${esc(ends[0])}</p>` : ''}<div class="pi-rows">${ids.map(id => `<button class="pi-item" data-id="${esc(id)}" data-sound="select"><span class="pi-grip"><i></i><i></i><i></i></span><span class="t">${esc(byId[id].text)}</span><span class="n"></span></button>`).join('')}</div>${ends[1] ? `<p class="pi-end last">${esc(ends[1])}</p>` : ''}`;
  };
  draw();
  f.set(ids.slice(), true);
  const rowH = () => { const a = root.querySelectorAll('.pi-item'); return a.length > 1 ? a[1].getBoundingClientRect().top - a[0].getBoundingClientRect().top : 62; };
  let drag = null;
  f.cleanup(f.ctx.track(root, {
    blocked: e => f.locked() || !e.target.closest('.pi-item'),
    start: e => {
      const item = e.target.closest('.pi-item');
      drag = { item, from: ids.indexOf(item.dataset.id), h: rowH(), to: null };
    },
    move: ({ dy }) => {
      if (!drag) return;
      drag.item.classList.add('lift');
      drag.item.style.transform = `translate3d(0,${devicePx(dy)}px,0) scale(1.02)`;
      const to = Math.max(0, Math.min(ids.length - 1, drag.from + Math.round(dy / drag.h)));
      if (to !== drag.to) {
        if (drag.to !== null) feel.tick();
        drag.to = to;
        root.querySelectorAll('.pi-item').forEach((x, i) => {
          if (x === drag.item) return;
          const shift = drag.from < to && i > drag.from && i <= to ? -drag.h : drag.from > to && i >= to && i < drag.from ? drag.h : 0;
          x.style.transform = shift ? `translateY(${shift}px)` : '';
        });
      }
    },
    release: () => {
      if (!drag) return;
      const { from: a, to: b, item } = drag;
      drag = null;
      const was = item.getBoundingClientRect().top;
      if (b !== null && b !== a) {
        const [id] = ids.splice(a, 1);
        ids.splice(b, 0, id);
      }
      draw();
      // It drops into its place from where the finger left it, with the spring.
      const now = root.querySelector(`.pi-item[data-id="${CSS.escape(item.dataset.id)}"]`);
      if (now && feel.spring) feel.spring(now, v => `translateY(${v}px)`, was - now.getBoundingClientRect().top, 0);
      feel.sound('select');
      f.set(ids.slice(), true);
    },
    cancel: () => { drag = null; draw(); },
    tap: (e, target) => {
      const item = (target || e.target).closest('.pi-item');
      drag = null;
      if (!item) return;
      if (picked === null) { picked = item.dataset.id; item.classList.add('picked'); return; }
      if (picked !== item.dataset.id) {
        const i = ids.indexOf(picked), j = ids.indexOf(item.dataset.id);
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      picked = null;
      draw();
      f.set(ids.slice(), true);
    },
  }));
  return {
    reveal(answer) {
      root.classList.add('revealed');
      root.querySelectorAll('.pi-item').forEach((x, i) => {
        const at = (answer || []).indexOf(x.dataset.id);
        x.classList.add(at === i ? 'right' : 'wrong');
        x.querySelector('.n').textContent = String(at + 1);
      });
    },
    reset() { root.classList.remove('revealed'); ids = shuffled(S.items, true).map(i => i.id); draw(); f.set(ids.slice(), true); },
  };
}
