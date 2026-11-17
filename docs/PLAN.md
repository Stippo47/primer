# Primer: plan

A personal, free learning app in the spirit of Brilliant: flat vector art, narrated animations, things to play with that can really go wrong, and a reward loop that makes it hard to put down. The app itself is only a framework and a kit of reusable parts. Lessons are written for one person, on request, by an AI working on the PC, and played on the phone.

Status: the plan was answered on 2026-11-16 and stage 0 has started. `DECISIONS.md` records what the answers changed (thoroughness, voice, layout, rewards, asking, pictures) and wins where the two differ. Nothing of the app is built. Estimates are in agent-hours and are guesses until the first pilot lesson has been through the whole loop.

Research behind this plan is in `docs/research/`:

- `exploded-skill.md`: the build-it-and-break-it-apart skill
- `voice-and-animation.md`: narration, animation, the art style
- `components-and-data.md`: libraries, data and free media for the parts

---

## 1. The shape of it, next to Riffle

Riffle's build carries over almost unchanged, because the problem is the same: content written on the PC, used on an iPhone with or without signal, nothing running in between.

| | Riffle | Primer |
|---|---|---|
| App code | Public repo, GitHub Pages, no build step, plain JS modules | The same. It holds the player and the parts, never a lesson |
| Content | Private data repo: packs, decks, cards | Private data repo: topics, lessons, media |
| Phone to PC | Answers go up as new files, so nothing collides | Progress goes up the same way: every attempt, every review |
| Offline | Service worker keeps the app; decks and pictures come down ahead | The same, plus lesson audio |
| Nothing typed is lost | Backup list first, then the database | Reused as is |
| The writer's side | The `riffle` skill: check, fit, send, read answers, wait | A `primer` skill: check, voice, fit, send, read progress, wait for requests |
| Tests | Headless Edge with real touch, a stand-in for GitHub | The same harness, plus "every part mounts with every setting" |
| Rewards | Kept quiet on purpose | The opposite, on purpose |

Three things are new and are where the real work is:

1. **Parts are code, lessons are data.** A Riffle card is words and pictures. A lesson step can be a globe, a circuit or a running simulation. So the app needs a library of parts, and a strict rule for how a lesson asks for one (section 2).
2. **Lessons have sound and motion** that are made on the PC and must stay in step on the phone (section 4).
3. **The app keeps a model of what you know** (section 5), which Riffle never needed.

One thing the Riffle build gives for free and is worth more here than there: because every attempt comes back to the PC, the writer can read what you got wrong before writing the next lesson. A course can bend toward your weak spots.

Start by copying Riffle's storage, sync, notification, gesture and test code rather than sharing it. If a third app wants the same core (the music player idea), pull it out then.

---

## 2. Parts: the heart of the app

A **part** is a self-contained interactive thing that knows nothing about any lesson. A **lesson** is a file that says which parts to put on screen, how to set them, what to tell them to do, and what to watch for.

### The contract every part keeps

Each part is one folder in the app, with one module, and declares five things:

| It declares | For the globe, that's |
|---|---|
| **Settings**: every knob, with its type, range and default | `spin: free / auto / locked`, `zoom: off / pinch / fixed level`, `labels: none / countries / cities / both`, `labelFromZoom`, `detail: low / medium / high`, `style: day / night / data`, `scaleTo: none / sun / moon`, `interactive` |
| **Calls**: what a lesson can tell it to do | `spinTo(place)`, `zoomTo(place or level)`, `highlight(countries, colour)`, `colourBy(data)`, `arc(from, to)`, `point(place, label)`, `track(path, over time)`, `setYear(n)`, `clear()` |
| **Events**: what it reports | `tapped(country)`, `settled`, `zoomed(level)` |
| **State**: what can be read to mark an answer | `selected`, `centre`, `zoom`, `visibleCountries` |
| **Needs**: data and weight | world shapes at three detail levels, city list, roughly how heavy it is on the phone |

With that, the uses in the brief are all the same globe with different lines in the lesson file:

