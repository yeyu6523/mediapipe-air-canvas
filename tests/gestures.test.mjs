import test from 'node:test';
import assert from 'node:assert/strict';
import { PinchTracker, DwellTracker, pinchRatio, clamp } from '../src/gestures.js';

function hand(ratio = 0.2, scale = 1) {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  points[5] = { x: 0.4, y: 0.5 }; points[17] = { x: 0.6, y: 0.5 };
  points[8] = { x: 0.55, y: 0.3 }; points[4] = { x: 0.55 + ratio * 0.2, y: 0.3 };
  return points.map(p => ({ x: 0.5 + (p.x - 0.5) * scale, y: 0.5 + (p.y - 0.5) * scale }));
}
test('pinch ratio is palm-normalized across hand scales', () => {
  assert.ok(Math.abs(pinchRatio(hand(0.25)) - 0.25) < 1e-9);
  assert.ok(Math.abs(pinchRatio(hand(0.25, 0.4)) - 0.25) < 1e-9);
  assert.equal(pinchRatio([]), Infinity);
});
test('pinch starts after two observations, uses release hysteresis, then releases', () => {
  const tracker = new PinchTracker(0.4);
  assert.equal(tracker.update(hand(0.3), 100).pinching, false);
  assert.equal(tracker.update(hand(0.3), 133).pinching, true);
  assert.equal(tracker.update(hand(0.5), 166).pinching, true);
  assert.equal(tracker.update(hand(0.7), 199).pinching, false);
});
test('missing landmarks and stale observations break drawing continuity', () => {
  const tracker = new PinchTracker();
  tracker.update(hand(), 100); tracker.update(hand(), 133);
  assert.equal(tracker.update(null, 160), null);
  assert.equal(tracker.update(hand(), 180).pinching, false);
  tracker.update(hand(), 210);
  assert.equal(tracker.update(hand(), 1400).pinching, false);
});
test('slower inference intervals do not continually reset pinch confirmation', () => {
  const tracker = new PinchTracker();
  assert.equal(tracker.update(hand(), 400).pinching, false);
  assert.equal(tracker.update(hand(), 750).pinching, true);
});
test('mirroring, smoothing and bounds map a camera point into the canvas', () => {
  const mirrored = new PinchTracker().update(hand(), 100);
  assert.ok(Math.abs(mirrored.point.x - 0.45) < 1e-9);
  const normal = new PinchTracker().update(hand(), 100, { mirror: false });
  assert.equal(normal.point.x, 0.55);
  assert.equal(clamp(-3), 0); assert.equal(clamp(7), 1);
});
test('dwell activates at 700 ms exactly once, and resets after leaving or changing target', () => {
  const tracker = new DwellTracker();
  assert.deepEqual(tracker.update('blue', 100), { progress: 0, activate: null });
  assert.equal(tracker.update('blue', 799).activate, null);
  assert.equal(tracker.update('blue', 800).activate, 'blue');
  assert.equal(tracker.update('blue', 1000).activate, null);
  assert.equal(tracker.update('orange', 1001).progress, 0);
  assert.equal(tracker.update(null, 1400).progress, 0);
  assert.equal(tracker.update('orange', 2000).activate, null);
});
