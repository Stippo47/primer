// Things the Shop sells, drawn to the same bar as art.js: lit from the upper left, a base tone,
// a shade, a lighter tone and one highlight. Each is drawn from 0,0; SIZE gives its box.

import { form, ball, floorShadow, glint } from './art.js';

export const SIZE = {
  wallpaper: [64, 60], floorTile: [68, 50], lantern: [56, 72], bed: [104, 72], armchair: [76, 72], plant: [58, 76],
  beanie: [64, 56], scarf: [66, 62], glasses: [72, 40], bearRug: [112, 60], salmonPlush: [84, 46], windsock: [78, 74],
  clawLog: [78, 40], barometer: [52, 60], bulbLamp: [44, 62],
};

// ---- room

// a piece of striped wallpaper, one corner peeling
export function wallpaper() {
  const sheet = '<path d="M11 3h42a4 4 0 0 1 4 4v29L39 55H11a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z"/>';
  return `${floorShadow(32, 57.6, 27, 3)}
    ${form(sheet, '#8b3fbf',
    `${[14, 27, 40].map(x => `<rect x="${x}" y="0" width="7" height="60" fill="#b06fe0"/>`).join('')}
     ${[[24, 15], [37, 30], [24, 43], [50.5, 15]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#ffc83d"/>`).join('')}
     <rect x="7" y="3" width="50" height="3.4" fill="#e3c4fa" opacity="0.75"/><rect x="7" y="3" width="3" height="52" fill="#e3c4fa" opacity="0.6"/>
     <path d="M57 26L33 55h24z" fill="#3d1a63" opacity="0.42"/>`)}
    <path d="M39 55L57 36q-3.4 9.6-8 11.6q-4 3.6-10 7.4z" fill="#b79ad0"/><path d="M39 55L57 36q-5.6 6.4-10.6 9.4q-3 4.4-7.4 9.6z" fill="#f1e6ff"/>`;
}

// a slab of wooden floor, seen from a corner
export function floorTile() {
  const P = (...p) => p.map(([x, y]) => `${x},${y}`).join(' ');
  const top = [[34, 4], [64, 19], [34, 34], [4, 19]];
  return `${floorShadow(34, 46, 30, 4)}
    <polygon points="${P([4, 19], [34, 34], [34, 43], [4, 28])}" fill="#b0733f"/>
    <polygon points="${P([34, 34], [64, 19], [64, 28], [34, 43])}" fill="#7d4d2b"/>
    <polygon points="${P(...top)}" fill="#d9a06a"/>
    <polygon points="${P([14, 24], [44, 9], [54, 14], [24, 29])}" fill="#c98a56"/>
    <g stroke="#a56d43" stroke-width="1.2" stroke-linecap="round"><path d="M14 24L44 9M24 29L54 14"/><path d="M21 10.5l10 5M39 16.5l10 5M27 27.5l-10 -5M47 23.5l-9 -4.5"/></g>
    <path d="M4 19L34 4" stroke="#f6cc9c" stroke-width="1.8" stroke-linecap="round"/><path d="M12 17.5L33 7" stroke="#f0bf8a" stroke-width="2.6" stroke-linecap="round" opacity="0.6"/>
    <path d="M4 19.6L34 34.6" stroke="#8a5632" stroke-width="1" opacity="0.6"/>`;
}

// a paper lantern, lit
export function lantern() {
  return `<defs><radialGradient id="lanternglow"><stop offset="0" stop-color="#ffb14a" stop-opacity="0.42"/><stop offset="1" stop-color="#ffb14a" stop-opacity="0"/></radialGradient>
      <radialGradient id="lanterncore" cx="0.42" cy="0.45" r="0.6"><stop offset="0" stop-color="#fff0b8"/><stop offset="0.55" stop-color="#ffb648"/><stop offset="1" stop-color="#f08a24"/></radialGradient></defs>
    <circle cx="28" cy="36" r="34" fill="url(#lanternglow)"/>
    <rect x="27" y="0" width="2" height="10" fill="#aab4e6"/>
    ${form('<ellipse cx="28" cy="36" rx="20" ry="22"/>', '#f08a24',
    `<ellipse cx="28" cy="36" rx="20" ry="22" fill="url(#lanterncore)"/>
     <path d="M36 14q16 20 2 44h14V14z" fill="#c9601a" opacity="0.5"/>
     <g fill="none" stroke="#d9741f" stroke-width="1.5" opacity="0.75"><path d="M8 28q20 6 40 0M7 36q21 6 42 0M8 44q20 6 40 0M12 21q16 5 32 0M12 51q16 5 32 0"/></g>
     <path d="M13 28q2 -9 9 -12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.75"/>`)}
    <rect x="20" y="11" width="16" height="5.5" rx="2.5" fill="#8f3f12"/><rect x="20" y="11" width="16" height="2.6" rx="1.3" fill="#c9601a"/>
    <rect x="20" y="55.5" width="16" height="5.5" rx="2.5" fill="#8f3f12"/><rect x="20" y="55.5" width="16" height="2.4" rx="1.2" fill="#c9601a"/>
    <path d="M28 61v4" stroke="#ee4b7a" stroke-width="1.6"/><path d="M26 65h4l1.2 6.5h-6.4z" fill="#ee4b7a"/><path d="M26 65h1.6l-0.8 6.5h-2z" fill="#ff8fb0"/>`;
}

// ---- furniture

export function bed() {
  return `${floorShadow(52, 69.5, 50, 4)}
    <rect x="10" y="56" width="7" height="13" rx="2.5" fill="#7d1a2c"/><rect x="88" y="56" width="7" height="13" rx="2.5" fill="#7d1a2c"/>
    ${form('<rect x="2" y="4" width="13" height="62" rx="6"/>', '#b92a40', '<rect x="4.4" y="8" width="3.2" height="50" rx="1.6" fill="#ee6b80"/><rect x="11" y="4" width="4" height="62" fill="#8f1f33" opacity="0.7"/>')}
    ${form('<rect x="91" y="30" width="11" height="36" rx="5"/>', '#b92a40', '<rect x="93" y="33" width="2.8" height="26" rx="1.4" fill="#ee6b80"/><rect x="98.5" y="30" width="3.5" height="36" fill="#8f1f33" opacity="0.7"/>')}
    ${form('<rect x="12" y="46" width="82" height="13" rx="3"/>', '#d93a50', '<rect x="12" y="54" width="82" height="5" fill="#a82238"/><rect x="12" y="46" width="82" height="2" fill="#f0667a" opacity="0.8"/>')}
    ${form('<rect x="13" y="34" width="80" height="15" rx="6"/>', '#f4f6ff', '<rect x="13" y="43.5" width="80" height="5.5" fill="#c9d1fb"/>')}
    ${form('<rect x="16" y="23" width="29" height="14.5" rx="7"/>', '#ffffff', '<rect x="16" y="32.5" width="29" height="5" fill="#cfd6ff"/><ellipse cx="38" cy="30" rx="8" ry="6" fill="#e6eaff" opacity="0.8"/>')}
    ${form('<path d="M46 32.5h41a7 7 0 0 1 7 7v10.5H46z"/>', '#ee4b5e',
    `<rect x="46" y="32.5" width="10" height="18" fill="#ff9aa6"/><rect x="46" y="45" width="48" height="5.5" fill="#c4324a"/>
     <path d="M58 34.2h28" stroke="#ff8a98" stroke-width="2.2" stroke-linecap="round"/><path d="M66 38q7 3 6 12M80 37q5 4 4 13" fill="none" stroke="#c4324a" stroke-width="1.3" opacity="0.6"/>`)}`;
}

export function armchair() {
  const armShape = x => `<rect x="${x}" y="27" width="18" height="37" rx="8.5"/>`;
  return `${floorShadow(38, 69.5, 36, 4)}
    <rect x="12" y="61" width="7" height="9" rx="2" fill="#7d4d2b"/><rect x="57" y="61" width="7" height="9" rx="2" fill="#5f3719"/>
    ${form('<rect x="11" y="2" width="54" height="50" rx="15"/>', '#3b6fd6',
    `<rect x="52" y="2" width="13" height="50" fill="#2a4ea8" opacity="0.7"/><path d="M11 30V17A15 15 0 0 1 26 2h14v5H28A11 11 0 0 0 17 18v12z" fill="#6f9cf5" opacity="0.85"/>
     <circle cx="30" cy="20" r="1.7" fill="#2a4ea8"/><circle cx="46" cy="20" r="1.7" fill="#2a4ea8"/>`)}
    ${form('<rect x="9" y="50" width="58" height="13" rx="4"/>', '#3b6fd6', '<rect x="9" y="57" width="58" height="6" fill="#2a4ea8"/>')}
    ${form('<rect x="17" y="35" width="42" height="18" rx="7"/>', '#7aa6ff', '<rect x="17" y="46.5" width="42" height="6.5" fill="#5a8cf0"/><rect x="22" y="37.2" width="22" height="2.6" rx="1.3" fill="#c3d7ff"/>')}
    ${form(armShape(1), '#5a8cf0', '<rect x="1" y="52" width="18" height="12" fill="#3b6fd6"/><rect x="13" y="27" width="6" height="37" fill="#3b6fd6" opacity="0.6"/><ellipse cx="8.5" cy="32.5" rx="5" ry="2.6" fill="#a9c6ff"/>')}
    ${form(armShape(57), '#4f80e6', '<rect x="57" y="52" width="18" height="12" fill="#335fc4"/><rect x="69" y="27" width="6" height="37" fill="#2a4ea8" opacity="0.7"/><ellipse cx="64.5" cy="32.5" rx="5" ry="2.6" fill="#8db3ff"/>')}`;
}

export function plant() {
  const leaf = (x, y, rot, len, wid, c = ['#2bc4a4', '#178a76', '#63e3c6']) => `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M0 0C${wid} ${-len * 0.3} ${wid} ${-len * 0.8} 0 ${-len}C${-wid} ${-len * 0.8} ${-wid} ${-len * 0.3} 0 0Z" fill="${c[1]}"/>
    <path d="M0 0C${-wid} ${-len * 0.3} ${-wid} ${-len * 0.8} 0 ${-len}Z" fill="${c[0]}"/>
    <path d="M${-wid * 0.42} ${-len * 0.42}Q${-wid * 0.5} ${-len * 0.66} ${-wid * 0.16} ${-len * 0.84}" fill="none" stroke="${c[2]}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M0 ${-len * 0.08}V${-len * 0.9}" stroke="${c[1]}" stroke-width="1.1" opacity="0.7"/></g>`;
  return `${floorShadow(29, 73.5, 23, 3.6)}
    ${leaf(27, 50, -44, 32, 9)}${leaf(31, 50, 46, 30, 9)}${leaf(26, 50, -17, 43, 10)}${leaf(32, 50, 21, 40, 10)}${leaf(29, 50, 2, 48, 9.5)}
    ${form('<path d="M14 49h30l-3.4 21.6a3 3 0 0 1-3 2.4H20.4a3 3 0 0 1-3-2.4z"/>', '#e0764a',
    '<path d="M32 49h12l-3.4 24h-9z" fill="#b5522c" opacity="0.75"/><path d="M17.5 53l2.6 16" stroke="#ffb596" stroke-width="2.6" stroke-linecap="round"/>')}
    ${form('<rect x="11" y="45" width="36" height="8.5" rx="3.4"/>', '#f08a5c', '<rect x="11" y="50" width="36" height="3.5" fill="#c9603a"/><rect x="14" y="46.4" width="14" height="1.8" rx="0.9" fill="#ffc2a6"/>')}`;
}

// ---- clothes

export function beanie() {
  const pom = [[32, 3.6], [38.4, 6], [40.6, 12], [36.6, 17], [27.4, 17], [23.4, 12], [25.6, 6]];
  return `${floorShadow(32, 53.5, 27, 3)}
    <g fill="#cfd6ff">${pom.map(([x, y]) => `<circle cx="${x + 0.9}" cy="${y + 1}" r="4.6"/>`).join('')}</g>
    <g fill="#ffffff">${pom.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6"/>`).join('')}<circle cx="32" cy="10.5" r="6.5"/></g>
    <circle cx="35.5" cy="13.5" r="4.5" fill="#dde3ff"/><circle cx="29.2" cy="7.6" r="2.3" fill="#fff"/>
    ${form('<path d="M8 41a24 27 0 0 1 48 0z"/>', '#49c6ff',
    `<path d="M42 14q14 10 14 27H44z" fill="#1b8fd1" opacity="0.6"/>
     <g fill="none" stroke="#1b8fd1" stroke-width="1.5" opacity="0.5"><path d="M32 14v27M24 15.5q-4 10 -4.5 25.5M40 15.5q4 10 4.5 25.5M17 20q-4.5 9 -5 21M47 20q4.5 9 5 21"/></g>
     <path d="M13.5 34q1 -12 11 -17.5" fill="none" stroke="#c9f0ff" stroke-width="3.2" stroke-linecap="round" opacity="0.85"/>`)}
    ${form('<rect x="4" y="36" width="56" height="15" rx="7.5"/>', '#1b8fd1',
    `<rect x="4" y="45.5" width="56" height="5.5" fill="#0f649c"/><rect x="4" y="36" width="56" height="3.6" fill="#49b9f2"/>
     <g stroke="#0f649c" stroke-width="1.3" opacity="0.6">${[11, 18, 25, 32, 39, 46, 53].map(x => `<path d="M${x} 38v12"/>`).join('')}</g>`)}`;
}

export function scarf() {
  const fringe = (x, y) => [0, 3.6, 7.2, 10.8].map(dx => `<rect x="${x + dx}" y="${y}" width="2.2" height="5.4" rx="1.1"/>`).join('');
  const stripes = (y0, n, x = 0, w = 70, gap = 9) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y0 + i * gap}" width="${w}" height="3.4" fill="#fff"/>`).join('');
  return `${floorShadow(33, 59.6, 22, 3)}
    <g fill="#a82a52">${fringe(40.5, 51.5)}</g>
    ${form('<path d="M40 20l14 1.6-1 31.4h-13z"/>', '#c2305c', `${stripes(37, 2, 30, 30, 7)}<rect x="48.5" y="18" width="6" height="38" fill="#7d1a3c" opacity="0.5"/>`)}
    ${form('<path d="M7 16a26 11.5 0 0 1 52 0v6a26 11.5 0 0 1-52 0z"/>', '#ee4b7a',
    `<g transform="rotate(-12 33 20)">${[10, 21, 32, 43, 54].map(x => `<rect x="${x}" y="-4" width="4" height="50" fill="#fff"/>`).join('')}</g>
     <path d="M33 24h30v14H22z" fill="#8f1f44" opacity="0.4"/><path d="M7 16a26 11.5 0 0 1 52 0a26 11.5 0 0 0-52 0z" fill="#ffa6c0" opacity="0.6"/>`)}
    <ellipse cx="33" cy="14.6" rx="18" ry="6.2" fill="#8f1f44"/><ellipse cx="33" cy="13" rx="18" ry="5" fill="#10153a"/>
    <g fill="#c2305c">${fringe(21, 54.5)}</g>
    ${form('<path d="M22 25l16 0.6-1.4 30.4h-16.2z"/>', '#ee4b7a', `${stripes(38, 2, 16, 30, 7.4)}<rect x="32.5" y="24" width="6" height="34" fill="#c2305c" opacity="0.55"/><path d="M24.4 28.6l-1.2 7" stroke="#ffa6c0" stroke-width="2.4" stroke-linecap="round"/>`)}
    ${form('<rect x="20" y="21" width="20" height="11" rx="5"/>', '#ee4b7a', '<rect x="20" y="27.6" width="20" height="4.4" fill="#c2305c"/><rect x="23.4" y="22.6" width="9" height="2.2" rx="1.1" fill="#ffa6c0"/>')}`;
}

