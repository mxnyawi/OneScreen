import {loadFont as loadDisplay} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadSans} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

export const fonts = {
  display: loadDisplay('normal', {weights: ['700', '800'], subsets: ['latin']}).fontFamily,
  sans: loadSans('normal', {weights: ['500', '600', '700', '800'], subsets: ['latin']}).fontFamily,
  mono: loadMono('normal', {weights: ['600', '700'], subsets: ['latin']}).fontFamily,
};

export const colors = {
  bg: '#0D0A26',
  bg2: '#1A1240',
  ink: '#FFFFFF',
  dim: 'rgba(255,255,255,0.62)',
  violet: '#7C4DFF',
  pink: '#FF3D8B',
  orange: '#FF8A3D',
  yellow: '#FFE14D',
  cyan: '#2EE6FF',
  mint: '#3DFFA2',
  red: '#FF4D5E',
  // quiet chrome: one raised surface + hairline
  surface: '#1A1544',
  hairline: 'rgba(255,255,255,0.09)',
  // device chrome
  bezel: '#0B0B12',
  aluminium: '#C9CCD6',
  aluminiumDark: '#8E92A0',
};

export const gradients = {
  brand: `linear-gradient(95deg, ${colors.pink} 0%, ${colors.orange} 45%, ${colors.yellow} 100%)`,
  glow: `linear-gradient(180deg, ${colors.cyan} 0%, ${colors.mint} 100%)`,
  laptopWall: 'linear-gradient(135deg, #FF5FA2 0%, #9B5CFF 55%, #4B3BFF 100%)',
  monitorWall: 'linear-gradient(135deg, #12C2E9 0%, #3D7BFF 50%, #7C4DFF 100%)',
};

export const FPS = 30;
