# Components and data sources for a no-build iPhone PWA learning app

Research date 2026-11-16. Tags: **[V]** = verified this session (source number in the list at the end); **[R]** = recalled from memory, unchecked. Sizes: "unpacked" is the full npm package (what you would NOT vendor); the file you actually vendor is far smaller. Minified/gzip figures marked [R] are approximate and should be measured when vendoring. Several sites blocked automated fetches (xeno-canto, iNaturalist docs and Openverse docs gave only headers), so API-terms rows are mostly [R].

General rule for all areas: vendor exact files with a version in the filename, load via `<script type="module">` or an import map, precache them in the service worker.

## 1. Globe and maps

| Option | Version / licence | Size | No-build form | iPhone notes | Gotchas |
|---|---|---|---|---|---|
| **d3-geo on canvas** (pick) | 3.1.2, ISC [V1]; npm unpacked 255 KB; ~12-15 KB min+gzip for the d3-geo ESM bundle [R] | tiny | `d3-geo` ships ESM; it imports `d3-array`, so vendor a one-file bundle (e.g. a pre-bundled `d3-geo.mjs`) or two files with an import map | Canvas 2D, orthographic projection, 60 fps for 110m/50m data on an iPhone 11 [R]; redraw only on interaction | Spin/drag needs versor rotation (about 40 lines, hand-write it). Antimeridian clipping is handled by d3. Hit-testing a country: `geoContains` or point-in-polygon on pointer position |
| d3-geo-projection (add only if needed) | 4.0.0, ISC [V2]; 465 KB unpacked | ~30 KB min [R] | ESM, depends on d3-geo, d3-array | n/a | Only needed for non-standard flat projections (Robinson, Natural Earth). Skip for v1 if orthographic + Mercator suffice |
| three-globe / globe.gl (runner-up) | three-globe 2.45.6, MIT [V3]; 26 MB unpacked (textures and data) | ~100 KB min plus three.js ~700 KB min [R] | three-globe has ESM but expects `three` via import map | WebGL; fine on A13 for modest data; arcs and points look good and are cheap | Pulls in all of three.js; styling is more "3D product" than flat vector; polygons from topojson are tessellated, so slow start on 50m |
| MapLibre GL globe | 6.18.0, BSD-3-Clause [V4]; 29 MB unpacked | ~1 MB min js [R] + CSS | UMD/ESM bundle is available | Heavy; wants a vector tile source | Overkill, needs tiles or style JSON; no |

**Data**

| Source | Detail |
|---|---|
| world-atlas | 2.0.2, ISC, "pre-built TopoJSON from Natural Earth", 8.2 MB unpacked for all files [V5]. Files: `countries-110m`, `countries-50m`, `land-*`; 10m also exists. `id` = ISO 3166-1 numeric, `properties.name` [V6]. Approx. sizes: 110m ~105 KB, 50m ~750 KB, 10m ~3.7 MB [R]. Based on Natural Earth 4.1.0 [V6]. Decode with `topojson-client` (~2 KB gz, ESM) |
| Natural Earth licence | Public domain, no credit or permission needed; some third-party layers (Washington Post base map, JRC rivers, etc.) carry notes; Wikidata name data is CC0 [V7] |
| Disputed borders | Natural Earth draws de facto lines (it has a separate "Admin 0 - Countries" vs. disputed-area layer); Kosovo, Western Sahara, Crimea, Taiwan appear with their own treatment or no ISO numeric id [R]. Decide a house policy and write it on a lesson. |
| Cities | Natural Earth "populated places" (simple, ~7,300 points at 10m, ~250 at 110m) as shapefile/GeoJSON from naturalearthdata.com; convert once to a small JSON (name, lat, lon, population) [R] |
| Level of detail | Ship 110m for the default globe, 50m for zoom >3x, swap at a zoom threshold; labels: sort by area/population, draw greedy with rectangle collision test on canvas. Hand-write |
| Day/night | Hand-write: solar declination and hour angle formulas (~30 lines), shade terminator polygon with `d3.geoCircle` of radius 90 deg around the antisolar point [R] |
| To-scale Earth/Sun | Pure maths on canvas; no library |
| Historical borders | `aourednik/historical-basemaps`: **GPL-3.0** repo, one GeoJSON per year, WGS84, "work in progress", per-border precision flag 1-3, polygons overlap in antiquity, settlement layer is only a draft [V8]. Quality is usable for a stylised look, not for accuracy. GPL applies to a derivative in a distributed app; for one private user it is not a problem, but cite it [R] |
| Hurricane tracks | IBTrACS (NOAA NCEI): public data, free CSV by basin, no key [R]; subset to a few storms and store as small JSON |
| Flight routes | OpenFlights `routes.dat`/`airports.dat`: Open Database Licence (ODbL) for the database [R]; data is old (around 2014), fine for arcs |
| Forest loss | Hansen/UMD/GLAD via Global Forest Watch: CC BY 4.0 [R]; raw tiles are large, so pre-aggregate by country/year to a table |

