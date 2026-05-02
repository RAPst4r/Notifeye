import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme/colors';
import DetectionEngine from '../detection/DetectionEngine';

const { width: W, height: H } = Dimensions.get('window');

// ── Detection UI constants ─────────────────────────────────────────────────────

const UI_COLORS = {
  alert: '#5BAEE0',
  payAttention: '#DC4646',
};

const STATE_LABELS = {
  alert: 'Alert',
  payAttention: 'DROWSY',
};

const STATE_SEVERITY = { alert: 0, payAttention: 1 };

// ── Ring layout ────────────────────────────────────────────────────────────────

const RING_R = 150;
const OX = W / 2;
const OY = H * 0.525;
const RING_TOP = OY - RING_R;
const RING_LEFT = OX - RING_R;

const TAB_BAR_HEIGHT = 72;

// ── Dashboard helper ───────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

// ── Ripple HTML — full animation lives inside the WebView JS context ───────────

const RIPPLE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }
  canvas { position: absolute; top: 0; left: 0; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = window.innerWidth;
const H = window.innerHeight;
canvas.width  = W * devicePixelRatio;
canvas.height = H * devicePixelRatio;
canvas.style.width  = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(devicePixelRatio, devicePixelRatio);

const SPACING  = 11;
const RING_R   = 150;
const DOT_BASE = 0.55;
const DOT_MAX  = 2.6;
const OX = W / 2;
const OY = H * 0.525;

const STATE_COLORS = {
  alert:        { r: 91,  g: 174, b: 224 },
  payAttention: { r: 220, g: 70,  b: 70  },
};

const PULSE_CONFIG = {
  alert:        { dur: 3800, interval: 3200 },
  payAttention: { dur: 1300, interval: 1300 },
};

const MAX_R = Math.sqrt(
  Math.pow(Math.max(OX, W - OX), 2) + Math.pow(Math.max(OY, H - OY), 2)
) + 22;

const DOTS = [];
const cols = Math.ceil(W / SPACING) + 1;
const rows = Math.ceil(H / SPACING) + 1;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = c * SPACING;
    const y = r * SPACING;
    const dist = Math.sqrt((x - OX) ** 2 + (y - OY) ** 2);
    if (dist >= RING_R - 2) DOTS.push({ x, y, dist });
  }
}

function easeOut3(t) { return 1 - Math.pow(1 - t, 3); }
function smoothstep(x) { return x * x * (3 - 2 * x); }
function dotInfluence(dotDist, waveR, bandW) {
  const delta    = dotDist - waveR;
  const trailLen = bandW * 1.4;
  const leadLen  = bandW * 0.5;
  if (delta < -trailLen || delta > leadLen) return 0;
  if (delta <= 0) {
    const norm = (delta + trailLen) / trailLen;
    return 0.5 - Math.cos(Math.PI * norm) * 0.5;
  } else {
    const norm = delta / leadLen;
    return 0.5 + Math.cos(Math.PI * norm) * 0.5;
  }
}

let pulses        = [];
let active        = false;
let currentState  = 'alert';
let pulseInterval = null;

function firePulse() {
  const c   = STATE_COLORS[currentState] || STATE_COLORS.alert;
  const cfg = PULSE_CONFIG[currentState] || PULSE_CONFIG.alert;
  pulses.push({ color: c, born: Date.now(), dur: cfg.dur });
}

function startRipples(state) {
  clearInterval(pulseInterval);
  pulses = [];
  currentState = state;
  firePulse();
  const cfg = PULSE_CONFIG[state] || PULSE_CONFIG.alert;
  pulseInterval = setInterval(firePulse, cfg.interval);
}

function stopRipples() {
  clearInterval(pulseInterval);
  pulses = [];
}

window.addEventListener('message', function(e) {
  try {
    const msg = JSON.parse(e.data);
    if (msg.type === 'START') { active = true;  startRipples(msg.state || 'alert'); }
    if (msg.type === 'STOP')  { active = false; stopRipples(); }
    if (msg.type === 'STATE' && active) { startRipples(msg.state); }
  } catch(err) {}
});

