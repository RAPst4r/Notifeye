import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import { updateOnboardingStep } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

function CameraIcon({ size = 44, color = Colors.brandBlue }) {
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

function BellIcon({ size = 44, color = Colors.brandBlue }) {
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

const PERMISSIONS = [
  {
    id: "camera",
    Icon: CameraIcon,
    title: "Camera access",
    description:
      "Notifeye uses your front camera to monitor eye activity while you drive. It never records video.",
    cta: "Enable Camera",
    request: async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === "granted";
    },
  },
  {
    id: "notifications",
    Icon: BellIcon,
    title: "Notifications",
    description:
      "So your family gets notified the moment you start a drive or if an alert is detected.",
    cta: "Enable Notifications",
    request: async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    },
  },
];

export default function PermissionsScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const current = PERMISSIONS[step];
  const { Icon } = current;

  async function handleGrant() {
    setLoading(true);
    try {
      await current.request();
    } catch {
      // Silently continue — user can enable in Settings later
    } finally {
      setLoading(false);
      advance();
    }
  }

  function handleSkip() {
    advance();
  }

  function advance() {
    if (step < PERMISSIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finishPermissions();
    }
  }

  async function finishPermissions() {
    setDone(true);
    try {
      await updateOnboardingStep(user.uid, 10);
      refreshProfile({ onboardingStep: 10 });
    } catch { /* non-blocking */ }
    navigation.navigate("CameraCalibration");
  }

  if (done) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.brandBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OnboardingProgress step={9} />

      <View style={styles.dots}>
        {PERMISSIONS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      <Text style={styles.step}>Step 9 of 13</Text>

      <View style={styles.iconCircle}>
        <Icon size={44} color={Colors.brandBlue} />
      </View>

      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.description}>{current.description}</Text>

      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.disabled]}
        onPress={handleGrant}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={Colors.bgPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>{current.cta}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
        <Text style={styles.skipText}>Not now</Text>
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
    alignItems: "center",
  },

  dots: { flexDirection: "row", gap: 8, marginBottom: 32 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a2a3a",
  },
  dotActive: { backgroundColor: Colors.brandBlue, width: 24 },
  dotDone:   { backgroundColor: Colors.brandBlue + "66" },

  step: { color: Colors.textMuted, fontSize: 12, marginBottom: 36, letterSpacing: 1 },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: Colors.brandBlue + "44",
  },

  title:       { color: Colors.white, fontSize: 22, fontWeight: "800", marginBottom: 14, textAlign: "center" },
  description: { color: Colors.textMuted, fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 48, paddingHorizontal: 8 },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },

  skipBtn: { marginTop: 16 },
  skipText: { color: Colors.textMuted, fontSize: 14 },
});
