# Kurzgesagt study, round 2: measured motion, measured sound, and how they draw air, water and heat

Second craft study for Primer's narrated flat-vector science animations (first topic: hurricanes). It adds to and corrects [the first study](kurzgesagt-study.md). Craft only: none of their characters, art, music or exact compositions are to be copied. Every number below was measured from the clips, not guessed. Where a measurement failed or was rough, it says so.

## 0. Sources, method, limits

Five recent official uploads (all current style, 2024 to 2026), chosen for physical mechanisms with air, water, heat, planets and pressure. Downloaded as 720p, **60 fps** sections with audio into `ref/youtube/kurzgesagt2/` (git-ignored, local only, rights reserved: reference only).

| Key | Title | Uploaded | URL | Sections studied (source time) | Clip offset |
|---|---|---|---|---|---|
| trees | Trees Are So Weird | 2025-11-25 | https://www.youtube.com/watch?v=ZSch_NgZpQs | 3:10 to 5:45 (xylem, water "rope", evaporation from leaves, suction and pressure) | +3:10 |
| nuke | What Happens AFTER Nuclear War? | 2024-02-20 | https://www.youtube.com/watch?v=LrIRuqr_Ozg | 0:30 to 4:10 (fire heats air, inflow, updraft, tropopause, soot spreads, less sunlight, less evaporation) | +0:30 |
| dino | How The Dinosaurs Actually Died | 2024-03-26 | https://www.youtube.com/watch?v=pjoQdz0nxf4 | 3:58 to 6:15 (oceans warm 2 °C, heat from the interior, hypercanes, stratosphere, ozone) | +3:58 |
| hestia | Why Earth Sucks Compared to the Planet Hestia | 2026-05-26 | https://www.youtube.com/watch?v=8qQW4LTWgtc | 2:28 to 3:46 (core, magnetic field, winds bending round it, plates), 7:58 to 8:32 (thick atmosphere, pressure, evaporation and rain), 10:00 to 10:56 (shallow oceans heat faster, more storms) | +2:28 / +7:58 / +10:00 |
| aster | Can Humanity Stop A Planet-Killing Asteroid? | 2025-09-16 | https://www.youtube.com/watch?v=dKm7T13X7n4 | 2:05 to 3:07 (speed, curved path over the globe), 4:20 to 6:25 (frame of reference: "from the asteroid's perspective", impact) | +2:05 / +4:20 |

Folders: `trees/`, `nuke/`, `dino/`, `hestia-a/`, `hestia-b/`, `hestia-c/`, `aster-a/`, `aster-b/`, each with the clip, `SOURCE.txt`, `sheets/` (1 fps contact sheets with burnt-in clip time) and some `detail/` sheets (7.5 to 60 fps). Also: `tx/` (timestamped captions), `audio/` (wav and 100 ms loudness logs), `frames/` (40 key frames), `frames_index.jpg` (all 40 on one sheet), `plots/` (measurement plots and spectrograms), `scripts/` (the measurement code).

**Times.** "Clip time" is seconds into the downloaded section (frame and plot names use it, e.g. `trees_t74.5`); "source" is mm:ss in the full video. Source = clip time + the offset in the table.

**How motion was measured.** Frames decoded at 60 fps (some at 30 fps) into arrays; a feature tracked per frame by colour mask (label pill, sign, circle ring, arrow tips), by circle fitting (magnifier ring), or by phase correlation (camera tilt). Each track was turned into a 0-to-1 progress curve; start and end are where speed passes 3% of its peak; then a CSS cubic-bezier was fitted by grid search and compared with the standard named easings. Plots show the measured points, the fitted curve and the closest named curve.

**How sound was measured.** Audio split into mid ((L+R)/2: voice plus anything centred) and side ((L−R)/2: only stereo content, which here is music and effects; the voice is mono-centred). Loudness by ffmpeg ebur128 (momentary 400 ms, short-term 3 s, integrated); 50 ms RMS tracks; effect onsets by spectral flux in the side channel above 1.5 kHz; spectrograms of the side channel around visual events. Limits: (1) nobody listened, so effects are described by shape (band, length, attack, decay), not by name; (2) YouTube's AAC joint stereo zeroes parts of the side spectrum (the black patches in the spectrograms), so side-channel levels are a **lower bound** on music and effect level; (3) the voice cannot be fully removed from the mid channel, so "bed under the voice" is estimated two ways (side level during speech, and the mid floor in the breath gap at each sentence end).

**Failed or partial measurements.** The callout dot's tiny overshoot could not be isolated cleanly (other white/green pixels in the mask). The hypercane's spin could not be measured as a rotation because **there is no rotation to measure** (see 1.8), which is itself a finding.

---

## 1. Motion at real rates (measured)

Summary table. Durations are from 3% to 97% of peak speed. Plots are in `ref/youtube/kurzgesagt2/plots/`.

