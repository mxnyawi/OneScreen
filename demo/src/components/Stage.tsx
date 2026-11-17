import React from 'react';
import {AbsoluteFill} from 'remotion';
import {c} from '../theme';

/** Near-black stage, radial lift at the upper centre, one cool off-centre glow, corner vignette. */
export const Stage: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: c.stage,
      backgroundImage: [
        'radial-gradient(ellipse 60% 50% at 50% 18%, rgba(120,140,190,0.10) 0%, rgba(0,0,0,0) 70%)',
        'radial-gradient(ellipse 40% 40% at 82% 70%, rgba(90,120,255,0.05) 0%, rgba(0,0,0,0) 70%)',
      ].join(', '),
    }}
  />
);

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(ellipse 85% 85% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
      pointerEvents: 'none',
    }}
  />
);

/** World-space hairline grid on a 48 px module (every 4th line brighter). `px` = 1 screen px in world units. */
export const Grid: React.FC<{px: number; opacity?: number}> = ({px, opacity = 1}) => {
  const w = Math.max(px, 0.5);
  const minor = `rgba(255,255,255,0.03)`;
  const major = `rgba(255,255,255,0.06)`;
  return (
    <div
      style={{
        position: 'absolute',
        left: -3264,
        top: -2016,
        width: 6528,
        height: 4032,
        opacity,
        backgroundImage: [
          `linear-gradient(${major} ${w}px, transparent ${w}px)`,
          `linear-gradient(90deg, ${major} ${w}px, transparent ${w}px)`,
          `linear-gradient(${minor} ${w}px, transparent ${w}px)`,
          `linear-gradient(90deg, ${minor} ${w}px, transparent ${w}px)`,
        ].join(', '),
        backgroundSize: '192px 192px, 192px 192px, 48px 48px, 48px 48px',
      }}
    />
  );
};
