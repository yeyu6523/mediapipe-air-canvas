// MediaPipe's WASM loader uses importScripts. A classic worker keeps that loader
// compatible without eval, runtime source patches, or blocking the UI thread.
self.exports = {};
importScripts('../vendor/mediapipe/vision_bundle.cjs');
const { FilesetResolver, HandLandmarker } = self.exports;

let landmarker;
let lastTimestamp = 0;
self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      const vision = await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm', self.location.href).href);
      let delegate = 'GPU';
      // A software-emulated GPU can be much slower than the CPU WASM path.
      // Detect it before building the graph; genuine hardware still uses GPU.
      try {
        const gl = new OffscreenCanvas(1, 1).getContext('webgl2');
        const extension = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : '';
        if (!gl || /swiftshader|llvmpipe|software/i.test(renderer)) delegate = 'CPU';
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      } catch { delegate = 'CPU'; }
      const options = { baseOptions: { modelAssetPath: new URL('../assets/hand_landmarker.task', self.location.href).href, delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.5 };
      try { landmarker = await HandLandmarker.createFromOptions(vision, options); }
      catch { delegate = 'CPU'; options.baseOptions.delegate = 'CPU'; landmarker = await HandLandmarker.createFromOptions(vision, options); }
      self.postMessage({ type: 'ready', delegate });
    } catch (error) { self.postMessage({ type: 'error', message: error.message || String(error) }); }
  } else if (data.type === 'frame') {
    const { bitmap } = data;
    try {
      if (!landmarker) throw new Error('Hand Landmarker is not initialized.');
      const start = performance.now();
      const timestamp = Math.max(data.timestamp, lastTimestamp + 1); lastTimestamp = timestamp;
      const result = landmarker.detectForVideo(bitmap, timestamp);
      self.postMessage({ type: 'result', landmarks: result.landmarks[0] || null, handedness: result.handedness[0]?.[0] || null, inferenceMs: performance.now() - start, timestamp: data.timestamp, generation: data.generation });
    } catch (error) { self.postMessage({ type: 'frame-error', message: error.message || String(error), generation: data.generation }); }
    finally { bitmap.close(); }
  }
};
