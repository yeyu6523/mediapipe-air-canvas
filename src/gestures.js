export const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const distance = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);

/** Palm-normalized pinch distance avoids fixed pixel thresholds at different camera distances. */
export function pinchRatio(landmarks, aspect = 4 / 3) {
  if (!Array.isArray(landmarks) || landmarks.length !== 21) return Infinity;
  const palm = distance(landmarks[5], landmarks[17], aspect);
  if (palm < 0.005) return Infinity;
  return distance(landmarks[4], landmarks[8], aspect) / palm;
}

export class PinchTracker {
  constructor(threshold = 0.4) { this.threshold = threshold; this.reset(); }
  reset() { this.pinching = false; this.point = null; this.lastTime = 0; this.stableFrames = 0; }
  update(landmarks, time, { mirror = true, aspect = 4 / 3 } = {}) {
    if (!landmarks?.length) { this.reset(); return null; }
    // Allow slower devices to produce two consecutive observations; reset after
    // a full second without an observation, not after a normal 3–4 FPS interval.
    if (time - this.lastTime > 1000) this.reset();
    const ratio = pinchRatio(landmarks, aspect);
    const threshold = this.pinching ? this.threshold + 0.16 : this.threshold;
    const candidate = ratio < threshold;
    // Two consecutive observations to start; release immediately above the hysteresis band.
    if (candidate) this.stableFrames++;
    else this.stableFrames = 0;
    this.pinching = candidate && (this.pinching || this.stableFrames >= 2);
    const target = { x: clamp(mirror ? 1 - landmarks[8].x : landmarks[8].x), y: clamp(landmarks[8].y) };
    const dt = this.lastTime ? Math.max(1, time - this.lastTime) : 33;
    const alpha = 1 - Math.exp(-dt / 45);
    this.point = this.point ? { x: this.point.x + (target.x - this.point.x) * alpha, y: this.point.y + (target.y - this.point.y) * alpha } : target;
    this.lastTime = time;
    return { point: { ...this.point }, pinching: this.pinching, ratio };
  }
}

export class DwellTracker {
  constructor(duration = 700) { this.duration = duration; this.reset(); }
  reset() { this.target = null; this.since = 0; this.fired = false; }
  update(target, time) {
    if (!target) { this.reset(); return { progress: 0, activate: null }; }
    if (target !== this.target) { this.target = target; this.since = time; this.fired = false; }
    const progress = clamp((time - this.since) / this.duration);
    if (progress >= 1 && !this.fired) { this.fired = true; return { progress, activate: target }; }
    return { progress, activate: null };
  }
}
