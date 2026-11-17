"""Turn wav masters into small, equally loud m4a clips.

Usage:
  python encode.py --wav <wav-dir> --clips <clips-dir> --report <encode.json>
      [--lufs -16] [--floor 20] [--gap 0.7] [--ffmpeg ffmpeg] [--ffprobe ffprobe]

For every <name>.wav in --wav:
  1. measure integrated loudness (EBU R128, through ffmpeg's loudnorm filter);
  2. trim the start and end back to where the sound rises above a floor set
     --floor dB under that loudness, keeping 60 ms before the first sound and
     150 ms after the last, and end the clip at the first pause longer than
     --gap seconds. A floor tied to the speech level treats a quiet engine
     and a hissy one alike: faint noise after the last word goes, and so
     does anything an engine adds after a long pause. Do not use this on a
     line that is meant to hold a long pause;
  3. apply one fixed gain to reach the target, a 10 ms fade in, a 50 ms fade
     out, and a true-peak safety limiter;
  4. encode AAC-LC, mono, 64 kbps, 24 kHz, into <clips>/<name>.m4a;
  5. measure the finished file again and record what it really came out as.

A fixed gain is used instead of loudnorm's own second pass because that pass
falls back to a moving gain on short clips, which can pump on a 2-second line.
"""
import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)


def measure(ffmpeg, path):
    p = run([ffmpeg, "-hide_banner", "-nostats", "-i", str(path), "-af",
             "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
    block = re.findall(r"\{[^{}]*\}", p.stderr, flags=re.S)[-1]
    data = json.loads(block)
    return float(data["input_i"]), float(data["input_tp"])


def duration(ffprobe, path):
    p = run([ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(p.stdout.strip())


def trim_filter(floor_db, gap):
    f = f"{floor_db:.1f}dB"
    # head: drop the lead-in; and stop at the first pause longer than `gap`, which no single line has inside it
    head = (f"silenceremove=start_periods=1:start_threshold={f}:start_silence=0.06"
            f":stop_periods=1:stop_duration={gap}:stop_threshold={f}:stop_silence=0.15")
    # tail: walk back from the end to the last sound
    tail = f"silenceremove=start_periods=1:start_threshold={f}:start_silence=0.15"
    return f"{head},areverse,{tail},areverse"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", required=True)
    ap.add_argument("--clips", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--lufs", type=float, default=-16.0)
    ap.add_argument("--floor", type=float, default=20.0, help="dB under the speech loudness that counts as silence")
    ap.add_argument("--gap", type=float, default=0.7, help="a pause this long, in seconds, ends the clip")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--ffprobe", default="ffprobe")
    args = ap.parse_args()

    clips = Path(args.clips)
    clips.mkdir(parents=True, exist_ok=True)
    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        for wav in sorted(Path(args.wav).glob("*.wav")):
            raw_loud, _ = measure(args.ffmpeg, wav)
            trimmed = Path(tmp) / wav.name
            run([args.ffmpeg, "-hide_banner", "-y", "-i", str(wav), "-af",
                 trim_filter(raw_loud - args.floor, args.gap),
                 "-ac", "1", str(trimmed)])
            raw_len, trim_len = duration(args.ffprobe, wav), duration(args.ffprobe, trimmed)
            loud, _ = measure(args.ffmpeg, trimmed)
            out = clips / (wav.stem + ".m4a")
            gain = args.lufs - loud
            fades = f"afade=t=in:d=0.01,afade=t=out:st={max(trim_len - 0.05, 0):.3f}:d=0.05"
            ceiling = -3.0  # AAC coding overshoots the limiter by a decibel or two; stay under full scale
            for _ in range(5):  # again only if the level or the peak came out wrong
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
            rows.append({"file": out.name, "duration": round(duration(args.ffprobe, out), 3),
                         "lufs": round(got, 2), "true_peak_db": round(peak, 2),
                         "trimmed_seconds": round(raw_len - trim_len, 3),
                         "bytes": out.stat().st_size})
            print(out.name, rows[-1])
    Path(args.report).write_text(json.dumps(rows, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
