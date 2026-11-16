# The "obliterate" skill: what it is and how to use the idea

Researched 2026-11-16. Each claim is marked **[V]** verified (source opened today, see Sources) or **[R]** recalled from memory, not checked. Pages were read through a summarising fetcher, so quoted code is as that tool reported it.

## 1. The match

No skill called "obliterate" or "obliterator" builds take-apart models. The thing described is almost certainly **teardown**.

| Rank | Candidate | Confidence | Why |
|---|---|---|---|
| 1 | **teardown** by `elvarofficial` | about 80% | Tagline: "A Claude Code skill that turns any machine into a 3D simulator you can take apart" [V]. Went viral in the last two weeks. |
| 2 | **teardown** by `jakubkrehel` (same name, different skill) | about 10% | 2D technical illustrations with assembled/exploded switch, part fills, labels, SVG/PNG/PDF export [V, listing pages only]. |
| 3 | **pm-3d-explorer** by `mohitagw15856` | about 5% | Topic in, single-file three.js viewer out, with clickable labelled parts, exploded view and quiz mode [V, listing page]. |

Name collision: **OBLITERATUS** is a real Claude Code skill, but it removes refusal behaviour from open-weight language models and has nothing to do with 3D [V]. The half-remembered name may come from there.

### teardown (elvarofficial): facts

- URL: github.com/elvarofficial/teardown. MIT. Created 2026-10-30, last push 2026-10-31, two commits, 3,628 stars and 537 forks today [V].
- Built on `whaleyxbt/claude-motion` (MIT), which supplies the runtime, frame capture, sound engine and review rules [V].
- Output: one offline HTML file per machine (about 800 KB) with three.js and fonts inlined, bundled by a Node script. Also a 60 fps mp4 tour with procedural sound [V].
- Needs Node 20+, Playwright Chromium, ffmpeg, Python 3 [V].
- Ships three examples: a cross-plane V8, Cessna 337 landing gear, a Strandbeest linkage [V].
- What a user can do: orbit and zoom, switch camera views, switch cutaway mode (glass / section / solid), isolate one cylinder, toggle callouts and charts, scrub and change speed, or leave it alone and it tours itself (returns to the tour after 25 s idle) [V].

### Gaps

- I could not find the post that made it viral (no X, Reddit or HN thread surfaced).
- The `jakubkrehel` teardown skill is listed on two directories (updated 2026-10-26), but its folder is not in the repo's main branch today, so its SKILL.md and `exploded-views.md` were not read [V that it is missing].
- Nothing matching was found in Anthropic's own skills repo (not searched exhaustively).

## 2. The technique (from teardown's SKILL.md and V8 source)

**No parts data format.** Each machine is hand-written code, split by job [V]:

- `kin.js`: maths only, real units, one input (crank angle, stroke 0..1, wind). Every pose and every readout is a pure function of that input.
- `engine.js`: geometry built in code and an `update(input, ops)` that poses it. The V8 file is about 30 KB.
- `stage.js` (lights, shadows, ambient occlusion, bloom), `console.js` (panels, charts, callouts with leader lines on a fixed 1600×900 layout), `film.js` (scripted tour), `live.js` (controls).

**Rules worth stealing** [V]:

- Start from a reference and real dimensions; machines invented from text "come out generic".
- One source of truth: gauges and labels read the same function that moves the parts.
- "Open the working part": isolate, cut or ghost it rather than orbit around it.
- Light studio, one accent colour marking the active part.
- `render(t)` must be pure (no random, no clock, no carried state) so any moment can be captured.
- Review loop: render stills, check a list (parts touch but do not interpenetrate, numbers match the pose, labels do not cover what they name, readout legible at phone width), fix, repeat.

**Geometry** [V]: extruded 2D shapes (gears, crank webs, cam lobes), tubes along curves (springs, exhaust bends), and primitives (cylinder, torus, box, cone). No imported meshes.

**Explode** [V]: one value `explode` 0..1. Each layer has a fixed axis distance and its own staggered slice of the range, outermost first, eased with smootherstep:

```js
const lay = (a) => smoother((ex - a) / 0.45);
const DG = 390 * lay(0.25);   // rocker cage
const DH = 200 * lay(0.42);   // head
```

The whole model also rises so dropped parts clear the floor. Offsets are hand-chosen, not computed. pm-3d-explorer uses the automatic alternative: move each part away from the model centre in its parent's space [V].

**Cutaway** [V]: one shared `THREE.Plane` assigned to every material's `clippingPlanes`. Modes: glass, solid, section. Cut faces are capped with the stencil trick (back faces increment, front faces decrement, a plane paints where the count is non-zero), which is the method in the official three.js `webgl_clipping_stencil` example [V]. The low-quality build skips caps and switches materials to double-sided.

**Isolate / ghost** [V]: every material has a transparent "ghost twin"; non-focused meshes swap to it or are hidden. There is no separate x-ray mode.

**Performance** [V]: three quality tiers (antialias samples 8/4/2, AO on/off, shadow map 4096/2048/1024, pixel ratio 2/1.5/1). Touch devices start on the lowest tier; it only steps down, when average frame time exceeds 22 ms. Shaders are compiled before the first frame.

