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
} from "react-native";
import OnboardingProgress from "../../components/OnboardingProgress";
import { Colors } from "../../theme/colors";

// Step 2 — collected pre-auth, passed as nav params
export default function AgeScreen({ navigation, route }) {
  const { firstName, lastName } = route.params;
  const [age, setAge] = useState("");

  function handleChange(text) {
    const digits = text.replace(/\D/g, "").slice(0, 3);
    setAge(digits);
  }

  const ageNum   = parseInt(age, 10);
  const canSubmit = age.length > 0 && ageNum >= 15 && ageNum <= 120;

  function handleContinue() {
    if (!canSubmit) return;
    navigation.navigate("AuthEntry", { firstName, lastName, age: ageNum });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <OnboardingProgress step={2} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.stepLabel}>Step 2 of 13</Text>
        <Text style={styles.title}>How old{"\n"}are you?</Text>
        <Text style={styles.subtitle}>Your age helps us personalize your experience.</Text>

        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          autoFocus
          value={age}
          onChangeText={handleChange}
          onSubmitEditing={handleContinue}
          returnKeyType="done"
          maxLength={3}
        />

        {age.length > 0 && !canSubmit && (
          <Text style={styles.hint}>Must be 15 or older to use Notifeye.</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.disabled]}
          onPress={handleContinue}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryBtnText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  title:     { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 10 },
  subtitle:  { color: Colors.textMuted, fontSize: 14, marginBottom: 32 },

  input: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.white,
    fontSize: 32,
    fontWeight: "700",
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 8,
  },
  hint: { color: Colors.mild, fontSize: 12, marginBottom: 16, textAlign: "center" },

  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
