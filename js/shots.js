// Shots: how a scene's parts share the picture, and how it cuts between them. A scene with two or more parts
// (a globe and the sea-and-sky section, say) can show one full, cut to another, split the picture between
// two (one above, one below), or lay one over the corner of another as a small inset, the way a film cuts
// between a wide shot, a close-up and a diagram. They're scene actions like any call, hung on words:
// ["shot.cut", "section", "zoom"]. Each part's own camera does the rest (the globe's camera, the section's
// framings), so cutting and moving the camera between them is what makes a line show what it says.
//
// The parts stay mounted the whole time: a part off screen is only hidden (marked data-off, which a part
// that draws every frame checks, to rest). Changes of layout glide: a part that moves (full to the top
// half, say) is drawn where it was and slides to where it goes (its box changes once, so a canvas is
// resized once); one that comes or goes does so by the cut's kind. Every transition is driven by the frame
// clock (performance.now), never CSS timing, so a seek lands exactly and a film renders the same each time.
//
// A title is the director's caption card: a few big words laid over the top of the picture (a key term, a
// number, a span of dates) while the line needs them, faded in and out on the same frame clock; "none"
// takes it away. Unlike the caption, which follows the voice, it stays put, so it reads like a film's title.
//
// The kinds of cut, and the sound each makes unless the action names its own (js/sfx.js):
//   cut      at once, the new picture settling in from a touch closer     ("cut", a soft puff)
//   fade     one picture dissolving into the other                        (no sound)
//   push     the new one slides in from the right, the old out the left    ("whoosh")
//   back     the same from the left                                        ("whoosh")
//   zoom     the old one swells and fades, the new one grows into place    ("whoosh")
//   through  into a closer view: the lens (below) grows until it fills the picture while the old view
//            swells past (the old picture zooming in); with no lens, from a small circle in the middle ("whoosh")
//   out      back out again: the picture shrinks into a circle and goes, the wider view settling in behind
//            it from a touch closer                                                                     ("whoosh")
//
// A lens is the measured callout (study 2, 1.2): a dot pops on the thing, a leader line draws itself up from
// it at a steady pace, and a circle opens at its end on another part, a closer look, and holds. Cutting
// "through" to that part then zooms through the circle. The transitions run on the measured in-out cubic
// (js/ease.js, MOTION.transition), a zoom in log scale; the lens's leader and circle on the leader and
// furniture families.
import { soft, clamp01, MOTION } from './ease.js';

export const CUTS = ['cut', 'fade', 'push', 'back', 'zoom', 'through', 'out'];
export const CORNERS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
export const SHOT_SOUND = { cut: 'cut', fade: null, push: 'whoosh', back: 'whoosh', zoom: 'whoosh', through: 'whoosh', out: 'whoosh', split: 'whoosh', inset: 'pop', lens: 'pop', title: null };
const MS = { cut: 900, fade: 650, push: 850, back: 850, zoom: 850, through: 900, out: 900, move: 850, inset: 550, title: 600, lens: 1000, shut: 450 };
// When a shot's picture lands, for its sound (js/sfx.js): a transition's fastest moment is its middle; a
// lens's circle arrives once the dot and the leader are done.
export const SHOT_BEAT = { cut: 0, fade: 0, push: 0.425, back: 0.425, zoom: 0.425, through: 0.45, out: 0.45, split: 0.425, inset: 0.3, lens: 0.97, title: 0 };
const T = MOTION.transition.ease, F = MOTION.furniture.ease;

export class Shots {
  // stage: the box the parts are in (.sstage). names: the parts, in order. opening: the first layout, as a
  // shot call without its prefix (["cut", "globe"], ["split", "globe", "section"]); the first part, full, if none.
  constructor(stage, names, opening) {
    Object.assign(this, { stage, names, opening: Array.isArray(opening) && opening.length ? opening : ['cut', names[0]] });
    this.layout = {};     // part -> slot: full | top | bottom | inset-<corner>
    this.moves = new Map(); // part -> { kind, t0, ms, from, to }
    this.raf = 0;
    this.log = [];        // for the tests: every shot taken
    this.titles = [];     // the title card showing and any fading out: { el, text, t0, out }
    this.lens = null;     // the lens open: { part, ax, ay, cx, cy, r, t0, shut }
    this.ring = null;     // its dot, leader and ring, drawn on a canvas over the stage
    stage.classList.add('shots');
  }

  el(name) { return this.stage.querySelector(`.spart[data-part="${CSS.escape(name)}"]`); }

