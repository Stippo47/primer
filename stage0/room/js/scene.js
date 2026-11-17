// Draws one moment of the Home screen from a plain description of it (the "view"):
// where the camera is, what is being touched, whether the globe is open. Nothing here keeps time,
// so the films and the live page share it.

import { clamp01, lerp, ramp, spring, out, inOut, rng } from './ease.js';
import { pen, rr, circ, TAU } from './draw.js';
import { paintBackdrop, V, X, DOOR, PAD, ROOMS } from './shell.js';
import { THINGS } from './things.js';
import { createGlobe, HOME_VIEW } from './globe.js';
import { drawAvatar } from './avatars.js';
import * as UI from './ui.js';

export const W = 414, H = 896;
// Bounce sits halfway between the look files' gentle (Night) and medium (Mix).
export const MOTION = { bounce: 0.425, overshoot: 0.675, pop: 1.175, squash: 0.13 };
export const GLOBE = { cx: 207, cy: 416, r: 172 };
export const AVATAR_AT = { x: 342, y: 720 };
export const BACK = { x: 16, y: 48, size: 44 };
export const ARROW = { y: 432, size: 40 };
export { ROOMS, X, V, DOOR };

export function createScene(canvas, world, opts = {}) {
  const dpr = opts.dpr || 2;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  const back = document.createElement('canvas');
  paintBackdrop(back, dpr);
  const globe = createGlobe(world);
  const things = THINGS.slice().sort((a, b) => a.z - b.z);
  const byId = new Map(things.map(t => [t.id, t]));
  const env = { mini: globe.mini, level: opts.level || 'gold', t: 0 };
  const nav = opts.nav || 'doors';
  const avatar = opts.avatar || 'tuft';

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

  const pivot = th => (th.y < 480 && th.hit[1] >= -10 ? [(th.hit[0] + th.hit[2]) / 2, (th.hit[1] + th.hit[3]) / 2] : [0, 0]);
  const hangs = th => th.y < 480 && th.hit[1] >= -10;

  // how far a touched thing has popped (0 to 1), and how squashed it is
  function touchOf(view, id) {
    if (view.sel && view.sel.id === id) {
      const a = view.sel.age, hold = 1 - clamp01((view.globe || 0) * 5);   // it settles back as the globe opens
      return { k: spring(ramp(a, 0, 0.5 * MOTION.pop), MOTION.bounce) * hold, sq: MOTION.squash * Math.sin(ramp(a, 0, 0.24) * Math.PI) };
    }
    if (view.gone && view.gone.id === id) return { k: 1 - out(ramp(view.gone.age, 0, 0.2)), sq: 0 };
    return null;
  }

  function drawThing(th, view) {
    const g = pen(ctx, th.fading ? 1 : 0), touch = touchOf(view, th.id);
    env.t = view.t;
    ctx.save();
    if (touch && touch.k > 0.001) {
      const { k, sq } = touch, [x0, y0, x1, y1] = th.hit, lift = (th.flat ? 4 : 9) * k + (th.flat ? 0 : Math.sin(view.t * 2.4) * 1.1 * k);
      // focus: a soft solid shape behind it, and its shadow left on the surface
      pen(ctx).glow(th.x + (x0 + x1) / 2, th.y + (y0 + y1) / 2 - lift * 0.5, (x1 - x0) / 2 + 30, (y1 - y0) / 2 + 26, '#b4dcff', 0.42 * clamp01(k));
      if (!hangs(th) && !th.flat) pen(ctx).shadow(th.x + (x0 + x1) / 2, th.y + 1, (x1 - x0) * 0.5, 5, 0.3 * clamp01(k));
      const [px, py] = pivot(th);
      ctx.translate(th.x + px, th.y + py - lift);
      ctx.scale((1 + sq) * (1 + 0.035 * k), (1 - sq) * (1 + 0.035 * k));
      ctx.translate(-px, -py);
    } else ctx.translate(th.x, th.y);
    th.draw(g, env);
    ctx.restore();
  }

  function bubbleFor(view) {
    const th = view.sel && byId.get(view.sel.id);
    if (!th || th.opens) return null;
    const k = spring(ramp(view.sel.age, 0.06, 0.06 + 0.5 * MOTION.pop), MOTION.bounce);
    const ax = Math.max(26, Math.min(W - 26, th.x + (th.hit[0] + th.hit[2]) / 2 - view.cam));
    const top = th.y + th.hit[1] - 14, below = top < 190;
    return UI.bubble(ctx, { name: th.name, mem: th.mem, fading: th.fading, ax, ay: below ? th.y + th.hit[3] + 8 : top, below, k, press: view.reviewPress });
  }

  let lastBubble = null;
  function render(view) {
    const t = view.t, cam = view.cam, zk = clamp01(view.globe || 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    sky(t, cam);

    // the zoom into the globe: the room swells around its own globe until the two globes are one
    const gth = byId.get('globe'), gx = gth.x - cam, gy = gth.y - 118, e = inOut(zk);
    const gv = { cx: lerp(gx, GLOBE.cx, e), cy: lerp(gy, GLOBE.cy, e), r: lerp(42, GLOBE.r, e), rot: view.rot || HOME_VIEW };
    if (zk < 1) {
      ctx.save();
      if (zk > 0) { ctx.translate(gv.cx, gv.cy); ctx.scale(gv.r / 42, gv.r / 42); ctx.translate(-gx, -gy); }
      const sx = Math.round((cam + PAD) * dpr);
      const sx0 = Math.max(0, sx), sw = Math.min(back.width - sx0, W * dpr - (sx0 - sx));
      if (sw > 0) ctx.drawImage(back, sx0, 0, sw, H * dpr, (sx0 - sx) / dpr, 0, sw / dpr, H);
      ctx.translate(-cam, 0);
      for (const th of things) {
        if (th.x + th.hit[2] < cam - 60 || th.x + th.hit[0] > cam + W + 60) continue;
        if (th.z < 3) drawThing(th, view);
      }
      if (AVATAR_AT.x > cam - 90 && AVATAR_AT.x < cam + W + 90) {
        ctx.save(); ctx.translate(AVATAR_AT.x, AVATAR_AT.y);
        drawAvatar(pen(ctx), avatar, { t, hat: opts.dressed, shirt: opts.dressed });
        ctx.restore();
      }
      for (const th of things) {
        if (th.x + th.hit[2] < cam - 60 || th.x + th.hit[0] > cam + W + 60) continue;
        if (th.z >= 3) drawThing(th, view);
      }
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

    // the few controls
    UI.coins(ctx, 340, 1 - clamp01(zk * 3));
    const inKitchen = clamp01((cam + W / 2 - (X.bedR + 12) + 120) / 240);
    if (nav !== 'doors' && zk < 0.3) {
      const a = 1 - clamp01(zk * 4);
      UI.arrowButton(ctx, W - 10 - ARROW.size, ARROW.y, ARROW.size, 1, a * (1 - clamp01(inKitchen * 2)), view.arrowPress === 1 ? 1 : 0);
      UI.arrowButton(ctx, 10, ARROW.y, ARROW.size, -1, a * clamp01(inKitchen * 2 - 1), view.arrowPress === -1 ? 1 : 0);
    }
    lastBubble = zk < 0.05 ? bubbleFor(view) : null;
    UI.arrowButton(ctx, BACK.x, BACK.y, BACK.size, -1, clamp01((zk - 0.5) * 2.5), view.backPress ? 1 : 0);
    if (view.finger) {
      const f = view.finger;
      UI.touchMark(ctx, f.x, f.y - 2, f.ring ?? 0);
      UI.hand(ctx, f.x, f.y, f.press || 0, f.alpha ?? 1);
    }
    return gv;
  }

  // what is under a point of the screen, for the live page
  function hit(x, y, view) {
    if ((view.globe || 0) > 0.5) {
      if (x >= BACK.x - 8 && x <= BACK.x + BACK.size + 8 && y >= BACK.y - 8 && y <= BACK.y + BACK.size + 8) return { type: 'back' };
      const name = globe.pick(x, y, { ...GLOBE, rot: view.rot || HOME_VIEW });
      return name ? { type: 'country', name } : { type: 'space' };
    }
    if (lastBubble) {
      const r = lastBubble.review, b = lastBubble.box;
      if (r && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return { type: 'review' };
      if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return { type: 'bubble' };
    }
    if (nav !== 'doors' && y >= ARROW.y - 10 && y <= ARROW.y + ARROW.size + 10) {
      const inK = view.cam + W / 2 > X.bedR + 12;
      if (!inK && x >= W - 20 - ARROW.size) return { type: 'go', room: 'kitchen' };
      if (inK && x <= 20 + ARROW.size) return { type: 'go', room: 'bed' };
    }
    const wx = x + view.cam;
    for (let i = things.length - 1; i >= 0; i--) {
      const th = things[i], [x0, y0, x1, y1] = th.hit;
      if (wx >= th.x + x0 && wx <= th.x + x1 && y >= th.y + y0 && y <= th.y + y1) return { type: 'thing', id: th.id, opens: th.opens };
    }
    if (nav !== 'arrows' && wx >= DOOR.leafL && wx <= X.kitL + 60 && y >= 290 && y <= V.front) {
      return { type: 'go', room: view.cam + W / 2 > X.bedR + 12 ? 'bed' : 'kitchen' };
    }
    return null;
  }

  return { render, hit, things, byId, globe };
}

// ---- one avatar by itself, for the avatar board: 414 x 414 ----
export function createAvatarCard(canvas, { dpr = 2 } = {}) {
  canvas.width = 414 * dpr; canvas.height = 414 * dpr;
  const ctx = canvas.getContext('2d');
  return {
    render({ t, id, hat = false, shirt = false }) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, 414);
      bg.addColorStop(0, '#222b72'); bg.addColorStop(0.72, '#2c388e'); bg.addColorStop(0.72, '#c58a5c'); bg.addColorStop(1, '#b57a4e');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 414, 414);
      for (let x = 10; x < 414; x += 38) { ctx.fillStyle = 'rgba(130,150,255,0.055)'; ctx.fillRect(x, 0, 19, 298); }
      ctx.fillStyle = '#262f80'; ctx.fillRect(0, 286, 414, 12);
      ctx.fillStyle = 'rgba(10,8,44,0.3)'; ctx.fillRect(0, 298, 414, 8);
      const g = pen(ctx);
      g.glow(207, 190, 190, 170, '#8fa4ff', 0.16);
      ctx.save(); ctx.translate(207, 356); ctx.scale(1.86, 1.86);
      drawAvatar(g, id, { t, hat, shirt });
      ctx.restore();
    },
  };
}
