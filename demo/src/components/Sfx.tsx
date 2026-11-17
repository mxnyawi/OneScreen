import React from 'react';
import {Audio} from '@remotion/media';
import {Sequence, staticFile} from 'remotion';

export type SfxName =
  | 'bonk'
  | 'pop'
  | 'riser'
  | 'impact'
  | 'whoosh'
  | 'whip'
  | 'switch'
  | 'mouse-click'
  | 'ding'
  | 'shutter-modern';

/** Fire a one-shot sound effect at a (local) frame. */
export const Sfx: React.FC<{at: number; name: SfxName; volume?: number}> = ({at, name, volume = 0.8}) => (
  <Sequence from={Math.round(at)} durationInFrames={60} name={`sfx:${name}`} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);
