export const WIDTH = 1600;
export const HEIGHT = 1000;
export const COLORS = [
  { value: '#e56b49', name: '日落橙' }, { value: '#3158d5', name: '群青蓝' },
  { value: '#258474', name: '松石绿' }, { value: '#bd8f31', name: '麦穗金' },
  { value: '#9363b4', name: '鸢尾紫' }, { value: '#26334d', name: '午夜黑' },
];
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

export class Drawing {
  constructor(canvas, onChange = () => {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.onChange = onChange;
    this.strokes = []; this.redoStack = []; this.current = null; this.color = COLORS[0].value; this.width = 8; this.tool = 'pen';
    this.maxStrokes = 500; this.maxPoints = 2500;
  }
  begin(point) {
    if (!validPoint(point)) return;
    this.end(); this.redoStack = [];
    this.current = { tool: this.tool, color: this.color, width: this.tool === 'eraser' ? this.width * 4 : this.width, points: [{ ...point }] };
    this.strokes.push(this.current);
    if (this.strokes.length > this.maxStrokes) this.strokes.shift();
    this.render();
  }
  move(point) {
    if (!this.current || !validPoint(point)) return;
    const previous = this.current.points.at(-1);
    if (Math.hypot((point.x - previous.x) * WIDTH, (point.y - previous.y) * HEIGHT) < 1) return;
    if (this.current.points.length >= this.maxPoints) {
      const continuation = { ...previous }; this.end(); this.begin(continuation);
    }
    this.current.points.push({ ...point }); this.render();
  }
  end() { if (this.current) { this.current = null; this.onChange(this); } }
  undo() { this.end(); if (this.strokes.length) { this.redoStack.push(this.strokes.pop()); this.render(); this.onChange(this); } }
  redo() { this.end(); if (this.redoStack.length) { this.strokes.push(this.redoStack.pop()); this.render(); this.onChange(this); } }
  clear() { this.end(); if (!this.strokes.length) return; this.redoStack = []; this.strokes.push({ tool: 'clear', points: [] }); this.render(); this.onChange(this); }
  get count() {
    const lastClear = this.strokes.findLastIndex(s => s.tool === 'clear');
    return this.strokes.slice(lastClear + 1).filter(s => s.tool === 'pen').length;
  }
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    for (const stroke of this.strokes) {
      if (stroke.tool === 'clear') { ctx.clearRect(0, 0, WIDTH, HEIGHT); continue; }
      const pts = stroke.points;
      if (!pts.length) continue;
      ctx.save(); ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color; ctx.fillStyle = stroke.color; ctx.lineWidth = stroke.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0].x * WIDTH, pts[0].y * HEIGHT, stroke.width / 2, 0, Math.PI * 2); ctx.fill(); }
      else {
        ctx.beginPath(); ctx.moveTo(pts[0].x * WIDTH, pts[0].y * HEIGHT);
        for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i].x * WIDTH, pts[i].y * HEIGHT, (pts[i].x + pts[i+1].x) * WIDTH / 2, (pts[i].y + pts[i+1].y) * HEIGHT / 2);
        const last = pts.at(-1); ctx.lineTo(last.x * WIDTH, last.y * HEIGHT); ctx.stroke();
      }
      ctx.restore();
    }
  }
  serialize() { return JSON.stringify({ version: 1, strokes: this.strokes }); }
  restore(json) {
    try {
      const data = JSON.parse(json);
      if (data.version !== 1 || !Array.isArray(data.strokes) || data.strokes.length > this.maxStrokes) return false;
      if (!data.strokes.every(s => ['pen', 'eraser', 'clear'].includes(s.tool) && Array.isArray(s.points) && s.points.length <= this.maxPoints && s.points.every(validPoint) && (s.tool === 'clear' || (/^#[0-9a-f]{6}$/i.test(s.color) && Number.isFinite(s.width) && s.width > 0 && s.width <= 160)))) return false;
      this.strokes = data.strokes; this.redoStack = []; this.current = null; this.render(); return true;
    } catch { return false; }
  }
  exportCanvas() {
    const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.drawImage(this.canvas, 0, 0); return canvas;
  }
}
