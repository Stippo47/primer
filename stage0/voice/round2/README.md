# Voice samples, round 2

More narrator voices (older-sounding ones above all) and first samples in
Japanese, Spanish, Italian and Hindi. Round 1 is one folder up and is not
changed by anything here.

Nobody has listened to these clips. Words were checked by a speech
recogniser; pitch, pace, "sounds how old" and "same voice from line to line"
are machine measurements. `samples.json` holds every number and says where
the checks are weak.

## What is here

| Path | What |
|---|---|
| `clips/` | 78 clips, one per line, named `<engine>-<voice>-<line>.m4a`. Only the voices put forward. |
| `board/` | 13 joined clips, one per English voice put forward: the five lines with half a second between, 21 to 30 s, each under 260 KB. `board.json` lists them. |
| `samples.json` | Engines, settings, text, takes and check result for every clip; pitch, pace, age guess and sameness for all 43 English voices measured, including the ones not kept; what was tried for an older voice; how far to trust each language's check. |
| `tools/` | The scripts, the lines, and the hand-written notes that go into `samples.json`. |

Line numbers: 1 to 5 are round 1's English lines. 7 Japanese, 8 Spanish,
9 Italian, 10 Hindi. (6 was round 1's French line.)

Voices not put forward (20 other Kokoro English voices, 8 other blends, some
Chatterbox settings, one described voice, 6 other Kokoro language voices)
were generated, checked and measured the same way. Their clips are not stored:
Kokoro remakes any of them in under a second.

## The voices put forward

English, older-sounding first by the age guess:

| Clip name | What it is | Pitch | Words a minute | Age guess |
|---|---|---|---|---|
| `kokoro-am_santa` | Kokoro stock voice (grade D-) | 167 Hz | 166 | 67 |
| `qwen-elder_m2` | Described: "a British man of about eighty with an aged, gravelly, kind voice" | 104 Hz | 167 | 64 |
| `kokoro-old_gs` | Kokoro blend: 60% George, 40% Santa, speed 0.92 | 148 Hz | 152 | 63 |
| `kokoro-old_so` | Kokoro blend: 60% Santa, 40% Onyx, speed 0.92 | 124 Hz | 165 | 61 |
| `qwen-elder_m` | Described: "an elderly man in his seventies with a warm, deep, unhurried voice" | 94 Hz | 145 | 59 |
| `kokoro-bm_george` | Kokoro stock voice, British (grade C) | 142 Hz | 159 | 57 |
| `kokoro-bm_lewis` | Kokoro stock voice, British (grade D+) | 90 Hz | 170 | 47 |
| `kokoro-am_onyx` | Kokoro stock voice, the deepest (grade D) | 86 Hz | 193 | 39 |
| `chatterbox-slower` | Round 1's "Chatterbox A" with calmer settings | 165 Hz | 212 | 37 |
| `kokoro-af_bella` | Kokoro stock voice, woman (grade A-) | 205 Hz | 180 | 43 |
| `kokoro-af_kore` | Kokoro stock voice, woman, low (grade C+) | 151 Hz | 185 | 42 |
| `kokoro-bf_isabella` | Kokoro stock voice, British woman (grade C) | 207 Hz | 186 | 43 |
| `kokoro-am_fenrir` | Kokoro stock voice, young man (grade C+) | 134 Hz | 185 | 24 |

For comparison, round 1's two liked voices measured the same way: Heart
202 Hz, 184 words a minute, age guess 31; Chatterbox A 151 Hz, 233, 38.

Languages (one clip each): Japanese `kokoro-jf_alpha`, `kokoro-jf_tebukuro`,
`chatterbox-kana`; Spanish `kokoro-ef_dora`, `kokoro-em_alex`,
`chatterbox-default`; Italian `kokoro-if_sara`, `kokoro-im_nicola`,
`chatterbox-default`; Hindi `kokoro-hf_alpha`, `kokoro-hm_psi`,
`chatterbox-default`.

## No real person's voice was copied

- Kokoro: only voices that ship with the model, and weighted averages of them.
- Chatterbox: only the voice built into the model files. No reference recording.
- Qwen3-TTS: the voice is invented from a written description. To keep it
  steady, one line made that way is handed to the publisher's companion model
  as the voice for the rest. That companion model can copy any recording, so
  it must only ever be given the model's own invention, as here.

## Things found along the way

- **Low pitch is not the same as old.** Kokoro's two deepest men come out at
  39 and 47 by the age guess; the two the guess calls oldest are also the two
  slowest.
- **Chatterbox's calmer settings do not age the voice** and slow it by 9% at
  most, at the price of more wrong takes.
- **A description alone drifts.** Qwen3-TTS invents the voice afresh each
  line; five lines were as unlike as five different men until the steady
  recipe was used.
- **Kokoro drops the Japanese and Hindi full stops** (。 and ।), running
  sentences together. `gen_kokoro2.py` swaps in Western full stops.
- **Chatterbox misreads 今日は.** Its Japanese front end always reads it as the
  greeting "konnichiwa", so "今日はいい天気ですね" is told to come out wrong. The
  clip on the board spells 今日 in kana to get round it. The recogniser cannot
  hear the difference either way, so this rests on the engine's own code.
- **The recogniser's word times are wrong in Japanese**, so the "sound after
  the last word" test is off for that language.

- **Round 1's encoder gives up after five corrections.** That left six stored
  Kokoro clips off the loudness target, one (Lewis, line 1) by 2 dB.
  `encode_more.py` does the same steps with more patience and was run on
  those six. One described-voice clip is 0.35 dB under target and was left.

## Making it again

Paths are placeholders: `<kokoro>`, `<chatterbox>`, `<check>` and `<qwen>` are
the Python programs of four separate environments, `<work>` is a scratch
folder outside the repo, and commands run from `tools/`. Set `HF_HOME` to
wherever model files should be kept.

```
# Kokoro: every English voice, the blends, the four languages
<kokoro> gen_kokoro2.py --lines lines.json --out <work>/wav-kokoro-en --voices english
<kokoro> gen_kokoro2.py --lines lines.json --out <work>/wav-kokoro-blend \
    --blend "old_gs=bm_george:0.6+am_santa:0.4@0.92/b" --blend "old_so=am_santa:0.6+am_onyx:0.4@0.92/a" ...
<kokoro> gen_kokoro2.py --lines lines.json --out <work>/wav-kokoro-lang --voices ja,es,it,hi

# encode (round 1's encoder), check, for each of the three sets
python ../../tools/encode.py --wav <work>/wav-kokoro-en --clips <work>/enc-kokoro-en --report <work>/enc-kokoro-en.json
python encode_more.py --wav <work>/wav-kokoro-en --clips <work>/enc-kokoro-en --report <work>/enc-kokoro-en.json --only <clips left off target>
<check> check_asr2.py --clips <work>/enc-kokoro-en --lines lines.json --out <work>/asr-kokoro-en.json
#   blends: --gap 1.0     languages: --gap 1.2
#   af_nicole (whispered) again on its own: --gap 3 --floor 35, into <work>/enc-nicole

# Chatterbox and Qwen3-TTS: generate, encode, check and retake in one go
python takes.py --work <work>/cb-en2 --lines lines.json --gen-python <chatterbox> --gen gen_chatterbox2.py \
    --check-python <check> --gap 0.7 --max-takes 8 -- --voice slow=0.25,0.2,0.6 --voice slower=0.2,0.1,0.5 --langs en
python takes.py --work <work>/cb-lang --lines lines.json --gen-python <chatterbox> --gen gen_chatterbox2.py \
    --check-python <check> --gap 1.2 --max-takes 8 -- --voice default --langs ja,es,it,hi
python takes.py --work <work>/cb-ja2-kana ... --gap 1.2 -- --voice kana --langs ja --respell
python takes.py --work <work>/qwen-reuse2 --lines lines.json --gen-python <qwen> --gen gen_qwen.py \
    --check-python <check> --gap 1.0 -- --mode reuse --reference-dir <work>/qwen-reuse2/reference \
    --voice "elder_m=<description>" --voice "elder_m2=<description>"

# measure every English clip, gathered into <work>/pool
<chatterbox> measure.py  --clips <work>/pool --lines lines.json --out <work>/measure.json
<check>      estimate_age.py --clips <work>/pool --lines lines.json --out <work>/age.json
<chatterbox> sameness.py --clips <work>/pool --lines lines.json --out <work>/sameness.json

# copy the chosen clips in, join the board clips, write samples.json
python build_samples.py --work <work> --round2 ..
python build_board.py --clips ../clips --board ../board --report ../board/board.json --voices <the 13 English names>
python build_samples.py --work <work> --round2 ..
```

The exact blend recipes, settings, seeds and descriptions for every stored
clip are in `samples.json`. Kokoro gives the same audio every time; Chatterbox
and Qwen3-TTS gave the same audio for the same seed on this machine.

## What was downloaded, and licences

Engines and models:

| What | From | Licence |
|---|---|---|
| Kokoro 82M: 39 more voice files (25 English, 14 in the four languages) | publisher's Hugging Face repo | Apache-2.0 |
| Qwen3-TTS: package `qwen-tts` 0.1.1, models `Qwen3-TTS-12Hz-1.7B-VoiceDesign` and `-Base` | PyPI; publisher's Hugging Face repos | Apache-2.0 |
| PyTorch 2.11.0 (CUDA 12.8 build) for the Qwen environment | PyTorch's own package index, as round 1's environments | BSD-3-Clause |
| Chatterbox Multilingual | already present from round 1 | MIT |

Japanese text handling, added to the Kokoro environment:

| What | From | Licence |
|---|---|---|
| fugashi 1.5.2 | PyPI | MIT and BSD-3-Clause |
| jaconv 0.5.0 | PyPI | MIT |
| mojimoji 0.0.13 | PyPI | Apache-2.0 |
| unidic 1.1.0 (the downloader) | PyPI | MIT |
| UniDic 3.1.0 dictionary, 526 MB download | fetched by `python -m unidic download` from the address built into that package (the dictionary makers' own storage, not PyPI) | BSD, LGPL or GPL, at the user's choice |
| pyopenjtalk-plus 0.4.1.post10, with sudachipy and sudachidict-core | PyPI | MIT; Apache-2.0 |

`misaki[ja]` asks for `pyopenjtalk`, which has no ready-built Windows package
and will not build without a compiler. `pyopenjtalk-plus` provides the same
module ready-built. Kokoro's default Japanese path does not use it; it only
has to be importable.

Measuring only (nothing from these ships):

| What | From | Licence |
|---|---|---|
| pykakasi 2.3.0, for kana readings in the Japanese check | PyPI | GPL-3.0-or-later |
| audEERING `wav2vec2-large-robust-24-ft-age-gender`, for the age guess | publisher's Hugging Face repo | CC BY-NC-SA 4.0 (non-commercial) |
| faster-whisper large-v3, librosa, Chatterbox's speaker encoder | already present from round 1 | MIT, ISC, MIT |

No install scripts were run. Nothing was built from source.
