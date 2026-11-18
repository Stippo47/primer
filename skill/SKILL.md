---
name: primer
description: Write lessons for Primer, the person's learning app on their phone, and read what they did with them. Use when asked to teach them a topic or write a lesson for Primer, when checking or sending a Primer topic, when asked what parts the app has, and when reading their Primer progress (what they got right and wrong).
---

# Primer

Primer is a learning app on their phone, in the spirit of Brilliant with Duolingo's layout. The app is only a framework and a kit of parts; every lesson is written here, as files, and sent to a private data repo the phone reads. Every attempt they make comes back the same way, so you can read what they got wrong before writing the next lesson.

Every command is `python "$HOME/.claude/skills/primer/primer.py" <command>`, written below as `primer`. It finds the app (for the parts) where it was installed from, or pass `--app <folder>`. It finds the data repo's clone at `~/Dev/primer-data`, or pass `--data <folder>` or set `PRIMER_DATA`.

```
primer parts                       every part: its settings, calls, events and state
primer check <topic folder>        the files, the parts, and the rules for getting it realistically wrong
primer fit <topic folder>          draws each step on the smallest iPhone, and says what doesn't fit
primer voice <topic folder>        voices its animations and lessons: a clip per line per narrator, heard back, timed by word
primer send <topic folder>         checks, shrinks pictures, copies into the data clone, commits and pushes
primer progress                    what came back since you last read it (--all for everything, --topic t)
primer progress --mark-read        the same, and records it as read, which their Profile shows
```

The file format is in `format.md`, next to this file. Read it before writing a lesson.

## What a lesson is

A **topic** (Where hurricanes form) is a **path** of nodes, each a whole thing, worked through one after another: an **animation** (a narrated scene, played full screen like a video), a **lesson**, a **test** (questions on the lessons before it), an **exam** (a bigger test), a **chest** (a reward for reaching it), or a **review** of everything before it (a placeholder for now). **An animation introduces a concept, the lessons after it reinforce and expand it, and a test tests it**: a section of a topic opens with an animation. Its **level** is one word, counting the lessons: Glance (1 lesson), Tour (2 to 4), Solid (5 to 9), Deep (10 to 15). A lesson is 5 to 15 minutes: a run of **steps**, one screen each. A test or exam is a file of the same shape, of questions only. A node with a `unit` starts a new banner on the path.

| Step | What happens |
|---|---|
| `explain` | A short paragraph, with a figure: a part (the globe, set up) or a picture |
| `check` | A quick question, answered with the Inputs part: choice; a number on a slider, dial, keypad or pile; order; pairs by string, sort or snap; or tap the spot |
| `play` | A part with a goal, marked by reading the part's state: "tap where a hurricane would start" |
| `scene` | A narrated animation on parts, inside a lesson: lines said by the narrator and captioned, with actions hung on their words. It plays through, like an animation on the path |

Write a topic as a folder: `topic.json` with its `path`, one file per lesson, test, exam or animation, and `media/` for pictures. Check it, voice it, fit it, send it. A sensible shape: an animation that introduces a concept, the lessons that reinforce and expand it, again for each section; a chest after a stretch of them, then a short test drawing on them all; an exam at the end of a big topic. Write the animation after reading the lessons it opens, so it introduces what they teach rather than repeating their questions' answers word for word.

## Animations

An animation is a scene, a script (format.md, "A scene"): lines, each `{ "id", "text", "do": [ { "at": "word", "call": [...] } ] }`, on named parts. It plays full screen like a video: no buttons until a tap brings up the controls (pause, the line before and the next, a bar to drag, captions, close), and nothing to answer. The writing rules:

- **It introduces; the lessons ask.** Show the concept moving: what drives it, which way, where, why. The lesson after it reinforces and expands it with questions, so an animation never waits for an answer (`check` refuses a `wait`).
- **About 60 to 90 seconds**, 10 to 15 lines. Use the parts' calls freely, with the camera and the marks moving on the words: turn and zoom to what's being said, a point or a marker as it's named, a storm moving along its `track` across a stretch (`"from"`/`"to"` with `$p`) or by steps (the same path with `seconds`). `clear` takes the marks away between ideas.
- **One or two sentences a line.** A line is one clip and one caption, and the line before and the next move a line at a time. Hang each action on the word it illustrates ("at the word *Atlantic*, turn to it"), not on a guess of seconds.
- **Every line works silent.** The caption is all a silent watcher gets: the picture must make sense with it alone.
- **Say how it's read.** A caption with a symbol or an awkward number gets `say`, the words as they should be spoken. The checker asks when it sees °, %, / or &.
- **The narrator** is the topic's (`narrator` in topic.json, with its `subject`); each subject keeps one, and the phone can choose another per subject. Use the same parts the lesson uses next, so the picture carries on.
- **Facts are sourced** as a lesson's are: `sources` in the file.

## Voice

With Voice on, everything is read aloud in the topic's narrator: an animation's lines, and a lesson's words as each step opens (its text or question) and the line of feedback once it's shown, the words lighting up as they're said (format.md, "Read aloud"). Words that don't read aloud well get `say`: a step's `"say"` speaks for its text or question, or `{ "ask": …, "right": …, "why": … }`; a miss or a choice option has `say` beside its `why`. Write units and symbols out ("twenty-seven degrees Celsius"), and names as they sound ("Noah" for NOAA).

`primer voice <topic folder>` makes every clip, for every animation, scene step and lesson, in all four narrators so a choice on the phone plays offline: Heart, George and Bella with Kokoro, Chatterbox A with Chatterbox's built-in voice. Each clip is heard back by a speech recogniser and made again (up to four takes) if it says the wrong words; then encoded loud and clean (about -13 LUFS, true peaks under -1 dB, AAC at 96 kbps), and every word timed by forced alignment. It makes again only clips whose words, narrator or making changed, makes the same words said twice only once, and clears clips nothing uses. A long topic goes in batches, each saved as it's done. `--narrators topic` makes the topic's narrator only; `--again` remakes everything. It needs the voice environments (`--tts <folder>` holding `kokoro`, `chatterbox` and `check`, or `PRIMER_TTS`, or `install.py --tts`) and ffmpeg. A clip still heard wrong after every take is flagged by `check`: listen to it, or reword the line. Run `voice` after any change to words that are read, then `check` (it warns about words changed since they were voiced, or not voiced), then `fit` (it draws every caption over its picture) and `send`.

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
- **Written to be heard, too.** Every step is read aloud with Voice on (above): write sentences that sound right said, and give `say` where they don't.
- **Ids never change** once sent: progress refers to them. Raise the lesson's `version` when steps change in meaning. A scene's line ids name its clips: renaming one makes its clips again.

## Reading progress

`primer progress` lists each lesson's runs and each question's attempts: right, close or wrong, with what they gave and the line they were shown. Wrong answers are the most useful part: read them for what was misunderstood, and let the next lesson bend toward it. `--mark-read` records that you read it.

## Sending

`primer send <topic folder>` refuses a topic with errors, copies its files, the media its lessons use and its scenes' voice (each timing file and the clips it names) into `topics/<topic>/` in the data clone (pictures shrunk to 1600 pixels on the long side), rewrites `index.json`, commits only those paths and pushes. It stops if the change would hold this computer's user name. `--no-push` commits without pushing.
