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

### Still open

- **The phone on silent:** which of the three kinds of sound still play. Asked as a card.
