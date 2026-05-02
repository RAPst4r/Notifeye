import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function DriveScreen() {
  const { profile } = useAuth();

  const firstName = profile?.name ?? "there";
  const streak    = profile?.streak ?? 0;
  const safeMiles = profile?.safeMiles ?? 0;
  const milesNext = 50;
  const progress  = Math.min(safeMiles / milesNext, 1);

  const allMembers = (profile?.circles ?? []).flatMap((c) => c.members ?? []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: greeting + streak badge ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* ── Safe Miles card ── */}
        <View style={styles.card}>
          <Text style={styles.safeMilesTitle}>Safe Miles</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.safeMilesSub}>
            {safeMiles} mi · {milesNext - safeMiles} mi to next badge
          </Text>
        </View>

        {/* ── Start Drive button (placeholder) ── */}
        <TouchableOpacity style={styles.startDriveBtn} activeOpacity={0.85}>
          <Text style={styles.startDriveIcon}>◉</Text>
          <View>
            <Text style={styles.startDriveLabel}>Start Drive</Text>
            <Text style={styles.startDriveSub}>Camera starts automatically</Text>
          </View>
        </TouchableOpacity>

        {/* ── Your Circle ── */}
        <Text style={styles.sectionTitle}>Your Circle</Text>

        {allMembers.length === 0 ? (
          <Text style={styles.circleEmpty}>
            Add people to your circle to see their status here.
          </Text>
        ) : (
          allMembers.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{m.name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberStats}>-- streak · -- mi · Last drive: --</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },

  // ── Header ────────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  greeting: { color: Colors.textMuted, fontSize: 14, marginBottom: 4 },
  name:     { color: Colors.white, fontSize: 30, fontWeight: "800" },

  // ── Streak badge ──────────────────────────────────────────────────────────────
  streakBadge: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: Colors.streakOrange,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  streakNum:   { color: Colors.streakOrange, fontSize: 22, fontWeight: "800" },
  streakLabel: { color: Colors.streakOrange, fontSize: 11, opacity: 0.85 },

  // ── Safe Miles card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  safeMilesTitle: {
    color: Colors.brandBlue,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#1a2a3a",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.brandBlue,
    borderRadius: 3,
  },
  safeMilesSub: { color: Colors.textMuted, fontSize: 12 },

  // ── Start Drive button ────────────────────────────────────────────────────────
  startDriveBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 36,
  },
  startDriveIcon:  { color: "#fff", fontSize: 26 },
  startDriveLabel: { color: "#fff", fontSize: 18, fontWeight: "800" },
  startDriveSub:   { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },

  // ── Circle section ────────────────────────────────────────────────────────────
  sectionTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  circleEmpty: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },

  // ── Member rows ───────────────────────────────────────────────────────────────
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgPrimary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: { color: Colors.brandBlue, fontSize: 15, fontWeight: "700" },
  memberInfo:  { flex: 1 },
  memberName:  { color: Colors.white, fontSize: 14, fontWeight: "600", marginBottom: 2 },
  memberStats: { color: Colors.textMuted, fontSize: 12 },
});
