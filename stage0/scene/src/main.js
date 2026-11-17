// Loads a look, builds the frame and the picture, and plays the scene.
//   index.html?look=night | bright | paper | mix
//   &t=12.5     hold one moment
//   &film=1     no autoplay and no look picker; a capture script calls window.seek(seconds)
//   &detail=110 lighter country shapes
//   &storm=bands | paper | pinwheel | puffs | disc | r1 | r1-noglow   which hurricane drawing (see storms.js)
//   &closeup=1  only the storm, close, turning on the sea: a square loop of four seconds, for comparing drawings

import { createArt } from './art.js';
import { createChrome } from './chrome.js';
import { DURATION } from './script.js';

const LOOKS = ['night', 'bright', 'paper', 'mix'];
const params = new URLSearchParams(location.search);
const name = LOOKS.includes(params.get('look')) ? params.get('look') : 'mix';
const film = params.has('film');
const hold = params.has('t') ? Number(params.get('t')) : null;
const detail = params.get('detail') === '110' ? '110m' : '50m';
const closeup = params.has('closeup');
const keep = ['storm', 'closeup'].filter(k => params.has(k)).map(k => `&${k}=${encodeURIComponent(params.get(k))}`).join('');

const phone = document.getElementById('phone');
document.body.classList.toggle('film', film);
document.body.classList.toggle('closeup', closeup);
document.getElementById('looks').innerHTML = LOOKS
  .map(l => `<a class="${l === name ? 'on' : ''}" href="?look=${l}${keep}">${l}</a>`).join('');

const [look, world] = await Promise.all([
  fetch(`looks/${name}.json`).then(r => r.json()),
  fetch(`vendor/countries-${detail}.json`).then(r => r.json()),
]);
await Promise.all([...new Set([look.fonts.ui, look.fonts.art])]
  .flatMap(f => [400, 600, 700, 800].map(w => document.fonts.load(`${w} 16px "${f}"`))));

const dpr = Math.min(2, Number(params.get('dpr')) || window.devicePixelRatio || 1);
const chrome = createChrome(phone, look);
const art = createArt(document.getElementById('art'), look, world, { dpr, storm: params.get('storm'), closeup });

function fit() {
  const k = Math.min(1, window.innerWidth / 414, window.innerHeight / (closeup ? 414 : 896));
  phone.style.transform = film || k === 1 ? '' : `scale(${k})`;
}
fit();
window.addEventListener('resize', fit);

function draw(t) {
  if (closeup) { art.renderCloseup(t); return; }
  const s = Math.max(0, Math.min(DURATION, t));
  chrome.render(s);
  art.render(s);
}

let playing = !film && hold === null;
let origin = performance.now();
let at = hold ?? 0;

// For filming and for checking: draw one exact moment.
window.seek = seconds => {
  playing = false;
  at = seconds;
  draw(at);
  return at;
};

function tick(now) {
  if (playing) {
    const loop = closeup ? 4 : DURATION + 1.6;         // rest on the last frame before starting over
    at = ((now - origin) / 1000) % loop;
    draw(at);
  }
  requestAnimationFrame(tick);
}
phone.addEventListener('click', () => {               // tap to pause or carry on
  if (film) return;
  playing = !playing;
  if (playing) origin = performance.now() - at * 1000;
});

draw(at);
requestAnimationFrame(tick);
window.ready = true;
