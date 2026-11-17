import React from 'react';
import {Easing, interpolate} from 'remotion';

/**
 * Screen-Studio style camera. Zooms by `zoom` around the focus point (screen px)
 * and drifts that point toward the frame centre by `centre` (0..1).
 */
export const Camera: React.FC<{
  zoom: number;
  focus: {x: number; y: number};
  centre?: number;
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({zoom, focus, centre = 1, width, height, children}) => {
  const dx = (width / 2 - focus.x) * centre * (1 - 1 / Math.max(zoom, 1e-6));
  const dy = (height / 2 - focus.y) * centre * (1 - 1 / Math.max(zoom, 1e-6));
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformOrigin: `${focus.x}px ${focus.y}px`,
        scale: `${zoom}`,
        translate: `${dx}px ${dy}px`,
      }}
    >
      {children}
    </div>
  );
};

/** Premium ease used everywhere for camera moves. */
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Keyframed value with the premium ease between every key, clamped. */
export const keys = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

/** Frames per beat at 120 BPM / 30 fps. */
export const BEAT = 15;
