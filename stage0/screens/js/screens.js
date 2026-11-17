// Learn, Review, Shop, Profile, Playground, and the tab bar compared.

import { svg, icon, coins, star, swirl, rng, tabbar, VARIANTS } from './kit.js';
import { globe } from './globe.js';
import * as O from './objects.js';

const topicMark = { hurricanes: icon.swirl, bears: icon.paw, flags: icon.flag, circuits: icon.bolt, guitar: icon.strings };
const topicColor = { hurricanes: '#6fd6ff', bears: '#ffa23a', flags: '#ee4b7a', circuits: '#ffd75a', guitar: '#b48cff' };
const badge = (topic, size = 38) => `<div style="width:${size}px;height:${size}px;border-radius:${size * 0.32}px;background:#141a3c;border:2px solid #2f3678;display:flex;align-items:center;justify-content:center;flex:none;color:${topicColor[topic]}">${topicMark[topic](size * 0.62)}</div>`;

// ---------------------------------------------------------------- Learn

const PATH = [
  { x: 132, y: 190, kind: 'lesson', state: 'done', title: 'Warm water', side: 'r' },
  { x: 207, y: 252, kind: 'lesson', state: 'done', title: 'Where hurricanes form', side: 'r' },
  { x: 282, y: 314, kind: 'lesson', state: 'done', title: 'Why they spin', side: 'l' },
  { x: 207, y: 378, kind: 'test', state: 'done', title: 'Unit 1 test', sub: '9 of 10', side: 'r' },
  { x: 132, y: 522, kind: 'lesson', state: 'now', title: 'The eye', side: 'r' },
  { x: 207, y: 582, kind: 'lesson', state: 'locked', title: 'Storm surge', side: 'r' },
  { x: 282, y: 642, kind: 'lesson', state: 'locked', title: 'How storms die', side: 'l' },
  { x: 207, y: 702, kind: 'test', state: 'locked', title: 'Unit 2 test', side: 'l' },
  { x: 322, y: 750, kind: 'exam', state: 'locked', title: 'Exam', sub: 'Topic trophy', side: 'l' },
];

