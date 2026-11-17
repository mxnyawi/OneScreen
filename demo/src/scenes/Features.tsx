import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {Kinetic, words} from '../components/Kinetic';
import {SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {colors, fonts} from '../theme';
import {useLayout} from '../layout';

export const FEATURES_LEN = 120;

const FEATURES = [
  {n: '01', title: 'Remembers every desk', body: 'Plug in at a desk it knows and your layout comes back.', c: colors.pink},
  {n: '02', title: 'macOS + Windows', body: 'Same push, same result, on both.', c: colors.cyan},
  {n: '03', title: 'Zero setup', body: 'No sensors. No camera. No clicks.', c: colors.yellow},
];
const START = 14;
const STAGGER = 12;

export const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {portrait: tall, square, width, height, u} = useLayout();
  const portrait = tall || square;
  const k = square ? 0.72 : 1; // squeeze the column to fit 1:1
  const cardW = tall ? width * 0.84 : square ? width * 0.78 : width * 0.27;
  return (
    <AbsoluteFill>
      <Background />
      <SceneIn>
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            gap: 70 * u * k,
            paddingTop: portrait ? 0 : height * 0.02,
          }}
        >
          <Kinetic words={words('Set it. Forget it.', {Forget: 'grad'})} size={(portrait ? 110 : 92) * u * k} start={1} />
          <div
            style={{
              display: 'flex',
              flexDirection: portrait ? 'column' : 'row',
              gap: (portrait ? 36 : 40) * u * k,
            }}
          >
            {FEATURES.map((f, i) => {
              const s = spring({frame: frame - START - i * STAGGER, fps, config: {damping: 12, stiffness: 190, mass: 0.7}});
              return (
                <div
                  key={f.n}
                  style={{
                    width: cardW,
                    padding: `${38 * u * k}px ${40 * u}px`,
                    borderRadius: 36 * u,
                    background: 'rgba(22,18,52,0.78)',
                    border: '2px solid rgba(255,255,255,0.14)',
                    boxShadow: `0 30px 70px rgba(0,0,0,0.4), inset 0 ${6 * u}px 0 ${f.c}`,
                    opacity: Math.min(1, s * 2),
                    translate: `0 ${(1 - s) * 140 * u}px`,
                    rotate: `${(1 - s) * (i - 1) * 8}deg`,
                    scale: `${0.7 + 0.3 * s}`,
                    boxSizing: 'border-box',
                    fontFamily: fonts.sans,
                  }}
                >
                  <div style={{fontFamily: fonts.mono, fontWeight: 700, fontSize: 30 * u, color: f.c}}>{f.n}</div>
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 800,
                      fontSize: (portrait ? 64 : 52) * u * k,
                      letterSpacing: -1.5 * u,
                      color: '#fff',
                      marginTop: 10 * u,
                      lineHeight: 1.05,
                    }}
                  >
                    {f.title}
                  </div>
                  <div style={{fontSize: (portrait ? 36 : 30) * u * k, fontWeight: 600, color: colors.dim, marginTop: 16 * u * k, lineHeight: 1.3}}>
                    {f.body}
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </SceneIn>
      {FEATURES.map((_, i) => (
        <Sfx key={i} at={START + i * STAGGER} name="pop" volume={0.6} />
      ))}
    </AbsoluteFill>
  );
};
