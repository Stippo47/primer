// Spot, as a loop. Draw around the place with your finger; the loop closes itself when you let go, and
// drawing again replaces it. Good for answers that are an area, not a point. On Check a season's storms
// start one by one where they really began, lit up inside your loop and dim outside it, and drift off
// along their tracks; a count says how many your loop caught.
import { geoEquirectangular } from 'd3-geo';
import { C, E, Val, TAU, lerp, clamp01, rgba, font, chip, rrect, outliner } from '../kit.js';
import { storm, loadWorld, drawLand, drawSea } from '../art.js';

export const meta = {
  question: 'Draw a loop around where most <span class="key">Atlantic hurricanes</span> start.',
  revealMs: 1900,
};

// Where the storms of one made-up but typical season began: most far out between Africa and the
// Caribbean, a few in the Gulf and off the American coast.
const BIRTHS = [[-24, 12], [-31, 10.5], [-37, 13], [-44, 11.5], [-50, 14], [-56, 15.5], [-41, 16.5], [-29, 15], [-62, 12.5],
  [-76, 14], [-81, 17], [-90, 25], [-94, 21.5], [-73, 31]];
const ZONE = [[-88, 9], [-60, 7], [-35, 6.5], [-16, 9], [-17, 19], [-40, 21], [-62, 20], [-86, 22]];   // the main birthplace

