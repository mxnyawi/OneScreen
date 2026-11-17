"""Synthesise the original, royalty-free audio used by the demo videos.

Writes into public/sfx/:
  bonk.wav   - dull thud for the cursor hitting a dead screen edge
  pop.wav    - short bubbly pop for text / cards appearing
  riser.wav  - 1 s noise riser before the big reveal
  impact.wav - sub drop + noise burst for the flip moment
  beat.wav   - 32 s, 120 BPM upbeat loop (kick, clap, hats, bass, plucks)

Only needs numpy:  python3 scripts/make-audio.py
"""
import os
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(7)


def write(name, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 0.89
    data = (x * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("wrote", name, f"{len(x) / SR:.2f}s")


def t(dur):
    return np.arange(int(dur * SR)) / SR


def env(dur, attack=0.002, decay=0.2):
    tt = t(dur)
    a = np.clip(tt / attack, 0, 1)
    return a * np.exp(-tt / decay)


def sweep(f0, f1, dur, k=30.0):
    """Sine whose frequency glides exponentially from f0 to f1."""
    tt = t(dur)
    f = f1 + (f0 - f1) * np.exp(-tt * k)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def lowpass(x, cutoff):
    # one-pole low-pass, good enough for noise colouring
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


# ---------------------------------------------------------------- one-shots
def bonk():
    d = 0.28
    body = sweep(320, 90, d, k=40) * env(d, 0.001, 0.07)
    knock = lowpass(rng.standard_normal(len(t(d))), 1800) * env(d, 0.0005, 0.012)
    return body + 0.6 * knock


def pop():
    d = 0.16
    return sweep(380, 1250, d, k=55) * env(d, 0.001, 0.035)


def riser():
    d = 1.0
    tt = t(d)
    n = rng.standard_normal(len(tt))
    cut = 400 + 7000 * (tt / d) ** 2
    # crude time-varying filter: blend of low-passed versions
    lo = lowpass(n, 600)
    hi = highpass(n, 2000)
    mix = lo * (1 - tt / d) + hi * (tt / d)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (tt / d) ** 2) / SR)
    shape = (tt / d) ** 2.2
    return (0.7 * mix + 0.35 * tone) * shape * (cut > 0)


def impact():
    d = 1.2
    sub = sweep(150, 38, d, k=6) * env(d, 0.001, 0.45)
    burst = lowpass(rng.standard_normal(len(t(d))), 3000) * env(d, 0.001, 0.08)
    return sub + 0.5 * burst


# ---------------------------------------------------------------- music
BPM = 120
BEAT = 60 / BPM
STEP = BEAT / 4  # 16th note


def kick():
    d = 0.45
    return sweep(160, 45, d, k=28) * env(d, 0.001, 0.16)


def clap():
    d = 0.25
    n = highpass(rng.standard_normal(len(t(d))), 900)
    e = np.zeros(len(n))
    for off in (0.0, 0.011, 0.022):
        s = int(off * SR)
        seg = env(d, 0.0005, 0.06 if off == 0.022 else 0.008)[: len(e) - s]
        e[s : s + len(seg)] += seg
    return n * e


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    n = highpass(rng.standard_normal(len(t(d))), 7000)
    return n * env(d, 0.0005, 0.06 if open_ else 0.012)


def note_freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def bass(midi, dur):
    tt = t(dur)
    f = note_freq(midi)
    saw = 2 * ((tt * f) % 1) - 1
    x = lowpass(saw, 380) + 0.6 * np.sin(2 * np.pi * f * tt)
    return x * env(dur, 0.003, dur * 0.5)


def pluck(midis, dur):
    tt = t(dur)
    x = np.zeros(len(tt))
    for m in midis:
        f = note_freq(m)
        for det in (-0.08, 0.08):
            ff = f * 2 ** (det / 12)
            x += 2 * ((tt * ff) % 1) - 1
    x = lowpass(x, 2600)
    return x * env(dur, 0.002, 0.12)


def place(buf, x, at, gain=1.0):
    s = int(at * SR)
    e = min(len(buf), s + len(x))
    if s < len(buf):
        buf[s:e] += gain * x[: e - s]


def beat(total=32.0):
    n = int(total * SR)
    drums = np.zeros(n)
    music = np.zeros(n)
    # A minor - F - C - G, one chord per bar
    chords = [
        (45, [69, 72, 76]),
        (41, [65, 69, 72]),
        (48, [67, 72, 76]),
        (43, [67, 71, 74]),
    ]
    k, c, h, ho = kick(), clap(), hat(), hat(True)
    bars = int(total / (BEAT * 4)) + 1
    for bar in range(bars):
        root, chord = chords[bar % 4]
        b0 = bar * BEAT * 4
        intro = bar < 1  # first bar: hats + plucks only, builds energy
        for step in range(16):
            at = b0 + step * STEP
            if step % 4 == 0 and not intro:
                place(drums, k, at, 1.0)
            if step in (4, 12) and not intro:
                place(drums, c, at, 0.55)
            if step % 2 == 1:
                place(drums, ho if step % 4 == 2 else h, at, 0.18)
            else:
                place(drums, h, at, 0.10)
            if step % 4 == 2 and not intro:
                place(music, bass(root, STEP * 1.8), at, 0.55)
            if step in (0, 3, 6, 10, 13):
                place(music, pluck(chord, STEP * 2.5), at, 0.22)
    # side-chain style pump on the music bus
    tt = np.arange(n) / SR
    phase = (tt % BEAT) / BEAT
    pump = 0.45 + 0.55 * np.clip(phase * 4, 0, 1)
    mix = drums + music * pump
    # fade in / out
    fade = np.ones(n)
    fi, fo = int(0.05 * SR), int(1.5 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fade[-fo:] = np.linspace(1, 0, fo)
    mix *= fade
    mix = np.tanh(mix * 1.6) / np.tanh(1.6)
    return mix


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write("bonk.wav", bonk())
    write("pop.wav", pop())
    write("riser.wav", riser())
    write("impact.wav", impact())
    write("beat.wav", beat())
