// Round 2's avatars, one by itself, for the avatar board: 414 x 414. They are no longer in the room;
// the avatar is being redrawn separately.

import { pen } from './draw.js';
import { drawAvatar } from './avatars.js';

export function createAvatarCard(canvas, { dpr = 2 } = {}) {
  canvas.width = 414 * dpr; canvas.height = 414 * dpr;
  const ctx = canvas.getContext('2d');
  return {
    render({ t, id, hat = false, shirt = false }) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, 414);
      bg.addColorStop(0, '#222b72'); bg.addColorStop(0.72, '#2c388e'); bg.addColorStop(0.72, '#c58a5c'); bg.addColorStop(1, '#b57a4e');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 414, 414);
      for (let x = 10; x < 414; x += 38) { ctx.fillStyle = 'rgba(130,150,255,0.055)'; ctx.fillRect(x, 0, 19, 298); }
      ctx.fillStyle = '#262f80'; ctx.fillRect(0, 286, 414, 12);
      ctx.fillStyle = 'rgba(10,8,44,0.3)'; ctx.fillRect(0, 298, 414, 8);
      const g = pen(ctx);
      g.glow(207, 190, 190, 170, '#8fa4ff', 0.16);
      ctx.save(); ctx.translate(207, 356); ctx.scale(1.86, 1.86);
      drawAvatar(g, id, { t, hat, shirt });
      ctx.restore();
    },
  };
}
