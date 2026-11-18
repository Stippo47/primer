// The ten shape styles, softest first, and the face each one draws with.
// A style changes every shape, the face included: a circle style has round eyes and a round nose,
// a block style square ones. What a style never changes is the character: its colours, its features
// (hair, crest, eye count), its pose and its expression.

import { PI, rr, pill, circ, ell, poly, pd, leaf, wedge, segment, dEye } from './kit.js';

export const STYLES = [
  { id: 'blob', name: 'Blob', text: 'One soft mass with no corners anywhere. Parts melt into each other.' },
  { id: 'circles', name: 'Circles', text: 'Every part a perfect circle. Hands and feet float free.' },
  { id: 'noodle', name: 'Noodle', text: 'A small solid body with long bendy limbs that curve like noodles.' },
  { id: 'pills', name: 'Pills', text: 'Every part a capsule: straight sides, fully round ends.' },
  { id: 'squat', name: 'Squat', text: 'Short and wide, soft boxes stacked low, like a marshmallow.' },
  { id: 'tall', name: 'Tall', text: 'Stretched thin and tall, long tapering limbs, a small head.' },
  { id: 'blocks', name: 'Blocks', text: 'Boxes with straight sides and small rounded corners.' },
  { id: 'cutout', name: 'Cut-out', text: 'Half circles and straight cuts with sharp corners, like cut paper.' },
  { id: 'facets', name: 'Facets', text: 'Flat-sided cut-gem shapes, no curves at all.' },
  { id: 'spiky', name: 'Spiky', text: 'Sharp points and narrow wedges. The hardest shapes.' },
];

const WHITE = '#ffffff';
const PUPIL = '#2b2b3f';

// ---- small shape makers shared by the faces ----
const hex = (x, y, w, h) => poly([[x - w / 2, y], [x - w / 4, y - h / 2], [x + w / 4, y - h / 2], [x + w / 2, y], [x + w / 4, y + h / 2], [x - w / 4, y + h / 2]]);
const diamond = (x, y, w, h) => poly([[x, y - h / 2], [x + w / 2, y], [x, y + h / 2], [x - w / 2, y]]);
const tri = (x, y, w, h) => poly([[x - w / 2, y], [x + w / 2, y], [x, y + h]]); // pointing down from a flat top at y

