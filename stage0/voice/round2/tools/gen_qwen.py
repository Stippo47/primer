"""Round 2: a narrator made from a written description, with Qwen3-TTS VoiceDesign.

Usage:
  python gen_qwen.py --lines lines.json --out <wav-dir>
      --voice "elder_m=An elderly man with a warm, deep, unhurried voice..."
      [--voice "name=description"] ...
      [--mode describe|reuse] [--langs en] [--seed 1] [--only qwen-elder_m-3,...]

No recording of any person is used. The model is given a description in
words and invents a voice to match.

  --mode describe  every line is made from the description alone. The model
                   invents the voice afresh each time, so it can drift from
                   line to line.
  --mode reuse     the publisher's own recipe for a steady voice: make one
                   reference line from the description, then hand that
                   made-up recording to the companion Base model as the voice
                   for every line. The only thing copied is the model's own
                   invention. The reference is saved as
                   <reference-dir>/qwen-<voice>-reference.wav and used again
                   if it is already there, so retakes and later lines keep
                   the same voice. --reference-dir defaults to
                   <out>/../reference.

Each clip is seeded with --seed plus its line number (the reference with
--seed alone) and can be regenerated with --only. Names must not contain a
hyphen. Writes <out>/qwen-<voice>-<n>.wav and <out>/qwen.meta.json.
"""
import argparse
import json
import time
from importlib.metadata import version
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

DESIGN = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
BASE = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
LANGUAGE = {"en": "English", "ja": "Japanese", "es": "Spanish", "it": "Italian"}
REFERENCE = ("The storm began far out at sea, where the water was warm and the air was still. "
             "Nobody on the coast knew what was coming.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", action="append", required=True)
    ap.add_argument("--mode", choices=["describe", "reuse"], default="describe")
    ap.add_argument("--langs", default="en")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--only", default="")
    ap.add_argument("--reference-dir")
    args = ap.parse_args()

    spec = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    only = set(filter(None, args.only.split(",")))
    langs = set(args.langs.split(","))
    voices = [v.partition("=")[::2] for v in args.voice]
    assert all("-" not in name for name, _ in voices), "voice names must not contain a hyphen"

    def load(repo):
        return Qwen3TTSModel.from_pretrained(repo, device_map="cuda:0", dtype=torch.bfloat16)

    def seeded(seed):
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

    design = load(DESIGN)
    prompts, sr = {}, None
    if args.mode == "reuse":
        refs = {}
        ref_dir = Path(args.reference_dir) if args.reference_dir else out.parent / "reference"
        ref_dir.mkdir(parents=True, exist_ok=True)
        for name, description in voices:
            ref = ref_dir / f"qwen-{name}-reference.wav"
            if not ref.exists():  # a retake keeps the voice it already has
                seeded(args.seed)
                wavs, sr = design.generate_voice_design(text=REFERENCE, language="English", instruct=description)
                sf.write(ref, wavs[0], sr)
            refs[name] = ref
        del design
        torch.cuda.empty_cache()
        base = load(BASE)
        for name, ref in refs.items():
            audio, ref_sr = sf.read(ref, dtype="float32")
            prompts[name] = base.create_voice_clone_prompt(ref_audio=(audio, ref_sr), ref_text=REFERENCE)

    clips = []
    for name, description in voices:
        for line in spec["lines"]:
            stem = f"qwen-{name}-{line['n']}"
            if line["lang"] not in langs or (only and stem not in only):
                continue
            seed = args.seed + line["n"]
            seeded(seed)
            t = time.perf_counter()
            if args.mode == "reuse":
                wavs, sr = base.generate_voice_clone(text=line["text"], language=LANGUAGE[line["lang"]],
                                                     voice_clone_prompt=prompts[name])
            else:
                wavs, sr = design.generate_voice_design(text=line["text"], language=LANGUAGE[line["lang"]],
                                                        instruct=description)
            secs = time.perf_counter() - t
            audio = np.asarray(wavs[0], dtype=np.float32)
            sf.write(out / (stem + ".wav"), audio, sr)
            clips.append({"voice": name, "line": line["n"], "lang": line["lang"], "wav": stem + ".wav",
                          "seed": seed, "mode": args.mode, "description": description,
                          "gen_seconds": round(secs, 3), "raw_seconds": round(len(audio) / sr, 3)})
            print(stem, f"{secs:.2f}s for {len(audio) / sr:.2f}s", flush=True)

    meta = {"engine": "qwen",
            "model": DESIGN + (" for the reference line, then " + BASE if args.mode == "reuse" else ""),
            "version": f"qwen-tts {version('qwen-tts')}, torch {torch.__version__}",
            "device": torch.cuda.get_device_name(0), "sample_rate": sr,
            "peak_vram_mb": round(torch.cuda.max_memory_reserved() / 2**20),
            **({"reference_text": REFERENCE} if args.mode == "reuse" else {}), "clips": clips}
    (out / "qwen.meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
