// Learn: a topic's path, and the list of topics. The path is a run of nodes, each a whole thing: a lesson,
// a test, an exam, a chest, a review or an animation. Each is a raised button on a winding trail with a
// mark for its kind (a chest is drawn as itself): gold when done, blue with a ring when it's the one to do
// next (the ring is how much of it is done), dim when still ahead. Units of the path are banners, with a
// pip for each node. A lesson's own steps show inside it, on the lesson's thin bar, not here.
import { esc, head, sheet, placeBeside } from '../ui.js';
import { icon, medallion, stepButton, chestNode, pine, rock, glint, at, svg, cup } from '../art.js';
import { rng } from '../ease.js';
import * as data from '../data.js';
import * as feel from '../feel.js';

const GAP = 108, TOP = 72, AMP = 92;

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

const stateOf = x => (x.done ? 'done' : x.now ? 'now' : 'todo');

// One unit's trail: where its nodes sit, the trail through them and the scenery round it.
function trailOf(unit, ui, width) {
  const n = unit.nodes.length;
  const amp = Math.min(AMP, (width - 110) / 2);
  const pts = unit.nodes.map((_, i) => ({ x: width / 2 + amp * Math.sin(i * 1.05 + 0.25 + ui * 2.1), y: TOP + i * GAP }));
  const h = TOP + (n - 1) * GAP + 76;
  const walked = unit.nodes.findIndex(x => !x.done);
  const upTo = walked < 0 ? n - 1 : walked;
  const seg = spline([{ x: pts[0].x - 30, y: 4 }, ...pts]);
  const rand = rng(17 + ui * 31);
  let s = '';
  for (let i = 0; i < 6; i++) s += `<circle cx="${(rand() * width).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${(0.9 + rand() * 0.7).toFixed(1)}" fill="#d6e2ff" opacity="0.45"/>`;
  // pines and rocks on the side the trail leaves free
  pts.forEach((p, i) => {
    if (i % 2 === 1 && rand() < 0.35) return;
    const side = p.x > width / 2 ? -1 : 1;
    const x = p.x + side * (80 + rand() * 40), y = p.y + 30 + rand() * 30;
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
  if (unit.done) s += `<g transform="translate(${(pts[n - 1].x + (pts[n - 1].x > width / 2 ? -88 : 56)).toFixed(1)} ${pts[n - 1].y - 34})">${cup()}${glint(38, 2, 5, '#fff3c4')}</g>`;
  return { pts, h, art: svg(width, h, s) };
}

// The drawing for one node: a chest as itself, anything else as a raised button with its kind's mark.
function nodeArt(x) {
  const state = stateOf(x);
  if (x.node.kind === 'chest') return chestNode({ state });
  const ring = x.now && data.PLAYED.has(x.node.kind) ? x.share : null;
  return stepButton({ kind: x.node.kind, state, progress: ring });
}

export function learnScreen(app) {
  const view = app.view;
  const topics = app.topics;
  const topic = topics.find(t => t.id === app.prefs.topic) || topics[0];
  if (!topic) {
    view.innerHTML = `<section class="screen learn">${head('<span class="title">Learn</span>')}
      <div class="empty">${svg(84, 84, `<g transform="translate(42 38)">${stepButton({ kind: 'lesson', state: 'todo' })}</g>`)}
        <p>No lessons here yet</p>
        ${app.sync.status().connected ? '' : `<button class="btn" data-go="connect">${icon.key(20)}Connect</button>`}</div></section>`;
    const c = view.querySelector('[data-go=connect]');
    if (c) c.onclick = () => app.showConnect();
    return;
  }
  const path = data.pathOf(topic);
  view.innerHTML = `<section class="screen learn">
    ${head(`<button class="topicpick" data-go="topics" aria-label="Topics">${medallion(topic, 34)}<span>${esc(topic.title)}</span><span class="chev">${icon.down(18)}</span></button>`)}
    <div class="units"></div></section>`;
  const screen = view.querySelector('.screen');
  const host = view.querySelector('.units');
  const width = screen.clientWidth;
  path.units.forEach((U, ui) => {
    const sec = document.createElement('section');
    sec.className = 'unit-sec';
    const later = !U.done && !U.nodes.some(x => x.now || x.done);
    sec.innerHTML = `<div class="banner${U.done ? ' done' : later ? ' later' : ''}"><p>${esc(U.title)}</p>
      <div class="pips">${U.nodes.map(x => `<i class="${x.done ? 'done' : x.now ? 'now' : ''}"></i>`).join('')}</div></div>`;
    const t = trailOf(U, ui, width);
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.height = `${t.h}px`;
    trail.innerHTML = t.art + U.nodes.map((x, i) => {
      const state = stateOf(x);
      return `<button class="node ${state}${x.node.kind === 'chest' ? ' chest' : ''}" data-node="${esc(x.node.id)}" data-kind="${esc(x.node.kind)}" style="left:${t.pts[i].x.toFixed(1)}px;top:${t.pts[i].y.toFixed(1)}px"
        aria-label="${esc(`${data.KIND_WORDS[x.node.kind]}: ${x.node.title}`)}" data-sound="${state === 'todo' ? 'off' : 'tap'}">
        ${svg(84, 84, `<g transform="translate(42 38)">${nodeArt(x)}</g>`, 'viewBox="0 0 84 84"')}</button>`;
    }).join('');
    sec.append(trail);
    host.append(sec);
  });

  let callout = null;
  const closeCallout = () => { if (callout) callout.remove(); callout = null; };
  const openCallout = el => {
    closeCallout();
    const x = path.nodes.find(n => n.node.id === el.dataset.node);
    const n = x.node, state = stateOf(x);
    let word = '';
    if (!x.broken && state !== 'todo') {
      if (n.kind === 'chest') word = state === 'done' ? '' : 'Open';
      else if (data.PLAYED.has(n.kind)) word = state === 'done' ? 'Again' : x.started ? 'Carry on' : 'Start';
      else word = state === 'done' ? 'Again' : 'Start';
    }
    const sub = x.broken ? '<p class="note">Not here yet</p>' : n.kind === 'chest' && state === 'done' ? '<p class="note">Opened</p>' : '';
    callout = document.createElement('div');
    callout.className = `callout${state === 'todo' || x.broken ? ' dim' : ''}`;
    callout.innerHTML = `<div class="bub"><p class="kind">${esc(data.KIND_WORDS[n.kind])}</p><p>${esc(n.title)}</p>${sub}
      ${word ? `<button class="btn" data-go="start">${word}</button>` : ''}</div><i class="arrow"></i>`;
    el.parentElement.append(callout);
    placeBeside(callout, el, el.parentElement);
    feel.pop(callout, 0.55);
    if (state === 'todo' || x.broken) feel.nudge(el);
    const b = callout.querySelector('[data-go=start]');
    if (b) b.onclick = () => app.openNode(topic, n, x.done ? 0 : x.resume);
  };
  view.onclick = e => {
    const node = e.target.closest('.node');
    if (node) { openCallout(node); return; }
    if (e.target.closest('[data-go=topics]')) { closeCallout(); topicSheet(app, topic); return; }
    if (!e.target.closest('.callout')) closeCallout();
  };
  // the node to do next comes into view
  const now = view.querySelector('.node.now');
  if (now) {
    const top = now.getBoundingClientRect().top - screen.getBoundingClientRect().top;
    if (top > screen.clientHeight * 0.6) screen.scrollTop = top - screen.clientHeight * 0.45;
  }
}

function topicSheet(app, current) {
  const rows = app.topics.map(t => {
    const p = data.pathOf(t);
    const total = p.nodes.length;
    const done = p.nodes.filter(x => x.done).length;
    const right = p.done ? svg(27, 35, `<g transform="scale(0.8)">${cup()}</g>`) : `<div class="bar"><b style="width:${total ? Math.round((done / total) * 100) : 0}%"></b></div>`;
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
