# The data repo's format

Everything the phone reads and writes lives in the private data repo, `primer-data`, branch `main`. The app in this repo holds no lessons.

```
index.json                              the list of topics, in order: the app reads it first
topics/<topic>/topic.json               a topic: its title, level, look and its path of nodes
topics/<topic>/<node>.json              a lesson, test or exam on the path: its steps and sources
topics/<topic>/media/<file>             its pictures (and, later, sound)
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
  "about": "One sentence on what it covers.",
  "path": [
    { "kind": "lesson", "id": "warm-water", "unit": "Fuel, spin and paths" },
    { "kind": "lesson", "id": "spin-and-paths" },
    { "kind": "chest", "id": "first-chest" },
    { "kind": "test", "id": "checkup" }
  ] }
```

- **level:** `glance` (1 lesson), `tour` (2 to 4), `solid` (5 to 9) or `deep` (10 to 15), counting the lessons on the path. One dial: each step up is both longer and deeper. The app shows it as one word.
- **colour:** the topic's medallion, one of `orange`, `cyan`, `pink`, `yellow`, `purple`, `teal`.
- **mark:** the symbol on it, one of `swirl`, `paw`, `bolt`, `flag`, `strings`, `drop`, `leaf`, `globe`, `book`, `star`.
- **path:** the nodes on the Learn path, in order. Each node is a whole thing, worked through from one to the next.

### The path

Each node has a `kind` and an `id` (unique in the topic, and not `topic`). It may have a `title`, and a `unit`: a node with a `unit` starts a new banner on the path, named by it (the first banner is named after the topic unless its first node names it). The banner has a pip for each node in its unit.

| kind | What it is | Its file | Its mark on the path |
|---|---|---|---|
| `lesson` | Steps that teach: explain, check and play | `<id>.json`, a lesson (below) | an open book, on a round button |
| `test` | Questions drawing on the lessons before it. At least 3; no explain steps | `<id>.json`, the same shape as a lesson | a star, on a hexagon |
| `exam` | A bigger test, at the end of a topic or a unit. At least 5 questions | `<id>.json`, the same shape | a cup, on a larger hexagon |
| `chest` | A reward for reaching it. Opening it is a small celebration and is recorded; what's inside comes with the shop (stage 4) | none | the chest itself, closed, then open |
| `review` | A review of everything before it on the path. A placeholder until review is built (stage 2): it says so, and visiting it lets the path go on | none | two arrows round |
| `animation` | An animation on its own. A placeholder until narrated scenes arrive (stage 2); give it a `title` | none (stage 2 adds one) | a play mark with sound |

A lesson's, test's or exam's title is the `title` in its file; a chest, review or animation shows the node's `title` (or "A chest", "Review", "Animation"). A node is done once a lesson, test or exam has been played to its end, or a chest opened, or a review or animation visited; the next node not done is the one to do, and the ones after it can't be started yet. A lesson's own steps show inside it, on its thin bar, never on the path.

`primer check` refuses a test or exam with no lesson before it, a review with nothing played before it, unknown kinds or fields, repeated ids, and a missing file; it warns about a chest at the very start, two chests in a row, an animation with no title, and a test or exam with too few questions or with explain steps.

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

Words: `*like this*` stresses a word (drawn gold). A line break stays a line break. Keep `text` and `ask` under about 300 characters; `primer fit` says what really fits.

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

- **input** is the Inputs part's settings; `form` picks the way of answering: `choice`, `slider`, `number`, `order`, `match` or `spot`.
- **A slider starts at a real value**, with its fill showing and Check awake: `start`, or the middle of its scale (on a log scale, the middle of the stretched scale). Never "?". `primer check` refuses a start the step would already mark right, and warns about one it would mark close.
- **A slider can drive a picture** above it: `picture` names one (`warmth`: a ball from a snowflake to a fire; `depth`: the sea cut away, with a warm layer as deep as the value), and `pictureFrom` and `pictureTo` are the values where it reaches its low and high ends (the ends of the scale if left out). Any lesson can use any picture; a new picture is a general addition to the Inputs part, never one lesson's.
- **answer**, by form: choice, the right option's id (or mark that option `"right": true`); slider and number, a number; order, the ids in the right order; match, `{ leftId: rightId }`; spot, `{ "x", "y", "r" }` from 0 to 1 across and down the picture.
- **within** is how far off still counts as right (slider, number). **close** is a wider band that counts as close: it shows as Close, in gold, and counts half. Without `close` it's 2.5 times `within`.
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
| `attempt` | `step`, `kind`, `form`, `value`, `right`, `close`, `why` | A Check or Play step was answered. `value` is what was given: on a check, the Inputs part's value; on a play, the part's whole state. `why` is the line they were shown |
| `finish` | `right`, `of` | The lesson's end was reached, with that many right of the questions in it |
| `leave` | `step` | They closed the lesson at this step, before its end |
| `open` | `node`, `kind` | A chest was opened, or a review or animation placeholder visited (no `lesson` or `version`) |

**Reading progress:** go through events by `at`. Drop any repeated `eid`: if the app closes mid-send, a batch can go out twice. Being wrong in a lesson costs nothing; read wrong answers for what they say about what was misunderstood.

## read.json

```json
{ "v": 1, "at": "2026-11-17T21:00:00.000Z", "files": ["progress/2026-11-17T20-00-00-000Z-ab12cd.json"] }
```

Written by `primer progress --mark-read`. The phone's Profile shows when progress was last read.
