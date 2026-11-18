// The faces of the two shape styles picked in the fifth round, Blob and Noodle, copied from
// ../avatar5/js/styles.js. The person uses the Noodle face in all eight of its pictures, so that only the
// body changes. Each monster uses the face of the style it is drawn in, which differs only in the brows
// (soft dashes in Blob, arches in Noodle) and the curve of the mouth.
//
// Every part takes: g, centre x, y, size w, h, and an options object
//   eye(g, x, y, w, h, { look: [dx, dy] })
//   brow(g, x, y, w, h, rot, col)
//   nose(g, x, y, s, col)
//   mouth(g, x, y, w, h, col, { tongue })

import { circ, ell, pd } from './kit.js';

const WHITE = '#ffffff';
const PUPIL = '#2b2b3f';

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
    },
  },
};
