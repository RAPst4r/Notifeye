import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { linkByInviteCode } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";

export default function FamilyLinkScreen({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLink() {
    if (code.trim().length !== 6) {
      Alert.alert("Invalid code", "Invite codes are 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await linkByInviteCode(user.uid, code.trim());
      if (result === "ok") {
        Alert.alert("Linked!", "You'll be notified when this driver gets a drowsiness alert.", [
          { text: "Done", onPress: finishOnboarding },
        ]);
      } else if (result === "not_found") {
        Alert.alert("Code not found", "Double-check the code and try again.");
      } else if (result === "already_linked") {
        Alert.alert("Already linked", "You're already connected to this driver.");
      } else if (result === "self_link") {
        Alert.alert("Invalid code", "You can't link to yourself.");
      }
    } catch {
      Alert.alert("Error", "Could not link account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function finishOnboarding() {
    // Onboarding complete — AppNavigator will route to the main stack
    // because profile.role is set. Force a reset to be safe.
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 3 of 3</Text>
      <Text style={styles.title}>Link a driver</Text>
      <Text style={styles.subtitle}>
        Ask the driver to open Notifeye and share their 6-character invite code with you.
      </Text>

      <TextInput
        style={styles.codeInput}
        placeholder="XXXXXX"
        placeholderTextColor="#333"
        autoCapitalize="characters"
        maxLength={6}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.disabled]}
        onPress={handleLink}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.primaryBtnText}>Link driver</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 32,
    paddingTop: 72,
  },
  step: { color: "#444", fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 12 },
  subtitle: { color: "#555", fontSize: 14, lineHeight: 20, marginBottom: 40 },
  codeInput: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 10,
    color: "#00e5ff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: "#00e5ff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  primaryBtnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
  skipBtn: { alignItems: "center", marginTop: 20 },
  skipText: { color: "#444", fontSize: 14 },
});
