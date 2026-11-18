// The nodes on a path that aren't played step by step: a chest, and the placeholders for a review and an
// animation. A chest opens with a small celebration and is recorded as opened; what's inside comes with
// the shop (stage 4). A review or an animation says it comes later, and visiting it lets the path go on.
// Each is a screen of its own with the tab bar hidden, a cross to leave and one big button.
import { esc } from '../ui.js';
import { icon, svg, chest, stepButton, glint } from '../art.js';
import * as feel from '../feel.js';

const WORDS = {
  chest: { big: 'A chest!', small: "What's inside comes with the shop." },
  review: { big: 'Review', small: 'Soon: a review of everything before it on the path.' },
  animation: { big: 'Animation', small: 'Soon: animations come with the voices.' },
};

export function visitNode(app, topic, node, { record, onLeave }) {
  const view = app.view;
  document.documentElement.classList.add('bare');
  const w = WORDS[node.kind];
  const art = node.kind === 'chest'
    ? `<div class="chestbig">${svg(180, 160, `<g class="shut" transform="translate(13 18) scale(2.4)">${chest({ open: false })}</g><g class="open" transform="translate(13 18) scale(2.4)" opacity="0">${chest({ open: true, glow: true })}</g>
        <g class="sparks" opacity="0">${glint(36, 22, 9, '#ffe9a6')}${glint(150, 14, 7, '#fff')}${glint(162, 78, 5, '#ffe9a6')}${glint(18, 84, 5, '#fff', 0.8)}</g>`)}</div>`
    : svg(120, 120, `<g transform="translate(60 52) scale(1.5)">${stepButton({ kind: node.kind, state: 'now' })}</g>`);
  view.innerHTML = `<section class="lesson visit" aria-label="${esc(node.title)}">
    <header class="ltop"><button class="round mute" data-go="leave" aria-label="Close" data-sound="off">${icon.close(20)}</button></header>
    <div class="lend"><div class="rays${node.kind === 'chest' ? ' gold' : ''}"></div>${art}
      <p class="big">${esc(node.kind === 'chest' ? w.big : node.title)}</p>
      <p class="tally">${esc(w.small)}</p></div>
    <footer class="lfoot"><button class="btn" data-go="done">Continue</button></footer>
  </section>`;
  const root = view.querySelector('.visit');
  // Reaching it is what counts: it's recorded as soon as it's shown, so leaving by the cross keeps it.
  record({ type: 'open', topic: topic.id, node: node.id, kind: node.kind });
  if (node.kind === 'chest') {
    const shut = root.querySelector('.shut'), open = root.querySelector('.open'), sparks = root.querySelector('.sparks');
    const box = root.querySelector('.chestbig');
    feel.pop(box, 0.7);
    setTimeout(() => {
      if (!root.isConnected) return;
      shut.setAttribute('opacity', '0');
      open.setAttribute('opacity', '1');
      sparks.setAttribute('opacity', '1');
      feel.spring(box, v => `scale(${v})`, 0.9, 1, { ms: 520 });
      feel.sound('done');
      feel.tick();
    }, 420);
  } else {
    feel.pop(root.querySelector('.lend svg'), 0.6);
  }
  let gone = false;
  const leave = () => {
    if (gone) return;
    gone = true;
    view.innerHTML = '';
    document.documentElement.classList.remove('bare');
    onLeave();
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) leave();
  });
  view.dispatchEvent(new CustomEvent('nodeshown', { detail: { id: node.id, kind: node.kind } }));
  return { root, leave };
}
