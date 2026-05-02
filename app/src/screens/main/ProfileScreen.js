import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";
import { logOut } from "../../firebase/authService";

const SETTINGS_ROWS = [
  { label: "Notifications" },
  { label: "Sensitivity" },
  { label: "Recalibrate", action: "recalibrate" },
  { label: "Privacy" },
  { label: "Help" },
];

export default function ProfileScreen({ navigation }) {
  const { profile, user } = useAuth();

  const name    = [profile?.name, profile?.lastName].filter(Boolean).join(" ") || "—";
  const email   = user?.email ?? profile?.email ?? "—";
  const initial = (profile?.name?.[0] ?? "?").toUpperCase();

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar ── */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* ── Settings rows ── */}
        <View style={styles.section}>
          {SETTINGS_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.row, i === SETTINGS_ROWS.length - 1 && styles.rowLast]}
              activeOpacity={0.7}
              onPress={() => {
                if (row.action === "recalibrate") {
                  navigation.getParent?.()?.navigate("RecalibrateModal", { mode: "recalibrate" });
                }
              }}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },

  // ── Avatar ────────────────────────────────────────────────────────────────────
  avatarWrap: { alignItems: "center", marginBottom: 40 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 2,
    borderColor: Colors.brandBlue + "55",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { color: Colors.brandBlue, fontSize: 36, fontWeight: "700" },
  name:       { color: Colors.white, fontSize: 20, fontWeight: "700", marginBottom: 4 },
  email:      { color: Colors.textMuted, fontSize: 14 },

  // ── Settings section ──────────────────────────────────────────────────────────
  section: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0a1520",
  },
  rowLast:    { borderBottomWidth: 0 },
  rowLabel:   { color: Colors.white, fontSize: 15 },
  rowChevron: { color: Colors.textMuted, fontSize: 20 },

  // ── Sign out ──────────────────────────────────────────────────────────────────
  signOutBtn: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.alert + "55",
  },
  signOutText: { color: Colors.alert, fontSize: 15, fontWeight: "600" },
});
