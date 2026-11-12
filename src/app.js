import { Drawing, COLORS, WIDTH, HEIGHT } from './drawing.js';
import { CONNECTIONS, PinchTracker, DwellTracker, clamp } from './gestures.js';

const $ = id => document.getElementById(id);
const stage = $('paper-stage');
const video = $('source-video');
const preview = $('preview');
const previewCtx = preview.getContext('2d');
const pinch = new PinchTracker();
const dwell = new DwellTracker();
const STORAGE_KEY = 'air-canvas-artwork-v1';
let worker = null;
let modelPromise = null;
let delegate = '';
let busy = false;
let mode = 'none';
let source = null;
let sourceUrl = null;
let generation = 0;
let initializing = false;
let raf = 0;
let lastSubmitted = 0;
let lastVideoTime = -1;
let lastResult = null;
let pointerId = null;
let handDrawing = false;
let toastTimer;
let saveTimer;
let recorder = null;
let recordFrame = 0;
let recordingStream = null;
let recordStarted = 0;
let recordTimer;

function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3300);
}
function message(text = '') { $('source-message').textContent = text; $('source-message').hidden = !text; }
function setStatus(text, drawing = false) {
  $('interaction-status').textContent = text;
  $('interaction-dot').className = `status-dot${drawing ? ' drawing' : mode === 'none' ? ' neutral' : ''}`;
}

const drawing = new Drawing($('drawing'), () => {
  updateHistory();
  $('work-state').classList.add('dirty');
  $('autosave-status').textContent = '正在保存…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 300);
});

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, drawing.serialize());
    $('autosave-status').textContent = '已自动保存至本机'; $('work-state').classList.remove('dirty');
  } catch { $('autosave-status').textContent = '本机存储不可用，请保存 PNG'; }
}
function updateHistory() {
  $('undo').disabled = !drawing.strokes.length;
  $('redo').disabled = !drawing.redoStack.length;
  $('clear').disabled = !drawing.count;
  $('stroke-count').textContent = `${drawing.count} 笔`;
  if (drawing.count || mode !== 'none' || pointerId !== null) $('empty-canvas').hidden = true;
}

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && drawing.restore(saved) && drawing.strokes.length) {
    updateHistory(); $('autosave-status').textContent = '已恢复本机画作';
  }
} catch { $('autosave-status').textContent = '本机存储不可用，请保存 PNG'; }

function setColor(color, announce = false) {
  const selected = COLORS.find(c => c.value === color);
  if (!selected) return;
  finishInput(); drawing.color = color; setTool('pen');
  $('color-name').textContent = selected.name;
  document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === color)));
  $('brush-preview').setAttribute('stroke', color);
  if (announce) toast(`已切换：${selected.name}`);
}
function setTool(tool) {
  finishInput(); drawing.tool = tool;
  for (const t of ['pen', 'eraser']) {
    $(`${t}-tool`).classList.toggle('active', t === tool);
    $(`${t}-tool`).setAttribute('aria-pressed', String(t === tool));
  }
  $('brush-preview').setAttribute('stroke', tool === 'eraser' ? '#8e9cb6' : drawing.color);
  $('brush-preview').setAttribute('stroke-width', Math.min(drawing.width, 20));
}
for (const color of COLORS) {
  const button = document.createElement('button');
  button.className = 'color-swatch'; button.dataset.color = color.value;
  button.style.setProperty('--swatch', color.value); button.setAttribute('aria-label', color.name);
  button.setAttribute('aria-pressed', String(color.value === drawing.color)); button.title = color.name;
  $('colors').append(button);
}
document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => setColor(button.dataset.color)));
$('pen-tool').addEventListener('click', () => setTool('pen'));
$('eraser-tool').addEventListener('click', () => setTool('eraser'));
$('brush-width').addEventListener('input', event => {
  finishInput(); drawing.width = Number(event.target.value); $('width-label').textContent = `${drawing.width} px`;
  $('brush-preview').setAttribute('stroke-width', Math.min(drawing.width, 20));
});
$('sensitivity').addEventListener('input', event => {
  finishInput(); pinch.threshold = Number(event.target.value); pinch.reset();
  $('sensitivity-label').textContent = pinch.threshold < 0.35 ? '精确' : pinch.threshold > 0.45 ? '灵敏' : '标准';
});
$('mirror').addEventListener('change', () => { finishInput(); pinch.reset(); if (source && lastResult) drawPreview(lastResult); });
$('skeleton').addEventListener('change', () => { if (source && lastResult) drawPreview(lastResult); });
$('grid-toggle').addEventListener('click', () => {
  const enabled = stage.classList.toggle('grid'); $('grid-toggle').setAttribute('aria-pressed', String(enabled));
});

