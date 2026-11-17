import React from 'react';
import {Composition, Folder, Still} from 'remotion';
import {Launch, LAUNCH_LEN} from './Launch';
import {Loop} from './Loop';
import {FLIP_LEN} from './scenes/Flip';
import {Thumbnail} from './Thumbnail';
import {FPS} from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Launch">
        <Composition id="Launch-16x9" component={Launch} durationInFrames={LAUNCH_LEN} fps={FPS} width={1920} height={1080} defaultProps={{music: true}} />
        <Composition id="Launch-9x16" component={Launch} durationInFrames={LAUNCH_LEN} fps={FPS} width={1080} height={1920} defaultProps={{music: true}} />
        <Composition id="Launch-1x1" component={Launch} durationInFrames={LAUNCH_LEN} fps={FPS} width={1080} height={1080} defaultProps={{music: true}} />
      </Folder>
      <Folder name="Loop">
        <Composition id="Gesture-Loop" component={Loop} durationInFrames={FLIP_LEN - 40} fps={FPS} width={1080} height={1080} />
        <Composition id="Gesture-Loop-Wide" component={Loop} durationInFrames={FLIP_LEN - 40} fps={FPS} width={1600} height={900} />
      </Folder>
      <Folder name="Stills">
        <Still id="Thumbnail-16x9" component={Thumbnail} width={1920} height={1080} />
        <Still id="Thumbnail-9x16" component={Thumbnail} width={1080} height={1920} />
      </Folder>
    </>
  );
};
