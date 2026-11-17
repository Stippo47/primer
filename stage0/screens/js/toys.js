// Playground parts: the small picture on each part's card (170 x 96), and the circuit pieces
// that sit on the bench when that part is opened. Same lighting as art.js: from the upper left.

import { form, floorShadow, glint, uid, bearHead } from './art.js';
import { swirl } from './kit.js';

// ---------------------------------------------------------------- circuit pieces

// a wire along path d: an underside, the body and a thin light along it
export const wire = (d, live = false) => `<path d="${d}" fill="none" stroke="#070a26" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.45" transform="translate(0 3)"/>
  <path d="${d}" fill="none" stroke="#1b8fd1" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.4)"/>
  <path d="${d}" fill="none" stroke="#49c6ff" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="#c9f0ff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" transform="translate(0 -1.3)"/>
  ${live ? `<path class="flow" d="${d}" fill="none" stroke="#fff3c4" stroke-width="4" stroke-linecap="round" stroke-dasharray="0.1 19"/>` : ''}`;

// a battery lying on its side, 66 x 30. Minus end at 2,15; plus end at 64,15.
export function battery() {
  return `${floorShadow(33, 29, 30, 3)}
    <rect x="58" y="10" width="6" height="10" rx="2" fill="#aab4e6"/><rect x="58" y="10" width="6" height="4" rx="2" fill="#f1f4ff"/>
    ${form('<rect x="2" y="3" width="57" height="24" rx="6"/>', '#ee4b7a',
    `<rect x="2" y="3" width="8" height="24" fill="#aab4e6"/><rect x="42" y="3" width="17" height="24" fill="#ffc83d"/>
     <rect x="2" y="19.5" width="57" height="7.5" fill="#2a1650" opacity="0.3"/>
     <rect x="2" y="5" width="57" height="4.2" fill="#fff" opacity="0.45"/>
     <rect x="41" y="3" width="1.6" height="24" fill="#8f1f44" opacity="0.6"/>`)}
    <path d="M28 15h8M32 11v8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M15 15h7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>`;
}

// a bulb in its holder, 48 x 66. Its two feet are at 8,60 and 40,60.
export function bulb(lit = true) {
  const id = uid('bulb');
  const glass = lit ? ['#ffd75a', '#f0a92a', '#fff6cf'] : ['#8a92bd', '#6a729f', '#c5cbec'];
  return `<defs><radialGradient id="${id}g"><stop offset="0" stop-color="#ffd75a" stop-opacity="0.5"/><stop offset="1" stop-color="#ffd75a" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}c" cx="0.42" cy="0.42" r="0.62"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.5" stop-color="#ffe27a"/><stop offset="1" stop-color="#f6b93a"/></radialGradient></defs>
    ${lit ? `<circle class="bulbglow" cx="24" cy="21" r="46" fill="url(#${id}g)"/>` : ''}
    ${floorShadow(24, 64, 22, 2.6)}
    ${form('<rect x="4" y="50" width="40" height="13" rx="4"/>', '#5b2bd6', '<rect x="4" y="57" width="40" height="6" fill="#3d1a9c"/><rect x="7" y="51.4" width="16" height="2" rx="1" fill="#a585ff"/>')}
    ${form('<rect x="15" y="36" width="18" height="16" rx="3"/>', '#aab4e6', '<rect x="27" y="36" width="6" height="16" fill="#7d86b3"/><path d="M15 41h18M15 45.5h18" stroke="#6a729f" stroke-width="1.5"/><rect x="16.5" y="36" width="3" height="16" fill="#f1f4ff" opacity="0.8"/>')}
    ${form('<path d="M24 2a19 19 0 0 1 11.5 34.2c-1.6 1.2-2.5 2.2-2.5 3.8H15c0-1.6-.9-2.6-2.5-3.8A19 19 0 0 1 24 2z"/>', glass[1],
    `<circle cx="22.4" cy="19.4" r="19.6" fill="${lit ? `url(#${id}c)` : glass[0]}"/><rect x="12" y="34" width="24" height="7" fill="${glass[0]}" opacity="0.7"/>`)}
    <path d="M20 38L17.6 25M28 38L30.4 25" fill="none" stroke="${lit ? '#c2740a' : '#4a5280'}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M17.6 25q1.1 -4.4 2.6 0t2.6 0t2.6 0t2.6 0t2.4 0" fill="none" stroke="${lit ? '#fffbe6' : '#4a5280'}" stroke-width="${lit ? 2.6 : 1.8}" stroke-linecap="round"/>
    ${lit ? '<path d="M17.6 25q1.1 -4.4 2.6 0t2.6 0t2.6 0t2.6 0t2.4 0" fill="none" stroke="#e8850c" stroke-width="1" stroke-linecap="round"/>' : ''}
    <path d="M9.6 17A15.5 15.5 0 0 1 19 6.4" fill="none" stroke="${glass[2]}" stroke-width="3.2" stroke-linecap="round"/><circle cx="8.6" cy="22.6" r="1.7" fill="${glass[2]}"/>`;
}

