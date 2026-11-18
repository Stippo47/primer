// Makes the app's icons (icons/icon-180.png, -192, -512) and the Map part's card picture
// (parts/map/thumb.svg), by drawing them in a headless browser from the app's own art code.
// Never opens a window.   node tools/make-art.mjs [--port 8824] [--debug-port 9342] [--thumb-only]
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from '../skill/cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(a => a.trim().split(' ')));
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const file = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(Number(args.port) || 8824, '127.0.0.1', r));
const b = await launch({ port: Number(args['debug-port']) || 9342, width: 512, height: 512, touch: false, mobile: false });
try {
  await b.go(`http://127.0.0.1:${server.address().port}/tools/art.html`, 'window.ready === true');
  await writeFile(join(ROOT, 'parts', 'map', 'thumb.svg'), `${await b.ev('mapThumb()')}\n`);
  for (const size of 'thumb-only' in args ? [] : [180, 192, 512]) {
    await b.size(size, size, 1);
    await b.ev(`show(appIcon(${size}))`);
    await sleep(200);
    await b.shot(join(ROOT, 'icons', `icon-${size}.png`), { clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
  }
  console.log('thumb-only' in args ? 'map thumb written' : 'icons and map thumb written');
} finally {
  await b.close();
  server.close();
}
