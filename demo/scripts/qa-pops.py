"""Final-file QA: single-frame pops (change >3x the neighbour median), black
frames (blackdetect) and integrated loudness (ebur128, target -14 LUFS).

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

# black frames
bd = subprocess.run(["ffmpeg", "-v", "info", "-i", video, "-vf", "blackdetect=d=0.05:pix_th=0.06", "-an", "-f", "null", "-"],
                    capture_output=True, text=True)
blacks = re.findall(r"black_start:([0-9.]+) black_end:([0-9.]+)", bd.stderr)
print(f"black segments: {blacks or 'none'}")
# loudness
lo = subprocess.run(["ffmpeg", "-v", "info", "-i", video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                    capture_output=True, text=True)
m = re.search(r"Integrated loudness:\s+I:\s+(-?[0-9.]+) LUFS", lo.stderr)
pk = re.search(r"True peak:\s+Peak:\s+(-?[0-9.]+) dBFS", lo.stderr)
if m:
    print(f"loudness: {m.group(1)} LUFS (target -14), true peak {pk.group(1) if pk else '?'} dBFS")
else:
    print("loudness: no audio stream")
