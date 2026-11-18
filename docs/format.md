# The data repo's format

Everything the phone reads and writes lives in the private data repo, `primer-data`, branch `main`. The app in this repo holds no lessons.

```
index.json                              the list of topics, in order: the app reads it first
topics/<topic>/topic.json               a topic: its title, level, look, narrator and its path of nodes
topics/<topic>/<node>.json              a lesson, test or exam on the path: its steps and sources; or an animation's scene
topics/<topic>/media/<file>             its pictures
topics/<topic>/voice/<key>.json         a voice file: for a scene, or a lesson's own words, each line's clip for each narrator and when each word is said
topics/<topic>/voice/<key>/<clip>       its voice clips, one per line per narrator
progress/<time>-<random>.json           what the phone sends: every attempt and answer, a new file each batch
progress/connect-check-<time>-<random>.json   the app testing its key; ignore
read.json                               the writer's note of when progress was last read
notes/                                  the writer's own notes; the app never reads them
```

Ids (`<topic>`, node ids, step ids) are lower case words joined by hyphens, and never change once sent: progress refers to them. `primer send` writes `index.json` and puts files in place; don't edit the data repo by hand.

## index.json

```json
{ "v": 1, "updated": "2026-11-18T20:00:00.000Z",
  "topics": [ { "id": "where-hurricanes-form", "title": "Where hurricanes form", "level": "tour", "lessons": 2 } ] }
```

The app shows topics in this order. A topic folder not named here is not shown. If there is no index at all, every topic is shown, by id. `lessons` counts the lesson nodes on its path.

## topic.json

```json
{ "v": 1, "title": "Where hurricanes form", "level": "tour", "colour": "cyan", "mark": "swirl",
  "subject": "Earth science", "narrator": "heart",
  "about": "One sentence on what it covers.",
  "path": [
    { "kind": "animation", "id": "the-engine", "unit": "Fuel, spin and paths" },
    { "kind": "lesson", "id": "warm-water" },
    { "kind": "animation", "id": "the-spin" },
    { "kind": "lesson", "id": "spin-and-paths" },
    { "kind": "chest", "id": "first-chest" },
    { "kind": "test", "id": "checkup" }
  ] }
```

- **subject** and **narrator:** each subject has its own narrator voice (ruled 2026-11-17). `subject` names it in a few words; `narrator` is the voice its animations and lessons are told in: `heart`, `george`, `bella` or `chatterbox-a` (`heart` if left out). Topics of one subject should name the same narrator. On the phone, Profile lists each subject and lets another of the four be chosen for it; that choice wins over the topic's.
- **level:** `glance` (1 lesson), `tour` (2 to 4), `solid` (5 to 9) or `deep` (10 to 15), counting the lessons on the path. One dial: each step up is both longer and deeper. The app shows it as one word.
- **colour:** the topic's medallion, one of `orange`, `cyan`, `pink`, `yellow`, `purple`, `teal`.
- **mark:** the symbol on it, one of `swirl`, `paw`, `bolt`, `flag`, `strings`, `drop`, `leaf`, `globe`, `book`, `star`.
- **path:** the nodes on the Learn path, in order. Each node is a whole thing, worked through from one to the next. What each kind is for (ruled 2026-11-18): **an animation introduces a concept, the lessons after it reinforce and expand it, and a test tests it.** A section of a topic opens with an animation.

### The path

Each node has a `kind` and an `id` (unique in the topic, and not `topic`). It may have a `title`, and a `unit`: a node with a `unit` starts a new banner on the path, named by it (the first banner is named after the topic unless its first node names it). The banner has a pip for each node in its unit.

