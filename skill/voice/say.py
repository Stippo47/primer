"""Makes voice clips: one wav per job, with Kokoro or Chatterbox. Run by `primer voice`, inside the engine's
own Python environment (the engines don't share one).

  python say.py --engine kokoro|chatterbox --jobs <jobs.json> --out <folder>

jobs.json is a list of { "id", "text", "voice", "take", "settings" }. Writes <out>/<id>.wav (mono) for each,
and prints one line of JSON at the end: { "made": [ { "id", "seconds", "gen_seconds" } ], "engine": "..." }.

Only voices that come with the models are used: Kokoro's own voice files, and Chatterbox's built-in voice
with no reference recording. Nobody's voice is copied.

Kokoro gives the same audio for the same text every time, so a retake changes its speed a little.
Chatterbox samples at random, so a retake changes the seed.

With PRIMER_VOICE_FAKE=1 set (the tests), no model is loaded: each word becomes a short tone.
"""
import argparse
import json
import math
import os
import struct
import sys
import time
import wave
from pathlib import Path

KOKORO_REPO = "hexgrad/Kokoro-82M"
KOKORO_SPEEDS = [1.0, 0.95, 1.05, 0.9, 1.1]      # take 1, 2, 3...
CHATTERBOX_DEFAULTS = {"exaggeration": 0.5, "cfg_weight": 0.5, "temperature": 0.8}  # the publisher's defaults


def write_wav(path, samples, sr):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples))


def fake(jobs, out):
    """A tone per word, a pause between: stands in for an engine in the tests."""
    sr, made = 24000, []
    for j in jobs:
        n = max(1, len(j["text"].split()))
        speed = KOKORO_SPEEDS[(j.get("take", 1) - 1) % len(KOKORO_SPEEDS)]
        word, gap = 0.22 / speed, 0.08 / speed
        samples = [0.0] * int(sr * 0.15)
        for k in range(n):
            f = 330 + 40 * (k % 5)
            samples += [0.4 * math.sin(2 * math.pi * f * i / sr) * min(1, i / 240, (word * sr - i) / 240) for i in range(int(word * sr))]
            samples += [0.0] * int(gap * sr)
        samples += [0.0] * int(sr * 0.2)
        write_wav(Path(out) / f"{j['id']}.wav", samples, sr)
        made.append({"id": j["id"], "seconds": round(len(samples) / sr, 3), "gen_seconds": 0})
    return made


def kokoro(jobs, out):
    import numpy as np
    import soundfile as sf
    import torch
    from kokoro import KModel, KPipeline
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = KModel(repo_id=KOKORO_REPO).to(device).eval()
    pipes = {}

    def pipe(voice):  # the first letter of a Kokoro voice is its language: a US English, b UK English, ...
        code = voice[0]
        if code not in pipes:
            pipes[code] = KPipeline(lang_code=code, repo_id=KOKORO_REPO, model=model)
        return pipes[code]

    made = []
    for j in jobs:
        speed = (j.get("settings") or {}).get("speed") or KOKORO_SPEEDS[(j.get("take", 1) - 1) % len(KOKORO_SPEEDS)]
        t = time.perf_counter()
        chunks = [r.audio.detach().cpu().numpy() for r in pipe(j["voice"])(j["text"], voice=j["voice"], speed=speed)]
        audio = np.concatenate(chunks)
        sf.write(Path(out) / f"{j['id']}.wav", audio, 24000)
        made.append({"id": j["id"], "seconds": round(len(audio) / 24000, 3), "gen_seconds": round(time.perf_counter() - t, 2), "speed": speed})
        print(j["id"], f"{len(audio) / 24000:.2f}s", file=sys.stderr, flush=True)
    return made


def chatterbox(jobs, out):
    import soundfile as sf
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)  # its built-in voice: no reference recording
    made = []
    for j in jobs:
        settings = {**CHATTERBOX_DEFAULTS, **{k: v for k, v in (j.get("settings") or {}).items() if k in CHATTERBOX_DEFAULTS}}
        seed = 1000 * j.get("take", 1) + sum(map(ord, j["text"])) % 997
        torch.manual_seed(seed)
        if device == "cuda":
            torch.cuda.manual_seed_all(seed)
        t = time.perf_counter()
        wav = model.generate(j["text"], language_id=j.get("lang", "en"), **settings).squeeze(0).numpy()
        sf.write(Path(out) / f"{j['id']}.wav", wav, model.sr)
        made.append({"id": j["id"], "seconds": round(len(wav) / model.sr, 3), "gen_seconds": round(time.perf_counter() - t, 2), "seed": seed})
        print(j["id"], f"{len(wav) / model.sr:.2f}s", file=sys.stderr, flush=True)
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", required=True, choices=["kokoro", "chatterbox"])
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    jobs = json.loads(Path(a.jobs).read_text(encoding="utf-8"))
    Path(a.out).mkdir(parents=True, exist_ok=True)
    if os.environ.get("PRIMER_VOICE_FAKE") == "1":
        made = fake(jobs, a.out)
    else:
        made = (kokoro if a.engine == "kokoro" else chatterbox)(jobs, a.out)
    print(json.dumps({"engine": a.engine, "made": made}))


if __name__ == "__main__":
    main()
