# MediaPipe 使用方法调研与交互设计

调研日期：2026 年 11 月 12 日。本文以 Google AI Edge 官方文档、MediaPipe 官方 npm 包和官方测试资源为依据；实现使用固定版本 `@mediapipe/tasks-vision@0.10.32`，不以此声明它是最新版本。

## 1. 任务与选型

MediaPipe 提供视觉、音频等任务的现成推理能力。本项目需要从用户的手部运动产生可见交互，选择 **Hand Landmarker** 获取手部位置，而非训练新的分类模型。

Hand Landmarker 的输出包括每只手的 21 个归一化关键点、世界坐标关键点和左右手类别。这里使用二维 `x/y` 坐标，关注拇指尖 `4`、食指尖 `8`、食指掌指关节 `5`、小指掌指关节 `17`。[1][2]

选择绘画场景的原因：输入与结果的因果关系直观；一次捏合产生一条笔画；换色、擦除和撤销让演示能形成完整创作过程。应用不把 Hand Landmarker 本身称为「捏合分类器」：**模型负责定位，捏合是应用自己设计的几何规则。**

## 2. Web 端基本使用流程

1. 准备 `@mediapipe/tasks-vision` JS 包、匹配版本的 WASM 和 `.task` 模型。
2. 通过 `FilesetResolver.forVisionTasks()` 定位 WASM 文件。
3. 通过 `HandLandmarker.createFromOptions()` 创建任务，设置模型、运行模式、手数与置信度。
4. 图片模式使用 `detect()`；视频模式使用 `detectForVideo(frame, timestamp)`，时间戳须持续递增。
5. 从结果读取关键点，自己编写交互规则和可视化。[1]

常见模块用法如下（说明性片段，完整工程在 `src/vision-worker.js`）：

```js
const vision = await FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
const landmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: '/assets/hand_landmarker.task',
    delegate: 'GPU'
  },
  runningMode: 'VIDEO',
  numHands: 1,
  minHandDetectionConfidence: 0.55,
  minHandPresenceConfidence: 0.55,
  minTrackingConfidence: 0.5
});
const result = landmarker.detectForVideo(bitmap, performance.now());
```

本项目把静态图片也作为 VIDEO 模式中的单帧处理，以便图片与视频共享同一个任务实例。静态图仅推理一次，且明确禁止自动绘画。

## 3. 实际实现中的兼容问题

MediaPipe 的检测调用是同步工作；放到主线程可能阻塞按钮响应。因此项目在 Worker 中执行，主线程处理 UI、画布和媒体输入。每次仅允许一个帧在处理中，完成之后再提交下一帧；画面最低间隔为 45 ms，但不承诺能够达到对应帧率。[1]

首次浏览器实测发现，直接在模块 Worker 中使用此固定版本的 WASM 加载器会报 `self.import is not a function`。最终使用 **classic Worker + 官方 CommonJS bundle**：预先提供 `self.exports = {}`，用 `importScripts()` 加载官方 bundle，再取得导出类。没有修改上游运行库，也没有使用 `eval`。

Worker 优先初始化 GPU；失败则使用 CPU。检测到软件渲染器时直接尝试 CPU，避免不必要的软件 GPU 开销。WebGL、OffscreenCanvas、摄像头和媒体编码能力均受浏览器与设备影响。

## 4. 自定义手势与稳定性

### 捏合：按手掌大小归一化

令 `d(a,b)` 表示对横坐标乘以视频宽高比后的二维距离：

```text
ratio = d(拇指尖4, 食指尖8) / d(食指根5, 小指根17)
```

直接使用像素阈值会随手与摄像头距离变化。以上比例随手掌缩放更稳定；横向距离考虑源视频宽高比，避免把归一化坐标当成正方形。

默认进入捏合阈值为 `0.40`，连续两次观察满足条件才开始落笔；捏合后使用 `0.56` 的退出阈值。这个迟滞区间可减少在阈值附近反复落笔、抬笔。设置面板支持调整进入阈值。上述数值是本项目的交互参数，不是 MediaPipe 官方规定。

### 平滑与丢失恢复

采用基于时间的指数平滑：

```text
alpha = 1 - exp(-dt / 45ms)
filtered = previous + (target - previous) × alpha
```

手部消失、源切换、页面隐藏或观察间隔超过 1000 ms 时重置手势状态，避免跨画面连出长线。该间隔容许较慢设备连续获得两次捏合观察。指针输入优先于手势，防止两种输入同时生成同一条线。

### 悬停换色

只在抬笔状态检查指尖是否停留在画布顶部色块。连续停留 700 ms 后换色，一次停留只触发一次，离开目标才重置。页面有进度线显示停留过程。进入调色条区域时不绘画，以免误触。

## 5. 画布与状态设计

- Canvas 内部固定为 `1600 × 1000`，桌面和移动端显示均保持 `16:10`，导出不变形。
- 笔画保存为带颜色、宽度和坐标的矢量点序列；绘制时使用二次曲线平滑。
- 橡皮使用 `destination-out`，不是在图上涂白；导出时另外合成白色底图。
- 撤销、重做和清空使用笔画历史；清空也可撤销。
- 限制历史数量和单笔采样点，避免无界内存增长。该作品用于课堂演示，不定位为无限历史的专业绘画软件。
- 使用浏览器本地存储保存画作；数据恢复先校验结构和数值。
- 权限拒绝、无摄像头、设备占用、模型失败、素材失败和存储失败均有明确恢复提示。

## 6. 隐私和本地运行

运行时从本机 HTTP 服务加载模型和 WASM，摄像头画面只发送给当前页面自己的 Worker，不上传网络。没有云端 API、API Key、登录或后端数据库。`npm` 安装及 `setup` 的模型下载属于依赖准备阶段，与摄像头推理无关。

媒体访问需安全上下文，即 localhost 或 HTTPS；因此双击 `file://` HTML 不作为支持的启动方式。默认服务只监听 `127.0.0.1`，关闭 / 停止输入时会释放媒体轨道和素材 URL。

## 7. 验证及未覆盖项

本次已经实际加载官方模型，对官方图片和合成移动视频完成推理；检查视频驱动的指尖光标发生位移；对捏合双阈值、缺失重置和悬停逻辑进行单元测试。

**未做真人摄像头捏合绘画实测**，不能用素材推理替代这一结论。提交者自行录制演示视频时，应在真实摄像头下确认捏合落笔、抬笔和换色，必要时调整灵敏度。详见 `VALIDATION.md` 与 `DEMO_GUIDE.md`。

## 参考资料

1. Google AI Edge：Hand Landmarker Web guide。实际查阅的官方入口：<https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js>
2. Google AI Edge：Hand Landmarker overview。<https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker>
3. MediaPipe 官方 JavaScript 包 `@mediapipe/tasks-vision`，固定版本 0.10.32：<https://www.npmjs.com/package/@mediapipe/tasks-vision/v/0.10.32>
4. MediaPipe 官方代码仓库：<https://github.com/google-ai-edge/mediapipe>
5. 官方测试资源清单：<https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/testdata/vision/BUILD>
6. 官方模型：<https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task>

文档中的规则、交互阈值、界面和工程组织是本项目自己的实现设计；不要将其误写成官方推荐配置。
