import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { saveTermsAccepted } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

export default function TermsAcceptScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving]     = useState(false);

  async function handleAccept() {
    if (!accepted) return;
    setSaving(true);
    try {
      await saveTermsAccepted(user.uid);
      navigation.navigate("HeadCalibration");
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <OnboardingProgress step={12} />
      {navigation.canGoBack() && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.step}>Step 12 of 13</Text>
      <Text style={styles.title}>Almost there</Text>
      <Text style={styles.subtitle}>
        Please review and agree to our terms before using Notifeye.
      </Text>

      {/* Summary box */}
      <ScrollView style={styles.summaryBox} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>What we collect</Text>
        <Text style={styles.bodyText}>
          • Eye and face data processed on-device during active drives only.{"\n"}
          • Drive summaries (start/end time, alert count) stored securely.{"\n"}
          • Phone number for account verification.{"\n"}
          • Push notification tokens to reach your circle.
        </Text>

        <Text style={styles.sectionTitle}>What we never do</Text>
        <Text style={styles.bodyText}>
          • We never record or store video footage.{"\n"}
          • We never sell your data to third parties.{"\n"}
          • We never share your location.
        </Text>

        <Text style={styles.sectionTitle}>Camera & detection</Text>
        <Text style={styles.bodyText}>
          Notifeye processes your front camera feed in real time to detect signs of
          drowsiness. All processing happens on your device. No video leaves your phone.
        </Text>
      </ScrollView>

      {/* Checkbox */}
      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => setAccepted((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>
          I agree to the{" "}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL("https://notifeye.app/terms")}
          >
            Terms of Service
          </Text>
          {" "}and{" "}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL("https://notifeye.app/privacy")}
          >
            Privacy Policy
          </Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, (!accepted || saving) && styles.disabled]}
        onPress={handleAccept}
        disabled={!accepted || saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.bgPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>Agree & Continue →</Text>
        )}
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
    paddingBottom: 32,
  },
  back:     { marginBottom: 20 },
  backText: { color: Colors.textMuted, fontSize: 15 },
  step:     { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:    { color: Colors.white, fontSize: 28, fontWeight: "800", marginBottom: 10 },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginBottom: 20 },

  summaryBox: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a2a3a",
    padding: 18,
    marginBottom: 20,
  },
  sectionTitle: { color: Colors.brandBlue, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  bodyText:     { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },

  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#2a3a4a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.brandBlue, borderColor: Colors.brandBlue },
  checkmark: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 14 },
  checkLabel: { flex: 1, color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
  link:       { color: Colors.brandBlue, fontWeight: "600" },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
