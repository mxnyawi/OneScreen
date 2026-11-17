import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {CURSOR_W, Desk, LAPTOP} from '../components/Desk';
import {Kinetic, words} from '../components/Kinetic';
import {punchAt, SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {placeDesk, useLayout} from '../layout';

export const HOOK_LEN = 90;
const WALL_X = LAPTOP.x + LAPTOP.w - CURSOR_W - 2;
const CY = 470;
export const BONKS = [12, 27, 42, 55, 66];

/** Desk + cursor slamming into an invisible wall. Shared by Hook + Thumbnail. */
export const useWallCursor = (frame: number) => {
  const approach = interpolate(frame, [0, 12], [300, WALL_X], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  // between bonks, pull back a little and slam again
  let x = approach;
  for (let i = 0; i < BONKS.length - 1; i++) {
    const a = BONKS[i];
    const b = BONKS[i + 1];
    if (frame >= a && frame < b) {
      const p = (frame - a) / (b - a);
      x = WALL_X - Math.sin(p * Math.PI) * 55 * (p < 0.5 ? 1 : Math.pow(1 - p, 0.2) + 0.4);
      x = Math.min(WALL_X, x);
    }
  }
  if (frame >= BONKS[BONKS.length - 1]) x = WALL_X;
  const hit = punchAt(frame, BONKS, 10);
  return {x, y: CY, hit};
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, portrait, u} = useLayout();
  const c = useWallCursor(frame);
  const desk = portrait
    ? placeDesk(width * 1.08, width / 2, height * 0.5)
    : placeDesk(width * 0.8, width / 2, height * 0.6);
  const textSize = (portrait ? 118 : 104) * u;
  return (
    <AbsoluteFill>
      <Background />
      <SceneIn punch={c.hit * 0.02}>
        <Desk
          {...desk}
          cursor={{x: c.x, y: c.y, squash: c.hit * 0.9}}
          wallHit={Math.max(c.hit, frame > BONKS[1] ? 0.25 : 0)}
          shake={c.hit}
          shakeSeed={frame}
          arrow={frame > 24 ? {progress: interpolate(frame, [24, 40], [0, 1], {extrapolateRight: 'clamp'}), state: 'blocked'} : null}
          dimMonitor={0.2}
        />
        <AbsoluteFill
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: portrait ? height * 0.13 : height * 0.07,
            paddingLeft: 60 * u,
            paddingRight: 60 * u,
          }}
        >
          <div style={{position: 'relative', width: '100%', display: 'flex', justifyContent: 'center'}}>
            <div style={{position: 'absolute', width: '100%', display: 'flex', justifyContent: 'center'}}>
              <Kinetic
                words={words(portrait ? 'Monitor is / right there.' : 'Monitor is right there.', {there: 'yellow'})}
                size={textSize}
                start={1}
                exitAt={40}
              />
            </div>
            <div style={{position: 'absolute', width: '100%', display: 'flex', justifyContent: 'center'}}>
              <Kinetic
                words={words(portrait ? 'Mouse says / nope.' : 'Mouse says nope.', {nope: 'red'})}
                size={textSize}
                start={46}
                stagger={4}
              />
            </div>
          </div>
        </AbsoluteFill>
      </SceneIn>
      {BONKS.map((b) => (
        <Sfx key={b} at={b} name="bonk" volume={0.9} />
      ))}
    </AbsoluteFill>
  );
};
