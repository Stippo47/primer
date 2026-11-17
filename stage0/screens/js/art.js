// Drawn things for round 2: path buttons, topic medallions, the bear plush, chests, trophies, small marks.
// Everything is lit from the upper left: a base tone, a shade on the lower right, a lighter tone
// on the upper left and one bright highlight. Each function returns SVG drawn from 0,0.

import { star, swirl, icon } from './kit.js';

let count = 0;
export const uid = (p = 'a') => `${p}${count++}`;

// A shape filled with one colour, with more tones drawn inside it and cut to its edge.
// shape is SVG without a fill, e.g. '<circle r="10"/>'.
export function form(shape, fill, inner = '') {
  if (!inner) return `<g fill="${fill}">${shape}</g>`;
  const id = uid();
  return `<g fill="${fill}">${shape}</g><clipPath id="${id}">${shape}</clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

export const at = (x, y, body, scale = 1, extra = '') =>
  `<g transform="translate(${x} ${y})${scale !== 1 ? ` scale(${scale})` : ''}" ${extra}>${body}</g>`;

export const floorShadow = (cx, cy, rx, ry = rx * 0.15, o = 0.34) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#060926" opacity="${o}"/>`;

// A round or oval lump in three tones. c = [base, shade, light]
export function ball(cx, cy, rx, ry, c, { k = 0.17, shine = 0.5, rot = 0 } = {}) {
  const tr = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';
  return form(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${tr}/>`, c[1],
    `<ellipse cx="${cx - rx * k}" cy="${cy - ry * k * 1.15}" rx="${rx}" ry="${ry}" fill="${c[0]}"${tr}/>
     <ellipse cx="${cx - rx * 0.36}" cy="${cy - ry * 0.44}" rx="${rx * 0.4}" ry="${ry * 0.24}" fill="${c[2]}" opacity="${shine}" transform="rotate(${rot - 32} ${cx - rx * 0.36} ${cy - ry * 0.44})"/>`);
}

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

// ---------------------------------------------------------------- the marks for each kind of step

const flask = (ink, cap) => `<g transform="translate(-16.1 -17) scale(1.15)"><path d="M11.5 5v6.8L5.3 21.6a2 2 0 0 0 1.7 3.1h14a2 2 0 0 0 1.7-3.1L16.5 11.8V5z" fill="${ink}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/><rect x="9.3" y="2.8" width="9.4" height="3.4" rx="1.7" fill="${ink}"/><circle cx="11.6" cy="19.8" r="1.9" fill="${cap}"/><circle cx="16.6" cy="21" r="1.3" fill="${cap}"/><circle cx="14.6" cy="16" r="1.1" fill="${cap}"/></g>`;

export const MARK = {
  // an open book: a lesson
  lesson: (ink, cap) => `<path d="M0 -8.6C-3.6 -11.3 -8 -12.1 -13 -11.7a1.3 1.3 0 0 0-1.2 1.3V8.3a1.3 1.3 0 0 0 1.4 1.3c4.6-.3 8.6.5 12.8 3.2 4.2-2.7 8.2-3.5 12.8-3.2a1.3 1.3 0 0 0 1.4-1.3V-10.4a1.3 1.3 0 0 0-1.2-1.3C8 -12.1 3.6 -11.3 0 -8.6z" fill="${ink}"/><path d="M0 -6.6v17" stroke="${cap}" stroke-width="2.4" stroke-linecap="round"/>`,
  // play with sound coming off it: a narrated scene
  scene: ink => `<path d="M-12.5 -9v18l13.5-9z" fill="${ink}" stroke="${ink}" stroke-width="3.6" stroke-linejoin="round"/><path d="M7 -6a8.5 8.5 0 0 1 0 12M11.6 -10.6a15 15 0 0 1 0 21.2" fill="none" stroke="${ink}" stroke-width="3.3" stroke-linecap="round"/>`,
  // a flask: a playground step
  play: flask,
  // a question: a quick check
  check: ink => `<path d="M-7.2 -5.8a7.4 7.4 0 1 1 11.6 6.1c-2.6 1.8-4.2 3-4.2 6" fill="none" stroke="${ink}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="0.2" cy="12.6" r="2.9" fill="${ink}"/>`,
  // a star: the unit test
  test: ink => star(0, 0.5, 14, ink),
  none: () => '',
};

const STATE = {
  done: { top: '#ffc83d', hi: '#ffe9a6', side: '#d99a0b', deep: '#a36a00', ink: '#7a4d00', emboss: '#ffe9a6' },
  now: { top: '#49c6ff', hi: '#b3ebff', side: '#1b8fd1', deep: '#0f649c', ink: '#0e1436', emboss: '#9be3ff' },
  todo: { top: '#363e88', hi: '#5863b4', side: '#272e6a', deep: '#1a2052', ink: '#8e97dc', emboss: null },
};

const hexPts = r => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return [Math.cos(a) * r, Math.sin(a) * r]; });

// A raised button on the path, drawn around 0,0 (the middle of its top face).
// kind: lesson | scene | play | check | test | none.  state: done | now | todo.  progress: 0..1 draws the ring.
export function stepButton({ kind = 'lesson', state = 'todo', r = 30, depth = 8, progress = null, colors = null }) {
  const C = colors || STATE[state];
  const hex = kind === 'test';
  const S = (dy = 0, grow = 0, dx = 0) => hex
    ? `<path d="${roundedPoly(hexPts(r + 3 + grow), 9)}" transform="translate(${dx} ${dy})"/>`
    : `<circle cx="${dx}" cy="${dy}" r="${r + grow}"/>`;
  const R = hex ? r + 3 : r;
  let s = floorShadow(0, depth + R * 0.9, R * 1.05, R * 0.34, 0.42);
  if (progress !== null) {
    const rr = R + 11, cy = depth / 2, len = 2 * Math.PI * rr;
    s = `<circle cy="${cy}" r="${rr + 9}" fill="#49c6ff" opacity="0.08"/>
      <circle cy="${cy}" r="${rr}" fill="none" stroke="#2a3168" stroke-width="7"/>
      <circle class="ring" cy="${cy}" r="${rr}" fill="none" stroke="#ffc83d" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(len * progress).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 0 ${cy})"/>`;
  }
  // the socket it sits in
  s += `<g fill="#0c1030">${S(depth + 2, 5)}</g>`;
  // the side wall, two tones
  s += form(S(depth), C.deep, `<g fill="${C.side}">${S(depth - 4)}</g>`);
  // the top face (class cap: this is the part that moves when pressed)
  const top = form(S(0), C.side,
    `<g fill="${C.top}">${S(-3.5, 0, -3)}</g>
     <ellipse cx="${-R * 0.3}" cy="${-R * 0.42}" rx="${R * 0.62}" ry="${R * 0.36}" fill="${C.hi}" opacity="0.5" transform="rotate(-30 ${-R * 0.3} ${-R * 0.42})"/>
     <g fill="none" stroke="${C.hi}" stroke-width="1.6" opacity="0.4">${S(0, -4.5)}</g>`);
  const shine = `<path d="M${(-R * 0.78).toFixed(1)} ${(-R * 0.16).toFixed(1)}A${(R * 0.8).toFixed(1)} ${(R * 0.8).toFixed(1)} 0 0 1 ${(-R * 0.3).toFixed(1)} ${(-R * 0.74).toFixed(1)}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity="${state === 'todo' && !colors ? 0.28 : 0.8}"/>`;
  const mark = MARK[kind] || MARK.none;
  const symbol = (C.emboss ? `<g transform="translate(0 1.6)" opacity="0.75">${mark(C.emboss, C.emboss)}</g>` : '') + mark(C.ink, C.top);
  s += `<g class="cap">${top}${shine}${symbol}</g>`;
  return s;
}

// ---------------------------------------------------------------- topic medallions

export const TOPIC = {
  bears: { name: 'Bears', top: '#ffa23a', hi: '#ffd08a', side: '#d9741f', deep: '#a3500f', ink: '#fff', mark: icon.paw },
  hurricanes: { name: 'Hurricanes', top: '#49c6ff', hi: '#b3ebff', side: '#1b8fd1', deep: '#0f649c', ink: '#fff', mark: icon.swirl },
  flags: { name: 'World flags', top: '#ee4b7a', hi: '#ff9ab8', side: '#c2305c', deep: '#8f1f44', ink: '#fff', mark: icon.flag },
  circuits: { name: 'Circuits', top: '#ffd75a', hi: '#fff0b8', side: '#e0a918', deep: '#a87600', ink: '#6b4300', mark: icon.bolt },
  guitar: { name: 'Guitar strings', top: '#a67cf5', hi: '#d3bcff', side: '#7a4cd6', deep: '#54309e', ink: '#fff', mark: icon.strings },
};

// A topic's mark on a small raised disc, as a whole <svg> of the given size.
export function medallion(topic, size = 38, dull = false) {
  const T = dull ? { ...TOPIC[topic], top: '#7d86b3', hi: '#a9b0d6', side: '#59618f', deep: '#434a78', ink: '#e6eaff' } : TOPIC[topic];
  const r = 15, d = 3;
  const inner = T.mark(21).replace('<svg ', `<svg x="-10.5" y="-10.5" style="color:${T.ink}" `);
  const body = form(`<circle cy="${d}" r="${r}"/>`, T.deep, `<circle cy="${d - 2}" r="${r}" fill="${T.side}"/>`)
    + form(`<circle r="${r}"/>`, T.side, `<circle cx="-1.6" cy="-2" r="${r}" fill="${T.top}"/><ellipse cx="-5" cy="-7" rx="8.5" ry="4.6" fill="${T.hi}" opacity="0.55" transform="rotate(-30 -5 -7)"/>`)
    + `<path d="M-11.6 -3A12 12 0 0 1 -4.4 -11.2" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" opacity="0.8"/>`
    + `<g transform="translate(0 1)" opacity="0.3">${T.mark(21).replace('<svg ', `<svg x="-10.5" y="-10.5" style="color:${T.deep}" `)}</g>${inner}`;
  return `<svg width="${size}" height="${size}" viewBox="-18 -17 36 37" style="flex:none">${body}</svg>`;
}

// ---------------------------------------------------------------- the bear plush, 120 x 126 with the floor at y=124

const FUR = ['#bd7642', '#8c4f2b', '#e09a62'], CREAM = ['#f5dcb6', '#dcb588', '#fff5e0'];
const INK = '#2a1650';

// the head alone, around 60,42 (used on its own on a review card)
export function bearHead() {
  return `<g class="ear-l">${ball(35, 19, 11.5, 11.5, FUR)}<circle cx="35.5" cy="20.5" r="6" fill="${CREAM[1]}"/><circle cx="34.6" cy="19.6" r="5.2" fill="#e9bf94"/></g>
    <g class="ear-r">${ball(85, 19, 11.5, 11.5, FUR)}<circle cx="85.5" cy="20.5" r="6" fill="${CREAM[1]}"/><circle cx="84.6" cy="19.6" r="5.2" fill="#e9bf94"/></g>
    ${ball(60, 42, 32, 28, FUR, { k: 0.12, shine: 0.55 })}
    <path d="M60 14.5v8" stroke="${FUR[1]}" stroke-width="1.5" stroke-dasharray="2 2.2" stroke-linecap="round" opacity="0.8"/>
    <circle cx="38.5" cy="51" r="4.6" fill="#ff8f6b" opacity="0.42"/><circle cx="81.5" cy="51" r="4.6" fill="#ff8f6b" opacity="0.42"/>
    ${ball(60, 53, 14.5, 11, CREAM, { k: 0.12, shine: 0.8 })}
    <ellipse cx="60" cy="48.4" rx="5.4" ry="3.9" fill="${INK}"/><ellipse cx="58.3" cy="47.2" rx="1.7" ry="1" fill="#fff" opacity="0.75"/>
    <path d="M60 52.2v3.4M60 55.6q-3.2 3.6-6.6 1.2M60 55.6q3.2 3.6 6.6 1.2" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <g class="eyes"><circle cx="46.5" cy="40" r="3.9" fill="${INK}"/><circle cx="73.5" cy="40" r="3.9" fill="${INK}"/>
      <circle cx="45.2" cy="38.6" r="1.35" fill="#fff"/><circle cx="72.2" cy="38.6" r="1.35" fill="#fff"/></g>`;
}

export function bearPlush() {
  const pad = (cx, cy) => ball(cx, cy, 9.5, 8, CREAM, { k: 0.14, shine: 0.7 });
  const arm = (cx, cy, rot) => form(`<ellipse cx="${cx}" cy="${cy}" rx="10.5" ry="18" transform="rotate(${rot} ${cx} ${cy})"/>`, FUR[1],
    `<ellipse cx="${cx - 2.2}" cy="${cy - 3}" rx="10.5" ry="18" fill="${FUR[0]}" transform="rotate(${rot} ${cx} ${cy})"/><ellipse cx="${cx - 3}" cy="${cy - 8}" rx="4" ry="7" fill="${FUR[2]}" opacity="0.45" transform="rotate(${rot} ${cx} ${cy})"/>`);
  return `${floorShadow(60, 123, 46, 6)}
    <g class="bear-body">
      ${ball(31, 108, 17.5, 14.5, FUR)}${ball(89, 108, 17.5, 14.5, FUR)}
      ${pad(30, 110)}${pad(90, 110)}
      ${ball(60, 86, 30, 29, FUR, { k: 0.13 })}
      ${form('<ellipse cx="60" cy="91" rx="18" ry="19"/>', '#e2b384', '<ellipse cx="57.5" cy="88" rx="18" ry="19" fill="#eec79c"/>')}
      <ellipse cx="60" cy="91" rx="18" ry="19" fill="none" stroke="#c9976a" stroke-width="1.3" stroke-dasharray="2.6 2.6"/>
      ${arm(29, 82, 22)}${arm(91, 82, -22)}
      <g transform="translate(60 69)">
        <path d="M-2 0l-15 -8.5q-3 8.5 0 17z" fill="#2bc4a4"/><path d="M2 0l15 -8.5q3 8.5 0 17z" fill="#1fa78c"/>
        <path d="M-2 0l-15 -8.5q-1 3 -1.4 6z" fill="#6fe6cb" opacity="0.8"/>
        <rect x="-5" y="-5.5" width="10" height="11" rx="3.6" fill="#127a85"/><rect x="-5" y="-5.5" width="10" height="5" rx="2.5" fill="#2bc4a4"/>
      </g>
    </g>
    <g class="bear-head">${bearHead()}</g>`;
}

// ---------------------------------------------------------------- a treasure chest, 60 x 52 with the floor at y=50

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
  if (!open) return `${floorShadow(30, 49, 29, 4.5)}${box}${lid}${clasp}`;
  // open and already emptied: the lid tipped back, dark inside
  return `${floorShadow(30, 49, 29, 4.5)}
    <g transform="translate(0 -15) rotate(-24 30 27)" opacity="0.96">${lid}</g>
    <path d="M6 27h48l-3 -7H9z" fill="#3b1d10"/><path d="M6 27h48l-1.2 -2.8H7.2z" fill="#2a1309"/>
    ${box}<rect x="3" y="24" width="54" height="4.5" rx="2.2" fill="${gold[1]}"/><rect x="3" y="24" width="54" height="2.8" rx="1.4" fill="${gold[0]}"/>`;
}

