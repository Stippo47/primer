// The ghost finger: the scene's hand, playing a list of moves on the page as a finger would.
//
// A move list is plain steps, run one after another:
//   { move: () => [x, y], ms }        glide the hand there
//   { down: true } / { up: true }      press and lift
//   { drag: k => [x, y] | () => [x, y], ms, ease }   pressed, along a path (k from 0 to 1)
//   { wait: ms }                       stay still
//   { call: fn }                       do something on the page
//   { leave: true, ms }                slide away and fade
// Places are worked out when a step starts, so a step can aim at wherever a thing is by then.
//
// It touches the page in one of two ways. 'synthetic' (films and ?ghost=1): it sends the page pointer
// events itself, so a film is the same every time. 'cdp' (the touch test): it hands each touch to the
// capture tool, which sends it through the browser as a real touch.
import { C, E, Val, canvas, ripple, rgba, lerp, clamp01, rrect, DPR } from './kit.js';

const handPath = (() => {
  const p = new Path2D();
  rrect(p, -8.5, -2, 17, 58, 8.5);          // pointing finger
  rrect(p, -11, 38, 50, 46, 15);            // palm
  rrect(p, 8, 28, 12.5, 26, 6.2);           // curled fingers
  rrect(p, 19.5, 31, 12, 24, 6);
  rrect(p, 30, 35.5, 10.5, 22, 5.2);
  const x1 = -7, y1 = 64, x2 = -19, y2 = 47, r = 7.5, PI = Math.PI;   // thumb, as the scene's capsule()
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.moveTo(x1 + r * Math.cos(a + PI / 2), y1 + r * Math.sin(a + PI / 2));
  p.arc(x1, y1, r, a + PI / 2, a + PI * 1.5);
  p.arc(x2, y2, r, a - PI / 2, a + PI / 2);
  p.closePath();
  return p;
})();
const sleevePath = (() => { const p = new Path2D(); rrect(p, -6, 79, 40, 24, 7); return p; })();
const FINGER = { fill: '#ffffff', shade: '#c5d0ff', sleeve: '#ff7a59', depth: 2.5 };

export function createGhost(phone, mode = 'synthetic') {
  const layer = canvas(phone, 414, 896, { cls: 'ghost' });
  layer.el.className = 'ghost';
  const ctx = layer.ctx;
  let steps = [], i = 0, start = 0, from = null;
  const pos = { x: 470, y: 980 };
  const press = new Val(0), alpha = new Val(0);
  let pressed = false, downTarget = null, touches = [], lastTouch = -1;
  const queue = [];   // for 'cdp': touches waiting for the capture tool

  const send = (type, x, y) => {
    if (mode === 'cdp') { queue.push({ type, x, y }); return; }
    const el = document.elementFromPoint(x, y) || document.body;
    const pe = { clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, width: 20, height: 20, pressure: type === 'pointerup' ? 0 : 0.5 };
    el.dispatchEvent(new PointerEvent(type, pe));
    if (type === 'pointerdown') downTarget = el;
    if (type === 'pointerup') {
      const a = downTarget && downTarget.closest('button'), b = el.closest('button');
      if (a && a === b && !a.disabled) a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      downTarget = null;
    }
  };
  // the phone's coordinates are the page's, as the phone sits at the top left unscaled when filmed
  const toClient = (x, y) => {
    const r = phone.getBoundingClientRect(), k = r.width / 414;
    return [r.left + x * k, r.top + y * k];
  };

  function begin(s, t) {
    start = t;
    from = { x: pos.x, y: pos.y };
    if (s.move) { s._to = s.move(); s._ms = s.ms ?? Math.min(380, 170 + Math.hypot(s._to[0] - pos.x, s._to[1] - pos.y) * 0.5); }
    else if (s.drag) { s._path = s.drag.length ? s.drag : (() => { const to = s.drag(); const a = { ...from }; return k => [lerp(a.x, to[0], k), lerp(a.y, to[1], k)]; })(); s._ms = s.ms ?? 500; }
    else if (s.leave) { s._ms = s.ms ?? 600; }
    else if (s.wait) s._ms = s.wait;
    else s._ms = 0;
    if (s.down) {
      pressed = true;
      press.to(1, { t, ms: 90, kind: 'out' });
      touches.push(t);
      send('pointerdown', ...toClient(pos.x, pos.y));
    }
    if (s.up) {
      pressed = false;
      press.to(0, { t, ms: 160, kind: 'out' });
      send('pointerup', ...toClient(pos.x, pos.y));
    }
    if (s.call) s.call(t);
    if (s.enter) { alpha.to(1, { t, ms: 220, kind: 'out' }); }
    if (s.leave) { alpha.to(0, { t: t + 0.2, ms: 400, kind: 'inOut' }); }
  }
  function advance(s, k) {
    if (s.move) {
      const e = E.inOut(k);
      pos.x = lerp(from.x, s._to[0], e); pos.y = lerp(from.y, s._to[1], e);
    } else if (s.drag) {
      const e = s.ease === 'linear' ? k : s.ease === 'out' ? E.out(k) : E.inOut(k);
      const [x, y] = s._path(e);
      pos.x = x; pos.y = y;
      if (pressed) send('pointermove', ...toClient(x, y));
    } else if (s.leave) {
      const e = E.inn(k);
      pos.x = lerp(from.x, from.x + 120, e); pos.y = lerp(from.y, from.y + 260, e);
    }
  }

  return {
    get busy() { return i < steps.length; },
    get length() { return steps.reduce((a, s) => a + (s.ms ?? s.wait ?? 0), 0) / 1000; },
    play(list, t) { steps = list; i = 0; start = t; if (steps[0]) begin(steps[0], t); },
    // Runs the moves up to time t: finishes every step that is over, then moves the current one along.
    update(t) {
      while (i < steps.length) {
        const s = steps[i];
        const k = s._ms > 0 ? (t - start) / (s._ms / 1000) : 1;
        if (k < 1) { advance(s, clamp01(k)); return; }
        advance(s, 1);
        const end = start + s._ms / 1000;
        i++;
        if (i < steps.length) begin(steps[i], end);
      }
    },
    draw(t) {
      layer.clear();
      for (const t0 of touches) ripple(ctx, pos.x, pos.y, (t - t0) / 0.42, { r0: 12, r1: 40, alpha: 0.75 * alpha.at(t) });
      const a = alpha.at(t), pr = press.at(t);
      if (a <= 0.01) return;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(-0.42);
      ctx.scale(1.02 - pr * 0.07, 1.02 - pr * 0.07);
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(C.shadow, 0.27 * 0.9);
      ctx.save(); ctx.translate(5 + (1 - pr) * 5, 7 + (1 - pr) * 7); ctx.fill(handPath); ctx.fill(sleevePath); ctx.restore();
      ctx.fillStyle = FINGER.sleeve; ctx.fill(sleevePath);
      ctx.save(); ctx.translate(FINGER.depth, FINGER.depth); ctx.fillStyle = FINGER.shade; ctx.fill(handPath); ctx.restore();
      ctx.fillStyle = FINGER.fill; ctx.fill(handPath);
      ctx.restore();
    },
    // for the touch test: the touches due since it last asked
    take() { return queue.splice(0, queue.length); },
    get pos() { return { ...pos }; },
  };
}
