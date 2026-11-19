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
// The camera moves softly: every turn, zoom and change of angle is a glide (js/ease.js, Glide) that eases
// in and out with no overshoot, and a new move begun mid-glide carries on from the speed it had, so a
// scene can chain moves without a jolt. In a scene (ctx.motion 'soft') things also arrive and leave softly.
//
// mount(el, settings, ctx) -> { calls, state, on, remove, where, busy, finish, debug }.

import { geoPath, geoInterpolate, geoDistance } from 'd3-geo';
import { loadWorld, countryAt } from './world.js';
import { makeView, SPHERE } from './views.js';
import { LAYERS, mirroredBand, latBand, makeRoute, progressOf, headOf, parallel, makeSpiral } from './layers.js';
import { STYLE, colourOf, rampAt } from './look.js';
import { Glide } from '../../js/ease.js';

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const inOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const ZOOM_MAX = 8;
const DEG = 180 / Math.PI;
const wrapLon = d => ((((d + 180) % 360) + 360) % 360) - 180;
// One step of a critically damped glide of `x` toward 0 (smooth: about how long it takes, in seconds).
function damp(x, v, smooth, dt) {
  const omega = 2 / Math.max(1e-3, smooth), k = omega * dt, e = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
  const temp = (v + omega * x) * dt;
  return [(x + temp) * e, (v - omega * temp) * e];
}

