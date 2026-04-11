// DetectionEngine — React Native component
//
// Renders a WebView running the MediaPipe face landmark pipeline.
// Owns all rolling-window trackers, composite scorer, and alert audio.
//
// ALERT BEHAVIOUR:
//   - Beep starts (loops) when composite >= 0.55 and cooldown has elapsed.
//   - Beep stops when composite drops below 0.55.
//   - Recovery cooldown (12s) only starts counting when score reaches the
//     truly ALERT zone (< 0.30). Mild (0.30–0.55) is limbo — beep is off
//     but the timer hasn't started yet.
//   - expo-av plays the beep natively so it bypasses iOS silent mode.

import { useRef, useCallback, useEffect } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { Audio } from "expo-av";

import { DETECTION_HTML } from "./detectionEngineHTML";
import { PerclosTracker, SustainedClosureDetector } from "../../../model/perclos";
import { BlinkTracker } from "../../../model/blink";
import { YawnTracker } from "../../../model/mar";
import { getHeadPoseScore } from "../../../model/headPose";
import {
  computeDrowsinessScore,
  getWeightedContributions,
  ALERT_THRESHOLD,
} from "../../../model/scorer";

const ALERT_LEVEL       = 0.30;   // truly alert — below this starts the recovery timer
const RECOVERY_MS       = 12_000; // 12s below ALERT_LEVEL required before re-alerting
const BEEP_INTERVAL_MS  = 1600;   // gap between repeating beeps while drowsy

export default function DetectionEngine({ onSignals, onAlert, onStatus, style }) {
  const webViewRef     = useRef(null);
  const perclosRef     = useRef(new PerclosTracker());
  const sustainedRef   = useRef(new SustainedClosureDetector());
  const blinkRef       = useRef(new BlinkTracker());
  const yawnRef        = useRef(new YawnTracker());

  // Alert state machine refs
  const isAlertingRef  = useRef(false); // true while beep is looping
  const hadAlertRef    = useRef(false); // true after first alert until fully recovered
  const clearedAtRef   = useRef(0);     // timestamp when score first dropped to < ALERT_LEVEL

  // Audio refs
  const soundRef       = useRef(null);
  const beepTimerRef   = useRef(null);

  // ── Audio setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function setupAudio() {
      try {
        // playsInSilentModeIOS: true → bypasses the mute/silent switch
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS:      true,
          staysActiveInBackground:   false,
          shouldDuckAndroid:         false,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/beep.wav"),
          { shouldPlay: false, volume: 1.0 }
        );

        if (mounted) soundRef.current = sound;
      } catch (e) {
        console.warn("Audio setup failed:", e.message);
      }
    }

    setupAudio();

    return () => {
      mounted = false;
      stopBeep();
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ── Beep helpers ─────────────────────────────────────────────────────────────
  async function playBeepOnce() {
    try {
      const sound = soundRef.current;
      if (!sound) return;
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {}
  }

  function startBeep() {
    if (isAlertingRef.current) return;
    isAlertingRef.current = true;
    playBeepOnce();
    beepTimerRef.current = setInterval(playBeepOnce, BEEP_INTERVAL_MS);
  }

  function stopBeep() {
    if (!isAlertingRef.current) return;
    isAlertingRef.current = false;
    clearInterval(beepTimerRef.current);
    beepTimerRef.current = null;
    soundRef.current?.stopAsync().catch(() => {});
  }

  // ── Frame handler ─────────────────────────────────────────────────────────
  const handleMessage = useCallback((event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (msg.type === "STATUS") { onStatus?.(msg.message); return; }
    if (msg.type === "ERROR")  { onStatus?.("Error: " + msg.message); return; }
    if (msg.type === "LOADED") { onStatus?.("Running"); return; }
    if (msg.type !== "FRAME")  return;

    const { faceDetected, ear, headPose, mar, timestamp } = msg;

    if (!faceDetected) {
      onSignals?.({ faceDetected: false });
      return;
    }

    const now = timestamp ?? Date.now();

    // Update trackers
    perclosRef.current.update(ear.avg);
    sustainedRef.current.update(ear.avg);
    blinkRef.current.update(ear.avg, now);
    yawnRef.current.update(mar, now);

    const perclos          = perclosRef.current.getPerclos();
    const sustainedClosure = sustainedRef.current.getScore();
    const blinkRate        = blinkRef.current.getBlinkRate();
    const avgBlinkMs       = blinkRef.current.getAvgDurationMs();
    const blinkScore       = blinkRef.current.getBlinkScore();
    const heavyBlinkScore  = blinkRef.current.getHeavyBlinkScore();
    const rapidBlinkScore  = blinkRef.current.getRapidBlinkScore();
    const yawnScore        = yawnRef.current.getYawnScore();
    const yawnCount        = yawnRef.current.yawnCount;
    const headPoseScore    = getHeadPoseScore(headPose);

    const composite = computeDrowsinessScore({
      sustainedClosure, perclos, headPoseScore,
      ear: ear.avg, blinkScore, yawnScore,
    });

    const contributions = getWeightedContributions({
      sustainedClosure, perclos, headPoseScore,
      ear: ear.avg, blinkScore, yawnScore,
    });

    // ── Alert state machine ─────────────────────────────────────────────────
    if (composite >= ALERT_THRESHOLD) {
      // ── DROWSY zone ─────────────────────────────────────────────────────
      if (!isAlertingRef.current) {
        const canAlert = !hadAlertRef.current ||                               // first-ever alert
          (clearedAtRef.current > 0 && now - clearedAtRef.current >= RECOVERY_MS); // recovered

        if (canAlert) {
          hadAlertRef.current   = true;
          clearedAtRef.current  = 0;
          startBeep();
          onAlert?.(now, composite);
        }
      }
      // If already alerting: beep is already looping — nothing to do.
      // Don't reset clearedAtRef here — it's used by the check above.

    } else if (composite < ALERT_LEVEL) {
      // ── TRULY ALERT zone ─────────────────────────────────────────────────
      if (isAlertingRef.current) stopBeep();

      if (hadAlertRef.current) {
        if (clearedAtRef.current === 0) {
          clearedAtRef.current = now; // start recovery timer
        } else if (now - clearedAtRef.current >= RECOVERY_MS) {
          // Fully recovered — ready to alert again
          hadAlertRef.current  = false;
          clearedAtRef.current = 0;
        }
      }

    } else {
      // ── MILD zone (0.30–0.55) ─────────────────────────────────────────────
      // Beep stops but recovery timer does NOT start.
      if (isAlertingRef.current) stopBeep();
      // clearedAtRef stays 0 — limbo until they reach truly alert.
    }

    onSignals?.({
      faceDetected: true,
      ear, headPose, mar,
      perclos, sustainedClosure,
      blinkRate, avgBlinkMs, blinkScore,
      heavyBlinkScore, rapidBlinkScore,
      yawnScore, yawnCount,
      headPoseScore, composite, contributions,
    });
  }, [onSignals, onAlert, onStatus]);

  return (
    <WebView
      ref={webViewRef}
      style={[styles.webview, style]}
      source={{ html: DETECTION_HTML, baseUrl: "https://localhost/" }}
      originWhitelist={["*"]}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="prompt"
      onPermissionRequest={(e) => e.nativeEvent.request.grant(e.nativeEvent.request.resources)}
      onMessage={handleMessage}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#000" },
});