| kind | What it is | Its file | Its mark on the path |
|---|---|---|---|
| `lesson` | Steps that teach: explain, check and play | `<id>.json`, a lesson (below) | an open book, on a round button |
| `test` | Questions drawing on the lessons before it. At least 3; no explain steps | `<id>.json`, the same shape as a lesson | a star, on a hexagon |
| `exam` | A bigger test, at the end of a topic or a unit. At least 5 questions | `<id>.json`, the same shape | a cup, on a larger hexagon |
| `chest` | A reward for reaching it. Opening it is a small celebration and is recorded; what's inside comes with the shop (stage 4) | none | the chest itself, closed, then open |
| `review` | A review of everything before it on the path. A placeholder until review is built (stage 2): it says so, and visiting it lets the path go on | none | two arrows round |
| `animation` | A narrated animation on its own, played full screen like a video: a scene (below). Without its file it's a placeholder that says it comes later; give that one a `title` | `<id>.json`, a scene file | a play mark with sound |

A lesson's, test's, exam's or animation's title is the `title` in its file; a chest, review or placeholder shows the node's `title` (or "A chest", "Review", "Animation"). A node is done once a lesson, test, exam or animation has been played to its end, or a chest opened, or a review or placeholder visited; the next node not done is the one to do, and the ones after it can't be started yet. A lesson's own steps show inside it, on its thin bar, never on the path.

`primer check` refuses a test or exam with no lesson before it, a review with nothing played before it, unknown kinds or fields, repeated ids, and a missing file; it warns about a chest at the very start, two chests in a row, an animation without its scene file, and a test or exam with too few questions or with explain steps.

A topic written before the path existed has `"lessons": ["a", "b"]` instead; the app still reads it (each lesson becomes a lesson node), but `primer check` asks for `path`.

## A lesson (and a test or an exam)

```json
{
  "v": 1,
  "title": "Warm water and a spin",
  "version": 1,
  "minutes": 4,
  "steps": [ ],
  "sources": [ { "id": "jetstream", "by": "NOAA", "title": "JetStream: Introduction to Tropical Cyclones",
                 "url": "https://…", "checked": "2026-11-17", "says": "What it says that the lesson leans on." } ]
}
```

A test or an exam is a file of exactly this shape, played the same way; its end says "Test done" or "Exam done".

- **version:** raise it when the steps change in meaning. Progress carries it, so old answers can be told apart.
- **sources:** every lesson has at least one. `checked` says when it was read, or `recalled` if it wasn't re-read; `says` is what the lesson takes from it. Steps cite them by id in `src`.
- **steps:** 3 to 15, each one screen. Every step has a unique `id`, a `kind` and a short `title` (`primer progress` names the step by it).

### Step kinds

| kind | On screen | Marked by |
|---|---|---|
| `explain` | A short paragraph (`text`) and, if given, a `figure` | Nothing: Continue |
| `check` | A question (`ask`), an optional `figure`, and the Inputs part set by `input` | The step's `answer`, through the Inputs part's marking rules |
| `play` | A goal (`ask`) and a part to use (`play`) | `goal`, a rule over the part's state |
| `scene` | A narrated animation on parts: `parts` and `lines`, as in a scene file (below), played through like a video inside the step | Nothing: Continue wakes at its end. It isn't counted as a question |

Words: `*like this*` stresses a word (drawn gold). A line break stays a line break. Keep `text` and `ask` under about 300 characters; `primer fit` says what really fits.

### Read aloud

With Voice on, a step's words are read aloud in the topic's narrator as the step opens, each word lighting up as it's said; once an answer is marked, the line of feedback shown is read the same way. Moving on stops it, tapping the words reads them again, and nothing waits for it: a lesson can be answered while it reads, and with Voice off, or no clip, the words are simply there. What is read, and the id its clip is found by:

| id | The words |
|---|---|
| `<step>.text` | an explain step's `text` |
| `<step>.ask` | a check or play step's `ask` |
| `<step>.right` | its `right`, shown when it's right |
| `<step>.why` | its `why`, the line for any other wrong answer |
| `<step>.miss-<n>` | the `why` of the nth of its `misses`, counting from 1 |
| `<step>.option-<id>` | a wrong choice's `why` |

