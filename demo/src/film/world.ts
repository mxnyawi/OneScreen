/** World geometry in px at zoom 1. The gap between the displays is centred near x = 0. */
export type Rect = {x: number; y: number; w: number; h: number};

export const LAPTOP: Rect = {x: -700, y: -190, w: 600, h: 390};
export const MONITOR: Rect = {x: 60, y: -260, w: 760, h: 428};
/** Where macOS thinks the monitor is: hard against the laptop's left edge. */
export const GHOST: Rect = {x: -1480, y: -260, w: 760, h: 428};

export const EDGE_X = LAPTOP.x + LAPTOP.w; // the laptop's right edge
export const CURSOR_H = 30;
export const CURSOR_W = (CURSOR_H * 17) / 26;
export const CURSOR_Y = 10; // tip height on the laptop
/** Same relative height on the monitor (what OneScreen does when it carries the cursor across). */
export const toMonitorY = (y: number) => MONITOR.y + ((y - LAPTOP.y) / LAPTOP.h) * MONITOR.h;

/** Desk layouts for the memory section: [laptop, monitor, label]. */
export const LAYOUTS: {laptop: Rect; monitor: Rect; label: string}[] = [
  {laptop: LAPTOP, monitor: MONITOR, label: 'home'},
  {laptop: {...LAPTOP, x: 120}, monitor: {...MONITOR, x: -800}, label: 'office'},
  {laptop: {...LAPTOP, x: -300, y: -40}, monitor: {...MONITOR, x: -380, y: -560}, label: 'hot desk 14'},
  {laptop: LAPTOP, monitor: MONITOR, label: 'home'},
];

export const union = (...rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return {x: x0, y: y0, w: x1 - x0, h: y1 - y0};
};

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});
