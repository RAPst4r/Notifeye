import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { signUp } from "../../firebase/authService";
import { updateUserProfile } from "../../firebase/firestoreService";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

// Step 6 — email path only.
// Creates the Firebase Auth account + Firestore profile with all accumulated params.
export default function PasswordCreateScreen({ navigation, route }) {
  const { role, firstName, lastName, email, phone } = route.params;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [showCfm, setShowCfm]   = useState(false);

  const isStrong  = password.length >= 8;
  const matches   = password === confirm && confirm.length > 0;
  const canSubmit = isStrong && matches;

  async function handleCreate() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      // Creates Firebase Auth account + initial Firestore profile
      const firebaseUser = await signUp(email, password, firstName, role);

      // Backfill fields that weren't available at account creation
      await updateUserProfile(firebaseUser.uid, {
        lastName,
        phoneNumber:    phone,
        phoneVerified:  true,
        onboardingStep: 7,
      });
      // Navigate explicitly so test harness and production both work
      navigation.navigate("CircleSetup");
    } catch (err) {
      Alert.alert("Sign up failed", friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <OnboardingProgress step={6} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.stepLabel}>Step 6 of 13</Text>
        <Text style={styles.title}>Create a{"\n"}password</Text>
        <Text style={styles.emailHint}>{email}</Text>

        {/* Password */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 characters)"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPw}
            value={password}
            onChangeText={setPassword}
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPw ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <Text style={[styles.hint, isStrong ? styles.hintOk : styles.hintWarn]}>
            {isStrong ? "✓ Strong enough" : `${8 - password.length} more character${8 - password.length !== 1 ? "s" : ""} needed`}
          </Text>
        )}

        {/* Confirm */}
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showCfm}
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => setShowCfm((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showCfm ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
        </View>
        {confirm.length > 0 && !matches && (
          <Text style={styles.hintWarn}>Passwords don't match</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || loading) && styles.disabled]}
          onPress={handleCreate}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bgPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Create account →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },
  back:      { marginBottom: 20 },
  backText:  { color: Colors.textMuted, fontSize: 15 },
  stepLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:     { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 6 },
  emailHint: { color: Colors.textMuted, fontSize: 13, marginBottom: 28 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  eyeBtn:   { paddingHorizontal: 14 },
  eyeText:  { fontSize: 17 },
  hint:     { fontSize: 12, marginBottom: 4, marginLeft: 4 },
  hintOk:   { color: Colors.safe },
  hintWarn: { color: Colors.mild },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
