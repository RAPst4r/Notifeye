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
export default function NameEntryScreen({ navigation, route }) {
  const { role } = route.params;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");

  const canSubmit = firstName.trim().length > 0;

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
        <Text style={styles.title}>What's your{"\n"}name?</Text>

        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
          autoFocus
          value={firstName}
          onChangeText={setFirstName}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
          value={lastName}
          onChangeText={setLastName}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.disabled]}
          onPress={() =>
            navigation.navigate("AuthEntry", {
              role,
              firstName: firstName.trim(),
              lastName:  lastName.trim(),
            })
          }
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
  title:     { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 32 },

  input: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.white,
    fontSize: 17,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },
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
