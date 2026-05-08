import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

const BODY_COLOR = "#5a7a8e";

export default function DataSecurityScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Data Security</Text>
        <View style={styles.topBarEnd} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.sectionBody}>
            All face tracking and drowsiness detection runs entirely on-device using MediaPipe.
            No camera feed, video, or raw biometric data is ever sent to Notifeye's servers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Store</Text>
          <Text style={styles.sectionBody}>
            The only data stored in Firestore is your account info, your calibrated head pose
            baseline, your drive statistics, and your alert history — none of which contains
            imagery or raw sensor output. All Firestore data is encrypted in transit and at rest.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 56 },

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

  // ── Sections ─────────────────────────────────────────────────────────────────
  section: {
    marginBottom: 28,
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionBody: {
    color: BODY_COLOR,
    fontSize: 14,
    lineHeight: 22,
  },
});
