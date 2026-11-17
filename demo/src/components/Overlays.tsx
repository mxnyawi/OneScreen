import React from 'react';
import {AbsoluteFill, interpolate, random} from 'remotion';
import {out, seg, snap} from '../film/ease';
import {c, fonts} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Overload insert: the Settings arrangement, expanding out of the ghost's
 * on-screen rect and collapsing back into it. Minimal: one window, one drag, a timer.
 */
export const SettingsInsert: React.FC<{
  beat: number;
  inAt: number;
  outAt: number;
  from: {x: number; y: number; w: number; h: number}; // screen rect it grows out of
  W: number;
  H: number;
  u: number;
}> = ({beat, inAt, outAt, from, W, H, u}) => {
  if (beat < inAt || beat > outAt + 0.3) return null;
  const open = seg(beat, inAt, inAt + 0.3, snap) * (1 - seg(beat, outAt, outAt + 0.25, snap));
  const ww = Math.min(W * 0.62, 1100 * u);
  const wh = ww * 0.56;
  const to = {x: (W - ww) / 2, y: (H - wh) / 2 - H * 0.03, w: ww, h: wh};
  const r = {
    x: from.x + (to.x - from.x) * open,
    y: from.y + (to.y - from.y) * open,
    w: from.w + (to.w - from.w) * open,
    h: from.h + (to.h - from.h) * open,
  };
  const k = r.w / 1100; // inner layout designed at 1100 wide
  // the drag: monitor rect hauled from the left of the laptop to the right, jittery
  const d = seg(beat, inAt + 0.6, outAt - 0.5, (t) => t);
  const wobble = Math.sin(beat * 19) * 14 * Math.sin(d * Math.PI);
  const monX = interpolate(d, [0, 1], [260, 660]) + wobble;
  const monY = 210 - Math.sin(d * Math.PI) * 70 + Math.cos(beat * 13) * 6 * Math.sin(d * Math.PI);
  const secs = Math.floor(interpolate(beat, [inAt + 0.3, outAt - 0.2], [0, 47], clamp));
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: r.x,
          top: r.y,
          width: 1100,
          height: 616,
          scale: `${k} ${r.h / 616}`,
          transformOrigin: '0 0',
          borderRadius: 18,
          background: c.s2,
          outline: `1.5px solid ${c.line}`,
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
          overflow: 'hidden',
          fontFamily: fonts.sans,
          opacity: open > 0.02 ? 1 : 0,
        }}
      >
        <div
          style={{
            height: 64,
            borderBottom: `1.5px solid ${c.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
          }}
        >
          <div style={{fontSize: 24, fontWeight: 600, color: c.text}}>Displays</div>
          <div style={{fontFamily: fonts.mono, fontSize: 24, color: c.problem}}>
            0:{String(secs).padStart(2, '0')} <span style={{color: c.text3}}>· 16×</span>
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, top: 64, right: 0, bottom: 0}}>
          {/* laptop rect (fixed) */}
          <div style={{position: 'absolute', left: 470, top: 230, width: 190, height: 124, borderRadius: 8, background: c.s3, outline: `2px solid rgba(255,255,255,0.3)`}}>
            <div style={{height: 10, background: 'rgba(255,255,255,0.5)', borderRadius: '6px 6px 0 0'}} />
          </div>
          {/* monitor rect being dragged */}
          <div
            style={{
              position: 'absolute',
              left: monX,
              top: monY,
              width: 210,
              height: 132,
              borderRadius: 8,
              background: c.s3,
              outline: `2px solid ${c.problem}`,
            }}
          />
          <svg viewBox="0 0 17 26" width={28} height={43} style={{position: 'absolute', left: monX + 100, top: monY + 60, overflow: 'visible'}}>
            <path d="M1 1 L1 20.6 L5.6 16.3 L8.7 23.6 L11.9 22.3 L8.9 15.2 L15.2 15.2 Z" fill="#fff" stroke="#000" strokeWidth={1.2} />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Text-flash cut: one huge line, slams in on the beat (1.08 -> 1.02 -> 1 over two frames). */
export const FlashCard: React.FC<{beat: number; at: number; len: number; text: string; size: number}> = ({
  beat,
  at,
  len,
  text,
  size,
}) => {
  if (beat < at || beat >= at + len) return null;
  const f = Math.floor((beat - at) * 30); // frames since the cut at 60 fps (30 per beat)
  const s = f === 0 ? 1.08 : f === 1 ? 1.02 : 1;
  const jx = f < 2 ? (random(`jx${at}${f}`) - 0.5) * 24 : 0;
  return (
    <AbsoluteFill style={{backgroundColor: c.stage, alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: -size * 0.045,
          color: c.text,
          scale: `${s}`,
          translate: `${jx}px 0`,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** One number, alone. Digits scramble out of glyph noise and lock on the beat with a small bounce. */
export const BigNumber: React.FC<{beat: number; inAt: number; lockAt: number; outAt: number; W: number; H: number; u: number; portrait: boolean}> = ({
  beat,
  inAt,
  lockAt,
  outAt,
  W,
  H,
  u,
  portrait,
}) => {
  if (beat < inAt || beat >= outAt + 0.3) return null;
  const size = (portrait ? 0.34 : 0.5) * Math.min(W, H) * (portrait ? 1.6 : 1);
  const locked = beat >= lockAt;
  const glyph = locked ? '0' : String(Math.floor(random(`d${Math.floor(beat * 30)}`) * 10));
  const bounce = locked ? Math.exp(-(beat - lockAt) * 9) * Math.cos((beat - lockAt) * 30) * 0.06 : 0;
  const close = seg(beat, outAt, outAt + 0.25, snap);
  const label = interpolate(beat, [lockAt + 0.25, lockAt + 0.6], [1, 0], {...clamp, easing: out});
  return (
    <AbsoluteFill style={{backgroundColor: c.stage, alignItems: 'center', justifyContent: 'center', scale: `1 ${1 - close * 0.98}`}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: size * 0.08, flexDirection: portrait ? 'column' : 'row'}}>
        <div style={{position: 'relative', fontFamily: fonts.tight, fontWeight: 600, fontSize: size, lineHeight: 0.9, letterSpacing: -size * 0.045, color: c.accent, translate: `0 ${bounce * size}px`, fontVariantNumeric: 'tabular-nums'}}>
          {!locked
            ? [-1, 1].map((o) => (
                <span key={o} style={{position: 'absolute', left: 0, top: o * size * 0.12, opacity: 0.25}}>
                  {String(Math.floor(random(`s${o}${Math.floor(beat * 30)}`) * 10))}
                </span>
              ))
            : null}
          {glyph}
        </div>
        <div style={{overflow: 'hidden', paddingBottom: 12 * u}}>
          <div style={{fontFamily: fonts.sans, fontWeight: 600, fontSize: size * 0.24, letterSpacing: -size * 0.006, color: c.text, translate: `0 ${label * 110}%`}}>
            clicks
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Wordmark revealed by a band of light: only lit pixels turn on (unlit at 7 %), soft 20 % glint on the front. */
export const Wordmark: React.FC<{beat: number; at: number; size: number; W: number}> = ({beat, at, size, W}) => {
  if (beat < at) return null;
  const front = interpolate(beat, [at, at + 2.4], [-0.2, 1.25], clamp);
  const mask = `linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${front * 100 - 25}%, rgba(0,0,0,0.07) ${front * 100}%, rgba(0,0,0,0.07) 100%)`;
  const glint = `linear-gradient(90deg, rgba(0,0,0,0) ${front * 100 - 14}%, rgba(0,0,0,1) ${front * 100 - 4}%, rgba(0,0,0,0) ${front * 100 + 2}%)`;
  const markH = size * 0.95;
  const mark = (color: string) => (
    <div style={{position: 'relative', width: markH * 0.62, height: markH}}>
      <div style={{position: 'absolute', left: markH * 0.18, top: 0, width: markH * 0.075, height: markH, borderRadius: markH, background: color}} />
      <svg viewBox="0 0 17 26" width={markH * 0.42} height={markH * 0.64} style={{position: 'absolute', left: markH * 0.22, top: markH * 0.2, overflow: 'visible'}}>
        <path d="M1 1 L1 20.6 L5.6 16.3 L8.7 23.6 L11.9 22.3 L8.9 15.2 L15.2 15.2 Z" fill={color === c.accent ? '#fff' : color} stroke="#000" strokeWidth={1.2} />
      </svg>
    </div>
  );
  const row = (accent: string, text: string) => (
    <div style={{display: 'flex', alignItems: 'center', gap: size * 0.3}}>
      {mark(accent)}
      <div style={{fontFamily: fonts.sans, fontWeight: 600, fontSize: size, letterSpacing: -size * 0.04, color: text, lineHeight: 1}}>OneScreen</div>
    </div>
  );
  return (
    <div style={{position: 'relative', width: W, display: 'flex', justifyContent: 'center'}}>
      <div style={{WebkitMaskImage: mask, maskImage: mask}}>{row(c.accent, c.text)}</div>
      <div style={{position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', WebkitMaskImage: glint, maskImage: glint, opacity: 0.2, mixBlendMode: 'plus-lighter'}}>
        {row('#fff', '#fff')}
      </div>
    </div>
  );
};
