import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

const FEATURES = [
  "Real-time eye tracking while driving",
  "PERCLOS and blink rate analysis",
  "Head pose calibration for your unique mount position",
  "All processing stays on-device",
];

function CameraIcon({ size = 52, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export default function CameraDetailScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    Camera.getCameraPermissionsAsync().then(({ status: s }) => setStatus(s));
  }, []);

  const granted = status === "granted";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Camera</Text>
        <View style={styles.topBarEnd} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Icon ── */}
        <View style={styles.iconWrap}>
          <CameraIcon size={52} color={Colors.brandBlue} />
        </View>

        <Text style={styles.title}>Camera Access</Text>
        <Text style={styles.description}>
          Eye tracking runs entirely on-device. No video is ever recorded, stored, or uploaded.
          Your camera is only active while a drive session is in progress.
        </Text>

        {/* ── Features Card ── */}
        <View style={styles.featuresCard}>
          {FEATURES.map((feature, i) => (
            <View
              key={i}
              style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureRowBorder]}
            >
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* ── Status ── */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Permission status</Text>
          <Text
            style={[
              styles.statusValue,
              { color: status === null ? Colors.textMuted : granted ? Colors.safe : Colors.alert },
            ]}
          >
            {status === null ? "Checking…" : granted ? "Granted" : "Denied"}
          </Text>
        </View>
      </ScrollView>

      {/* ── Footer Button ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => Linking.openSettings()}
          activeOpacity={0.85}
        >
          <Text style={styles.settingsBtnText}>Update Device Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CARD_BG = "#0d1e2b";

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 24 },

  // ── Header ───────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  topBarEnd:   { width: 40 },
  topBarTitle: { color: Colors.white, fontSize: 17, fontWeight: "700" },
  backArrow:   { color: Colors.white, fontSize: 22 },

  // ── Icon ─────────────────────────────────────────────────────────────────────
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.brandBlue + "18",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 24,
    marginBottom: 20,
  },

  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },

  // ── Features Card ────────────────────────────────────────────────────────────
  featuresCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#0a1520",
  },
  bullet:      { color: Colors.brandBlue, fontSize: 16, lineHeight: 20 },
  featureText: { flex: 1, color: Colors.textMuted, fontSize: 14, lineHeight: 20 },

  // ── Status Row ───────────────────────────────────────────────────────────────
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  statusLabel: { color: Colors.textMuted, fontSize: 14 },
  statusValue: { fontSize: 14, fontWeight: "600" },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  settingsBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  settingsBtnText: { color: Colors.bgPrimary, fontWeight: "700", fontSize: 16 },
});
