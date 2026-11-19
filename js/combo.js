// The combo, drawn: right answers in a row as a chip with five pips beside it, which comes alive as the run
// grows (ruled 2026-11-18: tiers, not flames; each tier livelier than the last, calmly).
//
// TIERS is the one table: every tier's look, the count that reaches it, and its shields. The 23 the designer
// kept (2026-11-19), low to high above plain: wood, tin, copper, silver, gold, platinum, emerald, sapphire,
// crystal, ruby, diamond, obsidian, opal, titanium, aurora, nebula, celestial, eternal, supernova, eclipse,
// singularity, multiverse, void. The ones they didn't keep are in SPARE, drawn the same way but never reached
// by a count, so one can come back by moving its line (a film can still show one by name, `look`).
//
// Where each starts: the gap to the next tier grows as the run does, three tiers to a step (3, 4, 5, 6, 8,
// 10, 13, 16), so a short review still reaches a few, a long one keeps reaching new ones, and void, at 179 in
// a row, is a rare feat (docs/DECISIONS.md, 2026-11-19, has the curve).
//
// Every material is drawn the app's way: flat tones lit from the upper left (art.js), a highlight band or
// facets, never photographic metal. A tier is a face (how the material is made: metal, grain, step cut,
// cabochon, cluster, princess, brilliant, sky, flow, core, eclipse, hole) with its colours, plus the finish
// and extras it carries. Tiers that are alike differ by more than colour (ruled 2026-11-19): tin is matte and
// dented, copper warm with verdigris at its edges, silver polished with a fine line, gold a raised rim and a
// glow, platinum a mirror with a sharp horizon, titanium brushed with an anodised rainbow edge; the gems are
// each cut their own way and sparkle their own way; obsidian has the ripples of broken glass and opal flecks
// of colour that flash in turn; nebula is clouds where aurora is ribbons; and the far end is a star bursting,
// a sun hidden, a black hole, echoes and nothing. Per tier, it's data; the drawing is shared.
//
// Shields (ruled 2026-11-18, from their idea): each tier protects the combo from one-off mistakes: wood and
// tin none, copper to gold one, platinum and up two. A miss with a shield left cracks the chip (one crack per
// shield used) and the count holds; a miss with none left shatters it, and the count goes back to 0.
// Reaching a new tier refills them (confirmed 2026-11-19); right answers don't mend cracks. Shields only
// protect the count: a missed fact goes back into review the same either way. The rule is afterAnswer,
// below, and nothing else decides it.
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

// Crystal's points: [middle (a share of the width), width, height] from the bottom, back ones first.
const POINTS = [[0.12, 11, 27], [0.86, 12, 31], [0.34, 12, 35], [0.64, 13, 37], [0.5, 10, 24], [0.02, 9, 19], [0.98, 9, 21]];
// a glint on the tip of a few of them
const tipGlints = (ids, cs) => ids.map((k, i) => S(POINTS[k][0], 40 - POINTS[k][2] + 1, 4.5, i * 0.75, 3, cs[i % cs.length]));