// a knife switch, 70 x 34. Its posts are at 12,24 and 58,24.
export function knifeSwitch(closed = true) {
  const post = x => `<circle cx="${x}" cy="25.4" r="6.4" fill="#7d86b3"/><circle cx="${x}" cy="24" r="6.4" fill="#dfe5ff"/><circle cx="${x - 1.6}" cy="22.4" r="2.2" fill="#fff"/><circle cx="${x}" cy="24" r="2" fill="#7d86b3"/>`;
  const arm = closed
    ? `<path d="M12 24H58" stroke="#7d86b3" stroke-width="6.4" stroke-linecap="round" transform="translate(0 1.6)"/><path d="M12 24H58" stroke="#f1f4ff" stroke-width="6.4" stroke-linecap="round"/><path d="M14 22.4H50" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
       <circle cx="40" cy="20.6" r="6.6" fill="#127a85"/><circle cx="40" cy="18.4" r="6.6" fill="#2bc4a4"/><circle cx="37.8" cy="16.2" r="2.2" fill="#a8f3e0"/>`
    : `<path d="M12 24L50 4" stroke="#7d86b3" stroke-width="6.4" stroke-linecap="round" transform="translate(0 1.6)"/><path d="M12 24L50 4" stroke="#f1f4ff" stroke-width="6.4" stroke-linecap="round"/>
       <circle cx="50" cy="5.6" r="6.6" fill="#127a85"/><circle cx="50" cy="3.6" r="6.6" fill="#2bc4a4"/><circle cx="47.8" cy="1.4" r="2.2" fill="#a8f3e0"/>`;
  return `${floorShadow(35, 32.6, 33, 2.6)}
    ${form('<rect x="2" y="16" width="66" height="15" rx="6"/>', '#3a4494', '<rect x="2" y="25" width="66" height="6" fill="#262d68"/><rect x="6" y="17.4" width="30" height="2" rx="1" fill="#7f8be0"/>')}
    ${post(12)}${post(58)}${arm}`;
}

// a resistor, 72 x 24. Its legs end at 0,12 and 72,12.
export function resistor() {
  const body = '<path d="M16 12c0-6.6 3-10 8.6-10 3 0 4.2 1.6 7.4 1.6h8c3.2 0 4.4-1.6 7.4-1.6C53 2 56 5.4 56 12s-3 10-8.6 10c-3 0-4.2-1.6-7.4-1.6h-8c-3.2 0-4.4 1.6-7.4 1.6C19 22 16 18.6 16 12z"/>';
  return `<path d="M1 12h70" stroke="#7d86b3" stroke-width="3.4" stroke-linecap="round" transform="translate(0 1.2)"/><path d="M1 12h70" stroke="#dfe5ff" stroke-width="3.4" stroke-linecap="round"/>
    ${form(body, '#e6c08e',
    `<rect x="22" y="0" width="4.6" height="24" fill="#ee4b7a"/><rect x="30.5" y="0" width="4.6" height="24" fill="#8b3fbf"/><rect x="38.5" y="0" width="4.6" height="24" fill="#ffa23a"/><rect x="48" y="0" width="4" height="24" fill="#ffc83d"/>
     <rect x="14" y="15.5" width="44" height="8" fill="#2a1650" opacity="0.28"/><rect x="19" y="4.6" width="34" height="3" rx="1.5" fill="#fff" opacity="0.6"/>`)}`;
}

// ---------------------------------------------------------------- the small pictures on the cards, 170 x 96

