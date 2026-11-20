# Animations, round three: the plan

The brief (DECISIONS, 2026-11-19, "animations round two, combo tiers and sounds on the phone"): get as close to the studied explainer quality as we can. Explain thoroughly, answer every "why", no rush on length, a separate animation on how wind works. Their pinned dislikes: the title chip ("Its fuel: heat"), the heat squiggles with orange dots, the evaporation scene overall, the cloud built up from a line. Kept: the plain reworded script, the narrator samples, smooth motion, labels.

Both studies (`docs/research/kurzgesagt-study.md`, `kurzgesagt-study-2.md`) set the rules; their numbers are in brackets below.

## The path

Animations introduce, lessons reinforce and expand, the test tests (ruled 2026-11-18).

| # | Node | Kind | What it does |
|---|---|---|---|
| 1 | `how-wind-works` | animation, new, unit "How wind works" | Air is molecules; pressure is their pushing; wind is air pushed from crowded to thin; heat makes air light so it rises; a sea breeze as the everyday case; the sun heats the tropics most; the loop of air at the equator (the Hadley cell) and its neighbours; the ground's speed as the Earth turns, and why that bends the winds into trade winds (from the east) and westerlies (from the west): the Coriolis effect set up properly |
| 2 | `winds` | lesson, new | Asks before it tells: which way the wind blows between high and low, the sea breeze, the loop's order, where the air sinks, which way the trades and westerlies blow, which way air swerves. Seven new facts |
| 3 | `the-engine` | animation, redone, unit "Fuel, spin and paths" | Evaporation up close (molecules break free, carry heat away, the sea cools), vapour rising, cooling, turning back into drops, the heat let go, the faster rising, the low pressure and the air rushing in, the engine feeding itself, warm water as fuel, late summer |
| 4 | `warm-water` | lesson, kept | As it was (how warm, the heat loop, how deep, the cold wake, the season, landfall) |
| 5 | `the-spin` | animation, redone | Recalls the swerve from node 1; air rushing into a low swerves and swirls counterclockwise; clockwise in the south; none at the equator, so nothing within 5°; one storm followed: a ripple off Africa, carried west by the trades, round the high's western edge, swept east by the westerlies into a hook; fading over cooler water or land |
| 6 | `spin-and-paths` | lesson, kept | As it was |
| 7 | `first-chest` | chest | |
| 8 | `checkup` | test | Gains two wind questions, so the test tests the new section too |

The topic stays a Tour (three lessons).

## Pictures: one code per invisible thing, for the whole series

Kept in one module (`js/code.js`) that every part draws with, so a future topic reuses it:

| Thing | Drawn as | Never |
|---|---|---|
| Heat flowing | small warm rounded triangles pointing the way it flows, density = how much (study 2, 3.2) | squiggles, sparks with tails |
| Temperature | the medium's own colour shifting, with a ~10% overshoot, plus a number on a sign (2: 1.6) | warm water painted red |
| Moving air | pale cyan dashed rounded arrows, dashes running on a loop (2: 1.7) | |
| Water vapour | pale, translucent round puffs (2: 3.3); up close, the same water molecule, free | wavy lines |
| Liquid water | deeper, glossier blue; up close, molecules jostling | |
| Pressure | crowding of molecules (dot density), pushes on the ground, and a sign that says High or Low | |
| Cloud | billows of overlapping puffs in three tones (lit, lavender, violet shade) that grow upward from rising air | a cloud built from a line |
| Spin | a still storm with thin arc streaks circling it (2: 1.8) | a turning storm |
| Terms | built labels: a dot, a bent leader line, a pill that unrolls (2: 1.3) | title chips over the picture |
| Numbers | signs on a pole that rises out of the sea or ground, the board springing open (2: 1.6) | |

## Motion presets (in `js/ease.js`, measured in study 2)

furniture (labels, callouts): ease-out, 450 to 700 ms, no overshoot. prop (signs, things in the world): spring to +12% in 150 ms, settled by 350. camera: sine in-out, a sentence long. transition (cuts, the lens zoom): in-out cubic, ~850 ms, zoom in log scale. process (flows, rising air): linear, loops of about 2 s. colour (cause and effect in a hue): 1.2 s to a 10% overshoot, settled 0.9 s later. accumulate: ease-out cubic over 6 to 8 s.

## New tools (all general, documented, checked, tested)

- **`molecules`, a new part ("Up close")**: air and water at the scale of molecules. Water molecules jostling in a liquid layer, air molecules flying about, both faster when warm; pushes on the floor (pressure); a held split, crowded against thin, that opens into a flow (wind); a parcel of air that warms, spreads and rises; water molecules breaking free from the surface as vapour, each carrying heat. Built labels follow the molecule they name.
- **`section` redrawn**: vapour as puffs carrying heat triangles, a cloud that billows up from the rising air and spreads at the top, rising air as dashed arrows growing up a column, air rushing in along the surface, flowing out aloft and sinking again (a whole loop), heat let go as triangles leaving the condensing vapour, a parcel of air rising with its temperature counting down, land (a shore, or all land) that warms faster than the sea, the sun's light as a beam at any angle (spread thin when low), signs, built labels.
- **The map**: `winds` (the wind belts as flowing streaks, with a bend from 0, straight north and south as if the Earth stood still, to 1, as they really blow), `turning` (the ground's own speed along each latitude, long arrows at the equator, short near the poles, with numbers), `cells` (the loops of air drawn on the globe's edge), `frame` (the globe moved off centre, so its edge has room), `sign` (a sign standing on the globe), built labels on points, and a storm shown still with streaks circling it in scenes.
- **Shots**: `lens` (a magnifier: dot, leader, a circle that opens onto another part) and two cuts, `through` (the lens grows until it fills the picture) and `out` (the picture shrinks into a circle and the wider view comes back). Transitions on the measured in-out cubic.
- **Sound**: each action names a kind of sound; one table (`js/sfx.js`, `KINDS`) picks its file, where its peak is and how far ahead of the picture it lands. A call says when its picture lands (`beat` in its description): a sign's board pops half a second after the call, a lens's circle arrives at 0.85 s. A tick lands 40 ms before its picture, a whoosh peaks with the move. Swapping in a library sound is one line of that table.

## Scripts

Plain spoken English, one idea per line, about 165 words a minute, a short punch now and then, "you" for the viewer. Each opens on its question. Facts every lesson leans on are kept (27 °C and 80 °F, 46 m in the lesson, 5°, counterclockwise and clockwise, mid-August to mid-October), and every new number has a source in the file.

## Checking

Render each animation in full, look at frame sheets at 1 and 4 frames a second and at single frames, against both studies' rules and the pinned notes; fix and render again until it holds. The list of what I found and fixed is in `anim3-critique.md`.