**Recommendation:** d3-geo on canvas with 110m + 50m topojson; hand-write versor drag, labels, terminator. Runner-up: three-globe if 3D relief look is wanted. Hand-writing wins for overlays because every animated layer is just a projected path or point.

## 2. Physics, fluids, n-body, circuits

| Option | Version / licence | Size | No-build form | iPhone notes | Gotchas |
|---|---|---|---|---|---|
| **matter.js** (pick for simple lessons) | 0.20.0, MIT [V9]; 905 KB unpacked | ~80 KB min, ~25 KB gz [R] | `matter.min.js` UMD, works with a script tag | Pure JS; hundreds of bodies OK at 60 fps [R] | Soft stacking jitter; slower to develop than 2020; maintenance is sparse |
| **planck.js** (pick if stacking, joints, determinism matter) | 1.5.1, MIT [V10]; 9.1 MB unpacked (includes typings and many builds) | ~200 KB min [R] | `planck.min.js` UMD; also ES builds | Box2D-faithful, stable stacking, joints; pure JS | Metres-scale units (0.1-10 m), not pixels |
| Rapier 2D wasm | `@dimforge/rapier2d-compat` 0.21.0, Apache-2.0 [V11]; 12 MB unpacked | wasm ~1.5 MB, "compat" inlines wasm as base64 [R] | ESM, async init | Fast; wasm fine on iOS | Largest bundle; only worth it for hundreds of bodies |
| Box2D v3 wasm | MIT [R]; ports exist but no stable no-build package I verified (gap) | n/a | n/a | n/a | Skip for v1 |

Fluids: hand-write. A grid shallow-water height-field (about 60 lines) and a simple PBF/SPH with spatial hash on canvas (a few hundred particles, ~150 lines) run fine on A13 [R]. LiquidFun ports are unmaintained; avoid.
N-body: hand-write velocity-Verlet/leapfrog (symplectic, energy-stable for orbits), fixed sub-steps; use RK4 only for short non-conservative demos; use softening for close encounters [R].
Circuits: circuitjs1 is GPL-2 and Java/GWT-derived, so do not vendor [R]. Hand-write modified nodal analysis (MNA): build matrix G for R, C, L (companion models, backward Euler), sources, diodes (Newton iteration), solve by Gaussian elimination; about 200 lines for DC + transient, fine for <30 nodes [R]. No small maintained JS solver found (gap).

**Recommendation:** planck.js for rigid bodies, matter.js as runner-up (simpler API); everything else hand-written.

## 3. Audio and music

| Option | Version / licence | Size | No-build form | iPhone notes | Gotchas |
|---|---|---|---|---|---|
| **Raw Web Audio + Karplus-Strong** (pick) | built in | 0 | n/a | Plucked string with delay line + lowpass: ~30 lines in an AudioWorklet or a pre-rendered AudioBuffer; instant, no sample download [R] | Pre-render notes into buffers at startup to avoid worklet quirks on Safari |
| Tone.js | 15.1.22, MIT [V12]; 5.4 MB unpacked | ~340 KB min [R] | ESM/UMD builds | Fine | Heavy for what a learning app needs; only for sequencing/transport |
| smplr | 1.2.0, MIT [V13]; 1.2 MB unpacked | ~30 KB lib [R]; samples fetched from a CDN by default | ESM | OK | Default samples load from remote hosts; you must download and rehost for offline, check each instrument's sample licence |
| soundfont-player / WebAudioFont | WebAudioFont repo is **GPL-3.0** (author offers other terms) [V14]; soundfont-player MIT [R] | WebAudioFont files are 100 KB-several MB per instrument [R] | script tags | Fine | GPL is a concern only if distributed; one personal user is ok but keep note |
| tonal.js | 6.6.0, MIT [V15]; 273 KB unpacked | modular; `@tonaljs/chord-detect` + deps ~20 KB gz [R] | ESM per-module; vendor a bundle (several packages) | n/a | Detects chord names from note sets via `Chord.detect` [R] |

