# Decisions

Rulings on the plan, newest first. Where this file and `PLAN.md` differ, this file wins until the plan is next revised.

## 2026-11-16: first answers to the plan

Both decks came back finished. Everything in the report was marked good except one part ("It works with the sound off": decent, see Sound).

### Settled

- **Name:** Primer.
- **Stage 0:** go. A sample scene in a few looks, voice samples, and the phone tests.
- **Pilot lessons:** yes, three, kept in the private repo. The app still ships with none.
- **Repos:** yes to two, a public one for the app and a private one for lessons and media.
- **No streak.** No lives in lessons.
- **Language course:** an experiment after the review loop and voices are proven.
- **The take-apart skill** is the one found (teardown). It becomes a kit part in stage 5.
- **Asking for a topic is chat only.** Nothing for it lives in the app. If it ever moves to the phone, it goes through Riffle. This removes the asking screen from stage 3.
- **Sounds:** nothing jarring, no 8-bit sounds.

### Changed by the answers

- **Thoroughness is two dials, not one.**
  - *Length*, how much ground: four levels. Glance is 1 lesson, an unnamed second level is 2 to 4, Solid is 5 to 9, Deep is 10 to 15.
  - *Depth*, how complex it gets.
  - Long and shallow on bears: every species, lightly. Short and deep: bears as a whole, properly.
  - A third choice, *course* pacing: concepts introduced slowly in bite-sized pieces, the way Duolingo teaches.
  - Open: a name for the second level (my suggestion is "Tour"), and how many steps Depth has.
- **Voice only where it earns its place:** animations, the overview that opens a topic, pronunciations. Not every scene in a lesson. Most steps are silent with text. This cuts the voice work per lesson a great deal.
- **Layout: five tabs with Home in the centre.** Left to right: Learn, Review, Home (the room, with the Playground), Shop, Profile (settings and stats). Sketches come with stage 0. Open: whether the Playground sits inside Home or is its own tab.
- **The room: buy generic, earn unique.** A red bed is bought. A shark bed is earned.
- **Collectables come from templates.** The kit has general shapes: floor mat, bed, poster, statue, stuffed toy, flag, metal trophy, medal, shirt, trousers, hat, and room pieces. Whoever writes a topic fills those templates (bear carpet, salmon plush, claw-marked log). Some show a level: memorise the world and get a globe whose stand goes bronze, gold, platinum.
- **The room is one of several ways to show what you know.** Others can be unlocked:
  - the globe comes alive as you learn: a country fills in, landmarks stand up from it, a bird you've learned flies over where it lives;
  - a board of collected components for computers.
- **Playgrounds grow with you.** In circuits, a component joins your playground once you understand it well enough. Because parts within a field follow the same rules, playgrounds from neighbouring topics can join up.
- **Topics borrow from each other.** A general animals lesson can reuse material from a bears topic that already exists, as long as it doesn't turn into bear facts with a little about animals. So facts and media are kept where any topic can point at them.
- **Pictures:** this is a personal app that is never distributed, so any picture can be shown. Openly licensed ones are copied into the private repo with credit. Others are shown from where they live and kept on the phone after first view; if a site refuses that, the picture is copied into the private repo.
- **WorldWise:** nothing is taken from it by default. It stopped because of how it flowed. Only its country tables, if they turn out useful.

### Still open

- **The wager in review** wasn't clear. Explained again and dealt back.
- **Voice samples** should be a Riffle board, which needs Riffle to play sound. Until it can, the samples are on a plain page.

## 2026-11-17: the phone tests, and two more answers

The test page ran on the real phone: an iPhone 11 on iOS 18.7.7, opened from the home screen, three launches.

### What the phone showed

- **Sound survives closing and reopening the app.** Clips and generated tones were heard on every launch. The bug the research warned about belongs to iOS 26, and this phone is on 18. The test page stays up, to be run again after any iOS update.
- **The silent switch splits sound in two.** A sound clip plays even with the switch on silent, the way a video does. A generated tone goes quiet, unless the app declares its sound to be media, and then it plays too. So each kind of sound can be made to follow the switch or not.
- **The first clip after installing was slow to start:** heard, but its clock hadn't moved 1.3 seconds after the tap. Later first plays started in under half a second.
- **One clip after coming back to the app ended at once, with no length.** The next tap played it. That try reused an old player; the tries with a new player were all heard.
- **The tick is felt,** both from the hidden switch and from a real one. The browser offers no buzz.
- **Live blur is too slow.** Real blur held 60 frames a second with 10 glowing dots, 42 with 30 and 22 with 60, and looked jerky. Glows faked with soft gradients, and ready-made glow stamps on a canvas, held 60 at every count.
- The phone's browser can't pin one element to another by itself (no anchor positioning). It can animate between screens (view transitions).

### Rules for the kit, from that

- **No live blur on anything that moves.** A glow is a ready-made stamp where there's a canvas, which was judged to look good on the phone, and a soft gradient elsewhere. The scene's looks already draw this way.
- **A scene follows its clip's clock, never the time since the tap.** Actions hung on words then stay on the words however late the sound starts.
- **Voice clips are fetched and made ready before a scene starts.** A clip isn't called silent until its clock has stood still for about 2.5 seconds.
- **Every play gets a new player.** A clip that ends at once with no length is tried once more by itself.
- **The tick is a bonus.** It rides on a quirk of the phone, so nothing may depend on it being felt.
- **Popovers and tooltips are placed by script.**

### Two more answers

- **A lesson without voice isn't silent.** It can still have sound effects, ambience or calm music. So there are three kinds of sound: voice, effects, and ambience or music.
- **The wager is dropped.** Unclear the first time and sent back the second. Review has no "I'm sure" button; the combo alone rewards a run of right answers. The Review sketch still shows the button and is out of date on that.

- **The phone on silent: the app ignores the switch.** Voice, effects and music each have their own switch in the app, and those alone decide what plays.

## 2026-11-17: answers to the stage 0 decks

### The look

- **Mix it is**, which is the Night art inside the chunky controls. Judged to look good, so the kit is built on art drawn by rule.
- **Bounce sits between gentle and medium.**
- **The hurricane needs redrawing,** and the glow around it goes.

### Voices

- **Narrator shortlist: Heart and Chatterbox A.** More are wanted before choosing, an older-sounding narrator above all.
- **French: Siwis and Chatterbox A** both passed.
- **Four more languages to hear:** Japanese, Spanish, Italian, Hindi.
- My own rule here, theirs to overturn: no voice is copied from a recording of a real person who hasn't agreed to it.

