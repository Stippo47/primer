// The combo, drawn: right answers in a row as a chip with five pips beside it, which comes alive as the run
// grows (ruled 2026-11-18: tiers, not flames; each tier livelier than the last, calmly).
//
// TIERS is the one table: every tier's look, the count that reaches it, and its shields. The 23 the designer
// kept (2026-11-19), less eclipse (taken off 2026-11-20), low to high above plain: wood, tin, copper, silver,
// gold, platinum, emerald, sapphire, crystal, ruby, diamond, obsidian, opal, titanium, aurora, nebula,
// celestial, eternal, supernova, singularity, multiverse, void. The ones they didn't keep are in SPARE, drawn the same way but never reached
// by a count, so one can come back by moving its line (a film can still show one by name, `look`).
//
// Where each starts: the gap to the next tier grows as the run does, three tiers to a step (3, 4, 5, 6, 8,
// 10, 13, 16), so a short review still reaches a few, a long one keeps reaching new ones, and void, at 179 in
// a row, is a rare feat (docs/DECISIONS.md, 2026-11-19, has the curve). Eclipse's going left the others'
// starts as they were, so supernova's run is the long one, 121 to 147.
//
// Every material is drawn the app's way: flat tones lit from the upper left (art.js), a highlight band or
// facets, never photographic metal. A tier is a face (how the material is made: metal, grain, gem, an opal's,
// sky, flow, lens, a far-end idea's) with its colours, plus the finish and extras it carries. Tiers that are
// alike differ by more than colour (ruled 2026-11-19): tin is matte and dented, copper warm with verdigris at
// its edges and a green side, silver polished with a fine line, gold a raised rim and a glow, platinum a mirror
// with a sharp horizon and a big twinkle, titanium brushed with a faint anodised rainbow turning round its
// edge; the gems share one look (round two's) and differ by colour and by how their facet lines run; obsidian
// has the ripples of broken glass and a faint oil slick, opal a patchwork of irregular cells over a sliding
// rainbow, each flashing to its own colour as the light rolls across;
// aurora is curtains, nebula clouds with rings round it like an atom's, celestial a gold constellation with
// the sun and moon on an orbit round it, eternal white gold on a turning dial with a clock's hands; and the
// far end is a star throwing off shock fronts of colour one after another, light bent round a point and
// falling into it (its ring crossing in front), timelines branching, and darkness that draws the light in
// (rounds five and six, 2026-11-20). Per tier, it's data; the drawing is shared.
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

