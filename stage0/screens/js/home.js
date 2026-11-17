// Home: the room as a cutaway, and the Displays sketch (the globe that comes alive).

import { svg, icon, coins, star } from './kit.js';
import { globe } from './globe.js';
import * as O from './objects.js';

const nest = (iconSvg, x, y, color) => `<g style="color:${color}">${iconSvg.replace('<svg ', `<svg x="${x}" y="${y}" `)}</g>`;

// A doorway in the right wall. kind: 'play' (cyan, to the Playground) or 'shop' (gold).
function door(kind) {
  const c = kind === 'play'
    ? { main: '#49c6ff', edge: '#1b8fd1', light: '#d4f1ff', ink: '#0e1436', name: 'PLAYGROUND', w: 92, draw: icon.play }
    : { main: '#ffc83d', edge: '#c98a00', light: '#fff0b8', ink: '#2a1650', name: 'SHOP', w: 60, draw: icon.shop };
  const sx = 32 - c.w / 2;
  const glow = `<path d="M6 128h52l26 46h-104z" fill="${c.main}" opacity="0.16"/><circle cx="32" cy="70" r="74" fill="${c.main}" opacity="0.1"/>`;
  const body = `<defs><linearGradient id="doorway" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.main}"/><stop offset="1" stop-color="${c.light}"/></linearGradient></defs>
    <rect x="0" y="0" width="64" height="128" rx="9" fill="#dfe5ff"/>
    <rect x="6" y="6" width="52" height="122" rx="4" fill="url(#doorway)"/>
    ${nest(c.draw(30), 25, 50, '#ffffff')}
    <path d="M6 6l17 9v113H6z" fill="${c.edge}"/><circle cx="18" cy="74" r="2.6" fill="${c.light}"/>
    <rect x="${sx}" y="-27" width="${c.w}" height="24" rx="9" fill="${c.edge}"/>
    <rect x="${sx}" y="-30" width="${c.w}" height="24" rx="9" fill="${c.main}"/>
    <text x="32" y="-14" text-anchor="middle" font-size="11" font-weight="900" letter-spacing="0.7" fill="${c.ink}">${c.name}</text>`;
  return { glow, body };
}

