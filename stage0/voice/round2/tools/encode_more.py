"""Round 1's encoder with more patience, for the few clips it leaves too quiet.

Usage:
  python encode_more.py --wav <wav-dir> --clips <clips-dir> --report <encode.json>
      --only kokoro-bm_lewis-1,kokoro-bm_lewis-2 [--passes 20] [--gap 0.7] [--floor 20] [--lufs -16]

Round 1's encode.py sets one fixed gain, limits the peaks, measures the result
and corrects, at most five times. A deep voice with sharp peaks (Kokoro's
Lewis on a short line) can still be 2 dB under the target after five. This
does exactly the same steps, using round 1's own functions, but keeps
correcting for up to --passes rounds. Clips that were already on target come
out the same, so it is only run on the ones named in --only. Their m4a files
in --clips are replaced and their rows in --report are updated in place.
"""
import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "tools"))  # round 1's encoder
from encode import duration, measure, run, trim_filter  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", required=True)
    ap.add_argument("--clips", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--only", required=True)
    ap.add_argument("--passes", type=int, default=20)
    ap.add_argument("--lufs", type=float, default=-16.0)
    ap.add_argument("--floor", type=float, default=20.0)
    ap.add_argument("--gap", type=float, default=0.7)
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--ffprobe", default="ffprobe")
    args = ap.parse_args()

    clips = Path(args.clips)
    report = Path(args.report)
    rows = {r["file"]: r for r in json.loads(report.read_text(encoding="utf-8"))}
    with tempfile.TemporaryDirectory() as tmp:
        for stem in filter(None, args.only.split(",")):
            wav = Path(args.wav) / (stem + ".wav")
            raw_loud, _ = measure(args.ffmpeg, wav)
            trimmed = Path(tmp) / wav.name
            run([args.ffmpeg, "-hide_banner", "-y", "-i", str(wav), "-af",
                 trim_filter(raw_loud - args.floor, args.gap), "-ac", "1", str(trimmed)])
            raw_len, trim_len = duration(args.ffprobe, wav), duration(args.ffprobe, trimmed)
            loud, _ = measure(args.ffmpeg, trimmed)
            out = clips / (stem + ".m4a")
            gain = args.lufs - loud
            fades = f"afade=t=in:d=0.01,afade=t=out:st={max(trim_len - 0.05, 0):.3f}:d=0.05"
            ceiling = -3.0
            for n in range(args.passes):
                run([args.ffmpeg, "-hide_banner", "-y", "-i", str(trimmed), "-af",
                     f"volume={gain:.2f}dB,{fades},alimiter=limit={ceiling:.1f}dB:level=false:attack=2:release=40",
                     "-ar", "24000", "-ac", "1", "-c:a", "aac", "-b:a", "64k",
                     "-movflags", "+faststart", "-map_metadata", "-1", str(out)])
                got, peak = measure(args.ffmpeg, out)
                if abs(got - args.lufs) <= 0.25 and peak <= -1.0:
                    break
                gain += args.lufs - got
                if peak > -1.0:
                    ceiling -= peak + 1.5
            rows[out.name] = {"file": out.name, "duration": round(duration(args.ffprobe, out), 3),
                              "lufs": round(got, 2), "true_peak_db": round(peak, 2),
                              "trimmed_seconds": round(raw_len - trim_len, 3), "bytes": out.stat().st_size,
                              "passes": n + 1}
            print(out.name, rows[out.name])
    report.write_text(json.dumps(list(rows.values()), indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
