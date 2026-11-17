import React from 'react';
import {c, fonts} from '../theme';
import {Rect} from '../film/world';

/**
 * A display as the OS sees it: a dark raised surface, hairline border, a quiet
 * desktop with two windows. No bezels, stands or clipart.
 */
export const Display: React.FC<{
  r: Rect;
  px: number; // 1 screen px in world units
  kind: 'laptop' | 'monitor';
  lit?: number; // 0..1
  sweep?: number | null; // light-reveal front 0..1 across the surface
  squash?: {x: number; y: number}; // CRT put-away
  label?: string;
  labelOpacity?: number;
  rim?: string | null; // accent rim when a layout lands
}> = ({r, px, kind, lit = 1, sweep = null, squash = {x: 1, y: 1}, label, labelOpacity = 1, rim = null}) => {
  const radius = 12;
  const font = 20 * Math.min(px * 1.1, 2.4);
  const dark = 1 - lit;
  // light reveal: lit area trails the front, a soft 20 % glint rides on it
  const sweepMask =
    sweep === null
      ? undefined
      : `linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${sweep * 130 - 30}%, rgba(0,0,0,0.12) ${sweep * 130}%, rgba(0,0,0,0.12) 100%)`;
  return (
    <div
      style={{
        position: 'absolute',
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        scale: `${squash.x} ${squash.y}`,
        opacity: squash.x < 0.02 ? 0 : 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          background: `linear-gradient(180deg, ${c.s2} 0%, ${c.s1} 100%)`,
          boxShadow: `0 ${30}px ${80}px rgba(0,0,0,0.55), inset 0 ${px}px 0 rgba(255,255,255,0.06)`,
          outline: `${px}px solid ${rim ?? c.line}`,
          overflow: 'hidden',
          WebkitMaskImage: sweepMask,
          maskImage: sweepMask,
        }}
      >
        {/* desktop: a faint cool wash, never a colourful wallpaper */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              kind === 'laptop'
                ? 'radial-gradient(ellipse 80% 70% at 30% 20%, rgba(130,150,210,0.22), rgba(0,0,0,0) 70%)'
                : 'radial-gradient(ellipse 80% 70% at 70% 15%, rgba(130,150,210,0.22), rgba(0,0,0,0) 70%)',
          }}
        />
        {kind === 'laptop' ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 22,
              borderBottom: `${px}px solid ${c.line}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 14,
              fontFamily: fonts.mono,
              fontSize: 11,
              color: c.text3,
            }}
          >
            10:24
          </div>
        ) : null}
        <Window x={kind === 'laptop' ? 40 : 60} y={kind === 'laptop' ? 60 : 50} w={kind === 'laptop' ? 330 : 420} h={kind === 'laptop' ? 230 : 300} px={px} lines={kind === 'laptop' ? 7 : 10} />
        <Window x={kind === 'laptop' ? 330 : 440} y={kind === 'laptop' ? 150 : 120} w={kind === 'laptop' ? 220 : 270} h={kind === 'laptop' ? 170 : 220} px={px} lines={4} raised />
        <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dark * 0.82}} />
      </div>
      {label ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: r.h + 14 * Math.max(px, 0.6),
            fontFamily: fonts.mono,
            fontSize: font,
            color: c.text3,
            whiteSpace: 'nowrap',
            opacity: labelOpacity,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

const Window: React.FC<{x: number; y: number; w: number; h: number; px: number; lines: number; raised?: boolean}> = ({
  x,
  y,
  w,
  h,
  px,
  lines,
  raised,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 8,
      background: raised ? '#2B303C' : 'rgba(31,35,45,0.95)',
      outline: `${px}px solid ${c.line}`,
      boxShadow: raised ? '0 14px 30px rgba(0,0,0,0.45)' : 'none',
      overflow: 'hidden',
    }}
  >
    <div style={{height: 22, borderBottom: `${px}px solid ${c.line}`, display: 'flex', alignItems: 'center', paddingLeft: 12}}>
      <div style={{width: 48, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.22)'}} />
    </div>
    <div style={{padding: '12px 14px'}}>
      {Array.from({length: lines}).map((_, i) => (
        <div
          key={i}
          style={{
            height: 5,
            width: `${[78, 55, 66, 40, 72, 58, 34, 62, 48, 70][i % 10]}%`,
            borderRadius: 3,
            marginBottom: 11,
            background: i === 0 ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.16)',
          }}
        />
      ))}
    </div>
  </div>
);
