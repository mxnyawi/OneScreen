import React from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Cursor} from './components/Cursor';
import {Display} from './components/Display';
import {Headline, Mono} from './components/Headline';
import {BigNumber, FlashCard, SettingsInsert, Wordmark} from './components/Overlays';
import {Sfx} from './components/Sfx';
import {Grid, Stage, Vignette} from './components/Stage';
import {cameraAt, cameraBlur} from './film/camera';
import {back, impulse, lerp, out, seg, snap} from './film/ease';
import {CUE, FPB} from './film/timeline';
import {
  CURSOR_H,
  CURSOR_W,
  CURSOR_Y,
  EDGE_X,
  GHOST,
  LAPTOP,
  LAYOUTS,
  MONITOR,
  Rect,
  lerpRect,
  toMonitorY,
} from './film/world';
import {useLayout} from './layout';
import {c, fonts} from './theme';

const WALL_TIP_X = EDGE_X - 1.5 - CURSOR_W; // cursor fully inside, its right side on the edge
const NUDGES = [6, 6.5, 9, 10.5]; // the user keeps pushing during the problem
const CROSS = [24.75, 26.4, 28.4, 30.4]; // cursor crosses the shared edge after each layout lands

/** Which desk layout is showing, with the snap between them. */
const layoutAt = (beat: number): {laptop: Rect; monitor: Rect; label: string; idx: number} => {
  if (beat < CUE.memory) return {laptop: LAPTOP, monitor: MONITOR, label: 'home', idx: 0};
  let cur = LAYOUTS[0];
  let idx = 0;
  for (let i = 0; i < CUE.layouts.length; i++) {
    const at = CUE.layouts[i];
    const t = seg(beat, at - 0.45, at, snap);
    if (t <= 0) break;
    const nxt = LAYOUTS[i + 1];
    cur = {laptop: lerpRect(cur.laptop, nxt.laptop, t), monitor: lerpRect(cur.monitor, nxt.monitor, t), label: t > 0.5 ? nxt.label : cur.label};
    idx = t > 0.5 ? i + 1 : i;
  }
  return {...cur, idx};
};

/** The point where the cursor crosses from laptop to monitor for a layout. */
const sharedEdge = (lap: Rect, mon: Rect) => {
  if (mon.y + mon.h <= lap.y + 1) return {kind: 'h' as const, x0: Math.max(lap.x, mon.x), x1: Math.min(lap.x + lap.w, mon.x + mon.w), y: lap.y};
  if (mon.x >= lap.x + lap.w - 1) return {kind: 'v' as const, x: lap.x + lap.w, y0: lap.y, y1: lap.y + lap.h};
  return {kind: 'v' as const, x: lap.x, y0: lap.y, y1: lap.y + lap.h};
};

