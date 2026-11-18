---
name: primer
description: Write lessons for Primer, the person's learning app on their phone, and read what they did with them. Use when asked to teach them a topic or write a lesson for Primer, when checking or sending a Primer topic, when asked what parts the app has, and when reading their Primer progress (what they got right and wrong).
---

# Primer

Primer is a learning app on their phone, in the spirit of Brilliant with Duolingo's layout. The app is only a framework and a kit of parts; every lesson is written here, as files, and sent to a private data repo the phone reads. Every attempt they make comes back the same way, so you can read what they got wrong before writing the next lesson.

Every command is `python "$HOME/.claude/skills/primer/primer.py" <command>`, written below as `primer`. It finds the app (for the parts) where it was installed from, or pass `--app <folder>`. It finds the data repo's clone at `~/Dev/primer-data`, or pass `--data <folder>` or set `PRIMER_DATA`.

```
primer parts                       every part: its settings, calls, events and state
primer check <topic folder>        the files, the parts, the facts and the rules for getting it realistically wrong
primer facts <topic folder>        every fact the topic declares (families made into facts), its asks, what teaches and draws on it
primer fit <topic folder>          draws each step, and each ask of each fact, on the smallest iPhone, and says what doesn't fit
primer voice <topic folder>        voices its scenes: a clip per line per narrator, heard back, timed by word
primer send <topic folder>         checks, shrinks pictures, copies into the data clone, commits and pushes
primer progress                    what came back since you last read it (--all for everything, --topic t)
primer progress --mark-read        the same, and records it as read, which their Profile shows
```

The file format is in `format.md`, next to this file. Read it before writing a lesson.

## What a lesson is

A **topic** (Where hurricanes form) is a **path** of nodes, each a whole thing, worked through one after another: a **lesson**, a **test** (questions on the lessons before it, listed or drawn from their facts), an **exam** (a bigger test), a **chest** (a reward for reaching it), a **review** of the facts of the lessons before it, or an **animation** on its own: a narrated scene. Its **level** is one word, counting the lessons: Glance (1 lesson), Tour (2 to 4), Solid (5 to 9), Deep (10 to 15). A lesson is 5 to 15 minutes: a run of **steps**, one screen each. A test or exam is a file of the same shape, of questions only. A node with a `unit` starts a new banner on the path.

| Step | What happens |
|---|---|
| `explain` | A short paragraph, with a figure: a part (the globe, set up) or a picture |
| `check` | A quick question, answered with the Inputs part: choice; a number on a slider, dial, keypad or pile; order; pairs by string, sort or snap; or tap the spot |
| `play` | A part with a goal, marked by reading the part's state: "tap where a hurricane would start" |
| `scene` | A narrated animation on parts: lines said by the narrator and captioned, with actions hung on their words. It can wait for a goal, like a play step |

Write a topic as a folder: `topic.json` with its `path`, one file per lesson, test, exam or animation, and `media/` for pictures. Check it, fit it, voice its scenes, send it. A sensible shape: lessons, a chest after a stretch of them, then a short test drawing on them all; an exam at the end of a big topic; an animation where motion explains something, between the lessons it joins.

## Facts

Every lesson declares its **facts** (format.md, "Facts"): the handful of things worth knowing afterward, about six to a lesson, each a sentence with its `src`, and **two or more ways of asking it** (`asks`). An ask is a check or play step, written exactly as one: vary the forms across a fact's asks (a dial and a choice; a map tap and a sort), so it's known, not one question remembered. Facts are what review asks, days later and among other topics, what a test can draw from, and what Profile and the room fade by. The rules:

