"""Generate the sample lines with Chatterbox Multilingual.

Usage:
  python gen_chatterbox.py --lines lines.json --out <wav-dir>
      [--voice default] [--voice en_f1=<reference.flac>] ...
      [--french-voice default] [--french-voice fr_f1=<reference.flac>] ...
      [--seed 1] [--only chatterbox-default-3,chatterbox-en_f1-5]

A voice is either "default" (the voice built into the model files) or
name=<path to a short reference recording>. Use only reference recordings
you have the right to use; this script was run with the publisher's own
demo samples and nothing else.

English lines are spoken by every --voice, French lines by every
--french-voice. The model samples at random, so each clip is seeded with
--seed plus its line number and can be regenerated alone with --only.

Writes <out>/chatterbox-<voice>-<n>.wav (24 kHz mono) and
<out>/chatterbox.meta.json.
"""
import argparse
import json
import statistics
import time
from importlib.metadata import version
from pathlib import Path

import soundfile as sf
import torch
from chatterbox.mtl_tts import REPO_ID, ChatterboxMultilingualTTS

SETTINGS = {"exaggeration": 0.5, "cfg_weight": 0.5, "temperature": 0.8}  # the publisher's demo defaults


def parse(voices):
    out = []
    for v in voices:
        name, _, path = v.partition("=")
        out.append((name, path or None))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", action="append", default=[])
    ap.add_argument("--french-voice", action="append", default=[])
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--only", default="")
    args = ap.parse_args()

    spec = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    only = set(filter(None, args.only.split(",")))
    device = "cuda" if torch.cuda.is_available() else "cpu"

    t0 = time.perf_counter()
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    load_seconds = time.perf_counter() - t0
    builtin = model.conds
    sr = model.sr

    def use(path):
        if path:
            model.prepare_conditionals(path, exaggeration=SETTINGS["exaggeration"])
        else:
            model.conds = builtin

    def say(text, lang, seed):
        torch.manual_seed(seed)
        if device == "cuda":
            torch.cuda.manual_seed_all(seed)
            torch.cuda.synchronize()
        t = time.perf_counter()
        wav = model.generate(text, language_id=lang, **SETTINGS)
        if device == "cuda":
            torch.cuda.synchronize()
        return wav.squeeze(0).numpy(), time.perf_counter() - t

    use(None)
    say("A short warm up line.", "en", 0)
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()

    clips = []
    jobs = [(v, "en") for v in parse(args.voice or ["default"])] + [(v, "fr") for v in parse(args.french_voice)]
    for (voice, path), lang in jobs:
        use(path)
        for line in spec["lines"]:
            stem = f"chatterbox-{voice}-{line['n']}"
            if line["lang"] != lang or (only and stem not in only):
                continue
            seed = args.seed + line["n"]
            audio, secs = say(line["text"], lang, seed)
            sf.write(out / (stem + ".wav"), audio, sr)
            clips.append({"voice": voice, "line": line["n"], "wav": stem + ".wav", "seed": seed,
                          "gen_seconds": round(secs, 3), "raw_seconds": round(len(audio) / sr, 3)})
            print(stem, f"{secs:.2f}s for {len(audio) / sr:.2f}s", flush=True)

    meta_path = out / "chatterbox.meta.json"
    if only and meta_path.exists():  # a retake: keep everything else as it was
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta["load_seconds"] = min(meta["load_seconds"], round(load_seconds, 2))  # first run included the download
        fresh = {c["wav"]: c for c in clips}
        for i, old in enumerate(meta["clips"]):
            if old["wav"] in fresh:
                new = fresh[old["wav"]]
                new["takes"] = old.get("takes", 1) + 1
                meta["clips"][i] = new
    else:
        use(None)
        bench = [say(spec["bench"]["text"], "en", 100 + i) for i in range(3)]
        meta = {
            "engine": "chatterbox",
            "model": f"{REPO_ID} (multilingual, t3_mtl23ls_v2)",
            "version": f"chatterbox-tts {version('chatterbox-tts')}, torch {torch.__version__}",
            "device": torch.cuda.get_device_name(0) if device == "cuda" else "cpu",
            "sample_rate": sr,
            "load_seconds": round(load_seconds, 2),
            "peak_vram_mb": round(torch.cuda.max_memory_reserved() / 2**20) if device == "cuda" else 0,
            "peak_vram_allocated_mb": round(torch.cuda.max_memory_allocated() / 2**20) if device == "cuda" else 0,
            "bench_15_words_seconds": round(statistics.median(s for _, s in bench), 3),
            "bench_15_words_audio_seconds": round(statistics.median(len(a) / sr for a, _ in bench), 3),
            "settings": SETTINGS,
            "clips": clips,
        }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
