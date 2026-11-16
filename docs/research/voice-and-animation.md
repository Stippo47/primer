# Voice and animation research (2026-11-16)

Legend: **[V]** = verified this session (source number in brackets, see Sources); **[R]** = recalled from memory, unchecked. Search quality was mixed: many TTS rankings are SEO blogs, so model-card checks are still needed before committing. Gaps are marked **GAP**.

## A. Text-to-speech (local, authoring time)

### A1. Model comparison

| Model | Licence | Languages | VRAM / speed | Timestamps | Notes |
|---|---|---|---|---|---|
| **Kokoro 82M v1.0** | Apache-2.0 [V1,2] | 9 lang codes: US/UK English, Spanish, French, Hindi, Italian, Japanese, Portuguese-BR, Mandarin [V2] (Pinggy counts 8, 54 voices [V1]) | <2 GB or CPU/ONNX [V1]; very fast | Not native in the PyPI package; the Rust port (kokoros) and Kokoro-FastAPI emit word timestamps from a "timestamped" ONNX [V3]; a fork exposes tokens (English only) [V3] | No cloning, no emotion control; repo frozen Aug 2025 [V1]. Windows needs espeak-ng MSI [V2]. No newer Kokoro found. Best "clean narrator" default. |
| **Chatterbox** (Resemble) | MIT [V1] | 23 (Multilingual, Sep 2025); about 25 in v3 (June 2026) [V1] | VRAM figure not published; fine on 16 GB [R]; Turbo 350M claimed ~6x real time [V1] | No | Voice cloning from ~5 s, emotion "exaggeration" knob, PerTh watermark in every output [V1]. 1,020 Elo [V1]. Strong for expressive narration. |
| **Higgs Audio V3** (Boson) | Code Apache-2.0, weights research/non-commercial [V1] | 100+ [V1] | 4B params [V1]; fits 16 GB quantised [R] | No | Released June 2026 [V1]; 1,042 Elo [V1]. Non-commercial is fine for a personal app. Install pain unknown (GAP). |
| **VibeVoice** (Microsoft) | MIT, but weights/code pulled ~10 days after Aug 2025 release [V1] | not stated | n/a | n/a | Community mirrors only; built for long multi-speaker audio. Avoid as a base. |
| **XTTS v2** (Coqui, Idiap fork) | Weights non-commercial CPML [V1] | 17 [V1] | ~4-6 GB [R] | No | Dated; 920 Elo, bottom half [V1]. Only worth it for cloning in a language Chatterbox lacks. |
| **F5-TTS** | Weights CC-BY-NC, code MIT [V4] | EN/ZH mainly [R] | ~4-8 GB [V4, vague] | No | Good cloning; non-commercial. |
| **Orpheus 3B** | Sources conflict (Apache vs Llama terms) [V4] | EN + some multilingual finetunes [R] | ~8-12 GB [V4] | No | Emotive tags; heavier. |
| **Dia 1.6B** | Apache-2.0 per blogs [V4] | English | 5-10 GB, ~0.5x real time on A4000 [V4] | No | Dialogue-oriented; slow, wrong fit for narration. |
| **Sesame CSM-1B** | Apache-2.0 [V4] | English | 6-8 GB [V4] | No | Conversational; not a narrator. |
| **Piper** | Original repo archived; live fork piper1-gpl (GPL) [V1] | 30+ [R] | CPU, instant [R] | Phoneme alignment is available via the engine [R] | Robotic vs. the above; fine for language drills offline, not for a "documentary" voice. |
| **IndexTTS(2)** | GAP (not verified) | EN/ZH [R] | GAP | Duration control [R] | Skip unless Chinese is needed. |
| **Breeze TTS 2 / Step Audio EditX** | Breeze weights non-commercial; Step Audio Apache-2.0 [V1] | GAP | GAP | GAP | Pinggy (Aug 2026) ranks Breeze 2 first at 1,215 Elo, above ElevenLabs v3 [V1]. Single-source claim; check the model card and Windows support before trusting it. |

Takeaway: for a documentary-feel English voice, shortlist **Chatterbox** (pace/expressiveness, MIT, 23 languages) and **Higgs V3** (quality, 100+ languages, non-commercial acceptable here), with **Kokoro** as the fast, reliable baseline whose consistency makes re-voicing cheap. Do an A/B on one real paragraph before committing; blog rankings are not a substitute.