// every face part takes: g, centre x, y, size w, h, and an options object
//   eye(g, x, y, w, h, { look: [dx, dy] })
//   brow(g, x, y, w, h, rot, col)
//   nose(g, x, y, s, col)
//   mouth(g, x, y, w, h, col, { fangs: [[dx, fw, fh], ...], fangCol, tongue })
export const FACE = {
  blob: {
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], p = ell(x, y, w / 2, h / 2);
      g.fill(p, WHITE);
      g.clip(p, () => {
        g.fill(ell(x + lx, y + ly + h * 0.05, w * 0.27, h * 0.32), PUPIL);
        g.fill(circ(x + lx - w * 0.07, y + ly - h * 0.1, w * 0.1), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) { g.at(x, y, () => g.fill(ell(0, 0, w / 2, h / 2), col), 1, rot); },
    nose(g, x, y, s, col) { g.fill(ell(x, y, s * 0.95, s * 0.8), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = pd(`M${x - w / 2} ${y} Q${x} ${y + h * 0.32} ${x + w / 2} ${y} C${x + w / 2} ${y + h * 1.25} ${x - w / 2} ${y + h * 1.25} ${x - w / 2} ${y} Z`);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(ell(x, y + h * 1.05, w * 0.28, h * 0.4), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) {
        g.clip(p, () => g.fill(pd(`M${x + dx - fw / 2} ${y - 2} L${x + dx + fw / 2} ${y - 2} Q${x + dx + fw * 0.3} ${y + fh} ${x + dx} ${y + fh} Q${x + dx - fw * 0.3} ${y + fh} ${x + dx - fw / 2} ${y - 2} Z`), o.fangCol || WHITE));
      }
    },
  },

  circles: {
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], r = w / 2, p = circ(x, y, r);
      g.fill(p, WHITE);
      g.clip(p, () => {
        g.fill(circ(x + lx, y + ly + r * 0.08, r * 0.52), PUPIL);
        g.fill(circ(x + lx - r * 0.16, y + ly - r * 0.16, r * 0.18), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) { g.fill(circ(x, y, h * 0.62), col); },
    nose(g, x, y, s, col) { g.fill(circ(x, y, s), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = segment(x, y, w / 2, y, true);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(circ(x, y + w * 0.5, w * 0.24), o.tongue));
      for (const [dx, fw] of o.fangs || []) g.clip(p, () => g.fill(segment(x + dx, y, fw / 2, y, true), o.fangCol || WHITE));
    },
  },

  noodle: {
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], p = ell(x, y, w / 2, h / 2);
      g.fill(p, WHITE);
      g.clip(p, () => {
        g.fill(ell(x + lx, y + ly + h * 0.06, w * 0.24, h * 0.3), PUPIL);
        g.fill(circ(x + lx - w * 0.06, y + ly - h * 0.08, w * 0.09), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) {
      g.at(x, y, () => g.line(pd(`M${-w / 2} ${h * 0.4} Q0 ${-h * 1.1} ${w / 2} ${h * 0.4}`), col, h), 1, rot);
    },
    nose(g, x, y, s, col) { g.fill(ell(x, y, s * 0.8, s * 0.65), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = pd(`M${x - w / 2} ${y - h * 0.15} Q${x} ${y + h * 0.35} ${x + w / 2} ${y - h * 0.15} Q${x + w * 0.42} ${y + h * 1.1} ${x} ${y + h * 1.1} Q${x - w * 0.42} ${y + h * 1.1} ${x - w / 2} ${y - h * 0.15} Z`);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(ell(x, y + h * 1.05, w * 0.25, h * 0.38), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) {
        g.clip(p, () => g.fill(pd(`M${x + dx - fw / 2} ${y - 6} L${x + dx + fw / 2} ${y - 6} L${x + dx + fw * 0.12} ${y + fh} Q${x + dx} ${y + fh + 1} ${x + dx - fw * 0.12} ${y + fh} Z`), o.fangCol || WHITE));
      }
    },
  },

  pills: {
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], p = pill(x, y, w, h);
      g.fill(p, WHITE);
      g.clip(p, () => {
        const pw = w * 0.52, ph = h * 0.6;
        g.fill(pill(x + lx, y + ly + h * 0.06, pw, ph), PUPIL);
        g.fill(circ(x + lx - pw * 0.1, y + ly - ph * 0.18, pw * 0.24), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) { g.at(x, y, () => g.fill(pill(0, 0, w, h), col), 1, rot); },
    nose(g, x, y, s, col) { g.fill(pill(x, y, s * 2.2, s * 1.3), col); },
    // the lower half of a capsule: a smile with fully round ends
    mouth(g, x, y, w, h, col, o = {}) {
      const p = new Path2D();
      p.addPath(pill(x, y, w, h * 2));
      const half = rr(x - w / 2 - 1, y, w + 2, h + 2, 0);
      g.clip(half, () => {
        g.fill(p, col);
        if (o.tongue) g.clip(p, () => g.fill(pill(x, y + h * 0.95, w * 0.5, h * 0.7), o.tongue));
        for (const [dx, fw, fh] of o.fangs || []) g.clip(p, () => g.fill(pill(x + dx, y, fw, fh * 2), o.fangCol || WHITE));
      });
    },
  },

  squat: {
    eye(g, x, y, w, h, o = {}) { dEye(g, x, y, w, h, { look: o.look || [0, 0], pupil: PUPIL }); },
    brow(g, x, y, w, h, rot, col) { g.at(x, y, () => g.fill(rr(-w / 2, -h / 2, w, h, h * 0.45), col), 1, rot); },
    nose(g, x, y, s, col) { g.fill(ell(x, y, s * 1.05, s * 0.85), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = pd(`M${x - w / 2} ${y} Q${x} ${y + h * 0.28} ${x + w / 2} ${y} L${x + w / 2} ${y + h * 0.2} Q${x + w / 2} ${y + h} ${x} ${y + h} Q${x - w / 2} ${y + h} ${x - w / 2} ${y + h * 0.2} Z`);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(ell(x, y + h, w * 0.26, h * 0.42), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) g.clip(p, () => g.fill(rr(x + dx - fw / 2, y - 3, fw, fh + 3, [0, 0, fw / 2, fw / 2]), o.fangCol || WHITE));
    },
  },

  tall: {
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], p = ell(x, y, w / 2, h / 2);
      g.fill(p, WHITE);
      g.clip(p, () => {
        g.fill(ell(x + lx, y + ly + h * 0.07, w * 0.3, h * 0.27), PUPIL);
        g.fill(circ(x + lx - w * 0.09, y + ly - h * 0.04, w * 0.1), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) {
      g.at(x, y, () => g.fill(leaf(-w / 2, h * 0.3, w / 2, h * 0.3, 0.22, 0.02), col), 1, rot);
    },
    nose(g, x, y, s, col) { g.fill(ell(x, y, s * 0.6, s * 1.15), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = pd(`M${x - w / 2} ${y} Q${x} ${y + h * 0.4} ${x + w / 2} ${y} Q${x + w * 0.3} ${y + h} ${x} ${y + h} Q${x - w * 0.3} ${y + h} ${x - w / 2} ${y} Z`);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(ell(x, y + h * 0.95, w * 0.22, h * 0.32), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) g.clip(p, () => g.fill(leaf(x + dx, y - 3, x + dx, y + fh, fw / (fh + 3) * 0.7), o.fangCol || WHITE));
    },
  },

  blocks: {
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], p = rr(x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.2);
      g.fill(p, WHITE);
      g.clip(p, () => {
        const pw = w * 0.5, ph = h * 0.58, px = x + lx, py = y + ly + h * 0.06;
        g.fill(rr(px - pw / 2, py - ph / 2, pw, ph, pw * 0.2), PUPIL);
        g.fill(rr(px - pw * 0.32, py - ph * 0.36, pw * 0.36, pw * 0.36, 0.5), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) { g.at(x, y, () => g.fill(rr(-w / 2, -h / 2, w, h, 1.2), col), 1, rot); },
    nose(g, x, y, s, col) { g.fill(rr(x - s, y - s * 0.8, s * 2, s * 1.6, s * 0.3), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = rr(x - w / 2, y, w, h, [1.2, 1.2, h * 0.5, h * 0.5]);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(rr(x - w * 0.22, y + h * 0.55, w * 0.44, h * 0.6, 1.5), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) g.clip(p, () => g.fill(rr(x + dx - fw / 2, y - 2, fw, fh + 2, [0, 0, 1, 1]), o.fangCol || WHITE));
    },
  },

  cutout: {
    // a round eye with its bottom cut straight across, which keeps it cheerful
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], r = w / 2, p = segment(x, y, r, y + r * 0.62, false);
      g.fill(p, WHITE);
      g.clip(p, () => {
        g.fill(circ(x + lx, y + ly, r * 0.5), PUPIL);
        g.fill(wedge(x + lx - r * 0.06, y + ly - r * 0.06, r * 0.26, PI, PI * 1.5), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) { g.at(x, y, () => g.fill(rr(-w / 2, -h / 2, w, h * 0.8, 0), col), 1, rot); },
    nose(g, x, y, s, col) { g.fill(wedge(x + s * 0.7, y - s * 0.9, s * 1.8, PI / 2, PI), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = segment(x, y, w / 2, y, true);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(segment(x, y + w * 0.5, w * 0.26, y + w * 0.3, true), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) g.clip(p, () => g.fill(poly([[x + dx - fw / 2, y - 1], [x + dx + fw / 2, y - 1], [x + dx + fw / 2, y + fh]]), o.fangCol || WHITE));
    },
  },

  facets: {
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], p = hex(x, y, w, h);
      g.fill(p, WHITE);
      g.clip(p, () => {
        const px = x + lx, py = y + ly + h * 0.06;
        g.fill(hex(px, py, w * 0.52, h * 0.62), PUPIL);
        g.fill(poly([[px - w * 0.15, py - h * 0.2], [px - w * 0.02, py - h * 0.2], [px - w * 0.1, py - h * 0.06]]), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) { g.at(x, y, () => g.fill(poly([[-w / 2, h / 2], [-w / 2 + h * 0.8, -h / 2], [w / 2, -h / 2], [w / 2 - h * 0.8, h / 2]]), col), 1, rot); },
    nose(g, x, y, s, col) { g.fill(tri(x, y - s * 0.6, s * 2, s * 1.5), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = poly([[x - w / 2, y], [x + w / 2, y], [x + w * 0.24, y + h], [x - w * 0.24, y + h]]);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(poly([[x - w * 0.2, y + h], [x - w * 0.08, y + h * 0.6], [x + w * 0.08, y + h * 0.6], [x + w * 0.2, y + h]]), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) g.clip(p, () => g.fill(tri(x + dx, y - 1, fw, fh + 1), o.fangCol || WHITE));
    },
  },

  spiky: {
    // an upright almond with sharp ends, its top leaning a little outwards
    eye(g, x, y, w, h, o = {}) {
      const [lx, ly] = o.look || [0, 0], s = o.side || 1, t = w * 0.12 * s;
      const p = leaf(x - t, y + h / 2, x + t, y - h / 2, w / h, w / h);
      g.fill(p, WHITE);
      g.clip(p, () => {
        const px = x + lx, py = y + ly + h * 0.04;
        g.fill(diamond(px, py, w * 0.46, h * 0.66), PUPIL);
        g.fill(poly([[px - w * 0.12, py - h * 0.2], [px - w * 0.02, py - h * 0.2], [px - w * 0.07, py - h * 0.07]]), WHITE);
      });
    },
    brow(g, x, y, w, h, rot, col) { g.at(x, y, () => g.fill(poly([[-w / 2, h * 0.3], [w / 2, -h / 2], [w * 0.3, h / 2]]), col), 1, rot); },
    nose(g, x, y, s, col) { g.fill(poly([[x - s * 0.2, y - s * 1.1], [x + s * 0.9, y + s * 0.7], [x - s * 0.9, y + s * 0.7]]), col); },
    mouth(g, x, y, w, h, col, o = {}) {
      const p = poly([[x - w / 2, y - h * 0.12], [x + w / 2, y - h * 0.12], [x, y + h]]);
      g.fill(p, col);
      if (o.tongue) g.clip(p, () => g.fill(poly([[x - w * 0.2, y + h], [x, y + h * 0.45], [x + w * 0.2, y + h]]), o.tongue));
      for (const [dx, fw, fh] of o.fangs || []) g.clip(p, () => g.fill(tri(x + dx, y - h * 0.14, fw, fh + 1), o.fangCol || WHITE));
    },
  },
};

export { hex, diamond, tri };
