// Drawn things, as SVG strings: icons, the raised step buttons of the path, topic medallions, small
// marks and the path's scenery. Copied from the approved stage 0 sketches (stage0/screens/js/kit.js and
// art.js). Everything is lit from the upper left: a base tone, a shade on the lower right, a lighter
// tone on the upper left and one bright highlight. No blur anywhere.

let count = 0;
export const uid = (p = 'a') => `${p}${count++}`;

export const svg = (w, h, body, extra = '') =>
  `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${extra}>${body}</svg>`;

export function star(cx, cy, r, fill, inner = 0.46) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * inner : r;
    pts.push(`${(cx + Math.cos(a) * k).toFixed(1)},${(cy + Math.sin(a) * k).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="${(r * 0.18).toFixed(1)}" stroke-linejoin="round"/>`;
}

// The storm swirl, drawn around 0,0. Used as the mark for weather topics.
export const swirl = (r = 10, fill = '#fff', eye = '#1b2a80') => {
  const arm = `<path d="M0 ${-r * 0.42} C ${r * 0.7} ${-r * 0.75} ${r * 1.25} ${-r * 0.1} ${r * 0.85} ${r * 0.8} C ${r * 0.95} ${r * 0.1} ${r * 0.5} ${-r * 0.1} 0 ${r * 0.05} Z" fill="${fill}"/>`;
  return `<g>${arm}<g transform="rotate(120)">${arm}</g><g transform="rotate(240)">${arm}</g><circle r="${r * 0.52}" fill="${fill}"/><circle r="${r * 0.2}" fill="${eye}"/></g>`;
};

const I = (body, size = 28) => `<svg width="${size}" height="${size}" viewBox="0 0 28 28" aria-hidden="true">${body}</svg>`;

