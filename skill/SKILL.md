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
primer send <topic folder>         checks, shrinks pictures, copies into the data clone, commits and pushes
primer progress                    what came back since you last read it (--all for everything, --topic t)
primer progress --mark-read        the same, and records it as read, which their Profile shows
```

The file format is in `format.md`, next to this file. Read it before writing a lesson.

## What a lesson is

A **topic** (Where hurricanes form) is a **path** of nodes, each a whole thing, worked through one after another: a **lesson**, a **test** (questions on the lessons before it), an **exam** (a bigger test), a **chest** (a reward for reaching it), a **review** of everything before it, or an **animation** on its own (review and animation are placeholders until stage 2). Its **level** is one word, counting the lessons: Glance (1 lesson), Tour (2 to 4), Solid (5 to 9), Deep (10 to 15). A lesson is 5 to 15 minutes: a run of **steps**, one screen each. A test or exam is a file of the same shape, of questions only. A node with a `unit` starts a new banner on the path.

| Step | What happens |
|---|---|
| `explain` | A short paragraph, with a figure: a part (the globe, set up) or a picture |
| `check` | A quick question, answered with the Inputs part: choice; a number on a slider, dial, keypad or pile; order; pairs by string, sort or snap; or tap the spot |
| `play` | A part with a goal, marked by reading the part's state: "tap where a hurricane would start" |

Write a topic as a folder: `topic.json` with its `path`, one file per lesson, test or exam, and `media/` for pictures. Check it, fit it, send it. A sensible shape: lessons, a chest after a stretch of them, then a short test drawing on them all; an exam at the end of a big topic.

## Parts

A part knows nothing about lessons. A lesson says which part, its settings, the calls to make, and what to read from it. `primer parts` lists everything; a lesson may only use what's listed there. **Never write one-off code into a lesson.** If a lesson needs something the kit can't do, say so and what it would cost; the kit grows with a general part or setting, not a widget for one lesson.

Today's kit: **Inputs** (every way of answering, several of each kind: choice; slider, dial, number or pile for a number; order; string, sort or snap for pairs, match being the old way, which `check` steers away from; spot. A slider, dial or pile starts at a real value, `start`. A slider or a dial can drive a picture, `picture`: `warmth` for temperature, `depth` for how deep, `wind` for wind. Labels on strings, sorts and snaps may have a small picture, `image`) and **Globe** (spin, labels, styles including sea warmth and a four-colour political map, borders on or off, highlights, latitude bands, points, a turning hurricane; reports taps with place, land and country).

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
- **Voice is for later** (stage 2), and only where it earns its place. Lessons now are silent text with sound effects from the app.
- **Ids never change** once sent: progress refers to them. Raise the lesson's `version` when steps change in meaning.

## Reading progress

`primer progress` lists each lesson's runs and each question's attempts: right, close or wrong, with what they gave and the line they were shown. Wrong answers are the most useful part: read them for what was misunderstood, and let the next lesson bend toward it. `--mark-read` records that you read it.

## Sending

`primer send <topic folder>` refuses a topic with errors, copies its files and the media its lessons use into `topics/<topic>/` in the data clone (pictures shrunk to 1600 pixels on the long side), rewrites `index.json`, commits only those paths and pushes. It stops if the change would hold this computer's user name. `--no-push` commits without pushing.
