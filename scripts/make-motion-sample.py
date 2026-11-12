"""Generate explicitly synthetic motion from Google's static pointing_up fixture.

Needs Python 3, Pillow, and FFmpeg. Does not synthesize landmarks or pinch gestures.
The resulting clip tests video decoding and the actual MediaPipe inference path.
"""
from pathlib import Path
import math
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
image = Image.open(ROOT / "assets/pointing-up.jpg").convert("RGB").resize((260, 273))
output = ROOT / "assets/hand-motion.mp4"
process = subprocess.Popen([
    "ffmpeg", "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
    "-s", "640x480", "-r", "24", "-i", "-", "-an", "-c:v", "libx264",
    "-preset", "fast", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)
], stdin=subprocess.PIPE)
for i in range(144):
    t = i / 24
    frame = Image.new("RGB", (640, 480), "#edf0f2")
    frame.paste(image, (round(190 + 100 * math.sin(t * math.pi / 3)), round(102 + 35 * math.sin(t * math.pi / 1.5))))
    process.stdin.write(frame.tobytes())
process.stdin.close()
if process.wait():
    raise SystemExit("FFmpeg failed")
print(output)