// Each tier, lowest first. at: the count that reaches it. shields: misses it forgives. v: its colours for CSS
// (ink, line, plate and glow for the best run elsewhere; edge, number ink and its shadow, pips, burst ring,
// and the glow behind the chip). pips: five pip colours instead of one. crown: the best-combo crown in its
// metal (art.js crown); left out, it's made from v. sample: a count to film it at (left out: the middle of
// its range).
export const TIERS = [
  { id: 'plain', name: 'Plain', at: 0, shields: 0, face: 'plain', burst: ['#aab3ee'], sparks: [],
    v: { ink: '#b4bcef', line: '#3b4390', plate: '#252c62', glow: 'rgba(127,136,200,0.16)', edge: 'var(--line)', cink: 'var(--soft)', cinksh: 'transparent', pip: '#aab3ee', burst: '#aab3ee' },
    crown: { base: '#8e96d0', shade: '#5f67a8', lit: '#bcc3f0', jewel: '#4b5398', shine: '#8d95d6' } },

  // ---- the plain materials: no shields, nothing shines
  // wood: grain and a knot, still
  { id: 'wood', name: 'Wood', at: 3, shields: 0,
    face: 'grain', knot: true, base: '#a8693a', lit: '#c4834f', shade: '#8a5229', grain: '#6e3d1c', burst: ['#d9a06a', '#a8693a'], sparks: [],
    v: { ink: '#d9965c', line: '#6a4022', plate: '#2e2446', glow: 'rgba(200,130,70,0.16)', edge: '#5e3517', cink: '#2e1606', cinksh: 'rgba(255,210,160,0.45)', pip: '#c4834f', burst: '#d9a06a' } },
  // tin: dull and matte, knocked about (a few dents), no shine, nothing moving
  { id: 'tin', name: 'Tin', at: 6, shields: 0,
    face: 'metal', base: '#979eab', lit: '#aab0bc', shade: '#858c99', line: false, arc: 0.28,
    dents: [[0.2, 29, 3.4, 2.4], [0.68, 11, 2.8, 2], [0.86, 30, 2.3, 1.7], [0.45, 34, 1.9, 1.4], [0.08, 12, 1.7, 1.3]],
    burst: ['#c9ced8', '#979eab'], sparks: [],
    v: { ink: '#c3c8d2', line: '#565d74', plate: '#282e5c', glow: 'rgba(200,210,230,0.12)', edge: '#5d6476', cink: '#262b45', cinksh: 'rgba(255,255,255,0.4)', pip: '#a9b0bd', burst: '#c9ced8' } },

  // ---- copper to gold: one shield. The metals, each finished its own way
  // copper: warm, a slow warm sheen, verdigris creeping in at its edges
  { id: 'copper', name: 'Copper', at: 9, shields: 1,
    face: 'metal', base: '#cf6a3c', lit: '#ec8c5c', shade: '#a84e2a', line: false, shine: '#ffc9a8', sp: 6,
    patina: { c: '#3aa88d', lit: '#7fdcc0', seed: 5 },
    burst: ['#f5a882', '#7fdcc0', '#cf6a3c'], sparks: [S(1.01, 31, 4.5, 4, 6, '#ffd0b8')],
    v: { ink: '#f29a74', line: '#7c3e28', plate: '#30244a', glow: 'rgba(240,130,90,0.18)', edge: '#7e3018', cink: '#3a1206', cinksh: 'rgba(255,208,184,0.6)', pip: '#e0805a', burst: '#f5a882' },
    pips: ['#e0805a', '#e0805a', '#e0805a', '#d98a62', '#5fc4a8'],
    crown: { base: '#d4744a', shade: '#9c4a28', lit: '#f2a88a', jewel: '#3aa88d', shine: '#bff5e4' } },
  // silver: polished: a fine bright line along its band and a quick white shine
  { id: 'silver', name: 'Silver', at: 13, shields: 1, face: 'metal', base: '#c4cde4', lit: '#e7edfa', shade: '#99a4c5', hi: '#ffffff', shine: true,
    burst: ['#e7edfa', '#ffffff', '#b4bfdc'], sparks: [S(0.98, 4, 5.5, 2.2, 6, '#fff')],
    v: { ink: '#e2e8f8', line: '#5d6690', plate: '#2a3062', glow: 'rgba(220,230,255,0.18)', edge: '#66709a', cink: '#1f2655', cinksh: 'rgba(255,255,255,0.75)', pip: '#dfe6f7', burst: '#e7edfa' },
    crown: { base: '#c9d2e8', shade: '#8791b6', lit: '#f4f7ff', jewel: '#49c6ff', shine: '#c9f0ff' } },
  // gold: rich, a raised rim like a coin's, a warm glow, two glints
  { id: 'gold', name: 'Gold', at: 17, shields: 1, face: 'metal', base: '#ffc83d', lit: '#ffde7c', shade: '#e8a51a', hi: '#fff4c8', line: false, shine: '#fff4c8', glow: true,
    rim: { lit: '#fff1b0', dark: '#b97a00' },
    burst: ['#ffd75a', '#fff1b8', '#ffb31a'], sparks: [S(-0.03, 5, 6, 1.2, 6, '#fff6d6'), S(1.01, 31, 5, 4.2, 6, '#fff')],
    v: { ink: '#ffc83d', line: '#6b5a2a', plate: '#2c2850', glow: 'rgba(255,200,61,0.2)', edge: '#c98a00', cink: '#2a1650', cinksh: 'rgba(255,244,200,0.75)', pip: '#ffc83d', burst: '#ffd75a', cglow: 'rgba(255,200,61,0.55)' },
    crown: {} },

  // ---- platinum and up: two shields
  // platinum: a cool mirror: the sky above a sharp horizon, the ground below, and a faint rainbow sweep
  { id: 'platinum', name: 'Platinum', at: 21, shields: 2,
    face: 'metal', mirror: ['#ffffff', '#e2e5f6', '#3e4474', '#7a81aa', '#e4e7f6'], base: '#d6d9ee', line: false, shine: 'prism', glow: true,
    burst: ['#ffffff', '#e4e6f8', '#c9f0ff'], sparks: [S(0.86, -5, 5.5, 0.75, 3, '#ffffff'), S(1.07, 27, 4.5, 2.25, 3, '#e8f6ff')],
    v: { ink: '#eef0ff', line: '#6a6f9e', plate: '#2a2e64', glow: 'rgba(230,232,255,0.2)', edge: '#6a71a0', cink: '#22264f', cinksh: 'rgba(255,255,255,0.85)', pip: '#e4e6f8', burst: '#ffffff', cglow: 'rgba(220,225,255,0.45)' } },

  // the gems: each its own cut and its own sparkle
  // emerald: the emerald cut, long steps round a wide table with its corners cut; the light walks slowly
  // along the steps; a few flecks inside (its garden). One soft glint.
  { id: 'emerald', name: 'Emerald', at: 26, shields: 2,
    face: 'step', base: '#2fc47a', deep: '#053d2a', glow: true, burst: ['#9ff5c8', '#e3fff0', '#1fa864'], sparks: [S(0.98, 4, 5, 2, 6, '#c8ffe4')],
    v: { ink: '#7ef0b4', line: '#22805a', plate: '#1d3256', glow: 'rgba(47,196,122,0.24)', edge: '#0e5a38', cink: '#fff', cinksh: '#0b5a36', pip: '#3fd88c', burst: '#9ff5c8', cglow: 'rgba(47,196,122,0.5)' } },
  // sapphire: a cabochon, polished round, with the six-rayed star of a star sapphire gliding over it
  { id: 'sapphire', name: 'Sapphire', at: 31, shields: 2,
    face: 'cab', base: '#3f7cf0', deep: '#0a1a66', star: '#eaf1ff', glow: true, burst: ['#a9c8ff', '#e6efff', '#2f5fd0'], sparks: [],
    v: { ink: '#8fb6ff', line: '#2a4fa0', plate: '#1d2c66', glow: 'rgba(63,124,240,0.26)', edge: '#1a3a9a', cink: '#fff', cinksh: '#0d2a7a', pip: '#5a90ff', burst: '#a9c8ff', cglow: 'rgba(63,124,240,0.55)' } },
  // crystal: a cluster of purple points standing up, lit on one side, glints on their tips
  { id: 'crystal', name: 'Crystal', at: 36, shields: 2,
    face: 'cluster', base: '#a67cf5', deep: '#2a0f5e', ground: ['#4a2690', '#1f0c48'], glow: true,
    burst: ['#c9a8ff', '#efe3ff', '#9b6cf0'], sparks: tipGlints([3, 2, 1, 0], ['#efe3ff', '#fff', '#dccbff']),
    v: { ink: '#c9a8ff', line: '#5a3a9a', plate: '#2e2462', glow: 'rgba(166,124,245,0.26)', edge: '#3a1c80', cink: '#fff', cinksh: '#3a1490', pip: '#b48cff', burst: '#c9a8ff', cglow: 'rgba(166,124,245,0.55)' },
    crown: { base: '#a67cf5', shade: '#6f43c9', lit: '#d9c6ff', jewel: '#ff9ab8', shine: '#ffe3ec' } },
  // ruby: the princess cut, rings of facets closing on the middle (a cross of chevrons), lit ring by ring,
  // with an ember glowing deep inside
  { id: 'ruby', name: 'Ruby', at: 42, shields: 2,
    face: 'princess', base: '#de2c55', deep: '#4a0418', ember: '#ff8a3a', fire: ['#ffd1e4', '#ffb04d'], glow: true,
    burst: ['#ff9ab0', '#ffd1e4', '#e8335a', '#ffb04d'], sparks: [S(-0.04, 6, 5, 0.4, 3, '#ffd1e4'), S(1.04, 30, 4.5, 1.9, 3, '#ffe0a0')],
    v: { ink: '#ff8fa8', line: '#8a2a44', plate: '#30224e', glow: 'rgba(232,51,90,0.24)', edge: '#7a0e28', cink: '#fff', cinksh: '#5a0418', pip: '#f04a70', burst: '#ff9ab0', cglow: 'rgba(240,60,100,0.5)' } },
  // diamond: the brilliant, a star of facets, rainbow fire, quick sparkles all round
  { id: 'diamond', name: 'Diamond', at: 48, shields: 2, face: 'brilliant', glow: true, shine: 'prism',
    burst: ['#ff6fa3', '#ffcf3d', '#2fd0ff', '#2fe0a0', '#a67cf5'], sparks: fireGlints(['#ff6fa3', '#ffcf3d', '#2fd0ff', '#2fe0a0', '#a67cf5']),
    v: { ink: '#c4f2ff', line: '#3b7aa3', plate: '#1f3062', glow: 'rgba(160,225,255,0.22)', edge: '#4f8fc0', cink: '#163a7a', cinksh: 'rgba(255,255,255,0.9)', pip: '#def6ff', burst: '#c9f1ff', cglow: 'rgba(170,230,255,0.55)' },
    crown: { base: '#d7f1ff', shade: '#8fc6ea', lit: '#ffffff', jewel: '#49c6ff', shine: '#e6fbff' } },

  // the dark stones
  // obsidian: black glass, the curved ripples of where it broke, a violet sheen sweeping
  { id: 'obsidian', name: 'Obsidian', at: 54, shields: 2,
    face: 'metal', base: '#1d1732', lit: '#2c2448', shade: '#110c22', line: false, arc: 0.55, shine: '#b8a8ff', glow: true,
    ripples: { c: '#6a5aa8', at: [0.86, 44] },
    burst: ['#b3a6ff', '#7d6cf0', '#ffffff'], sparks: [S(0.98, 4, 5.5, 0.5, 3, '#c9bfff')],
    crack: ['rgba(0,0,0,0.7)', 'rgba(200,190,255,0.75)'],
    v: { ink: '#b3a6ff', line: '#4a3f80', plate: '#1a163e', glow: 'rgba(140,120,255,0.18)', edge: '#06040f', cink: '#e9e4ff', cinksh: '#000', pip: '#7d6cf0', burst: '#b3a6ff', cglow: 'rgba(120,100,240,0.4)' } },
  // opal: milky, a soft drift of pastel through it, and flecks of bright colour flashing in turn
  { id: 'opal', name: 'Opal', at: 62, shields: 2,
    face: 'flow', stops: ['#eee8fb', '#dcefee', '#f8f6ff', '#f2e2ee', '#e2e8f8', '#eee8fb'], glow: true,
    flecks: ['#ff5fa0', '#2fd0a0', '#4f8fff', '#ffb02a', '#a66cff', '#30c8f0'],
    burst: ['#ffd6e8', '#c9f3ea', '#d3e6ff', '#ffe9b8'], sparks: [S(0.98, 4, 5, 1, 6, '#ffffff')],
    pips: ['#ff8fbf', '#ffc860', '#5fe0b8', '#7fb0ff', '#c09aff'],
    v: { ink: '#e8e6ff', line: '#7a7ab0', plate: '#2a2e66', glow: 'rgba(220,220,255,0.2)', edge: '#8e91be', cink: '#2a2766', cinksh: 'rgba(255,255,255,0.9)', pip: '#ead9ff', burst: '#ffffff', cglow: 'rgba(230,220,255,0.45)' } },
  // titanium: brushed grey, fine lines along it, with the anodised rainbow round its edge
  { id: 'titanium', name: 'Titanium', at: 70, shields: 2,
    face: 'metal', base: '#868da1', lit: '#a0a7b9', shade: '#6e758a', line: false, brushed: true, shine: 'prism', glow: true,
    anodised: ['#3d6ff0', '#8a5ae8', '#e86fb0', '#f0b04a', '#3dc8c0'],
    burst: ['#3d6ff0', '#8a5ae8', '#e86fb0', '#f0b04a'], sparks: [S(-0.04, 30, 4.5, 1.5, 6, '#ffe0a0')],
    pips: ['#3d6ff0', '#6a64ee', '#9a5ae0', '#e06fb0', '#f0b04a'],
    v: { ink: '#b8c0d8', line: '#4a50a0', plate: '#252a66', glow: 'rgba(120,110,240,0.2)', edge: '#3c4258', cink: '#fff', cinksh: '#2a2f45', pip: '#8a7cf0', burst: '#c0b0ff', cglow: 'rgba(130,110,240,0.4)' } },

  // the sky
  // aurora: ribbons of light sliding through a night sky, a spark riding round the rim
  { id: 'aurora', name: 'Aurora', at: 78, shields: 2, face: 'sky', glow: true, orbit: { c: '#d9fff4' },
    sky: ['#221e68', '#191558'], stars: 6, rim: ['#7df0cf', '#a67cf5', '#ff9ab8'],
    bands: [[0.44, 5, 0, 9, 3, '#2bc4a4', 0.72], [0.64, 4, 2.2, 7, 2.5, '#a67cf5', 0.62], [0.34, 5, 0.5, 2.6, 0.8, '#7df0cf', 0.85], [0.74, 3, 3.1, 2.2, 0.6, '#ff9ab8', 0.5]],
    burst: ['#7df0cf', '#2bc4a4', '#a67cf5', '#ff9ab8', '#6fd6ff'], sparks: [S(0.96, -3, 5, 3, 6, '#c8fff0')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(220,255,245,0.75)'], pips: ['#2bc4a4', '#49c6ff', '#7d8cf7', '#a67cf5', '#ee6fa0'],
    v: { ink: '#8ff5d9', line: '#2a8c80', plate: '#1d2a5e', glow: 'rgba(43,196,164,0.24)', edge: '#100d40', cink: '#fff', cinksh: '#120f48', pip: '#2bc4a4', burst: '#7df0cf', cglow: 'rgba(43,196,164,0.55)', cglow2: 'rgba(166,124,245,0.6)' },
    crown: { base: '#2bc4a4', shade: '#6a4cd6', lit: '#9ff7df', jewel: '#a67cf5', shine: '#e3d6ff' } },
  // nebula: soft clouds of pink and blue drifting, thick with stars (no ribbons, no rim spark)
  { id: 'nebula', name: 'Nebula', at: 88, shields: 2,
    face: 'sky', glow: true, sky: ['#2a1252', '#1c0d3e'], stars: 8, rim: ['#ff8fc8', '#c04fd0', '#4f6fe0'], rimO: 0.55,
    clouds: [[0.15, 14, 15, '#e060c0', 0.75], [0.5, 30, 17, '#4f6fe0', 0.7], [0.82, 12, 14, '#ff8fc8', 0.6], [0.35, 4, 10, '#a050e0', 0.6], [0.68, 36, 11, '#c04fd0', 0.55]],
    burst: ['#ff8fc8', '#c04fd0', '#7d8cf7', '#ffd0f0'], sparks: [S(-0.04, 4, 5, 1, 6, '#ffd0f0'), S(1.03, 30, 4.5, 4, 6, '#c8d4ff')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(255,220,250,0.75)'], pips: ['#ff8fc8', '#e070e0', '#b070f0', '#7d8cf7', '#4f9ff0'],
    v: { ink: '#f0a8f0', line: '#7a3a9a', plate: '#24205e', glow: 'rgba(200,90,220,0.24)', edge: '#120a30', cink: '#fff', cinksh: '#1a0c3e', pip: '#d070e0', burst: '#ffb0f0', cglow: 'rgba(200,90,220,0.5)', cglow2: 'rgba(90,120,240,0.5)' } },
  // celestial: deep blue, a gold constellation between gold stars, a gold rim and a gold spark circling
  { id: 'celestial', name: 'Celestial', at: 98, shields: 2,
    face: 'sky', glow: true, sky: ['#13206a', '#0b1446'], stars: 7, starC: '#ffe9a6', lines: '#ffd75a', rim: ['#fff4c8', '#ffc83d', '#ffe08a'], orbit: { c: '#fff1b8' },
    bands: [[0.55, 6, 1, 13, 4, '#2c3c9a', 0.55]],
    burst: ['#ffe9a6', '#ffd75a', '#8fb0ff', '#ffffff'], sparks: [S(0.96, -3, 5, 3, 6, '#fff1b8')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(255,240,200,0.8)'], pips: ['#ffe9a6', '#ffd75a', '#d6c48a', '#8fb0ff', '#5a7cff'],
    v: { ink: '#ffe08a', line: '#7a6a30', plate: '#1a2260', glow: 'rgba(255,220,120,0.22)', edge: '#070c30', cink: '#fff4c8', cinksh: '#0a1240', pip: '#ffd75a', burst: '#ffe9a6', cglow: 'rgba(255,215,110,0.45)', cglow2: 'rgba(80,120,255,0.5)' } },
  // eternal: white gold, pale rays turning behind it, a spark tracing a figure of eight
  { id: 'eternal', name: 'Eternal', at: 108, shields: 2,
    face: 'metal', base: '#fff0cc', lit: '#fffaf0', shade: '#eed39a', line: false, shine: '#fff6d8', glow: true, rays: { c: '#fff2c4' }, orbit: { c: '#fffbe8', fig8: true },
    burst: ['#fffbe8', '#ffe9a6', '#ffffff'], sparks: [],
    v: { ink: '#fff3d0', line: '#8a7a50', plate: '#2c2a5a', glow: 'rgba(255,240,200,0.24)', edge: '#c4a258', cink: '#5a3a0a', cinksh: 'rgba(255,255,255,0.9)', pip: '#ffeab0', burst: '#fffbe8', cglow: 'rgba(255,236,190,0.6)', cglow2: 'rgba(200,220,255,0.5)' } },

  // the far end: a star bursting, a sun hidden, a black hole, echoes, and nothing
  // supernova: white hot in the middle, burning out to red, rings of light pulsing outward
  { id: 'supernova', name: 'Supernova', at: 121, shields: 2,
    face: 'core', stops: ['#ffffff', '#fff2a8', '#ffb040', '#e8463a'], glow: true, pulse: { c: ['#ffb040', '#6fb0ff'], out: true },
    burst: ['#fff2a8', '#ffb040', '#e8463a', '#6fb0ff'], sparks: fourSparkles('#fff2a8', '#ffffff', '#cfe3ff'),
    pips: ['#fff2a8', '#ffd060', '#ffb040', '#f07a3a', '#e8463a'],
    v: { ink: '#ffc070', line: '#8a3a2a', plate: '#2c2050', glow: 'rgba(255,150,80,0.26)', edge: '#9a2a1a', cink: '#4a0a14', cinksh: 'rgba(255,255,255,0.85)', pip: '#ffb040', burst: '#fff2a8', cglow: 'rgba(255,170,80,0.6)', cglow2: 'rgba(90,160,255,0.5)' } },
  // eclipse: a black moon over the sun, its corona round it and a bright bead flaring on its edge
  { id: 'eclipse', name: 'Eclipse', at: 134, shields: 2,
    face: 'eclipse', sky: ['#0d0c22', '#07060f'], corona: ['#fff8e0', '#ffd27a'], glow: true,
    burst: ['#fffbe8', '#ffe08a', '#cfe3ff'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(255,244,210,0.8)'],
    v: { ink: '#fff0c8', line: '#6a6040', plate: '#14143a', glow: 'rgba(255,240,200,0.24)', edge: '#000', cink: '#fff8e0', cinksh: '#000', halo: 'rgba(0,0,0,0.85)', pip: '#fff0c8', burst: '#fffbe8', cglow: 'rgba(255,236,190,0.6)', cglow2: 'rgba(170,200,255,0.5)' } },
  // singularity: a black hole, its glowing disc round a dark middle and sparks spiralling in
  { id: 'singularity', name: 'Singularity', at: 147, shields: 2,
    face: 'hole', disc: ['#7a4cf0', '#d6c8ff', '#ffffff'], glow: true, spiral: { c: '#d6c8ff' }, pulse: { c: ['#8a6cf0', '#8a6cf0'], out: false },
    burst: ['#ffffff', '#d6c8ff', '#8a6cf0'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(214,200,255,0.75)'], pips: ['#f0eaff', '#d6c8ff', '#b49cff', '#8a6cf0', '#5a3ad0'],
    v: { ink: '#d6c8ff', line: '#5a3aa0', plate: '#0e0c24', glow: 'rgba(160,130,255,0.24)', edge: '#000', cink: '#fff', cinksh: '#000', pip: '#b49cff', burst: '#ffffff', cglow: 'rgba(150,120,255,0.5)' } },
  // multiverse: deep indigo with cyan and magenta copies of the chip drifting out of step behind it
  { id: 'multiverse', name: 'Multiverse', at: 163, shields: 2,
    face: 'flow', stops: ['#2a2070', '#3d2c96', '#1f3c94', '#33207e', '#2a2070'], dark: true, echo: { c: ['#2fd0ff', '#ff6fd0'] }, glow: true,
    burst: ['#2fd0ff', '#ff6fd0', '#d0c0ff'], sparks: [S(-0.04, 4, 5, 1, 6, '#9feaff'), S(1.03, 30, 4.5, 4, 6, '#ffb0ea')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(210,230,255,0.75)'], pips: ['#2fd0ff', '#6aa8ff', '#9a80ff', '#d070f0', '#ff6fd0'],
    v: { ink: '#c0b0ff', line: '#4a3aa0', plate: '#221c60', glow: 'rgba(160,120,255,0.22)', edge: '#140f40', cink: '#fff', cinksh: '#140f40', pip: '#9a80ff', burst: '#d0c0ff', cglow: 'rgba(150,110,255,0.45)' } },
  // void: the end of everything: a window into deep space, two layers of stars drifting past, nothing else
  { id: 'void', name: 'Void', at: 179, shields: 2, sample: 190,
    face: 'sky', sky: ['#04051a', '#020310'], stars: 0, drift: true, rim: ['#ffffff', '#ffffff', '#ffffff'], rimO: 0.18,
    burst: ['#ffffff', '#c8d0ff'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(220,226,255,0.6)'],
    v: { ink: '#c8d0ff', line: '#2a2f60', plate: '#05061a', glow: 'rgba(150,160,255,0.1)', edge: '#000', cink: '#fff', cinksh: '#000', pip: '#c8d0ff', burst: '#ffffff' } },
];

// The tiers the designer didn't keep from the board (2026-11-19), drawn by the same parts: never reached by
// a count, kept so one can come back by moving its line into TIERS with an `at`.
export const SPARE = [
  { id: 'clay', name: 'Clay', face: 'metal', base: '#c4694a', lit: '#d98667', shade: '#a14f36', line: false, arc: 0.35, burst: ['#e8977a', '#c4694a'], sparks: [],
    v: { ink: '#e8977a', line: '#6e3a2c', plate: '#2e2448', glow: 'rgba(220,120,90,0.16)', edge: '#7a3824', cink: '#3a140a', cinksh: 'rgba(255,200,180,0.4)', pip: '#cf7656', burst: '#e8977a' } },
  { id: 'stone', name: 'Stone', face: 'grain', strata: true, base: '#8b91a8', lit: '#a7adc1', shade: '#6d738d', grain: '#5a607c', burst: ['#c0c5d6', '#8b91a8'], sparks: [],
    v: { ink: '#b9bfd2', line: '#4e5474', plate: '#262c5c', glow: 'rgba(170,180,210,0.14)', edge: '#4f5470', cink: '#20243e', cinksh: 'rgba(255,255,255,0.4)', pip: '#9aa0b8', burst: '#c0c5d6' } },
  { id: 'bronze', name: 'Bronze', face: 'metal', line: false, base: '#c97a42', lit: '#e69c62', shade: '#a55c2c', hi: '#ffd6ad',
    burst: ['#f2b27a', '#ffd6ad', '#d9874c'], sparks: pairOfGlints('#ffe3c6', '#fff', 1),
    v: { ink: '#f0a46a', line: '#7a4a2c', plate: '#30254c', glow: 'rgba(240,150,90,0.22)', edge: '#7a3c18', cink: '#3d1605', cinksh: 'rgba(255,214,173,0.65)', pip: '#e08d55', burst: '#f2b27a' },
    crown: { base: '#d4844a', shade: '#9c5228', lit: '#f2b88a', jewel: '#ee4b7a', shine: '#ffc2d4' } },
  { id: 'rose', name: 'Rose gold', face: 'metal', base: '#f0a49a', lit: '#ffc4bb', shade: '#d67f78', line: false, shine: true, glow: true, burst: ['#ffc4bb', '#fff0ec', '#e8887e'], sparks: pairOfGlints('#fff0ec', '#fff', 1.2),
    v: { ink: '#ffb8ae', line: '#7a4650', plate: '#30254e', glow: 'rgba(255,170,160,0.2)', edge: '#a8505a', cink: '#4a1430', cinksh: 'rgba(255,240,236,0.7)', pip: '#f7a9a0', burst: '#ffc4bb', cglow: 'rgba(255,160,150,0.5)' } },
  { id: 'jade', name: 'Jade', face: 'flow', stops: ['#2fae7c', '#56d6a0', '#2a9a6e', '#64dcac', '#2fae7c'], glow: true, burst: ['#8ff0c4', '#d6ffe9', '#2fae7c'], sparks: [S(0.98, 4, 5, 1, 6, '#d6ffe9'), S(-0.04, 30, 4.5, 4, 6, '#fff')],
    v: { ink: '#6fe0b0', line: '#2a7a5a', plate: '#1f3458', glow: 'rgba(80,210,150,0.2)', edge: '#1a7350', cink: '#0b3324', cinksh: 'rgba(220,255,236,0.6)', pip: '#4fd39b', burst: '#8ff0c4', cglow: 'rgba(80,210,150,0.5)' } },
  { id: 'legendary', name: 'Legendary', face: 'metal', base: '#ff9a2a', lit: '#ffc060', shade: '#e0700a', line: false, shine: true, glow: true, rays: { c: '#ffcf6a' }, motes: { c: '#ffd27a' },
    burst: ['#ffd27a', '#fff0c0', '#ff9a2a'], sparks: pairOfGlints('#fff0c0', '#fff', 1),
    v: { ink: '#ffb347', line: '#7a4a1a', plate: '#2e2448', glow: 'rgba(255,160,60,0.24)', edge: '#a84a00', cink: '#3a1400', cinksh: 'rgba(255,240,192,0.75)', pip: '#ffa53a', burst: '#ffd27a', cglow: 'rgba(255,160,50,0.6)' } },
  { id: 'prism', name: 'Prism', face: 'flow', stops: ['#ff6fa3', '#ffb04d', '#ffe066', '#7fe08a', '#2fd0ff', '#8a7cf7', '#ff6fa3'], shine: true, glow: true,
    burst: ['#ff6fa3', '#ffcf3d', '#7fe08a', '#2fd0ff', '#a67cf5'], sparks: fireGlints(['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff']),
    pips: ['#ff6fa3', '#ffcf3d', '#7fe08a', '#2fd0ff', '#a67cf5'],
    v: { ink: '#ffd0e8', line: '#7a4a9a', plate: '#2a2462', glow: 'rgba(255,160,220,0.22)', edge: '#5a3aa0', cink: '#1d1450', cinksh: 'rgba(255,255,255,0.8)', pip: '#ff9ac4', burst: '#ffffff', cglow: 'rgba(255,111,163,0.5)', cglow2: 'rgba(47,208,255,0.5)' } },
  { id: 'omnipotent', name: 'Omnipotent', face: 'hole', disc: ['#ff7a2a', '#ffd9a0', '#fff6e0'], glow: true, spiral: { c: '#ffd9a0' },
    burst: ['#ffd9a0', '#ff9a4a', '#ffffff', '#a03a6a'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(255,217,160,0.75)'], pips: ['#ffe0b0', '#ffc070', '#ff9a4a', '#e86a3a', '#a03a6a'],
    v: { ink: '#ffb870', line: '#6a3a20', plate: '#0e0c24', glow: 'rgba(255,150,70,0.24)', edge: '#000', cink: '#fff', cinksh: '#000', pip: '#ff9a4a', burst: '#ffd9a0', cglow: 'rgba(255,140,60,0.55)' } },
].map(t => ({ ...t, at: null, shields: 0 }));

// a count to film each tier at: the middle of its range
TIERS.forEach((t, i) => { t.sample ??= i + 1 < TIERS.length ? Math.floor((t.at + TIERS[i + 1].at) / 2) : t.at + 10; });

const BY = Object.fromEntries([...TIERS, ...SPARE].map(t => [t.id, t]));
// The tiers in use, by how many right in a row reach each (the table is already in order).
export const LADDER = TIERS.slice().sort((a, b) => a.at - b.at);
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
  for (const t of [...TIERS, ...SPARE]) {
    const v = t.v;
    css += `.tier-${t.id}{--tier-ink:${v.ink};--tier-line:${v.line};--tier-plate:${v.plate};--tier-glow:${v.glow};--c-edge:${v.edge};--c-ink:${v.cink};`
      + `--c-ink-sh:${v.cinksh};--c-pip:${v.pip};--c-burst:${v.burst};${v.cglow ? `--c-glow:${v.cglow};` : ''}${v.cglow2 ? `--c-glow2:${v.cglow2};` : ''}${v.halo ? `--c-halo:${v.halo};` : ''}`
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
// bright it gets, as the colour's own opacity (the animation takes the layer from nothing to full); p, its
// period in seconds if not three.
const flash = (pts, d, o = 0.5, c = '#ffffff', p = 0) => `<i class="fx" style="${clipOf(pts)};--d:${f1(d)}s;${p ? `--fp:${p}s;` : ''}background:${rgba(c, o)}"></i>`;
// lighter toward white, or deeper toward the gem's own dark
const lift = (c, k) => mix(c, '#ffffff', k);
const sink = (c, deep, k) => mix(c, deep, k);
// lit (k > 0) or in shade (k < 0), for a facet facing the light by k
const toned = (b, deep, k) => (k >= 0 ? lift(b, 0.5 * Math.min(1, k)) : sink(b, deep, 0.5 * Math.min(1, -k)));

// Nested rings of facets (the emerald's steps, the princess's chevrons): each ring is an inset [x, y, corner
// cut] from the chip's edge; between two rings, a facet along each side, facing out that way. face: how much
// it faces the light at the upper left (1 toward it, -1 away).
function ringPts(W, x, y, c) {
  const R = W - x, B = H - y;
  return c > 0 ? [[x + c, y], [R - c, y], [R, y + c], [R, B - c], [R - c, B], [x + c, B], [x, B - c], [x, y + c]] : [[x, y], [R, y], [R, B], [x, B]];
}
function ringFacets(W, rings) {
  const out = [];
  for (let r = 0; r < rings.length - 1; r++) {
    const P = ringPts(W, ...rings[r]), Q = ringPts(W, ...rings[r + 1]);
    for (let k = 0; k < P.length; k++) {
      const j = (k + 1) % P.length, ex = P[j][0] - P[k][0], ey = P[j][1] - P[k][1], len = Math.hypot(ex, ey);
      if (len < 0.5) continue;
      const pts = [P[k], P[j], Q[j], Q[k]];
      out.push({ pts, ring: r, side: k, face: (ey / len) * -0.55 + (-ex / len) * -0.83, mx: (P[k][0] + P[j][0] + Q[j][0] + Q[k][0]) / 4 });
    }
  }
  return { facets: out, table: ringPts(W, ...rings.at(-1)) };
}

// The brilliant (diamond), seen from above: an eight-sided table, a star facet on each of its long sides
// reaching to the edge, and three facets fanning from each corner.
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
const DIAMOND_TONES = { tl: ['#ffffff', '#f2fbff', '#e6f6ff'], tr: ['#eaf8ff', '#d9f1fe', '#c3e7fb'], br: ['#a6d6f3', '#94cbee', '#b0dcf6'], bl: ['#c9e9fb', '#d6effd', '#bde3f9'],
  star: { top: '#f7fdff', left: '#e2f5ff', right: '#b8e2f9', bottom: '#a9d8f4' }, table: '#e9f7ff' };

// Waves of light (aurora, celestial): bands that repeat every W, drawn 2W wide so the strip can slide by W and
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
// Soft clouds (nebula) on the same kind of strip: [middle x (a share of W), y, radius, colour, opacity].
function cloudsOf(W, clouds) {
  let defs = '', body = '';
  clouds.forEach(([x, y, r, c, o]) => {
    const g = uid('ccl');
    defs += `<radialGradient id="${g}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="0.55" stop-color="${c}" stop-opacity="${f1(o * 0.45)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
    for (const dx of [-W, 0, W, 2 * W]) body += `<ellipse cx="${f1(x * W + dx)}" cy="${y}" rx="${f1(r * 1.5)}" ry="${r}" fill="url(#${g})"/>`;
  });
  return defs + body;
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

// ---- the metals' finishes, laid over the metal

// Dents (tin): each a small hollow, so its upper-left wall is in shade and its lower-right wall catches the light.
const dentsOf = (L, W) => L.dents.map(([x, y, rx, ry]) => {
  const cx = x * W;
  return `<ellipse cx="${f1(cx - 0.6)}" cy="${f1(y - 0.5)}" rx="${rx}" ry="${ry}" fill="${L.shade}" opacity="0.9"/>`
    + `<ellipse cx="${f1(cx + 0.7)}" cy="${f1(y + 0.6)}" rx="${f1(rx * 0.85)}" ry="${f1(ry * 0.85)}" fill="${L.lit}" opacity="0.85"/>`
    + `<ellipse cx="${f1(cx)}" cy="${f1(y)}" rx="${f1(rx * 0.72)}" ry="${f1(ry * 0.72)}" fill="${L.base}"/>`;
}).join('');

// Verdigris (copper): a crust of green-blue along the bottom edge, thicker in the corners, with a few lighter
// flecks, and a patch in the top right corner.
function patinaOf(L, W) {
  const r = rng(L.patina.seed * 31 + W), c = L.patina.c, lit = L.patina.lit;
  const pts = [[0, H]];
  for (let i = 0; i <= 14; i++) {
    const x = (i / 14) * W, corner = Math.max(0, 1 - Math.min(x, W - x) / (W * 0.22));
    pts.push([x, H - 2.6 - 7 * corner * corner - r() * 1.6]);
  }
  pts.push([W, H]);
  let s = poly(pts, c, 0.9);
  const top = [[W - 13 - r() * 3, 0], [W, 0], [W, 9 + r() * 3], [W - 4, 6], [W - 7, 4.5], [W - 10, 2.5]];
  s += poly(top, c, 0.85);
  for (let i = 0; i < 7; i++) {
    const x = r() * W, corner = Math.max(0, 1 - Math.min(x, W - x) / (W * 0.22));
    s += `<circle cx="${f1(x)}" cy="${f1(H - 3 - 6 * corner * corner * r() - r() * 2)}" r="${f1(0.7 + r() * 0.8)}" fill="${lit}" opacity="0.8"/>`;
  }
  s += `<circle cx="${f1(W - 4)}" cy="2.6" r="1" fill="${lit}" opacity="0.8"/>`;
  return s;
}

// A raised rim (gold), like a coin's: lit along its top and left, in shade along its bottom and right, and
// the reverse just inside it, where it drops back to the face.
function rimOf(L, W) {
  const g1 = uid('crim'), g2 = uid('crim');
  return `<linearGradient id="${g1}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${L.rim.lit}"/><stop offset="1" stop-color="${L.rim.dark}"/></linearGradient>
    <linearGradient id="${g2}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${L.rim.dark}"/><stop offset="1" stop-color="${L.rim.lit}"/></linearGradient>
    <rect x="2.4" y="2.4" width="${W - 4.8}" height="${H - 4.8}" rx="10.5" fill="none" stroke="url(#${g1})" stroke-width="2.2" opacity="0.95"/>
    <rect x="4.8" y="4.8" width="${W - 9.6}" height="${H - 9.6}" rx="8.5" fill="none" stroke="url(#${g2})" stroke-width="1" opacity="0.7"/>`;
}

// A mirror (platinum): the sky reflected above a sharp horizon, the ground below getting lighter toward the
// bottom. [top, above the horizon, the horizon's dark, below it, the bottom].
function mirrorOf(L, W) {
  const g = uid('cmir'), [a, b, c, d, e] = L.mirror;
  return `<linearGradient id="${g}" x1="0" y1="0" x2="0.12" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.47" stop-color="${b}"/>
    <stop offset="0.48" stop-color="${c}"/><stop offset="0.6" stop-color="${d}"/><stop offset="1" stop-color="${e}"/></linearGradient>
    <rect width="${W}" height="${H}" fill="url(#${g})"/>
    <path d="M0 ${f1(H * 0.5)}C${f1(W * 0.3)} ${f1(H * 0.47)} ${f1(W * 0.6)} ${f1(H * 0.52)} ${W} ${f1(H * 0.46)}" fill="none" stroke="#ffffff" stroke-width="0.9" opacity="0.7"/>`;
}

// Brushed (titanium): fine lines along it, some lighter and some darker.
function brushedOf(W) {
  const r = rng(73 + W);
  let s = '';
  for (let y = 2.2; y < H - 1; y += 1.9) {
    const x0 = r() * W * 0.3, x1 = W - r() * W * 0.3;
    s += `<path d="M${f1(x0)} ${f1(y)}H${f1(x1)}" stroke="${r() < 0.5 ? '#ffffff' : '#30364a'}" stroke-width="0.6" opacity="${f1(0.1 + r() * 0.16)}"/>`;
  }
  return s;
}
// the anodised edge (titanium): the rainbow that heat leaves on titanium, round the rim
function anodisedOf(L, W) {
  const g = uid('cano');
  return `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">${L.anodised.map((c, i) => `<stop offset="${f1(i / (L.anodised.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>
    <rect x="1.6" y="1.6" width="${W - 3.2}" height="${H - 3.2}" rx="11.5" fill="none" stroke="url(#${g})" stroke-width="3.2"/>
    <rect x="3.6" y="3.6" width="${W - 7.2}" height="${H - 7.2}" rx="9.5" fill="none" stroke="url(#${g})" stroke-width="0.8" opacity="0.45"/>`;
}

// Ripples (obsidian): the curved lines broken glass leaves, round the place it broke from, each a light
// edge over a dark groove.
const ripplesOf = (L, W) => [12, 19, 27, 36, 46, 57].map((r, i) => {
  const cx = L.ripples.at[0] * W, cy = L.ripples.at[1];
  return `<circle cx="${f1(cx)}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="1.4" opacity="0.35"/>`
    + `<circle cx="${f1(cx - 0.6)}" cy="${cy - 0.8}" r="${r}" fill="none" stroke="${L.ripples.c}" stroke-width="0.9" opacity="${f1(0.75 - i * 0.08)}"/>`;
}).join('');

// The chip's insides for a tier at width W: the static material (one SVG), and the layers that move over it.
function face(L, W) {
  const svgOf = body => `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body}</svg>`;
  const tinted = typeof L.shine === 'string' && L.shine !== 'prism';
  const shine = L.shine ? `<i class="cshine${L.shine === 'prism' ? ' prism' : ''}" style="${tinted ? `--sh:${rgba(L.shine, 0.6)};--sh2:${rgba(L.shine, 0.35)};` : ''}${L.sp ? `--sp:${L.sp}s` : ''}"></i>` : '';
  const band = `M0 0H${W}V${f1(H * 0.3)}C${f1(W * 0.62)} ${f1(H * 0.36)} ${f1(W * 0.32)} ${f1(H * 0.4)} 0 ${f1(H * 0.47)}Z`;
  const low = `M0 ${f1(H * 0.8)}C${f1(W * 0.4)} ${f1(H * 0.74)} ${f1(W * 0.7)} ${f1(H * 0.68)} ${W} ${f1(H * 0.6)}V${H}H0Z`;
  if (L.face === 'plain') return svgOf(`<rect width="${W}" height="${H}" fill="#222a60"/>`);

  if (L.face === 'metal' || L.face === 'grain') {
    // a lit band across the top, a shade along the bottom (and on some, a fine bright line on the band's edge),
    // then the tier's own finish over it
    const edge = `M0 ${f1(H * 0.47 + 1.4)}C${f1(W * 0.32)} ${f1(H * 0.4 + 1.4)} ${f1(W * 0.62)} ${f1(H * 0.36 + 1.4)} ${W} ${f1(H * 0.3 + 1.4)}`;
    let body = L.mirror ? mirrorOf(L, W) : `<rect width="${W}" height="${H}" fill="${L.base}"/><path d="${band}" fill="${L.lit}"/><path d="${low}" fill="${L.shade}"/>`;
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
    if (L.brushed) body += brushedOf(W);
    if (L.dents) body += dentsOf(L, W);
    if (L.ripples) body += ripplesOf(L, W);
    if (L.patina) body += patinaOf(L, W);
    if (L.line !== false && L.hi) body += `<path d="${edge}" fill="none" stroke="${L.hi}" stroke-width="1.6" opacity="0.6"/>`;
    if (L.rim) body += rimOf(L, W);
    if (L.anodised) body += anodisedOf(L, W);
    return svgOf(body + shineArc(L.arc ?? 0.85)) + shine;
  }

  if (L.face === 'step') {
    // the emerald cut: long steps round a wide table, its corners cut; the light walks along the steps from
    // left to right, slowly; a few flecks in the table
    const b = L.base, d = L.deep;
    const { facets, table } = ringFacets(W, [[0, 0, 8], [4.5, 3.5, 6.5], [9, 7, 5]]);
    let body = `<rect width="${W}" height="${H}" fill="${sink(b, d, 0.3)}"/>`;
    for (const f of facets) body += poly(f.pts, toned(b, d, f.face * (1 - 0.3 * f.ring) - 0.08 * f.ring));
    body += poly(table, lift(b, 0.06));
    // a long reflection across the table, and its garden
    const [tx0, ty0] = table[7], [tx1] = table[2], ty1 = table[4][1];
    body += poly([[tx0 + (tx1 - tx0) * 0.18, ty0 - 5], [tx0 + (tx1 - tx0) * 0.34, ty0 - 5], [tx0 + (tx1 - tx0) * 0.2, ty1 + 5], [tx0 + (tx1 - tx0) * 0.04, ty1 + 5]], lift(b, 0.3), 0.6);
    const r = rng(17 + W);
    for (let i = 0; i < 4; i++) body += `<circle cx="${f1(tx0 + 3 + r() * (tx1 - tx0 - 6))}" cy="${f1(ty0 + r() * (ty1 - ty0))}" r="${f1(0.5 + r() * 0.6)}" fill="${sink(b, d, 0.6)}" opacity="0.7"/>`;
    const fx = facets.filter(f => f.ring === 0 || f.side % 2 === 0).map(f => flash(f.pts, 0.2 + 1.8 * (f.mx / W) + f.ring * 0.15, 0.42, '#eafff4', 6)).join('');
    return svgOf(body + shineArc(0.6)) + fx + shine;
  }

  if (L.face === 'princess') {
    // the princess cut: rings of facets closing on the middle, so the corners make a cross of chevrons,
    // light and dark by turns; an ember glows deep inside; the light runs ring by ring, inward
    const b = L.base, d = L.deep;
    const { facets, table } = ringFacets(W, [[0, 0, 0], [W * 0.12, 4.6, 0], [W * 0.24, 9.2, 0], [W * 0.36, 13.8, 0]]);
    let body = '';
    for (const f of facets) body += poly(f.pts, toned(b, d, f.face * 0.85 + (f.ring % 2 ? -0.3 : 0.12)));
    body += poly(table, lift(b, 0.18));
    const fire = L.fire || [];
    if (fire[0]) body += poly(facets.find(f => f.ring === 1 && f.side === 1).pts, fire[0], 0.3);
    if (fire[1]) body += poly(facets.find(f => f.ring === 2 && f.side === 3).pts, fire[1], 0.3);
    const ember = `<i class="cember" style="background:radial-gradient(closest-side, ${rgba(L.ember, 0.75)}, ${rgba(L.ember, 0.25)} 55%, transparent)"></i>`;
    const fx = facets.map(f => flash(f.pts, f.ring * 0.45 + f.side * 0.1, f.side < 1 || f.side === 3 ? 0.5 : 0.3, '#ffe1ea')).join('');
    return svgOf(body + shineArc(0.7)) + ember + fx + shine;
  }

  if (L.face === 'cab') {
    // a cabochon: a polished dome, lit at the upper left and deep at its edges, with the six-rayed star of a
    // star sapphire riding on it and gliding as the light moves
    const g = uid('ccab'), b = L.base, d = L.deep;
    const body = `<radialGradient id="${g}" cx="0.42" cy="0.36" r="0.75"><stop offset="0" stop-color="${lift(b, 0.28)}"/><stop offset="0.45" stop-color="${b}"/>
      <stop offset="0.85" stop-color="${sink(b, d, 0.55)}"/><stop offset="1" stop-color="${d}"/></radialGradient>
      <rect width="${W}" height="${H}" fill="url(#${g})"/>
      <ellipse cx="${f1(W * 0.32)}" cy="9" rx="${f1(W * 0.2)}" ry="4.2" fill="#ffffff" opacity="0.28"/>`;
    // the star: three rays crossing, each a thin lens of light, and a soft middle
    const cx = W / 2, cy = H * 0.46, ray = (deg, len) => {
      const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), w = 1.1;
      return poly([[cx - ux * len, cy - uy * len], [cx - uy * w, cy + ux * w], [cx + ux * len, cy + uy * len], [cx + uy * w, cy - ux * w]], L.star, 0.75);
    };
    const star = `<i class="cstar"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <radialGradient id="${g}s"><stop offset="0" stop-color="${L.star}" stop-opacity="0.9"/><stop offset="1" stop-color="${L.star}" stop-opacity="0"/></radialGradient>
      ${ray(0, W * 0.5)}${ray(60, 22)}${ray(120, 22)}<circle cx="${f1(cx)}" cy="${f1(cy)}" r="6" fill="url(#${g}s)"/></svg></i>`;
    return svgOf(body + shineArc(0.8)) + star + shine;
  }

  if (L.face === 'cluster') {
    // a cluster of crystal points standing up from the bottom, each lit on its left side and in shade on its
    // right, a bright line up its ridge; the light runs from point to point
    const b = L.base, d = L.deep, g = uid('cclu');
    let body = `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.ground[0]}"/><stop offset="1" stop-color="${L.ground[1]}"/></linearGradient>
      <rect width="${W}" height="${H}" fill="url(#${g})"/>`;
    let fx = '';
    POINTS.forEach(([xs, w, h], i) => {
      const x = xs * W, top = H - h, tip = top + w * 0.75, foot = H + 2, back = i < 2 ? 0.25 : 0;
      const left = [[x - w / 2, foot], [x - w / 2, tip], [x, top], [x, foot]], right = [[x, foot], [x, top], [x + w / 2, tip], [x + w / 2, foot]];
      body += poly(left, back ? sink(b, d, 0.12) : lift(b, 0.2)) + poly(right, sink(b, d, 0.35 + back))
        + poly([[x - w / 2, tip], [x, top], [x, tip + 2]], lift(b, 0.45), 0.8)
        + `<path d="M${f1(x)} ${f1(top + 0.5)}V${foot}" stroke="#fff" stroke-width="0.7" opacity="0.45"/>`;
      fx += flash(left, i * 0.4, 0.45, '#f3eaff');
    });
    return svgOf(body + shineArc(0.55)) + fx + shine;
  }

  if (L.face === 'brilliant') {
    const { table: T, star: St, corner: C } = brilliant(W);
    // lit from the upper left: each corner's three facets in its own tones, the light ones toward the light
    const tones = DIAMOND_TONES;
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
    // laid over it; opal's flecks of colour over that, each flashing in turn
    const strip = `<i class="cflow" style="width:${2 * W}px;background:linear-gradient(90deg,${L.stops.join(',')});background-size:${W}px 100%"></i>`;
    let flecks = '', fx = '';
    if (L.flecks) {
      const r = rng(907 + W), n = Math.round(W / 4.5);
      for (let i = 0; i < n; i++) {
        const cx = 3 + r() * (W - 6), cy = 4 + r() * (H - 8), s = 2.2 + r() * 2.4, sides = 3 + Math.floor(r() * 2), a0 = r() * 6;
        const pts = Array.from({ length: sides }, (_, k) => { const a = a0 + (k / sides) * Math.PI * 2, rr = s * (0.7 + r() * 0.5); return [cx + Math.cos(a) * rr * 1.2, cy + Math.sin(a) * rr]; });
        const c = L.flecks[i % L.flecks.length];
        flecks += poly(pts, c, 0.32);
        fx += flash(pts, (i * 0.37) % 3, 0.85, c);
      }
    }
    const over = `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${flecks}<path d="${band}" fill="#fff" opacity="${L.dark ? 0.1 : 0.32}"/>
      <path d="${low}" fill="#0c0830" opacity="${L.dark ? 0.35 : 0.14}"/>${shineArc(L.dark ? 0.55 : 0.85)}</svg>`;
    return strip + over + fx + shine + (L.dark ? starsOf(W, 5) : '');
  }

  if (L.face === 'core') {
    // light from the middle outward: white hot in the middle, its colour toward the edges
    const g = uid('ccore');
    const st = L.stops;
    return svgOf(`<radialGradient id="${g}" cx="0.5" cy="0.5" r="0.75">
      ${st.map((c, i) => `<stop offset="${f1([0, 0.3, 0.65, 1][i])}" stop-color="${c}"/>`).join('')}</radialGradient>
      <rect width="${W}" height="${H}" fill="url(#${g})"/>${shineArc(0.6)}`);
  }

  if (L.face === 'eclipse') {
    // the sun hidden: a dark sky, the corona round a black moon, a thin bright edge, and the bead of light
    // where the sun peeks past it (the diamond ring), flaring and fading
    const [top, low2] = L.sky, cx = W / 2, cy = H / 2, R = 12.5, g = uid('ccor');
    const body = `<rect width="${W}" height="${H}" fill="${top}"/><path d="M0 ${f1(H * 0.62)}C${f1(W * 0.4)} ${f1(H * 0.56)} ${f1(W * 0.7)} ${f1(H * 0.6)} ${W} ${f1(H * 0.54)}V${H}H0Z" fill="${low2}"/>
      <radialGradient id="${g}" r="0.5"><stop offset="0.55" stop-color="${L.corona[0]}" stop-opacity="0.95"/><stop offset="0.7" stop-color="${L.corona[1]}" stop-opacity="0.45"/><stop offset="1" stop-color="${L.corona[1]}" stop-opacity="0"/></radialGradient>
      <ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(R * 2.1)}" ry="${f1(R * 1.75)}" fill="url(#${g})"/>
      ${[0, 50, 140, 215, 300].map(a => { const t = (a * Math.PI) / 180; return `<path d="M${f1(cx + Math.cos(t) * R * 1.1)} ${f1(cy + Math.sin(t) * R * 1.1)}L${f1(cx + Math.cos(t) * R * 1.75)} ${f1(cy + Math.sin(t) * R * 1.55)}" stroke="${L.corona[0]}" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/>`; }).join('')}
      <circle cx="${f1(cx)}" cy="${f1(cy)}" r="${R}" fill="#05040c"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${R + 0.4}" fill="none" stroke="${L.corona[0]}" stroke-width="0.9" opacity="0.9"/>`;
    const t = (-38 * Math.PI) / 180, bx = cx + Math.cos(t) * (R + 0.4), by = cy + Math.sin(t) * (R + 0.4);
    const bead = `<i class="cst bead" style="left:${f1(bx - 4)}px;top:${f1(by - 4)}px;width:8px;height:8px;--d:0s;background:radial-gradient(closest-side,#fff,${rgba(L.corona[0], 0.8)} 45%,transparent)"></i>`;
    return svgOf(body) + bead;
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

  // the sky faces (aurora, nebula, celestial, void): a night sky, lighter at the top, waves of light or clouds
  // sliding through, stars, and a rim of light
  const [top, lowC] = L.sky;
  const sky = svgOf(`<rect width="${W}" height="${H}" fill="${top}"/><path d="M0 ${f1(H * 0.62)}C${f1(W * 0.4)} ${f1(H * 0.56)} ${f1(W * 0.7)} ${f1(H * 0.6)} ${W} ${f1(H * 0.54)}V${H}H0Z" fill="${lowC}"/>`);
  const strip = L.bands ? `<i class="crib" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${ribbons(W, L.bands)}</svg></i>` : '';
  const clouds = L.clouds ? `<i class="crib slow" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${cloudsOf(W, L.clouds)}</svg></i>` : '';
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
  return sky + clouds + strip + drift + lines + stars + rim;
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
