# Kurzgesagt study: how they explain a mechanism, and what Primer's hurricane animations should take from it

Craft and technique study only. Nothing here is to be copied: not their birds, not their art, not their music, not their exact compositions. The point is to learn how the pictures serve the sentences and to build our own.

## 0. Method and honest limits

Five official Kurzgesagt uploads, sections of 1.5 to 4 minutes each, downloaded at 480p/30fps into `ref/youtube/kurzgesagt/` (git-ignored, local only). Each clip got contact sheets at 1 to 1.5 fps (16 frames per sheet), a few 8 fps detail sheets for single transitions, scene-change timestamps from ffmpeg, and the timestamped caption track for the same minutes.

What this method can and cannot see:

- **Motion is inferred, not watched.** At 1.5 fps I see poses, not easing curves. At 8 fps (used on two short moments: the atom-to-plasma iris and the field-line snap) I can see the shape of a move (stretch, pinch, flash, ring) but not exact timing curves. Everything I say about easing, anticipation and overshoot is a read of those frames and is marked "(inferred)" where it is not directly visible.
- **Sound was not listened to.** I only measured it: the 245 s solar clip has no silence longer than 0.4 s below -45 dB (so there is a continuous bed of music or ambience under the voice), mean level -19 dB, peak -3 dB. Section 6 is therefore thin and flagged as a gap. Someone should listen to one clip with headphones and add notes.
- Timestamps below are **source-video time** (mm:ss), taken from the captions. Frame files are named by **clip seconds** (`c###`); add the clip's start offset to get source time.

| Key | Title | URL | Section | Clip start offset | Folder |
|---|---|---|---|---|---|
| solar | Could Solar Storms Destroy Civilization? Solar Flares & Coronal Mass Ejections (2020) | https://www.youtube.com/watch?v=oHHSSJDJ4oo | 0:25 to 4:30 | +0:25 | `solar/` |
| rogue | What If Earth got Kicked Out of the Solar System? Rogue Earth | https://www.youtube.com/watch?v=gLZJlf5rHVs | 0:38 to 2:00 (rogue-a), 5:25 to 7:00 (rogue-b) | +0:38 / +5:25 | `rogue-a/`, `rogue-b/` |
| fusion | Fusion Power Explained: Future or Failure (2016) | https://www.youtube.com/watch?v=mZsaaturR6E | 0:49 to 2:35 | +0:49 | `fusion/` |
| toolate | Is It Too Late To Stop Climate Change? Well, it's Complicated. (2020) | https://www.youtube.com/watch?v=wbR-5mHI6bo | 0:36 to 2:30 | +0:36 | `toolate/` |
| earth | Everything You Need to Know About Planet Earth (early style) | https://www.youtube.com/watch?v=JGXi_9A__Vc | 1:00 to 3:30 | +1:00 | `earth/` |