function node(n) {
  const c = { done: ['#ffc83d', '#c98a00', '#7a4d00'], now: ['#49c6ff', '#1b8fd1', '#0e1436'], locked: ['#262d60', '#1c2250', '#5d66ad'] }[n.state];
  const r = n.kind === 'exam' ? 30 : 27;
  const hex = (rr, dy) => {
    const pts = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr + dy).toFixed(1)}`; }).join(' ');
    return pts;
  };
  let shape;
  if (n.kind === 'lesson') shape = `<circle cy="5" r="${r}" fill="${c[1]}"/><circle r="${r}" fill="${c[0]}"/>`;
  else if (n.kind === 'test') shape = `<polygon points="${hex(26, 5)}" fill="${c[1]}" stroke="${c[1]}" stroke-width="9" stroke-linejoin="round"/><polygon points="${hex(26, 0)}" fill="${c[0]}" stroke="${c[0]}" stroke-width="9" stroke-linejoin="round"/>`;
  else shape = `<rect x="${-r}" y="${-r + 5}" width="${r * 2}" height="${r * 2}" rx="16" fill="${c[1]}"/><rect x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" rx="16" fill="${c[0]}"/>`;
  let mark;
  if (n.kind === 'exam') mark = `<g fill="${c[2]}"><path d="M-11 -14h22v8a11 11 0 0 1-22 0z"/><rect x="-2.5" y="4" width="5" height="7"/><rect x="-9" y="10" width="18" height="5.5" rx="2"/><path d="M-11 -11h-5q0 9 7 10M11 -11h5q0 9-7 10" fill="none" stroke="${c[2]}" stroke-width="3"/></g>`;
  else if (n.kind === 'test') mark = star(0, 0, 13, n.state === 'done' ? '#fff' : c[2]);
  else if (n.state === 'done') mark = `<path d="M-11 0l8 8 14-15" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  else if (n.state === 'now') mark = `<path d="M-7 -11l18 11-18 11z" fill="${c[2]}" stroke="${c[2]}" stroke-width="3" stroke-linejoin="round"/>`;
  else mark = `<g fill="${c[2]}"><rect x="-9" y="-3" width="18" height="14" rx="4"/><path d="M-5.5 -3v-4a5.5 5.5 0 0 1 11 0v4" fill="none" stroke="${c[2]}" stroke-width="3.4"/></g>`;
  const ring = n.state === 'now' ? `<circle cy="2" r="40" fill="#49c6ff" opacity="0.14"/><circle cy="2" r="36" fill="none" stroke="#6fd6ff" stroke-width="3" stroke-dasharray="7 7" stroke-linecap="round"/>` : '';
  return `<g transform="translate(${n.x} ${n.y})">${ring}${shape}${mark}</g>`;
}

function nodeLabel(n) {
  const off = n.kind === 'exam' ? 42 : n.state === 'now' ? 48 : 40;
  const pos = n.side === 'r' ? `left:${n.x + off}px;text-align:left` : `right:${414 - n.x + off}px;text-align:right`;
  const col = n.state === 'locked' ? 'color:#5d66ad' : '';
  const kind = !n.sub ? '' : `<p class="over" style="font-size:10px;${n.state === 'done' ? 'color:#ffc83d' : 'color:#5d66ad'}">${n.sub || ''}</p>`;
  const go = n.state === 'now' ? `<div style="margin-top:5px"><div class="btn sm" style="display:inline-flex">Start</div></div>` : '';
  return `<div style="${pos};top:${n.y - (n.state === 'now' ? 30 : kind ? 15 : 8)}px;font-size:14px;${col};width:150px">${n.title}${kind}${go}</div>`;
}

function unitBanner(y, n, title, done, h = 46) {
  return `<div style="left:16px;right:16px;top:${y}px;height:${h}px;border-radius:15px;background:#8b3fbf;box-shadow:0 4px 0 #5f2a8a;display:flex;align-items:center;justify-content:space-between;padding:0 14px">
    <div><span class="over" style="color:#e4c8ff;font-size:10.5px">Unit ${n}</span><p style="font-size:16.5px;margin-top:-1px">${title}</p></div>
    <div style="font-size:12.5px;color:#e4c8ff">${done}</div></div>`;
}

export function learn(sheet = false) {
  const line = (a, b, color) => `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="${color}" stroke-width="11" stroke-linecap="round"/>`;
  let s = '';
  for (let i = 0; i < PATH.length - 1; i++) {
    if (i === 3) continue; // the unit banner sits between these two
    s += line(PATH[i], PATH[i + 1], PATH[i + 1].state === 'done' ? '#6b5a2a' : PATH[i + 1].state === 'now' ? '#2f5f95' : '#222a60');
  }
  s += PATH.map(node).join('');
  const base = `
  <div class="head">
    <div style="display:flex;align-items:center;gap:8px;height:42px;padding:0 10px 0 6px;border-radius:15px;background:#222a60;border:2px solid #364090;box-shadow:0 4px 0 #1c2250">
      ${badge('hurricanes', 30)}<span style="font-size:18px">Hurricanes</span><span style="color:#6fd6ff;display:flex">${icon.down(18)}</span>
    </div>
    <div class="right">${coins(340)}</div>
  </div>
  ${unitBanner(102, 1, 'How a storm is born', '3 of 3 · test passed')}
  <div style="left:0;top:0">${svg(414, 896, s)}</div>
  ${PATH.map(nodeLabel).join('')}
  ${unitBanner(424, 2, 'The life of a storm', '0 of 3')}`;
  if (!sheet) return base;

  // the topic sheet, open over the path
  const row = (topic, name, tags, prog, extra = '', on = false) => `
    <div style="display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:16px;margin-bottom:9px;background:${on ? '#222a60' : '#1b2250'};border:2px solid ${on ? '#6fd6ff' : '#2f3678'};box-shadow:0 3px 0 ${on ? '#1b8fd1' : '#2f3678'}">
      ${badge(topic, 42)}
      <div style="flex:1;min-width:0"><p style="font-size:16px">${name}</p>
        <p style="margin-top:3px;display:flex;gap:5px;align-items:center">${tags}</p></div>
      <div style="text-align:right;flex:none"><p style="font-size:13px;color:${prog[1]}">${prog[0]}</p>${extra}</div>
    </div>`;
  const depth = n => `<span style="display:inline-flex;gap:2.5px;align-items:center" title="depth">${[0, 1, 2].map(i => `<i style="width:6px;height:${6 + i * 3}px;border-radius:2px;background:${i < n ? '#6fd6ff' : '#364090'}"></i>`).join('')}</span>`;
  const t = (len, d) => `<span class="tag dim" style="font-size:10px">${len}</span>${depth(d)}`;
  return base + `
  <div style="inset:0;background:rgba(8,10,34,0.72)"></div>
  <div style="left:0;right:0;bottom:0;top:280px;background:#141a3c;border-top:2px solid #364090;border-radius:26px 26px 0 0;padding:10px 16px 0">
    <div style="width:44px;height:5px;border-radius:3px;background:#364090;margin:0 auto 12px"></div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><p style="font-size:22px">Topics</p><p class="muted" style="font-size:12px">length · depth</p></div>
    ${row('hurricanes', 'Hurricanes', t('Solid · 6 lessons', 2), ['3 of 6', '#6fd6ff'], '<p class="muted" style="font-size:11px">in progress</p>', true)}
    ${row('bears', 'Bears', t('Deep · 12 lessons', 3), ['Exam passed', '#ffc83d'], '<p class="muted" style="font-size:11px">7 trophies</p>')}
    ${row('flags', 'World flags', t('Course · 195 facts', 1), ['62 of 195', '#6fd6ff'], '<p class="muted" style="font-size:11px">a few a day</p>')}
    ${row('circuits', 'Circuits', t('Tour · 3 lessons', 2), ['Done', '#ffc83d'], '<p class="pink-t" style="font-size:11px">fading</p>')}
    ${row('guitar', 'Guitar strings', t('Glance · 1 lesson', 1), ['Done', '#ffc83d'], '<p class="pink-t" style="font-size:11px">fading</p>')}
    <p class="muted" style="font-size:12px;text-align:center;margin-top:8px">New topics are asked for in chat, not here.</p>
  </div>`;
}

// ---------------------------------------------------------------- Review

export function review() {
  const g = globe({ cx: 191, cy: 132, r: 290, rotate: [45, -15], sst: true, equator: true, glow: false, depth: 3 });
  const storm = g.at([-64, 26]), start = g.at([-22, 12]), q = g.at([-38, 0]), eq = g.at([-13, 0]);
  const mid = g.at([-45, 13]);
  let s = g.svg;
  s += `<path d="M${start[0]} ${start[1]}Q${mid[0]} ${mid[1] + 8} ${storm[0]} ${storm[1]}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="0.1 9" stroke-linecap="round" opacity="0.95"/>
    <circle cx="${start[0]}" cy="${start[1]}" r="6" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="${start[0]}" cy="${start[1]}" r="2.2" fill="#fff"/>
    <ellipse cx="${storm[0] + 5}" cy="${storm[1] + 10}" rx="26" ry="20" fill="#060830" opacity="0.27"/>
    <circle cx="${storm[0]}" cy="${storm[1]}" r="38" fill="#bfd4ff" opacity="0.2"/>
    <g transform="translate(${storm[0]} ${storm[1]}) rotate(20)">${swirl(26, '#fff', '#1b2a80')}</g>
    <text x="${eq[0]}" y="${eq[1] - 9}" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" opacity="0.9">Equator</text>
    <circle cx="${q[0]}" cy="${q[1]}" r="27" fill="#ffc83d" opacity="0.25"/>
    <circle cx="${q[0]}" cy="${q[1] + 3}" r="17" fill="#c98a00"/><circle cx="${q[0]}" cy="${q[1]}" r="17" fill="#ffc83d"/>
    <text x="${q[0]}" y="${q[1] + 7.5}" text-anchor="middle" font-size="22" font-weight="900" fill="#2a1650">?</text>`;

  const answer = (text, y) => `<div class="btn ghost" style="left:16px;right:16px;top:${y}px;height:48px;justify-content:flex-start;text-transform:none;letter-spacing:0;font-size:15.5px">${text}</div>`;
  const meter = (topic, pct, col) => `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px">
      <span style="color:${topicColor[topic]};display:flex">${topicMark[topic](20)}</span>
      <div style="width:100%;height:7px;border-radius:4px;background:#2a3168"><div style="width:${pct}%;height:100%;border-radius:4px;background:${col}"></div></div></div>`;
  return `
  <div class="head">
    <div class="left" style="gap:10px">
      <div style="height:40px;min-width:50px;padding:0 9px;border-radius:13px;background:#ffc83d;box-shadow:0 4px 0 #c98a00;color:#2a1650;font-size:22px;display:flex;align-items:center;justify-content:center">×3</div>
      <div><p class="over" style="font-size:10.5px;color:#ffc83d">Combo · 7 in a row</p>
        <div style="display:flex;gap:4px;margin-top:5px">${[1, 1, 0, 0, 0].map(on => `<i style="width:22px;height:8px;border-radius:4px;background:${on ? '#ffc83d' : '#2a3168'}"></i>`).join('')}<span class="muted" style="font-size:10.5px;margin:-3px 0 0 3px">×4</span></div></div>
    </div>
    <div class="right">${coins(340)}</div>
  </div>
  <div class="stage" style="left:16px;right:16px;top:104px;height:262px">${svg(382, 262, s)}
    <div class="tag" style="position:absolute;left:12px;top:12px">Hurricanes · Where hurricanes form</div>
  </div>
  <div class="tag gold" style="left:18px;top:380px">Last seen 2 months ago · pays more</div>
  <p style="left:20px;right:20px;top:410px;font-size:21px;line-height:1.25">Why can’t a hurricane start <span class="gold-t">here</span>, on the equator?</p>
  ${answer('The sea is too cold there', 474)}
  ${answer('There is no spin to start it turning', 531)}
  ${answer('The air is too dry', 588)}
  <div style="left:16px;right:16px;top:650px;display:flex;align-items:center;gap:11px">
    <div class="btn sm" style="height:38px;background:#2c2850;color:#ffc83d;border:2px solid #ffc83d;box-shadow:0 3px 0 #c98a00">${icon.coin(20)}I’m sure</div>
    <p class="muted" style="font-size:12px;line-height:1.3">Tap before you answer.<br>Right pays double, wrong costs 10.</p>
  </div>
  <div class="plate" style="left:16px;right:16px;top:704px;height:64px;padding:7px 12px 0">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="over" style="font-size:10.5px">Strong and weak</span><span class="sky-t" style="font-size:11.5px;display:flex;align-items:center">every fact ${icon.right(12)}</span></div>
    <div style="display:flex;gap:12px;margin-top:5px">${meter('bears', 92, '#6fd6ff')}${meter('hurricanes', 81, '#6fd6ff')}${meter('flags', 64, '#4b8fd6')}${meter('circuits', 38, '#ee4b7a')}${meter('guitar', 45, '#ee4b7a')}</div>
  </div>`;
}

// each topic's facts as a field of dots, bright to faded
const SHADES = ['#6fd6ff', '#49a9e6', '#3b78c4', '#2f4d96', '#283068'];
function dotField(count, weights, seed, missed = 0, cols = 30) {
  const rand = rng(seed);
  const total = weights.reduce((a, b) => a + b, 0);
  const d = cols > 34 ? 5 : 7, gap = cols > 34 ? 2 : 3;
  let out = '';
  const picks = [];
  for (let i = 0; i < count; i++) {
    let x = rand() * total, k = 0;
    while (x > weights[k]) { x -= weights[k]; k++; }
    picks.push(k);
  }
  picks.sort((a, b) => a - b + (rand() - 0.5) * 2.2);
  for (let i = 0; i < count; i++) {
    const cx = (i % cols) * (d + gap) + d / 2, cy = Math.floor(i / cols) * (d + gap) + d / 2;
    const miss = i >= count - missed;
    out += `<circle cx="${cx}" cy="${cy}" r="${d / 2}" fill="${miss ? '#ee4b7a' : SHADES[picks[i]]}"/>`;
  }
  const rows = Math.ceil(count / cols);
  return svg(cols * (d + gap) - gap, rows * (d + gap) - gap, out);
}

export function strengths() {
  const card = (topic, name, pct, note, field, y, h) => `
    <div class="plate" style="left:16px;right:16px;top:${y}px;height:${h}px;padding:9px 12px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">${badge(topic, 30)}<p style="font-size:15.5px;flex:1">${name}</p>
        <p style="font-size:12px" class="${pct < 50 ? 'pink-t' : 'muted'}">${note}</p><p style="font-size:15.5px;color:${pct < 50 ? '#ff8fb0' : '#6fd6ff'}">${pct}%</p></div>
      ${field}
    </div>`;
  const miss = (text, from, n) => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:2px solid #2a3168">
      <i style="width:10px;height:10px;border-radius:50%;background:#ee4b7a;flex:none"></i>
      <div style="flex:1;min-width:0"><p style="font-size:13.5px;line-height:1.2">${text}</p><p class="muted" style="font-size:11px">${from}</p></div>
      <p class="pink-t" style="font-size:12px;flex:none">missed ${n}×</p></div>`;
  return `
  <div class="head">
    <div class="left"><div class="back">${icon.left(18)}Review</div><span class="title" style="font-size:22px;margin-left:4px">Strong and weak</span></div>
  </div>
  <div style="left:18px;right:18px;top:100px;display:flex;align-items:center;gap:6px;font-size:11.5px" class="muted">
    One dot is one fact. ${SHADES.map(c => `<i style="width:9px;height:9px;border-radius:50%;background:${c}"></i>`).join('')} bright = you’d remember it
  </div>
  ${card('bears', 'Bears', 92, '84 facts', dotField(84, [60, 22, 8, 3, 1], 11, 1), 124, 92)}
  ${card('hurricanes', 'Hurricanes', 81, '36 facts', dotField(36, [30, 30, 20, 8, 2], 5, 1), 228, 74)}
  ${card('flags', 'World flags', 64, '62 of 195 learned', dotField(62, [20, 26, 26, 18, 10], 23, 2), 314, 84)}
  ${card('circuits', 'Circuits', 38, 'fading · 24 facts', dotField(24, [3, 8, 22, 34, 33], 8), 410, 74)}
  ${card('guitar', 'Guitar strings', 45, 'fading · 9 facts', dotField(9, [6, 12, 26, 32, 24], 3), 496, 74)}
  <div class="plate" style="left:16px;right:16px;top:582px;height:186px;padding:8px 12px 0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><p style="font-size:15.5px">You keep missing</p><div class="btn sm">Review these</div></div>
    ${miss('Sloth bears eat mostly termites and ants', 'Bears · What bears eat', 4)}
    ${miss('Storms spin the other way south of the equator', 'Hurricanes · Why they spin', 3)}
    ${miss('Chad’s flag or Romania’s?', 'World flags', 3)}
  </div>`;
}

