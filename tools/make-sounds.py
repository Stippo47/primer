"""Makes the scenes' sound effects (sounds/*.m4a) from nothing but noise and sine waves.

    python tools/make-sounds.py [--out sounds] [--ffmpeg ffmpeg] [--wav]

Every sound is synthesised here, from a fixed seed, so the files are the app's own (no recordings, nobody
else's sounds) and the same every time this runs. They're made soft and round, and quiet beside the voice:
peaks well under the narration's, nothing sharp, nothing 8-bit (DECISIONS 2026-11-16). An iPhone's speaker
carries little under about 250 Hz, so nothing leans on deep bass. The names and what each is for are in
parts/parts.json ("scene", "sounds") and js/sfx.js.

Each is written as a WAV, then encoded with ffmpeg to AAC in an .m4a (mono, 44.1 kHz, 96 kbps), the format
the voice clips use. --wav keeps the WAVs beside them.
"""
import argparse
import math
import pathlib
import random
import shutil
import struct
import subprocess
import sys
import wave

RATE = 44100
TAU = 2 * math.pi


def env_curve(n, attack, release, shape=2.0):
    """An envelope n samples long: rises over `attack` of it (0..1), holds, and falls over the last `release`."""
    out = []
    for i in range(n):
        k = i / max(1, n - 1)
        a = min(1.0, k / attack) if attack > 0 else 1.0
        r = min(1.0, (1 - k) / release) if release > 0 else 1.0
        out.append((math.sin(a * math.pi / 2) ** shape) * (math.sin(r * math.pi / 2) ** shape))
    return out


class SVF:
    """A state-variable filter (Chamberlin): low, band and high pass from one, with a cutoff that can move."""

    def __init__(self, damping=0.8):
        self.low = self.band = 0.0
        self.q = damping

    def step(self, x, fc):
        f = 2 * math.sin(math.pi * min(fc, RATE / 6) / RATE)
        self.low += f * self.band
        high = x - self.low - self.q * self.band
        self.band += f * high
        return self.low, self.band, high


def noise(n, seed):
    r = random.Random(seed)
    return [r.uniform(-1, 1) for _ in range(n)]


def sine(n, freq, phase=0.0):
    """A sine whose frequency is a number or a function of time in seconds."""
    out, ph = [], phase
    for i in range(n):
        f = freq(i / RATE) if callable(freq) else freq
        ph += TAU * f / RATE
        out.append(math.sin(ph))
    return out


def mix(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] for t in tracks if i < len(t)) for i in range(n)]


def gain(x, g):
    return [v * g for v in x]


def times(a, b):
    return [p * q for p, q in zip(a, b)]


def soften(x, fc=6000):
    f = SVF(1.2)
    return [f.step(v, fc)[0] for v in x]


def peak_to(x, db):
    p = max(1e-9, max(abs(v) for v in x))
    g = 10 ** (db / 20) / p
    return [v * g for v in x]


def edges(x, ms=6):
    m = int(RATE * ms / 1000)
    for i in range(min(m, len(x))):
        k = i / m
        x[i] *= k
        x[-1 - i] *= k
    return x


# ---------------------------------------------------------------- the sounds

def whoosh():
    n = int(RATE * 0.95)
    src, f1, f2 = noise(n, 11), SVF(0.55), SVF(0.9)
    out = []
    for i, v in enumerate(src):
        k = i / n
        fc = 380 + 2300 * math.sin(math.pi * min(1, k / 0.9)) ** 1.6
        _, band, _ = f1.step(v, fc)
        low, _, _ = f2.step(v, 700)
        out.append(band * 0.9 + low * 0.25)
    return peak_to(edges(soften(soften(times(out, env_curve(n, 0.42, 0.55, 1.6)), 4200), 4200)), -15.5)


def cut():
    n = int(RATE * 0.32)
    thump = sine(n, lambda t: 260 * math.exp(-t * 9) + 150)
    th_env = [math.exp(-i / (RATE * 0.07)) * min(1, i / (RATE * 0.004)) for i in range(n)]
    air, f = noise(n, 21), SVF(0.7)
    airy = [f.step(v, 1400)[1] * math.exp(-i / (RATE * 0.05)) * min(1, i / (RATE * 0.003)) for i, v in enumerate(air)]
    return peak_to(edges(soften(mix(times(thump, th_env), gain(airy, 0.6)), 4000)), -15)


def swell():
    n = int(RATE * 2.6)
    tones = mix(*[gain(sine(n, lambda t, f=f: f * (1 + 0.004 * math.sin(TAU * 4.6 * t + f))), a) for f, a in ((220, 0.5), (329.63, 0.38), (440, 0.26), (554.37, 0.12))])
    air, f = noise(n, 31), SVF(0.6)
    airy = [f.step(v, 300 + 1100 * (i / n) ** 1.3)[1] for i, v in enumerate(air)]
    body = mix(tones, gain(airy, 0.5))
    shape = [((i / n) / 0.72) ** 2.2 if i / n < 0.72 else math.cos((i / n - 0.72) / 0.28 * math.pi / 2) ** 2 for i in range(n)]
    return peak_to(edges(soften(times(body, shape), 3500)), -12.6)


