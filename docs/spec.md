# Primer: how it behaves

Primer is a phone web app for learning, one topic at a time, by doing as much as by reading. Lessons are written on the PC, as files, and sent to a private data repo; the phone reads them, with or without signal, and every answer goes back the same way. This page says what the app does as of stage 1, the shell. `PLAN.md` says where it's going and `DECISIONS.md` what was ruled.

## The tabs

Five, left to right: **Learn**, **Practice**, **Home** (raised, in the centre), **Shop** and **Profile**. The app opens on the tab it was left on. The tab bar hides inside a lesson, a review run, an opened Playground part and the connect screen; a cross (a lesson, a review) or a back arrow (the others) in the top left leaves. A quiet ring on Profile's icon means something there wants a look: not saving, not sending, or an update ready.

## Learn

The top row names the topic, with its medallion. Tapping it opens the list of topics as a sheet: each with its medallion, its level as one word (Glance, Tour, Solid, Deep) with four dots, and a bar of how much of it is done, or a cup once all of it is. Tapping one shows its path.

**The path.** Each node on the path is a whole thing, worked through from one to the next: a lesson, a test, an exam, a chest, a review of everything before it, or an animation on its own. Each is a raised button on a winding trail with its own mark, as the stage 0 sketch has them: an open book for a lesson, a star on a hexagon for a test, a cup on a larger hexagon for an exam, two arrows round for a review, a play mark with sound for an animation; a chest is drawn as the chest itself, shining when it's next, open once opened. Done nodes are gold, the one to do next is blue with a ring round it showing how much of it is done, and the rest are dim. A unit of the path is a banner with a pip for each of its nodes; a finished unit has a cup at its end. The trail is gold as far as it's been walked. Pines and a few stars sit beside the trail; they're decoration. A lesson's own steps aren't on the path: they show inside it, on its thin bar.

**The chest** is drawn the way the room's trophies are: a clear form, three tones each of wood and gold, one highlight, lit from the upper left, and nothing under it. Still ahead, it's the same closed chest in the path's dim tones; next, closed in its own colours with a warm glow and glints that twinkle; opened, it stands open and emptied.

**Tapping a node** brings up a bubble beside it, placed by script: its kind, its title and a button. A lesson, test or exam says Start, Carry on (part way through: it carries on from the first step not yet done) or Again (done: from the top). A chest says Open, and once opened just "Opened". A review or animation says Start. A node still ahead shows its kind and title only, and gives a small shake.

**A chest** opens on a screen of its own: it pops in closed, then its lid springs open with a light from inside and glints, and "What's inside comes with the shop." Opening it is saved and sent up (an `open` event), and the path goes on. Currency is a later stage.

**An animation** is a narrated scene on its own (see Scenes, below), played full screen like a video: no header, no tab bar and no Continue bar, just the picture, its captions, and controls that come up on a tap. At its end it stops on the last picture with Watch again and Next (the next node on the path), and it's done. An animation introduces a concept; the lessons after it reinforce and expand it, and a test tests it. An animation without its scene file is a placeholder screen that says it comes later; visiting it is saved and sent up, and the path goes on past it.

**A review** on the path is a review run (see Review, below) of the facts of the lessons before it: at most twelve, the least well remembered first, each once and a miss once more. Getting to its end is what makes it done. If those lessons declare no facts, it's a placeholder that says there's nothing to go over, and visiting it lets the path go on.

**A test or exam drawn from facts** plays like any other, its questions chosen afresh each time it's started (so it starts from the top, never "Carry on").

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

**Read aloud.** With Voice on, a step's words are read aloud in the subject's narrator as the step opens (its text, or its question), and the line of feedback once an answer is marked, each word lighting up in place as it's said: words not yet said are a softer tone, said ones full white, and nothing moves. Moving on stops it; tapping the words reads them again; nothing waits for it, so a question can be answered while it's read. With Voice off, or for words not voiced yet, they are simply there to read.

## Scenes

A scene is a narrated animation: a script of lines, each said by the topic's narrator and shown as a caption, with the parts on the picture (the globe, for now) doing things as the words are said. It's an animation on the path by itself, played full screen, or a step in a lesson, played inside the step: the same player either way. It uses the same parts as every other step, so nothing is drawn twice. It plays through like a video: nothing in it waits for an answer.

