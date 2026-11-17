"""Round 2 gross-error check, in five languages: transcribe every clip and compare
with the text it should say.

Usage:
  python check_asr2.py --clips <clips-dir> --lines lines.json --out <asr.json>
      [--model large-v3] [--device cuda|cpu] [--ffmpeg ffmpeg] [--only <glob>]

File names must look like <engine>-<voice>-<n>.m4a, where n is the line number.
The same method as round 1's check_asr.py (which this builds on), plus:

  * English, Spanish, Italian: round 1's word-by-word comparison, with
    accents, case and punctuation ignored.
  * Hindi: word by word in Devanagari. "ok" needs the same letters. A
    difference only in nasal marks or the nukta dot (है / हैं) is "minor",
    because the recogniser cannot be trusted on those.
  * Japanese: no spaces, so letter by letter. The recogniser is free to write
    a word in kanji or kana (いい / 良い), so both sides are also turned into
    kana readings (pykakasi) and compared again; the same reading counts as ok.
  * For every clip, the recogniser's own guess at the language and how sure
    it was, and its average confidence in the words. A clip in the wrong
    language, or said so badly that it drifts toward another, shows up here.

  * The "sound after the last word" test is switched off for Japanese: the
    recogniser's word times are wrong there (it ends a long last word about
    a second early), so every clean clip would fail it.

What this cannot do: judge accent, rhythm, Japanese pitch accent, vowel
length or naturalness. A recogniser writes down what it expects to hear, so
it forgives a foreign accent, and it is trained on far less Hindi and
Japanese than English. A pass means "the right words are recognisable", not
"a native speaker would be happy".
"""
import argparse
import difflib
import fnmatch
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "tools"))  # round 1's helpers
from textnorm import diff as latin_diff, verdict as latin_verdict  # noqa: E402

HINDI_LOOSE = str.maketrans("", "", "ँं़")  # chandrabindu, anusvara, nukta


def letters(text):
    """Letters and marks only, composed: no punctuation, spaces kept."""
    text = unicodedata.normalize("NFC", text)
    return "".join(c if unicodedata.category(c)[0] in "LMN" else " " for c in text)


def seq_ops(a, b, join):
    ops = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            continue
        want, got = join.join(a[i1:i2]), join.join(b[j1:j2])
        ops.append({"expected": want, "heard": got,
                    "similarity": round(difflib.SequenceMatcher(None, want, got).ratio(), 2),
                    "words": max(i2 - i1, j2 - j1)})
    return ops


def check_hindi(expected, heard):
    a, b = letters(expected).split(), letters(heard).split()
    strict = seq_ops(a, b, " ")
    if not strict:
        return "ok", [], None
    loose = seq_ops([w.translate(HINDI_LOOSE) for w in a], [w.translate(HINDI_LOOSE) for w in b], " ")
    if not loose:
        return "minor", strict, "differs only in nasal marks or the nukta dot"
    return latin_verdict(loose), strict, None


_kakasi = None


def reading(text):
    """Hiragana reading of Japanese text, or None if pykakasi is missing."""
    global _kakasi
    if _kakasi is None:
        try:
            import pykakasi
            _kakasi = pykakasi.kakasi()
        except ImportError:
            _kakasi = False
    if not _kakasi:
        return None
    return "".join(part["hira"] for part in _kakasi.convert(text))


def check_japanese(expected, heard):
    a = letters(unicodedata.normalize("NFKC", expected)).replace(" ", "")
    b = letters(unicodedata.normalize("NFKC", heard)).replace(" ", "")
    if a == b:
        return "ok", [], None
    if reading("あ") is None:
        ops = seq_ops(list(a), list(b), "")
        return ("minor" if sum(o["words"] for o in ops) <= 2 else "flag"), ops, "pykakasi missing: compared as written"
    # 今日は is two different things: "kyou wa" (today...) and an old spelling of the greeting
    # "konnichiwa". The sentence to be said spells the greeting in kana, so its own 今日 is "kyou".
    # What the recogniser writes as 今日は could be either, so every choice is tried.
    want = reading(a.replace("今日", "きょう"))
    pieces = b.split("今日は")
    best = reading("きょうは".join(pieces))
    if best == want:
        return "ok", [], "same reading, written differently by the recogniser"
    for mask in range(1, 2 ** (len(pieces) - 1)):
        said = pieces[0]
        for i, piece in enumerate(pieces[1:]):
            said += ("こんにちは" if mask >> i & 1 else "きょうは") + piece
        said = reading(said)
        if said == want:
            return "minor", [], ("cannot tell: the recogniser wrote 今日は, which is both the greeting "
                                 "'konnichiwa' and 'kyou wa' (today). Right if read one way, wrong the other")
        if difflib.SequenceMatcher(None, want, said).ratio() > difflib.SequenceMatcher(None, want, best).ratio():
            best = said  # compare against the kindest reading of what was written
    ops = seq_ops(list(want), list(best), "")
    changed = sum(o["words"] for o in ops)
    whole = difflib.SequenceMatcher(None, want, best).ratio()
    if changed <= 2 and whole >= 0.9:
        return "minor", ops, "one or two kana differ"
    return "flag", ops, None


def check(lang, expected, heard):
    if lang == "hi":
        return check_hindi(expected, heard)
    if lang == "ja":
        return check_japanese(expected, heard)
    ops = latin_diff(expected, heard)
    return latin_verdict(ops), ops, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", required=True)
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--only", default="*", help="file name pattern, e.g. chatterbox-*")
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
        if not fnmatch.fnmatch(clip.name, args.only):
            continue
        n = int(re.search(r"-(\d+)\.m4a$", clip.name).group(1))
        line = lines[n]
        raw = subprocess.run([args.ffmpeg, "-v", "error", "-i", str(clip), "-f", "f32le", "-ac", "1",
                              "-ar", "16000", "-"], capture_output=True, check=True).stdout
        audio = np.frombuffer(raw, dtype=np.float32)
        guess, sure, _ = model.detect_language(audio)
        segments, _ = model.transcribe(audio, language=line["lang"], beam_size=5, temperature=0.0,
                                       condition_on_previous_text=False, vad_filter=False,
                                       word_timestamps=True)
        segments = list(segments)
        heard = " ".join(s.text.strip() for s in segments).strip()
        spoken = [w for s in segments for w in (s.words or [])]
        result, ops, note = check(line["lang"], line["text"], heard)
        tail = round(len(audio) / 16000 - spoken[-1].end, 2) if spoken else None
        # In Japanese the recogniser squeezes a long last word ("ありがとうございます") into well under
        # half a second, so the time left after it is not stray sound. The number is kept, the test is not.
        tail_usable = line["lang"] != "ja"
        row = {"file": clip.name, "lang": line["lang"], "heard": heard, "verdict": result, "differences": ops,
               "sound_after_last_word_seconds": tail,
               "long_tail": bool(tail_usable and tail is not None and tail > args.tail),
               "tail_test_usable": tail_usable,
               "language_guess": guess, "language_guess_sure": round(float(sure), 3),
               "word_confidence": round(float(np.mean([w.probability for w in spoken])), 3) if spoken else None}
        if note:
            row["note"] = note
        rows.append(row)
        print(clip.name, result, "tail", tail, guess, f"{sure:.2f}", "|", heard, flush=True)
    Path(args.out).write_text(json.dumps({"recogniser": f"faster-whisper {args.model} ({used})", "clips": rows},
                                         indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
