"""Listens to finished clips: whether they say the right words, and when each word is said. Run by
`primer voice`, inside the checking environment (faster-whisper and a wav2vec2 aligner).

  python hear.py --jobs <jobs.json> --clips <folder> --out <result.json> [--ffmpeg ffmpeg]

jobs.json is a list of { "id", "text" } (the words the clip should say); <clips>/<id>.m4a is each clip, as the
phone will play it. For each, result.json has:
  heard     what a speech recogniser (faster-whisper large-v3) heard
  verdict   ok, minor (one near-miss word) or flag (a wrong, missing or extra word)
  tail      seconds of sound after the last word heard (a breath or a hum when it's long)
  words     [[word, start, end], ...]: one per word of the text as written (split on spaces), found by forced
            alignment of the known text against the clip (wav2vec2, through torchaudio's forced_align)

A recogniser forgives accents and will write a word right that was said badly: this catches wrong, missing
and extra words, not a poor reading. English only.

With PRIMER_VOICE_FAKE=1 set (the tests), no model is loaded: it hears the text as written, except that
the first take of a line with the word "mumble" in it is heard wrong, and the words are spread evenly.
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from textnorm import diff, spoken_letters, verdict  # noqa: E402

SR = 16000
ALIGNER = "facebook/wav2vec2-base-960h"


def decode(ffmpeg, path):
    import numpy as np
    raw = subprocess.run([ffmpeg, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def even_words(text, seconds):
    ws = text.split()
    lead, tail = 0.15, 0.2
    step = max(0.05, (seconds - lead - tail) / max(1, len(ws)))
    return [[w, round(lead + k * step, 3), round(lead + k * step + step * 0.8, 3)] for k, w in enumerate(ws)]


def fake(jobs, clips, ffprobe):
    out = {}
    for j in jobs:
        p = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(Path(clips) / f"{j['id']}.m4a")], capture_output=True, text=True, check=True)
        seconds = float(p.stdout.strip())
        heard = j["text"]
        if "mumble" in j["text"].lower() and j.get("take", 1) == 1:
            heard = j["text"].lower().replace("mumble", "bumble rumble")
        ops = diff(j["text"], heard)
        out[j["id"]] = {"heard": heard, "verdict": verdict(ops), "differences": ops, "tail": 0.1, "words": even_words(j["text"], seconds), "seconds": round(seconds, 3)}
    return out


def real(jobs, clips, ffmpeg):
    if os.name == "nt":
        try:  # faster-whisper's CUDA libraries ship inside the torch wheel
            import torch
            lib = Path(torch.__file__).parent / "lib"
            os.add_dll_directory(str(lib))
            os.environ["PATH"] = str(lib) + os.pathsep + os.environ["PATH"]
        except Exception:
            pass
    import torch
    import torchaudio.functional as AF
    from faster_whisper import WhisperModel
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        whisper = WhisperModel("large-v3", device=device, compute_type="float16" if device == "cuda" else "int8")
    except Exception:
        whisper = WhisperModel("large-v3", device="cpu", compute_type="int8")
    processor = Wav2Vec2Processor.from_pretrained(ALIGNER)
    aligner = Wav2Vec2ForCTC.from_pretrained(ALIGNER).to(device).eval()
    vocab = processor.tokenizer.get_vocab()
    blank, gap = processor.tokenizer.pad_token_id, vocab["|"]

    out = {}
    for j in jobs:
        audio = decode(ffmpeg, Path(clips) / f"{j['id']}.m4a")
        seconds = len(audio) / SR
        segments, _ = whisper.transcribe(audio, language="en", beam_size=5, temperature=0.0, condition_on_previous_text=False, vad_filter=False, word_timestamps=True)
        segments = list(segments)
        heard = " ".join(s.text.strip() for s in segments).strip()
        said = [w for s in segments for w in (s.words or [])]
        ops = diff(j["text"], heard)
        tail = round(seconds - said[-1].end, 2) if said else None

        # forced alignment of the text as written: each written word owns the letters it is read as
        written = j["text"].split()
        tokens, owner = [], []
        for i, word in enumerate(written):
            for part in spoken_letters(word):
                if tokens:
                    tokens.append(gap)
                    owner.append(-1)
                for ch in part:
                    if ch in vocab:
                        tokens.append(vocab[ch])
                        owner.append(i)
        words = []
        spans = None
        if tokens:
            x = torch.from_numpy((audio - audio.mean()) / (audio.std() + 1e-7)).unsqueeze(0).to(device)
            with torch.inference_mode():
                log_probs = torch.log_softmax(aligner(x).logits, dim=-1)
            step = seconds / log_probs.shape[1]
            try:
                path, scores = AF.forced_align(log_probs, torch.tensor([tokens], device=device), blank=blank)
                spans = AF.merge_tokens(path[0], scores[0].exp(), blank=blank)
            except RuntimeError as e:
                # far too short for its words (a take cut off): no times, so it counts as a bad take and is made again
                print(j["id"], "can't be aligned:", str(e).splitlines()[-1][:160], file=sys.stderr, flush=True)
        if spans is not None:
            last_end = 0.0
            for i, word in enumerate(written):
                mine = [s for s, o in zip(spans, owner) if o == i]
                if not mine:  # a word with nothing to say (a dash): no time of its own
                    words.append([word, round(last_end, 3), round(last_end, 3)])
                    continue
                start, end = mine[0].start * step, mine[-1].end * step
                last_end = end
                words.append([word, round(start, 3), round(end, 3)])
        out[j["id"]] = {"heard": heard, "verdict": verdict(ops), "differences": ops, "tail": tail, "words": words, "seconds": round(seconds, 3)}
        print(j["id"], out[j["id"]]["verdict"], "|", heard, file=sys.stderr, flush=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--clips", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--ffprobe", default="ffprobe")
    a = ap.parse_args()
    jobs = json.loads(Path(a.jobs).read_text(encoding="utf-8"))
    res = fake(jobs, a.clips, a.ffprobe) if os.environ.get("PRIMER_VOICE_FAKE") == "1" else real(jobs, a.clips, a.ffmpeg)
    Path(a.out).write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
