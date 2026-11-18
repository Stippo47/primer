// Spot: tap the spot on a picture. Left as it was: it's redone when a lesson needs it.

export const css = `
.pi-spot { position: relative; border-radius: 18px; overflow: hidden; background: #0d1232; border: 2px solid #2f3678; touch-action: manipulation; }
.pi-spot img, .pi-spot svg.fig { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.pi-pin, .pi-ring { position: absolute; pointer-events: none; transform: translate(-50%, -50%); border-radius: 50%; }
.pi-pin { width: 22px; height: 22px; background: #fff; border: 4px solid #ee4b7a; box-shadow: 0 3px 0 rgba(6, 9, 38, 0.5); }
.pi-ring { border: 4px dashed #ffc83d; }
.pi-spot.revealed .pi-pin.right { border-color: #2bc4a4; }
`;

// A sample picture: a hurricane from above, to tap its eye.
const SAMPLE = `<svg class="fig" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid meet">
  <rect width="320" height="200" fill="#1b2a80"/><path d="M0 150q80-20 160 0t160 0v50H0z" fill="#2bc4a4" opacity="0.9"/>
  <g transform="translate(160 104)"><circle r="70" fill="#aebfff" transform="translate(4 6)" opacity="0.6"/><circle r="66" fill="#ffffff"/>
  <path d="M-58 -10a60 60 0 0 1 90 -44M54 14a60 60 0 0 1 -86 42" fill="none" stroke="#aebfff" stroke-width="9" stroke-linecap="round"/>
  <path d="M-34 -6a36 36 0 0 1 50 -26M30 8a36 36 0 0 1 -48 24" fill="none" stroke="#c9d4ff" stroke-width="7" stroke-linecap="round"/>
  <circle r="15" fill="#1b2a80"/></g></svg>`;

export function mount(f) {
  const { root, S, feel } = f;
  root.innerHTML = `<div class="pi-spot" style="aspect-ratio:${(1 / (S.aspect || 0.62)).toFixed(3)}">${S.figure ? '<img alt="">' : SAMPLE}</div>`;
  const box = root.querySelector('.pi-spot');
  if (S.figure) Promise.resolve(f.media(S.figure)).then(url => { const img = box.querySelector('img'); if (img && url) img.src = url; });
  let pin = null;
  const put = (x, y) => {
    if (!pin) { pin = document.createElement('i'); pin.className = 'pi-pin'; box.append(pin); }
    pin.style.left = `${x * 100}%`; pin.style.top = `${y * 100}%`;
    feel.pop(pin);
    f.set({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) }, true);
  };
  f.cleanup(f.ctx.track(box, {
    blocked: () => f.locked(),
    tap: e => {
      const r = box.getBoundingClientRect();
      put(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
      feel.sound('select');
      feel.tick();
    },
  }));
  return {
    reveal(answer) {
      box.classList.add('revealed');
      const ring = document.createElement('i');
      ring.className = 'pi-ring';
      const w = box.clientWidth;
      ring.style.left = `${answer.x * 100}%`; ring.style.top = `${answer.y * 100}%`;
      ring.style.width = ring.style.height = `${answer.r * 2 * w}px`;
      box.append(ring);
      const v = f.value();
      if (pin && v && Math.hypot(v.x - answer.x, v.y - answer.y) <= answer.r) pin.classList.add('right');
      feel.pop(ring);
    },
    reset() { if (pin) pin.remove(); pin = null; box.querySelectorAll('.pi-ring').forEach(r => r.remove()); f.set(null, false); },
  };
}
