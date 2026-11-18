// Picks what to show from the address, then either plays live (drag, tap) or waits for window.seek.
//   index.html                    the live sketch
//   ?angle=a | b | c              how the room is seen: straight on, a little from above (the default), from above and to the side
//   ?cam=150                      where the live bedroom starts, in points from its left wall
//   ?level=bronze | gold | platinum                      the globe stand's metal
//   ?film=pan | bookshelf         nothing plays; a capture tool calls window.seek(seconds)
//   ?shot=<name>                  one still (names are in js/films.js)
//   ?touch=1                      outline every touch area (for checking sizes)
//   ?card=<avatar id>             round 2's avatars, one by itself (they are no longer in the room)

import { clamp01, lerp, ramp, inOutBack } from './ease.js';
import { pen } from './draw.js';
import { createScene, ROOMS, X, MOTION, W, H } from './scene.js';
import { HOME_VIEW } from './globe.js';
import { FILMS, STILLS } from './films.js';

const q = new URLSearchParams(location.search);
const phone = document.getElementById('phone');
const canvas = document.getElementById('art');
const dpr = Math.min(2, Number(q.get('dpr')) || window.devicePixelRatio || 2);
window.catalogue = { stills: Object.keys(STILLS), films: Object.keys(FILMS) };

await Promise.all([700, 800, 900].map(w => document.fonts.load(`${w} 16px "Nunito"`)));

const shot = STILLS[q.get('shot')], film = FILMS[q.get('film')] || (shot && FILMS[shot.film]);
const avatarOnly = (shot && shot.avatar) || (film && film.avatar) || q.get('card');

