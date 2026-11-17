import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Cursor} from '../components/Cursor';
import {Pill} from '../components/Kinetic';
import {LogoMark, Wordmark} from '../components/Logo';
import {SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {colors, fonts} from '../theme';
import {useLayout} from '../layout';

export const CTA_LEN = 90;
const CLICK = 46;
export const REPO = 'github.com/mxnyawi/OneScreen';

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {portrait, width, height, u} = useLayout();
  const s = spring({frame, fps, config: {damping: 12, stiffness: 170}});
  const btn = spring({frame: frame - 14, fps, config: {damping: 11, stiffness: 200}});
  const press = interpolate(frame, [CLICK - 2, CLICK, CLICK + 6], [1, 0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const starred = frame >= CLICK;
  const burst = interpolate(frame, [CLICK, CLICK + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const size = (portrait ? 130 : 130) * u;
  // cursor flies in to the button
  const cp = interpolate(frame, [18, CLICK - 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  // cursor offset relative to its resting spot on the button
  const curDX = interpolate(cp, [0, 1], [width * 0.45, 0]);
  const curDY = interpolate(cp, [0, 1], [height * 0.35, 0]);
  return (
    <AbsoluteFill>
      <Background intensity={1.2} />
      <SceneIn push={0.02}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40 * u}}>
          <div
            style={{
              display: 'flex',
              flexDirection: portrait ? 'column' : 'row',
              alignItems: 'center',
              gap: 36 * u,
              scale: `${0.6 + 0.4 * s}`,
              opacity: s,
            }}
          >
            <LogoMark size={size} />
            <Wordmark size={size} />
          </div>
          <div style={{opacity: s}}>
            <Pill text="FREE & OPEN SOURCE · macOS + WINDOWS" bg={colors.mint} size={(portrait ? 30 : 30) * u} />
          </div>
          <div style={{position: 'relative', marginTop: 30 * u}}>
          <div style={{position: 'relative', scale: `${(0.5 + 0.5 * btn) * press}`, opacity: btn}}>
            {/* star burst */}
            {starred
              ? Array.from({length: 14}).map((_, i) => {
                  const a = (i / 14) * Math.PI * 2 + random(`a${i}`) * 0.3;
                  const r = (140 + random(`r${i}`) * 160) * u * burst;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: 18 * u,
                        height: 18 * u,
                        borderRadius: 5 * u,
                        background: [colors.yellow, colors.pink, colors.cyan, colors.mint, colors.orange][i % 5],
                        translate: `${Math.cos(a) * r - 9 * u}px ${Math.sin(a) * r - 9 * u}px`,
                        rotate: `${burst * 360 * (i % 2 ? 1 : -1)}deg`,
                        opacity: 1 - burst,
                      }}
                    />
                  );
                })
              : null}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22 * u,
                padding: `${24 * u}px ${44 * u}px`,
                borderRadius: 999,
                background: starred ? colors.yellow : '#fff',
                color: '#0D0A26',
                fontFamily: fonts.sans,
                fontWeight: 800,
                fontSize: 46 * u,
                boxShadow: starred ? `0 0 ${60 * u}px rgba(255,225,77,0.7)` : '0 20px 50px rgba(0,0,0,0.4)',
              }}
            >
              <span style={{fontSize: 52 * u, scale: starred ? `${1 + (1 - burst) * 0.6}` : '1'}}>{starred ? '★' : '☆'}</span>
              Star on GitHub
            </div>
          </div>
            <Cursor
              x={140 * u + curDX}
              y={40 * u + curDY}
              size={64 * u}
              opacity={interpolate(frame, [18, 22, CLICK + 20, CLICK + 30], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
            />
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontWeight: 700,
              fontSize: (portrait ? 38 : 36) * u,
              color: colors.dim,
              opacity: btn,
            }}
          >
            {REPO}
          </div>
        </AbsoluteFill>
      </SceneIn>
      <Sfx at={0} name="whoosh" volume={0.7} />
      <Sfx at={CLICK} name="mouse-click" volume={0.8} />
      <Sfx at={CLICK + 1} name="ding" volume={0.6} />
    </AbsoluteFill>
  );
};