| # | Move | Where (clip / source) | Duration | Curve (fitted cubic-bezier; closest named) | Peak speed at | Overshoot |
|---|---|---|---|---|---|---|
| 1 | Callout leader line draws out from a dot | trees 17.83 / 3:27.8 | 467 ms | ≈ linear, slight speed-up at the end | 93% (end) | 0 |
| 2 | Magnifier circle opens at the line's end | trees 18.28 / 3:28.3 | 450 ms (to 98%), settled by 520 ms | (0.15, 0, 0.2, 0.9); css `ease` / easeOutQuad | 15% | 0 |
| 3 | Label pill unrolls from its leader line, text masked inside | trees 74.55 / 4:24.6 | 683 ms | easeOutCubic (0.33, 1, 0.68, 1) | 0% (launches at full speed) | 0.5% |
| 4 | Camera tilt from roots to crown | trees 85.77 / 4:35.8 | 5,533 ms, 1,396 px (1.94 screen heights) | (0.30, 0, 0.60, 0.90); easeInOutSine | 46% | 0 |
| 5 | Split-screen panel slides in to exactly half | nuke 76.95 / 1:47.0 | 800 ms (settled at 900) | (0.70, 0.10, 0.30, 0.90); easeInOutCubic | 50% (3.2× average speed) | 0 |
| 6 | Zoom through the magnifier into the cells (radius 144 to 364 px and beyond, measured in log scale) | trees 19.67 / 3:29.7 | ≥ 783 ms until the ring leaves frame | (0.75, 0.10, 0.35, 0.90); easeInOutCubic | 55% | 0 |
| 7 | Sign on a pole rises out of the sea | dino 17.40 / 4:15.4 | 500 ms | **linear**: exactly 8 px/frame at 60 fps (480 px/s) | constant | 0 |
| 8 | Sign board pops open on top of the pole | dino 17.90 / 4:15.9 | 150 ms to peak, settled by 350 ms | pop with spring | peak at 150 ms | **+13%** width (187 vs 165 px), top edge 6 px past rest |
| 9 | Sea colour changes as it warms 2 °C | dino 16.8 / 4:14.8 | ~1,200 ms to peak, ~900 ms settle | ease-in-out | | red channel **+13%** past rest (RGB 6,74,190 → peak 115,41,243 → rest 101,48,228) |
| 10 | Updraft arrows grow inside the smoke column | nuke 62.3 / 1:32.3 | 9,200 ms | **linear** (constant ~25 px/s of 720) | constant | 0 |
| 11 | Inflow arrows draw on along the ground and curve up | nuke 56.7 / 1:26.7 | 2.0 s **loop**, each arrow draws over ~1.6 s, second arrow staggered | head eases out (per 100 ms: 10, 12, 10, 8, 9, 9, 6, 8, 6, 4 … px) | start | 0 |
| 12 | Soot spreads over the world map until land is hidden | nuke 113.7 / 2:23.7 | 7,900 ms | easeOutCubic | 18% | (measure noisy) |

Plots: [circle](../../ref/youtube/kurzgesagt2/plots/trees_magnifier_circle.png), [line](../../ref/youtube/kurzgesagt2/plots/trees_magnifier_line.png), [pill](../../ref/youtube/kurzgesagt2/plots/trees_label_pill_width.png), [tilt](../../ref/youtube/kurzgesagt2/plots/trees_tilt_roots_to_crown.png), [split](../../ref/youtube/kurzgesagt2/plots/nuke_split_panel_slide_in.png), [zoom](../../ref/youtube/kurzgesagt2/plots/trees_zoom_into_magnifier_logscale.png), [sign and sea colour](../../ref/youtube/kurzgesagt2/plots/dino_sign_and_sea_colour.png), [updraft](../../ref/youtube/kurzgesagt2/plots/nuke_updraft_linear.png), [soot](../../ref/youtube/kurzgesagt2/plots/nuke_soot_covers_land.png).

What the numbers say (these are the patterns, not one-offs):

**1.1 Four motion families, each with its own curve.**
- **Diagram furniture arriving** (callout circles, label pills): ease-out, peak speed at the very start, 450 to 700 ms, **no overshoot** (0% and 0.5%). Diagram parts are calm and precise.
- **Physical props arriving** (a sign on a pole, an object popping in): a fast pop with a **spring overshoot of about 13%** reached in 150 ms, settled in a further 200 ms. Things in the world bounce; diagram parts don't.
- **Camera and transitions**: symmetric ease-in-out. Long camera moves use the gentle sine shape (peak 1.58× average, i.e. a long cruise); short transitions (split panel, zoom-through) use the sharp cubic shape (peak ~3× average, long soft tails, a fast middle). A transition is a "whip" with soft ends.
- **Processes** (arrows growing in an updraft, a pole rising, flows): **linear, constant speed**, or a **seamless loop** (the inflow arrows repeat exactly every 2.0 s: the same pixel positions at 57.1 and 59.1, at 58.3 and 60.3). A process has no ease because it is ongoing.

**1.2 Moves are chained so speed hands over.** The callout (trees 3:27.7, [frame](../../ref/youtube/kurzgesagt2/frames/trees_t18.6_magnifier-callout.jpg), detail sheet `trees/detail/magnifier.jpg`): the dot pops (t = 0), the leader line draws at constant speed and slightly speeds up (0.12 to 0.58 s), and **the circle opens at the line's end at full speed and eases out** (0.58 to 1.05 s). Linear-into-ease-out reads as one throw: the line "throws" the circle. Total from dot to stable callout: about 1.1 s. The circle then **holds 0.95 s** before the zoom-through starts (19.67): about one second to look before going in.

**1.3 Labels are built, not faded.** "Water Molecule" (trees 4:24, [frame](../../ref/youtube/kurzgesagt2/frames/trees_t75.6_water-molecule-label.jpg), sheet `trees/detail/label_water.jpg`): anchor dot pops on the molecule (t = 0), a bent leader line draws in ~330 ms, then the pill unrolls sideways out of the line's end over 683 ms (ease-out cubic) with the text sliding into view inside it as if masked. Readable about 1.1 s after the dot appears. The dot lands with the start of the line ("Water molecules are…", 4:24.1), the pill unrolls while the noun itself is being spoken, and the term is readable by the end of it.

**1.4 A camera move is one sentence long.** The roots-to-crown tilt (4:35.8 to 4:41.3) covers the sentence "In trees this rope starts in the roots and ends in the leaves that bathe in the warmth from the sun" (4:35.6 to 4:41.9): it starts 0.2 s after the sentence and stops 0.5 s before it ends, so the picture arrives at "the sun" just as the words do. Easing is sine in-out; peak speed 400 px/s at 1280 width (0.55 screen heights per second). A 0.4 s horizontal whip (185 px) then carries straight into the leaf shot for the next sentence.

**1.5 Transitions: sharp in-out, about 0.8 s, to an exact stop.** The split panel (nuke 1:47) slides from the right edge to exactly x = 640 of 1280 (half) in 800 ms with an in-out cubic curve, then holds. It starts ~200 ms before the sentence that needs it ("But a pyrocumulonimbus cloud can reach altitudes well above…"). The zoom into the magnifier is the same family: in-out cubic, ~0.8 s, scale growing 2.5× in view and continuing off-frame while the cut to the cells hides the end.

