# How a part is put together

The rule this follows (DECISIONS, 2026-11-18): build modular, reuse parts, and where one part can serve several uses with a tweak, it does. This page is enough to extend the kit without reading all the code. `spec.md` says what the parts do; `format.md` how a lesson uses them.

## A part

A part is a folder in `parts/` with two things:

- **`part.json`, its description.** Settings (type, range, default), calls (each argument's type), events, state, what it needs, an `example` the Playground opens with and a `try` row of buttons. Everything else is built from it: the Playground's panel (`js/screens/practice.js`), the phone's checks (`js/parts.js`), the writer's catalogue and checker (`skill/primer.py parts`, `check`) and the tests. Write the description first.
- **One module** exporting `mount(el, settings, ctx)`. It draws into `el` and returns a handle: `calls` (one function per call in the description), `state()` (what a goal can read), `on(event, fn)`, and `remove()`. Optional: `where(place)`, `busy()` and `debug()` for the tests.

`ctx` brings the shared pieces from the app, so a part never imports app code for them: `ctx.track(el, handlers)` (one-finger drags with a flick speed, two-finger pinches with their midpoint, taps; `js/gesture.js`), `ctx.feel` (the sound, tick, pop and spring of `js/feel.js`) and `ctx.media(path)`.

Argument and setting types the checker knows: `choice`, `bool`, `number` (with `min`, `max`), `text`, `media`, `lonlat`, `place` (a country's name or `[lon, lat]`), `place-or-level`, `colour`, `table`, and `list` (`of`: `country`, `place`, `number`, `text`, or an object's fields). A setting with `"wide": true` gets a line of its own in the Playground's panel.

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
| `layers.js` | The layer stack, bottom to top: backdrop, sea, sea data (tables by latitude, bands, the grid), land (with tables by country, highlights, the lifted country), borders, dotted lines, the finish (a globe's light, a flat map's edge), then routes (arcs, tracks), names, marks (points, markers, track riders, the finger's pin) | Which projection it is |
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

Add one line to `PROJECTIONS` in `views.js` (any d3-geo projection symmetric about the equator: its outline, fit, panning and edges are worked out from it) and its name to the `projection` setting's options in `part.json`. The tests mount every setting and every call on every option of that setting, so they cover it at once. A projection that isn't flat-and-symmetric (an azimuthal map centred on a pole, say) needs its own view object beside `globeView` and `flatView`, answering the same questions.

### Smooth on the phone

- No live blur. Glows are gradients or wide faint strokes; shadows are offset copies.
- Shapes are built once: bands, warmth, tables and the four-colour groups when they're made; projected paths once per view, shared by every layer.
- A still map asks for no frames and redraws nothing. While it moves, the base picture is redrawn and the small things drawn over it; a turning storm or a moving track redraws only the top.

## Rules that keep the kit small

- A lesson never carries code. If it needs something the kit can't do, the kit grows: a setting, a call, a layer, a preset, or a new part, built general enough for the next lesson.
- Before a new part, ask whether an existing one does it with a tweak, the way a flat map is the globe with another projection.
