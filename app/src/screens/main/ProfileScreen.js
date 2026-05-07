import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function ProfileScreen({ navigation }) {
  const { profile, user } = useAuth();

  const name    = [profile?.name, profile?.lastName].filter(Boolean).join(" ") || "—";
  const email   = user?.email ?? profile?.email ?? "—";
  const initial = (profile?.name?.[0] ?? "?").toUpperCase();
  const role    = profile?.role ?? "Driver";

  const safeMiles = profile?.safeMiles ?? 0;
  const streak    = profile?.streak    ?? 0;
  const badges    = Array.isArray(profile?.badges)
    ? profile.badges.length
    : (profile?.badges ?? 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarEnd} />
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.topBarEnd}
          onPress={() => navigation.navigate("Settings")}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Text style={styles.gearIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity ── */}
        <View style={styles.identitySection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <StatCard label="Safe Miles" value={String(safeMiles)} />
          <StatCard label="🔥 Streak"  value={String(streak)} />
          <StatCard label="Badges"     value={String(badges)} />
        </View>

        {/* ── Activity ── */}
        <Text style={styles.sectionLabel}>Activity</Text>
        <View style={styles.listCard}>
          <TouchableOpacity
            style={[styles.listRow, styles.listRowBorder]}
            activeOpacity={0.7}
          >
            <Text style={styles.listRowLabel}>Trip History</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.listRow} activeOpacity={0.7}>
            <Text style={styles.listRowLabel}>Badges</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recalibrate — kept exactly in place ── */}
        <View style={styles.listCard}>
          <TouchableOpacity
            style={styles.listRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("RecalibrateModal", { mode: "recalibrate" })
            }
          >
            <Text style={styles.listRowLabel}>Recalibrate</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const CARD_BG = "#0d1e2b";

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  // ── Top Bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  topBarEnd:   { width: 40, alignItems: "flex-end" },
  topBarTitle: { color: Colors.white, fontSize: 17, fontWeight: "700" },
  gearIcon:    { color: Colors.white, fontSize: 22 },

  // ── Identity ─────────────────────────────────────────────────────────────────
  identitySection: { alignItems: "center", paddingTop: 8, marginBottom: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: Colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { color: Colors.brandBlue, fontSize: 32, fontWeight: "700" },
  name:       { color: Colors.white, fontSize: 22, fontWeight: "700", marginBottom: 4 },
  email:      { color: Colors.textMuted, fontSize: 13, marginBottom: 10 },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.brandBlue + "22",
    borderWidth: 1,
    borderColor: Colors.brandBlue + "55",
  },
  roleText: { color: Colors.brandBlue, fontSize: 12, fontWeight: "600" },

  // ── Stats Row ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  statValue: { color: Colors.white, fontSize: 20, fontWeight: "700", marginBottom: 4 },
  statLabel: { color: Colors.textMuted, fontSize: 11, textAlign: "center" },

  // ── Section Label ────────────────────────────────────────────────────────────
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  // ── List Card ────────────────────────────────────────────────────────────────
  listCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#0a1520",
  },
  listRowLabel: { color: Colors.white, fontSize: 15 },
  chevron:      { color: Colors.textMuted, fontSize: 20 },
});