export const icon = {
  learn: s => I(`<path d="M14 7.5C11.4 5.6 8.3 5 4.5 5.3a1 1 0 0 0-1 1v13.2a1 1 0 0 0 1.1 1c3.4-.2 6.3.4 9.4 2.4 3.1-2 6-2.6 9.4-2.4a1 1 0 0 0 1.1-1V6.3a1 1 0 0 0-1-1C19.7 5 16.6 5.6 14 7.5z" fill="currentColor"/><path d="M14 8.5v13" stroke="#0f1434" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`, s),
  home: s => I(`<path d="M4.5 13.2 14 4.8l9.5 8.4v9.3a1.5 1.5 0 0 1-1.5 1.5h-4.7v-6.5h-6.6V24H6a1.5 1.5 0 0 1-1.5-1.5z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>`, s),
  shop: s => I(`<path d="M5.5 10.5h17l-1.3 12.3a2 2 0 0 1-2 1.7H8.8a2 2 0 0 1-2-1.7z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 13V9a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M10 13.5v1M18 13.5v1" stroke="#0f1434" stroke-width="2.6" stroke-linecap="round" opacity="0.5"/>`, s),
  profile: s => I(`<circle cx="14" cy="9.5" r="5.3" fill="currentColor"/><path d="M4.3 23.3c.7-4.7 4.5-7.3 9.7-7.3s9 2.6 9.7 7.3a1.5 1.5 0 0 1-1.5 1.7H5.8a1.5 1.5 0 0 1-1.5-1.7z" fill="currentColor"/>`, s),
  practice: s => I(`<circle cx="14" cy="14" r="10.4" fill="none" stroke="currentColor" stroke-width="3.2"/><circle cx="14" cy="14" r="4.6" fill="currentColor"/>`, s),
  down: s => I(`<path d="M7 11l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  left: s => I(`<path d="M17 6l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  right: s => I(`<path d="M11 6l8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  check: s => I(`<path d="M6 14.5l5.5 5.5L22 8.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  close: s => I(`<path d="M7 7l14 14M21 7L7 21" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/>`, s),
  star: s => I(star(14, 14.5, 10, 'currentColor'), s),
  coin: s => I(`<circle cx="14" cy="15" r="11" fill="#c98a00"/><circle cx="14" cy="13" r="11" fill="#ffc83d"/><circle cx="14" cy="13" r="7.2" fill="none" stroke="#fff3c4" stroke-width="2" opacity="0.8"/>${star(14, 13.2, 4.2, '#c98a00')}`, s),
  key: s => I(`<circle cx="9.5" cy="14" r="5.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 14h9M20.5 14v4M24 14v3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`, s),
  send: s => I(`<path d="M14 21V8M8.5 13.5 14 8l5.5 5.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  // topic marks
  swirl: s => I(`<g transform="translate(14 14)">${swirl(10, 'currentColor', '#0f1434')}</g>`, s),
  paw: s => I(`<g fill="currentColor"><ellipse cx="14" cy="18" rx="6.5" ry="5.5"/><circle cx="6.5" cy="12" r="2.8"/><circle cx="11" cy="7.5" r="2.8"/><circle cx="17" cy="7.5" r="2.8"/><circle cx="21.5" cy="12" r="2.8"/></g>`, s),
  bolt: s => I(`<path d="M16 3L6 16h6.5L11 25l11-14h-7z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`, s),
  flag: s => I(`<path d="M7 4v21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8.5 5.5h13l-3.5 5 3.5 5h-13z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`, s),
  strings: s => I(`<g stroke="currentColor" stroke-linecap="round" fill="none"><path d="M4 7h20" stroke-width="1.5"/><path d="M4 12q5-4 10 0t10 0" stroke-width="2.2"/><path d="M4 17h20" stroke-width="2.8"/><path d="M4 22h20" stroke-width="3.4"/></g>`, s),
  drop: s => I(`<path d="M14 3.5C10 9 6.5 12.6 6.5 17a7.5 7.5 0 0 0 15 0c0-4.4-3.5-8-7.5-13.5z" fill="currentColor"/>`, s),
  leaf: s => I(`<path d="M5 23C5 12 11 5 24 4c0 13-7 19-17 19z" fill="currentColor"/><path d="M6 22l11-11" stroke="#0f1434" stroke-width="2" stroke-linecap="round" opacity="0.4"/>`, s),
  globe: s => I(`<circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 4c-4 5-4 15 0 20M14 4c4 5 4 15 0 20M4.5 11h19M4.5 17h19" fill="none" stroke="currentColor" stroke-width="2"/>`, s),
  book: s => I(`<path d="M14 7.5C11.4 5.6 8.3 5 4.5 5.3a1 1 0 0 0-1 1v13.2a1 1 0 0 0 1.1 1c3.4-.2 6.3.4 9.4 2.4 3.1-2 6-2.6 9.4-2.4a1 1 0 0 0 1.1-1V6.3a1 1 0 0 0-1-1C19.7 5 16.6 5.6 14 7.5z" fill="currentColor"/>`, s),
};
export const MARKS = ['swirl', 'paw', 'bolt', 'flag', 'strings', 'drop', 'leaf', 'globe', 'book', 'star'];

// A shape filled with one colour, with more tones drawn inside it and cut to its edge.
export function form(shape, fill, inner = '') {
  if (!inner) return `<g fill="${fill}">${shape}</g>`;
  const id = uid();
  return `<g fill="${fill}">${shape}</g><clipPath id="${id}">${shape}</clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

export const at = (x, y, body, scale = 1, extra = '') =>
  `<g transform="translate(${x} ${y})${scale !== 1 ? ` scale(${scale})` : ''}" ${extra}>${body}</g>`;

export const floorShadow = (cx, cy, rx, ry = rx * 0.15, o = 0.34) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#060926" opacity="${o}"/>`;

// a four-point glint
export const glint = (x, y, r, fill = '#fff', o = 0.95) =>
  `<path d="M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}z" fill="${fill}" opacity="${o}"/>`;

// A polygon with its corners rounded off, as a path.
export function roundedPoly(pts, rad) {
  let d = '';
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const a = [p1[0] + (v1[0] / l1) * rad, p1[1] + (v1[1] / l1) * rad], b = [p1[0] + (v2[0] / l2) * rad, p1[1] + (v2[1] / l2) * rad];
    d += `${i ? 'L' : 'M'}${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// ---------------------------------------------------------------- the marks for each kind of node and step

const flask = (ink, cap) => `<g transform="translate(-16.1 -17) scale(1.15)"><path d="M11.5 5v6.8L5.3 21.6a2 2 0 0 0 1.7 3.1h14a2 2 0 0 0 1.7-3.1L16.5 11.8V5z" fill="${ink}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/><rect x="9.3" y="2.8" width="9.4" height="3.4" rx="1.7" fill="${ink}"/><circle cx="11.6" cy="19.8" r="1.9" fill="${cap}"/><circle cx="16.6" cy="21" r="1.3" fill="${cap}"/><circle cx="14.6" cy="16" r="1.1" fill="${cap}"/></g>`;

// Two arrows chasing each other round a circle: go over it again (a Review node).
function arrows(ink) {
  const R = 10.5, pt = a => [Math.cos(a) * R, Math.sin(a) * R];
  let s = '';
  for (const a0 of [Math.PI * 0.95, -Math.PI * 0.05]) {
    const a1 = a0 + Math.PI * 0.72;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    // the arrowhead at the end of the arc, pointing along it (clockwise on screen)
    const tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
    const tip = [x1 + tx * 6.4, y1 + ty * 6.4], l = [x1 + nx * 5.4, y1 + ny * 5.4], r = [x1 - nx * 5.4, y1 - ny * 5.4];
    s += `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${ink}" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M${l[0].toFixed(2)} ${l[1].toFixed(2)}L${tip[0].toFixed(2)} ${tip[1].toFixed(2)}L${r[0].toFixed(2)} ${r[1].toFixed(2)}z" fill="${ink}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  return `<g transform="translate(0 0.5)">${s}</g>`;
}

const book = (ink, cap) => `<path d="M0 -8.6C-3.6 -11.3 -8 -12.1 -13 -11.7a1.3 1.3 0 0 0-1.2 1.3V8.3a1.3 1.3 0 0 0 1.4 1.3c4.6-.3 8.6.5 12.8 3.2 4.2-2.7 8.2-3.5 12.8-3.2a1.3 1.3 0 0 0 1.4-1.3V-10.4a1.3 1.3 0 0 0-1.2-1.3C8 -12.1 3.6 -11.3 0 -8.6z" fill="${ink}"/><path d="M0 -6.6v17" stroke="${cap}" stroke-width="2.4" stroke-linecap="round"/>`;
const playSound = ink => `<path d="M-12.5 -9v18l13.5-9z" fill="${ink}" stroke="${ink}" stroke-width="3.6" stroke-linejoin="round"/><path d="M7 -6a8.5 8.5 0 0 1 0 12M11.6 -10.6a15 15 0 0 1 0 21.2" fill="none" stroke="${ink}" stroke-width="3.3" stroke-linecap="round"/>`;

export const MARK = {
  // an open book: a lesson on the path, or something to read (an Explain step)
  lesson: book,
  explain: book,
  // play with sound coming off it: an animation on its own (narrated scenes come with stage 2)
  animation: playSound,
  scene: playSound,
  // a flask: something to play with (a Play step)
  play: flask,
  // a question: a quick check
  check: ink => `<path d="M-7.2 -5.8a7.4 7.4 0 1 1 11.6 6.1c-2.6 1.8-4.2 3-4.2 6" fill="none" stroke="${ink}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="0.2" cy="12.6" r="2.9" fill="${ink}"/>`,
  // a star: a test, drawing on the lessons before it
  test: ink => star(0, 0.5, 14, ink),
  // a cup: the exam
  exam: (ink, cap) => `<g transform="translate(-13 -14.5)"><path d="M5.5 4H1.8q.3 6.2 5.6 7.4M20.5 4h3.7q-.3 6.2-5.6 7.4" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M5 1h16v9.5a8 8 0 0 1-16 0z" fill="${ink}" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/><rect x="10.8" y="17" width="4.4" height="6" fill="${ink}"/><rect x="5.5" y="22.5" width="15" height="5.5" rx="2.2" fill="${ink}"/>${star(13, 9, 4.2, cap)}</g>`,
  // two arrows round: a review of everything before it
  review: arrows,
  none: () => '',
};
export const HEX_KINDS = new Set(['test', 'exam']);

const STATE = {
  done: { top: '#ffc83d', hi: '#ffe9a6', side: '#d99a0b', deep: '#a36a00', ink: '#7a4d00', emboss: '#ffe9a6' },
  now: { top: '#49c6ff', hi: '#b3ebff', side: '#1b8fd1', deep: '#0f649c', ink: '#0e1436', emboss: '#9be3ff' },
  todo: { top: '#363e88', hi: '#5863b4', side: '#272e6a', deep: '#1a2052', ink: '#8e97dc', emboss: null },
};

const hexPts = r => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return [Math.cos(a) * r, Math.sin(a) * r]; });

// A raised button on the path, drawn around 0,0 (the middle of its top face).
// kind: lesson | test | exam | review | animation (or a step's kind).  state: done | now | todo.
// progress: 0..1 draws the ring. Tests and exams are hexagons, and an exam is a size up.
export function stepButton({ kind = 'lesson', state = 'todo', r = kind === 'exam' ? 34 : 30, depth = 8, progress = null }) {
  const C = STATE[state];
  const hex = HEX_KINDS.has(kind);
  const S = (dy = 0, grow = 0, dx = 0) => hex
    ? `<path d="${roundedPoly(hexPts(r + 3 + grow), 9)}" transform="translate(${dx} ${dy})"/>`
    : `<circle cx="${dx}" cy="${dy}" r="${r + grow}"/>`;
  const R = hex ? r + 3 : r;
  let s = floorShadow(0, depth + R * 0.9, R * 1.05, R * 0.34, 0.42);
  if (progress !== null) {
    const rr = R + 11, cy = depth / 2, len = 2 * Math.PI * rr;
    s = `<circle cy="${cy}" r="${rr + 9}" fill="#49c6ff" opacity="0.08"/>
      <circle cy="${cy}" r="${rr}" fill="none" stroke="#2a3168" stroke-width="7"/>
      <circle class="ring" cy="${cy}" r="${rr}" fill="none" stroke="#ffc83d" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(len * Math.max(0.02, progress)).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 0 ${cy})"/>`;
  }
  s += `<g fill="#0c1030">${S(depth + 2, 5)}</g>`;
  s += form(S(depth), C.deep, `<g fill="${C.side}">${S(depth - 4)}</g>`);
  const top = form(S(0), C.side,
    `<g fill="${C.top}">${S(-3.5, 0, -3)}</g>
     <ellipse cx="${-R * 0.3}" cy="${-R * 0.42}" rx="${R * 0.62}" ry="${R * 0.36}" fill="${C.hi}" opacity="0.5" transform="rotate(-30 ${-R * 0.3} ${-R * 0.42})"/>
     <g fill="none" stroke="${C.hi}" stroke-width="1.6" opacity="0.4">${S(0, -4.5)}</g>`);
  const shine = `<path d="M${(-R * 0.78).toFixed(1)} ${(-R * 0.16).toFixed(1)}A${(R * 0.8).toFixed(1)} ${(R * 0.8).toFixed(1)} 0 0 1 ${(-R * 0.3).toFixed(1)} ${(-R * 0.74).toFixed(1)}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity="${state === 'todo' ? 0.28 : 0.8}"/>`;
  const mark = MARK[kind] || MARK.none;
  const symbol = (C.emboss ? `<g transform="translate(0 1.6)" opacity="0.75">${mark(C.emboss, C.emboss)}</g>` : '') + mark(C.ink, C.top);
  s += `<g class="cap">${top}${shine}${symbol}</g>`;
  return s;
}

// ---------------------------------------------------------------- a treasure chest (stage0/screens/js/art.js)

// 60 x 52 with the floor at y=50. Open, it's been emptied: the lid tipped back, dark inside.
export function chest(open = false) {
  const wood = ['#b9703d', '#8a4a26', '#d99258'], gold = ['#ffc83d', '#c98a00', '#ffe9a6'];
  const strap = (x, y, h) => `<rect x="${x}" y="${y}" width="7" height="${h}" fill="${gold[0]}"/><rect x="${x}" y="${y}" width="2.2" height="${h}" fill="${gold[2]}"/><rect x="${x + 5}" y="${y}" width="2" height="${h}" fill="${gold[1]}"/>`;
  const box = form('<rect x="5" y="25" width="50" height="23" rx="4"/>', wood[0],
    `<rect x="5" y="40" width="50" height="8" fill="${wood[1]}"/><rect x="47" y="25" width="8" height="23" fill="${wood[1]}" opacity="0.55"/>
     <path d="M5 33h50" stroke="${wood[1]}" stroke-width="1.4" opacity="0.7"/><rect x="5" y="25" width="50" height="3" fill="${wood[2]}" opacity="0.7"/>
     ${strap(12, 25, 23)}${strap(41, 25, 23)}`);
  const lidShape = '<path d="M4 27v-8a13 13 0 0 1 13-13h26a13 13 0 0 1 13 13v8z"/>';
  const lid = form(lidShape, wood[0],
    `<path d="M4 27v-8a13 13 0 0 1 13-13h10v3H18a10 10 0 0 0-10 10v8z" fill="${wood[2]}" opacity="0.85"/>
     <path d="M48 8a13 13 0 0 1 8 11v8h-8z" fill="${wood[1]}" opacity="0.6"/><path d="M4 16h52" stroke="${wood[1]}" stroke-width="1.4" opacity="0.6"/>
     ${strap(12, 4, 24)}${strap(41, 4, 24)}`)
    + `<rect x="2" y="22.5" width="56" height="6" rx="3" fill="${gold[1]}"/><rect x="2" y="22.5" width="56" height="4" rx="2" fill="${gold[0]}"/><rect x="5" y="23.3" width="22" height="1.5" rx="0.75" fill="${gold[2]}"/>`;
  const clasp = `<rect x="25" y="24" width="10" height="12" rx="3" fill="${gold[1]}"/><rect x="25" y="24" width="10" height="10.5" rx="3" fill="${gold[0]}"/><rect x="26.2" y="25" width="2.2" height="8" rx="1.1" fill="${gold[2]}"/><circle cx="30" cy="29" r="1.9" fill="#7a4d00"/><rect x="29.2" y="29" width="1.6" height="3.6" rx="0.8" fill="#7a4d00"/>`;
  if (!open) return `${floorShadow(30, 49, 29, 4.5)}<g class="box">${box}</g><g class="lid">${lid}${clasp}</g>`;
  return `${floorShadow(30, 49, 29, 4.5)}
    <g class="lid"><g transform="translate(0 -15) rotate(-24 30 27)" opacity="0.96">${lid}</g></g>
    <path d="M6 27h48l-3 -7H9z" fill="#3b1d10"/><path d="M6 27h48l-1.2 -2.8H7.2z" fill="#2a1309"/>
    <g class="box">${box}</g><rect x="3" y="24" width="54" height="4.5" rx="2.2" fill="${gold[1]}"/><rect x="3" y="24" width="54" height="2.8" rx="1.4" fill="${gold[0]}"/>`;
}

// A chest as a node on the path, drawn around 0,0 like a button: dim while it's still ahead, shining when
// it's the next thing to reach, and open once opened.
export function chestNode({ state = 'todo' } = {}) {
  const s = 1.25;
  const body = `<g transform="translate(${-30 * s} ${36 - 50 * s}) scale(${s})">${chest(state === 'done')}</g>`;
  if (state === 'todo') return `<g class="cap" opacity="0.5">${body}</g>`;
  if (state === 'done') return `<g class="cap">${body}</g>`;
  return `<circle cy="10" r="46" fill="#ffc83d" opacity="0.07"/><circle cy="10" r="36" fill="#ffc83d" opacity="0.07"/>
    <g class="cap">${body}</g><g class="glints">${glint(30, -18, 6, '#ffe9a6')}${glint(-33, -8, 4, '#fff')}${glint(36, 22, 3.4, '#fff', 0.8)}</g>`;
}

// ---------------------------------------------------------------- topic medallions

export const PALETTE = {
  orange: { top: '#ffa23a', hi: '#ffd08a', side: '#d9741f', deep: '#a3500f', ink: '#fff' },
  cyan: { top: '#49c6ff', hi: '#b3ebff', side: '#1b8fd1', deep: '#0f649c', ink: '#fff' },
  pink: { top: '#ee4b7a', hi: '#ff9ab8', side: '#c2305c', deep: '#8f1f44', ink: '#fff' },
  yellow: { top: '#ffd75a', hi: '#fff0b8', side: '#e0a918', deep: '#a87600', ink: '#6b4300' },
  purple: { top: '#a67cf5', hi: '#d3bcff', side: '#7a4cd6', deep: '#54309e', ink: '#fff' },
  teal: { top: '#2bc4a4', hi: '#7df0cf', side: '#1fa78c', deep: '#127a85', ink: '#fff' },
};
export const COLOURS = Object.keys(PALETTE);
const DULL = { top: '#7d86b3', hi: '#a9b0d6', side: '#59618f', deep: '#434a78', ink: '#e6eaff' };

// A topic's mark on a small raised disc, as a whole <svg> of the given size.
export function medallion({ colour = 'cyan', mark = 'star' } = {}, size = 38, dull = false) {
  const T = dull ? DULL : (PALETTE[colour] || PALETTE.cyan);
  const draw = icon[mark] || icon.star;
  const r = 15, d = 3;
  const inner = draw(21).replace('<svg ', `<svg x="-10.5" y="-10.5" style="color:${T.ink}" `);
  const body = form(`<circle cy="${d}" r="${r}"/>`, T.deep, `<circle cy="${d - 2}" r="${r}" fill="${T.side}"/>`)
    + form(`<circle r="${r}"/>`, T.side, `<circle cx="-1.6" cy="-2" r="${r}" fill="${T.top}"/><ellipse cx="-5" cy="-7" rx="8.5" ry="4.6" fill="${T.hi}" opacity="0.55" transform="rotate(-30 -5 -7)"/>`)
    + `<path d="M-11.6 -3A12 12 0 0 1 -4.4 -11.2" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" opacity="0.8"/>`
    + `<g transform="translate(0 1)" opacity="0.3">${draw(21).replace('<svg ', `<svg x="-10.5" y="-10.5" style="color:${T.deep}" `)}</g>${inner}`;
  return `<svg class="medal" width="${size}" height="${size}" viewBox="-18 -17 36 37" style="flex:none" aria-hidden="true">${body}</svg>`;
}

// ---------------------------------------------------------------- small marks

const GOLD = ['#ffc83d', '#c98a00', '#ffe9a6', '#8f5e00'];

// A plain gold cup with a star, 34 x 44.
export function cup() {
  return `<path d="M6 8H1.5a1 1 0 0 0-1 1.2c.8 4.8 3 7.3 7 7.8M28 8h4.5a1 1 0 0 1 1 1.2c-.8 4.8-3 7.3-7 7.8" fill="none" stroke="${GOLD[1]}" stroke-width="3"/>
    <rect x="14" y="26" width="6" height="9" fill="${GOLD[1]}"/><rect x="14" y="26" width="2.4" height="9" fill="${GOLD[0]}"/>
    <rect x="7" y="35" width="20" height="8" rx="3" fill="${GOLD[1]}"/><rect x="7" y="35" width="20" height="4" rx="2" fill="${GOLD[0]}"/>
    <path d="M5 2h24v11a12 12 0 0 1-24 0z" fill="${GOLD[0]}"/><path d="M5 2h7v11a12 12 0 0 0 6 10.4A12 12 0 0 1 5 13z" fill="${GOLD[2]}"/>
    <path d="M24 2h5v11a12 12 0 0 1-7 10.9A12 12 0 0 0 24 13z" fill="${GOLD[1]}" opacity="0.55"/>${star(17, 12, 5.6, '#fff')}`;
}

// A warning mark, 22 x 20
export function hazard() {
  const tri = roundedPoly([[11, 1], [21, 18.5], [1, 18.5]], 3);
  return `<path d="${tri}" fill="#c98a00" transform="translate(0 1.6)"/>${form(`<path d="${tri}"/>`, '#ffc83d', '<path d="M11 1L1 18.5h5.5L13.4 4z" fill="#ffe9a6" opacity="0.7"/>')}
    <rect x="9.6" y="6.4" width="2.8" height="6.4" rx="1.4" fill="#2a1650"/><circle cx="11" cy="15.3" r="1.6" fill="#2a1650"/>`;
}

// ---------------------------------------------------------------- scenery for the path

export function pine(h = 60, tone = ['#222b62', '#1b2354', '#2b3674']) {
  const w = h * 0.5;
  const tier = (y, ww, hh) => `<path d="M0 ${y}L${ww} ${y + hh}Q0 ${y + hh + 5} ${-ww} ${y + hh}Z" fill="${tone[0]}"/><path d="M0 ${y}L${ww} ${y + hh}Q${ww * 0.5} ${y + hh + 2.6} 0 ${y + hh + 3.4}Z" fill="${tone[1]}"/><path d="M0 ${y}L${-ww * 0.5} ${y + hh * 0.5}" stroke="${tone[2]}" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<rect x="${-h * 0.045}" y="${-h * 0.2}" width="${h * 0.09}" height="${h * 0.2}" fill="${tone[1]}"/>
    ${tier(-h * 0.62, w * 0.5, h * 0.48)}${tier(-h * 0.84, w * 0.38, h * 0.4)}${tier(-h, w * 0.26, h * 0.32)}`;
}

export const rock = (w = 26) => `<path d="M0 0q${w * 0.1} ${-w * 0.42} ${w * 0.42} ${-w * 0.46}q${w * 0.4} ${-w * 0.02} ${w * 0.58} ${w * 0.46}z" fill="#232c64"/><path d="M0 0q${w * 0.1} ${-w * 0.42} ${w * 0.42} ${-w * 0.46}l${-w * 0.1} ${w * 0.46}z" fill="#2c3776"/>`;

// Three snippet cards for the Review card on Practice, 70 x 92 each: a storm, a leaf and a bolt.
export function snippet(kind) {
  const id = uid('snip');
  const pic = {
    storm: `<rect x="5" y="5" width="60" height="62" fill="#1b2a80"/><path d="M5 22q30 -8 60 0v14q-30 -8 -60 0z" fill="#8b3fbf"/><path d="M5 36q30 -8 60 0v14q-30 -8 -60 0z" fill="#ee4b7a"/><path d="M5 50q30 -8 60 0v17H5z" fill="#ffa23a"/>
      <g transform="translate(35 33) rotate(20)">${swirl(13, '#fff', '#1b2a80')}</g>`,
    leaf: `<rect x="5" y="5" width="60" height="62" fill="#2bc4a4"/><circle cx="20" cy="56" r="20" fill="#1fa78c"/><g transform="translate(17 14) scale(1.3)" style="color:#fff4dc">${icon.leaf(28)}</g>`,
    bolt: `<rect x="5" y="5" width="60" height="62" fill="#3b3db8"/><circle cx="35" cy="34" r="24" fill="#ffd75a" opacity="0.22"/>
      <path d="M40 12L22 38h11l-3 20l19-27H37z" fill="#c98a00" transform="translate(1.4 1.8)"/><path d="M40 12L22 38h11l-3 20l19-27H37z" fill="#ffd75a" stroke="#ffd75a" stroke-width="2" stroke-linejoin="round"/><path d="M38 16L26 35" stroke="#fff6cf" stroke-width="2.4" stroke-linecap="round"/>`,
  }[kind];
  return `<rect x="1.5" y="3" width="70" height="92" rx="9" fill="#060926" opacity="0.4"/>
    <rect width="70" height="92" rx="9" fill="#fff4dc"/><rect y="78" width="70" height="14" rx="7" fill="#e8d6ae"/><rect y="74" width="70" height="10" fill="#fff4dc"/>
    <clipPath id="${id}"><rect x="5" y="5" width="60" height="62" rx="5"/></clipPath><g clip-path="url(#${id})">${pic}<path d="M5 5h60v10H5z" fill="#fff" opacity="0.08"/></g>
    <rect x="12" y="73" width="46" height="5" rx="2.5" fill="#d9c59a"/><rect x="20" y="82" width="30" height="4" rx="2" fill="#e4d4ae"/>`;
}
