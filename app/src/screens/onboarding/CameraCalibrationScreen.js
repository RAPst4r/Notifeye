import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { saveCameraMount } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

const MOUNTS = [
  {
    id: "dash-center",
    label: "Dashboard\nCenter",
    icon: "📍",
    hint: "Clipped to the center of your dashboard",
  },
  {
    id: "dash-left",
    label: "Dashboard\nLeft",
    icon: "↖️",
    hint: "Clipped near the steering column",
  },
  {
    id: "visor",
    label: "Sun\nVisor",
    icon: "🌅",
    hint: "Attached to the visor above you",
  },
  {
    id: "windshield",
    label: "Windshield\nMount",
    icon: "🪟",
    hint: "Suction-cupped to the windshield",
  },
];

export default function CameraCalibrationScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setSaving(true);
    try {
      await saveCameraMount(user.uid, selected);
      refreshProfile({ cameraMountPosition: selected, onboardingStep: 11 });
      navigation.navigate("PlanSelect");
    } catch {
      Alert.alert("Error", "Could not save your mount position. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectedMount = MOUNTS.find((m) => m.id === selected);

  return (
    <View style={styles.container}>
      <OnboardingProgress step={10} />
      {navigation.canGoBack() && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.step}>Step 10 of 13</Text>
      <Text style={styles.title}>Where is your{"\n"}phone mounted?</Text>
      <Text style={styles.subtitle}>
        This helps Notifeye know where to look for your face so detection is more accurate.
      </Text>

      {/* Car diagram placeholder */}
      <View style={styles.carDiagram}>
        <Text style={styles.carTop}>🚘</Text>
        <View style={styles.carGrid}>
          {MOUNTS.map((mount) => (
            <TouchableOpacity
              key={mount.id}
              style={[styles.mountBtn, selected === mount.id && styles.mountBtnSelected]}
              onPress={() => setSelected(mount.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.mountIcon}>{mount.icon}</Text>
              <Text style={[styles.mountLabel, selected === mount.id && styles.mountLabelSelected]}>
                {mount.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedMount && (
          <Text style={styles.mountHint}>{selectedMount.hint}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, (!selected || saving) && styles.disabled]}
        onPress={handleContinue}
        disabled={!selected || saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.bgPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>Continue →</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("PlanSelect")}
        style={styles.skipBtn}
      >
        <Text style={styles.skipText}>I'll set this up later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 28,
    paddingTop: 72,
  },
  back:     { marginBottom: 20 },
  backText: { color: Colors.textMuted, fontSize: 15 },
  step:     { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:    { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 28 },

  carDiagram: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a2a3a",
    padding: 20,
    marginBottom: 28,
    alignItems: "center",
  },
  carTop: { fontSize: 40, marginBottom: 16 },
  carGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 14,
  },
  mountBtn: {
    width: "45%",
    backgroundColor: Colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    padding: 14,
    alignItems: "center",
  },
  mountBtnSelected: { borderColor: Colors.brandBlue, backgroundColor: Colors.brandBlue + "18" },
  mountIcon:  { fontSize: 24, marginBottom: 6 },
  mountLabel: { color: Colors.textMuted, fontSize: 12, textAlign: "center", lineHeight: 16 },
  mountLabelSelected: { color: Colors.white },
  mountHint: { color: Colors.brandBlue, fontSize: 12, textAlign: "center" },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },

  skipBtn: { alignItems: "center", marginTop: 14 },
  skipText: { color: Colors.textMuted, fontSize: 14 },
});
