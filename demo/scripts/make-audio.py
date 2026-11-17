"""Synthesise the original, royalty-free score and foley for the OneScreen film.

The score follows the film's beat table (120 BPM, beat = 0.5 s). Keep CUES in
sync with src/film/timeline.ts.

  score.wav   21 s: phasing mallets for the mess, digital silence at the freeze,
              one A major 9 chord on the press, a clean pattern for the fix,
              then a subtractive ending down to one note.
  tick.wav    cursor tick (dry, short)
  thud.wav    cursor hitting a dead edge (felt thump + click)
  whip.wav    camera whip (air)
  glass.wav   UI expanding (glass tap)
  snap.wav    a display landing in place (felt tick, in key)
  digit.wav   digit grain for the number scramble
  shimmer.wav light sweep
  crt.wav     put-away blip

Only needs numpy:  python3 scripts/make-audio.py
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
rng = np.random.default_rng(11)

BPM = 120
BEAT = 60 / BPM
LENGTH_BEATS = 42

# --- cue table (beats) shared with the picture --------------------------------
FREEZE = (14.0, 15.0)  # digital zero
PRESS = 18.0
PUTAWAY = 32.0
END = 42.0


def write(name, x, peak=0.9):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    m = np.max(np.abs(x)) or 1.0
    x = x / m * peak
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"wrote {name:12s} {len(x) / SR:5.2f}s")


def t(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=0.002, decay=0.2):
    tt = t(d)
    return np.clip(tt / a, 0, 1) * np.exp(-tt / decay)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def hz(midi, cents=0.0):
    return 440.0 * 2 ** ((midi - 69 + cents / 100) / 12)


def mallet(f, d=1.2, vel=1.0, bright=1.0):
    """Marimba-like: inharmonic partials with fast decays + a felt click."""
    tt = t(d)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.42)
    x += 0.22 * bright * np.sin(2 * np.pi * f * 3.93 * tt) * np.exp(-tt / 0.07)
    x += 0.06 * bright * np.sin(2 * np.pi * f * 9.24 * tt) * np.exp(-tt / 0.02)
    click = rng.standard_normal(len(tt)) * np.exp(-tt / 0.0015) * 0.08
    return (x + click) * np.clip(tt / 0.0015, 0, 1) * vel


def vibes(f, d=3.0, vel=1.0):
    tt = t(d)
    trem = 1 + 0.18 * np.sin(2 * np.pi * 5.2 * tt)
    x = np.sin(2 * np.pi * f * tt) + 0.12 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt / 0.3)
    return x * np.exp(-tt / 1.6) * np.clip(tt / 0.004, 0, 1) * trem * vel


def place(buf, x, at_s, gain=1.0, pan=0.0):
    s = int(at_s * SR)
    if s >= len(buf):
        return
    e = min(len(buf), s + len(x))
    l = np.sqrt(0.5 * (1 - pan))
    r = np.sqrt(0.5 * (1 + pan))
    buf[s:e, 0] += gain * l * x[: e - s]
    buf[s:e, 1] += gain * r * x[: e - s]


# A major pentatonic, a 12-note pattern = 3 beats of sixteenths
A, Cs, E, Fs, B = 69, 73, 76, 78, 71
PATTERN = [A, E, Cs, Fs, B, E, A, Cs, Fs, E, B, Cs]


def score():
    n = int(LENGTH_BEATS * BEAT * SR)
    buf = np.zeros((n, 2))
    six = BEAT / 4

    # ---- A: the mess (0-14): pulse + phasing mallets ----------------------
    for i in range(int(14 * 2)):  # eighth pulse
        at = i * BEAT / 2
        g = 0.18 + 0.22 * (at / (14 * BEAT))
        tt = t(0.22)
        p = (np.sin(2 * np.pi * 110 * tt) + 0.35 * np.sin(2 * np.pi * 220 * tt)) * np.exp(-tt / 0.07)
        place(buf, p, at, g)
    for i in range(int(14 * 4)):  # voice 1, on the grid
        at = i * six
        place(buf, mallet(hz(PATTERN[i % 12])), at, 0.32, pan=-0.35)
    # voice 2 enters at beat 4 and runs ~3.5 % fast -> drifts out of phase
    i = 0
    while True:
        at = 4 * BEAT + i * six / 1.035
        if at >= 14 * BEAT:
            break
        g = 0.12 + 0.2 * ((at - 4 * BEAT) / (10 * BEAT))
        place(buf, mallet(hz(PATTERN[i % 12], cents=18), bright=1.3), at, g, pan=0.45)
        i += 1
    # a creeping dissonant pad from beat 8
    tt = np.arange(int(6 * BEAT * SR)) / SR
    pad = sum(np.sin(2 * np.pi * hz(m) * tt) for m in (57, 64, 68)) / 3  # A3 E4 G#4
    pad += 0.6 * np.sin(2 * np.pi * hz(63.3) * tt)  # a sour D#-ish
    pad *= np.clip(tt / (6 * BEAT), 0, 1) ** 2
    place(buf, lowpass(pad, 1800), 8 * BEAT, 0.16)

    # ---- freeze: digital zero ---------------------------------------------
    a, b = int(FREEZE[0] * BEAT * SR), int(FREEZE[1] * BEAT * SR)
    buf[a:] *= 0.0  # everything before ends abruptly at the freeze

    # ---- push (15-18): a held breath, a thin rising sine --------------------
    tt = t(3 * BEAT)
    f = 330 * 2 ** (tt / (3 * BEAT))
    rise = np.sin(2 * np.pi * np.cumsum(f) / SR) * (tt / (3 * BEAT)) ** 2
    place(buf, rise, 15 * BEAT, 0.07)

    # ---- press (18): one chord + felt doom ---------------------------------
    p = PRESS * BEAT
    for k, m in enumerate((45, 52, 56, 59, 61, 64)):  # A2 E3 G#3 B3 C#4 E4 (A maj9)
        place(buf, mallet(hz(m), d=2.5, vel=1.0), p + k * 0.012, 0.34)
        place(buf, vibes(hz(m + 12), d=4.0), p, 0.10)
    tt = t(1.2)
    doom = np.sin(2 * np.pi * np.cumsum(40 + 15 * np.exp(-tt / 0.15)) / SR) * np.exp(-tt / 0.5)
    place(buf, doom, p, 0.7)

    # ---- the fix (20-32): one clean voice, pulse, bass; glock from 24 -------
    bass = [45, 42, 50, 52]  # A2 F#2 D3 E3, one per bar
    for i in range(int(12 * 4)):
        at = 20 * BEAT + i * six
        place(buf, mallet(hz(PATTERN[i % 12])), at, 0.3, pan=-0.1)
        if i >= 16 and i % 2 == 0:
            place(buf, mallet(hz(PATTERN[i % 12] + 12), d=0.6, bright=0.6), at, 0.12, pan=0.4)
    for i in range(int(12 * 2)):
        at = 20 * BEAT + i * BEAT / 2
        tt = t(0.2)
        place(buf, np.sin(2 * np.pi * 110 * tt) * np.exp(-tt / 0.06), at, 0.22)
    for bar in range(3):
        place(buf, mallet(hz(bass[bar % 4]), d=1.8, bright=0.5), (20 + bar * 4) * BEAT, 0.5)
    # bridge 18-20: vibes carry the chord (L-cut), one quiet pattern pass
    for i in range(8):
        place(buf, mallet(hz(PATTERN[i % 12]), vel=0.6), (18.5 + i * 0.25) * BEAT, 0.18)

    # ---- subtractive ending (32-42): remove notes bar by bar -----------------
    keep_every = [1, 2, 3, 4, 6]  # sixteenths kept per bar (2 beats each)
    for bar, k in enumerate(keep_every):
        for j in range(8):
            if j % k:
                continue
            at = (PUTAWAY + bar * 2) * BEAT + j * six
            place(buf, mallet(hz(PATTERN[j % 12]), vel=0.9 - 0.12 * bar), at, 0.28)
    place(buf, mallet(hz(A), d=3.0), 40 * BEAT, 0.34)
    place(buf, vibes(hz(57), d=4.0), 40 * BEAT, 0.12)

    # soft limiter
    buf = np.tanh(buf * 1.3) / np.tanh(1.3)
    # fade the last 0.6 s
    fo = int(0.6 * SR)
    buf[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return buf


# ---------------------------------------------------------------- foley
def tick():
    tt = t(0.05)
    return (np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt / 0.006)
            + highpass(rng.standard_normal(len(tt)), 3000) * np.exp(-tt / 0.002) * 0.6)


def pad_to(x, n):
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def thud():
    tt = t(0.22)
    body = np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-tt / 0.02)) / SR) * np.exp(-tt / 0.06)
    return body + 0.5 * pad_to(tick(), len(tt))


def whip():
    tt = t(0.32)
    n = rng.standard_normal(len(tt))
    lo, hi = lowpass(n, 900), highpass(n, 2500)
    p = tt / tt[-1]
    shape = np.sin(np.pi * p) ** 2
    return (lo * (1 - p) + hi * p) * shape


def glass():
    tt = t(0.6)
    return (np.sin(2 * np.pi * 2637 * tt) + 0.5 * np.sin(2 * np.pi * 3951 * tt)) * np.exp(-tt / 0.16) * np.clip(tt / 0.003, 0, 1)


def snap():
    m = mallet(hz(81), d=0.4, bright=0.6)
    return m + 0.4 * pad_to(tick(), len(m))


def digit():
    tt = t(0.02)
    return highpass(rng.standard_normal(len(tt)), 4000) * np.exp(-tt / 0.002)


def shimmer():
    tt = t(1.6)
    x = sum(np.sin(2 * np.pi * hz(m) * tt) for m in (93, 97, 100, 105)) / 4
    a = np.clip(tt / 0.5, 0, 1) ** 2 * np.exp(-np.maximum(tt - 0.5, 0) / 0.5)
    air = highpass(rng.standard_normal(len(tt)), 6000) * a * 0.35
    return x * a + air


def crt():
    tt = t(0.22)
    f = 80 + 1100 * np.exp(-tt / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.08)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write("score.wav", score(), peak=0.8)
    write("tick.wav", tick())
    write("thud.wav", thud())
    write("whip.wav", whip())
    write("glass.wav", glass())
    write("snap.wav", snap())
    write("digit.wav", digit())
    write("shimmer.wav", shimmer())
    write("crt.wav", crt())