function finishInput() { drawing.end(); handDrawing = false; }
function pointerPoint(event) {
  const rect = $('drawing').getBoundingClientRect();
  return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
}
$('drawing').addEventListener('pointerdown', event => {
  if (event.button !== 0 || pointerId !== null) return;
  event.preventDefault(); finishInput(); pointerId = event.pointerId;
  $('drawing').setPointerCapture(pointerId); $('empty-canvas').hidden = true;
  $('hand-cursor').hidden = true; drawing.begin(pointerPoint(event));
  setStatus(drawing.tool === 'eraser' ? '橡皮擦除中' : '指针绘画中', true);
  $('input-hint').textContent = event.pointerType === 'touch' ? '触屏输入' : '鼠标输入';
});
$('drawing').addEventListener('pointermove', event => { if (event.pointerId === pointerId) drawing.move(pointerPoint(event)); });
function endPointer(event) {
  if (event.pointerId !== pointerId) return;
  if ($('drawing').hasPointerCapture(pointerId)) $('drawing').releasePointerCapture(pointerId);
  pointerId = null; drawing.end(); setStatus('抬笔，等待下一笔');
}
$('drawing').addEventListener('pointerup', endPointer);
$('drawing').addEventListener('pointercancel', endPointer);
$('drawing').addEventListener('lostpointercapture', endPointer);
$('try-mouse').addEventListener('click', () => {
  $('empty-canvas').hidden = true; $('input-hint').textContent = '鼠标 / 触屏输入';
  setStatus('按住鼠标拖动，开始绘画'); toast('按住鼠标拖动绘画；B 切画笔，E 切橡皮');
});
$('undo').addEventListener('click', () => { finishInput(); drawing.undo(); });
$('redo').addEventListener('click', () => { finishInput(); drawing.redo(); });
$('clear').addEventListener('click', () => { finishInput(); $('clear-confirm').hidden = false; $('cancel-clear').focus(); });
$('cancel-clear').addEventListener('click', () => { $('clear-confirm').hidden = true; $('clear').focus(); });
$('confirm-clear').addEventListener('click', () => {
  drawing.clear(); $('clear-confirm').hidden = true; toast('画布已清空，撤销可以恢复');
});
document.addEventListener('keydown', event => {
  if (event.target.matches('input,textarea,select') || event.target.isContentEditable || event.altKey) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault(); finishInput(); event.shiftKey ? drawing.redo() : drawing.undo();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault(); finishInput(); drawing.redo();
  } else if (!event.ctrlKey && !event.metaKey) {
    if (event.key.toLowerCase() === 'b') setTool('pen');
    if (event.key.toLowerCase() === 'e') setTool('eraser');
    if (event.key === 'Escape') $('clear-confirm').hidden = true;
  }
});

function download(blob, name) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function fileStamp() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }
$('export').addEventListener('click', () => {
  finishInput(); drawing.exportCanvas().toBlob(blob => {
    if (blob) { download(blob, `空中画室-${fileStamp()}.png`); toast('作品已保存为 1600 × 1000 PNG'); }
    else message('图片导出失败，请重试或尝试其他浏览器。');
  }, 'image/png');
});

