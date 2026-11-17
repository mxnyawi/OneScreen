import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Background} from './components/Background';
import {CURSOR_W, Desk, LAPTOP} from './components/Desk';
import {Kinetic, words} from './components/Kinetic';
import {LogoMark, Wordmark} from './components/Logo';
import {placeDesk, useLayout} from './layout';

/** Poster / thumbnail still (YouTube, X card, README hero). */
export const Thumbnail: React.FC = () => {
  const {width, height, portrait, u} = useLayout();
  const desk = portrait ? placeDesk(width * 0.96, width / 2, height * 0.55) : placeDesk(width * 0.66, width * 0.34, height * 0.56);
  return (
    <AbsoluteFill>
      <Background intensity={1.3} />
      <Desk
        {...desk}
        cursor={{x: LAPTOP.x + LAPTOP.w - CURSOR_W - 2, y: 470, squash: 0.6}}
        wallHit={1}
        arrow={{progress: 1, state: 'blocked'}}
        dimMonitor={0.2}
      />
      <div
        style={{
          position: 'absolute',
          left: portrait ? 60 * u : width * 0.66,
          right: 60 * u,
          top: portrait ? height * 0.1 : height * 0.2,
          display: 'flex',
          flexDirection: 'column',
          gap: 40 * u,
          alignItems: portrait ? 'center' : 'flex-start',
        }}
      >
        <Kinetic
          words={words('Mouse hits a / wall?', {'wall?': 'red'})}
          size={(portrait ? 130 : 120) * u}
          start={-100}
          align={portrait ? 'center' : 'left'}
        />
        <Kinetic words={words('Just push.', {push: 'grad'})} size={(portrait ? 100 : 92) * u} start={-100} align={portrait ? 'center' : 'left'} />
        <div style={{display: 'flex', alignItems: 'center', gap: 22 * u, marginTop: 20 * u}}>
          <LogoMark size={70 * u} />
          <Wordmark size={70 * u} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