- *Where countries are*: `spin: free`, `labels: none`, ask "tap Mongolia", read `tapped`.
- *Earth to the Sun, to scale*: `scaleTo: sun`, `spin: auto`, `interactive: off`, a narrated scene calls `zoomTo`.
- *How hurricanes form*: `style: data`, `colourBy(sea temperature)`, `track(storm path)`.
- *Plane routes*: `arc(from, to)` for each route, `labels: cities`.
- *Deforestation over time*: `colourBy(forest cover)`, `setYear` tied to a slider.

### Three jobs from one description

Because every part describes its own settings and calls, three things come from that one description and never drift apart:

1. **The catalogue the writer reads.** `primer parts` prints every part with its settings and calls. That is how a future session knows what exists without reading code, and why a lesson can be written as data.
2. **The Playground on the phone.** Every part can be opened by itself with a panel of its settings to fiddle with. That is the reference and tools mode: the globe as an atlas, the fretboard as a chord finder, the circuit board as a calculator.
3. **The tests.** The harness mounts each part with each setting at its extremes on an iPhone-sized screen and checks it draws, responds to touch and cleans up.

### Rules that keep the kit small

- **A lesson never carries one-off code.** If a lesson needs something the kit can't do, the kit grows: a new part, or a new setting on an old one, built general enough for the next lesson. This is the main guard against a pile of throwaway widgets.
- **Prefer a general part with settings over a specific one.** A "network with things moving along it" part covers DNS lookups, how a page loads, route finding, supply chains, food webs and the nervous system. A "DNS diagram" covers one lesson.
- **Parts can hold parts.** A stage puts a globe, a chart and a slider on one screen and wires the slider to `setYear` on both.

### The first kit

Going through the topic list in the brief (websites, trees, navigation, war tactics, e-commerce, welding, maps and flags, birds, shaders, DNS, a language), these few parts cover most of it:

| Part | What it is | Covers |
|---|---|---|
| **Globe / flat map** | Accurate shapes, spin, zoom, highlight, arcs, tracks, colour by data | Geography, navigation, weather, history, flights, tactics at theatre scale |
| **Network** | Boxes and lines, with packets that travel, queue and get dropped | DNS, page loads, routing, supply chains, metabolism, food webs |
| **Stage** | A backdrop with vector actors that move along paths, and can be dragged | Tactics (units on terrain), animal behaviour, any narrated scene |
| **Layers** | A picture in labelled layers that peel, slice or pull apart | Tree trunks, weld cross-sections, engines, cells, the Earth |
| **Chart** | Bars, lines, dots, drawn in the house style, can be scrubbed and predicted on | Any data; "draw where you think the line goes" |
| **Cards** | A picture, sound or word on one side, the answer on the other, in sets | Flags, birds by sight and call, vocabulary, tree leaves |
| **Sandbox** | Bodies, forces and joints in 2D, with dials | Mechanics, bridges, the three-body problem (as its own mode) |
| **Tokens** | A tray of blocks to snap into a program or a formula, then run | Python basics, HTML structure, shader maths, logic |
| **Inputs** | Slider, dial, number guess, order these, match these, tap the spot | Every question form |

Specific parts (a guitar neck that sounds, a circuit board, a water tank, a shader canvas) get built when a lesson first asks for one, each 2 to 6 agent-hours.

### The take-apart skill

The skill in the brief is almost certainly **teardown** (github.com/elvarofficial/teardown, MIT, released 2026-10-30): "a Claude Code skill that turns any machine into a 3D simulator you can take apart". About 80% sure; the viral post itself wasn't found. A skill called OBLITERATUS exists and is unrelated (it's about language models), which may be where the name came from. Details in `docs/research/exploded-skill.md`.

What it does: for each machine it writes a one-off 3D page, about 30 KB of hand-written code, with a slider that pulls the layers apart, a cutting plane that slices through everything, and a way to isolate one part while the rest go ghostly. It's built for a wide desktop screen and tells phones to turn sideways.

