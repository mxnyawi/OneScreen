import React from 'react';
import {Audio} from '@remotion/media';
import {Sequence, staticFile} from 'remotion';
import {b} from '../film/timeline';

export type SfxName = 'tick' | 'thud' | 'whip' | 'glass' | 'snap' | 'digit' | 'shimmer' | 'crt';

/** One-shot foley at a beat. */
export const Sfx: React.FC<{beat: number; name: SfxName; volume?: number}> = ({beat, name, volume = 0.7}) => (
  <Sequence from={b(beat)} durationInFrames={b(3.5)} name={`${name}@${beat}`} layout="none">
    <Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
  </Sequence>
);
