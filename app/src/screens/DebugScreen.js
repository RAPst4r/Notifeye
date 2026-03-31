// Phase 1 — Developer Debug Screen
//
// This is the only UI in Phase 1. Every signal value updates in real time
// directly from the camera. Use this screen to tune detection before
// building any other app UI.
//
// Do not replace this with a polished UI until detection accuracy
// is confirmed on a real physical device.

import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import DetectionEngine from "../detection/DetectionEngine";
import { ALERT_THRESHOLD } from "../../../model/scorer";

const MAX_ALERT_LOG = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n, decimals = 3) {
  if (n == null) return "--";
  return n.toFixed(decimals);
}

function pct(n) {
  if (n == null) return "--";
  return (n * 100).toFixed(1) + "%";
}

function scoreColor(score) {
  if (score == null) return C.muted;
  if (score >= 0.75) return C.critical;
  if (score >= ALERT_THRESHOLD) return C.drowsy;
  if (score >= 0.30) return C.mild;
  return C.alert;
}

function earColor(ear) {
  if (ear == null) return C.muted;
  if (ear < 0.15) return C.critical;
  if (ear < 0.20) return C.drowsy;
  if (ear < 0.25) return C.mild;
  return C.alert;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, unit = "", color }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color } : null]}>
        {value}{unit ? <Text style={styles.rowUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ScoreBar({ score }) {
  const pctFill = Math.min(score ?? 0, 1) * 100;
  const thresholdPct = ALERT_THRESHOLD * 100;
  return (
    <View style={styles.scoreBarContainer}>
      <View style={[styles.scoreBarFill, { width: pctFill + "%", backgroundColor: scoreColor(score) }]} />
      <View style={[styles.scoreBarThreshold, { left: thresholdPct + "%" }]} />
    </View>
  );
}

function ContribBar({ label, value, max = 0.45 }) {
  const pctFill = Math.min((value ?? 0) / max, 1) * 100;
  return (
    <View style={styles.contribRow}>
      <Text style={styles.contribLabel}>{label}</Text>
      <View style={styles.contribBarTrack}>
        <View style={[styles.contribBarFill, { width: pctFill + "%" }]} />
      </View>
      <Text style={styles.contribValue}>{fmt(value, 3)}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DebugScreen() {
  const [signals, setSignals]   = useState(null);
  const [alertLog, setAlertLog] = useState([]);
  const [status, setStatus]     = useState("Initializing...");

  const handleSignals = useCallback((s) => setSignals(s), []);
  const handleAlert   = useCallback((ts, score) => {
    setAlertLog((prev) => [{ ts, score }, ...prev].slice(0, MAX_ALERT_LOG));
  }, []);

  const s = signals;
  const noFace = !s || !s.faceDetected;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* Camera preview via WebView */}
      <View style={styles.cameraContainer}>
        <DetectionEngine
          style={StyleSheet.absoluteFill}
          onSignals={handleSignals}
          onAlert={handleAlert}
          onStatus={setStatus}
        />
        {/* Status overlay */}
        <View style={styles.statusBadge} pointerEvents="none">
          <View style={[styles.statusDot, { backgroundColor: noFace ? C.mild : C.alert }]} />
          <Text style={styles.statusText}>
            {noFace ? (status === "Running" ? "No face" : status) : "Face detected"}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.dataPanel} contentContainerStyle={styles.dataPanelContent}>

        {/* ── Composite score ── */}
        <SectionHeader title="COMPOSITE DROWSINESS SCORE" />
        <View style={styles.compositeRow}>
          <Text style={[styles.compositeScore, { color: scoreColor(s?.composite) }]}>
            {fmt(s?.composite, 3)}
          </Text>
          <Text style={styles.compositeThreshold}>threshold 0.550</Text>
        </View>
        <ScoreBar score={s?.composite} />
        <Row
          label="Level"
          value={
            s?.composite == null ? "--"
            : s.composite >= 0.75 ? "CRITICAL"
            : s.composite >= ALERT_THRESHOLD ? "DROWSY — alert firing"
            : s.composite >= 0.30 ? "Mild"
            : "Alert"
          }
          color={scoreColor(s?.composite)}
        />

        {/* ── EAR ── */}
        <SectionHeader title="EAR  (Eye Aspect Ratio)" />
        <Row label="Left"    value={fmt(s?.ear?.left)}  color={earColor(s?.ear?.left)} />
        <Row label="Right"   value={fmt(s?.ear?.right)} color={earColor(s?.ear?.right)} />
        <Row label="Average" value={fmt(s?.ear?.avg)}   color={earColor(s?.ear?.avg)} />

        {/* ── PERCLOS ── */}
        <SectionHeader title="PERCLOS  (rolling 60 s)" />
        <Row
          label="Value"
          value={pct(s?.perclos)}
          color={
            s?.perclos == null ? C.muted
            : s.perclos > 0.15 ? C.drowsy
            : s.perclos > 0.08 ? C.mild
            : C.alert
          }
        />

        {/* ── Head pose ── */}
        <SectionHeader title="HEAD POSE" />
        <Row
          label="Pitch"
          value={fmt(s?.headPose?.pitch, 1)}
          unit="°"
          color={s?.headPose?.pitch > 15 ? C.drowsy : C.alert}
        />
        <Row
          label="Yaw"
          value={fmt(s?.headPose?.yaw, 1)}
          unit="°"
          color={Math.abs(s?.headPose?.yaw ?? 0) > 30 ? C.mild : C.alert}
        />

        {/* ── Blink ── */}
        <SectionHeader title="BLINK" />
        <Row
          label="Rate"
          value={s?.blinkRate ?? "--"}
          unit="/ min"
          color={s?.blinkRate != null && s.blinkRate < 10 ? C.drowsy : C.alert}
        />
        <Row
          label="Avg duration"
          value={s?.avgBlinkMs ? Math.round(s.avgBlinkMs) : "--"}
          unit="ms"
          color={s?.avgBlinkMs > 250 ? C.drowsy : C.alert}
        />

        {/* ── Yawn ── */}
        <SectionHeader title="YAWN  (MAR)" />
        <Row label="MAR"         value={fmt(s?.mar)} />
        <Row label="Yawn count"  value={s?.yawnCount ?? "--"} unit="session" />
        <Row label="Yawn score"  value={fmt(s?.yawnScore)} />

        {/* ── Weighted contributions ── */}
        <SectionHeader title="WEIGHTED CONTRIBUTIONS" />
        <ContribBar label="perclos " value={s?.contributions?.perclos}  max={0.45} />
        <ContribBar label="headPose" value={s?.contributions?.headPose} max={0.25} />
        <ContribBar label="ear     " value={s?.contributions?.ear}      max={0.18} />
        <ContribBar label="blink   " value={s?.contributions?.blink}    max={0.08} />
        <ContribBar label="yawn    " value={s?.contributions?.yawn}     max={0.04} />

        {/* ── Alert log ── */}
        <SectionHeader title={`ALERT LOG  (last ${MAX_ALERT_LOG})`} />
        {alertLog.length === 0
          ? <Text style={styles.noAlerts}>No alerts this session</Text>
          : alertLog.map((a, i) => (
              <View key={i} style={styles.alertLogRow}>
                <Text style={styles.alertLogTime}>{formatTime(a.ts)}</Text>
                <Text style={styles.alertLogScore}>score {fmt(a.score, 3)}</Text>
              </View>
            ))
        }

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  bg:       "#0a0a0a",
  surface:  "#141414",
  border:   "#222",
  muted:    "#555",
  text:     "#eee",
  label:    "#777",
  alert:    "#4caf50",  // green  — good
  mild:     "#ff9800",  // orange — mild
  drowsy:   "#f44336",  // red    — drowsy
  critical: "#ff00ff",  // magenta — critical
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  cameraContainer: {
    height: "32%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  statusBadge: {
    position: "absolute",
    bottom: 8,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    color: "#ddd",
    fontFamily: "monospace",
    fontSize: 11,
  },

  // Data panel
  dataPanel: {
    flex: 1,
  },
  dataPanelContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  sectionHeader: {
    color: C.label,
    fontFamily: "monospace",
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 4,
    textTransform: "uppercase",
  },

  // Signal rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  rowLabel: {
    color: C.label,
    fontFamily: "monospace",
    fontSize: 12,
  },
  rowValue: {
    color: C.text,
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "600",
  },
  rowUnit: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "400",
  },

  // Composite score
  compositeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  compositeScore: {
    fontFamily: "monospace",
    fontSize: 36,
    fontWeight: "700",
    marginRight: 10,
  },
  compositeThreshold: {
    color: C.muted,
    fontFamily: "monospace",
    fontSize: 11,
  },
  scoreBarContainer: {
    height: 10,
    backgroundColor: C.surface,
    borderRadius: 5,
    marginBottom: 6,
    overflow: "hidden",
    position: "relative",
  },
  scoreBarFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 5,
  },
  scoreBarThreshold: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#fff4",
  },

  // Weighted contributions
  contribRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  contribLabel: {
    color: C.label,
    fontFamily: "monospace",
    fontSize: 11,
    width: 70,
  },
  contribBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: C.surface,
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  contribBarFill: {
    height: "100%",
    backgroundColor: "#5c9eff",
    borderRadius: 3,
  },
  contribValue: {
    color: C.muted,
    fontFamily: "monospace",
    fontSize: 11,
    width: 40,
    textAlign: "right",
  },

  // Alert log
  alertLogRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  alertLogTime: {
    color: C.drowsy,
    fontFamily: "monospace",
    fontSize: 12,
  },
  alertLogScore: {
    color: C.muted,
    fontFamily: "monospace",
    fontSize: 12,
  },
  noAlerts: {
    color: C.muted,
    fontFamily: "monospace",
    fontSize: 12,
    paddingVertical: 6,
  },

  bottomPad: { height: 30 },
});