**1.6 Physical cause and effect gets a small overshoot too.** When the sea warms (dino 4:14.8, [before](../../ref/youtube/kurzgesagt2/frames/dino_t15.0_sea-before-warming.jpg), [after](../../ref/youtube/kurzgesagt2/frames/dino_t18.6_sea-violet-plus2C-sign.jpg)), the colour does not just cross-fade: it shifts blue to violet over ~1.2 s, goes ~13% past its final hue and settles over the next ~0.9 s. Then the "+2 °C" sign rises on a linear pole (500 ms) and the board springs open (+13%). The narrator says "oceans getting at least 2 °C hotter" at 4:14.6; the colour starts with the sentence, the sign arrives on the number.

**1.7 Ongoing flows loop; accumulations ease out over many seconds.** Inflow arrows (nuke 1:26.7, [frame](../../ref/youtube/kurzgesagt2/frames/nuke_t57.9_inflow-dashed-arrows.jpg)) are dashed, rounded, blue, drawn on from both screen edges along the ground, curving upward into the base of the fire, on a 2.0 s loop that keeps running while the narrator moves on. The updraft arrows (1:32 to 1:41, [frame](../../ref/youtube/kurzgesagt2/frames/nuke_t66.0_updraft-arrows-tropopause.jpg)) grow at constant speed for 9 s. Soot covering the map (2:23.7, [frame](../../ref/youtube/kurzgesagt2/frames/nuke_t118.0_world-map-soot-spread.jpg)) is a ~8 s ease-out: most of the land disappears in the first 2.5 s, then it creeps.

**1.8 Spin is shown by streaks, not by turning the cloud.** The hypercane (dino 5:39.6 to 5:48, [assembling](../../ref/youtube/kurzgesagt2/frames/dino_t102.6_hypercane-ring-assembling.jpg), [with arcs and tag](../../ref/youtube/kurzgesagt2/frames/dino_t106.9_hypercane-speed-arcs-tag.jpg), sheets `dino/detail/hypercane_form.jpg`, `dino/detail/hypercane_spin.jpg`): scattered puffs fly in along curved paths and **assemble into a ring with a hole in the middle** over ~2.5 s while the camera tilts up off the ocean. After that, angular correlation of the cloud ring between frames gives **0°/s** and the mean frame-to-frame change inside the cloud is ~1 grey level of 255: the cloud body stays still and only boils softly. Rotation is carried by **thin translucent arc streaks** that appear around the ring (at 5:44.3) and a pink speed tag "1,000 km/h". Inside the storm (6:05, [frame](../../ref/youtube/kurzgesagt2/frames/dino_t128.5_inside-spiral-debris.jpg)) the spiral is concentric bands with dashed highlights and debris (a dinosaur, leaves, rocks) circling. Takeaway: a big rotating mass is drawn as a stable shape plus fast small moving marks around it; this keeps it readable and avoids a spinning blob.

