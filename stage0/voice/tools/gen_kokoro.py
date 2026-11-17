"""Generate the sample lines with Kokoro 82M.

Usage:
  python gen_kokoro.py --lines lines.json --out <wav-dir>
      [--voices af_heart,am_michael,bf_emma] [--french-voice ff_siwis]

Writes <out>/kokoro-<voice>-<n>.wav (24 kHz mono) and <out>/kokoro.meta.json.
Voice names carry their language in the first letter (a = US English,
b = UK English, f = French), which picks the text front end.
"""
import argparse
import json
import statistics
import time
from importlib.metadata import version
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from kokoro import KModel, KPipeline

REPO = "hexgrad/Kokoro-82M"
SR = 24000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voices", default="af_heart,am_michael,bf_emma")
    ap.add_argument("--french-voice", default="ff_siwis")
    args = ap.parse_args()

    spec = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    t0 = time.perf_counter()
    model = KModel(repo_id=REPO).to(device).eval()
    load_seconds = time.perf_counter() - t0

    pipes = {}

    def pipe(code):
        if code not in pipes:
            pipes[code] = KPipeline(lang_code=code, repo_id=REPO, model=model)
        return pipes[code]

    def say(text, voice):
        if device == "cuda":
            torch.cuda.synchronize()
        t = time.perf_counter()
        chunks = [r.audio.detach().cpu().numpy() for r in pipe(voice[0])(text, voice=voice, speed=1.0)]
        if device == "cuda":
            torch.cuda.synchronize()
        return np.concatenate(chunks), time.perf_counter() - t

    voices = [v for v in args.voices.split(",") if v]
    for voice in voices:  # first call per voice pays one-off setup and download
        say("A short warm up line.", voice)
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()

    clips = []
    for voice in voices:
        for line in spec["lines"]:
            if line["lang"] != "en":
                continue
            audio, secs = say(line["text"], voice)
            name = f"kokoro-{voice}-{line['n']}.wav"
            sf.write(out / name, audio, SR)
            clips.append({"voice": voice, "line": line["n"], "wav": name,
                          "gen_seconds": round(secs, 3), "raw_seconds": round(len(audio) / SR, 3)})
            print(name, f"{secs:.2f}s for {len(audio) / SR:.2f}s")
    fv = args.french_voice
    if fv:
        say("Bonjour.", fv)
        for line in spec["lines"]:
            if line["lang"] != "fr":
                continue
            audio, secs = say(line["text"], fv)
            name = f"kokoro-{fv}-{line['n']}.wav"
            sf.write(out / name, audio, SR)
            clips.append({"voice": fv, "line": line["n"], "wav": name,
                          "gen_seconds": round(secs, 3), "raw_seconds": round(len(audio) / SR, 3)})
            print(name, f"{secs:.2f}s for {len(audio) / SR:.2f}s")

    bench = [say(spec["bench"]["text"], voices[0]) for _ in range(3)]
    meta = {
        "engine": "kokoro",
        "model": REPO,
        "version": f"kokoro {version('kokoro')}, model v1.0, torch {torch.__version__}",
        "device": torch.cuda.get_device_name(0) if device == "cuda" else "cpu",
        "sample_rate": SR,
        "load_seconds": round(load_seconds, 2),
        "peak_vram_mb": round(torch.cuda.max_memory_reserved() / 2**20) if device == "cuda" else 0,
        "peak_vram_allocated_mb": round(torch.cuda.max_memory_allocated() / 2**20) if device == "cuda" else 0,
        "bench_15_words_seconds": round(statistics.median(s for _, s in bench), 3),
        "bench_15_words_audio_seconds": round(len(bench[0][0]) / SR, 3),
        "settings": {"speed": 1.0},
        "clips": clips,
    }
    (out / "kokoro.meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
