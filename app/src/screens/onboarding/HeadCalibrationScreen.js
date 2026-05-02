import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import {
  saveHeadPoseBaseline,
  completeOnboarding,
} from "../../firebase/firestoreService";

const { width: W, height: H } = Dimensions.get("window");

// ── Calibration WebView HTML ───────────────────────────────────────────────────

const CALIBRATION_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #030B11; overflow: hidden; }
    #video {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }
    #canvas {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <video id="video" autoplay muted playsinline></video>
  <canvas id="canvas"></canvas>

  <script type="module">
    import { FaceLandmarker, FilesetResolver }
      from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs";

    const video  = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx    = canvas.getContext("2d");

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // ── Constants ─────────────────────────────────────────────────────────────
    const COLLECT_MS      = 3000;
    const SCAN_PERIOD_MS  = 1200;
    const FACE_TIMEOUT_MS = 1000;
    const FRAME_INTERVAL  = 66; // ~15 fps
    const RIPPLE_DURATION = 1200;

    // ── RN bridge ─────────────────────────────────────────────────────────────
    function post(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    // ── Math helpers ──────────────────────────────────────────────────────────
    function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
    function avg(arr)    { return arr.reduce((s, v) => s + v, 0) / arr.length; }

    function extractHeadPose(matrix) {
      const m = matrix.data;
      return {
        pitch: Math.asin(-m[6])         * (180 / Math.PI),
        yaw:   Math.atan2(m[2],  m[10]) * (180 / Math.PI),
        roll:  Math.atan2(m[1],  m[5])  * (180 / Math.PI),
      };
    }

    // ── State ─────────────────────────────────────────────────────────────────
    let faceLandmarker = null;
    let running        = false;
    let lastFrameTs    = 0;

    let collecting     = false;
    let collectStart   = null;
    let readings       = [];
    let doneFired      = false;
    let paused         = false;

    let lastFaceTime   = Date.now();
    let faceLostPosted = false;

    let rippling       = false;
    let rippleStart    = 0;
    let rippleOX       = 0;
    let rippleOY       = 0;

    // ── Drawing ───────────────────────────────────────────────────────────────
    // CHANGE 2: landmark x is flipped (1 - lm.x) to match the CSS-mirrored video.
    // CHANGE 3: dots are larger (2.2px) and base alpha is higher for visibility.
    function drawFrame(lm, scanY, pct, now) {
      ctx.clearRect(0, 0, W, H);

      const tRipple = rippling ? Math.min(1, (now - rippleStart) / RIPPLE_DURATION) : 0;

      // 1. Dark overlay fades video to black during completion pulse
      if (rippling) {
        ctx.fillStyle = "rgba(3,11,17," + (tRipple * 0.97) + ")";
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Face mesh dots
      const meshAlpha = rippling
        ? (1 - tRipple) * 0.85
        : 0.18 + pct * 0.52;

      for (let i = 0; i < lm.length; i++) {
        // Mirror x to match scaleX(-1) on the video element
        const x  = (1 - lm[i].x) * W;
        const y  = lm[i].y * H;
        const dy = Math.abs(y - scanY);
        const boost = (!rippling && dy < 20) ? (1 - dy / 20) * 0.7 : 0;
        const alpha = Math.min(1, Math.max(0, meshAlpha + boost));
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(91,174,224," + alpha + ")";
        ctx.fill();
      }

      // 3. Scan line (collection phase only)
      if (!rippling) {
        ctx.strokeStyle = "rgba(91,174,224,0.18)";
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(W, scanY);
        ctx.stroke();
      }

      // 4. Progress arc encircling the face
      if (pct > 0 && !rippling) {
        const arcR = Math.min(W, H) * 0.4;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, arcR, -Math.PI / 2, -Math.PI / 2 + pct * 2 * Math.PI);
        ctx.strokeStyle = "rgba(91,174,224,0.55)";
        ctx.lineWidth   = 2;
        ctx.stroke();
      }

      // 5. Ripple expanding from nose tip (mirrored x to match video)
      if (rippling) {
        const maxR = Math.sqrt(
          Math.pow(Math.max(rippleOX, W - rippleOX), 2) +
          Math.pow(Math.max(rippleOY, H - rippleOY), 2)
        );
        const r     = easeOut3(tRipple) * maxR;
        const alpha = (1 - tRipple) * 0.7;
        ctx.beginPath();
        ctx.arc(rippleOX, rippleOY, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(91,174,224," + alpha + ")";
        ctx.lineWidth   = 3 * (1 - tRipple * 0.5);
        ctx.stroke();
      }
    }

    // ── Frame loop ────────────────────────────────────────────────────────────
    function processFrame() {
      if (!running) return;

      const now = performance.now();
      if (now - lastFrameTs < FRAME_INTERVAL) {
        requestAnimationFrame(processFrame);
        return;
      }
      lastFrameTs = now;

      if (video.readyState < 2) {
        requestAnimationFrame(processFrame);
        return;
      }

      const result  = faceLandmarker.detectForVideo(video, now);
      const lm      = result?.faceLandmarks?.[0];
      const matrix  = result?.facialTransformationMatrixes?.[0];
      const wallNow = Date.now();

      if (lm && matrix) {
        lastFaceTime = wallNow;

        if (faceLostPosted) {
          faceLostPosted = false;
          paused         = false;
          post({ type: "FACE_FOUND" });
        }

        const pose  = extractHeadPose(matrix);
        const scanY = ((wallNow % SCAN_PERIOD_MS) / SCAN_PERIOD_MS) * H;
        let   pct   = 0;

        if (!doneFired && !paused) {
          if (!collecting) {
            collecting   = true;
            collectStart = wallNow;
            readings     = [];
          }
          const elapsed = wallNow - collectStart;
          pct = Math.min(elapsed / COLLECT_MS, 1);
          readings.push(pose);
          post({ type: "PROGRESS", pct });

          if (pct >= 1) {
            doneFired = true;
            const baseline = {
              pitch: avg(readings.map(r => r.pitch)),
              yaw:   avg(readings.map(r => r.yaw)),
              roll:  avg(readings.map(r => r.roll)),
            };
            // Mirror ripple origin x to match video
            rippling    = true;
            rippleStart = wallNow;
            rippleOX    = (1 - lm[4].x) * W;
            rippleOY    = lm[4].y * H;
            post({ type: "DONE", baseline });
          }
        } else if (doneFired) {
          pct = 1;
        }

        drawFrame(lm, scanY, pct, wallNow);

      } else {
        ctx.clearRect(0, 0, W, H);

        if (!faceLostPosted && (wallNow - lastFaceTime) >= FACE_TIMEOUT_MS) {
          faceLostPosted = true;
          paused         = true;
          collecting     = false;
          collectStart   = null;
          readings       = [];
          post({ type: "FACE_LOST" });
        }
      }

      requestAnimationFrame(processFrame);
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );

        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode:                        "VIDEO",
          numFaces:                           1,
          minFaceDetectionConfidence:         0.6,
          minFacePresenceConfidence:          0.6,
          minTrackingConfidence:              0.5,
          outputFaceBlendshapes:              false,
          outputFacialTransformationMatrixes: true,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        video.srcObject = stream;
        await new Promise(r => { video.onloadedmetadata = r; });
        await video.play();

        running = true;
        requestAnimationFrame(processFrame);
      } catch (err) {
        post({ type: "ERROR", message: err.message });
      }
    })();
  </script>
