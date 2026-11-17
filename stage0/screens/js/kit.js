// Shared pieces: icons, the header, the tab bar. Everything returns a string of HTML or SVG.

export const svg = (w, h, body, extra = '') =>
  `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${extra}>${body}</svg>`;

export function star(cx, cy, r, fill, inner = 0.46) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * inner : r;
    pts.push(`${(cx + Math.cos(a) * k).toFixed(1)},${(cy + Math.sin(a) * k).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="${(r * 0.18).toFixed(1)}" stroke-linejoin="round"/>`;
}

// A small steady random source, so the pictures come out the same every time.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The storm swirl, drawn around 0,0. Used as the Hurricanes mark.
export const swirl = (r = 10, fill = '#fff', eye = '#1b2a80') => {
  const arm = `<path d="M0 ${-r * 0.42} C ${r * 0.7} ${-r * 0.75} ${r * 1.25} ${-r * 0.1} ${r * 0.85} ${r * 0.8} C ${r * 0.95} ${r * 0.1} ${r * 0.5} ${-r * 0.1} 0 ${r * 0.05} Z" fill="${fill}"/>`;
  return `<g>${arm}<g transform="rotate(120)">${arm}</g><g transform="rotate(240)">${arm}</g><circle r="${r * 0.52}" fill="${fill}"/><circle r="${r * 0.2}" fill="${eye}"/></g>`;
};

const I = (body, size = 28) => `<svg width="${size}" height="${size}" viewBox="0 0 28 28">${body}</svg>`;

