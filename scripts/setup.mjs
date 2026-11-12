import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const vendor = resolve(root, 'vendor/mediapipe');
await mkdir(vendor, { recursive: true });
for (const name of ['vision_bundle.cjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm', 'wasm/vision_wasm_nosimd_internal.js', 'wasm/vision_wasm_nosimd_internal.wasm']) {
  await mkdir(resolve(vendor, name, '..'), { recursive: true });
  await copyFile(resolve(root, 'node_modules/@mediapipe/tasks-vision', name), resolve(vendor, name));
}
const modelPath = resolve(root, 'assets/hand_landmarker.task');
await mkdir(resolve(root, 'assets'), { recursive: true });
try { await readFile(modelPath); }
catch {
  console.log('Downloading official MediaPipe Hand Landmarker model…');
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task');
  if (!response.ok) throw new Error(`Model download failed: HTTP ${response.status}`);
  await writeFile(modelPath, Buffer.from(await response.arrayBuffer()));
}
const sha256 = createHash('sha256').update(await readFile(modelPath)).digest('hex');
if (sha256 !== 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1') {
  throw new Error(`Model integrity check failed: ${sha256}. Restore assets/hand_landmarker.task from the repository or re-download the official model.`);
}
console.log(`Local assets ready. Model SHA256: ${sha256}\nRun npm start.`);