function ensureModel() {
  if (modelPromise) return modelPromise;
  $('model-status').textContent = '正在加载模型…';
  modelPromise = new Promise((resolve, reject) => {
    const instance = new Worker(new URL('./vision-worker.js', import.meta.url));
    worker = instance;
    const timeout = setTimeout(() => fail(new Error('模型加载超时。请检查 assets 和 vendor 文件是否完整。')), 45000);
    let settled = false;
    function fail(error) {
      clearTimeout(timeout); instance.terminate(); if (worker === instance) worker = null;
      modelPromise = null; busy = false;
      $('model-status').textContent = '模型加载失败'; $('model-dot').className = 'status-dot neutral';
      if (!settled) { settled = true; reject(error); }
      else { stopSource(); message(`识别进程中断：${error.message}。可重新开启，或继续使用鼠标绘画。`); }
    }
    instance.onerror = event => fail(new Error(event.message || '浏览器无法启动识别线程'));
    instance.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        clearTimeout(timeout); delegate = data.delegate; settled = true;
        $('model-status').textContent = `模型就绪 · ${delegate}`; $('model-dot').className = 'status-dot'; resolve();
      } else if (data.type === 'error') fail(new Error(data.message));
      else if (data.type === 'result') {
        busy = false;
        if (data.generation !== generation || !source) return;
        lastResult = data; handleResult(data);
      } else if (data.type === 'frame-error') {
        busy = false;
        if (data.generation !== generation) return;
        stopSource(); message(`当前画面无法识别：${data.message}。请换一份素材或重新开启摄像头。`);
      }
    };
    instance.postMessage({ type: 'init' });
  });
  return modelPromise;
}

function resetSourceUi() {
  $('source-badge').textContent = '未开启'; $('source-badge').className = 'tag';
  $('camera-button-text').textContent = '开启摄像头';
  $('preview').hidden = true; $('camera-placeholder').hidden = false; $('preview-label').hidden = true;
  $('hand-cursor').hidden = true; $('gesture-name').textContent = '等待手部出现';
  $('inference-ms').textContent = '— ms';
  if (delegate) $('model-status').textContent = `模型就绪 · ${delegate}`;
  $('input-hint').textContent = '鼠标 / 触屏可用'; setStatus('识别已停止，仍可使用鼠标绘画');
}
function stopSource() {
  generation++; initializing = false; cancelAnimationFrame(raf); raf = 0; source = null;
  const stream = video.srcObject;
  if (stream) stream.getTracks().forEach(track => track.stop());
  video.pause(); video.srcObject = null; video.removeAttribute('src'); video.load();
  if (sourceUrl) { URL.revokeObjectURL(sourceUrl); sourceUrl = null; }
  mode = 'none'; lastResult = null; lastVideoTime = -1; lastSubmitted = 0;
  finishInput(); pinch.reset(); dwell.reset(); $('air-palette').style.setProperty('--dwell', '0%');
  resetSourceUi();
}
function activateSource(nextMode, input, label) {
  mode = nextMode; source = input; initializing = false;
  $('source-badge').textContent = nextMode === 'camera' ? '摄像头' : nextMode === 'video' ? '视频素材' : '图像素材';
  $('source-badge').className = 'tag live'; $('camera-button-text').textContent = nextMode === 'camera' ? '停止摄像头' : '停止素材识别';
  $('camera-placeholder').hidden = true; preview.hidden = false;
  $('preview-label').textContent = label; $('preview-label').hidden = false;
  $('empty-canvas').hidden = true; $('input-hint').textContent = nextMode === 'camera' ? '手势输入 · 镜像可调' : nextMode === 'video' ? '视频素材手势输入 · 非摄像头' : '图像识别示例 · 可同时用鼠标画画';
  message(); loop(performance.now());
}
const cameraErrors = {
  NotAllowedError: '摄像头权限未获允许。请在浏览器地址栏允许摄像头后重试，也可以选择「识别示例」或鼠标绘画。',
  NotFoundError: '没有检测到摄像头。你可以导入视频、运行识别示例，或直接用鼠标绘画。',
  NotReadableError: '摄像头可能被其他程序占用。请关闭占用摄像头的程序后重试。',
  OverconstrainedError: '摄像头不支持当前画面设置。请尝试其他摄像头或导入视频。',
};
async function startCamera() {
  stopSource(); message(); initializing = true; const current = generation;
  $('camera-button-text').textContent = '加载模型中 · 点击取消';
  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('请使用 localhost 或 HTTPS 打开页面，浏览器才允许访问摄像头。');
    await ensureModel(); if (current !== generation) return;
    $('camera-button-text').textContent = '等待摄像头授权 · 点击取消';
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    if (current !== generation) { stream.getTracks().forEach(track => track.stop()); return; }
    video.srcObject = stream; await video.play(); if (current !== generation) return;
    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      if (current === generation) { stopSource(); message('摄像头连接已断开，请检查设备后重新开启。'); }
    }, { once: true });
    activateSource('camera', video, '本地实时摄像头'); toast('拇指与食指捏合落笔，分开抬笔');
  } catch (error) {
    if (current !== generation) return;
    stopSource(); message(cameraErrors[error.name] || `启动失败：${error.message}`);
  }
}
document.querySelectorAll('.camera-trigger').forEach(button => button.addEventListener('click', () => {
  if (initializing || mode !== 'none') { stopSource(); message(); } else startCamera();
}));

