# Primer: how it behaves

Primer is a phone web app for learning, one topic at a time, by doing as much as by reading. Lessons are written on the PC, as files, and sent to a private data repo; the phone reads them, with or without signal, and every answer goes back the same way. This page says what the app does as of stage 1, the shell. `PLAN.md` says where it's going and `DECISIONS.md` what was ruled.

## The tabs

Five, left to right: **Learn**, **Practice**, **Home** (raised, in the centre), **Shop** and **Profile**. The app opens on the tab it was left on. The tab bar hides inside a lesson, an opened Playground part and the connect screen; a cross (a lesson) or a back arrow (the others) in the top left leaves. A quiet ring on Profile's icon means something there wants a look: not saving, not sending, or an update ready.

## Learn

The top row names the topic, with its medallion. Tapping it opens the list of topics as a sheet: each with its medallion, its level as one word (Glance, Tour, Solid, Deep) with four dots, and a bar of how much of it is done, or a cup once all of it is. Tapping one shows its path.

**The path.** Each node on the path is a whole thing, worked through from one to the next: a lesson, a test, an exam, a chest, a review of everything before it, or an animation on its own. Each is a raised button on a winding trail with its own mark, as the stage 0 sketch has them: an open book for a lesson, a star on a hexagon for a test, a cup on a larger hexagon for an exam, two arrows round for a review, a play mark with sound for an animation; a chest is drawn as the chest itself, shining when it's next, open once opened. Done nodes are gold, the one to do next is blue with a ring round it showing how much of it is done, and the rest are dim. A unit of the path is a banner with a pip for each of its nodes; a finished unit has a cup at its end. The trail is gold as far as it's been walked. Pines and a few stars sit beside the trail; they're decoration. A lesson's own steps aren't on the path: they show inside it, on its thin bar.

**Tapping a node** brings up a bubble beside it, placed by script: its kind, its title and a button. A lesson, test or exam says Start, Carry on (part way through: it carries on from the first step not yet done) or Again (done: from the top). A chest says Open, and once opened just "Opened". A review or animation says Start. A node still ahead shows its kind and title only, and gives a small shake.

**A chest** opens on a screen of its own: it pops in, its lid springs open with glints, and "What's inside comes with the shop." Opening it is saved and sent up (an `open` event), and the path goes on. Currency is a later stage.

**A review or an animation**, for now, is a placeholder screen that says it comes later (review with stage 2, animations with the voices). Visiting it is saved and sent up, and the path goes on past it.

With no topics yet, Learn says so, with Connect if the app isn't connected.

## A lesson

A thin bar along the top fills as the steps go by, with a spring, and a cross beside it leaves at once: nothing is lost, and the path shows the steps done so far. Below that, the step: a figure or a part on top, the words under it, and for a question the way to answer it. Then a big button at the bottom.

| Step | On screen | The button |
|---|---|---|
| Explain | A short paragraph and a figure (a part, set up, or a picture) | Continue |
| Check | A question, sometimes a figure, and an answer to give: pick one, set a slider (it starts at a real value, with its fill showing, and can have a picture above it that follows the value), type a number on the keypad, put things in order, match pairs, or tap a spot | Check, which wakes once there's an answer (at once for a slider or an order) |
| Play | A goal and a part to do it with, like a globe to tap | Check, which wakes once the part has been used |

**Checking** marks the answer and slides the feedback up from the bottom: **Right** in green, **Close** in gold, or **Not quite** in pink, with one line of why for the answer given. The answer stays on screen with the truth beside it: the right choice lit, the true value on the slider's scale, the right order numbered, the right partner under each wrong pair, the right spot ringed, and anything the lesson shows after an answer (the globe shades the band where hurricanes start). The button becomes Continue, in the feedback's colour. Being wrong costs nothing: there are no lives, and a wrong answer still moves the lesson on.

**The end** of a lesson: its topic's medallion pops up, "Lesson done" ("Test done", "Exam done"), how many of its questions were right, and where its facts came from. Continue goes back to the path. Tests and exams play exactly as lessons do.

Every step started, read, answered and finished is saved on the phone and queued to go up: see Storage and sync.

## Practice

**Review** sits on top, with a fan of cards. It arrives with stage 2, so its Start is off and it says Soon.

**Playground** lists the kit's tools, like the map as an atlas, each on a card with its picture, its name and the lesson that first uses it. Answer forms aren't tools: Inputs says `"playground": false` in its description and isn't listed (lessons and tests still use it). Tapping a card opens the part by itself: full size, a row of things to try (from the part's description), and a panel of its settings, each a row of choices, a switch or a slider; a setting marked wide, like the map's projection and style, has a line of its own with its choices across the panel. Changing a setting redraws the part at once. Everything here is built from the part's own description, the same one the writer reads.