### A2. Word-level timings when the model gives none
All the expressive models above give no timestamps, so alignment is a separate step [V1,V4].
- **WhisperX / faster-whisper word timestamps**: transcribe the generated clip and align with wav2vec2 CTC. Accuracy typically tens of ms on clean TTS speech [R]; GPU makes it seconds per clip. Because the text is known, prefer *forced* alignment over free transcription.
- **ctc-forced-aligner / torchaudio `forced_align`**: feed script text and audio, get per-word spans. Low effort (pip, a few lines), robust on TTS [R].
- **Montreal Forced Aligner**: most accurate, gives phonemes, but Kaldi-based and fiddly on Windows (conda) [R]. Only needed for viseme/lip-sync.
- Duolingo's own pipeline is the same shape: generate speech, run recognition to get word and phoneme timing, drive animation from the timings [V5].
- Cheap alternative: synthesise **one clip per script line** and time scenes at line granularity; use alignment only where a highlight must land on a specific word.

### A3. Free non-local fallbacks
- **edge-tts**: calls Microsoft's Edge online service, no key, MP3 + subtitle output [V6]. Risks: unofficial endpoint can break or be blocked; SSML restricted; licence appears to be GPL-3 [V6]. Fine as a throwaway scratch voice, not for shipped lessons.
- **iOS `speechSynthesis`**: free, offline, but voice quality varies by installed voice and iOS version; needs a user gesture; cannot be captured to a file or timed precisely; boundary events are unreliable on iOS [R]. Acceptable only as a last-resort fallback; not for narration.

### A4. Audio format for the phone
- **AAC in M4A (or MP3)** is the safe choice. MP3/M4A play everywhere, including from blob URLs [V7: a WebKit bug shows WebM-Opus failed from `blob:` while MP4/AAC worked in Safari 16].
- **Opus**: WebM-Opus support on iOS has been inconsistent since iOS 15 [V7]; one comment says Safari 17.4 made it consistent, another disputes it [V7]. Opus in CAF has worked since iOS 11 but is CBR-only [V7]. Opus-in-MP4 works on iOS 17 (AVPlayer) [V8]. **GAP:** I found nothing authoritative on iOS 18/26 or on service-worker/range-request behaviour; test on the real device.
- Service worker caveat [R]: iOS `<audio>` issues range requests; a service worker that answers a cache hit with a plain 200 can break seeking or playback. Handle `Range` headers in the fetch handler (slice the cached blob and return 206), or load clips via `fetch` into blobs and use `blob:` URLs.
- Bitrates [R]: speech at 48-64 kbps AAC (mono, 24-44.1 kHz) is transparent for one voice; ~0.4-0.5 MB per minute at 64 kbps. A 5-minute lesson is about 2-2.5 MB. Opus would be ~30% smaller but is the riskier format.