</body>
</html>`;

// ── HeadCalibrationScreen ──────────────────────────────────────────────────────

export default function HeadCalibrationScreen({ navigation, route }) {
  const { user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const isRecalibrate = route?.params?.mode === "recalibrate";

  const webViewRef  = useRef(null);

  // CHANGE 1: "instructions" is now the initial phase.
  const [phase,      setPhase]      = useState("instructions");
  const [faceLost,   setFaceLost]   = useState(false);
  const [baseline,   setBaseline]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  // CHANGE 1: 5-second fill bar for the instructions continue button.
  const barAnim = useRef(new Animated.Value(0)).current;
  const [ready,  setReady] = useState(false);

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue:         1,
      duration:        5000,
      useNativeDriver: false, // animating width — cannot use native driver
    }).start(({ finished }) => {
      if (finished) setReady(true);
    });
  }, []);

  // ── WebView → RN message handler ────────────────────────────────────────────
  const handleMessage = useCallback((event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (msg.type === "FACE_LOST")  { setFaceLost(true);  return; }
    if (msg.type === "FACE_FOUND") { setFaceLost(false); return; }
    if (msg.type === "PROGRESS")   { return; }
    if (msg.type === "ERROR") {
      Alert.alert("Camera error", msg.message || "Could not start camera.");
      return;
    }
    if (msg.type === "DONE") {
      setFaceLost(false);
      setPhase("completing");
      persistBaseline(msg.baseline);
    }
  }, []);

  async function persistBaseline(computed) {
    setSaving(true);
    try {
      await saveHeadPoseBaseline(user.uid, computed);
      if (!isRecalibrate) {
        await completeOnboarding(user.uid);
      }
      refreshProfile({
        headPoseBaseline: computed,
        ...(!isRecalibrate && { onboardingComplete: true }),
      });
    } catch (e) {
      console.warn("[Calibration] Firestore save failed:", e.message);
    } finally {
      setSaving(false);
    }
    setBaseline(computed);
    setTimeout(() => setPhase("confirmed"), 1500);
  }

  function handleTryAgain() {
    setFaceLost(false);
    setWebViewKey((k) => k + 1);
  }

  function handleContinue() {
    if (isRecalibrate) {
      navigation.goBack();
    } else {
      navigation.navigate("Welcome");
    }
  }

  // ── Phase 0 — Instructions ───────────────────────────────────────────────────
  if (phase === "instructions") {
    const barWidth = barAnim.interpolate({
      inputRange:  [0, 1],
      outputRange: ["0%", "100%"],
    });
    const barColor = barAnim.interpolate({
      inputRange:  [0, 1],
      outputRange: ["#2a3a4a", Colors.brandBlue],
    });

    return (
      <SafeAreaView style={styles.instrSafe} edges={["top", "bottom"]}>
        <View style={styles.instrProgressWrap}>
          <OnboardingProgress step={13} />
          <Text style={styles.instrStepLabel}>Step 13 of 13</Text>
        </View>

        <View style={[styles.instrContent, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.instrBody}>
            <Text style={styles.instrHeading}>Position your phone</Text>
            <Text style={styles.instrText}>
              Before we start, get yourself set up the way you would for a real drive.
            </Text>
            <View style={styles.instrStepList}>
              <Text style={styles.instrStep}>
                {"1.  "}Sit in your car in your normal driving position.
              </Text>
              <Text style={styles.instrStep}>
                {"2.  "}Mount your phone exactly where it will live during drives — dash, windshield, vent, wherever you'll use it.
              </Text>
              <Text style={styles.instrStep}>
                {"3.  "}Look straight ahead naturally, the way you would watch the road.
              </Text>
              <Text style={styles.instrStep}>
                {"4.  "}Keep your head still. Tap Continue when you're ready and the camera will do the rest.
              </Text>
            </View>
            <Text style={styles.instrNote}>
              This takes about 3 seconds and only needs to be done once per mount position.
            </Text>
          </View>

          {/* Continue button with 5-second fill bar */}
          <TouchableOpacity
            style={[styles.instrBtn, ready && styles.instrBtnReady]}
            onPress={() => setPhase("scanning")}
            disabled={!ready}
            activeOpacity={0.85}
          >
            {!ready && (
              <Animated.View
                style={[styles.instrBtnFill, { width: barWidth, backgroundColor: barColor }]}
              />
            )}
            <Text style={styles.instrBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Phase 3 — Confirmed ──────────────────────────────────────────────────────
  if (phase === "confirmed") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <OnboardingProgress step={13} />
        <View style={[styles.confirmedInner, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          <Text style={styles.confirmedTitle}>Calibration complete</Text>
          <Text style={styles.confirmedSub}>
            Your head position has been saved as your personal baseline.
          </Text>

          {baseline && (
            <View style={styles.valuesCard}>
              <View style={styles.valueItem}>
                <Text style={styles.valueNum}>{baseline.pitch.toFixed(1)}°</Text>
                <Text style={styles.valueLabel}>Pitch</Text>
              </View>
              <View style={styles.valueDivider} />
              <View style={styles.valueItem}>
                <Text style={styles.valueNum}>{baseline.yaw.toFixed(1)}°</Text>
                <Text style={styles.valueLabel}>Yaw</Text>
              </View>
              <View style={styles.valueDivider} />
              <View style={styles.valueItem}>
                <Text style={styles.valueNum}>{baseline.roll.toFixed(1)}°</Text>
                <Text style={styles.valueLabel}>Roll</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.continueBtn, saving && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.bgPrimary} />
            ) : (
              <Text style={styles.continueBtnText}>
                {isRecalibrate ? "Done" : "Continue →"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Phases 1–2 — Camera + scanning ─────────────────────────────────────────
  return (
    <View style={styles.root}>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ html: CALIBRATION_HTML, baseUrl: "https://localhost/" }}
        style={StyleSheet.absoluteFill}
        originWhitelist={["*"]}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="prompt"
        onPermissionRequest={(e) =>
          e.nativeEvent.request.grant(e.nativeEvent.request.resources)
        }
        onMessage={handleMessage}
        scrollEnabled={false}
      />

      {/* Top overlay: progress bar + step label */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}
        pointerEvents="none"
      >
        <View style={styles.progressWrap}>
          <OnboardingProgress step={13} />
        </View>
        <Text style={styles.stepLabel}>Step 13 of 13</Text>
      </View>

      {/* Bottom overlay: instruction text */}
      <View
        style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 24 }]}
        pointerEvents="none"
      >
        <Text style={styles.instruction}>Look straight ahead and hold still</Text>
      </View>

      {/* Face-lost overlay */}
      {faceLost && (
        <View style={styles.faceLostOverlay}>
          <Text style={styles.faceLostText}>
            Face not detected — make sure you're in good lighting and your face
            is fully visible
          </Text>
          <TouchableOpacity
            style={styles.tryAgainBtn}
            onPress={handleTryAgain}
            activeOpacity={0.85}
          >
            <Text style={styles.tryAgainText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Instructions (phase 0) ────────────────────────────────────────────────
  instrSafe: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  instrProgressWrap: { marginBottom: 8 },
  instrStepLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 0,
  },
  instrContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 32,
  },
  instrBody: { flex: 1 },
  instrHeading: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 18,
    lineHeight: 34,
  },
  instrText: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  instrStepList: { marginBottom: 28 },
  instrStep: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  instrNote: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
  },

  // ── Instructions continue button ──────────────────────────────────────────
  instrBtn: {
    backgroundColor: "#1a2a3a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    marginTop: 24,
  },
  instrBtnReady: {
    backgroundColor: Colors.brandBlue,
  },
  instrBtnFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
  },
  instrBtnText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 16,
  },

  // ── Root (camera phases) ──────────────────────────────────────────────────
  root: { flex: 1, backgroundColor: "#030B11" },

  // ── Top overlay ───────────────────────────────────────────────────────────
  topOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  progressWrap: { marginBottom: 4 },
  stepLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // ── Bottom overlay ────────────────────────────────────────────────────────
  bottomOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    alignItems: "center",
    paddingHorizontal: 32,
    zIndex: 10,
  },
  instruction: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // ── Face-lost overlay ─────────────────────────────────────────────────────
  faceLostOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,11,17,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    zIndex: 20,
  },
  faceLostText: {
    color: Colors.white,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  tryAgainBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  tryAgainText: {
    color: Colors.bgPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Confirmed (phase 3) ───────────────────────────────────────────────────
  safe: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  confirmedInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 2,
    borderColor: Colors.brandBlue + "66",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  checkmark:      { color: Colors.brandBlue, fontSize: 36, fontWeight: "700" },
  confirmedTitle: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmedSub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  valuesCard: {
    flexDirection: "row",
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 28,
    marginBottom: 40,
    alignItems: "center",
  },
  valueItem:   { flex: 1, alignItems: "center" },
  valueNum:    { color: Colors.brandBlue, fontSize: 20, fontWeight: "700", marginBottom: 4 },
  valueLabel:  { color: Colors.textMuted, fontSize: 11, letterSpacing: 0.5 },
  valueDivider: { width: 1, height: 36, backgroundColor: "#1a2a3a" },

  continueBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
