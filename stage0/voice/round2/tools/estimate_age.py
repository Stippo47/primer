"""A machine's guess at how old each voice sounds.

Usage:
  python estimate_age.py --clips <clips-dir> --lines lines.json --out <age.json>
      [--langs en] [--model audeering/wav2vec2-large-robust-24-ft-age-gender]

File names must look like <engine>-<voice>-<n>.m4a. For every engine-voice
pair, each clip in --langs is given to audEERING's age and gender model, and
the guesses are averaged, weighted by clip length.

Read the result as a ranking, not as an age. The model was trained on real
people and has never been checked on computer voices; even on real speech a
guess like this is rough, off by several years either way. It is here
because nobody on this side can listen: it is the only measure of "sounds
older" besides pitch and pace.

The model is used only to measure. Nothing from it ships. Its licence
(CC BY-NC-SA 4.0) does not allow commercial use.
Needs torch and transformers (the checking environment has both).
"""
import argparse
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from transformers import Wav2Vec2Processor
from transformers.models.wav2vec2.modeling_wav2vec2 import Wav2Vec2Model, Wav2Vec2PreTrainedModel

SR = 16000


class ModelHead(nn.Module):
    def __init__(self, config, num_labels):
        super().__init__()
        self.dense = nn.Linear(config.hidden_size, config.hidden_size)
        self.dropout = nn.Dropout(config.final_dropout)
        self.out_proj = nn.Linear(config.hidden_size, num_labels)

    def forward(self, features):
        x = self.dropout(features)
        x = torch.tanh(self.dense(x))
        return self.out_proj(self.dropout(x))


class AgeGenderModel(Wav2Vec2PreTrainedModel):
    """The model layout from the publisher's model card."""

    def __init__(self, config):
        super().__init__(config)
        self.config = config
        self.wav2vec2 = Wav2Vec2Model(config)
        self.age = ModelHead(config, 1)
        self.gender = ModelHead(config, 3)
        self.post_init()

    def forward(self, input_values):
        hidden = self.wav2vec2(input_values)[0].mean(dim=1)
        return self.age(hidden), torch.softmax(self.gender(hidden), dim=1)


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
    ap.add_argument("--model", default="audeering/wav2vec2-large-robust-24-ft-age-gender")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = Wav2Vec2Processor.from_pretrained(args.model)
    model = AgeGenderModel.from_pretrained(args.model).to(device).eval()

    lines = {l["n"]: l for l in json.loads(Path(args.lines).read_text(encoding="utf-8"))["lines"]}
    langs = set(args.langs.split(","))
    groups = defaultdict(list)
    for clip in sorted(Path(args.clips).glob("*.m4a")):
        m = re.match(r"(.+)-(\d+)\.m4a$", clip.name)
        if m and int(m.group(2)) in lines and lines[int(m.group(2))]["lang"] in langs:
            groups[m.group(1)].append(clip)

    rows = []
    for key, clips in sorted(groups.items()):
        engine, voice = key.split("-", 1)
        ages, sexes, weights = [], [], []
        for clip in clips:
            y = decode(args.ffmpeg, clip)
            x = processor(y, sampling_rate=SR, return_tensors="pt").input_values.to(device)
            with torch.inference_mode():
                age, sex = model(x)
            ages.append(float(age[0, 0]) * 100)
            sexes.append(sex[0].cpu().numpy())
            weights.append(len(y))
        sex = np.average(np.stack(sexes), axis=0, weights=weights)  # female, male, child
        row = {"engine": engine, "voice": voice,
               "age_guess": round(float(np.average(ages, weights=weights)), 1),
               "age_guess_per_clip": [round(a, 1) for a in ages],
               "heard_as": ["female", "male", "child"][int(sex.argmax())],
               "heard_as_sure": round(float(sex.max()), 2)}
        rows.append(row)
        print(key, row["age_guess"], row["heard_as"], row["age_guess_per_clip"], flush=True)
    Path(args.out).write_text(json.dumps({"model": args.model, "voices": rows}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