**1.9 Idle motion level, measured.** Frame-to-frame change over 0.4 s (mean absolute difference at 160×90) is below 1.5 grey levels in only 11% to 25% of moments per clip; long "holds" exist but are short: median 1.45 s, 90th percentile 3.3 s, longest 6.9 s (Hestia's ocean depth chart, [frame](../../ref/youtube/kurzgesagt2/frames/hestia-c_t10.5_depth-chart.jpg), where labels arrive one at a time).

---

## 2. Sound (measured, not heard)

Loudness plots: [trees 60 to 100 s](../../ref/youtube/kurzgesagt2/plots/loudness_trees_60-100.png), [dino 0 to 30 s](../../ref/youtube/kurzgesagt2/plots/loudness_dino_0-30.png). Spectrograms: `plots/spec_*.png`.

**2.1 Overall level is flat as a board.** Integrated loudness −15.3 to −16.6 LUFS across all eight sections; loudness range (LRA) only 1.8 to 3.6 LU. Short-term (3 s) loudness sits at −16.5 LUFS with the 5th to 95th percentile inside about ±1.5 LU. Momentary (400 ms) loudness dips to about −25 LUFS (5th percentile) in breath gaps. Lowest momentary value anywhere: −30 to −37 LUFS (one −52). **There is never silence.**

**2.2 Voice versus bed.** Mean over the eight sections:
- voice, 50 ms RMS in the mid channel: peaks (90th percentile) **−15.4 dBFS**, median **−20.9 dBFS**;
- floor in the breath gap at each sentence end (lowest 150 ms within ±350 ms of the end; 98 gaps): **−31.8 dBFS**, i.e. **16.4 dB under voice peaks**;
- side channel (music and effects only) during speech: **−37.8 dBFS**, i.e. **17 dB under the voice median** (a lower bound, see limits).
So the music bed sits roughly **15 to 17 dB under the voice** and is never ducked to nothing.

**2.3 Title cards hold the same loudness.** When the narrator reads a section title over a card ("A Conveyor Belt of Death", "Fire Causes Winter", "Cosmic Bullets"), the music rises so that short-term loudness stays the same (title card medians −15.9 to −18.1 LUFS against −16.5 in speech). In the "Cosmic Bullets" card (aster 4:21) the side channel jumps 12.5 dB at the flash. Sections are marked by a music swell, not by a level change.

**2.4 Cuts are placed in the voice, not on the music.**
- 69% of hard cuts fall in a voice pause (mid level below −30 dBFS within ±150 ms), against 30% for random times.
- 60% of hard cuts fall within ±300 ms of a caption line start (13% for random times); median offset **80 ms before the line starts**. The picture changes a breath before the new sentence.
- Cuts are **not** punctuated with an effect: only 24% of cuts have a side-channel onset within ±100 ms, which is no more than random times (30%).

**2.5 Effects hit events inside the shot.** Measured shapes (side channel, so these are lower-bound levels):

| Effect type | Example (clip / source) | Shape | Timing to picture | Peak level |
|---|---|---|---|---|
| Tick / pop | sign pole starts, sign board pops (dino 17.4 and 17.9 / 4:15.4 and 4:15.9), magnifier circle (trees 18.28) | broadband click, 4 to 11 kHz, **20 to 40 ms** long, 10 dB rise in ~23 ms, gone within ~60 ms | **20 to 80 ms before** the keyframe (dino: −80 ms and −20 ms); on the magnifier it lands at +330 ms, when the circle has reached ~90% size, i.e. on arrival rather than on start | about −31 dBFS (side) |
| Whoosh (transition) | split panel (nuke 76.95 / 1:47), whip to leaf (trees 91.5 / 4:41.5), zoom-through (trees 19.67 / 3:29.7) | broadband noise swell 0 to 11 kHz, **600 to 900 ms**, rising over 250 to 650 ms | starts with or a little before the move; **peak at or just after the move's peak speed** (split: peak sound +450 ms, peak speed +400 ms); stops abruptly when the next shot settles | −28 to −32 dBFS (side) |
| Sustained swell (process starts) | updraft arrows appear (nuke 1:32), soot plume | slow broadband rise over ~1 s, decay ~0.4 s | rise begins ~350 ms before the arrows | about −28 dBFS (side) |
| Crunch | car crushed by pressure (trees 125.9 / 5:15.9) | two noise bursts 2 to 11 kHz, ~150 ms each, 0.9 s apart | first burst leads the visual change by ~150 to 250 ms | about −32 dBFS (side) |

Effect peaks therefore sit about **13 to 17 dB under the voice peaks** and around the bed level plus 5 to 10 dB. Roughly half of the measured effects land in a voice pause (mid around −22 to −29 dBFS at the effect's peak), the rest under words.

---

## 3. How they explain air, water and heat

**3.1 Convection is told as a chain, one picture per link.** Nuke 1:15 to 2:52 is the clearest "why" chain in the set, and it is exactly the hurricane engine with a different heat source:
1. 1:15 "The fire … heats up so much air that it creates its own micro climate and wind system": city on fire, flat side view, small; smoke starts ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t50.5_fire-smoke-begins.jpg)).
2. 1:21 "Hot air and hot smoke rise": the smoke column grows as stacked violet puffs (smoke is violet-indigo, never grey).
3. 1:26.6 "pulling in fresh air from the surroundings": **dashed blue arrows** enter from both screen edges along the ground and curve up into the fire, looping every 2 s ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t57.9_inflow-dashed-arrows.jpg)).
4. 1:32.7 "This creates an updraft": camera pulls back; two **yellow arrows** grow upward inside the column at constant speed; a thin dashed cyan line labelled "Tropopause (~15 km)" is already there ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t66.0_updraft-arrows-tropopause.jpg)).
5. 1:41.6 "Under normal conditions, the soot … is quickly washed out by rain": a small fire, a grey rain cloud, slanted rain lines ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t75.0_normal-fire-rain-out.jpg)).
6. 1:47 "But a pyrocumulonimbus cloud can reach altitudes well above…": the split slides in; normal case left, big case right, same scale, same tropopause line ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t79.0_split-normal-vs-pyrocb.jpg)).
7. 1:54 "there is simply no weather to remove soot": a 3D view; soot puffs leave the cloud top ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t85.0_soot-cloud-3d.jpg)).
8. 2:24 "the soot begins to blanket the earth": flat world map, soot spreads east (the 8 s ease-out) ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t118.0_world-map-soot-spread.jpg)).
9. 2:38 "a lot less sunlight gets through": the same farm field stays in frame while the sun dims and the crop loses its colour (no cut, the light is the change).
10. 3:12 "the time of the year": the same landscape is shown in autumn colours with rain ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t163.5_autumn-colour-shift.jpg)), then winter; 3:25 "only last as long as the soot remains": a side view of the sky with tags "1 Years … 10 Years" as the soot layer thins above the tropopause line ([frame](../../ref/youtube/kurzgesagt2/frames/nuke_t176.0_stratosphere-years-tags.jpg)).
11. 3:44 "our seasons are suddenly all wrong. Winters are much longer": four season panels in a row; the winter panel widens and pushes the others narrower (a proportion shown as panel widths, sheet `nuke/sheets/s_07.jpg`).
12. 3:49 "less evaporation over the oceans, which means less rain": named in words, drawn as a dried-up river bed.

The physical links (1 to 6) are all **side views** with the ground at the bottom and "up" meaning altitude; the altitude line (tropopause) is planted early, labelled small, and becomes important only later. The global consequences (7 onward) switch to 3D, map and landscape views.

**3.2 Heat.**
- Heat flowing up through rock: a regular field of small **white upward triangles** on red, with branching yellow magma veins, and thin wavy lines rising in the air above (dino 5:36, [frame](../../ref/youtube/kurzgesagt2/frames/dino_t98.5_heat-rising-through-crust.jpg)). Heat is "many small identical arrows in one direction", density = intensity.
- Heat as a temperature change: colour shift of the whole medium (sea blue to violet) plus a number sign "+2 °C" on a pole (1.6). Warm water is **not** painted red; the shift is toward violet, and the number carries the meaning.
- Heat source glow: hot things are yellow-white centres with orange-red rims and layered halos (core cutaway, Hestia 3:05 to 3:09, [frame](../../ref/youtube/kurzgesagt2/frames/hestia-a_t40.5_core-cutaway.jpg): the planet is sliced by a moving edge that reveals concentric layers, then the core is labelled).
- Temperature words become seasons: summer greens to autumn oranges to winter violet-white, in the same landscape.

