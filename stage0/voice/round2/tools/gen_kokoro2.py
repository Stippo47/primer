"""Round 2: generate lines with any Kokoro voice, or a blend of several, at any speed.

Usage:
  python gen_kokoro2.py --lines lines.json --out <wav-dir>
      [--voices af_bella,bm_george | --voices english | --voices ja,es,it,hi]
      [--blend name=am_onyx:0.5+bm_george:0.5 --blend-speed 0.9 --blend-lang b] ...
      [--speed 1.0]

--voices takes voice ids, the word "english" (every American and British
voice in kokoro_voices.json), or language names (ja, es, it, hi: every voice
of that language). A voice id's first letter picks the text front end
(a US English, b UK English, j Japanese, e Spanish, i Italian, h Hindi), and
each voice speaks the lines of its own language.

--blend makes a new voice by taking a weighted average of the style tensors
of voices that ship with the model. Nothing is recorded or imitated: it is
arithmetic on the publisher's own voices. Give it as
name=voice:weight+voice:weight; weights are scaled to add up to 1. The name
must not contain a hyphen. Add @speed and /lang to one blend to override
--blend-speed and --blend-lang for it, e.g. deep=am_onyx:1+bm_george:1@0.88/b

Kokoro's front end for Japanese and Hindi throws away those languages' own
full stops (。 and ।), so three sentences come out as one breathless run. By
default this script hands the engine a Western full stop in their place
(--stops western); the words are untouched. --stops keep sends the text as
written. The text really sent, and the sounds the front end turned it into,
are recorded for every clip.

Writes <out>/kokoro-<voice>-<n>.wav (24 kHz mono) and <out>/kokoro.meta.json.
The same text, voice and speed give the same audio every time.
"""
import argparse
import json
import time
from importlib.metadata import version
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from kokoro import KModel, KPipeline

REPO = "hexgrad/Kokoro-82M"
SR = 24000
HERE = Path(__file__).resolve().parent
STOPS = {"j": {"。": ". ", "、": ", "}, "h": {"।": ". "}}  # 。 、 and the Hindi danda


def engine_text(text, code, stops):
    if stops == "western":
        for native, western in STOPS.get(code, {}).items():
            text = text.replace(native, western)
    return " ".join(text.split())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voices", default="")
    ap.add_argument("--blend", action="append", default=[])
    ap.add_argument("--blend-speed", type=float, default=1.0)
    ap.add_argument("--blend-lang", default="a")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--stops", choices=["western", "keep"], default="western")
    ap.add_argument("--catalogue", default=str(HERE / "kokoro_voices.json"))
    args = ap.parse_args()

    spec = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    cat = json.loads(Path(args.catalogue).read_text(encoding="utf-8"))
    lang_of = cat["languages"]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = KModel(repo_id=REPO).to(device).eval()
    pipes = {}

    def pipe(code):
        if code not in pipes:
            pipes[code] = KPipeline(lang_code=code, repo_id=REPO, model=model)
        return pipes[code]

    jobs = []  # (name, lang_code, voice id or tensor, speed, recipe)
    for word in filter(None, args.voices.split(",")):
        if word == "english":
            ids = [v["id"] for v in cat["voices"] if v["id"][0] in "ab"]
        elif word in lang_of.values():
            ids = [v["id"] for v in cat["voices"] if lang_of[v["id"][0]] == word]
        else:
            ids = [word]
        jobs += [(i, i[0], i, args.speed, None) for i in ids]
    for b in args.blend:
        name, _, recipe = b.partition("=")
        assert "-" not in name, "blend names must not contain a hyphen"
        lang, speed = args.blend_lang, args.blend_speed
        if "/" in recipe:
            recipe, lang = recipe.rsplit("/", 1)
        if "@" in recipe:
            recipe, speed = recipe.rsplit("@", 1)
            speed = float(speed)
        parts = [p.split(":") for p in recipe.split("+")]
        weights = {v: float(w[0]) if w else 1.0 for v, *w in parts}
        total = sum(weights.values())
        weights = {v: round(w / total, 4) for v, w in weights.items()}
        tensor = sum(pipe(lang).load_single_voice(v) * w for v, w in weights.items())
        jobs.append((name, lang, tensor.float(), speed, weights))

    def say(text, code, voice, speed):
        t = time.perf_counter()
        results = list(pipe(code)(text, voice=voice, speed=speed))
        chunks = [r.audio.detach().cpu().numpy() for r in results]
        if device == "cuda":
            torch.cuda.synchronize()
        return np.concatenate(chunks), time.perf_counter() - t, " ".join(r.phonemes for r in results)

    clips, voices = [], []
    for name, code, voice, speed, recipe in jobs:
        lang = lang_of[code]
        voices.append({"voice": name, "lang_code": code, "speed": speed, **({"blend": recipe} if recipe else {})})
        for line in spec["lines"]:
            if line["lang"] != lang:
                continue
            sent = engine_text(line["text"], code, args.stops)
            audio, secs, sounds = say(sent, code, voice, speed)
            wav = f"kokoro-{name}-{line['n']}.wav"
            sf.write(out / wav, audio, SR)
            clips.append({"voice": name, "line": line["n"], "wav": wav, "speed": speed,
                          "gen_seconds": round(secs, 3), "raw_seconds": round(len(audio) / SR, 3),
                          **({"sent_to_engine": sent} if sent != line["text"] else {}), "sounds": sounds})
            print(wav, f"{secs:.2f}s for {len(audio) / SR:.2f}s", flush=True)

    meta_path = out / "kokoro.meta.json"
    meta = {"engine": "kokoro", "model": REPO,
            "version": f"kokoro {version('kokoro')}, misaki {version('misaki')}, model v1.0, torch {torch.__version__}",
            "device": torch.cuda.get_device_name(0) if device == "cuda" else "cpu",
            "sample_rate": SR, "voices": [], "clips": []}
    if meta_path.exists():  # a later run adds to what is there, replacing the same voice
        old = json.loads(meta_path.read_text(encoding="utf-8"))
        redone = {v["voice"] for v in voices}
        meta["voices"] = [v for v in old["voices"] if v["voice"] not in redone]
        meta["clips"] = [c for c in old["clips"] if c["voice"] not in redone]
    meta["voices"] += voices
    meta["clips"] += clips
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
