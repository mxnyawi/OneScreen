import React from 'react';
import {Composition, Folder, Freeze, Sequence, Still} from 'remotion';
import {Film} from './Film';
import {b, FPS, LENGTH_BEATS} from './film/timeline';

const LEN = b(LENGTH_BEATS);

/** The gesture alone (freeze -> push -> snap), silent, for the README GIF. */
const Loop: React.FC = () => (
  <Sequence from={-b(14)} layout="none">
    <Film audio={false} />
  </Sequence>
);

const Poster: React.FC<{at: number}> = ({at}) => (
  <Freeze frame={b(at)}>
    <Film audio={false} />
  </Freeze>
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
    <Folder name="Stills">
      <Still id="Thumbnail-16x9" component={Poster} width={1920} height={1080} defaultProps={{at: 19.6}} />
      <Still id="Thumbnail-9x16" component={Poster} width={1080} height={1920} defaultProps={{at: 19.6}} />
    </Folder>
  </>
);
