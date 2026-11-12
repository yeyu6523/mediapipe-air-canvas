import test from 'node:test';
import assert from 'node:assert/strict';
import { Drawing } from '../src/drawing.js';

function makeDrawing() {
  const ctx = new Proxy({}, { get: (_, property) => property === 'canvas' ? null : () => {} });
  return new Drawing({ getContext: () => ctx });
}
function stroke(drawing, x = 0.2) { drawing.begin({ x, y: 0.2 }); drawing.move({ x: x + 0.2, y: 0.4 }); drawing.end(); }
test('undo and redo preserve strokes and reject the old redo branch after new drawing', () => {
  const drawing = makeDrawing(); stroke(drawing); stroke(drawing, 0.5);
  assert.equal(drawing.count, 2); drawing.undo(); assert.equal(drawing.count, 1);
  drawing.redo(); assert.equal(drawing.count, 2);
  drawing.undo(); stroke(drawing); assert.equal(drawing.redoStack.length, 0);
});
test('clear is an undoable action; redo clears again', () => {
  const drawing = makeDrawing(); stroke(drawing); drawing.clear();
  assert.equal(drawing.count, 0); drawing.undo(); assert.equal(drawing.count, 1);
  drawing.redo(); assert.equal(drawing.count, 0);
});
test('eraser is stored as destination-out geometry, not white paint', () => {
  const drawing = makeDrawing(); drawing.tool = 'eraser'; drawing.width = 10; stroke(drawing);
  assert.equal(drawing.strokes[0].tool, 'eraser'); assert.equal(drawing.strokes[0].width, 40);
  assert.equal(drawing.count, 0);
});
test('validated persistence restores drawing, and malformed data cannot mutate it', () => {
  const first = makeDrawing(); stroke(first);
  const restored = makeDrawing(); assert.equal(restored.restore(first.serialize()), true);
  assert.equal(restored.count, 1);
  assert.equal(restored.restore('{broken'), false);
  assert.equal(restored.restore(JSON.stringify({ version: 1, strokes: [{ tool: 'pen', color: '#fff', width: 3, points: [{ x: -1, y: 0.5 }] }] })), false);
  assert.equal(restored.count, 1);
});
test('invalid points never enter the drawing', () => {
  const drawing = makeDrawing(); drawing.begin({ x: NaN, y: 0 });
  assert.equal(drawing.strokes.length, 0);
  drawing.begin({ x: 0.2, y: 0.2 }); drawing.move({ x: 2, y: 0.3 }); drawing.end();
  assert.equal(drawing.strokes[0].points.length, 1);
});