// ---------------------------------------------------------------- Shop

const art = {
  wall: `<rect x="6" y="2" width="58" height="46" rx="9" fill="#8b3fbf"/>${[14, 28, 42, 56].map(x => `<rect x="${x}" y="2" width="6" height="46" fill="#a45ad6"/>`).join('')}<rect x="6" y="2" width="58" height="46" rx="9" fill="none" stroke="#dfe5ff" stroke-width="3"/>`,
  floor: `<rect x="6" y="2" width="58" height="46" rx="9" fill="#c58a5c"/><path d="M6 13h58M6 25h58M6 37h58M40 2v11M22 13v12M48 25v12M30 37v11" stroke="#a56d43" stroke-width="2"/><rect x="6" y="2" width="58" height="46" rx="9" fill="none" stroke="#dfe5ff" stroke-width="3"/>`,
  lantern: `<rect x="34" y="0" width="2.5" height="10" fill="#aab4e6"/><circle cx="35" cy="28" r="26" fill="#ffa23a" opacity="0.18"/><ellipse cx="35" cy="28" rx="17" ry="19" fill="#ffa23a"/><path d="M35 9v38M26 12q-7 16 0 32M44 12q7 16 0 32" stroke="#ffd08a" stroke-width="2" fill="none"/><rect x="29" y="7" width="12" height="4" rx="2" fill="#c9701a"/><rect x="29" y="45" width="12" height="4" rx="2" fill="#c9701a"/>`,
  beanie: `<g transform="translate(13 6)"><path d="M3 30a19 19 0 0 1 38 0z" fill="#49c6ff"/><rect x="0" y="25" width="44" height="12" rx="6" fill="#1b8fd1"/><circle cx="22" cy="7" r="6" fill="#fff"/></g>`,
  shirt: `<path d="M24 5L10 12L5 26l10 3 3-6v24h34V23l3 6 10-3-5-14L46 5q-11 9-22 0z" fill="#2bc4a4" stroke="#2bc4a4" stroke-width="2" stroke-linejoin="round"/><path d="M24 5q11 9 22 0" fill="none" stroke="#127a85" stroke-width="3"/>`,
  boots: `<g transform="translate(8 4)"><path d="M4 0h14v24h12a7 7 0 0 1 7 7v9H4z" fill="#8b3fbf"/><rect x="2" y="38" width="37" height="6" rx="3" fill="#5f2a8a"/><path d="M22 4h14v24h8a7 7 0 0 1 7 7v5H22z" fill="#a45ad6"/><rect x="20" y="38" width="33" height="6" rx="3" fill="#5f2a8a"/></g>`,
};