**say** gives words their own spoken wording, where the written ones don't read aloud well: a symbol, a unit, a number read a certain way, a name spelled as it sounds ("NOAA" said "Noah"). On a step, `"say"` is the spoken wording of its `text` or `ask`, or an object for any of its words: `"say": { "ask": "…", "right": "…" }`. A miss or a choice option carries its own `say` beside its `why`: `{ "when": …, "why": "About *27 °C*.", "say": "About twenty-seven degrees Celsius." }`. The written words still light up in time: each is matched to the spoken word it's said as, and those with no match ("27 °C") light while the words between their neighbours are said. `primer check` asks for `say` when it sees °, %, / or & in words that are read.

`primer voice` makes their clips with the scenes' (below), into the lesson's voice file `voice/<lesson>.json`; the ids above are its lines. A step whose words changed since they were voiced is read silently until it's voiced again.

**A figure or a part on screen** is `{ "part": "<name>", "settings": { … }, "calls": [ [ "<call>", arg, … ], … ] }`, or for a picture `{ "image": "media/x.png", "alt": "…" }`. Every setting and call must be in the part's description (`primer parts` lists them). `<name>` is a part or a preset: `globe` is the `map` part with projection `globe`, and any map setting, `projection` included, works on it. Media paths are relative to the topic's folder; one starting `topics/` points into another topic, so topics can share pictures.

**After marking**, `then` runs calls on the figure (a check) or the part (a play), whether right or wrong: `"then": [["band", 5, 20]]` shades the zone once the guess is in.

### Check steps

```json
{ "id": "how-warm", "kind": "check", "title": "How warm is warm enough?",
  "ask": "Have a guess: how warm must the ocean's surface be, at least, for a hurricane to start?",
  "input": { "form": "slider", "min": 10, "max": 40, "step": 0.5, "unit": "°C",
             "start": 14, "picture": "warmth", "pictureFrom": 5, "pictureTo": 35 },
  "answer": 27, "within": 1, "close": 3,
  "right": "About *27 °C*.",
  "misses": [ { "when": { "read": "value", "between": [-100, 25.9] }, "why": "Cooler than that, and …" } ],
  "why": "A line for any other wrong answer.",
  "src": ["jetstream"] }
```

- **input** is the Inputs part's settings; `form` picks the way of answering. Several forms of each kind live side by side, and a lesson uses whichever suits:
  - one of several: `choice`;
  - a number: `slider`, `dial` (the slider bent round a window; the same settings), `number` (a keypad) or `pile` (a count you see at a glance, in rows of `per`, of a drawn `thing` or a picture, `thingImage`; whole counts from 0 to 60);
  - an order: `order`;
  - pairs: `string` (draw a line from each left one to its partner), `sort` (drop `items` into two to four `bins`; many can share a bin) or `snap` (jigsaw pieces, the right column, into sockets on the cards, the left; as many pieces as cards). `match` is the old way, still played; `primer check` suggests `string`;
  - a place on a picture: `spot`.
