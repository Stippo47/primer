"""Measure each voice's pitch and speaking rate from its finished clips.

Usage:
  python measure.py --clips <clips-dir> --lines lines.json --out <measure.json>
      [--langs en] [--ffmpeg ffmpeg]

File names must look like <engine>-<voice>-<n>.m4a. For every engine-voice
pair, over all of its clips in --langs together:

  pitch_hz        median of the voice's fundamental frequency over voiced
                  frames (librosa's pYIN tracker, 55 to 500 Hz, 10 ms steps)
  pitch_low_hz    10th percentile, and
  pitch_high_hz   90th percentile: how far the voice moves up and down
  words_per_minute  spoken words (numbers read out) divided by the total
                  length of the clips, which are already trimmed to the speech
  pause_share     share of the clip time that is quiet (40 dB under the peak
                  level): higher means longer pauses between phrases

These are numbers, not a listening test. A low pitch and a slow rate are what
an older narrator usually has, but they do not prove a voice sounds old.
Needs librosa and numpy (the Chatterbox environment has both).
"""
import argparse
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import librosa
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "tools"))  # round 1's helpers
from textnorm import words  # noqa: E402

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
    ap.add_argument("--ffmpeg", default="ffmpeg")
    args = ap.parse_args()

    lines = {l["n"]: l for l in json.loads(Path(args.lines).read_text(encoding="utf-8"))["lines"]}
    langs = set(args.langs.split(","))
    groups = defaultdict(list)
    for clip in sorted(Path(args.clips).glob("*.m4a")):
        m = re.match(r"(.+)-(\d+)\.m4a$", clip.name)
        if m and int(m.group(2)) in lines and lines[int(m.group(2))]["lang"] in langs:
            groups[m.group(1)].append((int(m.group(2)), clip))

    rows = []
    for key, clips in sorted(groups.items()):
        engine, voice = key.split("-", 1)
        f0s, seconds, quiet, total_frames, count = [], 0.0, 0, 0, 0
        for n, clip in clips:
            y = decode(args.ffmpeg, clip)
            seconds += len(y) / SR
            f0, voiced, _ = librosa.pyin(y, fmin=55, fmax=500, sr=SR, frame_length=1024, hop_length=160)
            f0s.append(f0[voiced & ~np.isnan(f0)])
            rms = librosa.feature.rms(y=y, frame_length=400, hop_length=160)[0]
            level = 20 * np.log10(np.maximum(rms, 1e-7))
            quiet += int((level < level.max() - 40).sum())
            total_frames += len(level)
            if lines[n]["lang"] == "en":
                count += len(words(lines[n]["text"], spell=True))
        f0 = np.concatenate(f0s)
        row = {"engine": engine, "voice": voice, "clips": len(clips), "seconds": round(seconds, 2),
               "pitch_hz": round(float(np.median(f0)), 1),
               "pitch_low_hz": round(float(np.percentile(f0, 10)), 1),
               "pitch_high_hz": round(float(np.percentile(f0, 90)), 1),
               "words_per_minute": round(count / seconds * 60, 1) if count else None,
               "pause_share": round(quiet / total_frames, 3)}
        rows.append(row)
        print(key, row["pitch_hz"], "Hz", row["words_per_minute"], "wpm", flush=True)
    Path(args.out).write_text(json.dumps({"method": __doc__.split("For every")[1].split("These are")[0].strip(),
                                          "voices": rows}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
