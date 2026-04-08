import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { updateUserProfile } from "../../firebase/firestoreService";
import { useAuth } from "../../context/AuthContext";

export default function ProfileSetupScreen({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile(user.uid, { name: name.trim() });
      refreshProfile({ name: name.trim() });
      // Parents go to FamilyLink to link a driver; drivers skip straight to app
      if (profile?.role === "parent") {
        navigation.navigate("FamilyLink");
      } else {
        // Driver — onboarding done. AuthContext profile now has a role, so
        // AppNavigator will automatically route to the main stack.
        // Navigate explicitly in case the navigator hasn't re-evaluated yet.
        navigation.reset({ index: 0, routes: [{ name: "Debug" }] });
      }
    } catch {
      Alert.alert("Error", "Could not save your profile. Please try again.");
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
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Set up your profile</Text>

        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#555"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />

        {profile?.inviteCode && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Your invite code</Text>
            <Text style={styles.code}>{profile.inviteCode}</Text>
            <Text style={styles.codeHint}>
              Share this code with a parent or family member so they can link to you.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.disabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {profile?.role === "parent" ? "Continue" : "Start driving"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 72,
    paddingBottom: 40,
  },
  step: { color: "#444", fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 36 },
  label: { color: "#aaa", fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 24,
  },
  codeBox: {
    backgroundColor: "#0f1f22",
    borderWidth: 1,
    borderColor: "#00e5ff33",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  codeLabel: { color: "#00e5ff", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  code: { color: "#fff", fontSize: 28, fontWeight: "700", letterSpacing: 6, marginBottom: 8 },
  codeHint: { color: "#555", fontSize: 12, lineHeight: 17 },
  primaryBtn: {
    backgroundColor: "#00e5ff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  primaryBtnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
});