  // Back to the opening layout, at once (building the picture for a moment).
  reset() {
    this.moves.clear();
    this.dropLens();
    for (const t of this.titles) t.el.remove();
    this.titles = [];
    this.layout = {};
    this.place({}, true);
    const [kind, ...args] = this.opening;
    this.run(kind, args, true);
  }

  // A shot call: cut, split or inset. now: at once (seeking). Returns the sound it makes, or null.
  run(kind, args, now = false) {
    if (kind === 'title') { this.log.push({ kind, args, now }); this.setTitle(args[0], now); return null; }
    if (kind === 'lens') { this.log.push({ kind, args, now }); return this.openLens(args, now); }
    const known = n => this.names.includes(n);
    let next = { ...this.layout }, how = 'cut';
    if (kind === 'cut') {
      const [part, h = 'cut'] = args;
      if (!known(part)) return null;
      next = { [part]: 'full' };
      how = CUTS.includes(h) ? h : 'cut';
      if (how === 'through' || how === 'out') { this.log.push({ kind, args, now }); this.zoomCut(part, how, now); return now ? null : SHOT_SOUND[how]; }
    } else if (kind === 'split') {
      const [a, b] = args;
      if (!known(a) || !known(b) || a === b) return null;
      next = { [a]: 'top', [b]: 'bottom' };
      how = 'split';
    } else if (kind === 'inset') {
      const [part, corner = 'top-right'] = args;
      for (const [n, s] of Object.entries(next)) if (s.startsWith('inset')) delete next[n];
      if (part !== 'none') {
        if (!known(part)) return null;
        next[part] = `inset-${CORNERS.includes(corner) ? corner : 'top-right'}`;
        if (!Object.entries(next).some(([n, s]) => n !== part && !s.startsWith('inset'))) return null;   // an inset sits over a picture
      }
      how = 'inset';
    } else return null;
    this.log.push({ kind, args, now });
    this.place(next, now, how);
    return now ? null : SHOT_SOUND[kind === 'cut' ? how : kind];
  }

  // Puts every part in its slot. Animated, each part is drawn where it was and moves to where it goes.
  place(next, now, how = 'cut') {
    const t0 = performance.now();
    const before = new Map(this.names.map(n => [n, { slot: this.layout[n] || null, box: this.box(n) }]));
    this.layout = next;
    for (const n of this.names) {
      const el = this.el(n);
      if (!el) continue;
      const slot = next[n] || null;
      if (slot) { el.dataset.slot = slot; el.removeAttribute('data-off'); } else if (now || !before.get(n).slot) { el.setAttribute('data-off', ''); }
      el.style.zIndex = slot && slot.startsWith('inset') ? '3' : '';
    }
    if (now) {
      this.moves.clear();
      for (const n of this.names) { const el = this.el(n); if (el) { el.style.transform = ''; el.style.opacity = ''; if (!next[n]) el.setAttribute('data-off', ''); } }
      return;
    }
    for (const n of this.names) {
      const was = before.get(n), slot = next[n] || null;
      if (!was.slot && !slot) continue;
      const el = this.el(n);
      if (!el) continue;
      const after = this.box(n);
      let kind;
      if (!was.slot) kind = slot.startsWith('inset') ? 'inset-in' : how === 'split' ? 'zoom-in' : `${how}-in`;
      else if (!slot) kind = was.slot.startsWith('inset') ? 'inset-out' : how === 'split' || how === 'inset' ? 'fade-out' : `${how}-out`;
      else if (was.slot !== slot) kind = 'move';
      else continue;
      if (kind === 'cut-out') { el.setAttribute('data-off', ''); continue; }
      const base = kind.split('-')[0];
      this.moves.set(n, { kind, t0, ms: MS[base] || MS.move, from: was.box, to: after, out: !slot });
      if (!slot) el.style.zIndex = '0'; else if (kind !== 'move' && !slot.startsWith('inset')) el.style.zIndex = '2';
    }
    this.frame(t0);
    this.loop();
  }

  // The title card: a new one fades in over the last as it fades out; "none" (or nothing) takes it away.
  setTitle(text, now) {
    const t0 = performance.now();
    for (const t of this.titles) if (!t.out) t.out = t0;
    if (text && text !== 'none') {
      const el = document.createElement('div');
      el.className = 'stitlecard';
      el.textContent = String(text);
      this.stage.append(el);
      this.titles.push({ el, text: String(text), t0: now ? t0 - 1e6 : t0, out: null });
    }
    if (now) { for (const t of this.titles) if (t.out) t.el.remove(); this.titles = this.titles.filter(t => !t.out); }
    this.frame(t0);
    this.loop();
  }

