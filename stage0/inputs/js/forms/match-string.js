// Match, as strings. Pull a string from a name to the map it belongs to; it hangs between them with a
// little sag and bounces when it catches. Strings that cross show a tangle at a glance. On Check the right
// strings go green, the wrong ones go pink and fade, and a gold string draws itself to the right map.
import { geoEquirectangular } from 'd3-geo';
import { C, E, Val, TAU, lerp, clamp01, rgba, font, rrect, chip } from '../kit.js';
import { storm, loadWorld, drawLand, drawSea } from '../art.js';

export const meta = {
  question: 'Each name is used in one ocean. <span class="key">Join them.</span>',
  revealMs: 1450,
};

const LEFT = [{ id: 'h', text: 'Hurricane', goes: 'atl' }, { id: 't', text: 'Typhoon', goes: 'nwp' }, { id: 'c', text: 'Cyclone', goes: 'ind' }];
const RIGHT = [
  { id: 'nwp', text: 'NW Pacific', box: [[95, -12], [185, 50]], basin: [[105, 5], [180, 5], [180, 35], [120, 35], [105, 25]] },
  { id: 'atl', text: 'North Atlantic', box: [[-105, -8], [-5, 52]], basin: [[-98, 8], [-15, 8], [-15, 40], [-75, 40], [-98, 28]] },
  { id: 'ind', text: 'Indian Ocean', box: [[30, -40], [120, 28]], basin: [[42, -30], [115, -30], [115, 20], [70, 22], [42, 10]] },
];

