# Third-party notices

Original application code is MIT licensed. The MIT grant does not replace the licenses of the following third-party components.

## MediaPipe Tasks Vision

- Copyright Google LLC / The MediaPipe Authors and contributors.
- Source: https://github.com/google-ai-edge/mediapipe
- npm package: `@mediapipe/tasks-vision`, fixed version **0.10.32**.
- Distributed files: `vendor/mediapipe/vision_bundle.cjs`, `vendor/mediapipe/wasm/*`.
- License: Apache License 2.0. A verbatim copy is included in `licenses/Apache-2.0.txt`; original headers in distributed files are preserved.
- Files are copied from the official npm package by `scripts/setup.mjs`; application code does not patch the upstream library.

## Official Hand Landmarker model

- Asset: `assets/hand_landmarker.task`.
- Source: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- Upstream project/model documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
- SHA256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
- Provided as the original MediaPipe project model asset; retained under upstream terms, not relicensed as application code. Refer to the official model documentation and the MediaPipe project's Apache-2.0 licensing when redistributing.

## Official test images

- `assets/pointing-up.jpg`: https://storage.googleapis.com/mediapipe-assets/pointing_up.jpg
- `assets/right-hands.jpg`: https://storage.googleapis.com/mediapipe-assets/right_hands.jpg
- These originate from the MediaPipe project's published test assets, referenced by https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/testdata/vision/BUILD . They are third-party test fixtures, not photographs created by this application.
- `assets/hand-motion.mp4` is a derived, **synthetic motion test clip**, created by translating `pointing-up.jpg` across a plain background. It is not a recording of a live person using the program. Its source provenance and upstream rights remain the same as the input fixture. Regenerate it with `scripts/make-motion-sample.py` (Pillow + FFmpeg).
- Screenshots in `docs/images/` capture the implemented UI; the preview in the desktop screenshot contains the official test image above.

## Tooling

Node.js is used to serve static local files. Playwright CLI is used for development verification, and FFmpeg / Pillow were used to create the clearly labeled synthetic motion fixture. They are not bundled as application runtime binaries.
