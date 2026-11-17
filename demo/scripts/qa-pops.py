"""Flag single-frame pops: frames whose change from the previous frame is
>3x the median change of their neighbours (+-3 frames) and clearly visible.

usage: python3 scripts/qa-pops.py out/onescreen-launch-16x9.mp4
"""
import re
import subprocess
import sys
from statistics import median

video = sys.argv[1]
out = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", video, "-vf", "scale=480:-1,select='gte(n,1)',metadata=print:key=lavfi.scene_score", "-an", "-f", "null", "-"],
    capture_output=True, text=True,
)
log = out.stdout + out.stderr
raw = re.findall(r"scene_score=([0-9.]+)", log)
if not raw:
    # fall back: ask for the scene score explicitly
    out = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", video, "-vf", "scale=480:-1,select='gte(scene,0)',metadata=print", "-an", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    raw = re.findall(r"lavfi.scene_score=([0-9.]+)", out.stdout + out.stderr)
scores = [float(x) for x in raw]
fps = 30
pops = []
for i, s in enumerate(scores):
    nb = scores[max(0, i - 3):i] + scores[i + 1:i + 4]
    m = median(nb) if nb else 0
    if s > 0.08 and s > 3 * max(m, 0.01):
        pops.append((i + 1, s, m))
print(f"{len(scores)} frames analysed, {len(pops)} spikes")
for f, s, m in pops:
    print(f"  frame {f:4d} ({f / fps:5.2f}s)  change={s:.3f}  neighbours~{m:.3f}")