- **Tie the lesson to them.** Give the step that teaches a fact `"fact": "<id>"` (a check or play step then counts as a review of it; the first step naming it is where review's link goes back to after a miss). An explain step can name the facts it teaches too.
- **Each ask stands alone.** It's asked out of context: say what it's about ("the Atlantic's season", not "it"). A figure can bring the picture it was taught with.
- **No ask gives itself away.** The checker refuses a question that says its right option or the number it asks for, an order listed in its right order, or a marker sitting where the goal is. Give every ask but a choice `tries` with a plausible wrong one.
- **Families for tables.** Many facts of one shape (capitals, each ocean's name for a storm) are a table and a few question shapes (`families`): `{field}` fills from each row, and a choice's options can come from a column (`"options": { "from": "capital", "count": 3, "near": "region", "unlike": ..., "why": "{other.capital} is ...", "tempting": "..." }`). `primer facts` shows every fact made.
- **Tests can draw** (`"draw": { "from": "unit", "count": 8 }`): each fact asked in a way its lesson didn't use, so give every fact at least one ask in a form its teaching step doesn't use.
- **Ids never change** once sent: progress, and the phone's memory, refer to them.

## Scenes

A scene is a script (format.md, "A scene"): lines, each `{ "id", "text", "do": [ { "at": "word", "call": [...] } ] }`, on named parts. The writing rules:

- **Voice only where it earns its place:** motion that explains something, a topic's opening overview, a pronunciation. Most steps stay silent text.
- **One or two sentences a line.** A line is one clip and one caption, and back and skip move a line at a time. Hang each action on the word it illustrates ("at the word *Atlantic*, turn to it"), not on a guess of seconds.
- **Every line works silent.** The caption is all a silent watcher gets: the picture must make sense with it alone.
- **Ask before you tell** applies here too: a `wait` asks the person to do something before the scene goes on, marked like a play step, with `tries`. Don't let a scene give away the answer to a question coming up in the next lesson.
- **Say how it's read.** A caption with a symbol or an awkward number gets `say`, the words as they should be spoken. The checker asks when it sees °, %, / or &.
- **The narrator** is the topic's (`narrator` in topic.json, with its `subject`); each subject keeps one, and the phone can choose another per subject. Use the same parts the lesson uses next, so the picture carries on.

`primer voice <topic folder>` makes every clip, in all four narrators so a choice on the phone plays offline: Heart, George and Bella with Kokoro, Chatterbox A with Chatterbox's built-in voice. Each clip is heard back by a speech recogniser and made again (up to four takes) if it says the wrong words; then encoded, and every word timed by forced alignment. It makes again only clips whose words, narrator or making changed, and clears clips nothing uses. `--narrators topic` makes the topic's narrator only; `--again` remakes everything. It needs the voice environments (`--tts <folder>` holding `kokoro`, `chatterbox` and `check`, or `PRIMER_TTS`, or `install.py --tts`) and ffmpeg. A clip still heard wrong after every take is flagged by `check`: listen to it, or reword the line. Run `voice` after any change to a scene's words, then `check` (it warns about lines changed since they were voiced), then `fit` (it draws every line's caption) and `send`.

## Parts

A part knows nothing about lessons. A lesson says which part, its settings, the calls to make, and what to read from it. `primer parts` lists everything; a lesson may only use what's listed there. **Never write one-off code into a lesson.** If a lesson needs something the kit can't do, say so and what it would cost; the kit grows with a general part or setting, not a widget for one lesson.

Today's kit: **Inputs** (every way of answering, several of each kind: choice; slider, dial, number or pile for a number; order; string, sort or snap for pairs, match being the old way, which `check` steers away from; spot. A slider, dial or pile starts at a real value, `start`. A slider or a dial can drive a picture, `picture`: `warmth` for temperature, `depth` for how deep, `wind` for wind. Labels on strings, sorts and snaps may have a small picture, `image`) and **Map** (the world as a globe or a flat map, `projection`, with every tool on both: spin or pan, pinch zoom, `spinTo`, `zoomTo`, labels, styles including sea warmth and a four-colour political map, borders on or off, highlights, `colourBy` a table of countries or latitude bands, bands, points, markers with a turning hurricane, great-circle `arc`s, and `track`s drawn as far as they've got with a storm riding them; reports taps with place, land and country). **`globe` is a preset**: the map with projection `globe` and no finger zooming; every map setting and call works on it. Use `"part": "map"` with a `projection` for a flat map.

## Getting it realistically wrong

These are rules `primer check` enforces, not hopes:

1. **Big answer spaces first.** A slider, a dial, a pile, a placement, a typed number, an order, strings, a sort or a snap before a choice of four. Vary the forms: several forms of each kind exist so lessons don't all feel alike. "How warm must the sea be?" is a slider marked by how close you got, with the truth drawn beside the guess. A slider starts at a real value: set `start` well away from the answer (the checker refuses a start that's already right), and give it a `picture` where one fits.
2. **Ask before you tell.** A guess before the explanation helps it stick, even when the guess is wrong. Put a check or a play before the explain step that answers it.
3. **Wrong choices come from real misconceptions.** Every wrong option has `tempting` (why someone would really pick it) and `why` (the one line they're shown). No "all of the above", no "none of the above", and options of similar length: the checker refuses tells.
4. **Every play step can fail.** Give `tries`: plausible inputs as the part's state and what each should be marked, a realistic wrong one among them. The checker runs them through the goal and refuses the lesson if one comes out otherwise. The tempting wrong answer should be a real one: on the hurricane globe, the equator, where the sea is warmest.
5. **One line of why for each wrong answer.** `misses` maps each kind of wrong answer to its line. Being wrong in a lesson costs nothing; make it worth something.

## Writing

- **Facts are right, and sourced.** Every lesson has `sources`; each step cites them in `src`. A step with numbers and no source gets a warning. Say in `checked` when you read it, or `recalled` if you didn't. Say plainly what's known, disputed or wrong.
- **North American words.** Counterclockwise, not anticlockwise; fall, not autumn; toward, not towards. Keep their Canadian spellings: colour, metres, vapour.
- **Short.** `text` and `ask` under about 300 characters. `*stress*` a word or two. `primer fit` draws every step in the real app on the smallest iPhone and on theirs; fix anything it says scrolls, and shorten feedback it calls tight.
- **Voice only where it earns its place:** scenes (above). Steps are silent text, with sound effects from the app.
- **Ids never change** once sent: progress refers to them. Raise the lesson's `version` when steps change in meaning. A scene's line ids name its clips: renaming one makes its clips again.

## Reading progress

`primer progress` lists each lesson's runs and each question's attempts: right, close or wrong, with what they gave and the line they were shown; then review's answers and misses; then **memory**: every answer so far replayed through the phone's own memory model, so each fact is **strong** (recall 90% or more, last answered right), **holding**, or **weak** (under 70%, or missed last time, with what they gave). Wrong answers and weak facts are the most useful part: read them for what was misunderstood, and let the next lesson bend toward it. `--mark-read` records that you read it.

## Sending

`primer send <topic folder>` refuses a topic with errors, copies its files, the media its lessons use and its scenes' voice (each timing file and the clips it names) into `topics/<topic>/` in the data clone (pictures shrunk to 1600 pixels on the long side), rewrites `index.json`, commits only those paths and pushes. It stops if the change would hold this computer's user name. `--no-push` commits without pushing.