// The room, 414 x 528. doorKind: 'play', 'shop' or null.
export function room(doorKind) {
  let s = `<defs>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.5" height="7" fill="#c3cbf5"/></pattern>
    <linearGradient id="wallshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070a2e" stop-opacity="0.4"/><stop offset="1" stop-color="#070a2e" stop-opacity="0"/></linearGradient>
    <clipPath id="inside"><rect x="24" y="72" width="366" height="430"/></clipPath></defs>`;

  // roof and attic, cut through
  s += `<path d="M207 4L6 66h402z" fill="#dfe5ff" stroke="#dfe5ff" stroke-width="6" stroke-linejoin="round"/><path d="M207 4L6 66h402z" fill="url(#hatch)"/>
    <path d="M207 24L78 62h258z" fill="#10163a" stroke="#10163a" stroke-width="4" stroke-linejoin="round"/>
    ${nest(icon.lock(13), 163, 41, '#5d66ad')}<text x="180" y="52" font-size="10" font-weight="800" letter-spacing="0.6" fill="#5d66ad">ATTIC · 800</text>`;
  // the shell: walls, ceiling and floor slab, cut through
  s += `<rect x="12" y="60" width="390" height="456" rx="10" fill="#dfe5ff"/><rect x="12" y="60" width="390" height="456" rx="10" fill="url(#hatch)"/>
    <rect x="0" y="514" width="414" height="12" rx="6" fill="#0c1030"/>`;
  // inside: wallpaper, skirting, floor
  s += `<rect x="24" y="72" width="366" height="370" fill="#2c3780"/>`;
  for (let x = 30; x < 390; x += 26) s += `<rect x="${x}" y="72" width="10" height="356" fill="#323f8f"/>`;
  s += `<rect x="24" y="72" width="366" height="46" fill="url(#wallshade)"/>
    <rect x="24" y="428" width="366" height="12" fill="#1f2866"/>
    <rect x="24" y="440" width="366" height="62" fill="#c58a5c"/><rect x="24" y="440" width="366" height="5" fill="#a56d43"/>
    <g stroke="#a56d43" stroke-width="2" clip-path="url(#inside)">${[-150, -100, -50, 0, 50, 100, 150].map(d => `<path d="M${207 + d * 0.9} 442L${207 + d * 1.5} 502"/>`).join('')}</g>
    <rect x="24" y="496" width="366" height="6" fill="#8f5a35"/>`;

  // back wall
  s += O.at(40, 92, O.windowPane());
  s += O.at(134, 96, O.bearPoster());
  s += O.at(222, 72, O.lamp());
  s += O.at(324, 92, O.pennant());
  s += O.at(170, 262, O.shelf(126));
  s += O.at(182, 216, O.bulb(true));
  s += O.at(246, 218, O.stormCup());
  s += O.at(304, 204, O.medal(true));

  // right wall
  if (doorKind) {
    const d = door(doorKind);
    s += `<g clip-path="url(#inside)">${O.at(316, 312, d.glow)}</g>` + O.at(316, 312, d.body);
  }
  else s += O.at(332, 366, O.plant());

  // floor
  s += O.at(32, 344, O.redBed());
  s += O.at(96, 366, O.salmon(), 1.15);
  s += O.at(120, 452, O.bearRug());
  s += O.at(36, 462, O.log());
  s += O.at(244, 334, O.globeStand('gold'));
  s += globe({ cx: 276, cy: 366, r: 26, rotate: [20, -18], depth: 1.4, glow: false }).svg;
  s += O.at(158, 350, O.avatar());

  // fading: the dashed ring and the finger say "tap me"
  s += O.tapRing(197, 240, 31) + O.tapRing(318, 232, 25);
  s += `<rect x="128" y="190" width="150" height="21" rx="9" fill="#141a3c" stroke="#6fd6ff" stroke-width="2"/>
    <text x="203" y="204.5" text-anchor="middle" font-size="10.5" font-weight="800" letter-spacing="0.5" fill="#6fd6ff">FADING · TAP TO REVIEW</text>`;
  s += O.at(212, 252, O.finger(), 0.8);
  return svg(414, 528, s);
}

const legend = (color, title, text) => `<p style="margin-bottom:3px"><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${color};margin-right:6px"></span><span style="color:${color}">${title}</span> <span class="muted">${text}</span></p>`;

export function home(variant) {
  const doorKind = { A: 'play', B: null, B2: 'shop' }[variant];
  return `
  <div class="head">
    <div class="seg"><span class="on">Room</span><span>Globe</span><span class="locked">${icon.lock(13)}Board</span></div>
    <div class="right"><div class="round">${icon.pencil(20)}</div>${coins(340)}</div>
  </div>
  <div style="left:0;top:96px">${room(doorKind)}</div>
  <div class="plate" style="left:16px;right:16px;top:634px;height:60px;display:flex;align-items:center;gap:11px;padding:0 12px">
    <div style="width:40px;height:40px;border-radius:12px;background:#141a3c;border:2px solid #2f3678;display:flex;align-items:center;justify-content:center;flex:none">${svg(30, 46, O.bulb(true), 'style="transform:scale(0.72)"')}</div>
    <div style="flex:1;min-width:0"><p style="font-size:15.5px">Circuits is fading</p><p class="muted" style="font-size:12.5px">9 facts are about to slip</p></div>
    <div class="btn sm">Review</div>
  </div>
  <div style="left:18px;right:18px;top:706px;font-size:11.5px;line-height:1.3">
    ${legend('#ffc83d', 'Earned:', 'bear poster, salmon plush, bear carpet, claw log, storm cup, flag, globe on its gold stand')}
    ${legend('#aab4e6', 'Bought:', `red bed, shelf, lamp, ${doorKind ? '' : 'plant, '}wallpaper, floor`)}
    ${legend('#6fd6ff', 'Fading:', 'the bulb (Circuits) and the medal (Guitar strings)')}
  </div>`;
}