async function openImage(url, sample = false) {
  stopSource(); message(); initializing = true; const current = generation;
  if (!sample) sourceUrl = url;
  $('camera-button-text').textContent = '加载素材中 · 点击取消';
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (image.width * image.height > 30000000) throw new Error('图片过大，请使用 3000 万像素以内的图片');
    await ensureModel(); if (current !== generation) return;
    activateSource(sample ? 'sample' : 'image', image, sample ? '官方测试图像 · 非摄像头' : '导入的静态图像 · 非摄像头');
    toast('正在真实识别图像。静态示例不自动绘画，可用鼠标继续创作。');
  } catch (error) { if (current === generation) { stopSource(); message(`图像加载失败：${error.message}。请检查素材格式及本地模型。`); } }
}
function openSample() { openImage(new URL('../assets/pointing-up.jpg', import.meta.url).href, true); }
$('sample').addEventListener('click', openSample);
$('sample-shortcut').addEventListener('click', openSample);
$('import-button').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  if (file.size > 200 * 1024 * 1024) { message('素材超过 200 MB，请压缩后导入。'); return; }
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { message('请选择浏览器支持的图片或视频，例如 JPG、PNG、MP4、WebM。'); return; }
  if (file.type.startsWith('image/')) { await openImage(URL.createObjectURL(file)); return; }
  stopSource(); message(); initializing = true; const current = generation; sourceUrl = URL.createObjectURL(file);
  $('camera-button-text').textContent = '加载视频中 · 点击取消';
  try {
    await ensureModel(); if (current !== generation) return;
    video.src = sourceUrl; video.loop = true; await video.play(); if (current !== generation) return;
    activateSource('video', video, '导入的视频 · 非摄像头'); toast('视频将循环播放，识别到捏合时会落笔');
  } catch (error) { if (current === generation) { stopSource(); message(`视频无法播放：${error.message}。建议使用 H.264 MP4 或 WebM。`); } }
});

function sourceSize() {
  return { width: source?.videoWidth || source?.naturalWidth || 640, height: source?.videoHeight || source?.naturalHeight || 480 };
}
async function loop(time) {
  raf = requestAnimationFrame(loop);
  if (!source || busy || !worker || document.hidden || time - lastSubmitted < 45) return;
  if (source === video && (video.readyState < 2 || video.currentTime === lastVideoTime)) return;
  if (source !== video && lastResult) return;
  const current = generation; busy = true; lastSubmitted = time;
  if (source === video) lastVideoTime = video.currentTime;
  try {
    const { width, height } = sourceSize();
    const bitmap = await createImageBitmap(source, { resizeWidth: 640, resizeHeight: Math.max(1, Math.round(640 * height / width)) });
    if (current !== generation || !worker) { bitmap.close(); busy = false; return; }
    worker.postMessage({ type: 'frame', bitmap, timestamp: time, generation: current }, [bitmap]);
  } catch (error) {
    busy = false;
    if (current === generation) { stopSource(); message(`无法读取当前画面：${error.message}。请尝试重新开启。`); }
  }
}

