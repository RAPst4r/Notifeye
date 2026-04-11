// DetectionEngine — React Native component
//
// Renders a WebView that runs the MediaPipe face landmark pipeline.
// For each frame the WebView posts raw signals (EAR, head pose, MAR).
// This component owns the rolling-window trackers and composite scorer,
// then calls onSignals() with the full signal state every frame.

import { useRef, useCallback } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

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

// How long score must stay below threshold before another alert can fire.
// Starts counting from the moment the score drops below the threshold —
// gives the driver 12 seconds of genuine recovery before re-alerting.
const RECOVERY_COOLDOWN_MS = 12_000;

export default function DetectionEngine({ onSignals, onAlert, onStatus, style }) {
  const webViewRef      = useRef(null);
  const perclosRef      = useRef(new PerclosTracker());
  const sustainedRef    = useRef(new SustainedClosureDetector());
  const blinkRef        = useRef(new BlinkTracker());
  const yawnRef         = useRef(new YawnTracker());
  const isAlertingRef   = useRef(false); // true while score >= threshold
  const recoveredAtRef  = useRef(0);     // timestamp when score last dropped below threshold

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

    // Update all rolling-window trackers
    perclosRef.current.update(ear.avg);
    sustainedRef.current.update(ear.avg);
    blinkRef.current.update(ear.avg, now);
    yawnRef.current.update(mar, now);

    const perclos            = perclosRef.current.getPerclos();
    const sustainedClosure   = sustainedRef.current.getScore();
    const blinkRate          = blinkRef.current.getBlinkRate();
    const avgBlinkMs         = blinkRef.current.getAvgDurationMs();
    const blinkScore         = blinkRef.current.getBlinkScore();
    const heavyBlinkScore    = blinkRef.current.getHeavyBlinkScore();
    const rapidBlinkScore    = blinkRef.current.getRapidBlinkScore();
    const yawnScore          = yawnRef.current.getYawnScore();
    const yawnCount          = yawnRef.current.yawnCount;
    const headPoseScore      = getHeadPoseScore(headPose);

    const composite = computeDrowsinessScore({
      sustainedClosure,
      perclos,
      headPoseScore,
      ear: ear.avg,
      blinkScore,
      yawnScore,
    });

    const contributions = getWeightedContributions({
      sustainedClosure,
      perclos,
      headPoseScore,
      ear: ear.avg,
      blinkScore,
      yawnScore,
    });

    // ── Alert state machine ───────────────────────────────────────────────────
    const wasAlerting = isAlertingRef.current;

    if (composite >= ALERT_THRESHOLD) {
      // Score is above threshold
      if (!wasAlerting) {
        // Transition: recovered → alerting
        // Only fire if the driver had >= RECOVERY_COOLDOWN_MS of recovery time
        const recoveryMs = recoveredAtRef.current > 0
          ? now - recoveredAtRef.current
          : Infinity; // first ever alert — always allow

        if (recoveryMs >= RECOVERY_COOLDOWN_MS) {
          isAlertingRef.current = true;
          recoveredAtRef.current = 0;
          webViewRef.current?.injectJavaScript(
            'document.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "ALERT_START" }) })); true;'
          );
          onAlert?.(now, composite);
        }
        // If not enough recovery time: don't start alerting yet
      }
      // If already alerting: beep is already looping — nothing to do
    } else {
      // Score is below threshold
      if (wasAlerting) {
        // Transition: alerting → recovered — stop the beep, start cooldown timer
        isAlertingRef.current = false;
        recoveredAtRef.current = now;
        webViewRef.current?.injectJavaScript(
          'document.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "ALERT_STOP" }) })); true;'
        );
      }
    }

    onSignals?.({
      faceDetected: true,
      ear,
      headPose,
      mar,
      perclos,
      sustainedClosure,
      blinkRate,
      avgBlinkMs,
      blinkScore,
      heavyBlinkScore,
      rapidBlinkScore,
      yawnScore,
      yawnCount,
      headPoseScore,
      composite,
      contributions,
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
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
});
