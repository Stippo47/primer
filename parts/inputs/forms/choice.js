// Choice: pick one of a few answers. Shuffled unless the lesson says not to.
import { esc, shuffled } from '../kit.js';

export const css = `
.pi-rows { display: flex; flex-direction: column; gap: 10px; }
.pi-opt { display: flex; align-items: center; width: 100%; min-height: 52px; padding: 10px 16px; border-radius: 16px; text-align: left;
  background: #1b2250; border: 2px solid #364090; box-shadow: 0 4px 0 #2f3678; font-size: calc(16px * var(--ts, 1)); line-height: 1.2;
  transition: transform 120ms ease-out, box-shadow 120ms ease-out, background 120ms, border-color 120ms; }
.pi-opt.down { transform: translateY(4px); box-shadow: 0 0 0 #2f3678; transition-duration: 50ms; }
.pi-opt.on { background: #222a60; border-color: #6fd6ff; box-shadow: 0 4px 0 #1b8fd1; color: #e8f8ff; }
.pi-opt.on.down { box-shadow: 0 0 0 #1b8fd1; }
.pi-opt.right { background: #1d5f63; border-color: #2bc4a4; box-shadow: 0 4px 0 #127a85; }
.pi-opt.wrong { background: #5a2050; border-color: #ee4b7a; box-shadow: 0 4px 0 #8f1f44; }
.pi-opt .k { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; margin-right: 12px; flex: none;
  border-radius: 9px; border: 2px solid #364090; color: #7f88c8; font-size: 13px; }
.pi-opt.on .k { border-color: #6fd6ff; color: #6fd6ff; }
`;

export function mount(f) {
  const { root, S } = f;
  const opts = S.shuffle ? shuffled(S.options) : S.options.slice();
  root.innerHTML = `<div class="pi-rows">${opts.map((o, i) => `<button class="pi-opt" data-id="${esc(o.id)}" data-sound="select"><span class="k">${i + 1}</span><span>${esc(o.text)}</span></button>`).join('')}</div>`;
  const onTap = e => {
    const b = e.target.closest('.pi-opt');
    if (!b || f.locked()) return;
    for (const x of root.querySelectorAll('.pi-opt')) x.classList.toggle('on', x === b);
    f.set(b.dataset.id, true);
  };
  root.addEventListener('click', onTap);
  f.cleanup(() => root.removeEventListener('click', onTap));
  return {
    reveal(answer) {
      for (const x of root.querySelectorAll('.pi-opt')) {
        x.classList.toggle('right', x.dataset.id === answer);
        x.classList.toggle('wrong', x.dataset.id === f.value() && f.value() !== answer);
      }
    },
    reset() { for (const x of root.querySelectorAll('.pi-opt')) x.className = 'pi-opt'; f.set(null, false); },
  };
}
