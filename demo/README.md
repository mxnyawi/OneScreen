# OneScreen demo videos

The launch and demo videos for OneScreen, written as code with [Remotion](https://www.remotion.dev)
(React → MP4). Every frame, animation, caption and sound cue is in `src/`, so you can change a word
and re-render. You don't need to edit anything in a timeline.

## What gets rendered

| File (in `out/`) | Size | Length | Use it for |
| --- | --- | --- | --- |
| `onescreen-launch-16x9.mp4` | 1920×1080 | 25 s | YouTube, X/Twitter, Product Hunt, landing page |
| `onescreen-launch-9x16.mp4` | 1080×1920 | 25 s | TikTok, Reels, YouTube Shorts |
| `onescreen-launch-1x1.mp4` | 1080×1080 | 25 s | LinkedIn, X, Reddit feed |
| `onescreen-gesture-loop.mp4` / `.gif` | 1080×1080 | 4.7 s | README hero GIF, autoplay embeds |
| `onescreen-gesture-loop-wide.mp4` / `.gif` | 1600×900 | 4.7 s | Hacker News / blog header |
| `onescreen-thumbnail-16x9.png` | 1920×1080 | – | YouTube thumbnail, OG/social card |
| `onescreen-thumbnail-9x16.png` | 1080×1920 | – | Shorts / Reels cover |

The launch video has seven scenes. Each one is a file in `src/scenes/`:

1. **Hook** (0–3 s): the cursor slams into the screen edge. "Monitor is right there. Mouse says nope."
2. **Why** (3–6 s): the display arrangement shows the monitor on the wrong side.
3. **Old way** (6–10 s): dragging rectangles in Settings at 16× speed while a stopwatch climbs to 0:47.
   "Every. Single. Desk."
4. **Reveal** (10–12 s): the OneScreen logo snaps together. "Just push."
5. **Flip** (12–18 s): the main demo. The cursor pushes, the push ring fills, the layout flips, the
   cursor glides across, the edge glows, and a "0:47 → 0.4s" chip appears.
6. **Features** (18–22 s): remembers every desk, macOS + Windows, zero setup.
7. **CTA** (22–25 s): a "Star on GitHub" button gets clicked and the star bursts. Shows the repo URL.

## Quick start

```bash
cd demo
npm install
npm run studio          # live preview + scrubbing in the browser (Remotion Studio)
npm run render          # render everything into out/
npm run render -- Launch-9x16   # or just one composition
```

Rendering needs Chrome. Remotion downloads one automatically. To use a Chrome you already have,
set `REMOTION_CHROME=/path/to/chrome`.

## Changing things

| Want to change… | Edit |
| --- | --- |
| Caption text | the `words('…', {word: 'yellow'})` calls in each scene. Highlight colours: `yellow`, `pink`, `cyan`, `mint`, `red`, `grad` |
| Colours, fonts | `src/theme.ts` |
| Scene order, lengths | `SCENES` in `src/Launch.tsx` (lengths are the `*_LEN` exports) |
| Gesture timing | the `ARRIVE` / `TRIGGER` / `LAND` constants in `src/scenes/Flip.tsx` |
| Repo URL in the CTA | `REPO` in `src/scenes/Cta.tsx` |
| Music / SFX | `public/sfx/`. Turn the music off with the `music: false` prop |

The name lives in `components/Logo.tsx` (`Wordmark`). If the final name changes, that file and the
caption strings are the only places to update.

## Audio

- `beat.wav`, `bonk.wav`, `pop.wav`, `riser.wav`, `impact.wav` are **original sounds made by
  `scripts/make-audio.py`** (numpy only). They're royalty-free and safe to post anywhere. The beat is
  120 BPM, so scene cuts land on the beat.
- `whoosh`, `whip`, `switch`, `mouse-click`, `ding`, `shutter-modern` are from the Remotion SFX
  library (`remotion.media`).
- **Tip for TikTok/Reels:** render with `music: false` and add a trending sound inside the app. Native
  trending audio usually gets more reach than a baked-in track.

## Claude Code skills

The official [Remotion Agent Skills](https://github.com/remotion-dev/skills) are installed in
`../.claude/skills/` (`remotion-best-practices`, `remotion-markup`, `remotion-render`, …).
Any Claude Code session in this repo can use them. Example: "/remotion-markup add a scene showing
the per-desk memory".

## Licence note

Remotion is free for individuals and companies with up to 3 employees. Larger companies need a
[company licence](https://www.remotion.dev/license). OneScreen's own code stays MIT. This `demo/`
folder only uses Remotion as a build tool for the videos.
