# Primer: how it behaves

Primer is a phone web app for learning, one topic at a time, by doing as much as by reading. Lessons are written on the PC, as files, and sent to a private data repo; the phone reads them, with or without signal, and every answer goes back the same way. This page says what the app does as of stage 1, the shell. `PLAN.md` says where it's going and `DECISIONS.md` what was ruled.

## The tabs

Five, left to right: **Learn**, **Practice**, **Home** (raised, in the centre), **Shop** and **Profile**. The app opens on the tab it was left on. The tab bar hides inside a lesson, an opened Playground part and the connect screen; a cross (a lesson) or a back arrow (the others) in the top left leaves. A quiet ring on Profile's icon means something there wants a look: not saving, not sending, or an update ready.

## Learn

The top row names the topic, with its medallion. Tapping it opens the list of topics as a sheet: each with its medallion, its level as one word (Glance, Tour, Solid, Deep) with four dots, and a bar of how much of it is done, or a cup once all of it is. Tapping one shows its path.

**The path.** Each node on the path is a whole thing, worked through from one to the next: a lesson, a test, an exam, a chest, a review of everything before it, or an animation on its own. Each is a raised button on a winding trail with its own mark, as the stage 0 sketch has them: an open book for a lesson, a star on a hexagon for a test, a cup on a larger hexagon for an exam, two arrows round for a review, a play mark with sound for an animation; a chest is drawn as the chest itself, shining when it's next, open once opened. Done nodes are gold, the one to do next is blue with a ring round it showing how much of it is done, and the rest are dim. A unit of the path is a banner with a pip for each of its nodes; a finished unit has a cup at its end. The trail is gold as far as it's been walked. Pines and a few stars sit beside the trail; they're decoration. A lesson's own steps aren't on the path: they show inside it, on its thin bar.

**The chest** is drawn the way the room's trophies are: a clear form, three tones each of wood and gold, one highlight, lit from the upper left, and nothing under it. Still ahead, it's the same closed chest in the path's dim tones; next, closed in its own colours with a warm glow and glints that twinkle; opened, it stands open and emptied.

**Tapping a node** brings up a bubble beside it, placed by script: its kind, its title and a button. A lesson, test or exam says Start, Carry on (part way through: it carries on from the first step not yet done) or Again (done: from the top). A chest says Open, and once opened just "Opened". A review or animation says Start. A node still ahead shows its kind and title only, and gives a small shake.

**A chest** opens on a screen of its own: it pops in closed, then its lid springs open with a light from inside and glints, and "What's inside comes with the shop." Opening it is saved and sent up (an `open` event), and the path goes on. Currency is a later stage.

**An animation** is a narrated scene on its own (see Scenes, below), played as a lesson of that one step: the cross leaves, the thin bar fills as the lines go by, and Continue at its end goes straight back to the path, the animation done. An animation without its scene file, and **a review** for now, is a placeholder screen that says it comes later; visiting it is saved and sent up, and the path goes on past it.

With no topics yet, Learn says so, with Connect if the app isn't connected.

## A lesson

A thin bar along the top fills as the steps go by, with a spring, and a cross beside it leaves at once: nothing is lost, and the path shows the steps done so far. Below that, the step: a figure or a part on top, the words under it, and for a question the way to answer it. Then a big button at the bottom.

| Step | On screen | The button |
|---|---|---|
| Explain | A short paragraph and a figure (a part, set up, or a picture) | Continue |
| Check | A question, sometimes a figure, and an answer to give: pick one; set a number on a slider or a dial (each starts at a real value, with its fill showing, and can show a picture that follows the value), on the keypad, or as a pile you can count; put things in order; draw strings between pairs, sort things into bins or snap jigsaw pieces together (or the old match); or tap a spot | Check, which wakes once there's an answer (at once for a slider, a dial, a pile or an order) |
| Play | A goal and a part to do it with, like a globe to tap | Check, which wakes once the part has been used |