  // A part's box inside the stage, as it is now: x, y, width, height.
  box(n) {
    const el = this.el(n), s = this.stage.getBoundingClientRect();
    if (!el || el.hasAttribute('data-off')) return null;
    const prev = el.style.transform;
    el.style.transform = '';
    const b = el.getBoundingClientRect();
    el.style.transform = prev;
    return { x: b.left - s.left, y: b.top - s.top, w: b.width, h: b.height };
  }

  loop() {
    if (this.raf) return;
    const step = now => {
      this.raf = 0;
      if (this.gone) return;
      if (this.frame(now)) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  // Every moving part at `now`. True while any still moves.
  frame(now) {
    let titling = false;
    for (const t of this.titles) {
      const kin = soft(clamp01((now - t.t0) / MS.title)), kout = t.out ? soft(clamp01((now - t.out) / (MS.title * 0.7))) : 0;
      t.el.style.opacity = String((kin * (1 - kout)).toFixed(3));
      t.el.style.transform = `translate(-50%, ${(10 * (1 - kin)).toFixed(2)}px) scale(${(0.96 + 0.04 * kin).toFixed(4)})`;
      if (t.out && kout >= 1) t.gone = true;
      else if (kin < 1 || t.out) titling = true;
    }
    for (const t of this.titles) if (t.gone) t.el.remove();
    this.titles = this.titles.filter(t => !t.gone);
    for (const [n, mv] of this.moves) {
      const el = this.el(n);
      const k = clamp01((now - mv.t0) / mv.ms), e = mv.kind.startsWith('fade') ? soft(k) : T(k), out = 1 - e;
      let tf = '', op = '';
      switch (mv.kind) {
        case 'cut-in': tf = `scale(${(1 + 0.05 * (1 - F(k))).toFixed(4)})`; break;
        case 'through-in': case 'out-old': {
          // a circle growing to fill the picture (through) or shrinking away (out), in log scale
          const L = mv.lens, full = Math.hypot(this.stage.clientWidth, this.stage.clientHeight);
          const r0 = L.r0, r1 = full, kk = mv.kind === 'through-in' ? e : 1 - e;
          const r = r0 * Math.pow(r1 / r0, kk);
          if (el) el.style.clipPath = k >= 1 && mv.kind === 'through-in' ? '' : `circle(${r.toFixed(1)}px at ${L.cx.toFixed(1)}px ${L.cy.toFixed(1)}px)`;
          const sc = mv.kind === 'through-in' ? 1 : Math.pow(0.6, e);
          tf = `scale(${sc.toFixed(4)})`;
          if (mv.kind === 'out-old') { if (el) el.style.transformOrigin = `${L.cx}px ${L.cy}px`; }
          break;
        }
        case 'through-old': {
          // the old view swells toward the lens as if the camera flew into it, and dims
          const L = mv.lens;
          if (el) el.style.transformOrigin = `${L.cx}px ${L.cy}px`;
          tf = `scale(${Math.pow(2.4, e).toFixed(4)})`; op = 1 - 0.5 * e;
          break;
        }
        case 'out-new': tf = `scale(${Math.pow(1.35, 1 - e).toFixed(4)})`; break;
        case 'fade-in': op = e; break;
        case 'fade-out': op = out; break;
        case 'push-in': tf = `translateX(${(100 * out).toFixed(2)}%)`; break;
        case 'push-out': tf = `translateX(${(-100 * e).toFixed(2)}%)`; break;
        case 'back-in': tf = `translateX(${(-100 * out).toFixed(2)}%)`; break;
        case 'back-out': tf = `translateX(${(100 * e).toFixed(2)}%)`; break;
        case 'zoom-in': tf = `scale(${(0.84 + 0.16 * e).toFixed(4)})`; op = e; break;
        case 'zoom-out': tf = `scale(${(1 + 0.3 * e).toFixed(4)})`; op = out; break;
        case 'inset-in': tf = `scale(${(0.6 + 0.4 * e).toFixed(4)})`; op = e; break;
        case 'inset-out': tf = `scale(${(1 - 0.4 * e).toFixed(4)})`; op = out; break;
        case 'move': {
          // it slides from where its middle was to where it is now, never stretched: its picture is already
          // drawn for its new box (a globe keeps its size between full and half, the picture being taller
          // than wide), so it only travels
          const a = mv.from, b = mv.to;
          if (a && b) {
            const dx = (a.x + a.w / 2 - (b.x + b.w / 2)) * out, dy = (a.y + a.h / 2 - (b.y + b.h / 2)) * out;
            tf = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
          }
          break;
        }
        default: break;
      }
      if (el) {
        if (!['through-in', 'through-old', 'out-old'].includes(mv.kind)) el.style.transformOrigin = mv.kind.startsWith('inset') ? this.corner(n) : '50% 50%';
        el.style.transform = k >= 1 ? '' : tf;
        el.style.opacity = k >= 1 ? '' : op === '' ? '' : String(Number(op).toFixed(3));
        if (k >= 1 && mv.out) { el.setAttribute('data-off', ''); el.style.zIndex = ''; el.style.clipPath = ''; el.style.transformOrigin = '50% 50%'; }
        if (k >= 1 && mv.kind === 'through-in') { el.style.clipPath = ''; el.style.transformOrigin = '50% 50%'; }
        if (k >= 1 && !mv.out && !String(el.dataset.slot || '').startsWith('inset')) el.style.zIndex = '';
      }
      if (k >= 1) this.moves.delete(n);
    }
    const lensing = this.drawLens(now);
    return this.moves.size > 0 || titling || lensing;
  }

  // ---- the lens: a closer look, opened over the picture

  // ["lens", part, x, y]: a dot at x, y (shares of the stage), a leader, and a circle onto the part above it.
  // ["lens", "none"] shuts it. Returns the sound it makes.
  openLens([part, x = 0.5, y = 0.7], now) {
    const t0 = performance.now();
    if (part === 'none' || !this.names.includes(part)) {
      if (this.lens && !this.lens.shut) this.lens.shut = now ? t0 - 1e6 : t0;
      if (now) this.dropLens();
      this.frame(t0); this.loop();
      return null;
    }
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    const r = Math.min(W, H) * 0.34, ax = clamp01(Number(x)) * W, ay = clamp01(Number(y)) * H;
    // the circle sits above the dot, inside the picture
    const cx = Math.max(r + 14, Math.min(W - r - 14, W / 2 + (ax - W / 2) * 0.35));
    const cy = Math.max(r + 70, ay - r - H * 0.1);
    if (this.lens) this.dropLens();
    this.lens = { part, ax, ay, cx, cy, r, t0: now ? t0 - 1e6 : t0, shut: null };
    const el = this.el(part);
    el.dataset.slot = 'lens';
    el.removeAttribute('data-off');
    el.style.zIndex = '4';
    el.style.transform = ''; el.style.opacity = '';
    this.layout[part] = 'lens';
    this.frame(t0);
    this.loop();
    return now ? null : SHOT_SOUND.lens;
  }

  // The lens drawn at `now`: the part clipped to its circle, and the dot, leader and ring over it. True while
  // anything of it moves.
  drawLens(now) {
    const L = this.lens;
    if (!L) return false;
    const el = this.el(L.part);
    const age = now - L.t0;
    const dot = F(clamp01(age / 150)), lead = MOTION.leader.ease(clamp01((age - 120) / 400)), open = F(clamp01((age - 520) / 450));
    const shut = L.shut ? clamp01((now - L.shut) / MS.shut) : 0;
    const vis = (1 - shut);
    const r = L.r * open * (1 - T(shut));
    if (el) el.style.clipPath = `circle(${Math.max(0, r).toFixed(1)}px at ${L.cx.toFixed(1)}px ${L.cy.toFixed(1)}px)`;
    if (!this.ring) {
      this.ring = document.createElement('canvas');
      this.ring.className = 'slensring';
      this.ring.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none';
      this.stage.append(this.ring);
    }
    const c = this.ring, dpr = Math.min(2, window.devicePixelRatio || 1), W = this.stage.clientWidth, H = this.stage.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.globalAlpha = vis;
    // the leader, from the dot to the circle's edge
    const dx = L.cx - L.ax, dy = L.cy - L.ay, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const ex = L.cx - ux * L.r, ey = L.cy - uy * L.r;
    if (lead > 0) {
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(L.ax, L.ay); g.lineTo(L.ax + (ex - L.ax) * lead, L.ay + (ey - L.ay) * lead); g.stroke();
    }
    g.fillStyle = '#7b4cf0'; g.beginPath(); g.arc(L.ax, L.ay, 8 * dot, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(L.ax, L.ay, 4 * dot, 0, Math.PI * 2); g.fill();
    if (r > 1) {
      g.strokeStyle = 'rgba(6,8,48,0.45)'; g.lineWidth = 9; g.beginPath(); g.arc(L.cx, L.cy + 4, r, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.beginPath(); g.arc(L.cx, L.cy, r, 0, Math.PI * 2); g.stroke();
    }
    if (L.shut && shut >= 1) { this.dropLens(); return false; }
    return age < 1000 || !!L.shut;
  }

  // Takes the lens away at once: its part back off screen (unless something else shows it), its ring gone.
  dropLens() {
    const L = this.lens;
    if (L) {
      const el = this.el(L.part);
      if (el && this.layout[L.part] === 'lens') { el.setAttribute('data-off', ''); el.style.clipPath = ''; el.style.zIndex = ''; delete this.layout[L.part]; }
    }
    this.lens = null;
    if (this.ring) { this.ring.remove(); this.ring = null; }
  }

  // A cut through the lens into its part, or out again from a part into the wider view.
  zoomCut(part, how, now) {
    const t0 = performance.now(), W = this.stage.clientWidth, H = this.stage.clientHeight;
    const was = Object.entries(this.layout).filter(([n, sl]) => n !== part && sl === 'full').map(([n]) => n);
    const L = this.lens && this.lens.part === part ? this.lens : null;
    const geo = L ? { cx: L.cx, cy: L.cy, r0: L.r } : how === 'out' && this.lastLens ? { ...this.lastLens } : { cx: W / 2, cy: H * 0.45, r0: Math.min(W, H) * 0.08 };
    // through: remember where it went in, so coming out shrinks back to the same place
    if (how === 'through') this.lastLens = { cx: geo.cx, cy: geo.cy, r0: geo.r0 };
    if (this.ring) { this.ring.remove(); this.ring = null; }
    this.lens = null;
    const el = this.el(part);
    if (now) {
      for (const n of this.names) { const e = this.el(n); if (!e) continue; e.style.clipPath = ''; e.style.transform = ''; e.style.opacity = ''; e.style.zIndex = ''; e.style.transformOrigin = '50% 50%'; }
      this.place({ [part]: 'full' }, true);
      return;
    }
    if (how === 'through') {
      el.dataset.slot = 'full'; el.removeAttribute('data-off'); el.style.zIndex = '4';
      this.layout = { [part]: 'full' };
      this.moves.set(part, { kind: 'through-in', t0, ms: MS.through, lens: geo });
      for (const n of was) { this.moves.set(n, { kind: 'through-old', t0, ms: MS.through, lens: geo, out: true }); }
    } else {
      // out: the old full part shrinks into its circle; the new one is already there behind it
      const old = was[0] || null;
      el.dataset.slot = 'full'; el.removeAttribute('data-off'); el.style.zIndex = '1'; el.style.clipPath = '';
      this.layout = { [part]: 'full' };
      this.moves.set(part, { kind: 'out-new', t0, ms: MS.out });
      if (old) { const e = this.el(old); e.style.zIndex = '4'; this.moves.set(old, { kind: 'out-old', t0, ms: MS.out, lens: { ...geo, r0: Math.max(10, geo.r0 * 0.5) }, out: true }); }
      for (const n of was.slice(1)) { const e = this.el(n); if (e) e.setAttribute('data-off', ''); }
    }
    this.frame(t0);
    this.loop();
  }

  corner(n) {
    const slot = this.layout[n] || '';
    return slot.includes('left') ? (slot.includes('bottom') ? '0 100%' : '0 0') : slot.includes('bottom') ? '100% 100%' : '100% 0';
  }

  // Everything moving lands now.
  finish() {
    if (this.lens) { this.lens.t0 -= 1e7; if (this.lens.shut) this.lens.shut -= 1e7; }
    this.frame(performance.now() + 1e7);
  }

  // Which parts show, and where: for the tests and the film.
  state() {
    return { layout: { ...this.layout }, moving: [...this.moves.keys()], off: this.names.filter(n => { const el = this.el(n); return el && el.hasAttribute('data-off'); }),
      title: (this.titles.find(t => !t.out) || {}).text || null, lens: this.lens && !this.lens.shut ? this.lens.part : null };
  }

  remove() {
    this.gone = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const t of this.titles) t.el.remove();
    this.titles = [];
    this.dropLens();
  }
}
