// Round 12, part 1: Button (round 10's pick, round 11's white-eyed crow) with pill eyes: an upright 2D capsule,
// solid white. Two versions, with Button's thin edge of light on the upper left (the rim) and without it. Everything
// else is round 10's Button, drawn by round 10's code (../../avatar10/js/crows.js): body, colours, pose, light, scale.
//
// A third version adds a small dark pupil to the same capsule, set forward toward the beak (looking ahead). It is
// there to answer the question "does the solid white eye read as blind?" side by side, not as a fourth option.
//
// round 10's eye drawing knows round and boxy eyes only, so the bird is drawn with its eyes switched off (a clear,
// tiny eye) and the capsules are laid on afterwards, in the same order round 10 draws them (near eye, then the far
// eye clipped to the head and kept off the beak), so they sit in exactly the same layer.

import { PLUMPS, plumpBird, vary, headOf } from '../../avatar10/js/crows.js';
import { pill, circ } from '../../avatar10/js/kit.js';

// the pill eye, in the crows' own units (about one point at room size). Round 11's round eye was 16.8 across.
export const PILL = {
  w: 10.4,          // the near eye's width
  h: 21,            // its height: about two widths, a clear capsule
  farW: 5,          // the far eye, seen at a slant, so much narrower
  farH: 16,
  farAt: [-5, -4],  // moved from round 10's far eye, so its round top shows above the beak's root
  col: '#f7f7fa',   // round 11's white
  pupil: { col: '#0b0c14', w: 0.56, h: 0.42, dx: 0.2, dy: 0.04 },   // in units of the eye's width and height
};

// round 10's beak outline (copied: ../../avatar10/js/crows.js keeps it to itself), for keeping the far eye off it
function beakPath(x0, yTop, yBot, tx, ty, { arch = 0.1, hook = 0, round = 0 } = {}) {
  const L = tx - x0, d = yBot - yTop, p = new Path2D();
  p.moveTo(x0, yTop);
  p.bezierCurveTo(x0 + L * 0.4, yTop - L * arch, x0 + L * 0.8, ty - d * 0.35 - L * arch * 0.4, tx, ty + hook);
  if (round) p.quadraticCurveTo(tx + round * 0.4, ty + hook + round, tx - round * 1.2, ty + hook + round * 0.9);
  p.bezierCurveTo(x0 + L * 0.75, ty + d * 0.18, x0 + L * 0.3, yBot + 0.5, x0, yBot);
  p.closePath();
  return p;
}

const OFF = { shape: 'ell', rx: 0.01, ry: 0.01, ball: 'rgba(0,0,0,0)' };

function pillEye(c, x, y, w, h, pupil) {
  const s = pill(x, y, w, h);
  c.fillStyle = PILL.col; c.fill(s);
  if (pupil) {
    const P = PILL.pupil;
    c.save(); c.clip(s);
    c.fillStyle = P.col; c.fill(pill(x + P.dx * w, y + P.dy * h, P.w * w, P.h * h));
    c.restore();
  }
}

// a Button with pill eyes; rim: keep round 10's edge of light; pupil: add the small dark pupil
function pillButton(base, { rim, pupil }) {
  const v = vary(base, {
    edge: rim ? base.edge : null,
    eye: { ...OFF, x: base.eye.x, y: base.eye.y },
    far: { ...OFF, x: base.far.x, y: base.far.y },
  });
  const draw = g => {
    plumpBird(g, v);
    const c = g.ctx, [hx, hy] = v.hs, B = v.beak;
    pillEye(c, base.eye.x + hx, base.eye.y + hy, PILL.w, PILL.h, pupil);
    const head = circ(v.head[0] + hx, v.head[1] + hy, v.head[2]);
    const beak = beakPath(B.x0 + hx, B.yTop + hy, B.yBot + hy, B.tx + hx, B.ty + hy, B);
    // the far eye: inside the head, kept off the beak, as round 10 does it
    c.save(); c.clip(head);
    const r = new Path2D(); r.rect(-5000, -5000, 10000, 10000); r.addPath(beak); c.clip(r, 'evenodd');
    pillEye(c, base.far.x + hx + PILL.farAt[0], base.far.y + hy + PILL.farAt[1], PILL.farW, PILL.farH, pupil);
    c.restore();
  };
  return { v, draw };
}

const BUTTON = PLUMPS.find(k => k.id === 'plump-button').v;

const LIST = [
  { id: 'button-pill-rim', name: 'Button', eyes: 'pill eyes, rim', ...pillButton(BUTTON, { rim: true }) },
  { id: 'button-pill', name: 'Button', eyes: 'pill eyes, no rim', ...pillButton(BUTTON, { rim: false }) },
  { id: 'button-pill-pupil', name: 'Button', eyes: 'pill eyes with a pupil, no rim', ...pillButton(BUTTON, { rim: false, pupil: true }) },
];

export const CROWS = LIST.map(k => ({ ...k, head: headOf(k.v) }));
