// Spot, as regions. The picture is cut into parts; the part under your finger lights up and says its
// name as you slide over it, and the one you let go on stays chosen. Words show only on touch. On Check
// the air starts to move in every part, so you see what really happens in the part you chose.
import { C, E, Val, TAU, lerp, clamp01, rgba, font, chip, rrect, disc, outliner } from '../kit.js';

export const meta = {
  question: 'A hurricane, cut in half. Where does the air <span class="key">rise fastest</span>?',
  revealMs: 1750,
};

export function mount(api) {
  const { w, h } = api;
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx, outline = outliner(cv);
  const cx = w / 2, seaY = h - 62, topY = 70;
  const span = seaY - topY;
  const up = y => clamp01((seaY - y) / span);                      // 0 at the sea, 1 at the top
  const eyeHalf = y => lerp(16, 46, Math.pow(up(y), 1.3));        // the eye widens upward, like a stadium
  const wallHalf = y => lerp(70, 104, Math.pow(up(y), 1.4));
  const BANDS = [{ x: 140, hw: 20, top: seaY - 168 }, { x: 176, hw: 13, top: seaY - 108 }];

  // every shape is wound the same way round, so overlapping pieces join instead of cutting holes
  const poly = pts => {
    let area = 0;
    for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; area += x1 * y2 - x2 * y1; }
    if (area < 0) pts = pts.slice().reverse();
    const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p;
  };
  const N = 18;
  const side = (f, s, y0, y1) => Array.from({ length: N + 1 }, (_, i) => { const y = lerp(y0, y1, i / N); return [cx + s * f(y), y]; });
  const anvBot = topY + 26;
  const eye = poly([...side(eyeHalf, -1, seaY, topY - 30), ...side(eyeHalf, 1, topY - 30, seaY)]);
  // the eyewall: a tower each side of the eye, lumpy on the outside
  const wall = new Path2D(), wallLumps = new Path2D();
  for (const s of [-1, 1]) {
    wall.addPath(poly([...side(eyeHalf, s, seaY - 2, anvBot), ...side(wallHalf, s, anvBot, seaY - 2)]));
    for (let i = 0; i < 7; i++) {
      const y = lerp(seaY - 34, anvBot + 26, i / 6), r = 14 + (i % 2) * 5 + i * 0.8;
      disc(wallLumps, cx + s * (wallHalf(y) - r * 0.45), y, r);
    }
  }
  wall.addPath(wallLumps);
  // the cloud top: flat, spreading out each way, scalloped underneath
  const top = new Path2D();
  for (const s of [-1, 1]) {
    const out = 190;
    top.addPath(poly([[cx + s * eyeHalf(anvBot), anvBot], [cx + s * eyeHalf(topY - 22), topY - 22], [cx + s * 120, topY - 14], [cx + s * out, topY - 2],
      [cx + s * out, topY + 14], [cx + s * 120, topY + 22], [cx + s * wallHalf(anvBot), anvBot + 2]]));
    for (let i = 0; i < 6; i++) disc(top, cx + s * lerp(wallHalf(anvBot) + 6, out - 6, i / 5), lerp(topY + 20, topY + 13, i / 5), 9 - i * 0.5);
  }
  // the rain bands: smaller towers further out, with cauliflower tops
  const bands = new Path2D();
  for (const s of [-1, 1]) for (const b of BANDS) {
    const x = cx + s * b.x, p = new Path2D();
    rrect(p, x - b.hw, b.top + b.hw * 0.6, b.hw * 2, seaY - b.top - b.hw * 0.6 - 22, b.hw * 0.5);
    disc(p, x, b.top + b.hw * 0.75, b.hw * 0.85);
    disc(p, x - b.hw * 0.62, b.top + b.hw * 1.15, b.hw * 0.62);
    disc(p, x + b.hw * 0.62, b.top + b.hw * 1.05, b.hw * 0.66);
    bands.addPath(p);
  }
  const low = new Path2D();
  for (const s of [-1, 1]) low.addPath(poly([[cx + s * (wallHalf(seaY) + 4), seaY - 24], [cx + s * 190, seaY - 24], [cx + s * 190, seaY], [cx + s * (wallHalf(seaY) + 4), seaY]]));
  const PARTS = [
    { id: 'eye', name: 'Eye', path: eye, at: [cx, seaY - span * 0.55] },
    { id: 'wall', name: 'Eyewall', path: wall, at: [cx - 74, seaY - span * 0.5] },
    { id: 'top', name: 'Cloud top', path: top, at: [cx - 132, topY + 4] },
    { id: 'bands', name: 'Rain bands', path: bands, at: [cx - 140, seaY - 128] },
    { id: 'low', name: 'Near the sea', path: low, at: [cx - 136, seaY - 12] },
  ];
  const TRUTH = 'wall';

  let over = null, chosen = null, revealed = null, res = null, touching = false;
  const lit = Object.fromEntries(PARTS.map(p => [p.id, new Val(0)]));
  const partAt = (x, y) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const p = PARTS.find(q => ctx.isPointInPath(q.path, x, y)); ctx.restore(); return p ? p.id : null; };
  const light = (id, t) => {
    if (id === over) return;
    if (over && over !== chosen) lit[over].to(0, { t, ms: 180, kind: 'out' });
    over = id;
    if (id) { lit[id].to(1, { t, ms: 200, kind: 'out' }); api.tick(); }
  };
  api.track(cv.el, {
    down: q => { if (api.locked) return false; touching = true; light(partAt(q.x - api.left, q.y - api.top), api.now()); },
    move: q => light(partAt(q.x - api.left, q.y - api.top), api.now()),
    up: () => {
      const t = api.now();
      touching = false;
      if (over) {
        if (chosen && chosen !== over) lit[chosen].to(0, { t, ms: 200, kind: 'out' });
        chosen = over;
      }
      over = null;
      api.changed();
    },
  });
  cv.el.style.touchAction = 'none';

  // the air, once it's shown: little chevrons running along each flow
  const FLOWS = [];
  for (const s of [-1, 1]) {
    FLOWS.push({ id: 'low', pts: [[cx + s * 188, seaY - 12], [cx + s * 74, seaY - 12]], speed: 0.6, size: 5, col: '#c9d4ff' });
    FLOWS.push({ id: 'wall', pts: [[cx + s * 44, seaY - 16], [cx + s * 74, topY + 34]], speed: 1.25, size: 8, col: C.gold });
    FLOWS.push({ id: 'top', pts: [[cx + s * 84, topY + 2], [cx + s * 184, topY + 6]], speed: 0.6, size: 5, col: C.cyanEdge });
    for (const b of BANDS) FLOWS.push({ id: 'bands', pts: [[cx + s * b.x, seaY - 30], [cx + s * b.x, b.top + 18]], speed: 0.45, size: 5, col: C.cyanEdge });
  }
  FLOWS.push({ id: 'eye', pts: [[cx, topY - 10], [cx, seaY - 30]], speed: 0.16, size: 5, col: '#8f98dc' });
  function flow(f, t, alpha) {
    const [[x0, y0], [x1, y1]] = f.pts, len = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / len, dy = (y1 - y0) / len;
    const n = Math.max(2, Math.round(len / 34));
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = f.col; ctx.lineWidth = f.size > 6 ? 4 : 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const u = ((i / n + t * f.speed * 120 / len) % 1);
      const x = x0 + dx * len * u, y = y0 + dy * len * u, a = Math.sin(u * Math.PI);
      ctx.globalAlpha = alpha * Math.min(1, a * 2.2);
      const s = f.size;
      ctx.beginPath(); ctx.moveTo(x - dx * s - dy * s, y - dy * s + dx * s); ctx.lineTo(x, y); ctx.lineTo(x - dx * s + dy * s, y - dy * s - dx * s); ctx.stroke();
    }
    ctx.restore();
  }

  function render(t) {
    cv.clear();
    const rk = revealed === null ? 0 : t - revealed;
    const frame = new Path2D(); rrect(frame, 1, 1, w - 2, h - 6, 24);
    ctx.fillStyle = C.line; ctx.save(); ctx.translate(0, 4); ctx.fill(frame); ctx.restore();
    ctx.save(); ctx.clip(frame);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.stage0); g.addColorStop(1, '#2a1f66');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // the sea
    ctx.fillStyle = C.sea;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, seaY + Math.sin(x * 0.08 + t * 1.6) * 2.5);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    // rain under the bands and the wall
    ctx.strokeStyle = rgba('#aebfff', 0.4); ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) for (const [x0, x1] of [[eyeHalf(seaY) + 6, wallHalf(seaY) - 4], ...BANDS.map(b => [b.x - b.hw + 4, b.x + b.hw - 4])]) {
      for (let x = x0; x < x1; x += 7) { const y = seaY - 26 + ((x * 13 + t * 90) % 20); ctx.beginPath(); ctx.moveTo(cx + s * x, y); ctx.lineTo(cx + s * x - 3, y + 7); ctx.stroke(); }
    }
    // the clouds: the bands, the wall, and the flat top spreading out, each shaded on its own far side
    const cloud = (p, shadeFrom) => {
      ctx.save(); ctx.translate(0, 4); ctx.fillStyle = C.cloudShade; ctx.fill(p); ctx.restore();
      ctx.fillStyle = '#ffffff'; ctx.fill(p);
      ctx.save(); ctx.clip(p); ctx.fillStyle = rgba('#c9d4ff', 0.6);
      for (const x of shadeFrom) ctx.fillRect(x, 0, 26, h);
      ctx.restore();
    };
    cloud(bands, [-1, 1].flatMap(s => BANDS.map(b => cx + s * b.x + b.hw * 0.25)));
    cloud(wall, [cx - eyeHalf(seaY) - 24, cx + wallHalf(seaY) - 22]);
    cloud(top, []);
    // the eye: clear sky down to the sea
    const eg = ctx.createLinearGradient(0, topY, 0, seaY);
    eg.addColorStop(0, '#10153e'); eg.addColorStop(1, '#232a6e');
    ctx.fillStyle = eg; ctx.fill(eye);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = rgba('#d6e2ff', 0.6); ctx.beginPath(); ctx.arc(cx + Math.sin(i * 2.4) * 10, topY + 10 + i * 34, 1.2, 0, TAU); ctx.fill(); }

    // what's lit, what's chosen
    for (const p of PARTS) {
      const v = lit[p.id].at(t);
      let col = C.cyan;
      if (revealed !== null && p.id === chosen) col = p.id === TRUTH ? C.teal : C.pink;
      if (v > 0.01) outline(ctx, p.path, { stroke: col, width: 3, fill: rgba(col, 0.4), alpha: v });
    }
    if (revealed !== null && chosen !== TRUTH) outline(ctx, wall, { stroke: C.gold, width: 3.5, fill: rgba(C.gold, 0.28), alpha: clamp01((rk - 0.55) / 0.3) });
    // the air moving
    if (revealed !== null) {
      const a = clamp01((rk - 0.1) / 0.4);
      for (const f of FLOWS) flow(f, t, a);
    }
    ctx.restore();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke(frame);

    // the name of the part under the finger, or the one chosen
    const named = over || (revealed === null ? chosen : null);
    if (named) {
      const p = PARTS.find(q => q.id === named);
      chip(ctx, p.name, p.at[0], p.at[1], { size: 15, kind: touching ? 'cyan' : 'plain', scale: E.spring(clamp01((t - lit[named].s) / 0.35), 0.425) });
    }
    if (revealed !== null) {
      const s = E.spring(clamp01((rk - 0.5) / 0.45), 0.425);
      const yours = PARTS.find(q => q.id === chosen);
      if (chosen !== TRUTH) {
        chip(ctx, `${yours.name}: ${chosen === 'eye' ? 'sinking' : chosen === 'low' ? 'flowing in' : chosen === 'top' ? 'flowing out' : 'rising slowly'}`, chosen === 'eye' ? cx : yours.at[0] + 40, chosen === 'eye' ? seaY - span * 0.3 : yours.at[1], { kind: 'pink', size: 14, scale: s });
      }
      chip(ctx, 'Eyewall: rising fast', cx + 98, seaY - span * 0.66, { kind: chosen === TRUTH ? 'teal' : 'gold', size: 14, scale: E.spring(clamp01((rk - 0.75) / 0.45), 0.425) });
    }
  }

  return {
    render,
    answered: () => !!chosen,
    check() {
      const kind = chosen === TRUTH ? 'right' : 'wrong';
      const why = kind === 'right' ? 'Yes. Warm, wet air shoots up the wall of cloud around the eye.'
        : chosen === 'eye' ? 'In the eye the air sinks, which is why it\'s calm and clear. It rises fastest in the eyewall.'
        : 'It rises fastest in the eyewall, the ring of tall cloud around the eye.';
      res = { kind, why };
      return res;
    },
    reveal(t) { revealed = t; },
    reset(t) { over = null; chosen = null; revealed = null; res = null; touching = false; for (const v of Object.values(lit)) v.set(0); },
    ghost(attempt, G) {
      if (attempt === 'wrong') {   // slide in from the rain bands, across the wall, and let go in the eye
        return G.drag(G.pt(cx - 132, seaY - 100), null, { ms: 900, hold: 160, path: k => { const p = G.pt(lerp(cx - 132, cx + 2, k), lerp(seaY - 100, seaY - span * 0.55, k))(); return p; } });
      }
      return [...G.drag(G.pt(cx + 8, seaY - span * 0.45), null, { ms: 420, hold: 120, path: k => G.pt(lerp(cx + 8, cx + 64, k), seaY - span * 0.45)() })];
    },
  };
}
