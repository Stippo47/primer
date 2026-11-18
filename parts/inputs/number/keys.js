// Number, as keys: typed on the form's own keypad, so the phone's keyboard never covers the button. The
// number sits in a deep screen, each digit dropping in as it's typed, the range it can be written faintly
// until then; the keys are chunky caps that sink when pressed. Nothing is answered until something is
// typed.
import { esc } from '../kit.js';
import { range, truthLine, clearTruth } from './common.js';

export const css = `
.pi-display { position: relative; display: flex; align-items: center; justify-content: center; gap: 6px; height: 78px; margin-bottom: 16px; border-radius: 20px;
  background: #0b0f2c; border: 3px solid #364090; box-shadow: 0 4px 0 #2f3678; overflow: hidden; }
.pi-display::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 6px; background: #070a20; }
.pi-display .d { display: flex; align-items: baseline; font-size: 44px; font-weight: 900; letter-spacing: 0.01em; line-height: 1; }
.pi-display .d i { font-style: normal; display: inline-block; }
.pi-display .caret { width: 4px; height: 40px; margin-left: 3px; border-radius: 2px; background: #49c6ff; animation: pi-blink 1.1s steps(1) infinite; }
.pi-display .ph { position: absolute; left: 0; right: 0; bottom: 7px; text-align: center; font-size: 12px; color: #3d4596; letter-spacing: 0.04em; }
.pi-display .u { font-size: 20px; color: #7f88c8; align-self: flex-end; margin-bottom: 21px; }
.pi-display.right { border-color: #2bc4a4; box-shadow: 0 4px 0 #127a85; }
.pi-display.close { border-color: #ffc83d; box-shadow: 0 4px 0 #c98a00; }
.pi-display.wrong { border-color: #ee4b7a; box-shadow: 0 4px 0 #8f1f44; }
.pi-display.right .caret, .pi-display.close .caret, .pi-display.wrong .caret { display: none; }
@keyframes pi-blink { 50% { opacity: 0; } }
.pi-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 12px; }
.pi-key { height: 54px; border-radius: 17px; background: #2a3274; border-top: 2px solid #3d4ba0; box-shadow: 0 5px 0 #161c4a; font-size: 25px; font-weight: 900;
  transition: transform 120ms ease-out, box-shadow 120ms ease-out; }
.pi-key.down { transform: translateY(5px); box-shadow: 0 0 0 #161c4a; transition-duration: 50ms; }
.pi-key.fn { background: #222a60; border-top-color: #2f3a86; color: #9aa3d6; }
.pi-key.del { background: #3a2f74; border-top-color: #4e3f94; box-shadow: 0 5px 0 #231a52; display: flex; align-items: center; justify-content: center; }
.pi-key.del.down { box-shadow: 0 0 0 #231a52; }
.pi-key.off { visibility: hidden; }
`;

const DEL = '<svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true"><path d="M10 2h16a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H10L2 11z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/><path d="M14 7l8 8M22 7l-8 8" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';

export function mount(f) {
  const { root, S, feel } = f;
  const [lo, hi] = range(S);
  const dot = S.step < 1, minus = lo < 0;
  let typed = '';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', minus ? '±' : dot ? '.' : '', '0', '⌫'];
  if (minus && dot) keys[9] = '.';
  const key = k => `<button class="pi-key${!k ? ' off' : k === '⌫' ? ' del' : /[.±]/.test(k) ? ' fn' : ''}" data-k="${esc(k)}" data-sound="select" aria-label="${k === '⌫' ? 'Delete' : esc(k)}">${k === '⌫' ? DEL : esc(k)}</button>`;
  root.innerHTML = `<div class="pi-display"><span class="d"></span><span class="caret"></span><span class="u">${esc(S.unit)}</span>
      <span class="ph">${esc(`${lo.toLocaleString('en')} to ${hi.toLocaleString('en')}`)}</span></div>
    <div class="pi-keys">${keys.map(key).join('')}</div>
    ${minus && dot ? `<div class="pi-keys" style="margin-top:10px"><span></span>${key('±')}<span></span></div>` : ''}<div class="pi-truthline" hidden></div>`;
  const d = root.querySelector('.d'), ph = root.querySelector('.ph');
  const draw = (popLast = false) => {
    d.innerHTML = [...typed].map(c => `<i>${esc(c)}</i>`).join('');
    ph.hidden = !!typed;
    if (popLast && d.lastElementChild && feel.pop) feel.pop(d.lastElementChild, 0.4);
    const v = Number(typed);
    f.set(typed && typed !== '-' && typed !== '.' && Number.isFinite(v) ? v : null, !!typed && Number.isFinite(v) && typed !== '-');
  };
  const onTap = e => {
    const b = e.target.closest('.pi-key');
    if (!b || f.locked()) return;
    const k = b.dataset.k, before = typed;
    if (k === '⌫') typed = typed.slice(0, -1);
    else if (k === '±') typed = typed.startsWith('-') ? typed.slice(1) : `-${typed}`;
    else if (k === '.') { if (!typed.includes('.')) typed = (typed.replace('-', '') ? typed : `${typed}0`) + '.'; }
    else if (typed.replace(/[-.]/g, '').length < 9) typed = typed === '0' ? k : typed === '-0' ? `-${k}` : typed + k;
    draw(typed.length > before.length);
  };
  root.addEventListener('click', onTap);
  f.cleanup(() => root.removeEventListener('click', onTap));
  draw();
  return {
    reveal(answer) { truthLine(root, S, answer, feel); },
    mark(kind) { root.querySelector('.pi-display').classList.add(kind); },
    reset() { typed = ''; root.querySelector('.pi-display').className = 'pi-display'; clearTruth(root); draw(); },
    debug: () => ({ typed }),
  };
}
