import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

const BODY_COLOR = "#5a7a8e";

// TODO: Replace with the real Notifeye privacy policy URL before shipping
const PRIVACY_POLICY_URL = "https://www.notifeye.com/privacy";

export default function PrivacyPolicyScreen({ navigation }) {
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
        <Text style={styles.topBarTitle}>Privacy Policy</Text>
        <View style={styles.topBarEnd} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Collect</Text>
          <Text style={styles.sectionBody}>
            Notifeye collects only what it needs to keep you safe: your account info, your
            calibrated head position, and your drive history. Your camera feed is never
            stored or transmitted. Your data is never sold.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Privacy Policy</Text>
          <Text style={styles.sectionBody}>
            For the complete details on how we handle your data, read our full Privacy Policy.
          </Text>
          <TouchableOpacity
            style={styles.linkRow}
            activeOpacity={0.7}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text style={styles.linkText}>View our full Privacy Policy →</Text>
          </TouchableOpacity>
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

  // ── Link ─────────────────────────────────────────────────────────────────────
  linkRow: {
    marginTop: 14,
  },
  linkText: {
    color: Colors.brandBlue,
    fontSize: 14,
    fontWeight: "600",
  },
});