// ---------------------------------------------------------------- trophies

const GOLD = ['#ffc83d', '#c98a00', '#ffe9a6', '#8f5e00'];

// The Bears exam trophy: a leaping gold salmon on a plinth. 76 x 92 with the floor at y=90.
export function goldSalmon() {
  const fishShape = '<path d="M-25 0C-19 -11.5 5 -14 22 -4.2C25.4 -2.2 25.4 2.2 22 4.2C5 14 -19 11.5 -25 0Z"/>';
  const fish = `<path d="M-21 0L-36 -13Q-31 0 -36 13Z" fill="${GOLD[1]}"/><path d="M-21 0L-36 -13Q-33.5 -6 -32.6 -1.4Z" fill="${GOLD[0]}"/>
    <path d="M-8 -9Q1 -22 11 -8.6Z" fill="${GOLD[1]}"/><path d="M-1 9.5l-7 9l12 -5z" fill="${GOLD[3]}"/>
    ${form(fishShape, GOLD[1], `<path d="M-25 -3C-19 -14.5 5 -17 22 -7.2C25.4 -5.2 25.4 -0.8 22 1.2C5 8 -19 6.5 -25 -3Z" fill="${GOLD[0]}"/>
      <path d="M-20 -4.5C-12 -11 4 -12.5 17 -6.5C5 -9.8 -9 -8.8 -20 -4.5Z" fill="${GOLD[2]}"/>
      <path d="M10.5 -9.5q-4.4 9 0 16.5" fill="none" stroke="${GOLD[1]}" stroke-width="1.6"/>
      <path d="M-13 -1.5q2.5 2.5 0 5M-6.5 -2.5q2.5 2.5 0 5M0 -2.5q2.5 2.5 0 5" fill="none" stroke="${GOLD[1]}" stroke-width="1.3" stroke-linecap="round"/>`)}
    <circle cx="16.4" cy="-2" r="2.3" fill="${GOLD[3]}"/><circle cx="15.7" cy="-2.7" r="0.8" fill="#fff"/>
    <path d="M-16 -6.6q9 -4.2 19 -3.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>`;
  const plinth = `${floorShadow(38, 89, 30, 4.5)}
    ${form('<path d="M14 88l4 -14h40l4 14z"/>', '#6a2f9c', '<path d="M14 88l4 -14h18v14z" fill="#8b3fbf"/><path d="M18 74h40l1 3.4H17z" fill="#b06fe0" opacity="0.8"/>')}
    <rect x="20" y="66" width="36" height="9" rx="3" fill="#5f2a8a"/><rect x="20" y="66" width="36" height="5.5" rx="2.7" fill="#8b3fbf"/><rect x="23" y="67.2" width="14" height="1.6" rx="0.8" fill="#c78df0"/>
    <rect x="29" y="78.5" width="18" height="6.5" rx="2" fill="${GOLD[1]}"/><rect x="29" y="78.5" width="18" height="4.6" rx="2" fill="${GOLD[0]}"/>
    <rect x="35.6" y="50" width="4.8" height="17" fill="${GOLD[1]}"/><rect x="35.6" y="50" width="1.8" height="17" fill="${GOLD[0]}"/>`;
  return `${plinth}<g class="fish"><g transform="translate(38 31) rotate(-38)">${fish}</g>${glint(63, 13, 5)}${glint(14, 44, 3.2, '#fff', 0.7)}</g>`;
}