- **On screen:** the picture, filling the screen within the safe areas (or the step), taking no touches; over its foot the caption, with no plate behind it (a dark halo round its letters keeps it readable on any picture), at most two lines at a time: a line's words come in phrase-sized pages, each shown as its first word is said, each word lighting up as it's said (the read-along part a lesson's words use). Nothing else until a tap.
- **The controls,** on a tap anywhere: pause and play in the middle, the line before and the next line on either side, a bar along the bottom that can be dragged to any moment (each line's start marked on it), the time gone and the whole, captions on or off (the CC box beside the speaker, always there; with the voice the choice is kept), the voice on or off, and, full screen, a close button in the top left. They fade after about three seconds without a touch while it plays, and stay while it's paused; another tap on the picture puts them away. The caption rises clear of them while they're up.
- **Starting:** it starts by itself as it opens. Its clips were fetched from the phone's storage first, so the voice can start at once. If the phone wants a tap before any sound, it waits on its first picture with the play button showing.
- **The voice is the clock.** Each line is one clip, and each frame reads where that clip has got to: whatever is hung on a word happens when the clip reaches the word. A slow start, a stall or a pause holds the picture with the sound; it never runs on by the time since the tap. Lines follow each other with a short gap (0.45 s, or more where the line asks for it), so the whole is one timeline, which is what the bar shows.
- **Seeking:** dragging the bar, or the line before, rebuilds the picture as it was at that moment (the parts mounted again, everything before it run at once, a storm part way along its track put part way along it) and plays on from there in that line's clip. The line before goes to the start of this line, or of the one before when this one has only just begun. The next line lands whatever is left of this one at once and starts the next.
- **The end:** it stops on its last picture, with Watch again, and Next when full screen (the next node on the path). A scene step's end wakes the lesson's Continue.
- **Silent is a normal way to watch.** With Voice off, each line runs on a reading clock (its words spread over the time they take to read, about a third of a second a word), its words lit at that pace, and it plays straight through. The captions come on then, whatever was chosen, since they are the words; their button can still hide them, for that viewing only.
- **When no sound plays.** A clip still loading is waited for, not counted as silent: its 2.5 seconds start once it has the data to play, and only nothing to play for about 10 seconds counts. A clip that wasn't made ready in a tap and doesn't start (refused, or, before any tap, standing still: a phone that wants a tap but says nothing) stops the scene on its picture with play showing, and asks for a tap (after a first tap, only once). One clip whose clock stands still for about 2.5 seconds costs only its line, which reads on from its caption; the next line tries its own clip. Two lines in a row with no sound, or a clip refused though it was made ready in a tap, and a line at the top says so and it reads on from the captions for the rest of the run. The speaker tries the voice again. A clip that ends at once with no length, the fault seen on the phone after coming back to the app, is tried once more on a new player. (Round four: "No sound played" showed once on the phone and then the voice started: a first clip slow to get ready after a tap that readies every clip at once is the likely cause.)
- **A line changed after it was voiced** plays from its caption until it's voiced again: a clip never says something its caption doesn't.
- **Saved and sent:** an animation sends `start`, then `seen` and `finish` the first time its end is reached, or `leave` if it's closed before; a scene step is `seen` like an explain step, and isn't counted as a question.

### Narration on the phone

- **Players.** Every clip plays on a plain `<audio>`, a new one for every play: resuming after a pause, seeking, trying the voice again, reading a lesson's words again all make a fresh player (the phone test's rule). An iPhone starts sound only from a tap, and a scene's later lines start by themselves, so at every tap that starts, carries on or seeks the scene, each clip still to come gets its new player then, started and stopped at once (nothing is heard), which lets it start later without a tap. A lesson does the same for the next step's words on the tap that moves on. If the phone refuses one anyway, the scene reads on from the captions, and a tap on the speaker tries again.
- **Loud enough.** Clips are made at about -13 LUFS with their true peaks held under -1 dB (a phone page can't raise its own volume, so the loudness is in the files).
- **The phone's sound is left alone.** Nothing sets `navigator.audioSession`; the tests check it's never touched. A plain `<audio>` played through the silent switch on the phone test without that claim, so narration should be heard with the switch on silent.
- **Offline.** Clips are files in the data repo beside the lesson (`voice/`), so they come down with the lesson's media and are kept on the phone; a scene, a lesson's words and review's questions play their voice with no signal. A clip that hasn't come down yet is never an error: its line plays from its words on the reading clock, as with Voice off, and a line under a scene says the voice comes when there's signal.
- **Only the narrator in use.** Every line is voiced in all four narrators on the PC, but the phone brings down only the clips of the narrator each topic uses, about a quarter of its voice (the pilot, its review questions voiced too, comes to 15 MB in Heart's voice where all four would be 59 MB), and a narrator's clips are let go once no topic uses it.
- **Narrators.** Each subject has its own narrator, named by its topics (Heart unless a topic says otherwise). Profile lists the subjects under Narrators, each with its narrator; tapping one offers all four (Heart, George, Bella, Chatterbox A), the topic's own marked. A choice is kept and wins for every animation, lesson and review question in that subject. Its clips come down then, and a line under the Narrators says so ("George's voice is on this phone."); with no signal it says plainly that the voice comes when there is, and until then the subject plays from its words, never in the old narrator's voice. The old narrator's clips go at the next check that can reach the repo.
- **Review reads aloud too.** Every fact's asks are voiced with their lesson, keyed by fact and ask, so a review run, a test drawn from facts and a look back at a lesson step read their question and the feedback shown exactly as a lesson does, each in its own topic's narrator. Review picks the next question as soon as the answer is marked, so the tap on Continue can start it.
- **What only the real phone can answer:**
  - Whether a speaking clip **pauses the person's music** (WebKit may treat a playing `<audio>` as media and interrupt other audio), ducks it, or plays over it. And whether it resumes their music after the clip, or after the scene. If narration does stop their music, the choices are to accept it while a scene plays, or to play voice through Web Audio, which mixes with other audio but follows the silent switch.
  - Whether an animation **starts with its voice by itself** from the tap on Start, or waits for a tap on play; and whether a lesson's first step is read by itself (its clip can't be made ready inside the Start tap; later steps' are, inside the tap on Continue).
  - Whether the start-and-stop at a tap really lets the **later lines start by themselves** on iOS 18, after dragging the bar too, or whether the phone asks for another tap (it falls back to reading the captions, with a line saying so, rather than going quiet).
  - How late the **first clip after installing** starts (the phone test saw 1.3 seconds once): the picture waits for it, by design; whether that wait feels broken.
  - Whether a clip **survives the app being put away and brought back** mid-scene (the scene pauses when hidden; the next tap carries on, on a new player).

Every step started, read, answered and finished is saved on the phone and queued to go up: see Storage and sync.

## Practice

**Review** sits on top, with a fan of cards, its name, the best combo so far (a crown and ×n, no label, in the best run's tier) and Start. When nothing is due it says so plainly, "Nothing due", and offers **Review anyway**, which starts with the facts closest to slipping. Before any lesson has taught a fact, its Start is off ("After a lesson").

## Review

Every fact met is asked again just as it's about to slip. Lessons declare their facts, each with several ways of asking it (`format.md`, Facts), and a memory model keeps, for each, how likely it is to be remembered now and when it's due: FSRS, with its default weights, in whole days. Every answer to a fact counts, in a lesson, a test or review: right is Good, close is Hard, wrong is Again.

- **A run** is the lesson player with its own top row: the cross, the combo, and five pips. The tab bar hides. Each question is one of a fact's asks, played, marked, shown and saved exactly as a lesson step is, with the picture it was taught with when it has one.
- **What comes up:** the facts due, the most slipped first, every topic mixed (another topic than the last when one is near the front of the queue); each asked a way it wasn't asked last time. When the due ones run out, a line says so, and it carries on with the facts closest to slipping. It's endless: the cross ends it.
- **The combo** counts right answers in a row: close holds it, and wrong ends it unless a shield takes the miss (below). The pips fill one per right answer and empty after every fifth, when they ripple. No lives, and no coins until the shop.
- **Its chip comes alive as it grows,** in tiers (ruled 2026-11-18: tiers, not flames), each livelier than the last, calmly. One part, `js/combo.js` with `css/combo.css`; the thresholds, shields and looks are its `TIERS` table and nowhere else. The 23 tiers the designer kept (2026-11-19) are in use; the board's others are in `SPARE`, drawn the same way, never reached by a count. Tiers that are alike differ by more than colour: each has its own finish, cut or motion. The gap to the next tier grows three tiers at a time (3, 4, 5, 6, 8, 10, 13, 16), so void at 179 is a rare feat.

  | Tier | From | Shields | The chip | Its idle motion |
  |---|---|---|---|---|
  | Plain | 0 | 0 | the flat plate | none |
  | Wood | 3 | 0 | warm wood, its grain and a knot | none |
  | Tin | 6 | 0 | dull matte grey, a few dents | none |
  | Copper | 9 | 1 | warm metal, verdigris crusting its bottom edge and a corner | a slow warm sheen, a glint |
  | Silver | 13 | 1 | polished: the lit band with a fine bright line | a quick white sweep, a glint |
  | Gold | 17 | 1 | rich gold with a raised rim like a coin's | a warm sweep, two glints, a glow that breathes |
  | Platinum | 21 | 2 | a cool mirror: a bright sky over a sharp dark horizon | a faint rainbow sweep, two sparkles, the glow |
  | Emerald | 26 | 2 | the emerald cut: long steps round a wide table, corners cut, a few flecks inside | the light walks slowly along the steps; one soft glint |
  | Sapphire | 31 | 2 | a polished dome (cabochon), deep at its edges | a six-rayed star gliding over it |
  | Crystal | 36 | 2 | a cluster of purple points standing up | the points catch the light in turn; glints on the tips |
  | Ruby | 42 | 2 | the princess cut: rings of facets closing on the middle, a cross of chevrons | the light runs ring by ring inward; an ember breathing deep inside |
  | Diamond | 48 | 2 | the brilliant: pale and icy, a star of facets, a little fire | the facet wave, prismatic glints in turn, a rainbow sweep |
  | Obsidian | 54 | 2 | black glass with the curved ripples of where it broke | a violet sheen sweeping, a glint |
  | Opal | 62 | 2 | milky, with flecks of bright colour in it | pastels drifting through; the flecks flash in turn |
  | Titanium | 70 | 2 | brushed grey, fine lines along it, an anodised rainbow round its edge | a rainbow sweep, a glint |
  | Aurora | 78 | 2 | a night sky with a rim of light | ribbons of light drifting through, stars twinkling, a spark circling the rim, a glow turning teal to violet |
  | Nebula | 88 | 2 | a starry sky with soft clouds of pink and blue | the clouds drift the other way from aurora's ribbons |
  | Celestial | 98 | 2 | deep blue, a gold constellation between gold stars, a gold rim | a gold spark circling |
  | Eternal | 108 | 2 | white gold | pale rays turning behind it, a spark tracing a figure of eight |
  | Supernova | 121 | 2 | white hot in the middle, burning out to red | rings of light pulsing outward |
  | Eclipse | 134 | 2 | a black moon over the sun, its corona round it | a bead of light flaring on the moon's edge |
  | Singularity | 147 | 2 | a black hole: a glowing violet disc round a dark middle | sparks spiralling in, rings closing on it |
  | Multiverse | 163 | 2 | deep indigo | cyan and magenta copies of the chip drifting out of step behind it |
  | Void | 179 | 2 | a window into deep space | two layers of stars drifting past, nothing else |

  The pips fill in the tier's colour (aurora's run teal to pink). **Reaching a tier** is one moment, under a second: the chip swells and settles with the app's spring, a ring and a few bits of the tier's colour burst from it, the phone ticks (`feel.tick`), and once it has settled its idle motion starts. **Shields** (ruled 2026-11-18, the split 2026-11-19): plain, wood and tin none, copper to gold one, platinum and up two. A miss with a shield left cracks the chip instead of ending the combo: the count and pips hold, the chip takes a small knock, a crack opens across it with a flash and two flakes, and the phone ticks (`feel.sound('crack')` with Effects on: a porcelain tink with a soft knock under it, a sample made by `tools/make-sounds.py`). One crack shows per shield used. Right answers don't mend cracks; reaching a new tier does (the cracked chip fades as the new one swells). **A miss with no shield left shatters it:** fracture lines run through the chip, it swells a touch, and its pieces fly out from the middle, turning and falling as they fade, with plain ×0 coming up under them, the pips emptying from the right, a tick and `feel.sound('shatter')` (a bright break cascading away over a soft low thump, also a sample). A missed fact comes back the same either way. **The chip never jumps in width:** it keeps the widest it has been in a run, and grows smoothly when the count needs another digit. Everything that moves is a transform or an opacity on a small layer; glows are gradients, never blur; every idle period divides six seconds. **Reduced motion** (the system's setting; the app has none of its own yet, and a caller can pass `still`): the tiers keep their colours and look, cracks still show, and nothing idles, swells, bursts, knocks or flies. The tick stays.
- **A miss** shows the answer beside what was given and its one line of why, with a link (a book and the lesson's name) back to the lesson step that taught it: that step opens over the run, to look at or try again, and the cross on it comes back to the run. Nothing done there is recorded. The fact comes back three questions later, and in the memory sooner (a day, where a right answer might be days or weeks).
- **The summary,** when the cross ends a run with anything answered: a crown and the run's best combo, in that run's tier (the crown in its metal, the number and the light behind in its colour), how many were right of how many, and up to three facts missed. Continue goes back where the run started.
- **A topic on its own:** Profile's details for a topic have Review and the topic's name, a run of that topic's facts only.

Saved and sent: each answer is an `attempt` with the run's id, and the run's end is a `review` event (`format.md`, "A progress file").

**Playground** lists the kit's tools, like the map as an atlas, each on a card with its picture, its name and the lesson that first uses it. Answer forms aren't tools: Inputs says `"playground": false` in its description and gets no card. Under the tools, one small, quiet row, **Answer forms**, opens Inputs with every form and its settings, so dragging can be tried on the phone: Answer shows the truth as a lesson does, Again starts afresh. Tapping a card opens the part by itself: full size, a row of things to try (from the part's description), and a panel of its settings, each a row of choices, a switch or a slider; a setting marked wide, like the map's projection and style, has a line of its own with its choices across the panel. Changing a setting redraws the part at once. Everything here is built from the part's own description, the same one the writer reads.

## Home and Shop

Calm placeholders. Home shows a small drawn room and says it comes later; the room is stage 4. Shop shows dark imprints of things to come, the way a locked thing will look, and says Soon.

## Profile

Three tiles: lessons finished, questions answered right, and the best combo in review (a crown and ×n, in the best run's tier).

**Knowledge** lists each topic with a bar and a number: how much of what's been asked in it you'd recall now, by the memory model (the mean of its asked facts' recall). The colour runs from blue (well remembered) to grey, and a topic under 70% that has been asked has a warning mark (FSRS aims to review a fact as its recall falls to 90%, and its forgetting has a long tail, so 70 is well slipped). There's no word for fading, and no streak. Tapping a topic opens its details: when it was last studied, how many of its facts are due again, a dot for each fact (coloured by its recall; an open ring if never asked), Review and the topic's name, and a quieter link to its path. A topic written before facts existed keeps the old figure: its questions' last answers, right counting in full and close a half, each fading by half every two weeks, with a dot per question, how many were right last time, and the warning mark under 50%.

The same number, from 0 to 1, is what the room will fade a topic's things by (`app.memoryOf(topic)`, `data.memoryOf`).

**Settings:** Voice, Captions, Effects and Music switches, and the text size (three sizes of A). Effects start off (ruled 2026-11-18: the press sounds are disliked until better ones are chosen by ear from a board). An install from before 0.2 has Effects turned off once, since its saved settings can't tell a chosen "on" from the old default; from 0.2 on, Effects is on only if the switch was turned on. Voice is the narration, in animations and lessons alike (on to start with); Captions are an animation's captions, also turned on or off from its controls (with Voice off they're always on); Music has nothing to play yet.

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
- **Map:** the world, as a globe or a flat map: the projection is a setting (`globe`; `equal-earth`, the default flat map, where every country keeps its true size; `natural-earth`; `mercator`, shown from 60 S to 84 N as world maps on it usually are), and everything else is the same on all of them, written once. Drawn on one canvas in the stage 0 look. Drag to turn the globe or pan the flat map, and it carries on a little when let go; sideways, a flat world rolls round without end, and up and down it moves like paper, stopping at its edge. Pinch, or tap twice, to zoom (up to 8 times). It can turn by itself, or stay put. Labels for the bigger countries in view, four looks (day, sea warmth, muted, and political: every country one of four colours, no two neighbours alike), borders on or off, countries lit up, countries or bands of latitude coloured from a table, bands of latitude, points, pins, great-circle routes that draw themselves in, tracks drawn as far as they've got with something riding them, and the approved Disc hurricane, turning counterclockwise north of the equator and clockwise south of it. A tap reports the place, whether it's land and which country. How it's built, and how to add a layer or a projection, is in [parts.md](parts.md).
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
- **Everything is an event.** What has been done (the path's progress) and what's remembered (the memory of every fact) are both worked out from the events alone, the same events that go up (`data.apply`). So **a phone that connects with nothing kept**, new or cleared, gets it all back: after its first pull it reads every progress file in the repo once (they're never kept), adds anything still waiting to send, and replays them in time order. It does this once, and never over what a phone already has; if a file can't be read, it waits for the next pull rather than rebuild from half the story.
- **The service worker leaves other paths alone.** Its scope is all of `/primer/`, which also serves stage 0's pages and the docs, so it answers only for the app's own files and lets everything else go to the network. Its caches are named `primer-app-<version>`, and it only clears caches with that prefix: the stage 0 phone test's `primer-stage0-phone-…` caches survive.

## Nothing typed gets lost

As in Riffle: every write goes into a backup list in `localStorage` first, and leaves it only once the database has it. On the next start whatever is left moves back. A lost database connection is reopened and the write tried once more. If saving still fails, or there's no database (a private window), Profile says why and the tab bar's ring shows. Hiding or closing the app sends what's waiting. Names in shared storage start with `primer` (Riffle lives at the same address).

On iPhone the app has to be added to the Home Screen: Safari and the Home Screen app keep separate data. Connecting in Safari says so first.

## For testing

On a local test server only: `?api=` points the app at a stand-in for GitHub, `?insets=48,34` pretends to have an iPhone's safe areas, `?sw` turns the service worker on, and `window.__primer` reaches inside (`__primer.clock.shift(ms)` moves the app's clock on, so days of memory pass in a test). `tests/serve.mjs` serves the app under `/primer/` with the stand-in under `/__gh`; `tests/e2e.mjs` drives it in headless Edge with real touch; `tests/skill_test.py` tests the writer's side.

## The writer's side

`skill/` holds the `primer` skill, installed with `python skill/install.py [--tts <folder>]`: `parts`, `check`, `facts`, `fit`, `voice`, `send` and `progress`. `check` checks facts and their asks and expands families (the same expansion as the app's, `js/facts.js`, written again in Python and tested against it); `facts` lists a topic's facts, their asks and what teaches and draws on them; `fit` draws every ask too; `progress` adds which facts are strong and which weak, worked out by the app's own memory model (`skill/memory.mjs` runs `js/memory.js` in Node). `skill/SKILL.md` has the commands and the rules for writing. Its fit check draws each step in the real app, in headless Edge, rather than estimating, so it can't be the optimist; for a scene it draws every line's caption.

`voice` makes the clips for a topic's animations, scene steps and lessons' words on the PC's graphics card, in the voice environments stage 0 set up (a folder holding `kokoro`, `chatterbox` and `check`, named by `--tts`, `PRIMER_TTS` or `install.py --tts`; never written into the code): Kokoro for Heart, George and Bella, Chatterbox's built-in voice for Chatterbox A. Each take is trimmed to its sound and encoded loud (AAC-LC, mono, 24 kHz, 96 kbps, about -13 LUFS, with a gentle limiter working at four times the sample rate so true peaks stay under -1 dB), heard back with faster-whisper, made again up to four times if its words come out wrong, and timed word by word by forced alignment (wav2vec2) against the finished clip, so the times are the phone's. The scripts that load the models (`skill/voice/say.py` and `hear.py`) run inside those environments; the skill only calls them. A clip is made again only when its words, narrator or making change.
