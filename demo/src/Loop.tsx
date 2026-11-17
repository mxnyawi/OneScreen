import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Wordmark} from './components/Logo';
import {Flip} from './scenes/Flip';
import {useLayout} from './layout';

/** Short seamless-ish loop of just the gesture: for the README GIF and social autoplay. */
export const Loop: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const {u} = useLayout();
  const fade = interpolate(frame, [0, 6, durationInFrames - 8, durationInFrames - 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{backgroundColor: '#0D0A26'}}>
      <AbsoluteFill style={{opacity: fade}}>
        <Flip captions={false} sfx={false} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 40 * u, bottom: 34 * u}}>
        <Wordmark size={56 * u} />
      </div>
    </AbsoluteFill>
  );
};
