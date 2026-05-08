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
  const { firstName, lastName, age, email, phone } = route.params;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);

  const rules = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    number:  /[0-9]/.test(password),
    symbol:  /[^A-Za-z0-9]/.test(password),
  };
  const isStrong  = Object.values(rules).every(Boolean);
  const matches   = password === confirm && confirm.length > 0;
  const canSubmit = isStrong && matches;

  async function handleCreate() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      // Creates Firebase Auth account + initial Firestore profile
      const firebaseUser = await signUp(email, password, firstName, age);

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
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
        />
        {password.length > 0 && (
          <View style={styles.rulesBox}>
            {[
              { key: "length", label: "At least 8 characters" },
              { key: "upper",  label: "One uppercase letter" },
              { key: "lower",  label: "One lowercase letter" },
              { key: "number", label: "One number" },
              { key: "symbol", label: "One symbol (!@#$...)" },
            ].map(({ key, label }) => (
              <View key={key} style={styles.ruleRow}>
                <Text style={rules[key] ? styles.ruleOk : styles.ruleFail}>
                  {rules[key] ? "✓" : "✗"}
                </Text>
                <Text style={[styles.ruleLabel, rules[key] && styles.ruleLabelOk]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Confirm */}
        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          placeholder="Confirm password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
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

  input: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.white,
    fontSize: 15,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 4,
  },
  rulesBox: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1a2a3a",
    padding: 12,
    marginBottom: 4,
    gap: 6,
  },
  ruleRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleOk:       { color: Colors.safe,  fontSize: 12, fontWeight: "700", width: 14 },
  ruleFail:     { color: Colors.textMuted, fontSize: 12, fontWeight: "700", width: 14 },
  ruleLabel:    { color: Colors.textMuted, fontSize: 12 },
  ruleLabelOk:  { color: Colors.white },

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
