// Room objects as flat SVG groups. Each is drawn from 0,0 at its natural size and placed with at().
// "Earned" objects are a general template (poster, floor mat, stuffed toy...) filled in by a topic.
// A dull object is the same drawing in greys with dust on it: that topic's memory is fading.

import { star, swirl } from './kit.js';

export const at = (x, y, body, scale = 1) => `<g transform="translate(${x} ${y})${scale !== 1 ? ` scale(${scale})` : ''}">${body}</g>`;

const dust = pts => pts.map(([x, y, r = 1.3]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dde4ff" opacity="0.7"/>`).join('');

// ---- earned, Bears ----

// poster template, 64 x 86
export const bearPoster = () => `
  <rect x="2" y="4" width="64" height="86" rx="6" fill="#0a0e2e" opacity="0.35"/>
  <rect width="64" height="86" rx="6" fill="#fff4dc"/>
  <rect x="5" y="5" width="54" height="60" rx="4" fill="#2bc4a4"/>
  <circle cx="19" cy="23" r="7.5" fill="#6b4126"/><circle cx="45" cy="23" r="7.5" fill="#6b4126"/>
  <circle cx="19" cy="23" r="3.5" fill="#e9c9a0"/><circle cx="45" cy="23" r="3.5" fill="#e9c9a0"/>
  <circle cx="32" cy="38" r="18" fill="#8f5a35"/>
  <ellipse cx="32" cy="45" rx="9.5" ry="7.5" fill="#e9c9a0"/>
  <ellipse cx="32" cy="42" rx="3.8" ry="2.8" fill="#2a1650"/>
  <circle cx="24.5" cy="34.5" r="2.2" fill="#2a1650"/><circle cx="39.5" cy="34.5" r="2.2" fill="#2a1650"/>
  <rect x="13" y="71" width="38" height="4.5" rx="2.2" fill="#d6c193"/><rect x="21" y="78.5" width="22" height="3.5" rx="1.7" fill="#e4d4ae"/>`;

// floor mat template, 156 x 44, lying on the floor
export function bearRug() {
  const shapes = `<ellipse cx="86" cy="22" rx="54" ry="15"/><ellipse cx="24" cy="21" rx="18" ry="12.5"/>
    <ellipse cx="12" cy="11" rx="6" ry="4.5"/><ellipse cx="12" cy="31" rx="6" ry="4.5"/>
    <ellipse cx="54" cy="6" rx="11" ry="5.5"/><ellipse cx="54" cy="38" rx="11" ry="5.5"/>
    <ellipse cx="124" cy="6" rx="11" ry="5.5"/><ellipse cx="124" cy="38" rx="11" ry="5.5"/><ellipse cx="143" cy="22" rx="6" ry="4"/>`;
  return `<g fill="#5c371f" transform="translate(0 3.5)">${shapes}</g><g fill="#8f5a35">${shapes}</g>
    <ellipse cx="86" cy="22" rx="36" ry="8" fill="#a56a41"/>
    <ellipse cx="14" cy="21" rx="7" ry="6" fill="#e9c9a0"/><ellipse cx="9.5" cy="21" rx="2.6" ry="2.2" fill="#2a1650"/>
    <circle cx="22" cy="16" r="1.8" fill="#2a1650"/><circle cx="22" cy="26" r="1.8" fill="#2a1650"/>`;
}

// stuffed toy template, 48 x 24
export const salmon = () => `
  <path d="M35 12l12-10v20z" fill="#e8674a"/>
  <path d="M17 4q7-8 14 0z" fill="#e8674a"/>
  <ellipse cx="20" cy="12.5" rx="20" ry="10" fill="#ff8f6b"/>
  <path d="M3 16q17 9 34 0q-17 4-34 0z" fill="#ffd9cb"/>
  <path d="M13 5q4 7.5 0 15" stroke="#e8674a" stroke-width="1.6" fill="none" stroke-dasharray="2.5 2"/>
  <circle cx="7.5" cy="10" r="2.2" fill="#2a1650"/>
  <path d="M22 9l3 3-3 3M28 9l3 3-3 3" stroke="#e8674a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;

// the same toy in gold: the Bears exam trophy
export const goldSalmon = () => `
  <path d="M35 12l12-10v20z" fill="#c98a00"/><path d="M17 4q7-8 14 0z" fill="#c98a00"/>
  <ellipse cx="20" cy="12.5" rx="20" ry="10" fill="#ffc83d"/><path d="M3 16q17 9 34 0q-17 4-34 0z" fill="#fff0b8"/>
  <circle cx="7.5" cy="10" r="2.2" fill="#7a4d00"/>`;

// statue template, 76 x 34: a log with claw marks
export const log = () => `
  <ellipse cx="38" cy="32" rx="34" ry="4" fill="#0a0e2e" opacity="0.3"/>
  <rect x="2" y="5" width="66" height="26" rx="13" fill="#9a6238"/>
  <rect x="2" y="20" width="66" height="11" rx="5.5" fill="#7d4d2b"/>
  <ellipse cx="65" cy="18" rx="8.5" ry="13" fill="#e9c9a0"/><ellipse cx="65" cy="18" rx="4.5" ry="7.5" fill="none" stroke="#c49a6a" stroke-width="1.6"/>
  <path d="M17 8l7 17M26 8l7 17M35 8l7 17" stroke="#f6e3c3" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M8 13h5M46 26h6" stroke="#7d4d2b" stroke-width="2" stroke-linecap="round"/>`;

// ---- earned, other topics ----

// metal trophy template, 34 x 44: the Hurricanes test cup
export const stormCup = () => `
  <path d="M6 8H1.5a1 1 0 0 0-1 1.2c.8 4.8 3 7.3 7 7.8M28 8h4.5a1 1 0 0 1 1 1.2c-.8 4.8-3 7.3-7 7.8" fill="none" stroke="#c98a00" stroke-width="3"/>
  <rect x="14" y="26" width="6" height="9" fill="#c98a00"/>
  <rect x="7" y="35" width="20" height="8" rx="3" fill="#c98a00"/><rect x="7" y="35" width="20" height="4" rx="2" fill="#ffc83d"/>
  <path d="M5 2h24v11a12 12 0 0 1-24 0z" fill="#ffc83d"/><path d="M5 2h7v11a12 12 0 0 0 6 10.4A12 12 0 0 1 5 13z" fill="#ffe08a"/>
  <g transform="translate(17 12)">${swirl(6.5, '#fff', '#c98a00')}</g>`;

// statue template, 30 x 46: the Circuits bulb. dull = fading.
export function bulb(dull = false) {
  const c = dull ? { glass: '#8a92bd', shine: '#a9b0d6', cap: '#59618f', base: '#4a5280', base2: '#59618f', fil: '#59618f' }
    : { glass: '#ffd75a', shine: '#fff0b8', cap: '#aeb6e0', base: '#5b2bd6', base2: '#7a4cf0', fil: '#c98a00' };
  return `${dull ? '' : '<circle cx="15" cy="14" r="20" fill="#ffd75a" opacity="0.18"/>'}
    <rect x="3" y="37" width="24" height="9" rx="3" fill="${c.base}"/><rect x="3" y="37" width="24" height="4" rx="2" fill="${c.base2}"/>
    <rect x="10" y="25" width="10" height="13" rx="2" fill="${c.cap}"/><path d="M10 29h10M10 33h10" stroke="${c.base}" stroke-width="1.4"/>
    <circle cx="15" cy="14" r="13" fill="${c.glass}"/><path d="M7 11a9 9 0 0 1 6-6" stroke="${c.shine}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M11 24v-7l4 4 4-4v7" stroke="${c.fil}" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
    ${dull ? dust([[6, 4], [20, 3, 1.6], [25, 12], [3, 20, 1.5], [24, 30], [8, 35, 1.6], [18, 8, 1]]) + '<path d="M27 0q-2 12-12 14M27 0q4 8 3 16M22 6q4 1 7 5" stroke="#dde4ff" stroke-width="0.9" fill="none" opacity="0.6"/>' : ''}`;
}

// medal template, 28 x 52: Guitar strings. dull = fading.
export function medal(dull = false) {
  const c = dull ? { a: '#59618f', b: '#7d86b3', disc: '#8a92bd', edge: '#59618f', mark: '#4a5280' }
    : { a: '#ee4b7a', b: '#fff', disc: '#ffc83d', edge: '#c98a00', mark: '#7a4d00' };
  return `<circle cx="14" cy="2" r="2.5" fill="#dfe5ff"/>
    <path d="M9 2h10l-2 24h-6z" fill="${c.a}"/><path d="M12.5 2h3l-.5 24h-2z" fill="${c.b}"/>
    <circle cx="14" cy="38" r="13" fill="${c.edge}"/><circle cx="14" cy="36" r="13" fill="${c.disc}"/>
    <path d="M6 31h16M5 36q4.5-3.5 9 0t9 0M6 41h16" stroke="${c.mark}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${dull ? dust([[4, 28], [22, 26, 1.6], [25, 40], [8, 47, 1.5], [16, 20, 1]]) : ''}`;
}

// flag template, 62 x 52: World flags
export const pennant = () => `
  <rect x="0" y="0" width="5" height="52" rx="2.5" fill="#dfe5ff"/>
  <path d="M5 4l56 17-56 17z" fill="#ee4b7a"/><path d="M5 4l20 6v22l-20 6z" fill="#fff"/><path d="M5 4l9 2.7v28.6l-9 2.7z" fill="#49c6ff"/>
  ${star(36, 21, 6, '#ffc83d')}`;

// the globe's stand, 64 x 118 with the floor at y=118. The globe itself is drawn on top by the caller.
export function globeStand(level = 'gold') {
  const c = { bronze: ['#d98a4f', '#9c5a2a', '#5a2f10'], gold: ['#ffc83d', '#c98a00', '#7a4d00'], platinum: ['#e6ecff', '#aab4e6', '#3b4590'] }[level];
  return `<ellipse cx="32" cy="117" rx="30" ry="4" fill="#0a0e2e" opacity="0.3"/>
    <path d="M32 2a30 30 0 0 1 0 60" fill="none" stroke="${c[1]}" stroke-width="5" stroke-linecap="round" transform="rotate(20 32 32)"/>
    <rect x="28.5" y="60" width="7" height="40" fill="${c[1]}"/><rect x="28.5" y="60" width="3" height="40" fill="${c[0]}"/>
    <rect x="6" y="98" width="52" height="19" rx="6" fill="${c[1]}"/><rect x="6" y="98" width="52" height="15" rx="6" fill="${c[0]}"/>
    <text x="32" y="109.5" text-anchor="middle" font-size="9.5" font-weight="900" letter-spacing="0.6" fill="${c[2]}">${level.toUpperCase()}</text>`;
}

// ---- bought, plain ----

// 128 x 98, floor at y=98
export const redBed = () => `
  <ellipse cx="64" cy="97" rx="62" ry="4" fill="#0a0e2e" opacity="0.3"/>
  <rect x="0" y="0" width="13" height="98" rx="6" fill="#b92a40"/>
  <rect x="116" y="42" width="12" height="56" rx="5" fill="#b92a40"/>
  <rect x="10" y="78" width="9" height="20" rx="3" fill="#8f1f33"/><rect x="109" y="78" width="9" height="20" rx="3" fill="#8f1f33"/>
  <rect x="8" y="62" width="112" height="18" rx="5" fill="#d93a50"/><rect x="8" y="72" width="112" height="8" rx="4" fill="#b92a40"/>
  <rect x="11" y="44" width="108" height="21" rx="8" fill="#f4f6ff"/>
  <rect x="15" y="33" width="32" height="15" rx="7.5" fill="#fff"/><rect x="15" y="42" width="32" height="6" rx="3" fill="#cfd6ff"/>
  <path d="M50 44h61a8 8 0 0 1 8 8v13H50z" fill="#ee4b5e"/><rect x="50" y="44" width="11" height="21" fill="#ff8a98"/>`;

// 150 wide plank with two brackets, drawn from its top-left
export const shelf = (w = 150) => `
  <rect x="0" y="0" width="${w}" height="8" rx="3" fill="#dfe5ff"/><rect x="0" y="5" width="${w}" height="3" rx="1.5" fill="#aab4e6"/>
  <path d="M16 8v12l12-12zM${w - 16} 8v12l-12-12z" fill="#aab4e6"/>`;

// hanging lamp, 60 x 64 from the ceiling
export const lamp = () => `
  <path d="M30 60L-14 190h88z" fill="#ffe08a" opacity="0.07"/>
  <rect x="29" y="0" width="2.5" height="38" fill="#aab4e6"/>
  <path d="M12 60a18 22 0 0 1 36 0z" fill="#dfe5ff"/><rect x="10" y="57" width="40" height="6" rx="3" fill="#aab4e6"/>
  <circle cx="30" cy="65" r="6" fill="#ffe08a"/><circle cx="30" cy="65" r="18" fill="#ffe08a" opacity="0.2"/>`;

// window, 76 x 90
export const windowPane = () => `
  <rect x="0" y="0" width="76" height="90" rx="10" fill="#dfe5ff"/>
  <rect x="6" y="6" width="64" height="74" rx="6" fill="#0a0e2e"/>
  <circle cx="50" cy="26" r="11" fill="#ffe08a"/><circle cx="55" cy="22" r="10" fill="#0a0e2e"/>
  <g fill="#d6e2ff"><circle cx="18" cy="20" r="1.5"/><circle cx="30" cy="44" r="1.2"/><circle cx="58" cy="56" r="1.6"/><circle cx="16" cy="62" r="1.2"/><circle cx="42" cy="68" r="1"/></g>
  <rect x="36" y="6" width="4" height="74" fill="#dfe5ff"/><rect x="6" y="40" width="64" height="4" fill="#dfe5ff"/>
  <rect x="-4" y="82" width="84" height="8" rx="4" fill="#aab4e6"/>`;

// potted plant, 44 x 76 with the floor at y=76
export const plant = () => `
  <ellipse cx="22" cy="75" rx="20" ry="3.5" fill="#0a0e2e" opacity="0.3"/>
  <g fill="#2bc4a4"><path d="M22 52C8 46 4 30 8 14c10 8 15 22 14 38z"/><path d="M22 52c14-6 18-22 14-38-10 8-15 22-14 38z" fill="#1fa78c"/><path d="M22 54C18 38 20 16 22 4c4 12 5 34 0 50z" fill="#4fdcbc"/></g>
  <path d="M8 50h28l-3 24a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2z" fill="#dfe5ff"/><rect x="6" y="48" width="32" height="7" rx="3" fill="#aab4e6"/>`;

// armchair, 70 x 70, floor at y=70
export const armchair = () => `
  <rect x="10" y="0" width="50" height="46" rx="14" fill="#3b6fd6"/>
  <rect x="0" y="26" width="18" height="36" rx="8" fill="#5a8cf0"/><rect x="52" y="26" width="18" height="36" rx="8" fill="#5a8cf0"/>
  <rect x="14" y="34" width="42" height="18" rx="7" fill="#7aa6ff"/><rect x="8" y="50" width="54" height="12" rx="4" fill="#3b6fd6"/>
  <rect x="10" y="60" width="7" height="10" rx="2" fill="#2a4ea8"/><rect x="53" y="60" width="7" height="10" rx="2" fill="#2a4ea8"/>`;

// ---- the avatar, 72 x 122 with the floor at y=122 ----
export function avatar({ hat = true, wave = true } = {}) {
  return `<ellipse cx="36" cy="121" rx="24" ry="4" fill="#0a0e2e" opacity="0.35"/>
    <rect x="23" y="84" width="11" height="32" rx="5.5" fill="#3b3db8"/><rect x="38" y="84" width="11" height="32" rx="5.5" fill="#3b3db8"/>
    <rect x="17" y="111" width="18" height="11" rx="5.5" fill="#fff"/><rect x="37" y="111" width="18" height="11" rx="5.5" fill="#fff"/>
    <path d="M20 62q-9 10-7 24" stroke="#ff7a59" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="13" cy="88" r="5.5" fill="#ffdfbf"/>
    ${wave ? '<path d="M52 62q13-4 13-22" stroke="#ff7a59" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="65" cy="38" r="5.5" fill="#ffdfbf"/>'
      : '<path d="M52 62q9 10 7 24" stroke="#ff7a59" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="59" cy="88" r="5.5" fill="#ffdfbf"/>'}
    <rect x="17" y="52" width="38" height="42" rx="15" fill="#ff7a59"/><rect x="17" y="80" width="38" height="14" rx="7" fill="#e85f40"/>
    <circle cx="36" cy="30" r="23" fill="#ffdfbf"/>
    <circle cx="27.5" cy="35" r="2.8" fill="#2a1650"/><circle cx="44.5" cy="35" r="2.8" fill="#2a1650"/>
    <path d="M30 42.5q6 5 12 0" stroke="#2a1650" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="22" cy="41" r="3.5" fill="#ff8f6b" opacity="0.5"/><circle cx="50" cy="41" r="3.5" fill="#ff8f6b" opacity="0.5"/>
    ${hat ? '<path d="M13 26a23 23 0 0 1 46 0z" fill="#49c6ff"/><rect x="11" y="21" width="50" height="10" rx="5" fill="#1b8fd1"/><circle cx="36" cy="4" r="5.5" fill="#fff"/>'
      : '<path d="M14 24a22 22 0 0 1 44 0q-12-9-22-3q-10-6-22 3z" fill="#5a3a2a"/>'}`;
}

// the tap cue: a dashed ring that says "this one can be tapped", with a finger
export const tapRing = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="#6fd6ff" opacity="0.1"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#6fd6ff" stroke-width="2.5" stroke-dasharray="6 6" stroke-linecap="round"/>`;
export const finger = () => `
  <path d="M-11 -7a13 13 0 0 1 22 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
  <path d="M-3.5 0v-0.5a3.5 3.5 0 0 1 7 0V9l7 1.8a3.5 3.5 0 0 1 2.6 4l-1.4 7.7a4 4 0 0 1-4 3.3H3a4 4 0 0 1-3.2-1.6l-6-8.2a2.8 2.8 0 0 1 4.2-3.6l-1.5-1.5z" fill="#fff"/>
  <rect x="-4" y="25" width="19" height="9" rx="3" fill="#ff7a59"/>`;