How to use it here: take its ideas, not its code, because a one-off page per machine is exactly what the "no one-off code" rule is there to stop. Instead, **one viewer in the kit, and each model is data**: a list of pieces, each a simple shape (box, cylinder, turned profile, extruded outline, gear, coil), with its name, a note, which way and how far it moves when pulled apart, and in what order. On top of that, build-up steps, each with a question ("what happens if this spring is left out?"), so a model can be assembled piece by piece as a lesson, then taken apart in the Playground.

Two forms of the same data: a flat layered drawing by default, which fits the art style and costs the phone nothing, and true 3D only where turning it round teaches something.

Honest limits: this gives clean technical models. It's good for engines, locks, pumps, gears, buildings, the layers of the Earth or a tree trunk. It's poor for anything organic or freeform, and proportions can look convincing while being wrong unless real dimensions are looked up, so the checker should demand a source for them.

---

## 3. What a lesson is

A lesson is 5 to 15 minutes: a run of **steps**, one screen each, like Duolingo's rhythm but with Brilliant's content.

| Step | What happens |
|---|---|
| **Scene** | A narrated animation, 20 seconds to 3 minutes. It can stop and wait for you to do something before it carries on |
| **Play** | A part with a goal: "get the probe into orbit", "make the page's title red" |
| **Predict** | You commit to a guess, then the app runs your guess and shows what happens |
| **Explain** | A short paragraph with a figure, for what's better read than heard |
| **Check** | A quick question on what was just taught (the pop quiz) |
| **Look** | A real photograph, map or document, with credit, to tie the vector world to the real one |

Above a lesson: a **topic** (bears) holds **lessons**, grouped into **units** when there are many. A topic also has a **test** at the end of each unit and one **exam** over all of it.

### Getting it realistically wrong

The brief asks for playgrounds where a wrong answer is a real possibility. That only happens if it is designed in, so these are rules the checker enforces, not hopes:

1. **Big answer spaces.** A slider, a placement, a drawn line, a built program or a typed number, before a choice of four. "How many Earths fit across the Sun?" is a slider on a stretched scale, marked by how close you got, with your guess and the truth then drawn to scale.
2. **Predict, commit, run.** The app plays out *your* answer: your orbit decays, your bridge sags, your route takes the long way. Then the right one is laid over it.
3. **Wrong choices come from real misconceptions.** When a question does offer choices, the writer has to say why each wrong one is tempting. The checker refuses a choice question without that note, the way Riffle refuses a question with no pick.
4. **Every play step must be able to fail.** The writer supplies a plausible wrong input and what should happen. The checker runs it. A sandbox that can't be got wrong is sent back.
5. **No tells.** Choices of similar length, shuffled, no "all of the above".
6. **Being wrong is cheap in lessons and costs something in exams.** No lives in a lesson. An exam has a pass mark and a wait before a retake.

The research this leans on (recalled, not re-checked this session): trying a problem before being taught it improves understanding even when the attempt fails (Kapur's productive failure; Sinha and Kapur's 2021 review found a moderate gain for conceptual knowledge), and a failed guess before the answer helps memory of the answer (the pretesting effect; Richland, Kornell and Kao 2009).

---

## 4. Scenes: animation with a voice

### How Brilliant and Duolingo do it, and why that doesn't transfer

Both use Rive: an animator draws and rigs each piece in an editor, and the app plays the file. Duolingo's talking characters are generated speech, then a pass that finds when each word and sound falls, then mouth shapes triggered in step with the audio (their own write-up, verified). There is no animator here and an AI can't drive that editor. The part worth copying is the design: **sound, plus a small timing file, drives the picture**. The picture here is the parts from section 2, moved by code.

### A scene is a script

A scene is a list of **lines**. Each line has what's said, and what the parts on screen do while it's said:

