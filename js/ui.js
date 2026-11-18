// Small shared helpers for the screens: escaping, the header row, sheets and placing popovers.
import * as feel from './feel.js';

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const head = (left, right = '') => `<header class="head"><div class="left">${left}</div><div class="right">${right}</div></header>`;

// A sheet from the bottom over a dimmed screen. Tapping the dim closes it. Returns { el, close }.
export function sheet(host, html, { onClose = () => {} } = {}) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const el = document.createElement('div');
  el.className = 'sheet';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="grip"></div>${html}`;
  host.append(scrim, el);
  feel.glide(el, v => `translateY(${v}%)`, 100, 0, 380);
  scrim.animate && scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    scrim.remove();
    el.remove();
    onClose();
  };
  scrim.addEventListener('click', close);
  el.querySelector('.grip').addEventListener('click', close);
  return { el, close };
}

// Puts a popover beside an anchor, by script (the phone can't pin one element to another by itself):
// to the left of the anchor if there's room, else to the right, never off the screen.
export function placeBeside(pop, anchor, container, gap = 12) {
  const a = anchor.getBoundingClientRect(), c = container.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const leftRoom = a.left - c.left, rightRoom = c.right - a.right;
  const onLeft = leftRoom >= w + gap || leftRoom > rightRoom;
  let x = onLeft ? a.left - c.left - w - gap : a.right - c.left + gap;
  x = Math.max(8, Math.min(c.width - w - 8, x));
  const y = Math.max(4, a.top - c.top + a.height / 2 - 38);
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  const arrow = pop.querySelector('.arrow');
  if (arrow) {
    arrow.style.left = onLeft ? '' : '-7px';
    arrow.style.right = onLeft ? '-7px' : '';
    arrow.style.top = `${Math.max(14, Math.min(h - 30, a.top - c.top + a.height / 2 - y - 8))}px`;
  }
  return onLeft ? 'left' : 'right';
}

export const when = ms => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
