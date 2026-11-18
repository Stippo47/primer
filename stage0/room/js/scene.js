// Draws one moment of the Home screen from a plain description of it (the "view"):
// where the camera is, what is being touched, whether the globe or the bookcase is open.
// Nothing here keeps time, so the films and the live page share it.

import { clamp01, lerp, ramp, spring, out, inOut, rng } from './ease.js';
import { pen, rr, circ, TAU } from './draw.js';
import { paintBackdrop, paintBedroomPatch, viewFor, Y, X, DOOR, PAD, ROOMS, D, WALL } from './shell.js';
import { THINGS } from './things.js';
import { createGlobe, HOME_VIEW } from './globe.js';
import { drawBookcase, caseView, runBoxes, CASE, RUNS, SHELF, shelfPlace } from './books.js';
import { makeView, ANGLES } from './view.js';
import * as UI from './ui.js';

export const W = 414, H = 896;
// Bounce sits halfway between the look files' gentle (Night) and medium (Mix).
export const MOTION = { bounce: 0.425, overshoot: 0.675, pop: 1.175, squash: 0.13 };
export const GLOBE = { cx: 207, cy: 416, r: 172 };
export const BACK = { x: 16, y: 48, size: 44 };
export const SC = 0.6;          // earned things are drawn at 0.6 of the size they were first drawn at
export const MIN_TOUCH = 44;    // no touch area smaller than this, whatever the drawing
export const CASE_AT = 322;     // where the bookcase stands: its left side, against the back wall
export { ROOMS, X, Y, DOOR };

const LAYER = { wall: 0, floor: 1, case: 2, on: 3, stand: 4 };

