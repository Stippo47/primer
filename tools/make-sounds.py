"""Makes the scenes' sound effects (sounds/*.m4a) from nothing but noise and sine waves.

    python tools/make-sounds.py [--out sounds] [--ffmpeg ffmpeg] [--wav]

Every sound is synthesised here, from a fixed seed, so the files are the app's own (no recordings, nobody
else's sounds) and the same every time this runs. They're made soft and round, and quiet beside the voice:
peaks well under the narration's, nothing sharp, nothing 8-bit (DECISIONS 2026-11-16). An iPhone's speaker
carries little under about 250 Hz, so nothing leans on deep bass. The names and what each is for are in
parts/parts.json ("scene", "sounds") and js/sfx.js.

Each is written as a WAV, then encoded with ffmpeg to AAC in an .m4a (mono, 44.1 kHz, 96 kbps), the format
the voice clips use. --wav keeps the WAVs beside them.

The combo's crack and shatter were made here too, until recordings from the sound library replaced them
(2026-11-19, js/feel.js RECORDED); --candidates DIR still writes the made ones to DIR, to be heard side by
side, and --only names the few to make.
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


# ---------------------------------------------------------------- the combo's crack and shatter
#
# Redone 2026-11-19 ("bad sound" for both): a crack is a small glass or porcelain tink with a soft body under
# it, a shatter a bright cascade of tinks falling away over a soft low thump. Three of each were made for the
# designer to hear; COMBO says which two the app plays (js/feel.js plays them as samples). Both are levelled
# to about -27.5 LUFS like the scene sounds, so they sit well under the voice.

def tink(out, at, f0, amp, decay, ratios=(1, 2.32, 4.25, 6.63), amps=(1, 0.36, 0.13, 0.04), click=0.0, seed=1, attack=0.0015):
    """A small struck piece of glass or porcelain: a few inharmonic partials, each fading, the higher ones
    sooner, with a slight shimmer, and if asked a tiny click of air where it's struck."""
    start = int(at * RATE)
    r = random.Random(seed)
    for ratio, a in zip(ratios, amps):
        f = f0 * ratio
        if f > 15000:
            continue
        d = decay / (1 + 0.55 * (ratio - 1))
        m = min(len(out) - start, int(RATE * d * 7))
        ph, beat, bp = r.uniform(0, TAU), r.uniform(1.5, 4.5), r.uniform(0, TAU)
        for j in range(max(0, m)):
            t = j / RATE
            e = min(1.0, t / attack) * math.exp(-t / d) * (1 + 0.06 * math.sin(TAU * beat * t + bp))
            out[start + j] += math.sin(ph + TAU * f * t) * a * amp * e
    if click:
        n = int(RATE * 0.004)
        src, flt = noise(n, seed + 99), SVF(0.9)
        for j, v in enumerate(src):
            if start + j < len(out):
                out[start + j] += flt.step(v, 5200)[1] * click * math.exp(-j / (RATE * 0.0009))


def body(out, at, f_from, f_to, amp, decay, glide=40.0):
    """A soft round knock under it: a sine that settles from one pitch to another as it fades."""
    start = int(at * RATE)
    m = min(len(out) - start, int(RATE * decay * 7))
    ph = 0.0
    for j in range(m):
        t = j / RATE
        ph += TAU * (f_to + (f_from - f_to) * math.exp(-t * glide)) / RATE
        out[start + j] += (math.sin(ph) + 0.18 * math.sin(2 * ph)) * amp * min(1.0, t / 0.003) * math.exp(-t / decay)


def breath(out, at, fc, amp, decay, q=0.8, seed=3, rise=0.002):
    """A breath of filtered noise: the grain of something breaking, kept soft."""
    start = int(at * RATE)
    m = min(len(out) - start, int(RATE * decay * 6))
    src, flt = noise(m, seed), SVF(q)
    for j, v in enumerate(src):
        t = j / RATE
        out[start + j] += flt.step(v, fc)[1] * amp * min(1.0, t / rise) * math.exp(-t / decay)


