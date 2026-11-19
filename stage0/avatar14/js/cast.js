// Round 14: ten characters in the geometric-glow style (glow.js). Each is data: a name, a line saying what it is,
// a palette of tones, how wide its floor shadow is, and its parts in drawing order, built only from glow.js's
// shapes. All stand on the floor turned a little to the left, toward the lamp, and look up at it with calm lids.
//
// A tone is a flat colour, or [base, shadow]: the shadow always leans toward violet (orange goes crimson, green
// goes blue, yellow goes rose). lidTone is the skin the eyelids are cut from.

const cast = [];
const add = ch => cast.push(ch);

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'fox', name: 'Fox',
  line: 'Ears cut as slices of a disc, a cream half disc for the muzzle, dark socks, a big tapering tail with a cream tip.',
  pal: { fur: ['#ff8a2a', '#b2365f'], cream: ['#ffe6c2', '#e0889c'], sock: ['#4b2c80', '#2b1a5c'], nose: '#2a1650' },
  lidTone: 'fur', lid: 0.34, ground: [2, 34],
  parts: ({ disc, half, box, slab, bar, arc, slice }) => [
    { p: arc(30, -58, 28, 118, -40, 5, 9, { bulge: 9 }), t: 'fur', w: 26, in: [{ p: disc(52, -78, 13), t: 'cream' }] },
    ...[-1, 1].map(k => ({ p: box(k * 9.5 - 4.5, -34, 9, 32, 1.5), t: 'sock', w: 9 })),
    ...[-1, 1].map(k => ({ p: half(k * 10, 0, 8), t: 'sock' })),
    { p: slab([[-12, -92], [12, -92], [20, -30], [-20, -30]]), t: 'fur', w: 40, in: [{ p: box(-13, -90, 16, 54, 8), t: 'cream' }] },
    { p: bar(-13, -84, -25, -58, 3.4), t: 'fur', w: 9 }, { p: disc(-26, -56, 4.8), t: 'sock' },
    { p: bar(13, -84, 24, -58, 3.4), t: 'fur', w: 9 }, { p: disc(25, -56, 4.8), t: 'sock' },
    // ears: slices of a disc stood on their points, leaning out a little
    { p: slice(-25, -158, 34, 98, 46), t: 'fur', w: 22, in: [{ p: slice(-24, -150, 22, 98, 36), t: 'sock' }] },
    { p: slice(15, -155, 31, 80, 44), t: 'fur', w: 20, in: [{ p: slice(14, -147, 20, 80, 34), t: 'sock' }] },
    { p: box(-36, -130, 68, 46, [22, 22, 16, 16]), t: 'fur', w: 68, pl: [9, 3.5], in: [{ p: half(-9, -84, 24, 'up'), t: 'cream' }] },
    { p: box(-14, -110, 10, 7, 3.5), t: 'nose' },
    { eye: [-21, -113, 7] }, { eye: [5, -114, 6.4], sx: 0.85 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'mouse', name: 'Mouse',
  line: 'The smallest: a round head on a rounded box, two big disc ears, a pale muzzle, a thin curled tail.',
  pal: { fur: ['#b4bcff', '#5a44b0'], pale: ['#ecebff', '#a196e6'], pink: ['#ff9cc4', '#b4529a'], nose: '#ff6fa8' },
  lidTone: 'fur', lid: 0.32, ground: [3, 27],
  parts: ({ disc, half, box, bar, arc }) => [
    { p: arc(36, -27, 20, 150, -150, 2.8, 1.5, { R1: 9 }), t: 'pink', w: 6 },
    ...[-1, 1].map(k => ({ p: half(k * 9, 0, 8), t: 'pink' })),
    { p: box(-22, -60, 44, 54, [20, 20, 16, 16]), t: 'fur', w: 44, in: [{ p: box(-15, -50, 22, 38, 11), t: 'pale' }] },
    { p: bar(-15, -44, -22, -30, 3), t: 'fur', w: 7 }, { p: disc(-22, -28, 3.8), t: 'pink' },
    { p: bar(15, -44, 21, -31, 3), t: 'fur', w: 7 }, { p: disc(21, -29, 3.8), t: 'pink' },
    { p: disc(16, -92, 13), t: 'fur', w: 26, in: [{ p: disc(17, -91, 8), t: 'pink' }] },
    { p: disc(-22, -88, 15), t: 'fur', w: 30, in: [{ p: disc(-22, -87, 9.5), t: 'pink' }] },
    { p: disc(-3, -70, 23), t: 'fur', w: 46, in: [{ p: disc(-14, -61, 9.5), t: 'pale' }] },
    { p: disc(-22, -63, 2.8), t: 'nose' },
    { eye: [-12, -75, 5.2] }, { eye: [6, -76, 4.8], sx: 0.85 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'flamingo', name: 'Flamingo',
  line: 'The tallest: a pill body, a half-disc wing, a neck that is one curve, a bent bar of a beak, one leg tucked.',
  pal: { pink: ['#ff7ab0', '#8e2f9c'], wing: ['#ff4a8c', '#74238c'], leg: ['#ff93bb', '#9a3a92'], beak: ['#fff0dc', '#d690b0'], tip: ['#4a2a86', '#2a1650'] },
  lidTone: 'pink', lid: 0.36, ground: [4, 28],
  parts: ({ disc, half, box, bar, arc }) => [
    { p: bar(8, -84, 17, -60, 2.2), t: 'leg', w: 4 }, { p: bar(17, -60, 5, -51, 2.2), t: 'leg', w: 4 }, { p: disc(17, -60, 3), t: 'leg' },
    { p: bar(-2, -84, -3, -4, 2.2), t: 'leg', w: 4 }, { p: disc(-2.5, -44, 3), t: 'leg', w: 4 },
    { p: half(-4, 0, 7), t: 'leg' },
    { p: half(38, -98, 9, 'right'), t: 'wing', w: 10 },
    { p: arc(-5, -132, 18, 100, -102, 4.6, 4.6), t: 'pink', w: 9 },
    { p: box(-25, -120, 66, 40, 20), t: 'pink', w: 60, in: [{ p: half(15, -106, 22, 'down'), t: 'wing', w: 24 }] },
    { p: bar(-31, -155, -35, -143, 3.6), t: 'tip', w: 6 },
    { p: bar(-18, -156, -31, -155, 4.6), t: 'beak', w: 9 },
    { p: disc(-11, -156, 11.5), t: 'pink', w: 22 },
    { eye: [-15, -159, 4.4] },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'capybara', name: 'Capybara',
  line: 'The long one, on all fours: a long rounded box, a blunt box of a head, half-disc ears, very lowered lids.',
  pal: { fur: ['#eba646', '#9a3d6e'], far: ['#c9853a', '#7a2f66'], muzzle: ['#c97c3c', '#7d3366'], hoof: '#4b2c6e', nose: '#3a1f50' },
  lidTone: 'fur', lid: 0.62, ground: [-10, 62],
  parts: ({ disc, half, box }) => [
    ...[-22, 42].map(x => ({ p: box(x, -26, 10, 24, 3), t: 'far', w: 10 })),
    ...[-17, 47].map(x => ({ p: half(x, 0, 6.5), t: 'hoof' })),
    ...[-34, 28].map(x => ({ p: box(x, -28, 11, 26, 3), t: 'fur', w: 11 })),
    ...[-28.5, 33.5].map(x => ({ p: half(x, 0, 7), t: 'hoof' })),
    { p: box(-44, -76, 100, 56, [26, 30, 16, 20]), t: 'fur', w: 90, pl: [14, 6] },
    { p: half(-27, -97, 5.5), t: 'far', w: 8 },
    { p: half(-37, -97, 6.5), t: 'fur', w: 10 },
    { p: box(-78, -102, 52, 46, [18, 20, 14, 18]), t: 'fur', w: 52, pl: [8, 3.5], in: [{ p: half(-78, -70, 13, 'right'), t: 'muzzle' }] },
    { p: box(-78, -89, 11, 8, 4), t: 'nose' },
    { eye: [-62, -90, 5] }, { eye: [-45, -91, 4.4], sx: 0.8 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'sheep', name: 'Sheep',
  line: 'The round one: a body of wool that is all circles, a dark box of a face, bar ears, thin dark legs.',
  pal: { wool: ['#f5ecda', '#8e78d8'], face: ['#5a3f9e', '#2c1f6e'], hoof: '#251a58' },
  lidTone: 'face', lid: 0.32, ground: [4, 36],
  parts: ({ disc, half, box, bar, puff, join }) => [
    { p: bar(11, -40, 13, -5, 3.2), t: 'face', w: 6 }, { p: half(13, 0, 6), t: 'hoof' },
    { p: bar(-8, -40, -9, -5, 3.2), t: 'face', w: 6 }, { p: half(-9, 0, 6), t: 'hoof' },
    { p: puff(6, -68, 36, 11, 11), t: 'wool', w: 80, pl: [16, 6] },
    { p: bar(-12, -92, 0, -84, 4), t: 'face', w: 8 },
    { p: box(-40, -100, 32, 40, [10, 10, 15, 15]), t: 'face', w: 32, pl: [6, 2.6] },
    { p: bar(-37, -91, -49, -80, 4.4), t: 'face', w: 8 },
    { p: join(disc(-31, -100, 7), disc(-23, -104, 7.5), disc(-15, -100, 7)), t: 'wool', w: 20 },
    { p: disc(-29, -67, 1.4), t: 'hoof' }, { p: disc(-22, -67, 1.4), t: 'hoof' },
    { eye: [-31, -84, 5] }, { eye: [-17, -85, 4.4], sx: 0.85 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'walrus', name: 'Walrus',
  line: 'The heavy one: one great arched mass with no neck, two disc cheeks, bar tusks, pill flippers.',
  pal: { hide: ['#d98668', '#7a3478'], cheek: ['#f4c39c', '#c9789a'], tusk: ['#fff3dc', '#d4a6c0'], flip: ['#c06c58', '#6a2a6e'], dot: '#8a4270', nose: '#4a2050' },
  lidTone: 'hide', lid: 0.4, ground: [0, 58],
  parts: ({ disc, half, box, bar }) => [
    { p: half(-30, 0, 14), t: 'flip', w: 20 }, { p: half(30, 0, 14), t: 'flip', w: 20 },
    { p: bar(40, -66, 56, -28, 7.5), t: 'flip', w: 14 },
    { p: box(-54, -132, 108, 130, [54, 54, 26, 26]), t: 'hide', w: 108, pl: [18, 6] },
    { p: bar(-46, -66, -53, -28, 9), t: 'flip', w: 18 },
    { p: bar(-14, -74, -15, -42, 3.2), t: 'tusk', w: 5 }, { p: bar(1, -74, 2, -44, 3), t: 'tusk', w: 5 },
    { p: disc(-20, -78, 13), t: 'cheek', w: 22, in: [-1, 1, 0].map((k, i) => ({ p: disc(-24 + i * 5, -80 + Math.abs(k) * 4, 1.2), t: 'dot' })) },
    { p: disc(5, -78, 12.5), t: 'cheek', w: 22, in: [0, 1, 2].map(i => ({ p: disc(2 + i * 5, -80 + (i === 1 ? -2 : 2), 1.2), t: 'dot' })) },
    { p: box(-13, -94, 12, 8, 4), t: 'nose' },
    { eye: [-27, -106, 5.5] }, { eye: [5, -107, 5], sx: 0.85 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'turtle', name: 'Turtle',
  line: 'The shelled one: a big disc of shell behind, a belly plate of boxes, a box head on a short neck, slow lids.',
  pal: { skin: ['#4fd08a', '#2c4fa6'], shell: ['#ffae35', '#b2416a'], scute: ['#e47f2a', '#9a3460'], plate: ['#ffe597', '#d68a7a'], seam: ['#e8ad55', '#c0707c'], nose: '#24508a' },
  lidTone: 'skin', lid: 0.46, ground: [8, 44],
  parts: ({ disc, half, box, bar }) => [
    { p: bar(30, -26, 42, -16, 3), t: 'skin', w: 6 },
    { p: disc(10, -66, 46), t: 'shell', w: 92, pl: [16, 6], in: [[26, -92, 11], [42, -64, 10], [30, -36, 10], [6, -112, 9]].map(([x, y, r]) => ({ p: disc(x, y, r), t: 'scute' })) },
    ...[[-18, -12], [4, 10]].map(([x, fx]) => ({ p: box(x, -30, 12, 28, 4), t: 'skin', w: 12 })),
    ...[-12, 10].map(x => ({ p: half(x, 0, 8), t: 'skin', w: 14 })),
    { p: box(-28, -96, 44, 72, [18, 18, 20, 20]), t: 'plate', w: 44, in: [...[-78, -60, -42].map(y => ({ p: box(-30, y, 48, 2.2, 1), t: 'seam' })), { p: box(-7, -96, 2.2, 72, 1), t: 'seam' }] },
    { p: bar(14, -86, 26, -64, 4), t: 'skin', w: 8 }, { p: disc(27, -61, 5), t: 'skin', w: 10 },
    { p: bar(-26, -86, -36, -62, 4.2), t: 'skin', w: 9 }, { p: disc(-37, -59, 5.2), t: 'skin', w: 10 },
    { p: box(-16, -112, 20, 22, 6), t: 'skin', w: 20 },
    { p: box(-34, -142, 46, 36, [18, 18, 14, 14]), t: 'skin', w: 46, pl: [7, 3] },
    { p: disc(-28, -119, 1.3), t: 'nose' }, { p: disc(-22, -119, 1.3), t: 'nose' },
    { eye: [-24, -128, 6] }, { eye: [-3, -129, 5.4], sx: 0.85 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'axolotl', name: 'Axolotl',
  line: 'The finned one: gill fronds made of beads, a wide head, a pear body, a long tail with a pale fin along it.',
  pal: { skin: ['#6fd3ff', '#3a45b0'], belly: ['#c6f0ff', '#7f8fe0'], gill: ['#ff5fa8', '#9a2a8e'], fin: ['#b4e9ff', '#6a70cc'], spot: '#3d5fd6' },
  lidTone: 'skin', lid: 0.3, ground: [14, 46],
  parts: ({ disc, half, box, bar, arc, beads, join }) => [
    { p: arc(40, -54, 34, 135, 25, 15, 6), t: 'fin', w: 16, rim: false },
    { p: arc(40, -54, 34, 135, 25, 9, 2.5), t: 'skin', w: 14 },
    ...[-17, 5].map(x => ({ p: box(x, -32, 10, 30, 3), t: 'skin', w: 10 })),
    ...[-12, 10].map(x => ({ p: half(x, 0, 7.5), t: 'skin', w: 12 })),
    { p: box(-26, -92, 50, 74, [16, 16, 25, 25]), t: 'skin', w: 50, in: [{ p: box(-18, -84, 26, 58, 13), t: 'belly' }, ...[[14, -70, 2.2], [18, -48, 2], [10, -34, 1.8]].map(([x, y, r]) => ({ p: disc(x, y, r), t: 'spot' }))] },
    { p: bar(18, -80, 30, -58, 3.4), t: 'skin', w: 7 }, { p: disc(31, -55, 4.4), t: 'belly' },
    { p: bar(-20, -80, -32, -56, 3.4), t: 'skin', w: 7 }, { p: disc(-33, -53, 4.6), t: 'belly' },
    { p: join(...[-28, 0, 28].map(a => beads(28, -110, a, 17, 3, 4.6, 3.2))), t: 'gill', pl: [2.2, 0.8], rim: true },
    { p: join(...[205, 180, 155].map(a => beads(-38, -110, a, 21, 3, 5.2, 3.6))), t: 'gill', pl: [2.2, 0.8], rim: true },
    { p: box(-44, -128, 78, 40, 20), t: 'skin', w: 78, pl: [11, 4] },
    { eye: [-24, -110, 5] }, { eye: [6, -111, 4.6], sx: 0.85 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'person', name: 'Person',
  line: 'An adult, about four and a half heads tall: a box head, a helmet of hair with a straight fringe, a jumper, tube arms.',
  pal: { skin: ['#f2a57a', '#a24a78'], nose: '#d9825e', mouth: '#b2566e', brow: '#7a2a40', hair: ['#b9472f', '#5a1d55'], top: ['#ffbf3c', '#b8456a'], band: '#ea9a2c', legs: ['#4d63dc', '#2a2a8c'], shoe: ['#3a2a7a', '#1d1650'] },
  lidTone: 'skin', lid: 0.5, look: [-0.3, 0.02], ground: [-2, 30],
  parts: ({ disc, half, box, slab, bar, join }) => [
    { p: box(-17, -82, 14, 76, 3), t: 'legs', w: 14 }, { p: box(1, -82, 13, 76, 3), t: 'legs', w: 13 },
    { p: half(-11, 0, 9), t: 'shoe', w: 14 }, { p: half(8, 0, 8.5), t: 'shoe', w: 14 },
    { p: bar(18, -126, 24, -86, 5), t: 'top', w: 10 }, { p: disc(24, -82, 5), t: 'skin', w: 10 },
    { p: box(-7, -142, 10, 14, 2), t: 'skin', w: 10 },
    { p: slab([[-23, -132], [21, -132], [18, -78], [-20, -78]], 6), t: 'top', w: 44, in: [{ p: half(-2, -132, 7, 'down'), t: 'skin' }, { p: box(-26, -86, 50, 8), t: 'band' }] },
    { p: bar(-21, -126, -28, -86, 5.2), t: 'top', w: 10 }, { p: disc(-28, -82, 5.2), t: 'skin', w: 10 },
    { p: box(-18, -174, 34, 38, [14, 14, 13, 13]), t: 'skin', w: 34, pl: [5, 2] },
    // hair: the back of it first, unlit where it meets the face, then the cap with its straight fringe
    { p: box(3, -176, 15, 28, [0, 8, 7, 5]), t: 'hair', pl: [5, 1], rim: false },
    { p: box(-20, -179, 38, 19, [17, 17, 3, 3]), t: 'hair', pl: [7, 0.8], rim: true },
    { p: disc(12, -150, 4.4), t: 'skin', w: 8 },
    { p: bar(-13, -157, -7, -157, 0.9), t: 'brow' }, { p: bar(0, -157, 4.5, -157, 0.85), t: 'brow' },
    { p: half(-6, -146, 3, 'left'), t: 'nose' },
    { p: bar(-8, -140.5, -3, -140.5, 0.75), t: 'mouth' },
    { eye: [-10, -151, 3.1] }, { eye: [2, -151.4, 2.9], sx: 0.85 },
  ],
});

// ---------------------------------------------------------------------------------------------------------
add({
  id: 'monster', name: 'Monster',
  line: 'An original creature: an arch of a body, long reaching arms, one big eye and one small, a little lamp of its own on a stalk.',
  pal: { hide: ['#ffc93a', '#c2456e'], belly: ['#fff0b4', '#e0889a'], paw: ['#f0962e', '#8e2f66'] },
  lidTone: 'hide', lid: 0.3, look: [-0.24, -0.2], ground: [0, 50],
  parts: ({ disc, half, box, bar }) => [
    { p: bar(-8, -120, -18, -146, 2.6), t: 'hide', w: 5 },
    ...[-20, 6].map(x => ({ p: box(x, -26, 14, 24, 4), t: 'hide', w: 14 })),
    ...[-13, 13].map(x => ({ p: half(x, 0, 10), t: 'paw', w: 18 })),
    { p: bar(30, -84, 44, -34, 4), t: 'hide', w: 8 }, { p: disc(45, -30, 6), t: 'paw', w: 12 },
    { p: box(-36, -124, 72, 102, [36, 36, 16, 16]), t: 'hide', w: 72, pl: [14, 5], in: [{ p: half(-4, -22, 27, 'up'), t: 'belly' }] },
    { p: bar(-32, -84, -48, -34, 4.2), t: 'hide', w: 8 }, { p: disc(-49, -30, 6.2), t: 'paw', w: 12 },
    { bulb: [-19, -150, 4.4] },
    { eye: [-14, -94, 11] }, { eye: [13, -101, 6.5], sx: 0.9 },
  ],
});

export const CAST = cast;
