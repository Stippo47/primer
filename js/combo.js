// The combo, drawn: right answers in a row as a chip with five pips beside it, which comes alive as the run
// grows (ruled 2026-11-18: tiers, not flames; each tier livelier than the last, calmly).
//
// TIERS is the one table: every tier's look, the count that reaches it, and its shields. The ones in use
// today (`at` set) are plain, bronze 5, silver 10, gold 15, crystal 25, diamond 40 and aurora 60. The rest
// are candidates from the tier board (2026-11-19: "more tiers, up and down"), drawn the same shared way and
// waiting for the designer to pick; a candidate has no `at` until then, and only shows when asked by name
// (`look`, for the board's films).
//
// Every material is drawn the app's way: flat tones lit from the upper left (art.js), a highlight band or
// facets, never photographic metal. A tier is a face (how the material is cut: metal, grain, cut, brilliant,
// sky, flow, core, hole) with its colours, plus the shared extras it carries (a shine sweep, a glow, glints,
// a spark circling, rays turning behind, motes rising, sparks drawn in, rings pulsing, echoes). Per tier, it's
// data; the drawing is shared.
//
// Shields (ruled 2026-11-18, from their idea): each tier protects the combo from one-off mistakes. A miss
// with a shield left cracks the chip (one crack per shield used) and the count holds; a miss with none left
// shatters it, and the count goes back to 0. Reaching a new tier refills them; right answers don't mend
// cracks. Shields only protect the count: a missed fact goes back into review the same either way. The rule
// is afterAnswer, below, and nothing else decides it.
//
// The chip never jumps in width: it keeps the widest it has been in a run, and grows smoothly when the count
// needs another digit. Reaching a tier is a short moment, under a second: the chip swells and settles, a few
// bits of the tier's colour burst from it with a ring, and the phone ticks. A crack knocks the chip a little
// and draws a crack across it, with a sound if Effects is on; a shatter cracks it right through and the
// pieces fly and fade, with plain ×0 coming up under them. Close holds the combo.
//
// Reduced motion (the system's setting, or `still: true` from a caller): the tiers keep their colours and
// materials, cracks still show, and nothing idles, swells, bursts, knocks or flies. The tick stays.
//
// Cheap on the phone: idle motion is CSS animations of transform and opacity, each on a small layer of its
// own; glows are soft gradients, never blur; the static material is one small SVG, redrawn only when the
// tier or the chip's width changes; a moment is a few Web Animations that tidy up after themselves.
//
// One part for everything that shows a combo: the review run (new Combo), its summary, Practice's best-combo
// chip and Profile's tile (tierClass, tierCrown). Its styles are css/combo.css; each tier's colours are
// custom properties on a tier-<id> class, made here from the table, so anything inside one picks them up.
import * as feel from './feel.js';
import { spring, out as easeOut, rgba, mix, rng } from './ease.js';
import { crown, glint, uid } from './art.js';

// ---------------------------------------------------------------- the table

// A glint round the chip: x (a share of the width), y (px from the top), r, d (delay, s), p (period, s), c,
// core (a white middle). All periods divide six seconds, so a six-second film of any tier loops cleanly.
const S = (x, y, r, d, p, c, core = false) => ({ x, y, r, d, p, c, core });
const pairOfGlints = (a, b = '#fff', d = 1) => [S(-0.02, 5, 5.5, d, 6, a), S(1.01, 31, 4.5, d + 3, 6, b)];
const fourSparkles = (a, b = '#fff', c = a) => [S(-0.07, 8, 5, 0, 3, a), S(0.86, -5, 5.5, 0.75, 3, b), S(1.07, 27, 4.5, 1.5, 3, c), S(0.2, 41, 4, 2.25, 3, b)];
const fireGlints = cs => cs.map((c, i) => S([0.2, 0.84, 0.62, 1.05, -0.05][i % 5], [6, 8, 31, 17, 24][i % 5], 5 + (i % 2) * 0.5, i * 0.6, 3, c, true));

