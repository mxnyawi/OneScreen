import React from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Flash} from './components/Scene';
import {Sfx} from './components/Sfx';
import {Cta, CTA_LEN} from './scenes/Cta';
import {Features, FEATURES_LEN} from './scenes/Features';
import {Flip, FLIP_LEN} from './scenes/Flip';
import {Hook, HOOK_LEN} from './scenes/Hook';
import {OldWay, OLD_LEN} from './scenes/OldWay';
import {Reveal, REVEAL_LEN} from './scenes/Reveal';
import {Why, WHY_LEN} from './scenes/Why';

const SCENES = [
  {name: 'Hook', C: Hook, len: HOOK_LEN},
  {name: 'Why', C: Why, len: WHY_LEN},
  {name: 'Old way', C: OldWay, len: OLD_LEN},
  {name: 'Reveal', C: Reveal, len: REVEAL_LEN},
  {name: 'Flip', C: Flip, len: FLIP_LEN},
  {name: 'Features', C: Features, len: FEATURES_LEN},
  {name: 'CTA', C: Cta, len: CTA_LEN},
] as const;

export const LAUNCH_LEN = SCENES.reduce((a, s) => a + s.len, 0);

/** Full launch video. The same composition renders 16:9, 9:16 and 1:1. */
export const Launch: React.FC<{music?: boolean}> = ({music = true}) => {
  const {durationInFrames} = useVideoConfig();
  let at = 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#0D0A26'}}>
      {SCENES.map(({name, C, len}, i) => {
        const from = at;
        at += len;
        return (
          <Sequence key={name} name={name} from={from} durationInFrames={len}>
            <C />
            {i > 0 && name !== 'Reveal' ? (
              <Sequence durationInFrames={6} layout="none">
                <Flash color="#ffffff" frames={5} />
              </Sequence>
            ) : null}
            {i > 0 ? <Sfx at={0} name="whip" volume={0.35} /> : null}
          </Sequence>
        );
      })}
      {music ? (
        <Audio
          src={staticFile('sfx/beat.wav')}
          volume={(f) =>
            interpolate(f, [0, 4, durationInFrames - 25, durationInFrames - 1], [0, 0.42, 0.42, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
