import React from 'react';
import {colors, fonts} from '../theme';

/**
 * OneScreen mark: two flat screens that close the gap and become one.
 * merge: 0 = apart, 1 = joined. One solid colour, no gradients or glow.
 */
export const LogoMark: React.FC<{size: number; merge?: number; color?: string}> = ({
  size,
  merge = 1,
  color = colors.cyan,
}) => {
  const gap = size * 0.08 + (1 - merge) * size * 0.3;
  const r = size * 0.16;
  return (
    <div style={{position: 'relative', width: size * 1.3 + gap - size * 0.08, height: size, flexShrink: 0}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: size * 0.16,
          width: size * 0.58,
          height: size * 0.68,
          borderRadius: r,
          background: color,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: size * 0.58 + gap,
          top: 0,
          width: size * 0.64,
          height: size,
          borderRadius: r,
          background: color,
        }}
      />
    </div>
  );
};

/** Solid wordmark. Colour comes from the mark beside it, not gradient text. */
export const Wordmark: React.FC<{size: number; color?: string}> = ({size, color = colors.ink}) => (
  <div
    style={{
      fontFamily: fonts.display,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: -size * 0.035,
      lineHeight: 1,
      color,
    }}
  >
    OneScreen
  </div>
);
