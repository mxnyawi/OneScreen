import React from 'react';
import {colors, fonts, gradients} from '../theme';

/** OneScreen mark: two screens snapping into one, with a glowing seam. */
export const LogoMark: React.FC<{size: number; merge?: number}> = ({size, merge = 1}) => {
  const gap = (1 - merge) * size * 0.35;
  return (
    <div style={{position: 'relative', width: size * 1.25 + gap, height: size}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: size * 0.14,
          width: size * 0.62,
          height: size * 0.72,
          borderRadius: size * 0.14,
          background: gradients.laptopWall,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: size * 0.6 + gap,
          top: 0,
          width: size * 0.65,
          height: size,
          borderRadius: size * 0.14,
          background: gradients.monitorWall,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: size * 0.585 + gap / 2,
          top: size * 0.1,
          width: size * 0.06,
          height: size * 0.8,
          borderRadius: size,
          background: gradients.glow,
          boxShadow: `0 0 ${size * 0.25}px ${colors.cyan}`,
          opacity: merge,
        }}
      />
    </div>
  );
};

export const Wordmark: React.FC<{size: number}> = ({size}) => (
  <div
    style={{
      fontFamily: fonts.display,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: -size * 0.04,
      lineHeight: 1,
      color: colors.ink,
    }}
  >
    One
    <span
      style={{
        background: gradients.brand,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      Screen
    </span>
  </div>
);