export function shop() {
  const price = n => `<div class="btn xs gold">${icon.coin(15)}${n}</div>`;
  const owned = (t = 'Owned') => `<span class="tag dim" style="font-size:10px">${t}</span>`;
  const earned = t => `<span class="tag gold" style="font-size:10px;display:inline-flex;align-items:center;gap:3px">${icon.star(10)}${t}</span>`;
  const card = (drawing, name, state, cls = '') => `<div class="plate" style="flex:1;min-width:0;height:118px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:8px 4px 9px;border-radius:14px;${cls}">
      <div style="height:52px;display:flex;align-items:center;justify-content:center">${drawing}</div>
      <p style="font-size:12.5px">${name}</p>${state}</div>`;
  const section = (y, title, note, cards) => `<div style="left:16px;right:16px;top:${y}px">
      <p style="margin-bottom:7px"><span class="over">${title}</span> <span class="muted" style="font-size:11.5px;margin-left:4px">${note}</span></p>
      <div style="display:flex;gap:10px">${cards.join('')}</div></div>`;
  const a = (name, w = 70, h = 50) => svg(w, h, art[name]);
  const obj = (body, w, h, k) => svg(w * k, h * k, `<g transform="scale(${k})">${body}</g>`);
  const earnedStyle = 'border-color:#6b5a2a;box-shadow:0 4px 0 #6b5a2a;background:#231f4a;';
  return `
  <div class="head"><span class="title">Shop</span><div class="right">${coins(340)}</div></div>
  <div style="left:16px;top:100px;display:flex;gap:6px">
    <span class="tag" style="background:#49c6ff;color:#0e1436;border-color:#49c6ff">All</span><span class="tag dim">Room</span><span class="tag dim">Lights</span><span class="tag dim">Furniture</span><span class="tag dim">Clothes</span>
  </div>
  ${section(138, 'Room', 'walls, floors, lights', [
    card(a('wall'), 'Striped wall', price(120)), card(a('floor'), 'Wood floor', owned('In use')), card(a('lantern'), 'Paper lantern', price(80))])}
  ${section(290, 'Furniture', 'plain, for anyone', [
    card(obj(O.redBed(), 128, 98, 0.5), 'Red bed', owned()), card(obj(O.armchair(), 70, 70, 0.72), 'Armchair', price(220)), card(obj(O.plant(), 44, 76, 0.66), 'Plant', owned())])}
  ${section(442, 'Clothes', 'for the avatar', [
    card(a('beanie'), 'Beanie', owned('Wearing')), card(a('shirt'), 'Green shirt', price(60)), card(a('boots', 66, 50), 'Boots', price(90))])}
  ${section(594, 'Earned only', 'never for sale', [
    card(obj(O.bearRug(), 156, 48, 0.62), 'Bear carpet', earned('Bears'), earnedStyle),
    card(obj(O.salmon(), 48, 24, 1.5), 'Salmon plush', earned('Bears'), earnedStyle),
    card(`<div style="filter:brightness(0) invert(0.3) sepia(1) hue-rotate(200deg) saturate(2);opacity:0.9">${obj(O.goldSalmon(), 48, 24, 1.5)}</div>`, 'Gold salmon', `<span class="tag dim" style="font-size:10px;display:inline-flex;align-items:center;gap:3px">${icon.lock(10)}Bears exam</span>`, earnedStyle)])}
  <p class="muted" style="left:18px;right:18px;top:756px;font-size:11.5px;text-align:center">Coins buy plain things. The special ones come from topics.</p>`;
}