export function glasses() {
  const lens = cx => `<circle cx="${cx}" cy="22.5" r="14.2" fill="#b07800"/><circle cx="${cx}" cy="21" r="14.2" fill="#ffc83d"/>
    <circle cx="${cx}" cy="21" r="9.6" fill="#16204f"/>
    ${form(`<circle cx="${cx}" cy="21" r="9.6"/>`, '#2b4a9c', `<path d="M${cx - 12} 30L${cx + 4} 8h6L${cx - 6} 30z" fill="#9fd8ff" opacity="0.55"/><path d="M${cx + 1} 30L${cx + 12} 14v6L${cx + 5} 30z" fill="#9fd8ff" opacity="0.3"/>`)}
    <path d="M${cx - 11.2} 15.5A12.4 12.4 0 0 1 ${cx - 3} 8.6" fill="none" stroke="#fff3c4" stroke-width="2" stroke-linecap="round"/>`;
  return `${floorShadow(36, 38, 30, 2.6, 0.28)}
    <path d="M6 18L1.5 9" stroke="#c98a00" stroke-width="3.6" stroke-linecap="round"/><path d="M66 18L70.5 9" stroke="#b07800" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M30 20.5q6 -6.5 12 0" fill="none" stroke="#b07800" stroke-width="4.4" stroke-linecap="round" transform="translate(0 1.4)"/>
    <path d="M30 20.5q6 -6.5 12 0" fill="none" stroke="#ffc83d" stroke-width="4.4" stroke-linecap="round"/>
    ${lens(19)}${lens(53)}`;
}