iOS audio: the AudioContext starts suspended and must be resumed in a user gesture; the ringer switch silences Web Audio unless a media element has played (the old unlock hack: play a silent `<audio>` once) [R]. Output latency is about 20-40 ms on iPhone, so tap-to-sound feels ok; pre-decode buffers, do not decode on tap [R]. Home-screen PWAs get the same behaviour as Safari [R].

**Recommendation:** raw Web Audio with Karplus-Strong for guitar; tonal.js chord-detect for naming. Runner-up: smplr with rehosted piano samples.

## 4. Code and token scripting

| Option | Version / licence | Size | No-build form | iPhone notes | Gotchas |
|---|---|---|---|---|---|
| **Hand-built drag tokens** (pick for "token programs") | n/a | ~5 KB | pointer events | Touch fully controlled | You write the interpreter; for lesson-sized languages that is easier than Blockly |
| Blockly | 13.4.0, Apache-2.0 [V16]; 17.6 MB unpacked | ~700 KB-1 MB min [R] | UMD/ESM bundles in `blockly_compressed.js` | Works with touch but small targets, zoom/scroll fights Safari gestures [R] | Large, themes needed; use only if a lesson truly needs nested blocks |
| Pyodide | 314.0.8, MPL-2.0 [V17]; full dist "200+ MB", core is smaller [V18] | core runtime wasm ~10 MB and stdlib zip ~2-3 MB, so ~12 MB [R] | `pyodide.mjs` + wasm + `python_stdlib.zip` + `pyodide-lock.json` [V18] | iPhone 11 (4 GB RAM): boots in several seconds, memory pressure can kill the tab [R] | Version number is the new year-style scheme; verify before pinning |
| MicroPython wasm | MIT [R]; ~300 KB-1 MB wasm [R] | small | ESM | Starts quickly | Not full CPython; fine for lesson code |
| Skulpt / Brython | MIT / BSD [R]; ~1 MB each [R] | script tag | Slower, partial compatibility | Tolerable | Skulpt is simplest sandboxed option |
| Sandboxed JS/HTML | `<iframe sandbox="allow-scripts" srcdoc=...>` | 0 | built in | Works | Use postMessage for results; omit `allow-same-origin` |
| CodeMirror 6 | MIT [R] | ~150-300 KB min per bundle [R] | Needs a bundler to produce one file, since the CM6 packages are many small ESM modules with bare imports [R] | Mobile ok, keyboards cause layout jumps | A one-off bundle built on the PC and vendored is acceptable (the agent can build once); or use `<textarea>` with a hand-written highlighter |
| GLSL playgrounds | raw WebGL2 (0 KB) | 0 | built in | iOS 15+ supports WebGL2 [R]; use `highp` carefully; limit canvas to DPR 2 [R] | regl (~70 KB) and twgl (~15 KB) are optional helpers; raw is fine for a full-screen quad |

**Recommendation:** hand-built tokens + a tiny interpreter; MicroPython wasm or Skulpt for "real Python" lessons; avoid Pyodide for v1. Runner-up: Pyodide lazily loaded on one lesson, accepting ~12 MB cache.

## 5. Maths and charts

