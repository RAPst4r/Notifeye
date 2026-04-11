// DetectionEngine — React Native component
//
// Renders a WebView running the MediaPipe face landmark pipeline.
// Owns all rolling-window trackers, composite scorer, and alert audio.
//
// AUDIO STRATEGY:
//   The beep.wav file is exactly 1.6s (1s beep + 0.6s silence).
//   Setting isLooping: true makes it repeat automatically with the correct
//   gap between beeps — no setInterval needed, no drift, no missed beeps.
//   playsInSilentModeIOS: true bypasses the iOS mute switch.
//
// ALERT STATE MACHINE:
//   DROWSY (>= 0.55) → beep loops
//   MILD   (0.30–0.55) → beep stops, recovery timer does NOT start
//   ALERT  (< 0.30)  → beep stops, 12s recovery timer starts
//   After 12s in ALERT zone → driver considered recovered, next trigger allowed

import { useRef, useCallback, useEffect } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
// react-native-volume-manager requires a dev build (native module — not available in Expo Go).
// Lazy-require so the app loads normally in Expo Go; volume boost activates automatically
// once a proper dev build is installed.
let VolumeManager = null;
try { VolumeManager = require("react-native-volume-manager").VolumeManager; } catch {}

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

const ALERT_LEVEL    = 0.30;   // truly alert — below this starts recovery timer
const RECOVERY_MS    = 12_000; // 12s in ALERT zone required before re-alerting

export default function DetectionEngine({ onSignals, onAlert, onStatus, style }) {
  const webViewRef   = useRef(null);
  const perclosRef   = useRef(new PerclosTracker());
  const sustainedRef = useRef(new SustainedClosureDetector());
  const blinkRef     = useRef(new BlinkTracker());
  const yawnRef      = useRef(new YawnTracker());

  // Alert state
  const isAlertingRef = useRef(false);
  const hadAlertRef   = useRef(false);
  const clearedAtRef  = useRef(0);

  // Audio — useAudioPlayer creates and manages the player lifecycle automatically
  const player         = useAudioPlayer(require("../../assets/beep.wav"));
  const savedVolumeRef = useRef(null);

  // ── Audio init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,        // bypass iOS mute switch
          interruptionMode:  "duckOthers",
        });
        player.loop   = true;             // loop automatically
        player.volume = 1.0;
      } catch (e) {
        console.warn("[Notifeye] Audio init failed:", e.message);
      }
    })();

    return () => {
      try { player.remove(); } catch {}
    };
  }, []);

  // ── Beep control ────────────────────────────────────────────────────────────
  async function _startBeep() {
    if (isAlertingRef.current) return;
    isAlertingRef.current = true;

    // Save current volume and slam to max — like Tile does on ring
    // (no-op in Expo Go; works automatically in a dev build)
    if (VolumeManager) {
      try {
        const current = await VolumeManager.getVolume();
        savedVolumeRef.current = current?.volume ?? 1.0;
        await VolumeManager.setVolume(1.0, { showUI: false });
      } catch (e) {
        console.warn("[Notifeye] Volume boost failed:", e.message);
      }
    }

    try { player.play(); } catch {}
  }

  async function _stopBeep() {
    if (!isAlertingRef.current) return;
    isAlertingRef.current = false;

    try { player.pause(); } catch {}

    // Restore volume
    if (VolumeManager && savedVolumeRef.current !== null) {
      try {
        await VolumeManager.setVolume(savedVolumeRef.current, { showUI: false });
      } catch (e) {
        console.warn("[Notifeye] Volume restore failed:", e.message);
      }
      savedVolumeRef.current = null;
    }
  }

  // ── Frame handler ───────────────────────────────────────────────────────────
  const handleMessage = useCallback((event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }

    if (msg.type === "STATUS") { onStatus?.(msg.message); return; }
    if (msg.type === "ERROR")  { onStatus?.("Error: " + msg.message); return; }
    if (msg.type === "LOADED") { onStatus?.("Running"); return; }
    if (msg.type !== "FRAME")  return;

    const { faceDetected, ear, headPose, mar, timestamp } = msg;
    if (!faceDetected) { onSignals?.({ faceDetected: false }); return; }

    const now = timestamp ?? Date.now();

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
      // DROWSY — start beep if allowed
      if (!isAlertingRef.current) {
        const recovered = !hadAlertRef.current ||
          (clearedAtRef.current > 0 && now - clearedAtRef.current >= RECOVERY_MS);

        if (recovered) {
          hadAlertRef.current  = true;
          clearedAtRef.current = 0;
          _startBeep();
          onAlert?.(now, composite);
        }
      }

    } else if (composite < ALERT_LEVEL) {
      // TRULY ALERT — stop beep, start recovery timer
      _stopBeep();
      if (hadAlertRef.current && clearedAtRef.current === 0) {
        clearedAtRef.current = now;
      } else if (hadAlertRef.current && now - clearedAtRef.current >= RECOVERY_MS) {
        hadAlertRef.current  = false;
        clearedAtRef.current = 0;
      }

    } else {
      // MILD (0.30–0.55) — stop beep, do NOT start timer
      _stopBeep();
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
