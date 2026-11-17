import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Kinetic, words} from '../components/Kinetic';
import {LogoMark, Wordmark} from '../components/Logo';
import {Sfx} from '../components/Sfx';
import {colors} from '../theme';
import {useLayout} from '../layout';

export const REVEAL_LEN = 60;

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {portrait, u} = useLayout();
  const s = spring({frame, fps, config: {damping: 15, stiffness: 180, mass: 0.7}});
  const merge = spring({frame: frame - 6, fps, config: {damping: 12, stiffness: 200}});
  const ring = interpolate(frame, [0, 24], [0, 1], {extrapolateRight: 'clamp'});
  const size = (portrait ? 150 : 170) * u;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: colors.pink}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            position: 'absolute',
            width: 1400 * u * ring,
            height: 1400 * u * ring,
            borderRadius: '50%',
            border: `${20 * (1 - ring)}px solid ${colors.bg}`,
            opacity: 1 - ring,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: portrait ? 'column' : 'row',
            alignItems: 'center',
            gap: 40 * u,
            scale: `${0.4 + 0.6 * s}`,
            rotate: `${(1 - s) * -4}deg`,
          }}
        >
          <LogoMark size={size} merge={merge} color={colors.bg} />
          <Wordmark size={size * (portrait ? 0.95 : 1)} color={colors.bg} />
        </div>
        <div style={{marginTop: 50 * u}}>
          <Kinetic words={words('Just push.', {push: 'ink'})} size={(portrait ? 110 : 96) * u} start={15} stagger={5} />
        </div>
      </AbsoluteFill>
      <Sfx at={0} name="impact" volume={1} />
      <Sfx at={15} name="pop" volume={0.6} />
    </AbsoluteFill>
  );
};