**The step's layout** is one rule for every kind of step. The words start at the top; a figure above them grows first, to its cap; a Check step's answer takes the room left under the words and sits in the middle of it, so on a tall screen the space falls above and below it rather than in one gap at the bottom; and an answer with a picture (a slider's picture, a dial, a pile) takes a share of that room first, keeping back what the feedback will need, so checking doesn't make the step scroll. On an Explain or Play step the words sit in the middle of the room under the figure. On the smallest iPhone there's little room to share and every block keeps its own size.

**Checking** marks the answer and slides the feedback up from the bottom: **Right** in green, **Close** in gold, or **Not quite** in pink, with one line of why for the answer given. The answer stays on screen with the truth beside it: the right choice lit, the true value on the slider's scale or the dial's ring, a gold line at the true count on a pile (what's over it fades, what's missing shows as gold rings), the right order numbered, gold strings drawn to each right partner, wrongly sorted things hopping to their bins and wrong pieces flying to their cards, in gold, the right partner under each wrong match, the right spot ringed, and anything the lesson shows after an answer (the globe shades the band where hurricanes start). The button becomes Continue, in the feedback's colour. Being wrong costs nothing: there are no lives, and a wrong answer still moves the lesson on.

**The end** of a lesson: its topic's medallion pops up, "Lesson done" ("Test done", "Exam done"), how many of its questions were right, and where its facts came from. Continue goes back to the path. Tests and exams play exactly as lessons do.

## Scenes

A scene is a narrated animation: a script of lines, each said by the topic's narrator and always shown as a caption, with the parts on the picture (the globe, for now) doing things as the words are said. It's a step in a lesson, or an animation on the path by itself. It uses the same parts as every other step, so nothing is drawn twice.

- **On screen:** the picture on top, with a speaker in its corner; under it a pip for each line, filling as the line goes, and the caption, its words lit as the voice reaches them (a line read differently from its caption, through `say`, is lit whole); then back, play or pause, and skip. The big button at the bottom waits until the end (Continue), except while the scene waits for an answer.
- **Starting:** it opens still, on its first line, with a big play button over the picture. Nothing sounds until that tap. Its clips were fetched from the phone's storage before the button showed, so the tap starts the voice at once.
- **The voice is the clock.** Each line is one clip, and each frame reads where that clip has got to: whatever is hung on a word happens when the clip reaches the word. A slow start, a stall or a pause holds the picture with the sound; it never runs on by the time since the tap. Lines follow each other with a short gap (0.45 s, or more where the line asks for it).
- **Taps:** the picture pauses and plays. Back starts the line again, or goes to the one before when the line has just begun (between lines it starts again the line just said); the picture is rebuilt as it stood at that line's start. Skip goes to the next line, everything left on this one landing at once. Once the end has been reached, Continue stays awake, even while a line is played again. Leaving by the cross stops the voice.
- **Waits:** a line can stop the scene for the person to do something: "tap some sea that's too cool to feed one". Only then does the globe take touches (while the scene plays, a tap anywhere on the picture pauses it). Check wakes once the globe has been used; the answer is marked as a play step's is, with the same feedback, and Continue carries the scene on, right or wrong.
- **Silent is a normal way to watch.** With Voice off, each line runs on a reading clock (its words spread over the time they take to read, about a third of a second a word) and the scene waits at the end of each line for a tap to go on: "Tap to go on". The speaker on the picture turns Voice on or off from there, carrying on from the same moment.
- **When no sound plays** (the phone refuses to start a clip, or its clock stands still for about 2.5 seconds), the scene says so in a line under the caption and reads on from the captions for the rest of the run. The speaker tries the voice again. A clip that ends at once with no length, the fault seen on the phone after coming back to the app, is tried once more on a new player.
- **A line changed after it was voiced** plays from its caption until it's voiced again: a clip never says something its caption doesn't.
- **Saved and sent:** an animation sends `start`, any waits' answers, `seen` and `finish` like a lesson; a scene step is `seen` like an explain step, and isn't counted as a question.

### Narration on the phone

- **Players.** Every clip plays on a plain `<audio>`, a new one for every play: resuming after a pause, going back, trying the voice again all make a fresh player (the phone test's rule). An iPhone starts sound only from a tap, and a scene's later lines start by themselves, so at every tap that starts or carries on the scene, each clip still to come gets its new player then, started and stopped at once (nothing is heard), which lets it start later without a tap. If the phone refuses one anyway, the scene reads on from the captions, and a tap on the speaker tries again.
- **The phone's sound is left alone.** Nothing sets `navigator.audioSession`; the tests check it's never touched. A plain `<audio>` played through the silent switch on the phone test without that claim, so narration should be heard with the switch on silent.
- **Offline.** Clips are files in the data repo beside the lesson (`voice/`), so they come down with the lesson's media and are kept on the phone; a scene plays its voice with no signal. A clip that hasn't come down yet is read from its caption, and the line under it says the voice comes when there's signal.
- **Narrators.** Each subject has its own narrator, named by its topics (Heart unless a topic says otherwise). Profile lists the subjects under Narrators, each with its narrator; tapping one offers all four (Heart, George, Bella, Chatterbox A), the topic's own marked. A choice is kept and wins for every scene in that subject. Clips are made in all four voices on the PC, so a new choice plays at once, offline too.
- **What only the real phone can answer:**
  - Whether a speaking clip **pauses the person's music** (WebKit may treat a playing `<audio>` as media and interrupt other audio), ducks it, or plays over it. And whether it resumes their music after the clip, or after the scene. If narration does stop their music, the choices are to accept it while a scene plays, or to play voice through Web Audio, which mixes with other audio but follows the silent switch.
  - Whether the start-and-stop at the tap really lets the **later lines start by themselves** on iOS 18, or whether each line asks for a tap (it falls back to reading the captions, with a line saying so, rather than going quiet).
  - How late the **first clip after installing** starts (the phone test saw 1.3 seconds once): the picture waits for it, by design; whether that wait feels broken.
  - Whether a clip **survives the app being put away and brought back** mid-scene (the scene pauses when hidden; the next tap carries on, on a new player).

Every step started, read, answered and finished is saved on the phone and queued to go up: see Storage and sync.

## Practice

**Review** sits on top, with a fan of cards. It arrives with stage 2, so its Start is off and it says Soon.

**Playground** lists the kit's tools, like the globe as an atlas, each on a card with its picture, its name and the lesson that first uses it. Answer forms aren't tools: Inputs says `"playground": false` in its description and gets no card. Under the tools, one small, quiet row, **Answer forms**, opens Inputs with every form and its settings, so dragging can be tried on the phone: Answer shows the truth as a lesson does, Again starts afresh. Tapping a card opens the part by itself: full size, a row of things to try (from the part's description), and a panel of its settings, each a row of choices, a switch or a slider. Changing a setting redraws the part at once. Everything here is built from the part's own description, the same one the writer reads.

## Home and Shop

Calm placeholders. Home shows a small drawn room and says it comes later; the room is stage 4. Shop shows dark imprints of things to come, the way a locked thing will look, and says Soon.

## Profile

Two tiles: lessons finished, and questions answered right.

**Knowledge** lists each topic with a bar and a number. Until review arrives, the number is its questions' last answers: right counts in full, close a half, wrong nothing, and each fades by half every two weeks since it was answered. The colour runs from blue (well remembered) to grey, and a topic under 50% that has been tried has a warning mark. There's no word for fading, and no streak. Tapping a topic opens its details: when it was last studied, how many were right last time, a dot for each question, and a button to its path.

**Settings:** Voice, Effects and Music switches, and the text size (three sizes of A). Effects start off (ruled 2026-11-18: the press sounds are disliked until better ones are chosen by ear from a board). An install from before 0.2 has Effects turned off once, since its saved settings can't tell a chosen "on" from the old default; from 0.2 on, Effects is on only if the switch was turned on. Voice is the narration in scenes (on to start with); Music has nothing to play yet.

**Narrators:** each subject the topics name, with its narrator: the topics' own, or one chosen here from the four (see Scenes).

**Sending:** whether it's connected, Connect or Disconnect, what's waiting to send and what has been sent, Send now and Check for lessons, any problem in plain words, and when the writer last read the progress. Then whether the phone has promised to keep Primer's data, and the version.

## The feel

One module (`js/feel.js`) gives every press the same three things:

- **A soft sound**, when Effects is on (it starts off). Made on the spot as rounded sine notes, like a soft mallet on wood, through a gentle filter: no beeps, nothing square or 8-bit, nothing loud. A tap, a select, a switch on or off, two notes up for right, a softer pair for close, two notes down for wrong, and a short rising chord for a lesson's end. Effects off silences them all.
- **The phone's sound is left alone.** The app never sets `navigator.audioSession.type`, neither when it opens nor on a press. Saying its sound was media (`'playback'`) stopped the person's music the moment Primer opened. The cost: a made-up tone now follows the silent switch, as the phone test found, so with Effects on and the switch on silent the presses are quiet. The tick and the spring don't depend on sound.
- **A tick.** iPhones let a page tick only when a switch control flips, so a hidden one is flipped (Riffle's trick, felt on the phone test). Android vibrates. Nothing depends on it being felt.
- **A press.** Every button presses in as a real one would: while it's held it moves down onto its side and the side shrinks to nothing, and it comes back up when let go; a quick tap still shows it going in, for a moment. No bounce, no wobble, and nothing casts a shadow under a button: its side is its own darker tone (ruled 2026-11-18). This holds for the path's nodes, the lesson buttons, the choices, the tabs and everything else.
- **A spring.** Things that arrive pop in; the lesson bar fills with a spring. The bounce is the approved one, halfway between gentle and medium (`MOTION` in `js/feel.js`, from stage 0's look). Springs move transforms only.

Rules from the phone test, kept everywhere: no live blur on anything that moves (the globe's glow is a soft gradient, a lifted order item's shadow is solid); popovers are placed by script; nothing depends on the tick. Anything dragged moves by transform on a layer of its own, at whole screen pixels, so nothing under it is repainted as it goes and nothing is left behind (the slivers seen on the phone).

### Narration

Voice clips are plain `<audio>` elements, a new one for every play (the phone test's rule), and nothing claims the phone's sound: see Scenes, "Narration on the phone", for how it behaves and what only the phone can answer (above all, whether a speaking clip pauses the person's music).

## Parts

A part is one folder in `parts/`: a description (`part.json`) and one module. The description lists the part's settings (type, range, default), calls, events, state, what it needs and roughly how heavy it is, and how it's marked. The phone fills settings in from it, the Playground builds its panel from it, the writer's `primer parts` prints it and `primer check` checks lessons against it.

- **Inputs:** every way of answering, one module per form (`parts/inputs/forms/`) on a shared kit (`kit.js`): every form answers, is checked, shows the truth and is recorded the same way, and differs only where it must. Choice (shuffled); slider (linear or stretched); dial (the slider bent round a window, with the same settings); number (its own keypad, so the phone's keyboard never covers the button); pile (a count in rows of five, of a drawn thing or a picture: dot, storm, drop, leaf, star, coin); order (drag, or tap two to swap); string (pull a string from one side to its partner, or tap one and then the other); sort (carry things into two to four bins, or tap one and then the bin); snap (jigsaw pieces into the cards' sockets; the plug is the socket's exact size, and a piece clicks in flush, the two edges lining up as one block); match (the old pairing, kept for old lessons); and tap the spot on a picture. A slider, a dial and a pile start at a real value with their fill showing. Pictures that follow a number (`warmth`, `depth`, `wind`, a palm that bends in the wind) go above a slider or in a dial's window alike (`pictures.js`); a new one is an addition to the part, and any lesson can use it. Labels on strings, sorts and snaps can have a small picture. Anything carried (a slider's thumb, a dial's knob, a pile's level, an order's item, a sort's thing, a snap's piece, the end of a string) moves by transform on a layer of its own, at whole screen pixels. Number and spot are as they were; spot is redone when a lesson needs it.
- **Globe:** the stage 0 globe, drawn on one canvas. Drag to turn it, and it carries on a little when let go; it can turn by itself, or stay put. Labels for the bigger countries, four looks (day, sea warmth, muted, and political: every country one of four colours, no two neighbours alike), borders on or off, countries lit up, bands of latitude, points, pins, and the approved Disc hurricane, turning counterclockwise north of the equator and clockwise south of it. A tap reports the place, whether it's land and which country.
  - *Layers:* the sea and anything tinting it (sea warmth, a band's shade), then the land, then the borders, then every dotted line (the equator, a band's edges) over sea and land alike.
  - *Names* hold their place: a name that's showing keeps it ahead of any newcomer and goes only when truly crowded out or at the rim; names fade in and out, and fade toward the rim, rather than popping. Each sits on its country's biggest piece (France's in France, not between it and French Guiana).
  - *Four colours* are worked out once from the map's own shared borders: greedy, the most hemmed-in country first, with a swap of two colours along a chain of neighbours where all four are taken. On Natural Earth's 110m map no two neighbours share a colour.
  - *Cost:* the ball is drawn on a layer of its own and redrawn only while it turns, so a still globe costs nothing; band, warmth and four-colour shapes, the glow and the names' widths are made once, never per frame. No blur.

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

`skill/` holds the `primer` skill, installed with `python skill/install.py [--tts <folder>]`: `parts`, `check`, `fit`, `voice`, `send` and `progress`. `skill/SKILL.md` has the commands and the rules for writing. Its fit check draws each step in the real app, in headless Edge, rather than estimating, so it can't be the optimist; for a scene it draws every line's caption.

`voice` makes a scene's clips on the PC's graphics card, in the voice environments stage 0 set up (a folder holding `kokoro`, `chatterbox` and `check`, named by `--tts`, `PRIMER_TTS` or `install.py --tts`; never written into the code): Kokoro for Heart, George and Bella, Chatterbox's built-in voice for Chatterbox A. Each take is encoded as stage 0's clips were (AAC-LC, mono, 24 kHz, 64 kbps, about -16 LUFS, trimmed to its sound), heard back with faster-whisper, made again up to four times if its words come out wrong, and timed word by word by forced alignment (wav2vec2) against the finished clip, so the times are the phone's. The scripts that load the models (`skill/voice/say.py` and `hear.py`) run inside those environments; the skill only calls them. A clip is made again only when its words, narrator or making change.