function drawPreview(result) {
  if (!source) return;
  const { width, height } = sourceSize();
  const h = Math.max(1, Math.round(640 * height / width));
  if (preview.width !== 640 || preview.height !== h) { preview.width = 640; preview.height = h; }
  previewCtx.save(); previewCtx.clearRect(0, 0, 640, h);
  if ($('mirror').checked) { previewCtx.translate(640, 0); previewCtx.scale(-1, 1); }
  previewCtx.drawImage(source, 0, 0, 640, h);
  const points = result.landmarks;
  if (points && $('skeleton').checked) {
    previewCtx.strokeStyle = '#68ead0'; previewCtx.lineWidth = 3;
    for (const [a, b] of CONNECTIONS) {
      previewCtx.beginPath(); previewCtx.moveTo(points[a].x * 640, points[a].y * h); previewCtx.lineTo(points[b].x * 640, points[b].y * h); previewCtx.stroke();
    }
    for (let i = 0; i < points.length; i++) {
      previewCtx.beginPath(); previewCtx.arc(points[i].x * 640, points[i].y * h, [4, 8].includes(i) ? 6 : 4, 0, Math.PI * 2);
      previewCtx.fillStyle = [4, 8].includes(i) ? '#ffae73' : '#ffffff'; previewCtx.fill();
    }
  }
  previewCtx.restore();
}
function handleResult(result) {
  drawPreview(result);
  $('inference-ms').textContent = `${Math.round(result.inferenceMs)} ms`;
  $('model-status').textContent = result.landmarks ? `21 关键点 · ${delegate}` : `识别中 · ${delegate}`;
  const { width, height } = sourceSize();
  const state = pinch.update(result.landmarks, result.timestamp, { mirror: $('mirror').checked, aspect: width / height });
  if (!state) {
    if (handDrawing) finishInput(); dwell.reset();
    $('hand-cursor').hidden = true; $('air-palette').style.setProperty('--dwell', '0%');
    $('gesture-name').textContent = '未检测到手部'; if (pointerId === null) setStatus('请将手掌完整放入画面'); return;
  }
  const isStatic = mode === 'sample' || mode === 'image';
  $('gesture-name').textContent = `${state.pinching ? '捏合 · 落笔' : '张开 · 移动'}${isStatic ? '（静态）' : ''}`;
  if (pointerId !== null) return;
  const cursor = $('hand-cursor');
  cursor.hidden = isStatic; cursor.style.left = `${state.point.x * 100}%`; cursor.style.top = `${state.point.y * 100}%`;
  cursor.classList.toggle('pinching', state.pinching);
  if (isStatic) { setStatus('已识别 21 个关键点 · 静态素材不自动绘画'); return; }
  const rect = stage.getBoundingClientRect();
  const client = { x: rect.left + state.point.x * rect.width, y: rect.top + state.point.y * rect.height };
  let target = null;
  for (const button of document.querySelectorAll('.air-swatch')) {
    const box = button.getBoundingClientRect();
    if (client.x >= box.left - 8 && client.x <= box.right + 8 && client.y >= box.top - 10 && client.y <= box.bottom + 10) target = button.dataset.color;
  }
  const paletteRect = $('air-palette').getBoundingClientRect();
  const insidePalette = client.x >= paletteRect.left - 10 && client.x <= paletteRect.right + 10 && client.y >= paletteRect.top - 10 && client.y <= paletteRect.bottom + 10;
  const hovered = dwell.update(!state.pinching ? target : null, result.timestamp);
  $('air-palette').style.setProperty('--dwell', `${hovered.progress * 100}%`);
  if (hovered.activate) setColor(hovered.activate, true);
  if (state.pinching && !insidePalette) {
    if (!handDrawing) { drawing.begin(state.point); handDrawing = true; }
    else drawing.move(state.point);
    setStatus(drawing.tool === 'eraser' ? '捏合擦除中' : '捏合绘画中', true);
  } else {
    if (handDrawing) finishInput();
    setStatus(target ? '保持悬停，即将换色' : '已抬笔，捏合拇指与食指落笔');
  }
}