if (avatarOnly) {
  const { createAvatarCard: card0 } = await import('./avatars-card.js');
  document.body.classList.add('card');
  const card = card0(canvas, { dpr });
  const draw = t => card.render({ t, id: avatarOnly, hat: !!(shot && shot.hat) || q.has('hat'), shirt: q.has('shirt') });
  window.duration = film ? film.duration : 0;
  window.seek = t => draw(t);
  if (shot) draw(shot.t);
  else if (film) draw(0);
  else { const tick = now => { draw(now / 1000); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
} else {
  const world = await fetch('vendor/countries-110m.json').then(r => r.json());
  const angle = (shot && shot.angle) || (['a', 'b', 'c'].includes(q.get('angle')) ? q.get('angle') : 'b');
  const scene = createScene(canvas, world, { dpr, angle, level: q.get('level') || 'gold' });
  window.touchAreas = cam => scene.touchAreas(cam);
  if (shot || film) {
    document.body.classList.add('film');
    const viewAt = t => {
      const v = film ? film.view(t, scene) : shot.view();
      if (shot && shot.finger === false) v.finger = null;
      return v;
    };
    window.duration = film ? film.duration : 0;
    window.seek = t => { scene.render(viewAt(t)); if (q.has('touch')) outlineTouch(scene, viewAt(t).cam); return t; };
    window.seek(shot ? (shot.t ?? 0) : 0);
  } else {
    live(scene);
  }
}
window.ready = true;

// for checking: every touch area as a box, the drawing's own box dashed inside it
function outlineTouch(scene, cam) {
  const ctx = canvas.getContext('2d');
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const a of scene.touchAreas(cam)) {
    ctx.strokeStyle = 'rgba(255,80,120,0.9)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(a.touch[0], a.touch[1], a.touch[2] - a.touch[0], a.touch[3] - a.touch[1]);
  }
  ctx.restore();
}

// ---------- the live page: drag to pan, tap things ----------
function live(scene) {
  const now = () => performance.now() / 1000;
  const start = q.has('cam') ? Math.max(ROOMS.bed.min, Math.min(ROOMS.bed.max, Number(q.get('cam')) || 0)) : ROOMS.bed.home;
  const S = { cam: start, room: 'bed', vel: 0, sel: null, gone: null, glide: null, globe: 0, globeTo: 0, books: 0, booksTo: 0, run: null, rot: HOME_VIEW.slice(), pick: null, flash: {} };
  let ptr = null;
  const local = e => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
  };
  const view = () => {
    const t = now();
    return {
      t, cam: S.cam, globe: S.globe, books: S.books, rot: S.rot,
      sel: S.sel && { id: S.sel.id, age: t - S.sel.at },
      gone: S.gone && { id: S.gone.id, age: t - S.gone.at },
      run: S.run && { id: S.run.id, age: t - S.run.at },
      pick: S.pick && { name: S.pick.name, age: t - S.pick.at, at: null },
      backPress: S.flash.back > t, reviewPress: S.flash.review > t,
    };
  };
  const select = id => {
    if (S.sel) S.gone = { id: S.sel.id, at: now() };
    S.sel = id ? { id, at: now() } : null;
  };
  const go = room => {
    select(null);
    S.room = room; S.vel = 0;
    S.glide = { from: S.cam, to: room === 'kitchen' ? ROOMS.kitchen.min : ROOMS.bed.max, at: now(), dur: 1.0 };
  };
  canvas.addEventListener('pointerdown', e => {
    const [x, y] = local(e);
    ptr = { x, y, x0: x, y0: y, cam0: S.cam, rot0: S.rot.slice(), moved: false, t: now(), lastX: x, lastT: now() };
    S.vel = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!ptr) return;
    const [x, y] = local(e), t = now();
    if (Math.hypot(x - ptr.x0, y - ptr.y0) > 7) ptr.moved = true;
    if (!ptr.moved) return;
    if (S.globe > 0.5) {
      S.rot = [ptr.rot0[0] + (x - ptr.x0) * 0.32, Math.max(-60, Math.min(60, ptr.rot0[1] - (y - ptr.y0) * 0.32))];
      S.pick = null;
    } else if (S.books > 0.01) {
      // the open bookcase does not move
    } else if (!S.glide) {
      const lim = ROOMS[S.room];
      let c = ptr.cam0 - (x - ptr.x0);
      if (c < lim.min) c = lim.min - (lim.min - c) * 0.3;        // a little give at the walls
      if (c > lim.max) c = lim.max + (c - lim.max) * 0.3;
      S.cam = c;
      if (t > ptr.lastT) S.vel = lerp(S.vel, -(x - ptr.lastX) / (t - ptr.lastT), 0.5);
      if (S.sel) select(null);
    }
    ptr.lastX = x; ptr.lastT = t;
  });
  const up = e => {
    if (!ptr) return;
    const [x, y] = local(e), tapped = !ptr.moved && now() - ptr.t < 0.6;
    ptr = null;
    if (!tapped) return;
    S.vel = 0;
    const h = scene.hit(x, y, view());
    if (!h) return select(null);
    if (h.type === 'back') { S.flash.back = now() + 0.15; S.globeTo = 0; S.booksTo = 0; S.pick = null; S.run = null; select(null); }
    else if (h.type === 'country') S.pick = { name: h.name, at: now() };
    else if (h.type === 'space') { S.pick = null; S.run = null; }
    else if (h.type === 'review') S.flash.review = now() + 0.18;
    else if (h.type === 'run') S.run = { id: h.id, at: now() };
    else if (h.type === 'go') go(h.room);
    else if (h.type === 'thing') {
      select(h.id);
      if (h.opens === 'globe') setTimeout(() => { S.globeTo = 1; S.rot = HOME_VIEW.slice(); }, 130);
      if (h.opens === 'books') setTimeout(() => { S.booksTo = 1; }, 130);
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { ptr = null; });

  let last = now();
  const tick = () => {
    const t = now(), dt = Math.min(0.05, t - last);
    last = t;
    if (S.glide) {
      const k = ramp(t, S.glide.at, S.glide.at + S.glide.dur);
      S.cam = lerp(S.glide.from, S.glide.to, inOutBack(k, MOTION.overshoot * 0.5));
      if (k >= 1) S.glide = null;
    } else if (!ptr) {
      const lim = ROOMS[S.room];
      S.cam += S.vel * dt;
      S.vel *= Math.pow(0.04, dt);
      if (S.cam < lim.min) { S.cam = lerp(S.cam, lim.min, 1 - Math.pow(0.0005, dt)); S.vel = 0; }
      if (S.cam > lim.max) { S.cam = lerp(S.cam, lim.max, 1 - Math.pow(0.0005, dt)); S.vel = 0; }
    }
    S.globe = S.globeTo > S.globe ? Math.min(1, S.globe + dt / 0.9) : Math.max(0, S.globe - dt / 0.8);
    S.books = S.booksTo > S.books ? Math.min(1, S.books + dt / 0.9) : Math.max(0, S.books - dt / 0.8);
    if ((S.globe >= 1 || S.books >= 1) && S.sel && (S.sel.id === 'globe' || S.sel.id === 'books')) S.sel = null;
    if (S.globe > 0.5 && !ptr) S.rot[0] -= dt * 1.1;
    scene.render(view());
    requestAnimationFrame(tick);
  };
  const fit = () => {
    const k = Math.min(1, window.innerWidth / W, window.innerHeight / H);
    phone.style.transform = k === 1 ? '' : `scale(${k})`;
  };
  fit();
  window.addEventListener('resize', fit);
  requestAnimationFrame(tick);
}
