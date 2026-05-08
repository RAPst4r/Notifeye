import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

function CameraIcon({ size = 22, color }) {
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

function BellIcon({ size = 22, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StatusBadge({ status }) {
  if (status === null) return <View style={styles.badgePlaceholder} />;
  const granted = status === "granted";
  return (
    <View style={[styles.badge, { backgroundColor: granted ? Colors.safe + "22" : Colors.alert + "22" }]}>
      <Text style={[styles.badgeText, { color: granted ? Colors.safe : Colors.alert }]}>
        {granted ? "Enabled" : "Disabled"}
      </Text>
    </View>
  );
}

export default function DevicePermissionsScreen({ navigation }) {
  const [cameraStatus, setCameraStatus] = useState(null);
  const [notifStatus,  setNotifStatus]  = useState(null);

  useEffect(() => {
    async function check() {
      const { status: cam }   = await Camera.getCameraPermissionsAsync();
      const { status: notif } = await Notifications.getPermissionsAsync();
      setCameraStatus(cam);
      setNotifStatus(notif);
    }
    check();
  }, []);

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
        <Text style={styles.topBarTitle}>Device Permissions</Text>
        <View style={styles.topBarEnd} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Notifeye needs these permissions to keep you safe on the road. Tap any item to manage it.
        </Text>

        {/* ── Camera ── */}
        <TouchableOpacity
          style={styles.permRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("CameraDetail")}
        >
          <View style={styles.iconWrap}>
            <CameraIcon size={22} color={Colors.brandBlue} />
          </View>
          <View style={styles.permContent}>
            <Text style={styles.permLabel}>Camera</Text>
            <Text style={styles.permSubtitle}>Required for eye tracking</Text>
          </View>
          <StatusBadge status={cameraStatus} />
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* ── Notifications ── */}
        <TouchableOpacity
          style={styles.permRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("NotificationsDetail")}
        >
          <View style={styles.iconWrap}>
            <BellIcon size={22} color={Colors.brandBlue} />
          </View>
          <View style={styles.permContent}>
            <Text style={styles.permLabel}>Notifications</Text>
            <Text style={styles.permSubtitle}>Alerts for your circle</Text>
          </View>
          <StatusBadge status={notifStatus} />
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
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

  subtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },

  // ── Permission Row ───────────────────────────────────────────────────────────
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.brandBlue + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  permContent:  { flex: 1 },
  permLabel:    { color: Colors.white, fontSize: 15, fontWeight: "600", marginBottom: 2 },
  permSubtitle: { color: Colors.textMuted, fontSize: 12 },

  // ── Status Badge ─────────────────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 72,
    alignItems: "center",
  },
  badgePlaceholder: { minWidth: 72, height: 24 },
  badgeText: { fontSize: 12, fontWeight: "600" },

  chevron: { color: Colors.textMuted, fontSize: 18 },
});
