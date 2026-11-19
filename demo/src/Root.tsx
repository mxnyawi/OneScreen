import React from 'react';
import {Composition, Folder, Sequence} from 'remotion';
import {Film} from './Film';
import {b, FPS, LENGTH_BEATS} from './film/timeline';

const LEN = b(LENGTH_BEATS);

/** The gesture alone (freeze -> push -> snap), silent, for the README GIF. */
const Loop: React.FC = () => (
  <Sequence from={-b(14)} layout="none">
    <Film audio={false} />
  </Sequence>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Launch">
      <Composition id="Launch-16x9" component={Film} durationInFrames={LEN} fps={FPS} width={1920} height={1080} defaultProps={{audio: true}} />
      <Composition id="Launch-9x16" component={Film} durationInFrames={LEN} fps={FPS} width={1080} height={1920} defaultProps={{audio: true}} />
      <Composition id="Launch-1x1" component={Film} durationInFrames={LEN} fps={FPS} width={1080} height={1080} defaultProps={{audio: true}} />
    </Folder>
    <Folder name="Loop">
      <Composition id="Gesture-Loop" component={Loop} durationInFrames={b(6)} fps={FPS} width={1080} height={1080} />
      <Composition id="Gesture-Loop-Wide" component={Loop} durationInFrames={b(6)} fps={FPS} width={1600} height={900} />
    </Folder>
    {/*
      Posters are single frames of silent, full-length compositions, rendered at beat 19.6
      ("Layout fixed." on screen) by scripts/render-all.mjs. A <Still> is one frame long, so the
      timeline would clamp any frame inside it to 0 and every poster would show the opening shot.
    */}
    <Folder name="Posters">
      <Composition id="Thumbnail-16x9" component={Film} durationInFrames={LEN} fps={FPS} width={1920} height={1080} defaultProps={{audio: false}} />
      <Composition id="Thumbnail-9x16" component={Film} durationInFrames={LEN} fps={FPS} width={1080} height={1920} defaultProps={{audio: false}} />
      <Composition id="Social-card" component={Film} durationInFrames={LEN} fps={FPS} width={1280} height={640} defaultProps={{audio: false, card: true}} />
    </Folder>
  </>
);
