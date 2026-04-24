import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

import DetectionEngine from '../detection/DetectionEngine';

const { width: W, height: H } = Dimensions.get('window');

// ── UI constants ───────────────────────────────────────────────────────────────

const UI_COLORS = {
  alert:        '#5BAEE0',
  payAttention: '#DC4646',
};

const STATE_LABELS = {
  alert:        'Alert',
  payAttention: 'DROWSY',
};

const STATE_SEVERITY = { alert: 0, payAttention: 1 };

// ── Ring layout ────────────────────────────────────────────────────────────────

const RING_R    = 74;
const OX        = W / 2;
const OY        = H * 0.525;
const RING_TOP  = OY - RING_R;
const RING_LEFT = OX - RING_R;

// ── Ripple HTML — full animation lives inside the WebView JS context ────────────

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
const RING_R   = 74;
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

// ── RippleCanvas — transparent WebView running the HTML5 canvas loop ────────────

function RippleCanvas({ active, state }) {
  const webviewRef = useRef(null);
  const loadedRef  = useRef(false);

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

  useEffect(() => {
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
  const [isDriving, setIsDriving]           = useState(false);
  const [attentionState, setAttentionState] = useState('alert');
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [alertCount, setAlertCount]         = useState(0);
  const [peakState, setPeakState]           = useState('alert');
  const [showSummary, setShowSummary]       = useState(false);

  const isDrivingRef  = useRef(false);
  const driveStartRef = useRef(null);
  const timerRef      = useRef(null);
  const summaryAnim   = useRef(new Animated.Value(H)).current;
  const ringColorAnim = useRef(new Animated.Value(0)).current;

  const ringColor = ringColorAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [UI_COLORS.alert, UI_COLORS.payAttention],
  });

  function startDrive() {
    driveStartRef.current = Date.now();
    isDrivingRef.current  = true;
    ringColorAnim.setValue(0);
    setIsDriving(true);
    setElapsedMinutes(0);
    setAlertCount(0);
    setPeakState('alert');
    setAttentionState('alert');
    timerRef.current = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - driveStartRef.current) / 60000));
    }, 60000);
  }

  function endDrive() {
    clearInterval(timerRef.current);
    isDrivingRef.current = false;
    setIsDriving(false);
    setShowSummary(true);
    Animated.timing(summaryAnim, {
      toValue:         0,
      duration:        450,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function closeSummary() {
    Animated.timing(summaryAnim, {
      toValue:         H,
      duration:        450,
      easing:          Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setShowSummary(false);
      summaryAnim.setValue(H);
    });
  }

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
      toValue:         targetVal,
      duration:        500,
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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Detection engine — off-screen, camera stays active */}
      <View style={styles.hiddenEngine}>
        <DetectionEngine
          onSignals={handleSignals}
          onAlert={handleAlert}
          style={styles.engineWebView}
        />
      </View>

      {/* Layer 0 — ripple canvas (transparent WebView, touches pass through) */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="none">
        <RippleCanvas active={isDriving} state={attentionState} />
      </View>

      {/* Layer 2 — UI elements */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="box-none">

        {/* "Monitoring active" / "Drowsy detected" badge — always visible */}
        <View style={styles.badge} pointerEvents="none">
          <View style={[
            styles.badgeDot,
            { backgroundColor: isDriving ? UI_COLORS[attentionState] : 'rgba(255,255,255,0.25)' },
          ]} />
          <Text style={styles.badgeText}>
            {isDriving && attentionState === 'payAttention' ? 'Drowsy detected' : 'Monitoring active'}
          </Text>
        </View>

        {/* Drive timer — driving only */}
        {isDriving && (
          <Text style={styles.timer} pointerEvents="none">
            {formatDuration(elapsedMinutes)}
          </Text>
        )}

        {/* Center ring */}
        <Animated.View style={[
          styles.ring,
          {
            borderColor: !isDriving
              ? 'rgba(255,255,255,0.3)'
              : ringColorAnim.interpolate({
                  inputRange:  [0, 1],
                  outputRange: ['rgba(91,174,224,0.45)', 'rgba(220,70,70,0.52)'],
                }),
          },
        ]}>
          {!isDriving ? (
            <TouchableOpacity onPress={startDrive} style={styles.ringTap}>
              <Text style={styles.startText}>Start Drive</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ringInner} pointerEvents="none">
              <Text style={styles.attentionLabel}>ATTENTION LEVEL</Text>
              <Animated.Text style={[styles.attentionState, { color: ringColor }]}>
                {STATE_LABELS[attentionState]}
              </Animated.Text>
            </View>
          )}
        </Animated.View>

        {/* Tagline — idle only */}
        {!isDriving && (
          <Text style={styles.tagline} pointerEvents="none">
            Drive home safe.
          </Text>
        )}

        {/* End drive — driving only */}
        {isDriving && (
          <TouchableOpacity onPress={endDrive} style={styles.endButton}>
            <Text style={styles.endButtonText}>End drive</Text>
          </TouchableOpacity>
        )}
      </View>

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
  engineWebView: {
    flex: 1,
  },

  // ── Badge ──────────────────────────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // ── Timer ──────────────────────────────────────────────────────────────────
  timer: {
    position: 'absolute',
    top: RING_TOP - 76,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 48,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },

  // ── Ring ───────────────────────────────────────────────────────────────────
  ring: {
    position: 'absolute',
    top: RING_TOP,
    left: RING_LEFT,
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 74,
  },
  startText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  ringInner: {
    alignItems: 'center',
    gap: 5,
  },
  attentionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  attentionState: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ── Tagline ────────────────────────────────────────────────────────────────
  tagline: {
    position: 'absolute',
    top: OY + RING_R + 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.13)',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // ── End button ─────────────────────────────────────────────────────────────
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