// A plain gold cup with a star, 34 x 44 (the same build as round 1's storm cup, which set the bar).
export function cup(mark = 'star') {
  return `<path d="M6 8H1.5a1 1 0 0 0-1 1.2c.8 4.8 3 7.3 7 7.8M28 8h4.5a1 1 0 0 1 1 1.2c-.8 4.8-3 7.3-7 7.8" fill="none" stroke="${GOLD[1]}" stroke-width="3"/>
    <rect x="14" y="26" width="6" height="9" fill="${GOLD[1]}"/><rect x="14" y="26" width="2.4" height="9" fill="${GOLD[0]}"/>
    <rect x="7" y="35" width="20" height="8" rx="3" fill="${GOLD[1]}"/><rect x="7" y="35" width="20" height="4" rx="2" fill="${GOLD[0]}"/>
    <path d="M5 2h24v11a12 12 0 0 1-24 0z" fill="${GOLD[0]}"/><path d="M5 2h7v11a12 12 0 0 0 6 10.4A12 12 0 0 1 5 13z" fill="${GOLD[2]}"/>
    <path d="M24 2h5v11a12 12 0 0 1-7 10.9A12 12 0 0 0 24 13z" fill="${GOLD[1]}" opacity="0.55"/>
    ${mark === 'star' ? star(17, 12, 5.6, '#fff') : `<g transform="translate(17 12)">${swirl(6.5, '#fff', GOLD[1])}</g>`}`;
}