### Thoroughness

- **One dial, not two.** Glance, Tour, Solid, Deep: each step is both longer and deeper. Course pacing stays a separate choice.

### Layout

- **Five tabs: Learn, Review with the Playground inside it, Home, Shop, Profile.** Home is in the centre. What the joined tab is called is open.

### Home

- **The room is wider than the screen and pans sideways.**
- **There are several rooms,** reached by doors or arrows. A topic's things live in the room that suits them: food in a kitchen.
- **The avatar is probably not a person.** A monster or an animal; options to be shown.
- **Words appear only when something is touched.** No legend under the room, no banner.
- **Nothing is ringed until it's touched,** and then not with a dotted line. A fading thing shows it by how it looks.
- **The globe display is entered by tapping the globe in the room,** and left by a back arrow in the top left. There is no switcher. It shows and doesn't tell; words come on a tap.
- Of the drawn objects, only the trophies and the globe were good enough. Those two set the bar for the rest.

### The other screens

- **Learn:** good. The path wants more love: raised buttons with a symbol for the kind of step, the current one marked out, something alive beside the path.
- **Review:** too busy. Anything that can be read from the picture loses its label.
- **Playground:** fewer words. No "Open" and no count of parts. A locked part looks like an open one, with its price and a coin where the words and the lock were, and every locked part says which lesson it comes from.
- **Shop: learning unlocks, coins buy.** A unique thing shows as an outline until its lesson is done, and then it can be bought. This replaces "earn unique" from the first answers. **Prizes are different:** trophies and the like are given, and never appear in the shop. Nothing is labelled with what it's obviously for.
- **Profile:** no "fading" label; colour and number do it. The scale runs blue to grey, not blue to red. A warning mark on a topic opens its details, such as the day it was last studied. "Strong and weak" becomes "Skills" or "Knowledge".

### Still open (answered below)

- The name of the joined Review and Playground tab.
- Which animal or monster the avatar is.
- The narrator, after the second round of voices.
- Whether the shell (stage 1) starts now. Asked as a card.

## 2026-11-17: answers to the second round

### Settled

- **Stage 1, the shell, starts now.**
- **The joined tab is called Practice.** While a review run or a Playground part is open, the tab bar is hidden; a cross or a back arrow in the top left leaves.
- **The hurricane is drawn as Disc,** their favourite. Bands and Cut paper also passed.
- **Bounce halfway between gentle and medium** is right.
- **Rooms are changed by doors,** no arrows.
- **The room's ideas hold:** touching a thing, fading things and the globe display were all marked good.
- **The other screens hold:** Learn, the topic list, Practice, Review, an opened part, and Profile were all marked good.
- **Voices kept:** Heart, Chatterbox A, George and Bella for narration. For languages every voice put forward passed: Japanese Alpha, Tebukuro and Chatterbox A; Spanish Dora, Alex and Chatterbox A; Italian Sara and Nicola; Hindi Alpha and Psi. Which sounds most natural in Japanese and Spanish can't be judged by either of us, so a native speaker's ear is wanted before a language course leans on one.

### Changed

- **Shop: a locked thing is a dark imprint of its shape,** with no outline and no dashed card.
- **The room is drawn smaller,** so more of it shows at once. The furniture is better but wants a better view angle.
- **Displays live where they make sense.** The globe zooms in for geography. A bookshelf zooms in the same way for less tangible topics (philosophy, language, ideas): it gains books as topics are learned, and more at each milestone in a lesson. The same rule applies wherever something in the room is a natural home for a kind of knowledge.

### Redo

- **The avatar: none of the six.** Look at how Duolingo and Kurzgesagt draw their characters and learn from that style. The purple monster is disliked in particular.

### New idea, to be understood

- **"Each prof gets their own voice, you can choose yours."** My reading: subjects have teacher characters, each with its own voice, and you can pick which one teaches you. Asked as a card, since it adds characters to draw.

### Still open

- The avatar, after a third round.

### Profs (answered the same day)

- **Voices only.** Each subject has its own narrator voice from the four kept; no teacher characters for now. Any subject's voice can be overridden in settings.

## 2026-11-17: the third round

- **The room is settled for now:** drawn smaller, seen a little from above, furniture as redrawn, the bookcase display, and locked shop things as dark imprints. All marked good.
- **Rooms join by panning.** You drag straight through from one room to the next; no door needs tapping.
- **The avatar: shapes first.** Two of the six were liked but not enough (my reading: the raccoon and the frog, the two my notes named). Next is a board of about ten base shapes as stills: no animation, no clothes. Clothes and accessories come after a base is chosen.
- **"Shapes" meant shape styles, not species.** Next: one person drawn in ten different shape styles, and one monster drawn in ten. The ten animals from round 4 are liked and kept (`stage0/avatar4/`), with every earlier round's too.

## 2026-11-18: the shell on the phone

The shell ran on the real phone: installed, connected to the private repo, played the pilot, opened with no signal. Overall "looked really good". What they asked for:

### The path

- **Each node on the path is a whole thing, not a step of a lesson.** A lesson, a test, an exam, a chest (you get a reward when you reach it), a review of everything before it, or an animation on its own. You work from node to node.

### Lessons

- **The pilot was a good start but short, even for a glimpse.** Lessons need more to them.
- **Counterclockwise, not anticlockwise.** (My note: their own spelling is Canadian, "colour"; where North American and British words differ, use the North American word.)
- **A slider gets something to look at.** For temperature, a thermometer, or a ball that turns smoothly from a snowflake to a fire as the value moves. A slider starts at a real value with its fill showing, never at "?".
- **Voice is wanted** (it comes with stage 2).

### Sound

- **The press sounds are disliked.** They're off until better ones are chosen by ear from a board.
- **Opening Primer must not stop their music.** The app no longer claims the phone's sound for itself when it opens. (From the phone test: a voice clip plays with the silent switch on even without that claim, so narration can still ignore the switch.)

### The globe

- Good overall. Country labels flicker; the dotted lines are sometimes drawn under the land and sometimes over it.
- **Two new settings:** borders on or off, and countries coloured in four colours, the way a political map is.

### Answer forms

- Order: good. Number: "meh". Match: disliked. Tap the spot: "just weird". Dragging leaves slivers behind. Alternatives for number, match and spot go on a board before any is built in.

### Avatar

- **The person: Blob and Noodle** were the shape styles picked. **The monster: none** of the ten.

## 2026-11-18: stage 2 starts, and notes on 0.2

### Stage 2: go, with a standing rule

