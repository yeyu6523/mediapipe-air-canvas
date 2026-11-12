async (page) => {
  const results = [];
  const check = (name, pass, details = '') => { results.push({ name, pass: Boolean(pass), details }); if (!pass) throw new Error(name + ': ' + details); };
  await page.goto('http://localhost:4173');
  await page.locator('#import-file').setInputFiles('assets/hand-motion.mp4');
  await page.waitForFunction(() => document.getElementById('model-status').textContent.includes('21 关键点'), null, { timeout: 45000 });
  const position = () => page.locator('#hand-cursor').evaluate(el => [parseFloat(el.style.left), parseFloat(el.style.top)]);
  const first = await position();
  await page.waitForTimeout(1300);
  const second = await position();
  check('video processed by real MediaPipe model', (await page.locator('#model-status').textContent()).includes('21 关键点'));
  check('video-driven cursor moves', Math.hypot(first[0]-second[0], first[1]-second[1]) > 0.5, JSON.stringify({first, second}));
  check('video source is honestly labeled', (await page.locator('#preview-label').textContent()).includes('非摄像头'));
  await page.locator('#camera-toggle').click();
  check('video input released on stop', await page.locator('#source-video').evaluate(el => !el.srcObject && !el.getAttribute('src') && el.paused));
  await page.locator('#record').click();
  check('MediaRecorder started', (await page.locator('#record-label').textContent()) === '结束录制并保存');
  await page.waitForTimeout(1600);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#record').click();
  const download = await downloadPromise;
  await download.saveAs('output/playwright/recorder-test.webm');
  check('MediaRecorder produced a downloadable video', (await download.failure()) === null);
  // Deny all external hosts: local model, WASM, script and sample must suffice.
  await page.route('**/*', route => new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort());
  await page.reload(); await page.locator('#sample').click();
  await page.waitForFunction(() => document.getElementById('model-status').textContent.includes('21 关键点'), null, { timeout: 45000 });
  check('inference works with external network blocked', (await page.locator('#model-status').textContent()).includes('21 关键点'), await page.locator('#inference-ms').textContent());
  await page.unroute('**/*');
  return results;
}