// A crown for "best", 30 x 24
export function crown() {
  const shape = '<path d="M2 21L0.5 5.5L8.5 11.5L15 1.5L21.5 11.5L29.5 5.5L28 21Z"/>';
  return `${form(shape.replace('<path', '<path stroke-linejoin="round"'), GOLD[0],
    `<path d="M15 1.5L21.5 11.5L29.5 5.5L28 21H15z" fill="${GOLD[1]}" opacity="0.45"/><path d="M2 21L0.5 5.5L8.5 11.5L15 1.5v6L9.5 15L4 10.5L5 21z" fill="${GOLD[2]}" opacity="0.8"/>`)}
    <rect x="1.5" y="18" width="27" height="5.5" rx="2.2" fill="${GOLD[1]}"/><rect x="1.5" y="18" width="27" height="3.2" rx="1.6" fill="${GOLD[0]}"/>
    <circle cx="15" cy="14" r="2.3" fill="#ee4b7a"/><circle cx="14.3" cy="13.3" r="0.8" fill="#ffc2d4"/>
    <circle cx="0.8" cy="5" r="2" fill="${GOLD[2]}"/><circle cx="15" cy="1.8" r="2.1" fill="${GOLD[2]}"/><circle cx="29.2" cy="5" r="2" fill="${GOLD[0]}"/>`;
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

export const pawPrint = (s = 1, fill = '#222a60') => `<g transform="scale(${s})" fill="${fill}"><ellipse cx="0" cy="4" rx="5.4" ry="4.4"/><circle cx="-6" cy="-1.6" r="2.2"/><circle cx="-2.2" cy="-5" r="2.2"/><circle cx="2.2" cy="-5" r="2.2"/><circle cx="6" cy="-1.6" r="2.2"/></g>`;

// The storm, seen from above: the kit's swirl with an underside, a second tone and bands of cloud. Drawn around 0,0.
export function storm(r = 26) {
  const band = (k, rot, o) => `<path d="M${(-r * k).toFixed(1)} 0A${(r * k).toFixed(1)} ${(r * k).toFixed(1)} 0 0 1 ${(r * k * 0.5).toFixed(1)} ${(-r * k * 0.87).toFixed(1)}" fill="none" stroke="#9fb2f7" stroke-width="${(r * 0.075).toFixed(1)}" stroke-linecap="round" opacity="${o}" transform="rotate(${rot})"/>`;
  return `<g transform="translate(${(r * 0.05).toFixed(1)} ${(r * 0.13).toFixed(1)})">${swirl(r, '#aebfff', '#aebfff')}</g>${swirl(r, '#ffffff', '#1b2a80')}
    ${band(0.36, 20, 0.9)}${band(0.36, 200, 0.9)}
    <circle r="${(r * 0.2).toFixed(1)}" fill="#1b2a80"/><path d="M${(-r * 0.2).toFixed(1)} 0A${(r * 0.2).toFixed(1)} ${(r * 0.2).toFixed(1)} 0 0 1 ${(r * 0.2).toFixed(1)} 0" fill="none" stroke="#0c1450" stroke-width="${(r * 0.07).toFixed(1)}"/>`;
}