// ---------------------------------------------------------------- Profile

export function profile() {
  const tile = (n, name, col = '#fff') => `<div class="plate" style="flex:1;height:60px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center"><p style="font-size:20px;color:${col}">${n}</p><p class="over" style="font-size:9.5px">${name}</p></div>`;
  const bar = (topic, name, pct, fading) => `<div style="display:flex;align-items:center;gap:9px;height:34px">
      <span style="color:${topicColor[topic]};display:flex;flex:none">${topicMark[topic](20)}</span><p style="font-size:13.5px;width:98px;flex:none">${name}</p>
      <div style="flex:1;height:10px;border-radius:5px;background:#2a3168"><div style="width:${pct}%;height:100%;border-radius:5px;background:${fading ? '#ee4b7a' : '#6fd6ff'}"></div></div>
      <p style="font-size:13px;width:86px;text-align:right;flex:none;white-space:nowrap;color:${fading ? '#ff8fb0' : '#dde4ff'}">${fading ? 'fading ' : ''}${pct}%</p></div>`;
  const setting = (name, right, last) => `<div style="display:flex;align-items:center;justify-content:space-between;height:42px;${last ? '' : 'border-bottom:2px solid #2a3168'}"><p style="font-size:14.5px">${name}</p>${right}</div>`;
  return `
  <div class="head"><span class="title">Profile</span><div class="right">${coins(340)}</div></div>
  <div class="plate" style="left:16px;right:16px;top:102px;height:70px;display:flex;align-items:center;gap:13px;padding:0 13px">
    <div style="width:50px;height:50px;border-radius:17px;background:#141a3c;border:2px solid #2f3678;overflow:hidden;flex:none">${svg(50, 50, `<g transform="translate(3 3) scale(0.62)">${O.avatar({ wave: false })}</g>`)}</div>
    <div style="flex:1"><p style="font-size:17px">5 topics, 215 facts</p><p class="muted" style="font-size:12.5px">Learning since October</p></div>
    <div class="btn sm ghost">Dress</div>
  </div>
  <div style="left:16px;right:16px;top:186px;display:flex;gap:10px">${tile('78%', 'Remembered', '#6fd6ff')}${tile('23', 'Best combo', '#ffc83d')}${tile('1', 'Exams passed')}</div>
  <div style="left:16px;right:16px;top:256px;display:flex;gap:10px">${tile('14', 'Lessons')}${tile('5', 'Tests')}${tile('11', 'Trophies', '#ffc83d')}</div>
  <p class="over" style="left:18px;top:334px">Strong and weak</p><p class="sky-t" style="right:18px;top:333px;font-size:12px;display:flex;align-items:center">every fact ${icon.right(12)}</p>
  <div class="plate" style="left:16px;right:16px;top:356px;padding:6px 12px">
    ${bar('bears', 'Bears', 92)}${bar('hurricanes', 'Hurricanes', 81)}${bar('flags', 'World flags', 64)}${bar('guitar', 'Guitar strings', 45, true)}${bar('circuits', 'Circuits', 38, true)}
  </div>
  <p class="over" style="left:18px;top:560px">Settings</p>
  <div class="plate" style="left:16px;right:16px;top:582px;padding:2px 12px">
    ${setting('Sounds', '<div class="toggle on"></div>')}
    ${setting('Taps you can feel', '<div class="toggle on"></div>')}
    ${setting('Voice in overviews', '<div class="toggle on"></div>')}
    ${setting('Text size', '<div class="seg" style="height:30px;padding:2px"><span style="font-size:11px;padding:0 9px">A</span><span class="on" style="font-size:13.5px;padding:0 9px">A</span><span style="font-size:16px;padding:0 9px">A</span></div>', true)}
  </div>`;
}

