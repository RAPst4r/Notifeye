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

const ALERT_COOLDOWN_MS = 5000; // minimum gap between alerts

export default function DetectionEngine({ onSignals, onAlert, onStatus, style }) {
  const webViewRef    = useRef(null);
  const perclosRef    = useRef(new PerclosTracker());
  const sustainedRef  = useRef(new SustainedClosureDetector());
  const blinkRef      = useRef(new BlinkTracker());
  const yawnRef       = useRef(new YawnTracker());
  const lastAlertTs   = useRef(0);

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

    // Fire alert when composite crosses threshold (with cooldown)
    if (composite >= ALERT_THRESHOLD && now - lastAlertTs.current > ALERT_COOLDOWN_MS) {
      lastAlertTs.current = now;
      webViewRef.current?.injectJavaScript(
        'document.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "ALERT" }) })); true;'
      );
      onAlert?.(now, composite);
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
