# Primer: how it behaves

Primer is a phone web app for learning, one topic at a time, by doing as much as by reading. Lessons are written on the PC, as files, and sent to a private data repo; the phone reads them, with or without signal, and every answer goes back the same way. This page says what the app does as of stage 1, the shell. `PLAN.md` says where it's going and `DECISIONS.md` what was ruled.

## The tabs

Five, left to right: **Learn**, **Practice**, **Home** (raised, in the centre), **Shop** and **Profile**. The app opens on the tab it was left on. The tab bar hides inside a lesson, an opened Playground part and the connect screen; a cross (a lesson) or a back arrow (the others) in the top left leaves. A quiet ring on Profile's icon means something there wants a look: not saving, not sending, or an update ready.

## Learn

The top row names the topic, with its medallion. Tapping it opens the list of topics as a sheet: each with its medallion, its level as one word (Glance, Tour, Solid, Deep) with four dots, and a bar of how much of it is done, or a cup once all of it is. Tapping one shows its path.

**The path.** Each lesson is a banner, with a pip for each of its steps, and its steps below it as raised buttons on a winding trail. The mark on a button says what kind of step it is: a book to read, a question, a flask to play with. Done steps are gold, the one to do next is blue with a ring round it showing how much of its lesson is done, and the rest are dim. The trail is gold as far as it's been walked. A finished lesson has a cup at its end. Pines and a few stars sit beside the trail; they're decoration.

**Tapping a step** brings up a bubble beside it, placed by script: what kind of step it is, its title and Start (or Carry on, part way through a lesson, or Again on a done step). Start plays the lesson from that step to its end. A step still ahead shows its title only, and gives a small shake.

With no topics yet, Learn says so, with Connect if the app isn't connected.

## A lesson

A thin bar along the top fills as the steps go by, with a spring, and a cross beside it leaves at once: nothing is lost, and the path shows the steps done so far. Below that, the step: a figure or a part on top, the words under it, and for a question the way to answer it. Then a big button at the bottom.

| Step | On screen | The button |
|---|---|---|
| Explain | A short paragraph and a figure (a part, set up, or a picture) | Continue |
| Check | A question, sometimes a figure, and an answer to give: pick one, set a slider, type a number on the keypad, put things in order, match pairs, or tap a spot | Check, which wakes once there's an answer |
| Play | A goal and a part to do it with, like a globe to tap | Check, which wakes once the part has been used |

**Checking** marks the answer and slides the feedback up from the bottom: **Right** in green, **Close** in gold, or **Not quite** in pink, with one line of why for the answer given. The answer stays on screen with the truth beside it: the right choice lit, the true value on the slider's scale, the right order numbered, the right partner under each wrong pair, the right spot ringed, and anything the lesson shows after an answer (the globe shades the band where hurricanes start). The button becomes Continue, in the feedback's colour. Being wrong costs nothing: there are no lives, and a wrong answer still moves the lesson on.

**The end** of a lesson: its topic's medallion pops up, "Lesson done", how many of its questions were right, and where its facts came from. Continue goes back to the path.

Every step started, read, answered and finished is saved on the phone and queued to go up: see Storage and sync.

## Practice

**Review** sits on top, with a fan of cards. It arrives with stage 2, so its Start is off and it says Soon.

**Playground** lists every part in the kit, each on a card with its picture, its name and the lesson that first uses it. Tapping one opens it by itself: the part, full size, a row of things to try (from the part's description), and a panel of its settings, each a row of choices, a switch or a slider. Changing a setting redraws the part at once. Everything here is built from the part's own description, the same one the writer reads.

## Home and Shop

Calm placeholders. Home shows a small drawn room and says it comes later; the room is stage 4. Shop shows dark imprints of things to come, the way a locked thing will look, and says Soon.

## Profile

Two tiles: lessons finished, and questions answered right.

**Knowledge** lists each topic with a bar and a number. Until review arrives, the number is its questions' last answers: right counts in full, close a half, wrong nothing, and each fades by half every two weeks since it was answered. The colour runs from blue (well remembered) to grey, and a topic under 50% that has been tried has a warning mark. There's no word for fading, and no streak. Tapping a topic opens its details: when it was last studied, how many were right last time, a dot for each question, and a button to its path.

**Settings:** Voice, Effects and Music switches, and the text size (three sizes of A). The app ignores the phone's silent switch: these switches alone decide what plays. Voice and Music have nothing to play yet.

**Sending:** whether it's connected, Connect or Disconnect, what's waiting to send and what has been sent, Send now and Check for lessons, any problem in plain words, and when the writer last read the progress. Then whether the phone has promised to keep Primer's data, and the version.

## The feel

One module (`js/feel.js`) gives every press the same three things:

- **A soft sound.** Made on the spot as rounded sine notes, like a soft mallet on wood, through a gentle filter: no beeps, nothing square or 8-bit, nothing loud. A tap, a select, a switch on or off, two notes up for right, a softer pair for close, two notes down for wrong, and a short rising chord for a lesson's end. Effects off silences them all. The first press that sounds tells the phone the app's sound is media (`navigator.audioSession.type = 'playback'`), which the phone test showed is what lets made-up sound play with the silent switch on.
- **A tick.** iPhones let a page tick only when a switch control flips, so a hidden one is flipped (Riffle's trick, felt on the phone test). Android vibrates. Nothing depends on it being felt.
- **A spring.** Buttons sink while pressed and spring back when let go; things that arrive pop in; the lesson bar fills with a spring. The bounce is the approved one, halfway between gentle and medium (`MOTION` in `js/feel.js`, from stage 0's look). Springs move transforms only.

Rules from the phone test, kept everywhere: no live blur on anything that moves (the globe's glow is a soft gradient); popovers are placed by script; nothing depends on the tick.

## Parts

A part is one folder in `parts/`: a description (`part.json`) and one module. The description lists the part's settings (type, range, default), calls, events, state, what it needs and roughly how heavy it is, and how it's marked. The phone fills settings in from it, the Playground builds its panel from it, the writer's `primer parts` prints it and `primer check` checks lessons against it.

- **Inputs:** choice (shuffled), slider (linear or stretched, marked by how close; shows the answer and the truth), number (its own keypad, so the phone's keyboard never covers the button), order (drag, or tap two to swap), match pairs (tap one on each side), and tap the spot on a picture.
- **Globe:** the stage 0 globe, drawn on one canvas. Drag to turn it, and it carries on a little when let go; it can turn by itself, or stay put. Labels for the bigger countries, three looks (day, sea warmth, muted), countries lit up, bands of latitude, points, pins, and the approved Disc hurricane, turning anticlockwise north of the equator and clockwise south of it. A tap reports the place, whether it's land and which country. The ball is drawn on a layer of its own and redrawn only while it turns, so a still globe costs nothing.

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
