"""Make clips with an engine that varies from take to take, and redo the ones that fail the word check.

Usage:
  python takes.py --work <dir> --lines lines.json
      --gen-python <python of the engine's environment> --gen <generator script>
      --check-python <python of the checking environment>
      [--max-takes 6] [--gap 0.7] [--stem-prefix chatterbox]
      -- <arguments passed on to the generator, without --lines, --out, --seed, --only>

The generator must accept --lines, --out, --seed and --only (a comma list of
clip names to redo), and write <engine>-<voice>-<n>.wav files plus an
<engine>.meta.json with a "clips" list.

Each round: generate into <work>/take-N/wav, encode with round 1's encode.py
into <work>/take-N/enc, check with check_asr2.py. A clip passes when the
recogniser hears the right words (verdict "ok" or "minor") and there is no
long stretch of sound after the last word. Passing clips are copied to
<work>/final (m4a) and <work>/final-wav. Failing clips are made again with a
new seed, up to --max-takes times; the last take is kept and marked "failed"
if none passes. Every discarded take is written down in <work>/takes.json
with what the recogniser heard, so the count of takes is honest.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROUND1 = HERE.parent.parent / "tools"


def run(cmd, log):
    with open(log, "a", encoding="utf-8") as f:
        f.write("\n$ " + " ".join(str(c) for c in cmd) + "\n")
        f.flush()
        subprocess.run([str(c) for c in cmd], stdout=f, stderr=subprocess.STDOUT, check=True)


def main():
    argv = sys.argv[1:]
    extra = []
    if "--" in argv:
        i = argv.index("--")
        argv, extra = argv[:i], argv[i + 1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True)
    ap.add_argument("--lines", required=True)
    ap.add_argument("--gen-python", required=True)
    ap.add_argument("--gen", required=True)
    ap.add_argument("--check-python", required=True)
    ap.add_argument("--max-takes", type=int, default=6)
    ap.add_argument("--gap", type=float, default=0.7)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args(argv)

    work = Path(args.work)
    final, final_wav = work / "final", work / "final-wav"
    final.mkdir(parents=True, exist_ok=True)
    final_wav.mkdir(parents=True, exist_ok=True)
    log = work / "takes.log"
    record = {"kept": {}, "discarded": []}
    redo = None
    for take in range(1, args.max_takes + 1):
        folder = work / f"take-{take}"
        wav, enc = folder / "wav", folder / "enc"
        cmd = [args.gen_python, args.gen, "--lines", args.lines, "--out", wav,
               "--seed", args.seed + 100 * (take - 1), *extra]
        if redo:
            cmd += ["--only", ",".join(sorted(redo))]
        run(cmd, log)
        run([sys.executable, ROUND1 / "encode.py", "--wav", wav, "--clips", enc,
             "--report", folder / "encode.json", "--gap", args.gap], log)
        run([args.check_python, HERE / "check_asr2.py", "--clips", enc, "--lines", args.lines,
             "--out", folder / "asr.json"], log)
        meta = {c["wav"][:-4]: c for c in
                json.loads(next(wav.glob("*.meta.json")).read_text(encoding="utf-8"))["clips"]}
        encoded = {r["file"][:-4]: r for r in json.loads((folder / "encode.json").read_text(encoding="utf-8"))}
        checked = json.loads((folder / "asr.json").read_text(encoding="utf-8"))
        redo = set()
        for row in checked["clips"]:
            stem = row["file"][:-4]
            bad = "words" if row["verdict"] == "flag" else "sound after the last word" if row["long_tail"] else None
            last = take == args.max_takes
            if bad and not last:
                redo.add(stem)
                record["discarded"].append({"file": row["file"], "take": take, "heard": row["heard"], "problem": bad,
                                            "sound_after_last_word_seconds": row["sound_after_last_word_seconds"]})
                continue
            shutil.copy2(enc / row["file"], final / row["file"])
            shutil.copy2(wav / (stem + ".wav"), final_wav / (stem + ".wav"))
            record["kept"][stem] = {"takes": take, "passed": not bad, **({"problem": bad} if bad else {}),
                                    "generation": meta[stem], "encode": encoded[stem], "check": row}
        print(f"take {take}: {len(checked['clips'])} made, {len(redo)} to redo", flush=True)
        record["recogniser"] = checked["recogniser"]
        (work / "takes.json").write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        if not redo:
            break


if __name__ == "__main__":
    main()
