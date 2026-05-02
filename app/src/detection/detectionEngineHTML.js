// The full MediaPipe detection pipeline runs inside this WebView HTML.
// The WebView accesses the front camera directly via getUserMedia(), runs
// FaceLandmarker at ~15fps, extracts raw per-frame signals (EAR, head pose,
// MAR), and posts them to React Native via postMessage.
//
// RN side (DetectionEngine.js) owns the rolling-window trackers (PERCLOS,
// blink, yawn) and the composite scorer — only numbers cross the JS bridge.

export const DETECTION_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1); /* mirror for selfie view */
    }
    #overlay {
      position: absolute;
      top: 0; left: 0; right: 0;
      padding: 6px 10px;
      background: rgba(0,0,0,0.5);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <video id="video" autoplay muted playsinline></video>
  <div id="overlay">Initializing...</div>

  <script type="module">
    import { FaceLandmarker, FilesetResolver }
      from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs";

    const video   = document.getElementById("video");
    const overlay = document.getElementById("overlay");

    // ── RN bridge ────────────────────────────────────────────────────────────
    function post(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      } else {
        console.log("[DetectionEngine]", JSON.stringify(data));
      }
    }

    // ── EAR ──────────────────────────────────────────────────────────────────
    // Landmark index sets — order: [p1, p2, p3, p4, p5, p6]
    const LEFT_EYE  = [33,  160, 158, 133, 153, 144];
    const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

    function dist3d(a, b) {
      return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
    }
    function computeEAR(lm, indices) {
      const [p1,p2,p3,p4,p5,p6] = indices.map(i => lm[i]);
      const denom = 2 * dist3d(p1, p4);
      return denom > 0 ? (dist3d(p2,p6) + dist3d(p3,p5)) / denom : 0;
    }

    // ── MAR ──────────────────────────────────────────────────────────────────
    function dist2d(a, b) {
      return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
    }
    function computeMAR(lm) {
      const horiz = dist2d(lm[61], lm[291]);
      const vert  = dist2d(lm[12], lm[15]);
      return horiz > 0 ? vert / horiz : 0;
    }

    // ── Head pose ─────────────────────────────────────────────────────────────
    function extractHeadPose(matrix) {
      const m = matrix.data;
      const pitch = Math.asin(-m[6]) * (180 / Math.PI);
      const yaw   = Math.atan2(m[2], m[10]) * (180 / Math.PI);
      const roll  = Math.atan2(m[1], m[5]) * (180 / Math.PI);
      return { pitch, yaw, roll };
    }

    // ── Alert state (audio handled by RN side via expo-av) ───────────────────
    // ALERT_START / ALERT_STOP messages are received from RN but audio is
    // played natively so it works in silent mode and at full system volume.

    // ── Frame loop ────────────────────────────────────────────────────────────
    let faceLandmarker = null;
    let running        = false;
    let lastFrameTs    = 0;
    const FRAME_INTERVAL_MS = 66; // ~15 fps

    function processFrame() {
      if (!running) return;

      const now = performance.now();
      if (now - lastFrameTs < FRAME_INTERVAL_MS) {
        requestAnimationFrame(processFrame);
        return;
      }
      lastFrameTs = now;

      if (video.readyState < 2) {
        requestAnimationFrame(processFrame);
        return;
      }

      try {
        const result = faceLandmarker.detectForVideo(video, now);
        const lm = result.faceLandmarks?.[0];

        if (!lm) {
          post({ type: "FRAME", faceDetected: false, timestamp: Date.now() });
          requestAnimationFrame(processFrame);
          return;
        }

        const leftEAR  = computeEAR(lm, LEFT_EYE);
        const rightEAR = computeEAR(lm, RIGHT_EYE);
        const avgEAR   = (leftEAR + rightEAR) / 2;
        const mar      = computeMAR(lm);
        const matrix   = result.facialTransformationMatrixes?.[0];
        const pose     = matrix ? extractHeadPose(matrix) : { pitch: 0, yaw: 0 };

        post({
          type: "FRAME",
          faceDetected: true,
          timestamp: Date.now(),
          ear: {
            left:  Math.round(leftEAR  * 1000) / 1000,
            right: Math.round(rightEAR * 1000) / 1000,
            avg:   Math.round(avgEAR   * 1000) / 1000,
          },
          headPose: {
            pitch: Math.round(pose.pitch * 10) / 10,
            yaw:   Math.round(pose.yaw   * 10) / 10,
          },
          mar: Math.round(mar * 1000) / 1000,
        });
      } catch (e) {
        // Skip frame on error — don't crash the loop
      }

      requestAnimationFrame(processFrame);
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    async function init() {
      try {
        overlay.textContent = "Loading MediaPipe...";
        post({ type: "STATUS", message: "Loading MediaPipe WASM (~10 MB, one-time download)..." });

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );

        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.6,
          minFacePresenceConfidence: 0.6,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        });

        overlay.textContent = "Requesting camera...";
        post({ type: "STATUS", message: "Requesting camera..." });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width:  { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        video.srcObject = stream;
        await new Promise((resolve) => { video.onloadedmetadata = resolve; });
        await video.play();

        overlay.textContent = "Running";
        post({ type: "LOADED" });

        running = true;
        requestAnimationFrame(processFrame);
      } catch (err) {
        overlay.textContent = "Error: " + err.message;
        post({ type: "ERROR", message: err.message });
      }
    }

    // ── Messages from RN ──────────────────────────────────────────────────────
    // Reserved for future visual feedback (overlay colour changes etc.)
    // Audio is handled entirely on the RN side via expo-av.
    function handleMsg(e) { /* no-op for now */ }
    document.addEventListener("message", handleMsg);
    window.addEventListener("message", handleMsg);

    init();
  </script>
</body>
</html>`;