**Reuse.** MIT, so code may be copied with the licence notice kept. In practice reuse the ideas: it needs a Node build, is laid out for a 1600×900 landscape desktop, tells portrait phones to "turn your phone sideways", and has wheel zoom only (no pinch) [V].

## 3. Reference examples

- **Bartosz Ciechanowski**, ciechanowski.com (Mechanical Watch, Internal Combustion Engine). Builds the object up one part at a time; each figure has a slider and a draggable 3D view, and the text refers to what you are holding. Hand-written WebGL, no library [R; the site refused the fetch today].
- **Animagraffs**, animagraffs.com/how-a-car-engine-works. Pre-rendered animated cutaways, strong colour coding of systems [page exists V; format and tooling R].
- **three.js `webgl_clipping_stencil`**, threejs.org/examples. Minimal working capped cutaway [V].
- **Brilliant**. Each interactive asks for one small action then one question; never a free-roam model [R].
- **Explorable Explanations**, explorabl.es. Curated hub of play-to-learn pieces, open source [V].

## 4. Recommendation for the app

**Two tiers, one data format.**

1. **Default: 2.5D layered SVG.** Parts are SVG groups drawn in a fixed isometric projection; explode is a per-part translate. Crisp, tiny, works offline, and an AI author draws it reliably. Covers layered things (phone, Earth, cell as a schematic, battery, wall section).
2. **When rotation teaches something: three.js.** Vendor one pinned `three.module.min.js` into the repo (no CDN, no build), import it as an ES module only on lessons that use it, cache it in the service worker. An iPhone 11 runs this well if scenes stay small [R/estimate]: under about 100 meshes, no post-processing, no or one small shadow map, pixel ratio capped at 2, render only while something changes.

**Model as data, engine written once.** Teardown writes about 30 KB of code per machine; a lesson app should instead have one viewer and a JSON spec per model:

```json
{"units":"mm","driver":{"name":"crank","min":0,"max":720},
 "parts":[{"id":"piston","label":"Piston","note":"Pushed down by burning gas.",
   "parent":"block","shape":{"type":"lathe","profile":[[0,0],[43,0],[43,60],[0,60]]},
   "pos":[0,120,0],"material":"steel",
   "explode":{"axis":[0,1,0],"dist":110,"order":2},
   "pose":"y = stroke(crank)"}],
 "cut":{"normal":[0,0,-1],"offset":0},
 "steps":[{"show":["block"],"say":"Start with the block."}]}
```

- Shape types: box, cylinder, tube, lathe (profile), extrude (outline + depth), gear, helix.
- Explode: use the authored axis, distance and order with staggered smootherstep; fall back to "away from parent centre".
- Cutaway: one shared clipping plane; skip stencil caps on the phone (double-sided with a darker inside colour).
- Isolate: ghost twins. Labels: tap a part (raycast) to open a card below the model; avoid floating labels on a small screen.
- `steps` gives the Ciechanowski build-up, part by part, which is the teaching value. Add a Brilliant-style question per step.
- Author-side check on the PC: render stills and run teardown's checklist before publishing.

**Realistic limits.**

- Looks like a clean CAD diagram, not a product render. Good for things made of turned, extruded and boxy parts: engines, gears, pumps, locks, linkages, buildings.
- Poor for organic or freeform shapes (anatomy, animals, car bodies) and for textures; use schematic SVG there.
- Proportions drift without real dimensions; parts interpenetrate until checked in rendered stills.
- Numbers can be "wrong in ways that look convincing" [V, explainx review]; treat each model as an explanation aid and source the dimensions.

## Sources

Opened 2026-11-16:

- https://github.com/elvarofficial/teardown
- https://api.github.com/repos/elvarofficial/teardown (dates, stars, licence)
- https://raw.githubusercontent.com/elvarofficial/teardown/main/README.md
- https://raw.githubusercontent.com/elvarofficial/teardown/main/SKILL.md
- https://raw.githubusercontent.com/elvarofficial/teardown/main/sims/v8-shared/engine.js
- https://raw.githubusercontent.com/elvarofficial/teardown/main/sims/v8-shared/live.js
- https://github.com/whaleyxbt/claude-motion
- https://explainx.ai/blog/teardown-claude-code-skill-3d-simulator-offline-html-github-trending-2026
- https://enterprisedna.co/resources/ai-pulse/ai-pulse-2026-11-01-teardown-makes-machines-explorable
- https://aiuxplayground.com/skills/teardown
- https://www.ui-skills.com/skills/jakubkrehel/teardown
- https://api.github.com/repos/jakubkrehel/skills (MIT; no teardown folder on main)
- https://claudemarketplaces.com/plugins/mohitagw15856-pm-claude-skills/pm-3d-explorer
- https://vibehackers.io/claude-code/skills/obliteratus
- https://threejs.org/examples/webgl_clipping_stencil.html
- https://animagraffs.com/how-a-car-engine-works/
- https://explorabl.es/

Failed or not opened: ciechanowski.com (certificate error on fetch), brilliant.org (not opened), X / Reddit / Hacker News threads (none found by search).