$('record').addEventListener('click', () => {
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { message('当前浏览器不支持页面内录制。请使用 Chrome / Edge，或通过系统录屏。'); return; }
  try {
    const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    recordingStream = canvas.captureStream(24);
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('未找到浏览器支持的视频编码');
    recorder = new MediaRecorder(recordingStream, { mimeType, videoBitsPerSecond: 4000000 });
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    function cleanup() {
      cancelAnimationFrame(recordFrame); clearTimeout(recordTimer); recordingStream?.getTracks().forEach(track => track.stop()); recordingStream = null;
      $('record').classList.remove('recording'); $('record-label').textContent = '录制创作过程';
    }
    recorder.onstop = () => {
      cleanup();
      if (chunks.length) { download(new Blob(chunks, { type: mimeType }), `空中画室-创作记录-${fileStamp()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`); toast('创作视频已保存（无音轨）'); }
    };
    recorder.onerror = () => { cleanup(); message('视频录制中断，请使用系统录屏重试。'); };
    recordStarted = performance.now();
    function frame() {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, WIDTH, HEIGHT); ctx.drawImage(drawing.canvas, 0, 0);
      ctx.fillStyle = '#26334d'; ctx.font = '22px "Microsoft YaHei", sans-serif'; ctx.fillText('空中画室 · Air Canvas', 30, 42);
      ctx.fillStyle = '#637089'; ctx.font = '17px "Microsoft YaHei", sans-serif';
      const elapsed = Math.floor((performance.now() - recordStarted) / 1000);
      ctx.fillText(`${source ? $('preview-label').textContent : '鼠标 / 触屏输入'} · ${elapsed}s`, 30, 72);
      if (source && !preview.hidden) {
        const w = 300, h = Math.min(300, w * preview.height / preview.width);
        ctx.fillStyle = '#e8edf5'; ctx.fillRect(WIDTH - w - 32, HEIGHT - h - 52, w + 12, h + 28);
        ctx.drawImage(preview, WIDTH - w - 26, HEIGHT - h - 46, w, h);
        ctx.font = '13px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#26334d'; ctx.fillText($('source-badge').textContent, WIDTH - w - 22, HEIGHT - 26);
      }
      recordFrame = requestAnimationFrame(frame);
    }
    recorder.start(1000); frame();
    recordTimer = setTimeout(() => { if (recorder?.state === 'recording') { recorder.stop(); toast('已达到 3 分钟，录制已自动保存'); } }, 180000);
    $('record').classList.add('recording'); $('record-label').textContent = '结束录制并保存';
    toast('录制已开始，将保存画布与识别视窗；再次点击结束');
  } catch (error) {
    recordingStream?.getTracks().forEach(track => track.stop()); recordingStream = null;
    message(`无法开始录制：${error.message}。可使用系统录屏。`);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { finishInput(); pinch.reset(); dwell.reset(); }
});
window.addEventListener('pagehide', () => {
  drawing.end(); save(); stopSource(); worker?.terminate();
  if (recorder?.state === 'recording') recorder.stop();
});
// The HTML entry is intentionally served over HTTP: module workers and camera access require it.
if (location.protocol === 'file:') message('请运行「启动空中画室.bat」或 npm start，再打开 http://localhost:4173。双击 HTML 无法加载识别模块。');
