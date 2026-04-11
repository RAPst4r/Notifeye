import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase/config";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

// Step 4
export default function PhoneEntryScreen({ navigation, route }) {
  const { role, firstName, lastName, email, authPath } = route.params;

  const [phone, setPhone]     = useState("");
  const [loading, setLoading] = useState(false);
  const recaptchaRef          = useRef(null);

  function formatDisplay(digits) {
    if (digits.length <= 3)  return digits;
    if (digits.length <= 6)  return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  function handleChange(text) {
    setPhone(text.replace(/\D/g, "").slice(0, 10));
  }

  const canSubmit = phone.length === 10;

  async function handleSend() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const e164 = `+1${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, e164, recaptchaRef.current);
      navigation.navigate("PhoneVerify", {
        role, firstName, lastName, email, authPath,
        phone: e164,
        confirmation,
      });
    } catch (err) {
      console.error("Phone send error:", err);
      Alert.alert("Error", "Could not send verification code. Check the number and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={auth.app.options}
        attemptInvisibleVerification
      />

      <View style={styles.inner}>
        <OnboardingProgress step={4} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.stepLabel}>Step 4 of 13</Text>
        <Text style={styles.title}>Your phone{"\n"}number</Text>
        <Text style={styles.subtitle}>We'll send a one-time code to verify your number.</Text>

        <View style={styles.inputRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryText}>🇺🇸  +1</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="(555) 867-5309"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            autoFocus
            value={formatDisplay(phone)}
            onChangeText={handleChange}
          />
        </View>

        <Text style={styles.hint}>US numbers only for now.</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || loading) && styles.disabled]}
          onPress={handleSend}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bgPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Send code →</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },
  back:      { marginBottom: 20 },
  backText:  { color: Colors.textMuted, fontSize: 15 },
  stepLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:     { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle:  { color: Colors.textMuted, fontSize: 14, marginBottom: 32 },

  inputRow: {
    flexDirection: "row",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: "#1a2a3a",
    justifyContent: "center",
  },
  countryText: { color: Colors.white, fontSize: 15 },
  phoneInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 16,
    letterSpacing: 1,
  },
  hint: { color: Colors.textMuted, fontSize: 12, marginBottom: 28 },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