// The tiers redone from fresh ideas (2026-11-20): opal a third time (three ideas) and a fourth (two voronoi
// patchworks), supernova (two, then three more), eclipse and multiverse (two each). Every idea is drawn by the same parts as the rest; PICK says which one each tier uses,
// and all of them stay in TRIALS (as `<tier>-<idea>`) for the deck's films and so a pick can be changed by
// changing one word.
const OPAL_PLAY = ['#2fe0a0', '#38c0ff', '#5a7cff', '#a070ff', '#ff5fb8', '#ff9a3a', '#ffd84a', '#6aff7a'];
const ROLL_PLAY = ['#4cf0c0', '#4cc4ff', '#8c84ff', '#ff86d2', '#ffc86a', '#4cf0c0'];
const PALE_OPAL_V = { ink: '#d6e2ff', line: '#5a6a9a', plate: '#20285e', glow: 'rgba(190,210,255,0.2)', edge: '#8a96bc', cink: '#1b2456', cinksh: 'rgba(255,255,255,0.85)', pip: '#c9d6ff', burst: '#ffffff', cglow: 'rgba(170,220,255,0.45)', cglow2: 'rgba(255,150,220,0.42)' };
const CANDIDATES = {
  opal: {
    // harlequin: a light opal whose fire is a mosaic of small diamond-shaped patches, each its own vivid colour,
    // flashing to another as a wave of light crosses the stone, under a milky skin
    harlequin: { face: 'harlequin', body: ['#e4eaf6', '#b6c2dc'], play: OPAL_PLAY, glow: true, shine: true,
      burst: ['#ffd6e8', '#c9f3ea', '#d3e6ff', '#ffe9b8'], sparks: [S(0.98, 4, 5, 1, 3, '#ffffff'), S(-0.04, 30, 4.5, 2.4, 3, '#ffe0f4')],
      pips: ['#ff8fbf', '#ffc860', '#5fe0b8', '#7fb0ff', '#c09aff'], v: PALE_OPAL_V },
    // rolling: a pearly white opal with its colour rolling across it, the way an opal's fire slides over it as
    // it tilts: a soft rainbow sweeping slowly under the milk, a second, fainter one the other way
    rolling: { face: 'rolling', body: ['#f2f5fc', '#c6d0ea'], play: ROLL_PLAY, glow: true,
      burst: ['#ffd6e8', '#c9f3ea', '#d3e6ff', '#ffe9b8'], sparks: [S(0.98, 4, 5, 1, 3, '#ffffff'), S(-0.04, 30, 4.5, 2.4, 3, '#d8fff4')],
      pips: ['#ff8fbf', '#ffc860', '#5fe0b8', '#7fb0ff', '#c09aff'], v: PALE_OPAL_V },
    // boulder: opal in its ironstone: dark brown rock with veins of vivid opal running through it, their colours
    // shifting as the light moves, and a gloss over the polished face
    boulder: { face: 'boulder', rock: ['#6c4632', '#3a2216'], veins: [['#2fe0c0', '#38a8ff', '#5a6cff'], ['#7affa0', '#ff5fd0', '#ffb040']], glow: true, shine: '#ffe8d0',
      burst: ['#7ff0e0', '#5ab0ff', '#ff8fd8', '#ffc870'], sparks: [S(0.98, 4, 5, 1, 3, '#c9fff4')],
      pips: ['#38a8ff', '#2fe0c0', '#7affa0', '#ffb040', '#ff5fd0'],
      v: { ink: '#7ff0e0', line: '#6a4a3a', plate: '#2a2040', glow: 'rgba(60,220,200,0.2)', edge: '#24140a', cink: '#fff', cinksh: '#2a1408', pip: '#38c8d0', burst: '#9ff8ea', cglow: 'rgba(50,210,200,0.45)', cglow2: 'rgba(255,120,210,0.4)' } },
    // round six (rolling picked, "still weird. Maybe try voronoi cells?"): rolling's rainbow under the milk,
    // broken into a patchwork of irregular cells, each flashing to its own colour as the light rolls across;
    // fine: small cells, about 7 px; large: about 13 px
    fine: { face: 'voronoi', cell: 7, body: ['#f2f5fc', '#c6d0ea'], play: OPAL_PLAY, roll: ROLL_PLAY, glow: true, shine: true,
      burst: ['#ffd6e8', '#c9f3ea', '#d3e6ff', '#ffe9b8'], sparks: [S(0.98, 4, 5, 1, 3, '#ffffff'), S(-0.04, 30, 4.5, 2.4, 3, '#d8fff4')],
      pips: ['#ff8fbf', '#ffc860', '#5fe0b8', '#7fb0ff', '#c09aff'], v: PALE_OPAL_V },
    large: { face: 'voronoi', cell: 13, body: ['#f2f5fc', '#c6d0ea'], play: OPAL_PLAY, roll: ROLL_PLAY, glow: true, shine: true,
      burst: ['#ffd6e8', '#c9f3ea', '#d3e6ff', '#ffe9b8'], sparks: [S(0.98, 4, 5, 1, 3, '#ffffff'), S(-0.04, 30, 4.5, 2.4, 3, '#d8fff4')],
      pips: ['#ff8fbf', '#ffc860', '#5fe0b8', '#7fb0ff', '#c09aff'], v: PALE_OPAL_V },
  },
  supernova: {
    // collapse: a star in the dark, slowly shrinking and heating from orange to white, then falling in on itself
    // and bursting: a flash, and a shell of fire racing out past the chip; the star swells back (every 6 s)
    collapse: { face: 'collapse', star: ['#fff7d0', '#ffc050', '#ff6a3a'], hot: '#cfe6ff', shell: ['#ffd27a', '#ff6a3a'], glow: true,
      burst: ['#fff2a8', '#ffb040', '#e8463a', '#cfe6ff'], sparks: [],
      pips: ['#fff2a8', '#ffd060', '#ffb040', '#f07a3a', '#e8463a'],
      v: { ink: '#ffc070', line: '#8a3a2a', plate: '#2c2050', glow: 'rgba(255,150,80,0.26)', edge: '#1a0610', cink: '#fff', cinksh: '#3a0a10', halo: 'rgba(30,6,16,0.7)', pip: '#ffb040', burst: '#fff2a8', cglow: 'rgba(255,150,70,0.6)', cglow2: 'rgba(255,240,200,0.6)' } },
    // pulsar: what a supernova leaves: a glowing cloud of torn red and gold threads round a tiny spinning star,
    // which sweeps two beams of light round like a lighthouse, out past the chip, blinking as they pass
    pulsar: { face: 'pulsar', fil: ['#ff6a4a', '#ffb040', '#ff8ac0', '#ffd27a'], cloud: '#5f8fff', beam: '#d6e8ff', glow: true,
      burst: ['#d6e8ff', '#ffb040', '#ff6a4a', '#ffffff'], sparks: [],
      pips: ['#cfe6ff', '#8fb8ff', '#ffd27a', '#ffb040', '#ff6a4a'],
      v: { ink: '#ffc8a0', line: '#6a3a5a', plate: '#1c1a4a', glow: 'rgba(120,160,255,0.24)', edge: '#06061a', cink: '#fff', cinksh: '#1a0a2a', halo: 'rgba(10,8,30,0.75)', pip: '#ffb040', burst: '#d6e8ff', cglow: 'rgba(100,150,255,0.5)', cglow2: 'rgba(255,140,90,0.5)' } },
    // round six ("supernova still weak. Try 3 styles"), none of them a pulsar or a collapse:
    // shells: shock fronts of the star's layers racing out one after another, each its own colour
    shells: { face: 'shells', shocks: [['#eaf4ff', '#8fc8ff'], ['#fff2b0', '#ffc040'], ['#ffc070', '#ff7a2a'], ['#ff9a7a', '#e8303a']], core: '#cfe6ff', glow: true,
      burst: ['#eaf4ff', '#ffd060', '#ff7a2a', '#e8303a'], sparks: [],
      pips: ['#cfe6ff', '#ffe08a', '#ffc040', '#ff7a2a', '#e8303a'],
      v: { ink: '#ffc890', line: '#7a3a3a', plate: '#22183e', glow: 'rgba(255,160,80,0.26)', edge: '#140616', cink: '#fff', cinksh: '#2a0a14', halo: 'rgba(20,6,20,0.8)', pip: '#ffb040', burst: '#fff2b0', cglow: 'rgba(255,150,70,0.6)', cglow2: 'rgba(140,190,255,0.5)' } },
    // ringneb: a bright core in a tilted ring strung with pearls of light that flare as the core's flash
    // reaches them, a pink and teal haze blooming round it
    ringneb: { face: 'ringneb', ring: ['#fff0f6', '#ff7ab8'], pearl: '#ffe6f2', core: '#bfe0ff', haze: ['#ff6fb0', '#3fd0d8'], glow: true,
      burst: ['#ffffff', '#ff9ac8', '#7fe6f0', '#bfe0ff'], sparks: [],
      pips: ['#bfe0ff', '#9fe8f0', '#ffd0e6', '#ff9ac8', '#ff6fb0'],
      v: { ink: '#ffb8dc', line: '#6a3a7a', plate: '#201648', glow: 'rgba(255,120,190,0.24)', edge: '#0a0620', cink: '#fff', cinksh: '#1a0a2e', halo: 'rgba(12,6,32,0.8)', pip: '#ff8ac0', burst: '#ffe6f2', cglow: 'rgba(255,110,180,0.55)', cglow2: 'rgba(60,210,220,0.5)' } },
    // rays: rays of light bursting out past the chip, debris streaking out along them
    rays: { face: 'rays', sunburst: '#fff4d0', ejecta: ['#ff8a4a', '#ffd060', '#5fe0d0', '#ff6fa8'], core: '#fff2c0', glow: true,
      burst: ['#fff4d0', '#ffd060', '#ff8a4a', '#5fe0d0'], sparks: [],
      pips: ['#fff4d0', '#ffe08a', '#ffc050', '#ff8a4a', '#ff6fa8'],
      v: { ink: '#ffd890', line: '#7a4a3a', plate: '#261a40', glow: 'rgba(255,190,100,0.26)', edge: '#160810', cink: '#fff', cinksh: '#2a0c10', halo: 'rgba(24,8,16,0.8)', pip: '#ffc050', burst: '#fff4d0', cglow: 'rgba(255,180,90,0.6)', cglow2: 'rgba(95,224,208,0.45)' } },
  },
  eclipse: {
    // transit: the moon crossing the sun, whole: the sun alone in a blue sky, a bite, a crescent, and at
    // totality the sky goes dark, the stars come out and the corona shows; a bead of light at each edge as it
    // begins and ends (every 6 s)
    transit: { face: 'transit', day: ['#5a7ae0', '#2c3c9a'], night: ['#0b0a22', '#05050e'], sun: '#fff6d6', corona: ['#fff8e0', '#ffd27a'], glow: true,
      burst: ['#fffbe8', '#ffe08a', '#cfe3ff'], sparks: [],
      crack: ['rgba(0,0,0,0.6)', 'rgba(255,244,210,0.8)'],
      v: { ink: '#fff0c8', line: '#6a6040', plate: '#14143a', glow: 'rgba(255,240,200,0.24)', edge: '#05050e', cink: '#fff8e0', cinksh: '#000', halo: 'rgba(0,0,0,0.8)', pip: '#fff0c8', burst: '#fffbe8', cglow: 'rgba(255,236,190,0.6)', cglow2: 'rgba(120,160,255,0.55)' } },
    // annular: the ring of fire: the moon a little too small to hide the sun, so a blazing ring shows round it,
    // flames licking off its edge, a bright point running round the ring, and a gold halo
    annular: { face: 'annular', fire: ['#fff6c8', '#ffc040', '#ff7a2a'], flame: '#ff5a6a', glow: true,
      burst: ['#fff2a8', '#ffc040', '#ff7a2a', '#ff5a6a'], sparks: [],
      crack: ['rgba(0,0,0,0.6)', 'rgba(255,220,160,0.8)'], pips: ['#fff2a8', '#ffd060', '#ffc040', '#ff9a3a', '#ff5a6a'],
      v: { ink: '#ffd27a', line: '#6a4a30', plate: '#1a1230', glow: 'rgba(255,190,90,0.24)', edge: '#05030c', cink: '#fff6d8', cinksh: '#000', halo: 'rgba(0,0,0,0.85)', pip: '#ffc040', burst: '#fff2a8', cglow: 'rgba(255,170,60,0.6)', cglow2: 'rgba(255,90,110,0.45)' } },
  },
  multiverse: {
    // nested: universes inside universes: frames the chip's shape, each its own colour with its own stars,
    // coming out of the middle and growing past the edge, out round the chip, one after another, endlessly
    nested: { face: 'nested', bg: ['#1c1656', '#0a0828'], frames: ['#2fd0ff', '#ff6fd0', '#ffd060', '#7dffb0'], glow: true,
      burst: ['#2fd0ff', '#ff6fd0', '#d0c0ff', '#ffd060'], sparks: [],
      crack: ['rgba(0,0,0,0.55)', 'rgba(210,230,255,0.75)'], pips: ['#2fd0ff', '#6aa8ff', '#9a80ff', '#d070f0', '#ff6fd0'],
      v: { ink: '#c0b0ff', line: '#4a3aa0', plate: '#221c60', glow: 'rgba(160,120,255,0.22)', edge: '#0a0828', cink: '#fff', cinksh: '#0a0828', halo: 'rgba(10,8,40,0.7)', pip: '#9a80ff', burst: '#d0c0ff', cglow: 'rgba(150,110,255,0.5)', cglow2: 'rgba(47,208,255,0.4)' } },
    // branches: timelines splitting: glowing threads flowing along, branching off one another again and again,
    // each branch taking its own colour, running out past the chip on both sides
    branches: { face: 'branches', bg: ['#181050', '#08061e'], lanes: ['#2fd0ff', '#ff6fd0', '#ffd060', '#7dffb0'], glow: true,
      burst: ['#2fd0ff', '#ff6fd0', '#d0c0ff', '#ffd060'], sparks: [],
      crack: ['rgba(0,0,0,0.55)', 'rgba(210,230,255,0.75)'], pips: ['#2fd0ff', '#6aa8ff', '#9a80ff', '#d070f0', '#ff6fd0'],
      v: { ink: '#c0b0ff', line: '#4a3aa0', plate: '#221c60', glow: 'rgba(160,120,255,0.22)', edge: '#08061e', cink: '#fff', cinksh: '#08061e', halo: 'rgba(8,6,30,0.75)', pip: '#9a80ff', burst: '#d0c0ff', cglow: 'rgba(150,110,255,0.5)', cglow2: 'rgba(255,111,208,0.4)' } },
  },
};
// The idea each redone tier uses (2026-11-20: multiverse their pick, opal and supernova mine from round six's
// ideas; the decks show them all). Eclipse has left the ladder; its ideas stay drawable in TRIALS.
export const PICK = { opal: 'large', supernova: 'shells', multiverse: 'branches' };
const pick = id => CANDIDATES[id][PICK[id]];

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
    v: { ink: '#f29a74', line: '#7c3e28', plate: '#30244a', glow: 'rgba(240,130,90,0.18)', edge: '#2b7a64', cink: '#3a1206', cinksh: 'rgba(255,208,184,0.6)', pip: '#e0805a', burst: '#f5a882' },
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
  // platinum: a cool mirror: the sky above a sharp horizon, the ground below; a clean white sweep, and a big
  // star twinkling on its far corner as the sweep leaves
  { id: 'platinum', name: 'Platinum', at: 21, shields: 2,
    face: 'metal', mirror: ['#ffffff', '#e2e5f6', '#3e4474', '#7a81aa', '#e4e7f6'], base: '#d6d9ee', line: false, shine: true, glow: true,
    burst: ['#ffffff', '#e4e6f8', '#c9f0ff'], sparks: [{ ...S(0.93, 3, 10, 1.25, 3, '#ffffff', true), big: true }, S(-0.03, 33, 4, 2.4, 3, '#e8f6ff')],
    v: { ink: '#eef0ff', line: '#6a6f9e', plate: '#2a2e64', glow: 'rgba(230,232,255,0.2)', edge: '#6a71a0', cink: '#22264f', cinksh: 'rgba(255,255,255,0.85)', pip: '#e4e6f8', burst: '#ffffff', cglow: 'rgba(220,225,255,0.45)' } },

  // the gems: one shared look, round two's, brought back (2026-11-20: "where they were all pretty similar. Just
  // shift how the lines work"): big bright facets lit from the upper left, the light running across them every
  // three seconds, a white sweep, four sparkles circling the chip and a strong glow. Besides colour, what tells
  // them apart is only how the facet lines run (cut, gemCut below).
  // emerald: the step cut, round two's own: a table split along a slant, the steps above and below it split
  // at the middle
  { id: 'emerald', name: 'Emerald', at: 26, shields: 2, face: 'gem', cut: 'step', base: '#2fc47a', deep: '#053d2a', glow: true, shine: true,
    burst: ['#9ff5c8', '#e3fff0', '#1fa864'], sparks: fourSparkles('#c8ffe4'),
    v: { ink: '#7ef0b4', line: '#22805a', plate: '#1d3256', glow: 'rgba(47,196,122,0.24)', edge: '#0e5a38', cink: '#fff', cinksh: '#0b5a36', pip: '#3fd88c', burst: '#9ff5c8', cglow: 'rgba(47,196,122,0.6)' } },
  // sapphire: the cushion: four whole steps round the table, the table crossed corner to corner
  { id: 'sapphire', name: 'Sapphire', at: 31, shields: 2, face: 'gem', cut: 'cross', base: '#3f7cf0', deep: '#0a1a66', glow: true, shine: true,
    burst: ['#a9c8ff', '#e6efff', '#2f5fd0'], sparks: fourSparkles('#d6e4ff'),
    v: { ink: '#8fb6ff', line: '#2a4fa0', plate: '#1d2c66', glow: 'rgba(63,124,240,0.26)', edge: '#1a3a9a', cink: '#fff', cinksh: '#123a99', pip: '#5a90ff', burst: '#a9c8ff', cglow: 'rgba(63,124,240,0.6)' } },
  // crystal: the zigzag: lines zigzagging across the table, the steps above and below it split in three
  { id: 'crystal', name: 'Crystal', at: 36, shields: 2, face: 'gem', cut: 'zigzag', base: '#a97ef4', deep: '#2a0f5e', glow: true, shine: true,
    burst: ['#c9a8ff', '#efe3ff', '#9b6cf0'], sparks: fourSparkles('#efe3ff', '#fff', '#dccbff'),
    v: { ink: '#c9a8ff', line: '#5a3a9a', plate: '#2e2462', glow: 'rgba(166,124,245,0.26)', edge: '#4c2a94', cink: '#fff', cinksh: '#5a2fb0', pip: '#b48cff', burst: '#c9a8ff', cglow: 'rgba(166,124,245,0.6)' },
    crown: { base: '#a67cf5', shade: '#6f43c9', lit: '#d9c6ff', jewel: '#ff9ab8', shine: '#ffe3ec' } },
  // ruby: the rose: facets fanning out like a star from a point in the middle, a ring of them round it
  { id: 'ruby', name: 'Ruby', at: 42, shields: 2, face: 'gem', cut: 'rose', base: '#de2c55', deep: '#4a0418', glow: true, shine: true,
    burst: ['#ff9ab0', '#ffd1e4', '#e8335a', '#ffb04d'], sparks: fourSparkles('#ffd1e4', '#fff', '#ffb0c4'),
    v: { ink: '#ff8fa8', line: '#8a2a44', plate: '#30224e', glow: 'rgba(232,51,90,0.24)', edge: '#8a1430', cink: '#fff', cinksh: '#6a0620', pip: '#f04a70', burst: '#ff9ab0', cglow: 'rgba(240,60,100,0.55)' } },
  // diamond: the brilliant: an eight-sided table, a star facet on each side of it and three fanning from each
  // corner, with a little fire caught in a few; a white sweep (no rainbow, 2026-11-19)
  { id: 'diamond', name: 'Diamond', at: 48, shields: 2, face: 'gem', cut: 'brilliant', base: '#cdeeff', deep: '#3d7cb8', fire: ['#ff9ac4', '#ffe066', '#7fe6ff', '#c9a8ff'], glow: true, shine: true,
    burst: ['#ff6fa3', '#ffcf3d', '#2fd0ff', '#2fe0a0', '#a67cf5'], sparks: fourSparkles('#ffd6ea', '#ffffff', '#c8f6ff'),
    v: { ink: '#c4f2ff', line: '#3b7aa3', plate: '#1f3062', glow: 'rgba(160,225,255,0.22)', edge: '#4f8fc0', cink: '#163a7a', cinksh: 'rgba(255,255,255,0.9)', pip: '#def6ff', burst: '#c9f1ff', cglow: 'rgba(170,230,255,0.55)' },
    crown: { base: '#d7f1ff', shade: '#8fc6ea', lit: '#ffffff', jewel: '#49c6ff', shine: '#e6fbff' } },

  // the dark stones
  // obsidian: black glass, the curved ripples of where it broke, a faint oil-slick sheen of colour drifting
  // over it (2026-11-19), a violet sweep
  { id: 'obsidian', name: 'Obsidian', at: 54, shields: 2,
    face: 'metal', base: '#1d1732', lit: '#2c2448', shade: '#110c22', line: false, arc: 0.55, shine: '#b8a8ff', glow: true,
    ripples: { c: '#6a5aa8', at: [0.86, 44] },
    slick: [[0.3, 6, 0, 11, 4, '#36d6c0', 0.12], [0.56, 7, 2.1, 10, 3, '#9a6cff', 0.14], [0.8, 5, 4.2, 9, 3, '#ffc060', 0.09], [0.44, 4, 1.1, 6, 2, '#ff6fc0', 0.09]],
    burst: ['#b3a6ff', '#7d6cf0', '#ffffff'], sparks: [S(0.98, 4, 5.5, 0.5, 3, '#c9bfff')],
    crack: ['rgba(0,0,0,0.7)', 'rgba(200,190,255,0.75)'],
    v: { ink: '#b3a6ff', line: '#4a3f80', plate: '#1a163e', glow: 'rgba(140,120,255,0.18)', edge: '#06040f', cink: '#e9e4ff', cinksh: '#000', pip: '#7d6cf0', burst: '#b3a6ff', cglow: 'rgba(120,100,240,0.4)' } },
  // opal: a third try (2026-11-20), three ideas drawn (CANDIDATES.opal) and one picked
  { id: 'opal', name: 'Opal', at: 62, shields: 2, ...pick('opal') },
  // titanium: brushed grey, fine lines along it, with the anodised rainbow round its edge, faint, turning
  // slowly round the border
  { id: 'titanium', name: 'Titanium', at: 70, shields: 2,
    face: 'metal', base: '#868da1', lit: '#a0a7b9', shade: '#6e758a', line: false, brushed: true, shine: '#e8ecff', sp: 6, glow: true,
    anodised: ['#3d6ff0', '#8a5ae8', '#e86fb0', '#f0b04a', '#3dc8c0'],
    burst: ['#3d6ff0', '#8a5ae8', '#e86fb0', '#f0b04a'], sparks: [S(-0.04, 30, 4.5, 1.5, 6, '#ffe0a0')],
    pips: ['#3d6ff0', '#6a64ee', '#9a5ae0', '#e06fb0', '#f0b04a'],
    v: { ink: '#b8c0d8', line: '#4a50a0', plate: '#252a66', glow: 'rgba(120,110,240,0.2)', edge: '#3c4258', cink: '#fff', cinksh: '#2a2f45', pip: '#8a7cf0', burst: '#c0b0ff', cglow: 'rgba(130,110,240,0.4)' } },

  // the sky
  // aurora: curtains of light sliding through a night sky, a far layer slow and a near one quicker, a spark
  // riding round the rim
  { id: 'aurora', name: 'Aurora', at: 78, shields: 2, face: 'sky', glow: true, orbit: { c: '#d9fff4' },
    sky: ['#221e68', '#191558'], stars: 6, rim: ['#7df0cf', '#a67cf5', '#ff9ab8'],
    bands: [[0.44, 5, 0, 10, 3, '#2bc4a4', 0.72], [0.64, 4, 2.2, 8, 2.5, '#a67cf5', 0.62]],
    near: [[0.34, 5, 0.5, 3.4, 1.2, '#9ff8de', 0.85], [0.72, 3, 3.1, 2.6, 0.8, '#ffaacb', 0.6], [0.52, 6, 1.6, 7, 3, '#5ff0c8', 0.28]],
    burst: ['#7df0cf', '#2bc4a4', '#a67cf5', '#ff9ab8', '#6fd6ff'], sparks: [S(0.96, -3, 5, 3, 6, '#c8fff0')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(220,255,245,0.75)'], pips: ['#2bc4a4', '#49c6ff', '#7d8cf7', '#a67cf5', '#ee6fa0'],
    v: { ink: '#8ff5d9', line: '#2a8c80', plate: '#1d2a5e', glow: 'rgba(43,196,164,0.24)', edge: '#100d40', cink: '#fff', cinksh: '#120f48', pip: '#2bc4a4', burst: '#7df0cf', cglow: 'rgba(43,196,164,0.6)', cglow2: 'rgba(166,124,245,0.62)' },
    crown: { base: '#2bc4a4', shade: '#6a4cd6', lit: '#9ff7df', jewel: '#a67cf5', shine: '#e3d6ff' } },
  // nebula: glowing clouds of pink and blue drifting, thick with stars, and rings of light round it like an
  // atom's, tilting and shifting, a bright spark running round each (2026-11-19)
  { id: 'nebula', name: 'Nebula', at: 88, shields: 2,
    face: 'sky', glow: true, sky: ['#2a1252', '#1c0d3e'], stars: 8, rim: ['#ff8fc8', '#c04fd0', '#4f6fe0'], rimO: 0.5,
    clouds: [[0.15, 14, 16, '#ff60c8', 0.85], [0.5, 30, 18, '#4f7fff', 0.8], [0.82, 12, 15, '#ff9ad0', 0.7], [0.35, 4, 11, '#b050ff', 0.7], [0.68, 36, 12, '#d04fe0', 0.65], [0.95, 32, 10, '#40c8ff', 0.6]],
    atom: { c: ['#ff9ad8', '#8fd8ff', '#c9a0ff'], e: '#ffffff' },
    burst: ['#ff8fc8', '#c04fd0', '#7d8cf7', '#ffd0f0'], sparks: [],
    crack: ['rgba(0,0,0,0.55)', 'rgba(255,220,250,0.75)'], pips: ['#ff8fc8', '#e070e0', '#b070f0', '#7d8cf7', '#4f9ff0'],
    v: { ink: '#f0a8f0', line: '#7a3a9a', plate: '#24205e', glow: 'rgba(200,90,220,0.24)', edge: '#120a30', cink: '#fff', cinksh: '#1a0c3e', pip: '#d070e0', burst: '#ffb0f0', cglow: 'rgba(210,90,230,0.6)', cglow2: 'rgba(90,140,255,0.6)' } },
  // celestial: deep blue, a gold constellation between gold stars, a shooting star crossing it, a gold rim,
  // and the sun and the moon going round it on one tilted gold orbit, across the front of the chip and round
  // behind it (2026-11-20: its dial went to eternal, "celestial needs something else")
  { id: 'celestial', name: 'Celestial', at: 98, shields: 2,
    face: 'sky', glow: true, sky: ['#13206a', '#0b1446'], stars: 7, starC: '#ffe9a6', lines: '#ffd75a', rim: ['#fff4c8', '#ffc83d', '#ffe08a'],
    bands: [[0.55, 6, 1, 13, 4, '#2c3c9a', 0.55]], shoot: { c: '#fff4c8' }, orrery: { ring: '#ffd75a', sun: '#ffcf4a', moon: '#e4eaff' },
    burst: ['#ffe9a6', '#ffd75a', '#8fb0ff', '#ffffff'], sparks: [S(0.96, -3, 5, 3, 6, '#fff1b8')],
    crack: ['rgba(0,0,0,0.55)', 'rgba(255,240,200,0.8)'], pips: ['#ffe9a6', '#ffd75a', '#d6c48a', '#8fb0ff', '#5a7cff'],
    v: { ink: '#ffe08a', line: '#7a6a30', plate: '#1a2260', glow: 'rgba(255,220,120,0.22)', edge: '#070c30', cink: '#fff4c8', cinksh: '#0a1240', pip: '#ffd75a', burst: '#ffe9a6', cglow: 'rgba(255,215,110,0.5)', cglow2: 'rgba(80,120,255,0.55)' } },
  // eternal: white gold, with the gold dial that was celestial's turning behind it as a clock face, its two
  // hands going round (the long one ticking, the short one sweeping), pale rays behind that, motes of light
  // rising and a spark tracing a figure of eight (2026-11-20: "Eternal should get the disk ... with clock hands")
  { id: 'eternal', name: 'Eternal', at: 108, shields: 2,
    face: 'metal', base: '#fff0cc', lit: '#fffaf0', shade: '#eed39a', line: false, shine: '#fff6d8', glow: true, rays: { c: '#fff2c4', faint: true }, orbit: { c: '#fffbe8', fig8: true },
    wheel: { c: '#ffd75a', hands: '#fff3c4' }, motes: { c: '#fff6d0' },
    burst: ['#fffbe8', '#ffe9a6', '#ffffff'], sparks: [],
    v: { ink: '#fff3d0', line: '#8a7a50', plate: '#2c2a5a', glow: 'rgba(255,240,200,0.24)', edge: '#c4a258', cink: '#5a3a0a', cinksh: 'rgba(255,255,255,0.9)', pip: '#ffeab0', burst: '#fffbe8', cglow: 'rgba(255,236,190,0.7)', cglow2: 'rgba(200,220,255,0.55)' } },

  // the far end: a star's death, space falling into a point, worlds beside ours, and nothing. Supernova and
  // multiverse were redone from fresh ideas (2026-11-20, CANDIDATES); eclipse is gone from the ladder
  // ("won't use eclipse anymore"), and the others kept their starts, so supernova runs from 121 to 147
  { id: 'supernova', name: 'Supernova', at: 121, shields: 2, ...pick('supernova') },
  // singularity: not a black-hole drawing (2026-11-19) but what one does: starlight bent into a ring round
  // the whole chip, bright arcs of lensed stars sliding round it, rings of space flowing inward to a point,
  // sparks spiralling in, and a second, wider ring of bent light round the outside, tilted, its far half
  // behind the chip and its near half across the front of it (2026-11-20)
  { id: 'singularity', name: 'Singularity', at: 147, shields: 2,
    face: 'lens', lens: { ring: ['#ffffff', '#d6c8ff', '#8a6cf0'], fall: ['#b49cff', '#7fd8ff', '#d6c8ff'], arc: '#ffffff' }, glow: true,
    spiral: { c: '#e6dcff' },
    burst: ['#ffffff', '#d6c8ff', '#8a6cf0', '#7fd8ff'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(214,200,255,0.75)'], pips: ['#f0eaff', '#d6c8ff', '#b49cff', '#8a6cf0', '#5a3ad0'],
    v: { ink: '#d6c8ff', line: '#5a3aa0', plate: '#0e0c24', glow: 'rgba(160,130,255,0.24)', edge: '#000', cink: '#fff', cinksh: '#000', halo: 'rgba(10,6,30,0.9)', pip: '#b49cff', burst: '#ffffff', cglow: 'rgba(150,120,255,0.6)', cglow2: 'rgba(100,200,255,0.45)' } },
  { id: 'multiverse', name: 'Multiverse', at: 163, shields: 2, ...pick('multiverse') },
  // void: the end of everything: a hole of deep space with faint far galaxies, its stars falling inward to the
  // middle and going out, darkness spreading round it, and specks of light from all round it falling in too,
  // shrinking and dimming as they go (2026-11-20: going in, not drifting left)
  { id: 'void', name: 'Void', at: 179, shields: 2, sample: 190,
    face: 'sky', sky: ['#04051a', '#020310'], stars: 0, infall: { c: '#e6eaff' }, galaxies: true, rim: ['#ffffff', '#c8d0ff', '#ffffff'], rimO: 0.3,
    abyss: true, debris: { c: ['#c8d0ff', '#ffffff', '#9fb0ff'], in: true },
    burst: ['#ffffff', '#c8d0ff'], sparks: [],
    crack: ['rgba(0,0,0,0.6)', 'rgba(220,226,255,0.6)'],
    v: { ink: '#c8d0ff', line: '#2a2f60', plate: '#05061a', glow: 'rgba(150,160,255,0.1)', edge: '#000', cink: '#fff', cinksh: '#000', halo: 'rgba(170,185,255,0.75)', pip: '#c8d0ff', burst: '#ffffff' } },
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

// Every idea drawn for the tiers redone on 2026-11-20, picked or not, by `<tier>-<idea>`: never reached by a
// count, for the deck's films and so a pick can be changed.
export const TRIALS = Object.entries(CANDIDATES).flatMap(([tier, ideas]) => Object.entries(ideas).map(([idea, look]) =>
  ({ ...look, id: `${tier}-${idea}`, name: `${tier[0].toUpperCase()}${tier.slice(1)} (${idea})`, at: null, shields: 0 })));

// a count to film each tier at: the middle of its range
TIERS.forEach((t, i) => { t.sample ??= i + 1 < TIERS.length ? Math.floor((t.at + TIERS[i + 1].at) / 2) : t.at + 10; });

const BY = Object.fromEntries([...TIERS, ...SPARE, ...TRIALS].map(t => [t.id, t]));
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
  for (const t of [...TIERS, ...SPARE, ...TRIALS]) {
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
// ---- the gems: one look, the facet lines running five ways

// Where a ray from the chip's middle at `deg` meets its edge, measured as if the chip were square (so 45
// degrees is a corner).
function rimAt(W, deg) {
  const t = (deg * Math.PI) / 180, x = Math.cos(t), y = Math.sin(t), s = 1 / Math.max(Math.abs(x), Math.abs(y));
  return [W / 2 + x * s * (W / 2), H / 2 + y * s * (H / 2)];
}
// The chip's edge from one such angle to another, its corners included.
const rimFrom = (W, a, b) => [rimAt(W, a), ...[45, 135, 225, 315, 405].filter(c => c > a && c < b).map(c => rimAt(W, c)), rimAt(W, b)];

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

// A cut's facets on a W x H chip, each [points, how far in it lies: 0 a step at the edge, 1 the table]. The
// table sits 9 px in from the sides, 7 from the top and 10 from the bottom, as in round two.
function gemCut(W, cut) {
  const a = 9, b = 7, c = 10, m = W / 2, cy = (b + H - c) / 2;
  const TL = [0, 0], TR = [W, 0], BR = [W, H], BL = [0, H], tl = [a, b], tr = [W - a, b], br = [W - a, H - c], bl = [a, H - c];
  const along = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const edge = list => list.map(pts => [pts, 0]), table = list => list.map(pts => [pts, 1]);
  if (cut === 'step') {
    // round two's step cut: the steps above and below the table split at the middle, the table along a slant
    const Mt = [m, 0], mt = [m, b], Mb = [m, H], mb = [m, H - c], s0 = [W * 0.4, b], s1 = [W * 0.6, H - c];
    return [...edge([[TL, Mt, mt, tl], [Mt, TR, tr, mt], [TL, tl, bl, BL], [TR, BR, br, tr], [BL, bl, mb, Mb], [Mb, mb, br, BR]]), ...table([[tl, s0, s1, bl], [s0, tr, br, s1]])];
  }
  if (cut === 'cross') {
    // four whole steps, the table crossed corner to corner
    const C = [m, cy];
    return [...edge([[TL, TR, tr, tl], [TR, BR, br, tr], [BR, BL, bl, br], [BL, TL, tl, bl]]), ...table([[tl, tr, C], [tr, br, C], [br, bl, C], [bl, tl, C]])];
  }
  if (cut === 'zigzag') {
    // the steps above and below split in three; a line zigzags across the table, down and up and down
    const top = [0, 1, 2, 3].map(k => along(tl, tr, k / 3)), TOP = [0, 1, 2, 3].map(k => along(TL, TR, k / 3));
    const bot = [0, 1, 2, 3].map(k => along(bl, br, k / 3)), BOT = [0, 1, 2, 3].map(k => along(BL, BR, k / 3));
    const low = [bl, ...[0, 1, 2].map(k => along(bl, br, (k + 0.5) / 3)), br];
    const out = edge([[TL, tl, bl, BL], [TR, BR, br, tr]]);
    for (let k = 0; k < 3; k++) out.push([[TOP[k], TOP[k + 1], top[k + 1], top[k]], 0], [[BOT[k + 1], BOT[k], bot[k], bot[k + 1]], 0]);
    out.push([[top[0], low[1], low[0]], 1]);
    for (let k = 0; k < 3; k++) out.push([[top[k], top[k + 1], low[k + 1]], 1], [[top[k + 1], low[k + 2], low[k + 1]], 1]);
    return out;
  }
  if (cut === 'rose') {
    // a star: six facets meeting at a point in the middle, and a ring of facets fanning from them to the edge
    const C = [m, H / 2], P = [0, 1, 2, 3, 4, 5].map(i => { const t = ((30 + 60 * i) * Math.PI) / 180; return [m + Math.cos(t) * W * 0.21, H / 2 + Math.sin(t) * 8.5]; });
    const out = [];
    for (let i = 0; i < 6; i++) {
      const p = P[i], q = P[(i + 1) % 6], a0 = 30 + 60 * i;
      out.push([[p, ...rimFrom(W, a0, a0 + 30)], 0], [[p, rimAt(W, a0 + 30), q], 0.5], [[q, ...rimFrom(W, a0 + 30, a0 + 60).reverse()], 0]);
    }
    for (let i = 0; i < 6; i++) out.push([[C, P[i], P[(i + 1) % 6]], 1]);
    return out;
  }
  // the brilliant: an eight-sided table, a star facet on each side of it, three fanning from each corner
  const { table: T, star: St, corner: Co } = brilliant(W);
  return [...Object.values(Co).flat().map(t => [t, 0]), ...Object.values(St).map(t => [t, 0.5]), [T, 1]];
}

// The gems' shared look: each facet toned by how much it faces the light at the upper left (the steps at the
// edge strongly, the table gently), a faint lit line along every facet's edge so the cut reads, and the light
// running across the facets left to right every three seconds.
const LIGHT = [-0.55, -0.83];
function gemFace(L, W, c) {
  const b = L.base, d = L.deep, m = W / 2;
  const facets = gemCut(W, L.cut).map(([pts, inn]) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const nx = (cx - m) / m, ny = (cy - H / 2) / (H / 2), len = Math.hypot(nx, ny) || 1;
    return { pts, inn, cx, k: ((nx / len) * LIGHT[0] + (ny / len) * LIGHT[1]) * (1 - 0.65 * inn) + 0.12 * inn };
  });
  const tone = k => (k >= 0 ? lift(b, 0.46 * Math.min(1, k)) : sink(b, d, 0.46 * Math.min(1, -k)));
  let body = facets.map(f => poly(f.pts, tone(f.k))).join('');
  body += facets.map(f => `<path d="${pathOf(f.pts)}" fill="none" stroke="${lift(b, 0.75)}" stroke-width="0.6" stroke-linejoin="round" opacity="0.35"/>`).join('');
  // fire (diamond): a little colour caught in a few facets
  (L.fire || []).forEach((col, i) => { body += poly(facets[[2, 7, 10, 13][i] % facets.length].pts, col, 0.3); });
  let lit = facets.filter(f => f.k > -0.3).sort((p, q) => p.cx - q.cx);
  if (lit.length > 10) lit = lit.filter((_, i) => i % Math.ceil(lit.length / 10) === 0);
  const fx = lit.map(f => flash(f.pts, 1.3 * (f.cx / W) + 0.15 * f.inn, f.k > 0.25 ? 0.55 : 0.38)).join('');
  return c.svgOf(body + shineArc(0.8)) + fx + c.shine;
}

// ---- opal, three ideas (2026-11-20)

const milkVeil = (W, c, o) => {
  const g = uid('cmv');
  return c.svgOf(`<radialGradient id="${g}" cx="0.45" cy="0.42" r="0.75"><stop offset="0.3" stop-color="#ffffff" stop-opacity="${f1(o * 0.25)}"/><stop offset="1" stop-color="#ffffff" stop-opacity="${o}"/></radialGradient>
    <rect width="${W}" height="${H}" fill="url(#${g})"/><path d="${c.band}" fill="#fff" opacity="0.22"/>${shineArc(0.9)}`);
};
const bodyOf = (W, cs, id) => `<linearGradient id="${id}" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${cs[0]}"/><stop offset="1" stop-color="${cs[1]}"/></linearGradient><rect width="${W}" height="${H}" fill="url(#${id})"/>`;

// harlequin: small diamond-shaped patches of colour, every few flashing to another as the light crosses
function harlequinFace(L, W, c) {
  const r = rng(503 + W), P = L.play, hw = 5.5, hh = 4.6;
  let body = bodyOf(W, L.body, uid('chq')), fx = '';
  for (let j = 0; j * hh <= H + hh; j++) {
    for (let x = (j % 2) * hw - hw; x <= W + hw; x += 2 * hw) {
      const y = j * hh, pts = [[x, y - hh], [x + hw, y], [x, y + hh], [x - hw, y]], k = Math.floor(r() * P.length);
      body += poly(pts, P[k], f1(0.75 + r() * 0.25)) + poly([[x, y - hh], [x + hw, y], [x - hw, y]], '#ffffff', 0.16);
      if (r() < 0.3) fx += `<i class="fx play" style="${clipOf(pts)};--d:${f1(1.5 * ((x / W) * 0.7 + (y / H) * 0.3))}s;background:${P[(k + 3 + Math.floor(r() * 3)) % P.length]}"></i>`;
    }
  }
  return c.svgOf(body) + fx + milkVeil(W, c, 0.38) + c.shine;
}

// rolling: a soft rainbow sweeping across under the milk, a fainter one the other way, the milk mottled so the
// colour shows in patches
function rollingFace(L, W, c) {
  const r = rng(77 + W), stops = L.play.map((s, i) => `${s} ${f1((i / (L.play.length - 1)) * 100)}%`).join(','), gm = uid('crm');
  const roll = (cls, o) => `<i class="cskew"><i class="cflow ${cls}" style="width:${3 * W}px;opacity:${o};background:linear-gradient(90deg,${stops});background-size:${W}px 100%"></i></i>`;
  let milk = `<radialGradient id="${gm}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>`;
  for (let i = 0; i < 8; i++) milk += `<ellipse cx="${f1(r() * W)}" cy="${f1(r() * H)}" rx="${f1(7 + r() * 9)}" ry="${f1(4 + r() * 5)}" fill="url(#${gm})" opacity="${f1(0.4 + r() * 0.4)}"/>`;
  return c.svgOf(bodyOf(W, L.body, uid('crl'))) + roll('', 0.8) + roll('back', 0.35) + c.svgOf(milk) + milkVeil(W, c, 0.45);
}

// Voronoi cells over the chip (opal, round six): seeds on a staggered grid about `size` apart, shaken loose,
// each cell the chip's box cut down to the part nearer its seed than any other. Worked out once per width and
// size, then kept.
const VORONOI = new Map();
function voronoi(W, size, seed) {
  const key = `${W}:${size}:${seed}`;
  if (VORONOI.has(key)) return VORONOI.get(key);
  const r = rng(seed + W * 3), nx = Math.max(2, Math.round(W / size)), ny = Math.max(2, Math.round(H / size)), dx = W / nx, dy = H / ny, seeds = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx + (j % 2); i++) seeds.push([(i - (j % 2) * 0.5 + 0.1 + r() * 0.8) * dx, (j + 0.1 + r() * 0.8) * dy]);
  const box = [[-1, -1], [W + 1, -1], [W + 1, H + 1], [-1, H + 1]];
  const cells = seeds.map((p, k) => {
    let pts = box;
    for (const [m, q] of seeds.entries()) {
      if (m === k || !pts.length) continue;
      // keep the side nearer p: where (x - midpoint) . (q - p) <= 0
      const ux = q[0] - p[0], uy = q[1] - p[1], c0 = (ux * (p[0] + q[0]) + uy * (p[1] + q[1])) / 2, side = v => v[0] * ux + v[1] * uy - c0, out = [];
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length], sa = side(a), sb = side(b);
        if (sa <= 0) out.push(a);
        if ((sa <= 0) !== (sb <= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      });
      pts = out;
    }
    const cx = pts.reduce((s, v) => s + v[0], 0) / pts.length, cy = pts.reduce((s, v) => s + v[1], 0) / pts.length;
    return { pts, cx, cy };
  }).filter(c => c.pts.length > 2);
  VORONOI.set(key, cells);
  return cells;
}

