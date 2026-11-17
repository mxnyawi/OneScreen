import {useVideoConfig} from 'remotion';

/** Layout helpers so every scene works in 16:9, 9:16 and 1:1. */
export const useLayout = () => {
  const {width, height} = useVideoConfig();
  const portrait = height > width * 1.1;
  const square = !portrait && Math.abs(width - height) < 10;
  // 1 "u" = 1px at 1080p short side
  const u = Math.min(width, height) / 1080;
  return {width, height, portrait, square, u};
};

export const placeDesk = (deskWidthPx: number, cx: number, cy: number) => {
  // keep in sync with DESK_W / DESK_H in components/Desk.tsx
  const scale = deskWidthPx / 1600;
  return {scale, left: cx - (1600 * scale) / 2, top: cy - (760 * scale) / 2};
};