| Option | Version / licence | Size | No-build form | iPhone notes | Gotchas |
|---|---|---|---|---|---|
| **KaTeX** (pick) | 0.19.1, MIT [V19]; 4 MB unpacked incl. all fonts | js ~270 KB min / ~75 KB gz, CSS ~25 KB, fonts: ship woff2 only (~300 KB) [R] | ESM `katex.mjs` + CSS | Synchronous render, fast | CSS references `fonts/`; prune to woff2 and precache. Render ahead of time to HTML in lesson data if possible |
| MathJax | MIT/Apache [R]; v3/v4 ~1 MB with fonts [R] | heavy | Possible via single file | Slower | Not needed |
| **Hand-rolled canvas** for plots/geometry (pick) | n/a | few KB | n/a | Full control and touch dragging | Write `plot(fn, domain)` and draggable points yourself |
| JSXGraph | 1.14.3, (MIT OR LGPL-3.0+) [V20]; 75 MB unpacked | ~300 KB min core [R] | `jsxgraphcore.js` | OK | Mature interactive geometry; large and its own look |
| function-plot / Mafs | function-plot MIT [R]; Mafs needs React [R] | | | | Skip |
| uPlot | 1.6.32, MIT [V21]; 545 KB unpacked | ~50 KB min [R] | ESM `uPlot.esm.js` + CSS | Very fast | Time-series oriented, bare look |
| Observable Plot | 0.6.19, ISC [V22]; 1.7 MB unpacked | ~200 KB min with d3 [R] | ESM bundle published on CDNs | OK | Good flat style, but pulls d3 |
| Chart.js | MIT [R] | ~200 KB min [R] | UMD | OK | Not flat-friendly by default |

**Recommendation:** KaTeX + hand-rolled canvas/SVG charts and plots (a bar/line/scatter module is ~150 lines). Runner-up: JSXGraph for a lesson series that is heavy on geometry.

## 6. 3D

| Option | Version / licence | Size | No-build form | iPhone notes | Gotchas |
|---|---|---|---|---|---|
| **three.js** (pick) | 0.187.0, MIT [V23]; 21 MB unpacked | `three.module.min.js` ~700 KB, ~170 KB gz [R]; `three.core.min.js` plus `three.module.min.js` split since r17x [R] | ESM with an import map; add-ons from `examples/jsm` need rewriting of bare `three` imports, which the import map solves | WebGL2 on iPhone 11 fine; cap DPR at 2; max texture 4096 [R] | Import map must be set before module scripts; GLTFLoader and OrbitControls vendored separately |
| ogl | 1.0.11, Unlicense [V24]; 423 KB unpacked | ~30 KB min [R] | ESM | Light | Fewer features, no GLTF unless you add the loader |
| regl | MIT [R] | ~70 KB [R] | UMD | Light | Low-level |