// voronoi: rolling's rainbow still slides under the milk, but broken into a patchwork of irregular cells, each
// its own colour lit from its upper left; as the light rolls across, each cell in turn flashes to a colour of
// its own, so the colour shifts cell by cell (the flash is the cell's shape in a flat colour, faded in and out)
function voronoiFace(L, W, c) {
  const r = rng(311 + W + L.cell), P = L.play, cells = voronoi(W, L.cell, 17), g = uid('cvo');
  const stops = L.roll.map((s, i) => `${s} ${f1((i / (L.roll.length - 1)) * 100)}%`).join(',');
  const roll = `<i class="cskew"><i class="cflow" style="width:${3 * W}px;opacity:0.85;background:linear-gradient(90deg,${stops});background-size:${W}px 100%"></i></i>`;
  let cellsSvg = P.map((col, i) => `<linearGradient id="${g}${i}" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${lift(col, 0.5)}"/><stop offset="1" stop-color="${col}"/></linearGradient>`).join('');
  let fx = '', last = -1;
  for (const cell of cells) {
    let k = Math.floor(r() * P.length);
    if (k === last) k = (k + 3) % P.length;
    last = k;
    cellsSvg += `<path d="${pathOf(cell.pts)}" fill="url(#${g}${k})" opacity="${f1(0.5 + r() * 0.25)}" stroke="#ffffff" stroke-width="0.4" stroke-opacity="0.22" stroke-linejoin="round"/>`;
    fx += `<i class="fx play" style="${clipOf(cell.pts)};--d:${f1(1.35 * (cell.cx / W) + 0.3 * (cell.cy / H))}s;background:${rgba(P[(k + 2 + Math.floor(r() * 4)) % P.length], 0.92)}"></i>`;
  }
  return c.svgOf(bodyOf(W, L.body, uid('cvb'))) + roll + c.svgOf(cellsSvg) + fx + milkVeil(W, c, L.milk ?? 0.3) + c.shine;
}

