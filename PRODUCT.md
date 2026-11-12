# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
用户允许 HTML 或 exe，且要求自行设计实现。采用无框架的 HTML / CSS / JavaScript 模块，Node.js 仅用于本地静态服务与准备依赖。此为本次实现决策，不是用户长期偏好。

## Users
课程作业的使用者、演示者和评审者，需要直观体验 MediaPipe 的交互能力。

## Product Purpose
实现可运行、可演示、可提交源码的 MediaPipe 交互程序，同时提交代码仓库和演示视频。

## Capabilities and Constraints
本次自行设计为「空中画室」：手部识别、捏合绘画、悬停换色、画笔与橡皮、撤销重做、保存图片；鼠标与触摸为可访问的备用输入。所有摄像头帧只在浏览器本地处理。官方模型和 WASM 本地提供。摄像头只能在 localhost 或 HTTPS 下启用。

## Evidence on Hand
空仓库。无用户提供的摄像头录像或素材。演示视频需如实说明输入方式；不能把鼠标操作或素材检测称为真人摄像头实测。

## Product Principles
1. 显示真实的推理状态和输入来源。
2. 摄像头权限由用户主动开启，停止时释放设备。
3. 不依赖 API Key、后端或云端推理。
4. 失败时提供能继续体验的操作路径。
