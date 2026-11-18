// Finger tracking: a drag with one finger, a pinch with two, and a tap that moved too little to be a
// drag. Copied from Riffle's gesture code; Primer's parts use it for turning the globe, sliders and
// dragging things into order.

export const TUNE = {
  tapMove: 9,          // more movement than this isn't a tap
  tapMs: 320,          // a press held longer than this isn't a tap either
  flickSpeed: 0.55,    // pixels per millisecond that count as a flick
};

// Follows one finger as a drag and two as a pinch. Handlers: blocked, start, move, release, cancel, tap,
// pinchStart(mid), pinch(scale, mid), pinchEnd(scale). move and release get dx, dy from where the finger
// landed, and release also the finger's speed (vx, vy, in pixels per millisecond). mid is the point
// halfway between the two fingers, { x, y } on the page. tap also gets the element the finger first
// touched: while a finger is tracked its events go to el, so the event's own target is el.
// Returns a function that stops it.
export function track(el, h) {
  const pts = new Map();
  let drag = null, pinch = null, ignore = false, samples = [], spread0 = 1;

  const spread = () => {
    const [a, b] = [...pts.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };
  const mid = () => {
    const [a, b] = [...pts.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const pinchUpdate = scale => {
    if (!pinch) {
      if (drag && drag.moved) h.cancel && h.cancel();
      drag = null;
      pinch = { scale: 1 };
      h.pinchStart && h.pinchStart(mid());
    }
    pinch.scale = scale;
    h.pinch && h.pinch(scale, mid());
  };
  const pinchEnd = () => {
    if (!pinch) return;
    const s = pinch.scale;
    pinch = null;
    ignore = pts.size > 0;
    h.pinchEnd && h.pinchEnd(s);
  };

  const onDown = e => {
    if (h.blocked && h.blocked(e)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointers in tests */ }
    if (pts.size === 1) {
      ignore = false;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, moved: false, target: e.target };
      h.start && h.start(e);
      samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
    } else if (pts.size === 2) {
      spread0 = spread();
      pinchUpdate(1);
    }
  };
  const onMove = e => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size >= 2) { pinchUpdate(spread() / spread0); return; }
    if (ignore || !drag || drag.id !== e.pointerId) return;
    samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 90) samples.shift();
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) > TUNE.tapMove) drag.moved = true;
    if (drag.moved) h.move && h.move({ dx, dy, x: e.clientX, y: e.clientY });
  };
  const onUp = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pinch) { if (pts.size < 2) pinchEnd(); return; }
    if (ignore) { if (!pts.size) ignore = false; return; }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    const dt = e.timeStamp - drag.t0;
    const first = samples[0], span = Math.max(1, e.timeStamp - first.t);
    const vx = (e.clientX - first.x) / span, vy = (e.clientY - first.y) / span;
    const moved = drag.moved, target = drag.target;
    drag = null;
    if (!moved) { if (dt < TUNE.tapMs) h.tap && h.tap(e, target); else h.cancel && h.cancel(); return; }
    h.release && h.release({ dx, dy, vx, vy, x: e.clientX, y: e.clientY });
  };
  const onCancel = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pinch) { if (pts.size < 2) pinchEnd(); return; }
    if (drag && drag.id === e.pointerId) {
      const moved = drag.moved;
      drag = null;
      if (moved) h.cancel && h.cancel();
    }
    if (!pts.size) ignore = false;
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onCancel);
  };
}
