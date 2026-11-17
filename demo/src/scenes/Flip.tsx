import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {ArrangementPanel} from '../components/ArrangementPanel';
import {Camera, keys} from '../components/Camera';
import {Background} from '../components/Background';
import {CURSOR_W, Desk, LAPTOP, MONITOR, laptopToMonitorY} from '../components/Desk';
import {Kinetic, words} from '../components/Kinetic';
import {punchAt, SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {colors, fonts} from '../theme';
import {placeDesk, useLayout} from '../layout';

export const FLIP_LEN = 180;
// key frames (local)
// all on the 120 BPM grid (15 frames per beat)
const ARRIVE = 15; // beat 1: cursor reaches the edge
const TRIGGER = 45; // beat 3: push threshold reached -> flip
const LAND = 51; // cursor lands on the monitor
const CLICK = 105; // beat 7

const WALL_X = LAPTOP.x + LAPTOP.w - CURSOR_W - 2;
const CY = 470;
const ENTRY_X = MONITOR.x + 4;
const ENTRY_Y = laptopToMonitorY(CY);
const TARGET = {x: MONITOR.x + 520, y: MONITOR.y + 210};

const flipDesk = (width: number, height: number, portrait: boolean, square: boolean) =>
  portrait
    ? placeDesk(width * 1.08, width / 2, height * 0.47)
    : square
      ? placeDesk(width * 1.04, width / 2, height * 0.6)
      : placeDesk(width * 0.68, width * 0.4, height * 0.58);

/** Screen position of the final click (the flood into Features starts there). */
export const flipClick = (width: number, height: number, portrait: boolean, square: boolean) => {
  const d = flipDesk(width, height, portrait, square);
  return {x: d.left + TARGET.x * d.scale, y: d.top + TARGET.y * d.scale};
};

/** The money shot: push -> flip -> glide -> glow. `captions` off for the loop/GIF. */
export const Flip: React.FC<{captions?: boolean; sfx?: boolean}> = ({captions = true, sfx = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width, height, portrait, square, u} = useLayout();

  // ---- cursor path
  let x: number;
  let y = CY;
  let squash = 0;
  let trailFrom: {x: number; y: number} | null = null;
  if (frame < ARRIVE) {
    x = interpolate(frame, [0, ARRIVE], [300, WALL_X], {easing: Easing.inOut(Easing.quad), extrapolateLeft: 'clamp'});
    y = interpolate(frame, [0, ARRIVE], [530, CY], {extrapolateLeft: 'clamp'});
  } else if (frame < TRIGGER) {
    // repeated nudges against the edge
    const nudge = Math.abs(Math.sin((frame - ARRIVE) * 0.55));
    x = WALL_X - (1 - nudge) * 10;
    squash = nudge * 0.55;
  } else if (frame < LAND) {
    const p = interpolate(frame, [TRIGGER, LAND], [0, 1], {easing: Easing.out(Easing.cubic)});
    x = interpolate(p, [0, 1], [WALL_X, ENTRY_X]);
    y = interpolate(p, [0, 1], [CY, ENTRY_Y]);
    trailFrom = {x: WALL_X, y: CY};
  } else {
    const p = interpolate(frame, [LAND + 6, CLICK - 4], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    });
    x = interpolate(p, [0, 1], [ENTRY_X, TARGET.x]);
    y = interpolate(p, [0, 1], [ENTRY_Y, TARGET.y]) - Math.sin(p * Math.PI) * 50;
    const tail = interpolate(frame, [LAND, LAND + 8], [1, 0], {extrapolateRight: 'clamp'});
    if (tail > 0) trailFrom = {x: interpolate(tail, [0, 1], [ENTRY_X, WALL_X]), y: interpolate(tail, [0, 1], [ENTRY_Y, CY])};
  }
  const ring =
    frame >= ARRIVE && frame < LAND + 6
      ? interpolate(frame, [ARRIVE + 2, TRIGGER], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)})
      : 0;
  // glow: ~150 ms in, ~700 ms out (PRD A6)
  const glow = interpolate(frame, [LAND - 2, LAND + 3, LAND + 8, LAND + 30], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const side = spring({frame: frame - TRIGGER, fps, config: {damping: 12, stiffness: 210}});
  const hit = punchAt(frame, [TRIGGER], 12);
  const click = interpolate(frame, [CLICK, CLICK + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // ---- layout
  const desk = flipDesk(width, height, portrait, square);
  const panelW = portrait ? width * 0.62 : square ? width * 0.34 : width * 0.26;
  const panelPos = portrait
    ? {left: (width - panelW) / 2, top: height * 0.68}
    : square
      ? {left: width - panelW - 30 * u, top: 30 * u}
      : {left: width * 0.71, top: height * 0.36};

  const before = frame < TRIGGER + 4;
  const chip = spring({frame: frame - (LAND + 18), fps, config: {damping: 12, stiffness: 200}});
  const textSize = (portrait ? 108 : 92) * u;
  const clickPos = {x: desk.left + (TARGET.x + 4) * desk.scale, y: desk.top + (TARGET.y + 4) * desk.scale};

  // camera: creep in on the edge while pushing, snap back out on the flip
  const edge = {x: desk.left + (LAPTOP.x + LAPTOP.w + 60) * desk.scale, y: desk.top + CY * desk.scale};
  const zoom = keys(frame, [ARRIVE, TRIGGER - 1, TRIGGER + 12], [1, portrait ? 1.3 : 1.45, 1]);
  const blurOn = frame >= TRIGGER - 2 && frame <= LAND + 12;

  const visuals = (
    <>
      <Background intensity={1 + hit * 0.6} />
      <SceneIn punch={hit * 0.03} enter={captions}>
        <Camera zoom={zoom} focus={edge} centre={0.6} width={width} height={height}>
        <Desk
          {...desk}
          cursor={{x, y, squash, ring, trailFrom}}
          glow={glow}
          glowY={ENTRY_Y + 14}
          dimMonitor={interpolate(frame, [TRIGGER, LAND], [0.25, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
        {/* click ripple */}
        {click > 0 && click < 1 ? (
          <div
            style={{
              position: 'absolute',
              left: clickPos.x - 60 * u * click,
              top: clickPos.y - 60 * u * click,
              width: 120 * u * click,
              height: 120 * u * click,
              borderRadius: '50%',
              border: `${6 * u}px solid ${colors.yellow}`,
              opacity: 1 - click,
            }}
          />
        ) : null}
        </Camera>
        {square && captions ? null : (
          <div style={{position: 'absolute', ...panelPos}}>
            <ArrangementPanel side={side} status={side > 0.5 ? 'right' : 'wrong'} width={panelW} />
          </div>
        )}
        {captions ? (
          <AbsoluteFill
            style={{
              alignItems: 'center',
              paddingTop: portrait ? height * 0.12 : height * 0.06,
              paddingLeft: 60 * u,
              paddingRight: 60 * u,
            }}
          >
            <div style={{position: 'relative', width: '100%'}}>
              <div style={{position: 'absolute', width: '100%'}}>
                <Kinetic
                  words={words(portrait ? 'Just push / toward it.' : 'Just push toward it.', {push: 'yellow'})}
                  size={textSize}
                  start={1}
                  exitAt={TRIGGER + 2}
                />
              </div>
              {!before ? (
                <div style={{position: 'absolute', width: '100%'}}>
                  <Kinetic
                    words={words(portrait ? 'Flipped. / Instantly.' : 'Flipped. Instantly.', {Instantly: 'mint'})}
                    size={textSize}
                    start={TRIGGER + 4}
                    stagger={5}
                  />
                </div>
              ) : null}
            </div>
          </AbsoluteFill>
        ) : null}
        {captions ? (
          <div
            style={{
              position: 'absolute',
              left: portrait ? 0 : panelPos.left,
              width: portrait ? width : panelW,
              top: portrait ? height * 0.85 : panelPos.top + panelW * (300 / 520) + 34 * u,
              display: 'flex',
              justifyContent: 'center',
              opacity: chip,
              scale: `${0.6 + 0.4 * chip}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18 * u,
                padding: `${14 * u}px ${28 * u}px`,
                borderRadius: 999,
                background: 'rgba(22,18,52,0.85)',
                border: '2px solid rgba(255,255,255,0.18)',
                fontFamily: fonts.mono,
                fontWeight: 700,
                fontSize: 50 * u,
                color: '#fff',
              }}
            >
              <span style={{color: colors.red, textDecoration: 'line-through', textDecorationThickness: 5 * u}}>0:47</span>
              <span style={{color: colors.dim}}>→</span>
              <span style={{color: colors.mint}}>0.4s</span>
            </div>
          </div>
        ) : null}
      </SceneIn>
    </>
  );

  return (
    <AbsoluteFill>
      {blurOn ? (
        <CameraMotionBlur samples={6} shutterAngle={200}>
          {visuals}
        </CameraMotionBlur>
      ) : (
        visuals
      )}
      {sfx ? (
        <>
          <Sfx at={ARRIVE} name="bonk" volume={0.6} />
          <Sfx at={ARRIVE + 10} name="bonk" volume={0.4} />
          <Sfx at={ARRIVE + 20} name="bonk" volume={0.4} />
          <Sfx at={TRIGGER - 1} name="whoosh" volume={0.9} />
          <Sfx at={TRIGGER} name="impact" volume={0.9} />
          <Sfx at={LAND} name="ding" volume={0.5} />
          <Sfx at={LAND + 18} name="pop" volume={0.5} />
          <Sfx at={CLICK} name="mouse-click" volume={0.7} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
