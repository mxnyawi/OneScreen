import React from 'react';
import {interpolate} from 'remotion';
import {colors, fonts} from '../theme';

/**
 * A generic "display arrangement" panel, like the one in the OS settings.
 * side: 0 = monitor drawn on the LEFT of the laptop, 1 = on the RIGHT.
 */
export const ArrangementPanel: React.FC<{
  side: number;
  status: 'wrong' | 'right' | 'neutral';
  label?: string;
  width?: number;
  offset?: {x: number; y: number} | null; // extra offset for the monitor rect (dragging)
  held?: boolean; // monitor rect is being dragged
  cursor?: 'monitor' | null; // draw a cursor grabbing the monitor rect
}> = ({side, status, label = 'Display arrangement', width = 520, offset = null, held = false, cursor = null}) => {
  const k = width / 600;
  const lap = {w: 140, h: 88};
  const mon = {w: 196, h: 110};
  const cy = 130;
  // laptop (primary) stays put, like the OS does; the monitor moves around it
  const lapX = 230;
  const monX = interpolate(side, [0, 1], [lapX - mon.w, lapX + lap.w]) + (offset?.x ?? 0);
  // arc over the laptop while flipping sides
  const monY = cy - mon.h / 2 + (offset?.y ?? 0) - Math.sin(Math.min(1, Math.max(0, side)) * Math.PI) * 70;
  const badge =
    status === 'wrong'
      ? {bg: colors.red, text: 'Wrong side'}
      : status === 'right'
        ? {bg: colors.mint, text: 'Matches your desk'}
        : null;
  return (
    <div
      style={{
        width: 600,
        height: 300,
        scale: `${k}`,
        transformOrigin: '0 0',
        borderRadius: 26,
        background: colors.surface,
        border: `2px solid ${colors.hairline}`,
        boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: fonts.sans,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 24,
          top: 18,
          fontSize: 28,
          fontWeight: 600,
          color: colors.dim,
        }}
      >
        {label}
      </div>
      {badge ? (
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: 14,
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 24,
            fontWeight: 700,
            background: badge.bg,
            color: '#0D0A26',
          }}
        >
          {badge.text}
        </div>
      ) : null}
      <div style={{position: 'absolute', left: 0, top: 50, width: 600, height: 250}}>
        {/* monitor */}
        <div
          style={{
            position: 'absolute',
            left: monX,
            top: monY,
            width: mon.w,
            height: mon.h,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #12C2E9 0%, #3D7BFF 50%, #7C4DFF 100%)',
            border: `4px solid ${held ? colors.yellow : 'rgba(255,255,255,0.85)'}`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 28,
          }}
        >
          Monitor
        </div>
        {/* laptop (primary, white menu-bar strip) */}
        <div
          style={{
            position: 'absolute',
            left: lapX,
            top: cy - lap.h / 2,
            width: lap.w,
            height: lap.h,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #FF5FA2 0%, #9B5CFF 55%, #4B3BFF 100%)',
            border: '4px solid rgba(255,255,255,0.85)',
            boxSizing: 'border-box',
            overflow: 'hidden',
            color: '#fff',
            fontWeight: 800,
            fontSize: 26,
          }}
        >
          <div style={{height: 9, background: 'rgba(255,255,255,0.95)'}} />
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: 70}}>Laptop</div>
        </div>
        {cursor ? (
          <svg
            viewBox="0 0 18 28"
            width={26}
            height={40}
            style={{position: 'absolute', left: monX + mon.w / 2 - 6, top: monY + mon.h / 2 - 8, overflow: 'visible'}}
          >
            <path
              d="M1 1 L1 22.5 L6.2 17.6 L9.6 25.8 L13 24.4 L9.7 16.4 L16.6 16.4 Z"
              fill="#fff"
              stroke="#111"
              strokeWidth={1.6}
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
};
