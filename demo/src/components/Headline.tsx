import React from 'react';
import {interpolate} from 'remotion';
import {out, snap} from '../film/ease';
import {c, fonts} from '../theme';

/**
 * One line per screen. Words rise out of a clip from below the baseline on the
 * snap ease, and leave upward. No fades, no springs.
 */
export const Headline: React.FC<{
  text: string;
  beat: number; // current beat
  inAt: number;
  outAt: number;
  size: number;
  color?: string;
  accentWords?: string[];
  problemWords?: string[];
  weight?: number;
  align?: 'center' | 'left';
}> = ({text, beat, inAt, outAt, size, color = c.text, accentWords = [], problemWords = [], weight = 600, align = 'center'}) => {
  if (beat < inAt - 0.01 || beat > outAt + 0.4) return null;
  const words = text.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        columnGap: size * 0.26,
        fontFamily: fonts.sans,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: -size * 0.03,
        color,
      }}
    >
      {words.map((w, i) => {
        const a = inAt + i * 0.09;
        const pin = interpolate(beat, [a, a + 0.38], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: out});
        const pout = interpolate(beat, [outAt + i * 0.04, outAt + i * 0.04 + 0.25], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: snap,
        });
        const bare = w.replace(/[.,!?]/g, '');
        const col = accentWords.includes(bare) ? c.accent : problemWords.includes(bare) ? c.problem : color;
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.12, marginBottom: -size * 0.12}}>
            <span style={{display: 'inline-block', color: col, translate: `0 ${(pin - pout) * 112}%`}}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Small mono label, lowercase, quiet. */
export const Mono: React.FC<{children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties}> = ({
  children,
  size,
  color = c.text3,
  style,
}) => (
  <div style={{fontFamily: fonts.mono, fontWeight: 400, fontSize: size, color, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
