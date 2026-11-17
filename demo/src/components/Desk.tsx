import React from 'react';
import {random} from 'remotion';
import {colors, gradients, fonts} from '../theme';
import {Cursor} from './Cursor';

/** Desk coordinate space. Everything inside <Desk> is laid out in these units. */
export const DESK_W = 1600;
export const DESK_H = 760;
export const LAPTOP = {x: 120, y: 340, w: 500, h: 312};
export const MONITOR = {x: 830, y: 140, w: 680, h: 383};
const DESK_TOP = 690;
export const CURSOR_W = (46 * 18) / 28;

/** Map a relative height on the laptop screen to the same relative height on the monitor. */
export const laptopToMonitorY = (y: number) =>
  MONITOR.y + ((y - LAPTOP.y) / LAPTOP.h) * MONITOR.h;

export type DeskProps = {
  scale?: number;
  left?: number;
  top?: number;
  cursor?: {
    x: number;
    y: number;
    squash?: number;
    visible?: boolean;
    ring?: number; // 0..1 push meter around the cursor
    trailFrom?: {x: number; y: number} | null;
  };
  wallHit?: number; // 0..1 red flash on laptop right edge
  glow?: number; // 0..1 glow on the monitor left edge
  glowY?: number;
  arrow?: {progress: number; state: 'blocked' | 'ok'} | null;
  shake?: number;
  shakeSeed?: number;
  dimMonitor?: number; // 0..1 darken the monitor ("unreachable")
};

const WindowCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  dark?: boolean;
  children?: React.ReactNode;
}> = ({x, y, w, h, dark, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 10,
      background: dark ? 'rgba(16,14,34,0.92)' : 'rgba(255,255,255,0.94)',
      boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
      overflow: 'hidden',
    }}
  >
    <div style={{display: 'flex', gap: 6, padding: '8px 10px'}}>
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
        <div key={c} style={{width: 9, height: 9, borderRadius: 9, background: c}} />
      ))}
    </div>
    {children}
  </div>
);

const Line: React.FC<{w: number; c: string; indent?: number}> = ({w, c, indent = 0}) => (
  <div
    style={{
      height: 7,
      width: w,
      marginLeft: 14 + indent,
      marginBottom: 7,
      borderRadius: 4,
      background: c,
    }}
  />
);

const LaptopScreen: React.FC<{wallHit: number}> = ({wallHit}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: gradients.laptopWall,
      overflow: 'hidden',
    }}
  >
    <div style={{height: 16, background: 'rgba(10,8,30,0.35)'}} />
    <WindowCard x={40} y={50} w={300} h={200}>
      <div style={{padding: '6px 0'}}>
        <Line w={160} c="#1A1240" />
        <Line w={230} c="#D6D3E8" />
        <Line w={200} c="#D6D3E8" />
        <Line w={120} c={colors.pink} />
        <Line w={210} c="#D6D3E8" />
        <Line w={170} c="#D6D3E8" />
      </div>
    </WindowCard>
    <WindowCard x={300} y={150} w={170} h={120}>
      <div style={{display: 'flex', gap: 8, padding: '6px 14px'}}>
        <div style={{width: 60, height: 60, borderRadius: 12, background: gradients.brand}} />
        <div style={{flex: 1}}>
          <div style={{height: 7, borderRadius: 4, background: '#1A1240', marginBottom: 7}} />
          <div style={{height: 7, width: '70%', borderRadius: 4, background: '#D6D3E8'}} />
        </div>
      </div>
    </WindowCard>
    {/* red "wall" on the right edge */}
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 46,
        background: `linear-gradient(270deg, ${colors.red} 0%, rgba(255,77,94,0.5) 25%, transparent 100%)`,
        opacity: wallHit,
      }}
    />
  </div>
);

