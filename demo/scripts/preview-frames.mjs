// Render a handful of stills from a composition for quick visual review.
// usage: node scripts/preview-frames.mjs <compositionId> <outDir> <frame> [frame...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [id, outDir, ...frames] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_CHROME || undefined;
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id, browserExecutable});
for (const f of frames) {
  const output = path.join(outDir, `${id}-${String(f).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame: Number(f), output, browserExecutable, scale: 0.5});
  console.log(output);
}