// boulder: veins of opal through brown ironstone, their colours crossing over to a second set and back
function boulderFace(L, W, c) {
  const r = rng(91 + W);
  let rock = bodyOf(W, L.rock, uid('cbo'));
  for (let i = 0; i < 10; i++) rock += `<ellipse cx="${f1(r() * W)}" cy="${f1(r() * H)}" rx="${f1(2 + r() * 5)}" ry="${f1(1.2 + r() * 2.5)}" fill="${r() < 0.5 ? '#24120a' : '#8e5e44'}" opacity="${f1(0.25 + r() * 0.25)}"/>`;
  const shapes = [[0.22, 4, 0.4, 2.2, 1.8], [0.47, 2.5, 3.3, 1.2, 1], [0.64, 5, 2.1, 3.4, 2.6], [0.88, 3, 4.6, 1.6, 1.4]];
  const veins = set => `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${ribbons(W, shapes.map((s, i) => [...s, set[i % set.length], 0.95]))}
    ${ribbons(W, shapes.map(([y, a, p, t]) => [y - t / (3 * H), a, p, t * 0.25, 0.2, '#ffffff', 0.45]))}</svg>`;
  return c.svgOf(rock) + veins(L.veins[0]) + `<i class="cveins">${veins(L.veins[1])}</i>` + c.svgOf(`<path d="${c.band}" fill="#fff" opacity="0.14"/>${shineArc(0.75)}`) + c.shine;
}

