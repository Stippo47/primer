// What glows cost: the same drifting, glowing dots drawn three ways, timed frame by frame.
//
//   blur    SVG circles with a real blur filter on each one
//   fake    SVG circles with soft see-through gradients layered up, no filter
//   canvas  one canvas, each dot a ready-made glow picture stamped on
//
// Every way draws the same dots on the same paths, so only the drawing differs.

export const METHODS = [
  { id: 'blur', name: 'Real blur', note: 'SVG, blur filter' },
  { id: 'fake', name: 'Fake glow', note: 'SVG, soft gradients' },
  { id: 'canvas', name: 'Stamps', note: 'canvas, ready-made glows' },
];
export const COUNTS = [10, 30, 60];
const WARM_MS = 500;   // settle before measuring
const RUN_MS = 4000;   // measured time for each run
const COLORS = ['#6fd3c1', '#f2c078', '#b79cf2', '#f29cb7', '#7fb4f5'];
const SVG = 'http://www.w3.org/2000/svg';

// The same "random" dots every time.
function dots(count) {
  let a = 20261116;
  const rnd = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => ({
    r: 8 + rnd() * 9,
    color: i % COLORS.length,
    ax: 0.5 + rnd(), ay: 0.5 + rnd(), px: rnd() * 6.283, py: rnd() * 6.283,
    bx: 1.4 + rnd() * 1.6, by: 1.4 + rnd() * 1.6, qx: rnd() * 6.283, qy: rnd() * 6.283,
  }));
}
function place(d, t, w, h) {
  return [
    w * (0.5 + 0.33 * Math.sin(d.ax * t + d.px) + 0.1 * Math.sin(d.bx * t + d.qx)),
    h * (0.5 + 0.31 * Math.cos(d.ay * t + d.py) + 0.1 * Math.sin(d.by * t + d.qy)),
  ];
}

function el(name, attrs, parent) {
  const e = document.createElementNS(SVG, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.append(e);
  return e;
}

function svgStage(stage, w, h) {
  const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h });
  stage.append(svg);
  return svg;
}

