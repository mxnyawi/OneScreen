import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Camera, keys} from '../components/Camera';
import {Background} from '../components/Background';
import {CURSOR_W, Desk, LAPTOP} from '../components/Desk';
import {Kinetic, words} from '../components/Kinetic';
import {punchAt, SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {placeDesk, useLayout} from '../layout';

export const HOOK_LEN = 90;
const WALL_X = LAPTOP.x + LAPTOP.w - CURSOR_W - 2;
const CY = 470;
// every bonk lands on the beat (120 BPM = 15 frames); 'nope' lands on the first kick (60)
export const BONKS = [15, 30, 45, 60, 75];

/** Desk + cursor slamming into an invisible wall. Shared by Hook + Thumbnail. */
export const useWallCursor = (frame: number) => {
  const approach = interpolate(frame, [0, 15], [WALL_X - 170, WALL_X], {
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

/** Where the desk sits at the end of the hook (Why picks it up from here). */
export const hookDesk = (width: number, height: number, portrait: boolean) =>
  portrait ? placeDesk(width * 1.08, width / 2, height * 0.5) : placeDesk(width * 0.8, width / 2, height * 0.6);

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, portrait, u} = useLayout();
  const c = useWallCursor(frame);
  const desk = hookDesk(width, height, portrait);
  // camera: open tight on the cursor slamming the edge, pull back on the drop (beat 3 -> 4)
  // aim just inside the laptop's right edge so frame 0 already shows screen + cursor + the gap
  const focus = {x: desk.left + (LAPTOP.x + LAPTOP.w - 30) * desk.scale, y: desk.top + 480 * desk.scale};
  const zoom = keys(frame, [0, 44, 58], [portrait ? 1.55 : 1.9, portrait ? 1.45 : 1.75, 1]);
  const textSize = (portrait ? 118 : 104) * u;
  return (
    <AbsoluteFill>
      <Background />
      <SceneIn punch={c.hit * 0.02} push={0} enter={false}>
        <Camera zoom={zoom} focus={focus} width={width} height={height}>
        <Desk
          {...desk}
          cursor={{x: c.x, y: c.y, squash: c.hit * 0.9}}
          wallHit={Math.max(c.hit, frame > BONKS[1] ? 0.25 : 0)}
          shake={c.hit}
          shakeSeed={frame}
          arrow={frame > 48 ? {progress: interpolate(frame, [48, 62], [0, 1], {extrapolateRight: 'clamp'}), state: 'blocked'} : null}
          dimMonitor={0.2}
        />
        </Camera>
        {/* keep captions legible over the zoomed desk */}
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(13,10,38,0.75) 0%, rgba(13,10,38,0) 34%)'}} />
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
                start={-6}
                exitAt={53}
              />
            </div>
            <div style={{position: 'absolute', width: '100%', display: 'flex', justifyContent: 'center'}}>
              <Kinetic
                words={words(portrait ? 'Mouse says / nope.' : 'Mouse says nope.', {nope: 'red'})}
                size={textSize}
                start={60}
                stagger={4}
                exitAt={83}
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
