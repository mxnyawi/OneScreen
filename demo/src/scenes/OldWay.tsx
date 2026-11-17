import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArrangementPanel} from '../components/ArrangementPanel';
import {Background} from '../components/Background';
import {Kinetic, Pill, words} from '../components/Kinetic';
import {punchAt, SceneIn} from '../components/Scene';
import {Sfx} from '../components/Sfx';
import {colors, fonts} from '../theme';
import {useLayout} from '../layout';
import {keys} from '../components/Camera';
import {whyPanel} from './Why';

export const OLD_LEN = 120;
// on the beat grid: drop on beat 5, 'Every. Single. Desk.' on beat 6 and its eighths
const DROP = 75;
const STAMPS = [90, 98, 105];

const winWidthFor = (width: number, portrait: boolean, square: boolean) =>
  portrait ? width * 0.9 : square ? width * 0.78 : width * 0.56;

/** Centre of the red stopwatch: the flood into the reveal starts here. */
export const oldWayStopwatch = (width: number, height: number, portrait: boolean, square: boolean, u: number) => {
  const w = winWidthFor(width, portrait, square);
  return {x: (width - w) / 2 + w - 100 * u, y: (portrait ? height * 0.4 : height * 0.3)};
};

const SettingsWindow: React.FC<{w: number; children: React.ReactNode}> = ({w, children}) => {
  const k = w / 1000;
  return (
    <div
      style={{
        width: 1000,
        height: 600,
        scale: `${k}`,
        transformOrigin: '0 0',
        borderRadius: 28,
        background: '#F3F2F8',
        boxShadow: '0 40px 100px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: fonts.sans,
      }}
    >
      <div style={{height: 54, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', background: '#E6E4EF'}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <div key={c} style={{width: 15, height: 15, borderRadius: 15, background: c}} />
        ))}
        <div style={{marginLeft: 18, fontWeight: 700, fontSize: 20, color: '#555'}}>Settings › Displays › Arrange</div>
      </div>
      <div style={{flex: 1, display: 'flex'}}>
        <div style={{width: 230, padding: 22, background: '#ECEAF4'}}>
          {[0.8, 0.6, 0.7, 0.9, 0.5, 0.75, 0.65].map((w2, i) => (
            <div
              key={i}
              style={{
                height: 22,
                width: `${w2 * 100}%`,
                borderRadius: 8,
                marginBottom: 18,
                background: i === 3 ? colors.violet : '#D3D0E2',
              }}
            />
          ))}
        </div>
        <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{children}</div>
      </div>
    </div>
  );
};

export const OldWay: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width, height, portrait, square, u} = useLayout();
  // drag the monitor rect from the left to the right of the laptop, clumsily
  const dragP = interpolate(frame, [14, DROP], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const wobble = Math.sin(frame * 0.7) * 26 * Math.sin(dragP * Math.PI);
  const dropped = frame >= DROP;
  const dx = dropped ? 0 : dragP * 336 + wobble;
  const dy = dropped ? 0 : Math.sin(frame * 0.45) * 22 * Math.sin(dragP * Math.PI) - Math.sin(dragP * Math.PI) * 90;
  const seconds = Math.min(47, Math.floor(interpolate(frame, [6, DROP], [0, 47], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  const winW = winWidthFor(width, portrait, square);
  // the Settings window grows out of the arrangement panel from the previous scene
  const fromRect = whyPanel(width, height, portrait);
  const g = keys(frame, [0, 14], [0, 1]);
  const finalLeft = (width - winW) / 2;
  const finalTop = portrait ? height * 0.4 : height * 0.3;
  const winLeft = interpolate(g, [0, 1], [fromRect.x, finalLeft]);
  const winTop = interpolate(g, [0, 1], [fromRect.y, finalTop]);
  const winWidth = interpolate(g, [0, 1], [fromRect.w, winW]);
  const badges = spring({frame: frame - 10, fps, config: {damping: 18, stiffness: 220}});
  const p = punchAt(frame, STAMPS, 8);
  return (
    <AbsoluteFill>
      <Background />
      <SceneIn punch={p * 0.015} enter={false}>
        <AbsoluteFill
          style={{
            alignItems: 'center',
            paddingTop: portrait ? height * 0.1 : height * 0.06,
          }}
        >
          <div style={{position: 'relative', width: '100%', display: 'flex', justifyContent: 'center'}}>
            <div style={{position: 'absolute', width: '100%'}}>
              <Kinetic
                words={words(portrait ? 'The fix? / Dig through / Settings.' : 'The fix? Dig through Settings.', {Settings: 'pink'})}
                size={(portrait ? 104 : 88) * u}
                start={1}
                exitAt={84}
              />
            </div>
            <div style={{position: 'absolute', width: '100%'}}>
              <Kinetic
                words={words(portrait ? 'Every. / Single. / Desk.' : 'Every. Single. Desk.', {Desk: 'red'})}
                size={(portrait ? 130 : 104) * u}
                start={STAMPS[0]}
                stagger={8}
              />
            </div>
          </div>
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: winLeft,
            top: winTop,
            width: winWidth,
            height: winWidth * 0.6,
          }}
        >
          <SettingsWindow w={winWidth}>
            <ArrangementPanel
              side={dropped ? 1 : 0}
              status={dropped ? 'neutral' : 'wrong'}
              offset={{x: dx, y: dy}}
              held={frame >= 14 && !dropped}
              cursor="monitor"
              width={640}
            />
          </SettingsWindow>
          {/* stopwatch */}
          <div
            style={{
              position: 'absolute',
              right: -30 * u,
              top: -50 * u,
              padding: `${14 * u}px ${26 * u}px`,
              borderRadius: 24 * u,
              background: colors.red,
              color: '#fff',
              fontFamily: fonts.mono,
              fontWeight: 700,
              fontSize: 64 * u,
              boxShadow: '0 20px 50px rgba(255,77,94,0.45)',
              rotate: '4deg',
              scale: `${badges}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14 * u,
            }}
          >
            <span style={{fontSize: 40 * u}}>⏱</span>
            0:{String(seconds).padStart(2, '0')}
          </div>
          <div style={{position: 'absolute', left: -20 * u, top: -36 * u, rotate: '-5deg', scale: `${badges}`}}>
            <Pill text="▶▶ 16× SPEED" bg={colors.yellow} size={26 * u} />
          </div>
        </div>
      </SceneIn>
      <Sfx at={14} name="mouse-click" volume={0.7} />
      <Sfx at={DROP} name="mouse-click" volume={0.7} />
      {STAMPS.map((s) => (
        <Sfx key={s} at={s} name="bonk" volume={0.9} />
      ))}
      <Sfx at={OLD_LEN - 30} name="riser" volume={0.6} />
    </AbsoluteFill>
  );
};