### A5. iOS Safari/PWA audio constraints
- Playback must start from a user gesture [R, V9 says early taps don't count]; unlock an `AudioContext` and/or a silent `<audio>` inside a real tap handler.
- Silent switch: Web Audio is "ambient" and is muted by the switch; `<audio>`/`<video>` elements ignore it [V9, WebKit 252746 via search]. Workaround: loop a silent `<audio>` element while using Web Audio [V9]. Simplest: **use `<audio>` elements only**.
- Home-screen PWA bug (WebKit 291892): `AudioContext` can go silent after backgrounding, `resume()` unreliable; on iOS 26.0 even plain `<audio>` was reported silent in a PWA after the first run; one comment says iOS 26.2 beta 3 appears fixed (unconfirmed) [V10]. Treat as the top risk; keep a visible "tap to start" and re-create the audio element on `visibilitychange`.
- Lock-screen/background playback and `playsinline` interaction: **GAP**. Media Session API is the route [R].

## B. Animation runtime

### B1. Comparison

| Tool | Plain ES module, no build | Size | Timeline / seek | Pauses for interaction | GUI editor needed? |
|---|---|---|---|---|---|
| **GSAP 3.x** | Yes (CDN/ESM) | ~25-30 KB core [R] | Excellent timelines, labels, `seek`, `time()`, `pause/resume` | Excellent | No |
| **Motion (motion.dev)** | Yes (ESM) | small, ~3-18 KB [R] | Sequences, `time` control; weaker than GSAP for long scripted timelines [R] | Good | No |
| **anime.js v4** | Yes (ESM); docs list a "Using with vanilla JS" section [V11] | small ~10-25 KB [R] | Timelines with `seek()` and playback settings [V11] | Good | No |
| **Web Animations API** | Native, 0 KB | 0 | `currentTime` seek, `pause`; no sequencing helper | Good | No |
| **Theatre.js** | Needs the studio GUI to author [R] | medium | Strong, but editor-based | OK | Yes (bad for AI) |
| **Motion Canvas / Remotion** | No: they render video, need a build/Node [R] | n/a | Strong | Not interactive on the phone | Code-only, but output is video |
| **Rive** | Runtime is WASM, no build needed | ~150-300 KB WASM [R] | State machines | Excellent | **Yes**, `.riv` files come from the Rive editor |
| **Lottie** | Yes (lottie-web) | ~60-150 KB [R] | Frame seek | OK | Needs After Effects export |
| **Manim** | Python, renders offline to video | n/a | n/a | No | No |
| **Mafs / p5** | Mafs is React (build) [R]; p5 loads as a script but is canvas-immediate [R] | Mafs small, p5 ~1 MB [R] | no timeline | Interactive but no sync | No |

**GSAP licence [V12]:** free for everyone including commercial use under the Standard "No Charge" licence, covering the formerly paid plugins (SplitText, MorphSVG, etc.); effective April 30, 2025. Restriction: not usable inside visual no-code animation tools that compete with Webflow's builder. The FAQ states AI-generated code is not a prohibited use [V12]. Personal use in a lesson app is clearly fine.

### B2. What Brilliant and Duolingo use
- **Brilliant**: moved from a mix of Lottie, After Effects and native code to Rive for the learning path, streaks and game mechanics (per Rive's own blog, so vendor framing) [V13].
- **Duolingo**: Rive for World Characters; speech is generated, recognition gives word and phoneme timing, which map to 20+ per-character visemes triggered in a Rive state machine in sync with the audio, instead of video [V5].
- Implication: both rely on **designer-authored Rive files**, which an AI agent cannot author without the editor. The transferable idea is architectural: **audio plus a timing JSON drives a state machine**. For an AI-only pipeline, replicate that with code-authored SVG components and GSAP, not Rive.

### B3. Syncing to narration
- Prefer the **clock being audio**: read `audio.currentTime` in a `requestAnimationFrame` loop and call `timeline.time(t)` (or scrub), instead of letting the timeline start audio. This avoids drift, supports seek/replay and pausing for interaction.
- Use **one clip per script line**, with each scene step keyed to a stable line id (`L03`), and per-line durations from the audio (or alignment JSON) written to a manifest at build time. Re-voicing then only regenerates the manifest, and the scene code references line ids plus optional word anchors (`L03@"gravity"`). A tiny inter-line gap allows an interactive pause between lines.
- Prior art [R, not opened]: **manim-voiceover** (Manim + TTS with bookmarks synced to words; the bookmark idea transfers), Remotion TTS templates, Motion Canvas voiceover plugins. Duolingo's timing-JSON-to-state-machine is the verified analogue [V5].

### B4. Canvas vs SVG vs WebGL on iPhone 11
No benchmark source found (**GAP**). Recalled guidance [R]: SVG is fine for a few hundred elements animated with transform/opacity; **SVG filters (feGaussianBlur glow, drop-shadow) are the main cost** on iOS, being rasterised per frame and expensive when animated or large. Fake glow with layered semi-transparent shapes or radial gradients; pre-render glows to a bitmap sprite; keep filtered regions small and static; use `will-change: transform` sparingly. Canvas 2D handles hundreds of sprites and particles and is steadier with heavy glow (pre-rendered offscreen sprites, `globalCompositeOperation = "lighter"`). WebGL is overkill unless thousands of particles. Cap devicePixelRatio at 2.

## C. Kurzgesagt style and assets

Search found no authoritative breakdown (**GAP**; results were fan blogs) [V14]. The rules below are recalled and should be checked against their own making-of videos:
- **Palette [R]:** a dark, saturated background (deep blue/purple) with a vivid limited accent set (hot pink, orange, teal, yellow); each object uses 2-3 hues from one family, a base plus lighter and darker shades, with the dark side leaning to a hue-shifted purple/blue, not grey.
- **Shapes [R]:** rounded geometric primitives, no outlines, simple silhouettes, chunky proportions, characters built from circles and capsules.
- **Lighting [R]:** a single implied light source; flat colour with a hard-edged shadow side, gradient "rim" or glow on the lit edge, soft radial glow behind luminous objects, subtle vignette and star/dust particles.
- **Texture [R]:** a faint grain or small dot/line pattern layered over flat fills, plus occasional halftone shading.
- **Motion [R]:** eased, overlapping, slightly bouncy scale-ins; slow parallax drift in the background; constant small idle motion so scenes never freeze.

Asset sources (licences [R], none opened; confirm on each site):
| Source | Licence |
|---|---|
| OpenMoji | CC BY-SA 4.0 (attribution + share-alike) |
| Twemoji | CC BY 4.0 graphics |
| Noto Emoji | Apache-2.0 / OFL (font) |
| PhyloPic | per-image: CC0, CC BY, CC BY-SA (check each) |
| unDraw | free, own licence, no attribution |
| Open Peeps | CC0 |
| game-icons.net | CC BY 3.0 |
| Wikimedia Commons SVGs | per-file, many CC BY-SA or PD |
| SVG Repo | per-file, mixed |
For a flat-vector Kurzgesagt look, these are mostly the wrong style; reusing silhouettes then recolouring with the palette is realistic, and AI-authored geometry for the core components will fit better.

## Recommended stack

| Layer | Pick | Runner-up |
|---|---|---|
| TTS | **Chatterbox** (MIT, 23 languages) for narration, **Kokoro** for fast drafts and languages it covers | Higgs Audio V3 (non-commercial, 100+ languages) |
| Word timing | **ctc-forced-aligner / torchaudio forced align** on known script text, with per-line clips as the base unit | WhisperX; MFA for phonemes |
| Audio format | **AAC/M4A mono 64 kbps, one file per line** | MP3; Opus in MP4 only after device test |
| Playback | `<audio>` elements, gesture-unlocked, no Web Audio | silent-audio loop plus Web Audio if effects needed |
| Animation | **GSAP** timelines driven from `audio.currentTime` | anime.js v4 or WAAPI |
| Rendering | SVG components with cheap fake glows, canvas for particles | canvas throughout |
| Assets | AI-authored components, CC0/Open Peeps/unDraw for filler | OpenMoji with attribution |

## Open risks
1. iOS 26 home-screen PWA audio bug may mute `<audio>` or Web Audio after relaunch [V10]; test on the actual iPhone 11 and OS version.
2. Opus/WebM on Safari and service-worker range handling are unverified; default to AAC and implement 206 responses.
3. TTS model rankings come from SEO blogs; Chatterbox and Higgs quality, install friction and RTX 5080 (Blackwell) PyTorch compatibility unchecked.
4. Kurzgesagt style rules are recalled, not sourced; build a style board and iterate visually.
5. SVG filter cost on iPhone 11 unmeasured; build a perf probe early.
6. Licences recalled for icon sets; verify before bundling.

## Sources
1. https://pinggy.io/blog/best_open_source_self_hosted_text_to_speech_models/
2. https://github.com/hexgrad/kokoro
3. Search results on Kokoro timestamps (kokoros, Kokoro-FastAPI, a fork): https://github.com/remsky/Kokoro-FastAPI
4. Search results comparing F5/Orpheus/Dia/CSM: https://codersera.com/blog/nari-dia-1-6b-vs-sesame-csm-1b-which-is-the-best-tts and https://www.centron.de/en/tutorial/best-open-source-tts-models-compared-kokoro-f5-tts-sparktts-sesame/
5. https://blog.duolingo.com/world-character-visemes
6. https://github.com/rany2/edge-tts
7. WebKit bugs via search: https://bugs.webkit.org/show_bug.cgi?id=238546 , https://bugs.webkit.org/show_bug.cgi?id=245428 , https://bugs.webkit.org/show_bug.cgi?id=183852
8. https://developer.apple.com/forums/thread/775937
9. Search results on iOS silent switch: https://bugs.webkit.org/show_bug.cgi?id=252746 , https://github.com/swevans/unmute
10. https://bugs.webkit.org/show_bug.cgi?id=291892
11. https://animejs.com/documentation/getting-started/
12. https://gsap.com/community/standard-license/ and https://webflow.com/blog/gsap-becomes-free
13. https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations
14. Kurzgesagt search results (low quality): https://artsatmichigan.umich.edu/ink/2019/09/27/simple-bright-beautiful-the-work-of-kurzgesagt
15. https://docs.manim.community/en/stable/ (Manim CE 0.22.1, MIT)