const MonitorScreen: React.FC<{glow: number; glowY: number; dim: number}> = ({glow, glowY, dim}) => {
  const codeColors = [colors.pink, colors.cyan, colors.yellow, colors.mint, '#B49CFF'];
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: gradients.monitorWall,
        overflow: 'hidden',
      }}
    >
      <div style={{height: 18, background: 'rgba(10,8,30,0.35)'}} />
      <WindowCard x={60} y={50} w={400} h={260} dark>
        <div style={{padding: '8px 0'}}>
          {Array.from({length: 11}).map((_, i) => (
            <Line
              key={i}
              w={60 + random(`code-${i}`) * 220}
              indent={(i % 4 === 0 ? 0 : 1 + (i % 3)) * 16}
              c={codeColors[Math.floor(random(`cc-${i}`) * codeColors.length)]}
            />
          ))}
        </div>
      </WindowCard>
      <WindowCard x={430} y={120} w={210} h={170}>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 10, padding: '20px 18px 0', height: 110}}>
          {[0.4, 0.7, 0.55, 0.9, 0.75].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%`,
                borderRadius: 5,
                background: [colors.pink, colors.orange, colors.yellow, colors.mint, colors.cyan][i],
              }}
            />
          ))}
        </div>
      </WindowCard>
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          translate: '-50% 0',
          display: 'flex',
          gap: 8,
          padding: 7,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.28)',
        }}
      >
        {[colors.pink, colors.orange, colors.yellow, colors.mint, colors.cyan, colors.violet].map((c) => (
          <div key={c} style={{width: 24, height: 24, borderRadius: 7, background: c}} />
        ))}
      </div>
      {/* darkening when the monitor is "unreachable" */}
      <div style={{position: 'absolute', inset: 0, background: '#05030F', opacity: dim * 0.55}} />
      {/* OneScreen edge glow */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 70,
          background: `linear-gradient(90deg, ${colors.cyan} 0%, rgba(46,230,255,0.55) 18%, transparent 100%)`,
          opacity: glow,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -140,
          top: glowY - 140,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(61,255,162,0.9) 0%, rgba(46,230,255,0.4) 35%, transparent 70%)`,
          opacity: glow,
          scale: `${0.6 + glow * 0.6}`,
        }}
      />
    </div>
  );
};