export function createScene(canvas, world, opts = {}) {
  const dpr = opts.dpr || 2, angle = opts.angle || 'b';
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  const shell = document.createElement('canvas'), furn = document.createElement('canvas');
  const v = paintBackdrop(shell, furn, dpr, angle);
  const globe = createGlobe(world);
  const bookcase = { id: 'books', room: 'bed', name: 'Bookcase', at: [CASE_AT, 0, 0], layer: 'case', opens: 'books', bought: true,
    draw: g => drawBookcase(g, caseView(angle)) };
  const things = THINGS.concat([bookcase]).slice().sort((a, b) => LAYER[a.layer] - LAYER[b.layer] || a.at[1] - b.at[1]);
  const byId = new Map(things.map(t => [t.id, t]));
  const env = { mini: globe.mini, level: opts.level || 'gold', t: 0, down: dy => [dy / v.k * v.sx, dy / v.k] };

  const r0 = rng(11);
  const stars = Array.from({ length: 60 }, () => ({ x: r0() * 1000, y: r0() * H, s: 0.5 + r0() * 1.3, ph: r0() * TAU, rate: 0.6 + r0() * 1.6 }));
  function sky(t, cam) {
    ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
    for (const [x, y, r, c] of [[60, 200, 200, 'rgba(91,43,214,0.3)'], [370, 540, 220, 'rgba(15,163,177,0.18)'], [340, 150, 140, 'rgba(224,67,154,0.13)']]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (const s of stars) {
      const x = (((s.x - cam * 0.12) % 460) + 460) % 460 - 20;
      ctx.fillStyle = `rgba(214,226,255,${0.9 * (1 - 0.6 * (0.5 + 0.5 * Math.sin(t * s.rate + s.ph)))})`;
      ctx.fill(circ(x, s.y, s.s));
    }
  }

  // where a thing's origin is, in the world (before the camera), and the box its drawing fills
  const place = th => v.P(...th.at);
  function drawnBox(th) {
    const [ox, oy] = place(th);
    if (th.id === 'books') { const cv = caseView(angle), [, ty] = cv.P(0, 0, CASE.H), [, by] = cv.P(0, CASE.DEP, 0); return [ox - 2, oy + ty, ox + CASE.W + 2, oy + by]; }
    const [a, b, c, d] = th.hit;
    if (th.layer === 'floor') return [ox + a, oy + b * v.k, ox + c, oy + d * v.k];
    return [ox + a * SC, oy + b * SC, ox + c * SC, oy + d * SC];
  }
  function touchBox(th) {
    let [x0, y0, x1, y1] = drawnBox(th);
    if (x1 - x0 < MIN_TOUCH) { const m = (x0 + x1) / 2; x0 = m - MIN_TOUCH / 2; x1 = m + MIN_TOUCH / 2; }
    if (y1 - y0 < MIN_TOUCH) { const m = (y0 + y1) / 2; y0 = m - MIN_TOUCH / 2; y1 = m + MIN_TOUCH / 2; }
    return [x0, y0, x1, y1];
  }

  // how far a touched thing has popped (0 to 1), and how squashed it is
  function touchOf(view, id) {
    if (view.sel && view.sel.id === id) {
      const a = view.sel.age, hold = 1 - clamp01(Math.max(view.globe || 0, view.books || 0) * 5);   // it settles as a display opens
      return { k: spring(ramp(a, 0, 0.5 * MOTION.pop), MOTION.bounce) * hold, sq: MOTION.squash * Math.sin(ramp(a, 0, 0.24) * Math.PI) };
    }
    if (view.gone && view.gone.id === id) return { k: 1 - out(ramp(view.gone.age, 0, 0.2)), sq: 0 };
    return null;
  }

  function drawThing(th, view) {
    const g = pen(ctx, th.fading ? 1 : 0), touch = touchOf(view, th.id);
    env.t = view.t;
    const [ox, oy] = place(th), [x0, y0, x1, y1] = drawnBox(th);
    ctx.save();
    if (touch && touch.k > 0.001) {
      const { k, sq } = touch, flat = th.layer === 'floor', hangs = th.layer === 'wall';
      const lift = (flat ? 4 : 7) * k + (flat ? 0 : Math.sin(view.t * 2.4) * 0.9 * k);
      // focus: a soft light behind it, and its shadow left where it stood
      pen(ctx).glow((x0 + x1) / 2, (y0 + y1) / 2 - lift * 0.5, (x1 - x0) / 2 + 22, (y1 - y0) / 2 + 20, '#b4dcff', 0.42 * clamp01(k));
      if (!hangs && !flat) pen(ctx).shadow((x0 + x1) / 2, oy + 1, (x1 - x0) * 0.5, 4, 0.3 * clamp01(k));
      const px = hangs ? (x0 + x1) / 2 : ox, py = hangs ? (y0 + y1) / 2 : flat ? oy : y1;
      ctx.translate(px, py - lift);
      ctx.scale((1 + sq) * (1 + 0.035 * k), (1 - sq) * (1 + 0.035 * k));
      ctx.translate(-px, -py);
    }
    ctx.translate(ox, oy);
    if (th.layer === 'floor') ctx.transform(1, 0, -v.sx, v.k, 0, 0);
    else if (th.id !== 'books') ctx.scale(SC, SC);
    th.draw(g, env);
    ctx.restore();
  }

  function bubbleFor(view) {
    const th = view.sel && byId.get(view.sel.id);
    if (!th || th.opens) return null;
    const k = spring(ramp(view.sel.age, 0.06, 0.06 + 0.5 * MOTION.pop), MOTION.bounce);
    const [x0, y0, x1, y1] = drawnBox(th);
    const ax = Math.max(26, Math.min(W - 26, (x0 + x1) / 2 - view.cam));
    const top = y0 - 8, below = top < 190;
    return UI.bubble(ctx, { name: th.name, mem: th.mem, fading: th.fading, ax, ay: below ? y1 + 6 : top, below, k, press: view.reviewPress });
  }

  // the room itself, at a camera position, under whatever transform is set
  function drawRoom(view, skipCase) {
    const cam = view.cam;
    const sx = Math.round((cam + PAD) * dpr);
    const sx0 = Math.max(0, sx), sw = Math.min(shell.width - sx0, W * dpr - (sx0 - sx));
    const blit = c => { if (sw > 0) ctx.drawImage(c, sx0, 0, sw, H * dpr, (sx0 - sx) / dpr, 0, sw / dpr, H); };
    const visible = th => { const [a, , b] = drawnBox(th); return b > cam - 60 && a < cam + W + 60; };
    blit(shell);
    ctx.save(); ctx.translate(-cam, 0);
    for (const th of things) if (th.layer === 'wall' || th.layer === 'floor') if (visible(th)) drawThing(th, view);
    ctx.restore();
    blit(furn);
    ctx.save(); ctx.translate(-cam, 0);
    for (const th of things) if (th.layer !== 'wall' && th.layer !== 'floor' && !(skipCase && th.id === 'books')) if (visible(th)) drawThing(th, view);
    ctx.restore();
  }

  // how the bookcase is placed while it opens: e = 0 in the room, 1 open
  function shelfAt(cam, e) {
    const cv = caseView(angle), rx = CASE_AT - cam, ry = v.yB, d = shelfPlace();
    const k = e < 0.4 ? cv.k : lerp(cv.k, SHELF.k, inOut((e - 0.4) / 0.6));
    return { rx, ry, ox: lerp(rx, d.ox, e), oy: lerp(ry, d.oy, e), s: lerp(1, d.S, e), k };
  }

  let lastBubble = null, lastRuns = null;
  function render(view) {
    const t = view.t, cam = view.cam, zk = clamp01(view.globe || 0), zb = clamp01(view.books || 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    sky(t, cam);

    // the zoom into the globe: the room swells around its own globe until the two globes are one
    const gth = byId.get('globe'), [gwx, gwy] = place(gth), r0 = 42 * SC, gx = gwx - cam, gy = gwy - 118 * SC, e = inOut(zk);
    const gv = { cx: lerp(gx, GLOBE.cx, e), cy: lerp(gy, GLOBE.cy, e), r: lerp(r0, GLOBE.r, e), rot: view.rot || HOME_VIEW };
    // the zoom into the bookcase: the room swells around it, and the view comes round to face it
    const eb = inOut(zb), sh = shelfAt(cam, eb);
    if (zk < 1 && zb < 1) {
      ctx.save();
      if (zk > 0) { ctx.translate(gv.cx, gv.cy); ctx.scale(gv.r / r0, gv.r / r0); ctx.translate(-gx, -gy); }
      if (zb > 0) { ctx.translate(sh.ox, sh.oy); ctx.scale(sh.s, sh.s); ctx.translate(-sh.rx, -sh.ry); }
      drawRoom(view, zb > 0);
      ctx.restore();
    }
    if (zk > 0) {
      ctx.fillStyle = `rgba(20,26,60,${clamp01(zk * 1.5)})`; ctx.fillRect(0, 0, W, H);
      if (zk > 0.3) {
        ctx.save(); ctx.globalAlpha = clamp01((zk - 0.3) / 0.4);
        for (const s of stars) { ctx.fillStyle = 'rgba(214,226,255,0.7)'; ctx.fill(circ(((s.x * 0.9) % 414), s.y * 0.88, s.s)); }
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = clamp01(zk * 2.5);
      globe.display(ctx, gv, { t, level: env.level, stand: clamp01((zk - 0.5) / 0.4), pick: view.pick?.name, pickAge: view.pick?.age, pickAt: view.pick?.at, bounce: MOTION.bounce });
      ctx.restore();
    }
    lastRuns = null;
    if (zb > 0) {
      // the wall and floor around the bookcase, drawn sharp, coming up over the blurred room
      const pv = makeView({ k: sh.k, sx: ANGLES[angle].sx }, { yF: v.yB + D * sh.k, D });
      ctx.save();
      ctx.globalAlpha = clamp01(ramp(zb, 0.04, 0.24));
      ctx.translate(sh.ox, sh.oy); ctx.scale(sh.s, sh.s); ctx.translate(-CASE_AT, -v.yB);
      paintBedroomPatch(pen(ctx), pv, CASE_AT - 260, CASE_AT + 340);
      ctx.restore();
      // a soft darkening toward the edges, so the eye goes to the shelves
      ctx.save(); ctx.globalAlpha = clamp01(ramp(zb, 0.3, 1));
      const vg = ctx.createRadialGradient(207, 470, 120, 207, 470, 520);
      vg.addColorStop(0, 'rgba(10,8,40,0)'); vg.addColorStop(1, 'rgba(10,8,40,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      // the bookcase itself
      const cv = makeView({ k: sh.k, sx: ANGLES[angle].sx }, { yF: sh.k, D: 1 });
      ctx.save(); ctx.translate(sh.ox, sh.oy); ctx.scale(sh.s, sh.s);
      drawBookcase(pen(ctx), cv, { detail: sh.s > 2 });
      ctx.restore();
      if (zb > 0.98) {
        lastRuns = runBoxes(cv).map(r => ({ ...r, screen: [sh.ox + r.box[0] * sh.s, sh.oy + r.box[1] * sh.s, sh.ox + r.box[2] * sh.s, sh.oy + r.box[3] * sh.s] }));
      }
    }

    // the few controls
    UI.coins(ctx, 340, 1 - clamp01(Math.max(zk, zb) * 3));
    lastBubble = null;
    if (zk < 0.05 && zb < 0.05) lastBubble = bubbleFor(view);
    if (zb > 0.98 && view.run) lastBubble = runBubble(view);
    UI.arrowButton(ctx, BACK.x, BACK.y, BACK.size, -1, clamp01((Math.max(zk, zb) - 0.5) * 2.5), view.backPress ? 1 : 0);
    if (view.finger) {
      const f = view.finger;
      UI.touchMark(ctx, f.x, f.y - 2, f.ring ?? 0);
      UI.hand(ctx, f.x, f.y, f.press || 0, f.alpha ?? 1);
    }
    return gv;
  }

  // the bubble over a run of books on the opened bookcase
  function runBubble(view) {
    const r = lastRuns && lastRuns.find(q => q.id === view.run.id);
    if (!r) return null;
    const k = spring(ramp(view.run.age, 0.06, 0.06 + 0.5 * MOTION.pop), MOTION.bounce);
    const [x0, y0, x1, y1] = r.screen, below = y0 < 200;
    return UI.bubble(ctx, { name: r.run.name, mem: r.run.mem, fading: r.run.fading, ax: Math.max(26, Math.min(W - 26, (x0 + x1) / 2)), ay: below ? y1 + 4 : y0 - 6, below, k, press: view.reviewPress });
  }

  // where a run's touch area is on the open bookcase (at least 44 square)
  function runTouch(r) {
    let [x0, y0, x1, y1] = r.screen;
    if (x1 - x0 < MIN_TOUCH) { const m = (x0 + x1) / 2; x0 = m - MIN_TOUCH / 2; x1 = m + MIN_TOUCH / 2; }
    if (y1 - y0 < MIN_TOUCH) { const m = (y0 + y1) / 2; y0 = m - MIN_TOUCH / 2; y1 = m + MIN_TOUCH / 2; }
    return [x0, y0, x1, y1];
  }

  // what is under a point of the screen, for the live page
  function hit(x, y, view) {
    const inBack = () => x >= BACK.x - 6 && x <= BACK.x + BACK.size + 6 && y >= BACK.y - 6 && y <= BACK.y + BACK.size + 6;
    if ((view.globe || 0) > 0.5) {
      if (inBack()) return { type: 'back' };
      const name = globe.pick(x, y, { ...GLOBE, rot: view.rot || HOME_VIEW });
      return name ? { type: 'country', name } : { type: 'space' };
    }
    if (lastBubble) {
      const r = lastBubble.review, b = lastBubble.box;
      if (r && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return { type: 'review' };
      if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return { type: 'bubble' };
    }
    if ((view.books || 0) > 0.5) {
      if (inBack()) return { type: 'back' };
      for (const r of lastRuns || []) { const [a, b, c, d] = runTouch(r); if (x >= a && x <= c && y >= b && y <= d) return { type: 'run', id: r.id }; }
      return { type: 'space' };
    }
    const wx = x + view.cam;
    for (let i = things.length - 1; i >= 0; i--) {
      const th = things[i], [a, b, c, d] = touchBox(th);
      if (wx >= a && wx <= c && y >= b && y <= d) return { type: 'thing', id: th.id, opens: th.opens };
    }
    // the door, or the doorway behind it
    const [lx] = v.P(X.bedR - (D - DOOR.z0) * Math.sin(DOOR.open), D, 0);
    if (wx >= lx - 4 && wx <= X.kitL + 40 && y >= Y.front - DOOR.h - 20 && y <= Y.front + 10) {
      return { type: 'go', room: view.cam + W / 2 > X.bedR + 9 ? 'bed' : 'kitchen' };
    }
    return null;
  }

  // touch areas, for checking that none is too small (screen coordinates at a camera position)
  function touchAreas(cam) {
    return things.map(th => { const [a, b, c, d] = touchBox(th), [p, q, r, s] = drawnBox(th); return { id: th.id, touch: [a - cam, b, c - cam, d], drawn: [p - cam, q, r - cam, s] }; });
  }

  // where a thing is on the screen at a camera position (for the films' finger)
  function screenOf(id, cam) { const [a, b, c, d] = drawnBox(byId.get(id)); return [(a + c) / 2 - cam, (b + d) / 2]; }
  function runAt(id) { const r = (lastRuns || []).find(q => q.id === id); return r && [(r.screen[0] + r.screen[2]) / 2, (r.screen[1] + r.screen[3]) / 2]; }

  return { render, hit, things, byId, globe, view: v, touchAreas, screenOf, runAt };
}
