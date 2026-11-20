# How a part is put together

The rule this follows (DECISIONS, 2026-11-18): build modular, reuse parts, and where one part can serve several uses with a tweak, it does. This page is enough to extend the kit without reading all the code. `spec.md` says what the parts do; `format.md` how a lesson uses them.

## A part

A part is a folder in `parts/` with two things:

- **`part.json`, its description.** Settings (type, range, default), calls (each argument's type), events, state, what it needs, an `example` the Playground opens with and a `try` row of buttons. Everything else is built from it: the Playground's panel (`js/screens/practice.js`), the phone's checks (`js/parts.js`), the writer's catalogue and checker (`skill/primer.py parts`, `check`) and the tests. Write the description first.
- **One module** exporting `mount(el, settings, ctx)`. It draws into `el` and returns a handle: `calls` (one function per call in the description), `state()` (what a goal can read), `on(event, fn)`, and `remove()`. Optional: `where(place)`, `busy()` and `debug()` for the tests.

`ctx` brings the shared pieces from the app, so a part never imports app code for them: `ctx.track(el, handlers)` (one-finger drags with a flick speed, two-finger pinches with their midpoint, taps; `js/gesture.js`), `ctx.feel` (the sound, tick, pop and spring of `js/feel.js`), `ctx.media(path)`, and `ctx.motion`: `lively` in a lesson (things pop in on the approved spring) or `soft` in a scene (they fade and grow in, and a clear fades out). Anything a part animates over time should use `Glide` from `js/ease.js`: a value that eases in and out with no overshoot and, sent somewhere new mid-glide, carries on from the speed it had. A colour that carries cause and effect (the sea warming) uses `Shift` instead, on the `colour` family: a touch past its target and back.

**Motion, by what moves** (`MOTION` in `js/ease.js`, measured in the second Kurzgesagt study): `furniture` for diagram parts arriving (a label's pill, a lens's circle: ease-out, no overshoot), `prop` for things in the world (a sign's board: a spring to +12%), `camera` (sine in and out, a sentence long), `transition` (in-out cubic, about 850 ms; a zoom in log scale), `process` (linear, or a loop), `leader`, `colour` and `accumulate`. `moved(family, t0, now)` gives how far a move is; a scene's stretch can name the families as its `ease`.

**The series' visual code** (`js/code.js`): one way of drawing each invisible thing, shared by every part: `heat` (warm triangles pointing the way heat flows), `air` (dashed arrows with running dashes, and `loopShare` for an arrow that draws itself on a loop), `puff` (water vapour), `cloud` (the one cloud: a flat base and a cauliflower top in three tones lit from the upper left, drawn from a level, a first heap to a storm cloud with an anvil, at any angle), `streaks` (spin round a turning storm), `sign` (a pole rising, a board springing open), `label` (a built label: dot, leader, a pill unrolling), `pill`, `molecule` (glossy stamps, water and air) and `glow`. A part draws these from there and never invents its own look for one of them, so the globe, the sea and sky and the molecules agree.

A call can say when its picture lands, `"beat": seconds` in its description (a sign's board half a second after the call): a scene places the call's sound by it (js/sfx.js, `KINDS`).

Two more optional handle methods matter in scenes: `finish()` lands whatever is still moving at once (a scene calls it after rebuilding the picture at a moment, so nothing animates in that was already there); and a part that draws every frame should rest while an ancestor is marked `data-off` (a shot has put it away), keeping time so it's right the moment it shows. A part measures its own size by layout (`clientWidth`), never by its box on screen: a shot may be moving it with a transform.

Argument and setting types the checker knows: `choice`, `bool`, `number` (with `min`, `max`), `text`, `media`, `lonlat`, `place` (a country's name, an ocean's, a sea's or a continent's from `parts/map/places.json`, or `[lon, lat]`), `name` (a place's name only), `place-or-level`, `colour`, `table`, `part` (one of the scene's parts, for shots) and `list` (`of`: `country`, `place`, `number`, `text`, or an object's fields). A setting with `"wide": true` gets a line of its own in the Playground's panel. A part with `"playground": false` stays out of the Playground (lessons and scenes still use it).

## Presets: one part, several names

`parts/parts.json` lists the parts and the **presets**. A preset is a part under another name with some of its defaults changed:

```json
"presets": { "globe": { "of": "map", "title": "Globe", "settings": { "projection": "globe", "pinch": false } } }
```

A lesson uses a preset exactly like a part, and can still set anything the part has. Its description is made from the part's (`presetOf` in `js/parts.js`, `preset_of` in `skill/primer.py`, the same rule twice), so the two never drift. The Playground lists parts only; a lesson that uses a preset counts as a use of its part. Reach for a preset when a part keeps being set up the same way (an atlas: the map with names on and the political style), and for a new setting when the part has to do something new.

## The map, as the worked example

The Map (`parts/map/`) is one part that is both the globe and every flat map. It is made of pieces that each know one thing:

| File | Knows | Knows nothing of |
|---|---|---|
| `world.js` | The country shapes, loaded once per page; each country's biggest piece (where its name goes), area and bounds; the four political colours | Screens, projections |
| `look.js` | The house colours, the four styles, the ramps tables are coloured with, the sea warmth bands | Where anything goes |
| `views.js` | The projections. Each view answers the same questions for one camera (a centre and a zoom): point the projection, clamp the centre, pan by pixels, a path between two centres, what's visible, what's under a finger, how far a point is from the map's edge | What is drawn |
| `layers.js` | The layer stack, bottom to top: backdrop, sea, sea data (tables by latitude, bands, the grid), land (with tables by country, highlights, the lifted country), borders, dotted lines, the finish (a globe's light, a flat map's edge), then routes (arcs, dotted aims, tracks, flows with their running dashes, spirals of air), names, marks (points, markers, track riders, the finger's pin), the routes' names (over the marks, sliding along their lines to keep clear of each other) and the style's key | Which projection it is |
| `marks.js` | Small things drawn at a point: a dot, a chip, a ring, a pin, the Disc hurricane | Maps at all; any part with a canvas can use them |
| `map.js` | The glue: the canvas, the camera and its gestures, the frame loop, the calls, the state and the events | How any one thing is drawn |

A layer draws from a context `d`: `d.c` (the canvas), `d.view`, `d.shape(geo)` (a shape projected once for this view and shared by every layer that draws it), `d.W` (the world), `d.S` (settings), `d.m` (what calls have put on the map), `d.style`, `d.k` (line weight) and `d.now`, `d.dt`. Layers marked `base` are drawn onto a picture kept aside, redrawn only when the view or the map's contents change; the others are drawn over it on each frame something moves, and return `true` while they want more frames (a name fading, a storm turning). Layers marked `clip` stay inside the map's outline.

The camera is the same on every view: `centre` [lon, lat] and `zoom` (1 is the whole world). A globe turns about its centre. A flat map turns about the pole: its centre longitude runs down the middle, so dragging sideways rolls the world through the map without end, and up and down it moves like paper, stopping at the edge. So `spinTo` is a pan on a flat map with no special case, and a flick, auto-spin, pinch and double tap are written once.

### To add a tool (a layer or a call)

1. Describe the call in `part.json`, with its arguments' types (the checker and the Playground's `try` row read it from there).
2. In `map.js`, the call puts its data in `m` (build any shapes once, here, never per frame) and calls `changed()` if a base layer draws it, or `wake()` if a top layer does.
3. In `layers.js`, draw it in an existing layer, or add a layer object `{ id, base, clip, draw(d) }` to `LAYERS` where it belongs in the stack. Use `d.shape` for anything projected and `d.view` for anything placed; never ask which projection it is unless the look really differs (only the backdrop and the finish do).
4. Add the call's arguments to `callArgs` in `tests/e2e.mjs`. The tests then run it on every projection.

It now works on the globe and every flat map, in every style. `clear()` should take it away.

### To add a projection

Add one line to `PROJECTIONS` in `views.js` (any d3-geo projection symmetric about the equator: its outline, fit, panning and edges are worked out from it; one whose poles run off to infinity also gives `lats`, the latitudes it shows, as Mercator does with 60 S to 84 N) and its name to the `projection` setting's options in `part.json`. The tests mount every setting and every call on every option of that setting, so they cover it at once. A projection that isn't flat-and-symmetric (an azimuthal map centred on a pole, say) needs its own view object beside `globeView` and `flatView`, answering the same questions.

### Smooth on the phone

- No live blur. Glows are gradients or wide faint strokes; shadows are offset copies.
- Shapes are built once: bands, warmth, tables and the four-colour groups when they're made; projected paths once per view, shared by every layer.
- A still map asks for no frames and redraws nothing. While it moves, the base picture is redrawn and the small things drawn over it; a turning storm or a moving track redraws only the top.

## The sea and sky, a part for scenes

The Section (`parts/section/`) is a slice of sea (or a shore, or land) and the air above it, from the side: the cutaway a scene cuts to when the globe can't show a thing (water evaporating, air rising, a cloud billowing up and giving its heat back, a sea breeze). Everything in it is a level that glides (sun, warm, ground, heat, vapour, rise, cloud, release, inflow, outflow, sink, rain, beam and more), so it can be turned up on a word or driven across a stretch; built labels name a thing; signs stand in the water or on the ground with a word or a number; its camera moves between framings. It draws in the series' visual code and shares the globe's warmth colours, so the two read as one picture when a scene cuts between them. Besides the place, it shows how things work: the loop of moving air (rising up a column, rushing in along the surface, out high up and sinking again), a parcel of air rising with its temperature counting down (`parcel`), sunlight as one beam at the sun's angle, spread thin when it slants (`beam`, `sunAngle`), drops forming as vapour reaches the cloud's base and each puff's heat let go, days going by (`days`) and a thermometer in the sea (`gauge`). A new thing in it is a new level: a name in `LEVELS`, a block in `draw`, a setting and a call in `part.json`.

## Molecules, up close

`parts/molecules/` is air and water at the scale of molecules, for whatever a scene explains by what molecules do: air pressure as their pushes on the floor, crowded air against thin behind a wall that lifts (wind), a bubble of air that warms, thins and rises, heat rising off warm ground, water molecules breaking free of the surface as vapour with their heat. Every motion is worked out from time alone (each molecule bounces between walls, a function of how far it has flown), so any frame draws on its own; molecules are `js/code.js` stamps. A scene reaches it through another part with a lens (`shot.lens`, then a cut `through`). A new thing in it is a level in `LEVELS`, a block in `draw`, and its setting and call in `part.json`.

## The map's air

`parts/map/air.js` holds the map's layers for the air, in the stack like any other: `winds` (the wind belts as streaks, each belt with its bend from 0, as if the Earth stood still, to 1, as they blow), `turning` (the ground's own speed along each latitude), `cells` (the loops of air drawn on a globe's edge, in a thin layer of air) and `signs`. `frame` moves a globe off the middle, so its edge has room; zoomed in and framed far off, only its edge shows: a close-up of the air above the Earth.

## Scenes: shots and sounds

A scene directs its parts with shots (`js/shots.js`): cut (a cut, a fade, a push, a zoom, `through` a lens and `out` again), split, inset, a lens and a title card, described under `scene` in `parts/parts.json` (the checker reads them there), each move driven by the frame clock so a seek lands exactly and a film renders the same each time. Its sound effects (`js/sfx.js`) are short files in `sounds/`, made by `tools/make-sounds.py` from noise and sine waves alone (the app's own: nothing recorded or borrowed), named in `parts.json`, and played as plain `<audio>` by the same rules as the voice: a fresh player each time, primed in the tap that starts the scene, heard only with Animation sounds on (their own switch in Profile, on unless turned off). An action names a kind of sound; `KINDS` in `js/sfx.js` says which file plays it, where its loudest moment is and how it lines up with its picture (a tick 40 ms ahead, a whoosh peaking with the move, a swell starting 350 ms early), so a library recording replaces a made one with one line there. A new kind is a function in `make-sounds.py` (or a file) and its name in `parts.json`, `SOUNDS` and `KINDS`.

## The answer forms, as a second example

Inputs (`parts/inputs/`) is one part with many forms, each a file in `forms/` that's only what's its own; `kit.js` holds what they share (the number scale, labels, carrying tiles, the verdict colours). A form that can look several ways keeps one behaviour and takes its look from a setting:

| File | Knows | Knows nothing of |
|---|---|---|
| `pictures.js` | The pictures a number drives (warmth, depth, wind): each drawn once, then set to a value's k and the time | Which form shows it |
| `clock.js` | The one frame loop for everything that moves on its own, 30 frames a second, stopped when nothing's on screen; `hold` and `pin` for tests and films | What's drawn |
| `tracks.js` | The slider's looks: plain, thermometer, sea. A look draws around the line the handle runs along | The finger, the chip, the truth |
| `forms/slider.js` | The one slider, across, up or down, in any look: the finger, the value's chip, the numbers, the truth | How a track is drawn |
| `number/*.js` | The number's looks: keys, wheels, tape, abacus, each a whole way of entering a number, sharing `common.js` (digits, where it starts, the truth line) | Each other |

To add a slider look: one entry in `TRACKS` and its name in `look`'s `byForm.slider` in `part.json`. A picture: one entry in `PICTURES`, its name in `picture`, and `look` if a slider should take a look with it. A number look: a file in `number/`, a line in `LOOKS` in `forms/number.js`, and its name in `byForm.number`. A form being redone is listed in `form`'s `hidden`: it still plays, but Practice and `primer parts` don't offer it.

## Rules that keep the kit small

- A lesson never carries code. If it needs something the kit can't do, the kit grows: a setting, a call, a layer, a preset, or a new part, built general enough for the next lesson.
- Before a new part, ask whether an existing one does it with a tweak, the way a flat map is the globe with another projection.