```
L01  say: "Warm water is the fuel."
     do:  globe.colourBy(seaTemperature)
L02  say: "Above about 26 degrees, the air over the ocean starts to rise."
     do:  at "26 degrees": chart.mark(26);  at "rise": stage.play(updraft)
L03  wait: "Drag the storm to where you think it will form."   check: globe.selected is in the warm band
L04  say: "Not on the equator, though. There's no spin there to start it turning."
```

- **One sound clip per line.** Stopping for you to do something falls naturally between lines. Skipping back is a line at a time. Fixing one sentence re-voices one clip, not the lesson.
- **Actions hang on words, not seconds.** "At the word *rise*" is turned into a time on the PC after the voice is made. Change the voice or the wording and the timing follows.
- **The sound is the clock.** The picture follows the clip's position, so they can't drift, and scrubbing works.
- **It works silent.** Every line is also a caption, and a tap moves to the next line at reading speed. Sound off on the bus is a normal way to use it, and it's the fallback if iPhone audio misbehaves (below).
- **A scene uses the same parts as a play step.** The globe that was just narrated at you is the globe you then get your hands on, in the same position. Nothing is drawn twice.

### Picks from the research

| Layer | Pick | Why, and the runner-up |
|---|---|---|
| Voice | **Chatterbox** for narration, **Kokoro** for drafts | Both free, run on this PC's graphics card, and are open (MIT, Apache). Chatterbox is the more expressive and covers 23 languages; Kokoro is plainer, very fast and very consistent. Higgs Audio 3 may sound best and has 100+ languages; its weights are non-commercial, which is fine here. **The rankings came from weak sources: pick by ear from one paragraph in each** |
| Word timing | Forced alignment of the known script against each clip | The good voices don't report word times. A few lines of Python; seconds per clip |
| Sound files | AAC (m4a), mono, about 64 kbps | Roughly half a megabyte a minute, so a ten-minute lesson is about 5 MB. Opus is smaller but has a history of failing on iPhones |
| Playback | Plain audio elements, started by a tap | These ignore the iPhone's silent switch. The other route (Web Audio) is muted by it |
| Motion | **GSAP** | Free for everything since April 2025, including the plugins that used to cost (verified). Timelines that can be paused, scrubbed and jumped, written as code. Runner-up: anime.js 4 |
| Drawing | SVG for parts, canvas for particles and the globe | Real blur filters are slow on iPhones; glows are faked with layered soft shapes |

### Risks here

1. **iPhone home-screen apps had a bug in iOS 26 where sound went silent after the first run** (WebKit bug 291892; a later beta is said to fix it, unconfirmed). This has to be tried on the real phone in stage 1, before any voice work. It's also why silent mode isn't optional.
2. **Button sounds and narration want different things.** Snappy button sounds want Web Audio, which the silent switch mutes; narration wants audio elements, which it doesn't. Likely answer: both, with button sounds simply obeying the switch. To be tried on the phone.
3. **Quality.** Timing and motion will be right. Whether a scene has charm is the open question, and only a sample will answer it (section 8).