**3.3 Water and evaporation.**
- Water molecules: glossy cyan spheres in a deep blue field; cohesion drawn as a **yellow-green chain** threading molecules together (trees 4:28 to 4:35, [frame](../../ref/youtube/kurzgesagt2/frames/trees_t83.5_molecule-rope-in-tubes.jpg)), matching the spoken "rope" analogy.
- Evaporation: the camera follows the water up the tree (1.4), whips to a sunlit leaf, then dives to the leaf surface where stomata **exhale pale cyan puffs** ([stoma](../../ref/youtube/kurzgesagt2/frames/trees_t101.0_stoma-vapour-puffs.jpg), [mist](../../ref/youtube/kurzgesagt2/frames/trees_t106.0_transpiration-mist-leaf.jpg)); fine diagonal light streaks give the "invisible mist". Vapour is soft, round, translucent and paler than the liquid.
- Rain: thin slanted lines from a darker cloud (nuke 1:41, Hestia 8:24 where rain falls on a fire to show "evaporation produces so much rain that wildfires never get powerful", [frame](../../ref/youtube/kurzgesagt2/frames/hestia-b_t28.0_rain-on-fire.jpg)).
- Ocean heat and storms: "shallow oceans … heat and cool faster, which creates stronger seasons and more storms" (Hestia 10:46): the camera **rises from under the water, through the surface, into a sky that darkens with storm clouds** in one continuous move ([frame](../../ref/youtube/kurzgesagt2/frames/hestia-c_t51.0_rise-from-sea-to-storm.jpg)). Cause below, effect above, joined by the camera.

**3.4 Pressure.**
- Crushing pressure: a car in a dark radial vignette crumples while **green arrows point inward from all sides** (trees 5:15 to 5:18, [frame](../../ref/youtube/kurzgesagt2/frames/trees_t127.5_pressure-crush-arrows.jpg)).
- Air pressure pushing: a row of **orange up-arrows** in a framed water column with a "10 m" height mark and an "Air Pressure" pill ([frame](../../ref/youtube/kurzgesagt2/frames/trees_t137.5_air-pressure-arrows-water-column.jpg)); when suction wins, the water **boils** (bubbles appear in the column, [frame](../../ref/youtube/kurzgesagt2/frames/trees_t139.5_boiling-under-suction.jpg)).
- Air density and pressure as **dot density**: Earth's sky with sparse dots vs Hestia's with dense dots, in a held vertical split (Hestia 8:04, [frame](../../ref/youtube/kurzgesagt2/frames/hestia-b_t9.0_air-density-dots-split.jpg)), then two round gauges "1 Bar" and "1.4 Bar" ([frame](../../ref/youtube/kurzgesagt2/frames/hestia-b_t13.0_pressure-gauges-split.jpg)), then O₂/CO₂ bars.

**3.5 Flows around obstacles and paths.**
- Stellar wind: many parallel thin orange lines bending around a blue magnetic bubble (Hestia 2:58, [frame](../../ref/youtube/kurzgesagt2/frames/hestia-a_t30.5_wind-lines-bend-around-field.jpg)). Flow = a field of parallel lines that deform smoothly round the obstacle.
- A path over the globe: a cyan arc drawn live from one location pin to another (aster 2:24, "cross the Atlantic in 5 minutes", [frame](../../ref/youtube/kurzgesagt2/frames/aster-a_t20.5_curved-trajectory-pins.jpg)). Distance: a dashed line with a number ("~2,000,000 km", [frame](../../ref/youtube/kurzgesagt2/frames/aster-b_t55.5_distance-line-km-label.jpg)). Speed: a gauge icon whose number counts up (37,000 → 68,000 → 70,000 km/h, [frame](../../ref/youtube/kurzgesagt2/frames/aster-a_t17.0_speed-gauge-counter.jpg)).
- **Frame of reference** (aster 4:38.7 to 4:46, "From the perspective of the asteroid, you wouldn't see a few tiny bullets sitting still. You'd see them rushing at you"): the camera **rides on the asteroid**, its rock filling a corner, while speed lines stream past ([frame](../../ref/youtube/kurzgesagt2/frames/aster-b_t25.5_rider-perspective-speed-lines.jpg)). The same event, shown from the moving body. This is the device the Coriolis explanation needs.

**3.6 Comparisons are held splits.** Split screens appear in four of five videos: normal fire vs firestorm cloud; hypercane vs "Category 5 Hurricane" ([frame](../../ref/youtube/kurzgesagt2/frames/dino_t110.5_split-hypercane-vs-cat5.jpg)); Earth vs Hestia atmosphere; Hestia vs Mars radiation. Same scale, same horizon, one heading tag across the top that stays the whole time (the "Atmosphere" tag holds ~10 s while the contents change underneath).

**3.7 Vertical structure as a column.** The atmosphere is a cut-out **column** (an isometric hex prism) with layers (molten interior at the bottom, ocean, air, cloud deck on top) and a bracket label "Stratosphere ~15 km to ~50 km" that arrives when the word is spoken (dino 5:52 to 5:58, [frame](../../ref/youtube/kurzgesagt2/frames/dino_t117.0_atmosphere-column-stratosphere.jpg)); the ozone layer is then a separate slab in the same column with holes punched in it, and green arrows (UV) pass through the holes.

**3.8 Colour codes (as hues, not their exact palette).**
- Hot: white-yellow core → orange → red → magenta rim. Fire and lava always this ramp.
- Heat flow: white or yellow arrows; never blue.
- Air flowing in: medium blue dashed arrows. Air rising: yellow arrows inside the column.
- Water: cyan to deep blue; molecules cyan with white highlights; vapour paler cyan, translucent.
- Smoke/soot: violet to indigo, opaque, puffy. Storm cloud: lavender-white puffs with violet shading (not grey).
- Cold / less sun: desaturated violet-blue, white snow.
- Warmed sea: blue shifted toward violet, plus a red-pink number sign.
- Labels: one saturated pill colour per video for terms (purple in trees, magenta-pink in dino, teal in Hestia), white bold text.

---

## 4. Layout and depth for a tall phone screen

**Measured:** across 856 frames (1 per second, all clips), a **centred portrait stripe** (the width a 9:19.5 screen would keep if you cropped a 16:9 frame at full height: 26% of the width) holds a median of **31%** of the frame's edge detail (25th to 75th: 25% to 40%); only **13%** of frames keep half their detail. Even the best-placed stripe keeps a median of 41%. The best stripe's centre lies anywhere from 27% to 82% across. Median **43%** of each frame is flat background (no edges in a 10×10 block at 320×180). The vertical centre of detail is at 51% of height (10th to 90th: 42% to 64%).

