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
//   cut   at once, the new picture settling in from a touch closer     ("cut", a soft puff)
//   fade  one picture dissolving into the other                        (no sound)
//   push  the new one slides in from the right, the old out the left    ("whoosh")
//   back  the same from the left                                        ("whoosh")
//   zoom  the old one swells and fades, the new one grows into place    ("whoosh")
import { soft, clamp01 } from './ease.js';

export const CUTS = ['cut', 'fade', 'push', 'back', 'zoom'];
export const CORNERS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
export const SHOT_SOUND = { cut: 'cut', fade: null, push: 'whoosh', back: 'whoosh', zoom: 'whoosh', split: 'whoosh', inset: 'pop', title: null };
const MS = { cut: 900, fade: 650, push: 750, back: 750, zoom: 800, move: 750, inset: 550, title: 600 };

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
    stage.classList.add('shots');
  }

  el(name) { return this.stage.querySelector(`.spart[data-part="${CSS.escape(name)}"]`); }

  // Back to the opening layout, at once (building the picture for a moment).
  reset() {
    this.moves.clear();
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
    const known = n => this.names.includes(n);
    let next = { ...this.layout }, how = 'cut';
    if (kind === 'cut') {
      const [part, h = 'cut'] = args;
      if (!known(part)) return null;
      next = { [part]: 'full' };
      how = CUTS.includes(h) ? h : 'cut';
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
      const k = clamp01((now - mv.t0) / mv.ms), e = soft(k), out = 1 - e;
      let tf = '', op = '';
      switch (mv.kind) {
        case 'cut-in': tf = `scale(${(1 + 0.05 * (1 - (1 - (1 - k) * (1 - k)))).toFixed(4)})`; break;
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
        el.style.transformOrigin = mv.kind.startsWith('inset') ? this.corner(n) : '50% 50%';
        el.style.transform = k >= 1 ? '' : tf;
        el.style.opacity = k >= 1 ? '' : op === '' ? '' : String(Number(op).toFixed(3));
        if (k >= 1 && mv.out) { el.setAttribute('data-off', ''); el.style.zIndex = ''; }
        if (k >= 1 && !mv.out && !String(el.dataset.slot || '').startsWith('inset')) el.style.zIndex = '';
      }
      if (k >= 1) this.moves.delete(n);
    }
    return this.moves.size > 0 || titling;
  }

  corner(n) {
    const slot = this.layout[n] || '';
    return slot.includes('left') ? (slot.includes('bottom') ? '0 100%' : '0 0') : slot.includes('bottom') ? '100% 100%' : '100% 0';
  }

  // Everything moving lands now.
  finish() { this.frame(performance.now() + 1e7); }

  // Which parts show, and where: for the tests and the film.
  state() {
    return { layout: { ...this.layout }, moving: [...this.moves.keys()], off: this.names.filter(n => { const el = this.el(n); return el && el.hasAttribute('data-off'); }),
      title: (this.titles.find(t => !t.out) || {}).text || null };
  }

  remove() {
    this.gone = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const t of this.titles) t.el.remove();
    this.titles = [];
  }
}
