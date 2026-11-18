// What every sketch shares: the clock, springs that run on it, finger tracking, the tick, and small
// drawing helpers in the mix look.
//
// The clock. Everything moving is worked out from now(), never from CSS transitions, so a film can be
// made one exact frame at a time: in film mode (?film=1) the capture tool sets the time for each frame,
// and anywhere else it is the real time.
import * as E from './ease.js';

export const { TAU, lerp, clamp01, ramp, rgba, mix } = E;
export { E };
export const W = 414, H = 896, SAT = 48, SAB = 34;
export const PARAMS = new URLSearchParams(location.search);
export const FILM = PARAMS.has('film');

// The approved bounce: halfway between gentle and medium (stage0/scene/looks/mix.json).
export const MOTION = { bounce: 0.425, overshoot: 0.675, pop: 1.175, squash: 0.13 };

let filmT = 0;
const origin = performance.now();
export const now = () => (FILM ? filmT : (performance.now() - origin) / 1000);
export const setFilmTime = t => { filmT = t; };

// The colours of the look.
export const C = {
  ground: '#141a3c', bar: '#0f1434', panel: '#1b2250', plate: '#222a60', line: '#2f3678', line2: '#364090', track: '#2a3168',
  text: '#ffffff', soft: '#dde4ff', muted: '#7f88c8', dim: '#5d66ad', ink: '#0e1436', navy: '#1b1f5e',
  gold: '#ffc83d', goldEdge: '#c98a00', cyan: '#49c6ff', cyanEdge: '#1b8fd1', sky: '#6fd6ff',
  teal: '#2bc4a4', tealEdge: '#127a85', tealLight: '#7df0cf', pink: '#ee4b7a', pinkEdge: '#8f1f44', purple: '#8b3fbf',
  sea: '#1b2a80', sea2: '#3b3db8', stage0: '#0a0e2e', stage1: '#1d1552', cloud: '#ffffff', cloudShade: '#aebfff', swirl: '#8fa4f5',
  chipEdge: '#b9c2ee', shadow: '#060830',
};

// A value that moves to where it's told, with the approved spring (or a glide, or plainly).
export class Val {
  constructor(v = 0) { this.a = v; this.b = v; this.s = -1e9; this.d = 1; this.kind = 'spring'; }
  at(t = now()) {
    const k = clamp01((t - this.s) / this.d);
    if (k >= 1) return this.b;
    const c = this.kind === 'spring' ? E.spring(k, MOTION.bounce) : this.kind === 'glide' ? E.back(k, MOTION.overshoot)
      : this.kind === 'out' ? E.out(k) : this.kind === 'inOut' ? E.inOut(k) : this.kind === 'in' ? E.inn(k) : k;
    return lerp(this.a, this.b, c);
  }
  to(v, { t = now(), ms = 520, kind = 'spring', from } = {}) {
    this.a = from ?? this.at(t);
    this.b = v;
    this.s = t;
    this.d = (kind === 'spring' ? ms * MOTION.pop : ms) / 1000;
    this.kind = kind;
    return this;
  }
  set(v) { this.a = this.b = v; this.s = -1e9; return this; }
  get target() { return this.b; }
  moving(t = now()) { return t - this.s < this.d; }
}

// ---- the tick: an iPhone lets a web page tick only through a switch control flipping (the app's trick)
let hap = null;
export function tick() {
  if (FILM) return;
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* not allowed now */ } return; }
  if (!hap) {
    hap = document.createElement('label');
    hap.style.cssText = 'position:fixed;left:-9px;top:-9px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
    hap.setAttribute('aria-hidden', 'true');
    hap.innerHTML = '<input type="checkbox" switch tabindex="-1">';
    document.body.append(hap);
  }
  hap.click();
}

// ---- finger tracking. Where a finger is, in the phone's own pixels.
let phoneEl = null, phoneScale = 1;
export const setPhone = (el, scale) => { phoneEl = el; phoneScale = scale; };
export const toPhone = e => {
  const r = phoneEl.getBoundingClientRect();
  return { x: (e.clientX - r.left) / phoneScale, y: (e.clientY - r.top) / phoneScale };
};
export const rectOf = el => {
  const r = el.getBoundingClientRect(), p = phoneEl.getBoundingClientRect();
  return { x: (r.left - p.left) / phoneScale, y: (r.top - p.top) / phoneScale, w: r.width / phoneScale, h: r.height / phoneScale,
    get cx() { return this.x + this.w / 2; }, get cy() { return this.y + this.h / 2; } };
};

