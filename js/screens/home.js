// Home and Shop, for now: calm places that say little. The room arrives in stage 4, and the shop with it.
import { head } from '../ui.js';
import { svg, glint } from '../art.js';

export function homeScreen(app) {
  const room = `<rect x="18" y="40" width="164" height="104" rx="10" fill="#1b2250" stroke="#2f3678" stroke-width="3"/>
    <path d="M18 120h164v14a10 10 0 0 1-10 10H28a10 10 0 0 1-10-10z" fill="#222a60"/>
    <rect x="40" y="62" width="34" height="58" rx="5" fill="#141a3c" stroke="#364090" stroke-width="3"/><circle cx="67" cy="92" r="2.6" fill="#ffc83d"/>
    <rect x="104" y="60" width="54" height="34" rx="5" fill="#0f1434" stroke="#364090" stroke-width="3"/><path d="M131 60v34M104 77h54" stroke="#364090" stroke-width="3"/>
    <circle cx="120" cy="70" r="1.4" fill="#d6e2ff" opacity="0.7"/><circle cx="146" cy="84" r="1.1" fill="#d6e2ff" opacity="0.6"/>${glint(166, 30, 6, '#ffe9a6', 0.8)}`;
  app.view.innerHTML = `<section class="screen home">${head('<span class="title">Home</span>')}
    <div class="calm">${svg(200, 160, room)}<p>Your room comes later</p></div></section>`;
}

// Dark imprints of the shapes things will have, the way a locked thing is shown (ruled 2026-11-17).
const SHAPES = [
  `<path d="M28 4h4v10h-4z"/><path d="M12 22a18 18 0 0 1 36 0v20a18 18 0 0 1-36 0z"/><rect x="22" y="58" width="16" height="8" rx="3"/>`,
  `<path d="M10 22a12 12 0 0 1 12-12h20a12 12 0 0 1 12 12v12h4a6 6 0 0 1 6 6v18H0V40a6 6 0 0 1 6-6h4z"/><rect x="6" y="58" width="6" height="8"/><rect x="52" y="58" width="6" height="8"/>`,
  `<path d="M30 40C14 34 10 16 18 4c8 8 10 20 12 30 2-10 4-22 12-30 8 12 4 30-12 36z"/><path d="M16 42h28l-4 24H20z"/>`,
  `<rect x="2" y="30" width="80" height="22" rx="5"/><rect x="2" y="12" width="10" height="46" rx="4"/><rect x="72" y="22" width="10" height="36" rx="4"/><rect x="14" y="22" width="24" height="12" rx="5"/>`,
  `<path d="M10 42a22 22 0 0 1 44 0z"/><circle cx="32" cy="14" r="8"/><rect x="4" y="40" width="56" height="12" rx="5"/>`,
  `<circle cx="16" cy="30" r="14"/><circle cx="52" cy="30" r="14"/><path d="M28 26q6-6 12 0" stroke="#000" stroke-width="5" fill="none"/>`,
];

export function shopScreen(app) {
  app.view.innerHTML = `<section class="screen shop">${head('<span class="title">Shop</span>')}
    <div class="imprints">${SHAPES.map(s => `<div class="plate">${svg(84, 70, `<g transform="translate(6 2)">${s}</g>`)}</div>`).join('')}</div>
    <div class="calm" style="padding-top:28px"><p class="muted">Soon</p></div></section>`;
}

