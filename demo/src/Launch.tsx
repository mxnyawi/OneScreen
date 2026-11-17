import React from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Flood} from './components/Flood';
import {useLayout} from './layout';
import {colors} from './theme';
import {Sfx} from './components/Sfx';
import {Cta, CTA_LEN} from './scenes/Cta';
import {Features, FEATURES_LEN} from './scenes/Features';
import {Flip, FLIP_LEN, flipClick} from './scenes/Flip';
import {Hook, HOOK_LEN} from './scenes/Hook';
import {OldWay, OLD_LEN, oldWayStopwatch} from './scenes/OldWay';
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
const startOf = (name: string) => {
  let at = 0;
  for (const s of SCENES) {
    if (s.name === name) return at;
    at += s.len;
  }
  throw new Error(name);
};
const REVEAL_AT = startOf('Reveal');
const FLIP_AT = startOf('Flip');
const FEATURES_AT = startOf('Features');
const CTA_AT = startOf('CTA');

const FloodStopwatch: React.FC = () => {
  const {width, height, portrait, square, u} = useLayout();
  return (
    <Flood
      from={oldWayStopwatch(width, height, portrait, square, u)}
      to={{x: width / 2, y: height / 2}}
      color={colors.pink}
      cutAt={9}
      shrink={1}
    />
  );
};

const FloodClick: React.FC = () => {
  const {width, height, portrait, square} = useLayout();
  return (
    <Flood
      from={flipClick(width, height, portrait, square)}
      to={{x: width / 2, y: height * 0.3}}
      color={colors.violet}
      cutAt={9}
    />
  );
};

/** Full launch video. The same composition renders 16:9, 9:16 and 1:1. */
export const Launch: React.FC<{music?: boolean}> = ({music = true}) => {
  const {durationInFrames} = useVideoConfig();
  let at = 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#0D0A26'}}>
      {SCENES.map(({name, C, len}) => {
        const from = at;
        at += len;
        return (
          <Sequence key={name} name={name} from={from} durationInFrames={len}>
            <C />
          </Sequence>
        );
      })}
      {/* shape-driven transitions (no flashes): the stopwatch floods into the logo, the final click floods into Features */}
      <Sequence name="Flood: stopwatch -> logo" from={REVEAL_AT - 9} durationInFrames={22} layout="none">
        <FloodStopwatch />
        <Sfx at={0} name="whoosh" volume={0.6} />
      </Sequence>
      <Sequence name="Flood: click -> features" from={FEATURES_AT - 9} durationInFrames={22} layout="none">
        <FloodClick />
        <Sfx at={0} name="whoosh" volume={0.6} />
      </Sequence>
      {/* hard cuts that land on a downbeat get a soft whip */}
      {[FLIP_AT, CTA_AT].map((at) => (
        <Sfx key={at} at={at - 2} name="whip" volume={0.3} />
      ))}
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