// ---- from topics (unique things; they show as a dark imprint of their shape until their lesson is done)

const FUR = ['#bd7642', '#8c4f2b', '#e09a62'], CREAM = ['#f5dcb6', '#dcb588', '#fff5e0'];

// a bear-shaped carpet lying flat, seen from the front and above
export function bearRug() {
  const shapes = `<ellipse cx="64" cy="33" rx="40" ry="17"/><ellipse cx="29" cy="14" rx="13" ry="6.5" transform="rotate(-24 29 14)"/><ellipse cx="99" cy="14" rx="13" ry="6.5" transform="rotate(24 99 14)"/>
    <ellipse cx="24" cy="46" rx="14" ry="6.5" transform="rotate(20 24 46)"/><ellipse cx="104" cy="46" rx="14" ry="6.5" transform="rotate(-20 104 46)"/>`;
  return `${floorShadow(64, 54, 54, 5, 0.3)}
    <g fill="#6b3a1e" transform="translate(0 3.4)">${shapes}</g>
    ${form(shapes, FUR[1], `<g fill="${FUR[0]}" transform="translate(-2.4 -2.6)">${shapes}</g><ellipse cx="60" cy="31" rx="27" ry="9.5" fill="${FUR[2]}" opacity="0.7"/>
      <ellipse cx="25" cy="11.5" rx="6" ry="2.4" fill="${FUR[2]}" opacity="0.7" transform="rotate(-24 25 11.5)"/><ellipse cx="94" cy="11.5" rx="6" ry="2.4" fill="${FUR[2]}" opacity="0.6" transform="rotate(24 94 11.5)"/>`)}
    <g transform="translate(0 2.4)" fill="#6b3a1e"><circle cx="50" cy="6.5" r="6"/><circle cx="78" cy="6.5" r="6"/><ellipse cx="64" cy="16" rx="17" ry="13"/></g>
    ${ball(50, 6.5, 6, 6, FUR)}${ball(78, 6.5, 6, 6, FUR)}<circle cx="50.2" cy="7.2" r="2.8" fill="${CREAM[1]}"/><circle cx="78.2" cy="7.2" r="2.8" fill="${CREAM[1]}"/>
    ${ball(64, 16, 17, 13, FUR, { k: 0.12 })}
    ${ball(64, 21, 7.8, 5.6, CREAM, { k: 0.12, shine: 0.8 })}
    <ellipse cx="64" cy="18.8" rx="3" ry="2.1" fill="#2a1650"/><circle cx="56.6" cy="14" r="2" fill="#2a1650"/><circle cx="71.4" cy="14" r="2" fill="#2a1650"/><circle cx="56" cy="13.4" r="0.7" fill="#fff"/><circle cx="70.8" cy="13.4" r="0.7" fill="#fff"/>`;
}