// ---------------------------------------------------------------- Playground

const toy = {
  strings: `<rect x="14" y="14" width="8" height="68" rx="3" fill="#dfe5ff"/><rect x="150" y="14" width="6" height="68" rx="3" fill="#aab4e6"/>
    ${[70, 110].map(x => `<rect x="${x}" y="16" width="3" height="64" fill="#364090"/>`).join('')}
    <g stroke="#ffc83d" fill="none" stroke-linecap="round"><path d="M22 22h128" stroke-width="1.5"/><path d="M22 33h128" stroke-width="2"/>
    <path d="M22 44h128" stroke-width="2.5" opacity="0.25"/><path d="M22 44q32-13 64 0t64 0" stroke-width="2.5"/><path d="M22 44q32 13 64 0t64 0" stroke-width="2.5" opacity="0.4"/>
    <path d="M22 56h128" stroke-width="3"/><path d="M22 67h128" stroke-width="3.6"/><path d="M22 78h128" stroke-width="4.2"/></g>`,
  circuit: `<path d="M34 30h104a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z" fill="none" stroke="#6fd6ff" stroke-width="3.5"/>
    <rect x="12" y="42" width="28" height="28" rx="6" fill="#ee4b7a"/><rect x="12" y="42" width="28" height="9" rx="4" fill="#ff8fb0"/><text x="26" y="65" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">+</text>
    <circle cx="112" cy="26" r="24" fill="#ffd75a" opacity="0.2"/><circle cx="112" cy="24" r="13" fill="#ffd75a"/><rect x="106" y="34" width="12" height="9" rx="2" fill="#aab4e6"/>
    <rect x="64" y="74" width="26" height="14" rx="4" fill="#2bc4a4"/><path d="M70 81h14" stroke="#127a85" stroke-width="3" stroke-dasharray="3 3"/>
    <circle cx="146" cy="56" r="6" fill="#141a3c" stroke="#6fd6ff" stroke-width="3"/>`,
  tank: `<rect x="22" y="14" width="126" height="70" rx="8" fill="#141a3c" stroke="#dfe5ff" stroke-width="4"/>
    <path d="M24 44q16-9 31 0t31 0t31 0t29 0v30a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6z" fill="#49c6ff"/><path d="M24 58q16-7 31 0t31 0t31 0t29 0v16a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6z" fill="#1b8fd1"/>
    <rect x="70" y="30" width="24" height="20" rx="4" fill="#ffa23a" transform="rotate(-8 82 40)"/>`,
  prism: `<path d="M8 62L62 46" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M60 78L84 22l26 56z" fill="#b9c6ff" stroke="#dfe5ff" stroke-width="3" stroke-linejoin="round"/>
    <g stroke-width="4" stroke-linecap="round"><path d="M100 46l56-16" stroke="#ee4b7a"/><path d="M102 52l54-4" stroke="#ffa23a"/><path d="M103 58l53 8" stroke="#ffc83d"/><path d="M104 64l52 20" stroke="#2bc4a4"/></g>`,
  pendulum: `<rect x="40" y="10" width="92" height="8" rx="4" fill="#dfe5ff"/><path d="M86 18L122 70" stroke="#aab4e6" stroke-width="2.5"/><circle cx="124" cy="73" r="12" fill="#ee4b7a"/>
    <path d="M86 18L50 70" stroke="#aab4e6" stroke-width="2.5" opacity="0.3"/><circle cx="48" cy="73" r="12" fill="#ee4b7a" opacity="0.25"/><path d="M60 88q26 10 52 0" fill="none" stroke="#6fd6ff" stroke-width="2.5" stroke-dasharray="0.1 6" stroke-linecap="round"/>`,
};