## Home and Shop

Calm placeholders. Home shows a small drawn room and says it comes later; the room is stage 4. Shop shows dark imprints of things to come, the way a locked thing will look, and says Soon.

## Profile

Two tiles: lessons finished, and questions answered right.

**Knowledge** lists each topic with a bar and a number. Until review arrives, the number is its questions' last answers: right counts in full, close a half, wrong nothing, and each fades by half every two weeks since it was answered. The colour runs from blue (well remembered) to grey, and a topic under 50% that has been tried has a warning mark. There's no word for fading, and no streak. Tapping a topic opens its details: when it was last studied, how many were right last time, a dot for each question, and a button to its path.

**Settings:** Voice, Effects and Music switches, and the text size (three sizes of A). Effects start off (ruled 2026-11-18: the press sounds are disliked until better ones are chosen by ear from a board). An install from before 0.2 has Effects turned off once, since its saved settings can't tell a chosen "on" from the old default; from 0.2 on, Effects is on only if the switch was turned on. Voice and Music have nothing to play yet.

**Sending:** whether it's connected, Connect or Disconnect, what's waiting to send and what has been sent, Send now and Check for lessons, any problem in plain words, and when the writer last read the progress. Then whether the phone has promised to keep Primer's data, and the version.

## The feel

One module (`js/feel.js`) gives every press the same three things:

