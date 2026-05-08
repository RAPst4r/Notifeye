import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";
import { logOut } from "../../firebase/authService";

const { width } = Dimensions.get("window");

export default function SettingsScreen({ navigation }) {
  const { profile } = useAuth();
  const planTier = profile?.planTier ?? profile?.plan ?? "Free";

  function handleSignOut() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logOut },
      ]
    );
  }

  function handleDeleteProfile() {
    Alert.alert(
      "Delete Profile",
      "Are you sure you want to permanently delete your profile? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive" },
      ]
    );
  }

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
        <Text style={styles.topBarTitle}>Settings</Text>
        <View style={styles.topBarEnd} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Permissions & Privacy ── */}
        <Text style={styles.sectionLabel}>Permissions &amp; Privacy</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("DevicePermissions")}
          >
            <Text style={styles.rowLabel}>Device Permissions</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Account ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Subscription")}
          >
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabel}>Subscription Status</Text>
              <Text style={styles.rowSubtitle}>{planTier}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("TermsAndConditions")}
          >
            <Text style={styles.rowLabel}>Terms &amp; Conditions</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("PrivacyAndSecurity")}
          >
            <Text style={styles.rowLabel}>Privacy &amp; Security</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Session ── */}
        <Text style={styles.sectionLabel}>Session</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={0.7}
            onPress={handleSignOut}
          >
            <Text style={styles.rowLabel}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={handleDeleteProfile}
          >
            <Text style={[styles.rowLabel, styles.dangerLabel]}>Delete Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_BG = "#0d1e2b";

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

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

  // ── Section Label ────────────────────────────────────────────────────────────
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 24,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#0a1520",
  },
  rowTextBlock: { flex: 1 },
  rowLabel:     { color: Colors.white, fontSize: 15 },
  rowSubtitle:  { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  dangerLabel:  { color: Colors.alert },
  chevron:      { color: Colors.textMuted, fontSize: 20 },
});
