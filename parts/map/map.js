// The Map: one part that is both the globe and a flat map. The projection is a setting; everything else
// is written once and works on every projection: the world's shapes (world.js), the look (look.js), the
// layers that draw (layers.js), the small marks (marks.js), the camera and its gestures, the calls, the
// state and the taps. A view (views.js) is the only thing that knows which projection it is.
//
// Smooth on the phone: the map itself (the base layers) is drawn onto a picture kept aside and redrawn
// only when the view or what's on it changes, with every shape projected once per view and shared by the
// layers. Each frame copies that picture and draws the small things on top. Frames run only while
// something moves; a still map costs nothing. No blur anywhere.
//
// mount(el, settings, ctx) -> { calls, state, on, remove, where, busy, debug }.

import { geoPath } from 'd3-geo';
import { loadWorld, countryAt } from './world.js';
import { makeView, SPHERE } from './views.js';
import { LAYERS, mirroredBand, latBand, makeRoute, progressOf } from './layers.js';
import { STYLE, MOTION, colourOf, rampAt } from './look.js';

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const back = (k, s) => { const c = k - 1; return 1 + c * c * ((s + 1) * c + s); };
const inOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const ZOOM_MAX = 8;

export async function mount(el, settings, ctx = {}) {
  const W = await loadWorld();
  const S = settings;
  const feel = ctx.feel || { sound() {}, tick() {} };
  const style = STYLE[S.style] || STYLE.day;
  const view = makeView(S.projection || 'globe');
  const fingersMove = S.spin !== 'locked';
  const fingersZoom = fingersMove && S.pinch !== false;

  const canvas = document.createElement('canvas');
  canvas.className = 'pg-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', view.round ? 'Globe' : 'Map');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  el.append(canvas);
  const g = canvas.getContext('2d');
  const base = document.createElement('canvas');
  const bg = base.getContext('2d');

  // ---- the camera, shared by every view: where it faces and how close
  let w = 0, h = 0, dpr = 1;
  let centre = Array.isArray(S.view) ? [Number(S.view[0]) || 0, Number(S.view[1]) || 0] : [-40, 15];
  let zoom = Math.max(1, Math.min(ZOOM_MAX, Number(S.zoom) || 1));
  let vel = [0, 0], dragging = false, pinching = null, touchedAt = 0, turnAnim = null, zoomAnim = null;
  const set = () => view.set(w, h, centre, zoom);

  // ---- what's on the map: everything a call adds, read by the layers
  const m = { highlights: new Map(), bands: [], table: null, points: [], markers: [], routes: [], pin: null, selected: null, selectedAt: 0 };
  let contents = 0, tapped = null;
  const changed = () => { contents++; wake(); };

  let baseKey = '', raf = 0, last = 0, gone = false, redraws = 0, baseMs = 0, frames = 0;
  const memo = {};
  const fns = { tapped: new Set(), settled: new Set(), turned: new Set(), zoomed: new Set() };
  const emit = (name, v) => fns[name].forEach(fn => fn(v));
  const roundC = () => [Math.round(centre[0] * 10) / 10, Math.round(centre[1] * 10) / 10];
  const roundZ = () => Math.round(zoom * 100) / 100;
  let zoomSaid = zoom;
  const settled = () => {
    const v = { centre: roundC(), zoom: roundZ() };
    if (Math.abs(zoom - zoomSaid) > 1e-3) { zoomSaid = zoom; emit('zoomed', { zoom: v.zoom }); }
    emit('settled', v);
    emit('turned', v);
  };

  function size() {
    const box = el.getBoundingClientRect();
    w = Math.max(10, box.width); h = Math.max(10, box.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [canvas, base]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    set();
    centre = view.clamp(centre, zoom);
    baseKey = '';
    wake();
  }

  // ---- the draw context the layers draw from (see layers.js)
  let shapes = new Map(), shapeKey = '';
  const d = {
    c: null, view, W, S, m, style, memo, k: 1, now: 0, dt: 16,
    // a shape, projected once for this view and shared by every layer that draws it
    shape(geo) {
      let p = shapes.get(geo);
      if (!p) { p = new Path2D(); geoPath(view.proj, p)(geo); shapes.set(geo, p); }
      return p;
    },
    // a path drawer onto any canvas path, for shapes that change every frame (a growing route)
    pathTo: target => geoPath(view.proj, target),
  };
  const viewKey = () => `${view.kind},${centre[0].toFixed(3)},${centre[1].toFixed(3)},${zoom.toFixed(4)},${w},${h}`;
  function ready(c, now, dt) {
    const key = viewKey();
    if (key !== shapeKey) { shapes = new Map(); shapeKey = key; }
    d.c = c; d.now = now; d.dt = dt;
    d.k = Math.sqrt(view.size);
    d.box = view.box;
  }

  // ---- the map itself, on its own picture
  function drawBase(now) {
    const key = `${viewKey()},${contents},${m.selected}`;
    if (key === baseKey) return;
    baseKey = key;
    redraws++;
    const t0 = performance.now();
    ready(bg, now, 16);
    bg.setTransform(dpr, 0, 0, dpr, 0, 0);
    bg.clearRect(0, 0, w, h);
    let clipped = false;
    for (const layer of LAYERS) {
      if (!layer.base) continue;
      if (layer.clip && !clipped) { bg.save(); bg.clip(d.shape(SPHERE)); clipped = true; }
      if (!layer.clip && clipped) { bg.restore(); clipped = false; }
      layer.draw(d);
    }
    if (clipped) bg.restore();
    baseMs = performance.now() - t0;
  }

  function frame(now) {
    raf = 0;
    if (gone) return;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    frames++;
    let moving = false, done = false;
    if (turnAnim) {
      const k = clamp01((now - turnAnim.t0) / turnAnim.ms);
      centre = turnAnim.path(back(k, MOTION.overshoot * 0.4));
      if (k >= 1) { centre = turnAnim.path(1); turnAnim = null; done = true; }
      moving = true;
    }
    if (zoomAnim) {
      const k = clamp01((now - zoomAnim.t0) / zoomAnim.ms);
      zoom = zoomAnim.from + (zoomAnim.to - zoomAnim.from) * inOut(k);
      if (zoomAnim.focus) keepUnder(zoomAnim.focus.at, zoomAnim.focus.x, zoomAnim.focus.y);
      if (k >= 1) { zoom = zoomAnim.to; zoomAnim = null; done = true; }
      moving = true;
    }
    if (!turnAnim && !dragging && !pinching && (Math.abs(vel[0]) > 0.005 || Math.abs(vel[1]) > 0.005)) {
      // a flick carrying on
      set();
      centre = view.pan(centre, vel[0] * dt, vel[1] * dt);
      const f = Math.exp(-dt / 380);
      vel = [vel[0] * f, vel[1] * f];
      if (Math.abs(vel[0]) <= 0.005 && Math.abs(vel[1]) <= 0.005) { vel = [0, 0]; done = true; }
      moving = true;
    } else if (S.spin === 'auto' && !turnAnim && !dragging && !pinching && now - touchedAt > 2500) {
      centre = [centre[0] + 0.006 * dt, centre[1]];
      moving = true;
    }
    set();
    centre = view.clamp(centre, zoom);
    set();
    const lifting = m.selected && now - m.selectedAt < 500;
    if (lifting) baseKey = '';
    drawBase(now);
    ready(g, now, dt);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.drawImage(base, 0, 0, w, h);
    let wants = false;
    for (const layer of LAYERS) if (!layer.base && layer.draw(d)) wants = true;
    if (done && !turnAnim && !zoomAnim) settled();
    if (moving || dragging || pinching || wants || lifting) wake();
    else last = 0;
  }
  function wake() { if (!raf && !gone) raf = requestAnimationFrame(frame); }

  // Keeps the place `at` under the screen point x, y (zooming about the fingers, or a double tap).
  function keepUnder(at, x, y) {
    set();
    const p = view.proj(at);
    if (!p || !Number.isFinite(p[0])) return;
    centre = view.clamp(view.pan(centre, x - p[0], y - p[1]), zoom);
  }

  // ---- the finger: drag to turn or pan, pinch or tap twice to zoom, tap to pick
  const local = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  let grab = null, lastTap = null;
  const stopAll = () => { vel = [0, 0]; turnAnim = null; zoomAnim = null; };
  const stop = ctx.track(canvas, {
    start: () => { touchedAt = performance.now(); stopAll(); set(); grab = { c: centre.slice() }; },
    move: ({ dx, dy }) => {
      if (!fingersMove || !grab) return;
      dragging = true;
      touchedAt = performance.now();
      view.set(w, h, grab.c, zoom);
      centre = view.pan(grab.c, dx, dy);
      wake();
    },
    release: ({ vx, vy }) => {
      if (!dragging) return;
      dragging = false;
      grab = null;
      touchedAt = performance.now();
      vel = fingersMove && (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) ? [vx, vy] : [0, 0];
      if (!vel[0] && !vel[1]) settled();   // let go without a flick: at rest already
      wake();
    },
    cancel: () => { dragging = false; grab = null; wake(); },
    pinchStart: mid => {
      if (!fingersZoom) return;
      const b = canvas.getBoundingClientRect(), x = mid.x - b.left, y = mid.y - b.top;
      stopAll(); dragging = false; grab = null;
      set();
      const at = view.onMap(x, y) || view.onMap(w / 2, h / 2);
      pinching = { z0: zoom, at };
      wake();
    },
    pinch: (scale, mid) => {
      if (!pinching) return;
      const b = canvas.getBoundingClientRect();
      zoom = Math.max(1, Math.min(ZOOM_MAX, pinching.z0 * scale));
      touchedAt = performance.now();
      if (pinching.at) keepUnder(pinching.at, mid.x - b.left, mid.y - b.top);
      wake();
    },
    pinchEnd: () => {
      if (!pinching) return;
      pinching = null;
      touchedAt = performance.now();
      settled();
      wake();
    },
    tap: e => {
      const [x, y] = local(e);
      grab = null;
      const now = performance.now();
      // a second tap close to the first, soon after: zoom in there (back out from the closest)
      if (fingersZoom && lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30) {
        lastTap = null;
        set();
        const at = view.onMap(x, y);
        zoomBy(zoom >= ZOOM_MAX - 1e-3 ? 1 / zoom : 2, at ? { at, x, y } : null);
        return;
      }
      lastTap = { t: now, x, y };
      set();
      const at = view.onMap(x, y);
      if (!at) return;
      const hit = countryAt(W, at);
      const country = hit ? hit.name : null;
      tapped = { lon: Math.round(at[0] * 100) / 100, lat: Math.round(at[1] * 100) / 100, land: !!hit, country };
      if (S.tap === 'pin') { m.pin = { at, t0: performance.now() }; feel.sound('pop'); feel.tick(); }
      if (S.tap === 'country') { m.selected = country; m.selectedAt = performance.now(); if (country) { feel.sound('select'); feel.tick(); } }
      emit('tapped', { ...tapped });
      wake();
    },
  });

  function zoomBy(factor, focus, seconds = 0.35) {
    const to = Math.max(1, Math.min(ZOOM_MAX, zoom * factor));
    zoomAnim = { from: zoom, to, t0: performance.now(), ms: Math.max(1, seconds * 1000), focus };
    vel = [0, 0];
    wake();
  }

  const placeOf = place => {
    if (Array.isArray(place)) return [Number(place[0]), Number(place[1])];
    const c = W.byName.get(place);
    return c ? c.labelAt : null;
  };

  const ro = new ResizeObserver(() => size());
  ro.observe(el);
  size();
  if (document.fonts && document.fonts.load) document.fonts.load('800 13px "Nunito"').then(wake, () => {});

  return {
    calls: {
      spinTo(place, seconds = 1.2) {
        const to = placeOf(place);
        if (!to) return;
        const target = view.clamp(to, zoom);
        turnAnim = { path: view.between(centre.slice(), target), t0: performance.now(), ms: Math.max(1, Number(seconds) * 1000) };
        if (Number(seconds) === 0) { centre = target; turnAnim = null; settled(); }
        vel = [0, 0];
        wake();
      },
      zoomTo(to, seconds = 1) {
        const ms = Math.max(1, Number(seconds) * 1000), now = performance.now();
        let level = Number(to), place = null;
        if (typeof to !== 'number') {
          place = placeOf(to);
          if (!place) return;
          level = Array.isArray(to) ? 3 : fitLevel(W.byName.get(to));
        }
        level = Math.max(1, Math.min(ZOOM_MAX, level));
        if (place) {
          const target = view.clamp(place, level);
          turnAnim = { path: view.between(centre.slice(), target), t0: now, ms };
        }
        zoomAnim = { from: zoom, to: level, t0: now, ms, focus: null };
        if (Number(seconds) === 0) {
          zoom = level; zoomAnim = null;
          if (place) { set(); centre = view.clamp(place, zoom); turnAnim = null; }
          settled();
        }
        vel = [0, 0];
        wake();
      },
      highlight(countries, colour) { for (const n of [].concat(countries || [])) m.highlights.set(n, colourOf(colour)); changed(); },
      colourBy(data, rampName = 'heat', range) { m.table = table(data, rampName, range); changed(); },
      band(from, to, colour) {
        // its shapes are made once here, never on a frame
        m.bands.push(mirroredBand(Math.min(from, to), Math.max(from, to), colourOf(colour)));
        changed();
      },
      point(place, label) { const at = placeOf(place); if (at) m.points.push({ at, label }); wake(); },
      marker(place, kind = 'ring', label) { const at = placeOf(place); if (at) m.markers.push({ at, kind, label, t0: performance.now() }); wake(); },
      arc(from, to, colour) {
        const a = placeOf(from), b = placeOf(to);
        if (a && b) m.routes.push(makeRoute([a, b], { col: colourOf(colour), progress: 1, from: 0, seconds: 0.9, now: performance.now() }));
        wake();
      },
      // A path drawn as far as `progress` (0..1), with something riding its head. Called again with the
      // same path, it moves that track on (gliding there over `seconds`), so a scene can drive one storm.
      track(path, progress = 1, rider = 'none', seconds = 0) {
        const places = [].concat(path || []).map(placeOf).filter(Boolean);
        if (places.length < 2) return;
        const key = JSON.stringify(places), now = performance.now();
        const old = m.routes.find(r => r.key === key);
        const p = clamp01(Number(progress));
        if (old) {
          old.from = progressOf(old, now); old.to = p; old.t0 = now; old.ms = Math.max(0, Number(seconds) * 1000); old.rider = rider;
        } else {
          const rt = makeRoute(places, { col: '#ffffff', rider, progress: p, from: Number(seconds) > 0 ? 0 : p, seconds: Number(seconds) || 0, now });
          rt.key = key;
          m.routes.push(rt);
        }
        wake();
      },
      clear() {
        m.highlights.clear(); m.bands.length = 0; m.table = null; m.points.length = 0; m.markers.length = 0; m.routes.length = 0;
        m.pin = null; m.selected = null;
        changed();
      },
    },
    state: () => ({ selected: m.selected, tapped: tapped ? { ...tapped } : null, centre: roundC(), zoom: roundZ() }),
    on: (name, fn) => { if (!fns[name]) return () => {}; fns[name].add(fn); return () => fns[name].delete(fn); },
    // Where a place is on the screen, for the tests and for anything laid over the map.
    where(place) {
      const at = placeOf(place);
      if (!at) return null;
      set();
      const b = canvas.getBoundingClientRect(), [x, y] = view.proj(at);
      return { x: b.left + x, y: b.top + y, visible: view.visible(at) };
    },
    // How many frames are queued: 0 once it's still. For the tests.
    busy: () => !!raf,
    // For the tests: the names showing and how visible each is, the four-colour clashes, how many times the
    // map itself has been redrawn and how long the last took, and the projection.
    debug: () => ({ labels: [...(memo.shownNames || new Map())].map(([name, st]) => ({ name, a: st.a, on: st.on })), clashes: W.clashes, redraws, baseMs, frames, projection: view.kind,
      routes: m.routes.map(r => ({ legs: r.legs.length, progress: progressOf(r, performance.now()), rider: r.rider })), table: !!m.table }),
    remove() {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      stop();
      for (const k of Object.keys(fns)) fns[k].clear();
      canvas.remove();
    },
  };

  // The zoom at which a country (its biggest piece) fills about half the box.
  function fitLevel(c) {
    if (!c) return 3;
    const [[x0, y0], [x1, y1]] = c.mainBounds;
    const lon = x1 >= x0 ? x1 - x0 : 360 - (x0 - x1), mid = ((y0 + y1) / 2) * Math.PI / 180;
    const span = Math.max(lon * Math.cos(mid), y1 - y0, 1) * Math.PI / 180;
    set();
    return (0.5 * Math.min(w, h)) / (span * view.scale1);
  }
}

// A table, coloured: { "Brazil": 0.8, "France": "pink" } colours countries; [[from, to, value], ...] colours
// bands of latitude (south is negative). Numbers run along a ramp from the lowest to the highest (or the
// range given); a colour's name or #rrggbb is used as it is.
export function table(data, rampName = 'heat', range) {
  const nums = [];
  const entries = Array.isArray(data) ? data.map(r => r[2]) : Object.values(data || {});
  for (const v of entries) if (typeof v === 'number' && Number.isFinite(v)) nums.push(v);
  const lo = Array.isArray(range) ? Number(range[0]) : Math.min(...nums), hi = Array.isArray(range) ? Number(range[1]) : Math.max(...nums);
  const colour = v => (typeof v === 'number' ? rampAt(rampName, hi > lo ? (v - lo) / (hi - lo) : 1) : colourOf(v));
  const out = { countries: new Map(), bands: [] };
  if (Array.isArray(data)) {
    for (const r of data) if (Array.isArray(r) && r.length >= 3) out.bands.push({ geo: latBand(Math.min(r[0], r[1]), Math.max(r[0], r[1])), col: colour(r[2]) });
  } else {
    for (const [name, v] of Object.entries(data || {})) out.countries.set(name, colour(v));
  }
  return out;
}

