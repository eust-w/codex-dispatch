# Launch media

`render.cjs` creates English and Chinese landscape videos and a Chinese portrait video from reviewed captures of the real running application. It never renders fabricated queue results. Captures contain only a disposable demo project; raw execution logs and personal paths must not be included.

Requirements: macOS `say` (Samantha and Tingting voices), FFmpeg, Node.js and `sharp`. Install media dependencies outside the application package, for example:

```sh
npm install --prefix /tmp/dispatch-media-tools sharp
NODE_PATH=/tmp/dispatch-media-tools/node_modules node media/render.cjs artifacts/launch
```

Extract the reviewed [demo captures](https://github.com/eust-w/codex-dispatch/releases/download/v0.1.0-alpha.1/codex-dispatch-demo-captures.zip) into `artifacts/launch`, or provide your own captures with the names referenced in the script. Output is ignored by Git. The videos disclose edited real UI captures, shortened waits, synthetic narration, and independent affiliation. Source captures are not continuous real-time recordings. The tests described in the repository are separate from the short demonstration.

Before publishing, inspect every frame for private paths, credentials and raw logs; verify audio/video streams with `ffprobe`. Do not publish a dashboard, upload receipt, draft or review state as a public video URL. Track each platform independently.
