/**
 * One timeline for picture and sound: 120 BPM, 60 fps -> 30 frames per beat.
 * Keep these cues in sync with scripts/make-audio.py.
 */
export const FPS = 60;
export const BPM = 120;
export const FPB = (FPS * 60) / BPM; // frames per beat
export const b = (beats: number) => Math.round(beats * FPB);
export const LENGTH_BEATS = 42;

export const CUE = {
  hits: [0, 1, 2, 3], // cursor slams the dead edge
  whipOut: 3.5, // -> 4: pull out to the wide
  insert: 7.75, // Settings window expands out of the ghost
  insertOut: 11.75,
  flash: [12, 13], // "Every desk." "Every day."
  freeze: 14, // digital silence, back on the cursor
  push: 15, // "Just push."
  pushTicks: [16, 16.5, 17, 17.25, 17.5, 17.75],
  press: 18, // the ghost flies onto the real monitor
  land: 19, // ghost lands
  number: 20, // "0 clicks"
  numberLock: 21,
  memory: 24,
  layouts: [26, 28, 30],
  putaway: 32,
  wordmark: 34,
  cta: 36,
  end: 42,
} as const;