Toon/flat shading: `MeshToonMaterial` with a 3-step gradient texture, plus an inverted-hull outline mesh; or `MeshBasicMaterial` with flat colours and edges via `EdgesGeometry` [R]. Molecules and anatomy: build from spheres/cylinders in code; pre-bake GLB for anatomy (check each model's licence).

## 7. Gestures and feel

| Item | Pick | Notes |
|---|---|---|
| Gestures | Hand-write with Pointer Events: track a `Map` of active pointers; pinch = distance ratio, long-press = timer + move threshold | Set `touch-action: none` on the canvas; add `-webkit-user-select:none`, `-webkit-touch-callout:none`. Libraries (Hammer.js, @use-gesture) are not worth it [R] |
| Haptics | Hidden `<input type="checkbox" switch>` toggled via its label on a user gesture (the hidden-switch trick) | Works from iOS 17.4/18 up; one library claims Apple patched it in iOS 26.5, unconfirmed [V25]. `navigator.vibrate` is not implemented in iOS Safari [V25]. Wrap in feature detection; treat haptics as optional |
| UI sounds | Kenney.nl Interface Sounds / UI Audio, CC0 [R] | Convert to small m4a/mp3 |
| Confetti | Hand-write ~40 lines on a canvas; `canvas-confetti` (ISC, ~10 KB gz) [R] as runner-up | |
| Springs | Hand-write a damped spring integrator (10 lines) | |

## 8. Spaced repetition

| Option | Version / licence | Size | No-build form | Notes |
|---|---|---|---|---|
| **ts-fsrs** (pick) | 6.0.0, MIT [V26]; 861 KB unpacked, ESM `dist/index.mjs`, exports for FSRS-3 to 7 models [V26] | the core ESM is ~30-40 KB min [R] | `dist/index.mjs` loads directly | Vendor just `index.mjs`; it has no runtime dependencies [R] |
| SM-2 hand-written | public algorithm | ~30 lines | n/a | Fixed ease factor logic |

Modelling: each item is a card with stability (days to 90 % recall), difficulty, retrievability, state, due date; four grades Again/Hard/Good/Easy; `scheduler.repeat(card, now)` gives the four possible next states [R]. Target retention default 0.9. With a small personal deck (<500 cards, <1 yr history), the default FSRS parameters are used (no optimisation, which needs about 1,000 reviews) and still generally beat SM-2 on workload for equal retention, mostly through the forgetting curve and difficulty tracking [R]. Store the card JSON in IndexedDB.

## 9. Free media and facts APIs

| Source | Licence of content | Key? | Rate limits / notes |
|---|---|---|---|
| Wikimedia Commons API (`commons.wikimedia.org/w/api.php`, `extmetadata`) | Per file (CC0/PD/CC BY/CC BY-SA); `extmetadata` returns License, Artist, Credit for attribution [R] | No; set a descriptive User-Agent/Api-User-Agent [R] | Polite use; about 200 req/s anonymous soft limit [R] |
| Openverse API | Aggregated CC/PD with licence and attribution fields [R] | Anonymous works at low limits; registered OAuth gives higher [V27 header only, details R] | Anonymous roughly 20/min, 200/day [R] |
| iNaturalist API v1 | Per-photo licence; many CC BY-NC or all rights reserved; filter `photo_license=cc0,cc-by` [R] | No for reads | About 60 req/min, 10,000/day, and they ask for one request per second [R]; docs page has throttling and licensing sections but text was not retrievable [V28] |
| eBird API / Macaulay Library | eBird API needs a free key and terms prohibit redistribution; Macaulay media is rights-reserved (copyright held by contributors) [R] | Key | Link out, do not vendor |
| xeno-canto API v3 | Recordings CC BY / CC BY-NC(-SA) etc. per recording [R] | v3 needs an API key [R] | Fetch blocked this session (gap) |
| PhyloPic API v2 | Silhouettes CC0, CC BY, CC BY-SA, some NC [R] | No | Query returns licence and attribution fields [R] |
| NASA Images (images-api.nasa.gov) | Mostly public domain (check per item; some partner images restricted) [R] | No | Generous |
| Wikidata / Wikipedia REST | Wikidata CC0; Wikipedia text CC BY-SA [R] | No | Polite use, set a User-Agent |
| REST Countries | Data MPL-2.0 [R] | No | Rarely changes; snapshot once |
| flag-icons (lipis) | 7.6.0, MIT [V29]; 4 MB unpacked, 1x1 and 4x3 SVG | ~270 flags, about 1.5 MB for a set [R] | Check coverage of recent changes; pick only the flags needed |
| Library of Congress maps | Mostly public domain, check rights notes per item [R] | No | Good for historical map images |

Practical rule: for lessons, download once on the PC at authoring time, store the licence and attribution text next to each file, and never hit these APIs from the phone.

## 10. iOS home-screen PWA storage (2026)

| Topic | Finding |
|---|---|
| Quota | WebKit: a home-screen web app has the same origin quota and overall quota as in a browser app: up to 60 % of disk for origin and 80 % overall, versus 15 % and 20 % for other apps [V30]. On a 64 GB iPhone 11 that is tens of GB of theoretical room |
| Eviction | The WebKit post names no 7-day rule; it says unused origins can be evicted "for some time" under ITP [V30]. The older 7-day cap on script-writable storage applies to Safari browsing; home-screen apps are not subject to it [R, from earlier WebKit ITP post, not rechecked]. Data can also be cleared by the user or by low-disk pressure [R] |
| persist() | `navigator.storage.persist()` exists; WebKit decides by heuristics, one factor being whether the site is a home-screen web app, so calling it on first launch is worthwhile [V30] |
| Practical cap | Hundreds of MB of audio and assets is fine in Cache Storage; keep each file under ~50 MB, install in batches, show progress. Avoid Pyodide-sized blobs unless needed [R] |
| Gotcha | The service worker can be killed; keep lesson data in Cache Storage plus a small IndexedDB mirror of progress, and offer an export-progress button as a backup [R] |

## Vendor list for version 1

| File | Approx. size (min) |
|---|---|
| d3-geo bundled ESM (with d3-array) | ~35 KB |
| topojson-client ESM | ~6 KB |
| `countries-110m.json` + `countries-50m.json` | ~0.85 MB |
| populated places JSON (trimmed) | ~0.1 MB |
| planck.js (one build) | ~0.2 MB |
| matter.js (optional) | ~0.08 MB |
| tonal chord-detect bundle | ~0.07 MB |
| KaTeX js + css + woff2 fonts | ~0.65 MB |
| ts-fsrs `index.mjs` | ~0.04 MB |
| three.module.min.js (+ core), only when a 3D lesson ships | ~0.7 MB |
| flag SVGs (selected) | ~0.3 MB |
| Kenney UI sounds (selected) | ~0.5 MB |
| Hand-written (no vendor): versor, labels, terminator, gestures, Karplus-Strong, MNA circuits, SPH, confetti, springs, drag tokens | 0 |
| **Total** | **~3.5 MB** (about 2.8 MB without three.js and matter.js) |

## Open risks

1. Haptic switch trick is a side effect that may already be patched on current iOS; treat as optional and test on the device.
2. Natural Earth borders and disputed areas: decide a policy; numeric ISO ids are missing for a few entities.
3. GPL-licensed data/code (historical-basemaps, WebAudioFont): fine for one private user, but a blocker if the app is ever shared.
4. KaTeX and three.js need exact file sets (fonts, add-on import rewriting); the no-bundler constraint makes CodeMirror 6 the hardest to vendor.
5. Pyodide memory/startup on iPhone 11 is unmeasured here; avoid for v1.
6. Several API terms (xeno-canto v3 key, iNaturalist limits, Openverse limits, eBird) are recalled, not verified; re-check before pulling bulk data.
7. Storage eviction rules for home-screen apps are only partly documented; keep an export-progress backup.
8. Minified/gzip sizes marked [R] are estimates; measure when vendoring.

## Sources

1. https://registry.npmjs.org/d3-geo/latest
2. https://registry.npmjs.org/d3-geo-projection/latest
3. https://registry.npmjs.org/three-globe/latest
4. https://registry.npmjs.org/maplibre-gl/latest
5. https://registry.npmjs.org/world-atlas/latest
6. https://github.com/topojson/world-atlas
7. https://www.naturalearthdata.com/about/terms-of-use/
8. https://github.com/aourednik/historical-basemaps
9. https://registry.npmjs.org/matter-js/latest
10. https://registry.npmjs.org/planck/latest
11. https://registry.npmjs.org/@dimforge/rapier2d-compat/latest
12. https://registry.npmjs.org/tone/latest
13. https://registry.npmjs.org/smplr/latest
14. https://github.com/surikov/webaudiofont
15. https://registry.npmjs.org/tonal/latest
16. https://registry.npmjs.org/blockly/latest
17. https://registry.npmjs.org/pyodide/latest
18. https://pyodide.org/en/stable/usage/downloading-and-deploying.html
19. https://registry.npmjs.org/katex/latest
20. https://registry.npmjs.org/jsxgraph/latest
21. https://registry.npmjs.org/uplot/latest
22. https://registry.npmjs.org/@observablehq/plot/latest
23. https://registry.npmjs.org/three/latest
24. https://registry.npmjs.org/ogl/latest
25. Web search results on the iOS haptics switch trick (ios-haptics README, WebKit bug 285120, Ionic issue 29942)
26. https://registry.npmjs.org/ts-fsrs/latest
27. https://api.openverse.org/v1/ (header only)
28. https://api.inaturalist.org/v1/docs/ (header only)
29. https://registry.npmjs.org/flag-icons/latest
30. https://webkit.org/blog/14403/updates-to-storage-policy/

Blocked or unread: xeno-canto API page (access denied), iNaturalist and Openverse docs (headers only). Not opened: IBTrACS, OpenFlights, Global Forest Watch, PhyloPic, eBird, NASA, Wikimedia, Kenney, Blockly mobile, FSRS vs SM-2 benchmarks.