def crack_porcelain():
    """A: a porcelain tink, a soft knock under it, and the crack running on in two tiny ticks."""
    out = [0.0] * int(RATE * 0.62)
    tink(out, 0.0, 2093, 1.0, 0.12, click=0.22, seed=11)
    body(out, 0.0, 420, 330, 0.9, 0.05)
    tink(out, 0.028, 3900, 0.18, 0.03, seed=12)
    tink(out, 0.055, 4700, 0.1, 0.025, seed=13)
    return out


def crack_glass():
    """B: a glass tap, then a second, higher and softer, as the crack spreads; a lighter knock."""
    out = [0.0] * int(RATE * 0.62)
    tink(out, 0.0, 1975.5, 1.0, 0.13, ratios=(1, 2.76, 5.4), amps=(1, 0.32, 0.12), click=0.2, seed=21)
    tink(out, 0.048, 2637, 0.45, 0.09, ratios=(1, 2.76, 5.4), amps=(1, 0.3, 0.1), seed=22)
    body(out, 0.0, 360, 300, 0.6, 0.045)
    return out


def crack_ceramic():
    """C: a lower, warmer cup-like tink with more body, and a short soft scrape of the crack."""
    out = [0.0] * int(RATE * 0.62)
    tink(out, 0.0, 1568, 0.95, 0.14, ratios=(1, 2.32, 3.9, 5.8), amps=(1, 0.5, 0.25, 0.1), click=0.2, seed=31)
    body(out, 0.0, 380, 290, 1.0, 0.07)
    breath(out, 0.006, 3000, 0.12, 0.018, q=1.1, seed=32)
    return out


def scatter(out, start, span, count, lo, hi, seed, amp0=0.55, amp1=0.16, decay=(0.04, 0.11), curve=1.8):
    """Small bits landing after a break: tinks thick at first and thinning out, each quieter than the last."""
    r = random.Random(seed)
    for i in range(count):
        u = (i + r.uniform(0, 0.8)) / count
        at = start + span * u ** curve
        f = math.exp(r.uniform(math.log(lo), math.log(hi))) * (1 - 0.18 * u)
        tink(out, at, f, (amp0 + (amp1 - amp0) * u) * r.uniform(0.6, 1.0), r.uniform(*decay), seed=seed * 100 + i, attack=0.0025)


def shatter_cascade():
    """A: a soft low thump, a bright break, and bits cascading away, thinning as they fall."""
    out = [0.0] * int(RATE * 1.35)
    body(out, 0.0, 260, 170, 0.75, 0.09, glide=30)
    breath(out, 0.0, 3800, 0.22, 0.03, q=0.9, seed=41)
    for k, f in enumerate((2793, 3520, 4186, 2349)):
        tink(out, 0.004 + k * 0.006, f, 0.6, 0.07, click=0.15 if k == 0 else 0, seed=42 + k)
    scatter(out, 0.04, 0.85, 26, 1900, 6200, seed=43)
    return out


def shatter_chimes():
    """B: the same break, its bits falling as notes that step down a pentatonic scale, like small chimes."""
    out = [0.0] * int(RATE * 1.4)
    body(out, 0.0, 250, 165, 0.7, 0.09, glide=30)
    breath(out, 0.0, 3400, 0.16, 0.025, q=0.9, seed=51)
    tink(out, 0.003, 3136, 0.7, 0.08, click=0.15, seed=52)
    tink(out, 0.01, 4186, 0.45, 0.06, seed=53)
    notes = [3951, 3520, 3136, 2637, 2349, 1975.5, 1760, 1568]
    r = random.Random(54)
    for i in range(18):
        u = i / 17
        at = 0.04 + 0.9 * u ** 1.6 + r.uniform(0, 0.012)
        f = notes[max(0, min(len(notes) - 1, int(u * len(notes) + r.uniform(-0.6, 0.6))))]
        tink(out, at, f, (0.5 - 0.32 * u) * r.uniform(0.75, 1.0), r.uniform(0.07, 0.14), seed=60 + i, attack=0.0025)
    return out