// ---- the far end's new ideas (2026-11-20)

// faint stars scattered in a dark sky, the same every time for a width
const scatterStars = (W, seed, n, o = 0.7) => {
  const r = rng(seed + W);
  return Array.from({ length: n }, () => `<circle cx="${f1(r() * W)}" cy="${f1(2 + r() * (H - 4))}" r="${f1(0.4 + r() * 0.5)}" fill="#fff" opacity="${f1(o * (0.4 + r() * 0.6))}"/>`).join('');
};
const darkOf = (W, cs, id) => `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.7"><stop offset="0" stop-color="${cs[0]}"/><stop offset="0.6" stop-color="${cs[1]}"/><stop offset="1" stop-color="${cs[2]}"/></radialGradient><rect width="${W}" height="${H}" fill="url(#${id})"/>`;

// supernova, collapse: the star shrinking and heating, falling in, a flash, a shell of fire racing out
const shellBg = L => `radial-gradient(closest-side, transparent 56%, ${rgba(L.shell[0], 0.95)} 68%, ${rgba(L.shell[1], 0.7)} 80%, transparent 95%)`;
function collapseFace(L, W, c) {
  const [w, y, o] = L.star;
  return c.svgOf(darkOf(W, ['#3a1030', '#160820', '#08040f'], uid('cnv')) + scatterStars(W, 23, 10))
    + `<i class="cnshell" style="background:${shellBg(L)}"></i>`
    + `<i class="cball" style="background:radial-gradient(closest-side, ${w}, ${y} 42%, ${o} 70%, ${rgba(o, 0)})"><i style="background:radial-gradient(closest-side, #fff, ${L.hot} 45%, ${rgba(L.hot, 0)})"></i></i>`
    + '<i class="cnflash"></i>';
}

// supernova, pulsar: torn threads of gas round a tiny star sweeping two beams round
const beamsBg = (c, o) => `conic-gradient(from -7deg, transparent 0deg, ${rgba(c, o)} 7deg, transparent 14deg 180deg, ${rgba(c, o)} 187deg, transparent 194deg)`;
function pulsarFace(L, W, c) {
  const r = rng(71 + W), cx = W / 2, cy = H / 2, gc = uid('cps');
  let fil = '';
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + r() * 0.3, r0 = 4 + r() * 6, r1 = r0 + 6 + r() * 12, bend = (r() - 0.5) * 0.7, rm = (r0 + r1) / 2;
    const at = (ang, rad) => `${f1(cx + Math.cos(ang) * rad * 1.7)} ${f1(cy + Math.sin(ang) * rad)}`;
    fil += `<path d="M${at(a, r0)}Q${at(a + bend, rm)} ${at(a + bend * 0.4, r1)}" fill="none" stroke="${L.fil[i % L.fil.length]}" stroke-width="${f1(0.6 + r() * 0.8)}" stroke-linecap="round" opacity="${f1(0.35 + r() * 0.4)}"/>`;
  }
  return c.svgOf(darkOf(W, ['#1c1a50', '#0e0c2e', '#06061a'], uid('cps')) + scatterStars(W, 31, 8)
      + `<radialGradient id="${gc}"><stop offset="0" stop-color="${L.cloud}" stop-opacity="0.55"/><stop offset="1" stop-color="${L.cloud}" stop-opacity="0"/></radialGradient>
      <ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(W * 0.42)}" ry="15" fill="url(#${gc})"/>${fil}${shineArc(0.45)}`)
    + `<i class="cbeams in"><i style="background:${beamsBg(L.beam, 0.55)}"></i></i>`
    + `<i class="cpsr" style="background:radial-gradient(closest-side, #fff, ${rgba(L.beam, 0.8)} 40%, transparent)"></i>`;
}

// ---- supernova, round six: three more ideas (2026-11-20)

// shells: the star throwing off its layers, one shock front after another, each its own colour (white-blue,
// gold, orange, red), racing out from a hot core through the chip and on past its edge, one every one and a
// half seconds; their edges ragged and churning. Drawn inside the chip and again behind it (out), the same
// size and time, so a front carries on past the edge unbroken.
const shockBg = ([a, b]) => `radial-gradient(closest-side, transparent 50%, ${rgba(a, 0)} 54%, ${rgba(a, 0.95)} 64%, ${rgba(b, 0.8)} 75%, ${rgba(b, 0.3)} 86%, transparent 96%)`;
function raggedMask(seed) {
  const r = rng(seed), stops = [];
  for (let a = 0; a < 360; a += 2 + r() * 3) stops.push(`rgba(0,0,0,${f1(0.5 + r() * 0.5)}) ${f1(a)}deg`);
  stops.push(`${stops[0].split(' ')[0]} 360deg`);
  const m = `conic-gradient(${stops.join(',')})`;
  return `-webkit-mask-image:${m};mask-image:${m}`;
}
const shocksOf = (L, out) => L.shocks.map((s, i) => `<i class="cshock${out ? ' out' : ''}" style="--d:${f1(-i * 1.5)}s;background:${shockBg(s)};${raggedMask(613 + i * 29)}"></i>`).join('');
const coreOf = (c, cls = 'ccore3') => `<i class="${cls}" style="background:radial-gradient(closest-side, #fff, #fff 22%, ${rgba(c, 0.9)} 45%, ${rgba(c, 0)})"></i>`;
function shellsFace(L, W, c) {
  return c.svgOf(darkOf(W, ['#2c1446', '#140a2a', '#06040f'], uid('csh')) + scatterStars(W, 83, 9)) + shocksOf(L, false) + coreOf(L.core) + c.svgOf(shineArc(0.45));
}

