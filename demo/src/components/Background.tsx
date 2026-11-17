import {AbsoluteFill} from 'remotion';
import {colors} from '../theme';

/**
 * Quiet stage. One tinted neutral with a soft, static falloff so the colour
 * lives in the product (screens, highlights, the flip glow), not the backdrop.
 * `intensity` lifts the centre slightly for big moments.
 */
export const Background: React.FC<{intensity?: number}> = ({intensity = 1}) => (
  <AbsoluteFill
    style={{
      backgroundColor: colors.bg,
      backgroundImage: `radial-gradient(ellipse 75% 65% at 50% 45%, rgba(58,48,120,${0.42 * intensity}) 0%, rgba(13,10,38,0) 70%)`,
    }}
  />
);
