"""Gather round 2's results into samples.json and copy the chosen clips into the repo.

Usage:
  python build_samples.py --work <work-dir> --round2 <round2-dir> [--notes notes.json]

<work-dir> is the scratch folder the other tools wrote into (see README.md
for the commands and the folder names used). Reads:

  fixed sets   Kokoro clips, which come out the same every time: the
               generator's kokoro.meta.json, encode.py's report and
               check_asr2.py's result for each set in FIXED below
  takes sets   engines that vary: takes.py's takes.json in each TAKES folder
  measure.json, age.json, sameness.json   over <work>/pool, every English clip

chosen.json (beside this script) lists which voices are put forward. Their
clips are copied to <round2>/clips; everything else stays in the work
folder and is described by its numbers only. notes.json (beside this script)
holds the hand-written parts: engines, licences, findings.
"""
import argparse
import json
import shutil
from collections import defaultdict
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIXED = [  # (generator output, encoded clips, encode report, check result); later sets replace earlier rows
    ("wav-kokoro-en", "enc-kokoro-en", "enc-kokoro-en.json", "asr-kokoro-en.json"),
    ("wav-kokoro-en", "enc-nicole", "enc-nicole.json", "asr-nicole.json"),
    ("wav-kokoro-blend", "enc-kokoro-blend", "enc-kokoro-blend.json", "asr-kokoro-blend.json"),
    ("wav-kokoro-lang", "enc-kokoro-lang", "enc-kokoro-lang.json", "asr-kokoro-lang.json"),
]
TAKES = ["cb-en2", "cb-lang", "cb-ja2-written", "cb-ja2-kana", "qwen-reuse2"]
SKIP = {("cb-lang", "chatterbox-default-7")}  # made before the Japanese check was fixed; redone in cb-ja2-written


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True)
    ap.add_argument("--round2", required=True)
    ap.add_argument("--notes", default=str(HERE / "notes.json"))
    args = ap.parse_args()
    work, round2 = Path(args.work), Path(args.round2)
    lines = {l["n"]: l for l in load(HERE / "lines.json")["lines"]}
    chosen = load(HERE / "chosen.json")
    notes = load(args.notes)
    catalogue = {v["id"]: v for v in load(HERE / "kokoro_voices.json")["voices"]}

    clips, source, discarded = {}, {}, []  # by stem
    for wav, enc, report, asr in FIXED:
        meta = load(work / wav / "kokoro.meta.json")
        voices = {v["voice"]: v for v in meta["voices"]}
        made = {c["wav"][:-4]: c for c in meta["clips"]}
        encoded = {r["file"][:-4]: r for r in load(work / report)}
        for row in load(work / asr)["clips"]:
            stem = row["file"][:-4]
            g, v = made[stem], voices[made[stem]["voice"]]
            settings = {"speed": g["speed"], **({"blend": v["blend"], "front_end": v["lang_code"]} if "blend" in v else {})}
            clips[stem] = {"engine": "kokoro", "voice": g["voice"], "line": g["line"], "settings": settings,
                           "generation": g, "encode": encoded[stem], "check": row, "takes": 1, "passed": True}
            source[stem] = work / enc
    for folder in TAKES:
        path = work / folder / "takes.json"
        if not path.exists():
            continue
        record = load(path)
        for d in record["discarded"]:
            if (folder, d["file"][:-4]) not in SKIP:
                discarded.append(d)
        for stem, kept in record["kept"].items():
            if (folder, stem) in SKIP:
                continue
            g = kept["generation"]
            settings = g.get("settings") or {"mode": g.get("mode"), "description": g.get("description")}
            clips[stem] = {"engine": stem.split("-")[0], "voice": g["voice"], "line": g["line"], "settings": settings,
                           "generation": g, "encode": kept["encode"], "check": kept["check"],
                           "takes": kept["takes"], "passed": kept["passed"]}
            source[stem] = work / folder / "final"

    measured = defaultdict(dict)  # by "<engine>-<voice>"
    for name in ("measure.json", "age.json", "sameness.json"):
        for row in load(work / name)["voices"]:
            key = f"{row.pop('engine')}-{row.pop('voice')}"
            row.pop("clips", None)
            measured[key].update(row)

    by_voice = defaultdict(list)
    for stem, c in clips.items():
        by_voice[f"{c['engine']}-{c['voice']}"].append(c)

    def summary(key):
        rows = by_voice[key]
        takes = sum(c["takes"] for c in rows)
        return {"clips": len(rows), "takes": takes,
                "right_first_time": sum(c["takes"] == 1 and c["passed"] for c in rows),
                "failed_after_all_takes": sum(not c["passed"] for c in rows),
                "verdicts": sorted({c["check"]["verdict"] for c in rows}),
                "long_tails": sum(c["check"]["long_tail"] for c in rows)}

    put_forward = set(chosen["english"]) | {v for vs in chosen["languages"].values() for v in vs} | set(chosen["kept_as_evidence"])
    voices = []
    for key in sorted(by_voice):
        engine, voice = key.split("-", 1)
        row = {"engine": engine, "voice": voice, "langs": sorted({lines[c["line"]]["lang"] for c in by_voice[key]})}
        if voice in catalogue:
            row.update({k: catalogue[voice][k] for k in ("accent", "sex", "grade")})
        first = by_voice[key][0]
        row["settings"] = first["settings"]
        row.update(measured.get(key, {}))
        row["check"] = summary(key)
        row["clips_in_repo"] = key in put_forward
        row["put_forward"] = key in chosen["english"] or any(key in vs for vs in chosen["languages"].values())
        if key in chosen.get("why", {}):
            row["why"] = chosen["why"][key]
        voices.append(row)
    for key in chosen["round1_reference"]:  # round 1's clips, measured the same way for comparison
        engine, voice = key.split("@")[0].split("-", 1)
        voices.append({"engine": engine, "voice": voice, "langs": ["en"], "from_round": 1,
                       **measured.get(key, {}), "clips_in_repo": False, "put_forward": False})

    out_clips = round2 / "clips"
    out_clips.mkdir(parents=True, exist_ok=True)
    wanted = set()
    rows = []
    for stem in sorted(clips, key=lambda s: (clips[s]["engine"], clips[s]["voice"], clips[s]["line"])):
        c = clips[stem]
        if f"{c['engine']}-{c['voice']}" not in put_forward:
            continue
        shutil.copy2(source[stem] / (stem + ".m4a"), out_clips / (stem + ".m4a"))
        wanted.add(stem + ".m4a")
        g, e, k = c["generation"], c["encode"], c["check"]
        row = {"engine": c["engine"], "voice": c["voice"], "line": c["line"], "lang": lines[c["line"]]["lang"],
               "text": lines[c["line"]]["text"]}
        if "sent_to_engine" in g:
            row["sent_to_engine"] = g["sent_to_engine"]
        if "sounds" in g:
            row["sounds_from_front_end"] = g["sounds"]
        row.update({"settings": c["settings"], **({"seed": g["seed"]} if "seed" in g else {}),
                    "file": f"clips/{stem}.m4a", "duration": e["duration"], "lufs": e["lufs"],
                    "true_peak_db": e["true_peak_db"], "bytes": e["bytes"],
                    "generation_seconds": g["gen_seconds"], "takes": c["takes"], "passed_check": c["passed"],
                    "check": {key: k[key] for key in k if key != "file"}})
        rows.append(row)
    for old in out_clips.glob("*.m4a"):  # a voice dropped from chosen.json leaves no stale clips behind
        if old.name not in wanted:
            old.unlink()

    board = load(round2 / "board" / "board.json") if (round2 / "board" / "board.json").exists() else []
    takes_by_engine = defaultdict(lambda: {"clips": 0, "takes": 0, "right_first_time": 0, "failed_after_all_takes": 0})
    for c in clips.values():
        t = takes_by_engine[c["engine"]]
        t["clips"] += 1
        t["takes"] += c["takes"]
        t["right_first_time"] += c["takes"] == 1 and c["passed"]
        t["failed_after_all_takes"] += not c["passed"]

    out = {
        "made": date.today().isoformat(),
        "round": 2,
        "naturalness": "Not judged. No person has listened to these clips. Words were checked by a recogniser; "
                       "pitch, pace, age and line-to-line sameness are machine measurements.",
        "format": "AAC-LC in M4A, mono, 24 kHz, 64 kbps, one file per line; board/ has one joined file per voice",
        "loudness_target_lufs": -16,
        "clips_total_bytes": sum(r["bytes"] for r in rows),
        **notes,
        "lines": [lines[n] for n in sorted(lines)],
        "takes_by_engine": takes_by_engine,
        "voices": voices,
        "board": board,
        "check_discarded_takes": discarded,
        "clips": rows,
    }
    (round2 / "samples.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(len(rows), "clips in repo,", len(voices), "voices described,", len(discarded), "discarded takes")


if __name__ == "__main__":
    main()
