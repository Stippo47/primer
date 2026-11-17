"""Word timings by forced alignment: the text is known, so find where each word sits.

Usage:
  python align.py --clips <clips-dir> --lines lines.json --line 2 --out <timings.json>
      [--model facebook/wav2vec2-base-960h] [--ffmpeg ffmpeg]
      [--first kokoro-af_heart,chatterbox-default]

Aligns every <engine>-<voice>-<line>.m4a in --clips. The finished m4a is
aligned, not the wav master, so the times match what the phone plays.
English only: the acoustic model knows the 26 letters and the apostrophe.
Numbers are spelled out for the aligner ("26" is matched as "twenty six")
and reported under the word as written.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

import numpy as np
import torch
import torchaudio.functional as AF
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

from textnorm import spell_numbers, strip_accents

SR = 16000


def decode(ffmpeg, path):
    raw = subprocess.run([ffmpeg, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def spoken(word):
    """The letters the aligner should hear for one written word, as a list of spoken words."""
    text = strip_accents(spell_numbers(word)).upper().replace("’", "'")
    text = re.sub(r"[-–—]", " ", text)
    return re.sub(r"[^A-Z' ]", "", text).split()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", required=True)
    ap.add_argument("--lines", required=True)
    ap.add_argument("--line", type=int, default=2)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="facebook/wav2vec2-base-960h")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--first", default="", help="comma list of <engine>-<voice> that are each engine's first voice")
    args = ap.parse_args()

    lines = {l["n"]: l for l in json.loads(Path(args.lines).read_text(encoding="utf-8"))["lines"]}
    text = lines[args.line]["text"]
    written = text.split()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = Wav2Vec2Processor.from_pretrained(args.model)
    model = Wav2Vec2ForCTC.from_pretrained(args.model).to(device).eval()
    vocab = processor.tokenizer.get_vocab()
    blank = processor.tokenizer.pad_token_id
    gap = vocab["|"]

    tokens, owner = [], []  # owner[i] = index of the written word token i belongs to, or -1 for a gap
    for i, word in enumerate(written):
        for part in spoken(word):
            if tokens:
                tokens.append(gap)
                owner.append(-1)
            for ch in part:
                tokens.append(vocab[ch])
                owner.append(i)

    clips = []
    for clip in sorted(Path(args.clips).glob(f"*-{args.line}.m4a")):
        engine, voice = clip.stem.rsplit("-", 1)[0].split("-", 1)
        audio = decode(args.ffmpeg, clip)
        seconds = len(audio) / SR
        x = torch.from_numpy((audio - audio.mean()) / (audio.std() + 1e-7)).unsqueeze(0).to(device)
        with torch.inference_mode():
            log_probs = torch.log_softmax(model(x).logits, dim=-1)
        step = seconds / log_probs.shape[1]
        path, scores = AF.forced_align(log_probs, torch.tensor([tokens], device=device), blank=blank)
        spans = AF.merge_tokens(path[0], scores[0].exp(), blank=blank)
        assert len(spans) == len(tokens), "aligner lost a token"
        words = []
        for i, word in enumerate(written):
            mine = [s for s, o in zip(spans, owner) if o == i]
            frames = sum(s.end - s.start for s in mine)
            words.append({"word": word,
                          "start": round(mine[0].start * step, 3),
                          "end": round(mine[-1].end * step, 3),
                          "score": round(sum(s.score * (s.end - s.start) for s in mine) / frames, 3)})
        clips.append({"engine": engine, "voice": voice, "file": clip.name, "duration": round(seconds, 3),
                      "mean_score": round(sum(w["score"] for w in words) / len(words), 3), "words": words})
        print(clip.name, " ".join(f"{w['word']}@{w['start']:.2f}" for w in words))

    named = set(filter(None, args.first.split(",")))
    seen = {}
    for c in clips:  # an engine's first voice: the one named in --first, else the first by file name
        if named:
            c["first_voice"] = f"{c['engine']}-{c['voice']}" in named
        else:
            c["first_voice"] = seen.setdefault(c["engine"], c["voice"]) == c["voice"]
    out = {"line": args.line, "text": text,
           "method": f"CTC forced alignment, torchaudio forced_align over {args.model}, about 20 ms steps",
           "units": "seconds from the start of the clip",
           "clips": clips}
    Path(args.out).write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