// Each drawer returns { draw(seconds), destroy() }.
const drawers = {
  blur(stage, list, w, h) {
    const svg = svgStage(stage, w, h);
    const filter = el('filter', { id: 'pg-blur', x: '-100%', y: '-100%', width: '300%', height: '300%' }, el('defs', {}, svg));
    el('feGaussianBlur', { stdDeviation: 7 }, filter);
    const groups = list.map(d => {
      const g = el('g', {}, svg);
      el('circle', { r: (d.r * 1.9).toFixed(1), fill: COLORS[d.color], opacity: 0.85, filter: 'url(#pg-blur)' }, g);
      el('circle', { r: (d.r * 0.6).toFixed(1), fill: '#ffffff', opacity: 0.9 }, g);
      return g;
    });
    return {
      draw(t) {
        for (let i = 0; i < list.length; i++) {
          const [x, y] = place(list[i], t, w, h);
          groups[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        }
      },
      destroy() { svg.remove(); },
    };
  },

  fake(stage, list, w, h) {
    const svg = svgStage(stage, w, h);
    const defs = el('defs', {}, svg);
    COLORS.forEach((c, i) => {
      const g = el('radialGradient', { id: `pg-soft-${i}` }, defs);
      el('stop', { offset: '0%', 'stop-color': c, 'stop-opacity': 0.55 }, g);
      el('stop', { offset: '40%', 'stop-color': c, 'stop-opacity': 0.2 }, g);
      el('stop', { offset: '100%', 'stop-color': c, 'stop-opacity': 0 }, g);
    });
    const groups = list.map(d => {
      const g = el('g', {}, svg);
      el('circle', { r: (d.r * 3.6).toFixed(1), fill: `url(#pg-soft-${d.color})` }, g);
      el('circle', { r: (d.r * 1.8).toFixed(1), fill: `url(#pg-soft-${d.color})` }, g);
      el('circle', { r: (d.r * 0.6).toFixed(1), fill: '#ffffff', opacity: 0.9 }, g);
      return g;
    });
    return {
      draw(t) {
        for (let i = 0; i < list.length; i++) {
          const [x, y] = place(list[i], t, w, h);
          groups[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        }
      },
      destroy() { svg.remove(); },
    };
  },

  canvas(stage, list, w, h) {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    stage.append(canvas);
    const g = canvas.getContext('2d');
    // One glow picture per colour, drawn once.
    const SIZE = 128;
    const stamps = COLORS.map(c => {
      const s = document.createElement('canvas');
      s.width = s.height = SIZE;
      const sg = s.getContext('2d');
      const half = SIZE / 2;
      const soft = sg.createRadialGradient(half, half, 0, half, half, half);
      soft.addColorStop(0, c + 'cc');
      soft.addColorStop(0.25, c + '66');
      soft.addColorStop(0.55, c + '22');
      soft.addColorStop(1, c + '00');
      sg.fillStyle = soft;
      sg.fillRect(0, 0, SIZE, SIZE);
      sg.fillStyle = 'rgba(255,255,255,.9)';
      sg.beginPath();
      sg.arc(half, half, SIZE / 12, 0, 6.2832);
      sg.fill();
      return s;
    });
    return {
      draw(t) {
        g.setTransform(scale, 0, 0, scale, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, w, h);
        g.globalCompositeOperation = 'lighter';
        for (const d of list) {
          const [x, y] = place(d, t, w, h);
          const size = d.r * 7.2;
          g.drawImage(stamps[d.color], x - size / 2, y - size / 2, size, size);
        }
      },
      destroy() { canvas.remove(); },
    };
  },
};

function measure(deltas) {
  if (deltas.length < 2) return { fps: 0, p95: 0, worst: 0, frames: deltas.length };
  const total = deltas.reduce((a, b) => a + b, 0);
  const sorted = [...deltas].sort((a, b) => a - b);
  return {
    fps: Math.round((deltas.length / total) * 10000) / 10,
    p95: Math.round(sorted[Math.ceil(sorted.length * 0.95) - 1] * 10) / 10,   // 95 in 100 frames were quicker than this
    worst: Math.round(sorted[sorted.length - 1] * 10) / 10,
    frames: deltas.length,
  };
}

function runOne(stage, method, count, stop) {
  const w = stage.clientWidth, h = stage.clientHeight;
  const drawer = drawers[method](stage, dots(count), w, h);
  return new Promise(resolve => {
    let first = null, last = null;
    const deltas = [];
    const frame = now => {
      if (stop.stopped) { drawer.destroy(); resolve(null); return; }
      if (first === null) first = now;
      const t = now - first;
      drawer.draw(t / 1000);
      if (t >= WARM_MS) {
        if (last !== null) deltas.push(now - last);
        last = now;
      }
      if (t < WARM_MS + RUN_MS) requestAnimationFrame(frame);
      else { drawer.destroy(); resolve(measure(deltas)); }
    };
    requestAnimationFrame(frame);
  });
}

// Runs every way at every count, one after another. `stop.stopped = true` ends it early.
// Returns the list of runs, or null if it was stopped.
export async function runBench(stage, stop, onStep) {
  const runs = [];
  const total = METHODS.length * COUNTS.length;
  for (const m of METHODS) {
    for (const count of COUNTS) {
      onStep({ n: runs.length + 1, total, method: m, count });
      const r = await runOne(stage, m.id, count, stop);
      if (!r) return null;
      runs.push({ method: m.id, count, ...r });
      await new Promise(res => setTimeout(res, 200));
    }
  }
  return runs;
}

export const SECONDS = Math.round((METHODS.length * COUNTS.length * (WARM_MS + RUN_MS + 200)) / 1000);
