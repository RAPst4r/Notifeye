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

const ALERT_LEVEL       = 0.30;   // below this = truly alert, recovery timer starts
const RECOVERY_MS       = 12_000; // must stay in ALERT zone for 12s before re-alerting
const MEDIA_RESUME_MS   = 1_000;  // buffer after beep stops before other media resumes
const MIN_RETRIGGER_MS  = 3_000;  // minimum gap between beep end and next beep start

export default function DetectionEngine({ onSignals, onAlert, onStatus, style }) {
  const webViewRef   = useRef(null);
  const perclosRef   = useRef(new PerclosTracker());
  const sustainedRef = useRef(new SustainedClosureDetector());
  const blinkRef     = useRef(new BlinkTracker());
  const yawnRef      = useRef(new YawnTracker());

  // Alert state
  const isAlertingRef      = useRef(false); // true while beep is looping
  const inCooldownRef      = useRef(false); // true during 12s recovery window
  const cooldownStartRef   = useRef(0);     // timestamp when cooldown began
  const lastBeepEndRef     = useRef(0);     // timestamp when last beep stopped (for re-trigger gap)

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

  // ── Beep control ────────────────────────────────────────────────────────────
  async function _startBeep() {
    if (isAlertingRef.current) return;
    isAlertingRef.current = true;

    // Boost volume to max (Tile-style) — no-op in Expo Go, works in dev build
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
    // for MEDIA_RESUME_MS — this gives other media a clean 1s buffer before
    // iOS releases the session and allows them to resume.
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

    setTimeout(() => {
      try { player.pause(); player.volume = 1.0; } catch {}
      lastBeepEndRef.current = Date.now();
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
    //
    // DROWSY (>= 0.55): beep starts unless in 12s cooldown window
    // MILD   (0.30–0.55): beep stops — cooldown does NOT start — re-alert
    //                     fires immediately if score goes back to drowsy
    // ALERT  (< 0.30): beep stops — 12s cooldown starts here only
    //                  after 12s: cooldown clears, next drowsy re-alerts

    if (composite >= ALERT_THRESHOLD) {
      // Tick cooldown — if it's done, clear it
      if (inCooldownRef.current && now - cooldownStartRef.current >= RECOVERY_MS) {
        inCooldownRef.current    = false;
        cooldownStartRef.current = 0;
      }

      const gapOk = now - lastBeepEndRef.current >= MIN_RETRIGGER_MS;
      if (!isAlertingRef.current && !inCooldownRef.current && gapOk) {
        _startBeep();
        onAlert?.(now, composite);
      }

    } else if (composite < ALERT_LEVEL) {
      // TRULY ALERT — stop beep and start cooldown if coming off an alert
      if (isAlertingRef.current) {
        _stopBeep();
        inCooldownRef.current    = true;
        cooldownStartRef.current = now;
      } else if (inCooldownRef.current) {
        // Already in cooldown — check if it's expired
        if (now - cooldownStartRef.current >= RECOVERY_MS) {
          inCooldownRef.current    = false;
          cooldownStartRef.current = 0;
        }
      }

    } else {
      // MILD (0.30–0.55) — stop beep only, no cooldown
      // Going mild → drowsy re-alerts immediately
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