function drawFrame() {
  ctx.clearRect(0, 0, W, H);

  if (active) {
    const now = Date.now();
    pulses = pulses.filter(p => (now - p.born) / p.dur < 1);

    for (const dot of DOTS) {
      const ringEdgeFade = Math.min(1, (dot.dist - RING_R) / 10);
      let maxInf = 0;
      let col    = STATE_COLORS.alert;

      for (const p of pulses) {
        const t     = (now - p.born) / p.dur;
        const waveR = RING_R + (MAX_R - RING_R) * easeOut3(t);
        const bandW = Math.max(10, 70 * (1 - Math.pow(t, 0.45)));
        const envelope = smoothstep(1 - t);
        const inf   = dotInfluence(dot.dist, waveR, bandW) * envelope;
        if (inf > maxInf) { maxInf = inf; col = p.color; }
      }

      const s      = smoothstep(maxInf);
      const radius = DOT_BASE + s * (DOT_MAX - DOT_BASE);
      const alpha  = (0.10 + s * 0.68) * ringEdgeFade;
      const tint   = s * 0.4;
      const r = Math.round(255 - (255 - col.r) * tint);
      const g = Math.round(255 - (255 - col.g) * tint);
      const b = Math.round(255 - (255 - col.b) * tint);

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.fill();
    }
  }

  requestAnimationFrame(drawFrame);
}

requestAnimationFrame(drawFrame);
</script>
</body>
</html>`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreToState(score) {
  if (score < 0.55) return 'alert';
  return 'payAttention';
}

function formatDuration(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function driveStatusMessage(state) {
  if (state === 'payAttention') return 'Drowsiness detected. Consider resting before your next drive.';
  return 'Safe drive. No drowsiness detected.';
}

// ── RippleCanvas — transparent WebView running the HTML5 canvas loop ───────────

function RippleCanvas({ active, state }) {
  const webviewRef = useRef(null);
  const loadedRef = useRef(false);

  function postToWebView(msg) {
    if (!loadedRef.current) return;
    const data = JSON.stringify(msg);
    webviewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message',{data:'${data}'}));true;`
    );
  }

  function handleLoad() {
    loadedRef.current = true;
    if (active) postToWebView({ type: 'START', state });
  }

  React.useEffect(() => {
    if (active) {
      postToWebView({ type: 'START', state });
    } else {
      postToWebView({ type: 'STOP' });
    }
  }, [active, state]);

  return (
    <WebView
      ref={webviewRef}
      source={{ html: RIPPLE_HTML }}
      onLoad={handleLoad}
      style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
      scrollEnabled={false}
      pointerEvents="none"
      backgroundColor="transparent"
      originWhitelist={['*']}
      javaScriptEnabled
    />
  );
}

// ── DrivingScreen ──────────────────────────────────────────────────────────────