- **Labels** on a string, sort or snap (and a sort's bins) are short words, and may have a small picture: `{ "id": "sun", "text": "Sun", "image": "media/sun.svg" }`.
- **A slider, a dial or a pile starts at a real value**, with its fill showing and Check awake: `start`, or the middle of its scale (on a log scale, the middle of the stretched scale; a pile, its fewest). Never "?". `primer check` refuses a start the step would already mark right, and warns about one it would mark close.
- **A slider or a dial can drive a picture**, above the slider or in the dial's window: `picture` names one (`warmth`: a ball from a snowflake to a fire; `depth`: the sea cut away, with a warm layer as deep as the value; `wind`: a palm on an island, still at the low end, bent in a gale at the high end), and `pictureFrom` and `pictureTo` are the values where it reaches its low and high ends (the ends of the scale if left out). Any picture goes on either; any lesson can use any picture; a new picture is a general addition to the Inputs part, never one lesson's.
- **answer**, by form: choice, the right option's id (or mark that option `"right": true`); slider, dial and number, a number; pile, a whole number; order, the ids in the right order; string, snap and match, `{ leftId: rightId }` for every left one; sort, `{ itemId: binId }` for every item; spot, `{ "x", "y", "r" }` from 0 to 1 across and down the picture. Forms that answer alike are marked alike.
- **within** is how far off still counts as right (slider, dial, number, pile). **close** is a wider band that counts as close: it shows as Close, in gold, and counts half. Without `close` it's 2.5 times `within`.
- **tries**, as on a play step, can be given on a check too: the Inputs part's state (`{ "value": …, "answered": true }`) and how it should be marked. `primer check` runs them; give a plausible wrong one, above all on a string, sort or snap, where the realistic mistake is a particular mix-up.
- **right** is shown when it's right. A wrong answer shows one line of why: on a choice, the picked option's `why`; otherwise the first of `misses` whose `when` rule holds, or else `why`.

**Choice options** each have `id` and `text`. Every wrong one also has `why` (shown to the learner) and `tempting` (for the writer: why someone would pick it). `primer check` refuses a choice without them, with "all of the above" or "none of the above", or with answers of very different lengths. The phone shuffles them.

### Play steps

```json
{ "id": "where", "kind": "play", "title": "Where do they start?",
  "ask": "The sea is warmest right along the *equator*. Tap the sea where you'd expect a hurricane to start.",
  "play": { "part": "globe", "settings": { "style": "warmth", "tap": "pin", "equator": true } },
  "goal": { "all": [ { "read": "tapped.land", "is": false }, { "read": "tapped.lat", "absBetween": [5, 20] } ] },
  "closeGoal": { "read": "tapped.lat", "between": [20, 30] },
  "misses": [ { "when": { "read": "tapped.lat", "absBetween": [0, 5] }, "why": "…no spin to start a storm turning." } ],
  "then": [["band", 5, 20]],
  "tries": [ { "state": { "tapped": { "lon": -30, "lat": 1.5, "land": false, "country": null } }, "marked": "wrong" },
             { "state": { "tapped": { "lon": -42, "lat": 12, "land": false, "country": null } }, "marked": "right" } ] }
```

- **goal** reads the part's state (its description lists what it has). **closeGoal**, optional, counts as close.
- The Check button wakes once the value the goal reads first exists (a tap has landed), or when the step's own `ready` rule holds.
- **tries** are required: plausible inputs, as the part's state, and what each should be marked (`right`, `close` or `wrong`). At least one must be a realistic wrong one. `primer check` runs every try through the goal and refuses the lesson if any comes out otherwise, or if no try is wrong.

## A scene

A scene is a script: a list of **lines**. Each line is said by the topic's narrator and shown as its caption, lit word by word as it's said, and the parts on screen do things **at its words**. It plays through like a video: nothing in it waits for an answer (the lesson after it asks). It is the whole of an animation's file, and the same `parts` and `lines` make a `scene` step inside a lesson. A scene draws nothing itself: it uses the kit's parts, set up and called exactly as a figure is, so the globe that was just narrated at you is the same globe a play step hands you.

```json
{ "v": 1, "title": "The storm's engine", "version": 2, "minutes": 2,
  "parts": { "globe": { "part": "globe", "settings": { "style": "warmth", "spin": "locked", "tap": "none", "view": [-25, 12] } } },
  "lines": [
    { "id": "atlantic", "text": "This is the Atlantic Ocean in late summer. The sea is coloured by how warm its surface is.",
      "do": [ { "at": "Atlantic", "call": ["spinTo", [-45, 20], 2.2] } ] },
    { "id": "how-warm", "text": "To get one started, the surface has to be about *27 °C* or warmer.",
      "say": "To get one started, the surface has to be about twenty-seven degrees Celsius or warmer.",
      "do": [ { "at": "twenty-seven", "call": ["point", [-40, 12], "27 °C or warmer"] } ] },
    { "id": "keeps-going", "text": "As long as it stays over warm water, it keeps its fuel, and it can grow stronger.",
      "do": [ { "from": "As", "to": "stronger", "call": ["track", [[-40, 12], [-47, 13.5], [-54, 15.5]], "$p", "storm"] } ] }
  ],
  "sources": [ … ] }
```

- **parts:** the parts on screen, each named: `{ "<name>": { "part", "settings", "calls" } }`, as a figure is written. Two or more share the picture, one above the other. They take no touches.
- **lines:** 2 to 30, in order. Each has:
  - **id**, unique in the scene, lower case words joined by hyphens. Its clip is named by it.
  - **text**, what is said, and its caption. `*stress*` a word as anywhere else. Keep it under about 200 characters: one or two sentences. Over the picture, a caption takes at most four lines on the smallest iPhone (`primer fit` says).
  - **say**, optional: the line as it is read aloud, when that isn't the caption word for word: a number or a symbol read a certain way (`27 °C` said as "twenty-seven degrees Celsius"), a name spelled as it sounds. `primer check` asks for it when the caption has a symbol (°, %, /, &). The caption's words still light up in time, matched to the spoken words as a lesson's are (see Read aloud).
  - **do**, the actions, each `{ "at": "<words>", "call": ["<name>", arg, …] }`. The call is one in the part's description, as in a figure's `calls`; with two or more parts, name the part before a dot: `["chart.mark", 26]`. **at** is a word, or a few words, of what's said (`say` if given, else `text`), compared without case or punctuation; the action happens as the first of them is said. `"rise#2"` is the second "rise" in the line; `"$start"` (the default, if `at` is left out) and `"$end"` are the line's ends.
  - An action can run **across** a stretch instead: `{ "from": "<words>", "to": "<words>", "call": [ …, "$p", … ] }`. Every frame from the first word to the end of the last, the call is made again with `"$p"` replaced by how far through it is, from 0 to 1. For a call that takes a share of the way, such as moving a storm along its track; never for one that adds something each time it's called. A storm can also be moved by steps: the map's `track` called again with the same path and a `seconds` to glide over.
  - **hold**, optional: extra seconds of quiet after the line, up to 5.
- **sources:** as a lesson's. A scene step in a lesson cites its lesson's sources in `src`.

There are no waits: a line with `wait` (the tap-to-answer moments of 0.3) is refused by `primer check`.

**How it plays.** An animation fills the screen, and a scene step its step; the picture takes no touches. A tap brings up the controls, laid over the picture: pause and play in the middle, the line before and the next on either side, a bar along the bottom that can be dragged to any moment (each line's start marked on it), the time gone and the whole, captions on or off (remembered), the voice on or off and, full screen, a close button. They fade after about three seconds without a touch while it plays, and stay while it's paused. It starts by itself where it can; if the phone wants a tap before any sound, it waits on its first picture with play showing. With Voice on, each line is its own clip, and the clip's clock drives the picture: an action happens when the clip reaches its word, however late the sound starts, and pausing the sound pauses the picture. Lines follow one another with a short gap (0.45 s, and `hold`), so the whole is one timeline. With Voice off, or once no sound has played, each line runs on a reading clock (its words spread over the time they take to read), it plays straight through, and the captions are always on. Seeking (the bar, the line before) mounts the parts again and runs every action before that moment at once, with an argument named `seconds` set to 0 and a stretch's `$p` set to how far it had got, then plays on from there in the line's clip, so any part works in a scene without a way to rewind of its own. At the end it stops on the last picture, with Watch again, and Next (the next node on the path) when full screen.

**Voice.** `primer voice <topic>` makes the clips (see the skill): one per line per narrator, so a narrator chosen on the phone plays offline at once, for every scene and every lesson's own words (Read aloud, above). Each is heard back by a speech recogniser and made again if it says the wrong words, and the time of every word is found by forced alignment. A line whose words have changed since it was voiced plays from its caption until it's voiced again: a clip never says something its caption doesn't. Its files, which `primer voice` writes and `primer send` sends:

```
voice/<key>.json                                    a voice file. <key> is an animation's id, a lesson's id (its own words), or <lesson>.<step> for a scene step
voice/<key>/<line>.<narrator>.<hash>.m4a            a clip: AAC-LC, mono, 24 kHz, 96 kbps, about -13 LUFS, true peaks under -1 dB
```

```json
{ "v": 1, "scene": "the-engine",
  "lines": { "atlantic": { "heart": { "clip": "voice/the-engine/atlantic.heart.3fa2c1d0.m4a", "key": "3fa2c1d0…",
      "said": "This is the Atlantic Ocean in late summer. The sea is coloured by how warm its surface is.", "seconds": 5.6,
      "words": [["This", 0.06, 0.21], ["is", 0.21, 0.3], …], "check": "ok", "heard": "…", "takes": 1 } } } }
```

`words` has one entry per word of what's said, split on spaces, as written: `[word, start, end]` in seconds from the start of the clip. `key` is a hash of the engine, the voice, its settings, the words and how the clip is encoded: a clip is made again only when its key changes, and a clip is found by its key wherever it was, so the same words said twice are made once. `check` is `ok` or `flag` (still heard wrong after every take); `heard` is what the recogniser heard.

`primer check` refuses an action whose call or part isn't there, whose `at`, `from` or `to` words aren't in the line, `$p` outside a stretch or a stretch without it, and a wait; it warns about long captions, symbols without `say`, and lines not voiced yet or changed since.

### Rules

A rule reads one value from a part's state and tests it. The phone (`js/rules.js`) and `primer check` evaluate them the same way.

| Rule | Holds when the value read… |
|---|---|
| `{ "read": "a.b", "is": x }` | equals x |
| `{ "read": …, "in": [x, y] }` | equals one of them |
| `{ "read": …, "between": [lo, hi] }` | is a number from lo to hi |
| `{ "read": …, "absBetween": [lo, hi] }` | is a number whose size (ignoring its sign) is from lo to hi: degrees from the equator, say |
| `{ "read": …, "near": x, "within": d }` | is a number within d of x |
| `{ "read": …, "same": [ … ] }` | is the same list, in the same order |
| `{ "read": …, "pairs": { … } }` | has exactly these pairs |
| `{ "read": …, "inCircle": { "x", "y", "r" } }` | is a point `{ x, y }` inside the circle |
| `{ "read": …, "exists": true }` | is there at all |
| `{ "all": [ … ] }`, `{ "any": [ … ] }`, `{ "not": rule }` | all of them, any of them, not it |

`read` is a dotted path into the state: `tapped.lat`, `value`, `selected`. A value that isn't there fails every test but `exists: false`.

## A progress file

Written by the phone, a new file for each batch, so it never collides with the writer.

```json
{ "v": 1, "device": "phone-ab12cd", "sentAt": "2026-11-17T20:00:00.000Z", "events": [ ] }
```

Every event has `v`, `eid` (unique), `at`, `type` and `topic`. Events from playing a lesson, test or exam also have `lesson` (its node id) and `version`.

| type | Extra fields | Meaning |
|---|---|---|
| `start` | `step` | A run of the lesson began, at this step |
| `seen` | `step` | An Explain step was read and left with Continue |
| `attempt` | `step`, `kind`, `form`, `value`, `right`, `close`, `why` | A Check or Play step was answered. `value` is what was given: on a check, the Inputs part's value; on a play, the part's whole state. `why` is the line they were shown. (Progress from 0.3 can also hold a scene's wait, its `kind` `scene` and the line that waited in `line`: scenes no longer wait) |
| `finish` | `right`, `of` | The lesson's end was reached, with that many right of the questions in it (scenes aren't questions) |
| `leave` | `step` | They closed the lesson at this step, before its end |
| `open` | `node`, `kind` | A chest was opened, or a review or animation placeholder visited (no `lesson` or `version`) |

An animation is saved as a lesson of one step: its events carry `lesson` (the node's id) and `step` (the same id), and it sends `start` when it opens, `seen` and `finish` the first time its end is reached in that viewing (seeking there counts), or `leave` if it's closed before. A scene step in a lesson is `seen` like an explain step.

**Reading progress:** go through events by `at`. Drop any repeated `eid`: if the app closes mid-send, a batch can go out twice. Being wrong in a lesson costs nothing; read wrong answers for what they say about what was misunderstood.

## read.json

```json
{ "v": 1, "at": "2026-11-17T21:00:00.000Z", "files": ["progress/2026-11-17T20-00-00-000Z-ab12cd.json"] }
```

Written by `primer progress --mark-read`. The phone's Profile shows when progress was last read.
