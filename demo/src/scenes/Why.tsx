import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArrangementPanel} from '../components/ArrangementPanel';
import {Background} from '../components/Background';
import {CURSOR_W, Desk, LAPTOP} from '../components/Desk';
import {Kinetic, words} from '../components/Kinetic';
import {SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {fonts} from '../theme';
import {placeDesk, useLayout} from '../layout';

export const WHY_LEN = 90;

export const Why: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width, height, portrait, u} = useLayout();
  const panelIn = spring({frame: frame - 8, fps, config: {damping: 13, stiffness: 180}});
  const desk = portrait
    ? placeDesk(width * 0.9, width / 2, height * 0.43)
    : placeDesk(width * 0.54, width * 0.3, height * 0.6);
  const panelW = portrait ? width * 0.8 : width * 0.36;
  const panelX = portrait ? (width - panelW) / 2 : width * 0.6;
  const panelY = portrait ? height * 0.6 : height * 0.42;
  const subIn = interpolate(frame, [38, 46], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Background />
      <SceneIn>
        <Desk
          {...desk}
          cursor={{x: LAPTOP.x + LAPTOP.w - CURSOR_W - 2, y: 470}}
          wallHit={0.35}
          dimMonitor={0.3}
        />
        <div
          style={{
            position: 'absolute',
            left: panelX,
            top: panelY,
            opacity: panelIn,
            translate: `0 ${(1 - panelIn) * 120 * u}px`,
            rotate: `${(1 - panelIn) * 6}deg`,
          }}
        >
          <ArrangementPanel side={0} status="wrong" width={panelW} label="What your computer thinks" />
        </div>
        <AbsoluteFill
          style={{
            alignItems: 'center',
            paddingTop: portrait ? height * 0.1 : height * 0.07,
            paddingLeft: 70 * u,
            paddingRight: 70 * u,
          }}
        >
          <Kinetic
            words={words(
              portrait ? 'Your computer / thinks it’s on / the left.' : 'Your computer thinks it’s on the left.',
              {left: 'red'},
            )}
            size={(portrait ? 100 : 84) * u}
            start={2}
            stagger={3}
          />
          <div
            style={{
              marginTop: 26 * u,
              fontFamily: fonts.sans,
              fontWeight: 600,
              fontSize: (portrait ? 48 : 44) * u,
              color: 'rgba(255,255,255,0.85)',
              opacity: subIn,
              translate: `0 ${(1 - subIn) * 20}px`,
              textAlign: 'center',
            }}
          >
            It saved one layout. You moved desks.
          </div>
        </AbsoluteFill>
      </SceneIn>
      <Sfx at={8} name="whip" volume={0.6} />
    </AbsoluteFill>
  );
};
