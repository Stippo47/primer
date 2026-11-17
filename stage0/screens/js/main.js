// Picks the sketch from the address and draws it. With no screen named, lists them all.

import { tabbar, activeTab, sketchLabel, VARIANTS } from './kit.js';
import { loadWorld } from './globe.js';
import { home, displays } from './home.js';
import { learn, review, strengths, shop, profile, playground, tabsSheet } from './screens.js';

// every picture in shots/: file name, screen, tab variant, what it shows
export const SHOTS = [
  ['learn', 'learn', 'A', 'Learn: the path'],
  ['learn-topics', 'topics', 'A', 'Learn: switching topic'],
  ['review', 'review', 'A', 'Review: mid-question'],
  ['review-strengths', 'strengths', 'A', 'Review: strong and weak'],
  ['home-A', 'home', 'A', 'Home, tabs A'],
  ['home-B', 'home', 'B', 'Home, tabs B'],
  ['home-B2', 'home', 'B2', 'Home, tabs B2'],
  ['shop', 'shop', 'A', 'Shop'],
  ['profile', 'profile', 'A', 'Profile'],
  ['playground-A', 'playground', 'A', 'Playground, inside Home (A)'],
  ['playground-B2', 'playground', 'B2', 'Playground, own tab (B2)'],
  ['displays', 'displays', 'A', 'Displays: the globe'],
  ['tabs', 'tabs', 'A', 'The tab bar, three ways'],
];

const params = new URLSearchParams(location.search);
const screen = params.get('screen');
const variant = VARIANTS[params.get('tabs')] ? params.get('tabs') : 'A';
const phone = document.getElementById('phone');

if (!screen) {
  document.body.className = 'list';
  phone.remove();
  document.body.insertAdjacentHTML('beforeend', `<main><h1>Primer screen sketches</h1><p>Layout sketches in the mix look. Pictures only: nothing is tappable.</p>
    <div class="grid">${SHOTS.map(([file, s, v, name]) => `<a href="?screen=${s}&tabs=${v}"><img src="shots/${file}.png" alt="">${name}</a>`).join('')}</div></main>`);
} else {
  await loadWorld();
  const draw = {
    learn: () => learn(false), topics: () => learn(true), review, strengths, shop, profile,
    home: () => home(variant), playground: () => playground(variant), displays, tabs: tabsSheet,
  }[screen] || (() => '<p style="left:20px;top:100px">No such screen.</p>');
  const names = { learn: 'Learn', topics: 'Learn · topics', review: 'Review', strengths: 'Review · strong and weak', home: 'Home', shop: 'Shop',
    profile: 'Profile', playground: 'Playground', displays: 'Displays · globe', tabs: 'Tab bar' };
  const long = screen === 'home' || screen === 'playground';
  const tag = screen === 'tabs' ? 'Sketch · tab bar options' : `Sketch · ${names[screen] || ''} · tabs ${variant}${long ? `: ${{ A: 'Playground inside Home', B: 'six tabs', B2: 'Shop inside Home' }[variant]}` : ''}`;
  phone.innerHTML = sketchLabel(tag) + draw() + (screen === 'tabs' ? '' : tabbar(variant, activeTab(screen, variant)));

  const fit = () => {
    const k = Math.min(1, window.innerWidth / 414, window.innerHeight / 896);
    phone.style.transform = k === 1 ? '' : `scale(${k})`;
  };
  fit();
  window.addEventListener('resize', fit);
}

await Promise.all([700, 800, 900].map(w => document.fonts.load(`${w} 16px "Nunito"`)));
window.ready = true;
