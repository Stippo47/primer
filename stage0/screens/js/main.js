// Picks the sketch from the address and draws it. With no screen named, lists them all.

import { tabbar, activeTab, sketchLabel, VARIANTS } from './kit.js';
import { loadWorld } from './globe.js';
import { home, displays } from './home.js';
import { learn, learnPose, practice, review, part, shop, profile, artSheet } from './screens.js';

// every picture in shots2/ (round 2): file name, screen, what it shows
export const SHOTS = [
  ['learn', 'learn', 'Learn: the path'],
  ['learn-topics', 'topics', 'Learn: switching topic'],
  ['practice', 'practice', 'Practice: Review and the Playground, joined'],
  ['review', 'review', 'Review: mid-question'],
  ['playground-part', 'part', 'Playground: one part opened'],
  ['shop', 'shop', 'Shop'],
  ['profile', 'profile', 'Profile'],
  ['profile-detail', 'knowledge', 'Profile: a topic tapped'],
];

const params = new URLSearchParams(location.search);
const screen = params.get('screen');
const phone = document.getElementById('phone');

if (!screen) {
  document.body.className = 'list';
  phone.remove();
  document.body.insertAdjacentHTML('beforeend', `<main><h1>Primer screen sketches</h1><p>Round 2, in the mix look. Pictures only: nothing is tappable. Round 1's pictures are kept in shots/.</p>
    <div class="grid">${SHOTS.map(([file, s, name]) => `<a href="?screen=${s}"><img src="shots2/${file}.png" alt="">${name}</a>`).join('')}</div></main>`);
} else {
  await loadWorld();
  // round 1's Home and globe display still draw here (home, displays); stage0/room replaces them
  const old = VARIANTS[params.get('tabs')] ? params.get('tabs') : 'A';
  const draw = {
    learn: () => learn(false), topics: () => learn(true), practice, review, part, shop,
    profile: () => profile(false), knowledge: () => profile(true), art: artSheet,
    home: () => home(old), displays,
  }[screen] || (() => '<p style="left:20px;top:100px">No such screen.</p>');
  const names = { learn: 'Learn', topics: 'Learn · topics', practice: 'Practice', review: 'Review', part: 'Playground · a part', shop: 'Shop',
    profile: 'Profile', knowledge: 'Profile · a topic', art: 'Drawn things', home: 'Home (round 1)', displays: 'Globe (round 1)' };
  // a review run and an opened part fill the screen: no tab bar until you leave
  const bare = 'review part art'.split(' ').includes(screen);
  const variant = screen === 'home' || screen === 'displays' ? old : 'R2';
  phone.innerHTML = sketchLabel(`Sketch · ${names[screen] || ''}`) + draw() + (bare ? '<div class="homebar"></div>' : tabbar(variant, activeTab(screen, variant)));

  const fit = () => {
    const k = Math.min(1, window.innerWidth / 414, window.innerHeight / 896);
    phone.style.transform = k === 1 ? '' : `scale(${k})`;
  };
  fit();
  window.addEventListener('resize', fit);

  // the Learn path moves a little. seek(t) poses it at t seconds, for filming; with ?live it just plays.
  if (screen === 'learn') {
    window.seek = t => learnPose(phone, t);
    window.filmLength = 5;
    window.seek(3.2);
    if (params.has('live')) {
      const t0 = performance.now();
      const tick = () => { window.seek(((performance.now() - t0) / 1000) % window.filmLength); requestAnimationFrame(tick); };
      tick();
    }
  }
}

await Promise.all([700, 800, 900].map(w => document.fonts.load(`${w} 16px "Nunito"`)));
window.ready = true;
