import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Kinetic, words} from '../components/Kinetic';
import {SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {colors, fonts, gradients} from '../theme';
import {useLayout} from '../layout';

export const FEATURES_LEN = 120;

// one card per beat (15 frames)
const START = 15;
const STAGGER = 15;

const cardStyle = (s: number, u: number, rot: number): React.CSSProperties => ({
  borderRadius: 32 * u,
  background: colors.surface,
  border: `2px solid ${colors.hairline}`,
  boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
  opacity: Math.min(1, s * 2),
  translate: `0 ${(1 - s) * 90 * u}px`,
  rotate: `${(1 - s) * rot}deg`,
  boxSizing: 'border-box',
  fontFamily: fonts.sans,
});

/** A mini display arrangement: the product's own object, not an icon. */
const MiniDesk: React.FC<{label: string; side: 'left' | 'right'; u: number}> = ({label, side, u}) => {
  const lap = (
    <div
      style={{
        width: 70 * u,
        height: 46 * u,
        borderRadius: 7 * u,
        background: gradients.laptopWall,
        border: `${3 * u}px solid #fff`,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{height: 6 * u, background: '#fff'}} />
    </div>
  );
  const mon = (
    <div
      style={{
        width: 100 * u,
        height: 60 * u,
        borderRadius: 7 * u,
        background: gradients.monitorWall,
        border: `${3 * u}px solid #fff`,
        boxSizing: 'border-box',
      }}
    />
  );
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * u}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 4 * u, height: 64 * u}}>
        {side === 'left' ? mon : lap}
        {side === 'left' ? lap : mon}
      </div>
      <div style={{fontSize: 26 * u, fontWeight: 600, color: colors.dim}}>{label}</div>
    </div>
  );
};

export const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {portrait: tall, square, width, u} = useLayout();
  const stacked = tall || square;
  const k = square ? 0.8 : 1;
  const pop = (i: number) =>
    spring({frame: frame - START - i * STAGGER, fps, config: {damping: 18, stiffness: 220, mass: 0.7}});
  const titleSize = (tall ? 62 : 54) * u * k;
  const bodySize = (tall ? 34 : 30) * u * k;

  const big = (
    <div style={{...cardStyle(pop(0), u, -2), padding: `${40 * u * k}px ${44 * u}px`, flex: stacked ? undefined : 1.35}}>
      <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: titleSize, color: '#fff', letterSpacing: -1.5 * u, lineHeight: 1.05}}>
        Remembers every desk
      </div>
      <div style={{fontSize: bodySize, fontWeight: 500, color: colors.dim, marginTop: 14 * u, lineHeight: 1.3}}>
        Plug in and your layout comes back.
      </div>
      <div style={{display: 'flex', justifyContent: 'space-around', marginTop: 40 * u * k}}>
        <MiniDesk label="Home" side="left" u={u * k} />
        <MiniDesk label="Office" side="right" u={u * k} />
      </div>
    </div>
  );
  const small = (i: number, title: string, body: string) => (
    <div style={{...cardStyle(pop(i), u, i === 1 ? 2 : -1), padding: `${34 * u * k}px ${40 * u}px`, flex: 1}}>
      <div style={{fontFamily: fonts.display, fontWeight: 800, fontSize: titleSize * 0.85, color: '#fff', letterSpacing: -1.2 * u, lineHeight: 1.05}}>
        {title}
      </div>
      <div style={{fontSize: bodySize * 0.95, fontWeight: 500, color: colors.dim, marginTop: 12 * u, lineHeight: 1.3}}>{body}</div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Background />
      <SceneIn enter={false}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 60 * u * k}}>
          <Kinetic words={words('Set it. Forget it.', {Forget: 'grad'})} size={(tall ? 110 : 92) * u * k} start={1} />
          <div
            style={{
              display: 'flex',
              flexDirection: stacked ? 'column' : 'row',
              gap: 32 * u,
              width: stacked ? width * (square ? 0.8 : 0.86) : width * 0.78,
            }}
          >
            {big}
            <div style={{display: 'flex', flexDirection: stacked ? 'row' : 'column', gap: 32 * u, flex: 1}}>
              {small(1, 'macOS and Windows', 'Same push on both.')}
              {small(2, 'No setup', 'No sensors, no camera, no clicks.')}
            </div>
          </div>
        </AbsoluteFill>
      </SceneIn>
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={START + i * STAGGER} name="pop" volume={0.6} />
      ))}
    </AbsoluteFill>
  );
};
