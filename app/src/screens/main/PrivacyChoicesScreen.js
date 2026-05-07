import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

const BODY_COLOR = "#5a7a8e";

export default function PrivacyChoicesScreen({ navigation }) {
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
        <Text style={styles.topBarTitle}>Your Privacy Choices</Text>
        <View style={styles.topBarEnd} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deleting Your Data</Text>
          <Text style={styles.sectionBody}>
            You can request deletion of your account and all associated data at any time via
            Delete Profile in Settings. Once deleted, your data cannot be recovered.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Future Use of Driving Data</Text>
          <Text style={styles.sectionBody}>
            In the future, Notifeye may use anonymized, aggregated driving pattern data to
            improve detection accuracy. You will be notified before this begins and will have
            the option to opt out.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Data Sales</Text>
          <Text style={styles.sectionBody}>
            Your data is never sold to third parties — ever.
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
