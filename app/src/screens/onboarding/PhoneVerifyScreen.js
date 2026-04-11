import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { updateUserProfile } from "../../firebase/firestoreService";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

const RESEND_COOLDOWN = 60;

// Step 5
// authPath === "email"  → after verify go to PasswordCreate (account not yet created)
// authPath === "sso"    → after verify go to CircleSetup   (account already exists)
export default function PhoneVerifyScreen({ navigation, route }) {
  const { role, firstName, lastName, email, authPath, phone, confirmation } = route.params;
  const { user, refreshProfile } = useAuth();

  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer]     = useState(RESEND_COOLDOWN);
  const inputRef              = useRef(null);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  async function handleVerify() {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    try {
      await confirmation.confirm(code);

      if (authPath === "sso") {
        // Account already exists — save phone to Firestore and move on
        if (user) {
          await updateUserProfile(user.uid, {
            phoneNumber: phone,
            phoneVerified: true,
            onboardingStep: 7,
          });
          refreshProfile({ phoneNumber: phone, phoneVerified: true, onboardingStep: 7 });
        }
        navigation.navigate("CircleSetup");
      } else {
        // Email path — go create the password + account next
        navigation.navigate("PasswordCreate", {
          role, firstName, lastName, email, phone,
        });
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      Alert.alert("Invalid code", "The code didn't match. Check and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(text) {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  }

  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code]);

  return (
    <View style={styles.container}>
      <OnboardingProgress step={5} />

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.stepLabel}>Step 5 of 13</Text>
      <Text style={styles.title}>Enter the{"\n"}code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{"\n"}
        <Text style={styles.phone}>{phone}</Text>
      </Text>

      <TextInput
        ref={inputRef}
        style={styles.otpInput}
        placeholder="——————"
        placeholderTextColor="#1a2a3a"
        keyboardType="number-pad"
        autoFocus
        value={code}
        onChangeText={handleCodeChange}
        maxLength={6}
      />

      {loading && <ActivityIndicator color={Colors.brandBlue} style={{ marginTop: 16 }} />}

      <View style={styles.resendRow}>
        {timer > 0 ? (
          <Text style={styles.resendTimer}>Resend in {timer}s</Text>
        ) : (
          <TouchableOpacity onPress={() => setTimer(RESEND_COOLDOWN)}>
            <Text style={styles.resendLink}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, (code.length !== 6 || loading) && styles.disabled]}
        onPress={handleVerify}
        disabled={code.length !== 6 || loading}
      >
        <Text style={styles.primaryBtnText}>Verify →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 28,
    paddingTop: 56,
  },
  back:      { marginBottom: 20 },
  backText:  { color: Colors.textMuted, fontSize: 15 },
  stepLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:     { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle:  { color: Colors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 32 },
  phone:     { color: Colors.brandBlue, fontWeight: "600" },

  otpInput: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.brandBlue,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 18,
    textAlign: "center",
    paddingVertical: 20,
    marginBottom: 8,
  },
  resendRow:   { alignItems: "center", marginVertical: 20 },
  resendTimer: { color: Colors.textMuted, fontSize: 13 },
  resendLink:  { color: Colors.brandBlue, fontSize: 13, fontWeight: "600" },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