// a stuffed salmon
export function salmonPlush() {
  const body = '<path d="M6 23C12 8 44 4 66 16C70.5 19 70.5 27 66 30C44 42 12 38 6 23Z"/>';
  return `${floorShadow(40, 43.5, 34, 3)}
    <path d="M62 23L80 8Q75 23 80 38Z" fill="#d9573c"/><path d="M62 23L80 8Q76.6 16 76 21Z" fill="#f47a5c"/>
    <path d="M24 9Q34 -4 46 9Z" fill="#d9573c"/><path d="M24 9Q31 0 37 1.5Q30 4 29 9Z" fill="#f47a5c"/>
    <path d="M30 36l-4 8l12 -5.5z" fill="#c4452c"/>
    ${form(body, '#e8674a',
    `<path d="M6 20C12 5 44 1 66 13C70.5 16 70.5 24 66 27C44 34 12 32 6 20Z" fill="#ff8f6b"/>
     <path d="M7 27q30 14 60 0q-4 6 -8 8q-22 9 -46 0z" fill="#ffe1d3"/>
     <path d="M12 15C22 7.5 42 6.5 58 12.5C42 10 24 10.5 12 15Z" fill="#ffc0a6"/>
     <path d="M21 9.5q5 13 0 27" fill="none" stroke="#c4452c" stroke-width="1.5" stroke-dasharray="2.6 2.2"/>
     <path d="M32 17l3.4 3.4-3.4 3.4M41 17l3.4 3.4-3.4 3.4M50 17l3.4 3.4-3.4 3.4" fill="none" stroke="#d9573c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`)}
    <circle cx="13.4" cy="19.6" r="3.1" fill="#2a1650"/><circle cx="12.5" cy="18.6" r="1.1" fill="#fff"/>
    <path d="M7.5 26.5q2.6 1.6 4.6 0" fill="none" stroke="#2a1650" stroke-width="1.3" stroke-linecap="round"/>`;
}

// a windsock on its pole (Hurricanes)
export function windsock() {
  const sock = '<path d="M14 7Q42 4 74 19L73 27Q42 22 14 31Z"/>';
  return `${floorShadow(13, 72.5, 11, 2.4)}
    <rect x="10.5" y="3" width="5" height="69" rx="2.5" fill="#aab4e6"/><rect x="10.5" y="3" width="2.2" height="69" rx="1.1" fill="#f1f4ff"/>
    <circle cx="13" cy="3.6" r="3.4" fill="#ffc83d"/><circle cx="12" cy="2.6" r="1.2" fill="#fff3c4"/>
    ${form(sock, '#ffa23a',
    `<path d="M26 0h11l2 40h-11zM48 0h10l4 40h-10zM68 0h9v40h-7z" fill="#ffffff"/>
     <path d="M14 21Q42 15 74 23.5V40H14z" fill="#3a1650" opacity="0.2"/>
     <path d="M18 10.5Q40 8 62 16.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.65"/>`)}
    <ellipse cx="14" cy="19" rx="3.6" ry="12" fill="#c9601a"/><ellipse cx="14.6" cy="19" rx="2" ry="9.4" fill="#5a2408"/>
    <path d="M73.4 20.5l4 -1.6M73.4 23.2l4.6 0.4M73.2 25.8l3.6 2" stroke="#ffa23a" stroke-width="1.6" stroke-linecap="round"/>`;
}

// shapes only needed as imprints for now (their lessons are not done), so they stay simple
export const clawLog = () => `<rect x="3" y="6" width="68" height="28" rx="14" fill="#9a6238"/><ellipse cx="66" cy="20" rx="9" ry="14" fill="#e9c9a0"/>
  <path d="M18 9l7 18M27 9l7 18M36 9l7 18" stroke="#f6e3c3" stroke-width="3.4" stroke-linecap="round"/>`;
export const barometer = () => `<circle cx="26" cy="30" r="24" fill="#ffc83d"/><circle cx="26" cy="30" r="17" fill="#fff"/><rect x="21" y="0" width="10" height="9" rx="3" fill="#ffc83d"/>
  <path d="M26 30l9 -11" stroke="#2a1650" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="30" r="3" fill="#2a1650"/>`;
export const bulbLamp = () => `<circle cx="22" cy="19" r="18" fill="#ffd75a"/><rect x="14" y="34" width="16" height="15" rx="3" fill="#aeb6e0"/><rect x="6" y="48" width="32" height="12" rx="4" fill="#5b2bd6"/>
  <path d="M16 32v-10l6 6 6-6v10" stroke="#c98a00" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;

export { glint };