- **Stage 2 starts.**
- **Build it modular, every time.** Reusable parts; remaking a lesson from scratch should be straightforward; the workflow kept as efficient as possible. Where one part can serve several uses with a tweak, it does. Their example: a flat map is the globe with a different projection, so everything the globe can do also works on the flat map, without starting over, and the look stays unified. This applies to every part, not just maps.

### Notes on 0.2

- **Buttons:** no jiggle. A button animates pressed in, and has no shadow under it.
- **The chest's look** isn't liked yet.
- **Sliders:** still too much empty space; space the step out.
- **Globe settings:** the style choice on its own line.
- **Sound and music:** good now.
- **Slivers:** couldn't be checked, since the answer forms left the Playground. The sliders and the order step in the first lesson are drags to check them on.
- The path and the longer topic were marked good.

### Answer forms

- **Variety is wanted.** Several forms of each kind can live side by side; a lesson uses whichever suits.
- **Number:** Dial (fun; the palm tree needs work) and Pile (simple, easy to read). Tower "looks weird".
- **Match:** String and Sort. Snap "isn't bad" but its puzzle piece doesn't line up.
- **Spot:** all three "meh". Pin had overlapping text, arrows snapping harshly and poor contrast; Regions had overlapping corners and odd shading, and the anatomy wasn't clear; Lasso invites odd edge cases and fiddly control. Redone when a lesson needs one.

### Avatar

- **The problem is the face: everyone is too happy.** And no style offered a side view. Next round: calmer faces with a range of expressions, and side-view characters.
- **Round 7 (calmer faces, side views): neither landed.** Next: one crow in eight clearly distinct styles, each changing shape language, shading, limbs and eyes, standing in a cheated three-quarter pose turned slightly to the right (not full front, not full profile). "I'll know the look when I see it."

## 2026-11-18: the first pieces of stage 2 on the phone

Their words are in primer-data `notes/answers-2026-11-18c.md`.

### Marked good

Buttons and the chest, the one map (globe or flat), and the spacing.

### Animations play like a video

- **Full screen, no visible buttons.** The picture fills the screen. Tapping it brings up a progress bar and controls laid over it, like YouTube (pause, skip, a close button), which fade again after a few seconds. No continue bar.
- **No interactive parts in animations.** They play through like a video. The tap-to-continue moments are taken out of the scene format, not just out of the pilot (fewer parts).
- **Captions animate:** each word lights up as it's read. Captions can be turned on or off from the overlay, and the choice is remembered.
- **Animations can be longer.**
- **Louder.** "Everything is too quiet." The clips sat at about -16 LUFS. My call: narration goes up to about -13 LUFS with a limiter so peaks stay under -1 dB. A phone page can't raise its own volume, so it has to be in the files.

### Voice in lessons too

This replaces "voice only for animations, overviews and pronunciations" (2026-11-16). My call on how: with Voice on, a lesson step's text and its question are read aloud as the step opens, with the words lighting up as in captions. The explanation after an answer is read too. Moving on stops the voice. A step can carry its own spoken wording when the written one doesn't read aloud well. One read-along text part serves both the captions and the lesson text.

### What each kind of node is for

- **Animations introduce a concept, lessons reinforce and expand it, tests test it.** A topic's sections open with an animation. The pilot is reordered to match, with an animation before each lesson.
- **Labs (their "maybe a 4th type"):** a bigger problem in several parts, usually in a playground, using what the topic covered, with coins (earned from lessons and studying) buying help when you're stuck. Proposed back to them as a design card before anything is built.

### Answer forms

- **Temperature slider:** have fun with it. It could be a thermometer that changes colour, and its picture should move.
- **Depth slider:** vertical, and better looking.
- **Dial:** the wind isn't animated any more (a regression), so it must move again.
- **Number:** still too simple; the design and the drawing aren't liked.
- **Pile:** the count sits in the handle, between the arrows, with a tick of vibration on each add or remove.
- **Spot is bad.** Taken out of Practice until it's redone.
- Every other form is good.

### Avatar

- **Round 8 (one crow in eight looks): too extreme.** Keep the flat vector art style. Stilt is the only one slightly liked, but the next round mustn't just be variants of it. My reading of "don't run away with that idea and just make variants of him": one or two looks may borrow from Stilt, and the rest are fresh.

## 2026-11-18: labs, crow round 9, review on the phone

Their words are in primer-data `notes/answers-2026-11-18d.md`.

- **Labs: yes**, as designed on the Misc card: one bigger problem in three to five parts, in a playground; hints (a nudge, a pointer, the answer) cost coins; with no coins a part can still show its answer but earns nothing; a lab never blocks the path, and the test opens once the lessons are done. It comes after the current stage 2 pieces, with coins.
- **Review: good** (the run, missing, Profile, and my small calls: warning under 70%, close keeps the combo, unasked facts as open dots).
- **Wording:** the ask "In a hurricane, when is the heat that drives it let out into the air?" reads badly. Every ask gets a wording pass: plain, short, one idea per question.
- **The combo should come alive as it grows.** They offered flames, or tiers: nothing, bronze, silver, gold, crystal (purple), diamond and on. My call: tiers, since flames read as a streak, which is ruled out, and tiers sit with the crown and trophies. Each tier's chip is livelier than the last, calmly (nothing jarring).
- **Avatar round 9:** Plump and Bean picked. Next: variants of those two, including changes to the face.

## 2026-11-18: review read aloud (0.5.1)

My calls, following their "voice in lessons too" and sent as deck `stage2-voice2` for the phone check:

- **Every ask of a fact is voiced**, in review, in tests drawn from facts and in a look back from review, the same Reader and lit captions as lessons. Its lines are keyed by fact and ask (`<fact>.<ask>.<what>`), not by where it's asked, and live in the voice file of the lesson that declares the fact, so one clip serves every place the question shows up.
- **The phone keeps only the narrator in use** for each topic: the one chosen for its subject in Profile, else the topic's own, else Heart. Clips are still made in all four on the PC, so a change is one download away. Changing narrator pulls straight away, with a note under the narrators. The pilot is 15 MB on the phone instead of 59 MB for all four.
- **A clip not on the phone yet never breaks anything:** its line plays silently on the reading clock with its captions, never in another narrator's voice. Whether to keep the old narrator's voice until the new one is down instead is asked on the deck (my pick: keep it).

## 2026-11-18: 0.5 on the phone (video, combo, forms, crow round 10)

Their words are in primer-data `notes/answers-2026-11-18e.md`.