// ringneb: a bright core inside a ring of gas the star threw off long before, tilted, strung with knots of
// light like pearls (as round the supernova of 1987); every three seconds the core flashes, its light runs
// out to the ring and the pearls flare one after another round it, while a haze of pink and teal blooms
// round the chip and fades
const RING_TILT = -14;
function ringAt(W, t, k = 1) {
  const rx = W * 0.4 * k, ry = 11 * k, a = (RING_TILT * Math.PI) / 180, x = rx * Math.cos(t), y = ry * Math.sin(t);
  return [W / 2 + x * Math.cos(a) - y * Math.sin(a), H / 2 + x * Math.sin(a) + y * Math.cos(a)];
}
function ringnebFace(L, W, c) {
  const cx = W / 2, cy = H / 2, gr = uid('crn'), gh = uid('crn'), gi = uid('crn'), [lit, deep] = L.ring, rx = W * 0.4, ry = 11;
  const ell = (k, dy, extra) => `<ellipse cx="${f1(cx)}" cy="${f1(cy + dy)}" rx="${f1(rx * k)}" ry="${f1(ry * k)}" transform="rotate(${RING_TILT} ${f1(cx)} ${f1(cy + dy)})" ${extra}/>`;
  const body = darkOf(W, ['#221448', '#100a2c', '#05040f'], uid('crn')) + scatterStars(W, 89, 9)
    + `<radialGradient id="${gh}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${L.haze[0]}" stop-opacity="0.6"/><stop offset="0.6" stop-color="${L.haze[1]}" stop-opacity="0.28"/><stop offset="1" stop-color="${L.haze[1]}" stop-opacity="0"/></radialGradient>
    <ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(W * 0.5)}" ry="19" fill="url(#${gh})"/>
    <radialGradient id="${gi}"><stop offset="0.55" stop-color="${deep}" stop-opacity="0"/><stop offset="1" stop-color="${deep}" stop-opacity="0.3"/></radialGradient>
    <linearGradient id="${gr}" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="${deep}"/><stop offset="0.5" stop-color="${lit}"/><stop offset="1" stop-color="${deep}"/></linearGradient>`
    // the faint outer rings above and below, as that supernova's had
    + ell(0.78, -9.5, `fill="none" stroke="${deep}" stroke-width="0.7" opacity="0.35"`) + ell(0.78, 9.5, `fill="none" stroke="${deep}" stroke-width="0.7" opacity="0.35"`)
    + ell(1, 0, `fill="url(#${gi})"`) + ell(1, 0, `fill="none" stroke="${deep}" stroke-width="5" opacity="0.5"`) + ell(1, 0, `fill="none" stroke="url(#${gr})" stroke-width="2.2"`);
  const pearls = Array.from({ length: 11 }, (_, i) => {
    const [x, y] = ringAt(W, (i / 11) * Math.PI * 2 + 0.3);
    return `<i class="cpearl" style="left:${f1(x - 4)}px;top:${f1(y - 4)}px;--d:${f1(0.55 + i * 0.07)}s;background:radial-gradient(closest-side, #fff, ${rgba(L.pearl, 0.9)} 40%, ${rgba(lit, 0)})"></i>`;
  }).join('');
  const pulse = `<i class="cpulse" style="left:${f1(cx - rx)}px;top:${f1(cy - ry)}px;width:${f1(2 * rx)}px;height:${f1(2 * ry)}px;background:radial-gradient(closest-side, transparent 62%, ${rgba('#ffffff', 0.75)} 82%, ${rgba(lit, 0.4)} 92%, transparent)"></i>`;
  return c.svgOf(body) + pulse + pearls + coreOf(L.core, 'ccore3 flash') + c.svgOf(shineArc(0.45));
}

// rays: the blast as light: rays of uneven width bursting out from a white-hot middle, a fresh burst every
// three-quarters of a second, out past the chip on every side, and debris flung out along them, streaks of
// gas with bright heads, slowing as they go (drawn inside the chip and again behind it, so both carry on
// past the edge)
function sunburstBg(L, seed) {
  const r = rng(seed);
  let a = r() * 10;
  const stops = [];
  while (a < 352) {
    const w = 3 + r() * 6, o = 0.7 + r() * 0.3, c = r() < 0.35 ? L.ejecta[1] : L.sunburst;
    stops.push(`transparent ${f1(a)}deg`, `${rgba(c, o)} ${f1(a + w / 2)}deg`, `transparent ${f1(a + w)}deg`);
    a += w + 5 + r() * 13;
  }
  return `conic-gradient(${stops.join(',')})`;
}
const SPOKES = [[8, 0, 1], [33, 1.6, 0], [61, 0.7, 2], [92, 2.3, 3], [118, 1.1, 1], [147, 0.2, 0], [176, 1.9, 2], [204, 0.9, 3], [229, 2.6, 0], [258, 0.45, 1], [287, 1.4, 2], [313, 2.15, 3], [340, 1.25, 0]];
function sunburstOf(L, inside) {
  const rays = [0, 1].map(k => `<i class="${k ? 'b' : ''}" style="background:${sunburstBg(L, 401 + k * 17)}"></i>`).join('');
  const ejecta = SPOKES.map(([a, d, k]) => `<i class="cej" style="transform:scaleY(0.6) rotate(${a}deg)"><i style="--d:${d}s;background:linear-gradient(90deg, transparent, ${rgba(L.ejecta[k], 0.85)} 65%, #fff)"></i></i>`).join('');
  return `<i class="csun${inside ? ' in' : ''}">${rays}</i><i class="cejs${inside ? ' in' : ''}">${ejecta}</i>`;
}
function raysFace(L, W, c) {
  const g = uid('cry');
  return c.svgOf(darkOf(W, ['#3a1c2c', '#170a22', '#07040f'], uid('cry')) + scatterStars(W, 97, 7)
      + `<radialGradient id="${g}"><stop offset="0" stop-color="${L.core}" stop-opacity="0.7"/><stop offset="0.5" stop-color="${L.ejecta[0]}" stop-opacity="0.22"/><stop offset="1" stop-color="${L.ejecta[0]}" stop-opacity="0"/></radialGradient>
      <ellipse cx="${f1(W / 2)}" cy="20" rx="${f1(W * 0.46)}" ry="18" fill="url(#${g})"/>`)
    + sunburstOf(L, true) + coreOf(L.core) + c.svgOf(shineArc(0.45));
}

// eclipse, transit: the moon crossing the sun whole, the sky going dark at totality
function transitFace(L, W, c) {
  const cx = W / 2, cy = H / 2, R = 12, gs = uid('ctr'), gc = uid('ctr'), r = rng(43 + W);
  let streamers = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + r() * 0.3, len = R * (1.5 + r() * 1.1), w = 1.6 + r() * 1.6;
    const tip = [cx + Math.cos(a) * len * 1.25, cy + Math.sin(a) * len], ux = -Math.sin(a), uy = Math.cos(a);
    streamers += poly([[cx + ux * w * 2, cy + uy * w * 2], tip, [cx - ux * w * 2, cy - uy * w * 2]], L.corona[0], 0.26);
  }
  const corona = `<i class="ctcor"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><radialGradient id="${gc}"><stop offset="0.42" stop-color="${L.corona[0]}" stop-opacity="0.95"/><stop offset="0.62" stop-color="${L.corona[1]}" stop-opacity="0.4"/><stop offset="1" stop-color="${L.corona[1]}" stop-opacity="0"/></radialGradient>
    ${streamers}<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(R * 2.5)}" ry="${f1(R * 1.9)}" fill="url(#${gc})"/></svg></i>`;
  const sun = `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><radialGradient id="${gs}"><stop offset="0.5" stop-color="${L.sun}" stop-opacity="0.6"/><stop offset="1" stop-color="${L.sun}" stop-opacity="0"/></radialGradient>
    <circle cx="${f1(cx)}" cy="${f1(cy)}" r="${R + 6}" fill="url(#${gs})"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${R}" fill="${L.sun}"/></svg>`;
  const bead = side => `<i class="cbead2${side > 0 ? ' r' : ''}" style="left:${f1(cx + side * R - 13)}px;top:${f1(cy - 13)}px">${twinkleSvg(26, 12, '#ffffff')}</i>`;
  const gn = uid('ctn');
  return c.svgOf(`<linearGradient id="${gn}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.night[0]}"/><stop offset="1" stop-color="${L.night[1]}"/></linearGradient><rect width="${W}" height="${H}" fill="url(#${gn})"/>${scatterStars(W, 47, 12, 0.9)}`)
    + `<i class="cday" style="background:linear-gradient(${L.day[0]}, ${L.day[1]})"></i>` + corona + sun
    + `<i class="cmoon2" style="left:${f1(cx - 14)}px;top:${f1(cy - 14)}px"></i>` + bead(1) + bead(-1)
    + c.svgOf(shineArc(0.45));
}

// eclipse, annular: a ring of fire round a moon too small to hide the sun, flames licking off it
function annularFace(L, W, c) {
  const cx = W / 2, cy = H / 2, R = 14.5, Rm = 11.6, g = uid('can'), gh = uid('can'), [f0, f1c, f2] = L.fire;
  const body = darkOf(W, ['#1a1028', '#0c0a1c', '#05040c'], uid('can')) + scatterStars(W, 53, 8)
    + `<radialGradient id="${gh}"><stop offset="0" stop-color="${f1c}" stop-opacity="0.55"/><stop offset="0.5" stop-color="${f2}" stop-opacity="0.18"/><stop offset="1" stop-color="${f2}" stop-opacity="0"/></radialGradient>
    <ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(R * 2.4)}" ry="${f1(R * 1.45)}" fill="url(#${gh})"/>
    <radialGradient id="${g}"><stop offset="0.72" stop-color="${f0}"/><stop offset="0.88" stop-color="${f1c}"/><stop offset="1" stop-color="${f2}"/></radialGradient>
    <circle cx="${f1(cx)}" cy="${f1(cy)}" r="${R}" fill="url(#${g})"/>`;
  const flames = `<i class="cflames" style="left:${f1(cx - 24)}px;top:${f1(cy - 24)}px"><i style="background:repeating-conic-gradient(from 0deg, ${rgba(L.flame, 0.85)} 0deg 4deg, transparent 7deg 15deg)"></i>`
    + `<i class="b" style="background:repeating-conic-gradient(from 5deg, ${rgba(f1c, 0.7)} 0deg 2.5deg, transparent 5deg 7.5deg)"></i></i>`;
  const moon = `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${Rm}" fill="#06040c"/>
    <circle cx="${f1(cx)}" cy="${f1(cy)}" r="${Rm + 0.5}" fill="none" stroke="${f0}" stroke-width="0.8" opacity="0.8"/></svg>`;
  const runner = `<i class="crun" style="left:${f1(cx)}px;top:${f1(cy)}px"><i style="left:${f1(R - 1.6 - 7)}px">${twinkleSvg(14, 6.5, '#ffffff')}</i></i>`;
  return c.svgOf(body) + flames + moon + runner + c.svgOf(shineArc(0.45));
}

