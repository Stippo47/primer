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
