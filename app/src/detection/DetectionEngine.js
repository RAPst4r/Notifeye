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
//   score >= 0.55 → beep starts (if not already beeping)
//   score <  0.55 → beep stops
//   No cooldown, no gap — re-triggers immediately on next crossing

import { useRef, useCallback, useEffect } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
// react-native-volume-manager requires a dev build (not available in Expo Go).
// Lazy-require so the app loads in Expo Go; volume boost works in dev build automatically.
let _getVolume = null;
let _setVolume = null;
try {
  const vm  = require("react-native-volume-manager");
  _getVolume = vm.getVolume;
  _setVolume = vm.setVolume;
} catch {}

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

const MEDIA_RESUME_MS = 1_000; // buffer after beep stops before other media resumes

export default function DetectionEngine({ onSignals, onAlert, onStatus, baseline, active = true, style }) {
  const webViewRef   = useRef(null);
  const perclosRef   = useRef(new PerclosTracker());
  const sustainedRef = useRef(new SustainedClosureDetector());
  const blinkRef     = useRef(new BlinkTracker());
  const yawnRef      = useRef(new YawnTracker());

  // Alert state
  const isAlertingRef    = useRef(false); // true while beep is looping
  const resumeTimeoutRef = useRef(null);  // pending player.pause() after beep stops

  // Keep a ref in sync with the active prop so the message handler (memoized)
  // always reads the latest value without needing to be re-created.
  const activeRef = useRef(active);
  activeRef.current = active;

  // Audio — useAudioPlayer creates and manages the player lifecycle automatically
  const player         = useAudioPlayer(require("../../assets/beep.wav"));
  const savedVolumeRef = useRef(null);

  // ── Audio init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,        // bypass iOS mute switch
          interruptionMode:  "doNotMix",  // pause other media (Spotify, podcasts) when beep plays
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

  // Stop beeping immediately when the caller deactivates detection (drive ended).
  useEffect(() => {
    if (!active && isAlertingRef.current) _stopBeep();
  }, [active]);

  // ── Beep control ────────────────────────────────────────────────────────────
  async function _startBeep() {
    if (isAlertingRef.current) return;
    isAlertingRef.current = true;

    // Cancel any pending player.pause() from a previous _stopBeep so a rapid
    // MILD→DROWSY crossing doesn't kill the freshly restarted beep.
    clearTimeout(resumeTimeoutRef.current);

    // Restore player volume in case _stopBeep muted it before we cancelled.
    try { player.volume = 1.0; } catch {}

    // Boost system volume to max (Tile-style) — no-op in Expo Go, works in dev build
    if (_getVolume && _setVolume) {
      try {
        const result = await _getVolume();
        savedVolumeRef.current = result?.volume ?? 1.0;
        await _setVolume(1.0, { showUI: false });
      } catch (e) {
        console.warn("[Notifeye] Volume boost failed:", e.message);
      }
    }

    try { player.play(); } catch {}
  }

  async function _stopBeep() {
    if (!isAlertingRef.current) return;
    isAlertingRef.current = false;

    // Mute immediately so user hears silence, but keep audio session active
    // for MEDIA_RESUME_MS — gives other media a clean buffer before iOS
    // releases the session. The timeout is stored so _startBeep can cancel it.
    try { player.volume = 0; } catch {}

    // Restore system volume right away (no need to wait)
    if (_setVolume && savedVolumeRef.current !== null) {
      try {
        await _setVolume(savedVolumeRef.current, { showUI: false });
      } catch (e) {
        console.warn("[Notifeye] Volume restore failed:", e.message);
      }
      savedVolumeRef.current = null;
    }

    resumeTimeoutRef.current = setTimeout(() => {
      try { player.pause(); player.volume = 1.0; } catch {}
    }, MEDIA_RESUME_MS);
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
    if (!faceDetected) {
      // Face lost — no more threshold checks will fire, so stop the beep now.
      if (isAlertingRef.current) _stopBeep();
      onSignals?.({ faceDetected: false });
      return;
    }

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
    const headPoseScore    = getHeadPoseScore(headPose, baseline);

    const composite = computeDrowsinessScore({
      sustainedClosure, perclos, headPoseScore,
      ear: ear.avg, blinkScore, yawnScore,
    });

    const contributions = getWeightedContributions({
      sustainedClosure, perclos, headPoseScore,
      ear: ear.avg, blinkScore, yawnScore,
    });

    // ── Alert state machine ─────────────────────────────────────────────────
    if (activeRef.current && composite >= ALERT_THRESHOLD) {
      if (!isAlertingRef.current) {
        _startBeep();
        onAlert?.(now, composite);
      }
    } else {
      if (isAlertingRef.current) _stopBeep();
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