export async function mount(api) {
  const { w, h } = api;
  await loadWorld('110m');
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx;
  const ROW = 122, LW = 150, LH = 64, RW = 168, RH = 108, RX = w - RW;
  const y0 = Math.max(0, (h - ROW * 3) / 2 - 24);
  const rowMid = i => y0 + i * ROW + ROW / 2;
  const lKnob = i => [LW, rowMid(i)], rKnob = i => [RX, rowMid(i)];
  const lRect = i => ({ x: 0, y: rowMid(i) - LH / 2, w: LW, h: LH }), rRect = i => ({ x: RX, y: rowMid(i) - RH / 2, w: RW, h: RH });

  // the little maps, drawn once
  const maps = RIGHT.map(r => {
    const c = document.createElement('canvas'), k = cv.el.width / w;
    c.width = Math.round(RW * k); c.height = Math.round(RH * k);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    const proj = geoEquirectangular().rotate([-(r.box[0][0] + r.box[1][0]) / 2, 0]).fitExtent([[0, 0], [RW, RH]], { type: 'MultiPoint', coordinates: [r.box[0], r.box[1], [r.box[0][0], r.box[1][1]], [r.box[1][0], r.box[0][1]]] });
    drawSea(g, proj, RW, RH, { grid: 20 });
    g.fillStyle = '#3b4fc8';
    g.beginPath(); r.basin.forEach(([lo, la], i) => { const [x, y] = proj([lo, la]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath();
    g.save(); g.globalAlpha = 0.75; g.fill(); g.restore();
    drawLand(g, proj, { scale: 0.6, borderAlpha: 0 });
    return c;
  });

  const links = new Map();   // left index -> right index
  const born = new Map();    // left index -> when its string caught, for the bounce
  let drag = null, revealed = null, res = null, hoverR = -1, hoverL = -1;

  const inRect = (r, x, y, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
  const leftAt = (x, y, pad = 0) => LEFT.findIndex((_, i) => inRect(lRect(i), x, y, pad));
  const rightAt = (x, y, pad = 0) => RIGHT.findIndex((_, i) => inRect(rRect(i), x, y, pad));

  api.track(cv.el, {
    down: q => {
      if (api.locked) return false;
      const x = q.x - api.left, y = q.y - api.top;
      const l = leftAt(x, y, 6), r = rightAt(x, y, 6);
      if (l < 0 && r < 0) return false;
      if (l >= 0) { links.delete(l); drag = { from: 'l', i: l, x, y }; }
      else { for (const [k, v] of links) if (v === r) links.delete(k); drag = { from: 'r', i: r, x, y }; }
      api.tick();
      api.changed();
    },
    move: q => {
      if (!drag) return;
      drag.x = q.x - api.left; drag.y = q.y - api.top;
      const hr = drag.from === 'l' ? rightAt(drag.x, drag.y, 16) : -1, hl = drag.from === 'r' ? leftAt(drag.x, drag.y, 16) : -1;
      if (hr !== hoverR || hl !== hoverL) { hoverR = hr; hoverL = hl; if (hr >= 0 || hl >= 0) api.tick(); }
    },
    up: () => {
      if (!drag) return;
      const t = api.now();
      let l = -1, r = -1;
      if (drag.from === 'l') { l = drag.i; r = rightAt(drag.x, drag.y, 16); } else { r = drag.i; l = leftAt(drag.x, drag.y, 16); }
      if (l >= 0 && r >= 0) {
        for (const [k, v] of links) if (v === r || k === l) links.delete(k);
        links.set(l, r);
        born.set(l, t);
        api.tick();
      }
      drag = null; hoverR = hoverL = -1;
      api.changed();
    },
  });
  cv.el.style.touchAction = 'none';

  // a string from a to b, sagging a little, with a bounce after it catches
  function rope(a, b, { color = C.cyan, edge = C.cyanEdge, alpha = 1, bounce = 1, upto = 1 } = {}) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const sag = Math.min(34, len * 0.14) * (1 + 0.6 * bounce);
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2 + sag;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    const pts = [];
    const n = 32, m = Math.max(1, Math.round(n * upto));
    for (let i = 0; i <= m; i++) {
      const k = i / n;
      pts.push([(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * cx + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * cy + k * k * b[1]]);
    }
    for (const [col, lw, dy] of [[edge, 7, 2.5], [color, 6, 0]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy))); ctx.stroke();
    }
    ctx.restore();
  }
  const TONES = {
    idle: ['#1b2250', '#364090', '#2f3678'], on: ['#222a60', '#6fd6ff', '#1b8fd1'], right: ['#1d5f63', '#2bc4a4', '#127a85'], wrong: ['#5a2050', '#ee4b7a', '#8f1f44'],
  };
  function tile(r, tone) {
    const [fill, border, edge] = TONES[tone];
    const p = new Path2D(); rrect(p, r.x, r.y, r.w, r.h, 16);
    ctx.save(); ctx.translate(0, 4); ctx.fillStyle = edge; ctx.fill(p); ctx.restore();
    ctx.fillStyle = fill; ctx.fill(p);
    ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(p);
    return p;
  }
  function knob(x, y, on, color = C.cyan) {
    ctx.fillStyle = '#0f1434'; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = on ? color : '#5d66ad'; ctx.lineWidth = 3; ctx.stroke();
    if (on) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); }
  }

  function render(t) {
    cv.clear();
    const rk = revealed === null ? 0 : t - revealed;
    const markL = i => (revealed === null ? null : RIGHT[links.get(i)]?.id === LEFT[i].goes ? 'right' : 'wrong');
    // the names
    LEFT.forEach((l, i) => {
      const r = lRect(i);
      tile(r, markL(i) || (links.has(i) || hoverL === i || (drag && drag.from === 'l' && drag.i === i) ? 'on' : 'idle'));
      storm(ctx, r.x + 30, r.y + r.h / 2, 13, { angle: -t * 0.8 - i, shadow: false });
      ctx.fillStyle = '#ffffff'; ctx.font = font(16); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(l.text, r.x + 54, r.y + r.h / 2 + 1);
    });
    // the maps
    RIGHT.forEach((m, i) => {
      const r = rRect(i);
      const used = [...links.values()].includes(i);
      const p = tile(r, hoverR === i || used ? 'on' : 'idle');
      ctx.save(); ctx.clip(p); ctx.drawImage(maps[i], r.x, r.y, r.w, r.h); ctx.restore();
      ctx.strokeStyle = hoverR === i || used ? C.sky : C.line2; ctx.lineWidth = 2; ctx.stroke(p);
      chip(ctx, m.text, r.x + r.w / 2 + 6, r.y + r.h - 16, { kind: 'dark', size: 12.5, padX: 8, padY: 4 });
    });
    // the strings
    for (const [l, r] of links) {
      const b = clamp01((t - (born.get(l) ?? -9)) / 0.7);
      const bounce = Math.sin(b * Math.PI * 3) * (1 - b);
      const mk = markL(l);
      if (mk === 'wrong') rope(lKnob(l), rKnob(r), { color: C.pink, edge: C.pinkEdge, alpha: lerp(1, 0.3, clamp01((rk - 0.5) / 0.4)) });
      else rope(lKnob(l), rKnob(r), { bounce, color: mk === 'right' ? C.teal : C.cyan, edge: mk === 'right' ? C.tealEdge : C.cyanEdge });
    }
    if (drag) {
      const a = drag.from === 'l' ? lKnob(drag.i) : rKnob(drag.i);
      rope(a, [drag.x, drag.y], {});
    }
    // the right strings, drawing themselves in gold
    if (revealed !== null) {
      LEFT.forEach((l, i) => {
        if (markL(i) !== 'wrong') return;
        const want = RIGHT.findIndex(r => r.id === l.goes);
        const k = E.inOut(clamp01((rk - 0.55) / 0.45));
        if (k > 0) rope(lKnob(i), rKnob(want), { color: C.gold, edge: C.goldEdge, upto: k });
      });
    }
    LEFT.forEach((_, i) => knob(...lKnob(i), links.has(i) || (drag && drag.from === 'l' && drag.i === i), markL(i) === 'right' ? C.teal : markL(i) === 'wrong' ? C.gold : C.cyan));
    RIGHT.forEach((_, i) => knob(...rKnob(i), [...links.values()].includes(i) || (drag && drag.from === 'r' && drag.i === i)));
  }

  return {
    render,
    answered: () => links.size === LEFT.length,
    check() {
      const n = LEFT.filter((l, i) => RIGHT[links.get(i)]?.id === l.goes).length;
      const kind = n === LEFT.length ? 'right' : 'wrong';
      const why = kind === 'right' ? 'Yes. All three are the same kind of storm, named for the ocean they form over.'
        : 'Same storm, three names: typhoons in the northwest Pacific, cyclones in the Indian Ocean.';
      res = { kind, why };
      return res;
    },
    reveal(t) { revealed = t; },
    reset() { links.clear(); born.clear(); drag = null; revealed = null; res = null; hoverR = hoverL = -1; },
    ghost(attempt, G) {
      const plan = attempt === 'wrong' ? [1, 2, 0] : [1, 0, 2];   // left i -> right row
      const steps = [];
      plan.forEach((r, i) => {
        const [lx, ly] = lKnob(i), [rx, ry] = rKnob(r);
        steps.push(...G.drag(G.pt(lx - 40, ly), G.pt(rx + 40, ry + 8), attempt === 'wrong' ? { ms: 300, hold: 35, after: 35 } : { ms: 250, hold: 30, after: 30, moveMs: 230 }));
      });
      return steps;
    },
  };
}
