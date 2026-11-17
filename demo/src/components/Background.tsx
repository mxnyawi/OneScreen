import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {colors} from '../theme';
import {useLayout} from '../layout';

type Blob = {c: string; x: number; y: number; r: number; sx: number; sy: number; p: number};

const BLOBS: Blob[] = [
  {c: colors.violet, x: 0.15, y: 0.2, r: 0.55, sx: 0.06, sy: 0.05, p: 0},
  {c: colors.pink, x: 0.85, y: 0.25, r: 0.45, sx: 0.05, sy: 0.07, p: 1.7},
  {c: colors.cyan, x: 0.75, y: 0.9, r: 0.5, sx: 0.07, sy: 0.04, p: 3.1},
  {c: colors.orange, x: 0.1, y: 0.95, r: 0.35, sx: 0.04, sy: 0.06, p: 4.4},
];

/** Slowly drifting mesh-gradient background with a subtle grid + grain. */
export const Background: React.FC<{intensity?: number}> = ({intensity = 1}) => {
  const frame = useCurrentFrame();
  const {width, height} = useLayout();
  const t = frame / 30;
  const size = Math.max(width, height);
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, overflow: 'hidden'}}>
      {BLOBS.map((b, i) => {
        const cx = (b.x + Math.sin(t * 0.6 + b.p) * b.sx) * width;
        const cy = (b.y + Math.cos(t * 0.5 + b.p) * b.sy) * height;
        const r = b.r * size;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cx - r / 2,
              top: cy - r / 2,
              width: r,
              height: r,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.c} 0%, transparent 68%)`,
              opacity: 0.55 * intensity,
              filter: 'blur(40px)',
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: `${size / 24}px ${size / 24}px`,
          backgroundPosition: `${(t * 6) % (size / 24)}px 0px`,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