A sixth candidate (a Gulf Stream explainer on the same channel) is listed by search but returned "video unavailable", so it was replaced by the Earth overview. The solar clip is the single best mechanism sequence (an invisible force chain from plasma to magnetic field to storm to Earth's response) and most concrete claims come from it. The Earth overview and the fusion video are older, and are useful as a contrast: they show how much of today's quality comes from continuity and lighting, not from diagram content.

Transcripts: `ref/youtube/kurzgesagt/tx/*.ts.txt` (timestamped). Contact sheets: `*/sheets/`. Saved key frames (30): `ref/youtube/kurzgesagt/frames/`.

---

## 1. How a mechanism is explained

Reference: solar clip, 0:33 to 4:27 (invisible forces, long cause-and-effect chain). Frames in `frames/`.

**1.1 Order of ideas: stage, mechanism, consequence, response, "so what".**
The video does not open with the mechanism. 0:01 to 0:23 sets the stakes (a calm sun that "suddenly vomits" radiation, three questions: how do they work, how bad, can we prepare). Then the mechanism in strict causal order, one new idea per beat:

1. 0:33 "the Sun is like a very hot ocean" (familiar analogy first, [solar_c008](../../ref/youtube/kurzgesagt/frames/solar_c008_sun-plain-glow.jpg)).
2. 0:38 "so hot atoms are ripped into electrons and nuclei" (zoom into the atom, [solar_c014](../../ref/youtube/kurzgesagt/frames/solar_c014_atom-orbit-photons.jpg); electrons drift off, "Plasma" tag pops in, [solar_c0195](../../ref/youtube/kurzgesagt/frames/solar_c0195_plasma-label-iris.jpg)).
3. 0:44 plasma is pushed around by a magnetic field (split screen, [solar_c0235](../../ref/youtube/kurzgesagt/frames/solar_c0235_split-plasma-vs-field.jpg)).
4. 0:49 to 1:22 an analogy to something the viewer already holds (gravity bending orbits) to explain "a field shapes what moves in it", then the feedback loop (plasma moves, makes field, field shapes plasma) named only after it has been shown: "a dynamo".
5. 1:39 to 1:56 the twist: loops of field get kinked, knots store energy, knots snap "like a tangle of springs".
6. 2:01 to 2:28 the consequence types (flare, proton storm, CME) with a label each.
7. 2:29 the surprise: "When these monsters hit us, nothing happens on Earth." The response mechanism (atmosphere absorbs X-rays; magnetic field deflects plasma to the poles; aurora) explains the surprise.
8. 3:07 the weather analogy ("As with any sort of weather... sometimes there are hurricanes") and then the escalation case (superstorm, 3:21 to 4:27), which re-uses every picture already taught (field stretches into a tail, snaps).

The big structural habit: **every explanation ends by being used.** The dynamo, taught at 1:18, is called back at 4:27 ("Remember the dynamo? Magnetism creates electric currents") to explain why wires are in danger. That is the recap, and it is built into the next step, not a summary slide.

**1.2 How cause and effect is drawn.**
Cause and effect is almost always **one continuous picture changing**, not two pictures joined by an arrow. Examples:
- The snap (detail sheet `solar/detail/snap.jpg`, 8 fps, video 1:52 to 1:54): two loops of field line stretch outward, pinch where they near each other, a four-point star flash appears on the pinch, a translucent shock ring expands and fades, the severed loop shrinks back to the surface while the free loop flies off. Cause (stretch) and effect (release) are one object in one frame sequence. See [solar_c086](../../ref/youtube/kurzgesagt/frames/solar_c086_loops-before-snap.jpg) and [solar_c0895](../../ref/youtube/kurzgesagt/frames/solar_c0895_snap-flash-ring.jpg).
- Deflection at 2:52: yellow arrow streams run at Earth's field, bend around a bright bow-shock curve and exit past it ([solar_c152](../../ref/youtube/kurzgesagt/frames/solar_c152_deflection-arrows.jpg), [solar_c127](../../ref/youtube/kurzgesagt/frames/solar_c127_cme-meets-earth-bowshock.jpg)). Then the camera follows the leftover energy to the poles and it becomes aurora, with the sparks becoming curtains ([solar_c160](../../ref/youtube/kurzgesagt/frames/solar_c160_aurora-from-sparks.jpg)). Cause is shown as a thing happening to a protected object.
- The Earth freeze ([rogue-b_c059](../../ref/youtube/kurzgesagt/frames/rogue-b_c059_thermometer-gauge.jpg), 6:24 area): the scene shows the cause-effect as a value dropping on a gauge while the world visibly changes colour and the cloud layer thins (the clouds fade as the narrator says the water cycle stops).

**1.3 How invisible things are shown.**
They give an invisible quantity a **single visual vocabulary and keep it for the whole video**:
- Magnetic field = thin cyan lines with small arrowheads, always the same colour, always on dark blue-violet ([solar_c086](../../ref/youtube/kurzgesagt/frames/solar_c086_loops-before-snap.jpg), [solar_c216](../../ref/youtube/kurzgesagt/frames/solar_c216_field-tail-stretch.jpg)). Wherever it appears, you know what it is.
- Plasma = fat looping orange-yellow ribbons with dashed highlight on dark red ([solar_c022](../../ref/youtube/kurzgesagt/frames/solar_c022_plasma-flow-pattern.jpg)). Plasma and field are shown side by side in a hard vertical wipe so you literally see "same pattern, two layers" ([solar_c0235](../../ref/youtube/kurzgesagt/frames/solar_c0235_split-plasma-vs-field.jpg)).
- Moving energy = dashed arrows streaming left to right across a gradient (green over deep purple for the proton storm, red-orange for the CME wind; [solar_c111](../../ref/youtube/kurzgesagt/frames/solar_c111_proton-storm-label.jpg), [solar_c127](../../ref/youtube/kurzgesagt/frames/solar_c127_cme-meets-earth-bowshock.jpg)). Speed is encoded by dash length and a text label ("9 Mio. km/h").
- Heat (older, rogue-b, 5:44): small red wavy arrows rising off a cutaway ([rogue-b_c021](../../ref/youtube/kurzgesagt/frames/rogue-b_c021_cutaway-wedge-heat-arrows.jpg)). Heat flowing = arrows, heat quantity = colour of the thing it comes from (the wedge's core glows orange-yellow at the bottom).
- Pressure (fusion, 2016; [fusion_c042](../../ref/youtube/kurzgesagt/frames/fusion_c042_sun-face-pressure-shake.jpg)): the sun is a face that turns yellow to orange to red while the outline shakes, with white arrows pushing inward on a cutaway quarter. Here the invisible force is **felt** (comedy and body language) and **drawn** (arrows) at once.
- Scale and pace of a thing too big to see: a distance bar that grows with a counter (10, 27, 45, 62, 80 ... 132 Mio. km) while a tiny blob crosses ([solar_c173](../../ref/youtube/kurzgesagt/frames/solar_c173_timeline-pins.jpg) is the neighbouring timeline; the distance bar is sheet `solar/sheets/s_190.jpg`).

**1.4 Analogies.** Two kinds:
- Everyday-object analogy spoken, usually with a matching picture: "hot ocean" (sun), "tangle of springs exploding outwards" (knots), "spoiled toddler" (star's gravity, rogue-a 1:48), "tidal wave of radiation" (flare), "a flash before the much more dangerous thunder" (flare vs CME).
- Stand-in characters who act out an abstract idea: in rogue-a 0:38 to 1:03 two birds roll balls to show "gravity attracts every piece of matter" ([rogue-a_c004](../../ref/youtube/kurzgesagt/frames/rogue-a_c004_birds-gravity-analogy.jpg)); then a small bird on a skateboard is placed a million light years from an atom and the distance arrow carries a label ([rogue-a_c011](../../ref/youtube/kurzgesagt/frames/rogue-a_c011_distance-arrow-label.jpg)) to show "even a far atom pulls on you". The characters carry the human joke and the scale intuition; the mechanism itself is drawn without characters.

**1.5 Breaking a hard idea into steps.** Each step is one sentence and one picture state. Steps are numbered by the picture, not by the voice: toolate 1:12, 2:05, 3:49 introduces "Number 1/2/3/4" with a title card on a coloured panel and an icon ([toolate sheets s_16](../../ref/youtube/kurzgesagt/toolate/sheets/s_16.jpg)). That video has the strongest "list" structure; the solar video relies on pure causal flow instead.

**1.6 Recaps.** Rarely a recap slide. Instead: (a) reuse of a defined picture at the next stage ("remember the dynamo"); (b) the same chart drawn again with one thing added (toolate's growth graph gains the +40% area, [toolate_c054](../../ref/youtube/kurzgesagt/frames/toolate_c054_graph-draws-itself-metaphor.jpg)); (c) a one-line verbal wrap at the end of a section ("Ok, so far we've learned that ...", toolate 3:29). The short verbal recap occurs only after several steps, at a section boundary.

---

## 2. Picture per line

Measured on the solar clip (245 s, 30 fps, 62 caption lines, mean 3.9 s per line). Ffmpeg scene-change detection (threshold 0.08) finds 27 changes, clustered into roughly 13 distinct moments, about one per 9 to 18 s. The rest is **continuous change inside a shot**, not cuts.

**2.1 The picture changes on sentence boundaries, not before.**
Hard changes land on the exact second a new idea starts speaking:

| Source time | Narration | What changes |
|---|---|---|
| 0:33 | "the Sun is actually like a very hot ocean" | plain sun glow starts (also the opening of this clip) |
| 0:38 | "so hot it rips atoms into electrons and nuclei" | cut/zoom to the atom |
| 0:45 | "This plasma is pushed around and shaped by the Sun's magnetic field" | the iris-zoom out to the churning plasma, then the field half wipes in ~0:49 |
| 2:52 | "The electrified plasma from a CME is deflected by Earth's magnetic field" | scene-change spike at clip t=147 (source 2:52), arrows bend |
| 3:18 | "And we know they happen once or twice every century" | timeline title card with pins (source 3:18, clip t=173) |

**2.2 Hold time.** Inside one idea a shot rarely sits still for more than 2 to 3 s without something moving or a label appearing. Longest "stable" shot in the clip is the protons-and-arrows stream (about 5 s, [solar_c111](../../ref/youtube/kurzgesagt/frames/solar_c111_proton-storm-label.jpg)), and even there the arrows stream continuously, the magnified bubble inserts, and the label "Solar Proton Storm" slides in half-way through. The timeline of super-storms (3:18 to 3:35, [solar_c173](../../ref/youtube/kurzgesagt/frames/solar_c173_timeline-pins.jpg)) adds one pin every ~1.5 s, which is the closest thing to a "static" shot, and the pins arriving is the motion.

**2.3 How much changes per sentence.** Roughly one new visible element per clause. "Plasma, made of electrically charged protons and electrons" (1:08) shows an atom, then electrons leaving it, then the label. Do not expect a sentence to be one picture: it is typically a 1 to 2 picture sequence.

**2.4 Words and pictures are doubly coded but not duplicated.** The narrator says the term; the picture shows the thing and the label tag shows the term for ~2 s ("Plasma", "Magnetic Field", "Solar Proton Storm", "CME"). Tag arrives with the first word-sound, not after. Labels are never long: one or two words, in a pill-shaped coloured tag (pink, cyan, yellow, violet), never in a legend.

**2.5 Avoiding static stretches** (summary of what keeps the screen alive):
- layered background drift (stars, particles, soft blobs) that moves even when the subject is still;
- a "breathing" glow on bright objects;
- sprites that pulse or bob slightly (the plasma dots in the atom scene drift like Brownian particles; see the 8 fps sheet `solar/detail/plasma_pop.jpg`);
- the camera slowly pushing in on a still composition (in sheet `solar/sheets/s_19.jpg` the planets orbit slowly while the gravity-well grid grows under the sun);
- reusing the same scene with an added element rather than cutting.

---

## 3. Camera and cuts

**3.1 Scale transitions with no hard cut.** The atom-to-plasma move (solar, source 0:38 to 0:45, 8 fps sheet `solar/detail/plasma_pop.jpg`):
1. The atom sits on a dark purple field with drifting particles, the label "Plasma" in a pink pill.
2. The nucleus loses its electron shell; electrons drift out into the field.
3. A **circular iris opens from the edge of the frame inward**, with the orange plasma pattern revealed inside the dark circle edge, and the circle then collapses toward the atom, which shrinks to a small circular dot sitting on the plasma ([solar_c0195](../../ref/youtube/kurzgesagt/frames/solar_c0195_plasma-label-iris.jpg), [solar_c022](../../ref/youtube/kurzgesagt/frames/solar_c022_plasma-flow-pattern.jpg)).
So the scale jump (atom to a patch of sun) is done by a **shape-based wipe that is itself the zoom**: the circle is the "window" onto the new scale. I read this as match-cut logic: same screen centre, shrinking object that remains in frame as the anchor.

**3.2 Wipes are shapes with meaning.** The plasma-vs-field screen is a straight **vertical wipe** that stops half-way and holds, because the idea is a comparison ([solar_c0235](../../ref/youtube/kurzgesagt/frames/solar_c0235_split-plasma-vs-field.jpg)). A sliding slanted wedge/panel enters from a corner to change topic (diagonal slice in several sheets: `solar/sheets/s_172.jpg`, `rogue-b/sheets/s_0.jpg`, upper-left slanted strips of the frozen-Earth montage).

**3.3 Pans and pushes.** Mostly slow pushes and reveals rather than pans:
- Push-in on the gravity-well grid under the sun, with planets in orbit (solar, 0:50 to 0:56).
- Long continuous tilt/pan follows a CME bubble from the sun to Earth, with a distance bar counting (source 3:36 to 3:40; `solar/sheets/s_190.jpg`).
- Scene "wipes by parallax": a foreground layer slides across while the background lags (the rogue-b frozen-Earth horizon; [rogue-b_c008](../../ref/youtube/kurzgesagt/frames/rogue-b_c008_earth-freezing.jpg) then the zoom to horizon in `rogue-b/sheets/s_48.jpg`).

**3.4 Cutaways.** To show an interior or a process under a surface, they cut a **wedge or slice out of the sphere** and show the layers ([rogue-b_c021](../../ref/youtube/kurzgesagt/frames/rogue-b_c021_cutaway-wedge-heat-arrows.jpg): ice sheet, ocean water, ocean floor, labelled, heat arrows out the top) or a cutaway quarter of the sun ([fusion_c003](../../ref/youtube/kurzgesagt/frames/fusion_c003_sun-layers-labels.jpg), [fusion_c042](../../ref/youtube/kurzgesagt/frames/fusion_c042_sun-face-pressure-shake.jpg)). The cutaway is then zoomed to become the scene.

**3.5 Framing and composition.**
- The subject is usually dead-centre or on a clear third with large empty space for the flow direction (the CME bubble lives on the left third and Earth enters from the right edge, [solar_c127](../../ref/youtube/kurzgesagt/frames/solar_c127_cme-meets-earth-bowshock.jpg)).
- Left-to-right is always "from the source to the target" (sun to Earth) and the arrows reinforce it; time on charts also runs left to right.
- Top-down or side-on orthographic views dominate; they avoid perspective for diagrams (field lines, planet systems) and use mild isometric perspective only for the solar-system plate ([rogue-a sheet s_48](../../ref/youtube/kurzgesagt/rogue-a/sheets/s_48.jpg)).
- Wide shot to establish, close-up to explain, wide again to show the result: in the solar clip, wide Earth in its field (3:36), close-up bow shock (3:40), wide with planets again.

**3.6 Match cuts.** The field-line loops on the sun's surface, drawn as little arches, are the same drawn shape reused at several scales, so the eye reads them as the same thing. The globe with the red-hot belt in the Earth overview and the red ring of CME share a colour logic more than a shape.

---

## 4. Motion

All of this is from sheets, hence "(inferred)" on anything about curves.

**4.1 Easing.** Moves have clear start-and-stop softness (inferred from the position spacing across frames at 1.5 fps: shapes cover more distance in the middle frames than near the endpoints). The CME shell expands from a small crescent to filling the frame with decelerating growth ([solar_c127](../../ref/youtube/kurzgesagt/frames/solar_c127_cme-meets-earth-bowshock.jpg) and `solar/sheets/s_118.jpg`). Counters and bars also ease (the distance bar growing in `solar/sheets/s_190.jpg` increments without bouncing).

**4.2 Anticipation, snap, aftermath.** The snap (`solar/detail/snap.jpg`): the field loop first **stretches** for several frames (the anticipation, a slow build), then the pinch and flash happen in about three frames (about 0.4 s, fast), then the ring expands and fades over about 8 frames (slower aftermath), while the freed loop leaves at constant speed. This is a clean three-beat shape: slow build, instant release, long fade.

**4.3 Secondary motion.** Small things lag the main body: sparks and tiny arcs spit from the sun's rim around flares ([solar_c008](../../ref/youtube/kurzgesagt/frames/solar_c008_sun-plain-glow.jpg) and the `s_8` sheet, where short orange dashes appear and drift off the limb, with different phases). Tails on asteroids (rogue-a, `sheets/s_16.jpg`) trail, break into debris, and the debris curves off with its own small arc. Plasma ribbons on the sun slowly rotate and breathe in place.

**4.4 Idle motion (nothing is ever still).**
- Stars and drifting dust, parallax drift.
- Orbiting small bodies and rings of dashed segments rotating around the sun (rogue-a `sheets/s_32.jpg`, the "4.5 billion years ago" disk, dashes spinning around with different speeds per ring).
- Characters have small breathing and blink loops; in the control-room scenes the birds shift weight and a screen flickers ([solar sheet s_172](../../ref/youtube/kurzgesagt/solar/sheets/s_172.jpg)).
- Gauges and thermometers read out continuously (rogue-b thermometer, a number and a red marker both moving, [rogue-b_c059](../../ref/youtube/kurzgesagt/frames/rogue-b_c059_thermometer-gauge.jpg)).

**4.5 Particles and flows.**
- Many small dashes moving in parallel lanes = a flow (solar wind, CME front; the lanes slow near the obstacle, then curve around it).
- Round dots with a coloured border bobbing and drifting = particles at molecular scale; each has its own phase and slight speed variation (atom/plasma scene).
- Arrow-headed streams that **split and bend at an obstacle** show deflection (solar_c152).
- A flat gradient "wall of colour" slightly offset behind the dashes (red-pink for CME wind, green for proton storm) reads as a force field or a medium. Flow lines are not the only thing marking it.

**4.6 Loops.** Looped elements (orbiting dashes, aurora sparkles, drifting particles, blinking characters) are reused under different scenes. The aurora is built in stages: sparks, then shorter flames, then long curtains (`solar_c160`), i.e. a build-up from simple dots to the finished look over about 4 s.

**4.7 Comedy and personification motion** (2016 fusion video, [fusion_c042](../../ref/youtube/kurzgesagt/frames/fusion_c042_sun-face-pressure-shake.jpg)): the shake lines and colour shift read as "heat and pressure rising" at a glance. The 2020 videos use this less on the mechanism itself and more on the little frame-story characters.

---

## 5. Look

**5.1 Shape language.** Flat vector. Only a few primitives: circles (planets, particles, bubbles), rounded rectangles (tags, bars, gauges), long rounded strokes of constant width ending in round caps (field lines, plasma ribbons, wave lines), and soft blobs for clouds, smoke and nebula (smokestack, [toolate_c002](../../ref/youtube/kurzgesagt/frames/toolate_c002_smokestack-bubbles.jpg)). Almost no sharp corners except labels and star-flash marks. Shapes are not outlined in black: edges come from colour contrast, and there is often a lighter or darker **rim stripe** (the sun's yellow ring, [solar_c008](../../ref/youtube/kurzgesagt/frames/solar_c008_sun-plain-glow.jpg)).

**5.2 Palette.** One scene = one dominant hue family plus one accent, with a strong value contrast:
- Space and invisible things: deep indigo/navy backgrounds (very dark, not black), with cyan for field and violet for particles.
- Heat/energy: yellow to orange to red-magenta gradient (plasma, CME).
- Life/earth: teal/green and light blue.
- Frozen: pale blue-white against deep purple ([rogue-b_c008](../../ref/youtube/kurzgesagt/frames/rogue-b_c008_earth-freezing.jpg)).
- Warning/label accent: hot pink, bright yellow, cyan pills.
Colour is **semantic**: if red is heat in minute 1, red is heat in minute 4. The same hue pair is used for the "cause" layer and the "effect" layer (orange plasma, cyan field).
The older videos use flatter, more saturated, less nuanced palettes (the Earth overview in `earth/sheets/s_32.jpg` is pink to purple with hard red-yellow lava bands; the 2016 fusion video is mustard yellow and navy). The newer ones add much more atmospheric gradient.

**5.3 Lighting.**
- **Glow rather than shadow**: bright things have a soft radial halo (the sun; the star flash; the Earth in blue light). The halo is a stack of 2 to 3 concentric translucent circles, not a blur (see the rings around the pinch in `solar/detail/snap.jpg`).
- **Rim light** on planets: a lighter thin crescent on the lit side, a darker flat shade on the other (Earth in [solar_c127](../../ref/youtube/kurzgesagt/frames/solar_c127_cme-meets-earth-bowshock.jpg)).
- **Gradients behind**: backgrounds are linear or radial gradients 2 to 3 stops deep (indigo to purple to dark blue, [solar_c152](../../ref/youtube/kurzgesagt/frames/solar_c152_deflection-arrows.jpg), the aurora sky, which goes dark violet to cyan at the horizon).
- Shadows are mostly absent; separation comes from value difference and halos. Where a shadow exists it is a flat darker silhouette (the syringe on the cyan card in `toolate/sheets/s_48.jpg`).

**5.4 Depth.** Two to four layers with different speeds: far star dust, mid planets or particles, a near foreground element at a larger scale (a dark vignette of foreground shapes, the ice stalactites in [rogue-b sheet s_16](../../ref/youtube/kurzgesagt/rogue-b/sheets/s_16.jpg)). Depth is also made by **scale of repeated elements**: dashes or dots larger and sparser in front, smaller and denser behind.

**5.5 Texture.** Very little: a faint noise/grain on large flat surfaces (the sun's face has tiny specks, [solar_c008](../../ref/youtube/kurzgesagt/frames/solar_c008_sun-plain-glow.jpg)) and a faint brick pattern in one background. Texture is a quiet accent; it is never a photo or a bitmap fill.

**5.6 Labels and text.** Few and short:
- Pill-shaped tags with a solid colour (pink, cyan, yellow, violet) and white or dark bold text, placed next to the object, popping in at the first mention and out soon after ([solar_c0235](../../ref/youtube/kurzgesagt/frames/solar_c0235_split-plasma-vs-field.jpg), [solar_c111](../../ref/youtube/kurzgesagt/frames/solar_c111_proton-storm-label.jpg), [rogue-a_c058](../../ref/youtube/kurzgesagt/frames/rogue-a_c058_labelled-rings-planets.jpg)).
- Numbers with units on a swatch in amber/yellow ("1,000,000 LY", "9 Mio. km/h"), animating as a counter when the value changes ([rogue-b_c059](../../ref/youtube/kurzgesagt/frames/rogue-b_c059_thermometer-gauge.jpg)).
- Source credits in tiny type bottom-right (e.g. "IPCC, 2014", [toolate_c014](../../ref/youtube/kurzgesagt/frames/toolate_c014_terrarium-globe-source-tag.jpg)), present on every data shot.
- Section title cards (large display type over the previous scene, e.g. "Solar Super Storms" at 3:18).
- Older videos label more (leader lines with underlined caps in [fusion_c003](../../ref/youtube/kurzgesagt/frames/fusion_c003_sun-layers-labels.jpg), and the charts in `earth/sheets/s_64.jpg`). The modern ones are visibly lighter on text.

**5.7 How diagrams avoid looking like diagrams.**
- The "diagram" lives inside a **world**: the field lines are drawn over a glowing space, a graph sits on a coloured card, a gauge is physical.
- Diagrams get **a character or an object in them**: the globe-terrarium with a ship in it stands for the economy ([toolate_c014](../../ref/youtube/kurzgesagt/frames/toolate_c014_terrarium-globe-source-tag.jpg)), a smokestack stands for emissions ([toolate_c002](../../ref/youtube/kurzgesagt/frames/toolate_c002_smokestack-bubbles.jpg)); a plain chart draws itself with a moving dot that leads the line ([toolate_c054](../../ref/youtube/kurzgesagt/frames/toolate_c054_graph-draws-itself-metaphor.jpg)).
- Charts are drawn **live**: a leading dot, the line extends, the area fills, a dashed projection; they are never revealed as a finished image.
- The old overview video's charts (bars for water on Earth, `earth_c074`) are the "looks like a diagram" case, and they still work only because bars grow and subdivide as the narrator reads the percentages; compare [earth_c074](../../ref/youtube/kurzgesagt/frames/earth_c074_water-bars-tag.jpg) to the modern graph.

---

## 6. Sound (thin, see limits)

Measured only:
- The solar clip has **no silence** below -45 dB for >0.4 s across 245 s, so there is a continuous bed under the voice (music or ambience). Mean volume -19 dB, peak -3 dB.
- The captions mark an intro jingle for two of the videos ("[Intro music]" at 0:25 and "[Intro Jingle]" at 0:42), after the setup of the question, so the question is stated first and the music announces the "answer starts now".
- The captions do not mark any sound effects, so no other claims. In the sheets I can see where a whoosh, a sparkle or a thud would be placed (iris wipes, the pinch flash, pins arriving on the timeline), but I did not hear them.
**Gap:** someone should listen to a few seconds of the snap (source 1:52), the atom-to-plasma iris (0:44) and the timeline pins (3:18) and note whether the sound leads, lags or is on the picture, and how loud it is against the voice.

---

## 7. Script

From the timestamped captions.

**7.1 Sentence length and rhythm.** Mean about 3.9 s per caption line, mostly one clause per line. Roughly: short punchy statement, then a longer explanatory one, then a short one. Examples (solar): "The Sun, smooth and round and peaceful." / "Except when it suddenly vomits radiation and plasma in random directions." / "Remember the dynamo?" The shortest lines (1 to 2 s) are used for an aside, a payoff or a turn: "But it can get worse." (3:49), "A geomagnetic storm has begun." (4:11), "Remember the dynamo?" (4:27).

**7.2 Tone and humour.**
- Casual, a little dark, concrete: "vomits", "monsters", "borrowed time", "bad for the stock market". The jokes are short asides inside the explanation, not a separate bit.
- Understatement for catastrophe: "we would have a really bad time" and similar.
- Personification of physical things ("spoiled toddler" gravity, [rogue-a sheet s_16 and s_0](../../ref/youtube/kurzgesagt/rogue-a/sheets/s_0.jpg)).
- Humour that lands on a picture: the line's visible partner is usually a character reacting or a prop doing something (a bird flinching at the screen).

**7.3 Address.** "We" for humanity and "you" for hypotheticals ("you are attracted by an atom a million light years away", rogue-a 0:47). Rhetorical questions open sections ("How exactly do they work? How bad could they be? And can we prepare for them?", 0:19 to 0:23; "Why is that? Why is it so hard...", toolate 0:36). "Remember..." calls back.

**7.4 Numbers and terms.**
- Terms are introduced in plain words first, then named: "...like a very hot ocean... a plasma" (0:33 to 0:38); "a dynamo" (1:18) comes right after the loop has been explained.
- A term is introduced with its tag on screen at the moment it is spoken.
- Big numbers are paired with an everyday comparison or an unusual unit: "9 million km/h" with a speed arrow; "the sun makes up 99.75% of all the mass" with a counter that resolves into a full kg figure swatch in the picture ([rogue-a sheet s_32](../../ref/youtube/kurzgesagt/rogue-a/sheets/s_32.jpg)); in the older Gulf Stream script "1,000,000 nuclear power plants" is the comparison for heat. In the Earth overview, percentages are always shown as proportions of a bar, not just spoken.
- Numbers are not dropped in a row: one big number per step.

**7.5 Structure sentence by sentence.** Question, short answer, then "but" or "and" to add one qualification at a time. "While X seems Y, it's actually Z." appears often (0:33).

---

# What Primer should do

Rules for our hurricane animations (flat vector, narrated). Each ties to an observation above.

1. **Open with stakes and three questions, then say the answer starts.** Kurzgesagt spends the first ~25 s on stakes and a list of questions (solar 0:01 to 0:23), then starts. Hurricane: "A storm the size of a country, powered by warm water. How does it get its heat? Why does it spin? Why does it curve?" Then the mechanism.
2. **One idea per line, one picture state per idea.** Their hard picture changes sit on the exact start of each new sentence (solar 0:33, 0:38, 0:45, 2:52, 3:18). Time our cuts to the script's sentence starts, not to a fixed rhythm.
3. **Never hold a still frame more than about 2 to 3 seconds without something moving or a label arriving.** Even the longest shot in the clip has streaming arrows plus a label slide-in (solar_c111). Add idle motion layers to every scene.
4. **Give each invisible quantity one visual vocabulary and keep it for the whole video.** Magnetic field = thin cyan lines everywhere (solar). For us: heat = a fixed warm colour with small rising wavy arrows; wind = parallel dashes in one colour; moisture/vapour = pale rising blobs; pressure = inward white arrows. Do not change a colour's meaning mid-video.
5. **Show cause and effect as one object changing, not two pictures with an arrow.** The snap (solar 1:52) is stretch, pinch, flash, ring in one shape. For us: warm water layer visibly thins/cools under the storm; the eye is a place where the picture itself clears.
6. **Use a three-beat motion for events: slow build, near-instant release, long fade.** Stretch, 0.4 s snap, 8-frame fade (snap sheet). Use it for lightning, eyewall flare-ups and a rain band pulsing out.
7. **Anchor every scale jump with a shape-based wipe or a shrinking subject that stays in frame.** Atom to plasma was an iris wipe that doubled as the zoom (solar 0:44). Use a circular iris from a droplet to a cloud, and a cutaway disc from a cloud to the sea surface.
8. **Prefer side-by-side or wipe-in comparisons to cutting back and forth.** Plasma vs field was a vertical wipe that stopped half-way and stayed (solar_c0235). For us: "warm water vs cold water" as a held split, with the same swirl in both halves.
9. **Let the camera follow the flow.** Moves are slow pushes and one long follow of a CME across space with a counting distance bar. Follow a parcel of air from the sea surface into the storm instead of cutting.
10. **Use a cutaway wedge to show what is under or inside.** Rogue-b cut a wedge from the Earth with labelled layers and heat arrows leaving (rogue-b_c021). Cut a vertical slice through the hurricane with ocean at the bottom and the eyewall rising.
11. **Introduce a term at the moment it is spoken, with a pill tag for about 2 seconds, one or two words.** ("Plasma", "CME", "Solar Proton Storm".) For us: "Evaporation", "Latent heat", "Eyewall" in a tag that pops on the first word and leaves.
12. **Colour carries meaning: one dominant hue family plus one accent per scene.** Deep indigo night plus cyan field plus orange plasma. For us: deep teal sea, warm orange heat, pale grey-white for cloud and vapour, one pink accent for tags; wind = a fixed cool colour (say light cyan) across the video.
13. **Light with glow and rim, not shadow.** Soft concentric halos on bright things, a lighter rim on the lit side of a sphere, 2 to 3 stop gradients behind (solar_c127, solar_c152). For us: a halo on the sun, a rim on the globe, a gradient sky; no drop shadows.
14. **Give every scene two to four depth layers moving at different speeds** (far dust, mid objects, near foreground). Rain and spray in the front, cloud bands behind, a far storm wall.
15. **Draw charts live.** A leading dot, the line extends, the area fills, dashed projection (toolate_c054). For us: a sea temperature graph where the dot rides the line while the narrator says the number, and the storm-strength line follows it.
16. **Number rules: one big number per step, tied to a comparison or a picture.** "9 Mio. km/h" next to a speed arrow, a distance bar that counts. For us: "26.5 degrees C" next to a thermometer that fills; "a hurricane releases energy like 10 000 bombs" only if the picture shows that comparison.
17. **Recap by reuse, not by summary.** Dynamo taught at 1:18 and called back at 4:27. Teach the "spin-up" loop once (air in, warms, rises, more air in) and reuse the identical picture when explaining why the storm weakens over land ("remember the loop? take away the warm water").
18. **Use an everyday analogy spoken and a stand-in object or character to act it out, but draw the mechanism itself without characters.** Birds roll balls (gravity) but the field lines are drawn clean. For us: a spinning ice skater for the spin (angular momentum) with the actual air shown as dashed streams over the ocean.
19. **Make idle motion standard: drifting particles, rotating dashed rings, pulsing glows, a breathing gauge, blinking character.** Nothing sits dead still. Build a small library of loops and put two under every scene.
20. **Keep text small and rare.** One or two words per tag, a source line in tiny type on any data shot, and a title card between sections. No bullet lists on screen.
21. **Make the diagram live inside a world.** Field lines over glowing space; gauges as objects; the economy as a terrarium. For us: the temperature profile as a literal thermometer standing in the sea; the Coriolis idea as a ball rolling across a rotating disc before moving to the globe.
22. **Reveal in stages, building from simple to final.** Aurora: sparks, then flames, then curtains (solar_c160). Build the storm the same way: scattered cloud puffs, then a swirl, then bands, then an eye.
23. **Right-to-left or left-to-right consistency.** The flow of cause runs left to right (source to target). For us, with the heat engine: warm sea on the left or bottom, storm on the right or up; keep "what powers it" on one side every time.
24. **Write short punchy lines with turns.** Mix a 1 to 2 s payoff ("But it can get worse.") with a 5 s explanatory line, address the viewer with "you" in hypotheticals, and use one understated joke per section. Keep scripts one clause per line so the picture can follow.
25. **Mark the question, then the music.** Intro music comes after the questions (solar 0:25), not before. If we have a short musical sting, place it after the opening questions.

## Three example re-directions (our topic)

**A. Evaporation (how the sea gives the storm its heat).**
- Instead of: a static cross-section of the ocean with an arrow labelled "evaporation" pointing up and a caption "warm water evaporates".
- Do: Start on a still, slightly bored, warm sea surface (flat teal) while the narrator says "the sea is a battery of heat". A thermometer tag grows beside it, 26.5 degrees, the first big number. Then the camera pushes into the surface in a circular iris to a molecule-scale layer where a few water dots start to bob faster (idle particle bobbing). One dot at the surface gets a small glowing halo, tears away and rises as a pale vapour blob; as it leaves it takes a small red wavy arrow (heat) with it, and the water layer behind it visibly cools one shade (cause and effect in one picture). Tag "Evaporation" pops on the word, and the vapour dots start to stream upward in parallel lanes. Wipe back out to the sea with a column of rising pale blobs, and a distance/height bar counts the height as it climbs. Hold the pace at one beat per clause.

**B. Why storms spin (Coriolis and inflow).**
- Instead of: a top-down diagram with curved arrows and the word "Coriolis".
- Do: First an everyday analogy: a ball is rolled straight across a spinning roundabout and the picture shows its path bending when seen from the ride (a stand-in object acts it out). Then a vertical wipe splits the screen: left half "the ground sees a straight path", right half "the spinning ground sees a curved path" (comparison by wipe, held). Then expand from the roundabout to the globe with a circular iris and show dashed wind lanes streaming toward a low-pressure centre; each lane bends right (northern hemisphere) as it goes in. Then show the loop being built in stages: lanes, then curved lanes, then a swirl, then the swirl locks into a spiral that keeps turning in the idle layer. The "Coriolis" tag appears only after the viewer has seen the bending.

**C. Why storms curve (steering and the westerlies).**
- Instead of: a map with a static track line and an arrow.
- Do: Treat the storm as a leaf in a river. Open on a wide shot of a slowly rotating globe with two large cyan flow bands, one flowing east-to-west at low latitudes (labelled "Trade winds") and one west-to-east at high latitudes ("Westerlies"), each drawn as dashed lanes in their own fixed direction. The storm, a small spiral glowing with a halo, enters from the right edge, rides the lower band to the left (anticipation: slow drift), then in a slow push-in it reaches the gap, slows, and visibly turns its heading by following the curved lanes into the upper band, then accelerates away to the right as it is caught by the westerlies. The path is drawn live behind it as a thin dotted trail that grows. Narrator's line "like a leaf crossing from one current to another" lands exactly as the storm turns. No map outline until after the move, so it does not look like a diagram.

---

## Appendix: files

- Clips and sheets (local only): `ref/youtube/kurzgesagt/{solar,rogue-a,rogue-b,fusion,toolate,earth}/` with `sheets/` subfolders; extra 8 fps detail sheets `solar/detail/plasma_pop.jpg` and `solar/detail/snap.jpg`.
- 30 key frames: `ref/youtube/kurzgesagt/frames/` (links above).
- Timestamped captions: `ref/youtube/kurzgesagt/tx/*.ts.txt`.
- Source records with licence notes (rights reserved, reference only, do not commit or publish): `SOURCE.txt` in each clip folder.
