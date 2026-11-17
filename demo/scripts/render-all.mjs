// Render every deliverable into out/.
//   npm run render                 -> everything
//   npm run render -- Launch-9x16  -> just one composition
// Set REMOTION_CHROME to use a pre-installed Chrome/Chromium.
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('out');
const browserExecutable = process.env.REMOTION_CHROME || undefined;
const only = process.argv.slice(2);

const VIDEOS = ['Launch-16x9', 'Launch-9x16', 'Launch-1x1', 'Gesture-Loop', 'Gesture-Loop-Wide'];
const STILLS = ['Thumbnail-16x9', 'Thumbnail-9x16'];
const GIFS = {'Gesture-Loop': 560, 'Gesture-Loop-Wide': 800}; // width in px (keep each GIF under ~8 MB for GitHub)

fs.mkdirSync(OUT, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const want = (id) => only.length === 0 || only.includes(id);

for (const id of VIDEOS.filter(want)) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const outputLocation = path.join(OUT, `onescreen-${id.toLowerCase()}.mp4`);
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    crf: 18,
    pixelFormat: 'yuv420p',
    audioCodec: 'aac',
    outputLocation,
    browserExecutable,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        process.stdout.write(`${id} ${p * 10}%\n`);
      }
    },
  });
  if (id.startsWith('Launch')) {
    // normalise loudness for social platforms (-14 LUFS, -1.5 dBTP), video stream copied untouched
    const tmp = outputLocation.replace(/\.mp4$/, '.tmp.mp4');
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-i', outputLocation,
      '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart', tmp,
    ]);
    fs.renameSync(tmp, outputLocation);
  }
  console.log('✔', outputLocation);
  if (GIFS[id]) {
    const gif = outputLocation.replace(/\.mp4$/, '.gif');
    const w = GIFS[id];
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-i', outputLocation,
      '-filter_complex',
      `fps=20,scale=${w}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`,
      gif,
    ]);
    console.log('✔', gif);
  }
}

for (const id of STILLS.filter(want)) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const output = path.join(OUT, `onescreen-${id.toLowerCase()}.png`);
  await renderStill({serveUrl, composition, output, browserExecutable});
  console.log('✔', output);
}