Also from the research on how people learn from narrated animation (Mayer's multimedia principles, recalled): narration with pictures beats on-screen text with pictures; short learner-paced segments beat one long film; and decoration that doesn't explain anything costs understanding. The line-by-line build fits the first two. The third is a rule for the writer.

---

## 5. What the app knows about what you know

Four things in the brief (pop quizzes, tests, exams, the endless reinforcement mode) are one mechanism seen four ways.

**Every lesson declares its facts.** A fact is one thing worth knowing afterwards: "a grizzly's winter sleep isn't true hibernation: its body temperature drops only a few degrees". Each fact comes with **two or more ways of asking it**, and some of those use a part: tap the country, set the dial, pick the photograph. Several ways of asking matter because otherwise you end up memorising the question.

For families of facts (every flag, every local bird, every country's place on the globe) the writer supplies a table and a few question shapes, and the app makes the hundreds of facts itself.

| | Draws from | Feel |
|---|---|---|
| **Check** (pop quiz) | Facts from the last few steps | Inside the lesson, free to miss |
| **Test** | A unit's facts, asked in ways the lesson didn't use | End of a unit, scored |
| **Exam** | The whole topic, harder forms, no hints | Pass mark, the topic's best trophy |
| **Review** | Everything you've ever learned, all topics mixed | Endless, fast, a combo meter |

### Review, the endless mode

- **What comes up is chosen by a memory model, not at random.** Each fact has an estimate of how likely you are to still remember it, updated every time you answer. Facts are shown when they're about to slip. The model is FSRS, the open scheduler Anki moved to (see the research file for the JS port).
- **It tests; it doesn't reteach.** A miss shows the answer and one line of why, with a link to the exact lesson step, and the fact comes back sooner.
- **Snippets, stitched.** A fact can bring the figure it was taught with: the globe already turned to the right ocean, the circuit with one wire missing. Topics are mixed on purpose. Mixing is slower in the moment and better for telling similar things apart, which is exactly the bird and flag problem (Kornell and Bjork 2008, recalled).
- **Combo.** Consecutive right answers build it and multiply what you earn. Because the model picks the facts, the combo can't be farmed with easy ones. A recall after two months is worth more than one after a day.
- **Where you're strong and weak** is a screen: each topic's facts as a field of dots from bright to faded, and a list of the ones you keep missing. The writer on the PC sees the same.

One mechanic to consider, since it ties the currency to learning: **a wager**. Before answering in review you can tap "sure". Sure and right pays double; sure and wrong costs. Confidently wrong answers are the ones people correct best once shown (Butterfield and Metcalfe 2001, recalled), and it makes a wrong answer sting a little.

---

## 6. Asking for a topic

"Teach me about bears, extensive."

1. **The ask.** In chat at first. Later from the phone: a screen with the topic, a thoroughness setting, a line for the angle you care about, and a place to attach a source. It lands in the data repo as a request file, and a waiting session on the PC wakes for it, the way `riffle wait` works. As with Riffle, that needs a session left open and the PC awake.
2. **Thoroughness.**

| Level | Lessons | What you get | Rough cost |
|---|---|---|---|
| **Glance** | 1 to 2 | The broad picture | 2 to 5 agent-hours |
| **Solid** | 4 to 6 | The main ideas, each with something to play with, one test | 8 to 15 |
| **Deep** | 10 to 15 or more | One lesson per sub-topic, unit tests, an exam, its own trophies | 20 to 40, across several agents |

   For bears at Deep: what a bear is and the eight species; diet and metabolism; winter sleep; reproduction and cubs; range and habitat (the globe); senses and intelligence; bears and people (attacks with the actual numbers, hunting, bile farming); conservation; bears in myth and culture; an exam.
3. **Syllabus first, for Solid and Deep.** The lesson list comes to the phone before anything is built, so lessons can be dropped, added or re-aimed. A wrong outline is the expensive mistake.
4. **Research, with sources kept.** Every number carries its source and year. Each lesson has a Sources sheet.
5. **Write, build, voice.** Steps, facts, scenes. If a lesson needs a part the kit lacks, that's flagged with its cost before it's built.
6. **Check.** The file is valid; every part setting exists; it fits the smallest iPhone; every play step can be passed and can be failed; every fact has two ways of asking; and a second agent, who hasn't seen the draft's reasoning, checks the claims against the sources.
7. **Send.** A notification on the phone.

**From a source.** A lecture, a textbook chapter, an article: the same pipeline, with the source as the spine. The lesson says where it follows the source and where it adds or disagrees. A photographed page works as well as a PDF.

**Honesty.** Written into the skill as rules for the writer: say plainly what is known, what is disputed and what is wrong; no softening words for death, suicide, drugs or violence; statistics with their source, year and what they do and don't measure; if a touchy fact is the natural next thing to say, say it. A step can be flagged "something's off" on the phone, which comes back to the writer like a Riffle problem. The one limit is narrow: a lesson explains how dangerous things work and what happened, but isn't a working recipe for mass harm.

**Pictures.** Openly licensed pictures (Wikimedia Commons, NASA, iNaturalist's open ones) are copied into the private repo with their credit, so they work offline. Pictures with rights reserved are linked rather than copied. There is enough open material that this rarely costs anything.

---

## 7. Rewards

The brief: a currency, something to spend it on, trophies per topic, a room to decorate shown as a cutaway, an avatar to dress and hit, and parts unlocked by beating lessons or paying.

**The proposal ties these into one thing: the room is your memory.**

- **Each topic makes its own trophies**, designed with the course. Bears: a paw cast, a salmon, a claw-marked log; a gold version of one for the exam. They're vector objects in the house style.
- **Trophies are the room's furniture.** They go on shelves, walls and the floor of the cutaway room. So the room fills up with what you've learned and nothing else, and no separate collection screen is needed.
- **Objects dull when the memory behind them fades.** A topic you haven't reviewed gathers dust: its objects lose colour. Reviewing polishes them. Tap an object to review its topic. This does the job a streak does in Duolingo, without a streak: the pull to come back is your own shelf going grey, and it's honest, because it's tied to what you'd actually still remember.
- **Currency** comes from lessons, tests, exams and review combos. It buys the room's bones (wallpaper, floor, lighting, shelves, a bigger room), looks for the avatar, and early unlocks.
- **Playground unlocks are earned.** Finishing the lesson that introduces a part opens that part in the Playground for free play. Paying currency opens it early. Nothing in a lesson is ever locked.
- **Feel.** Every press has a sound, a tick of haptics and a little spring. One module holds all of it so it's consistent and tunable. Riffle's iPhone haptic trick and gesture tuning carry over.

A caution from the research on rewards (recalled): paying people for doing something they already find interesting tends to make them like it less (Lepper 1973; Deci, Koestner and Ryan 1999). Rewards that tell you how well you did are safer than rewards for turning up. So: pay for recall and mastery, not for opening the app.

No take yet on the hit-the-dummy avatar beyond: it's a toy, it's cheap once the Sandbox part exists, and it can wait until then.

---

## 8. The look

Kurzgesagt's films are drawn by a studio of illustrators. What an AI writer can do reliably is the part of that look that is rules: a tight palette, flat shapes with a soft glow, consistent corner radii and line weights, slow drifting backgrounds, and clean motion. That gets clean, good-looking moving diagrams. It does not get hand-drawn characters with charm. Detail in `docs/research/voice-and-animation.md`.

So, in order:

1. A **style sheet as rules**: palette, shapes, glow, type, motion. The designer owns the look; agent art is a sketch of it.
2. **One sample scene, in a few looks, as short films**, before any kit is drawn. One base before variations.
3. Organisms and objects come from open vector sources where they exist (see research), recoloured to the palette.
4. The layout follows Duolingo: a path of lesson nodes per topic, and four tabs: Learn, Review, Playground, Room.

---

## 9. Stages

| Stage | What | Agent-hours (guess) |
|---|---|---|
| **0** | Answers to the open questions. A style board: one scene in a few looks. A voice sample page | 3 to 5 |
| **1** | The shell: copy Riffle's core; lesson player with Explain, Check and Play steps; the Inputs part and one figure part; the feel module; the `primer` skill with check, fit and send; **one tiny pilot lesson, tried on the real iPhone before anything else is built** | 12 to 18 |
| **2** | Scenes with voice. Globe, Network, Stage, Chart, Cards. Facts, tests and Review. The Playground | 25 to 35 |
| **3** | Asking from the phone, thoroughness, sources, the fact-check agent. The first real course at each level | 10 to 15, plus the courses |
| **4** | Currency, trophies, the room, the shop, unlocks | 15 to 20 |
| **5** | More parts as lessons ask: Layers and pull-apart models, Sandbox, Tokens, a sounding guitar, circuits. Exams. A language, as an experiment | 2 to 6 each |

The brief's "version 1" (a framework and useful parts, no lessons built in) is stages 1 and 2. The app ships with no lessons; the pilot lessons live in the private data repo like any other.

---

## 10. Where I'd push back

- **"No lessons in version 1" shouldn't mean no lessons while building it.** A kit built without lessons to test it against turns into parts that look good alone and don't fit together. Two or three small pilot lessons, chosen to be as unlike each other as possible, should drive the kit. Suggested: one on the globe (where hurricanes form), one on a network (what happens when you type a web address), one on cards (ten local birds).
- **The voice and animation are the costliest part of every lesson and the riskiest for quality.** A lesson without a scene costs perhaps half as much. So scenes should be used where motion explains something, not as decoration, and every lesson must work with the sound off.
- **A language is a different product.** It's hundreds of lessons, wants pronunciation and listening, and lives or dies on the review loop. The framework will carry it (Cards, audio, typing, culture as Look and Scene steps), but it should be an experiment after stage 3, not a reason to shape the framework now.
- **The app can't make lessons by itself.** There's no AI inside it; a session on the PC does the writing. An in-app AI would need a paid key. That's the price of free, and it's the same trade Riffle makes.
- **An AI writing lessons will get things wrong sometimes.** The sources sheet, the second-agent check and the flag button reduce it; they don't remove it. For anything that matters outside the app (welding safety, medical facts), the lesson should say what to verify elsewhere.

---

## 11. Technical picks, in brief

From `docs/research/components-and-data.md`, where each claim is marked as checked this session or recalled.

| For | Pick | Note |
|---|---|---|
| Globe and maps | d3-geo drawn on a canvas, with Natural Earth shapes at two detail levels | Natural Earth is public domain. About 0.9 MB for the shapes. Spin, labels and day/night are written by hand. Flat by nature, which suits the look. A 3D globe library was the runner-up and looks like a product demo, not a drawing |
| History overlays | historical-basemaps for old borders; storm tracks from NOAA; forest loss from Global Forest Watch | The old-borders set is rough and GPL: fine for one private user, a blocker if the app is ever shared |
| Physics | planck.js for bodies and joints; water, orbits and circuits written by hand | The ready-made circuit simulator is GPL and Java-born. Orbits need a careful integrator, which is 30 lines |
| Sound making | Plucked strings synthesised directly (no samples), tonal.js to name chords | No sample files to download |
| Programs | Hand-built drag tokens with a tiny interpreter. Real Python later through MicroPython or Skulpt | Full Python in the browser (Pyodide) is about 12 MB and risky on an iPhone 11 |
| Maths | KaTeX for formulas; plots and charts by hand on canvas | |
| 3D | three.js, loaded only by lessons that need it | About 0.7 MB |
| Memory model | ts-fsrs | One 40 KB file, no dependencies. Default settings are fine until there are about a thousand reviews |
| Free media | Wikimedia Commons, Openverse, NASA, iNaturalist (open-licensed photos only), PhyloPic silhouettes, xeno-canto bird sound | Always downloaded on the PC when the lesson is written, with credit stored beside the file. The phone never calls these. eBird and Macaulay media are rights-reserved: link, don't copy |
| Storage on the phone | Home-screen apps get the big allowance (WebKit's own post) | Hundreds of megabytes of lessons is fine. Progress is already safe because every attempt also goes to the data repo |

Everything the first kit needs to carry comes to about 3 MB.

Things only the real phone can answer, so they go first in stage 1: sound in a home-screen app on the phone's iOS version, whether the haptic trick still works there (one source says a recent iOS removed it), and how many glowing shapes it draws smoothly.

---

## 12. Already in the Dev folder

**WorldWise** (June 2026) is an earlier run at part of this: a Duolingo-style geography app with a 3D globe, a travel economy, minigames made from a table of country facts, and a passport of collectables. It's built on React with a build step, so its code doesn't drop into a Riffle-style app. Worth taking: its country fact tables, the globe coloured by how well you know each country, and the idea of generating many questions from one table (which is section 5's "families of facts").