export async function mount(api) {
  const { w, h } = api;
  await loadWorld('50m');
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx, outline = outliner(cv);
  const MH = Math.min(h - 70, 318);   // the map is as wide as the screen and only as tall as the tropics need
  const proj = geoEquirectangular().rotate([50, 0]).fitWidth(w, { type: 'MultiPoint', coordinates: [[-99, 20], [-1, 20]] });
  const [, cy0] = proj([-50, 21]);
  proj.translate([proj.translate()[0], proj.translate()[1] + (MH * 0.5 - cy0)]);
  const P = ll => proj(ll);
  const births = BIRTHS.map(P);
  const zone = (() => { const p = new Path2D(); ZONE.map(P).forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; })();
  // the map, drawn once
  const base = document.createElement('canvas');
  base.width = cv.el.width; base.height = cv.el.height;
  { const g = base.getContext('2d'), k = cv.el.width / w; g.setTransform(k, 0, 0, k, 0, 0); drawSea(g, proj, w, MH, { grid: 10 }); drawLand(g, proj, { scale: 0.9 }); }

  let pts = [], drawing = false, loop = null, revealed = null, res = null, closedAt = -9;
  const inLoop = (x, y) => { if (!loop) return false; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const r = ctx.isPointInPath(loop, x, y); ctx.restore(); return r; };
  const area = list => { let a = 0; for (let i = 0; i < list.length; i++) { const [x1, y1] = list[i], [x2, y2] = list[(i + 1) % list.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); };

  api.track(cv.el, {
    down: q => {
      if (api.locked) return false;
      drawing = true;
      pts = [[q.x - api.left, q.y - api.top]];
      api.tick();
    },
    move: q => {
      if (!drawing) return;
      const p = [q.x - api.left, q.y - api.top], l = pts[pts.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 3) pts.push(p);
    },
    up: () => {
      if (!drawing) return;
      drawing = false;
      if (pts.length > 8 && area(pts) > 400) {
        loop = new Path2D(); pts.forEach(([x, y], i) => (i ? loop.lineTo(x, y) : loop.moveTo(x, y))); loop.closePath();
        closedAt = api.now();
        api.tick();
      } else if (!loop) pts = [];
      api.changed();
    },
  });
  cv.el.style.touchAction = 'none';

  const caught = () => births.filter(([x, y]) => inLoop(x, y)).length;

  function render(t) {
    cv.clear();
    const rk = revealed === null ? 0 : t - revealed;
    const frame = new Path2D(); rrect(frame, 1, 1, w - 2, MH - 2, 24);
    ctx.fillStyle = C.line; ctx.save(); ctx.translate(0, 4); ctx.fill(frame); ctx.restore();
    ctx.save(); ctx.clip(frame);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0); ctx.restore();
    ctx.fillStyle = rgba('#0e1436', 0.55); ctx.font = font(11.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [name, ll] of [['AFRICA', [-9, 19]], ['NORTH AMERICA', [-85, 45]], ['SOUTH AMERICA', [-58, -4]]]) { const [x, y] = P(ll); ctx.fillText(name, x, y); }

    // the truth's zone, in gold, once it's shown
    const kind = res ? res.kind : null;
    if (revealed !== null && kind !== 'right') outline(ctx, zone, { stroke: C.gold, width: 3, fill: rgba(C.gold, 0.16), alpha: clamp01((rk - 1.0) / 0.4) });

    // your loop
    const col = kind === 'right' ? C.teal : kind === 'wrong' ? C.pink : kind === 'close' ? C.gold : C.cyan;
    if (loop && !drawing) {
      const s = E.spring(clamp01((t - closedAt) / 0.4), 0.425);
      ctx.save(); ctx.globalAlpha = 0.22 * s; ctx.fillStyle = col; ctx.fill(loop); ctx.restore();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = rgba('#0e1436', 0.6); ctx.lineWidth = 7; ctx.stroke(loop);
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke(loop);
    }
    if (drawing && pts.length > 1) {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const [c, lw] of [[rgba('#0e1436', 0.6), 7], [C.cyan, 4]]) {
        ctx.strokeStyle = c; ctx.lineWidth = lw;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
      const [lx, ly] = pts[pts.length - 1];
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, TAU); ctx.fill();
    }
    // a little sign of what to do, while there's no loop yet: a loop with an arrow
    if (!loop && !drawing && revealed === null) {
      const p = new Path2D(); rrect(p, 12, 12, 40, 40, 13);
      ctx.fillStyle = rgba('#0f1434', 0.8); ctx.fill(p);
      ctx.strokeStyle = C.sky; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const a0 = 0.6 + Math.sin(t * 2) * 0.15;
      ctx.beginPath(); ctx.ellipse(32, 32, 11, 8, -0.3, a0, a0 + 5.2); ctx.stroke();
      const ex = 32 + Math.cos(a0 + 5.2) * 11, ey = 32 + Math.sin(a0 + 5.2) * 8;
      ctx.fillStyle = C.sky; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, TAU); ctx.fill();
    }

    // the season's storms, starting one by one and drifting off west and north
    if (revealed !== null) {
      births.forEach(([x, y], i) => {
        const t0 = 0.15 + i * 0.055, k = clamp01((rk - t0) / 0.3);
        if (k <= 0) return;
        const inside = inLoop(x, y);
        const go = E.inOut(clamp01((rk - t0 - 0.3) / 1.3));
        const [lo, la] = BIRTHS[i];
        const track = s => P([lo - 14 * s - (la > 24 ? -6 * s : 0), la + 4 * s + 7 * s * s]);
        ctx.fillStyle = rgba(inside ? '#ffffff' : '#c9d4ff', inside ? 0.8 : 0.45);
        for (let j = 1; j <= 6; j++) { const s = go * j / 6; if (s <= 0.02) continue; const [tx, ty] = track(s - go / 6); ctx.beginPath(); ctx.arc(tx, ty, 1.6, 0, TAU); ctx.fill(); }
        const [qx, qy] = track(go);
        storm(ctx, qx, qy, 8 * E.spring(k, 0.425), { angle: -t * 1.2 - i, shadow: false, alpha: inside ? 1 : 0.5 });
        if (inside) { ctx.strokeStyle = rgba(col, k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke(); }
      });
    }
    ctx.restore();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke(frame);
    if (revealed !== null) {
      const s = E.spring(clamp01((rk - 1.0) / 0.45), 0.425);
      chip(ctx, `Your loop caught ${res.caught} of ${BIRTHS.length} storms`, w / 2, MH + 34, { kind: kind === 'right' ? 'teal' : kind === 'close' ? 'gold' : 'pink', size: 16, padX: 14, padY: 8, scale: s });
    }
  }

  return {
    render,
    answered: () => !!loop,
    check() {
      const n = caught(), big = area(pts) > w * MH * 0.45;
      const kind = big ? 'wrong' : n >= 9 ? 'right' : n >= 6 ? 'close' : 'wrong';
      const why = big ? 'Too wide: that\'s most of the ocean. Most start in a band from Africa to the Caribbean.'
        : kind === 'right' ? 'Yes. Most start as storms drifting off Africa, then grow over the warm sea heading west.'
        : kind === 'close' ? 'Close. Most start further out, in a band from Africa to the Caribbean.'
        : 'Most start far out, off Africa, and drift west. The Gulf is where many of them end up.';
      res = { kind, why, caught: n };
      return res;
    },
    reveal(t) { revealed = t; },
    reset() { pts = []; loop = null; drawing = false; revealed = null; res = null; closedAt = -9; },
    ghost(attempt, G) {
      const [c, rx, ry, tilt] = attempt === 'wrong' ? [[-85, 25.5], 11, 8, 0] : [[-49, 13.5], 36, 9.5, -0.05];
      const at = k => {
        const a = Math.PI * 0.5 + k * TAU * 1.04;          // from the bottom of the loop, all the way around
        const [x, y] = P([c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry + Math.cos(a) * rx * tilt]);
        return G.pt(x + Math.sin(k * 17) * 2, y)();
      };
      return [{ move: () => at(0) }, { down: true }, { wait: 50 }, { drag: k => at(k), ms: attempt === 'wrong' ? 750 : 900, ease: 'linear' }, { wait: 40 }, { up: true }];
    },
  };
}
