import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

/** Snappy scene entrance: quick zoom-settle + blur clear. Optional slow camera push. */
export const SceneIn: React.FC<{children: React.ReactNode; push?: number; punch?: number; enter?: boolean}> = ({
  children,
  push = 0.04,
  punch = 0,
  enter: animateIn = true,
}) => {
  const frame = useCurrentFrame();
  const enter = !animateIn ? 1 : interpolate(frame, [0, 7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill
      style={{
        scale: `${1.08 - 0.08 * enter + push * Math.min(1, frame / 150) + punch}`,
        filter: `blur(${(1 - enter) * 10}px)`,
        opacity: animateIn ? interpolate(frame, [0, 3], [0, 1], {extrapolateRight: 'clamp'}) : 1,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** White flash used on hard cuts. */
export const Flash: React.FC<{color?: string; frames?: number}> = ({color = '#fff', frames = 8}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: interpolate(frame, [0, frames], [0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        pointerEvents: 'none',
      }}
    />
  );
};

/** Decaying punch (0..1) triggered at the given local frames. */
export const punchAt = (frame: number, hits: number[], len = 8) =>
  hits.reduce((acc, h) => {
    const d = frame - h;
    if (d < 0 || d > len) return acc;
    return Math.max(acc, Math.exp(-d / (len / 3)));
  }, 0);
