"""Join one voice's lines into a single clip for a Riffle board tile.

Usage:
  python build_board.py --clips <clips-dir> --board <board-dir>
      --voices kokoro-bm_george,chatterbox-slow [--lines 1,2,3,4,5] [--gap 0.5]
      [--report <board.json>] [--ffmpeg ffmpeg] [--ffprobe ffprobe]

For each <engine>-<voice>, reads <clips>/<engine>-<voice>-<n>.m4a for the
lines given, in order, puts --gap seconds of silence between them, and writes
<board>/<engine>-<voice>.m4a: AAC-LC, mono, 24 kHz, 64 kbps, like the clips.
The clips are already at the same loudness, so nothing is re-levelled.
The gap matches round 1's joined clips (half a second), so the two rounds
sit side by side. Stops if a joined clip is 500 KB or more: Riffle re-encodes
anything bigger.
"""
import argparse
import json
import subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", required=True)
    ap.add_argument("--board", required=True)
    ap.add_argument("--voices", required=True)
    ap.add_argument("--lines", default="1,2,3,4,5")
    ap.add_argument("--gap", type=float, default=0.5)
    ap.add_argument("--report")
    ap.add_argument("--ffmpeg", default="ffmpeg")
    ap.add_argument("--ffprobe", default="ffprobe")
    args = ap.parse_args()

    clips, board = Path(args.clips), Path(args.board)
    board.mkdir(parents=True, exist_ok=True)
    numbers = [n for n in args.lines.split(",") if n]
    rows = []
    for voice in filter(None, args.voices.split(",")):
        parts = [clips / f"{voice}-{n}.m4a" for n in numbers]
        missing = [p.name for p in parts if not p.exists()]
        assert not missing, f"missing clips: {missing}"
        cmd = [args.ffmpeg, "-hide_banner", "-v", "error", "-y"]
        for p in parts:
            cmd += ["-i", str(p)]
        chain = "".join(f"[{i}:a]apad=pad_dur={args.gap}[a{i}];" for i in range(len(parts) - 1))
        ins = "".join(f"[a{i}]" for i in range(len(parts) - 1)) + f"[{len(parts) - 1}:a]"
        chain += f"{ins}concat=n={len(parts)}:v=0:a=1[out]"
        out = board / f"{voice}.m4a"
        cmd += ["-filter_complex", chain, "-map", "[out]", "-ar", "24000", "-ac", "1", "-c:a", "aac",
                "-b:a", "64k", "-movflags", "+faststart", "-map_metadata", "-1", str(out)]
        subprocess.run(cmd, check=True)
        seconds = float(subprocess.run([args.ffprobe, "-v", "error", "-show_entries", "format=duration",
                                        "-of", "csv=p=0", str(out)], capture_output=True, text=True,
                                       check=True).stdout.strip())
        size = out.stat().st_size
        assert size < 500_000, f"{out.name} is {size} bytes"
        rows.append({"file": out.name, "voice": voice, "lines": [int(n) for n in numbers],
                     "seconds": round(seconds, 2), "bytes": size})
        print(out.name, f"{seconds:.1f}s", size)
    if args.report:
        Path(args.report).write_text(json.dumps(rows, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
