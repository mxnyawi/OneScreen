import React from 'react';

/** One icon set: 24px grid, 2px round strokes. Size by `size`, colour by `color`. */
type P = {size: number; color?: string; fill?: string};

const Svg: React.FC<P & {children: React.ReactNode}> = ({size, color = 'currentColor', children}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{display: 'block', flexShrink: 0}}
  >
    {children}
  </svg>
);

export const StopwatchIcon: React.FC<P> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 13.5V9.5M9.5 2.5h5M18.5 6.5l1.5-1.5" />
  </Svg>
);

export const FastForwardIcon: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M3 6l8 6-8 6zM13 6l8 6-8 6z" fill={p.color ?? 'currentColor'} />
  </Svg>
);

export const ArrowRightIcon: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
);

export const StarIcon: React.FC<P> = (p) => (
  <Svg {...p}>
    <path
      d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
      fill={p.fill ?? 'none'}
    />
  </Svg>
);
