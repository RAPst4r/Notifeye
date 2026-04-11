import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// ── PASTE YOUR HUGGING FACE TOKEN HERE ────────────────────────────────────────
const HF_TOKEN = 'YOUR_HF_TOKEN';
const HF_MODEL = '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';
// ─────────────────────────────────────────────────────────────────────────────

const FACE_BOX_WIDTH  = width * 0.72;
const FACE_BOX_HEIGHT = height * 0.38;
const FACE_BOX_TOP    = height * 0.08;
const FACE_BOX_LEFT   = (width - FACE_BOX_WIDTH) / 2;

// Consecutive CLOSED readings before triggering drowsy alert
const DROWSY_THRESHOLD = 2;
const POLL_INTERVAL    = 2000;

// ── Notifeye Eye Logo ─────────────────────────────────────────────────────────
function NotifeyeLogo({ size = 30 }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size * 1.8, height: size }}>
      <View style={{
        width: size * 1.8, height: size, borderRadius: size / 2,
        borderWidth: 2.5, borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <View style={{
          width: size * 0.52, height: size * 0.52, borderRadius: size * 0.26,
          backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        }}>
          <View style={{ width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11, backgroundColor: '#000' }} />
        </View>
        <View style={{
          position: 'absolute', top: size * 0.08, right: size * 0.22,
          width: size * 0.18, height: size * 0.18,
          borderRadius: size * 0.09, backgroundColor: '#FF3B5C',
        }} />
      </View>
    </View>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'DROWSY') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [status]);

  const configs = {
    AWAKE:    { color: '#00E57A', label: '👁  AWAKE',    bg: 'rgba(0,229,122,0.15)' },
    DROWSY:   { color: '#FF3B5C', label: '😴  DROWSY',   bg: 'rgba(255,59,92,0.18)'  },
    SCANNING: { color: '#FFD60A', label: '⬤  SCANNING', bg: 'rgba(255,214,10,0.12)' },
    WAITING:  { color: '#888',    label: '○  WAITING',   bg: 'rgba(255,255,255,0.08)'},
  };

  const cfg = configs[status] || configs.WAITING;

  return (
    <Animated.View style={[styles.badge, { borderColor: cfg.color, backgroundColor: cfg.bg, transform: [{ scale: pulseAnim }] }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </Animated.View>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef    = useRef(null);
  const pollingRef   = useRef(null);
  const closedCountRef = useRef(0);

  const [eyeStatus,  setEyeStatus]  = useState('WAITING');
  const [confidence, setConfidence] = useState(null);
  const [isPolling,  setIsPolling]  = useState(false);

  const uiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(uiAnim, { toValue: 1, duration: 700, delay: 300, useNativeDriver: true }).start();
    return () => stopPolling();
  }, []);

  // ── Snap frame → HF API ───────────────────────────────────────────────────
  const analyzeFrame = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: true,
        skipProcessing: true,
      });
      if (!photo?.base64) return;

      setEyeStatus('SCANNING');

      const byteCharacters = atob(photo.base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'image/jpeg' },
          body: blob,
        }
      );

      if (!response.ok) {
        console.log('HF status:', response.status, '— model may be loading, retrying...');
        setEyeStatus('WAITING');
        return;
      }

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) return;

      const top      = results.reduce((a, b) => (a.score > b.score ? a : b));
      const isClosed = top.label.toLowerCase().includes('closed');
      const conf     = Math.round(top.score * 100);

      setConfidence(conf);

      if (isClosed) {
        closedCountRef.current += 1;
        if (closedCountRef.current >= DROWSY_THRESHOLD) {
          setEyeStatus('DROWSY');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          closedCountRef.current = 0;
        } else {
          setEyeStatus('AWAKE');
        }
      } else {
        closedCountRef.current = 0;
        setEyeStatus('AWAKE');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setEyeStatus('WAITING');
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setIsPolling(true);
    analyzeFrame();
    pollingRef.current = setInterval(analyzeFrame, POLL_INTERVAL);
  }, [analyzeFrame]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setIsPolling(false);
    setEyeStatus('WAITING');
    setConfidence(null);
    closedCountRef.current = 0;
  }, []);

  // ── Permission screen ──────────────────────────────────────────────────────
  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <StatusBar barStyle="light-content" />
        <NotifeyeLogo size={48} />
        <Text style={styles.permTitle}>Notifeye needs camera access</Text>
        <Text style={styles.permSub}>To monitor your eyes while driving</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDrowsy = eyeStatus === 'DROWSY';

  // ── Camera screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-screen front camera */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

      {/* Dim overlays around the face box */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />
      <View style={styles.overlayLeft} />
      <View style={styles.overlayRight} />

      {/* ── FACE BOX ── */}
      <Animated.View style={[
        styles.faceBox,
        { opacity: uiAnim, borderColor: isDrowsy ? '#FF3B5C' : eyeStatus === 'AWAKE' ? '#00E57A' : 'rgba(255,255,255,0.55)' }
      ]}>
        {/* Corner brackets */}
        {[
          { top: -2,    left: -2,  borderTopWidth: 3,    borderLeftWidth: 3  },
          { top: -2,    right: -2, borderTopWidth: 3,    borderRightWidth: 3 },
          { bottom: -2, left: -2,  borderBottomWidth: 3, borderLeftWidth: 3  },
          { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((s, i) => (
          <View key={i} style={[styles.corner, s, {
            borderColor: isDrowsy ? '#FF3B5C' : eyeStatus === 'AWAKE' ? '#00E57A' : '#fff'
          }]} />
        ))}

        {isDrowsy && (
          <View style={styles.drowsyBanner}>
            <Text style={styles.drowsyText}>⚠  EYES CLOSED</Text>
          </View>
        )}
      </Animated.View>

      {/* ── TOP BAR ── */}
      <Animated.View style={[styles.topBar, { opacity: uiAnim }]}>
        <View style={{ width: 44 }} />
        <NotifeyeLogo size={30} />
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* ── STATUS ── */}
      <Animated.View style={[styles.statusArea, { opacity: uiAnim }]}>
        <StatusBadge status={eyeStatus} />
        {confidence !== null && (
          <Text style={styles.confidenceText}>{confidence}% confidence</Text>
        )}
      </Animated.View>

      {/* ── BOTTOM CONTROLS ── */}
      <Animated.View style={[styles.bottomBar, { opacity: uiAnim }]}>
        <TouchableOpacity
          style={[styles.monitorBtn, isPolling && styles.monitorBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            isPolling ? stopPolling() : startPolling();
          }}
        >
          <Text style={styles.monitorBtnText}>
            {isPolling ? '■  Stop Monitoring' : '▶  Start Monitoring'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const OVERLAY = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  overlayTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: FACE_BOX_TOP, backgroundColor: OVERLAY },
  overlayBottom: { position: 'absolute', top: FACE_BOX_TOP + FACE_BOX_HEIGHT, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY },
  overlayLeft:   { position: 'absolute', top: FACE_BOX_TOP, left: 0, width: FACE_BOX_LEFT, height: FACE_BOX_HEIGHT, backgroundColor: OVERLAY },
  overlayRight:  { position: 'absolute', top: FACE_BOX_TOP, left: FACE_BOX_LEFT + FACE_BOX_WIDTH, right: 0, height: FACE_BOX_HEIGHT, backgroundColor: OVERLAY },

  faceBox: {
    position: 'absolute',
    top: FACE_BOX_TOP, left: FACE_BOX_LEFT,
    width: FACE_BOX_WIDTH, height: FACE_BOX_HEIGHT,
    borderWidth: 1.5, borderRadius: 12,
  },
  corner: { position: 'absolute', width: 22, height: 22 },
  drowsyBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,59,92,0.88)',
    paddingVertical: 7, alignItems: 'center',
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
  },
  drowsyText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1.5 },

  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 38,
    left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

  statusArea: {
    position: 'absolute',
    top: FACE_BOX_TOP + FACE_BOX_HEIGHT + 20,
    left: 0, right: 0,
    alignItems: 'center', gap: 6,
  },
  badge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 24, borderWidth: 1.5 },
  badgeText: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  confidenceText: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500' },

  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 0, right: 0, alignItems: 'center',
  },
  monitorBtn: {
    paddingHorizontal: 36, paddingVertical: 15, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
  },
  monitorBtnActive: { backgroundColor: 'rgba(255,59,92,0.18)', borderColor: '#FF3B5C' },
  monitorBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  permissionScreen: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  permTitle:  { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  permSub:    { color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' },
  permBtn:    { marginTop: 24, backgroundColor: '#fff', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 30 },
  permBtnText:{ color: '#000', fontWeight: '700', fontSize: 16 },
});