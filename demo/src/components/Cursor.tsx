import React from 'react';

/**
 * The protagonist. Arrow pointer drawn at height `h` (world px), hotspot = tip at (x, y).
 * sx/sy squash and stretch around the tip.
 */
export const Cursor: React.FC<{x: number; y: number; h: number; sx?: number; sy?: number; opacity?: number; origin?: string}> = ({
  x,
  y,
  h,
  sx = 1,
  sy = 1,
  opacity = 1,
  origin = '0% 0%',
}) => {
  const w = (h * 17) / 26;
  return (
    <svg
      viewBox="0 0 17 26"
      width={w}
      height={h}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        overflow: 'visible',
        scale: `${sx} ${sy}`,
        transformOrigin: origin,
        opacity,
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))',
      }}
    >
      <path
        d="M1 1 L1 20.6 L5.6 16.3 L8.7 23.6 L11.9 22.3 L8.9 15.2 L15.2 15.2 Z"
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
};
