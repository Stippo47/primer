// Learn: a topic's path, and the list of topics. Each lesson is a banner with its steps below it as raised
// buttons on a winding trail: gold when done, blue with a ring when it's the one to do next (the ring is
// how much of its lesson is done), dim when still ahead. The marks say what kind of step each is.
import { esc, head, sheet, placeBeside } from '../ui.js';
import { icon, medallion, stepButton, pine, rock, glint, at, svg, cup } from '../art.js';
import { rng } from '../ease.js';
import * as data from '../data.js';
import * as feel from '../feel.js';

const KIND = { explain: 'Read', check: 'Question', play: 'Play', scene: 'Watch', test: 'Test' };
const GAP = 98, TOP = 70, AMP = 96;

// A smooth line through points, as one cubic per gap (stage0/screens/js/screens.js).
function spline(pts) {
  const seg = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const k = 0.2;
    seg.push(`M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}C${(p1.x + (p2.x - p0.x) * k).toFixed(1)} ${(p1.y + (p2.y - p0.y) * k).toFixed(1)} ${(p2.x - (p3.x - p1.x) * k).toFixed(1)} ${(p2.y - (p3.y - p1.y) * k).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
  }
  return seg;
}

const levelTag = level => {
  const n = data.levelRank(level);
  return `<span class="tag dim lvl">${esc(data.LEVEL_WORDS[level] || 'Glance')}<span>${[1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span></span>`;
};

// One lesson's trail: where its steps sit, the trail through them and the scenery round it.
function trailOf(L, li, width) {
  const n = L.steps.length;
  const amp = Math.min(AMP, (width - 110) / 2);
  const pts = L.steps.map((_, i) => ({ x: width / 2 + amp * Math.sin(i * 1.0 + 0.25 + li * 2.1), y: TOP + i * GAP }));
  const h = TOP + (n - 1) * GAP + 70;
  const walked = L.steps.findIndex(s => !s.done);
  const upTo = walked < 0 ? n - 1 : walked;
  const seg = spline([{ x: pts[0].x - 30, y: 4 }, ...pts]);
  const rand = rng(17 + li * 31);
  let s = '';
  for (let i = 0; i < 6; i++) s += `<circle cx="${(rand() * width).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${(0.9 + rand() * 0.7).toFixed(1)}" fill="#d6e2ff" opacity="0.45"/>`;
  // pines and rocks on the side the trail leaves free
  pts.forEach((p, i) => {
    if (i % 2 === 1 && rand() < 0.35) return;
    const side = p.x > width / 2 ? -1 : 1;
    const x = p.x + side * (78 + rand() * 40), y = p.y + 30 + rand() * 30;
    if (x < 14 || x > width - 14) return;
    s += rand() < 0.75 ? at(x.toFixed(1), y.toFixed(1), pine(36 + rand() * 40)) : at(x.toFixed(1), y.toFixed(1), rock(20 + rand() * 14));
  });
  const d = seg.join('');
  const done = seg.slice(0, upTo + 1).join(''), ahead = seg.slice(upTo + 1).join('');
  s += `<path d="${d}" fill="none" stroke="#0e1335" stroke-width="34" stroke-linecap="round" transform="translate(0 4)"/>
    <path d="${d}" fill="none" stroke="#1d2558" stroke-width="34" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#242d66" stroke-width="26" stroke-linecap="round"/>
    ${ahead ? `<path d="${ahead}" fill="none" stroke="#3a4494" stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 15"/>` : ''}
    ${done && (walked !== 0) ? `<path d="${done}" fill="none" stroke="#c98a00" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 15" transform="translate(0 1.5)"/>
    <path d="${done}" fill="none" stroke="#ffc83d" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 15"/>` : ''}`;
  if (L.done) s += `<g transform="translate(${(pts[n - 1].x + (pts[n - 1].x > width / 2 ? -86 : 54)).toFixed(1)} ${pts[n - 1].y - 34})">${cup()}${glint(38, 2, 5, '#fff3c4')}</g>`;
  return { pts, h, art: svg(width, h, s) };
}

export function learnScreen(app) {
  const view = app.view;
  const topics = app.topics;
  const topic = topics.find(t => t.id === app.prefs.topic) || topics[0];
  if (!topic) {
    view.innerHTML = `<section class="screen learn">${head('<span class="title">Learn</span>')}
      <div class="empty">${svg(84, 84, `<g transform="translate(42 38)">${stepButton({ kind: 'explain', state: 'todo' })}</g>`)}
        <p>No lessons here yet</p>
        ${app.sync.status().connected ? '' : `<button class="btn" data-go="connect">${icon.key(20)}Connect</button>`}</div></section>`;
    const c = view.querySelector('[data-go=connect]');
    if (c) c.onclick = () => app.showConnect();
    return;
  }
  const path = data.pathOf(topic);
  view.innerHTML = `<section class="screen learn">
    ${head(`<button class="topicpick" data-go="topics" aria-label="Topics">${medallion(topic, 34)}<span>${esc(topic.title)}</span><span class="chev">${icon.down(18)}</span></button>`)}
    <div class="lessons"></div></section>`;
  const screen = view.querySelector('.screen');
  const host = view.querySelector('.lessons');
  const width = screen.clientWidth;
  path.lessons.forEach((L, li) => {
    const sec = document.createElement('section');
    sec.className = 'lesson-sec';
    const later = !L.started && !(path.current && path.current.lesson === L.lesson.id);
    sec.innerHTML = `<div class="banner${L.done ? ' done' : later ? ' later' : ''}"><p>${esc(L.lesson.title)}</p>
      <div class="pips">${L.steps.map(s => `<i class="${s.done ? 'done' : s.now ? 'now' : ''}"></i>`).join('')}</div></div>`;
    const t = trailOf(L, li, width);
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.height = `${t.h}px`;
    trail.innerHTML = t.art + L.steps.map((s, i) => {
      const state = s.done ? 'done' : s.now ? 'now' : 'todo';
      return `<button class="node ${state}" data-lesson="${esc(L.lesson.id)}" data-i="${i}" style="left:${t.pts[i].x.toFixed(1)}px;top:${t.pts[i].y.toFixed(1)}px"
        aria-label="${esc(`${KIND[s.step.kind] || 'Step'}: ${s.step.title || ''}`)}" data-sound="${state === 'todo' ? 'off' : 'tap'}" data-nospring>
        ${svg(84, 84, `<g transform="translate(42 38)">${stepButton({ kind: s.step.kind, state, progress: s.now ? L.share : null })}</g>`, 'viewBox="0 0 84 84"')}</button>`;
    }).join('');
    sec.append(trail);
    host.append(sec);
  });

  let callout = null;
  const closeCallout = () => { if (callout) callout.remove(); callout = null; };
  const openCallout = node => {
    closeCallout();
    const L = path.lessons.find(x => x.lesson.id === node.dataset.lesson);
    const i = Number(node.dataset.i), s = L.steps[i];
    const state = s.done ? 'done' : s.now ? 'now' : 'todo';
    const word = state === 'done' ? 'Again' : L.started ? 'Carry on' : 'Start';
    callout = document.createElement('div');
    callout.className = `callout${state === 'todo' ? ' dim' : ''}`;
    callout.innerHTML = `<div class="bub"><p class="kind">${esc(KIND[s.step.kind] || '')}</p><p>${esc(s.step.title || L.lesson.title)}</p>
      ${state === 'todo' ? '' : `<button class="btn" data-go="start">${word}</button>`}</div><i class="arrow"></i>`;
    node.parentElement.append(callout);
    placeBeside(callout, node, node.parentElement);
    feel.pop(callout, 0.55);
    if (state === 'todo') feel.nudge(node);
    const b = callout.querySelector('[data-go=start]');
    if (b) b.onclick = () => app.openLesson(topic, L.lesson, i);
  };
  view.onclick = e => {
    const node = e.target.closest('.node');
    if (node) { openCallout(node); return; }
    if (e.target.closest('[data-go=topics]')) { closeCallout(); topicSheet(app, topic); return; }
    if (!e.target.closest('.callout')) closeCallout();
  };
  // the step to do next comes into view
  const now = view.querySelector('.node.now');
  if (now) {
    const top = now.getBoundingClientRect().top - screen.getBoundingClientRect().top;
    if (top > screen.clientHeight * 0.6) screen.scrollTop = top - screen.clientHeight * 0.45;
  }
}

function topicSheet(app, current) {
  const rows = app.topics.map(t => {
    const p = data.pathOf(t);
    const total = p.lessons.reduce((n, L) => n + L.steps.length, 0);
    const done = p.lessons.reduce((n, L) => n + L.steps.filter(s => s.done).length, 0);
    const right = total && done === total ? svg(27, 35, `<g transform="scale(0.8)">${cup()}</g>`) : `<div class="bar"><b style="width:${total ? Math.round((done / total) * 100) : 0}%"></b></div>`;
    return `<button class="toprow${t.id === current.id ? ' on' : ''}" data-topic="${esc(t.id)}">${medallion(t, 46)}
      <div class="grow"><p class="name">${esc(t.title)}</p><p style="margin-top:4px">${levelTag(t.level)}</p></div>${right}</button>`;
  }).join('');
  const s = sheet(app.root, rows);
  s.el.addEventListener('click', e => {
    const row = e.target.closest('[data-topic]');
    if (!row) return;
    app.setPref('topic', row.dataset.topic);
    s.close();
    app.render();
  });
}
