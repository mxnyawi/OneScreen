import {interpolate} from 'remotion';
import {snap} from './ease';
import {CUE, FPB} from './timeline';
import {CURSOR_Y, EDGE_X, LAYOUTS, Rect, union} from './world';

export type Cam = {x: number; y: number; z: number};
type Key = {at: number; cam: Cam; ease?: ((t: number) => number) | 'cut'};

export const fit = (r: Rect, W: number, H: number, pad = 0.9): Cam => ({
  x: r.x + r.w / 2,
  y: r.y + r.h / 2,
  z: Math.min(W / r.w, H / r.h) * pad,
});
/** Keep the subject clear of the caption band: up on 16:9/1:1 (captions below), down on 9:16 (captions on top). */
const clearCaption = (cam: Cam, W: number, H: number, k = 1): Cam => {
  const portrait = H > W * 1.1;
  const shift = (portrait ? -0.07 : 0.11) * H * k;
  return {...cam, y: cam.y + shift / cam.z};
};
const zoomed = (cam: Cam, k: number): Cam => ({...cam, z: cam.z * k});
const linear = (t: number) => t;

/** The whole film's camera, keyed on beats. Zoom interpolates in log space. */
const keysFor = (W: number, H: number): Key[] => {
  const portrait = H > W * 1.1;
  const ecu = fit({x: EDGE_X - 300, y: CURSOR_Y - 150, w: 380, h: 300}, W, H, 0.95);
  const ecu2 = fit({x: EDGE_X - 250, y: CURSOR_Y - 120, w: 320, h: 250}, W, H, 0.95);
  const wideProblem = clearCaption(
    portrait ? fit({x: -1520, y: -330, w: 1480, h: 580}, W, H) : fit({x: -1180, y: -320, w: 2050, h: 560}, W, H, 0.96),
    W,
    H,
  );
  const wideProblem2 = clearCaption(fit({x: -760, y: -300, w: 1620, h: 540}, W, H, 0.97), W, H);
  const wideFix = clearCaption(fit({x: -760, y: -300, w: 1620, h: 540}, W, H, 0.97), W, H);
  const memory = clearCaption(fit(union(...LAYOUTS.flatMap((l) => [l.laptop, l.monitor])), W, H, portrait ? 0.92 : 0.72), W, H, 0.6);
  const putaway = fit({x: 40, y: -240, w: 520, h: 300}, W, H, 0.9);

  const keys: Key[] = [
    {at: 0, cam: ecu},
    {at: CUE.whipOut, cam: zoomed(ecu, 1.05), ease: linear},
    {at: CUE.whipOut + 0.5, cam: wideProblem, ease: snap},
  ];
  if (portrait) {
    keys.push({at: 6, cam: zoomed(wideProblem, 1.02), ease: linear});
    keys.push({at: 6.75, cam: wideProblem2, ease: snap});
    keys.push({at: CUE.freeze - 0.01, cam: zoomed(wideProblem2, 1.03), ease: linear});
  } else {
    keys.push({at: CUE.freeze - 0.01, cam: zoomed(wideProblem, 1.04), ease: linear});
  }
  keys.push(
    {at: CUE.freeze, cam: ecu2, ease: 'cut'},
    {at: CUE.press - 0.25, cam: zoomed(ecu2, 1.14), ease: linear},
    {at: CUE.press + 0.3, cam: wideFix, ease: snap},
    {at: CUE.number, cam: zoomed(wideFix, 1.02), ease: linear},
    {at: CUE.memory, cam: memory, ease: 'cut'},
    {at: CUE.putaway, cam: zoomed(memory, 1.03), ease: linear},
    {at: CUE.wordmark, cam: putaway, ease: snap},
    {at: CUE.end, cam: putaway, ease: linear},
  );
  return keys;
};

export const cameraAt = (beat: number, W: number, H: number): Cam => {
  const keys = keysFor(W, H);
  if (beat <= keys[0].at) return keys[0].cam;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const bk = keys[i + 1];
    if (beat >= a.at && beat < bk.at) {
      if (bk.ease === 'cut') return a.cam;
      const e = bk.ease ?? linear;
      const t = e(interpolate(beat, [a.at, bk.at], [0, 1]));
      return {
        x: a.cam.x + (bk.cam.x - a.cam.x) * t,
        y: a.cam.y + (bk.cam.y - a.cam.y) * t,
        z: Math.exp(Math.log(a.cam.z) + (Math.log(bk.cam.z) - Math.log(a.cam.z)) * t),
      };
    }
  }
  return keys[keys.length - 1].cam;
};

/** Screen-space motion blur (px) from camera velocity: slow pushes stay sharp, whips smear. */
export const cameraBlur = (beat: number, W: number, H: number) => {
  const c1 = cameraAt(beat, W, H);
  const c0 = cameraAt(beat - 1 / FPB, W, H);
  const zb = Math.abs(Math.log(c1.z / c0.z)) * W * 0.25;
  const dx = Math.abs(c1.x - c0.x) * c1.z;
  const dy = Math.abs(c1.y - c0.y) * c1.z;
  // a hard cut is not motion: never smear the first frame of a new shot
  const cutJustHappened = keysFor(W, H).some((k) => k.ease === 'cut' && k.at > beat - 1 / FPB && k.at <= beat + 1e-6);
  if (cutJustHappened) return {bx: 0, by: 0};
  const k = 0.45;
  const bx = Math.min(30, Math.max(0, dx * k + zb * k - 1.5));
  const by = Math.min(30, Math.max(0, dy * k + zb * k - 1.5));
  return {bx, by};
};
