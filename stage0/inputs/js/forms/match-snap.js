// Match, as jigsaw pieces. Each thing on the left is a card with a socket in its right edge; each answer
// is a piece with a plug. Drag a piece onto a card and it clicks in, the two joined as one. On Check the
// right pairs go green, and the wrong pieces pop out and fly to where they belong.
import { C, E, Val, TAU, lerp, clamp01, rgba, font, rrect, disc } from '../kit.js';

export const meta = {
  question: 'Which <span class="key">instrument</span> measures what?',
  revealMs: 1350,
};

const CARDS = [{ id: 'baro', text: 'Barometer' }, { id: 'anemo', text: 'Anemometer' }, { id: 'vane', text: 'Wind vane' }];
const PIECES = [{ id: 'dir', text: 'Wind direction', goes: 'vane' }, { id: 'pres', text: 'Air pressure', goes: 'baro' }, { id: 'speed', text: 'Wind speed', goes: 'anemo' }];

export function mount(api) {
  const { w, h } = api;
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx;
  const ROW = 78, GAP = 10, CW = 196, PW = w - CW - 6, PH = 62, KNOB = 11;
  const rowY = i => i * (ROW + GAP);
  const dockAt = i => ({ x: CW + 4, y: rowY(i) + (ROW - PH) / 2 });
  const trayTop = 3 * (ROW + GAP) + 18;
  const homeAt = j => ({ x: (w - PW) / 2 + KNOB / 2, y: trayTop + j * (PH + 8) });

  const pieces = PIECES.map((p, j) => ({ ...p, j, at: null, x: new Val(homeAt(j).x), y: new Val(homeAt(j).y), lift: new Val(0), held: false, fly: null }));
  // a wrong piece on Check: pink a moment, up, across, down into its own place
  const flyLift = k => (k < 0.3 ? 0 : k < 0.45 ? E.out((k - 0.3) / 0.15) : k < 0.95 ? 1 : 1 - E.inOut(clamp01((k - 0.95) / 0.25)));
  let drag = null, revealed = null, res = null, hover = -1;

  const pieceAt = (x, y) => [...pieces].reverse().find(p => x >= p.x.at() - KNOB && x <= p.x.at() + PW && y >= p.y.at() && y <= p.y.at() + PH);
  const slotNear = p => {
    const px = p.x.at(), py = p.y.at() + PH / 2;
    let best = -1, bd = 1e9;
    CARDS.forEach((c, i) => { const d = Math.hypot(px - dockAt(i).x, py - (rowY(i) + ROW / 2)); if (d < bd) { bd = d; best = i; } });
    return bd < 80 ? best : -1;
  };
  const sendHome = (p, t) => { p.at = null; p.x.to(homeAt(p.j).x, { t }); p.y.to(homeAt(p.j).y, { t }); };
  const dock = (p, i, t) => {
    const other = pieces.find(q => q !== p && q.at === i);
    if (other) sendHome(other, t);
    p.at = i;
    p.x.to(dockAt(i).x, { t, ms: 420 }); p.y.to(dockAt(i).y, { t, ms: 420 });
  };

  api.track(cv.el, {
    down: q => {
      if (api.locked) return false;
      const x = q.x - api.left, y = q.y - api.top, p = pieceAt(x, y);
      if (!p) return false;
      drag = { p, ox: x - p.x.at(), oy: y - p.y.at() };
      p.held = true;
      p.lift.to(1, { ms: 160, kind: 'out' });
      api.tick();
    },
    move: q => {
      if (!drag) return;
      const x = q.x - api.left, y = q.y - api.top;
      drag.p.x.set(x - drag.ox); drag.p.y.set(y - drag.oy);
      const s = slotNear(drag.p);
      if (s !== hover) { hover = s; if (s >= 0) api.tick(); }
    },
    up: () => {
      if (!drag) return;
      const p = drag.p, t = api.now();
      drag = null; p.held = false; hover = -1;
      p.lift.to(0, { t, ms: 300 });
      const s = slotNear(p);
      if (s >= 0) { dock(p, s, t); api.tick(); } else sendHome(p, t);
      api.changed();
    },
  });
  cv.el.style.touchAction = 'none';

  // ---- the drawings on the cards
  function icon(id, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'baro') {          // a round gauge with a needle
      ctx.fillStyle = '#b9c2ee'; ctx.beginPath(); ctx.arc(0, 2.5, 23, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 23, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      for (let a = -210; a <= 30; a += 30) { const r = a * Math.PI / 180; ctx.beginPath(); ctx.moveTo(Math.cos(r) * 15, Math.sin(r) * 15); ctx.lineTo(Math.cos(r) * 19, Math.sin(r) * 19); ctx.stroke(); }
      const n = -1.2 + Math.sin(t * 0.8) * 0.08;
      ctx.strokeStyle = C.pink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(n) * 16, Math.sin(n) * 16); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
    } else if (id === 'anemo') {  // cups spinning on a pole
      ctx.strokeStyle = '#dde4ff'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, -6); ctx.stroke();
      const spin = t * 5;
      const cups = [0, 1, 2].map(k => { const a = spin + k * TAU / 3; return { x: Math.cos(a) * 20, z: Math.sin(a), a }; }).sort((p, q) => p.z - q.z);
      for (const c of cups) {
        ctx.strokeStyle = '#dde4ff'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(c.x, -8 + c.z * 4); ctx.stroke();
        const facing = Math.cos(c.a + Math.PI / 2);
        ctx.fillStyle = facing > 0 ? C.cyan : C.cyanEdge;
        ctx.beginPath(); ctx.ellipse(c.x, -8 + c.z * 4, 6.5, 6.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = facing > 0 ? '#0e3a5a' : C.cyan;
        ctx.beginPath(); ctx.ellipse(c.x + facing * 1.5, -8 + c.z * 4, 3.5 * Math.abs(facing) + 0.8, 4.5, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#dde4ff'; ctx.beginPath(); ctx.arc(0, -8, 3.5, 0, TAU); ctx.fill();
    } else {                      // an arrow on a pole, swinging into the wind
      ctx.strokeStyle = '#dde4ff'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, -4); ctx.stroke();
      const sw = Math.sin(t * 1.3) * 0.18;
      ctx.save(); ctx.translate(0, -6); ctx.scale(Math.cos(sw), 1);
      ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(13, -8); ctx.lineTo(13, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-16, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-24, -9); ctx.lineTo(-24, 9); ctx.closePath(); ctx.fillStyle = C.goldEdge; ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#dde4ff'; ctx.beginPath(); ctx.arc(0, -6, 3.5, 0, TAU); ctx.fill();
      ctx.fillStyle = C.muted; ctx.font = font(9); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('N', 0, -27);
    }
    ctx.restore();
  }

  // a card: a rounded block with a round socket cut into its right edge
  function cardPath(x, y, cw, ch) {
    const p = new Path2D(), r = 16, my = y + ch / 2, s = KNOB + 2;
    p.moveTo(x + r, y); p.lineTo(x + cw - r, y); p.arc(x + cw - r, y + r, r, -Math.PI / 2, 0);
    p.lineTo(x + cw, my - s); p.arc(x + cw, my, s, -Math.PI / 2, Math.PI / 2, true);
    p.lineTo(x + cw, y + ch - r); p.arc(x + cw - r, y + ch - r, r, 0, Math.PI / 2);
    p.lineTo(x + r, y + ch); p.arc(x + r, y + ch - r, r, Math.PI / 2, Math.PI);
    p.lineTo(x, y + r); p.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5); p.closePath();
    return p;
  }
  // a piece: a rounded block with a round plug on its left edge
  function piecePath(x, y) {
    const p = new Path2D(), r = 16, my = y + PH / 2;
    p.moveTo(x + r, y); p.lineTo(x + PW - r, y); p.arc(x + PW - r, y + r, r, -Math.PI / 2, 0);
    p.lineTo(x + PW, y + PH - r); p.arc(x + PW - r, y + PH - r, r, 0, Math.PI / 2);
    p.lineTo(x + r, y + PH); p.arc(x + r, y + PH - r, r, Math.PI / 2, Math.PI);
    p.lineTo(x, my + KNOB); p.arc(x, my, KNOB, Math.PI / 2, Math.PI * 1.5);
    p.lineTo(x, y + r); p.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5); p.closePath();
    return p;
  }
  const TONES = {
    idle: ['#1b2250', '#364090', '#2f3678'], on: ['#222a60', '#6fd6ff', '#1b8fd1'], right: ['#1d5f63', '#2bc4a4', '#127a85'],
    wrong: ['#5a2050', '#ee4b7a', '#8f1f44'], gold: ['#3a3150', '#ffc83d', '#c98a00'],
  };
  function block(path, tone, depth = 4) {
    const [fill, border, edge] = TONES[tone];
    ctx.save(); ctx.translate(0, depth); ctx.fillStyle = edge; ctx.fill(path); ctx.restore();
    ctx.fillStyle = fill; ctx.fill(path);
    ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(path);
  }

  function render(t) {
    cv.clear();
    const rk = revealed === null ? 0 : t - revealed;
    // each card, and the empty bay beside it
    CARDS.forEach((c, i) => {
      const y = rowY(i), d = dockAt(i);
      const bay = new Path2D(); rrect(bay, d.x, d.y, PW, PH, 16);
      ctx.fillStyle = '#0f1434'; ctx.fill(bay);
      ctx.strokeStyle = hover === i ? C.sky : '#262d60'; ctx.lineWidth = 2; ctx.stroke(bay);
      const docked = pieces.find(p => p.at === i && !p.held);
      let tone = docked ? 'on' : 'idle';
      if (revealed !== null && res.marks) tone = res.marks[i] ? 'right' : 'wrong';
      if (hover === i) tone = 'on';
      block(cardPath(0, y, CW, ROW), tone);
      icon(c.id, 36, y + ROW / 2 - 2, t);
      ctx.fillStyle = '#ffffff'; ctx.font = font(15.5); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(c.text, 70, y + ROW / 2);
    });
    // the pieces: resting ones first, the one in the hand last
    const order = [...pieces].sort((a, b) => (a.held - b.held) || ((a.fly !== null) - (b.fly !== null)) || (a.lift.at(t) - b.lift.at(t)));
    for (const p of order) {
      const x = p.x.at(t), y = p.y.at(t), l = p.fly !== null ? flyLift(t - p.fly) : p.lift.at(t);
      let tone = p.held ? 'on' : p.at !== null ? 'on' : 'idle';
      if (revealed !== null) tone = p.fly === null ? 'right' : t - p.fly < 0.9 ? 'wrong' : 'gold';
      ctx.save();
      ctx.translate(x + PW / 2, y + PH / 2); ctx.rotate(l * -0.03); ctx.scale(1 + l * 0.04, 1 + l * 0.04); ctx.translate(-(x + PW / 2), -(y + PH / 2));
      if (l > 0.01) { ctx.fillStyle = rgba(C.shadow, 0.35 * l); ctx.save(); ctx.translate(4 * l, 12 * l); ctx.fill(piecePath(x, y)); ctx.restore(); }
      block(piecePath(x, y), tone, 4 * (1 - l));
      ctx.fillStyle = '#ffffff'; ctx.font = font(15.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.text, x + PW / 2 + 4, y + PH / 2);
      ctx.restore();
    }
  }

  return {
    render,
    answered: () => pieces.every(p => p.at !== null),
    check() {
      const marks = CARDS.map((c, i) => { const p = pieces.find(q => q.at === i); return !!p && p.goes === c.id; });
      const n = marks.filter(Boolean).length;
      const kind = n === CARDS.length ? 'right' : 'wrong';
      const why = kind === 'right' ? 'Yes. The cups spin faster the harder it blows; the vane turns to face the wind.'
        : 'An anemometer\'s cups spin to give the wind\'s speed; the vane points to where it comes from.';
      res = { kind, why, marks };
      return res;
    },
    reveal(t) {
      revealed = t;
      // the wrong pieces lift out, then fly to where they belong
      pieces.forEach(p => {
        const want = CARDS.findIndex(c => c.id === p.goes);
        if (p.at === want) return;
        p.fly = t;
        p.at = want;
        p.x.to(dockAt(want).x, { t: t + 0.45, ms: 460, kind: 'inOut' });
        p.y.to(dockAt(want).y, { t: t + 0.45, ms: 460, kind: 'inOut' });
      });
    },
    reset(t) {
      revealed = null; res = null; drag = null; hover = -1;
      pieces.forEach(p => { p.at = null; p.held = false; p.fly = null; p.x.set(homeAt(p.j).x); p.y.set(homeAt(p.j).y); p.lift.set(0); });
    },
    ghost(attempt, G) {
      const plan = attempt === 'wrong' ? { pres: 0, dir: 1, speed: 2 } : { pres: 0, speed: 1, dir: 2 };
      const steps = [];
      for (const id of ['pres', 'dir', 'speed']) {
        const p = pieces.find(q => q.id === id), i = plan[id];
        steps.push(...G.drag(G.pt(homeAt(p.j).x + PW * 0.45, homeAt(p.j).y + PH / 2), G.pt(dockAt(i).x + PW * 0.45, dockAt(i).y + PH / 2), attempt === 'wrong' ? { ms: 300, hold: 35, after: 35 } : { ms: 250, hold: 30, after: 30, moveMs: 230 }));
      }
      return steps;
    },
  };
}
