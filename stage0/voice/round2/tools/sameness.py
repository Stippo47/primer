"""Does a voice stay the same voice from line to line?

Usage:
  python sameness.py --clips <clips-dir> --lines lines.json --out <sameness.json>
      [--langs en] [--ve <ve.pt>]

File names must look like <engine>-<voice>-<n>.m4a. Every clip is turned into
a "voice print" by the speaker encoder that ships with Chatterbox (a small
network that maps a recording to 256 numbers describing who is speaking, not
what is said). For every engine-voice pair this reports how alike the prints
of its lines are, where 1.0 is identical. Measured here on Kokoro's own
voices: two lines by the same voice average about 0.90 (never under 0.80 for
a normal voice), and lines by two different voices of the same sex average
about 0.72 (0.64 to 0.89).

  sameness_mean  average likeness over every pair of lines
  sameness_min   the least alike pair

Kokoro's voices are fixed, so their scores show what "the same voice" looks
like on this scale. An engine that invents a voice from a description, or
samples at random, can score lower: its voice drifts between lines.
Needs the Chatterbox environment. --ve defaults to the encoder inside the
Chatterbox model files already in the Hugging Face cache.
"""
import argparse
import json
import re
import subprocess
from collections import defaultdict
from itertools import combinations
from pathlib import Path

import numpy as np
import torch
from chatterbox.models.voice_encoder import VoiceEncoder
from huggingface_hub import hf_hub_download

SR = 16000


def decode(ffmpeg, path):
    raw = subprocess.run([ffmpeg, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", required=True)
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--langs", default="en")
    ap.add_argument("--ve")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    args = ap.parse_args()

    path = args.ve or hf_hub_download("ResembleAI/chatterbox", "ve.pt")
    ve = VoiceEncoder()
    ve.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
    ve.eval()

    lines = {l["n"]: l for l in json.loads(Path(args.lines).read_text(encoding="utf-8"))["lines"]}
    langs = set(args.langs.split(","))
    groups = defaultdict(list)
    for clip in sorted(Path(args.clips).glob("*.m4a")):
        m = re.match(r"(.+)-(\d+)\.m4a$", clip.name)
        if m and int(m.group(2)) in lines and lines[int(m.group(2))]["lang"] in langs:
            groups[m.group(1)].append(clip)

    rows = []
    for key, clips in sorted(groups.items()):
        if len(clips) < 2:
            continue
        engine, voice = key.split("-", 1)
        prints = [ve.embeds_from_wavs([decode(args.ffmpeg, c)], sample_rate=SR)[0] for c in clips]
        prints = [p / np.linalg.norm(p) for p in prints]
        pairs = [float(np.dot(a, b)) for a, b in combinations(prints, 2)]
        rows.append({"engine": engine, "voice": voice, "clips": len(clips),
                     "sameness_mean": round(float(np.mean(pairs)), 3), "sameness_min": round(min(pairs), 3)})
        print(key, rows[-1]["sameness_mean"], rows[-1]["sameness_min"], flush=True)
    Path(args.out).write_text(json.dumps({"encoder": "Chatterbox voice encoder (ve.pt)", "voices": rows}, indent=2),
                              encoding="utf-8")


if __name__ == "__main__":
    main()
