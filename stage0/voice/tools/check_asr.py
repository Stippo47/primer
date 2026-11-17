"""Gross-error check: transcribe every clip and compare with the text it should say.

Usage:
  python check_asr.py --clips <clips-dir> --lines lines.json --out <asr.json>
      [--model large-v3] [--device cuda|cpu] [--ffmpeg ffmpeg]

File names must look like <engine>-<voice>-<n>.m4a, where n is the line number.
This catches wrong, missing or extra words, and sound that carries on after
the last word. It says nothing about how natural a voice sounds, and a
recogniser forgives accents: it will write a foreign word correctly even
when it was said badly.
"""
import argparse
import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np

from textnorm import diff, verdict


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", required=True)
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--tail", type=float, default=0.8, help="seconds of sound after the last word that count as long")
    args = ap.parse_args()

    if args.device == "cuda" and os.name == "nt":
        try:  # borrow the CUDA libraries that ship inside the torch wheel
            import torch
            os.add_dll_directory(str(Path(torch.__file__).parent / "lib"))
            os.environ["PATH"] = str(Path(torch.__file__).parent / "lib") + os.pathsep + os.environ["PATH"]
        except Exception:
            pass
    from faster_whisper import WhisperModel

    try:
        model = WhisperModel(args.model, device=args.device,
                             compute_type="float16" if args.device == "cuda" else "int8")
        used = args.device
    except Exception as err:
        print("falling back to cpu:", err)
        model = WhisperModel(args.model, device="cpu", compute_type="int8")
        used = "cpu"

    lines = {l["n"]: l for l in json.loads(Path(args.lines).read_text(encoding="utf-8"))["lines"]}
    rows = []
    for clip in sorted(Path(args.clips).glob("*.m4a")):
        n = int(re.search(r"-(\d+)\.m4a$", clip.name).group(1))
        line = lines[n]
        raw = subprocess.run([args.ffmpeg, "-v", "error", "-i", str(clip), "-f", "f32le", "-ac", "1",
                              "-ar", "16000", "-"], capture_output=True, check=True).stdout
        audio = np.frombuffer(raw, dtype=np.float32)
        segments, _ = model.transcribe(audio, language=line["lang"], beam_size=5, temperature=0.0,
                                       condition_on_previous_text=False, vad_filter=False,
                                       word_timestamps=True)
        segments = list(segments)
        heard = " ".join(s.text.strip() for s in segments).strip()
        spoken = [w for s in segments for w in (s.words or [])]
        ops = diff(line["text"], heard)
        # Silence is already trimmed, so a long stretch after the last word is some other sound:
        # a breath, a hum, a half-word. Recogniser word times are rough (about 0.2 s).
        tail = round(len(audio) / 16000 - spoken[-1].end, 2) if spoken else None
        rows.append({"file": clip.name, "heard": heard, "verdict": verdict(ops), "differences": ops,
                     "sound_after_last_word_seconds": tail, "long_tail": bool(tail is not None and tail > args.tail)})
        print(clip.name, rows[-1]["verdict"], "tail", tail, "|", heard)
    Path(args.out).write_text(json.dumps({"recogniser": f"faster-whisper {args.model} ({used})", "clips": rows},
                                         indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