export async function mount(el, settings, ctx = {}) {
  const W = await loadWorld();
  const S = settings;
  const feel = ctx.feel || { sound() {}, tick() {} };
  const soft = ctx.motion === 'soft';
  let style = STYLE[S.style] || STYLE.day, styleName = STYLE[S.style] ? S.style : 'day';
  // a change of style fades the old map into the new: the old one is drawn too while it does (style)
  let oldStyle = null;
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
  const oldBase = document.createElement('canvas');
  const og = oldBase.getContext('2d');
  // How far down the picture is clear of the status bar in a scene (its --top): where a key sits.
  const topProbe = document.createElement('div');
  topProbe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:var(--top, 0px);visibility:hidden;pointer-events:none';
  el.append(topProbe);
  let safeTop = 0;

  // ---- the camera, shared by every view: where it faces, how close, and (on a globe) its angle
  let w = 0, h = 0, dpr = 1;
  let centre = Array.isArray(S.view) ? [Number(S.view[0]) || 0, Number(S.view[1]) || 0] : [-40, 15];
  let zoom = Math.max(1, Math.min(ZOOM_MAX, Number(S.zoom) || 1));
  const tilt = new Glide(0), heading = new Glide(0), zoomG = new Glide(zoom), drift = new Glide(0);
  let vel = [0, 0], dragging = false, pinching = null, touchedAt = 0, turn = null, zoomAnim = null, follow = null;
  let camVel = [0, 0], lastCentre = centre.slice();
  const set = (now = performance.now()) => view.set(w, h, centre, zoom, tilt.at(now), heading.at(now));

  // ---- what's on the map: everything a call adds, read by the layers
  const m = { highlights: new Map(), bands: [], table: null, points: [], markers: [], routes: [], spirals: [], labels: new Map(), parallels: [], pin: null, selected: null, selectedAt: 0, grow: new Glide(1), key: null };
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
    // its layout size, not its box on screen: a scene's shot can be moving it with a transform just then
    w = Math.max(10, el.clientWidth || el.getBoundingClientRect().width); h = Math.max(10, el.clientHeight || el.getBoundingClientRect().height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [canvas, base, oldBase]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    safeTop = topProbe.offsetHeight || 0;
    set();
    centre = view.clamp(centre, zoom);
    baseKey = '';
    wake();
  }

  // ---- the draw context the layers draw from (see layers.js)
  let shapes = new Map(), shapeKey = '';
  const d = {
    c: null, view, W, S, m, style, memo, k: 1, now: 0, dt: 16, soft, safeTop: 0, styleName,
    // a shape, projected once for this view and shared by every layer that draws it
    shape(geo) {
      let p = shapes.get(geo);
      if (!p) { p = new Path2D(); geoPath(view.proj, p)(geo); shapes.set(geo, p); }
      return p;
    },
    // a path drawer onto any canvas path, for shapes that change every frame (a growing route)
    pathTo: target => geoPath(view.proj, target),
  };
  const viewKey = () => `${view.kind},${centre[0].toFixed(3)},${centre[1].toFixed(3)},${zoom.toFixed(4)},${(view.lift || 0).toFixed(2)},${(view.heading || 0).toFixed(3)},${w},${h}`;
  function ready(c, now, dt) {
    const key = viewKey();
    if (key !== shapeKey) { shapes = new Map(); shapeKey = key; }
    d.c = c; d.now = now; d.dt = dt;
    d.k = Math.sqrt(view.size);
    d.box = view.box;
    d.style = style;
    d.styleName = styleName;
    d.safeTop = safeTop;
  }

  // Base things fading in (in a scene) or out (after a clear): the map itself is redrawn while they do.
  const baseItems = () => [...m.bands, ...m.highlights.values(), ...m.parallels, ...(m.table ? [m.table] : [])];
  const fadingBase = now => baseItems().some(it => (it.out && now < it.out.t0 + it.out.ms + 20) || (soft && it.born !== undefined && now - it.born < 540));

  // ---- the map itself, on its own picture
  function drawBase(now) {
    const key = `${viewKey()},${contents},${m.selected},${styleName}`;
    if (key === baseKey) return;
    baseKey = key;
    redraws++;
    const t0 = performance.now();
    paintBase(bg, now);
    // while a change of style fades, the old style's map is drawn too, at the same view
    if (oldStyle) {
      const keep = [style, styleName];
      [style, styleName] = [oldStyle.style, oldStyle.name];
      paintBase(og, now);
      [style, styleName] = keep;
    }
    baseMs = performance.now() - t0;
  }
  function paintBase(cg, now) {
    ready(cg, now, 16);
    cg.setTransform(dpr, 0, 0, dpr, 0, 0);
    cg.clearRect(0, 0, w, h);
    let clipped = false;
    for (const layer of LAYERS) {
      if (!layer.base) continue;
      if (layer.clip && !clipped) { cg.save(); cg.clip(d.shape(SPHERE)); clipped = true; }
      if (!layer.clip && clipped) { cg.restore(); clipped = false; }
      layer.draw(d);
    }
    if (clipped) cg.restore();
  }

  // Things sent away by a clear go once they've faded.
  function prune(now) {
    const done = it => it.out && now >= it.out.t0 + it.out.ms;
    let base = false;
    for (const key of ['points', 'markers', 'routes', 'spirals', 'bands', 'parallels']) {
      const before = m[key].length;
      m[key] = m[key].filter(it => !done(it));
      if (key === 'bands' || key === 'parallels') base = base || m[key].length !== before;
    }
    for (const [k, it] of m.highlights) if (done(it)) { m.highlights.delete(k); base = true; }
    for (const [k, it] of m.labels) if (done(it)) m.labels.delete(k);
    if (m.table && done(m.table)) { m.table = null; base = true; }
    if (m.key && done(m.key)) m.key = null;
    if (base) contents++;
  }

  // The newest route with something riding it, or failing that the newest route: what `follow` watches.
  const followed = () => [...m.routes].reverse().find(r => !r.out && r.rider && r.rider !== 'none') || [...m.routes].reverse().find(r => !r.out) || null;

  function frame(now) {
    raf = 0;
    if (gone) return;
    // put away by a scene's shot: nothing is drawn, but it keeps time, so it's right the moment it shows
    if (hidden()) { last = 0; baseKey = ''; raf = requestAnimationFrame(frame); return; }
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    frames++;
    let moving = false, done = false;
    if (turn) {
      centre = turn.path(turn.g.at(now));
      if (!turn.g.moving(now)) { centre = turn.path(1); turn = null; done = true; }
      moving = true;
    }
    if (zoomG.moving(now)) { zoom = zoomG.at(now); moving = true; if (!zoomG.moving(now + 1)) done = true; }
    else if (zoomG.ms && zoom !== zoomG.to && !zoomAnim && !pinching) { zoom = zoomG.to; zoomG.ms = 0; done = true; }
    if (zoomAnim) {
      const k = clamp01((now - zoomAnim.t0) / zoomAnim.ms);
      zoom = zoomAnim.from + (zoomAnim.to - zoomAnim.from) * inOut(k);
      if (zoomAnim.focus) keepUnder(zoomAnim.focus.at, zoomAnim.focus.x, zoomAnim.focus.y);
      if (k >= 1) { zoom = zoomAnim.to; zoomAnim = null; zoomG.go(zoom, 0, now); done = true; }
      moving = true;
    }
    if (tilt.moving(now) || heading.moving(now)) moving = true;
    // following a track's head: the camera keeps the storm in the middle, catching up softly (a critically
    // damped glide: it sets off from the speed the camera had, eases into the chase and never overshoots)
    if (follow && !turn && !dragging && !pinching) {
      const rt = followed();
      if (rt) {
        const at = headOf(rt, progressOf(rt, now));
        if (follow.ms <= 0) { centre = at.slice(); follow.vel = [0, 0]; }
        else {
          const smooth = follow.ms / 2000, s = dt / 1000;
          const [dx, vx] = damp(wrapLon(centre[0] - at[0]), follow.vel[0], smooth, s);
          const [dy, vy] = damp(centre[1] - at[1], follow.vel[1], smooth, s);
          centre = [at[0] + dx, at[1] + dy];
          follow.vel = [vx, vy];
        }
        if (geoDistance(centre, at) > 1e-5 || rt.g.moving(now)) moving = true;
      }
    }
    const spinning = drift.at(now);
    if (!turn && !follow && !dragging && !pinching && Math.abs(spinning) > 1e-4) {
      // the Earth turning by itself (drift): positive is the Earth's own way, west to east
      centre = [centre[0] - (spinning * dt) / 1000, centre[1]];
      moving = true;
    } else if (drift.moving(now)) moving = true;
    if (!turn && !dragging && !pinching && (Math.abs(vel[0]) > 0.005 || Math.abs(vel[1]) > 0.005)) {
      // a flick carrying on
      set(now);
      centre = view.pan(centre, vel[0] * dt, vel[1] * dt);
      const f = Math.exp(-dt / 380);
      vel = [vel[0] * f, vel[1] * f];
      if (Math.abs(vel[0]) <= 0.005 && Math.abs(vel[1]) <= 0.005) { vel = [0, 0]; done = true; }
      moving = true;
    } else if (S.spin === 'auto' && !turn && !dragging && !pinching && now - touchedAt > 2500) {
      centre = [centre[0] + 0.006 * dt, centre[1]];
      moving = true;
    }
    set(now);
    centre = view.clamp(centre, zoom);
    set(now);
    // how fast the camera is going (degrees a second), for a follow begun mid-move to carry on from
    camVel = [wrapLon(centre[0] - lastCentre[0]) / (dt / 1000), (centre[1] - lastCentre[1]) / (dt / 1000)];
    lastCentre = centre.slice();
    const lifting = m.selected && now - m.selectedAt < 500;
    const fading = fadingBase(now);
    if (lifting || fading) baseKey = '';
    drawBase(now);
    ready(g, now, dt);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.drawImage(base, 0, 0, w, h);
    let wants = false;
    if (oldStyle) {
      const k = clamp01((now - oldStyle.t0) / oldStyle.ms);
      if (k >= 1) oldStyle = null;
      else { g.globalAlpha = 1 - k * k * (3 - 2 * k); g.drawImage(oldBase, 0, 0, w, h); g.globalAlpha = 1; wants = true; }
    }
    for (const layer of LAYERS) if (!layer.base && layer.draw(d)) wants = true;
    prune(now);
    if (done && !turn && !zoomAnim && !zoomG.moving(now)) settled();
    if (moving || dragging || pinching || wants || lifting || fading) wake();
    else last = 0;
  }
  function wake() { if (!raf && !gone) raf = requestAnimationFrame(frame); }
  const hidden = () => !!canvas.closest('[data-off]');

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
  const stopAll = () => { vel = [0, 0]; turn = null; zoomAnim = null; zoomG.go(zoom, 0, performance.now()); drift.go(0, 0, 0); follow = null; };
  const stop = ctx.track(canvas, {
    start: () => { touchedAt = performance.now(); stopAll(); set(); grab = { c: centre.slice() }; },
    move: ({ dx, dy }) => {
      if (!fingersMove || !grab) return;
      dragging = true;
      touchedAt = performance.now();
      view.set(w, h, grab.c, zoom, tilt.at(touchedAt), heading.at(touchedAt));
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
      zoomG.go(zoom, 0, performance.now());
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

  // A place: [lon, lat], a country's name (its middle), or a named ocean, sea or continent (places.json).
  const placeOf = place => {
    if (Array.isArray(place)) return [Number(place[0]), Number(place[1])];
    const c = W.byName.get(place);
    if (c) return c.labelAt;
    const p = W.places.get(place);
    return p ? p.at[0] : null;
  };

  // A turn to `target`, carrying on from the speed of any turn under way (so chained moves never jolt).
  function turnTo(target, ms, now) {
    const was = turn ? turn.g.speed(now) * turn.len : 0;   // radians a millisecond
    const path = view.between(centre.slice(), target), len = Math.max(1e-6, view.round ? geoDistance(centre, target) : Math.hypot(target[0] - centre[0], target[1] - centre[1]) / DEG);
    turn = { path, len, g: new Glide(0) };
    turn.g.v0 = 0;
    turn.g.go(1, ms, now);
    turn.g.v0 = Math.min(was / len, 2.5 / ms);
  }
  // Everything else moves softly too: a move under way when the next is asked for carries on into it.
  const ms = s => Math.max(0, Number(s) * 1000);

  const ro = new ResizeObserver(() => size());
  ro.observe(el);
  size();
  if (document.fonts && document.fonts.load) document.fonts.load('800 13px "Nunito"').then(wake, () => {});

  const out = (t0, s) => ({ t0, ms: Math.max(1, s) });

  return {
    calls: {
      spinTo(place, seconds = 1.2) {
        const to = placeOf(place), now = performance.now();
        if (!to) return;
        const target = view.clamp(to, zoom);
        follow = null;
        if (!(ms(seconds) > 0)) { centre = target; turn = null; set(now); settled(); wake(); return; }
        turnTo(target, ms(seconds), now);
        vel = [0, 0];
        wake();
      },
      zoomTo(to, seconds = 1) {
        const now = performance.now(), t = ms(seconds);
        let level = Number(to), place = null;
        if (typeof to !== 'number') {
          place = placeOf(to);
          if (!place) return;
          level = Array.isArray(to) || W.places.has(to) ? 3 : fitLevel(W.byName.get(to));
        }
        level = Math.max(1, Math.min(ZOOM_MAX, level));
        if (place) follow = null;
        if (!(t > 0)) {
          zoom = level; zoomG.go(level, 0, now); zoomAnim = null;
          if (place) { set(now); centre = view.clamp(place, zoom); turn = null; }
          settled();
          wake();
          return;
        }
        if (place) turnTo(view.clamp(place, level), t, now);
        zoomAnim = null;
        zoomG.go(level, t, now);
        vel = [0, 0];
        wake();
      },
      // One camera move: where it faces, how close, its angle and its heading, all on one glide. A globe's
      // tilt (0 straight down to 1, the horizon across the top) shows a place from low down with the world
      // curving away; a flat map has no angle and ignores them.
      camera(place, level, angle = 0, turnBy = 0, seconds = 1.6) {
        const now = performance.now(), t = ms(seconds);
        const to = placeOf(place);
        if (!to) return;
        level = Math.max(1, Math.min(ZOOM_MAX, Number(level) || zoom));
        follow = null;
        zoomAnim = null;
        zoomG.go(level, t, now);
        tilt.go(clamp01(Number(angle) || 0), t, now);
        heading.go(Number(turnBy) || 0, t, now);
        if (!(t > 0)) { zoom = level; centre = view.clamp(to, level); turn = null; set(now); settled(); wake(); return; }
        turnTo(view.clamp(to, level), t, now);
        vel = [0, 0];
        wake();
      },
      // The camera keeps the newest track's head (the storm riding it) in the middle, catching up over about
      // `seconds`. Off: it stays where it is. Any other camera move ends it.
      follow(on = true, seconds = 1) {
        follow = on === false ? null : { ms: ms(seconds), vel: turn ? camVel.slice() : [0, 0] };
        if (follow) turn = null;
        wake();
      },
      // The Earth turning by itself, degrees a second (west to east when positive); it eases to that speed.
      drift(speed = 6, seconds = 1) {
        drift.go(Number(speed) || 0, ms(seconds), performance.now());
        wake();
      },
      // A storm's size: every hurricane on the map, marker or riding a track, glides to this size (1 as drawn).
      grow(scale = 1, seconds = 1) {
        m.grow.go(Math.max(0.1, Number(scale) || 1), ms(seconds), performance.now());
        wake();
      },
      // Writes a place's name on the map: an ocean, a sea, a continent (places.json) or a country. Off takes
      // it away, fading.
      label(name, on = true) {
        const now = performance.now();
        if (on === false) { const L = m.labels.get(name); if (L && !L.out) L.out = out(now, 450); wake(); return; }
        const p = W.places.get(name), c = W.byName.get(name);
        if (!p && !c) return;
        const old = m.labels.get(name);
        if (old && !old.out) return;
        m.labels.set(name, { kind: p ? p.kind : 'country', anchors: p ? p.at.map(a => [a[0], a[1]]) : [c.labelAt], born: now, at: null });
        wake();
      },
      // A dotted line along a latitude (south negative), with its name if given: the equator, a tropic.
      parallel(lat, label) {
        m.parallels.push({ lat: Number(lat), label, geo: parallel(Number(lat)), born: performance.now() });
        changed();
      },
      highlight(countries, colour) { for (const n of [].concat(countries || [])) m.highlights.set(n, { col: colourOf(colour), born: performance.now() }); changed(); },
      colourBy(data, rampName = 'heat', range) { m.table = { ...table(data, rampName, range), born: performance.now() }; changed(); },
      band(from, to, colour) {
        // its shapes are made once here, never on a frame
        m.bands.push({ ...mirroredBand(Math.min(from, to), Math.max(from, to), colourOf(colour)), born: performance.now() });
        changed();
      },
      point(place, label) { const at = placeOf(place); if (at) m.points.push({ at, label, born: performance.now() }); wake(); },
      marker(place, kind = 'ring', label) { const at = placeOf(place); if (at) m.markers.push({ at, kind, label, t0: performance.now() }); wake(); },
      // label: its name beside its middle ("" for none). line: "dotted" draws it as dots, the way something
      // was aimed, beside the way it went.
      arc(from, to, colour, label, line = 'solid') {
        const a = placeOf(from), b = placeOf(to);
        if (a && b) m.routes.push(Object.assign(makeRoute([a, b], { col: colourOf(colour), progress: 1, from: 0, seconds: soft ? 1.2 : 0.9, now: performance.now(), kind: 'arc' }), { label: label || '', dotted: line === 'dotted' }));
        wake();
      },
      // An arrow along a smooth path through places, drawing itself in over `seconds`: a wind, a current, air
      // being bent. Cyan unless told.
      flow(path, colour = 'cyan', seconds = 1.4, label) {
        const places = [].concat(path || []).map(placeOf).filter(Boolean);
        if (places.length < 2) return;
        const t = Number(seconds) || 0;
        m.routes.push(Object.assign(makeRoute(places, { col: colourOf(colour), progress: 1, from: t > 0 ? 0 : 1, seconds: t, now: performance.now(), kind: 'flow' }), { label: label || '' }));
        wake();
      },
      // Air rushing in toward a place from four sides, aimed at it (bend 0) or bent by the Earth's turning
      // until it swirls round it (1). Called again at the same place, the bend glides there.
      spiral(place, bend = 1, seconds = 1.4, size = 9) {
        const at = placeOf(place);
        if (!at) return;
        const now = performance.now(), t = ms(seconds), b = clamp01(Number(bend));
        const old = m.spirals.find(s => !s.out && Math.abs(s.at[0] - at[0]) < 1e-6 && Math.abs(s.at[1] - at[1]) < 1e-6);
        if (old) old.bend.go(b, t, now);
        else m.spirals.push(makeSpiral(at, { bend: b, size: Math.max(2, Number(size) || 9), seconds: t / 1000, now }));
        wake();
      },
      // The map's style, the old one fading into the new.
      style(name, seconds = 1) {
        if (!STYLE[name] || name === styleName) return;
        const t = ms(seconds), now = performance.now();
        oldStyle = t > 0 ? { style, name: styleName, t0: now, ms: t } : null;
        style = STYLE[name];
        styleName = name;
        changed();
      },
      // A key to the style's colours along the top (warmth has one).
      key(on = true) {
        const now = performance.now();
        if (on === false) { if (m.key && !m.key.out) m.key.out = out(now, 450); wake(); return; }
        if (!m.key || m.key.out) m.key = { born: now };
        wake();
      },
      // A path drawn as far as `progress` (0..1), with something riding its head. Called again with the
      // same path, it moves that track on (gliding there over `seconds`, carrying on from the speed it had),
      // so a scene can drive one storm along by steps without it ever stopping short.
      track(path, progress = 1, rider = 'none', seconds = 0) {
        const places = [].concat(path || []).map(placeOf).filter(Boolean);
        if (places.length < 2) return;
        const key = JSON.stringify(places), now = performance.now();
        const old = m.routes.find(r => r.key === key && !r.out);
        const p = clamp01(Number(progress));
        if (old) {
          old.g.go(p, ms(seconds), now);
          old.rider = rider;
        } else {
          const rt = makeRoute(places, { col: '#ffffff', rider, progress: p, from: ms(seconds) > 0 ? 0 : p, seconds: Number(seconds) || 0, now });
          rt.key = key;
          m.routes.push(rt);
        }
        wake();
      },
      // Takes everything away. Over `seconds` (in a scene, half a second unless told) it all fades out.
      // what: one kind only (flows, arcs, tracks, spirals, points, markers, labels, bands, parallels), or all.
      clear(seconds, what = 'all') {
        const now = performance.now(), t = ms(seconds === undefined || seconds === null ? (soft ? 0.5 : 0) : seconds);
        const ROUTE = { flows: 'flow', arcs: 'arc', tracks: 'track' };
        let items;
        if (!what || what === 'all') {
          m.pin = null; m.selected = null;
          items = [...baseItems(), ...m.points, ...m.markers, ...m.routes, ...m.spirals, ...m.labels.values(), ...(m.key ? [m.key] : [])];
        } else if (ROUTE[what]) items = m.routes.filter(r => r.kind === ROUTE[what]);
        else if (what === 'labels') items = [...m.labels.values()];
        else items = Array.isArray(m[what]) ? m[what] : [];
        if (!(t > 0)) for (const it of items) it.out = out(now - 2, 1);
        else for (const it of items) if (!it.out) it.out = out(now, t);
        if (!(t > 0)) prune(now);
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
    // Everything under way lands at once: the camera arrives, things finish arriving, faded things go. A
    // scene calls it after rebuilding the picture at a moment (seeking), so nothing animates in that was
    // already there.
    finish() {
      const now = performance.now(), past = now - 60000;
      if (turn) { centre = turn.path(1); turn = null; }
      for (const gl of [zoomG, tilt, heading, drift, m.grow]) gl.go(gl.to, 0, now);
      zoom = zoomG.to;
      if (zoomAnim) { zoom = zoomAnim.to; zoomAnim = null; }
      for (const rt of m.routes) { rt.g.go(rt.g.to, 0, now); rt.born = past; }
      for (const sp of m.spirals) { sp.bend.go(sp.bend.to, 0, now); sp.draw.go(sp.draw.to, 0, now); sp.born = past; }
      if (m.key) m.key.born = past;
      oldStyle = null;
      for (const it of [...baseItems(), ...m.points, ...m.labels.values()]) it.born = past;
      for (const mk of m.markers) mk.t0 = past;
      prune(now + 1e9);
      if (follow) { const rt = followed(); if (rt) { centre = headOf(rt, progressOf(rt, now)); follow.vel = [0, 0]; } }
      contents++;
      baseKey = '';
      wake();
    },
    // For the tests: the names showing and how visible each is, the four-colour clashes, how many times the
    // map itself has been redrawn and how long the last took, and the projection.
    debug: () => ({ labels: [...(memo.shownNames || new Map())].map(([name, st]) => ({ name, a: st.a, on: st.on })), clashes: W.clashes, redraws, baseMs, frames, projection: view.kind,
      routes: m.routes.map(r => ({ legs: r.places.length - 1, points: r.pts.length, progress: progressOf(r, performance.now()), rider: r.rider, kind: r.kind, fading: !!r.out, bend: sharpest(r.pts) })), table: !!m.table,
      named: [...m.labels].map(([name, L]) => ({ name, kind: L.kind, at: L.at, fading: !!L.out })), parallels: m.parallels.map(p => p.lat),
      spirals: m.spirals.map(s => ({ at: s.at, bend: s.bend.at(performance.now()), fading: !!s.out })), style: styleName, key: !!(m.key && !m.key.out),
      camera: { centre: roundC(), zoom: roundZ(), tilt: tilt.at(performance.now()), heading: heading.at(performance.now()), following: !!follow, drift: drift.at(performance.now()), moving: !!turn || zoomG.moving(performance.now()) },
      grow: m.grow.at(performance.now()), soft }),
    remove() {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      stop();
      for (const k of Object.keys(fns)) fns[k].clear();
      canvas.remove();
      topProbe.remove();
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

// The sharpest turn along a line of close points, in degrees: how cornered a route is (for the tests).
function sharpest(pts) {
  let most = 0;
  for (let i = 1; i + 1 < pts.length; i++) {
    const k = Math.cos((pts[i][1] * Math.PI) / 180);
    const a = [(pts[i][0] - pts[i - 1][0]) * k, pts[i][1] - pts[i - 1][1]], b = [(pts[i + 1][0] - pts[i][0]) * k, pts[i + 1][1] - pts[i][1]];
    const la = Math.hypot(...a), lb = Math.hypot(...b);
    if (la < 1e-9 || lb < 1e-9) continue;
    most = Math.max(most, (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))) * 180) / Math.PI);
  }
  return Math.round(most * 100) / 100;
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