export function playground(variant) {
  const mini = globe({ cx: 85, cy: 50, r: 38, rotate: [50, -22], depth: 2, glow: true });
  const tile = (x, y, body, name, sub, locked) => `
    <div class="plate" style="left:${x}px;top:${y}px;width:185px;height:170px;overflow:hidden;padding:0">
      <div style="height:100px;background:linear-gradient(180deg,#0a0e2e,#1d1552);border-bottom:2px solid #2f3678;position:relative;display:flex;align-items:center;justify-content:center">
        <div style="${locked ? 'filter:saturate(0.15) brightness(0.55)' : ''}">${svg(170, 96, body)}</div>
        ${locked ? `<div style="position:absolute;left:50%;top:50%;margin:-22px 0 0 -22px;width:44px;height:44px;border-radius:15px;background:#262d60;border:2px solid #364090;box-shadow:0 3px 0 #1c2250;display:flex;align-items:center;justify-content:center;color:#8f98dc">${icon.lock(24)}</div>` : ''}
      </div>
      <div style="padding:8px 11px 0"><p style="font-size:16px;${locked ? 'color:#8f98dc' : ''}">${name}</p>${sub}</div>
    </div>`;
  const open = (t, from) => `<p style="font-size:11.5px;margin-top:2px" class="sky-t">${t}</p><p class="muted" style="font-size:11px">${from}</p>`;
  const lock = (lesson, n) => `<p style="font-size:11.5px;margin-top:2px;line-height:1.25"><span class="muted">Finish:</span> ${lesson}</p><p style="font-size:11px;display:flex;align-items:center;gap:3px;margin-top:1px" class="gold-t">or ${icon.coin(12)}${n} to open early</p>`;
  const inside = variant === 'A';
  return `
  <div class="head">
    <div class="left">${inside ? `<div class="back">${icon.left(18)}Room</div>` : ''}<span class="title" style="${inside ? 'font-size:22px;margin-left:4px' : ''}">Playground</span></div>
    <div class="right">${coins(340)}</div>
  </div>
  <p class="muted" style="left:18px;right:18px;top:100px;font-size:12.5px">Parts you have opened, free to play with. 3 of 6 open.</p>
  ${tile(16, 128, mini.svg, 'Globe', open('Open', 'from Where hurricanes form'))}
  ${tile(213, 128, toy.strings, 'Guitar strings', open('Open', 'from Guitar strings'))}
  ${tile(16, 312, toy.circuit, 'Circuit bench', open('Open · 5 of 12 parts', 'a part joins when you know it'))}
  ${tile(213, 312, toy.tank, 'Water tank', lock('Storm surge', 300), true)}
  ${tile(16, 496, toy.prism, 'Prism', lock('What light is', 300), true)}
  ${tile(213, 496, toy.pendulum, 'Pendulum', lock('Why clocks tick', 250), true)}
  <p class="muted" style="left:18px;right:18px;top:${inside ? 690 : 690}px;font-size:12px;text-align:center;line-height:1.35">Nothing in a lesson is ever locked. This is only free play.<br>Benches from neighbouring topics can join up.</p>`;
}