def pop():
    n = int(RATE * 0.2)
    tone = sine(n, lambda t: 380 + 520 * math.exp(-t * 38))
    e = [min(1, i / (RATE * 0.003)) * math.exp(-i / (RATE * 0.045)) for i in range(n)]
    over = sine(n, lambda t: 2 * (380 + 520 * math.exp(-t * 38)))
    e2 = [min(1, i / (RATE * 0.002)) * math.exp(-i / (RATE * 0.018)) for i in range(n)]
    return peak_to(edges(soften(mix(times(tone, e), gain(times(over, e2), 0.18)), 5000)), -14)


def chime():
    n = int(RATE * 1.4)
    out = [0.0] * n
    for delay, freq, level in ((0.0, 659.25, 1.0), (0.11, 987.77, 0.8)):
        d = int(RATE * delay)
        for ratio, amount, fade in ((1, level, 0.85), (3.9, level * 0.06, 0.3)):
            ph = 0.0
            for i in range(d, n):
                t = (i - d) / RATE
                ph += TAU * freq * ratio / RATE
                out[i] += math.sin(ph) * amount * min(1, t / 0.006) * math.exp(-t / (fade / 3))
    return peak_to(edges(soften(out, 5000)), -14.8)


def wind():
    n = int(RATE * 2.9)
    src, f1, f2 = noise(n, 41), SVF(0.5), SVF(1.1)
    out = []
    for i, v in enumerate(src):
        t = i / RATE
        fc = 620 + 260 * math.sin(TAU * 0.55 * t) + 120 * math.sin(TAU * 1.7 * t + 1)
        _, band, _ = f1.step(v, fc)
        low, _, _ = f2.step(v, 900)
        gust = 0.75 + 0.25 * math.sin(TAU * 0.9 * t + 0.5)
        out.append((band * 0.8 + low * 0.35) * gust)
    return peak_to(edges(soften(soften(times(out, env_curve(n, 0.4, 0.55, 1.4)), 3200), 3200)), -9.5)


def fizz():
    n = int(RATE * 1.9)
    r = random.Random(51)
    out = [0.0] * n
    for _ in range(34):
        start = int(r.uniform(0.02, 1.55) * RATE)
        dur = r.uniform(0.03, 0.07)
        f0 = r.uniform(900, 2200)
        m = int(dur * RATE)
        ph = 0.0
        amp = r.uniform(0.35, 1.0)
        for j in range(m):
            if start + j >= n:
                break
            t = j / RATE
            ph += TAU * f0 * (1 + 1.6 * t / dur) / RATE
            out[start + j] += math.sin(ph) * amp * math.sin(math.pi * j / m) ** 2
    hiss, f = noise(n, 52), SVF(0.9)
    airy = [f.step(v, 3500)[1] for v in hiss]
    body = mix(out, gain(airy, 0.06))
    return peak_to(edges(soften(times(body, env_curve(n, 0.2, 0.35, 1.2)), 6500)), -14.8)


def rumble():
    n = int(RATE * 2.6)
    src, f1, f2 = noise(n, 61), SVF(0.4), SVF(0.9)
    brown, acc = [], 0.0
    for v in src:
        acc = acc * 0.995 + v * 0.06
        brown.append(acc)
    out = []
    for i, v in enumerate(brown):
        t = i / RATE
        _, band, _ = f1.step(v, 260 + 60 * math.sin(TAU * 0.7 * t))
        low, _, _ = f2.step(v, 420)
        roll = 0.6 + 0.4 * math.sin(TAU * 1.3 * t) * math.sin(TAU * 0.45 * t + 1)
        out.append((band * 0.7 + low * 0.5) * roll)
    return peak_to(edges(times(out, env_curve(n, 0.25, 0.6, 1.3))), -10.1)


SOUNDS = {'whoosh': whoosh, 'cut': cut, 'swell': swell, 'pop': pop, 'chime': chime, 'wind': wind, 'fizz': fizz, 'rumble': rumble}


def write_wav(path, x):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, int(v * 32767)))) for v in x))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    here = pathlib.Path(__file__).resolve().parent.parent
    ap.add_argument('--out', default=str(here / 'sounds'))
    ap.add_argument('--ffmpeg', default='ffmpeg')
    ap.add_argument('--wav', action='store_true', help='keep the WAVs')
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    if not shutil.which(a.ffmpeg) and not pathlib.Path(a.ffmpeg).exists():
        sys.exit('make-sounds needs ffmpeg on PATH, or --ffmpeg.')
    for name, make in SOUNDS.items():
        wav = out / f'{name}.wav'
        write_wav(wav, make())
        subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar', str(RATE), '-c:a', 'aac', '-b:a', '96k',
                        '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', str(out / f'{name}.m4a')], check=True)
        if not a.wav:
            wav.unlink()
        print(f'{name}.m4a')


if __name__ == '__main__':
    main()