const pegboard = () => { const id = uid('peg'); return `<defs><pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1.3" fill="#2a3168"/></pattern></defs><rect x="0" y="0" width="170" height="96" fill="url(#${id})"/>`; };

export const TOY = {
  string: () => `${floorShadow(85, 84, 76, 5)}
    ${form('<rect x="10" y="58" width="150" height="22" rx="8"/>', '#a56a3c', '<rect x="10" y="71" width="150" height="9" fill="#6f4324"/><rect x="14" y="59.6" width="96" height="2.6" rx="1.3" fill="#d99a66"/><path d="M30 67h34M82 66h50" stroke="#8a5530" stroke-width="1.4" stroke-linecap="round"/>')}
    <path d="M30 34Q85 2 140 34Q85 66 30 34Z" fill="#ffc83d" opacity="0.2"/>
    <path d="M30 34Q85 60 140 34" fill="none" stroke="#ffc83d" stroke-width="2.4" opacity="0.4"/>
    <path d="M30 34Q85 4 140 34" fill="none" stroke="#c98a00" stroke-width="3.4" stroke-linecap="round" transform="translate(0 1.4)"/>
    <path d="M30 34Q85 4 140 34" fill="none" stroke="#ffe08a" stroke-width="3.2" stroke-linecap="round"/>
    ${[26, 136].map(x => form(`<rect x="${x}" y="26" width="9" height="36" rx="3.5"/>`, '#dfe5ff', `<rect x="${x + 5.4}" y="26" width="3.6" height="36" fill="#8f98cf"/><rect x="${x + 1.4}" y="28" width="2" height="26" rx="1" fill="#fff"/>`)).join('')}
    <circle cx="153" cy="35.4" r="6.6" fill="#c98a00"/><circle cx="153" cy="34" r="6.6" fill="#ffc83d"/><circle cx="151" cy="32" r="2.2" fill="#fff3c4"/><rect x="143" y="32.4" width="5" height="3.4" fill="#aab4e6"/>
    ${glint(85, 16, 5, '#fff3c4', 0.9)}`,

  circuit: () => `${pegboard()}
    ${wire('M40 62H22V28H112', true)}${wire('M134 50V74H78', true)}
    <g transform="translate(24 54) scale(0.9)">${battery()}</g>
    <g transform="translate(100 4) scale(0.92)">${bulb(true)}</g>`,

  resistor: () => `${pegboard()}${floorShadow(85, 66, 44, 4)}<g transform="translate(24 28) scale(1.7)">${resistor()}</g>`,

  tank: () => {
    const id = uid('tank');
    return `${floorShadow(85, 88, 62, 5)}
    <rect x="26" y="12" width="118" height="72" rx="9" fill="#101538"/>
    <clipPath id="${id}"><rect x="29" y="15" width="112" height="66" rx="6"/></clipPath>
    <g clip-path="url(#${id})">
      <path d="M26 44q14 -8 28 0t28 0t28 0t34 0v44H26z" fill="#49c6ff"/>
      <path d="M26 58q14 -6 28 0t28 0t28 0t34 0v30H26z" fill="#1b8fd1"/>
      <path d="M26 72q14 -5 28 0t28 0t28 0t34 0v16H26z" fill="#0f649c"/>
      <g transform="rotate(-9 86 42)"><rect x="72" y="28" width="28" height="24" rx="5" fill="#c9601a"/><rect x="72" y="28" width="28" height="20" rx="5" fill="#ffa23a"/><rect x="75" y="30.4" width="14" height="2.6" rx="1.3" fill="#ffd9a6"/>
        <rect x="72" y="42" width="28" height="10" rx="4" fill="#1b8fd1" opacity="0.55"/></g>
      <path d="M30 44q13 -8 26 0t26 0" fill="none" stroke="#c9f0ff" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
      <circle cx="46" cy="64" r="2.4" fill="#b3ebff" opacity="0.7"/><circle cx="118" cy="70" r="1.8" fill="#b3ebff" opacity="0.6"/><circle cx="124" cy="58" r="1.3" fill="#b3ebff" opacity="0.6"/>
      <path d="M36 22l-12 30h8l12 -30z" fill="#fff" opacity="0.13"/><path d="M52 22l-12 30h4l12 -30z" fill="#fff" opacity="0.1"/>
    </g>
    <rect x="27.5" y="13.5" width="115" height="69" rx="8" fill="none" stroke="#8f98cf" stroke-width="3.4"/>
    <path d="M36 13.5h60" stroke="#f1f4ff" stroke-width="3.4" stroke-linecap="round"/><path d="M27.5 24v34" stroke="#f1f4ff" stroke-width="3.4" stroke-linecap="round"/>`;
  },

  prism: () => {
    const fan = [['#ee4b7a', 30, 39], ['#ffa23a', 39, 48], ['#ffc83d', 48, 57], ['#2bc4a4', 57, 66], ['#49c6ff', 66, 75], ['#a67cf5', 75, 84]];
    return `${floorShadow(88, 86, 34, 4)}
    <path d="M4 66L74 50" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.14"/><path d="M4 66L74 50" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    ${fan.map(([c, a, b]) => `<path d="M101 ${46 + (a - 30) * 0.16}L166 ${a}V${b}L101 ${46 + (b - 30) * 0.16}Z" fill="${c}"/>`).join('')}
    <path d="M101 46L166 30v54L101 54.6Z" fill="#fff" opacity="0.1"/>
    ${form('<path d="M88 16a3 3 0 0 1 5.4 0L121 78a3 3 0 0 1-2.7 4.4H63.7A3 3 0 0 1 61 78z"/>', '#aab8ff',
    `<path d="M90.6 12L58 84h20z" fill="#eef1ff"/><path d="M90.6 12L124 84h-16z" fill="#7684d6"/><rect x="56" y="76.5" width="70" height="8" fill="#5b68b8" opacity="0.6"/>`)}
    <path d="M86.6 24L68 66" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.95"/>${glint(96, 30, 4.4)}`;
  },
};