- **A soft sound**, when Effects is on (it starts off). Made on the spot as rounded sine notes, like a soft mallet on wood, through a gentle filter: no beeps, nothing square or 8-bit, nothing loud. A tap, a select, a switch on or off, two notes up for right, a softer pair for close, two notes down for wrong, and a short rising chord for a lesson's end. Effects off silences them all.
- **The phone's sound is left alone.** The app never sets `navigator.audioSession.type`, neither when it opens nor on a press. Saying its sound was media (`'playback'`) stopped the person's music the moment Primer opened. The cost: a made-up tone now follows the silent switch, as the phone test found, so with Effects on and the switch on silent the presses are quiet. The tick and the spring don't depend on sound.
- **A tick.** iPhones let a page tick only when a switch control flips, so a hidden one is flipped (Riffle's trick, felt on the phone test). Android vibrates. Nothing depends on it being felt.
- **A spring.** Buttons sink while pressed and spring back when let go; things that arrive pop in; the lesson bar fills with a spring. The bounce is the approved one, halfway between gentle and medium (`MOTION` in `js/feel.js`, from stage 0's look). Springs move transforms only.

Rules from the phone test, kept everywhere: no live blur on anything that moves (the globe's glow is a soft gradient, a lifted order item's shadow is solid); popovers are placed by script; nothing depends on the tick. Anything dragged moves by transform on a layer of its own, at whole screen pixels, so nothing under it is repainted as it goes and nothing is left behind (the slivers seen on the phone).

### Sound in stage 2: narration

Voice clips will be plain `<audio>` elements, a new one made at each tap (the phone test's rule: every play gets a new player). The phone test heard such clips with the silent switch on, with the app claiming nothing (session `auto`), so narration can ignore the switch without the claim that stopped the music. Whether a speaking clip pauses the person's music, or ducks it, or plays over it, is for the phone to show: WebKit may treat a playing `<audio>` as media and interrupt other audio while it plays, and that has to be tried on the phone in stage 2 before narration leans on it. If it does pause the music, the choices then are to accept a pause while the voice speaks, or to play voice through Web Audio (which mixes, but follows the silent switch).

## Parts

A part is one folder in `parts/`: a description (`part.json`) and one module. The description lists the part's settings (type, range, default), calls, events, state, what it needs and roughly how heavy it is, and how it's marked. The phone fills settings in from it, the Playground builds its panel from it, the writer's `primer parts` prints it and `primer check` checks lessons against it.

- **Inputs:** choice (shuffled), slider (linear or stretched, marked by how close; shows the answer and the truth), number (its own keypad, so the phone's keyboard never covers the button), order (drag, or tap two to swap), match pairs (tap one on each side), and tap the spot on a picture. A slider starts at a real value with its fill showing (`start`, or the middle of its scale), and can drive a named picture above it (`picture`, with `pictureFrom` and `pictureTo` for its ends): `warmth`, a ball that goes smoothly from a snowflake through to a fire, and `depth`, the sea cut away with a warm layer as deep as the value. Pictures are general: any lesson can use them, and a new one is an addition to the part. Number, match and spot are as they were; alternatives for them are being drawn on a board first.
- **Map:** the world, as a globe or a flat map: the projection is a setting (`globe`; `equal-earth`, the default flat map, where every country keeps its true size; `natural-earth`; `mercator`), and everything else is the same on all of them, written once. Drawn on one canvas in the stage 0 look. Drag to turn the globe or pan the flat map, and it carries on a little when let go; sideways, a flat world rolls round without end, and up and down it moves like paper, stopping at its edge. Pinch, or tap twice, to zoom (up to 8 times). It can turn by itself, or stay put. Labels for the bigger countries in view, four looks (day, sea warmth, muted, and political: every country one of four colours, no two neighbours alike), borders on or off, countries lit up, countries or bands of latitude coloured from a table, bands of latitude, points, pins, great-circle routes that draw themselves in, tracks drawn as far as they've got with something riding them, and the approved Disc hurricane, turning counterclockwise north of the equator and clockwise south of it. A tap reports the place, whether it's land and which country. How it's built, and how to add a layer or a projection, is in [parts.md](parts.md).
  - *The globe* that lessons name is a preset: the map with projection `globe` and no finger zooming, so a lesson written for the stage 1 globe plays as it did.
  - *Layers,* bottom to top: the sea and anything tinting it (sea warmth, a table's bands, a band's shade), then the land (a table's countries, highlights, the lifted country), then the borders, then every dotted line (the equator, a band's edges) over sea and land alike; then routes and tracks, names, and the marks.
  - *Names* hold their place: a name that's showing keeps it ahead of any newcomer and goes only when truly crowded out or at the edge; names fade in and out, and fade toward the edge, rather than popping. Each sits on its country's biggest piece (France's in France, not between it and French Guiana).
  - *Four colours* are worked out once from the map's own shared borders: greedy, the most hemmed-in country first, with a swap of two colours along a chain of neighbours where all four are taken. On Natural Earth's 110m map no two neighbours share a colour.
  - *Cost:* the map itself is drawn on a layer of its own and redrawn only while it turns, pans or zooms, each shape projected once per view and shared by the layers that draw it; a still map costs nothing, and a turning storm or a moving track redraws only itself. Band, warmth, table and four-colour shapes, the glow and the names' widths are made once, never per frame. No blur. Panning a flat four-colour map with names redraws it in about 8 ms on the PC at the phone's pixel ratio, quicker than the stage 1 globe turning.

## Storage and sync

Copied from Riffle.

- **App code:** this public repo, served by GitHub Pages. It holds no lessons.
- **Lessons and progress:** the private repo `primer-data`. The layout is in [format.md](format.md). The repo's owner is the one whose Pages serve the app, so no name is written into this code.
- **Connecting:** from Profile. The person makes a fine-grained GitHub key that reaches only `primer-data` and pastes it once. The app checks it can read and write with a real test write, and refuses to keep a key that can really open any other private repo. Every way that can fail says why.
- **Offline:** a service worker keeps the app on the phone. Lessons and their media come down whenever there's signal (on opening, coming back, and Check for lessons) and are kept in IndexedDB, so a lesson plays with no signal.
- **Sending:** every attempt and answer waits in a queue and goes up at most every 15 seconds, when the app is hidden, comes back or signal returns, and on Send now. Each batch is a new file under `progress/`, so nothing collides with the writer. Writes wait their turn, one at a time. Refusals are told in plain words; one miss counts as no signal, three in a row while the phone says it's online counts as a problem. Every call gives up after 25 seconds.
- **The service worker leaves other paths alone.** Its scope is all of `/primer/`, which also serves stage 0's pages and the docs, so it answers only for the app's own files and lets everything else go to the network. Its caches are named `primer-app-<version>`, and it only clears caches with that prefix: the stage 0 phone test's `primer-stage0-phone-…` caches survive.

## Nothing typed gets lost

As in Riffle: every write goes into a backup list in `localStorage` first, and leaves it only once the database has it. On the next start whatever is left moves back. A lost database connection is reopened and the write tried once more. If saving still fails, or there's no database (a private window), Profile says why and the tab bar's ring shows. Hiding or closing the app sends what's waiting. Names in shared storage start with `primer` (Riffle lives at the same address).

On iPhone the app has to be added to the Home Screen: Safari and the Home Screen app keep separate data. Connecting in Safari says so first.

## For testing

On a local test server only: `?api=` points the app at a stand-in for GitHub, `?insets=48,34` pretends to have an iPhone's safe areas, `?sw` turns the service worker on, and `window.__primer` reaches inside. `tests/serve.mjs` serves the app under `/primer/` with the stand-in under `/__gh`; `tests/e2e.mjs` drives it in headless Edge with real touch; `tests/skill_test.py` tests the writer's side.

## The writer's side

`skill/` holds the `primer` skill, installed with `python skill/install.py`: `parts`, `check`, `fit`, `send` and `progress`. `skill/SKILL.md` has the commands and the rules for writing. Its fit check draws each step in the real app, in headless Edge, rather than estimating, so it can't be the optimist.
