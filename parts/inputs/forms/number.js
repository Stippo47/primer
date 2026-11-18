// Number: type it on the form's own keypad, so the phone's keyboard never covers the button.
import { esc, fmt } from '../kit.js';

export const css = `
.pi-display { display: flex; align-items: baseline; justify-content: center; gap: 8px; height: 64px; border-radius: 16px; margin-bottom: 12px;
  background: #0f1434; border: 2px solid #364090; padding-top: 10px; }
.pi-display .d { font-size: 34px; letter-spacing: 0.02em; }
.pi-display .d.unset { color: #5d66ad; }
.pi-display .u { font-size: 18px; color: #7f88c8; }
.pi-display.right { border-color: #2bc4a4; }
.pi-display.close { border-color: #ffc83d; }
.pi-display.wrong { border-color: #ee4b7a; }
.pi-truthline { text-align: center; color: #ffc83d; font-size: 15px; margin: -4px 0 10px; }
.pi-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pi-key { height: 48px; border-radius: 14px; background: #222a60; border: 2px solid #364090; box-shadow: 0 3px 0 #2f3678; font-size: 20px;
  transition: transform 120ms ease-out, box-shadow 120ms ease-out; }
.pi-key.down { transform: translateY(3px); box-shadow: 0 0 0 #2f3678; transition-duration: 50ms; }
.pi-key.off { visibility: hidden; }
`;

export function mount(f) {
  const { root, S, feel } = f;
  const dot = S.step < 1, minus = S.min < 0;
  let typed = '';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', minus ? '±' : dot ? '.' : '', '0', '⌫'];
  if (minus && dot) keys[9] = '.';
  root.innerHTML = `<div class="pi-display"><span class="d unset">?</span><span class="u">${esc(S.unit)}</span></div><div class="pi-truthline" hidden></div>
    <div class="pi-keys">${keys.map(k => `<button class="pi-key${k ? '' : ' off'}" data-k="${esc(k)}" data-sound="select" aria-label="${k === '⌫' ? 'Delete' : esc(k)}">${esc(k)}</button>`).join('')}</div>
    ${minus && dot ? '<div class="pi-keys" style="margin-top:8px"><span></span><button class="pi-key" data-k="±" data-sound="select">±</button><span></span></div>' : ''}`;
  const d = root.querySelector('.d');
  const draw = () => {
    d.textContent = typed || '?';
    d.classList.toggle('unset', !typed);
    const v = Number(typed);
    f.set(typed && typed !== '-' && typed !== '.' && Number.isFinite(v) ? v : null, !!typed && Number.isFinite(v) && typed !== '-');
  };
  const onTap = e => {
    const b = e.target.closest('.pi-key');
    if (!b || f.locked()) return;
    const k = b.dataset.k;
    if (k === '⌫') typed = typed.slice(0, -1);
    else if (k === '±') typed = typed.startsWith('-') ? typed.slice(1) : `-${typed}`;
    else if (k === '.') { if (!typed.includes('.')) typed = (typed || '0') + '.'; }
    else if (typed.replace(/[-.]/g, '').length < 9) typed = typed === '0' ? k : typed + k;
    draw();
  };
  root.addEventListener('click', onTap);
  f.cleanup(() => root.removeEventListener('click', onTap));
  return {
    reveal(answer) {
      const line = root.querySelector('.pi-truthline');
      line.hidden = false;
      line.textContent = fmt(answer, S.step, S.unit);
      feel.pop(line);
    },
    mark(kind) { root.querySelector('.pi-display').classList.add(kind); },
    reset() { typed = ''; draw(); },
  };
}