// ---------------------------------------------------------------- snippet cards for the Review picture, 70 x 92

export function snippet(kind) {
  const id = uid('snip');
  const pic = {
    storm: `<rect x="5" y="5" width="60" height="62" fill="#1b2a80"/><path d="M5 22q30 -8 60 0v14q-30 -8 -60 0z" fill="#8b3fbf"/><path d="M5 36q30 -8 60 0v14q-30 -8 -60 0z" fill="#ee4b7a"/><path d="M5 50q30 -8 60 0v17H5z" fill="#ffa23a"/>
      <circle cx="35" cy="33" r="19" fill="#bfd4ff" opacity="0.25"/><g transform="translate(35 33) rotate(20)">${swirl(13, '#fff', '#1b2a80')}</g>`,
    bear: `<rect x="5" y="5" width="60" height="62" fill="#2bc4a4"/><circle cx="20" cy="56" r="20" fill="#1fa78c"/><g transform="translate(5 14) scale(0.5)">${bearHead()}</g>`,
    bolt: `<rect x="5" y="5" width="60" height="62" fill="#3b3db8"/><circle cx="35" cy="34" r="24" fill="#ffd75a" opacity="0.22"/>
      <path d="M40 12L22 38h11l-3 20l19-27H37z" fill="#c98a00" transform="translate(1.4 1.8)"/><path d="M40 12L22 38h11l-3 20l19-27H37z" fill="#ffd75a" stroke="#ffd75a" stroke-width="2" stroke-linejoin="round"/><path d="M38 16L26 35" stroke="#fff6cf" stroke-width="2.4" stroke-linecap="round"/>`,
  }[kind];
  return `<rect x="1.5" y="3" width="70" height="92" rx="9" fill="#060926" opacity="0.4"/>
    <rect width="70" height="92" rx="9" fill="#fff4dc"/><rect y="78" width="70" height="14" rx="7" fill="#e8d6ae"/><rect y="74" width="70" height="10" fill="#fff4dc"/>
    <clipPath id="${id}"><rect x="5" y="5" width="60" height="62" rx="5"/></clipPath><g clip-path="url(#${id})">${pic}<path d="M5 5h60v10H5z" fill="#fff" opacity="0.08"/></g>
    <rect x="12" y="73" width="46" height="5" rx="2.5" fill="#d9c59a"/><rect x="20" y="82" width="30" height="4" rx="2" fill="#e4d4ae"/>`;
}