export const icon = {
  learn: s => I(`<path d="M14 7.5C11.4 5.6 8.3 5 4.5 5.3a1 1 0 0 0-1 1v13.2a1 1 0 0 0 1.1 1c3.4-.2 6.3.4 9.4 2.4 3.1-2 6-2.6 9.4-2.4a1 1 0 0 0 1.1-1V6.3a1 1 0 0 0-1-1C19.7 5 16.6 5.6 14 7.5z" fill="currentColor"/><path d="M14 8.5v13" stroke="#0f1434" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`, s),
  review: s => I(`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 13.5a8.5 8.5 0 0 1 14.8-5.2"/><path d="M21.5 3.8v5.2h-5.2"/><path d="M22.5 14.5a8.5 8.5 0 0 1-14.8 5.2"/><path d="M6.5 24.2V19h5.2"/></g>`, s),
  home: s => I(`<path d="M4.5 13.2 14 4.8l9.5 8.4v9.3a1.5 1.5 0 0 1-1.5 1.5h-4.7v-6.5h-6.6V24H6a1.5 1.5 0 0 1-1.5-1.5z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>`, s),
  shop: s => I(`<path d="M5.5 10.5h17l-1.3 12.3a2 2 0 0 1-2 1.7H8.8a2 2 0 0 1-2-1.7z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 13V9a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M10 13.5v1M18 13.5v1" stroke="#0f1434" stroke-width="2.6" stroke-linecap="round" opacity="0.5"/>`, s),
  profile: s => I(`<circle cx="14" cy="9.5" r="5.3" fill="currentColor"/><path d="M4.3 23.3c.7-4.7 4.5-7.3 9.7-7.3s9 2.6 9.7 7.3a1.5 1.5 0 0 1-1.5 1.7H5.8a1.5 1.5 0 0 1-1.5-1.7z" fill="currentColor"/>`, s),
  play: s => I(`<path d="M11.5 5v6.8L5.3 21.6a2 2 0 0 0 1.7 3.1h14a2 2 0 0 0 1.7-3.1L16.5 11.8V5z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><rect x="9.3" y="2.8" width="9.4" height="3.4" rx="1.7" fill="currentColor"/><circle cx="12" cy="19.5" r="1.9" fill="#0f1434" opacity="0.5"/><circle cx="16.8" cy="21" r="1.3" fill="#0f1434" opacity="0.5"/><circle cx="14.8" cy="15.8" r="1.1" fill="#0f1434" opacity="0.5"/>`, s),
  dots: s => I(`<g fill="currentColor"><circle cx="7" cy="7" r="3"/><circle cx="14" cy="7" r="3"/><circle cx="21" cy="7" r="3" opacity="0.45"/><circle cx="7" cy="14" r="3"/><circle cx="14" cy="14" r="3" opacity="0.45"/><circle cx="21" cy="14" r="3"/><circle cx="7" cy="21" r="3" opacity="0.45"/><circle cx="14" cy="21" r="3"/><circle cx="21" cy="21" r="3" opacity="0.25"/></g>`, s),
  down: s => I(`<path d="M7 11l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  left: s => I(`<path d="M17 6l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  right: s => I(`<path d="M11 6l8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  lock: s => I(`<rect x="6" y="12.5" width="16" height="12" rx="3.5" fill="currentColor"/><path d="M9.5 13V9.5a4.5 4.5 0 0 1 9 0V13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`, s),
  check: s => I(`<path d="M6 14.5l5.5 5.5L22 8.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`, s),
  star: s => I(star(14, 14.5, 10, 'currentColor'), s),
  pencil: s => I(`<path d="M5 23l1.2-5L18.5 5.7a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L10 21.8z" fill="currentColor"/>`, s),
  coin: s => I(`<circle cx="14" cy="15" r="11" fill="#c98a00"/><circle cx="14" cy="13" r="11" fill="#ffc83d"/><circle cx="14" cy="13" r="7.2" fill="none" stroke="#fff3c4" stroke-width="2" opacity="0.8"/>${star(14, 13.2, 4.2, '#c98a00')}`, s),
  swirl: s => I(`<g transform="translate(14 14)">${swirl(10, 'currentColor', '#0f1434')}</g>`, s),
  paw: s => I(`<g fill="currentColor"><ellipse cx="14" cy="18" rx="6.5" ry="5.5"/><circle cx="6.5" cy="12" r="2.8"/><circle cx="11" cy="7.5" r="2.8"/><circle cx="17" cy="7.5" r="2.8"/><circle cx="21.5" cy="12" r="2.8"/></g>`, s),
  bolt: s => I(`<path d="M16 3L6 16h6.5L11 25l11-14h-7z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`, s),
  flag: s => I(`<path d="M7 4v21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8.5 5.5h13l-3.5 5 3.5 5h-13z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`, s),
  strings: s => I(`<g stroke="currentColor" stroke-linecap="round" fill="none"><path d="M4 7h20" stroke-width="1.5"/><path d="M4 12q5-4 10 0t10 0" stroke-width="2.2"/><path d="M4 17h20" stroke-width="2.8"/><path d="M4 22h20" stroke-width="3.4"/></g>`, s),
  tap: s => I(`<path d="M11 13V6.5a2.3 2.3 0 0 1 4.6 0V12l5 1.2a2.5 2.5 0 0 1 1.9 2.9l-1 5.4a3 3 0 0 1-3 2.5h-5a3 3 0 0 1-2.4-1.2L6.5 17a2 2 0 0 1 3-2.6z" fill="#fff" stroke="#c5d0ff" stroke-width="1.2"/>`, s),
};

export const coins = n => `<div class="coins">${icon.coin(24)}<span>${n}</span></div>`;

export const sketchLabel = text => `<div class="sketch">${text}</div>`;

const TABS = {
  learn: ['Learn', icon.learn], review: ['Review', icon.review], home: ['Home', icon.home],
  shop: ['Shop', icon.shop], profile: ['Profile', icon.profile], play: ['Playground', icon.play],
};
export const VARIANTS = {
  A: { tabs: ['learn', 'review', 'home', 'shop', 'profile'], name: 'A', note: 'five tabs, Playground inside Home' },
  B: { tabs: ['learn', 'review', 'play', 'home', 'shop', 'profile'], name: 'B', note: 'six tabs' },
  B2: { tabs: ['learn', 'play', 'home', 'review', 'profile'], name: 'B2', note: 'five tabs, Shop inside Home' },
};

export function tabbar(variant, active, inline = false) {
  const v = VARIANTS[variant];
  const cells = v.tabs.map(id => {
    const [name, draw] = TABS[id];
    const on = id === active ? ' on' : '';
    if (id === 'home') return `<div class="tab home${on}"><div class="knob">${draw(v.tabs.length === 6 ? 30 : 34)}</div><span>${name}</span></div>`;
    return `<div class="tab${on}"><div class="ic">${draw(26)}</div><span>${name}</span></div>`;
  }).join('');
  return `<div class="tabs n${v.tabs.length}${inline ? ' inline' : ''}">${cells}</div>${inline ? '' : '<div class="homebar"></div>'}`;
}

// Which tab is lit for a screen, given the variant (a screen with no tab of its own sits under Home).
export function activeTab(screen, variant) {
  const want = { learn: 'learn', topics: 'learn', review: 'review', strengths: 'review', home: 'home', displays: 'home', shop: 'shop', profile: 'profile', playground: 'play' }[screen];
  return VARIANTS[variant].tabs.includes(want) ? want : 'home';
}