// One finger on el: down(p, e) may return false to ignore it; then move(p, d), up(p, d) or tap(p).
// A press that moves less than 8 px is a tap. Moves and lifts are heard on the window, so a drag keeps
// going wherever the finger goes, for real touches and for the ghost finger alike.
export function track(el, h) {
  const onDown = e => {
    if (e.button && e.button !== 0) return;
    const p0 = toPhone(e);
    if (h.down && h.down(p0, e) === false) return;
    e.preventDefault();
    const id = e.pointerId;
    let moved = false;
    const move = ev => {
      if (ev.pointerId !== id) return;
      const p = toPhone(ev), d = { dx: p.x - p0.x, dy: p.y - p0.y };
      if (!moved && Math.hypot(d.dx, d.dy) > 8) moved = true;
      if (moved && h.move) h.move(p, d, ev);
    };
    const up = ev => {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const p = toPhone(ev), d = { dx: p.x - p0.x, dy: p.y - p0.y };
      if (!moved && h.tap) h.tap(p, ev);
      if (h.up) h.up(p, d, { moved, cancelled: ev.type === 'pointercancel' });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  el.addEventListener('pointerdown', onDown);
  return () => el.removeEventListener('pointerdown', onDown);
}

// ---- canvas helpers
export const DPR = Math.min(2, window.devicePixelRatio || 1);
export function canvas(parent, w, h, { x = 0, y = 0, z = 0, cls = '' } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * DPR);
  c.height = Math.round(h * DPR);
  c.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;${z ? `z-index:${z};` : ''}`;
  if (cls) c.className = cls;
  parent.append(c);
  const ctx = c.getContext('2d');
  return { el: c, ctx, w, h, clear() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h); } };
}

export const font = (size, weight = 800) => `${weight} ${size}px Nunito, system-ui, sans-serif`;

export function rrect(p, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y); p.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  p.lineTo(x + w, y + h - r); p.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  p.lineTo(x + r, y + h); p.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  p.lineTo(x, y + r); p.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  p.closePath();
}
export function disc(p, x, y, r) { if (r > 0.01) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); p.closePath(); } }

// A chip, as the scene draws them: a rounded pill with a 3D edge. kind: plain | gold | pink | teal | dark.
const CHIPS = {
  plain: ['#ffffff', '#1b1f5e', '#b9c2ee'], gold: ['#ffc83d', '#2a1650', '#c98a00'], pink: ['#ee4b7a', '#ffffff', '#8f1f44'],
  teal: ['#2bc4a4', '#ffffff', '#127a85'], dark: ['#222a60', '#dde4ff', '#1c2250'], cyan: ['#49c6ff', '#0e1436', '#1b8fd1'],
};
export function chip(ctx, text, x, y, { kind = 'plain', size = 14, scale = 1, alpha = 1, align = 'center', padX = 10, padY = 6 } = {}) {
  if (scale <= 0.01 || alpha <= 0.01) return null;
  const [fill, ink, edge] = CHIPS[kind] || CHIPS.plain;
  ctx.save();
  ctx.font = font(size);
  const w = ctx.measureText(text).width + padX * 2, h = size + padY * 2;
  const cx = align === 'left' ? x + w / 2 : align === 'right' ? x - w / 2 : x;
  ctx.translate(cx, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= alpha * clamp01(scale * 2.5);
  const e = new Path2D(); rrect(e, -w / 2, -h / 2 + 3, w, h, 11);
  ctx.fillStyle = edge; ctx.fill(e);
  const p = new Path2D(); rrect(p, -w / 2, -h / 2, w, h, 11);
  ctx.fillStyle = fill; ctx.fill(p);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
  return { w, h, cx };
}

// A soft ring that spreads and fades: a touch, a landing.
export function ripple(ctx, x, y, k, { r0 = 10, r1 = 40, color = '#ffffff', width = 3, alpha = 0.8 } = {}) {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha * (1 - k));
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, E.out(k)), 0, TAU); ctx.stroke();
  ctx.restore();
}

// Seeded random numbers, so every film is the same.
export const rng = E.rng;

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmt = n => Number(n).toLocaleString('en');

// Outlines a shape made of overlapping pieces as one shape: a single line around the outside, with an
// optional fill. (Stroking such a path directly would draw every piece's own edge.)
export function outliner(cv) {
  const off = document.createElement('canvas');
  off.width = cv.el.width; off.height = cv.el.height;
  const g = off.getContext('2d'), k = cv.el.width / cv.w;
  return (ctx, path, { stroke, width = 3, fill = null, alpha = 1 } = {}) => {
    if (alpha <= 0.01) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, off.width, off.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.lineJoin = 'round';
    g.strokeStyle = stroke; g.lineWidth = width * 2; g.stroke(path);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill(path);
    g.globalCompositeOperation = 'source-over';
    if (fill) { g.fillStyle = fill; g.fill(path); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= alpha; ctx.drawImage(off, 0, 0); ctx.restore();
  };
}
