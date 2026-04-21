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
    const nextStep = step + 1;
    if (nextStep < PERMISSIONS.length) {
      setStep(nextStep);
    } else {
      finishPermissions();
    }
  }

  async function finishPermissions() {
    navigation.navigate("PlanSelect");
    try {
      await updateOnboardingStep(user.uid, 11);
      refreshProfile({ onboardingStep: 11 });
    } catch { /* non-blocking */ }
  }

  return (
    <View style={styles.container}>
      <OnboardingProgress step={9} />

      {navigation.canGoBack() && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}

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
  },

  back:     { marginBottom: 20 },
  backText: { color: Colors.textMuted, fontSize: 15 },

  step: { color: Colors.textMuted, fontSize: 12, marginBottom: 20, letterSpacing: 1 },

  subTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "#0F1623",
    borderRadius: 2,
    marginBottom: 36,
    overflow: "hidden",
  },
  subFill: {
    height: 3,
    backgroundColor: Colors.brandBlue,
    borderRadius: 2,
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
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
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },

  skipBtn: { marginTop: 16, alignItems: "center" },
  skipText: { color: Colors.textMuted, fontSize: 14 },
});
