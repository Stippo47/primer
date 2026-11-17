// Round 2: Learn, the joined Practice tab, a review question, an opened playground part, Shop and Profile.
// Rule for all of them: show, don't tell. Words are kept for names and for what a tap brings up.

import { svg, icon, coins } from './kit.js';
import { globe } from './globe.js';
import * as A from './art.js';
import * as G from './goods.js';
import * as T from './toys.js';

const head = (left, right = coins(340)) => `<div class="head"><div class="left">${left}</div><div class="right">${right}</div></div>`;

// ---------------------------------------------------------------- Learn

// The last unit of a Bears topic. Step kinds: scene (narrated), lesson, play (a playground step), check, test.
const STEPS = [
  { x: 196, y: 192, kind: 'scene', state: 'done' },
  { x: 300, y: 262, kind: 'lesson', state: 'done' },
  { x: 222, y: 356, kind: 'play', state: 'now', progress: 0.4 },
  { x: 112, y: 436, kind: 'check', state: 'todo' },
  { x: 96, y: 532, kind: 'lesson', state: 'todo' },
  { x: 190, y: 612, kind: 'test', state: 'todo' },
];
const GOAL = { x: 306, y: 700 };

// a smooth line through points, as one cubic per gap
function spline(pts) {
  const seg = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const k = 0.2;
    seg.push(`M${p1.x} ${p1.y}C${(p1.x + (p2.x - p0.x) * k).toFixed(1)} ${(p1.y + (p2.y - p0.y) * k).toFixed(1)} ${(p2.x - (p3.x - p1.x) * k).toFixed(1)} ${(p2.y - (p3.y - p1.y) * k).toFixed(1)} ${p2.x} ${p2.y}`);
  }
  return seg;
}

