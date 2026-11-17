import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadTight} from '@remotion/google-fonts/InterTight';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

export const fonts = {
  sans: loadInter('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']}).fontFamily,
  tight: loadTight('normal', {weights: ['500', '600'], subsets: ['latin']}).fontFamily,
  mono: loadMono('normal', {weights: ['400', '500'], subsets: ['latin']}).fontFamily,
};

/**
 * Dark keynote palette: one cool neutral ladder, ONE accent for the product,
 * one problem colour that only exists while the problem does.
 */
export const c = {
  stage: '#07080B',
  s1: '#12151B',
  s2: '#1B1F28',
  s3: '#252A35',
  line: 'rgba(255,255,255,0.11)',
  text: '#F2F4F8',
  text2: 'rgba(242,244,248,0.62)',
  text3: 'rgba(242,244,248,0.38)',
  accent: '#C6FF4A',
  accentGlow: 'rgba(198,255,74,0.55)',
  problem: '#FF4D4D',
};
