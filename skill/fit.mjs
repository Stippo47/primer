// `primer fit`: draws every step of a lesson in the real app, in a headless browser, on the smallest iPhone
// (375 x 667) and on an iPhone 11 (414 x 896), and says whether it fits. It measures rather than guesses,
// so it can't be the optimist. Never opens a window.
//
//   node fit.mjs --app <primer repo> --lesson <lesson.json> --topic <topic folder> [--shots <folder>] [--browser <path>]
// Prints one line of JSON: { lesson, steps: [ { step, verdict, words, small, big } ] }.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, mkdirSync } from 'node:fs';
import { basename, extname, join, normalize, resolve, sep } from 'node:path';
import { launch, sleep } from './cdp.mjs';

const args = {};
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) args[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
}
const APP = resolve(args.app), TOPIC = resolve(args.topic), DATA = resolve(TOPIC, '..', '..');
const lesson = JSON.parse(readFileSync(args.lesson, 'utf8'));
const topic = { ...JSON.parse(readFileSync(join(TOPIC, 'topic.json'), 'utf8')), id: basename(TOPIC) };
lesson.id = basename(args.lesson, '.json');
lesson.topic = topic.id;
// An animation's file is a scene: it plays as a lesson of that one step.
if (!lesson.steps && Array.isArray(lesson.lines)) {
  Object.assign(lesson, { kind: 'animation', steps: [{ id: lesson.id, kind: 'scene', title: lesson.title, parts: lesson.parts, lines: lesson.lines }] });
}
topic.lessons = [lesson];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const inside = (root, p) => { const f = normalize(join(root, p)); return f.startsWith(root.endsWith(sep) ? root : root + sep) ? f : null; };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = null;
  if (path.startsWith('/primer/')) file = inside(APP, path.slice(8) || 'index.html');
  else if (path.startsWith('/__topic/')) file = inside(TOPIC, path.slice(9));
  else if (path.startsWith('/__data/')) file = inside(DATA, path.slice(8));
  if (file && file.endsWith(sep)) file += 'index.html';
  try {
    if (!file) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => server.listen(Number(args.port) || 0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const SCREENS = [{ name: 'small', w: 375, h: 667, insets: '20,0' }, { name: 'big', w: 414, h: 896, insets: '48,34' }];
// The longest line of feedback a step can show, so the measure with feedback is the worst case.
function longestWhy(s) {
  const lines = [s.right, s.why, ...(s.misses || []).map(m => m.why), ...((s.input && s.input.options) || []).map(o => o.why)].filter(Boolean);
  return lines.sort((a, b) => b.length - a.length)[0] || '';
}

const b = await launch({ port: Number(args['debug-port']) || 9400 + Math.floor(Math.random() * 400), browser: args.browser, width: 375, height: 667, scale: 1 });
const results = lesson.steps.map(s => ({ step: s.id, kind: s.kind }));
try {
  if (args.shots) mkdirSync(args.shots, { recursive: true });
  for (const sc of SCREENS) {
    await b.size(sc.w, sc.h, 1);
    await b.go(`${base}/primer/?insets=${sc.insets}`);
    await b.ev(`window.__fitMedia = p => (p.startsWith('topics/') ? '/__data/' : '/__topic/') + p; true`);
    for (let i = 0; i < lesson.steps.length; i++) {
      const s = lesson.steps[i];
      let plain = await b.ev(`__primer.fit(${JSON.stringify(topic)}, ${JSON.stringify(lesson)}, ${i}, __fitMedia)`);
      let fed = null;
      if (s.kind === 'scene') {
        // a scene: every line's caption in its turn, and a wait's longest feedback; the worst is the step's
        for (let j = 0; j < s.lines.length; j++) {
          await b.ev(`__primer.run.scene.still(${j}); true`);
          await sleep(60);
          const m = await b.ev('__primer.run.measure()');
          if (m.over >= plain.over) plain = { ...m, line: s.lines[j].id };
          if (s.lines[j].wait) {
            await b.ev(`__primer.run.preview('wrong', ${JSON.stringify(longestWhy(s.lines[j].wait))}); true`);
            await sleep(60);
            const mf = await b.ev('__primer.run.measure()');
            if (!fed || mf.over > fed.over) fed = mf;
            await b.ev(`__primer.run.foot.className = 'lfoot'; __primer.run.foot.querySelector('.lfeed').hidden = true; true`);
          }
          if (args.shots && sc.name === 'small') await b.shot(join(args.shots, `${String(i + 1).padStart(2, '0')}-${s.id}-${String(j + 1).padStart(2, '0')}-${s.lines[j].id}.png`));
        }
        results[i][sc.name] = { over: plain.over, stage: plain.stage, overWithFeedback: fed ? fed.over : 0, line: plain.line };
        continue;
      }
      if (s.kind !== 'explain') {
        await b.ev(`__primer.run.preview('wrong', ${JSON.stringify(longestWhy(s))}); true`);
        await sleep(60);
        fed = await b.ev('__primer.run.measure()');
      }
      if (args.shots && sc.name === 'small') await b.shot(join(args.shots, `${String(i + 1).padStart(2, '0')}-${s.id}.png`));
      results[i][sc.name] = { over: plain.over, stage: plain.stage, overWithFeedback: fed ? fed.over : 0 };
    }
  }
  for (const r of results) {
    const sm = r.small, bg = r.big;
    let verdict = 'fits', words = 'fits';
    if (sm.over > 0 || bg.over > 0) {
      verdict = 'scrolls';
      const where = r.kind === 'scene' ? ` at line ${(sm.over > 0 ? sm : bg).line}` : '';
      words = `doesn't fit${where}: it scrolls by ${Math.max(sm.over, bg.over)} px on the ${sm.over > 0 ? 'smallest iPhone' : 'iPhone 11'}. Cut words, or use a smaller form`;
    } else if (sm.overWithFeedback > 0 || bg.overWithFeedback > 0) {
      verdict = 'tight';
      words = `fits, but with its longest feedback showing it scrolls by ${Math.max(sm.overWithFeedback, bg.overWithFeedback)} px on the smallest iPhone: shorten that line`;
    } else if (sm.stage !== null && sm.stage < 230) {
      verdict = 'tight';
      words = `fits, with its picture squeezed to ${sm.stage} px tall on the smallest iPhone`;
    }
    Object.assign(r, { verdict, words });
  }
  if (b.errors.length) throw new Error(b.errors.join('\n'));
  console.log(JSON.stringify({ lesson: lesson.id, steps: results }));
} finally {
  await b.close();
  server.close();
}