// multiverse, nested: frames the chip's shape coming out of the middle and growing past the edge, each its
// own colour with its own few stars (and drawn again behind the chip, so they carry on out round it)
const nestFrames = (L, out) => L.frames.map((col, i) => {
  const r = rng(19 + i * 7);
  const stars = out ? '' : Array.from({ length: 4 }, () => `<b style="left:${f1(10 + r() * 80)}%;top:${f1(12 + r() * 76)}%"></b>`).join('');
  return `<i class="cnest${out ? ' out' : ''}" style="--d:${-i * 1.5}s;transform:scale(${[0.18, 0.36, 0.72, 1.3][i % 4]});border-color:${out ? rgba(col, 0.75) : col};${out ? '' : `background:${rgba(col, 0.1)}`}">${stars}</i>`;
}).join('');
function nestedFace(L, W, c) {
  return c.svgOf(darkOf(W, [L.bg[0], L.bg[0], L.bg[1]], uid('cne')) + scatterStars(W, 61, 6, 0.5)) + nestFrames(L, false) + c.svgOf(shineArc(0.5));
}

// multiverse, branches: one timeline along the middle, others forking off it and off each other, each its own
// colour, fading as they run on; drawn over x0 .. x0 + w (in the chip's own x), repeating every W
function threadsOf(L, W, x0, w) {
  const [cyan, pink, gold, green] = L.lanes, main = '#e8e2ff';
  // [from x (a share of W), from y, to y, length (a share of W), colour]
  const forks = [[0.04, 20, 11, 0.72, cyan], [0.3, 11, 4, 0.55, pink], [0.46, 20, 29, 0.7, gold], [0.68, 29, 36, 0.5, green], [0.84, 20, 13, 0.3, pink]];
  let defs = '', lines = `<path d="M${x0} 20H${x0 + w}" stroke="${main}" stroke-width="3.2" opacity="0.18"/><path d="M${x0} 20H${x0 + w}" stroke="${main}" stroke-width="1.1" opacity="0.85"/>`;
  for (let p = Math.floor(x0 / W) - 1; p * W < x0 + w; p++) {
    for (const [fx, y0, y1, len, col] of forks) {
      const x = (p + fx) * W, end = x + len * W, g = uid('cbr');
      defs += `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f1(x)}" y1="0" x2="${f1(end)}" y2="0"><stop offset="0" stop-color="${col}"/><stop offset="0.6" stop-color="${col}" stop-opacity="0.8"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
      const d = `M${f1(x)} ${y0}C${f1(x + 7)} ${y0} ${f1(x + 6)} ${y1} ${f1(x + 13)} ${y1}H${f1(end)}`;
      lines += `<path d="${d}" fill="none" stroke="url(#${g})" stroke-width="3.2" opacity="0.25"/><path d="${d}" fill="none" stroke="url(#${g})" stroke-width="1.1"/>`
        + `<circle cx="${f1(x + 0.5)}" cy="${y0}" r="1.5" fill="#fff"/>`;
    }
  }
  return `<svg width="${w}" height="${H}" viewBox="${x0} 0 ${w} ${H}" aria-hidden="true">${defs}${lines}</svg>`;
}
function branchesFace(L, W, c) {
  return c.svgOf(darkOf(W, [L.bg[0], L.bg[0], L.bg[1]], uid('cbf')) + scatterStars(W, 67, 7, 0.5))
    + `<i class="cthread" style="left:${-W}px;width:${3 * W}px">${threadsOf(L, W, -W, 3 * W)}</i>` + c.svgOf(shineArc(0.5));
}

const FACES = { gem: gemFace, harlequin: harlequinFace, rolling: rollingFace, boulder: boulderFace, voronoi: voronoiFace, collapse: collapseFace, pulsar: pulsarFace,
  shells: shellsFace, ringneb: ringnebFace, rays: raysFace, transit: transitFace, annular: annularFace, nested: nestedFace, branches: branchesFace };

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
// the anodised edge (titanium): the rainbow that heat leaves on titanium, faint (each colour half the metal's
// grey), on a wheel behind the face that turns slowly, so the colours travel round the border. The rainbow
// goes round twice, so half a turn in six seconds lands where it began.
const ANO_INSET = 2.4;
function anodisedOf(L) {
  const cs = L.anodised.map(c => mix(c, L.base, 0.42));
  const ring = [...cs, ...cs, cs[0]];
  return `<i class="cano"><i style="background:conic-gradient(${ring.map((c, i) => `${c} ${f1((i / (ring.length - 1)) * 360)}deg`).join(',')})"></i></i>`;
}
// the face inside the anodised edge: everything drawn is clipped to it, with a dark hairline where they meet
function insetClip(W) {
  const id = uid('cins'), k = ANO_INSET;
  return { open: `<clipPath id="${id}"><rect x="${k}" y="${k}" width="${W - 2 * k}" height="${H - 2 * k}" rx="${13 - k}"/></clipPath><g clip-path="url(#${id})">`,
    close: `</g><rect x="${k}" y="${k}" width="${W - 2 * k}" height="${H - 2 * k}" rx="${13 - k}" fill="none" stroke="#2a3044" stroke-width="0.7" opacity="0.55"/>` };
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
    if (L.anodised) { const c = insetClip(W); body = c.open + body + c.close; }
    // an oil-slick sheen (obsidian): broad faint bands of colour drifting over the glass
    const slick = L.slick ? `<i class="crib slick" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${ribbons(W, L.slick)}</svg></i>` : '';
    return (L.anodised ? anodisedOf(L) : '') + svgOf(body + shineArc(L.arc ?? 0.85)) + slick + shine;
  }

  if (FACES[L.face]) return FACES[L.face](L, W, { svgOf, shine, band, low });

  if (L.face === 'flow') {
    // a colour that drifts through the chip (a strip repeating every W, sliding by W), with the band and shade
    // laid over it
    const strip = `<i class="cflow" style="width:${2 * W}px;background:linear-gradient(90deg,${L.stops.join(',')});background-size:${W}px 100%"></i>`;
    const over = `<svg class="cface" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${band}" fill="#fff" opacity="${L.dark ? 0.1 : 0.32}"/>
      <path d="${low}" fill="#0c0830" opacity="${L.dark ? 0.35 : 0.14}"/>${shineArc(L.dark ? 0.55 : 0.85)}</svg>`;
    return strip + (L.dark ? starsOf(W, 5) : '') + over + shine;
  }

  if (L.face === 'lens') {
    // a singularity, by what it does to light: deep space with faint stars, the starlight bent into a bright
    // ring round the whole chip (an Einstein ring), with arcs of lensed stars sliding round it; inside, rings of
    // space flowing inward toward a point behind the number, one after another
    const { ring, fall, arc } = L.lens, cx = W / 2, cy = H / 2, g = uid('clens'), gr = uid('clens'), r = rng(19 + W);
    let stars = '';
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y = r() * H, d = Math.hypot((x - cx) / (W / 2), (y - cy) / (H / 2));
      // stars near the ring are drawn out along it, as lensing does
      const a = Math.atan2((y - cy) / H, (x - cx) / W) * (180 / Math.PI) + 90;
      stars += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(d > 0.7 ? 1.6 : 0.6)}" ry="0.55" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" fill="#fff" opacity="${f1(0.35 + r() * 0.5)}"/>`;
    }
    const body = `<radialGradient id="${g}" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#2a1a66"/><stop offset="0.55" stop-color="#120a34"/><stop offset="1" stop-color="#06040f"/></radialGradient>
      <linearGradient id="${gr}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ring[0]}"/><stop offset="0.5" stop-color="${ring[1]}"/><stop offset="1" stop-color="${ring[2]}"/></linearGradient>
      <rect width="${W}" height="${H}" fill="url(#${g})"/>${stars}
      <ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(W / 2 - 4.2)}" ry="${f1(H / 2 - 4.2)}" fill="none" stroke="${ring[2]}" stroke-width="5" opacity="0.35"/>
      <ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(W / 2 - 4.2)}" ry="${f1(H / 2 - 4.2)}" fill="none" stroke="url(#${gr})" stroke-width="1.5" opacity="0.95"/>`;
    const falling = [...fall, fall[0]].map((c, i) => `<i class="cfall" style="--d:${-i * 0.75}s;border-color:${rgba(c, 0.9)}"></i>`).join('');
    const arcs = `<i class="carcs" style="width:${W - 8}px;height:${H - 8}px"><i style="background:conic-gradient(from 0deg, transparent 0deg 20deg, ${rgba(arc, 0.95)} 34deg, transparent 52deg 200deg, ${rgba(arc, 0.85)} 214deg, transparent 232deg)"></i></i>`;
    return svgOf(body) + falling + arcs + `<i class="ccore2" style="background:radial-gradient(closest-side, #fff, ${rgba(ring[1], 0.6)} 35%, transparent)"></i>`;
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
  const strip = (L.bands ? `<i class="crib" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${ribbons(W, L.bands)}</svg></i>` : '')
    // a nearer layer of light, sliding quicker (aurora)
    + (L.near ? `<i class="crib quick" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${ribbons(W, L.near)}</svg></i>` : '');
  const clouds = L.clouds ? `<i class="crib slow" style="width:${2 * W}px"><svg width="${2 * W}" height="${H}" viewBox="0 0 ${2 * W} ${H}" aria-hidden="true">${cloudsOf(W, L.clouds)}</svg></i>` : '';
  // far galaxies, still (void): a soft oval with a bright middle, tilted, and a few faint stars
  let far = '';
  if (L.galaxies) {
    const g = uid('cgal');
    far = svgOf(`<radialGradient id="${g}"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.3" stop-color="#b8c4ff" stop-opacity="0.4"/><stop offset="1" stop-color="#8090ff" stop-opacity="0"/></radialGradient>
      ${[[0.2, 9, 6, -25], [0.74, 30, 4.5, 30]].map(([x, y, rx, a]) => `<ellipse cx="${f1(x * W)}" cy="${y}" rx="${rx}" ry="${f1(rx * 0.38)}" transform="rotate(${a} ${f1(x * W)} ${y})" fill="url(#${g})"/>`).join('')}${scatterStars(W, 11, 9, 0.6)}`);
  }
  // stars falling inward to the middle from all round, shrinking and going out (void): each rides a spoke,
  // the spokes flattened to the chip's shape
  const infall = L.infall ? INFALL.map(([a, d, sz]) => `<i class="cinf" style="transform:scaleY(${f1(H / W)}) rotate(${a}deg)"><i style="--d:${d}s;width:${sz}px;height:${sz}px;margin-top:${-sz / 2}px;background:${L.infall.c}"></i></i>`).join('') : '';
  // a shooting star across it now and then (celestial)
  const shoot = L.shoot ? `<i class="cshoot" style="background:linear-gradient(90deg, transparent, ${rgba(L.shoot.c, 0.9)} 80%, #fff)"></i>` : '';
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
  return sky + clouds + strip + far + infall + lines + stars + shoot + rim;
}

// The void's falling stars and specks: [spoke angle, delay (s), size], twelve on a three-second beat.
const INFALL = [[5, 0, 2.4], [38, 1.7, 1.8], [70, 0.6, 2.2], [104, 2.3, 1.8], [131, 1.1, 2.6], [163, 0.3, 2], [196, 2, 2.4], [228, 0.9, 1.8], [253, 2.6, 2.2],
  [287, 1.4, 2], [318, 0.45, 2.6], [344, 2.2, 1.8]];

// Twinkling stars in a sky: fixed places, so a constellation can join them.
const STAR_AT = [[0.14, 8, 1.7, 0], [0.4, 5, 1.3, 1], [0.7, 9, 1.6, 2], [0.88, 24, 1.3, 0.5], [0.28, 30, 1.2, 1.5], [0.56, 33, 1.4, 2.5], [0.08, 20, 1.1, 1.2], [0.8, 34, 1.2, 2.2]];
const starsOf = (W, n, c = '#fff') => STAR_AT.slice(0, n)
  .map(([x, y, s, d]) => `<i class="cst" style="left:${f1(x * W - s)}px;top:${f1(y - s)}px;width:${f1(s * 2)}px;height:${f1(s * 2)}px;--d:${d}s;background:${c}"></i>`).join('');

// The shared extras round the chip, from the table: rays turning behind, motes rising, sparks drawn into the
// middle, rings like an atom's round it, the sun and moon on an orbit, a dial turning behind it (with a
// clock's hands), specks drawn in, darkness spreading round it, a pulsar's beams, a supernova's shell racing
// out, frames growing out past the chip, threads running on past its sides.
function extras(L, W) {
  let s = '';
  if (L.abyss) s += '<i class="cabyss"></i>';
  if (L.rays) {
    const o = L.rays.faint ? 0.3 : 0.55;
    s += `<i class="crays"><i style="background:repeating-conic-gradient(from 0deg,${rgba(L.rays.c, o)} 0deg 8deg,transparent 8deg 30deg)"></i></i>`;
  }
  if (L.wheel) {
    // a dial like an astrolabe's turning behind the chip: fine ticks, a bold one every 30 degrees, a thin ring;
    // and on eternal a clock's two hands on it, the long one ticking round twice in six seconds, the short one
    // sweeping round once (behind the chip, so they show past its sides)
    const hands = L.wheel.hands ? `<i class="hand long"><b style="background:${L.wheel.hands}"></b></i><i class="hand"><b style="background:${L.wheel.hands}"></b></i>` : '';
    s += `<i class="cwheel"><i style="background:repeating-conic-gradient(from 0deg,${rgba(L.wheel.c, 0.9)} 0deg 1.4deg,transparent 1.4deg 10deg)"></i>`
      + `<i class="major" style="background:repeating-conic-gradient(from -1deg,${L.wheel.c} 0deg 2.4deg,transparent 2.4deg 30deg)"></i>`
      + `<i class="band" style="background:radial-gradient(closest-side, transparent 88%, ${rgba(L.wheel.c, 0.75)} 90% 92.5%, transparent 94.5%)"></i>${hands}</i>`;
  }
  // a pulsar's two beams sweeping round behind the chip (and, fainter, across it: in its face)
  if (L.beam) s += `<i class="cbeams"><i style="background:${beamsBg(L.beam, 0.7)}"></i></i>`;
  // the supernova's shell racing out past the chip after the flash
  if (L.shell) s += `<i class="cnout" style="background:${shellBg(L)}"></i>`;
  // the supernova's shock fronts carrying on out past the chip, its haze blooming round it, its rays and
  // debris flying on out past it
  if (L.shocks) s += shocksOf(L, true);
  if (L.haze) s += `<i class="chaze" style="background:radial-gradient(closest-side, ${rgba(L.haze[0], 0.5)}, ${rgba(L.haze[1], 0.22)} 55%, transparent)"></i>`;
  if (L.sunburst) s += sunburstOf(L, false);
  // the multiverse's frames carrying on out round the chip, and its threads running on past its sides
  if (L.frames) s += nestFrames(L, true);
  if (L.lanes) s += `<i class="cthreads"><i class="cthread" style="left:${16 - W}px;width:${3 * W}px">${threadsOf(L, W, -W, 3 * W)}</i></i>`;
  if (L.orrery) s += orreryOf(L, W);
  if (L.motes) s += [[0.1, 0], [0.32, 1.1], [0.55, 0.4], [0.78, 1.8], [0.94, 2.5], [0.22, 2.2]]
    .map(([x, d]) => `<i class="cmote" style="left:${f1(x * W - 2)}px;--d:${d}s;background:${L.motes.c}"></i>`).join('');
  if (L.spiral) s += [0, 120, 240].map((a, i) => `<i class="cspin" style="transform:scaleY(0.42) rotate(${a}deg)"><i style="--d:${i}s"><i style="background:${L.spiral.c}"></i></i></i>`).join('');
  if (L.debris) {
    // specks on spokes all round the middle, flattened to the chip's shape, drawn in from outside: shrinking
    // and dimming as they fall to its edge, and gone (void)
    s += INFALL.map(([a, d], i) => `<i class="cdeb in" style="transform:scaleY(0.45) rotate(${a + 9}deg)"><i style="--d:${f1((d * 1.37) % 3)}s;background:radial-gradient(closest-side, #fff, ${L.debris.c[i % L.debris.c.length]} 55%, transparent)"></i></i>`).join('');
  }
  if (L.atom) s += atomOf(L, W);
  if (L.lens) {
    // the outer ring of bent light (singularity): a ring round the chip, tilted, two bright arcs sliding round
    // it; drawn twice, the whole of it behind the chip and its near (lower) half again in front, so it reads
    // as a ring seen at a slant, passing behind the chip at the top and across it at the bottom
    const { ring, arc } = L.lens;
    const outer = cls => `<i class="carcs out${cls}" style="width:${W + 28}px;height:36px;background:radial-gradient(closest-side, transparent 80%, ${rgba(ring[1], 0.6)} 90%, transparent 99%)"><i style="background:conic-gradient(from 90deg, transparent 0deg 30deg, ${rgba(arc, 0.95)} 50deg, transparent 75deg 210deg, ${rgba(ring[1], 0.9)} 230deg, transparent 255deg)"></i></i>`;
    // the near half as a lit arc over the chip, so it reads clearly in front
    const rx = (W + 28) / 2 * 0.9, ry = 16, cx = (W + 28) / 2, gf = uid('cfr');
    const near = `M${f1(cx - rx)} 18A${f1(rx)} ${ry} 0 0 0 ${f1(cx + rx)} 18`;
    s += outer('') + outer(' front') + `<svg class="cnear" width="${W + 28}" height="36" viewBox="0 0 ${W + 28} 36" aria-hidden="true">
      <linearGradient id="${gf}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${ring[1]}" stop-opacity="0.1"/><stop offset="0.5" stop-color="${ring[0]}" stop-opacity="0.95"/><stop offset="1" stop-color="${ring[1]}" stop-opacity="0.1"/></linearGradient>
      <path d="${near}" fill="none" stroke="${ring[2]}" stroke-width="4" opacity="0.35"/><path d="${near}" fill="none" stroke="url(#${gf})" stroke-width="1.6"/></svg>`;
  }
  return s;
}

// The sun and the moon on one tilted orbit round the chip (celestial), drawn as an atom's ring is (below): the
// whole orbit behind the chip and its near half again in front; the sun and the moon ride opposite ends of one
// arm turning once in six seconds, each turning back as it goes so it stays upright (the moon's dark side
// always the same way).
function orreryOf(L, W) {
  const a = W / 2 + 11, o = L.orrery, tilt = -9;
  const bodies = `<i class="carm" style="--p:6s"><i class="cdot sun" style="left:${f1(a - 6)}px;--p:6s;background:radial-gradient(closest-side, #fff, ${o.sun} 45%, ${rgba(o.sun, 0.5)} 70%, transparent)"></i>`
    + `<i class="cdot moon" style="left:${f1(-a - 4.5)}px;--p:6s;background:radial-gradient(circle at 66% 38%, transparent 42%, ${o.moon} 46% 68%, transparent 71%)"></i></i>`;
  let s = '';
  for (const half of ['back', 'front']) {
    const place = half === 'front' ? `left:6px;top:${f1(-a)}px` : `left:${f1(-a)}px;top:${f1(-a)}px`;
    const ring = `<i class="cell" style="${place};width:${f1(2 * a)}px;height:${f1(2 * a)}px;border-color:${rgba(o.ring, 0.75)}">${bodies}</i>`;
    const inner = half === 'front' ? `<i class="chalf" style="left:${f1(-a - 6)}px;width:${f1(2 * a + 12)}px;height:${f1(a * ATOM_K + 8)}px">${ring}</i>` : ring;
    s += `<i class="catom orrery ${half}" style="transform:rotate(${tilt}deg)"><i>${inner}</i></i>`;
  }
  return s;
}

// Rings round the chip like an atom's (nebula): each tilted its own way and rocking, a spark running round
// it. A ring is a circle squashed flat (scaleY ATOM_K); its spark rides on an arm turning inside it, and turns
// back and stretches the other way itself, so it stays round. The half of each ring in front of the chip is
// drawn again over it, cut to that half; the whole ring is behind.
const ATOM_K = 0.34;
function atomOf(L, W) {
  const rings = [[-24, W / 2 + 9, 0, 2], [26, W / 2 + 6, -1, 3], [2, W / 2 + 13, -2, 1.5]];
  let s = '';
  for (const half of ['back', 'front']) {
    s += rings.map(([tilt, a, d, p], i) => {
      const c = L.atom.c[i % L.atom.c.length];
      const place = half === 'front' ? `left:4px;top:${f1(-a)}px` : `left:${f1(-a)}px;top:${f1(-a)}px`;
      const ring = `<i class="cell" style="${place};width:${f1(2 * a)}px;height:${f1(2 * a)}px;border-color:${rgba(c, 0.8)}">`
        + `<i class="carm" style="--p:${p}s"><i class="cdot" style="left:${f1(a - 4)}px;--p:${p}s;background:radial-gradient(closest-side, #fff, ${rgba(L.atom.e, 0.9)} 35%, ${rgba(c, 0.7)} 62%, transparent)"></i></i></i>`;
      const inner = half === 'front' ? `<i class="chalf" style="left:${f1(-a - 4)}px;width:${f1(2 * a + 8)}px;height:${f1(a * ATOM_K + 6)}px">${ring}</i>` : ring;
      return `<i class="catom ${half}" style="transform:rotate(${tilt}deg)"><i style="--d:${d}s">${inner}</i></i>`;
    }).join('');
  }
  return s;
}

// A big twinkle (platinum's, the eclipse's diamond ring): a long four-point star, a short one turned between
// its rays, and a soft bright middle.
function twinkleSvg(size, r, c) {
  const m = size / 2, g = uid('ctw');
  return `<svg width="${size}" height="${size}" aria-hidden="true"><radialGradient id="${g}"><stop offset="0" stop-color="#fff"/><stop offset="0.4" stop-color="${c}" stop-opacity="0.7"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
    <circle cx="${m}" cy="${m}" r="${f1(r * 0.55)}" fill="url(#${g})"/>${glint(m, m, r, c, 1)}<g transform="rotate(45 ${m} ${m})">${glint(m, m, r * 0.5, c, 0.85)}</g>${glint(m, m, r * 0.32, '#fff', 1)}</svg>`;
}
// A glint for round the chip: a four-point star, with a white middle for the prismatic ones; a big one is a
// twinkle.
function spark(s, W) {
  const size = s.r * 2 + 2;
  if (s.big) return `<i class="cs big" style="left:${f1(s.x * W - size / 2)}px;top:${f1(s.y - size / 2)}px;width:${size}px;height:${size}px;--d:${s.d}s;color:${s.c}">${twinkleSvg(size, s.r, s.c)}</i>`;
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
