import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fonts} from '../theme';

export type Word = {t: string; hl?: 'yellow' | 'pink' | 'cyan' | 'mint' | 'red' | 'grad'; br?: boolean};

const HL: Record<NonNullable<Word['hl']>, {bg: string; fg: string}> = {
  yellow: {bg: colors.yellow, fg: '#0D0A26'},
  pink: {bg: colors.pink, fg: '#fff'},
  cyan: {bg: colors.cyan, fg: '#0D0A26'},
  mint: {bg: colors.mint, fg: '#0D0A26'},
  red: {bg: colors.red, fg: '#fff'},
  grad: {bg: 'linear-gradient(95deg, #FF3D8B 0%, #FF8A3D 45%, #FFE14D 100%)', fg: '#0D0A26'},
};

/** Parse "Your *monitor* is [right there]" style markup is overkill; use explicit Word[]. */
export const words = (s: string, hl: Record<string, Word['hl']> = {}): Word[] =>
  s.split(' ').map((t) => (t === '/' ? {t: '', br: true} : {t, hl: hl[t.replace(/[.,!?]/g, '')]}));

/** Word-by-word pop-in headline. Each word springs up with a slight overshoot. */
export const Kinetic: React.FC<{
  words: Word[];
  start?: number;
  stagger?: number;
  size: number;
  align?: 'center' | 'left';
  exitAt?: number; // local frame to start exiting
  color?: string;
  maxWidth?: number;
  font?: string;
}> = ({words: ws, start = 0, stagger = 3, size, align = 'center', exitAt, color = colors.ink, maxWidth, font}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const exit =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt, exitAt + 6], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.in(Easing.cubic),
        });
  let idx = 0;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        alignItems: 'baseline',
        columnGap: size * 0.26,
        rowGap: size * 0.08,
        fontFamily: font ?? fonts.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.05,
        letterSpacing: -size * 0.025,
        color,
        maxWidth,
        opacity: 1 - exit,
        translate: `0 ${-exit * size * 0.4}px`,
      }}
    >
      {ws.map((w, i) => {
        if (w.br) return <div key={i} style={{flexBasis: '100%', height: 0}} />;
        const s = spring({
          frame: frame - start - idx * stagger,
          fps,
          config: {damping: 11, stiffness: 220, mass: 0.6},
        });
        idx++;
        const hl = w.hl ? HL[w.hl] : null;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: interpolate(s, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}),
              translate: `0 ${(1 - s) * size * 0.5}px`,
              scale: `${0.6 + 0.4 * s}`,
              rotate: `${(1 - s) * (i % 2 ? 6 : -6)}deg`,
              ...(hl
                ? {
                    background: hl.bg,
                    color: hl.fg,
                    padding: `${size * 0.02}px ${size * 0.16}px ${size * 0.06}px`,
                    borderRadius: size * 0.16,
                    boxShadow: `0 ${size * 0.08}px ${size * 0.25}px rgba(0,0,0,0.3)`,
                  }
                : {textShadow: `0 ${size * 0.05}px ${size * 0.2}px rgba(0,0,0,0.35)`}),
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

/** Small pill label, e.g. "BEFORE" / "AFTER". */
export const Pill: React.FC<{text: string; bg: string; fg?: string; size: number; pop?: number}> = ({
  text,
  bg,
  fg = '#0D0A26',
  size,
  pop = 1,
}) => (
  <div
    style={{
      display: 'inline-block',
      padding: `${size * 0.35}px ${size * 0.9}px`,
      borderRadius: 999,
      background: bg,
      color: fg,
      fontFamily: fonts.sans,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: size * 0.08,
      scale: `${pop}`,
      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    }}
  >
    {text}
  </div>
);
