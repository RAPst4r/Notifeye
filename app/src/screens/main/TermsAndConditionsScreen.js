import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

const BODY_COLOR = "#5a7a8e";

const SECTIONS = [
  {
    title: "Acceptance of Terms",
    body: "By downloading or using Notifeye, you agree to these Terms & Conditions. If you don't agree, please don't use the app.",
  },
  {
    title: "Use of the App",
    body: "Notifeye is for personal, non-commercial use only. You must be at least 13 years old to create an account. The app is a safety tool — it doesn't replace your own judgment behind the wheel.",
  },
  {
    title: "How It Works",
    body: "Notifeye uses your phone's front camera and on-device AI to detect signs of drowsiness while you drive. No video is ever recorded, stored, or transmitted to our servers — all processing happens entirely on your device in real time.",
  },
  {
    title: "Alerts & Limitations",
    body: "Notifeye is a supplemental safety tool. It can miss drowsiness events or produce false positives. It does not guarantee accident prevention. The driver remains fully responsible for their own safety and the safety of others at all times. Never rely on Notifeye as your only safeguard.",
  },
  {
    title: "Subscriptions & Billing",
    body: "We offer four plans:\n\n• Free — core features at no cost\n• Individual — $5.99/month\n• Family — $10.99/month\n• Family Extended — $15.99/month\n\nSubscriptions renew automatically each month. You can cancel anytime through your device's subscription settings. Cancellations take effect at the end of the current billing period.",
  },
  {
    title: "Intellectual Property",
    body: "All content in the app — including the detection logic, brand assets, and interface design — is owned by Notifeye LLC. You may not copy, modify, or redistribute any part of it.",
  },
  {
    title: "Termination",
    body: "We reserve the right to suspend or delete accounts that violate these terms, abuse the service, or engage in any harmful behavior.",
  },
  {
    title: "Changes to Terms",
    body: "We may update these terms from time to time. When we make material changes, we'll notify you inside the app. Continued use after a notice means you accept the updated terms.",
  },
  {
    title: "Contact",
    body: "Have questions? Reach us through the app or visit our website. We're always happy to help.",
  },
];

export default function TermsAndConditionsScreen({ navigation }) {
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
        <Text style={styles.topBarTitle}>Terms &amp; Conditions</Text>
        <View style={styles.topBarEnd} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Last Updated ── */}
        <Text style={styles.lastUpdated}>Last updated: May 2, 2025</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
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

  // ── Last Updated ─────────────────────────────────────────────────────────────
  lastUpdated: {
    color: BODY_COLOR,
    fontSize: 12,
    marginBottom: 28,
    marginTop: 4,
  },

  // ── Sections ─────────────────────────────────────────────────────────────────
  section: {
    marginBottom: 28,
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
