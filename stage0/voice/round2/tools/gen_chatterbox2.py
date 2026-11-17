"""Round 2: Chatterbox Multilingual's built-in voice, with chosen settings, in any of its languages.

Usage:
  python gen_chatterbox2.py --lines lines.json --out <wav-dir>
      --voice default [--voice calm=0.35,0.3,0.7] ...
      [--langs en] [--seed 1] [--only chatterbox-calm-3,chatterbox-default-7]

Only the voice built into the model files is used: no reference recording,
so nobody's voice is imitated. A --voice is a name for a group of settings,
given as name=exaggeration,cfg_weight,temperature:

  exaggeration  how much feeling the model puts in (publisher's default 0.5)
  cfg_weight    how tightly it follows the text; the publisher says lower
                values give slower, more deliberate pacing (default 0.5)
  temperature   how much it varies from take to take (default 0.8)

"default" with no settings means the publisher's defaults, as in round 1.
Names must not contain a hyphen. Every voice speaks the lines whose language
is in --langs. The model samples at random, so each clip is seeded with
--seed plus its line number and can be regenerated alone with --only.

--respell uses a line's "respell" text from lines.json where it has one: the
same sentence with a word spelled out so the engine reads it correctly.
Chatterbox turns Japanese kanji into kana with a dictionary that always
reads 今日は as "konnichiwa", so "今日はいい天気" comes out wrong unless 今日 is
spelled きょう. Give respelled clips their own voice name.

Writes <out>/chatterbox-<voice>-<n>.wav (24 kHz mono) and
<out>/chatterbox.meta.json (one row per clip made in this run).
"""
import argparse
import json
import time
from importlib.metadata import version
from pathlib import Path

import soundfile as sf
import torch
from chatterbox.mtl_tts import REPO_ID, ChatterboxMultilingualTTS

DEFAULTS = (0.5, 0.5, 0.8)  # the publisher's demo defaults


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", action="append", default=[])
    ap.add_argument("--langs", default="en")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--only", default="")
    ap.add_argument("--respell", action="store_true")
    args = ap.parse_args()

    spec = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    only = set(filter(None, args.only.split(",")))
    langs = set(args.langs.split(","))
    device = "cuda" if torch.cuda.is_available() else "cpu"

    voices = []
    for v in args.voice or ["default"]:
        name, _, nums = v.partition("=")
        assert "-" not in name, "voice names must not contain a hyphen"
        e, c, t = (float(x) for x in nums.split(",")) if nums else DEFAULTS
        voices.append((name, {"exaggeration": e, "cfg_weight": c, "temperature": t}))

    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    sr = model.sr

    def say(text, lang, seed, settings):
        torch.manual_seed(seed)
        if device == "cuda":
            torch.cuda.manual_seed_all(seed)
        t = time.perf_counter()
        wav = model.generate(text, language_id=lang, **settings)
        if device == "cuda":
            torch.cuda.synchronize()
        return wav.squeeze(0).numpy(), time.perf_counter() - t

    say("A short warm up line.", "en", 0, dict(zip(("exaggeration", "cfg_weight", "temperature"), DEFAULTS)))

    clips = []
    for name, settings in voices:
        for line in spec["lines"]:
            stem = f"chatterbox-{name}-{line['n']}"
            if line["lang"] not in langs or (only and stem not in only):
                continue
            seed = args.seed + line["n"]
            sent = line.get("respell", line["text"]) if args.respell else line["text"]
            audio, secs = say(sent, line["lang"], seed, settings)
            sf.write(out / (stem + ".wav"), audio, sr)
            clips.append({"voice": name, "line": line["n"], "lang": line["lang"], "wav": stem + ".wav",
                          "seed": seed, "settings": settings,
                          **({"sent_to_engine": sent} if sent != line["text"] else {}),
                          "gen_seconds": round(secs, 3), "raw_seconds": round(len(audio) / sr, 3)})
            print(stem, f"{secs:.2f}s for {len(audio) / sr:.2f}s", flush=True)

    meta = {"engine": "chatterbox", "model": f"{REPO_ID} (multilingual, t3_mtl23ls_v2)",
            "version": f"chatterbox-tts {version('chatterbox-tts')}, torch {torch.__version__}",
            "device": torch.cuda.get_device_name(0) if device == "cuda" else "cpu",
            "sample_rate": sr, "clips": clips}
    (out / "chatterbox.meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
