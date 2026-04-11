import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { getUserProfile } from "../../firebase/firestoreService";
import { Colors } from "../../theme/colors";

// ── Mock data — replace with Firestore reads in Phase 4 ─────────────────────
const MOCK_CIRCLE = [
  { uid: "1", name: "Abhinav", role: "driver", streak: 7,  safeMiles: 312, status: "safe",     lastDrive: "2h ago",    driving: false },
  { uid: "2", name: "Reuben",  role: "driver", streak: 3,  safeMiles: 88,  status: "mild",     lastDrive: "yesterday", driving: true  },
  { uid: "3", name: "Mom",     role: "parent", streak: 0,  safeMiles: 0,   status: null,       lastDrive: null,        driving: false },
];

const STATUS_COLOR = {
  safe:  Colors.safe,
  mild:  Colors.mild,
  alert: Colors.alert,
};

const STATUS_LABEL = {
  safe:  "Safe",
  mild:  "Mild",
  alert: "Alert",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StreakBadge({ streak }) {
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak === 0) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [streak]);

  return (
    <Animated.View style={[styles.streakBadge, { transform: [{ scale: pulse }] }]}>
      <Text style={styles.streakFlame}>🔥</Text>
      <Text style={styles.streakCount}>{streak}</Text>
      <Text style={styles.streakLabel}>day streak</Text>
    </Animated.View>
  );
}

function SafeMilesBar({ miles }) {
  const GOAL = 500;
  const pct  = Math.min(miles / GOAL, 1);
  const width = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.milesSection}>
      <View style={styles.milesRow}>
        <Text style={styles.milesLabel}>🛣  Safe Miles</Text>
        <Text style={styles.milesValue}>{miles} <Text style={styles.milesGoal}>/ {GOAL}</Text></Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[
          styles.progressFill,
          { width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
        ]} />
      </View>
      <Text style={styles.milesHint}>{GOAL - miles > 0 ? `${GOAL - miles} miles to next badge` : "Badge earned!"}</Text>
    </View>
  );
}

function CircleCard({ member, isMe }) {
  const dotColor = member.driving
    ? (STATUS_COLOR[member.status] ?? Colors.brandBlue)
    : Colors.textMuted;

  return (
    <View style={[styles.card, isMe && styles.cardMe]}>
      {/* Avatar */}
      <View style={[styles.avatar, { borderColor: dotColor }]}>
        <Text style={styles.avatarText}>{member.name[0].toUpperCase()}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName}>{member.name}{isMe ? "  (you)" : ""}</Text>
          {member.driving && (
            <View style={[styles.statusPill, { backgroundColor: dotColor + "22", borderColor: dotColor }]}>
              <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.statusText, { color: dotColor }]}>
                {STATUS_LABEL[member.status] ?? "Driving"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardStats}>
          {member.streak > 0 && (
            <Text style={styles.cardStat}>🔥 {member.streak}d</Text>
          )}
          {member.safeMiles > 0 && (
            <Text style={styles.cardStat}>🛣 {member.safeMiles} mi</Text>
          )}
          {member.lastDrive && (
            <Text style={styles.cardLastDrive}>Last drive: {member.lastDrive}</Text>
          )}
          {member.role === "parent" && (
            <Text style={styles.cardLastDrive}>Watching the circle</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [circleMembers, setCircleMembers] = useState(MOCK_CIRCLE);

  const firstName = profile?.name?.split(" ")[0] ?? "Driver";
  const myStreak  = 7;    // TODO: pull from Firestore in Phase 4
  const myMiles   = 312;  // TODO: pull from Firestore in Phase 4

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
                "Good evening";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <StreakBadge streak={myStreak} />
          </View>
        </View>

        {/* ── Safe miles ── */}
        <View style={styles.section}>
          <SafeMilesBar miles={myMiles} />
        </View>

        {/* ── Start drive CTA ── */}
        <TouchableOpacity
          style={styles.driveBtn}
          onPress={() => navigation.navigate("Drive")}
          activeOpacity={0.85}
        >
          <Text style={styles.driveBtnIcon}>◉</Text>
          <View>
            <Text style={styles.driveBtnLabel}>Start Drive</Text>
            <Text style={styles.driveBtnSub}>Camera starts automatically</Text>
          </View>
        </TouchableOpacity>

        {/* ── Circle ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Circle</Text>
          {circleMembers.map((m) => (
            <CircleCard key={m.uid} member={m} isMe={m.uid === user?.uid} />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { color: Colors.textMuted, fontSize: 14 },
  name:     { color: Colors.white, fontSize: 26, fontWeight: "700" },
  headerRight: { alignItems: "center" },

  // Streak badge
  streakBadge: {
    alignItems: "center",
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.streakOrange + "55",
  },
  streakFlame: { fontSize: 22 },
  streakCount: { color: Colors.white, fontSize: 20, fontWeight: "800", lineHeight: 24 },
  streakLabel: { color: Colors.streakOrange, fontSize: 10, fontWeight: "600" },

  // Safe miles
  section:      { marginTop: 24 },
  sectionTitle: { color: Colors.white, fontSize: 17, fontWeight: "700", marginBottom: 14 },
  milesSection: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 18,
  },
  milesRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  milesLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600" },
  milesValue: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  milesGoal:  { color: Colors.textMuted, fontWeight: "400" },
  progressTrack: {
    height: 8,
    backgroundColor: "#0a1520",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.brandBlue,
    borderRadius: 4,
  },
  milesHint: { color: Colors.textMuted, fontSize: 11, marginTop: 6 },

  // Start drive button
  driveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.brandBlue,
    borderRadius: 18,
    padding: 20,
    marginTop: 24,
  },
  driveBtnIcon:  { fontSize: 28, color: Colors.bgPrimary },
  driveBtnLabel: { color: Colors.bgPrimary, fontSize: 17, fontWeight: "800" },
  driveBtnSub:   { color: Colors.bgPrimary + "99", fontSize: 12, marginTop: 2 },

  // Circle cards
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#0a1520",
  },
  cardMe: { borderColor: Colors.brandBlue + "44" },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginRight: 14,
  },
  avatarText: { color: Colors.brandBlue, fontSize: 20, fontWeight: "700" },

  cardBody: { flex: 1 },
  cardTop:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  cardName: { color: Colors.white, fontSize: 15, fontWeight: "600" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },

  cardStats:     { flexDirection: "row", alignItems: "center", gap: 12 },
  cardStat:      { color: Colors.textSecondary, fontSize: 12 },
  cardLastDrive: { color: Colors.textMuted, fontSize: 12 },
});
