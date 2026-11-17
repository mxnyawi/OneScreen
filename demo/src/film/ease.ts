import {Easing, interpolate} from 'remotion';

/** Precise snap: fast start, decisive landing. Used for every snap move. */
export const snap = Easing.bezier(0.7, 0, 0.2, 1);
/** Confident arrival for reveals and text. */
export const out = Easing.bezier(0.16, 1, 0.3, 1);
/** One small overshoot and an immediate settle (back, s ~ 1.3). */
export const back = (s = 1.3) => (x: number) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);

/** 0..1 progress of `beat` through [a, b], eased and clamped. */
export const seg = (beat: number, a: number, bEnd: number, easing: (x: number) => number = snap) =>
  interpolate(beat, [a, bEnd], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Decaying impulse after each hit (0..1), e.g. for squash and edge flashes. */
export const impulse = (beat: number, hits: readonly number[], len = 0.35) =>
  hits.reduce((m, h) => {
    const d = beat - h;
    return d < 0 || d > len ? m : Math.max(m, Math.exp(-d / (len / 4)));
  }, 0);
