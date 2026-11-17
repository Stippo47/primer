// The lesson's frame, as plain elements. Like the picture, it is set fresh for any moment `t`.

import * as E from './ease.js';
import { LINES, T } from './script.js';

const { ramp, lerp, clamp01 } = E;

export function createChrome(root, look) {
  const C = look.chrome, M = look.motion;
  const set = (k, v) => root.style.setProperty(k, v);
  const px = v => `${v}px`;
  set('--ground', C.ground);
  set('--text', C.text);
  set('--key', C.key);
  set('--gutter', px(C.gutter));
  set('--cap-inset', px(C.gutter + C.caption.indent));
  set('--font', `"${look.fonts.ui}"`);
  set('--cap-size', px(C.caption.size));
  set('--cap-top', px(C.caption.top));
  set('--cap-weight', C.caption.weight);
  set('--cap-lh', C.caption.lineHeight);
  set('--cap-align', C.caption.align);
  set('--cap-items', C.caption.align === 'center' ? 'center' : 'flex-start');
  set('--cap-justify', C.caption.valign === 'center' ? 'center' : 'flex-start');
  set('--cap-track', `${C.caption.tracking}em`);
  set('--tag-fill', C.tag.fill);
  set('--tag-text', C.tag.text);
  set('--tag-border', C.tag.border);
  set('--tag-r', px(C.tag.radius));
  set('--tag-weight', C.tag.weight);
  set('--tag-track', `${C.tag.tracking}em`);
  set('--tag-case', C.tag.upper ? 'uppercase' : 'none');
  set('--bar-h', px(C.bar.height));
  set('--bar-r', px(C.bar.radius));
  set('--bar-track', C.bar.track);
  set('--bar-fill', C.bar.fill);
  set('--bar-shine', C.bar.shine);
  set('--bar-glow', C.bar.glow);
  set('--close', C.close.color);
  set('--close-w', C.close.weight);
  const B = C.button;
  set('--btn-h', px(B.height));
  set('--btn-r', px(B.radius));
  set('--btn-depth', px(B.depth));
  set('--btn-size', px(B.size));
  set('--btn-weight', B.weight);
  set('--btn-track', `${B.tracking}em`);
  set('--btn-case', B.upper ? 'uppercase' : 'none');
  set('--btn-fill', B.fill);
  set('--btn-edge', B.edge);
  set('--btn-text', B.text);
  set('--btn-border', B.border);
  set('--btn-glow', B.glow);
  set('--btn-off-fill', B.offFill);
  set('--btn-off-edge', B.offEdge);
  set('--btn-off-text', B.offText);
  set('--btn-off-border', B.offBorder);
  document.documentElement.style.setProperty('--ground', C.ground);
  document.documentElement.style.setProperty('--text', C.text);

  const $ = id => root.querySelector(id);
  const fill = $('#fill'), tag = $('#tag'), words = $('#words'), caption = $('#caption'), cta = $('#cta');
  const html = LINES.map(l => l.text.replace(/\*(.+?)\*/g, '<b>$1</b>'));
  let shown = -2;

  function render(t) {
    // caption: the old line leaves, the new one rises in
    let i = -1;
    for (let n = 0; n < LINES.length; n++) if (t >= LINES[n].at - 0.22) i = n;
    if (i !== shown) {
      shown = i;
      words.innerHTML = i < 0 ? '' : html[i];
      tag.textContent = i >= 0 && LINES[i].tag ? LINES[i].tag : '';
      tag.style.display = i >= 0 && LINES[i].tag ? 'inline-block' : 'none';
    }
    if (i >= 0) {
      const at = LINES[i].at;
      const next = LINES[i + 1] ? LINES[i + 1].at - 0.22 : 1e6;
      const inK = E.spring(ramp(t, at, at + 0.5 * M.pop), M.bounce * 0.6);
      const outK = ramp(t, next - 0.2, next);
      caption.style.opacity = clamp01(ramp(t, at, at + 0.22)) * (1 - outK);
      caption.style.transform = `translateY(${((1 - inK) * M.captionRise - outK * M.captionRise * 0.5).toFixed(2)}px)`;
      const tagK = E.spring(ramp(t, at + 0.05, at + 0.05 + 0.5 * M.pop), M.bounce);
      tag.style.transform = `scale(${lerp(0.6, 1, tagK).toFixed(3)})`;
    } else {
      caption.style.opacity = 0;
    }

    // progress steps on when the scene is done
    const step = E.spring(ramp(t, T.done, T.done + 0.7 * M.pop), M.bounce * 0.5);
    fill.style.width = `${lerp(37.5, 50, step).toFixed(2)}%`;

    // the button wakes up
    const on = t >= T.done;
    cta.classList.toggle('on', on);
    const wake = E.spring(ramp(t, T.done, T.done + 0.6 * M.pop), M.bounce);
    const s = on ? lerp(1 - 0.1 * Math.min(1, M.bounce + 0.3), 1, wake) : 1;
    cta.style.transform = `scale(${s.toFixed(4)})`;
  }

  return { render };
}