def shatter_shower():
    """C: a brighter, quicker shower of fine bits with a soft sparkle of air behind it, over the thump."""
    out = [0.0] * int(RATE * 1.3)
    body(out, 0.0, 270, 175, 0.75, 0.085, glide=32)
    breath(out, 0.0, 4500, 0.2, 0.035, q=0.9, seed=71)
    breath(out, 0.02, 7000, 0.035, 0.28, q=0.7, seed=72, rise=0.04)
    tink(out, 0.003, 4186, 0.55, 0.06, click=0.15, seed=73)
    tink(out, 0.008, 5274, 0.4, 0.05, seed=74)
    scatter(out, 0.025, 0.75, 40, 3000, 8500, seed=75, amp0=0.42, amp1=0.1, decay=(0.025, 0.07), curve=1.5)
    return out


CRACKS = {'crack-a-porcelain': crack_porcelain, 'crack-b-glass': crack_glass, 'crack-c-ceramic': crack_ceramic}
SHATTERS = {'shatter-a-cascade': shatter_cascade, 'shatter-b-chimes': shatter_chimes, 'shatter-c-shower': shatter_shower}
COMBO = {}   # the app plays library recordings for the crack and the shatter now (js/feel.js, RECORDED)
COMBO_LUFS = -27.5


def finish(x, peak_db=-6.0):
    """Rounded off at the very top and faded at the ends; levelled later by loudness."""
    return peak_to(edges(soften(x, 7500), 3), peak_db)


def loudness(ffmpeg, wav):
    """Integrated loudness (LUFS) by ffmpeg's EBU R128 meter."""
    p = subprocess.run([ffmpeg, '-hide_banner', '-nostats', '-i', str(wav), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True)
    vals = [line.split('I:')[1].split('LUFS')[0] for line in p.stderr.splitlines() if 'I:' in line and 'LUFS' in line]
    return float(vals[-1]) if vals else None


def levelled(ffmpeg, path, x, target=COMBO_LUFS):
    """Writes x as a WAV at `target` LUFS (the meter read again after each step), its peak kept under -3 dBFS."""
    for _ in range(3):
        write_wav(path, x)
        got = loudness(ffmpeg, path)
        if got is None or got < -69 or abs(target - got) < 0.15:
            break
        g = 10 ** ((target - got) / 20)
        x = [v * g for v in x]
    p = max(abs(v) for v in x)
    if p > 10 ** (-3 / 20):
        x = [v * 10 ** (-3 / 20) / p for v in x]
    write_wav(path, x)
    return x


SOUNDS = {'whoosh': whoosh, 'cut': cut, 'swell': swell, 'pop': pop, 'chime': chime, 'wind': wind, 'fizz': fizz, 'rumble': rumble}


def write_wav(path, x):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, int(v * 32767)))) for v in x))


def encode(ffmpeg, wav, m4a):
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), '-ac', '1', '-ar', str(RATE), '-c:a', 'aac', '-b:a', '96k',
                    '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', str(m4a)], check=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    here = pathlib.Path(__file__).resolve().parent.parent
    ap.add_argument('--out', default=str(here / 'sounds'))
    ap.add_argument('--ffmpeg', default='ffmpeg')
    ap.add_argument('--wav', action='store_true', help='keep the WAVs')
    ap.add_argument('--only', default='', help='the names to make, comma separated (default: all)')
    ap.add_argument('--candidates', default='', help="also write every crack and shatter candidate here, to hear them side by side")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    if not shutil.which(a.ffmpeg) and not pathlib.Path(a.ffmpeg).exists():
        sys.exit('make-sounds needs ffmpeg on PATH, or --ffmpeg.')
    only = set(filter(None, a.only.split(',')))
    jobs = [(out, name, make, False) for name, make in SOUNDS.items()] + [(out, name, make, True) for name, make in COMBO.items()]
    jobs = [j for j in jobs if not only or j[1] in only]
    if a.candidates:
        cand = pathlib.Path(a.candidates)
        cand.mkdir(parents=True, exist_ok=True)
        jobs += [(cand, name, make, True) for name, make in {**CRACKS, **SHATTERS}.items()]
    for where, name, make, level in jobs:
        wav = where / f'{name}.wav'
        if level:
            levelled(a.ffmpeg, wav, finish(make()))
        else:
            write_wav(wav, make())
        m4a = where / f'{name}.m4a'
        encode(a.ffmpeg, wav, m4a)
        if not a.wav:
            wav.unlink()
        print(m4a.name, f'{loudness(a.ffmpeg, m4a):.1f} LUFS' if level else '')


if __name__ == '__main__':
    main()
