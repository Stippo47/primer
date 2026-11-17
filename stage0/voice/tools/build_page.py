"""Gather everything about the clips into samples.json and build index.html.

Usage:
  python build_page.py --lines lines.json --engines engines.json
      --meta <wav-dir with *.meta.json> --encode <encode.json> --asr <asr.json>
      --timings <timings.json> --template page.template.html --out <voice-dir>
      [--earlier-asr <take-1 asr.json> <take-2 asr.json> ...]

--earlier-asr lists the recognition checks of takes that were thrown away,
in order, so the record shows what each retake was for.
The page reads samples.json and timings.json when served over http, and
carries a copy of both for when it is opened straight from disk.
"""
import argparse
import datetime
import json
from pathlib import Path


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser()
    for name in ("lines", "engines", "meta", "encode", "asr", "timings", "template", "out"):
        ap.add_argument("--" + name, required=True)
    ap.add_argument("--earlier-asr", nargs="*", default=[])
    args = ap.parse_args()

    spec, info = read(args.lines), read(args.engines)
    encoded = {r["file"]: r for r in read(args.encode)}
    asr = read(args.asr)
    checks = {r["file"]: r for r in asr["clips"]}
    lines = {l["n"]: l for l in spec["lines"]}

    engines, clips = [], []
    for e in info["engines"]:
        meta = read(Path(args.meta) / (e["id"] + ".meta.json"))
        order = [v["id"] for v in e["voices"]]
        made = sorted(meta["clips"], key=lambda c: (c["line"], order.index(c["voice"])))
        gen, audio = sum(c["gen_seconds"] for c in made), sum(c["raw_seconds"] for c in made)
        engines.append({
            **{k: e[k] for k in ("id", "name", "model", "source", "licence", "french", "voices", "notes")},
            "version": meta["version"],
            "graphics_card": meta["device"],
            "seconds_per_audio_second": round(gen / audio, 3),
            "typical_15_word_line_seconds": meta["bench_15_words_seconds"],
            "typical_15_word_line_audio_seconds": meta["bench_15_words_audio_seconds"],
            "peak_vram_mb": meta["peak_vram_mb"],
            "model_load_seconds": meta["load_seconds"],
            "settings": meta["settings"],
            "retakes": sum(c.get("takes", 1) - 1 for c in made),
        })
        for c in made:
            m4a = c["wav"].replace(".wav", ".m4a")
            enc, chk = encoded[m4a], checks[m4a]
            clips.append({
                "engine": e["id"], "voice": c["voice"], "line": c["line"], "text": lines[c["line"]]["text"],
                "file": "clips/" + m4a, "duration": enc["duration"], "lufs": enc["lufs"],
                "true_peak_db": enc["true_peak_db"], "bytes": enc["bytes"],
                "generation_seconds": c["gen_seconds"], "takes": c.get("takes", 1),
                "check": {k: chk[k] for k in ("heard", "verdict", "differences",
                                              "sound_after_last_word_seconds", "long_tail")},
            })
    clips.sort(key=lambda c: c["line"])

    takes = {c["file"]: c["takes"] for c in clips}
    discarded = []
    for i, path in enumerate(args.earlier_asr, start=1):
        for r in read(path)["clips"]:
            if takes.get("clips/" + r["file"], 1) > i and (r["verdict"] != "ok" or r["long_tail"]):
                discarded.append({"file": "clips/" + r["file"], "take": i, "heard": r["heard"],
                                  "problem": "words" if r["verdict"] != "ok" else "sound after the last word",
                                  "sound_after_last_word_seconds": r["sound_after_last_word_seconds"]})

    for l in spec["lines"]:
        note = info.get("line_notes", {}).get(str(l["n"]))
        if note:
            l["note"] = note
    flagged = [c["file"] for c in clips if c["check"]["verdict"] != "ok" or c["check"]["long_tail"]]
    page_notes = list(info.get("page_notes", []))
    for e in engines:
        mine = [c for c in clips if c["engine"] == e["id"]]
        redone = sum(1 for c in mine if c["takes"] > 1)
        if redone:
            page_notes.append(f"{e['name']}: {redone} of its {len(mine)} clips came out with a wrong word or a "
                              f"stray sound on the first try and were made again ({e['retakes']} retakes in all). "
                              "You are hearing the takes that passed the word check.")
    samples = {
        "made": datetime.date.today().isoformat(),
        "naturalness": "Not judged. No person has listened to these clips; the check below only compares words.",
        "format": "AAC-LC in M4A, mono, 24 kHz, 64 kbps, one file per line",
        "loudness_target_lufs": -16,
        "clips_total_bytes": sum(c["bytes"] for c in clips),
        "speed_note": "Speed is seconds of computing per second of speech on one " + engines[0]["graphics_card"]
                      + ", model already loaded. Memory is the peak graphics memory PyTorch held.",
        "lines": spec["lines"],
        "engines": engines,
        "skipped": info["skipped"],
        "page_notes": page_notes,
        "check": {
            "recogniser": asr["recogniser"],
            "what_it_catches": "Wrong, missing or extra words, and sound that carries on more than 0.8 s after "
                               "the last word. It forgives accents, so a badly said foreign word can still pass.",
            "flagged_clips": flagged,
            "discarded_takes": discarded,
        },
        "clips": clips,
    }
    out = Path(args.out)
    (out / "samples.json").write_text(json.dumps(samples, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    def inline(obj):
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    page = Path(args.template).read_text(encoding="utf-8")
    page = page.replace("{{SAMPLES}}", inline(samples)).replace("{{TIMINGS}}", inline(read(args.timings)))
    (out / "index.html").write_text(page, encoding="utf-8", newline="\n")
    print(len(clips), "clips,", samples["clips_total_bytes"], "bytes,", len(flagged), "flagged,",
          len(discarded), "discarded takes")


if __name__ == "__main__":
    main()