export const Film: React.FC<{audio?: boolean}> = ({audio = true}) => {
  const frame = useCurrentFrame();
  const beat = frame / FPB;
  const {width: W, height: H, portrait, square, u} = useLayout();
  const cam = cameraAt(beat, W, H);
  const px = 1 / cam.z;
  const {bx, by} = cameraBlur(beat, W, H);
  const toScreen = (r: Rect) => ({x: (r.x - cam.x) * cam.z + W / 2, y: (r.y - cam.y) * cam.z + H / 2, w: r.w * cam.z, h: r.h * cam.z});

  // ---------------------------------------------------------------- displays
  const lay = layoutAt(beat);
  const lap = lay.laptop;
  const mon = lay.monitor;
  const monLit = beat < CUE.press + 0.6 ? 0.32 : 1;
  const sweep = beat >= CUE.press + 0.6 && beat < CUE.land + 1.2 ? seg(beat, CUE.press + 0.6, CUE.land + 1.1, out) : null;
  const crt = (at: number) => ({
    x: 1 - seg(beat, at + 0.12, at + 0.24, snap) * 0.995,
    y: 1 - seg(beat, at, at + 0.12, snap) * 0.985,
  });
  const showWorld = beat < CUE.wordmark;

  // ---------------------------------------------------------------- ghost (where macOS thinks the monitor is)
  const fly = seg(beat, CUE.press, CUE.land, snap);
  const flyX = back(1.15)(fly);
  const ghost: Rect = {
    ...GHOST,
    x: lerp(GHOST.x, MONITOR.x, flyX),
    y: lerp(GHOST.y, MONITOR.y, fly) - Math.sin(Math.min(fly, 1) * Math.PI) * 300,
  };
  const ghostVisible = beat >= CUE.whipOut && beat < CUE.land + 0.6;
  const ghostLanded = seg(beat, CUE.land - 0.05, CUE.land + 0.1, out) * (1 - seg(beat, CUE.land + 0.2, CUE.land + 0.55, snap));

  // ---------------------------------------------------------------- cursor
  let cx = WALL_TIP_X;
  let cy = CURSOR_Y;
  let sx = 1;
  let sy = 1;
  let origin = '100% 35%';
  let trail: {x: number; y: number; o: number} | null = null;
  if (beat < 4) {
    // hits on 0,1,2,3: pull back and slam in between
    const ph = beat % 1;
    const back1 = beat < 3.0 ? Math.sin(Math.PI * Math.min(1, ph / 0.85)) * 46 * (ph < 0.85 ? 1 : 0) : 0;
    cx = WALL_TIP_X - back1;
    const imp = impulse(beat, CUE.hits, 0.3);
    sx = 1 - 0.3 * imp;
    sy = 1 + 0.1 * imp;
  } else if (beat < CUE.freeze) {
    const imp = impulse(beat, NUDGES, 0.3);
    sx = 1 - 0.22 * imp;
    sy = 1 + 0.07 * imp;
  } else if (beat < CUE.press) {
    // wind-up then accelerating pushes
    const wind = seg(beat, 15.5, 15.95, (t) => t * t);
    const firstHit = seg(beat, 15.95, 16, snap);
    cx = WALL_TIP_X - 40 * wind * (1 - firstHit);
    sx = 1 - 0.12 * wind * (1 - firstHit);
    sy = 1 + 0.18 * wind * (1 - firstHit);
    const imp = impulse(beat, CUE.pushTicks, 0.22);
    if (beat >= 16) {
      sx = 1 - 0.32 * imp;
      sy = 1 + 0.1 * imp;
      // micro pull-backs between ticks
      const nxt = CUE.pushTicks.find((t) => t > beat);
      const prev = [...CUE.pushTicks].reverse().find((t) => t <= beat) ?? 16;
      if (nxt) cx = WALL_TIP_X - Math.sin(Math.PI * ((beat - prev) / (nxt - prev))) * 14;
    }
  } else if (beat < CUE.memory) {
    // press: two squashed frames, then glide through the edge onto the monitor
    const g = seg(beat, CUE.press + 0.06, CUE.press + 0.55, out);
    const endX = MONITOR.x + 170;
    const endY = toMonitorY(CURSOR_Y) + 30;
    cx = lerp(WALL_TIP_X, endX, g);
    cy = lerp(CURSOR_Y, endY, g);
    origin = '0% 0%';
    if (beat < CUE.press + 0.07) {
      sx = 0.55;
      sy = 1.15;
      origin = '100% 35%';
    }
    const to = 1 - seg(beat, CUE.press + 0.3, CUE.press + 1.0, (t) => t);
    if (beat > CUE.press + 0.05 && to > 0) trail = {x: WALL_TIP_X + CURSOR_W, y: CURSOR_Y + 8, o: to};
  } else if (beat < CUE.putaway) {
    // memory: ride with the laptop, then cross into the monitor
    const k = Math.max(0, CROSS.filter((t) => beat >= t - 1.1).length - 1);
    const t = seg(beat, CROSS[k], CROSS[k] + 0.45, out);
    const a = {x: lap.x + lap.w * 0.55, y: lap.y + lap.h * 0.5};
    const bpt = {x: mon.x + mon.w * 0.45, y: mon.y + mon.h * 0.5};
    cx = lerp(a.x, bpt.x, t);
    cy = lerp(a.y, bpt.y, t);
    origin = '0% 0%';
  } else {
    // put-away: drift to centre of the remaining frame
    const t = seg(beat, CUE.putaway, CUE.putaway + 1.5, out);
    const a = {x: mon.x + mon.w * 0.45, y: mon.y + mon.h * 0.5};
    cx = lerp(a.x, 290, t);
    cy = lerp(a.y, -100, t);
    origin = '0% 0%';
  }

  // ---------------------------------------------------------------- the edge
  const edgeShown = beat < CUE.memory;
  const hit = Math.max(impulse(beat, CUE.hits, 0.45), impulse(beat, NUDGES, 0.4) * 0.7);
  const problem = beat < CUE.press ? Math.max(hit, beat >= 4 && beat < CUE.press ? 0.28 : 0) : 0;
  const pushed = beat < 16 ? 0 : CUE.pushTicks.filter((t) => beat >= t).length / CUE.pushTicks.length;
  const fill = beat < CUE.freeze ? 0 : beat < CUE.press ? seg(beat, 15.98, 16.1) * (0.1 + 0.9 * pushed) : 1;
  const glow = beat < CUE.press ? fill * 0.55 : interpolate(beat, [CUE.press, CUE.press + 0.15, CUE.press + 0.35, CUE.press + 1.6], [0.55, 1, 1, 0], {extrapolateRight: 'clamp'});
  const entryGlow = interpolate(beat, [CUE.press + 0.4, CUE.press + 0.55, CUE.press + 0.7, CUE.press + 2.1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // memory: accent flash on the shared edge as the cursor crosses
  const crossFlash = beat >= CUE.memory && beat < CUE.putaway ? Math.max(...CROSS.map((t) => interpolate(beat, [t, t + 0.15, t + 0.9], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}))) : 0;
  const se = sharedEdge(lap, mon);

  // ---------------------------------------------------------------- screen layout
  const headSize = (portrait ? 104 : square ? 80 : 96) * u;
  const headTop = portrait ? H * 0.15 : square ? H * 0.74 : H * 0.79;
  // the desk label sits under the (possibly wrapped) memory headline
  const deskLabelTop = portrait ? headTop + headSize * 2.55 : square ? headTop + headSize * 2.5 : headTop + headSize * 1.35;
  const ghostScreen = toScreen(GHOST);

  return (
    <AbsoluteFill style={{backgroundColor: c.stage, overflow: 'hidden'}}>
      <Stage />
      {showWorld ? (
        <AbsoluteFill style={{filter: bx + by > 0.8 ? 'url(#mblur)' : undefined}}>
          <svg width={0} height={0} style={{position: 'absolute'}}>
            <filter id="mblur" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
            </filter>
          </svg>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              transform: `translate(${W / 2}px, ${H / 2}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`,
            }}
          >
            <Grid px={px} />
            {/* ghost: dashed outline where macOS thinks the monitor is */}
            {ghostVisible ? (
              <div style={{position: 'absolute', left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h, opacity: 1 - seg(beat, CUE.land + 0.2, CUE.land + 0.55, snap)}}>
                <svg width={ghost.w} height={ghost.h} style={{position: 'absolute', overflow: 'visible'}}>
                  <rect
                    x={0}
                    y={0}
                    width={ghost.w}
                    height={ghost.h}
                    rx={12}
                    fill={beat < CUE.press ? 'rgba(255,255,255,0.015)' : 'rgba(198,255,74,0.04)'}
                    stroke={ghostLanded > 0.01 ? c.accent : beat >= CUE.press ? 'rgba(198,255,74,0.85)' : 'rgba(255,255,255,0.6)'}
                    strokeWidth={2 * px}
                    strokeDasharray={ghostLanded > 0.01 ? undefined : `${7 * px} ${6 * px}`}
                  />
                </svg>
                {beat < CUE.press ? (
                  <div style={{position: 'absolute', right: 0, top: -64 * Math.max(px, 0.8), fontFamily: fonts.mono, fontSize: 21 * Math.max(px, 0.8), color: c.text2, whiteSpace: 'nowrap', textAlign: 'right', lineHeight: 1.35, opacity: seg(beat, 4.4, 4.8, out)}}>
                    display 2<br />
                    where macOS thinks it is
                  </div>
                ) : null}
              </div>
            ) : null}
            <Display
              r={mon}
              px={px}
              kind="monitor"
              lit={monLit}
              sweep={sweep}
              squash={crt(32.5)}
              label={beat >= 4 && beat < CUE.memory ? 'display 2' : undefined}
              labelOpacity={seg(beat, 4.4, 4.8, out)}
              rim={crossFlash > 0.05 ? `rgba(198,255,74,${crossFlash * 0.9})` : null}
            />
            <Display
              r={lap}
              px={px}
              kind="laptop"
              squash={crt(33)}
              label={beat >= 4 && beat < CUE.memory ? 'built-in display' : undefined}
              labelOpacity={seg(beat, 4.4, 4.8, out)}
              rim={crossFlash > 0.05 ? `rgba(198,255,74,${crossFlash * 0.9})` : null}
            />
            {/* the dead edge: red while it is a wall, accent while it fills, a glow when it opens */}
            {edgeShown ? (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: EDGE_X - 60,
                    top: LAPTOP.y,
                    width: 60,
                    height: LAPTOP.h,
                    background: `linear-gradient(270deg, rgba(255,77,77,${0.4 * problem}) 0%, rgba(255,77,77,0) 100%)`,
                    borderRadius: '0 12px 12px 0',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: EDGE_X - px,
                    top: LAPTOP.y + 6,
                    width: 2 * px,
                    height: LAPTOP.h - 12,
                    background: problem > 0.05 ? `rgba(255,77,77,${0.35 + 0.65 * problem})` : 'rgba(255,255,255,0.22)',
                  }}
                />
                {fill > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: EDGE_X - 1.5 * px,
                      top: CURSOR_Y + 14 - (LAPTOP.h / 2) * fill,
                      width: 3 * px,
                      height: LAPTOP.h * fill,
                      maxHeight: LAPTOP.h - 12,
                      borderRadius: 3 * px,
                      background: c.accent,
                      boxShadow: `0 0 ${24 * glow}px ${6 * glow}px ${c.accentGlow}`,
                    }}
                  />
                ) : null}
                {entryGlow > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: MONITOR.x,
                      top: MONITOR.y + 6,
                      width: 70,
                      height: MONITOR.h - 12,
                      background: `linear-gradient(90deg, rgba(198,255,74,${0.55 * entryGlow}) 0%, rgba(198,255,74,0) 100%)`,
                      borderLeft: `${3 * px}px solid rgba(198,255,74,${entryGlow})`,
                      borderRadius: '12px 0 0 12px',
                    }}
                  />
                ) : null}
              </>
            ) : null}
            {/* memory: the shared edge lights as the cursor crosses */}
            {crossFlash > 0.02 ? (
              se.kind === 'v' ? (
                <div style={{position: 'absolute', left: se.x - 1.5 * px, top: se.y0 + 6, width: 3 * px, height: se.y1 - se.y0 - 12, background: c.accent, opacity: crossFlash, boxShadow: `0 0 ${20}px ${5}px ${c.accentGlow}`}} />
              ) : (
                <div style={{position: 'absolute', left: se.x0 + 6, top: se.y - 1.5 * px, width: se.x1 - se.x0 - 12, height: 3 * px, background: c.accent, opacity: crossFlash, boxShadow: `0 0 ${20}px ${5}px ${c.accentGlow}`}} />
              )
            ) : null}
            {trail ? (
              <div
                style={{
                  position: 'absolute',
                  left: trail.x,
                  top: trail.y - 2 * px,
                  width: Math.max(0, cx - trail.x),
                  height: 4 * px,
                  borderRadius: 4 * px,
                  background: `linear-gradient(90deg, rgba(198,255,74,0) 0%, rgba(198,255,74,${trail.o}) 100%)`,
                }}
              />
            ) : null}
            {beat < CUE.wordmark ? <Cursor x={cx} y={cy} h={CURSOR_H} sx={sx} sy={sy} origin={origin} /> : null}
          </div>
        </AbsoluteFill>
      ) : null}

      {/* -------------------------------------------------------------- overlays */}
      {beat >= CUE.insert && beat < CUE.insertOut + 0.3 ? (
        <AbsoluteFill style={{background: '#000', opacity: 0.6 * seg(beat, CUE.insert, CUE.insert + 0.3, snap) * (1 - seg(beat, CUE.insertOut, CUE.insertOut + 0.25, snap))}} />
      ) : null}
      <SettingsInsert beat={beat} inAt={CUE.insert} outAt={CUE.insertOut} from={ghostScreen} W={W} H={H} u={u} />
      <FlashCard beat={beat} at={CUE.flash[0]} len={1} text={portrait ? "Every\ndesk." : "Every desk."} size={(portrait ? 300 : square ? 165 : 210) * u} />
      <FlashCard beat={beat} at={CUE.flash[1]} len={1} text={portrait ? "Every\nday." : "Every day."} size={(portrait ? 300 : square ? 165 : 210) * u} />
      <BigNumber beat={beat} inAt={CUE.number} lockAt={CUE.numberLock} outAt={23.75} W={W} H={H} u={u} portrait={portrait} />

      <div style={{position: 'absolute', left: 0, right: 0, top: headTop, display: 'flex', justifyContent: 'center', padding: `0 ${60 * u}px`}}>
        <Headline text="Your mouse hits a wall." beat={beat} inAt={0.1} outAt={3.4} size={headSize} />
        <Headline text="Wrong side." beat={beat} inAt={4.25} outAt={7.45} size={headSize} />
        <Headline text="Just push." beat={beat} inAt={15.1} outAt={17.7} size={headSize} accentWords={['push']} />
        <Headline text="Layout fixed." beat={beat} inAt={18.6} outAt={19.8} size={headSize} accentWords={['fixed']} />
        <Headline text="Remembers every desk." beat={beat} inAt={24.3} outAt={31.6} size={headSize} />
      </div>
      {beat >= CUE.memory && beat < CUE.putaway ? (
        <div style={{position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center', top: deskLabelTop}}>
          <Mono size={36 * u} color={c.text2}>
            desk: <span style={{color: c.accent}}>{lay.label}</span>
          </Mono>
        </div>
      ) : null}

      {beat >= CUE.wordmark ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34 * u}}>
          <Wordmark beat={beat} at={CUE.wordmark} size={(portrait ? 130 : 150) * u} W={W} />
          <div style={{height: 110 * u, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * u}}>
            <Headline text="Free and open source. macOS and Windows." beat={beat} inAt={36.4} outAt={99} size={(portrait ? 40 : 42) * u} weight={500} color={c.text2} />
            <div style={{overflow: 'hidden'}}>
              <div style={{translate: `0 ${(1 - seg(beat, 37, 37.4, out)) * 110}%`}}>
                <Mono size={38 * u} color={c.accent}>
                  github.com/mxnyawi/OneScreen
                </Mono>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
      <Vignette />

      {audio ? (
        <>
          <Audio src={staticFile('audio/score.wav')} volume={0.9} />
          {CUE.hits.map((h) => (
            <Sfx key={`h${h}`} beat={h} name="thud" volume={0.9} />
          ))}
          {NUDGES.map((h) => (
            <Sfx key={`n${h}`} beat={h} name="tick" volume={0.35} />
          ))}
          <Sfx beat={CUE.whipOut + 0.05} name="whip" volume={0.6} />
          <Sfx beat={CUE.insert} name="glass" volume={0.5} />
          <Sfx beat={CUE.insert + 0.6} name="tick" volume={0.5} />
          <Sfx beat={CUE.insertOut - 0.4} name="tick" volume={0.5} />
          <Sfx beat={CUE.flash[0]} name="thud" volume={0.8} />
          <Sfx beat={CUE.flash[1]} name="thud" volume={0.8} />
          {CUE.pushTicks.map((t) => (
            <Sfx key={`p${t}`} beat={t} name="tick" volume={0.75} />
          ))}
          <Sfx beat={CUE.press - 0.05} name="whip" volume={0.55} />
          <Sfx beat={CUE.press + 0.6} name="shimmer" volume={0.45} />
          <Sfx beat={CUE.land} name="snap" volume={0.7} />
          {Array.from({length: 8}).map((_, i) => (
            <Sfx key={`d${i}`} beat={CUE.number + i / 8} name="digit" volume={0.5} />
          ))}
          <Sfx beat={CUE.numberLock} name="snap" volume={0.8} />
          {CUE.layouts.map((t) => (
            <Sfx key={`l${t}`} beat={t} name="snap" volume={0.7} />
          ))}
          {CROSS.map((t) => (
            <Sfx key={`x${t}`} beat={t} name="tick" volume={0.45} />
          ))}
          <Sfx beat={32.5} name="crt" volume={0.55} />
          <Sfx beat={33} name="crt" volume={0.55} />
          <Sfx beat={CUE.wordmark} name="shimmer" volume={0.6} />
          <Sfx beat={37} name="tick" volume={0.4} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
