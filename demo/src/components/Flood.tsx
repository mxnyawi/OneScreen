import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {useLayout} from '../layout';

/**
 * Shape-driven transition: a circle grows from `from` until it floods the frame
 * (the cut happens underneath at `cutAt`), then contracts into `to`.
 */
export const Flood: React.FC<{
  from: {x: number; y: number};
  to: {x: number; y: number};
  color: string;
  cutAt: number; // local frame where the frame is fully covered
  grow?: number;
  shrink?: number;
}> = ({from, to, color, cutAt, grow = 9, shrink = 10}) => {
  const frame = useCurrentFrame();
  const {width, height} = useLayout();
  const before = frame < cutAt;
  const p = before
    ? interpolate(frame, [cutAt - grow, cutAt], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.in(Easing.cubic),
      })
    : interpolate(frame, [cutAt, cutAt + shrink], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      });
  if (p <= 0) return null;
  const c = before ? from : to;
  // radius needed to cover every corner from c, overscaled a little
  const R =
    Math.max(
      Math.hypot(c.x, c.y),
      Math.hypot(width - c.x, c.y),
      Math.hypot(c.x, height - c.y),
      Math.hypot(width - c.x, height - c.y),
    ) * 1.08;
  const r = R * p;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: c.x - r,
          top: c.y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          background: color,
        }}
      />
    </AbsoluteFill>
  );
};
