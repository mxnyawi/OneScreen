import React from 'react';

/** Generic arrow pointer. (x, y) is the hotspot (tip). */
export const Cursor: React.FC<{
  x: number;
  y: number;
  size?: number;
  squash?: number; // 0..1 squash against a wall to the right
  opacity?: number;
  color?: string;
}> = ({x, y, size = 46, squash = 0, opacity = 1, color = '#FFFFFF'}) => {
  const h = size;
  const w = (size * 18) / 28;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        transformOrigin: '100% 0%',
        scale: `${1 - squash * 0.28} ${1 + squash * 0.12}`,
        filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))',
        zIndex: 50,
      }}
    >
      <svg viewBox="0 0 18 28" width={w} height={h} style={{overflow: 'visible'}}>
        <path
          d="M1 1 L1 22.5 L6.2 17.6 L9.6 25.8 L13 24.4 L9.7 16.4 L16.6 16.4 Z"
          fill={color}
          stroke="#111"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
