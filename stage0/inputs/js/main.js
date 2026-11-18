// Answer-form sketches: one lesson step per address, each with a different way of answering.
//   index.html                       the list
//   index.html?form=number-dial      one form, to use by hand (on a phone or with a mouse)
//   &ghost=1                         the ghost finger answers it, once wrong and once right
//   &film=1                          no clock of its own: tools/capture.mjs calls window.frame(i) for each frame
//   &touch=1                         the ghost's touches go out through the capture tool as real touches (the touch test)
//   &nohand=1                        the ghost still answers but isn't drawn (for stills)
//
// The step around each form is the app's lesson screen (css/lesson.css, js/lesson.js): a bar and a cross on
// top, the question, the form, and a Check button that turns into Continue with plain feedback.
import { PARAMS, FILM, C, Val, now, setFilmTime, setPhone, rectOf, track, tick, canvas, esc, W, H } from './kit.js';
import { createGhost } from './ghost.js';

export const FORMS = [
  ['number-dial', 'Number', 'Dial', 'Turn a wind dial. A palm tree in the middle bends harder as the wind rises.'],
  ['number-tower', 'Number', 'Tower', 'Pull a storm cloud up a height scale beside Everest and a jet. The scale stretches if you go past the top.'],
  ['number-pile', 'Number', 'Pile', 'Drag up to pile storms into a year. Count by seeing how many it is.'],
  ['match-snap', 'Match', 'Snap', 'Drag each word onto its instrument, where it clicks in like a jigsaw piece.'],
  ['match-string', 'Match', 'String', 'Pull a string from each name to its ocean on a little map.'],
  ['match-sort', 'Match', 'Sort', 'Drop each fact into the hurricane bin or the tornado bin.'],
  ['spot-pin', 'Spot', 'Pin', 'Drag a pin onto the storm. On Check it zooms in on your pin and the true spot, with the wind drawn in.'],
  ['spot-regions', 'Spot', 'Regions', 'Touch a part of a storm cut in half; the part under your finger lights up.'],
  ['spot-lasso', 'Spot', 'Lasso', 'Draw a loop around part of a map. On Check a season of storms starts, inside your loop and out.'],
];

const id = PARAMS.get('form');
const phone = document.getElementById('phone');
const FPS = 30;

if (!FORMS.some(f => f[0] === id)) {
  document.body.className = 'list';
  const groups = ['Number', 'Match', 'Spot'];
  document.body.insertAdjacentHTML('beforeend', `<main><h1>Answer forms, round 2</h1>
    <p>Alternatives for the number, match and spot forms, each in a lesson step about hurricanes and weather. Each works by touch; add <em>&amp;ghost=1</em> to watch a finger answer it wrong, then right.</p>
    ${groups.map(g => `<h2>${g}</h2><div class="row">${FORMS.filter(f => f[1] === g).map(([fid, , label, about]) =>
      `<a class="card" href="?form=${fid}"><b>${label}</b><span>${esc(about)}</span><em>films/${fid}.mp4</em></a>`).join('')}</div>`).join('')}</main>`);
} else {
  await boot(id);
}

