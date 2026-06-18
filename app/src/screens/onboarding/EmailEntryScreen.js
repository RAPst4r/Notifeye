import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Colors } from "../../theme/colors";

export default function EmailEntryScreen({ navigation, route }) {
  const { role } = route.params;
  const [email, setEmail] = useState("");

  function handleContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    navigation.navigate("PasswordCreate", { role, email: trimmed });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.step}>Step 2 of 12</Text>
        <Text style={styles.title}>What's your{"\n"}email?</Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={handleContinue}
          returnKeyType="next"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, !email.trim() && styles.disabled]}
          onPress={handleContinue}
          disabled={!email.trim()}
        >
          <Text style={styles.primaryBtnText}>Continue →</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  back:     { marginBottom: 32 },
  backText: { color: Colors.textMuted, fontSize: 15 },
  step:     { color: Colors.textMuted, fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title:    { color: Colors.white, fontSize: 28, fontWeight: "800", lineHeight: 36, marginBottom: 36 },

  input: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: "#1a2a3a",
    borderRadius: 14,
    color: Colors.white,
    fontSize: 17,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled:       { opacity: 0.35 },
  primaryBtnText: { color: Colors.bgPrimary, fontWeight: "800", fontSize: 16 },
});