- **Animations: too static.** They want cuts and changes of view (closer, wider, another angle) that show what each line is saying, smoother motion (less snappy easing; the storm's track line drawn smoothly), and satisfying sound effects (now allowed). Anything a line names (an ocean, a continent) is labelled on the globe while it matters. Captions, longer animations, lessons read aloud, loudness and starting by itself: good.
- **The video's bottom band:** the page doesn't reach the bottom of the screen in the player; fix.
- **New narrator with no signal: keep the old voice** until the new one is fully down (my pick, GO). Changing narrator took about 26 seconds on their phone.
- **Combo tiers: good**, and they want many more, below and above (wood, tin, platinum, eternal, celestial, legendary, omnipotent as a black hole, and abstract extremes): a board to pick from, not all will be used. Bronze loses its thin line. **Losing it** shouldn't change the chip's width (or only smoothly) and should shatter.
- **Shields (their idea, accepted):** each tier protects the combo from one-off mistakes: bronze to gold one shield, higher tiers two. A miss with a shield left cracks the chip (one crack per shield used) instead of ending the combo. My reading, to confirm on the board: shields refill on reaching a new tier, and right answers don't mend cracks.
- **Forms:** thermometer: bulb and tube one shape, the tube's shadow not over the bulb, a solid handle, heat lines in doubt. Sea: the heat colour fills the waves, longer wavelength, the wave between yellow-orange and deep orange; the round thing reads as a moon. Wind: no white waves, rain falls in an odd pattern, a stray line at the foot of the tree, the darker water in front of the island. Number: all four looks kept (picked all of them); a wrong answer shows the right one in the field; the wheels' bottom shadow is lighter than the body; the tape needs its unit. Pile and Spot: good.
- **Crow round 10:** Button and Bean picked. Both get simple round eyes, in a white and a black version. They're unsure about the style and about a bird at all: next, a board of every character made so far.

## 2026-11-19: the whole cast

Their words are in primer-data `notes/answers-2026-11-19a.md`.

- **Crow:** Button with white eyes (my pick). Unsure the light rim on its left side fits. Next: pill-shaped eyes, like 2D capsules, solid white.
- **The cast board (98 characters):** they ticked 15 with "some merit/charm", none they're sold on: fox, capybara, axolotl (round 2), puffin and tall person (3), gecko, sheep, walrus, flamingo (4), cut-out person (5), softer person, soft noodle person, Flop and Hug (6), Plump crow (9). The round 7 faces are "ok". The gecko "could be used if made more unique and not like Cartoon Network/child book"; the softer and noodle people are "too happy, too much child cartoon vibe". So the direction is less child-book, more grown-up and unique, keeping charm.
- **Next round (my call):** Button with pill eyes, rim and no rim; and a spectrum from child-book to grown-up for two of the liked characters (the gecko and the cut-out person), so they can point at where on it the style should sit, before any species is settled.
### Forms, round three (my calls, sent as deck `stage2-forms3`)

- **Heat lines: off**, behind one switch (`heatLines` on the warmth picture), asked on the deck's board (my pick: without).
- **The sea's round thing is the sun**: a daytime sky and rays, one sun drawing shared with the wind's island. "Wave between the oranges" read as the line where the two warm tones meet, now a slow wave.
- **A wrong number shows the truth in its own field**, in gold (keys type it, wheels roll, the tape glides, beads move), and what was given stays on a small struck-through tag at the field's corner, coloured by its mark. A number given exactly right is left as it is.
- **The tape's unit**: it was always shown when a lesson gives one; the Practice example had none, and now has km/h.

## 2026-11-19: forms round three on the phone

Their words are in primer-data `notes/answers-2026-11-19b.md`.

- **Good:** the thermometer, the sea, the wind, the number reveal and the tape. Heat lines: **without**.
- **Still to do:** the sea's warm colour becomes see-through, tinting the water so its detail still shows; a yellow line still peeks out on the wind picture's sand; the abacus reveal moves its beads one at a time, quickly snapping, instead of all at once; the wheels still look off ("the fade is over the numbers?"); the tape's reveal can take longer, starting slow and speeding up, always within one second.

## 2026-11-19: pill eyes, and the style dial missed

Their words are in primer-data `notes/answers-2026-11-19c.md`.

- **Button: pill eyes, no rim** (my pick). Next: the pills turned the other way (lying, not standing), and a variant with a shadow on the eye.
- **The style dials (gecko, cut-out person): redo, none of them.** "Not what I meant. I don't mean more realistic." My dial read "grown-up" as more lifelike proportions and detail; that's wrong. "Not Cartoon Network / child book" and "more unique" is about the style's own voice, not realism. Next: one character (the gecko) drawn in several distinct stylised directions, none more realistic than now, each with its own shape language and palette, for them to tick, with a question card asking what "more unique" means to them, my reading first.
### Forms, round four (their notes on round three; my calls, sent as deck `stage2-forms4`)

- **Heat lines: without**, as they chose. The switch stays, off.
- **The sea's warm layer is a tint** (their words: "transparent so it tints the water"): one group laid over the water at `WARM_TINT` in kit.js, shared by the sea slider and the depth picture, so the water's shading and light rays show through. The warm colours carry no blue, so the tint stays warm over blue water instead of going brown.
- **The wind's sand has no line drawn on it.** The yellow line was a highlight whose ends poked past the island's edge. The island is two flat tones, with a clear shaded side on the right rather than a sliver.
- **The abacus shows the truth a bead at a time**, quickly, each bead snapping into place with a tick, rod by rod from the left, always within a second. Only the reveal; a finger still moves a whole group at once, as on a real abacus.
- **The wheels are drawn as real drums.** What read wrong: a blue-grey fade was laid over the drum's top and bottom, over the digits, so the neighbouring digits looked fogged, and the rounded window read as a button. Now each digit sits on a cylinder: full size facing you, squashed by the cosine of its angle as it turns over the top and bottom, nothing laid over it; the face is three flat bands (pale top turned to the light, white face, shaded foot) and a darker side.
- **The tape's glide to the truth is paced**: slow off, faster, easing in, longer the further it goes, never over a second. A finger's glide stays quick.
- Motion a Number look sets going itself (a drum settling, the tape's glide, the beads) runs on the inputs' one clock, through `tween` and `oneByOne` in number/common.js.

## 2026-11-19: the geometric-glow style, tried on a cast

In chat, on the ten gecko styles: "Try 8 animals and a human and monster in the 1st style the lizard is in". Style 1 is geometric glow (round 13): built from circles, half circles and boxes, lit by a small glowing lamp in the dark, violet shadows and a warm edge of light. Next: ten characters in it (eight animals, a person, a monster), one picture each, to see whether the style holds across a cast.
My calls building the animation notes (branch s2-anim), theirs to overturn on the phone:

- **Directing is general.** Shots (cut, fade, push, zoom; split; inset) are scene actions; the camera moves (a place, a zoom, an angle from low down, a heading, following a storm, the world drifting) are the map's calls; a new part, the sea and sky seen from the side, is the cutaway for anything between the sea and the sky. Both pilot animations are re-directed with them, with no spoken words changed.
- **Soft motion in scenes, lively in lessons.** In a scene things fade and grow in and every move eases in and out with no overshoot; a lesson's parts keep the approved bounce.
- **Sound effects are made here**, from noise and sine waves (no recordings, nobody else's sounds), quiet beside the voice, played as plain `<audio>` like the voice. They follow the Effects switch, which is off since the press sounds were disliked; turning it on to hear them brings the press sounds back too. Whether animations' sounds should have a switch of their own is a question for the phone.
- **A new narrator switches a topic all at once**, once every clip of it is down; until then the old voice goes on.

## 2026-11-19: styles picked, the combo's tiers, forms round four

Their words are in primer-data `notes/answers-2026-11-19d.md`.

- **Style: geometric glow** (round 13, style 1), and my reading of "more unique, not child-book" is confirmed: a style with its own voice, a clear shape language and palette, calm faces instead of grins, simple and flat, not realistic. The ten-character cast in it is out on deck `stage0-cast4`.
- **Button's eyes: pills lying down, with the shade below.**
- **Combo tiers kept (23), low to high:** wood, tin, copper, silver, gold, platinum, emerald, sapphire, crystal, ruby, diamond, obsidian, opal, titanium, aurora, nebula, celestial, eternal, supernova, eclipse, singularity, multiverse, void. Bronze wasn't ticked: copper takes its place (my reading). Similar tiers must differ by more than colour (tin and copper, for one), and the thresholds are spread out.
- **Shields refill on reaching a new tier** (my pick, GO). Shields, cracks and the shatter: good, but both the crack and the shatter sound are bad and get redone.
- **Forms round four:** wind sand, wheels and tape good. The abacus beads must actually slide, one at a time, not jump. The sea's tint: decent, no note. The tape: "Km/hr?" (check the unit shows and reads plainly).

## 2026-11-19: the cast, and the directed animations on the phone

Their words are in primer-data `notes/answers-2026-11-19e.md`.

- **Cast in geometric glow: "good enough for now".** Fox and axolotl picked. Fix the fox's ears; make the eyes normal (my reading: plain round eyes with a pupil, no lid cut across). The avatar rests here until it's needed.
- **Animations:** smoother motion and labels good. Cuts and views "just meh, I see flaws": they want better, more thorough explanations in the pictures, and the script itself reworded (it reads weirdly), so it gets re-voiced.
- **Sound effects must be attached to the deck** so they can be heard there (my miss: Riffle cards carry `audio`). Every sound sent from now on goes on its card.
- **The bottom band is worse** after 0.5.5's fix. The guessed cause (a screen-height fit) was wrong; it gets undone and the band fixed properly.
- **Animation sounds get their own switch** (my pick, GO): on by default; Effects stays off and covers button presses only.
- **Each narrator keeps a "Hello, I'm …" sample on the phone at all times**, played when you choose a voice, so a choice can be heard before its clips come down.
### Forms, round five (my calls, sent as deck `stage2-forms5`)

- **The abacus reveal slides each bead along its rod**, drawn frame by frame from one `tween` on the inputs' one clock (the old 90 ms CSS snap ran off the clock, so it read as a jump and films missed it). Bead m sets off `gap × m` ms in; a few beads slide 220 ms each, clear of each other; many slide 110 ms, each starting just before the one ahead lands; the last is home inside a second, and each ticks as it lands. A finger's moves keep their CSS slide (230 ms), as before.
- **The tape's unit reads with its number**: right after it as one phrase, in the same weight (900) and colour in every state (white picking, the mark's colour, gold for the truth), a little smaller (30 px to 40). Spelled as the lesson gives it (km/h); no lesson data changed.
- **The sea's tint: unchanged**; nothing clearly off at phone size.
## 2026-11-19: the combo's 23 tiers wired, a new crack and shatter

My calls on the section above, sent as deck `stage2-combo3` for the phone check:

- **The 23 kept tiers are the ladder**, in their order, with plain below wood. The board's others (clay, stone, bronze, rose gold, jade, legendary, prism, omnipotent) are set aside in `SPARE` in `js/combo.js`: drawn the same way, never reached by a count, so one comes back by moving its line.
- **The thresholds: gaps that grow, three tiers to a step.** The gap to the next tier is 3 for the first three tiers, then 4, 5, 6, 8, 10 and 13 for three tiers each, and 16 for the last two. So: wood 3, tin 6, copper 9, silver 13, gold 17, platinum 21, emerald 26, sapphire 31, crystal 36, ruby 42, diamond 48, obsidian 54, opal 62, titanium 70, aurora 78, nebula 88, celestial 98, eternal 108, supernova 121, eclipse 134, singularity 147, multiverse 163, void 179.
  Why: a run starts at ×0 every time and a review is about 10 to 30 questions. A short run that goes well still reaches a few tiers (five by 17); a whole review of 30 right reaches emerald, the seventh; past that, a big review keeps reaching a new tier every 6 to 16 answers. Void needs 179 right in a row in one run, about six whole reviews without a break: a rare feat, as asked. No gap is shorter than the one before, so tiers never bunch up near the top, and the steps are even enough to feel steady rather than random.
- **Shields as proposed:** wood and tin none, copper to gold one, platinum and up two, all refilled on reaching a new tier (confirmed). I weighed a third shield for the far end and left it out: with two shields back at every tier and gaps of 13 to 16 answers, a long run is already forgiving, and the top should stay a feat.
- **Alike tiers differ by more than colour.** Each has its own finish, cut or motion, as small data on shared drawing parts:
  - *Metals:* tin is matte and dented, with nothing shining or moving; copper is warm, with verdigris crusting its bottom edge and a corner and a slow warm sheen; silver is polished, with a fine bright line and a quick white sweep; gold has a raised rim like a coin's, a warm sweep and a glow; platinum is a mirror, a bright sky over a sharp dark horizon, with a faint rainbow sweep; titanium is brushed, fine lines along it, with the anodised rainbow round its edge.
  - *Gems:* emerald is the emerald cut (long steps round a wide table, corners cut, flecks inside) with the light walking slowly along the steps; sapphire is a polished dome with a six-rayed star gliding over it; crystal is a cluster of points standing up, glints on their tips; ruby is the princess cut (rings of facets closing on the middle) with an ember breathing inside; diamond keeps the brilliant, its fire and quick sparkles.
  - *Dark stones:* obsidian is black glass with the curved ripples of where it broke; opal is milky with flecks of colour flashing in turn.
  - *Sky:* aurora keeps its ribbons; nebula is soft clouds drifting the other way, thick with stars; celestial a gold constellation and rim; eternal white gold with turning rays.
  - *The far end:* supernova bursts outward; eclipse is a black moon over the sun, its corona and a bead of light on its edge (new); singularity is now the black hole (the drawing made for omnipotent, in violet), sparks spiralling in; multiverse its drifting copies; void nothing but stars.
  A test draws each group with every colour taken out and checks no two match.
- **The crack and the shatter, redone ("bad sound").** Both are now files made by `tools/make-sounds.py` from sine partials and noise (no recordings): the crack a porcelain tink with a soft knock under it and two tiny ticks as it runs; the shatter a soft low thump, a bright break and small bits cascading away, thinning as they fall. Levelled to -27.5 LUFS like the scenes' sounds, peaks around -9 to -11 dBFS. They play through Web Audio like the other effects, so they follow Effects and the silent switch as before, but straight, without the effects' low-pass. Three of each are on the deck; my picks are crack A and shatter A.

### Animations round two (my calls, branch s2-anim2, sent as deck `stage2-anim2`)

- **Both scripts rewritten** in plain spoken sentences, one idea a line, in the order a curious adult would ask: what a hurricane runs on, where the heat comes from, how the water's heat gets into the storm (evaporation, rising, cooling, cloud, heat let go, faster rising, air drawn in), then why late summer; and for the spin, why the Earth bends moving air, which way, how that makes a storm turn, why not at the equator, then one storm's path. Every fact the lessons lean on is kept (27 °C and 80 °F, 5°, counterclockwise and clockwise, mid-August to mid-October). Re-voiced in all four narrators.
- **Each line draws its mechanism.** New general tools, none for one scene: the map's `spiral` (air aimed straight into a storm, then bent by the Earth's turning so it swirls round it; the bend is the Earth's own for the latitude, none on the equator), a dotted `arc` for an aim beside a `flow` for the path taken, labels on routes (kept clear of each other and over the storms), dashes running along flows in a scene, `style` (a soft change of look), `key` (the warmth colours explained), `clear` of one kind; the section's `carry`, `cooling`, `drops`, `days` and `gauge`, lit cloud puffs, bolder arrows; and `shot.title`, a title card for a key term.
- **Animation sounds have their own switch** (their GO): on by default; Effects is the press sounds only and stays off.
- **Narrator samples**: "Hello, I'm Heart. I'll read your lessons to you." for each of the four, in `narrators/` in the data repo, made by `primer voice` (or `primer samples`), kept on the phone always, played on choosing a narrator and from a play button beside each.
- **The bottom band**: 0.5.5's screen-height fit is undone. The app's box is fixed to the window's edges with nothing sized from the screen, the safe areas are padding inside, and the page's own ground is the app's dark (the tab bar's, the screen's, or the video's while one plays). If it still shows, tapping the version in Profile five times shows what the phone reports (heights, insets, standalone), to screenshot.

## 2026-11-19: animations round two, combo tiers and sounds on the phone

Their words are in primer-data `notes/answers-2026-11-19f.md`, with the pinned frames in `notes/pins-anim2/` and the band picture `notes/img-2026-11-19-band-space.jpg`.

- **Animations: decent, still far from the aim.** "You can't create the same quality as Kurzgesagt but my hope is for you to get close." Study first: a Sonnet agent watches and studies about five Kurzgesagt videos with the video skill; if its study is thin, an Opus agent studies five others. Then go all out: there is no rush on length; explain in detail and say why (not "winds from the west" but why the winds blow that way), maybe a separate animation on how wind works, since the lesson leans on it. Pinned dislikes: the "Its fuel: heat" title chip, the heat-spark vapour lines ("I don't like the look of these heat lines in general"), the evaporation scene overall ("just meh"), and the cloud building up from a line.
- **The script rewording: good. Narrator samples: good.**
- **Sound effects come from a sound library**, with a board per kind of sound to tick every one that sounds nice. Same for the crack and shatter: the made ones were "too twinkly", not like something breaking.
- **The bottom band is now dead space under the tab bar.** Waiting on the hidden screen panel's numbers to fix it for certain.
- **Combo tiers:** thresholds and shields good. Copper's side goes green; titanium's rainbow fainter, with a slow turn round the border; platinum loses the rainbow and gets a larger star twinkle at the end of its shine; the gems other than diamond "reverted" (back toward round two's richer look), diamond loses its rainbow sheen; obsidian gets a slight oil-slick hue; opal "meh"; the sky tiers underwhelm (nebula could have animated, shifting electron-like rings); the far end underwhelms and the black-hole art is disliked.
- **Forms round five: good** (beads slide, the tape's unit).

### Sounds from a library (my calls, branch s2-sounds, deck `stage2-sounds`)

- **Only CC0 recordings**, from Freesound (sounds marked Creative Commons 0, each page checked) and Kenney's Interface Sounds, UI Audio and Impact Sounds packs. No credit is owed; it's kept in `sounds/library/SOURCES.md` anyway. Nothing non-commercial or share-alike was needed.
- **98 candidates, 6 to 10 a kind**, in `sounds/library/candidates/` as `<kind>-<n>-<what>.m4a`: whoosh 9, cut 9, swell 8, pop 9, chime 10, wind 6, fizz 9, rumble 9, crack 9, shatter 10, button press 10. About 1.4 MB in all; none over 36 kB.
- **Each cut to its useful moment and levelled within its kind**: high-passed (90 Hz; wind 60, rumble 45), faded at both ends, the scenes' sounds at -27.5 LUFS like the made ones, presses at -28, crack and shatter louder at -25 (with a fast limiter of up to 8 dB, since a crack is all peak); mono AAC, 80 kbps.
- **Dropped unheard, by measurement:** flat-topped (clipped) sources, recordings that needed 20 dB or more of gain (hiss), ones mostly silence, cracks that were only scattered clicks, glass with a long ring (the "twinkly" complaint), and synth blips that read as 8-bit.
- **The deck's picks are guesses from shape and brightness**, two a kind; I couldn't listen. Nothing is wired in until they've ticked.
### Combo tiers, round four (my calls, branch s2-combo4, sent as deck `stage2-combo4`)

- **Metals:** copper's side (the chip's edge below) is a verdigris green. Platinum's sweep is plain white, and a big twinkle (a long four-point star, a short one between its rays, a soft middle) opens on its top corner just as the sweep leaves. Titanium's anodised edge is drawn at about half strength (each colour mixed with the grey) on a wheel behind the face, the rainbow twice round so half a turn in six seconds loops; its sheen is a slow faint white one.
- **Gems, "reverted":** comparing the films, round two's were richer because the facets were big, bright and bold, the light ran across them every three seconds, four sparkles circled the chip and the glow was stronger; round three's cuts had thinner, darker facets, one glint and slower light. Each gem keeps its round-three cut (so they stay distinct) with round two's brightness, light, sparkles and glow back: emerald two broad steps and a split table, a slow green sheen; sapphire a brighter dome with light glowing up from inside at the bottom; crystal lighter points and glints round the chip; ruby lighter rings, fiery glints and a warm sheen. **Diamond's sheen is white**, no rainbow.
- **Obsidian:** a faint oil slick: four broad wavy bands of teal, violet, gold and pink at 9 to 14% drifting over the glass.
- **Opal: a black opal.** My call: their "meh" was the milky look with flecks; a black opal shows play-of-colour at its most striking and still reads apart from obsidian (vivid colour against black glass). Flames of colour packed across a blue-black stone, leaning in alternate directions, each with a second colour that comes up as a wave of light crosses left to right with the gloss, every three seconds.
- **Sky:** nebula gets three rings like an atom's, tilted and rocking, a spark running round each, the front half drawn over the chip and the back behind (a spark keeps round by turning back against its arm). Aurora gets a quicker near layer of curtains. Celestial gets a gold astrolabe dial turning behind it and a shooting star. Eternal gets a second set of rays turning the other way, motes rising and a stronger glow.
- **The far end:** supernova is a star blowing apart (shell streaks, a flare each beat, bursting spikes, a fire and a blue shock ring racing out, bits flung out). Eclipse's moon slides to and fro over the sun so a crescent and the diamond ring flare on one side then the other, the corona shimmering in two layers, long fine streamers behind. **Singularity is no longer a black-hole drawing:** starlight bent into a ring inside the chip and a wider one round it, bright lensed arcs sliding round both, rings of space falling inward, sparks spiralling in. Multiverse: other universes in soap-bubble spheres drifting through, three copies of the chip fanning out. Void: darkness spreading round the chip, specks of light drawn in and going out, faint galaxies in its two drifting star layers.
- **Kept cheap:** every new layer is a transform or opacity animation on a small layer, glows and rings are gradients, masks are static (on the dial, the corona and the lensing ring), no blur. Everything still loops in six seconds. Above the chip, everything stays within the 9 px the glow already used (the dial is cut there), except the supernova's shock rings, by a few pixels, as they fade.

## 2026-11-19: library sounds picked

Their words are in primer-data `notes/answers-2026-11-19g.md`; files in `sounds/library/candidates/`.

- **Picked:** whoosh 1, 6, 7, 8 ("soften them a bit and maybe extend the duration when needed"); cut 1, 2; swell 1; pop 1, 3, 4; chime 1, 7; wind 1, 2, 4, and keep 2 and 5 for creepier moments; fizz 4; rumble 1, 2, 3, 4, 5, 7, 8, 9; crack 3, 4, 5 (ice); shatter 5 (tile breaking). Button taps: 2 (click), 9 (switch), 10 (soft switch).
- **How they're used (my call):** each kind plays one of its picked sounds, varied so repeats don't sound identical; whooshes get softened (a gentle low-pass and a slower attack) and can be time-stretched to fit a longer move. The combo's crack plays the ice cracks, its shatter the tile break. Wired in once the animation round that's running now lands, since it owns the scene sound table.

## 2026-11-20: combo tiers, round four on the phone

Their words (from the deck's answer files): metals good. **Gems: revert to round two's style, "where they were all pretty similar. Just shift how the lines work"**: one shared rich gem look, each gem told apart by its facet lines. Obsidian good, **opal not** (a third try). Sky good: **eternal gets the disk celestial has, maybe with clock hands; celestial needs something else.** Far end "not great": **singularity good** (the bottom half of its ring could show in front of the chip), **void's stars should look like they're going in, not drifting left**, and supernova, eclipse and multiverse are disliked.

### Combo tiers, round five, and the picked sounds wired (my calls, branch s2-combo5, sent as deck `stage2-combo5`)

- **Gems: round two's look for all five**, as one drawing (`gemCut` and the `gem` face in js/combo.js): big facets lit from the upper left, a faint lit line along every facet edge so the cut reads, the light running across them left to right every three seconds, a white sweep, four sparkles circling the chip, a strong glow. They differ only by colour and by how the lines run: emerald round two's step cut (the table split along a slant, the steps above and below split at the middle), sapphire a cushion (four whole steps, the table crossed corner to corner), crystal a zigzag across the table with the steps split in three, ruby a rose (a six-pointed star meeting in the middle, a ring of facets fanning to the edge), diamond the brilliant with a little fire. The step cut's flash showed black in my first try (a colour helper returned `rgb()` where a hex was wanted); the light run is plain white now.
- **Opal, a third try: three ideas** (`CANDIDATES.opal`): *harlequin*, small diamond-shaped patches of vivid colour under a milky skin, every few flashing to another colour as the light crosses; *rolling*, a pearly opal with a soft rainbow sliding under the milk; *boulder*, veins of opal through brown ironstone, their colours crossing to a second set. **Pick: harlequin.** It's the one that reads as an opal (play-of-colour in patches); rolling reads as a holographic sticker and goes all milk for part of its loop, and boulder reads as stripes.
- **Eternal gets celestial's gold dial**, turning behind it, **with clock hands**: the long one ticks round twice in six seconds (twelve ticks a turn), the short one sweeps round once. They're behind the chip, so they show past its sides, with a round tip. Its rays stay, fainter; motes and the figure-of-eight spark stay.
- **Celestial: the sun and the moon on one tilted gold orbit** round the chip, once round in six seconds, passing behind it at the top and across the front at the bottom (drawn like nebula's atom rings, without the rocking). The moon is a crescent that stays upright. The constellation, shooting star and gold rim stay.
- **Singularity: its outer ring is tilted and flatter**, its near (lower) half drawn again over the chip as a lit arc, with the sliding arcs on that half too, so it reads as a ring seen at a slant.
- **Void: everything goes in.** The two star layers that drifted left are gone. Its stars fall inward to the middle from all round, shrinking and going out, and twelve specks from all round the outside fall in to its edge, shrinking and dimming. The far galaxies are still.
- **Supernova, eclipse and multiverse: two fresh ideas each** (`CANDIDATES`; `PICK` says which the table uses):
  - Supernova: *collapse* (a star in the dark slowly shrinking and heating to white, falling in, a flash, a shell of fire racing out past the chip, every six seconds) or *pulsar* (what's left: torn red and gold threads of gas round a tiny star sweeping two lighthouse beams round, out past the chip, blinking). **Pick: pulsar.** It's always alive, where collapse is quiet for four seconds out of six, and it's unlike anything else on the ladder.
  - Eclipse: *transit* (the moon crossing the sun whole: blue sky, a bite, totality with the sky dark, stars and corona, a bead at each edge) or *annular* (a ring of fire round a moon too small to hide the sun, flames licking off it, a bright point running round). **Pick: annular.** Transit works, but at totality it's round four's black moon, corona and bead again, which was disliked.
  - Multiverse: *nested* (frames of the chip's shape, each its own colour with its own stars, growing out of the middle and on out round the chip) or *branches* (one timeline along the middle, others forking off it and off each other, each its own colour, running out past the chip's sides). **Pick: branches.**
- **Every idea stays drawable** by name (`TRIALS`, as `<tier>-<idea>`), never reached by a count, so changing a pick is one word in `PICK`. A test checks each draws and that the table uses the picks. The bubbles, echoes, shock rings, flare and old eclipse parts went with the faces they belonged to.
- **Sounds wired** (their picks): one table in js/feel.js, `RECORDED`, kind to files: crack is ice cracking 3, 4 and 5, shatter is the tile breaking (5), tap is the click (2), switch (9) and soft switch (10). Each sound picks one of its kind's files at random, never the one it played last. Every button press (tap, select, on, off) plays the tap kind, still only with Effects on (off by default). The answer and end notes stay made on the spot. The files are copied unchanged into `sounds/` (levels as on the deck: taps -28 LUFS, crack and shatter -25), kept offline by sw.js. The made crack and shatter are gone from `sounds/` (make-sounds.py no longer writes them). The press recordings get ready as a finger comes down, so the first press sounds on time.
### Animations round three (my calls, branch s2-anim3, deck `stage2-anim3`)

Studied first (`docs/research/kurzgesagt-study.md` and `-2.md`); the plan is `docs/stage2/anim3-plan.md`, the list of what I found wrong in my own films and fixed is `docs/stage2/anim3-critique.md`.

- **A new first animation, "How wind works"**, with a lesson after it ("Why the wind blows", seven facts), so the path is: how wind works, its lesson, the engine, warm water, the spin, its lesson, the chest, the test (which gains two wind questions). It starts from molecules: air pressure is their pushing, wind is air pushed from crowded to thin, warm air spreads and rises; then a sea breeze as the everyday case, the sun heating the tropics most (one beam straight down beside the same beam slanting), the Hadley cell and its two neighbours, and the swerve.
- **The Coriolis effect is set up by the ground's speed**, not a merry-go-round: the equator's ground moves east at about 1,670 km/h, slower toward the poles, so air heading for the equator falls behind (the trades blow from the east) and air heading for the poles gets ahead (the westerlies). Either way it's to its right in the north. The spin animation recalls it rather than teaching it again. My reading: one explanation, used twice, beats two. A merry-go-round "ride along" view is left for later if the phone says the swerve doesn't land.
- **The engine and the spin are rewritten and redirected**: evaporation is shown up close (molecules breaking free, each taking its heat, the water left behind cooling), the vapour rises, cools, turns into drops and lets its heat go, the cloud billows up and the engine feeds itself; the spin follows one storm from a ripple off Africa round the high into a hook. Every number kept or added has its source in the file (27 °C and 80 °F, 5°, 1,670 km/h, 15 km, 30°, mid-August to mid-October).
- **Animations run longer**: up to about 60 lines (`primer check` suggests splitting past that; a scene step in a lesson stays at 30). How wind works runs 3:44, the engine 2:20, the spin 2:02, in Heart's voice.
- **One look per invisible thing, for the whole series** (`js/code.js`): heat flowing is warm triangles, a temperature is the thing's colour shifting (with a small overshoot) plus a number, moving air is pale dashed arrows with running dashes, vapour is pale puffs, a cloud is billows in three tones, spin is streaks round a still storm, pressure is crowding and pushes or a sign. Answering the pins: **no title chips** (terms are built labels on their thing, numbers stand on signs in the world; `shot.title` stays in the kit but the series doesn't use it), **no heat squiggles or orange dots** (heat shows as triangles only where it flows; vapour carrying heat has only a faint warm halo; the heat appears as triangles leaving each puff as it turns to drops), **evaporation redone** at the scale of molecules through a lens, and **the cloud billows up** out of the rising air, one bubble first, then up and out, an anvil at the top, never laid out along a line.
- **Motion by what moves** (`MOTION` in `js/ease.js`, the study's measures): furniture ease-out, props on a 12% spring, camera sine, transitions in-out cubic at about 850 ms, processes linear or looped, colour with a 10% overshoot.
- **New tools, all general**: the `molecules` part; the sea and sky's shore and land, loop of air, parcel, beam and signs; the map's `winds`, `turning`, `cells`, `frame` and `sign`; `shot.lens` with cuts `through` and `out`.
- **Sounds are placed by their pictures**: each kind's file, peak and lead are one table (`KINDS` in `js/sfx.js`), and a call can say when its picture lands (`beat`). The made sounds stay until the library picks are wired in; that's one line per kind there.
- **Left for the phone to judge**: whether the four-minute wind animation holds attention, whether the molecules read as molecules at phone size, the sound balance on the phone's speaker, and whether a quiet music bed under the voice (the study says there's always one) is wanted.

## 2026-11-20: combo tiers, round five on the phone

Their words are in primer-data `notes/answers-2026-11-20a.md`.

- Gems, eternal, celestial, singularity and void: good. Multiverse: **branches**.
- **Opal: rolling picked, but "still weird. Maybe try voronoi cells?"** Next: rolling's sliding colour inside a voronoi patchwork.
- **Eclipse is removed** ("won't use eclipse anymore"). My call on the gap: the other tiers keep their starts, so supernova runs from 121 to singularity at 147.
- **Supernova still weak:** three new styles to pick from.
- **Sounds: crack 5 only, and tap 2 only.**