// ---------------------------------------------------------------- the tab bar, three ways

export function tabsSheet() {
  const block = (y, v, active, lines) => `
    <div style="left:16px;right:16px;top:${y}px">
      <p style="font-size:17px"><span class="gold-t">${v}</span> <span style="font-size:14px">${VARIANTS[v].note}</span></p>
      <p class="muted" style="font-size:12.5px;line-height:1.35;margin:2px 0 0">${lines}</p>
    </div>
    <div style="left:0;right:0;top:${y + 76}px;height:124px;overflow:hidden;border-top:2px dashed #2f3678;border-bottom:2px dashed #2f3678">
      <div style="position:absolute;left:0;right:0;bottom:0">${tabbar(v, active, true)}</div>
      <div style="position:absolute;left:140px;bottom:8px;width:134px;height:5px;border-radius:3px;background:rgba(255,255,255,0.32)"></div>
    </div>`;
  return `
  <div class="head"><span class="title">The tab bar, three ways</span></div>
  ${block(104, 'A', 'home', 'Home is the true centre. The Playground is a door in the room, so it is one tap further away.')}
  ${block(356, 'B', 'home', 'Everything is one tap away. Six is tight on this width, and Home cannot sit in the centre.')}
  ${block(608, 'B2', 'home', 'Home is the true centre and the Playground has a tab. The Shop is a door in the room.')}`;
}