// ---- Displays: the globe that comes alive ----

const LEARNED = new Set(['Canada', 'United States of America', 'Mexico', 'Cuba', 'Brazil', 'Colombia', 'Venezuela', 'Peru', 'Argentina',
  'France', 'Spain', 'Portugal', 'United Kingdom', 'Ireland', 'Italy', 'Germany', 'Iceland', 'Norway', 'Morocco', 'Algeria', 'Egypt', 'Senegal', 'Nigeria', 'Mali']);

const tower = () => `<ellipse cx="0" cy="1" rx="16" ry="4.5" fill="#070a2e" opacity="0.45"/>
  <path d="M-14 0Q-4.5 -20 -2.8 -54H2.8Q4.5 -20 14 0H7.5Q0 -14 -7.5 0z" fill="#ffc83d"/>
  <path d="M-14 0Q-4.5 -20 -2.8 -54H0V-9Q-5 -8 -7.5 0z" fill="#ffe08a"/>
  <rect x="-9" y="-19" width="18" height="3.4" rx="1.2" fill="#c98a00"/><rect x="-5.5" y="-34" width="11" height="3" rx="1" fill="#c98a00"/>
  <rect x="-1" y="-63" width="2" height="10" rx="1" fill="#ffc83d"/>`;
const pyramids = () => `<ellipse cx="2" cy="1" rx="18" ry="3.5" fill="#070a2e" opacity="0.4"/>
  <path d="M-16 0L-4 -18L8 0z" fill="#ffa23a"/><path d="M-4 -18L8 0H1z" fill="#c9701a"/>
  <path d="M2 0L11 -12L20 0z" fill="#ffa23a"/><path d="M11 -12L20 0H15z" fill="#c9701a"/>`;
const macaw = () => `
  <path d="M-9 5L-38 17L-11 10z" fill="#c4202f"/>
  <path d="M-2 -1Q-13 -22 -28 -21Q-18 -9 -7 5z" fill="#3b6fd6"/>
  <ellipse cx="0" cy="4" rx="15" ry="8.5" fill="#ee3b4e"/>
  <circle cx="14" cy="-3" r="7.5" fill="#ee3b4e"/><circle cx="16" cy="-2.5" r="4.2" fill="#fff"/><circle cx="16.5" cy="-3.2" r="1.3" fill="#1b1f5e"/>
  <path d="M19.5 -7.5Q28 -6 24 3.5Q21 0.5 19.5 -1z" fill="#ffe9c4"/><path d="M19.5 0.5Q22 3 24 3.5Q21 6 19 3z" fill="#2a1650"/>
  <path d="M3 1Q-3 -27 -19 -34Q-15 -13 -3 8z" fill="#ffc83d"/><path d="M-9 -22Q-13 -30 -19 -34Q-16.5 -22 -11.5 -11z" fill="#3b6fd6"/>`;

const chip = (x, y, text, gold = false) => {
  const w = text.length * 7.3 + 20;
  return `<rect x="${x}" y="${y + 3}" width="${w}" height="25" rx="11" fill="${gold ? '#c98a00' : '#b9c2ee'}"/><rect x="${x}" y="${y}" width="${w}" height="25" rx="11" fill="${gold ? '#ffc83d' : '#fff'}"/>
    <text x="${x + w / 2}" y="${y + 17}" text-anchor="middle" font-size="13" font-weight="800" fill="${gold ? '#2a1650' : '#1b1f5e'}">${text}</text>`;
};