export default function DrivingScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const adjustedRingTop = insets.top + (H - insets.top - TAB_BAR_HEIGHT - insets.bottom) / 2 - RING_R + 5;

  // ── Dashboard data ───────────────────────────────────────────────────────────
  const headPoseBaseline = profile?.headPoseBaseline ?? null;

  const firstName = profile?.name ?? 'there';
  const streak = profile?.streak ?? 0;
  const safeMiles = profile?.safeMiles ?? 0;
  const milesNext = 50;
  const progress = Math.min(safeMiles / milesNext, 1);
  const allMembers = (profile?.circles ?? []).flatMap((c) => c.members ?? []);

  // ── Detection state ──────────────────────────────────────────────────────────
  const [isDriving, setIsDriving] = useState(false);
  const [attentionState, setAttentionState] = useState('alert');
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [peakState, setPeakState] = useState('alert');
  const [showSummary, setShowSummary] = useState(false);

  const isDrivingRef = useRef(false);
  const driveStartRef = useRef(null);
  const timerRef = useRef(null);
  const summaryAnim = useRef(new Animated.Value(H)).current;
  const ringColorAnim = useRef(new Animated.Value(0)).current;

  // 0 = dashboard visible, 1 = detection UI visible
  const transitionAnim = useRef(new Animated.Value(0)).current;

  const ringColor = ringColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [UI_COLORS.alert, UI_COLORS.payAttention],
  });

  const dashOpacity = transitionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const detectOpacity = transitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // ── Drive control ────────────────────────────────────────────────────────────

  function startDrive() {
    driveStartRef.current = Date.now();
    isDrivingRef.current = true;
    ringColorAnim.setValue(0);
    setIsDriving(true);
    setElapsedMinutes(0);
    setAlertCount(0);
    setPeakState('alert');
    setAttentionState('alert');
    timerRef.current = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - driveStartRef.current) / 60000));
    }, 60000);
    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  function endDrive() {
    clearInterval(timerRef.current);
    isDrivingRef.current = false;
    setIsDriving(false);
    transitionAnim.setValue(0);
    setShowSummary(true);
    Animated.timing(summaryAnim, {
      toValue: 0,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeSummary() {
    Animated.timing(summaryAnim, {
      toValue: H,
      duration: 450,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setShowSummary(false);
      summaryAnim.setValue(H);
    });
  }

  // ── Detection callbacks ──────────────────────────────────────────────────────

  const handleSignals = useCallback((signals) => {
    if (!isDrivingRef.current) return;
    const { composite, faceDetected } = signals;
    if (!faceDetected || composite == null) return;

    const newState = scoreToState(composite);
    setAttentionState(newState);
    setPeakState(prev =>
      STATE_SEVERITY[newState] > STATE_SEVERITY[prev] ? newState : prev,
    );

    const targetVal = newState === 'alert' ? 0 : 1;
    Animated.timing(ringColorAnim, {
      toValue: targetVal,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleAlert = useCallback(() => {
    setAlertCount(prev => prev + 1);
  }, []);

  const driveStartTimeStr = driveStartRef.current
    ? new Date(driveStartRef.current).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    })
    : '--';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Detection engine — always mounted off-screen so camera warms up */}
      <View style={styles.hiddenEngine}>
        <DetectionEngine
          onSignals={handleSignals}
          onAlert={handleAlert}
          baseline={headPoseBaseline}
          style={styles.engineWebView}
        />
      </View>

      {/* Layer 0 — ripple canvas */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="none">
        <RippleCanvas active={isDriving} state={attentionState} />
      </View>

      {/* Layer 1 — Dashboard (idle state, fades out when drive starts) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { zIndex: 1, opacity: dashOpacity }]}
        pointerEvents={isDriving ? 'none' : 'box-none'}
      >
        <SafeAreaView style={styles.dashSafe} edges={['top']}>
          <ScrollView
            style={styles.dashScroll}
            contentContainerStyle={styles.dashContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Greeting + streak badge */}
            <View style={styles.dashHeader}>
              <View>
                <Text style={styles.dashGreeting}>{getGreeting()}</Text>
                <Text style={styles.dashName}>{firstName}</Text>
              </View>
              <View style={styles.dashStreakBadge}>
                <Text style={styles.dashStreakNum}>{streak}</Text>
                <Text style={styles.dashStreakLabel}>day streak</Text>
              </View>
            </View>

            {/* Safe Miles card */}
            <View style={styles.dashCard}>
              <Text style={styles.dashMilesTitle}>Safe Miles</Text>
              <View style={styles.dashProgressTrack}>
                <View style={[styles.dashProgressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.dashMilesSub}>
                {safeMiles} mi · {milesNext - safeMiles} mi to next badge
              </Text>
            </View>

            {/* Start Drive button — blocked if user hasn't calibrated */}
            {headPoseBaseline ? (
              <TouchableOpacity style={styles.dashStartBtn} onPress={startDrive} activeOpacity={0.85}>
                <Text style={styles.dashStartIcon}>◉</Text>
                <View>
                  <Text style={styles.dashStartLabel}>Start Drive</Text>
                  <Text style={styles.dashStartSub}>Camera starts automatically</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.dashCalibrationWarning}>
                <Text style={styles.dashCalibrationTitle}>Head position not calibrated</Text>
                <Text style={styles.dashCalibrationSub}>
                  Go to Profile → Recalibrate to set up your personal baseline before driving.
                </Text>
              </View>
            )}

            {/* Your Circle */}
            <Text style={styles.dashSectionTitle}>Your Circle</Text>

            {allMembers.length === 0 ? (
              <Text style={styles.dashCircleEmpty}>
                Add people to your circle to see their status here.
              </Text>
            ) : (
              allMembers.map((m) => (
                <View key={m.id} style={styles.dashMemberRow}>
                  <View style={styles.dashMemberAvatar}>
                    <Text style={styles.dashMemberAvatarText}>{m.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.dashMemberInfo}>
                    <Text style={styles.dashMemberName}>{m.name}</Text>
                    <Text style={styles.dashMemberStats}>-- streak · -- mi · Last drive: --</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* Layer 2 — Detection UI (active state, fades in when drive starts) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { zIndex: 2, opacity: detectOpacity }]}
        pointerEvents={isDriving ? 'box-none' : 'none'}
      >
        {/* "Monitoring active" / "Drowsy detected" badge */}
        <View style={styles.badge} pointerEvents="none">
          <View style={[
            styles.badgeDot,
            { backgroundColor: UI_COLORS[attentionState] },
          ]} />
          <Text style={styles.badgeText}>
            {attentionState === 'payAttention' ? 'Drowsy detected' : 'Monitoring active'}
          </Text>
        </View>

        {/* Drive timer */}
        {isDriving && (
          <Text style={styles.timer} pointerEvents="none">
            {formatDuration(elapsedMinutes)}
          </Text>
        )}

        {/* Pulsating ring */}
        <Animated.View style={[
          styles.ring,
          { top: adjustedRingTop },
          {
            borderColor: ringColorAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(91,174,224,0.45)', 'rgba(220,70,70,0.52)'],
            }),
          },
        ]}>
          <View style={styles.ringInner} pointerEvents="none">
            <Text style={styles.attentionLabel}>ATTENTION LEVEL</Text>
            <Animated.Text style={[styles.attentionState, { color: ringColor }]}>
              {STATE_LABELS[attentionState]}
            </Animated.Text>
          </View>
        </Animated.View>

        {/* End drive */}
        {isDriving && (
          <TouchableOpacity onPress={endDrive} style={styles.endButton}>
            <Text style={styles.endButtonText}>End drive</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Layer 10 — Summary sheet */}
      {showSummary && (
        <Animated.View
          style={[styles.summarySheet, { transform: [{ translateY: summaryAnim }] }]}
        >
          <View style={styles.dragHandle} />

          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Drive summary</Text>
            <TouchableOpacity
              onPress={closeSummary}
              hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.summaryDuration}>{formatDuration(elapsedMinutes)}</Text>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{alertCount}</Text>
              <Text style={styles.statLabel}>Alerts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: UI_COLORS[peakState] }]}>
                {STATE_LABELS[peakState]}
              </Text>
              <Text style={styles.statLabel}>Peak level</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Started at</Text>
            <Text style={styles.cardValue}>{driveStartTimeStr}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardValue}>{driveStatusMessage(peakState)}</Text>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity onPress={closeSummary} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to home</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030B11',
  },

  hiddenEngine: {
    position: 'absolute',
    top: -300,
    left: 0,
    width: 320,
    height: 240,
    opacity: 0,
    zIndex: -1,
  },
  engineWebView: { flex: 1 },

  // ── Dashboard (idle layer) ─────────────────────────────────────────────────
  dashSafe: { flex: 1 },
  dashScroll: { flex: 1 },
  dashContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },

  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  dashGreeting: { color: Colors.textMuted, fontSize: 14, marginBottom: 4 },
  dashName: { color: Colors.white, fontSize: 30, fontWeight: '800' },

  dashStreakBadge: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: Colors.streakOrange,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dashStreakNum: { color: Colors.streakOrange, fontSize: 22, fontWeight: '800' },
  dashStreakLabel: { color: Colors.streakOrange, fontSize: 11, opacity: 0.85 },

  dashCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  dashMilesTitle: {
    color: Colors.brandBlue,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  dashProgressTrack: {
    height: 6,
    backgroundColor: '#1a2a3a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  dashProgressFill: {
    height: '100%',
    backgroundColor: Colors.brandBlue,
    borderRadius: 3,
  },
  dashMilesSub: { color: Colors.textMuted, fontSize: 12 },

  dashStartBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 36,
  },
  dashStartIcon: { color: '#fff', fontSize: 26 },
  dashStartLabel: { color: '#fff', fontSize: 18, fontWeight: '800' },
  dashStartSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

  dashCalibrationWarning: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 36,
    borderWidth: 1.5,
    borderColor: Colors.alert + '55',
  },
  dashCalibrationTitle: { color: Colors.alert, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  dashCalibrationSub:   { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },

  dashSectionTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  dashCircleEmpty: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },

  dashMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  dashMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#030B11',
    borderWidth: 1.5,
    borderColor: '#1a2a3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dashMemberAvatarText: { color: Colors.brandBlue, fontSize: 15, fontWeight: '700' },
  dashMemberInfo: { flex: 1 },
  dashMemberName: { color: Colors.white, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  dashMemberStats: { color: Colors.textMuted, fontSize: 12 },

  // ── Detection UI (active layer) ────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 21,
    letterSpacing: 0.3,
  },

  timer: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 48,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },

  ring: {
    position: 'absolute',
    left: RING_LEFT,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    alignItems: 'center',
    gap: 8,
  },
  attentionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
  },
  attentionState: {
    fontSize: 54,
    fontWeight: '300',
    letterSpacing: 1,
  },

  endButton: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  endButtonText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // ── Summary sheet ──────────────────────────────────────────────────────────
  summarySheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0B1820',
    zIndex: 10,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  closeBtn: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
  },
  summaryDuration: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 28,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 28,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardValue: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  backButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(91,174,224,0.4)',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#5BAEE0',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