// Each tier, lowest first. at: the count that reaches it (null: a candidate, not in use). shields: misses it
// forgives. sample: a count to show it at on the board. where: where it would sit, for the board.
// v: its colours for CSS (ink, line, plate and glow for the best run elsewhere; edge, number ink and its
// shadow, pips, burst ring, and the glow behind the chip). pips: five pip colours instead of one.
// crown: the best-combo crown in its metal (art.js crown); left out, it's made from v.
export const TIERS = [
  { id: 'plain', name: 'Plain', at: 0, shields: 0, sample: 3, face: 'plain', burst: ['#aab3ee'], sparks: [],
    v: { ink: '#b4bcef', line: '#3b4390', plate: '#252c62', glow: 'rgba(127,136,200,0.16)', edge: 'var(--line)', cink: 'var(--soft)', cinksh: 'transparent', pip: '#aab3ee', burst: '#aab3ee' },
    crown: { base: '#8e96d0', shade: '#5f67a8', lit: '#bcc3f0', jewel: '#4b5398', shine: '#8d95d6' } },

  // ---- below bronze: matte and still, a glint at most
  { id: 'clay', name: 'Clay', at: null, shields: 0, sample: 3, where: 'below bronze',
    face: 'metal', base: '#c4694a', lit: '#d98667', shade: '#a14f36', line: false, arc: 0.35, burst: ['#e8977a', '#c4694a'], sparks: [],
    v: { ink: '#e8977a', line: '#6e3a2c', plate: '#2e2448', glow: 'rgba(220,120,90,0.16)', edge: '#7a3824', cink: '#3a140a', cinksh: 'rgba(255,200,180,0.4)', pip: '#cf7656', burst: '#e8977a' } },
  { id: 'stone', name: 'Stone', at: null, shields: 0, sample: 3, where: 'below bronze',
    face: 'grain', strata: true, base: '#8b91a8', lit: '#a7adc1', shade: '#6d738d', grain: '#5a607c', burst: ['#c0c5d6', '#8b91a8'], sparks: [],
    v: { ink: '#b9bfd2', line: '#4e5474', plate: '#262c5c', glow: 'rgba(170,180,210,0.14)', edge: '#4f5470', cink: '#20243e', cinksh: 'rgba(255,255,255,0.4)', pip: '#9aa0b8', burst: '#c0c5d6' } },
  { id: 'wood', name: 'Wood', at: null, shields: 0, sample: 4, where: 'below bronze',
    face: 'grain', knot: true, base: '#a8693a', lit: '#c4834f', shade: '#8a5229', grain: '#6e3d1c', burst: ['#d9a06a', '#a8693a'], sparks: [],
    v: { ink: '#d9965c', line: '#6a4022', plate: '#2e2446', glow: 'rgba(200,130,70,0.16)', edge: '#5e3517', cink: '#2e1606', cinksh: 'rgba(255,210,160,0.45)', pip: '#c4834f', burst: '#d9a06a' } },
  { id: 'tin', name: 'Tin', at: null, shields: 0, sample: 4, where: 'below bronze',
    face: 'metal', base: '#a3abba', lit: '#c3c9d5', shade: '#858d9f', line: false, burst: ['#d5dae4', '#a3abba'], sparks: [S(1.01, 31, 4.5, 4, 6, '#fff')],
    v: { ink: '#c9cfdb', line: '#565d74', plate: '#282e5c', glow: 'rgba(200,210,230,0.14)', edge: '#646c82', cink: '#262b45', cinksh: 'rgba(255,255,255,0.55)', pip: '#b5bccb', burst: '#d5dae4' } },
  { id: 'copper', name: 'Copper', at: null, shields: 0, sample: 4, where: 'below bronze',
    face: 'metal', base: '#d4683f', lit: '#ef8a62', shade: '#ae4c2c', line: false, burst: ['#f5a882', '#ffd0b8', '#d4683f'], sparks: [S(-0.02, 5, 5, 1, 6, '#ffd0b8')],
    v: { ink: '#f29a74', line: '#7c3e28', plate: '#30244a', glow: 'rgba(240,130,90,0.2)', edge: '#7e3018', cink: '#3a1206', cinksh: 'rgba(255,208,184,0.6)', pip: '#e0805a', burst: '#f5a882' } },

  // ---- in use: bronze to gold carry one shield
  { id: 'bronze', name: 'Bronze', at: 5, shields: 1, sample: 5, face: 'metal', line: false, base: '#c97a42', lit: '#e69c62', shade: '#a55c2c', hi: '#ffd6ad',
    burst: ['#f2b27a', '#ffd6ad', '#d9874c'], sparks: pairOfGlints('#ffe3c6', '#fff', 1),
    v: { ink: '#f0a46a', line: '#7a4a2c', plate: '#30254c', glow: 'rgba(240,150,90,0.22)', edge: '#7a3c18', cink: '#3d1605', cinksh: 'rgba(255,214,173,0.65)', pip: '#e08d55', burst: '#f2b27a' },
    crown: { base: '#d4844a', shade: '#9c5228', lit: '#f2b88a', jewel: '#ee4b7a', shine: '#ffc2d4' } },
  { id: 'silver', name: 'Silver', at: 10, shields: 1, sample: 10, face: 'metal', base: '#c4cde4', lit: '#e7edfa', shade: '#99a4c5', hi: '#ffffff', shine: true,
    burst: ['#e7edfa', '#ffffff', '#b4bfdc'], sparks: [S(0.98, 4, 5.5, 2.2, 6, '#fff')],
    v: { ink: '#e2e8f8', line: '#5d6690', plate: '#2a3062', glow: 'rgba(220,230,255,0.18)', edge: '#66709a', cink: '#1f2655', cinksh: 'rgba(255,255,255,0.75)', pip: '#dfe6f7', burst: '#e7edfa' },
    crown: { base: '#c9d2e8', shade: '#8791b6', lit: '#f4f7ff', jewel: '#49c6ff', shine: '#c9f0ff' } },
  { id: 'gold', name: 'Gold', at: 15, shields: 1, sample: 15, face: 'metal', base: '#ffc83d', lit: '#ffde7c', shade: '#e8a51a', hi: '#fff4c8', shine: true, glow: true,
    burst: ['#ffd75a', '#fff1b8', '#ffb31a'], sparks: [S(-0.03, 5, 6, 1.2, 6, '#fff6d6'), S(1.01, 31, 5, 4.2, 6, '#fff')],
    v: { ink: '#ffc83d', line: '#6b5a2a', plate: '#2c2850', glow: 'rgba(255,200,61,0.2)', edge: '#c98a00', cink: '#2a1650', cinksh: 'rgba(255,244,200,0.75)', pip: '#ffc83d', burst: '#ffd75a', cglow: 'rgba(255,200,61,0.55)' },
    crown: {} },

  // ---- from here up, two shields
  { id: 'rose', name: 'Rose gold', at: null, shields: 2, sample: 18, where: 'between gold and crystal',
    face: 'metal', base: '#f0a49a', lit: '#ffc4bb', shade: '#d67f78', line: false, shine: true, glow: true, burst: ['#ffc4bb', '#fff0ec', '#e8887e'], sparks: pairOfGlints('#fff0ec', '#fff', 1.2),
    v: { ink: '#ffb8ae', line: '#7a4650', plate: '#30254e', glow: 'rgba(255,170,160,0.2)', edge: '#a8505a', cink: '#4a1430', cinksh: 'rgba(255,240,236,0.7)', pip: '#f7a9a0', burst: '#ffc4bb', cglow: 'rgba(255,160,150,0.5)' } },
  { id: 'platinum', name: 'Platinum', at: null, shields: 2, sample: 20, where: 'between gold and crystal',
    face: 'metal', base: '#d6d9ee', lit: '#f3f4fc', shade: '#a9afcf', line: false, shine: 'prism', glow: true, burst: ['#ffffff', '#e4e6f8', '#c9f0ff'], sparks: fourSparkles('#ffffff', '#e8f6ff', '#f2e8ff'),
    v: { ink: '#eef0ff', line: '#6a6f9e', plate: '#2a2e64', glow: 'rgba(230,232,255,0.2)', edge: '#7a81b0', cink: '#22264f', cinksh: 'rgba(255,255,255,0.85)', pip: '#e4e6f8', burst: '#ffffff', cglow: 'rgba(220,225,255,0.5)' } },
  { id: 'jade', name: 'Jade', at: null, shields: 2, sample: 22, where: 'between gold and crystal',
    face: 'flow', stops: ['#2fae7c', '#56d6a0', '#2a9a6e', '#64dcac', '#2fae7c'], glow: true, burst: ['#8ff0c4', '#d6ffe9', '#2fae7c'], sparks: [S(0.98, 4, 5, 1, 6, '#d6ffe9'), S(-0.04, 30, 4.5, 4, 6, '#fff')],
    v: { ink: '#6fe0b0', line: '#2a7a5a', plate: '#1f3458', glow: 'rgba(80,210,150,0.2)', edge: '#1a7350', cink: '#0b3324', cinksh: 'rgba(220,255,236,0.6)', pip: '#4fd39b', burst: '#8ff0c4', cglow: 'rgba(80,210,150,0.5)' } },
  { id: 'emerald', name: 'Emerald', at: null, shields: 2, sample: 27, where: 'between gold and diamond',
    face: 'cut', base: '#2fc47a', deep: '#053d2a', glow: true, burst: ['#9ff5c8', '#e3fff0', '#1fa864'], sparks: fourSparkles('#c8ffe4'),
    v: { ink: '#7ef0b4', line: '#22805a', plate: '#1d3256', glow: 'rgba(47,196,122,0.24)', edge: '#0e5a38', cink: '#fff', cinksh: '#0b5a36', pip: '#3fd88c', burst: '#9ff5c8', cglow: 'rgba(47,196,122,0.55)' } },
  { id: 'sapphire', name: 'Sapphire', at: null, shields: 2, sample: 30, where: 'between gold and diamond',
    face: 'cut', base: '#3f7cf0', deep: '#0a1a66', glow: true, burst: ['#a9c8ff', '#e6efff', '#2f5fd0'], sparks: fourSparkles('#d6e4ff'),
    v: { ink: '#8fb6ff', line: '#2a4fa0', plate: '#1d2c66', glow: 'rgba(63,124,240,0.26)', edge: '#1a3a9a', cink: '#fff', cinksh: '#123a99', pip: '#5a90ff', burst: '#a9c8ff', cglow: 'rgba(63,124,240,0.6)' } },
  { id: 'crystal', name: 'Crystal', at: 25, shields: 2, sample: 25, face: 'cut', glow: true,
    tones: ['#cdb2ff', '#bf9cff', '#b28df8', '#7b4bd6', '#7442cc', '#6233b8', '#a476f3', '#9161e8'],
    burst: ['#c9a8ff', '#efe3ff', '#9b6cf0'], sparks: [S(-0.07, 8, 5, 0, 3, '#efe3ff'), S(0.86, -5, 5.5, 0.75, 3, '#fff'), S(1.07, 27, 4.5, 1.5, 3, '#dccbff'), S(0.2, 41, 4, 2.25, 3, '#fff')],
    v: { ink: '#c9a8ff', line: '#5a3a9a', plate: '#2e2462', glow: 'rgba(166,124,245,0.26)', edge: '#4c2a94', cink: '#fff', cinksh: '#5a2fb0', pip: '#b48cff', burst: '#c9a8ff', cglow: 'rgba(166,124,245,0.6)' },
    crown: { base: '#a67cf5', shade: '#6f43c9', lit: '#d9c6ff', jewel: '#ff9ab8', shine: '#ffe3ec' } },
  { id: 'ruby', name: 'Ruby', at: null, shields: 2, sample: 35, where: 'between crystal and diamond',
    face: 'brilliant', base: '#de2c55', deep: '#4a0418', fire: ['#ffd1e4', '#ffb04d', '#ff9ac4', '#ffe066'], shine: true, glow: true,
    burst: ['#ff9ab0', '#ffd1e4', '#e8335a', '#ffb04d'], sparks: fireGlints(['#ffd1e4', '#ffb04d', '#ff6fa3', '#ffffff', '#ff9ac4']),
    v: { ink: '#ff8fa8', line: '#8a2a44', plate: '#30224e', glow: 'rgba(232,51,90,0.24)', edge: '#8a1430', cink: '#4a0618', cinksh: 'rgba(255,225,233,0.75)', pip: '#f04a70', burst: '#ff9ab0', cglow: 'rgba(240,60,100,0.55)' } },
  { id: 'diamond', name: 'Diamond', at: 40, shields: 2, sample: 40, face: 'brilliant', glow: true, shine: 'prism',
    burst: ['#ff6fa3', '#ffcf3d', '#2fd0ff', '#2fe0a0', '#a67cf5'], sparks: fireGlints(['#ff6fa3', '#ffcf3d', '#2fd0ff', '#2fe0a0', '#a67cf5']),
    v: { ink: '#c4f2ff', line: '#3b7aa3', plate: '#1f3062', glow: 'rgba(160,225,255,0.22)', edge: '#4f8fc0', cink: '#163a7a', cinksh: 'rgba(255,255,255,0.9)', pip: '#def6ff', burst: '#c9f1ff', cglow: 'rgba(170,230,255,0.55)' },
    crown: { base: '#d7f1ff', shade: '#8fc6ea', lit: '#ffffff', jewel: '#49c6ff', shine: '#e6fbff' } },
  { id: 'obsidian', name: 'Obsidian', at: null, shields: 2, sample: 45, where: 'between diamond and aurora',
    face: 'metal', base: '#1d1732', lit: '#30284f', shade: '#110c22', line: false, arc: 0.55, shine: '#b8a8ff', glow: true,
    burst: ['#b3a6ff', '#7d6cf0', '#ffffff'], sparks: [S(0.98, 4, 5.5, 0.5, 3, '#c9bfff'), S(-0.05, 30, 4.5, 2, 3, '#ffffff')],
    crack: ['rgba(0,0,0,0.7)', 'rgba(200,190,255,0.75)'],
    v: { ink: '#b3a6ff', line: '#4a3f80', plate: '#1a163e', glow: 'rgba(140,120,255,0.18)', edge: '#06040f', cink: '#e9e4ff', cinksh: '#000', pip: '#7d6cf0', burst: '#b3a6ff', cglow: 'rgba(120,100,240,0.45)' } },
  { id: 'opal', name: 'Opal', at: null, shields: 2, sample: 50, where: 'between diamond and aurora',
    face: 'flow', stops: ['#f1e6ff', '#c9f3ea', '#fdfcff', '#ffd6e8', '#d3e6ff', '#f1e6ff'], shine: 'prism', glow: true,
    burst: ['#ffd6e8', '#c9f3ea', '#d3e6ff', '#ffe9b8'], sparks: fireGlints(['#ff9ac4', '#7fe6c8', '#8fbcff', '#ffd27a']),
    pips: ['#ffd6e8', '#ffe9b8', '#c9f3ea', '#cfe3ff', '#e6d6ff'],
    v: { ink: '#e8e6ff', line: '#7a7ab0', plate: '#2a2e66', glow: 'rgba(220,220,255,0.2)', edge: '#9497c4', cink: '#2a2766', cinksh: 'rgba(255,255,255,0.9)', pip: '#ead9ff', burst: '#ffffff', cglow: 'rgba(230,220,255,0.5)' } },
  { id: 'titanium', name: 'Titanium', at: null, shields: 2, sample: 55, where: 'between diamond and aurora',
    face: 'metal', tint: ['#3d6ff0', '#8a5ae8', '#e86fb0', '#f0b04a'], base: '#7a64e8', line: false, shine: 'prism', glow: true,
    burst: ['#3d6ff0', '#8a5ae8', '#e86fb0', '#f0b04a'], sparks: fireGlints(['#c0d0ff', '#e6c8ff', '#ffc8e4', '#ffe0a0']),
    pips: ['#3d6ff0', '#6a64ee', '#9a5ae0', '#e06fb0', '#f0b04a'],
    v: { ink: '#a8b8ff', line: '#4a50a0', plate: '#252a66', glow: 'rgba(120,110,240,0.22)', edge: '#3a2a8a', cink: '#fff', cinksh: '#2a1a70', pip: '#8a7cf0', burst: '#c0b0ff', cglow: 'rgba(130,110,240,0.5)' } },

  { id: 'aurora', name: 'Aurora', at: 60, shields: 2, sample: 60, face: 'sky', glow: true, orbit: { c: '#d9fff4' },
    sky: ['#221e68', '#191558'], stars: 6, rim: ['#7df0cf', '#a67cf5', '#ff9ab8'],
    bands: [[0.44, 5, 0, 9, 3, '#2bc4a4', 0.72], [0.64, 4, 2.2, 7, 2.5, '#a67cf5', 0.62], [0.34, 5, 0.5, 2.6, 0.8, '#7df0cf', 0.85], [0.74, 3, 3.1, 2.2, 0.6, '#ff9ab8', 0.5]],
    burst: ['#7df0cf', '#2bc4a4', '#a67cf5', '#ff9ab8', '#6fd6ff'], sparks: [S(0.96, -3, 5, 3, 6, '#c8fff0')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(220,255,245,0.75)'], pips: ['#2bc4a4', '#49c6ff', '#7d8cf7', '#a67cf5', '#ee6fa0'],
    v: { ink: '#8ff5d9', line: '#2a8c80', plate: '#1d2a5e', glow: 'rgba(43,196,164,0.24)', edge: '#100d40', cink: '#fff', cinksh: '#120f48', pip: '#2bc4a4', burst: '#7df0cf', cglow: 'rgba(43,196,164,0.55)', cglow2: 'rgba(166,124,245,0.6)' },
    crown: { base: '#2bc4a4', shade: '#6a4cd6', lit: '#9ff7df', jewel: '#a67cf5', shine: '#e3d6ff' } },

  // ---- past aurora: the sky, then light itself, then the abstract
  { id: 'nebula', name: 'Nebula', at: null, shields: 2, sample: 70, where: 'past aurora',
    face: 'sky', glow: true, sky: ['#2a1252', '#1c0d3e'], stars: 8, rim: ['#ff8fc8', '#c04fd0', '#4f6fe0'], rimO: 0.7,
    bands: [[0.42, 4, 0, 20, 6, '#c04fd0', 0.4], [0.66, 5, 2, 18, 5, '#4f6fe0', 0.42], [0.52, 3, 1, 9, 3, '#ff8fc8', 0.5], [0.3, 3, 3.5, 5, 2, '#ffd0f0', 0.4]],
    burst: ['#ff8fc8', '#c04fd0', '#7d8cf7', '#ffd0f0'], sparks: [S(-0.04, 4, 5, 1, 6, '#ffd0f0'), S(1.03, 30, 4.5, 4, 6, '#c8d4ff')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(255,220,250,0.75)'], pips: ['#ff8fc8', '#e070e0', '#b070f0', '#7d8cf7', '#4f9ff0'],
    v: { ink: '#f0a8f0', line: '#7a3a9a', plate: '#24205e', glow: 'rgba(200,90,220,0.24)', edge: '#120a30', cink: '#fff', cinksh: '#1a0c3e', pip: '#d070e0', burst: '#ffb0f0', cglow: 'rgba(200,90,220,0.5)', cglow2: 'rgba(90,120,240,0.5)' } },
  { id: 'celestial', name: 'Celestial', at: null, shields: 2, sample: 80, where: 'past aurora',
    face: 'sky', glow: true, sky: ['#13206a', '#0b1446'], stars: 7, starC: '#ffe9a6', lines: '#ffd75a', rim: ['#fff4c8', '#ffc83d', '#ffe08a'], orbit: { c: '#fff1b8' },
    bands: [[0.55, 6, 1, 13, 4, '#2c3c9a', 0.55]],
    burst: ['#ffe9a6', '#ffd75a', '#8fb0ff', '#ffffff'], sparks: [S(0.96, -3, 5, 3, 6, '#fff1b8')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(255,240,200,0.8)'], pips: ['#ffe9a6', '#ffd75a', '#d6c48a', '#8fb0ff', '#5a7cff'],
    v: { ink: '#ffe08a', line: '#7a6a30', plate: '#1a2260', glow: 'rgba(255,220,120,0.22)', edge: '#070c30', cink: '#fff4c8', cinksh: '#0a1240', pip: '#ffd75a', burst: '#ffe9a6', cglow: 'rgba(255,215,110,0.45)', cglow2: 'rgba(80,120,255,0.5)' } },
  { id: 'legendary', name: 'Legendary', at: null, shields: 2, sample: 90, where: 'past aurora',
    face: 'metal', base: '#ff9a2a', lit: '#ffc060', shade: '#e0700a', line: false, shine: true, glow: true, rays: { c: '#ffcf6a' }, motes: { c: '#ffd27a' },
    burst: ['#ffd27a', '#fff0c0', '#ff9a2a'], sparks: pairOfGlints('#fff0c0', '#fff', 1),
    v: { ink: '#ffb347', line: '#7a4a1a', plate: '#2e2448', glow: 'rgba(255,160,60,0.24)', edge: '#a84a00', cink: '#3a1400', cinksh: 'rgba(255,240,192,0.75)', pip: '#ffa53a', burst: '#ffd27a', cglow: 'rgba(255,160,50,0.6)' } },
  { id: 'eternal', name: 'Eternal', at: null, shields: 2, sample: 99, where: 'past aurora',
    face: 'metal', base: '#fff0cc', lit: '#fffaf0', shade: '#eed39a', line: false, shine: '#fff6d8', glow: true, rays: { c: '#fff2c4' }, orbit: { c: '#fffbe8', fig8: true },
    burst: ['#fffbe8', '#ffe9a6', '#ffffff'], sparks: [],
    v: { ink: '#fff3d0', line: '#8a7a50', plate: '#2c2a5a', glow: 'rgba(255,240,200,0.24)', edge: '#c4a258', cink: '#5a3a0a', cinksh: 'rgba(255,255,255,0.9)', pip: '#ffeab0', burst: '#fffbe8', cglow: 'rgba(255,236,190,0.6)', cglow2: 'rgba(200,220,255,0.5)' } },
  { id: 'prism', name: 'Prism', at: null, shields: 2, sample: 120, where: 'past aurora',
    face: 'flow', stops: ['#ff6fa3', '#ffb04d', '#ffe066', '#7fe08a', '#2fd0ff', '#8a7cf7', '#ff6fa3'], shine: true, glow: true,
    burst: ['#ff6fa3', '#ffcf3d', '#7fe08a', '#2fd0ff', '#a67cf5'], sparks: fireGlints(['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff']),
    pips: ['#ff6fa3', '#ffcf3d', '#7fe08a', '#2fd0ff', '#a67cf5'],
    v: { ink: '#ffd0e8', line: '#7a4a9a', plate: '#2a2462', glow: 'rgba(255,160,220,0.22)', edge: '#5a3aa0', cink: '#1d1450', cinksh: 'rgba(255,255,255,0.8)', pip: '#ff9ac4', burst: '#ffffff', cglow: 'rgba(255,111,163,0.5)', cglow2: 'rgba(47,208,255,0.5)' } },
  { id: 'supernova', name: 'Supernova', at: null, shields: 2, sample: 150, where: 'far past aurora',
    face: 'core', stops: ['#ffffff', '#fff2a8', '#ffb040', '#e8463a'], glow: true, pulse: { c: ['#ffb040', '#6fb0ff'], out: true },
    burst: ['#fff2a8', '#ffb040', '#e8463a', '#6fb0ff'], sparks: fourSparkles('#fff2a8', '#ffffff', '#cfe3ff'),
    pips: ['#fff2a8', '#ffd060', '#ffb040', '#f07a3a', '#e8463a'],
    v: { ink: '#ffc070', line: '#8a3a2a', plate: '#2c2050', glow: 'rgba(255,150,80,0.26)', edge: '#9a2a1a', cink: '#4a0a14', cinksh: 'rgba(255,255,255,0.85)', pip: '#ffb040', burst: '#fff2a8', cglow: 'rgba(255,170,80,0.6)', cglow2: 'rgba(90,160,255,0.5)' } },
  { id: 'eclipse', name: 'Eclipse', at: null, shields: 2, sample: 200, where: 'far past aurora',
    face: 'sky', sky: ['#0a0a1c', '#06060f'], stars: 0, rim: ['#fff4c8', '#ffe08a', '#ffffff'], glow: true, orbit: { c: '#ffffff' },
    burst: ['#fffbe8', '#ffe08a', '#cfe3ff'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(255,244,210,0.8)'],
    v: { ink: '#fff0c8', line: '#6a6040', plate: '#14143a', glow: 'rgba(255,240,200,0.24)', edge: '#000', cink: '#fff8e0', cinksh: '#000', pip: '#fff0c8', burst: '#fffbe8', cglow: 'rgba(255,236,190,0.65)', cglow2: 'rgba(170,200,255,0.55)' } },
  { id: 'omnipotent', name: 'Omnipotent', at: null, shields: 2, sample: 300, where: 'far past aurora',
    face: 'hole', disc: ['#ff7a2a', '#ffd9a0', '#fff6e0'], glow: true, spiral: { c: '#ffd9a0' },
    burst: ['#ffd9a0', '#ff9a4a', '#ffffff', '#a03a6a'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(255,217,160,0.75)'], pips: ['#ffe0b0', '#ffc070', '#ff9a4a', '#e86a3a', '#a03a6a'],
    v: { ink: '#ffb870', line: '#6a3a20', plate: '#0e0c24', glow: 'rgba(255,150,70,0.24)', edge: '#000', cink: '#fff', cinksh: '#000', pip: '#ff9a4a', burst: '#ffd9a0', cglow: 'rgba(255,140,60,0.55)' } },
  { id: 'singularity', name: 'Singularity', at: null, shields: 2, sample: 500, where: 'far past aurora',
    face: 'core', stops: ['#ffffff', '#f4efff', '#d8ccff', '#a58cf0'], glow: true, pulse: { c: ['#8a6cf0', '#8a6cf0'], out: false }, spiral: { c: '#4a2aa0' },
    burst: ['#ffffff', '#d8ccff', '#8a6cf0'], sparks: [],
    v: { ink: '#e6dcff', line: '#7a5ab0', plate: '#2a2260', glow: 'rgba(230,220,255,0.26)', edge: '#6a4ad0', cink: '#1a0f3d', cinksh: 'rgba(255,255,255,0.9)', pip: '#d6c8ff', burst: '#ffffff', cglow: 'rgba(220,205,255,0.6)' } },
  { id: 'multiverse', name: 'Multiverse', at: null, shields: 2, sample: 750, where: 'far past aurora',
    face: 'flow', stops: ['#2a2070', '#3d2c96', '#1f3c94', '#33207e', '#2a2070'], dark: true, echo: { c: ['#2fd0ff', '#ff6fd0'] }, glow: true,
    burst: ['#2fd0ff', '#ff6fd0', '#d0c0ff'], sparks: [S(-0.04, 4, 5, 1, 6, '#9feaff'), S(1.03, 30, 4.5, 4, 6, '#ffb0ea')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(210,230,255,0.75)'], pips: ['#2fd0ff', '#6aa8ff', '#9a80ff', '#d070f0', '#ff6fd0'],
    v: { ink: '#c0b0ff', line: '#4a3aa0', plate: '#221c60', glow: 'rgba(160,120,255,0.22)', edge: '#140f40', cink: '#fff', cinksh: '#140f40', pip: '#9a80ff', burst: '#d0c0ff', cglow: 'rgba(150,110,255,0.45)' } },
  { id: 'void', name: 'Void', at: null, shields: 2, sample: 999, where: 'the very end',
    face: 'sky', sky: ['#04051a', '#020310'], stars: 0, drift: true, rim: ['#ffffff', '#ffffff', '#ffffff'], rimO: 0.18,
    burst: ['#ffffff', '#c8d0ff'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(220,226,255,0.6)'],
    v: { ink: '#c8d0ff', line: '#2a2f60', plate: '#05061a', glow: 'rgba(150,160,255,0.1)', edge: '#000', cink: '#fff', cinksh: '#000', pip: '#c8d0ff', burst: '#ffffff' } },
];

const BY = Object.fromEntries(TIERS.map(t => [t.id, t]));
// The tiers in use, by how many right in a row reach each.
export const LADDER = TIERS.filter(t => t.at !== null).sort((a, b) => a.at - b.at);
// The board's candidates: every tier not in use yet.
export const CANDIDATES = TIERS.filter(t => t.at === null);
export const lookOf = id => BY[id] || null;

export function tierOf(n = 0) {
  let t = LADDER[0];
  for (const x of LADDER) if (n >= x.at) t = x;
  return t;
}
const rank = n => LADDER.indexOf(tierOf(n));
export const tierClass = n => `tier-${tierOf(n).id}`;

// The rule, as one mechanism over the table: what an answer does to the combo and its cracks.
//   right: one more; reaching a new tier refills the shields (the cracks go). Right answers don't mend.
//   close: holds. wrong: with a shield left (cracks < the tier's shields), it cracks and the count holds;
//   with none, it shatters back to 0.
export function afterAnswer({ n = 0, cracks = 0 }, how) {
  if (how === 'right') {
    const up = rank(n + 1) > rank(n);
    return { n: n + 1, cracks: up ? 0 : cracks, event: up ? 'rise' : null };
  }
  if (how !== 'wrong' || n === 0) return { n, cracks, event: null };
  if (cracks < tierOf(n).shields) return { n, cracks: cracks + 1, event: 'crack' };
  return { n: 0, cracks: 0, event: 'shatter' };
}

export const PIPS = 5;        // every five in a row fills the pips
const H = 40;                 // the chip's height; its width follows the digits (widthFor), and never shrinks in a run
export const widthFor = n => [52, 60, 72, 84][Math.min(String(Math.max(0, n)).length, 4) - 1];

// The best run's crown, drawn in its tier's metal: 30 x 24, like art.js's crown.
const crownOf = t => t.crown || { base: t.v.pip, shade: t.v.edge.startsWith('var') ? '#5f67a8' : t.v.edge, lit: t.v.ink, jewel: t.v.burst, shine: '#ffffff' };
export const tierCrown = n => crown(crownOf(tierOf(n)));

// Each tier's colours as custom properties on its class, made from the table once.
function tierStyles() {
  let css = '';
  for (const t of TIERS) {
    const v = t.v;
    css += `.tier-${t.id}{--tier-ink:${v.ink};--tier-line:${v.line};--tier-plate:${v.plate};--tier-glow:${v.glow};--c-edge:${v.edge};--c-ink:${v.cink};`
      + `--c-ink-sh:${v.cinksh};--c-pip:${v.pip};--c-burst:${v.burst};${v.cglow ? `--c-glow:${v.cglow};` : ''}${v.cglow2 ? `--c-glow2:${v.cglow2};` : ''}`
      + `--c-crack:${(t.crack || [])[0] || 'rgba(30,12,40,0.72)'};--c-crack-hi:${(t.crack || [])[1] || 'rgba(255,255,255,0.8)'}}\n`;
    (t.pips || []).forEach((c, i) => { css += `.cpips.tier-${t.id} i.on:nth-child(${i + 1}){background:${c}}\n`; });
  }
  return css;
}
if (typeof document !== 'undefined' && !document.getElementById('tierstyles')) {
  const s = document.createElement('style');
  s.id = 'tierstyles';
  s.textContent = tierStyles();
  document.head.append(s);
}

// ---------------------------------------------------------------- drawing the material

const f1 = v => +v.toFixed(1);
const pathOf = pts => `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`;
const poly = (pts, fill, o = 1) => `<path d="${pathOf(pts)}" fill="${fill}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
const clipOf = pts => `clip-path:polygon(${pts.map(([x, y]) => `${f1(x)}px ${f1(y)}px`).join(',')})`;
// the bright stroke at the upper left that every lit thing in the app has
const shineArc = o => `<path d="M4.6 ${H * 0.36}Q4.6 4.8 12.5 4.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="${o}"/>`;
// A facet that catches the light: a white (or tinted) copy of it, shown in turn by the idle motion. o is how
// bright it gets, as the colour's own opacity (the animation takes the layer from nothing to full).
const flash = (pts, d, o = 0.5, c = '#ffffff') => `<i class="fx" style="${clipOf(pts)};--d:${d}s;background:${rgba(c, o)}"></i>`;
// lighter toward white, or deeper toward the gem's own dark
const lift = (c, k) => mix(c, '#ffffff', k);
const sink = (c, deep, k) => mix(c, deep, k);

// The step cut (crystal, emerald, sapphire) on a W x H chip: a table in the middle split along a slant, and
// bevels round it, the top and bottom ones split in two.
function stepCut(W) {
  const a = 9, b = 7, c = 10, m = W / 2;
  const TL = [0, 0], TR = [W, 0], BR = [W, H], BL = [0, H], tl = [a, b], tr = [W - a, b], br = [W - a, H - c], bl = [a, H - c];
  const Mt = [m, 0], mt = [m, b], Mb = [m, H], mb = [m, H - c];
  const s0 = [W * 0.4, b], s1 = [W * 0.6, H - c];
  return {
    bevel: { topL: [TL, Mt, mt, tl], topR: [Mt, TR, tr, mt], left: [TL, tl, bl, BL], right: [TR, BR, br, tr], botL: [BL, bl, mb, Mb], botR: [Mb, mb, br, BR] },
    table: { a: [tl, s0, s1, bl], b: [s0, tr, br, s1] },
  };
}

// The brilliant (diamond, ruby), seen from above: an eight-sided table, a star facet on each of its long
// sides reaching to the edge, and three facets fanning from each corner.
function brilliant(W) {
  const a = 9, b = 7, c = 10, k = 4, cy = (b + H - c) / 2;
  const t1 = [a + k, b], t2 = [W - a - k, b], t3 = [W - a, b + k], t4 = [W - a, H - c - k], t5 = [W - a - k, H - c], t6 = [a + k, H - c], t7 = [a, H - c - k], t8 = [a, b + k];
  const TL = [0, 0], TR = [W, 0], BR = [W, H], BL = [0, H], Mt = [W / 2, 0], Mb = [W / 2, H], Ml = [0, cy], Mr = [W, cy];
  return {
    table: [t1, t2, t3, t4, t5, t6, t7, t8],
    star: { top: [t1, t2, Mt], bottom: [t6, t5, Mb], left: [t8, t7, Ml], right: [t3, t4, Mr] },
    corner: {
      tl: [[TL, Mt, t1], [TL, t1, t8], [TL, t8, Ml]], tr: [[TR, t2, Mt], [TR, t3, t2], [TR, Mr, t3]],
      br: [[BR, t4, Mr], [BR, t5, t4], [BR, Mb, t5]], bl: [[BL, t6, Mb], [BL, t7, t6], [BL, Ml, t7]],
    },
  };
}
// The brilliant's tones: diamond's own, or made from a gem's colour and its deep.
const DIAMOND_TONES = { tl: ['#ffffff', '#f2fbff', '#e6f6ff'], tr: ['#eaf8ff', '#d9f1fe', '#c3e7fb'], br: ['#a6d6f3', '#94cbee', '#b0dcf6'], bl: ['#c9e9fb', '#d6effd', '#bde3f9'],
  star: { top: '#f7fdff', left: '#e2f5ff', right: '#b8e2f9', bottom: '#a9d8f4' }, table: '#e9f7ff' };
function gemTones(b, deep) {
  return { tl: [lift(b, 0.55), lift(b, 0.42), lift(b, 0.32)], tr: [lift(b, 0.3), lift(b, 0.2), lift(b, 0.08)], br: [sink(b, deep, 0.3), sink(b, deep, 0.4), sink(b, deep, 0.22)],
    bl: [lift(b, 0.08), lift(b, 0.16), b], star: { top: lift(b, 0.48), left: lift(b, 0.26), right: sink(b, deep, 0.12), bottom: sink(b, deep, 0.22) }, table: lift(b, 0.3) };
}

// Waves of light (the sky faces): bands that repeat every W, drawn 2W wide so the strip can slide by W and
// land where it started. Each band: [middle (a share of H), wave height, phase, thickness, its swell, colour, opacity].
function ribbons(W, bands) {
  return bands.map(([y0, amp, ph, t0, tAmp, fill, o]) => {
    const top = [], bot = [];
    for (let i = 0; i <= 32; i++) {
      const x = (i / 32) * 2 * W, k = (x / W) * Math.PI * 2;
      const y = H * y0 + amp * Math.sin(k + ph), t = (t0 + tAmp * Math.sin(k + ph + 1.3)) / 2;
      top.push([x, y - t]);
      bot.unshift([x, y + t]);
    }
    return poly([...top, ...bot], fill, o);
  }).join('');
}

// Stars on a strip 2W wide that repeat every W, for the void's two drifting layers.
function starStrip(W, seed, n, size, o) {
  const r = rng(seed);
  let dots = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = 3 + r() * (H - 6), s = size * (0.6 + r() * 0.6), a = o * (0.5 + r() * 0.5);
    for (const dx of [0, W]) dots += `<circle cx="${f1(x + dx)}" cy="${f1(y)}" r="${f1(s)}" fill="#fff" opacity="${f1(a)}"/>`;
  }
  return `<svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${dots}</svg>`;
}

// The chip's insides for a tier at width W: the static material (one SVG), and the layers that move over it.
function face(L, W) {
  const svgOf = body => `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body}</svg>`;
  const shine = L.shine ? `<i class="cshine${L.shine === 'prism' ? ' prism' : ''}"${typeof L.shine === 'string' && L.shine !== 'prism' ? ` style="--sh:${rgba(L.shine, 0.6)};--sh2:${rgba(L.shine, 0.35)}"` : ''}></i>` : '';
  if (L.face === 'plain') return svgOf(`<rect width="${W}" height="${H}" fill="#222a60"/>`);

  if (L.face === 'metal' || L.face === 'grain') {
    // a lit band across the top, a shade along the bottom (and on most, a fine bright line on the band's edge)
    const band = `M0 0H${W}V${f1(H * 0.3)}C${f1(W * 0.62)} ${f1(H * 0.36)} ${f1(W * 0.32)} ${f1(H * 0.4)} 0 ${f1(H * 0.47)}Z`;
    const edge = `M0 ${f1(H * 0.47 + 1.4)}C${f1(W * 0.32)} ${f1(H * 0.4 + 1.4)} ${f1(W * 0.62)} ${f1(H * 0.36 + 1.4)} ${W} ${f1(H * 0.3 + 1.4)}`;
    const low = `M0 ${f1(H * 0.8)}C${f1(W * 0.4)} ${f1(H * 0.74)} ${f1(W * 0.7)} ${f1(H * 0.68)} ${W} ${f1(H * 0.6)}V${H}H0Z`;
    let body;
    if (L.tint) {
      // anodised: the metal's colour runs across it; the band and shade are light and dark laid over
      const g = uid('ctint');
      body = `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0.6">${L.tint.map((c, i) => `<stop offset="${f1(i / (L.tint.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>
        <rect width="${W}" height="${H}" fill="url(#${g})"/><path d="${band}" fill="#fff" opacity="0.28"/><path d="${low}" fill="#140a40" opacity="0.28"/>`;
    } else {
      body = `<rect width="${W}" height="${H}" fill="${L.base}"/><path d="${band}" fill="${L.lit}"/><path d="${low}" fill="${L.shade}"/>`;
    }
    if (L.face === 'grain') {
      // wood's grain or stone's layers: a few wavy lines across, and a knot
      const r = rng(W * 7 + (L.knot ? 1 : 2));
      for (const y0 of L.strata ? [11, 19, 27, 34] : [8, 14, 21, 27, 33]) {
        const amp = L.strata ? 1.2 : 1.6, ph = r() * 6;
        const pts = [];
        for (let i = 0; i <= 12; i++) { const x = (i / 12) * W; pts.push(`${f1(x)} ${f1(y0 + amp * Math.sin(x / (L.strata ? 14 : 9) + ph))}`); }
        body += `<path d="M${pts.join('L')}" fill="none" stroke="${L.grain}" stroke-width="${L.strata ? 1.8 : 1.2}" stroke-linecap="round" opacity="${L.strata ? 0.35 : 0.45}"/>`;
      }
      if (L.knot) body += `<ellipse cx="${f1(W * 0.74)}" cy="25" rx="4.5" ry="2.4" fill="${L.shade}" stroke="${L.grain}" stroke-width="1.2" opacity="0.8"/>`;
    }
    if (L.line !== false && L.hi) body += `<path d="${edge}" fill="none" stroke="${L.hi}" stroke-width="1.6" opacity="0.6"/>`;
    return svgOf(body + shineArc(L.arc ?? 0.85)) + shine;
  }

  if (L.face === 'cut') {
    const { bevel: B, table: T } = stepCut(W);
    const b = L.base, d = L.deep;
    const [tL, tR, lf, rt, bL, bR, ta, tb] = L.tones || [lift(b, 0.42), lift(b, 0.3), lift(b, 0.18), sink(b, d, 0.28), sink(b, d, 0.32), sink(b, d, 0.44), b, sink(b, d, 0.12)];
    const svg = svgOf(poly(B.topL, tL) + poly(B.topR, tR) + poly(B.left, lf) + poly(B.right, rt) + poly(B.botL, bL) + poly(B.botR, bR) + poly(T.a, ta) + poly(T.b, tb) + shineArc(0.7));
    // the light runs across the facets left to right, one after another
    const fx = flash(B.left, 0, 0.45) + flash(B.topL, 0.25, 0.55) + flash(T.a, 0.5, 0.35) + flash(T.b, 0.8, 0.35) + flash(B.topR, 1.05, 0.5) + flash(B.right, 1.3, 0.4);
    return svg + fx + shine;
  }

  if (L.face === 'brilliant') {
    const { table: T, star: St, corner: C } = brilliant(W);
    // lit from the upper left: each corner's three facets in its own tones, the light ones toward the light
    const tones = L.base ? gemTones(L.base, L.deep) : DIAMOND_TONES;
    let body = '';
    for (const [corner, tris] of Object.entries(C)) tris.forEach((t, i) => { body += poly(t, tones[corner][i]); });
    body += poly(St.top, tones.star.top) + poly(St.left, tones.star.left) + poly(St.right, tones.star.right) + poly(St.bottom, tones.star.bottom) + poly(T, tones.table);
    // its fire: a little colour caught in a few facets
    const fire = L.fire || ['#ff9ac4', '#ffe066', '#7fe6ff', '#c9a8ff'];
    body += poly(C.tr[2], fire[0], 0.32) + poly(C.bl[1], fire[1], 0.3) + poly(C.br[0], fire[2], 0.3) + poly(St.right, fire[3], 0.22);
    const svg = svgOf(body + shineArc(0.9));
    const fx = flash(C.tl[1], 0, 0.75) + flash(St.left, 0.3, 0.6, '#ffd1e4') + flash(St.top, 0.6, 0.75) + flash(T, 0.9, 0.45, '#fff4bf')
      + flash(C.tr[1], 1.2, 0.6, '#c8f6ff') + flash(St.right, 1.5, 0.6) + flash(C.br[1], 1.8, 0.55, '#d8ffe9') + flash(St.bottom, 2.1, 0.55, '#ffd1e4');
    return svg + fx + shine;
  }

  if (L.face === 'flow') {
    // a colour that drifts through the chip (a strip repeating every W, sliding by W), with the band and shade
    // laid over it
    const strip = `<i class="cflow" style="width:${2 * W}px;background:linear-gradient(90deg,${L.stops.join(',')});background-size:${W}px 100%"></i>`;
    const band = `M0 0H${W}V${f1(H * 0.3)}C${f1(W * 0.62)} ${f1(H * 0.36)} ${f1(W * 0.32)} ${f1(H * 0.4)} 0 ${f1(H * 0.47)}Z`;
    const low = `M0 ${f1(H * 0.8)}C${f1(W * 0.4)} ${f1(H * 0.74)} ${f1(W * 0.7)} ${f1(H * 0.68)} ${W} ${f1(H * 0.6)}V${H}H0Z`;
    const over = `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${band}" fill="#fff" opacity="${L.dark ? 0.1 : 0.32}"/>
      <path d="${low}" fill="#0c0830" opacity="${L.dark ? 0.35 : 0.16}"/>${shineArc(L.dark ? 0.55 : 0.85)}</svg>`;
    return strip + over + shine + (L.dark ? starsOf(W, 5) : '');
  }

  if (L.face === 'core') {
    // light from the middle outward: white hot in the middle, its colour toward the edges
    const g = uid('ccore');
    const st = L.stops;
    return svgOf(`<radialGradient id="${g}" cx="0.5" cy="0.5" r="0.75">
      ${st.map((c, i) => `<stop offset="${f1([0, 0.3, 0.65, 1][i])}" stop-color="${c}"/>`).join('')}</radialGradient>
      <rect width="${W}" height="${H}" fill="url(#${g})"/>${shineArc(0.6)}`);
  }

  if (L.face === 'hole') {
    // a black hole: a black ground, the disc of hot matter across the middle (its far side behind the dark,
    // its near side in front), a thin ring of light round the dark, and bright clumps riding round the disc
    const [hot, warm, white] = L.disc, cx = W / 2, cy = H / 2 + 1, rx = W * 0.47, ry = 5.2, th = 3.4;
    const g = uid('cdisc');
    const ring = (half) => {
      const pts = [];
      for (let i = 0; i <= 24; i++) { const a = (half === 'back' ? Math.PI : 0) + (i / 24) * Math.PI; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
      const outer = pts.map(([x, y]) => [x, y - th / 2]), inner = pts.slice().reverse().map(([x, y]) => [x, y + th / 2]);
      return [...outer, ...inner];
    };
    const back = ring('back'), front = ring('front');
    const body = `<rect width="${W}" height="${H}" fill="#07050f"/>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hot}"/><stop offset="0.3" stop-color="${warm}"/><stop offset="0.5" stop-color="${white}"/><stop offset="0.7" stop-color="${warm}"/><stop offset="1" stop-color="${hot}"/></linearGradient>
      <path d="M${f1(cx - 15)} ${f1(cy)}A15 15 0 0 1 ${f1(cx + 15)} ${f1(cy)}" fill="none" stroke="${warm}" stroke-width="3" opacity="0.75"/>
      ${poly(back, `url(#${g})`, 0.85)}<circle cx="${f1(cx)}" cy="${f1(cy)}" r="12.5" fill="#000"/>
      <circle cx="${f1(cx)}" cy="${f1(cy)}" r="13.4" fill="none" stroke="${white}" stroke-width="0.9" opacity="0.5"/>
      ${poly(front, `url(#${g})`)}`;
    const clumps = `<i class="cdisc" style="${clipOf(front)}"><i style="width:${2 * W}px;background:radial-gradient(closest-side,${rgba('#ffffff', 0.85)},transparent) 0 0/${f1(W / 3)}px 100% repeat-x"></i></i>`;
    return svgOf(body) + clumps;
  }

  // the sky faces (aurora, nebula, celestial, eclipse, void): a night sky, lighter at the top, waves of light
  // sliding through, stars, and a rim of light
  const [top, low] = L.sky;
  const sky = svgOf(`<rect width="${W}" height="${H}" fill="${top}"/><path d="M0 ${f1(H * 0.62)}C${f1(W * 0.4)} ${f1(H * 0.56)} ${f1(W * 0.7)} ${f1(H * 0.6)} ${W} ${f1(H * 0.54)}V${H}H0Z" fill="${low}"/>`);
  const strip = L.bands ? `<i class="crib" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${ribbons(W, L.bands)}</svg></i>` : '';
  const drift = L.drift ? `<i class="crib far" style="width:${2 * W}px">${starStrip(W, 11, 14, 0.7, 0.6)}</i><i class="crib near" style="width:${2 * W}px">${starStrip(W, 29, 5, 1.2, 0.95)}</i>` : '';
  let lines = '';
  if (L.lines) {
    // a constellation drawn between the stars
    const at = STAR_AT.slice(0, L.stars).map(([x, y]) => [x * W, y]);
    const order = [0, 1, 2, 3, 5, 4];
    lines = `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="M${order.filter(i => at[i]).map(i => `${f1(at[i][0])} ${f1(at[i][1])}`).join('L')}" fill="none" stroke="${L.lines}" stroke-width="0.9" stroke-linejoin="round" opacity="0.55"/></svg>`;
  }
  const stars = starsOf(W, L.stars || 0, L.starC);
  let rim = '';
  if (L.rim) {
    const id2 = uid('crim');
    rim = `<svg class="crim" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><linearGradient id="${id2}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${L.rim[0]}"/><stop offset="0.55" stop-color="${L.rim[1]}"/><stop offset="1" stop-color="${L.rim[2]}"/></linearGradient>
      <rect x="1.2" y="1.2" width="${W - 2.4}" height="${H - 2.4}" rx="12" fill="none" stroke="url(#${id2})" stroke-width="2.4" opacity="${L.rimO ?? 1}"/>${shineArc(0.55)}</svg>`;
  }
  return sky + strip + drift + lines + stars + rim;
}

// Twinkling stars in a sky: fixed places, so a constellation can join them.
const STAR_AT = [[0.14, 8, 1.7, 0], [0.4, 5, 1.3, 1], [0.7, 9, 1.6, 2], [0.88, 24, 1.3, 0.5], [0.28, 30, 1.2, 1.5], [0.56, 33, 1.4, 2.5], [0.08, 20, 1.1, 1.2], [0.8, 34, 1.2, 2.2]];
const starsOf = (W, n, c = '#fff') => STAR_AT.slice(0, n)
  .map(([x, y, s, d]) => `<i class="cst" style="left:${f1(x * W - s)}px;top:${f1(y - s)}px;width:${f1(s * 2)}px;height:${f1(s * 2)}px;--d:${d}s;background:${c}"></i>`).join('');

// The shared extras round the chip, from the table: rays turning behind, motes rising, sparks drawn into the
// middle, rings pulsing in or out, echoes of the chip drifting.
function extras(L, W) {
  let s = '';
  if (L.rays) s += `<i class="crays"><i style="background:repeating-conic-gradient(from 0deg,${rgba(L.rays.c, 0.55)} 0deg 8deg,transparent 8deg 30deg)"></i></i>`;
  if (L.echo) s += L.echo.c.map((c, i) => `<i class="cecho e${i}" style="background:${rgba(c, 0.55)}"></i>`).join('');
  if (L.pulse) s += [0, 1].map(i => `<i class="cpulse${L.pulse.out ? ' out' : ''}" style="--d:${i * 1.5}s;border-color:${L.pulse.c[i % L.pulse.c.length]}"></i>`).join('');
  if (L.motes) s += [[0.1, 0], [0.32, 1.1], [0.55, 0.4], [0.78, 1.8], [0.94, 2.5], [0.22, 2.2]]
    .map(([x, d]) => `<i class="cmote" style="left:${f1(x * W - 2)}px;--d:${d}s;background:${L.motes.c}"></i>`).join('');
  if (L.spiral) s += [0, 120, 240].map((a, i) => `<i class="cspin" style="transform:scaleY(0.42) rotate(${a}deg)"><i style="--d:${i}s"><i style="background:${L.spiral.c}"></i></i></i>`).join('');
  return s;
}
// A glint for round the chip: a four-point star, with a white middle for the prismatic ones.
function spark(s, W) {
  const size = s.r * 2 + 2;
  const g = glint(size / 2, size / 2, s.r, 'currentColor', 1) + (s.core ? glint(size / 2, size / 2, s.r * 0.45, '#fff', 1) : '');
  return `<i class="cs${s.p === 6 ? ' p6' : ''}" style="left:${f1(s.x * W - size / 2)}px;top:${f1(s.y - size / 2)}px;width:${size}px;height:${size}px;--d:${s.d}s;color:${s.c}">
    <svg width="${size}" height="${size}" aria-hidden="true">${g}</svg></i>`;
}

// ---------------------------------------------------------------- cracks and the shatter

// A crack: jagged lines out from where it struck, a few short side twigs. The first strikes up and left of
// the number, the second down and right, so two read as two. The same every time for a width.
const STRIKE = [{ x: 0.24, y: 12, ways: [200, 265, 120, 345] }, { x: 0.77, y: 28, ways: [20, 95, 300, 170] }];
function crackPath(W, k) {
  const r = rng(977 + W * 13 + k * 101), s = STRIKE[k % STRIKE.length];
  const x0 = s.x * W, y0 = s.y;
  let d = '';
  const inside = (x, y) => x > -2 && x < W + 2 && y > -2 && y < H + 2;
  for (const [i, way] of s.ways.entries()) {
    let x = x0, y = y0, a = (way * Math.PI) / 180, steps = i === 3 ? 7 : 4 + Math.floor(r() * 2);
    d += `M${f1(x)} ${f1(y)}`;
    for (let j = 0; j < steps && inside(x, y); j++) {
      a += (r() - 0.5) * 0.9;
      const len = 4 + r() * 3.5;
      x += Math.cos(a) * len * (W / H > 1.6 ? 1.25 : 1);
      y += Math.sin(a) * len;
      d += `L${f1(x)} ${f1(y)}`;
      if (j === 1 && r() < 0.7) {
        const b = a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.5);
        d += `L${f1(x + Math.cos(b) * 4.5)} ${f1(y + Math.sin(b) * 4.5)}M${f1(x)} ${f1(y)}`;
      }
    }
  }
  return d;
}
// drawn lit from the upper left: a dark groove with a light edge just under it
const crackSvg = (W, d, cls = '') => `<svg class="ccrack${cls}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
  <path d="${d}" fill="none" stroke="var(--c-crack-hi)" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round" transform="translate(0.7 0.9)"/>
  <path d="${d}" fill="none" stroke="var(--c-crack)" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

// The pieces a chip breaks into: wedges out from near the middle, each split into an inner and an outer
// piece, covering the whole chip and its edge below (H + 4). The same every time for a width.
function shards(W) {
  const r = rng(4242 + W), HH = H + 4, P = 2 * (W + HH), n = 9;
  const cx = W * (0.46 + r() * 0.08), cy = H * (0.45 + r() * 0.1);
  const at = s => { s = ((s % P) + P) % P; return s < W ? [s, 0] : s < W + HH ? [W, s - W] : s < 2 * W + HH ? [W - (s - W - HH), HH] : [0, HH - (s - 2 * W - HH)]; };
  const corners = [[W, [W, 0]], [W + HH, [W, HH]], [2 * W + HH, [0, HH]], [P, [0, 0]]];
  const ss = Array.from({ length: n }, (_, i) => (i + 0.2 + r() * 0.6) * (P / n));
  const outer = ss.map(at), inner = outer.map(([x, y]) => { const k = 0.38 + r() * 0.16; return [cx + (x - cx) * k, cy + (y - cy) * k]; });
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, s0 = ss[i], s1 = j ? ss[j] : ss[j] + P;
    const between = [];
    for (const [cs, pt] of corners) { if (cs > s0 && cs < s1) between.push(pt); if (cs + P > s0 && cs + P < s1) between.push(pt); }
    pieces.push({ pts: [[cx, cy], inner[i], inner[j]], inner: true });
    pieces.push({ pts: [inner[i], outer[i], ...between, outer[j], inner[j]], inner: false });
  }
  for (const p of pieces) {
    p.c = p.pts.reduce((a, [x, y]) => [a[0] + x / p.pts.length, a[1] + y / p.pts.length], [0, 0]);
    p.spin = (r() - 0.5) * (p.inner ? 160 : 260);
    p.kick = r();
  }
  return { cx, cy, pieces, lines: pieces.filter(p => !p.inner).map(p => `M${f1(p.pts[0][0])} ${f1(p.pts[0][1])}L${f1(p.pts[1][0])} ${f1(p.pts[1][1])}`).join('')
    + `M${inner.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z` };
}

// ---------------------------------------------------------------- the chip and its pips

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Timers go through here, so a film of the chip can run them on its own clock.
const later = (fn, ms) => setTimeout(fn, ms);

// The chip swelling and settling: up quickly, then back down with the app's spring (MOTION.bounce).
function swellFrames(top = 1.26, n = 30) {
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const s = k < 0.2 ? 1 + (top - 1) * easeOut(k / 0.2) : 1 + (top - 1) * (1 - spring((k - 0.2) / 0.8, feel.MOTION.bounce));
    frames.push({ transform: `scale(${s.toFixed(4)})`, offset: k });
  }
  return frames;
}

// Where the burst's bits fly: evenly round, a little uneven, further sideways since the chip is wide.
const BITS = [[0, 40], [41, 31], [76, 44], [117, 35], [156, 42], [198, 30], [236, 45], [279, 34], [318, 39]];

export class Combo {
  // host: where the chip (and its pips) go. count: where it starts. pips: false for a chip alone.
  // still: true or false to decide reduced motion; left out, the system's setting decides.
  // look: a tier to draw whatever the count (the board's films); left out, the count decides.
  constructor(host, { count = 0, pips = true, still = null, look = null } = {}) {
    this.host = host;
    this.opts = { pips, still, look };
    this.n = Math.max(0, count | 0);
    this.cracks = 0;
    this.wide = 0;
    host.insertAdjacentHTML('beforeend', `<div class="combo" aria-label="Right in a row"></div>${pips ? `<div class="cpips">${'<i></i>'.repeat(PIPS)}</div>` : ''}`);
    this.el = host.querySelector('.combo');
    this.pipsEl = host.querySelector('.cpips');
    this.drawn = null;
    this.timers = [];
    this.moments = [];   // for the tests: each tier reached, crack or shatter, newest last
    this.paint();
    if (!this.still()) this.idle(true);
  }

  get count() { return this.n; }
  get look() { return this.opts.look ? BY[this.opts.look] : tierOf(this.n); }
  get tier() { return this.look.id; }
  get shieldsLeft() { return Math.max(0, tierOf(this.n).shields - this.cracks); }
  still() { return this.opts.still ?? reducedMotion(); }

  // Draws a tier by name whatever the count (the board), or back to the count's own with null.
  showLook(id) {
    this.opts.look = id && BY[id] ? id : null;
    this.paint();
    this.idle(!this.still());
  }

  // An answer, by the rule (afterAnswer): right, close or wrong. Shows what it did, and says so:
  // { n, cracks, event } with event 'rise', 'crack', 'shatter' or null.
  answer(how) {
    const out = afterAnswer({ n: this.n, cracks: this.cracks }, how);
    if (out.event === 'crack') this.crack();
    else this.set(out.n, { how: how === 'wrong' ? 'wrong' : how === 'right' ? 'right' : 'close' });
    return { n: this.n, cracks: this.cracks, event: out.event };
  }

  // Shows a new count. how: 'right', 'wrong' or 'close' for the moment that goes with an answer, or nothing
  // to just show it (a chip drawn at a count, a test), which mends any cracks.
  set(n, { how = null } = {}) {
    n = Math.max(0, n | 0);
    const was = this.n, up = rank(n) > rank(was), still = this.still();
    const change = (how === 'right' && up) || (how === 'wrong' && was > 0), moment = change && !still;
    // the chip as it was, before it changes, to fade or break away
    const ghost = moment ? this.snapshot() : null;
    this.n = n;
    if (!how || up || how === 'wrong') this.cracks = 0;
    if (change) this.note(how === 'right' ? 'rise' : 'shatter');
    if (moment) { this.idle(false); clearTimeout(this.idleTimer); }
    this.paint();
    if (still) {
      this.idle(false);
      if (how === 'right' && up) feel.tick();   // the tick isn't motion: it stays
      return;
    }
    if (how === 'right') {
      if (up) this.rise(ghost);
      else feel.pop(this.el, n % PIPS === 0 ? 0.75 : 0.45);
      if (n % PIPS === 0) this.wave();
    } else if (how === 'wrong' && ghost) {
      this.shatter(ghost);
    } else if (!how) {
      this.idle(true);
    }
  }

  note(kind) {
    this.moments.push({ kind, tier: this.tier, n: this.n, cracks: this.cracks, still: this.still() });
    if (this.moments.length > 20) this.moments.shift();
  }

  // Draws the chip for the count: its material (only when the tier or width changes), number, cracks, pips.
  // Its width is the widest it has been: it grows smoothly when the count needs another digit, and never
  // shrinks, so losing it doesn't jump.
  paint() {
    const L = this.look, id = L.id, was = this.wide, W = Math.max(widthFor(this.n), was), key = `${id}:${W}`;
    const el = this.el;
    this.wide = W;
    if (this.drawn !== key) {
      const idle = el.classList.contains('idle');
      el.className = `combo tier-${id}${idle ? ' idle' : ''}`;
      el.style.setProperty('--w', `${W}px`);
      if (was && W > was && !this.still()) el.animate([{ width: `${was}px` }, { width: `${W}px` }], { duration: 320, easing: 'cubic-bezier(.3,.7,.3,1)' });
      el.innerHTML = `${L.glow ? '<i class="cglow"><i></i></i>' : ''}${extras(L, W)}<span class="cbody">${face(L, W)}<span class="ccracks"></span><span class="cnum"><span>×<b></b></span></span></span>`
        + L.sparks.map(s => spark(s, W)).join('')
        + (L.orbit ? `<i class="corbit${L.orbit.fig8 ? ' fig8' : ''}"><i><i class="cos">${spark({ x: 0, y: 0, r: 4.5, d: 0, p: 3, c: L.orbit.c, core: true }, 0)}</i></i></i>` : '');
      this.drawn = key;
      this.drawnCracks = -1;
    }
    if (this.drawnCracks !== this.cracks) this.drawCracks();
    el.classList.toggle('on', this.n > 0);
    el.classList.toggle('still', this.still());
    el.querySelector('.cnum b').textContent = this.n;
    if (this.pipsEl) {
      this.pipsEl.className = `cpips tier-${id}`;
      const filled = this.n === 0 ? 0 : this.n % PIPS || PIPS;
      this.pipsEl.querySelectorAll('i').forEach((p, k) => p.classList.toggle('on', k < filled));
    }
  }

  drawCracks() {
    const W = this.wide;
    let s = '';
    for (let k = 0; k < this.cracks; k++) s += crackSvg(W, crackPath(W, k));
    this.el.querySelector('.ccracks').innerHTML = s;
    this.drawnCracks = this.cracks;
  }

  // The idle motion on or off. Plain has none.
  idle(on) {
    this.el.classList.toggle('idle', !!on && this.tier !== 'plain' && !this.still());
  }

  // A copy of the chip as it looks now (its glow and body, in its tier's colours), to fade or break away.
  // Its number is drawn, not text, so the chip still reads as just the new count.
  snapshot() {
    const g = document.createElement('div');
    g.className = `cghost tier-${this.tier}`;
    g.setAttribute('aria-hidden', 'true');
    for (const part of this.el.querySelectorAll(':scope > .cglow, :scope > .cbody')) g.append(part.cloneNode(true));
    g.querySelectorAll('.cnum').forEach(x => { x.dataset.text = x.textContent; x.textContent = ''; });
    return g;
  }

  // Reaching a tier: the old chip fades as the new one swells and settles, bits of the new colour fly out
  // with a ring, the phone ticks at the swell's height, and the idle motion starts once it has settled. Any
  // cracks go with the old chip: the new tier's shields are whole.
  rise(ghost) {
    const el = this.el;
    if (ghost) {
      // only the old material fades: the new number is already on top of it
      ghost.querySelectorAll('.cnum').forEach(x => x.remove());
      el.append(ghost);
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      this.after(() => ghost.remove(), 200);
    }
    el.animate(swellFrames(), { duration: 760, easing: 'linear' });
    const W = this.wide, colours = this.look.burst;
    const ring = document.createElement('i');
    ring.className = 'cring';
    el.append(ring);
    ring.animate([{ transform: 'scale(1)', opacity: 0.85 }, { transform: 'scale(1.42, 1.6)', opacity: 0 }], { duration: 560, delay: 60, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
    const bits = BITS.map(([deg, dist], i) => {
      const b = document.createElement('i');
      b.className = `cp${i % 2 ? ' g' : ''}`;
      b.style.color = colours[i % colours.length];
      if (i % 2) b.innerHTML = `<svg width="12" height="12" aria-hidden="true">${glint(6, 6, 5.5, 'currentColor', 1)}</svg>`;
      el.append(b);
      const a = (deg * Math.PI) / 180, sx = Math.cos(a) * (W / H) * 0.85, sy = Math.sin(a);
      const from = `translate(${f1(sx * 16)}px, ${f1(sy * 16)}px) scale(0.7)`;
      const to = `translate(${f1(sx * (16 + dist))}px, ${f1(sy * (16 + dist))}px) scale(0.25)`;
      b.animate([{ transform: from, opacity: 1 }, { opacity: 1, offset: 0.35 }, { transform: to, opacity: 0 }],
        { duration: 640, delay: 70, easing: 'cubic-bezier(.15,.75,.35,1)', fill: 'backwards' });
      return b;
    });
    this.after(() => { ring.remove(); bits.forEach(b => b.remove()); }, 800);
    this.after(() => feel.tick(), 150);
    this.idleTimer = later(() => this.idle(true), 820);
  }

  // A miss a shield takes: one more crack across the chip, and the count holds. The chip takes a small
  // knock, the new crack flashes as it opens and two flakes drop from where it struck.
  crack() {
    this.cracks++;
    this.note('crack');
    this.drawCracks();
    feel.sound('crack');
    feel.tick();
    if (this.still()) return;
    const el = this.el, W = this.wide, k = this.cracks - 1, s = STRIKE[k % STRIKE.length];
    el.animate([{ transform: 'none' }, { transform: 'translateX(-2.5px) rotate(-1.4deg)', offset: 0.16 }, { transform: 'translateX(2px) rotate(0.9deg)', offset: 0.4 },
      { transform: 'translateX(-0.8px) rotate(-0.3deg)', offset: 0.68 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
    const fresh = el.querySelector('.ccracks').lastElementChild;
    if (fresh) fresh.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 90, easing: 'ease-out' });
    const shine = document.createElement('span');
    shine.innerHTML = `<svg class="ccrack flash" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${crackPath(W, k)}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    const flashEl = shine.firstElementChild;
    el.querySelector('.ccracks').append(flashEl);
    flashEl.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
    const flakes = [[-9, 22, -70], [7, 26, 110]].map(([dx, dy, spin], i) => {
      const f = document.createElement('i');
      f.className = 'cflake';
      f.style.cssText = `left:${f1(s.x * W - 2.5)}px;top:${f1(s.y - 2.5)}px;background:${this.look.burst[i % this.look.burst.length]}`;
      el.append(f);
      f.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx * 0.6}px,${-4}px) rotate(${spin * 0.3}deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px,${dy}px) rotate(${spin}deg)`, opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.3,0,.8,.6)', fill: 'forwards' });
      return f;
    });
    this.after(() => { flashEl.remove(); flakes.forEach(f => f.remove()); }, 700);
  }

  // Losing it: the old chip cracks right through along where it will break, swells a touch, and bursts:
  // its pieces fly out from the middle, turning and falling as they fade, and plain ×0 comes up under them.
  // The pips empty from the right. The width stays.
  shatter(ghost) {
    const W = this.wide, { cx, cy, pieces, lines } = shards(W), el = this.el;
    ghost.classList.add('falling');
    ghost.querySelectorAll('.ccracks').forEach(c => c.insertAdjacentHTML('beforeend', crackSvg(W, lines, ' through')));
    el.append(ghost);
    ghost.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }], { duration: 90, easing: 'ease-out', fill: 'forwards' });
    const body = el.querySelector(':scope > .cbody');
    body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, delay: 300, easing: 'ease-out', fill: 'backwards' });
    if (this.pipsEl) {
      this.pipsEl.classList.add('drop');
      this.after(() => this.pipsEl && this.pipsEl.classList.remove('drop'), 700);
    }
    this.after(() => {
      feel.sound('shatter');
      feel.tick();
      const from = ghost.querySelector('.cbody');
      if (!from) return;
      const bits = pieces.map((p, i) => {
        const piece = document.createElement('div');
        piece.className = `cshard tier-${ghost.className.match(/tier-([\w-]+)/)[1]}`;
        piece.style.cssText = `${clipOf(p.pts)};transform-origin:${f1(p.c[0])}px ${f1(p.c[1])}px`;
        piece.append(from.cloneNode(true));
        el.append(piece);
        // out from the middle, the outer pieces further, a little lift, then falling as they turn and fade
        const vx = p.c[0] - cx, vy = p.c[1] - cy, len = Math.hypot(vx, vy) || 1;
        const dist = (p.inner ? 10 : 22) + len * 0.55 + p.kick * 12;
        const dx = (vx / len) * dist * 1.15, dy = (vy / len) * dist * 0.7 - 7, fall = 30 + p.kick * 18;
        const frames = [];
        for (let f = 0; f <= 8; f++) {
          const t = f / 8, e = easeOut(t);
          frames.push({ transform: `translate(${f1(dx * e)}px, ${f1(dy * e + fall * t * t)}px) rotate(${f1(p.spin * e)}deg) scale(${f1(1 - 0.22 * t)})`,
            opacity: t < 0.45 ? 1 : f1(1 - (t - 0.45) / 0.55), offset: t });
        }
        piece.animate(frames, { duration: 760 + p.kick * 180, delay: p.inner ? 0 : 15 + (i % 3) * 10, easing: 'linear', fill: 'both' });
        return piece;
      });
      ghost.remove();
      this.after(() => bits.forEach(b => b.remove()), 1000);
    }, 90);
  }

  // Every fifth: the pips ripple, left to right.
  wave() {
    if (!this.pipsEl) return;
    this.pipsEl.querySelectorAll('i').forEach((p, k) => p.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.15, 1.6)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 380, delay: k * 55, easing: 'ease-out' }));
  }

  // Tidying after a moment: these only take away what the moment added, so they're never cancelled early.
  after(fn, ms) {
    const id = later(() => { this.timers = this.timers.filter(t => t !== id); fn(); }, ms);
    this.timers.push(id);
  }

  remove() {
    this.timers.forEach(t => clearTimeout(t));
    clearTimeout(this.idleTimer);
    this.timers = [];
    this.el.remove();
    if (this.pipsEl) this.pipsEl.remove();
    this.pipsEl = null;
  }

  // For the tests: what it shows and whether anything is moving.
  debug() {
    return {
      count: this.n, tier: this.tier, idle: this.el.classList.contains('idle'), still: this.el.classList.contains('still'),
      text: this.el.querySelector(':scope > .cbody .cnum').innerText.trim(), moving: this.el.getAnimations({ subtree: true }).length,
      pips: this.pipsEl ? this.pipsEl.querySelectorAll('i.on').length : null, pipTier: this.pipsEl ? this.pipsEl.className : null,
      bits: this.el.querySelectorAll('.cp').length, ghost: !!this.el.querySelector('.cghost'), shards: this.el.querySelectorAll('.cshard').length,
      cracks: this.cracks, crackLines: this.el.querySelectorAll(':scope > .cbody .ccracks > .ccrack:not(.flash)').length, shields: this.shieldsLeft,
      width: +parseFloat(getComputedStyle(this.el).width).toFixed(1), held: this.wide, last: this.moments.at(-1) || null,
    };
  }
}