async function boot(formId) {
  const [, group, label] = FORMS.find(f => f[0] === formId);
  const mod = await import(`./forms/${formId}.js`);
  await Promise.all([400, 700, 800, 900].map(w => document.fonts.load(`${w} 16px Nunito`)));
  if (FILM) document.body.classList.add('film');

  // The phone sits top left at full size when filmed, tested or on a phone; on a bigger screen it's centred and fitted.
  const fitted = !FILM && !PARAMS.has('touch') && (innerWidth > 430 || innerHeight < 860);
  const k = fitted ? Math.min(1.4, (innerHeight - 20) / H, (innerWidth - 20) / W) : 1;
  if (fitted) { phone.style.left = `${(innerWidth - W * k) / 2}px`; phone.style.top = '10px'; phone.style.transform = `scale(${k})`; }
  setPhone(phone, k);

  phone.innerHTML = `<div class="sketch">Sketch · ${group} · ${label}</div>
    <section class="lesson">
      <header class="ltop"><button class="round" aria-label="Close"><svg width="20" height="20" viewBox="0 0 28 28"><path d="M7 7l14 14M21 7L7 21" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg></button><div class="lbar"><b></b></div></header>
      <div class="lbody"><p class="ltext">${mod.meta.question}</p></div>
      <div class="lform"></div>
      <footer class="lfoot"><div class="lfeed" hidden></div><button class="btn" disabled>Check</button></footer>
    </section>`;
  const q = phone.querySelector('.ltext'), formEl = phone.querySelector('.lform'), foot = phone.querySelector('.lfoot');
  const feed = foot.querySelector('.lfeed'), btn = foot.querySelector('.btn'), bar = phone.querySelector('.lbar b');
  const top = Math.round(rectOf(q).y + rectOf(q).h + 16);
  const FOOT = 214;   // room kept for the footer once it holds two lines of feedback
  const box = { left: 16, top, w: W - 32, h: H - top - FOOT };
  formEl.style.top = `${box.top}px`;
  formEl.style.height = `${box.h}px`;

  let phase = 'answer', pendingReset = null;
  const results = [];
  const barShare = new Val(0.42), footY = new Val(0), fade = new Val(1);
  const update = () => { btn.disabled = !(phase === 'answer' ? form.answered() : true); };

  const api = {
    el: formEl, ...box, now, tick, track, canvas, rectOf,
    changed: () => update(),
    get locked() { return phase !== 'answer'; },
  };
  const form = await mod.mount(api);

  // Buttons sink while held, as in the app. The tick is the only feel on a press: no press sounds.
  phone.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b && !b.disabled) { b.classList.add('down'); tick(); } });
  window.addEventListener('pointerup', () => phone.querySelectorAll('button.down').forEach(b => b.classList.remove('down')));

  const icons = {
    right: '<svg width="22" height="22" viewBox="0 0 28 28"><path d="M6 14.5l5.5 5.5L22 8.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wrong: '<svg width="18" height="18" viewBox="0 0 28 28"><path d="M7 7l14 14M21 7L7 21" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 28 28"><polygon points="14,4.5 16.6,11.1 23.6,11.4 18.1,15.8 20,22.6 14,18.7 8,22.6 9.9,15.8 4.4,11.4 11.4,11.1" fill="currentColor"/></svg>',
  };
  function check(t) {
    const res = form.check();
    results.push(res.kind);
    phase = 'marked';
    feed.innerHTML = `<div class="badge">${icons[res.kind]}</div><div><p class="lverdict">${{ right: 'Right', close: 'Close', wrong: 'Not quite' }[res.kind]}</p>${res.why ? `<p class="lwhy">${res.why}</p>` : ''}</div>`;
    feed.hidden = false;
    foot.className = `lfoot ${res.kind}`;
    footY.to(0, { t, from: 70, ms: 420, kind: 'glide' });
    btn.textContent = 'Continue';
    btn.className = `btn ${res.kind === 'right' ? 'teal' : res.kind === 'close' ? 'gold' : 'pink'}`;
    btn.disabled = false;
    form.reveal(t, res);
  }
  function next(t) {
    fade.to(0, { t, ms: 160, kind: 'inOut' });
    pendingReset = t + 0.17;
  }
  function resetNow(t) {
    pendingReset = null;
    phase = 'answer';
    feed.hidden = true;
    feed.innerHTML = '';
    foot.className = 'lfoot';
    btn.textContent = 'Check';
    btn.className = 'btn';
    form.reset(t);
    update();
    barShare.to(0.5, { t, ms: 600 });
    fade.to(1, { t, ms: 200, kind: 'inOut' });
  }
  btn.addEventListener('click', () => {
    const t = now();
    if (phase === 'answer') { if (form.answered()) check(t); } else if (pendingReset === null) next(t);
  });

  // ---- the ghost finger
  const ghostMode = PARAMS.has('touch') ? 'cdp' : (FILM || PARAMS.has('ghost')) ? 'synthetic' : null;
  const ghost = ghostMode ? createGhost(phone, ghostMode) : null;
  const center = el => () => { const r = rectOf(typeof el === 'function' ? el() : el); return [r.cx, r.cy]; };
  const G = {
    // a place in the form's own coordinates, as a place on the phone
    pt: (x, y) => () => [box.left + x, box.top + y],
    at: center,
    tap: (where, { hold = 90 } = {}) => [{ move: where }, { down: true }, { wait: hold }, { up: true }],
    drag: (from, to, { ms = 520, path, hold = 70, ease, moveMs, after = 50 } = {}) => [{ move: from, ms: moveMs }, { down: true }, { wait: hold },
      path ? { drag: path, ms, ease } : { drag: () => to(), ms, ease }, { wait: after }, { up: true }],
    wait: ms => ({ wait: ms }),
  };
  const checkAt = center(btn);
  const rest = () => [394, 874];   // out of the way, low on the right, while the answer plays out
  const plan = () => {
    const wrong = form.ghost('wrong', G), right = form.ghost('right', G);
    wrong[0] = { ...wrong[0], enter: true };
    const show = mod.meta.revealMs ?? 1500;
    return [
      { wait: 100 },
      ...wrong, { wait: 60 }, ...G.tap(checkAt), { move: rest, ms: 280 }, { wait: Math.max(200, show - 620) },
      ...G.tap(checkAt), { wait: 140 },
      ...right, { wait: 60 }, ...G.tap(checkAt), { move: rest, ms: 280 }, { leave: true, ms: 480 }, { wait: Math.max(200, show - 1100) },
    ];
  };

  function frame(t) {
    if (ghost) ghost.update(t);
    if (pendingReset !== null && t >= pendingReset) resetNow(t);
    form.render(t);
    bar.style.transform = `scaleX(${barShare.at(t)})`;
    const fy = footY.at(t);
    foot.style.transform = fy ? `translateY(${fy}px)` : '';
    const o = fade.at(t);
    formEl.style.opacity = o;
    q.style.opacity = o;
    if (ghost && !PARAMS.has('nohand')) ghost.draw(t);
  }

  window.__results = results;
  window.__form = form;
  if (FILM) {
    let done = null;
    window.frame = i => {
      const t = i / FPS;
      setFilmTime(t);
      if (i === 0) ghost.play(plan(), 0);
      frame(t);
      if (done === null && !ghost.busy) done = t;
      return { t, done: done !== null && t >= done + 0.35, results };
    };
    window.ready = true;
  } else {
    if (ghost) ghost.play(plan(), now() + 0.4);
    if (ghostMode === 'cdp') {
      window.__take = () => ghost.take();
      window.__ghostBusy = () => ghost.busy;
    }
    const loop = () => { frame(now()); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    window.ready = true;
  }
}