const Arrow: React.FC<{progress: number; state: 'blocked' | 'ok'; y: number}> = ({progress, state, y}) => {
  const x0 = LAPTOP.x + LAPTOP.w + 26;
  const x1 = MONITOR.x - 30;
  const y1 = laptopToMonitorY(y);
  const midX = (x0 + x1) / 2;
  const midY = Math.min(y, y1) - 70;
  const d = `M ${x0} ${y} Q ${midX} ${midY} ${x1} ${y1}`;
  const len = 260;
  const col = state === 'blocked' ? colors.red : colors.mint;
  const xVis = state === 'blocked' ? Math.max(0, (progress - 0.6) / 0.4) : 0;
  return (
    <svg
      width={DESK_W}
      height={DESK_H}
      style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: 40}}
    >
      <path
        d={d}
        fill="none"
        stroke={col}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={state === 'blocked' ? '4 18' : `${len} ${len}`}
        strokeDashoffset={state === 'blocked' ? 0 : len * (1 - progress)}
        opacity={state === 'blocked' ? Math.min(1, progress * 2) : 1}
        style={{filter: `drop-shadow(0 0 10px ${col})`}}
      />
      {state === 'ok' && progress > 0.95 ? (
        <path
          d={`M ${x1 - 18} ${y1 - 14} L ${x1 + 2} ${y1} L ${x1 - 20} ${y1 + 10}`}
          fill="none"
          stroke={col}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {state === 'blocked' ? (
        <g
          transform={`translate(${midX} ${(y + y1) / 2 - 36}) scale(${xVis})`}
          style={{filter: `drop-shadow(0 0 12px ${colors.red})`}}
        >
          <circle r={30} fill={colors.red} />
          <path d="M -11 -11 L 11 11 M 11 -11 L -11 11" stroke="#fff" strokeWidth={7} strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
};

export const Desk: React.FC<DeskProps> = ({
  scale = 1,
  left = 0,
  top = 0,
  cursor,
  wallHit = 0,
  glow = 0,
  glowY,
  arrow = null,
  shake = 0,
  shakeSeed = 0,
  dimMonitor = 0,
}) => {
  const sx = shake ? (random(`sx-${shakeSeed}`) - 0.5) * 18 * shake : 0;
  const sy = shake ? (random(`sy-${shakeSeed}`) - 0.5) * 10 * shake : 0;
  const gy = glowY ?? MONITOR.y + MONITOR.h / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: DESK_W,
        height: DESK_H,
        transformOrigin: '0 0',
        scale: `${scale}`,
        fontFamily: fonts.sans,
      }}
    >
      {/* desk surface */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          top: DESK_TOP,
          height: 34,
          borderRadius: 18,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04))',
          boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
        }}
      />
      {/* monitor stand */}
      <div
        style={{
          position: 'absolute',
          left: MONITOR.x + MONITOR.w / 2 - 34,
          top: MONITOR.y + MONITOR.h + 14,
          width: 68,
          height: DESK_TOP - (MONITOR.y + MONITOR.h + 14) - 10,
          background: `linear-gradient(90deg, ${colors.aluminiumDark}, ${colors.aluminium}, ${colors.aluminiumDark})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: MONITOR.x + MONITOR.w / 2 - 140,
          top: DESK_TOP - 14,
          width: 280,
          height: 16,
          borderRadius: '10px 10px 4px 4px',
          background: `linear-gradient(180deg, ${colors.aluminium}, ${colors.aluminiumDark})`,
        }}
      />
      {/* monitor */}
      <div
        style={{
          position: 'absolute',
          left: MONITOR.x - 14,
          top: MONITOR.y - 14,
          width: MONITOR.w + 28,
          height: MONITOR.h + 28,
          borderRadius: 18,
          background: colors.bezel,
          boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 ${80 * glow}px ${20 * glow}px rgba(46,230,255,${0.55 * glow})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            width: MONITOR.w,
            height: MONITOR.h,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <MonitorScreen glow={glow} glowY={gy - MONITOR.y} dim={dimMonitor} />
        </div>
      </div>
      {/* laptop */}
      <div style={{position: 'absolute', left: 0, top: 0, translate: `${sx}px ${sy}px`}}>
        <div
          style={{
            position: 'absolute',
            left: LAPTOP.x - 14,
            top: LAPTOP.y - 14,
            width: LAPTOP.w + 28,
            height: LAPTOP.h + 24,
            borderRadius: '18px 18px 6px 6px',
            background: colors.bezel,
            boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 ${60 * wallHit}px ${10 * wallHit}px rgba(255,77,94,${0.6 * wallHit})`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: 14,
              width: LAPTOP.w,
              height: LAPTOP.h,
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <LaptopScreen wallHit={wallHit} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: LAPTOP.x - 60,
            top: LAPTOP.y + LAPTOP.h + 10,
            width: LAPTOP.w + 120,
            height: DESK_TOP - (LAPTOP.y + LAPTOP.h + 10),
            clipPath: 'polygon(4% 0, 96% 0, 100% 100%, 0 100%)',
            background: `linear-gradient(180deg, ${colors.aluminium}, ${colors.aluminiumDark})`,
            borderRadius: '0 0 12px 12px',
          }}
        />
      </div>
      {arrow && cursor ? <Arrow progress={arrow.progress} state={arrow.state} y={cursor.y + 10} /> : null}
      {cursor && cursor.trailFrom ? (
        <svg
          width={DESK_W}
          height={DESK_H}
          style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: 45}}
        >
          <defs>
            <linearGradient
              id="trail"
              gradientUnits="userSpaceOnUse"
              x1={cursor.trailFrom.x}
              y1={cursor.trailFrom.y}
              x2={cursor.x}
              y2={cursor.y}
            >
              <stop offset="0" stopColor={colors.cyan} stopOpacity={0} />
              <stop offset="1" stopColor={colors.mint} stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <line
            x1={cursor.trailFrom.x}
            y1={cursor.trailFrom.y + 14}
            x2={cursor.x + 6}
            y2={cursor.y + 14}
            stroke="url(#trail)"
            strokeWidth={22}
            strokeLinecap="round"
            style={{filter: `drop-shadow(0 0 14px ${colors.cyan})`}}
          />
        </svg>
      ) : null}
      {cursor && cursor.visible !== false ? (
        <>
          {cursor.ring && cursor.ring > 0 ? (
            <svg
              width={120}
              height={120}
              style={{
                position: 'absolute',
                left: cursor.x - 60 + 10,
                top: cursor.y - 60 + 18,
                overflow: 'visible',
                zIndex: 49,
              }}
            >
              <circle cx={60} cy={60} r={46} fill="rgba(13,10,38,0.35)" stroke="rgba(255,255,255,0.25)" strokeWidth={9} />
              <circle
                cx={60}
                cy={60}
                r={46}
                fill="none"
                stroke={cursor.ring >= 1 ? colors.mint : colors.yellow}
                strokeWidth={9}
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={2 * Math.PI * 46 * (1 - Math.min(1, cursor.ring))}
                transform="rotate(-90 60 60)"
                style={{filter: `drop-shadow(0 0 8px ${cursor.ring >= 1 ? colors.mint : colors.yellow})`}}
              />
            </svg>
          ) : null}
          <Cursor x={cursor.x} y={cursor.y} squash={cursor.squash ?? 0} />
        </>
      ) : null}
    </div>
  );
};