So their frames spread meaning across the width: **cropping will not work; Primer has to recompose.** But many explanatory set-ups are already vertical and translate directly:
- side views with altitude (updraft column with tropopause line, water column with 10 m mark, the depth chart, the atmosphere column with its stratosphere bracket);
- the tilt from roots to crown (two screen heights of travel in one sentence);
- the camera rising from under the sea into the sky.

Rules that follow for 9:19.5:
1. **Vertical processes are the natural portrait shot.** Put the ground or sea at the bottom 20 to 25% of the screen and let height mean altitude.
2. **Left/right splits become top/bottom splits.** Keep the "same scale, same horizon" rule; with a horizontal divider each half is roughly 9:9.75, close to square, which suits one subject each. The heading tag sits on the divider.
3. **Labels move from beside to above or below**, joined by a short bent leader line (their leaders bend once, [frame](../../ref/youtube/kurzgesagt2/frames/trees_t75.6_water-molecule-label.jpg)). Keep pills inside the side gutters, and do not stack more than three pills.
4. **Keep the subject's centre at 42 to 64% of the height** (their measured range), and leave **40 to 45% of the screen as flat background**, which on a tall screen means generous air above and below the subject, not at the sides.
5. **Horizontal flows** (trade winds, a storm track) need a top-down or map view where the flow runs along the long axis, or a globe that fills the width with the flow drawn round its curve. Never shrink a wide shot to fit; tilt or pan instead.

---

## 5. Pacing numbers

- **Speech rate:** 161 to 172 words per minute (mean ~166).
- **Sentence length:** median **5.5 s**, mean 6.3 s (10th to 90th: 2.4 to 11.4 s), median 12 to 18 words. 13% of sentences are under 2.5 s (the punches: "And then they die.", "Today nuclear winter begins.", "Sad Boom!"), 43% are over 6 s. The asteroid video is the snappiest (median 4.1 s per sentence).
- **Hard cuts:** median shot **7.5 s**, mean 10.5 s (10th: 3.0, 25th: 4.9, 75th: 13.5, 90th: 23 s; range 1.5 to 45.6 s). About one hard cut per 1.4 sentences.
- **Something new appears** (a peak in picture change over 0.4 s, at least 1 s apart; this counts cuts, transitions, pops and bigger moves): one every **2.4 s** (trees, asteroid) to **3.5 to 4.3 s** (nuke, dino, Hestia); overall ~3.1 s, i.e. about **two picture events per sentence**.
- **Holds** (no significant change): median 1.45 s, 90th percentile 3.3 s, maximum 6.9 s (1.9).
- **Labels:** about 1.1 to 1.2 s to build (dot, leader, pill), then on screen 2.5 to 4 s; heading tags over a comparison stay as long as the comparison (~10 s).
- **Timing of a picture against its words:** cuts ~80 ms before the line; label building while its noun is spoken (readable 1.1 to 1.5 s into the line); sign on the number; split ~200 ms before the comparison sentence; camera move = the sentence (starts +0.2 s, ends 0.5 s early).

---

# What Primer should do (round 2)

These add to or correct the first study's 25 rules (numbers in brackets refer to those rules).

**Motion**