function pathScene() {
  const pts = [{ x: 130, y: 128 }, ...STEPS, { x: GOAL.x, y: GOAL.y - 6 }];
  const seg = spline(pts);
  const nowAt = STEPS.findIndex(s => s.state === 'now') + 1; // segments before this index are walked
  let s = '';
  // far scenery, quiet: hills, pines, rocks, a few stars
  s += `<path d="M0 742q70 -44 150 -22t150 -10t114 6v90H0z" fill="#181f4a"/><path d="M0 772q90 -30 190 -12t224 -14v60H0z" fill="#1b2352"/>`;
  for (const [x, y, r] of [[40, 150, 1.3], [366, 176, 1.6], [330, 330, 1.1], [26, 300, 1.4], [384, 520, 1.2], [250, 470, 1], [60, 660, 1.3], [300, 580, 1.2], [20, 560, 1]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#d6e2ff" opacity="0.5"/>`;
  s += A.at(46, 268, A.pine(74)) + A.at(84, 284, A.pine(46)) + A.at(378, 620, A.pine(82)) + A.at(338, 634, A.pine(50))
    + A.at(30, 716, A.pine(58)) + A.at(372, 196, A.pine(52)) + A.at(284, 548, A.pine(40));
  for (const [x, y, r] of [[302, 452, -20], [330, 476, 14], [300, 500, -16]]) s += `<g transform="translate(${x} ${y}) rotate(${r})">${A.pawPrint(0.9, '#1f2759')}</g>`;
  // the trail: a bed, then stepping dots, gold where it has been walked
  const d = seg.join('');
  s += `<path d="${d}" fill="none" stroke="#0e1335" stroke-width="34" stroke-linecap="round" transform="translate(0 4)"/>
    <path d="${d}" fill="none" stroke="#1d2558" stroke-width="34" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#242d66" stroke-width="26" stroke-linecap="round"/>
    <path d="${seg.slice(nowAt).join('')}" fill="none" stroke="#3a4494" stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 15"/>
    <path d="${seg.slice(0, nowAt).join('')}" fill="none" stroke="#c98a00" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 15" transform="translate(0 1.5)"/>
    <path d="${seg.slice(0, nowAt).join('')}" fill="none" stroke="#ffc83d" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 15"/>`;
  // treasure on the way: one already opened, one still ahead
  s += A.at(232, 205, A.chest(true), 0.74);
  s += A.at(121, 556, `<g class="chest">${A.chest(false)}</g>`, 0.8) + `<g class="sparkle">${A.glint(176, 560, 6, '#ffe9a6')}${A.glint(118, 552, 4, '#fff')}</g>`;
  // the steps
  for (const st of STEPS) s += A.at(st.x, st.y, A.stepButton(st), 1, st.state === 'now' ? 'class="now"' : '');
  // the end: the exam's stand, with the topic's trophy waiting on it
  s += `<defs><radialGradient id="goalglow"><stop offset="0" stop-color="#ffc83d" stop-opacity="0.34"/><stop offset="1" stop-color="#ffc83d" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${GOAL.x}" cy="${GOAL.y - 44}" r="86" fill="url(#goalglow)"/>`;
  s += A.at(GOAL.x - 53, GOAL.y - 108, `<g class="trophy">${A.goldSalmon()}</g>`, 1.4);
  // the topic's own plush, keeping you company
  s += A.at(288, 350, `<g class="bear">${A.bearPlush()}</g>`, 0.98);
  return s;
}

const pips = states => `<div style="display:flex;gap:5px;align-items:center">${states.map(st => `<i style="width:${st === 'now' ? 20 : 10}px;height:10px;border-radius:5px;background:${{ done: '#ffc83d', now: '#fff', todo: '#6a3398' }[st]}"></i>`).join('')}</div>`;

export function learn(sheet = false) {
  const now = STEPS.find(s => s.state === 'now');
  const base = `
  <div style="left:0;top:0">${svg(414, 896, pathScene())}</div>
  ${head(`<div style="display:flex;align-items:center;gap:8px;height:44px;padding:0 10px 0 5px;border-radius:15px;background:#222a60;border:2px solid #364090;box-shadow:0 4px 0 #1c2250">
      ${A.medallion('bears', 34)}<span style="font-size:18px">Bears</span><span style="color:#6fd6ff;display:flex">${icon.down(18)}</span></div>`)}
  <div style="left:16px;right:16px;top:104px;height:42px;border-radius:15px;background:#8b3fbf;box-shadow:0 4px 0 #5f2a8a;display:flex;align-items:center;justify-content:space-between;padding:0 14px">
    <p style="font-size:16.5px">What bears eat</p>${pips(['done', 'done', 'now', 'todo', 'todo', 'todo'])}</div>
  <div class="callout" style="left:${now.x - 196}px;top:${now.y - 34}px;width:150px;padding-right:8px;transform-origin:100% 50%">
    <div style="background:#fff;color:#1b1f5e;border-radius:16px;box-shadow:0 4px 0 #b9c2ee;padding:9px 10px 10px;text-align:center">
      <p style="font-size:15px;line-height:1.15">A bear’s menu</p>
      <div class="btn sm" style="margin-top:7px;height:32px">Start</div>
    </div>
    <i style="position:absolute;right:1px;top:26px;width:16px;height:16px;background:#fff;border-radius:3px;transform:rotate(45deg)"></i>
  </div>`;
  if (!sheet) return base;
  return base + topicSheet();
}

// Poses the moving bits of the path at t seconds (a loop of 5): the plush breathes and blinks, the next
// chest glints, and at 1.6s the current step is pressed and its name pops up.
export function learnPose(root, t) {
  const q = sel => root.querySelector(sel);
  const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const bump = (x, a, b) => (x < a || x > b ? 0 : Math.sin(((x - a) / (b - a)) * Math.PI));
  const breath = Math.sin((t / 2.5) * Math.PI * 2);
  // a happy little hop when the step is pressed
  const hop = bump(t, 2.0, 2.4) * 7 + bump(t, 2.4, 2.65) * 3;
  const tilt = Math.sin((t / 5) * Math.PI * 2) * 2.5 + bump(t, 1.9, 2.7) * -6;
  q('.bear').setAttribute('transform', `translate(0 ${-hop})`);
  q('.bear-body').setAttribute('transform', `translate(60 124) scale(${1 - breath * 0.012} ${1 + breath * 0.018}) translate(-60 -124)`);
  q('.bear-head').setAttribute('transform', `translate(0 ${-breath * 1.3}) rotate(${tilt} 60 66)`);
  const blink = Math.max(bump(t, 0.9, 1.06), bump(t, 3.5, 3.66), bump(t, 3.76, 3.9));
  q('.bear .eyes').setAttribute('transform', `translate(0 ${40 * blink * 0.85}) scale(1 ${1 - blink * 0.85})`);
  q('.bear .ear-l').setAttribute('transform', `rotate(${bump(t, 2.9, 3.2) * -10} 40 26)`);
  q('.bear .ear-r').setAttribute('transform', `rotate(${bump(t, 0.3, 0.6) * 10} 80 26)`);
  // the press
  const down = t < 1.6 ? 0 : t < 1.72 ? ease((t - 1.6) / 0.12) : 1 - ease((t - 1.72) / 0.22);
  const over = bump(t, 1.94, 2.2) * -1.5;
  q('.now .cap').setAttribute('transform', `translate(0 ${down * 6.5 + over})`);
  // the name pops up after the press and tucks away before the loop ends
  const pop = t < 1.8 ? 0 : t < 4.55 ? ease((t - 1.8) / 0.3) * (1 + bump(t, 1.8, 2.25) * 0.08) : 1 - ease((t - 4.55) / 0.25);
  const c = q('.callout');
  c.style.opacity = Math.min(1, pop * 1.6);
  c.style.transform = `scale(${0.55 + 0.45 * pop})`;
  // the chest ahead glints, the trophy bobs
  const tw = (Math.sin((t / 1.25) * Math.PI * 2) + 1) / 2;
  q('.sparkle').setAttribute('opacity', 0.35 + tw * 0.65);
  q('.trophy .fish').setAttribute('transform', `translate(0 ${(Math.sin((t / 2.5) * Math.PI * 2 + 1) * 1.6).toFixed(2)})`);
}

// the list of topics, as a sheet over the path. One level word each: Glance, Tour, Solid, Deep.
const LEVELS = ['Glance', 'Tour', 'Solid', 'Deep'];
function topicSheet() {
  const level = word => {
    const n = LEVELS.indexOf(word) + 1;
    return `<span class="tag dim" style="font-size:10.5px;display:inline-flex;align-items:center;gap:6px">${word}<span style="display:inline-flex;gap:2.5px">${[1, 2, 3, 4].map(i => `<i style="width:5px;height:5px;border-radius:50%;background:${i <= n ? '#6fd6ff' : '#364090'}"></i>`).join('')}</span></span>`;
  };
  const bar = part => `<div style="width:78px;height:10px;border-radius:5px;background:#2a3168"><div style="width:${part * 100}%;height:100%;border-radius:5px;background:#49c6ff;box-shadow:inset 0 -3px 0 #1b8fd1"></div></div>`;
  const won = svg(27, 35, `<g transform="scale(0.8)">${A.cup()}</g>`);
  const row = (topic, word, right, on = false) => `
    <div style="display:flex;align-items:center;gap:12px;height:66px;padding:0 14px 0 10px;border-radius:17px;margin-bottom:10px;background:${on ? '#222a60' : '#1b2250'};border:2px solid ${on ? '#6fd6ff' : '#2f3678'};box-shadow:0 4px 0 ${on ? '#1b8fd1' : '#2f3678'}">
      ${A.medallion(topic, 46)}
      <div style="flex:1;min-width:0"><p style="font-size:16.5px">${A.TOPIC[topic].name}</p><p style="margin-top:4px">${level(word)}</p></div>
      ${right}
    </div>`;
  return `
  <div style="inset:0;background:rgba(8,10,34,0.74)"></div>
  <div style="left:0;right:0;bottom:0;top:286px;background:#141a3c;border-top:2px solid #364090;border-radius:26px 26px 0 0;padding:10px 16px 0">
    <div style="width:44px;height:5px;border-radius:3px;background:#364090;margin:0 auto 14px"></div>
    ${row('bears', 'Solid', bar(0.55), true)}
    ${row('hurricanes', 'Solid', bar(0.5))}
    ${row('flags', 'Deep', bar(0.3))}
    ${row('circuits', 'Tour', won)}
    ${row('guitar', 'Glance', won)}
  </div>`;
}

// ---------------------------------------------------------------- Practice: Review and the Playground on one tab

const priceChip = n => `<div class="btn xs gold" style="flex:none">${icon.coin(15)}${n}</div>`;

export function practice() {
  const mini = globe({ cx: 85, cy: 49, r: 38, rotate: [50, -22], depth: 2, glow: true });
  const fan = `<g transform="translate(16 30) rotate(-15 35 46)">${T.snippet('bolt')}</g>
    <g transform="translate(94 26) rotate(13 35 46)">${T.snippet('storm')}</g>
    <g transform="translate(51 14) rotate(-2 35 46) scale(1.1)">${T.snippet('bear')}</g>`;
  // every part is the same card. One you have not bought yet shows its price; nothing else changes.
  const card = (i, pic, name, from, price) => `
    <div class="plate" style="left:${i % 2 ? 213 : 16}px;top:${330 + Math.floor(i / 2) * 150}px;width:185px;height:138px;overflow:hidden;padding:0">
      <div style="height:84px;background:linear-gradient(180deg,#0a0e2e,#1d1552);border-bottom:2px solid #2f3678;display:flex;align-items:center;justify-content:center;overflow:hidden">${svg(145, 82, pic, '').replace('viewBox="0 0 145 82"', 'viewBox="0 0 170 96"')}</div>
      <div style="padding:7px 9px 0 11px;display:flex;align-items:center;justify-content:space-between;gap:6px">
        <div style="min-width:0"><p style="font-size:15px;white-space:nowrap">${name}</p><p class="muted" style="font-size:11px;white-space:nowrap">from ${from}</p></div>
        ${price ? priceChip(price) : ''}
      </div>
    </div>`;
  return `
  ${head('<span class="title">Practice</span>')}
  <div class="stage" style="left:16px;right:16px;top:104px;height:164px">
    <div style="position:absolute;left:0;top:0">${svg(190, 164, fan)}</div>
    <div style="position:absolute;left:204px;right:18px;top:18px">
      <p style="font-size:24px">Review</p>
      <div style="display:inline-flex;align-items:center;gap:6px;height:30px;margin-top:5px;padding:0 10px 0 7px;border-radius:11px;background:#2c2850;border:2px solid #6b5a2a">${svg(24, 20, `<g transform="scale(0.8)">${A.crown()}</g>`)}<span class="gold-t" style="font-size:15.5px">×23</span></div>
      <div class="btn" style="margin-top:13px;height:48px">Start</div>
    </div>
  </div>
  <p style="left:18px;top:288px;font-size:20px">Playground</p>
  ${card(0, mini.svg, 'Globe', 'Where hurricanes form')}
  ${card(1, T.TOY.circuit(), 'Circuit bench', 'First circuit')}
  ${card(2, T.TOY.string(), 'String', 'Guitar strings')}
  ${card(3, T.TOY.resistor(), 'Resistor', 'Ohm’s law', 120)}
  ${card(4, T.TOY.tank(), 'Water tank', 'Storm surge', 300)}
  ${card(5, T.TOY.prism(), 'Prism', 'What light is', 300)}`;
}

// ---------------------------------------------------------------- Review: the endless run, mid-question

export function review() {
  const HH = 336;
  const g = globe({ cx: 191, cy: 170, r: 300, rotate: [45, -15], sst: true, equator: true, glow: false, depth: 3 });
  const storm = g.at([-64, 26]), start = g.at([-22, 12]), q = g.at([-38, 0]), mid = g.at([-45, 13]);
  let s = g.svg;
  s += `<path d="M${start[0]} ${start[1]}Q${mid[0]} ${mid[1] + 8} ${storm[0]} ${storm[1]}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="0.1 9" stroke-linecap="round" opacity="0.95"/>
    <circle cx="${start[0]}" cy="${start[1]}" r="6" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="${start[0]}" cy="${start[1]}" r="2.2" fill="#fff"/>
    <ellipse cx="${storm[0] + 7}" cy="${storm[1] + 13}" rx="27" ry="21" fill="#060830" opacity="0.3"/>
    <g transform="translate(${storm[0]} ${storm[1]}) rotate(20)">${A.storm(27)}</g>
    <circle cx="${q[0]}" cy="${q[1]}" r="27" fill="#ffc83d" opacity="0.25"/>
    <circle cx="${q[0]}" cy="${q[1] + 3}" r="17" fill="#c98a00"/><circle cx="${q[0]}" cy="${q[1]}" r="17" fill="#ffc83d"/>
    <text x="${q[0]}" y="${q[1] + 7.5}" text-anchor="middle" font-size="22" font-weight="900" fill="#2a1650">?</text>`;
  const answer = (text, y) => `<div class="btn ghost" style="left:16px;right:16px;top:${y}px;height:50px;justify-content:flex-start;text-transform:none;letter-spacing:0;font-size:16px">${text}</div>`;
  return `
  <div class="head">
    <div class="left" style="gap:12px">
      <div class="round" style="color:#8f98dc">${icon.close(20)}</div>
      <div style="height:40px;min-width:52px;padding:0 9px;border-radius:13px;background:#ffc83d;box-shadow:0 4px 0 #c98a00;color:#2a1650;font-size:22px;display:flex;align-items:center;justify-content:center">×3</div>
      <div style="display:flex;gap:4px">${[1, 1, 0, 0, 0].map(on => `<i style="width:20px;height:9px;border-radius:5px;background:${on ? '#ffc83d' : '#2a3168'}"></i>`).join('')}</div>
    </div>
    <div class="right">${coins(340)}</div>
  </div>
  <div class="stage" style="left:16px;right:16px;top:104px;height:${HH}px">${svg(382, HH, s)}</div>
  <p style="left:20px;right:20px;top:${104 + HH + 22}px;font-size:22px;line-height:1.25">Why can’t a hurricane start <span class="gold-t">here</span>, on the equator?</p>
  ${answer('The sea is too cold there', 572)}
  ${answer('Nothing starts it spinning', 636)}
  ${answer('The air is too dry', 700)}
  ${answer('The winds blow too hard', 764)}`;
}

// ---------------------------------------------------------------- Playground: the circuit bench, opened

export function part() {
  const BH = 452;
  const peg = `<defs><pattern id="benchpeg" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="1.5" fill="#262d66"/></pattern></defs><rect width="382" height="${BH}" fill="url(#benchpeg)"/>`;
  // drawn at 239 x 316 and scaled up 1.6
  const bench = `${T.wire('M96 251H152', true)}${T.wire('M198 252H218V97H140', true)}${T.wire('M100 97H22V251H32', true)}
    <g transform="translate(96 37)">${T.bulb(true)}</g>
    <g transform="translate(30 236)">${T.battery()}</g>
    <g transform="translate(140 228)">${T.knifeSwitch(true)}</g>`;
  // the pieces for this bench: the same row for each, with a price on the one not bought yet
  const piece = (pic, [w, h], k, name, from, price) => `
    <div class="plate" style="height:47px;border-radius:14px;display:flex;align-items:center;gap:10px;padding:0 9px 0 6px;margin-bottom:9px">
      <div style="width:64px;flex:none;display:flex;align-items:center;justify-content:center">${svg(w * k, h * k, `<g transform="scale(${k})">${pic}</g>`)}</div>
      <p style="font-size:15px;width:84px;flex:none">${name}</p><p class="muted" style="font-size:11.5px;flex:1;white-space:nowrap">from ${from}</p>
      ${price ? priceChip(price) : ''}
    </div>`;
  return `
  ${head(`<div class="round">${icon.left(20)}</div><span class="title" style="font-size:22px;margin-left:4px">Circuit bench</span>`)}
  <div class="stage" style="left:16px;right:16px;top:104px;height:${BH}px;background:#0d1232">${svg(382, BH, `${peg}<g transform="translate(12 -4) scale(1.5)">${bench}</g>`)}</div>
  <div style="left:16px;right:16px;top:${104 + BH + 18}px">
    ${piece(T.battery(), [66, 30], 0.82, 'Battery', 'First circuit')}
    ${piece(T.bulb(false), [48, 66], 0.56, 'Bulb', 'First circuit')}
    ${piece(T.knifeSwitch(false), [70, 34], 0.8, 'Switch', 'On and off')}
    ${piece(T.resistor(), [72, 24], 0.8, 'Resistor', 'Ohm’s law', 120)}
  </div>`;
}

// ---------------------------------------------------------------- Shop

export function shop() {
  const owned = `<div style="width:26px;height:26px;border-radius:50%;background:#2bc4a4;box-shadow:0 2.5px 0 #127a85;color:#fff;display:flex;align-items:center;justify-content:center">${icon.check(17)}</div>`;
  const fit = (name, maxW = 98, maxH = 58) => {
    const [w, h] = G.SIZE[name], k = Math.min(maxW / w, maxH / h, 1.25);
    return [w * k, h * k, k];
  };
  // a thing for sale, or owned (no price), or only an outline (its lesson is not done yet)
  const item = (name, state, topic) => {
    const [w, h, k] = fit(name);
    const pic = svg(w, h, `<g transform="scale(${k})"${state === 'outline' ? ' filter="url(#outline)"' : ''}>${G[name]()}</g>`);
    return `<div class="plate" style="position:relative;flex:1;min-width:0;height:100px;border-radius:15px;display:flex;flex-direction:column;align-items:center;${state === 'outline' ? 'background:#171d47;border-style:dashed;box-shadow:none;' : ''}">
      <div style="height:${state === 'outline' ? 96 : 66}px;display:flex;align-items:center;justify-content:center">${pic}</div>
      <div style="display:flex;align-items:center;gap:6px;${state === 'outline' ? 'position:absolute;left:6px;top:6px' : ''}">${topic ? A.medallion(topic, 26) : ''}${state === 'outline' ? '' : state === 'owned' ? owned : priceChip(state)}</div>
    </div>`;
  };
  const section = (y, title, cards, y2, cards2) => `<p class="over" style="left:18px;top:${y}px">${title}</p>
    <div style="left:16px;right:16px;top:${y + 22}px;display:flex;gap:9px">${cards.join('')}</div>
    ${cards2 ? `<div style="left:16px;right:16px;top:${y2}px;display:flex;gap:9px">${cards2.join('')}</div>` : ''}`;
  const chip = (t, on) => `<span class="tag${on ? '' : ' dim'}" style="${on ? 'background:#49c6ff;color:#0e1436;border-color:#49c6ff' : ''}">${t}</span>`;
  return `
  <svg width="0" height="0" style="position:absolute"><defs><filter id="outline" x="-20%" y="-20%" width="140%" height="140%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="big"/><feComposite in="big" in2="SourceAlpha" operator="out" result="ring"/>
    <feFlood flood-color="#7f88c8"/><feComposite in2="ring" operator="in" result="line"/>
    <feFlood flood-color="#232b62"/><feComposite in2="SourceAlpha" operator="in" result="fill"/>
    <feMerge><feMergeNode in="fill"/><feMergeNode in="line"/></feMerge></filter></defs></svg>
  ${head('<span class="title">Shop</span>')}
  <div style="left:16px;top:102px;display:flex;gap:6px">${chip('All', true)}${chip('Room')}${chip('Furniture')}${chip('Clothes')}${chip('Topics')}</div>
  ${section(142, 'Room', [item('wallpaper', 120), item('floorTile', 'owned'), item('lantern', 80)])}
  ${section(274, 'Furniture', [item('bed', 'owned'), item('armchair', 220), item('plant', 60)])}
  ${section(406, 'Clothes', [item('beanie', 'owned'), item('scarf', 70), item('glasses', 90)])}
  ${section(538, 'Topics', [item('bearRug', 150, 'bears'), item('salmonPlush', 90, 'bears'), item('clawLog', 'outline', 'bears')],
    670, [item('windsock', 140, 'hurricanes'), item('barometer', 'outline', 'hurricanes'), item('bulbLamp', 'outline', 'circuits')])}`;
}

// ---------------------------------------------------------------- Profile

const KNOW = [['bears', 92], ['hurricanes', 81], ['flags', 64], ['guitar', 45], ['circuits', 38]];
// well remembered is blue; forgotten is grey
function knowColor(pct) {
  const t = Math.min(1, Math.max(0, (95 - pct) / 55));
  const a = [73, 198, 255], b = [124, 129, 160];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}
const LOW = 50;

export function profile(detail = false) {
  const tile = (pic, n, col = '#fff') => `<div class="plate" style="flex:1;height:64px;border-radius:15px;display:flex;align-items:center;justify-content:center;gap:9px">${pic}<p style="font-size:22px;color:${col}">${n}</p></div>`;
  const book = svg(30, 28, `<g transform="translate(15 15)"><g transform="translate(0 2)">${A.MARK.lesson('#1b8fd1', '#1b8fd1')}</g>${A.MARK.lesson('#6fd6ff', '#1b2250')}<path d="M-11.6 -8.6q5 -0.6 9 1.6" fill="none" stroke="#e3f7ff" stroke-width="1.6" stroke-linecap="round"/></g>`);
  const row = ([topic, pct], on) => `<div style="display:flex;align-items:center;gap:10px;height:42px;${on ? 'margin:0 -8px;padding:0 8px;border-radius:12px;background:#262e6a;' : ''}">
      ${A.medallion(topic, 28)}<p style="font-size:14px;width:104px;flex:none">${A.TOPIC[topic].name}</p>
      <div style="flex:1;height:11px;border-radius:6px;background:#2a3168"><div style="width:${pct}%;height:100%;border-radius:6px;background:${knowColor(pct)}"></div></div>
      <p style="font-size:14px;width:38px;text-align:right;flex:none;color:${knowColor(pct)}">${pct}%</p>
      <div style="width:22px;flex:none;display:flex">${pct < LOW ? svg(22, 22, A.hazard()) : ''}</div></div>`;
  const setting = (name, right, last) => `<div style="display:flex;align-items:center;justify-content:space-between;height:44px;${last ? '' : 'border-bottom:2px solid #2a3168'}"><p style="font-size:14.5px">${name}</p>${right}</div>`;
  const base = `
  ${head('<span class="title">Profile</span>')}
  <div style="left:16px;right:16px;top:104px;display:flex;gap:10px">
    ${tile(svg(27, 35, `<g transform="scale(0.8)">${A.cup()}</g>`), 11, '#ffc83d')}
    ${tile(svg(33, 27, `<g transform="scale(1.1)">${A.crown()}</g>`), '×23', '#ffc83d')}
    ${tile(book, 14, '#6fd6ff')}
  </div>
  <p class="over" style="left:18px;top:188px">Knowledge</p>
  <div class="plate" style="left:16px;right:16px;top:210px;padding:5px 12px">${KNOW.map(k => row(k, detail && k[0] === 'circuits')).join('')}</div>
  <p class="over" style="left:18px;top:452px">Settings</p>
  <div class="plate" style="left:16px;right:16px;top:474px;padding:2px 14px">
    ${setting('Voice', '<div class="toggle on"></div>')}
    ${setting('Effects', '<div class="toggle on"></div>')}
    ${setting('Music', '<div class="toggle"></div>')}
    ${setting('Text size', '<div class="seg" style="height:30px;padding:2px"><span style="font-size:11px;padding:0 9px">A</span><span class="on" style="font-size:13.5px;padding:0 9px">A</span><span style="font-size:16px;padding:0 9px">A</span></div>', true)}
  </div>`;
  if (!detail) return base;

  // a topic's row tapped: what the number is made of
  const pct = 38, col = knowColor(pct);
  const facts = [1, 1, 1, 0.8, 0.8, 0.7, 0.6, 0.6, 0.5, 0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const dots = facts.map(f => `<i style="width:11px;height:11px;border-radius:50%;background:${knowColor(40 + f * 55)};opacity:${f === 0 ? 0.55 : 1}"></i>`).join('');
  const calendar = svg(26, 26, `<rect x="2" y="5.5" width="22" height="19" rx="5" fill="#1b8fd1"/><rect x="2" y="4" width="22" height="19" rx="5" fill="#dfe5ff"/><path d="M2 9a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v2H2z" fill="#49c6ff"/><rect x="7" y="1" width="3" height="6" rx="1.5" fill="#fff"/><rect x="16" y="1" width="3" height="6" rx="1.5" fill="#fff"/><rect x="6" y="14" width="4" height="4" rx="1.2" fill="#7f88c8"/><rect x="11.5" y="14" width="4" height="4" rx="1.2" fill="#7f88c8"/>`);
  const clock = svg(26, 26, `<circle cx="13" cy="14.5" r="11" fill="#1b8fd1"/><circle cx="13" cy="13" r="11" fill="#49c6ff"/><circle cx="13" cy="13" r="8" fill="#eef4ff"/><path d="M13 8v5.4l3.6 2.4" fill="none" stroke="#1b1f5e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 8.4A9 9 0 0 1 10 4.6" fill="none" stroke="#c9f0ff" stroke-width="1.6" stroke-linecap="round"/>`);
  const fact = (pic, big, small) => `<div style="flex:1;display:flex;align-items:center;gap:10px;height:58px;padding:0 12px;border-radius:15px;background:#1b2250;border:2px solid #2f3678">${pic}<div><p style="font-size:16.5px;white-space:nowrap">${big}</p><p class="muted" style="font-size:11.5px">${small}</p></div></div>`;
  return base + `
  <div style="inset:0;background:rgba(8,10,34,0.62)"></div>
  <div style="left:0;right:0;bottom:0;top:508px;background:#141a3c;border-top:2px solid #364090;border-radius:26px 26px 0 0;padding:10px 16px 0">
    <div style="width:44px;height:5px;border-radius:3px;background:#364090;margin:0 auto 14px"></div>
    <div style="display:flex;align-items:center;gap:12px">${A.medallion('circuits', 46)}<p style="font-size:23px;flex:1">Circuits</p>${svg(26, 24, `<g transform="scale(1.15)">${A.hazard()}</g>`)}<p style="font-size:26px;color:${col}">${pct}%</p></div>
    <div style="display:flex;gap:10px;margin-top:14px">
      ${fact(calendar, '3 October', 'last studied')}
      ${fact(clock, '9 of 24 facts', 'due again')}
    </div>
    <div style="display:flex;gap:4.4px;margin-top:16px;justify-content:center">${dots}</div>
    <div class="btn" style="margin-top:18px">Review Circuits</div>
  </div>`;
}

// ---------------------------------------------------------------- every drawn thing, big, for checking the art

export function artSheet() {
  const cell = (x, y, w, h, body, k = 2) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="10" fill="#1b2250"/><g transform="translate(8 8) scale(${k})">${body}</g></g>`;
  const which = new URLSearchParams(location.search).get('page') || '1';
  let s = '';
  if (which === '1') {
    s += cell(10, 60, 250, 270, A.bearPlush(), 2);
    s += cell(268, 60, 136, 130, A.chest(false), 2) + cell(268, 198, 136, 132, A.chest(true), 2);
    s += cell(10, 338, 170, 200, A.goldSalmon(), 2);
    ['lesson', 'scene', 'play', 'check', 'test'].forEach((k, i) => {
      s += A.at(232 + (i % 3) * 66, 380 + Math.floor(i / 3) * 84, A.stepButton({ kind: k, state: ['done', 'now', 'todo'][i % 3], progress: i === 1 ? 0.4 : null }));
    });
    ['lesson', 'scene', 'play', 'check', 'test'].forEach((k, i) => { s += A.at(50 + i * 78, 620, A.stepButton({ kind: k, state: 'done' }), 1.1); });
    ['lesson', 'scene', 'play', 'check', 'test'].forEach((k, i) => { s += A.at(50 + i * 78, 720, A.stepButton({ kind: k, state: 'todo' }), 1.1); });
    s += A.at(20, 780, A.cup(), 2) + A.at(110, 800, A.crown(), 2) + A.at(190, 800, A.hazard(), 2.5);
  }
  if (which === '2') {
    const names = ['wallpaper', 'floorTile', 'lantern', 'bed', 'armchair', 'plant', 'beanie', 'scarf', 'glasses', 'bearRug', 'salmonPlush', 'windsock'];
    names.forEach((n, i) => {
      const [w, h] = G.SIZE[n], k = Math.min(180 / w, 170 / h, 2.4);
      s += `<g transform="translate(${8 + (i % 2) * 204} ${56 + Math.floor(i / 2) * 136})"><rect width="196" height="130" rx="10" fill="#1b2250"/><g transform="translate(${(196 - w * k) / 2} ${(130 - h * k) / 2}) scale(${k})">${G[n]()}</g></g>`;
    });
  }
  if (which === '3') {
    Object.keys(T.TOY).forEach((n, i) => {
      s += `<g transform="translate(${8 + (i % 2) * 204} ${56 + Math.floor(i / 2) * 110})"><rect width="196" height="104" rx="10" fill="#0d1232"/><g transform="translate(13 4) scale(1)">${T.TOY[n]()}</g></g>`;
    });
    s += A.at(10, 400, T.battery(), 2) + A.at(160, 390, T.bulb(true), 2) + A.at(270, 390, T.bulb(false), 2)
      + A.at(10, 540, T.knifeSwitch(true), 2) + A.at(160, 540, T.knifeSwitch(false), 2) + A.at(10, 620, T.resistor(), 2.4)
      + A.at(20, 700, T.snippet('storm'), 1.6) + A.at(150, 700, T.snippet('bear'), 1.6) + A.at(280, 700, T.snippet('bolt'), 1.6);
  }
  const meds = which === '1' ? `<div style="left:262px;top:790px;display:flex;gap:4px">${Object.keys(A.TOPIC).map(t => A.medallion(t, 44)).join('')}</div><div style="left:262px;top:840px;display:flex;gap:4px">${Object.keys(A.TOPIC).map(t => A.medallion(t, 28, t === 'circuits')).join('')}</div>` : '';
  return `<div style="left:0;top:0">${svg(414, 896, s)}</div>${meds}`;
}