export function displays() {
  const cx = 207, cy = 362, r = 162;
  const g = globe({ cx, cy, r, rotate: [28, -20], learned: LEARNED, depth: 3 });
  const paris = g.at([2.3, 47.5]), giza = g.at([30.5, 27]), amazon = g.at([-56, -6]);
  const bird = [amazon[0] + 14, amazon[1] - 46];
  let s = g.svg;
  // where the bird lives: a dotted patch, and the path it flies
  s += `<ellipse cx="${amazon[0] + 4}" cy="${amazon[1] + 2}" rx="44" ry="30" fill="#ffc83d" opacity="0.14"/>
    <ellipse cx="${amazon[0] + 4}" cy="${amazon[1] + 2}" rx="44" ry="30" fill="none" stroke="#ffe08a" stroke-width="2" stroke-dasharray="0.1 6" stroke-linecap="round"/>
    <ellipse cx="${bird[0]}" cy="${amazon[1] + 4}" rx="13" ry="3.5" fill="#070a2e" opacity="0.35"/>
    <path d="M${bird[0] - 62} ${bird[1] + 26}q26 -30 48 -22" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="0.1 6" stroke-linecap="round" opacity="0.7"/>`;
  s += O.at(giza[0], giza[1], pyramids()) + O.at(paris[0], paris[1], tower()) + O.at(bird[0], bird[1], macaw());
  s += chip(paris[0] + 14, paris[1] - 62, 'Eiffel Tower') + chip(bird[0] - 96, bird[1] - 58, 'Scarlet macaw');
  // the stand, with its level
  s += `<path d="M${cx - 118} ${cy + r - 34}A${r + 12} ${r + 12} 0 0 0 ${cx + 118} ${cy + r - 34}" fill="none" stroke="#c98a00" stroke-width="9" stroke-linecap="round"/>
    <path d="M${cx - 118} ${cy + r - 37}A${r + 12} ${r + 12} 0 0 0 ${cx + 118} ${cy + r - 37}" fill="none" stroke="#ffc83d" stroke-width="6" stroke-linecap="round"/>
    <rect x="${cx - 9}" y="${cy + r + 10}" width="18" height="22" fill="#c98a00"/><rect x="${cx - 9}" y="${cy + r + 10}" width="7" height="22" fill="#ffc83d"/>
    <rect x="${cx - 96}" y="${cy + r + 34}" width="192" height="34" rx="12" fill="#c98a00"/><rect x="${cx - 96}" y="${cy + r + 30}" width="192" height="34" rx="12" fill="#ffc83d"/>
    ${star(cx - 72, cy + r + 47, 7, '#c98a00')}<text x="${cx + 8}" y="${cy + r + 52}" text-anchor="middle" font-size="14" font-weight="900" letter-spacing="0.8" fill="#2a1650">GOLD STAND</text>`;

  const stat = (n, of, name) => `<div style="flex:1;text-align:center"><p style="font-size:20px">${n}<span class="muted" style="font-size:13px">${of}</span></p><p class="over" style="font-size:10.5px">${name}</p></div>`;
  return `
  <div class="head">
    <div class="seg"><span>Room</span><span class="on">Globe</span><span class="locked">${icon.lock(13)}Board</span></div>
    <div class="right">${coins(340)}</div>
  </div>
  <div style="left:18px;right:18px;top:102px"><p style="font-size:20px">The globe comes alive</p><p class="muted" style="font-size:13px">Another way to show what you know, beside the room.</p></div>
  <div style="left:0;top:0">${svg(414, 896, s)}</div>
  <div class="plate" style="left:16px;right:16px;top:612px;height:62px;display:flex;align-items:center;padding:0 6px">
    ${stat(24, ' / 195', 'Countries')}<div style="width:2px;height:34px;background:#2f3678"></div>${stat(2, '', 'Landmarks')}<div style="width:2px;height:34px;background:#2f3678"></div>${stat(1, '', 'Birds')}
  </div>
  <div style="left:18px;right:18px;top:690px;font-size:12.5px;line-height:1.4">
    <p><span class="sky-t">Learn a country:</span> <span class="muted">it fills in.</span> <span class="gold-t">A landmark:</span> <span class="muted">it stands up.</span></p>
    <p><span class="pink-t">A bird:</span> <span class="muted">it flies over where it lives.</span></p>
    <p class="muted" style="margin-top:5px">Platinum stand at 150 countries. Tap anything to review it.</p>
  </div>`;
}