1. **Pick the curve by what is moving** (corrects the first study's inferred 4.1):
   - diagram furniture arriving (callout, label pill, chart element): `cubic-bezier(0.25, 0.1, 0.25, 1)` to `cubic-bezier(0.33, 1, 0.68, 1)`, **450 to 700 ms**, no overshoot;
   - physical props arriving (sign, object, character pop): spring to **+10 to 13%** in 150 ms, settle by 350 ms; `cubic-bezier(0.34, 1.56, 0.64, 1)` over 350 ms is close (~10%);
   - camera moves: easeInOutSine `cubic-bezier(0.37, 0, 0.63, 1)`, i.e. p = (1 − cos πt)/2;
   - transitions (split slide, whip, zoom-through): easeInOutCubic `cubic-bezier(0.65, 0, 0.35, 1)`, **800 to 900 ms**, zoom interpolated in log scale (scale = s0·(s1/s0)^p);
   - processes (rising arrows, growing columns, flowing dashes): linear, constant speed; loops on a fixed period (2.0 s worked for inflow arrows).
2. **Chain moves so speed hands over:** linear leader line 330 to 470 ms straight into an ease-out circle or pill. Total callout ≈ 1.1 s; then hold about 1 s before going through it.
3. **A camera move lasts one sentence:** start 0.2 s after the sentence starts, finish 0.5 s before it ends, sine in-out, peak ≈ 1.6× average speed. Do not cut inside that sentence.
4. **Colour changes that carry cause and effect** (sea warms, air cools): 1.0 to 1.2 s ease-in-out with a **~10% overshoot** in the target hue, settled 0.9 s later. Pair it with a number pop on the spoken number.
5. **Accumulations** (heat building up, clouds filling the sky, soot or warm water spreading) run 6 to 8 s with ease-out cubic across two sentences: most of the change in the first 2.5 s, then a creep.
6. **Spin: keep the storm body stable and move small things round it** (corrects the first study's B "swirl locks into a spiral that keeps turning"). Translucent arc streaks orbit the eye; dashed highlights travel along the bands; debris and rain dashes circle. The cloud mass only breathes. A rotating whole cloud is harder to read.
7. **Holds** (corrects rule 3): allow 1.5 s holds routinely, 3 to 4 s on a finished diagram that the narrator is reading from, up to 7 s only if labels keep arriving one by one. Idle loops still run underneath.

**Labels and timing**

8. **Labels are built in three steps** (refines rule 11): anchor dot pop, bent leader 330 ms, pill unrolls 680 ms ease-out with the text sliding in inside it. Start the dot with the line (or a beat before the noun) so the pill unrolls while the term is spoken and is readable as it ends. Keep it 2.5 to 4 s. A heading over a comparison stays for the whole comparison.
9. **Cut 80 ms before the new sentence and inside the breath** (refines rule 2): measured 60% of cuts within ±0.3 s of a line start, 69% in a voice pause. In our renderer, schedule cuts at sentence start minus 80 ms.
10. **Pacing targets:** about 165 words per minute; sentences median 5.5 s; one hard cut every ~7.5 s (median), with a new picture event every ~3 s in between (two per sentence); about one in eight sentences a short punch under 2.5 s.

**Sound** (fills the first study's gap 6)

11. **Mix:** integrated **−16 LUFS**, short-term loudness kept within ±1.5 LU (LRA ≤ 3 LU). Voice peaks around −15 dBFS RMS (50 ms), median about −21 dBFS.
12. **Bed always on:** music/ambience **15 to 17 dB under the voice** (about −32 dBFS in the breath gaps, about −37 dBFS RMS under speech). Never let it drop to silence.
13. **On title cards and section breaks, raise the music to keep the same loudness** (≈ −16 LUFS short-term) rather than letting the level fall when the voice stops.
14. **Do not hit cuts with sound.** Put effects on events inside a shot.
15. **Ticks for pops:** 20 to 40 ms broadband clicks with most energy at 4 to 11 kHz, starting **20 to 80 ms before** the visual keyframe (or on arrival for a growing shape), about −30 dBFS, i.e. 15 dB under voice peaks.
16. **Whooshes for transitions:** broadband noise 0.6 to 0.9 s, same length as the move, rising over the first half, **peak at the move's peak speed**, cut off when the next shot settles; −28 to −32 dBFS.
17. **Process sounds swell in slowly:** a ~1 s rise beginning ~350 ms before the arrows appear (updraft, inflow, evaporation stream).

**Explaining air, water and heat**

18. **Tell the hurricane engine as a chain of side views with altitude, one link per sentence** (as 3.1). Plant the altitude line (tropopause) early and small; use it later.
19. **Fixed vocabulary for Primer** (extends rule 4, use our own shapes and colours): heat flowing = many small identical warm arrows or triangles pointing one way, density = intensity; air flowing in = dashed cool arrows near the surface on a loop; rising air = warm arrows growing inside a column; vapour = pale translucent round puffs; liquid water = deeper, glossier blue; cloud = soft pale puffs with cool shading; pressure = arrows pointing in from all sides, or dot density, or a gauge; temperature change = a shift of the medium's hue plus a number.
20. **Do not paint warm water red.** Shift its hue and put the number on a sign or tag. Red is for heat sources and heat flow only.
21. **Show a frame of reference by riding along.** For Coriolis, put the camera on the turning Earth (or on a moving parcel of air) so the viewer sees the same motion from two places.
22. **Comparisons are held splits at equal scale with one heading** (confirms rule 8), stacked top/bottom on the phone.

**Layout**

23. **Recompose for portrait, never crop.** Only 13% of their 16:9 frames would survive a centred portrait crop. Use vertical set-ups (columns, side views with altitude, tilts), top/bottom splits, labels above or below, subject centred at 42 to 64% of height, ~40% flat background.

---

## Re-direction sketches

Times assume ~165 words per minute. "S1", "S2" are sentences. All shapes and colours are ours; the numbers are the rules above.

### (a) Evaporation and heat release

Portrait side view: sea in the bottom 22% of the screen, sky above, a faint dashed altitude line at 80% height (unlabelled for now).

- **S1 (≈5 s): "Over a tropical sea, the water is warmer than a bath, at least 26 degrees."** Camera static on a calm sea with small idle wave dashes. At "26 degrees" a number tag on a short pole rises out of the water (linear, 500 ms) and its board springs open (+12%, 150 ms + 200 ms settle; tick 40 ms before the board).
- **S2 (≈6 s): "At the surface, the fastest water molecules break free and fly off as vapour."** Cut 80 ms before the sentence (in the breath) to a circular callout: anchor dot on the surface, leader line 400 ms linear, circle opens 450 ms ease-out, hold ~1 s, then a zoom through it (850 ms, in-out cubic in log scale, whoosh peaking mid-move). Inside: glossy blue molecules jostling (idle loop); one at the top speeds up, tears free and becomes a pale, translucent, rounder puff that drifts up. A label "evaporation" builds on the word "vapour" (dot, leader, pill).
- **S3 (≈5 s): "Each one carries heat away with it, so the sea pays for the vapour with its warmth."** Each departing puff carries a small warm arrow; the water layer under them shifts one step cooler in hue over 1.2 s with a 10% overshoot. One picture, cause and effect.
- **S4 (≈6 s): "The warm, wet air rises, and as it rises it cools."** Zoom back out (sine). Pale puffs stream upward in a column on a 2 s loop (linear). The air colour ramps from warm at the bottom to cool at the top.
- **S5 (≈7 s, the camera move = this sentence): "High up, the vapour turns back into droplets, and the heat it carried is set free right there, inside the cloud."** Tilt up along the column (sine in-out, 0.2 s after the start, 0.5 s before the end). At the top the puffs condense into small bright droplets, cloud puffs assemble; at each condensation a tiny warm flash (tick, 20 ms, ~−30 dBFS), and warm arrows spread into the surrounding air. Label "latent heat" builds on "heat".
- **S6 (≈3 s, punch): "That released heat is the storm's fuel."** Hold 1.5 s on the glowing cloud top while the column keeps flowing. Music swells slightly to keep loudness steady.

### (b) Why winds blow (pressure, heating, trade winds and westerlies)

- **S1 (≈5 s): "Wind is just air moving from where there is more of it to where there is less."** Top/bottom split at equal scale, heading tag "air pressure" on the divider (split: 800 ms in-out cubic, whoosh). Top: dense dots (high); bottom: sparse dots (low). Then the divider lifts and dots flow down from dense to sparse at constant speed.
- **S2 (≈6 s): "The Sun heats the equator more than the poles."** Portrait globe filling the width, slight rim light. Warm arrows pour onto a band at the equator, a few onto the poles; the equator band shifts warm over 1.2 s (overshoot 10%), poles cool.
- **S3 (≈6 s): "Warm air rises at the equator, leaving low pressure below it, and sinks again around thirty degrees north and south."** Cut to a side-view slice (vertical: equator at the bottom of the frame, 30° above it, altitude to the right edge is fine as a narrow strip). Warm arrows grow upward over the equator (linear); at the top they turn poleward, then sink at 30° (looped dashed path, 2 s period). A gauge or dot density shows low at the equator, high at 30°.
- **S4 (≈6 s): "Near the ground, air flows back toward the equator to fill the gap."** Dashed cool arrows near the surface run from 30° to the equator on the same loop: the circuit is now closed. One heading tag, "a loop of air".
- **S5 (≈7 s): "But the Earth is spinning, so on the way, the air gets bent, and arrives from the east: the trade winds."** Back to the globe, camera rotating slowly with the Earth. The surface arrows bend toward the west as they flow; label "trade winds" builds on the words. (The why of the bend is sketch (c).)
- **S6 (≈7 s): "Further from the equator, past thirty degrees, the surface air flows toward the poles instead, and the same bend turns it into winds from the west: the westerlies."** A second band of dashed arrows appears above 30°, flowing poleward and bending east; label "westerlies". Hold ~2 s on both bands, flowing in opposite directions, linear loops running.

### (c) The Coriolis bend and the spin

- **S1 (≈5 s): "Imagine throwing a ball straight across a spinning merry-go-round."** Top-down disc, portrait-centred. A ball goes straight from the centre to the rim (linear, constant speed) while the disc turns (linear rotation). Trail drawn live.
- **S2 (≈6 s, camera = sentence): "From the ground the path is straight, but ride along on the merry-go-round and it curves."** The camera **rides the disc** (rotates with it; the ground background now turns instead), and the same throw replays: the trail now curves to the right. Top/bottom split holds both views with one heading, "same throw, two views".
- **S3 (≈6 s): "The Earth is a spinning merry-go-round too, so moving air curves: to the right in the northern hemisphere."** Iris from the disc to the globe (scale jump via a circle that stays in frame, 850 ms in-out cubic, log zoom). A few dashed arrows travel across the Northern Hemisphere and bend right. Label "Coriolis effect" only now, on the name.
- **S4 (≈6 s): "Around a patch of low pressure, air rushes in from all sides…"** Top-down over the sea: a soft low-pressure dot; dashed inflow arrows from all sides on a 2 s loop, aimed straight at the centre.
- **S5 (≈7 s): "…but every stream bends to the right, so instead of meeting in the middle, they swirl around it, anticlockwise."** Each arrow eases into a rightward bend (process: linear speed, bend added over 1.2 s); the arrows end up circling the centre anticlockwise. Puffs assemble into a ring with a clear hole over ~2.5 s.
- **S6 (≈4 s): "That's the spin."** The ring stays still and only breathes; translucent arc streaks orbit it and rain dashes circle (rule 6). A speed tag pops on the number if one is spoken.

### (d) A storm's track curving, and why

- **S1 (≈5 s): "A hurricane doesn't steer itself. It is carried by the winds around it, like a leaf on a river."** Map view in portrait: ocean filling the screen, coastline at the top-left. Background flow drawn as fields of thin parallel lines (like wind lines bending round an obstacle) drifting slowly (linear).
- **S2 (≈6 s): "In the tropics, the trade winds push it west."** The lower band of flow lines runs right to left. The storm (stable ring with orbiting streaks) rides it at constant speed; its path is drawn live behind it as a thin dotted trail.
- **S3 (≈7 s): "To its north sits a huge area of high pressure, with winds circling it clockwise, and the storm follows that curve around its western edge, turning north."** A broad pale dome (high) appears with lines circling it clockwise (2 s loop). The storm's heading eases from west to north over ~3 s (ease-in-out sine) as it rounds the dome's left side. Label "high pressure" on the words.
- **S4 (≈5 s): "On its own, it also drifts a little toward the pole, because the Coriolis effect is stronger on its poleward side."** Small, quiet: a faint extra arrow on the storm pointing north-west, held 1.5 s. Keep this one sentence; it is a qualification, not a new chapter.
- **S5 (≈7 s, camera = sentence): "Once it reaches the westerlies, it gets swept east, so the track bends back on itself into a hook."** Camera pans up with the storm (sine). The upper band of lines runs left to right; the storm's heading swings north-east and its speed rises (it accelerates linearly from slow to fast), the trail now a full curve.
- **S6 (≈3 s, punch): "Warm water feeds it; the winds decide where it goes."** Hold on the whole curved track for ~2 s, the two wind bands still flowing, then a music swell into the next section at the same loudness.

---

## Appendix: files

- Clips and per-clip `SOURCE.txt`: `ref/youtube/kurzgesagt2/{trees,nuke,dino,hestia-a,hestia-b,hestia-c,aster-a,aster-b}/`.
- Contact sheets (1 fps, clip time burnt in): `*/sheets/`. Detail sheets: `trees/detail/` (magnifier, label build, dot pop), `nuke/detail/` (inflow and updraft, split), `dino/detail/` (sign pop, hypercane forming and spin, spiral interior).
- 40 key frames: `ref/youtube/kurzgesagt2/frames/` (named `<clip>_t<clip seconds>_<what>.jpg`), all on one sheet in `frames_index.jpg`.
- Plots and spectrograms: `ref/youtube/kurzgesagt2/plots/`.
- Timestamped captions: `ref/youtube/kurzgesagt2/tx/*.ts.txt`. Audio and loudness logs: `ref/youtube/kurzgesagt2/audio/`.
- Measurement code: `ref/youtube/kurzgesagt2/scripts/` (`kz.py` helpers and easing fits, `m_*.py` per measurement, `m_audio.py`, `m_onsets.py`, `m_events.py` for sound).
- All rights reserved by the channel: reference only; do not commit, publish or reuse.
